"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, MapPin, Sparkles, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_FILTERS, STATES, NICHES } from "@/lib/domain/constants";
import { useWorkspace } from "./providers";
import { Pick, Action } from "./primitives";
import { api, errorMessage } from "@/lib/client/api";
import type { SearchResponse } from "@/lib/domain/types";
export function Onboarding() {
  const { data, refresh } = useWorkspace();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState("CE");
  const [city, setCity] = useState("Fortaleza");
  const [category, setCategory] = useState("Clínicas odontológicas");
  const [goal, setGoal] = useState("no_own");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true);
    try {
      const r = await api<SearchResponse>("search", {
        ...DEFAULT_FILTERS,
        state,
        city,
        category,
        website_filter: goal,
        provider: data.settings.provider,
      });
      setResult(r);
      setStep(4);
      await api("settings", { ...data.settings, onboarded: true });
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding-wrap">
      <div className="onboarding-symbol">
        <Compass size={35} />
      </div>
      <p className="eyebrow">O SEU PRÓXIMO CLIENTE ESTÁ PERTO</p>
      <h1>Vamos encontrar a primeira oportunidade?</h1>
      <p className="note">Uma região, um nicho e um objetivo.</p>
      <div className="onboarding-card panel">
        <div className="onboarding-progress">
          <span>ETAPA {step} DE 4</span>
          <Progress value={step * 25} />
        </div>
        {step === 1 && (
          <>
            <MapPin size={24} className="text-primary" />
            <h2>Onde você deseja prospectar?</h2>
            <p className="note">Comece com a região que você conhece.</p>
            <div className="field-grid">
              <div className="form-field">
                <label>Estado</label>
                <Pick
                  value={state}
                  onChange={setState}
                  items={STATES.map((s) => ({
                    value: s,
                    label: s === "CE" ? "Ceará" : s,
                  }))}
                  label="Estado"
                />
              </div>
              <label className="form-field">
                <span className="small-label">Cidade</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <Button onClick={() => setStep(2)} disabled={city.length < 2}>
              Continuar
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Compass size={24} className="text-primary" />
            <h2>Que tipo de negócio?</h2>
            <p className="note">Escolha o nicho da sua primeira pesquisa.</p>
            <Pick
              value={category}
              onChange={setCategory}
              items={NICHES}
              label="Nicho"
            />
            <div className="footer-actions">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <Sparkles size={24} className="text-primary" />
            <h2>Qual oportunidade você procura?</h2>
            <p className="note">Seu objetivo será convertido em filtros.</p>
            <Pick
              value={goal}
              onChange={setGoal}
              label="Objetivo"
              items={[
                {
                  value: "no_own",
                  label: "Empresas sem site próprio identificado",
                },
                {
                  value: "own_website",
                  label: "Empresas com site para analisar",
                },
                { value: "all", label: "Conhecer todos os negócios da região" },
              ]}
            />
            <div className="demo-notice">
              {data.settings.provider === "mock"
                ? "A primeira busca usará dados fictícios de demonstração."
                : "Sua busca consultará a fonte real selecionada nas configurações."}
            </div>
            <div className="footer-actions">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Action busy={busy} onClick={() => void search()}>
                <Search size={15} />
                Encontrar oportunidades
              </Action>
            </div>
          </>
        )}
        {step === 4 && result && (
          <>
            <Check size={29} className="green-text" />
            <h2>Sua região já tem um novo olhar.</h2>
            <p className="note">
              {city} · {category}
            </p>
            <div className="onboarding-result-grid">
              <div>
                <strong>{result.total}</strong>
                <small>estabelecimentos</small>
              </div>
              <div>
                <strong>
                  {
                    result.businesses.filter((b) =>
                      [
                        "not_identified",
                        "social_only",
                        "directory",
                        "aggregator",
                      ].includes(b.website_status),
                    ).length
                  }
                </strong>
                <small>sem site identificado</small>
              </div>
              <div>
                <strong>
                  {result.businesses.filter((b) => b.lead_score >= 80).length}
                </strong>
                <small>oportunidades fortes</small>
              </div>
            </div>
            {result.is_demo && (
              <p className="note">Resultados fictícios de desenvolvimento.</p>
            )}
            <Button onClick={() => router.push(`/?search=${result.id}`)}>
              Explorar oportunidades
            </Button>
          </>
        )}
      </div>
      <Button variant="ghost" className="mt-3" onClick={() => router.push("/")}>
        Ir direto para o workspace
      </Button>
    </div>
  );
}
