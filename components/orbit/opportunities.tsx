"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, Plus, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Business } from "@/lib/domain/types";
import { api, errorMessage } from "@/lib/client/api";
import { useWorkspace } from "./providers";
import { PageHeading, Pick, EmptyState } from "./primitives";
import { LeadCard } from "./lead-card";
import { LeadSheet } from "./lead-sheet";
import { useLeadTools } from "./lead-tools";
export function Opportunities() {
  const { data, refresh, updateBusiness } = useWorkspace();
  const [selected, setSelected] = useState<Business | null>(null);
  const [minimum, setMinimum] = useState("80");
  const tools = useLeadTools();
  const list = data.businesses
    .filter((b) => b.lead_score >= Number(minimum))
    .sort((a, b) => b.lead_score - a.lead_score);
  async function save(b: Business) {
    try {
      updateBusiness(await api<Business>("leads/save", { business_id: b.id }));
      await refresh();
      toast.success("Lead salvo no CRM.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="INTELIGÊNCIA QUE VIRA AÇÃO"
        title="Oportunidades encontradas"
        description="Negócios com maior potencial de uma nova presença digital."
        actions={
          <Button asChild>
            <Link href="/">
              <Plus size={16} />
              Nova pesquisa
            </Link>
          </Button>
        }
      />
      <div className="opportunities-toolbar panel">
        <span>
          <Sparkles size={17} />
          <strong>{list.length} oportunidades</strong>
        </span>
        <Pick
          label="Prioridade mínima"
          value={minimum}
          onChange={setMinimum}
          items={[
            { value: "80", label: "Muito alta · 80–100" },
            { value: "65", label: "Alta e muito alta · 65+" },
            { value: "40", label: "Média ou superior · 40+" },
            { value: "0", label: "Todas as oportunidades" },
          ]}
        />
      </div>
      {list.some((b) => b.is_demo) && (
        <div className="demo-notice">
          <FlaskConical size={15} />
          As oportunidades marcadas como demonstração são fictícias.
        </div>
      )}
      <div className="opportunity-grid">
        {list.map((b, i) => (
          <LeadCard
            key={b.id}
            business={b}
            index={i}
            onOpen={setSelected}
            onSave={(b) => void save(b)}
            onGenerate={tools.generate}
            onAnalyze={setSelected}
          />
        ))}
      </div>
      {!list.length && (
        <div className="panel">
          <EmptyState
            title="Seu próximo cliente ainda não apareceu"
            description="Faça uma nova pesquisa ou ajuste a prioridade mínima."
            action={
              <Button asChild>
                <Link href="/">Pesquisar negócios</Link>
              </Button>
            }
          />
        </div>
      )}
      <LeadSheet
        business={
          selected
            ? (data.businesses.find((b) => b.id === selected.id) ?? selected)
            : null
        }
        onClose={() => setSelected(null)}
        onGenerate={tools.generate}
        onScript={tools.script}
        onProposal={tools.proposal}
      />
      {tools.dialogs}
    </div>
  );
}
