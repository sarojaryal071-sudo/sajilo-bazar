import { ApiError } from '../../middleware/error.middleware.js';
import * as adminService from './admin.service.js';

export async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getApprovalsQueue(req, res, next) {
  try {
    const queue = await adminService.getApprovalsQueue();
    res.json({ queue });
  } catch (err) {
    next(err);
  }
}

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid id');
  return id;
}

export async function approveDocument(req, res, next) {
  try {
    const document = await adminService.decideDocument(parseId(req), req.user.id, 'approve');
    res.json({ document });
  } catch (err) {
    next(err);
  }
}

export async function rejectDocument(req, res, next) {
  try {
    const document = await adminService.decideDocument(parseId(req), req.user.id, 'reject');
    res.json({ document });
  } catch (err) {
    next(err);
  }
}

export async function approveWorkerService(req, res, next) {
  try {
    const service = await adminService.decideWorkerService(parseId(req), req.user.id, 'approve');
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

export async function rejectWorkerService(req, res, next) {
  try {
    const service = await adminService.decideWorkerService(parseId(req), req.user.id, 'reject');
    res.json({ service });
  } catch (err) {
    next(err);
  }
}
