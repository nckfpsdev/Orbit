"use client";
import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";
import { Sparkles, Send, ScanSearch } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Business, SearchFilters, ScriptRecord } from "@/lib/domain/types";
import { api, errorMessage } from "@/lib/client/api";
import { useWorkspace } from "./providers";
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown> | unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
interface Props {
  businesses: Business[];
  selectedIds: string[];
  onFilters: (f: Partial<SearchFilters>) => void;
  onOpen: (b: Business) => void;
  onGenerate: (b: Business) => void;
  onScript: (b: Business) => void;
  onProposal: (b: Business) => void;
}
export function Copilot({
  businesses,
  selectedIds,
  onFilters,
  onOpen,
  onGenerate,
  onScript,
  onProposal,
}: Props) {
  const { refresh, updateBusiness } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    {
      role: "assistant",
      text: "Vamos transformar essa lista em oportunidades. Posso aplicar filtros, abrir análises e preparar sites, abordagens ou propostas. Você revisa antes de usar.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const applyFilters = useCallback(
    (value: unknown) => {
      const filters = z
        .object({
          min_score: z.number().min(0).max(100).optional(),
          website_filter: z
            .enum(["all", "no_own", "own_website", "none", "instagram"])
            .optional(),
        })
        .strict()
        .parse(value);
      flushSync(() => onFilters(filters));
      return {
        filters,
        matched: businesses.filter(
          (b) => b.lead_score >= (filters.min_score ?? 0),
        ).length,
      };
    },
    [businesses, onFilters],
  );
  const saveLeads = useCallback(
    async (value: unknown) => {
      const { ids } = z
        .object({ ids: z.array(z.string()).min(1).max(100) })
        .strict()
        .parse(value);
      if (ids.some((id) => !businesses.some((b) => b.id === id)))
        throw new Error("Lead fora da lista atual.");
      await api("leads/batch", { ids, action: "save" });
      await refresh();
      return { saved: ids.length };
    },
    [businesses, refresh],
  );
  useEffect(() => {
    const model = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!model?.registerTool) return;
    const lifetime = new AbortController();
    const register = (tool: Parameters<ModelContext["registerTool"]>[0]) => {
      try {
        void Promise.resolve(
          model.registerTool(tool, { signal: lifetime.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported registration leaves the standard UI available. */
      }
    };
    register({
      name: "apply_lead_filters",
      title: "Filtrar oportunidades",
      description:
        "Aplica filtros à lista visível e retorna a quantidade correspondente.",
      inputSchema: {
        type: "object",
        properties: {
          min_score: { type: "number", minimum: 0, maximum: 100 },
          website_filter: {
            type: "string",
            enum: ["all", "no_own", "own_website", "none", "instagram"],
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (v) => applyFilters(v),
    });
    register({
      name: "save_leads_to_crm",
      title: "Salvar leads no CRM",
      description:
        "Salva os negócios selecionados da lista atual no CRM do usuário autenticado.",
      inputSchema: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 100,
          },
        },
        required: ["ids"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: saveLeads,
    });
    register({
      name: "start_website_proposal",
      title: "Revisar proposta de site",
      description:
        "Abre a revisão dos dados do negócio antes da geração. Não gera nem publica o site.",
      inputSchema: {
        type: "object",
        properties: { business_id: { type: "string" } },
        required: ["business_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (v) => {
        const { business_id } = z
          .object({ business_id: z.string() })
          .strict()
          .parse(v);
        const b = businesses.find((b) => b.id === business_id);
        if (!b) throw new Error("Lead fora da lista atual.");
        flushSync(() => onGenerate(b));
        return { business_id, review_open: true };
      },
    });
    return () => lifetime.abort();
  }, [applyFilters, saveLeads, businesses, onGenerate]);
  async function send(command = input) {
    if (!command.trim()) return;
    setMessages((old) => [...old, { role: "user", text: command }]);
    setInput("");
    setBusy(true);
    try {
      const n = command
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const score = n.match(/(?:acima de|score|maior que)\s*(\d+)/);
      let reply = "";
      if (score) {
        const value = Math.min(100, Number(score[1]));
        applyFilters({ min_score: value });
        reply = `Filtro aplicado: score mínimo ${value}. A lista e o mapa foram atualizados.`;
      } else if (/sem site/.test(n)) {
        applyFilters({ website_filter: "no_own" });
        reply =
          "Filtro aplicado: nenhum site próprio identificado nas fontes consultadas.";
      } else if (/melhores|prioridades/.test(n)) {
        const top = [...businesses]
          .sort((a, b) => b.lead_score - a.lead_score)
          .slice(0, 5);
        reply = top.length
          ? top
              .map(
                (b, i) =>
                  `${i + 1}. ${b.business_name} · ${b.lead_score}/100\n${b.score_reasons
                    .slice(0, 2)
                    .map((r) => r.label)
                    .join(" · ")}`,
              )
              .join("\n\n")
          : "A lista está vazia. Faça uma pesquisa primeiro.";
      } else if (/abordag|mensage/.test(n) && /cinco|5|selecion/.test(n)) {
        const selected = selectedIds.length
          ? businesses.filter((b) => selectedIds.includes(b.id)).slice(0, 5)
          : businesses.slice(0, 5);
        if (!selected.length)
          reply = "Selecione leads ou faça uma pesquisa primeiro.";
        else {
          const scripts: ScriptRecord[] = [];
          for (const b of selected)
            scripts.push(
              await api<ScriptRecord>("scripts", {
                business_id: b.id,
                channel: "WhatsApp",
                kind: "first",
              }),
            );
          await refresh();
          reply =
            `${scripts.length} rascunhos salvos em Abordagens para revisão.\n\n` +
            scripts.map((s) => `${s.business_name}\n${s.content}`).join("\n\n");
        }
      } else if (/salv/.test(n)) {
        const ids = selectedIds.length
          ? selectedIds
          : businesses.slice(0, 5).map((b) => b.id);
        await saveLeads({ ids });
        reply = `${ids.length} leads salvos no CRM.`;
      } else {
        const target =
          businesses.find((b) => n.includes(b.business_name.toLowerCase())) ??
          businesses.find((b) => selectedIds.includes(b.id)) ??
          businesses[0];
        if (!target) reply = "Faça uma pesquisa para escolher um negócio.";
        else if (/site|sofisticad/.test(n)) {
          onGenerate(target);
          reply = `Revisão de dados aberta para ${target.business_name}. Escolha a direção visual antes de gerar.`;
        } else if (/proposta/.test(n)) {
          onProposal(target);
          reply = `Proposta aberta para ${target.business_name}. Defina escopo, prazo e valor.`;
        } else if (/abordag/.test(n)) {
          onScript(target);
          reply = `Editor de abordagem aberto para ${target.business_name}.`;
        } else if (/analis/.test(n)) {
          onOpen(target);
          const result = await api<{ business: Business }>(
            `leads/${target.id}/enrich`,
            {},
          );
          updateBusiness(result.business);
          await refresh();
          reply = `${target.business_name}: ${result.business.digital_presence.explanation}\nScore: ${result.business.lead_score}/100.`;
        } else
          reply =
            "Posso executar: filtrar por score, mostrar melhores leads, analisar um negócio, preparar site ou proposta, gerar abordagens e salvar selecionados. Escolha uma dessas ações.";
      }
      setMessages((old) => [...old, { role: "assistant", text: reply }]);
    } catch (e) {
      const message = errorMessage(e);
      setMessages((old) => [...old, { role: "assistant", text: message }]);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button className="copilot-trigger" onClick={() => setOpen(true)}>
        <Sparkles size={17} />
        Assistente
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sheet-lead">
          <SheetHeader className="sheet-lead-header">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles size={20} />
              Assistente Orbit
            </SheetTitle>
            <SheetDescription>
              Copiloto de ações estruturadas · composição local
            </SheetDescription>
          </SheetHeader>
          <div className="copilot-chat">
            <div className="copilot-prompts">
              {[
                "Mostre leads acima de 80.",
                "Quais são os melhores leads desta lista?",
                "Gere abordagens para cinco leads.",
                "Analise este negócio.",
              ].map((p) => (
                <button key={p} onClick={() => void send(p)} disabled={busy}>
                  {p}
                </button>
              ))}
            </div>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`copilot-msg ${m.role === "user" ? "user" : ""}`}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <p className="small-label inline-flex items-center gap-2">
                <ScanSearch size={14} />
                Executando a ação…
              </p>
            )}
          </div>
          <form
            className="copilot-input"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="O que vamos fazer?"
              aria-label="Comando para o assistente"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              aria-label="Executar comando"
            >
              <Send size={17} />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
