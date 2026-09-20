import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as workersModel from './workers.model.js';

export async function getServiceCatalog() {
  return workersModel.listServiceCatalog();
}

export async function search({ category, serviceId, location }) {
  return workersModel.searchWorkers({
    category: category || null,
    serviceId: serviceId ? Number(serviceId) : null,
    location: location || null,
  });
}

export async function getWorkerDetail(userId) {
  const detail = await workersModel.findApprovedWorkerDetail(userId);
  if (!detail) throw new ApiError(404, 'Worker not found');
  return detail;
}

export async function getMyWorkerData(userId) {
  const profile = await workersModel.findProfile(userId);
  if (!profile) throw new ApiError(404, 'Worker profile not found');
  const [services, documents] = await Promise.all([
    workersModel.listWorkerServices(userId),
    workersModel.listDocuments(userId),
  ]);
  return { profile, services, documents };
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
