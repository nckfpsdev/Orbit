"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  FolderHeart,
  Download,
  Search,
  Tag,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/client/api";
import type { Business } from "@/lib/domain/types";
import { useWorkspace } from "./providers";
import {
  PageHeading,
  EmptyState,
  ScoreBadge,
  StatusBadge,
  Action,
} from "./primitives";
import { ExportDialog } from "./export-dialog";
export function Lists() {
  const { data, refresh } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("all");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Business[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        api<{ businesses: Business[]; total: number }>(
          `leads?saved=true&page=${page}&page_size=50&q=${encodeURIComponent(query)}&list_id=${selected === "all" ? "" : encodeURIComponent(selected)}`,
          undefined,
          controller.signal,
        )
          .then((result) => {
            setLeads(result.businesses);
            setTotal(result.total);
            setLoading(false);
            setError("");
          })
          .catch((failure) => {
            if (!controller.signal.aborted) {
              setError(errorMessage(failure));
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
  }, [page, query, selected, revision]);
  function selectList(listId: string) {
    setSelected(listId);
    setPage(1);
    setLoading(true);
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const list = await api<{ id: string }>("lists", { name });
      await refresh();
      selectList(list.id);
      setCreating(false);
      setName("");
      toast.success("Lista criada. Abra um lead para adicioná-lo à lista.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="PROSPECÇÃO ORGANIZADA"
        title="Listas de leads"
        description="Separe por cidade, nicho, campanha ou prioridade."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} />
            Criar lista
          </Button>
        }
      />
      <div className="lists-layout">
        <aside className="panel lists-sidebar">
          <button
            className={selected === "all" ? "active" : ""}
            onClick={() => selectList("all")}
          >
            <FolderHeart size={17} />
            <span>Todos os leads salvos</span>
            <strong>{data.stats.saved}</strong>
          </button>
          {data.lists.map((l) => (
            <button
              key={l.id}
              className={selected === l.id ? "active" : ""}
              onClick={() => selectList(l.id)}
            >
              <FolderHeart size={17} />
              <span>{l.name}</span>
              <strong>{l.count}</strong>
            </button>
          ))}
          <button onClick={() => setCreating(true)} className="text-primary">
            <Plus size={16} />
            Nova lista
          </button>
          <div className="lists-sidebar-tip">
            <Tag size={19} />
            <p>Use tags para detalhes que atravessam várias listas.</p>
          </div>
        </aside>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                {selected === "all"
                  ? "Todos os leads"
                  : data.lists.find((l) => l.id === selected)?.name}
              </h2>
              <p>{total} leads nesta seleção</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExporting(true)}
              disabled={loading || !leads.length}
            >
              <Download size={14} />
              Exportar página
            </Button>
          </div>
          <div className="panel-body">
            <label className="crm-search mb-5">
              <Search size={15} />
              <input
                placeholder="Buscar nesta lista…"
                value={query}
                maxLength={180}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                  setLoading(true);
                }}
                aria-label="Buscar na lista"
              />
            </label>
            {loading ? (
              <p role="status" className="note">
                Carregando esta seleção…
              </p>
            ) : error ? (
              <EmptyState
                title="Não foi possível carregar a lista"
                description={error}
                action={
                  <Button
                    onClick={() => {
                      setLoading(true);
                      setRevision((v) => v + 1);
                    }}
                  >
                    Tentar novamente
                  </Button>
                }
              />
            ) : leads.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Presença digital</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>CRM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link
                          href={`/leads/${b.id}`}
                          className="table-business-name"
                        >
                          {b.business_name}
                          <small>
                            {b.city} · {b.category}
                          </small>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={b.website_status} compact />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={b.lead_score} />
                      </TableCell>
                      <TableCell>{b.lead_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Uma lista pronta para receber oportunidades"
                description="Abra a página de um lead, escolha esta lista e salve no CRM."
                action={
                  <Button asChild variant="outline">
                    <Link href="/">
                      <FileText size={15} />
                      Explorar leads
                    </Link>
                  </Button>
                }
              />
            )}
            <div className="crm-pagination mt-5">
              <span>
                {total} leads · página {page} de{" "}
                {Math.max(1, Math.ceil(total / 50))}
              </span>
              <Button
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => {
                  setPage((v) => v - 1);
                  setLoading(true);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={loading || page * 50 >= total}
                onClick={() => {
                  setPage((v) => v + 1);
                  setLoading(true);
                }}
              >
                Próxima
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uma nova lista</DialogTitle>
            <DialogDescription>
              Um nome claro ajuda a encontrar a campanha depois.
            </DialogDescription>
          </DialogHeader>
          <form className="dialog-form" onSubmit={(e) => void create(e)}>
            <input
              className="orbit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fortaleza — Clínicas sem site"
              aria-label="Nome da lista"
              minLength={2}
              maxLength={100}
              required
            />
            <Action busy={busy} type="submit">
              <Plus size={15} />
              Criar lista
            </Action>
          </form>
        </DialogContent>
      </Dialog>
      {exporting && (
        <ExportDialog
          ids={leads.map((b) => b.id)}
          close={() => setExporting(false)}
        />
      )}
    </div>
  );
}
