import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as workersModel from './workers.model.js';
import { tierForStoredScore } from '../trustScore/trustScore.service.js';
import { computeEffectiveOnline } from '../../lib/availability.js';

// The model returns the raw stored score internally (see workers.model.js
// toSearchResult/toWorkerDetail) - this is the one place it turns into the
// customer-facing tier and gets deleted, so the raw number/breakdown/
// dispute count can never leak onto a public-facing response by accident.
function withTrustTier(worker) {
  const { trustScore, ...rest } = worker;
  return { ...rest, trustTier: tierForStoredScore(trustScore) };
}

export async function getServiceCatalog() {
  return workersModel.listServiceCatalog();
}

export async function search({ category, serviceId, q }) {
  const results = await workersModel.searchWorkers({
    category: category || null,
    serviceId: serviceId ? Number(serviceId) : null,
    q: q || null,
  });
  return results.map(withTrustTier);
}

export async function getWorkerDetail(userId) {
  const detail = await workersModel.findApprovedWorkerDetail(userId);
  if (!detail) throw new ApiError(404, 'Worker not found');
  return withTrustTier(detail);
}

export async function getMyWorkerData(userId) {
  let profile = await workersModel.findProfile(userId);
  if (!profile) throw new ApiError(404, 'Worker profile not found');

  // Dashboard load is the worker's own natural touchpoint - resync their
  // effective online status against their schedule here so they never see
  // a stale toggle (see syncEffectiveOnline).
  const synced = await syncEffectiveOnline(userId, profile);
  if (synced) profile = synced;

  const [services, documents, { reviewsCount, reviews }] = await Promise.all([
    workersModel.listWorkerServices(userId),
    workersModel.listDocuments(userId),
    workersModel.findReviewsForWorker(userId),
  ]);
  return { profile, services, documents, reviewsCount, reviews };
}

// Controlled expansion: a worker can add more services beyond what they
// registered with at signup, but only by id from the existing catalog -
// never free-text. Same category as something already approved goes live
// immediately; a different category needs admin review (Phase 6's queue)
// before it's bookable or visible to customers. If that other category is
// high_risk, a supporting document is required up front - reuses the same
// Cloudinary upload path and verification_documents table the worker-apply
// flow already uses, just linked to this specific service request rather
// than the original identity verification.
export async function addService(workerId, { serviceId, price }, file) {
  const service = await workersModel.findServiceById(serviceId);
  if (!service) throw new ApiError(404, 'Service not found');

  const approvedCategories = await workersModel.findApprovedCategories(workerId);
  const isOwnCategory = approvedCategories.includes(service.category);
  const approvalStatus = isOwnCategory ? 'approved' : 'pending';
  const needsDocument = !isOwnCategory && service.highRisk;

  if (needsDocument && !file) {
    throw new ApiError(400, 'A supporting document is required to add a service from a high-risk category');
  }

  if (!needsDocument) {
    return workersModel.addWorkerService(workerId, { serviceId, price, approvalStatus });
  }

  const fileUrl = (await uploadBuffer(file.buffer, { folder: `sajilo-bazar/verification/${workerId}` }))
    .secure_url;

  return workersModel.withTransaction(async (client) => {
    const created = await workersModel.addWorkerService(workerId, { serviceId, price, approvalStatus }, client);
    await workersModel.insertDocument(client, {
      workerId,
      docType: 'service_evidence',
      fileUrl,
      workerServiceId: created.id,
    });
    return created;
  });
}

export async function setOnline(userId, { isOnline, latitude, longitude }) {
  const profile = await workersModel.setOnline(userId, { isOnline, latitude, longitude });
  if (!profile) throw new ApiError(404, 'Worker profile not found');
  return profile;
}

export async function ackWelcome(userId) {
  return workersModel.ackWelcome(userId);
}

// Recomputes a worker's effective online status against their availability
// schedule (see apps/api/src/lib/availability.js) and, if it has actually
// changed, persists it without touching online_overridden_at (this isn't a
// new manual action). Returns the refreshed profile when a sync happened,
// or null when nothing needed to change - including a worker with no
// schedule set at all, who stays in today's pure-manual-toggle mode.
async function syncEffectiveOnline(workerId, profile) {
  const blocks = await workersModel.listAvailability(workerId);
  if (blocks.length === 0) return null;

  const overriddenAt = await workersModel.findOnlineOverriddenAt(workerId);
  const effective = computeEffectiveOnline({ blocks, manualIsOnline: profile.isOnline, overriddenAt });
  if (effective === profile.isOnline) return null;

  await workersModel.setIsOnlineFromSchedule(workerId, effective);
  return { ...profile, isOnline: effective };
}

// Run once right before instant-request matching (bookings.service.js) -
// the one place effective online status genuinely has to be correct at the
// moment it's read, not just eventually-consistent via a worker's own
// touchpoints. Bounded by how many workers actually have a schedule set,
// not by booking volume.
export async function syncAllWorkersWithAvailability() {
  const workers = await workersModel.listWorkersWithAvailability();
  for (const worker of workers) {
    await syncEffectiveOnline(worker.userId, { isOnline: worker.isOnline });
  }
}

export async function getAvailability(workerId) {
  return workersModel.listAvailability(workerId);
}

export async function setAvailability(workerId, blocks) {
  const saved = await workersModel.replaceAvailability(workerId, blocks);
  // The schedule just changed - resync immediately rather than waiting for
  // the next dashboard load, so the worker sees the right status right away.
  const profile = await workersModel.findProfile(workerId);
  await syncEffectiveOnline(workerId, profile);
  return saved;
}

export async function setTypicalResponseHours(workerId, hours) {
  const profile = await workersModel.setTypicalResponseHours(workerId, hours);
  if (!profile) throw new ApiError(404, 'Worker profile not found');
  return profile;
}

// The worker-apply flow: set services + pricing, upload verification documents,
// and flip verification_status to "pending" for admin review (Phase 6).
export async function apply(userId, { bio, services }, files) {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'At least one verification document is required');
  }

  const uploads = await Promise.all(
    files.map(async (file) => ({
      docType: file.docType,
      fileUrl: (await uploadBuffer(file.buffer, { folder: `sajilo-bazar/verification/${userId}` }))
        .secure_url,
    }))
  );

  await workersModel.withTransaction(async (client) => {
    await workersModel.replaceWorkerServices(client, userId, services);
    for (const upload of uploads) {
      await workersModel.insertDocument(client, { workerId: userId, ...upload });
    }
  });

  await workersModel.updateBio(userId, bio ?? null);
  await workersModel.setVerificationStatus(userId, 'pending');

  return getMyWorkerData(userId);
}
