export type ProviderId = "mock" | "osm" | "licensed";
export type WebsiteStatus =
  | "not_identified"
  | "inconclusive"
  | "social_only"
  | "aggregator"
  | "directory"
  | "own_website"
  | "unavailable"
  | "needs_improvement";
export type Channel =
  | "WhatsApp"
  | "Instagram DM"
  | "Ligação"
  | "E-mail"
  | "Visita presencial";
export interface Evidence<T = unknown> {
  value: T;
  source: string;
  confidence: number;
  last_checked_at: string;
}
export interface DigitalPresence {
  status: WebsiteStatus;
  website: Evidence<string | null>;
  instagram: Evidence<string | null>;
  facebook: Evidence<string | null>;
  whatsapp: Evidence<string | null>;
  ownership: "unverified" | "probable" | "confirmed";
  sources_checked: string[];
  explanation: string;
  checks: {
    label: string;
    result: "found" | "missing" | "unknown";
    detail: string;
  }[];
}
export interface Business {
  id: string;
  business_name: string;
  category: string;
  sub_category: string;
  country: string;
  state: string;
  city: string;
  neighborhood: string;
  postal_code: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  public_whatsapp: string | null;
  website: string | null;
  website_status: WebsiteStatus;
  instagram: string | null;
  facebook: string | null;
  rating: number | null;
  reviews_count: number | null;
  opening_hours: string | null;
  services: string[];
  photos: { url: string; attribution: string; license: string }[];
  recent_activity: boolean | null;
  lead_score: number;
  score_reasons: { label: string; points: number }[];
  source: ProviderId;
  source_url: string;
  is_demo: boolean;
  can_export: boolean;
  can_persist: boolean;
  fields: Record<string, Evidence>;
  digital_presence: DigitalPresence;
  distance_km: number;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
  saved: boolean;
  lead_status: string;
  tags: string[];
  notes: string;
  list_id: string | null;
}
export interface SearchFilters {
  country: string;
  state: string;
  city: string;
  neighborhood: string;
  postal_code: string;
  radius: number;
  category: string;
  sub_category: string;
  query: string;
  provider: ProviderId;
  prioritize_no_site: boolean;
  website_filter: string;
  min_rating: number;
  min_reviews: number;
  min_score: number;
  has_phone: boolean;
  has_whatsapp: boolean;
  crm_status: string;
  sort: string;
  bounds?: [number, number, number, number];
}
export interface SearchResponse {
  id: string;
  businesses: Business[];
  total: number;
  page: number;
  page_size: number;
  center: { latitude: number; longitude: number };
  filters: SearchFilters;
  cached: boolean;
  partial: boolean;
  warnings: string[];
  is_demo: boolean;
  credits_used: number;
}
export interface OrgSettings {
  provider: ProviderId;
  sender_name: string;
  agency_name: string;
  proposal_price: number;
  score_weights: Record<string, number>;
  credit_costs: Record<string, number>;
  unit_costs: Record<string, number>;
  currency: string;
  onboarded: boolean;
}
export interface BootData {
  user: { name: string; email: string; role: string };
  organization: { id: string; name: string; credits: number };
  settings: OrgSettings;
  businesses: Business[];
  stats: {
    found: number;
    no_site: number;
    strong: number;
    negotiating: number;
    closed: number;
    sites: number;
    saved: number;
  };
  lists: { id: string; name: string; count: number }[];
  searches: {
    id: string;
    name: string;
    count: number;
    created_at: string;
    filters: SearchFilters;
  }[];
  websites: WebsiteRecord[];
  scripts: ScriptRecord[];
  proposals: ProposalRecord[];
  activity: {
    id: string;
    business_id: string;
    action: string;
    detail: string;
    created_at: string;
  }[];
  provider_status: {
    mock: boolean;
    admin: boolean;
    osm: boolean;
    licensed: boolean;
    ai: boolean;
    audit: boolean;
    scheduler: boolean;
    manage_credits: boolean;
  };
}
export interface WebsiteContent {
  name: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  instagram: string;
  headline: string;
  subtitle: string;
  about: string;
  cta: string;
  services: { title: string; description: string }[];
  sections: string[];
  color: string;
  style: "clinic" | "editorial" | "bold" | "elegant";
  image_url: string;
  image_attribution: string;
}
export interface WebsiteRecord {
  id: string;
  business_id: string;
  business_name: string;
  slug: string;
  status: "draft" | "published";
  content: WebsiteContent;
  engine: "local" | "gemini";
  version: number;
  created_at: string;
  updated_at: string;
}
export interface ScriptRecord {
  id: string;
  business_id: string;
  business_name: string;
  channel: Channel;
  content: string;
  engine: "local" | "gemini";
  kind: string;
  created_at: string;
}
export interface ProposalRecord {
  id: string;
  business_id: string;
  business_name: string;
  price: number;
  scope: string[];
  evidence: string[];
  delivery_days: number;
  website_id: string | null;
  agency_name: string;
  status: string;
  created_at: string;
}
export interface WebsiteAudit {
  id: string;
  business_id: string;
  url: string;
  mode: "limited" | "measured";
  checks: {
    name: string;
    status: "pass" | "fail" | "unknown";
    detail: string;
  }[];
  response_ms: number | null;
  http_status: number | null;
  checked_at: string;
  summary: string;
}
