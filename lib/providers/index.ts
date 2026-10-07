import type { ProviderId } from "@/lib/domain/types";
import type { LeadProviderInterface } from "./contracts";
import { requireDemo } from "@/lib/server/environment";
import { MockProvider } from "./mock";
import { OpenStreetMapProvider } from "./osm";
import { LicensedProvider } from "./licensed";
export function provider(id: ProviderId): LeadProviderInterface {
  if (id === "mock") {
    requireDemo();
    return new MockProvider();
  }
  if (id === "osm") return new OpenStreetMapProvider();
  return new LicensedProvider();
}
