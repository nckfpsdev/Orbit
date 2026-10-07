import type {
  Business,
  DigitalPresence,
  SearchFilters,
} from "@/lib/domain/types";
export interface Coordinates {
  latitude: number;
  longitude: number;
  label: string;
  source: string;
}
export interface ProviderResult {
  businesses: Business[];
  partial: boolean;
  warnings: string[];
  license: string;
}
export interface LeadProviderInterface {
  id: "mock" | "osm" | "licensed";
  searchBusinesses(
    filters: SearchFilters,
    center: Coordinates,
  ): Promise<ProviderResult>;
  getBusinessDetails(business: Business): Promise<Business>;
  getCoordinates(filters: SearchFilters): Promise<Coordinates>;
  verifyWebsite(business: Business): Promise<DigitalPresence>;
  enrichBusiness(business: Business): Promise<Business>;
  normalizeBusiness(
    value: unknown,
    filters: SearchFilters,
    center: Coordinates,
  ): Business;
}
export interface RawBusiness {
  external_id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  hours?: string | null;
  services?: string[];
  source_url?: string;
  can_persist?: boolean;
  can_export?: boolean;
}
