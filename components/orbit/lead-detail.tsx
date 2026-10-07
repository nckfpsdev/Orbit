"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Star,
  Sparkles,
  ScanSearch,
  BookmarkCheck,
  MessageSquareText,
  FileText,
  Save,
  CircleCheck,
  CircleHelp,
  CircleX,
  FlaskConical,
  ArrowLeft,
  Globe2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES } from "@/lib/domain/constants";
import { safeExternalUrl } from "@/lib/domain/presence";
import type { Business, WebsiteAudit } from "@/lib/domain/types";
import { api, errorMessage, dateLabel } from "@/lib/client/api";
import { useWorkspace } from "./providers";
import {
  ScoreBadge,
  StatusBadge,
  Pick,
  Action,
  EmptyState,
} from "./primitives";
import { BusinessIcon } from "./lead-card";
import { useLeadTools } from "./lead-tools";
interface Activity {
  id: string;
  action: string;
  detail: string;
  created_at: string;
}
export function LeadDetail({ businessId }: { businessId: string }) {
  const { data, refresh, updateBusiness } = useWorkspace();
  const tools = useLeadTools();
  const initial = data.businesses.find((b) => b.id === businessId);
  const [business, setBusiness] = useState<Business | null>(initial ?? null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [analyses, setAnalyses] = useState<WebsiteAudit[]>([]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [stage, setStage] = useState(initial?.lead_status ?? "Descoberto");
  const [list, setList] = useState(initial?.list_id ?? "none");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function load() {
    const r = await api<{
      business: Business;
      activity: Activity[];
      analyses: WebsiteAudit[];
    }>(`leads/${businessId}`);
    setBusiness(r.business);
    setActivities(r.activity);
    setAnalyses(r.analyses);
    return r;
  }
  useEffect(() => {
    const controller = new AbortController();
    api<{ business: Business; activity: Activity[]; analyses: WebsiteAudit[] }>(
      `leads/${businessId}`,
      undefined,
      controller.signal,
    )
      .then((r) => {
        setBusiness(r.business);
        setNotes(r.business.notes);
        setTags(r.business.tags.join(", "));
        setStage(r.business.lead_status);
        setList(r.business.list_id ?? "none");
        setActivities(r.activity);
        setAnalyses(r.analyses);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [businessId]);
  async function save() {
    if (!business) return;
    setBusy("save");
    try {
      const b = await api<Business>("leads/save", {
        business_id: business.id,
        notes,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        stage,
        list_id: list === "none" ? null : list,
      });
      updateBusiness(b);
      setBusiness(b);
      await refresh();
      await load();
      toast.success("Lead e observações salvos no CRM.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function analyze() {
    setBusy("analyze");
    try {
      const r = await api<{ business: Business }>(
        `leads/${businessId}/enrich`,
        {},
      );
      setBusiness(r.business);
      updateBusiness(r.business);
      await refresh();
      await load();
      toast.success("Presença digital analisada.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function audit() {
    setBusy("audit");
    try {
      await api(`leads/${businessId}/audit`, {});
      await load();
      toast.success(
        "Auditoria disponível com os critérios efetivamente verificados.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  if (error)
    return (
      <div className="panel">
        <EmptyState
          title="Lead indisponível"
          description={error}
          action={
            <Button asChild>
              <Link href="/">Explorar negócios</Link>
            </Button>
          }
        />
      </div>
    );
  if (!business) return <Skeleton className="h-[70vh] rounded-2xl" />;
  const b = business;
  const a = analyses[0];
  const websites = data.websites.filter((s) => s.business_id === b.id);
  return (
    <div className="fade-in">
      <Link href="/" className="back-link">
        <ArrowLeft size={14} />
        Explorar negócios
      </Link>
      <div className="lead-detail-heading">
        <BusinessIcon category={b.category} />
        <div>
          <p className="eyebrow">{b.category.toUpperCase()}</p>
          <h1>{b.business_name}</h1>
          <p>
            <MapPin size={13} />
            {b.city}, {b.state} · {b.neighborhood || "Bairro não informado"}
          </p>
        </div>
        <ScoreBadge score={b.lead_score} large />
      </div>
      {b.is_demo && (
        <div className="demo-notice">
          <FlaskConical size={16} />
          Negócio fictício de desenvolvimento. Contatos, reputação e evidências
          são ilustrativos.
        </div>
      )}
      <div className="lead-primary-actions">
        <Action
          busy={busy === "analyze"}
          variant="outline"
          onClick={() => void analyze()}
        >
          <ScanSearch size={15} />
          Analisar presença
        </Action>
        <Button onClick={() => tools.generate(b)}>
          <Sparkles size={15} />
          Gerar site
        </Button>
        <Button variant="outline" onClick={() => tools.script(b)}>
          <MessageSquareText size={15} />
          Gerar abordagem
        </Button>
        <Button variant="outline" onClick={() => tools.proposal(b)}>
          <FileText size={15} />
          Preparar proposta
        </Button>
        <Action
          busy={busy === "save"}
          variant="outline"
          onClick={() => void save()}
        >
          <BookmarkCheck size={15} />
          {b.saved ? "Atualizar no CRM" : "Salvar no CRM"}
        </Action>
      </div>
      <Tabs defaultValue="analysis" className="lead-detail-tabs">
        <TabsList variant="line">
          <TabsTrigger value="analysis">Visão & análise</TabsTrigger>
          <TabsTrigger value="commercial">Dados comerciais</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="sites">
            Sites & propostas
            <span className="tab-count">{websites.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analysis">
          <div className="lead-detail-grid">
            <div className="lead-main-column">
              <section className="panel">
                <div className="panel-header">
                  <h2>Presença digital</h2>
                  <StatusBadge status={b.website_status} />
                </div>
                <div className="panel-body">
                  <div className="diagnosis">
                    <h4>Diagnóstico com evidências</h4>
                    <p>{b.digital_presence.explanation}</p>
                  </div>
                  <div className="presence-evidence-grid">
                    {[
                      {
                        label: "Site próprio",
                        value:
                          b.website_status === "own_website" ? b.website : null,
                        confidence: b.digital_presence.website.confidence,
                      },
                      {
                        label: "Instagram",
                        value: b.instagram,
                        confidence: b.digital_presence.instagram.confidence,
                      },
                      {
                        label: "Facebook",
                        value: b.facebook,
                        confidence: b.digital_presence.facebook.confidence,
                      },
                      {
                        label: "WhatsApp",
                        value: b.public_whatsapp,
                        confidence: b.digital_presence.whatsapp.confidence,
                      },
                    ].map((p) => (
                      <div className="presence-evidence" key={p.label}>
                        <div>
                          {p.value ? (
                            <CircleCheck size={17} className="green-text" />
                          ) : (
                            <CircleHelp size={17} className="dim" />
                          )}
                          <strong>{p.label}</strong>
                        </div>
                        <p>
                          {p.value
                            ? "Identificado"
                            : "Não identificado nesta fonte"}
                        </p>
                        <small>
                          Confiança: {Math.round(p.confidence * 100)}%
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="checks-list">
                    {b.digital_presence.checks.map((check) => (
                      <div key={check.label}>
                        <span>
                          {check.result === "found" ? (
                            <CircleCheck size={15} />
                          ) : (
                            <CircleHelp size={15} />
                          )}
                        </span>
                        <div>
                          <strong>{check.label}</strong>
                          <p>{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="note mt-4">
                    Fontes analisadas:{" "}
                    {b.digital_presence.sources_checked.join(" · ")}
                    <br />
                    Associação do domínio:{" "}
                    {b.digital_presence.ownership === "confirmed"
                      ? "Confirmada"
                      : b.digital_presence.ownership === "probable"
                        ? "Provável"
                        : "Não confirmada"}
                    .
                  </p>
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Site atual vs. proposta</h2>
                    <p>Somente verificações reais entram na análise.</p>
                  </div>
                  <Action
                    busy={busy === "audit"}
                    variant="outline"
                    size="sm"
                    onClick={() => void audit()}
                    disabled={
                      !b.website ||
                      b.website_status === "social_only" ||
                      b.website_status === "aggregator"
                    }
                  >
                    <ScanSearch size={14} />
                    Analisar site atual
                  </Action>
                </div>
                <div className="panel-body">
                  {a && (
                    <p className="note mb-4">
                      {a.summary}
                      {a.response_ms !== null
                        ? ` Resposta HTTP: ${Math.round(a.response_ms)} ms.`
                        : ""}
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Critério</TableHead>
                        <TableHead>Site atual</TableHead>
                        <TableHead>Proposta planejada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          name: "Responsividade",
                          proposal: "Layout mobile first",
                        },
                        {
                          name: "SEO e metadata",
                          proposal: "Título, descrição e Open Graph",
                        },
                        {
                          name: "CTA e contato",
                          proposal: "Contato comercial visível",
                        },
                        {
                          name: "HTTPS declarado",
                          proposal: "Hospedagem com HTTPS",
                        },
                        {
                          name: "Performance",
                          proposal: "HTML leve · sem métricas prometidas",
                        },
                      ].map((check) => {
                        const result = a?.checks.find(
                          (x) => x.name === check.name,
                        );
                        return (
                          <TableRow key={check.name}>
                            <TableCell>{check.name}</TableCell>
                            <TableCell>
                              <span
                                className={`audit-status ${result?.status ?? "unknown"}`}
                              >
                                {result?.status === "pass" ? (
                                  <CircleCheck size={13} />
                                ) : result?.status === "fail" ? (
                                  <CircleX size={13} />
                                ) : (
                                  <CircleHelp size={13} />
                                )}{" "}
                                {result?.status === "pass"
                                  ? "Verificado"
                                  : result?.status === "fail"
                                    ? "Melhoria verificada"
                                    : "Não medido"}
                              </span>
                            </TableCell>
                            <TableCell>{check.proposal}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>
            <aside className="lead-aside">
              <section className="panel">
                <div className="panel-header">
                  <h2>Oportunidade digital</h2>
                </div>
                <div className="panel-body">
                  <ScoreBadge score={b.lead_score} large />
                  <p className="note mt-4 mb-3">
                    Motivos que compõem a pontuação:
                  </p>
                  {b.score_reasons.map((r) => (
                    <div className="score-reason" key={r.label}>
                      <span>{r.label}</span>
                      <strong>+{r.points}</strong>
                    </div>
                  ))}
                  <Link
                    href="/settings?tab=score"
                    className="small-label block mt-4 text-primary"
                  >
                    Ajustar critérios de pontuação
                  </Link>
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>No seu CRM</h2>
                </div>
                <div className="panel-body dialog-form">
                  <div className="form-field">
                    <label>Estágio</label>
                    <Pick
                      label="Estágio do CRM"
                      value={stage}
                      onChange={setStage}
                      items={STAGES}
                    />
                  </div>
                  <div className="form-field">
                    <label>Lista</label>
                    <Pick
                      label="Lista"
                      value={list}
                      onChange={setList}
                      items={[
                        { value: "none", label: "Sem lista" },
                        ...data.lists.map((l) => ({
                          value: l.id,
                          label: l.name,
                        })),
                      ]}
                    />
                  </div>
                  <label className="form-field">
                    <span className="small-label">
                      Tags · separadas por vírgula
                    </span>
                    <input
                      placeholder="Fortaleza, prioridade"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span className="small-label">Observações</span>
                    <textarea
                      placeholder="Próximo passo, interesse e contexto da conversa…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={5000}
                    />
                  </label>
                  <Action busy={busy === "save"} onClick={() => void save()}>
                    <Save size={15} />
                    Salvar no CRM
                  </Action>
                </div>
              </section>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="commercial">
          <div className="lead-detail-grid">
            <section className="panel">
              <div className="panel-header">
                <h2>Informações comerciais</h2>
              </div>
              <div className="panel-body">
                <div className="business-data-grid">
                  {[
                    { label: "Nome", value: b.business_name },
                    { label: "Categoria", value: b.category },
                    { label: "Subcategoria", value: b.sub_category },
                    { label: "País", value: b.country },
                    { label: "Estado", value: b.state },
                    { label: "Cidade", value: b.city },
                    { label: "Bairro", value: b.neighborhood },
                    { label: "CEP", value: b.postal_code },
                    { label: "Endereço", value: b.address },
                    { label: "Telefone", value: b.phone },
                    { label: "WhatsApp público", value: b.public_whatsapp },
                    { label: "Horários", value: b.opening_hours },
                  ].map((item) => (
                    <div key={item.label}>
                      <small>{item.label}</small>
                      <strong>{item.value || "Não informado"}</strong>
                    </div>
                  ))}
                </div>
                <h3 className="mt-6 mb-3">Origem e confiabilidade</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Confiança</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(b.fields)
                      .filter(
                        ([k]) =>
                          ![
                            "external_id",
                            "can_export",
                            "can_persist",
                            "services",
                          ].includes(k),
                      )
                      .map(([key, f]) => (
                        <TableRow key={key}>
                          <TableCell>{key}</TableCell>
                          <TableCell>{f.source}</TableCell>
                          <TableCell>
                            {Math.round(f.confidence * 100)}%
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </section>
            <aside className="lead-aside">
              <section className="panel">
                <div className="panel-header">
                  <h2>Reputação informada</h2>
                </div>
                <div className="panel-body">
                  <div className="reputation-number">
                    <Star size={23} fill="currentColor" />
                    <strong>
                      {b.rating?.toFixed(1).replace(".", ",") ?? "—"}
                    </strong>
                  </div>
                  <p className="note">
                    {b.reviews_count !== null
                      ? `${b.reviews_count} avaliações na fonte consultada`
                      : "A fonte não fornece avaliações."}
                  </p>
                  {b.is_demo && (
                    <p className="small-label mt-2">
                      Reputação fictícia de desenvolvimento.
                    </p>
                  )}
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>Canais identificados</h2>
                </div>
                <div className="panel-body">
                  {[
                    { label: "Website", value: b.website },
                    { label: "Instagram", value: b.instagram },
                    { label: "Facebook", value: b.facebook },
                  ].map((p) => (
                    <div key={p.label} className="detail-row">
                      <Globe2 size={16} />
                      <div>
                        <strong>{p.label}</strong>
                        <p>
                          {p.value ? (
                            b.is_demo ? (
                              p.value
                            ) : (
                              <a
                                href={safeExternalUrl(p.value)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {p.value}
                                <ExternalLink
                                  size={12}
                                  className="inline ml-1"
                                />
                              </a>
                            )
                          ) : (
                            "Não identificado"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <section className="panel">
            <div className="panel-header">
              <h2>Histórico do negócio</h2>
            </div>
            <div className="panel-body">
              <div className="history-metadata">
                <p>
                  <Clock size={15} />
                  Primeira descoberta: {dateLabel(b.created_at)}
                </p>
                <p>
                  <ScanSearch size={15} />
                  Última análise:{" "}
                  {b.last_checked_at
                    ? dateLabel(b.last_checked_at)
                    : "Ainda não realizada"}
                </p>
              </div>
              {activities.map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{a.action}</strong>
                    <p>{a.detail}</p>
                  </div>
                  <time>{dateLabel(a.created_at)}</time>
                </div>
              ))}
              {!activities.length && (
                <EmptyState
                  title="O histórico começa aqui"
                  description="Análises, notas, propostas e mudanças no CRM aparecerão nesta linha do tempo."
                />
              )}
            </div>
          </section>
        </TabsContent>
        <TabsContent value="sites">
          <div className="opportunity-grid">
            {websites.map((s) => (
              <div className="panel panel-body" key={s.id}>
                <Sparkles size={22} className="text-primary mb-3" />
                <h3>{s.business_name}</h3>
                <p className="note">
                  {s.status === "published"
                    ? "Demonstração publicada"
                    : "Rascunho"}{" "}
                  · versão {s.version}
                </p>
                <Button asChild className="mt-4">
                  <Link href={`/sites/${s.id}`}>Abrir editor</Link>
                </Button>
              </div>
            ))}
          </div>
          {!websites.length && (
            <div className="panel">
              <EmptyState
                title="Uma demonstração faz a ideia ganhar forma"
                description="Revise os dados e crie um site personalizado para apresentar ao negócio."
                action={
                  <Button onClick={() => tools.generate(b)}>
                    <Sparkles size={15} />
                    Criar demonstração
                  </Button>
                }
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
      {tools.dialogs}
    </div>
  );
}
