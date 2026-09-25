import { ApiError } from '../../middleware/error.middleware.js';
import * as addressesModel from './addresses.model.js';

export async function listMyAddresses(userId) {
  return addressesModel.listForUser(userId);
}

// The first address a customer ever saves becomes their default
// automatically - most customers only ever have one, and would otherwise
// have to make an extra "set as default" trip for it to fill the
// signup-time Home Location role at all.
export async function createAddress(userId, input) {
  const existingCount = await addressesModel.countForUser(userId);
  const isDefault = input.isDefault ?? existingCount === 0;
  return addressesModel.create(userId, { ...input, isDefault });
}

export async function updateAddress(id, userId, input) {
  const address = await addressesModel.update(id, userId, input);
  if (!address) throw new ApiError(404, 'Address not found');
  return address;
}

export async function deleteAddress(id, userId) {
  const deleted = await addressesModel.remove(id, userId);
  if (!deleted) throw new ApiError(404, 'Address not found');
}

export async function setDefaultAddress(id, userId) {
  const address = await addressesModel.setDefault(id, userId);
  if (!address) throw new ApiError(404, 'Address not found');
  return address;
}
