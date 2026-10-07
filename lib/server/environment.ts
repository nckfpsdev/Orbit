import { runtime } from "./db";
import { AppError } from "@/lib/domain/errors";

/** Fixtures are opt-in and never available in the production environment. */
export function demoEnabled() {
  return (
    runtime().APP_ENV === "test" ||
    runtime().APP_ENV === "development" ||
    (process.env.NODE_ENV === "development" &&
      runtime().APP_ENV !== "production")
  );
}
export function requireDemo() {
  if (!demoEnabled())
    throw new AppError(
      "DEMO_DISABLED",
      "Dados fictícios estão desativados neste ambiente. Selecione uma fonte de dados reais.",
      403,
    );
}
export function businessVisibility(alias = "b") {
  return demoEnabled() ? "1=1" : `${alias}.source<>'mock'`;
}
