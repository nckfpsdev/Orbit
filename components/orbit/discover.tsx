"use client";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Star,
  CircleSlash2,
  Compass,
  Download,
  Layers3,
  List,
  Map as MapIcon,
  Plus,
  FlaskConical,
  TriangleAlert,
  Bookmark,
  Tag,
  Kanban,
  X,
  ScanSearch,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  DEFAULT_FILTERS,
  NICHES,
  STATES,
  STAGES,
} from "@/lib/domain/constants";
import { filterBusinesses, parseNaturalSearch } from "@/lib/domain/filters";
import { api, errorMessage } from "@/lib/client/api";
import type {
  Business,
  SearchFilters,
  SearchResponse,
} from "@/lib/domain/types";
import { useWorkspace } from "./providers";
import { PageHeading, Pick, Action, EmptyState } from "./primitives";
import { BusinessMap } from "./map";
import { LeadCard } from "./lead-card";
import { LeadSheet } from "./lead-sheet";
import { useLeadTools } from "./lead-tools";
import { ExportDialog } from "./export-dialog";
import { Copilot } from "./copilot";
export function Discover() {
  const { data, refresh, updateBusiness } = useWorkspace();
  const tools = useLeadTools();
  const params = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    provider: data.settings.provider,
  });
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [view, setView] = useState("split");
  const [natural, setNatural] = useState("");
  const [interpreted, setInterpreted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Business | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [exportIds, setExportIds] = useState<string[] | null>(null);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [batchDialog, setBatchDialog] = useState<"tag" | "move" | null>(null);
  const [tag, setTag] = useState("");
  const [stage, setStage] = useState("Contact");
  const request = useRef<AbortController | null>(null);
  const bounds = useRef<[number, number, number, number] | undefined>(
    undefined,
  );
  const patch = useCallback((values: Partial<SearchFilters>) => {
    setFilters((old) => ({ ...old, ...values }));
    setPage(1);
  }, []);
  const stored = new Map(data.businesses.map((b) => [b.id, b]));
  const initial = data.businesses.filter(
    (b) =>
      b.source === data.settings.provider &&
      b.category === DEFAULT_FILTERS.category &&
      b.city === DEFAULT_FILTERS.city,
  );
  const raw = (result?.businesses ?? initial).map((b) => ({
    ...b,
    ...stored.get(b.id),
    distance_km: b.distance_km,
  }));
  const results = filterBusinesses(raw, {
    ...filters,
    neighborhood: result?.filters.neighborhood ?? "",
    radius: result?.filters.radius ?? DEFAULT_FILTERS.radius,
    bounds: undefined,
    sub_category: filters.sub_category,
  });
  const center = result?.center ?? {
    latitude: raw[0]?.latitude ?? -3.735,
    longitude: raw[0]?.longitude ?? -38.507,
  };
  const resultLocation = result?.filters.city ?? DEFAULT_FILTERS.city;
  const resultCategory = result?.filters.category ?? DEFAULT_FILTERS.category;
  const isDemo = result?.is_demo ?? raw.some((b) => b.is_demo);
  const high = results.filter((b) => b.lead_score >= 80).length;
  const noSite = results.filter((b) =>
    ["not_identified", "social_only", "aggregator", "directory"].includes(
      b.website_status,
    ),
  ).length;
  const selectedLead = selected
    ? (stored.get(selected.id) ??
      results.find((b) => b.id === selected.id) ??
      selected)
    : null;
  async function search(f: SearchFilters = filters) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const r = await api<SearchResponse>("search", f, controller.signal);
      setResult(r);
      setFilters(r.filters);
      setPage(1);
      setChecked(new Set());
      await refresh();
      toast.success(
        `${r.total} negócios encontrados${r.cached ? " · busca em cache" : ""}.`,
      );
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const searchId = params.get("search");
    if (!searchId) return;
    const controller = new AbortController();
    api<SearchResponse>(`search/${searchId}`, undefined, controller.signal)
      .then((r) => {
        setResult(r);
        setFilters(r.filters);
        setInterpreted(["Pesquisa recuperada do histórico"]);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [params]);
  const onSelect = useCallback((b: Business) => setSelected(b), []);
  const onBounds = useCallback((b: [number, number, number, number]) => {
    bounds.current = b;
  }, []);
  async function save(b: Business) {
    try {
      const lead = await api<Business>("leads/save", { business_id: b.id });
      updateBusiness(lead);
      await refresh();
      toast.success("Lead salvo no CRM.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function analyze(b: Business) {
    setSelected(b);
    try {
      const r = await api<{ business: Business }>(`leads/${b.id}/enrich`, {});
      updateBusiness(r.business);
      setSelected(r.business);
      await refresh();
      toast.success("Análise de presença digital atualizada.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  function interpret() {
    const r = parseNaturalSearch(natural, filters);
    setFilters(r.filters);
    setInterpreted(r.interpreted);
    if (r.unresolved.length) toast.info(r.unresolved[0]);
    else toast.success("Filtros interpretados. Revise e clique em Pesquisar.");
  }
  async function batchAction(action: string) {
    try {
      await api("leads/batch", {
        ids: [...checked],
        action,
        ...(action === "tag" ? { tag } : {}),
        ...(action === "move" ? { stage } : {}),
      });
      if (action === "analyze") {
        toast.info("Análises adicionadas à fila. Processando…");
        for (let i = 0; i < Math.ceil(checked.size / 3); i++)
          await api("jobs/process", {});
      }
      await refresh();
      setChecked(new Set());
      setBatchDialog(null);
      toast.success("Ação concluída.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const allNiches = useMemo(
    () =>
      NICHES.includes(filters.category)
        ? NICHES
        : [filters.category, ...NICHES],
    [filters.category],
  );
  const totalPages = Math.max(1, Math.ceil(results.length / 4));
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="PROSPECÇÃO INTELIGENTE"
        title="Encontre seu próximo cliente."
        description="Negócios locais. Oportunidades reais. Uma proposta que faz a diferença."
        actions={
          <>
            <span className="mode-pill">
              <Globe2 size={13} />
              Brasil
            </span>
            <Button
              variant="outline"
              aria-label="Exportar leads"
              onClick={() =>
                setExportIds(
                  checked.size ? [...checked] : results.map((b) => b.id),
                )
              }
              disabled={!results.length}
            >
              <Download size={15} />
              <span className="desktop-label">Exportar leads</span>
            </Button>
          </>
        }
      />
      <div className="stat-grid">
        {[
          {
            icon: Compass,
            label: "Negócios encontrados",
            value: results.length,
            sub: "Na área pesquisada",
            className: "",
          },
          {
            icon: CircleSlash2,
            label: "Sem site próprio identificado",
            value: noSite,
            sub: "Nas fontes consultadas",
            className: "orange",
          },
          {
            icon: Star,
            label: "Oportunidades fortes",
            value: high,
            sub: "Score de 80 a 100",
            className: "green",
          },
          {
            icon: Bookmark,
            label: "Leads no seu CRM",
            value: data.stats.saved,
            sub: "Prontos para o próximo passo",
            className: "",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card panel">
            <div className={`stat-icon ${s.className}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="stat-label">{s.label}</p>
              <div className="stat-value">{s.value}</div>
              <p className="stat-sub">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="panel search-panel">
        <div className="search-panel-head">
          <strong>
            <Search size={16} />
            Onde vamos prospectar?
          </strong>
          <span className="small-label">
            Localização + nicho + oportunidade
          </span>
        </div>
        <div className="natural-search">
          <Sparkles size={16} />
          <input
            aria-label="Pesquisa em linguagem natural"
            placeholder="Ex.: academias em Fortaleza, raio de 8 km, sem site…"
            value={natural}
            onChange={(e) => setNatural(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") interpret();
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={interpret}
            disabled={!natural.trim()}
          >
            Interpretar
          </Button>
        </div>
        {interpreted.length > 0 && (
          <div className="interpreted-filters">
            {interpreted.map((t) => (
              <span className="filter-chip" key={t}>
                <Check size={12} />
                {t}
              </span>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search({ ...filters, bounds: undefined });
          }}
        >
          <div className="search-form-grid">
            <div className="form-field">
              <label>Estado</label>
              <Pick
                label="Estado"
                value={filters.state}
                onChange={(v) => patch({ state: v })}
                items={STATES.map((s) => ({
                  value: s,
                  label: s === "CE" ? "Ceará" : s,
                }))}
              />
            </div>
            <label className="form-field">
              <span className="small-label">Cidade</span>
              <input
                value={filters.city}
                onChange={(e) => patch({ city: e.target.value })}
                required
                minLength={2}
              />
            </label>
            <label className="form-field">
              <span className="small-label">CEP · opcional</span>
              <input
                placeholder="60160-230"
                value={filters.postal_code}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) =>
                  patch({ postal_code: e.target.value.replace(/[^0-9-]/g, "") })
                }
              />
            </label>
            <div className="form-field niche-combobox">
              <label className="flex justify-between">
                Nicho
                <button
                  type="button"
                  aria-label="Adicionar nicho personalizado"
                  onClick={() => setCustom(true)}
                  className="text-primary"
                >
                  <Plus size={13} />
                </button>
              </label>
              <Combobox
                items={allNiches}
                value={filters.category}
                onValueChange={(v) => {
                  if (v) patch({ category: v });
                }}
              >
                <ComboboxInput
                  aria-label="Nicho comercial"
                  placeholder="Selecione um nicho"
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    Nenhum nicho. Use + para adicionar.
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <label className="form-field">
              <span className="small-label">Raio · km</span>
              <input
                type="number"
                min="1"
                max="50"
                value={filters.radius}
                onChange={(e) => patch({ radius: Number(e.target.value) })}
              />
            </label>
            <Action busy={busy} type="submit" className="search-submit">
              <Search size={16} />
              {busy ? "Buscando…" : "Pesquisar"}
            </Action>
          </div>
          <div className="filter-bottom">
            <div className="prioritize-control">
              <Sparkles size={15} />
              <label htmlFor="prioritize">Priorizar empresas sem site</label>
              <Switch
                id="prioritize"
                checked={filters.prioritize_no_site}
                onCheckedChange={(v) => patch({ prioritize_no_site: v })}
              />
            </div>
            <button
              type="button"
              className="advanced-trigger"
              onClick={() => setAdvanced((v) => !v)}
              aria-expanded={advanced}
            >
              <SlidersHorizontal size={14} />
              Filtros avançados
            </button>
          </div>
          {advanced && (
            <div className="advanced-grid">
              <div className="form-field">
                <label>Fonte dos dados</label>
                <Pick
                  label="Provedor"
                  value={filters.provider}
                  onChange={(v) =>
                    patch({ provider: v as SearchFilters["provider"] })
                  }
                  items={[
                    ...(data.provider_status.mock
                      ? [{ value: "mock", label: "Demonstração · fictício" }]
                      : []),
                    { value: "osm", label: "OpenStreetMap · dados reais" },
                    ...(data.provider_status.licensed
                      ? [{ value: "licensed", label: "Provedor licenciado" }]
                      : []),
                  ]}
                />
              </div>
              <div className="form-field">
                <label>País</label>
                <Pick
                  value={filters.country}
                  onChange={(v) => patch({ country: v })}
                  label="País"
                  items={["Brasil"]}
                />
              </div>
              <label className="form-field">
                <span className="small-label">Bairro</span>
                <input
                  value={filters.neighborhood}
                  onChange={(e) => patch({ neighborhood: e.target.value })}
                  placeholder="Qualquer bairro"
                />
              </label>
              <div className="form-field">
                <label>Presença digital</label>
                <Pick
                  label="Situação digital"
                  value={filters.website_filter}
                  onChange={(v) => patch({ website_filter: v })}
                  items={[
                    { value: "all", label: "Todas as situações" },
                    { value: "no_own", label: "Sem site próprio identificado" },
                    { value: "none", label: "Nenhum site identificado" },
                    {
                      value: "instagram",
                      label: "Instagram, sem site próprio",
                    },
                    { value: "facebook", label: "Facebook, sem site próprio" },
                    { value: "aggregator", label: "Agregador de links" },
                    { value: "directory", label: "Diretório ou marketplace" },
                    {
                      value: "own_website",
                      label: "Site próprio identificado",
                    },
                    {
                      value: "needs_improvement",
                      label: "Melhorias verificadas",
                    },
                    {
                      value: "unavailable",
                      label: "Site indisponível verificado",
                    },
                    { value: "inconclusive", label: "Análise inconclusiva" },
                  ]}
                />
              </div>
              <label className="form-field">
                <span className="small-label">Avaliações · mínimo</span>
                <input
                  type="number"
                  min="0"
                  value={filters.min_reviews}
                  onChange={(e) =>
                    patch({ min_reviews: Number(e.target.value) })
                  }
                />
              </label>
              <label className="form-field">
                <span className="small-label">Nota · mínima</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step=".1"
                  value={filters.min_rating}
                  onChange={(e) =>
                    patch({ min_rating: Number(e.target.value) })
                  }
                />
              </label>
              <label className="form-field">
                <span className="small-label">Score · mínimo</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.min_score}
                  onChange={(e) => patch({ min_score: Number(e.target.value) })}
                />
              </label>
              <div className="form-field">
                <label>Estágio do CRM</label>
                <Pick
                  value={filters.crm_status}
                  onChange={(v) => patch({ crm_status: v })}
                  label="Estágio"
                  items={[
                    { value: "all", label: "Todos os estágios" },
                    ...STAGES,
                  ]}
                />
              </div>
              <label className="form-field">
                <span className="small-label">Subcategoria</span>
                <input
                  value={filters.sub_category}
                  onChange={(e) => patch({ sub_category: e.target.value })}
                />
              </label>
              <div className="form-field justify-end">
                <label className="filter-checkbox">
                  <Checkbox
                    checked={filters.has_whatsapp}
                    onCheckedChange={(v) => patch({ has_whatsapp: v === true })}
                  />
                  WhatsApp disponível
                </label>
                <label className="filter-checkbox">
                  <Checkbox
                    checked={filters.has_phone}
                    onCheckedChange={(v) => patch({ has_phone: v === true })}
                  />
                  Telefone disponível
                </label>
              </div>
            </div>
          )}
        </form>
      </section>
      {isDemo && (
        <div className="demo-notice">
          <FlaskConical size={16} />
          <span>
            <strong>Modo demonstração.</strong> Negócios, contatos e avaliações
            abaixo são fictícios. Teste o fluxo ou escolha uma fonte real.
          </span>
          <Link href="/settings">Conectar fontes</Link>
        </div>
      )}
      {error && (
        <div className="error-notice" role="alert">
          <TriangleAlert size={18} />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError("")}
            aria-label="Fechar erro"
          >
            <X size={14} />
          </Button>
        </div>
      )}
      {result?.partial && (
        <div className="demo-notice">
          <TriangleAlert size={16} />
          Resultado parcial. Reduza o raio para uma pesquisa mais completa.
        </div>
      )}
      {result && !isDemo && result.warnings.length > 0 && (
        <p className="note mb-4">{result.warnings[0]}</p>
      )}
      <div className="result-header">
        <div>
          <h2>
            Negócios na sua região
            <span className="result-count">{results.length}</span>
          </h2>
          <p className="result-summary">
            {resultLocation} · {resultCategory}
            {result?.cached ? " · resultado em cache" : ""}
          </p>
        </div>
        <div className="result-controls">
          <Pick
            value={filters.sort}
            label="Ordenação"
            onChange={(v) => patch({ sort: v })}
            items={[
              { value: "score", label: "Maior oportunidade" },
              { value: "score_asc", label: "Menor oportunidade" },
              { value: "no_site", label: "Sem site primeiro" },
              { value: "reviews", label: "Mais avaliações" },
              { value: "rating", label: "Maior avaliação" },
              { value: "distance", label: "Mais próximos" },
              { value: "recent", label: "Mais recentes" },
            ]}
          />
          <Tabs className="view-toggle" value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="split" aria-label="Mapa e lista">
                <Layers3 size={14} />
                <span className="desktop-only">Ambos</span>
              </TabsTrigger>
              <TabsTrigger value="map" aria-label="Mapa">
                <MapIcon size={14} />
              </TabsTrigger>
              <TabsTrigger value="list" aria-label="Lista">
                <List size={14} />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {checked.size > 0 && (
        <div className="bulk-bar">
          <strong>{checked.size} selecionados</strong>
          <Button variant="outline" onClick={() => void batchAction("save")}>
            <Bookmark size={13} />
            Salvar
          </Button>
          <Button variant="outline" onClick={() => setBatchDialog("tag")}>
            <Tag size={13} />
            Tag
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStage("Contato pendente");
              setBatchDialog("move");
            }}
          >
            <Kanban size={13} />
            Mover
          </Button>
          <Button variant="outline" onClick={() => void batchAction("analyze")}>
            <ScanSearch size={13} />
            Analisar
          </Button>
          <Button variant="outline" onClick={() => setExportIds([...checked])}>
            <Download size={13} />
            Exportar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChecked(new Set())}
            aria-label="Limpar seleção"
          >
            <X size={14} />
          </Button>
        </div>
      )}
      <div
        className={`discovery-grid view-${view} ${view === "list" ? "list-only" : view === "map" ? "map-only" : ""}`}
      >
        <div className="map-side">
          <BusinessMap
            businesses={results}
            center={center}
            radius={result?.filters.radius ?? 10}
            selectedId={selected?.id}
            onSelect={onSelect}
            onBounds={onBounds}
            onSearchArea={() =>
              void search({ ...filters, bounds: bounds.current })
            }
            busy={busy}
            city={resultLocation}
          />
          <p className="map-caption">
            Dados cartográficos © OpenStreetMap. A ausência de site nas fontes
            não é uma confirmação.
          </p>
        </div>
        <div className="lead-results">
          {busy ? (
            [1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))
          ) : results.length ? (
            results
              .slice(
                (Math.min(page, totalPages) - 1) * 4,
                Math.min(page, totalPages) * 4,
              )
              .map((b, i) => (
                <LeadCard
                  key={b.id}
                  business={b}
                  index={i}
                  selected={selected?.id === b.id}
                  checked={checked.has(b.id)}
                  onCheck={(b, v) =>
                    setChecked((old) => {
                      const next = new Set(old);
                      if (v) next.add(b.id);
                      else next.delete(b.id);
                      return next;
                    })
                  }
                  onOpen={onSelect}
                  onSave={(b) => void save(b)}
                  onGenerate={tools.generate}
                  onAnalyze={(b) => void analyze(b)}
                />
              ))
          ) : (
            <div className="panel">
              <EmptyState
                title="Nenhum negócio com estes filtros"
                description="Amplie a região, reduza as exigências ou escolha outra fonte."
                action={
                  <Button
                    variant="outline"
                    onClick={() =>
                      patch({
                        website_filter: "all",
                        min_score: 0,
                        min_reviews: 0,
                        min_rating: 0,
                        has_phone: false,
                        has_whatsapp: false,
                        crm_status: "all",
                      })
                    }
                  >
                    Limpar filtros
                  </Button>
                }
              />
            </div>
          )}
          {results.length > 0 && (
            <div className="list-pagination">
              <span>
                Exibindo {Math.min((page - 1) * 4 + 1, results.length)}–
                {Math.min(page * 4, results.length)} de {results.length}
              </span>
              <Pagination aria-label="Páginas de leads">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#results"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      aria-label="Página anterior"
                      aria-disabled={page === 1}
                    >
                      <ChevronLeft size={15} />
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <span>
                      {Math.min(page, totalPages)} / {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#results"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      aria-label="Próxima página"
                      aria-disabled={page >= totalPages}
                    >
                      <ChevronRight size={15} />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
      <LeadSheet
        business={selectedLead}
        onClose={() => setSelected(null)}
        onGenerate={tools.generate}
        onScript={tools.script}
        onProposal={tools.proposal}
      />
      {tools.dialogs}
      {exportIds && (
        <ExportDialog ids={exportIds} close={() => setExportIds(null)} />
      )}
      <Dialog open={custom} onOpenChange={setCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar nicho personalizado</DialogTitle>
            <DialogDescription>
              Descreva o tipo de negócio que você quer encontrar.
            </DialogDescription>
          </DialogHeader>
          <input
            className="orbit-input"
            placeholder="Ex.: clínicas de harmonização facial"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            maxLength={180}
          />
          <Button
            disabled={customName.trim().length < 2}
            onClick={() => {
              patch({ category: customName.trim() });
              setCustom(false);
              setCustomName("");
            }}
          >
            Usar este nicho
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!batchDialog}
        onOpenChange={(v) => {
          if (!v) setBatchDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {batchDialog === "tag" ? "Adicionar tag" : "Mover no CRM"}
            </DialogTitle>
            <DialogDescription>
              {checked.size} negócios selecionados
            </DialogDescription>
          </DialogHeader>
          {batchDialog === "tag" ? (
            <input
              className="orbit-input"
              placeholder="Ex.: Prioridade Fortaleza"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              maxLength={40}
            />
          ) : (
            <Pick
              value={stage}
              onChange={setStage}
              label="Estágio"
              items={STAGES}
            />
          )}
          <Button
            onClick={() => void batchAction(batchDialog!)}
            disabled={batchDialog === "tag" && !tag.trim()}
          >
            Aplicar aos leads
          </Button>
        </DialogContent>
      </Dialog>
      <Copilot
        businesses={results}
        selectedIds={[...checked]}
        onFilters={patch}
        onOpen={onSelect}
        onGenerate={tools.generate}
        onScript={tools.script}
        onProposal={tools.proposal}
      />
    </div>
  );
}
