import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as workersModel from './workers.model.js';
import { tierForStoredScore } from '../trustScore/trustScore.service.js';
import { computeEffectiveOnline } from '../../lib/availability.js';
import * as platformSettingsService from '../platformSettings/platformSettings.service.js';
import { uploadPhoto as uploadUserPhoto } from '../users/users.service.js';

// The model returns the raw stored score internally (see workers.model.js
// toSearchResult/toWorkerDetail) - this is the one place it turns into the
// customer-facing tier and gets deleted, so the raw number/breakdown/
// dispute count can never leak onto a public-facing response by accident.
function withTrustTier(worker) {
  const { trustScore, ...rest } = worker;
  return { ...rest, trustTier: tierForStoredScore(trustScore) };
}

// Enriches each service with its admin-set price band ('Typical: Rs. X-Y'
// hint on the onboarding pricing step) - null min/max when no band has
// been set for that service id yet, rather than throwing.
async function withPriceBands(services) {
  const bands = await platformSettingsService.getServicePriceBands();
  return services.map((s) => {
    const band = bands[String(s.id)];
    return { ...s, minPrice: band ? Number(band.min) : null, maxPrice: band ? Number(band.max) : null };
  });
}

export async function getServiceCatalog() {
  const services = await workersModel.listServiceCatalog();
  return withPriceBands(services);
}

// Onboarding Step 2b's category tile grid - the distinct set of categories
// among active services, same free-text catalog searchWorkers/apply
// already treat as the source of truth (no separate categories table).
export async function getCategories() {
  return workersModel.listAllCategories();
}

// Onboarding Step 2c only shows the chosen category's services - a
// narrower, price-band-enriched slice of the same catalog.
export async function getServicesByCategory(category) {
  const services = await workersModel.listServicesByCategory(category);
  return withPriceBands(services);
}

export async function getDistricts() {
  return workersModel.listDistricts();
}

export async function search({ category, serviceId, q, district }) {
  const results = await workersModel.searchWorkers({
    category: category || null,
    serviceId: serviceId ? Number(serviceId) : null,
    q: q || null,
    district: district || null,
  });
  return results.map(withTrustTier);
}

// pool is pre-validated by the controller (one of 'top_rated'/'new_workers') -
// same withTrustTier scrub as search/detail, so a New Worker card's
// (always-null, in-grace-period) score never leaks either.
export async function getFeatured(pool) {
  const rows =
    pool === 'new_workers'
      ? await workersModel.listFeaturedNewWorkers()
      : await workersModel.listFeaturedTopRated();
  return rows.map(withTrustTier);
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

  const [services, documents, { reviewsCount, reviews }, portfolioItems] = await Promise.all([
    workersModel.listWorkerServices(userId),
    workersModel.listDocuments(userId),
    workersModel.findReviewsForWorker(userId),
    workersModel.listPortfolioItems(userId),
  ]);
  return { profile, services, documents, reviewsCount, reviews, portfolioItems };
}

export async function updateDescription(userId, description) {
  const profile = await workersModel.updateDescription(userId, description);
  if (!profile) throw new ApiError(404, 'Worker profile not found');
  return profile;
}

// Cloudinary folder keyed to the worker's internal id, not a username (the
// app has no username field) - workers/{workerId}/portfolio, namespaced
// under the same sajilo-bazar/ prefix every other upload uses.
const MAX_PORTFOLIO_IMAGES = 6;

async function uploadPortfolioImages(workerId, files) {
  if (!files || files.length === 0) return [];
  const uploads = await Promise.all(
    files
      .slice(0, MAX_PORTFOLIO_IMAGES)
      .map((file) => uploadBuffer(file.buffer, { folder: `sajilo-bazar/workers/${workerId}/portfolio` }))
  );
  return uploads.map((u) => u.secure_url);
}

export async function listPortfolio(workerId) {
  return workersModel.listPortfolioItems(workerId);
}

export async function createPortfolioItem(workerId, input, files) {
  const imageUrls = await uploadPortfolioImages(workerId, files);
  return workersModel.createPortfolioItem(workerId, { ...input, imageUrls });
}

// existingImageUrls (already-uploaded URLs the worker chose to keep,
// sent by the client) + any newly uploaded files together become the
// item's full image list - the client is the source of truth for removals
// (dropping a URL from that list is how an image gets removed), and this
// just appends whatever's freshly uploaded.
export async function updatePortfolioItem(workerId, itemId, { existingImageUrls, ...input }, files) {
  const existing = await workersModel.findPortfolioItem(itemId, workerId);
  if (!existing) throw new ApiError(404, 'Portfolio item not found');
  const newUrls = await uploadPortfolioImages(workerId, files);
  const imageUrls = [...(existingImageUrls ?? []), ...newUrls];
  return workersModel.updatePortfolioItem(itemId, workerId, { ...input, imageUrls });
}

export async function deletePortfolioItem(workerId, itemId) {
  const deleted = await workersModel.deletePortfolioItem(itemId, workerId);
  if (!deleted) throw new ApiError(404, 'Portfolio item not found');
}

