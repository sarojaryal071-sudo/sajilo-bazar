import { WorkerApplyInputSchema, WorkerOnlineInputSchema, WorkerAddServiceInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as workersService from './workers.service.js';

export async function getServiceCatalog(req, res, next) {
  try {
    const services = await workersService.getServiceCatalog();
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

export async function search(req, res, next) {
  try {
    const { category, serviceId, q } = req.query;
    const results = await workersService.search({ category, serviceId, q });
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

export async function getDetail(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) return next(new ApiError(400, 'Invalid worker id'));
    const worker = await workersService.getWorkerDetail(userId);
    res.json({ worker });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const data = await workersService.getMyWorkerData(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function addService(req, res, next) {
  try {
    // multipart form (an optional supporting document rides alongside) -
    // non-file fields arrive as strings, same pattern as apply().
    const input = WorkerAddServiceInputSchema.parse({
      serviceId: Number(req.body.serviceId),
      price: Number(req.body.price),
    });
    const service = await workersService.addService(req.user.id, input, req.file);
    res.status(201).json({ service });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid service data', err.issues) : err);
  }
}

export async function setOnline(req, res, next) {
  try {
    const input = WorkerOnlineInputSchema.parse(req.body);
    const profile = await workersService.setOnline(req.user.id, input);
    res.json({ profile });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid online status', err.issues) : err);
  }
}

export async function ackWelcome(req, res, next) {
  try {
    const profile = await workersService.ackWelcome(req.user.id);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function apply(req, res, next) {
  try {
    // multipart form: non-file fields arrive as strings, services as a JSON string.
    const raw = {
      bio: req.body.bio || undefined,
      services: req.body.services ? JSON.parse(req.body.services) : [],
    };
    const input = WorkerApplyInputSchema.parse(raw);

    const files = Object.entries(req.files || {}).flatMap(([docType, fileList]) =>
      fileList.map((file) => ({ ...file, docType }))
    );

    const result = await workersService.apply(req.user.id, input, files);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof SyntaxError) return next(new ApiError(400, 'services must be valid JSON'));
    next(err.issues ? new ApiError(400, 'Invalid worker apply data', err.issues) : err);
  }
}
