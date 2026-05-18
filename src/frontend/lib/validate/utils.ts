import {
  ZodSchema,
  ZodError,
  ZodObject,
  ZodRawShape,
  z,
  ZodTypeAny,
} from "zod";

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export function validateField<T extends ZodRawShape>(
  schema: ZodObject<T>,
  name: keyof z.infer<ZodObject<T>>,
  value: string,
  setErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<keyof z.infer<ZodObject<T>>, string>>>
  >,
): boolean {
  const fieldSchema = schema.shape[name as string] as ZodTypeAny;
  try {
    fieldSchema.parse(value);
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    return true;
  } catch (error) {
    if (error instanceof ZodError) {
      setErrors((prev) => ({
        ...prev,
        [name]: error.issues[0]?.message,
      }));
    }
    return false;
  }
}

export function validateAllFields<T>(
  schema: ZodSchema<T>,
  data: T,
  setErrors: React.Dispatch<React.SetStateAction<ValidationErrors<T>>>,
): boolean {
  try {
    schema.parse(data);
    setErrors({});
    return true;
  } catch (error) {
    if (error instanceof ZodError) {
      const newErrors: ValidationErrors<T> = {};
      error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof T;
        newErrors[fieldName] = issue.message;
      });
      setErrors(newErrors);
    }
    return false;
  }
}
