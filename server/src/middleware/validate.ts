import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Middleware factory — validates req.body against a Joi schema.
 * Returns 400 with a clean error message on failure.
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      res.status(400).json({
        error: 'Validation failed.',
        details: error.details.map(d => d.message),
      });
      return;
    }
    req.body = value;
    next();
  };
}
