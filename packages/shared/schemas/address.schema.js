import { z } from 'zod';

// Customer saved addresses (Settings -> Locations, the signup home-location
// step, and the booking-time location picker). Same address_label/lat/lng
// shape as a booking's own location fields.
export const AddressSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  label: z.string().min(1).max(40),
  addressLabel: z.string().min(3).max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
});

export const AddressCreateInputSchema = z.object({
  label: z.string().min(1).max(40).default('Home'),
  addressLabel: z.string().min(3).max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  // The first address a customer ever saves becomes the default
  // automatically (see addresses.service.js) - this only matters for
  // explicitly requesting default status on a later, additional address.
  isDefault: z.boolean().optional(),
});

export const AddressUpdateInputSchema = z.object({
  label: z.string().min(1).max(40).optional(),
  addressLabel: z.string().min(3).max(200).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});
