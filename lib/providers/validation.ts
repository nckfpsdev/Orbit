import type { z } from "zod";
import { AppError } from "@/lib/server/security";

/** External contract failures are upstream errors, never client form errors. */
export function parseProviderData<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(
      "PROVIDER_INVALID_DATA",
      "A fonte retornou dados incompatíveis. Tente novamente mais tarde.",
      502,
    );
  return result.data;
}
