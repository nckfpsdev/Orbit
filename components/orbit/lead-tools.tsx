"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  MessageSquareText,
  Copy,
  Check,
  FileText,
  Palette,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type {
  Business,
  Channel,
  WebsiteContent,
  WebsiteRecord,
  ScriptRecord,
  ProposalRecord,
} from "@/lib/domain/types";
import { websiteDraft } from "@/lib/domain/generation";
import { CHANNELS, OBJECTIONS } from "@/lib/domain/constants";
import { api, errorMessage } from "@/lib/client/api";
import { useWorkspace } from "./providers";
import { Action, Pick } from "./primitives";
export function useLeadTools() {
  const [generating, setGenerating] = useState<Business | null>(null);
  const [scripting, setScripting] = useState<Business | null>(null);
  const [proposing, setProposing] = useState<Business | null>(null);
  const generate = useCallback((b: Business) => setGenerating(b), []);
  const script = useCallback((b: Business) => setScripting(b), []);
  const proposal = useCallback((b: Business) => setProposing(b), []);
  const dialogs = (
    <>
      {generating && (
        <GenerateDialog
          key={generating.id}
          business={generating}
          close={() => setGenerating(null)}
        />
      )}{" "}
      {scripting && (
        <ScriptDialog
          key={scripting.id}
          business={scripting}
          close={() => setScripting(null)}
        />
      )}{" "}
      {proposing && (
        <ProposalDialog
          key={proposing.id}
          business={proposing}
          close={() => setProposing(null)}
        />
      )}
    </>
  );
  return { generate, script, proposal, dialogs };
}
function Field({
  label,
  value,
  onChange,
  wide = false,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  area?: boolean;
}) {
  return (
    <label className={`form-field ${wide ? "full-width" : ""}`}>
      <span className="small-label">{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
export function GenerateDialog({
  business: b,
  close,
}: {
  business: Business;
  close: () => void;
}) {
  const { data, refresh } = useWorkspace();
  const router = useRouter();
  const [form, setForm] = useState<WebsiteContent>(() => websiteDraft(b));
  const [busy, setBusy] = useState(false);
  const update = (key: keyof WebsiteContent, value: unknown) =>
    setForm((old) => ({ ...old, [key]: value }));
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const site = await api<WebsiteRecord>("websites", {
        business_id: b.id,
        data: form,
      });
      await refresh();
      close();
      router.push(`/sites/${site.id}`);
      toast.success("Demonstração criada. Você já pode editar o site.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="modal-wide">
        <DialogHeader>
          <div className="dialog-icon">
            <Sparkles size={22} />
          </div>
          <DialogTitle>Criar proposta de site</DialogTitle>
          <DialogDescription>
            Revise as informações de {b.business_name} antes de gerar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void generate(e)} className="dialog-form">
          {b.is_demo && (
            <div className="demo-notice">
              <ShieldCheck size={15} />
              Estabelecimento fictício. A demonstração também será identificada.
            </div>
          )}
          <div className="field-grid">
            <Field
              label="Nome do negócio"
              value={form.name}
              onChange={(v) => update("name", v)}
            />
            <Field
              label="Segmento"
              value={form.category}
              onChange={(v) => update("category", v)}
            />
            <Field
              label="Cidade"
              value={form.city}
              onChange={(v) => update("city", v)}
            />
            <Field
              label="Horário informado"
              value={form.hours}
              onChange={(v) => update("hours", v)}
            />
            <Field
              label="Endereço"
              value={form.address}
              onChange={(v) => update("address", v)}
              wide
            />
            <Field
              label="Telefone comercial"
              value={form.phone}
              onChange={(v) => update("phone", v)}
            />
            <Field
              label="WhatsApp publicado"
              value={form.whatsapp}
              onChange={(v) => update("whatsapp", v)}
            />
            <Field
              label="Instagram"
              value={form.instagram}
              onChange={(v) => update("instagram", v)}
              wide
            />
            <Field
              label="Serviços confirmados · um por linha"
              value={form.services.map((s) => s.title).join("\n")}
              onChange={(v) =>
                update(
                  "services",
                  v
                    .split("\n")
                    .filter(Boolean)
                    .slice(0, 12)
                    .map((title) => ({
                      title,
                      description:
                        "Entre em contato para conhecer os detalhes e a disponibilidade.",
                    })),
                )
              }
              wide
              area
            />
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
            <div className="form-field">
              <label htmlFor="brand-color">Cor principal</label>
              <div className="color-field">
                <input
                  id="brand-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => update("color", e.target.value)}
                />
                <Palette size={15} />
                <span>{form.color}</span>
              </div>
            </div>
          </div>
          <p className="note">
            O site usará somente estes dados revisados. Fotos e avaliações não
            serão copiadas de fontes sem permissão.{" "}
            {data.provider_status.ai
              ? "Copy personalizada com a IA conectada."
              : "Composição local por nicho disponível; IA ainda não conectada."}
          </p>
          <div className="footer-actions">
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Action type="submit" busy={busy}>
              <Sparkles size={16} />
              {busy ? "Criando demonstração…" : "Gerar demonstração"}
              <span className="button-credit">
                {data.settings.credit_costs.website} créditos
              </span>
            </Action>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ScriptDialog({
  business: b,
  close,
}: {
  business: Business;
  close: () => void;
}) {
  const { data, refresh } = useWorkspace();
  const [channel, setChannel] = useState<Channel>("WhatsApp");
  const [kind, setKind] = useState("first");
  const [objection, setObjection] = useState(OBJECTIONS[0]);
  const [result, setResult] = useState<ScriptRecord | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    try {
      const r = await api<ScriptRecord>("scripts", {
        business_id: b.id,
        channel,
        kind,
        objection,
      });
      setResult(r);
      setContent(r.content);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Texto copiado. Revise o contato antes de usar.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }
  async function save() {
    if (!result) return;
    setBusy(true);
    try {
      await api(`scripts/${result.id}`, { content });
      await refresh();
      toast.success("Edição salva na biblioteca.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="modal-medium">
        <DialogHeader>
          <div className="dialog-icon">
            <MessageSquareText size={22} />
          </div>
          <DialogTitle>Uma conversa que faz sentido.</DialogTitle>
          <DialogDescription>
            Abordagem personalizada para {b.business_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="dialog-form">
          <div className="form-field">
            <label>Canal de contato</label>
            <Pick
              value={channel}
              onChange={(v) => setChannel(v as Channel)}
              items={[...CHANNELS]}
              label="Canal de contato"
            />
          </div>
          <Tabs
            value={kind}
            onValueChange={setKind}
            className="scripts-kind-tabs"
          >
            <TabsList>
              {[
                { v: "first", label: "Primeiro contato" },
                { v: "followup1", label: "Retorno 1" },
                { v: "followup2", label: "Retorno 2" },
                { v: "last", label: "Encerramento" },
                { v: "objection", label: "Objeções" },
              ].map((t) => (
                <TabsTrigger key={t.v} value={t.v}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {kind === "objection" && (
            <Pick
              value={objection}
              onChange={setObjection}
              items={OBJECTIONS}
              label="Objeção"
            />
          )}
          {result ? (
            <>
              <textarea
                className="script-output"
                aria-label="Editar abordagem comercial"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={9}
              />
              <div className="script-footer">
                <span>
                  {result.engine === "local"
                    ? "Composição local contextualizada"
                    : "Gerado com IA"}{" "}
                  · salvo na biblioteca
                </span>
                <span className="review-label">
                  <Check size={13} />
                  Revisão humana
                </span>
              </div>
            </>
          ) : (
            <div className="script-preview-hint">
              <MessageSquareText size={30} />
              <p>
                Contexto real, linguagem natural.
                <br />
                Escolha o canal e prepare o primeiro contato.
              </p>
            </div>
          )}
          <p className="note">
            A ferramenta prepara o texto para sua revisão. O envio e a
            frequência ficam sob seu controle. Respeite recusas e confirme a
            origem do contato.
          </p>
          <div className="footer-actions">
            {result && (
              <>
                <Button variant="outline" onClick={() => void copy()}>
                  <Copy size={15} />
                  Copiar
                </Button>
                {content !== result.content && (
                  <Action
                    variant="outline"
                    busy={busy}
                    onClick={() => void save()}
                  >
                    Salvar edição
                  </Action>
                )}
              </>
            )}
            <Action busy={busy} onClick={() => void generate()}>
              <Sparkles size={15} />
              {result ? "Gerar outra versão" : "Gerar abordagem"}
              <span className="button-credit">
                {data.settings.credit_costs.script} cr.
              </span>
            </Action>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function ProposalDialog({
  business: b,
  close,
}: {
  business: Business;
  close: () => void;
}) {
  const { data, refresh } = useWorkspace();
  const router = useRouter();
  const websites = data.websites.filter((s) => s.business_id === b.id);
  const [price, setPrice] = useState(data.settings.proposal_price);
  const [days, setDays] = useState(15);
  const [site, setSite] = useState(websites[0]?.id ?? "none");
  const [scope, setScope] = useState(
    "Site responsivo com conteúdo revisado\nConfiguração de SEO e metadata\nIntegração dos contatos comerciais\nPublicação após aprovação do negócio\nUma rodada de revisão",
  );
  const [busy, setBusy] = useState(false);
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await api<ProposalRecord>("proposals", {
        business_id: b.id,
        website_id: site === "none" ? null : site,
        price,
        delivery_days: days,
        scope: scope.split("\n").filter(Boolean),
      });
      await refresh();
      close();
      router.push(`/proposals/${p.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="modal-medium">
        <DialogHeader>
          <div className="dialog-icon">
            <FileText size={22} />
          </div>
          <DialogTitle>Preparar proposta comercial</DialogTitle>
          <DialogDescription>
            Defina um escopo claro para {b.business_name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void generate(e)} className="dialog-form">
          <div className="field-grid">
            <label className="form-field">
              <span className="small-label">Investimento · R$</span>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </label>
            <label className="form-field">
              <span className="small-label">Prazo · dias úteis</span>
              <input
                type="number"
                min="1"
                max="180"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
              />
            </label>
          </div>
          <Pick
            label="Demonstração vinculada"
            value={site}
            onChange={setSite}
            items={[
              { value: "none", label: "Sem demonstração vinculada" },
              ...websites.map((s) => ({
                value: s.id,
                label: `${s.business_name} · versão ${s.version}`,
              })),
            ]}
          />
          <Field
            label="Entregas · uma por linha"
            value={scope}
            onChange={setScope}
            area
          />
          <div className="diagnosis">
            <h4>Evidência utilizada</h4>
            <p>{b.digital_presence.explanation}</p>
          </div>
          <p className="note">
            A proposta é um rascunho comercial. Preço e prazo são informados por
            você; resultados de vendas não são garantidos.
          </p>
          <div className="footer-actions">
            <Action type="submit" busy={busy}>
              <FileText size={15} />
              Gerar proposta
              <span className="button-credit">
                {data.settings.credit_costs.proposal} cr.
              </span>
            </Action>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
