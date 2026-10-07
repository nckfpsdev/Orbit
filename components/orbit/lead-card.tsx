"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  Dumbbell,
  Scissors,
  UtensilsCrossed,
  Store,
  Star,
  MapPin,
  Smartphone,
  Bookmark,
  BookmarkCheck,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import type { Business } from "@/lib/domain/types";
import { ScoreBadge, StatusBadge } from "./primitives";
export function BusinessIcon({
  category,
  index = 0,
}: {
  category: string;
  index?: number;
}) {
  const Icon = /clínic|odont|psicól/i.test(category)
    ? Stethoscope
    : /academ/i.test(category)
      ? Dumbbell
      : /barbear|salão/i.test(category)
        ? Scissors
        : /restaur|pizz|hamburg/i.test(category)
          ? UtensilsCrossed
          : Store;
  return (
    <div
      className={`business-icon ${index % 3 === 1 ? "green" : index % 3 === 2 ? "orange" : ""}`}
    >
      <Icon size={21} />
    </div>
  );
}
export function LeadCard({
  business: b,
  index = 0,
  onOpen,
  onSave,
  onGenerate,
  onAnalyze,
  selected = false,
  checked = false,
  onCheck,
}: {
  business: Business;
  index?: number;
  onOpen: (b: Business) => void;
  onSave: (b: Business) => void;
  onGenerate: (b: Business) => void;
  onAnalyze: (b: Business) => void;
  selected?: boolean;
  checked?: boolean;
  onCheck?: (b: Business, checked: boolean) => void;
}) {
  return (
    <article className={`lead-card panel ${selected ? "is-selected" : ""}`}>
      <div className="lead-card-top">
        {onCheck && (
          <Checkbox
            aria-label={`Selecionar ${b.business_name}`}
            checked={checked}
            onCheckedChange={(v) => onCheck(b, v === true)}
            className="mt-3"
          />
        )}
        <BusinessIcon category={b.category} index={index} />
        <button className="lead-card-title text-left" onClick={() => onOpen(b)}>
          <h3>{b.business_name}</h3>
          <p>
            {b.neighborhood || b.city} · {b.city}, {b.state}
          </p>
        </button>
        <ScoreBadge score={b.lead_score} />
      </div>
      <div className="lead-card-meta">
        {b.rating !== null ? (
          <>
            <span className="rating-inline">
              <Star size={12} fill="currentColor" />
              {b.rating.toFixed(1).replace(".", ",")}
            </span>
            <span>{b.reviews_count ?? 0} avaliações</span>
          </>
        ) : (
          <span>Avaliações não informadas</span>
        )}
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={11} />
          {b.distance_km.toFixed(1).replace(".", ",")} km
        </span>
      </div>
      <div className="lead-card-status">
        <StatusBadge status={b.website_status} compact />
        {b.public_whatsapp && (
          <span className="contact-badge">
            <Smartphone size={12} />
            WhatsApp
          </span>
        )}
        {b.saved && (
          <span className="saved-badge">
            <BookmarkCheck size={12} />
            Salvo
          </span>
        )}
      </div>
      <div className="lead-card-actions">
        <Button variant="ghost" size="sm" onClick={() => onAnalyze(b)}>
          <ScanSearch size={13} />
          Analisar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onGenerate(b)}>
          <Sparkles size={13} />
          Gerar site
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="save-card-btn"
          onClick={() => onSave(b)}
          aria-label={
            b.saved
              ? `Lead ${b.business_name} salvo`
              : `Salvar ${b.business_name}`
          }
        >
          {b.saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </Button>
      </div>
    </article>
  );
}
