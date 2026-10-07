import type { Business } from "./types";
import { distanceKm, normalizeText } from "./geo";
import { publicUrl, classifyUrl, buildPresence } from "./presence";
function phone(v: string | null) {
  return v?.replace(/\D/g, "") ?? "";
}
function similarity(a: string, b: string) {
  const x = new Set(
    normalizeText(a)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  const y = new Set(
    normalizeText(b)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  return (
    [...x].filter((w) => y.has(w)).length /
    Math.max(1, new Set([...x, ...y]).size)
  );
}
export function areDuplicates(a: Business, b: Business) {
  if (a.is_demo !== b.is_demo) return false;
  if (a.id === b.id) return true;
  const name = similarity(a.business_name, b.business_name);
  if (
    phone(a.phone).length >= 10 &&
    phone(a.phone) === phone(b.phone) &&
    name >= 0.5 &&
    distanceKm(a, b) < 0.15
  )
    return true;
  const domainA =
    classifyUrl(a.website) === "own_website"
      ? publicUrl(a.website)?.hostname
      : null;
  if (
    domainA &&
    domainA === publicUrl(b.website)?.hostname &&
    name >= 0.7 &&
    distanceKm(a, b) < 0.2
  )
    return true;
  return (
    name >= 0.7 &&
    distanceKm(a, b) < 0.075 &&
    similarity(a.address, b.address) >= 0.5
  );
}
export function mergeBusinesses(old: Business, next: Business): Business {
  const merged = {
    ...old,
    ...next,
    id: old.id,
    created_at: old.created_at,
    saved: old.saved,
    lead_status: old.lead_status,
    tags: old.tags,
    notes: old.notes,
    list_id: old.list_id,
    phone: next.phone ?? old.phone,
    website: next.website ?? old.website,
    instagram: next.instagram ?? old.instagram,
    facebook: next.facebook ?? old.facebook,
    public_whatsapp: next.public_whatsapp ?? old.public_whatsapp,
    rating: next.rating ?? old.rating,
    reviews_count: next.reviews_count ?? old.reviews_count,
    opening_hours: next.opening_hours ?? old.opening_hours,
    address: next.address || old.address,
    postal_code: next.postal_code || old.postal_code,
    neighborhood: next.neighborhood || old.neighborhood,
    services: next.services.length ? next.services : old.services,
    photos: next.photos.length ? next.photos : old.photos,
    can_export: next.can_export && old.can_export,
    can_persist: next.can_persist && old.can_persist,
    fields: { ...old.fields },
  };
  for (const [key, evidence] of Object.entries(next.fields))
    if (
      (evidence.value !== null &&
        evidence.value !== undefined &&
        evidence.value !== "") ||
      !merged.fields[key]
    )
      merged.fields[key] = evidence;
  const websitePresence = next.website
    ? next.digital_presence
    : old.digital_presence;
  const presence = buildPresence({
    business_name: merged.business_name,
    website: merged.website,
    instagram: merged.instagram,
    facebook: merged.facebook,
    whatsapp: merged.public_whatsapp,
    source: websitePresence.website.source,
    checked_at: websitePresence.website.last_checked_at,
    ownership: websitePresence.ownership,
    secondary_checked: old.source !== next.source,
  });
  presence.website = merged.website
    ? websitePresence.website
    : {
        ...presence.website,
        confidence: Math.max(
          presence.website.confidence,
          old.digital_presence.website.confidence,
          next.digital_presence.website.confidence,
        ),
      };
  presence.instagram = next.instagram
    ? next.digital_presence.instagram
    : old.digital_presence.instagram;
  presence.facebook = next.facebook
    ? next.digital_presence.facebook
    : old.digital_presence.facebook;
  presence.whatsapp = next.public_whatsapp
    ? next.digital_presence.whatsapp
    : old.digital_presence.whatsapp;
  presence.sources_checked = [
    ...new Set([
      ...old.digital_presence.sources_checked,
      ...next.digital_presence.sources_checked,
    ]),
  ];
  if (
    merged.website === old.website &&
    ["unavailable", "needs_improvement"].includes(old.website_status)
  )
    presence.status = old.website_status;
  return {
    ...merged,
    digital_presence: presence,
    website_status: presence.status,
  };
}
export function dedupeBusinesses(items: Business[]) {
  const result: Business[] = [];
  for (const item of items) {
    const index = result.findIndex((b) => areDuplicates(item, b));
    if (index < 0) result.push(item);
    else result[index] = mergeBusinesses(result[index], item);
  }
  return result;
}
