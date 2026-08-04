import { z } from 'zod';

export type RequestValidationErrors = Record<string, string[]>;

export type RequestValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: RequestValidationErrors };

export function formatZodErrors(error: z.ZodError): RequestValidationErrors {
  return error.issues.reduce<RequestValidationErrors>((errors, issue) => {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_root';
    errors[key] = [...(errors[key] ?? []), issue.message];
    return errors;
  }, {});
}

export function parseRequestBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): RequestValidationResult<T> {
  const parsed = schema.safeParse(body);
  if (parsed.success === false) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

