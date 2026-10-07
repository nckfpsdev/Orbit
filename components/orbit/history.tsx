"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Search,
  RefreshCw,
  Radar,
  Plus,
  Pause,
  Play,
  MapPin,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useWorkspace } from "./providers";
import { PageHeading, EmptyState, Pick, Action } from "./primitives";
import { api, errorMessage, dateLabel } from "@/lib/client/api";
import type { SearchResponse } from "@/lib/domain/types";
interface MonitorRecord {
  id: string;
  name: string;
  enabled: number;
  interval_hours: number;
  next_run_at: string;
  last_run_at: string | null;
  filters_json: string;
}
export function SearchHistory() {
  const { data, refresh } = useWorkspace();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [monitors, setMonitors] = useState<MonitorRecord[]>([]);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [searchId, setSearchId] = useState(data.searches[0]?.id ?? "none");
  const [name, setName] = useState("");
  const [interval, setInterval] = useState("24");
  const [tab, setTab] = useState("history");
  useEffect(() => {
    const controller = new AbortController();
    api<MonitorRecord[]>("monitors", undefined, controller.signal)
      .then(setMonitors)
      .catch((e) => {
        if (!controller.signal.aborted) toast.error(errorMessage(e));
      });
    return () => controller.abort();
  }, []);
  async function repeat(id: string) {
    const s = data.searches.find((x) => x.id === id);
    if (!s) return;
    setBusy(id);
    try {
      const r = await api<SearchResponse>("search", s.filters);
      await refresh();
      router.push(`/?search=${r.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function createMonitor(e: React.FormEvent) {
    e.preventDefault();
    const s = data.searches.find((x) => x.id === searchId);
    if (!s) return;
    setBusy("monitor");
    try {
      await api("monitors", {
        name: name || s.name,
        filters: s.filters,
        interval_hours: Number(interval),
        enabled: false,
      });
      setMonitors(await api("monitors"));
      setMonitorOpen(false);
      setTab("monitors");
      toast.success(
        "Monitor salvo como pausado. Você pode executá-lo manualmente.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function runMonitor(m: MonitorRecord) {
    setBusy(m.id);
    try {
      const r = await api<SearchResponse>(`monitors/${m.id}/run`, {});
      await refresh();
      setMonitors(await api("monitors"));
      router.push(`/?search=${r.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function toggle(m: MonitorRecord) {
    try {
      await api(`monitors/${m.id}`, { enabled: !m.enabled });
      setMonitors(await api("monitors"));
      toast.success(m.enabled ? "Monitor pausado." : "Monitor ativado.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="CONTEXTO QUE VOCÊ NÃO PERDE"
        title="Histórico de pesquisas"
        description="Retome uma região ou prepare um monitor para acompanhar novas oportunidades."
        actions={
          <Button
            onClick={() => setMonitorOpen(true)}
            disabled={!data.searches.length}
          >
            <Radar size={16} />
            Criar monitor
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="gallery-tabs">
          <TabsTrigger value="history">
            <Clock size={15} />
            Pesquisas<span className="tab-count">{data.searches.length}</span>
          </TabsTrigger>
          <TabsTrigger value="monitors">
            <Radar size={15} />
            Monitores<span className="tab-count">{monitors.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          {data.searches.length ? (
            <div className="history-list">
              {data.searches.map((s) => (
                <article className="panel history-card" key={s.id}>
                  <div className="business-icon">
                    <Search size={20} />
                  </div>
                  <div className="history-card-info">
                    <h3>
                      {s.filters.city} / {s.filters.category}
                    </h3>
                    <p>
                      <MapPin size={12} />
                      {s.filters.state} · {s.filters.radius} km · {s.count}{" "}
                      negócios{" "}
                      {s.filters.provider === "mock" && (
                        <span>
                          <FlaskConical size={12} />
                          Fictícios
                        </span>
                      )}
                    </p>
                    <small>
                      {dateLabel(s.created_at)} ·{" "}
                      {s.filters.website_filter === "all"
                        ? "Todos os negócios"
                        : "Filtro de presença digital aplicado"}
                    </small>
                  </div>
                  <div className="history-card-actions">
                    <Button asChild variant="ghost">
                      <Link href={`/?search=${s.id}`}>Ver resultados</Link>
                    </Button>
                    <Action
                      busy={busy === s.id}
                      variant="outline"
                      onClick={() => void repeat(s.id)}
                    >
                      <RefreshCw size={14} />
                      Pesquisar novamente
                    </Action>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                title="Todas as regiões ficam na memória"
                description="Suas buscas serão salvas aqui, com filtros e quantidade de resultados."
                action={
                  <Button asChild>
                    <Link href="/">Fazer uma pesquisa</Link>
                  </Button>
                }
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="monitors">
          <div className="demo-notice">
            <Radar size={16} />
            {data.provider_status.scheduler
              ? "Agendador conectado. Ative apenas as pesquisas que deseja monitorar."
              : "Execução periódica ainda não conectada. Monitores ficam pausados e podem ser executados manualmente."}
          </div>
          {monitors.length ? (
            <div className="history-list">
              {monitors.map((m) => (
                <article key={m.id} className="panel history-card">
                  <div className="business-icon">
                    <Radar size={20} />
                  </div>
                  <div className="history-card-info">
                    <h3>{m.name}</h3>
                    <p>
                      {m.enabled ? "Ativo" : "Pausado"} · intervalo de{" "}
                      {m.interval_hours}h
                    </p>
                    <small>
                      {m.last_run_at
                        ? `Última execução: ${dateLabel(m.last_run_at)}`
                        : "Nenhuma execução registrada"}
                    </small>
                  </div>
                  <div className="history-card-actions">
                    <Button
                      variant="outline"
                      onClick={() => void toggle(m)}
                      disabled={!m.enabled && !data.provider_status.scheduler}
                    >
                      {m.enabled ? <Pause size={14} /> : <Play size={14} />}{" "}
                      {m.enabled ? "Pausar" : "Ativar"}
                    </Button>
                    <Action
                      busy={busy === m.id}
                      onClick={() => void runMonitor(m)}
                    >
                      <RefreshCw size={14} />
                      Executar agora
                    </Action>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                title="Uma região, acompanhada com intenção"
                description="Escolha uma busca anterior para criar um monitor. A frequência e a ativação ficam sob seu controle."
                action={
                  <Button
                    onClick={() => setMonitorOpen(true)}
                    disabled={!data.searches.length}
                  >
                    <Plus size={15} />
                    Criar monitor
                  </Button>
                }
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={monitorOpen} onOpenChange={setMonitorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preparar monitor de oportunidades</DialogTitle>
            <DialogDescription>
              As fontes e os filtros da pesquisa selecionada serão reutilizados.
            </DialogDescription>
          </DialogHeader>
          <form className="dialog-form" onSubmit={(e) => void createMonitor(e)}>
            <Pick
              value={searchId}
              onChange={setSearchId}
              label="Pesquisa de origem"
              items={
                data.searches.length
                  ? data.searches.map((s) => ({ value: s.id, label: s.name }))
                  : [{ value: "none", label: "Faça uma pesquisa primeiro" }]
              }
            />
            <input
              className="orbit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do monitor"
            />
            <Pick
              value={interval}
              onChange={setInterval}
              label="Frequência"
              items={[
                { value: "24", label: "A cada 24 horas" },
                { value: "72", label: "A cada 3 dias" },
                { value: "168", label: "Semanalmente" },
              ]}
            />
            <p className="note">
              O monitor será salvo pausado. Ative quando o agendador estiver
              conectado e a fonte permitir consultas periódicas.
            </p>
            <Action
              type="submit"
              busy={busy === "monitor"}
              disabled={searchId === "none"}
            >
              Salvar monitor pausado
            </Action>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
