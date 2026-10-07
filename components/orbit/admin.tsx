"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Database,
  Users,
  ScrollText,
  ChartNoAxesCombined,
  Wallet,
  Save,
  CreditCard,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "./providers";
import { PageHeading, Action, Pick, EmptyState } from "./primitives";
import { api, errorMessage, currency, dateLabel } from "@/lib/client/api";
interface AdminData {
  usage: {
    provider: string;
    operation: string;
    requests: number;
    units: number;
    estimated_cost: number | null;
    latency: number;
  }[];
  logs: {
    action: string;
    target_id: string | null;
    detail: string;
    created_at: string;
  }[];
  users: { name: string; email: string; role: string }[];
  subscription: {
    plan: string;
    status: string;
    period_end: string | null;
  } | null;
  cost_today: { total: number | null };
}
export function Admin() {
  const { data, refresh } = useWorkspace();
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [costs, setCosts] = useState(data.settings.unit_costs);
  const [plan, setPlan] = useState("Desenvolvimento");
  const [planStatus, setPlanStatus] = useState("trial");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<AdminData>("admin", undefined, controller.signal)
      .then((r) => {
        setAdmin(r);
        setPlan(r.subscription?.plan ?? "Desenvolvimento");
        setPlanStatus(r.subscription?.status ?? "trial");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, []);
  async function saveCosts() {
    setBusy(true);
    try {
      await api("settings", { ...data.settings, unit_costs: costs });
      await refresh();
      toast.success("Estimativas de custo salvas para ações futuras.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function savePlan() {
    setBusy(true);
    try {
      await api("admin/subscription", { plan, status: planStatus });
      setAdmin(await api("admin"));
      toast.success("Plano interno atualizado. Nenhuma cobrança realizada.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <div className="panel">
        <EmptyState title="Administração indisponível" description={error} />
      </div>
    );
  if (!admin) return <Skeleton className="h-[60vh] rounded-2xl" />;
  const cost = admin.usage.reduce((s, r) => s + (r.estimated_cost ?? 0), 0);
  const known = admin.usage.some((r) => r.estimated_cost !== null);
  const units = admin.usage.reduce((s, r) => s + r.units, 0);
  const searchUnits = admin.usage
    .filter((r) => r.operation === "search")
    .reduce((s, r) => s + r.units, 0);
  const siteUnits = admin.usage
    .filter((r) => r.provider === "gemini")
    .reduce((s, r) => s + r.units, 0);
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="CONTROLE DO WORKSPACE"
        title="Administração"
        description="Uso das fontes, consumo, planos internos e trilha de auditoria."
        actions={
          <span className="mode-pill">
            <ShieldCheck size={14} />
            Acesso de proprietário
          </span>
        }
      />
      <div className="stat-grid">
        {[
          {
            label: "Custo estimado hoje",
            value:
              admin.cost_today.total === null
                ? "Não configurado"
                : currency(admin.cost_today.total),
            icon: Wallet,
          },
          {
            label: "Custo estimado por lead",
            value:
              known && data.stats.found
                ? currency(cost / data.stats.found)
                : "Não configurado",
            icon: Database,
          },
          {
            label: "Custo estimado por busca",
            value:
              known && searchUnits
                ? currency(
                    admin.usage
                      .filter((r) => r.operation === "search")
                      .reduce((s, r) => s + (r.estimated_cost ?? 0), 0) /
                      searchUnits,
                  )
                : "Não configurado",
            icon: ChartNoAxesCombined,
          },
          {
            label: "Custo estimado por geração IA",
            value:
              known && siteUnits
                ? currency(
                    admin.usage
                      .filter((r) => r.provider === "gemini")
                      .reduce((s, r) => s + (r.estimated_cost ?? 0), 0) /
                      siteUnits,
                  )
                : "Não configurado",
            icon: CreditCard,
          },
        ].map((s) => (
          <div className="stat-card panel" key={s.label}>
            <div className="stat-icon">
              <s.icon size={18} />
            </div>
            <div>
              <p className="stat-label">{s.label}</p>
              <p className="admin-stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="note mb-5">
        Custos são estimativas configuradas por você, sem integração de
        faturamento. {units} operações registradas nesta organização.
      </p>
      <Tabs defaultValue="sources">
        <TabsList variant="line" className="gallery-tabs settings-tabs">
          <TabsTrigger value="sources">
            <Database size={15} />
            Provedores
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users size={15} />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CreditCard size={15} />
            Plano
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText size={15} />
            Auditoria
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sources">
          <section className="panel">
            <div className="panel-header">
              <h2>Uso das APIs</h2>
            </div>
            <div className="panel-body">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Requisições</TableHead>
                    <TableHead>Latência média</TableHead>
                    <TableHead>Custo estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admin.usage.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.provider}</TableCell>
                      <TableCell>{r.operation}</TableCell>
                      <TableCell>{r.requests}</TableCell>
                      <TableCell>{Math.round(r.latency)} ms</TableCell>
                      <TableCell>
                        {r.estimated_cost === null
                          ? "Não configurado"
                          : currency(r.estimated_cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!admin.usage.length && (
                <p className="note py-6 text-center">
                  Faça uma pesquisa para registrar uso dos provedores.
                </p>
              )}
            </div>
          </section>
          <section className="panel mt-6">
            <div className="panel-header">
              <div>
                <h2>Estimativa por chamada</h2>
                <p>
                  Valor em R$. Zero mantém custo externo como não configurado.
                </p>
              </div>
              <Action
                busy={busy}
                disabled={!data.provider_status.manage_credits}
                onClick={() => void saveCosts()}
              >
                <Save size={14} />
                Salvar
              </Action>
            </div>
            <div className="panel-body weights-grid">
              {Object.entries(costs).map(([key, value]) => (
                <label className="weight-field" key={key}>
                  <span>{key}</span>
                  <input
                    className="orbit-input"
                    type="number"
                    min="0"
                    step=".001"
                    disabled={!data.provider_status.manage_credits}
                    value={value}
                    onChange={(e) =>
                      setCosts((old) => ({
                        ...old,
                        [key]: Number(e.target.value),
                      }))
                    }
                  />
                  <small>R$/chamada</small>
                </label>
              ))}
            </div>
            <div className="settings-info-note">
              <ShieldCheck size={17} />
              <p>
                Cache e deduplicação reduzem requisições. Limites por
                organização e por provedor são aplicados no servidor; erros
                externos preservam a última pesquisa válida.
              </p>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="users">
          <section className="panel">
            <div className="panel-header">
              <h2>Usuários desta organização</h2>
            </div>
            <div className="panel-body">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Papel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admin.users.map((u) => (
                    <TableRow key={u.email}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {u.role === "owner" ? "Proprietário" : u.role}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="plans">
          <section className="panel max-w-2xl">
            <div className="panel-header">
              <h2>Plano interno</h2>
            </div>
            <div className="panel-body dialog-form">
              <label className="form-field">
                <span className="small-label">Nome do plano</span>
                <input
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  maxLength={80}
                />
              </label>
              <Pick
                value={planStatus}
                onChange={setPlanStatus}
                label="Status do plano"
                items={[
                  { value: "trial", label: "Desenvolvimento / teste" },
                  { value: "active", label: "Ativo" },
                  { value: "paused", label: "Pausado" },
                ]}
              />
              <p className="note">
                Gestão manual do plano desta organização. Um gateway de cobrança
                ainda não está conectado. Nenhuma assinatura é cobrada pela
                plataforma.
              </p>
              <Action busy={busy} onClick={() => void savePlan()}>
                <Save size={15} />
                Salvar plano interno
              </Action>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="logs">
          <section className="panel">
            <div className="panel-header">
              <h2>Ações críticas</h2>
              <span className="small-label">
                Sem segredos ou conteúdo de mensagens
              </span>
            </div>
            <div className="panel-body">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admin.logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <code className="small-label">{log.action}</code>
                      </TableCell>
                      <TableCell>{log.detail}</TableCell>
                      <TableCell>{dateLabel(log.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!admin.logs.length && (
                <p className="note py-6 text-center">
                  Nenhuma ação registrada.
                </p>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
