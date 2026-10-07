"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  MessageSquareText,
  Copy,
  Sparkles,
  BookOpen,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CHANNELS } from "@/lib/domain/constants";
import { generateScript, nicheValue } from "@/lib/domain/generation";
import { useWorkspace } from "./providers";
import { PageHeading, Pick, EmptyState } from "./primitives";
import { useLeadTools } from "./lead-tools";
import type { Channel } from "@/lib/domain/types";
import { dateLabel } from "@/lib/client/api";
export function ScriptsLibrary() {
  const { data } = useWorkspace();
  const tools = useLeadTools();
  const [category, setCategory] = useState("Restaurantes");
  const [channel, setChannel] = useState<Channel>("WhatsApp");
  const [lead, setLead] = useState(data.businesses[0]?.id ?? "none");
  const [kind, setKind] = useState("first");
  const example = data.businesses.find((b) => b.id === lead);
  const model = example
    ? generateScript(
        {
          ...example,
          business_name: "[Nome do negócio]",
          city: "[Cidade]",
          category,
          rating: null,
          reviews_count: null,
        },
        channel,
        data.settings,
        undefined,
        kind,
      )
    : `Oi, equipe da [Nome do negócio]! Sou [Seu nome]. Preparei uma ideia para ${nicheValue(category)}. Posso conversar com a pessoa responsável?`;
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado para revisão.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="CONVERSAS QUE ABREM PORTAS"
        title="Abordagens comerciais"
        description="Contextualizadas por nicho e canal. Naturais, revisáveis e sob seu controle."
        actions={
          <Button
            onClick={() => {
              if (example) tools.script(example);
            }}
            disabled={!example}
          >
            <Sparkles size={16} />
            Criar abordagem
          </Button>
        }
      />
      <Tabs defaultValue="saved">
        <TabsList variant="line" className="gallery-tabs">
          <TabsTrigger value="saved">
            <MessageSquareText size={15} />
            Rascunhos salvos
            <span className="tab-count">{data.scripts.length}</span>
          </TabsTrigger>
          <TabsTrigger value="library">
            <BookOpen size={15} />
            Banco por nicho
          </TabsTrigger>
        </TabsList>
        <TabsContent value="saved">
          {data.scripts.length ? (
            <div className="scripts-grid">
              {data.scripts.map((s) => (
                <article key={s.id} className="panel saved-script-card">
                  <header>
                    <div>
                      <h3>{s.business_name}</h3>
                      <p>
                        {s.channel} ·{" "}
                        {s.kind === "first"
                          ? "Primeiro contato"
                          : s.kind === "objection"
                            ? "Resposta para objeção"
                            : s.kind === "last"
                              ? "Encerramento"
                              : "Follow-up"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Copiar abordagem de ${s.business_name}`}
                      onClick={() => void copy(s.content)}
                    >
                      <Copy size={16} />
                    </Button>
                  </header>
                  <p>{s.content}</p>
                  <footer>
                    <span>{dateLabel(s.created_at)}</span>
                    <span>
                      <Check size={12} />
                      Rascunho · revisar
                    </span>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                title="Sua primeira conversa pode começar aqui"
                description="Escolha um lead e prepare uma abordagem personalizada para o canal certo."
                action={
                  <div className="dialog-form w-full">
                    <Pick
                      value={lead}
                      onChange={setLead}
                      label="Lead"
                      items={
                        data.businesses.length
                          ? data.businesses.map((b) => ({
                              value: b.id,
                              label: b.business_name,
                            }))
                          : [{ value: "none", label: "Nenhum lead disponível" }]
                      }
                    />
                    <Button
                      onClick={() => {
                        if (example) tools.script(example);
                      }}
                      disabled={!example}
                    >
                      Gerar abordagem
                    </Button>
                  </div>
                }
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="library">
          <div className="script-bank-layout">
            <aside className="panel script-bank-menu">
              <h3>Nichos</h3>
              {[
                "Restaurantes",
                "Academias",
                "Clínicas",
                "Barbearias",
                "Advogados",
                "Imobiliárias",
                "Estéticas",
                "Outros",
              ].map((n) => (
                <button
                  key={n}
                  className={category === n ? "active" : ""}
                  onClick={() => setCategory(n)}
                >
                  {n}
                </button>
              ))}
            </aside>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>{category}</h2>
                  <p>{nicheValue(category)}</p>
                </div>
              </div>
              <div className="panel-body dialog-form">
                <div className="field-grid">
                  <div className="form-field">
                    <label>Canal</label>
                    <Pick
                      value={channel}
                      onChange={(v) => setChannel(v as Channel)}
                      label="Canal"
                      items={[...CHANNELS]}
                    />
                  </div>
                  <div className="form-field">
                    <label>Momento</label>
                    <Pick
                      value={kind}
                      onChange={setKind}
                      label="Momento"
                      items={[
                        { value: "first", label: "Primeiro contato" },
                        { value: "followup1", label: "Follow-up 1" },
                        { value: "followup2", label: "Follow-up 2" },
                        { value: "last", label: "Encerramento" },
                      ]}
                    />
                  </div>
                </div>
                <div className="script-output">{model}</div>
                <p className="note">
                  Modelo de referência com campos para preencher. Abra um lead
                  para personalizar com evidências do estabelecimento.
                </p>
                <div className="footer-actions">
                  <Button variant="outline" onClick={() => void copy(model)}>
                    <Copy size={15} />
                    Copiar modelo
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </TabsContent>
      </Tabs>
      {tools.dialogs}
    </div>
  );
}
