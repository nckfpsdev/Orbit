import { AppError } from "@/lib/domain/errors";
import { safeProviderEndpoint } from "@/lib/domain/url-policy";

// Identify the actual application; never impersonate a browser or rotate identities.
export function providerUserAgent(origin?: string, contact?: string): string {
  const references: string[] = [];
  if (origin) {
    if (!safeProviderEndpoint(origin))
      throw new AppError(
        "PROVIDER_CONFIGURATION",
        "Configure a origem HTTPS da aplicação antes de pesquisar.",
        503,
      );
    references.push(`+${new URL(origin).origin}`);
  }
  if (contact) {
    if (
      !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        contact,
      ) ||
      contact.length > 254
    )
      throw new AppError(
        "PROVIDER_CONFIGURATION",
        "Confira o e-mail de contato configurado para a fonte de dados.",
        503,
      );
    references.push(contact);
  }
  if (!references.length)
    throw new AppError(
      "PROVIDER_CONFIGURATION",
      "Configure a origem HTTPS ou o contato do operador antes de pesquisar.",
      503,
    );
  return `OrbitLocal/0.1.0 (${references.join("; ")})`;
}
