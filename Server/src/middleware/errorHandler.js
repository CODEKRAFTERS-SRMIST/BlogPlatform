import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.requestId || 'unknown';

  if (err.isOperational) {
    const response = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        requestId,
      },
    };

    if (err.errors) {
      response.error.errors = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  if (err.message) {
    logger.error('Application error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: isProduction ? 'An error occurred' : err.message,
        code: 'APPLICATION_ERROR',
        requestId,
      },
    });
  }

  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId,
  });

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
