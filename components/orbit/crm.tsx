"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Download,
  GripVertical,
  MapPin,
  Kanban,
  CircleCheck,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { STAGES } from "@/lib/domain/constants";
import { api, errorMessage } from "@/lib/client/api";
import type { Business } from "@/lib/domain/types";
import { useWorkspace } from "./providers";
import {
  PageHeading,
  ScoreBadge,
  Pick,
  StatusBadge,
  EmptyState,
} from "./primitives";
import { BusinessIcon } from "./lead-card";
import { LeadSheet } from "./lead-sheet";
import { useLeadTools } from "./lead-tools";
import { ExportDialog } from "./export-dialog";
export function CRM() {
  const { data, refresh, updateBusiness } = useWorkspace();
  const pending = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState(new Set<string>());
  const [items, setItems] = useState<Business[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Business | null>(null);
  const [dragOver, setDragOver] = useState("");
  const [exporting, setExporting] = useState(false);
  const tools = useLeadTools();
  const saved = items;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        api<{ businesses: Business[]; total: number }>(
          `leads?saved=true&page=${page}&page_size=50&q=${encodeURIComponent(query)}`,
          undefined,
          controller.signal,
        )
          .then((result) => {
            setItems(result.businesses);
            setTotal(result.total);
            setError("");
            setLoading(false);
          })
          .catch((error) => {
            if (!controller.signal.aborted) {
              setError(errorMessage(error));
              setLoading(false);
            }
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, query, revision]);
  async function move(b: Business, stage: string) {
    if (pending.current.has(b.id) || stage === b.lead_status) return;
    pending.current.add(b.id);
    setPendingIds(new Set(pending.current));
    const old = { ...b };
    setItems((items) =>
      items.map((item) =>
        item.id === b.id ? { ...item, lead_status: stage } : item,
      ),
    );
    updateBusiness({ ...b, lead_status: stage });
    try {
      const r = await api<Business>("leads/save", { business_id: b.id, stage });
      updateBusiness(r);
      setItems((items) => items.map((item) => (item.id === b.id ? r : item)));
      await refresh();
      toast.success(`${b.business_name} movido para ${stage}.`);
    } catch (e) {
      updateBusiness(old);
      setItems((items) => items.map((item) => (item.id === b.id ? old : item)));
      toast.error(errorMessage(e));
    } finally {
      pending.current.delete(b.id);
      setPendingIds(new Set(pending.current));
      setRevision((v) => v + 1);
    }
  }
  const summary = [
    { label: "Leads no CRM", count: data.stats.saved, icon: Kanban },
    {
      label: "Em negociação",
      count: data.stats.negotiating,
      icon: MessageSquareText,
    },
    { label: "Clientes fechados", count: data.stats.closed, icon: CircleCheck },
  ];
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="RELACIONAMENTOS, EM UM SÓ LUGAR"
        title="Seu pipeline de oportunidades"
        description="Do primeiro interesse à contratação. Cada conversa tem seu próximo passo."
        actions={
          <>
            <Button
              variant="outline"
              aria-label="Exportar"
              onClick={() => setExporting(true)}
              disabled={!saved.length}
            >
              <Download size={15} />
              <span className="desktop-label">Exportar</span>
            </Button>
            <Button asChild>
              <Link href="/">
                <Plus size={16} />
                Adicionar leads
              </Link>
            </Button>
          </>
        }
      />
      <div className="crm-summary">
        {summary.map((s) => (
          <div key={s.label} className="crm-summary-card panel">
            <s.icon size={18} />
            <span>{s.label}</span>
            <strong>{s.count}</strong>
          </div>
        ))}
      </div>
      <div className="crm-toolbar">
        <label className="crm-search">
          <Search size={16} />
          <input
            placeholder="Buscar por negócio, nicho ou tag…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
              setLoading(true);
            }}
            aria-label="Buscar no CRM"
          />
        </label>
        <span className="note">Arraste os cards ou use “Mover para”.</span>
      </div>
      <div className="crm-toolbar" aria-live="polite">
        <span className="note">
          {loading
            ? "Carregando leads…"
            : `${total} leads · página ${page} de ${Math.max(1, Math.ceil(total / 50))}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => {
              setPage((p) => p - 1);
              setLoading(true);
            }}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={page * 50 >= total || loading}
            onClick={() => {
              setPage((p) => p + 1);
              setLoading(true);
            }}
          >
            Próxima
          </Button>
        </div>
      </div>
      {error && (
        <div role="alert" className="panel p-4">
          <p>{error}</p>
          <Button
            onClick={() => {
              setRevision((r) => r + 1);
              setLoading(true);
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {!loading && !saved.length ? (
        <div className="panel">
          <EmptyState
            title="Seu pipeline começa com um bom lead"
            description="Salve uma oportunidade na pesquisa para acompanhar a abordagem e a proposta aqui."
            action={
              <Button asChild>
                <Link href="/">Explorar negócios</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div
          className="kanban-board"
          role="region"
          aria-label="Pipeline de vendas"
          tabIndex={0}
        >
          {STAGES.map((stage, i) => {
            const leads = saved.filter((b) => b.lead_status === stage);
            return (
              <section
                className={`kanban-column ${dragOver === stage ? "drag-over" : ""}`}
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver("")}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver("");
                  const lead = saved.find(
                    (b) =>
                      b.id ===
                      e.dataTransfer.getData("application/x-orbit-lead"),
                  );
                  if (lead) void move(lead, stage);
                }}
              >
                <div className="kanban-column-header">
                  <i className={`stage-dot stage-${i}`} />
                  <h2>{stage}</h2>
                  <span>{leads.length}</span>
                </div>
                <div className="kanban-cards">
                  {leads.map((b) => (
                    <article
                      className="kanban-card panel"
                      key={b.id}
                      aria-busy={pendingIds.has(b.id)}
                      draggable={!pendingIds.has(b.id)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/x-orbit-lead",
                          b.id,
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <div className="kanban-card-top">
                        <BusinessIcon category={b.category} />
                        <GripVertical size={14} className="dim ml-auto" />
                      </div>
                      <button
                        className="text-left"
                        onClick={() => setSelected(b)}
                      >
                        <h3>{b.business_name}</h3>
                        <p>{b.category}</p>
                      </button>
                      <div className="kanban-card-meta">
                        <span>
                          <MapPin size={12} />
                          {b.city}
                        </span>
                        <ScoreBadge score={b.lead_score} />
                      </div>
                      <StatusBadge status={b.website_status} compact />
                      {b.tags.length > 0 && (
                        <div className="tag-row">
                          {b.tags.map((t) => (
                            <span key={t}>{t}</span>
                          ))}
                        </div>
                      )}
                      {b.notes && (
                        <p className="kanban-note">{b.notes.slice(0, 120)}</p>
                      )}
                      <div className="kanban-card-actions">
                        <button
                          aria-label={`Gerar site para ${b.business_name}`}
                          onClick={() => tools.generate(b)}
                        >
                          <Sparkles size={14} />
                        </button>
                        <button
                          aria-label={`Gerar abordagem para ${b.business_name}`}
                          onClick={() => tools.script(b)}
                        >
                          <MessageSquareText size={14} />
                        </button>
                      </div>
                      <Pick
                        disabled={pendingIds.has(b.id)}
                        value={b.lead_status}
                        onChange={(v) => void move(b, v)}
                        label={`Mover ${b.business_name} para`}
                        items={STAGES}
                        className="stage-select"
                      />
                    </article>
                  ))}
                  {!leads.length && (
                    <div className="kanban-empty">
                      <Plus size={16} />
                      <span>Arraste um lead para cá</span>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <LeadSheet
        business={
          selected
            ? (items.find((b) => b.id === selected.id) ??
              data.businesses.find((b) => b.id === selected.id) ??
              selected)
            : null
        }
        onClose={() => setSelected(null)}
        onGenerate={tools.generate}
        onScript={tools.script}
        onProposal={tools.proposal}
      />
      {tools.dialogs}
      {exporting && (
        <ExportDialog
          ids={saved.map((b) => b.id)}
          close={() => setExporting(false)}
        />
      )}
    </div>
  );
}
