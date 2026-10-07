"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Compass,
  CircleSlash2,
  Star,
  Handshake,
  Plus,
  Sparkles,
  PanelsTopLeft,
  MessageSquareText,
  Clock,
  Target,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useWorkspace } from "./providers";
import { PageHeading, EmptyState } from "./primitives";
import { LeadCard } from "./lead-card";
import { LeadSheet } from "./lead-sheet";
import { useLeadTools } from "./lead-tools";
import type { Business } from "@/lib/domain/types";
import { api, errorMessage, dateLabel } from "@/lib/client/api";
import { toast } from "sonner";
export function Dashboard() {
  const { data, refresh, updateBusiness } = useWorkspace();
  const tools = useLeadTools();
  const [selected, setSelected] = useState<Business | null>(null);
  const b = data.businesses;
  const stats = data.stats;
  const presence = [
    {
      name: "Sem site identificado",
      value: b.filter((x) => x.website_status === "not_identified").length,
      color: "#d28894",
    },
    {
      name: "Somente redes / links",
      value: b.filter((x) =>
        ["social_only", "aggregator", "directory"].includes(x.website_status),
      ).length,
      color: "#e1b778",
    },
    {
      name: "Site próprio",
      value: b.filter((x) => x.website_status === "own_website").length,
      color: "#67b8a0",
    },
    {
      name: "Inconclusivo / melhorias",
      value: b.filter((x) =>
        ["inconclusive", "unavailable", "needs_improvement"].includes(
          x.website_status,
        ),
      ).length,
      color: "#9e8de9",
    },
  ];
  const distribution = [
    { name: "Muito alta", total: b.filter((x) => x.lead_score >= 80).length },
    {
      name: "Alta",
      total: b.filter((x) => x.lead_score >= 65 && x.lead_score < 80).length,
    },
    {
      name: "Média",
      total: b.filter((x) => x.lead_score >= 40 && x.lead_score < 65).length,
    },
    { name: "Baixa", total: b.filter((x) => x.lead_score < 40).length },
  ];
  async function save(b: Business) {
    try {
      updateBusiness(await api<Business>("leads/save", { business_id: b.id }));
      await refresh();
      toast.success("Lead salvo.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="SEU WORKSPACE, EM MOVIMENTO"
        title={`Olá, ${data.user.name.split(" ")[0]}.`}
        description="Uma visão clara das oportunidades e do seu próximo passo."
        actions={
          <Button asChild>
            <Link href="/">
              <Plus size={16} />
              Nova pesquisa
            </Link>
          </Button>
        }
      />
      {b.some((x) => x.is_demo) && (
        <div className="demo-notice">
          <FlaskConical size={16} />
          Este painel inclui negócios fictícios de desenvolvimento,
          identificados em cada lead.
        </div>
      )}
      <div className="stat-grid">
        {[
          {
            icon: Compass,
            label: "Negócios descobertos",
            value: stats.found,
            sub: "No workspace",
          },
          {
            icon: CircleSlash2,
            label: "Sem site identificado",
            value: stats.no_site,
            sub: "Site próprio não encontrado",
          },
          {
            icon: Star,
            label: "Alta oportunidade",
            value: stats.strong,
            sub: "Score ≥ 80",
          },
          {
            icon: Handshake,
            label: "Clientes fechados",
            value: stats.closed,
            sub: `${stats.negotiating} em negociação`,
          },
        ].map((s, i) => (
          <div className="stat-card panel" key={s.label}>
            <div
              className={`stat-icon ${i === 2 ? "green" : i === 1 ? "orange" : ""}`}
            >
              <s.icon size={18} />
            </div>
            <div>
              <p className="stat-label">{s.label}</p>
              <p className="stat-value">{s.value}</p>
              <p className="stat-sub">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-action-banner">
        <div className="action-banner-icon">
          <Target size={29} />
        </div>
        <div>
          <p className="eyebrow">DA DESCOBERTA À PROPOSTA</p>
          <h2>Uma boa oportunidade merece uma boa apresentação.</h2>
          <p>
            Encontre o negócio, confirme os dados e crie uma demonstração
            personalizada.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Explorar negócios</Link>
        </Button>
      </div>
      <div className="dashboard-charts">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Presença digital</h2>
              <p>O que as fontes dizem sobre sua região.</p>
            </div>
          </div>
          <div className="presence-chart-body">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={205}>
                <PieChart>
                  <Pie
                    data={presence.filter((x) => x.value)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={67}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {presence
                      .filter((x) => x.value)
                      .map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <strong>{b.length}</strong>
                <small>negócios</small>
              </div>
            </div>
            <div className="chart-legend">
              {presence.map((p) => (
                <div key={p.name}>
                  <i style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <strong>{p.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Qualidade das oportunidades</h2>
              <p>Prioridade calculada com critérios explicáveis.</p>
            </div>
          </div>
          <div className="score-chart-body">
            <ResponsiveContainer width="100%" height={205}>
              <BarChart
                data={distribution}
                layout="vertical"
                margin={{ left: 0, right: 25, top: 18, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={83}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar
                  dataKey="total"
                  name="Negócios"
                  fill="#8978df"
                  radius={[0, 5, 5, 0]}
                  barSize={21}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="mt-6">
        <div className="section-heading">
          <h2>Oportunidades que merecem atenção</h2>
          <Link href="/opportunities">Ver todas</Link>
        </div>
        <div className="opportunity-grid">
          {b.slice(0, 3).map((lead, i) => (
            <LeadCard
              key={lead.id}
              business={lead}
              index={i}
              onOpen={setSelected}
              onSave={(x) => void save(x)}
              onGenerate={tools.generate}
              onAnalyze={setSelected}
            />
          ))}
        </div>
      </section>
      <div className="dashboard-bottom-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Atividade recente</h2>
            <Clock size={17} className="dim" />
          </div>
          {data.activity.length ? (
            <div className="activity-list">
              {data.activity.slice(0, 5).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{a.action}</strong>
                    <p>{a.detail}</p>
                  </div>
                  <time>{dateLabel(a.created_at)}</time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="O próximo passo é seu"
              description="Pesquise, salve um lead ou crie uma demonstração. As ações aparecerão aqui."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Seu estúdio comercial</h2>
            <Sparkles size={17} className="text-primary" />
          </div>
          <div className="studio-summary">
            <Link href="/sites">
              <PanelsTopLeft size={21} />
              <span>Sites criados</span>
              <strong>{stats.sites}</strong>
            </Link>
            <Link href="/scripts">
              <MessageSquareText size={21} />
              <span>Abordagens preparadas</span>
              <strong>{data.scripts.length}</strong>
            </Link>
            <Link href="/sites">
              <Handshake size={21} />
              <span>Propostas em rascunho</span>
              <strong>{data.proposals.length}</strong>
            </Link>
          </div>
        </section>
      </div>
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
