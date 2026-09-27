export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Any error without an explicit statusCode is unexpected (a bug, a raw DB
// error, etc.) - its .message can be anything, including SQL/constraint
// text (e.g. `duplicate key value violates unique constraint "..."`), so
// it must never reach the client verbatim. A deliberately-thrown ApiError
// (4xx, with a message written for the person seeing it) is the only case
// whose message is safe to expose.
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
}