export async function reorderPortfolio(workerId, orderedIds) {
  return workersModel.reorderPortfolioItems(workerId, orderedIds);
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

// Onboarding Step 2 ("Your work"): district + chosen services/pricing,
// saved together as soon as the worker finishes the three tap-and-advance
// sub-screens - the resume checkpoint that lets a worker who logs back in
// after this point skip straight to Step 3 (see getMyWorkerData/App.jsx
// resume logic, driven off profile.district + services being non-empty).
// A service's admin-set band (platform_settings.service_price_bands, same
// data that feeds the "Typical: Rs. X-Y" hint) is a hard floor/ceiling,
// not just a hint - exactly the min or max is fine, anything strictly
// outside it is rejected outright rather than silently accepted into an
// admin review queue. The frontend checks this too (WorkerApply.jsx
// priceRangeError) so a worker normally never reaches this, but that's a
// UX convenience only - this is the actual enforcement.
export async function saveOnboardingWork(userId, { district, services }) {
  const bands = await platformSettingsService.getServicePriceBands();
  const outOfRange = services
    .map(({ serviceId, price }) => {
      const band = bands[String(serviceId)];
      if (!band || (price >= Number(band.min) && price <= Number(band.max))) return null;
      return { serviceId, min: Number(band.min), max: Number(band.max) };
    })
    .filter(Boolean);
  if (outOfRange.length > 0) {
    const message = outOfRange
      .map((s) => `service ${s.serviceId}: price must be between Rs. ${s.min} and Rs. ${s.max}`)
      .join('; ');
    throw new ApiError(400, `Price out of range - ${message}`);
  }
  const withApproval = services.map(({ serviceId, price }) => ({ serviceId, price, approvalStatus: 'approved' }));

  await workersModel.setDistrict(userId, district);
  await workersModel.withTransaction((client) => workersModel.replaceWorkerServices(client, userId, withApproval));

  return getMyWorkerData(userId);
}

const REQUIRED_APPLY_DOC_TYPES = ['citizenship_front', 'citizenship_back'];

// The worker-apply flow's final step (Step 3 documents + Step 4 submit):
// district/services were already saved by saveOnboardingWork above. This
// uploads the identity documents, sets the profile photo (same Cloudinary
// path Settings -> Profile photo upload uses - see users.service.js
// uploadPhoto), and flips verification_status to "pending" for admin
// review. skill_certificate is only required when the worker's chosen
// category is high_risk (see workersModel.hasHighRiskService) - Step 3
// doesn't even show the field otherwise.
export async function apply(userId, { bio }, files, profilePhotoFile) {
  const byType = new Map(files.map((f) => [f.docType, f]));
  const missing = REQUIRED_APPLY_DOC_TYPES.filter((t) => !byType.has(t));
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required document(s): ${missing.join(', ')}`);
  }
  if (!profilePhotoFile) {
    throw new ApiError(400, 'A profile photo is required');
  }

  const needsSkillCertificate = await workersModel.hasHighRiskService(userId);
  if (needsSkillCertificate && !byType.has('skill_certificate')) {
    throw new ApiError(400, 'A skill certificate is required for this category');
  }

  const uploads = await Promise.all(
    files.map(async (file) => ({
      docType: file.docType,
      fileUrl: (await uploadBuffer(file.buffer, { folder: `sajilo-bazar/verification/${userId}` }))
        .secure_url,
    }))
  );

  await workersModel.withTransaction(async (client) => {
    for (const upload of uploads) {
      await workersModel.insertDocument(client, { workerId: userId, ...upload });
    }
  });

  await uploadUserPhoto(userId, profilePhotoFile);
  await workersModel.updateBio(userId, bio ?? null);
  await workersModel.setVerificationStatus(userId, 'pending');

  return getMyWorkerData(userId);
}

// A worker fixing just the one document an admin rejected - not a full
// reapplication. Only a currently-rejected document of that type can be
// resubmitted (workersModel.resubmitDocument's WHERE clause enforces
// this), so this can't be used to silently swap out an approved or
// still-pending one. The worker's overall verification_status is left
// alone: it's already 'pending' (the only way to have a rejected document
// at all), and stays 'pending' until every document - this one included -
// is approved (see admin.service.js decideDocument).
export async function resubmitDocument(userId, docType, file) {
  if (!file) throw new ApiError(400, 'A replacement document file is required');

  const existing = await workersModel.findDocumentByTypeForWorker(userId, docType);
  if (!existing) throw new ApiError(404, 'No document of that type found on your application');
  if (existing.status !== 'rejected') {
    throw new ApiError(400, 'This document is not awaiting resubmission');
  }

  const fileUrl = (
    await uploadBuffer(file.buffer, { folder: `sajilo-bazar/verification/${userId}` })
  ).secure_url;
  await workersModel.resubmitDocument(existing.id, fileUrl);

  return getMyWorkerData(userId);
}
