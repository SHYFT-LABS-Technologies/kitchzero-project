import { ZodSchema, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateData<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

export function isPositiveNumber(num: number): boolean {
  return typeof num === 'number' && num > 0 && !isNaN(num);
}