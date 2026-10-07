"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Clock,
  Camera as Instagram,
  ThumbsUp as Facebook,
  Globe2,
  BookmarkCheck,
  ScanSearch,
  Sparkles,
  MessageSquareText,
  ExternalLink,
  Copy,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { Business } from "@/lib/domain/types";
import { safeExternalUrl } from "@/lib/domain/presence";
import { api, errorMessage } from "@/lib/client/api";
import { useWorkspace } from "./providers";
import { ScoreBadge, StatusBadge, Action } from "./primitives";
import { BusinessIcon } from "./lead-card";
export function LeadSheet({
  business: b,
  onClose,
  onGenerate,
  onScript,
  onProposal,
}: {
  business: Business | null;
  onClose: () => void;
  onGenerate: (b: Business) => void;
  onScript: (b: Business) => void;
  onProposal: (b: Business) => void;
}) {
  const { updateBusiness, refresh } = useWorkspace();
  const [busy, setBusy] = useState("");
  async function save() {
    if (!b) return;
    setBusy("save");
    try {
      const result = await api<Business>("leads/save", { business_id: b.id });
      updateBusiness(result);
      await refresh();
      toast.success("Lead salvo no CRM.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function analyze() {
    if (!b) return;
    setBusy("analyze");
    try {
      const result = await api<{ business: Business }>(
        `leads/${b.id}/enrich`,
        {},
      );
      updateBusiness(result.business);
      await refresh();
      toast.success("Evidências atualizadas.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <Sheet
      open={!!b}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent className="sheet-lead">
        {b && (
          <>
            <SheetHeader className="sheet-lead-header">
              <SheetDescription>
                {b.is_demo
                  ? "NEGÓCIO FICTÍCIO · DEMONSTRAÇÃO"
                  : "INTELIGÊNCIA DO LEAD"}
              </SheetDescription>
              <SheetTitle>{b.business_name}</SheetTitle>
              <div className="sheet-business-top">
                <BusinessIcon category={b.category} />
                <div>
                  <p className="small-label">{b.category}</p>
                  <p className="small-label">
                    {b.city} · {b.state}
                  </p>
                </div>
                <div className="ml-auto">
                  <ScoreBadge score={b.lead_score} />
                </div>
              </div>
            </SheetHeader>
            <div className="sheet-lead-body">
              <StatusBadge status={b.website_status} />
              <div>
                <div className="detail-row">
                  <MapPin size={16} />
                  <span>{b.address || "Endereço não informado"}</span>
                </div>
                <div className="detail-row">
                  <Phone size={16} />
                  <span>{b.phone || "Contato não informado"}</span>
                  {b.phone && (
                    <button
                      className="ml-auto"
                      aria-label="Copiar telefone"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(b.phone!)
                          .then(() => toast.success("Telefone copiado."))
                          .catch(() => toast.error("Não foi possível copiar."))
                      }
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
                <div className="detail-row">
                  <Clock size={16} />
                  {b.opening_hours || "Horários não informados"}
                </div>
                {b.website && (
                  <div className="detail-row">
                    <Globe2 size={16} />
                    {b.is_demo ? (
                      <span>{b.website} · fictício</span>
                    ) : (
                      <a
                        href={safeExternalUrl(b.website)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {b.website}
                        <ExternalLink size={11} className="inline ml-1" />
                      </a>
                    )}
                  </div>
                )}
                {[
                  { value: b.instagram, Icon: Instagram, label: "Instagram" },
                  { value: b.facebook, Icon: Facebook, label: "Facebook" },
                ]
                  .filter((x) => x.value)
                  .map((x) => (
                    <div className="detail-row" key={x.label}>
                      <x.Icon size={16} />
                      {b.is_demo ? (
                        <span>{x.label} fictício identificado</span>
                      ) : (
                        <a
                          href={safeExternalUrl(x.value)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {x.label} identificado
                        </a>
                      )}
                    </div>
                  ))}
              </div>
              <div className="diagnosis">
                <h4>Oportunidade digital</h4>
                <p>{b.digital_presence.explanation}</p>
              </div>
              <div>
                <p className="section-title">Por que esse score?</p>
                {b.score_reasons.map((r) => (
                  <div className="score-reason" key={r.label}>
                    <span>{r.label}</span>
                    <strong>+{r.points}</strong>
                  </div>
                ))}
              </div>
              <div className="sheet-action-grid">
                <Action
                  busy={busy === "analyze"}
                  variant="outline"
                  onClick={() => void analyze()}
                >
                  <ScanSearch size={15} />
                  Analisar presença
                </Action>
                <Action
                  busy={busy === "save"}
                  variant="outline"
                  onClick={() => void save()}
                >
                  <BookmarkCheck size={15} />
                  {b.saved ? "Salvo no CRM" : "Salvar no CRM"}
                </Action>
                <Button onClick={() => onGenerate(b)}>
                  <Sparkles size={15} />
                  Gerar site
                </Button>
                <Button variant="outline" onClick={() => onScript(b)}>
                  <MessageSquareText size={15} />
                  Gerar abordagem
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2"
                  onClick={() => onProposal(b)}
                >
                  <FileText size={15} />
                  Preparar proposta
                </Button>
              </div>
              <Button asChild variant="ghost">
                <Link href={`/leads/${b.id}`}>
                  Ver página completa
                  <ExternalLink size={14} />
                </Link>
              </Button>
              <p className="note">
                Fonte: {b.digital_presence.website.source}
                <br />
                Confiança sobre o campo website:{" "}
                {Math.round(b.digital_presence.website.confidence * 100)}%<br />
                Uma ausência de dados não confirma ausência de site.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
