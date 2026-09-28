import { BookingPhotoUploadInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as bookingPhotosService from './bookingPhotos.service.js';

function parseId(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ApiError(400, `Invalid ${label}`);
  return id;
}

export async function upload(req, res, next) {
  try {
    const { photoType } = BookingPhotoUploadInputSchema.parse({ photoType: req.body.photoType });
    const photo = await bookingPhotosService.uploadPhoto(
      parseId(req.params.bookingId, 'booking id'),
      req.user.id,
      req.user.role,
      photoType,
      req.file
    );
    res.status(201).json({ photo });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid photo upload', err.issues) : err);
  }
}

export async function list(req, res, next) {
  try {
    const photos = await bookingPhotosService.listPhotos(
      parseId(req.params.bookingId, 'booking id'),
      req.user.id
    );
    res.json({ photos });
  } catch (err) {
    next(err);
  }
}

export async function file(req, res, next) {
  try {
    const { buffer, contentType } = await bookingPhotosService.getPhotoFile(
      parseId(req.params.bookingId, 'booking id'),
      parseId(req.params.photoId, 'photo id'),
      req.user.id
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
