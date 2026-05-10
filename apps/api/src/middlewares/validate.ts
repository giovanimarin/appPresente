import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') req.body = parsed;
      else if (source === 'query') req.query = parsed as typeof req.query;
      else if (source === 'params') req.params = parsed as typeof req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: source === 'body' ? 'Dados inválidos' : 'Parâmetros inválidos',
          code: 'VALIDATION_ERROR',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}

/** @deprecated Use validate(schema, 'query') instead */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}
