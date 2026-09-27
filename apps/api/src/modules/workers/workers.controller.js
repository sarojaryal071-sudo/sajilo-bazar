import {
  WorkerApplyInputSchema,
  WorkerOnlineInputSchema,
  WorkerAddServiceInputSchema,
  AvailabilityReplaceInputSchema,
  TypicalResponseHoursInputSchema,
  WorkerDescriptionInputSchema,
  WorkerPortfolioItemInputSchema,
  WorkerPortfolioReorderInputSchema,
  WorkerOnboardingWorkInputSchema,
} from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as workersService from './workers.service.js';

// Onboarding Step 2c passes ?category=<x> to get just that category's
// services (with price-band hints) - the plain no-filter call (search's
// service-picker dropdown, admin catalog, etc.) is unchanged.
export async function getServiceCatalog(req, res, next) {
  try {
    const { category } = req.query;
    const services = category
      ? await workersService.getServicesByCategory(category)
      : await workersService.getServiceCatalog();
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req, res, next) {
  try {
    const categories = await workersService.getCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function getDistrictCatalog(req, res, next) {
  try {
    const districts = await workersService.getDistricts();
    res.json({ districts });
  } catch (err) {
    next(err);
  }
}

export async function search(req, res, next) {
  try {
    const { category, serviceId, q, district } = req.query;
    const results = await workersService.search({ category, serviceId, q, district });
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

const VALID_FEATURED_POOLS = new Set(['top_rated', 'new_workers']);

export async function getFeatured(req, res, next) {
  try {
    const { pool } = req.query;
    if (!VALID_FEATURED_POOLS.has(pool)) {
      return next(new ApiError(400, 'Invalid pool'));
    }
    const workers = await workersService.getFeatured(pool);
    res.json({ workers });
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

export async function getAvailability(req, res, next) {
  try {
    const blocks = await workersService.getAvailability(req.user.id);
    res.json({ blocks });
  } catch (err) {
    next(err);
  }
}

export async function setAvailability(req, res, next) {
  try {
    const { blocks } = AvailabilityReplaceInputSchema.parse(req.body);
    const saved = await workersService.setAvailability(req.user.id, blocks);
    res.json({ blocks: saved });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid availability data', err.issues) : err);
  }
}

export async function setTypicalResponseHours(req, res, next) {
  try {
    const { hours } = TypicalResponseHoursInputSchema.parse(req.body);
    const profile = await workersService.setTypicalResponseHours(req.user.id, hours);
    res.json({ profile });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid response time', err.issues) : err);
  }
}

export async function updateDescription(req, res, next) {
  try {
    const { description } = WorkerDescriptionInputSchema.parse({ description: req.body.description ?? null });
    const profile = await workersService.updateDescription(req.user.id, description);
    res.json({ profile });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid description', err.issues) : err);
  }
}

export async function listPortfolio(req, res, next) {
  try {
    const items = await workersService.listPortfolio(req.user.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

// multipart form - non-file fields arrive as strings, images ride
// alongside as files (see workers.routes.js's upload.array('images', ...)).
function parsePortfolioItemInput(body) {
  return WorkerPortfolioItemInputSchema.parse({
    title: body.title,
    description: body.description || null,
    link: body.link || null,
    category: body.category,
    workDate: body.workDate || null,
  });
}

export async function createPortfolioItem(req, res, next) {
  try {
    const input = parsePortfolioItemInput(req.body);
    const item = await workersService.createPortfolioItem(req.user.id, input, req.files);
    res.status(201).json({ item });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid portfolio item', err.issues) : err);
  }
}

export async function updatePortfolioItem(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next(new ApiError(400, 'Invalid portfolio item id'));
    const input = parsePortfolioItemInput(req.body);
    const existingImageUrls = req.body.existingImageUrls ? JSON.parse(req.body.existingImageUrls) : [];
    const item = await workersService.updatePortfolioItem(req.user.id, id, { ...input, existingImageUrls }, req.files);
    res.json({ item });
  } catch (err) {
    if (err instanceof SyntaxError) return next(new ApiError(400, 'existingImageUrls must be valid JSON'));
    next(err.issues ? new ApiError(400, 'Invalid portfolio item', err.issues) : err);
  }
}

export async function deletePortfolioItem(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next(new ApiError(400, 'Invalid portfolio item id'));
    await workersService.deletePortfolioItem(req.user.id, id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function reorderPortfolio(req, res, next) {
  try {
    const { orderedIds } = WorkerPortfolioReorderInputSchema.parse(req.body);
    const items = await workersService.reorderPortfolio(req.user.id, orderedIds);
    res.json({ items });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid order', err.issues) : err);
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

export async function saveOnboardingWork(req, res, next) {
  try {
    const input = WorkerOnboardingWorkInputSchema.parse(req.body);
    const data = await workersService.saveOnboardingWork(req.user.id, input);
    res.json(data);
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid onboarding data', err.issues) : err);
  }
}

export async function apply(req, res, next) {
  try {
    const input = WorkerApplyInputSchema.parse({ bio: req.body.bio || undefined });

    // multipart form: profilePhoto rides separately (goes to users.profile_image_url,
    // not verification_documents) - everything else under req.files becomes a
    // doc_type-tagged verification document (citizenshipFront -> citizenship_front, etc).
    const { profilePhoto, ...documentFields } = req.files || {};
    const files = Object.entries(documentFields).flatMap(([field, fileList]) =>
      fileList.map((file) => ({ ...file, docType: field.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() }))
    );

    const result = await workersService.apply(req.user.id, input, files, profilePhoto?.[0]);
    res.status(201).json(result);
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid worker apply data', err.issues) : err);
  }
}
