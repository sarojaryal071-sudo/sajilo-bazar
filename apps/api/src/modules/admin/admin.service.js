import { ApiError } from '../../middleware/error.middleware.js';
import * as adminModel from './admin.model.js';

export async function getDashboardStats() {
  return adminModel.getDashboardStats();
}

export async function getApprovalsQueue() {
  const [documents, services] = await Promise.all([
    adminModel.listPendingDocuments(),
    adminModel.listPendingServices(),
  ]);
  return [...documents, ...services].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// Approving a document only flips the worker's overall verification_status
// once every one of their documents has been approved - a worker who
// uploaded two documents isn't bookable just because the first one cleared.
// Rejecting is immediate: one rejected document means the application needs
// to be redone, same as the existing reapply flow already assumes.
export async function decideDocument(documentId, adminId, decision) {
  const doc = await adminModel.findDocumentById(documentId);
  if (!doc) throw new ApiError(404, 'Document not found');
  if (doc.status !== 'pending') throw new ApiError(400, 'This document has already been reviewed');

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const updated = await adminModel.decideDocument(documentId, { status, adminId });

  if (status === 'rejected') {
    await adminModel.setWorkerVerificationStatus(doc.worker_id, 'rejected');
  } else {
    const stillPending = await adminModel.countPendingDocumentsForWorker(doc.worker_id);
    if (stillPending === 0) {
      await adminModel.setWorkerVerificationStatus(doc.worker_id, 'approved');
    }
  }

  return updated;
}

export async function decideWorkerService(serviceId, adminId, decision) {
  const service = await adminModel.findWorkerServiceById(serviceId);
  if (!service) throw new ApiError(404, 'Service not found');
  if (service.approval_status !== 'pending') {
    throw new ApiError(400, 'This service has already been reviewed');
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  return adminModel.decideWorkerService(serviceId, { status, adminId });
}
