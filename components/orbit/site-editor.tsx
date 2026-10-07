"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Monitor,
  Tablet,
  Smartphone,
  Globe2,
  Save,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Palette,
  History,
  Check,
  LayoutTemplate,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { WebsiteRecord, WebsiteContent } from "@/lib/domain/types";
import { buildSiteHtml } from "@/lib/domain/site-html";
import { api, errorMessage } from "@/lib/client/api";
import { useWorkspace } from "./providers";
import { Action, Pick, PageHeading, EmptyState } from "./primitives";
import { useLeadTools } from "./lead-tools";
const SECTIONS = [
  { value: "services", label: "Serviços" },
  { value: "about", label: "Sobre" },
  { value: "process", label: "Como funciona" },
  { value: "location", label: "Localização" },
  { value: "contact", label: "Contato" },
  { value: "hours", label: "Horários" },
];
export function SiteEditor({ websiteId }: { websiteId: string }) {
  const { data, refresh } = useWorkspace();
  const tools = useLeadTools();
  const [site, setSite] = useState<WebsiteRecord | null>(
    () => data.websites.find((s) => s.id === websiteId) ?? null,
  );
  const [form, setForm] = useState<WebsiteContent | null>(
    () => data.websites.find((s) => s.id === websiteId)?.content ?? null,
  );
  const [device, setDevice] = useState("desktop");
  const [busy, setBusy] = useState("");
  const [instruction, setInstruction] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState("about");
  useEffect(() => {
    const controller = new AbortController();
    api<WebsiteRecord>(`websites/${websiteId}`, undefined, controller.signal)
      .then((s) => {
        setSite(s);
        setForm(s.content);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [websiteId]);
  const changed =
    site && form && JSON.stringify(site.content) !== JSON.stringify(form);
  const business = data.businesses.find((b) => b.id === site?.business_id);
  const update = (key: keyof WebsiteContent, value: unknown) =>
    setForm((old) => (old ? { ...old, [key]: value } : old));
  async function save() {
    if (!form || !site) return;
    setBusy("save");
    try {
      const result = await api<WebsiteRecord>(`websites/${site.id}`, {
        content: form,
        version: site.version,
      });
      setSite(result);
      setForm(result.content);
      await refresh();
      toast.success("Nova versão salva.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function publish() {
    if (!site || !form) return;
    setBusy("publish");
    try {
      let current = site;
      if (changed)
        current = await api<WebsiteRecord>(`websites/${site.id}`, {
          content: form,
          version: site.version,
        });
      const result = await api<WebsiteRecord>(
        `websites/${current.id}/publish`,
        {},
      );
      setSite(result);
      setForm(result.content);
      await refresh();
      toast.success(
        "Demonstração publicada. O acesso ao link segue as permissões do workspace.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function editAI() {
    if (!site) return;
    if (changed) {
      toast.info("Salve as alterações antes de editar com IA.");
      return;
    }
    setBusy("ai");
    try {
      const result = await api<WebsiteRecord>(`websites/${site.id}/edit`, {
        instruction,
        section,
      });
      setSite(result);
      setForm(result.content);
      setAiOpen(false);
      await refresh();
      toast.success("Copy atualizada pela IA.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function share() {
    if (!site) return;
    if (site.status !== "published") {
      toast.info("Publique a demonstração antes de compartilhar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/preview/${site.slug}`,
      );
      toast.success(
        "Link copiado. O acesso depende das permissões do workspace.",
      );
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }
  if (error)
    return (
      <div className="panel">
        <EmptyState
          title="Demonstração indisponível"
          description={error}
          action={
            <Button asChild>
              <Link href="/sites">Ver meus sites</Link>
            </Button>
          }
        />
      </div>
    );
  if (!site || !form) return <p className="note">Abrindo o estúdio…</p>;
  return (
    <div className="fade-in editor-page">
      <PageHeading
        eyebrow="ESTÚDIO DE SITES"
        title={site.business_name}
        description={`Demonstração comercial · versão ${site.version} · ${site.engine === "local" ? "composição local por nicho" : "copy gerada com IA"}`}
        actions={
          <>
            <Action
              busy={busy === "save"}
              aria-label="Salvar"
              variant="outline"
              disabled={!changed || !!busy}
              onClick={() => void save()}
            >
              <Save size={15} />
              <span className="desktop-label">Salvar</span>
            </Action>
            <Action
              busy={busy === "publish"}
              disabled={!!busy}
              onClick={() => void publish()}
            >
              <Globe2 size={15} />
              {site.status === "published"
                ? "Atualizar demonstração"
                : "Publicar demonstração"}
            </Action>
          </>
        }
      />
      <div className="editor-toolbar panel">
        <Tabs value={device} onValueChange={setDevice}>
          <TabsList>
            <TabsTrigger value="desktop">
              <Monitor size={15} />
              <span>Desktop</span>
            </TabsTrigger>
            <TabsTrigger value="tablet">
              <Tablet size={15} />
              <span>Tablet</span>
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone size={15} />
              <span>Mobile</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="editor-toolbar-actions">
          <Button variant="ghost" onClick={() => setAiOpen(true)}>
            <Sparkles size={15} />
            Editar com IA
          </Button>
          <Button variant="ghost" onClick={() => void share()}>
            <Copy size={14} />
            Compartilhar
          </Button>
          {site.status === "published" && (
            <Button asChild variant="ghost" size="icon">
              <a
                href={`/preview/${site.slug}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir demonstração publicada"
              >
                <ExternalLink size={16} />
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="editor-layout">
        <aside className="editor-controls panel">
          <Tabs defaultValue="content">
            <TabsList className="editor-side-tabs">
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="design">Estilo</TabsTrigger>
              <TabsTrigger value="sections">Seções</TabsTrigger>
            </TabsList>
            <TabsContent value="content">
              <div className="editor-form">
                {[
                  { k: "name", label: "Nome do negócio" },
                  { k: "headline", label: "Título principal" },
                  { k: "subtitle", label: "Descrição do hero" },
                  { k: "cta", label: "Texto do botão" },
                  { k: "about", label: "Sobre o negócio" },
                  { k: "address", label: "Endereço" },
                  { k: "city", label: "Cidade" },
                  { k: "phone", label: "Telefone" },
                  { k: "whatsapp", label: "WhatsApp" },
                  { k: "hours", label: "Horários" },
                  { k: "instagram", label: "Instagram" },
                ].map((f) => (
                  <label className="form-field" key={f.k}>
                    <span className="small-label">{f.label}</span>
                    {["about", "subtitle"].includes(f.k) ? (
                      <textarea
                        value={String(form[f.k as keyof WebsiteContent])}
                        onChange={(e) =>
                          update(f.k as keyof WebsiteContent, e.target.value)
                        }
                      />
                    ) : (
                      <input
                        value={String(form[f.k as keyof WebsiteContent])}
                        onChange={(e) =>
                          update(f.k as keyof WebsiteContent, e.target.value)
                        }
                      />
                    )}
                  </label>
                ))}
                <p className="section-title">Serviços confirmados</p>
                {form.services.map((s, i) => (
                  <div className="service-editor" key={i}>
                    <input
                      className="orbit-input"
                      aria-label={`Nome do serviço ${i + 1}`}
                      value={s.title}
                      onChange={(e) =>
                        update(
                          "services",
                          form.services.map((s, j) =>
                            i === j ? { ...s, title: e.target.value } : s,
                          ),
                        )
                      }
                    />
                    <textarea
                      className="orbit-input"
                      aria-label={`Descrição do serviço ${i + 1}`}
                      value={s.description}
                      onChange={(e) =>
                        update(
                          "services",
                          form.services.map((s, j) =>
                            i === j ? { ...s, description: e.target.value } : s,
                          ),
                        )
                      }
                    />
                    <button
                      className="small-label"
                      onClick={() =>
                        update(
                          "services",
                          form.services.filter((_, j) => i !== j),
                        )
                      }
                    >
                      <Trash2 size={12} />
                      Remover serviço
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("services", [
                      ...form.services,
                      {
                        title: "Novo serviço informado",
                        description: "Edite com informações confirmadas.",
                      },
                    ])
                  }
                  disabled={form.services.length >= 12}
                >
                  <Plus size={14} />
                  Adicionar serviço
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="design">
              <div className="editor-form">
                <div className="form-field">
                  <label>Direção visual</label>
                  <Pick
                    value={form.style}
                    onChange={(v) => update("style", v)}
                    label="Direção visual"
                    items={[
                      { value: "clinic", label: "Clara & acolhedora" },
                      { value: "editorial", label: "Editorial & gastronômica" },
                      { value: "bold", label: "Dinâmica & expressiva" },
                      { value: "elegant", label: "Elegante & institucional" },
                    ]}
                  />
                </div>
                <label className="form-field">
                  <span className="small-label">Cor principal</span>
                  <div className="color-field">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => update("color", e.target.value)}
                    />
                    <Palette size={14} />
                    {form.color}
                  </div>
                </label>
                <p className="note">
                  Cada direção altera hierarquia, tipografia, cores de base e
                  composição. Confirme o contraste ao escolher sua cor.
                </p>
                <label className="form-field">
                  <span className="small-label">
                    Foto autorizada · URL HTTPS
                  </span>
                  <input
                    value={form.image_url}
                    placeholder="https://…"
                    onChange={(e) => update("image_url", e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span className="small-label">
                    Licença ou autorização da foto
                  </span>
                  <input
                    value={form.image_attribution}
                    onChange={(e) =>
                      update("image_attribution", e.target.value)
                    }
                  />
                </label>
                <p className="note">
                  A direção tipográfica funciona sem foto. Adicione imagens
                  somente com autorização ou licença de uso.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="sections">
              <div className="editor-form">
                <p className="note">
                  A ordem abaixo aparece no site. Adicione ou remova seções
                  conforme o escopo.
                </p>
                {form.sections.map((s, i) => (
                  <div className="section-editor-row" key={s}>
                    <LayoutTemplate size={14} />
                    <span>{SECTIONS.find((x) => x.value === s)?.label}</span>
                    <button
                      aria-label={`Mover ${s} para cima`}
                      disabled={i === 0}
                      onClick={() => {
                        const sections = [...form.sections];
                        [sections[i - 1], sections[i]] = [
                          sections[i],
                          sections[i - 1],
                        ];
                        update("sections", sections);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Remover seção ${s}`}
                      onClick={() =>
                        update(
                          "sections",
                          form.sections.filter((x) => x !== s),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <Pick
                  value="add"
                  onChange={(v) => {
                    if (v !== "add" && !form.sections.includes(v))
                      update("sections", [...form.sections, v]);
                  }}
                  label="Adicionar seção"
                  items={[
                    { value: "add", label: "+ Adicionar seção" },
                    ...SECTIONS.filter((s) => !form.sections.includes(s.value)),
                  ]}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setInstruction(
                      "Regenerar a copy da seção escolhida com um tom mais sofisticado, preservando os fatos.",
                    );
                    setAiOpen(true);
                  }}
                >
                  <Sparkles size={14} />
                  Regenerar copy com IA
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <div className="editor-version-label">
            <History size={13} />
            {changed
              ? "Alterações ainda não salvas"
              : `Versão ${site.version} salva`}
            {!changed && <Check size={13} />}
          </div>
        </aside>
        <div className="browser-stage">
          <div className={`virtual-browser browser-${device}`}>
            <div className="browser-chrome">
              <div className="browser-dots">
                <i />
                <i />
                <i />
              </div>
              <div className="browser-url">
                <Globe2 size={12} />
                {site.status === "published"
                  ? `/preview/${site.slug}`
                  : "Demonstração · preview local"}
              </div>
              <span>
                {device === "mobile"
                  ? "390px"
                  : device === "tablet"
                    ? "768px"
                    : "Responsivo"}
              </span>
            </div>
            <iframe
              title={`Demonstração de ${form.name}`}
              srcDoc={buildSiteHtml(form, {
                embedded: true,
                isFictional: business?.is_demo ?? true,
              })}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              className="website-frame"
            />
          </div>
          <div className="preview-bottom-note">
            <span>Proposta visual · não é o site oficial da empresa.</span>
            {business && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => tools.proposal(business)}
              >
                <FileText size={14} />
                Preparar proposta
              </Button>
            )}
          </div>
        </div>
      </div>
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="modal-medium">
          <DialogHeader>
            <DialogTitle>Refinar a copy com IA</DialogTitle>
            <DialogDescription>
              {data.provider_status.ai
                ? "Descreva o ajuste desejado. Os dados comerciais serão preservados."
                : "A integração de IA ainda não está conectada. Os controles manuais estão disponíveis no editor."}
            </DialogDescription>
          </DialogHeader>
          <Pick
            value={section}
            onChange={setSection}
            label="Seção"
            items={SECTIONS}
          />
          <textarea
            className="orbit-input"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ex.: título mais sofisticado, tom acolhedor e frases mais curtas."
            rows={4}
          />
          <Action
            busy={busy === "ai"}
            onClick={() => void editAI()}
            disabled={
              !data.provider_status.ai || instruction.length < 5 || !!changed
            }
          >
            <Sparkles size={15} />
            Aplicar edição
            <span className="button-credit">
              {data.settings.credit_costs.regenerate} cr.
            </span>
          </Action>
        </DialogContent>
      </Dialog>
      {tools.dialogs}
    </div>
  );
}
