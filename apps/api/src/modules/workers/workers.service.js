import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as workersModel from './workers.model.js';
import { tierForStoredScore } from '../trustScore/trustScore.service.js';

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
  const profile = await workersModel.findProfile(userId);
  if (!profile) throw new ApiError(404, 'Worker profile not found');
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
