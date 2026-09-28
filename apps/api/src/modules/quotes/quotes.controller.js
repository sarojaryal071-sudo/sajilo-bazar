import { QuoteCreateInputSchema, QuoteDecisionInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as quotesService from './quotes.service.js';

function parseId(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ApiError(400, `Invalid ${label}`);
  return id;
}

export async function submit(req, res, next) {
  try {
    const input = QuoteCreateInputSchema.parse({
      amount: req.body.amount !== undefined ? Number(req.body.amount) : undefined,
      message: req.body.message || null,
    });
    const quote = await quotesService.submitQuote(
      parseId(req.params.bookingId, 'booking id'),
      req.user.id,
      input,
      req.file
    );
    res.status(201).json({ quote });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid quote data', err.issues) : err);
  }
}

export async function list(req, res, next) {
  try {
    const quotes = await quotesService.listQuotes(parseId(req.params.bookingId, 'booking id'), req.user.id);
    res.json({ quotes });
  } catch (err) {
    next(err);
  }
}

export async function decide(req, res, next) {
  try {
    const { decision } = QuoteDecisionInputSchema.parse(req.body);
    const quote = await quotesService.decideQuote(parseId(req.params.id, 'quote id'), req.user.id, decision);
    res.json({ quote });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid decision', err.issues) : err);
  }
}

export async function photo(req, res, next) {
  try {
    const { buffer, contentType } = await quotesService.getQuotePhotoFile(
      parseId(req.params.id, 'quote id'),
      req.user.id
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
