import { AddressCreateInputSchema, AddressUpdateInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as addressesService from './addresses.service.js';

function parseId(req, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    next(new ApiError(400, 'Invalid address id'));
    return null;
  }
  return id;
}

export async function list(req, res, next) {
  try {
    const addresses = await addressesService.listMyAddresses(req.user.id);
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const input = AddressCreateInputSchema.parse(req.body);
    const address = await addressesService.createAddress(req.user.id, input);
    res.status(201).json({ address });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid address', err.issues) : err);
  }
}

export async function update(req, res, next) {
  try {
    const id = parseId(req, next);
    if (id === null) return;
    const input = AddressUpdateInputSchema.parse(req.body);
    const address = await addressesService.updateAddress(id, req.user.id, input);
    res.json({ address });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid address', err.issues) : err);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parseId(req, next);
    if (id === null) return;
    await addressesService.deleteAddress(id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function setDefault(req, res, next) {
  try {
    const id = parseId(req, next);
    if (id === null) return;
    const address = await addressesService.setDefaultAddress(id, req.user.id);
    res.json({ address });
  } catch (err) {
    next(err);
  }
}
