"use client";
import { LogoutButton } from "./logout-button";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Settings2,
  Database,
  Gauge,
  Zap,
  Save,
  CircleCheck,
  CircleHelp,
  ShieldCheck,
  Globe2,
  Sparkles,
  ScanSearch,
  Radar,
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
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "./providers";
import { PageHeading, Pick, Action } from "./primitives";
import { api, errorMessage, dateLabel } from "@/lib/client/api";
import type { OrgSettings } from "@/lib/domain/types";
const WEIGHT_LABELS: Record<string, string> = {
  gap: "Ausência de site / oportunidade digital",
  reviews: "Quantidade de avaliações",
  rating: "Nota média",
  whatsapp: "WhatsApp comercial",
  social: "Presença nas redes",
  complete: "Dados comerciais completos",
  segment: "Prioridade do nicho",
  activity: "Atividade recente verificada",
};
const CREDIT_LABELS: Record<string, string> = {
  search: "Pesquisar negócios",
  enrich: "Enriquecer um lead",
  audit: "Analisar website",
  website: "Gerar demonstração",
  regenerate: "Editar com IA",
  script: "Gerar abordagem",
  proposal: "Gerar proposta",
};
interface Transaction {
  id: string;
  amount: number;
  action: string;
  created_at: string;
}
export function Settings() {
  const { data, refresh } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const [settings, setSettings] = useState<OrgSettings>(data.settings);
  const requestedTab = params.get("tab");
  const tab = ["general", "providers", "score", "credits"].includes(
    requestedTab ?? "",
  )
    ? requestedTab!
    : "general";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [replenishing, setReplenishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<Transaction[]>("credits", undefined, controller.signal)
      .then(setTransactions)
      .catch((e) => {
        if (!controller.signal.aborted) toast.error(errorMessage(e));
      });
    return () => controller.abort();
  }, []);
  async function save() {
    setBusy(true);
    try {
      await api("settings", settings);
      await refresh();
      toast.success(
        "Configurações salvas. Pesquisas futuras usam os novos critérios.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function grant() {
    setReplenishing(true);
    try {
      await api("admin/credits", { amount: 250 });
      await refresh();
      setTransactions(await api("credits"));
      toast.success("250 créditos concedidos pelo administrador.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setReplenishing(false);
    }
  }
  async function deleteData() {
    try {
      await api("workspace/delete-data", { confirmation });
      await refresh();
      setDeleting(false);
      toast.success("Dados comerciais excluídos.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const patch = (values: Partial<OrgSettings>) =>
    setSettings((s) => ({ ...s, ...values }));
  const providers = [
    {
      name: "Demonstração de desenvolvimento",
      icon: Database,
      ready: true,
      detail: "Negócios, reputação e contatos fictícios. Sem custo externo.",
      env: "",
    },
    {
      name: "OpenStreetMap / Overpass",
      icon: Globe2,
      ready: true,
      detail:
        "Dados reais com atribuição ODbL. Cobertura e qualidade variam por região.",
      env: "OVERPASS_URL · GEOCODING_URL · NOMINATIM_CONTACT",
    },
    {
      name: "Provedor comercial licenciado",
      icon: ShieldCheck,
      ready: data.provider_status.licensed,
      detail:
        "Contrato HTTPS com autorização de persistência e exportação por registro.",
      env: "LEAD_PROVIDER_URL · LEAD_PROVIDER_KEY",
    },
    {
      name: "Geração e edição com IA",
      icon: Sparkles,
      ready: data.provider_status.ai,
      detail:
        "API Gemini no servidor. A composição local por nicho funciona sem chave.",
      env: "GEMINI_API_KEY · GEMINI_MODEL",
    },
    {
      name: "Auditoria de website",
      icon: ScanSearch,
      ready: data.provider_status.audit,
      detail:
        "Proxy seguro que valida DNS público, redirects, robots e limites de resposta.",
      env: "WEBSITE_AUDIT_URL · WEBSITE_AUDIT_KEY",
    },
    {
      name: "Monitoramento periódico",
      icon: Radar,
      ready: data.provider_status.scheduler,
      detail:
        "Requer um agendador externo chamando o endpoint protegido. Monitores começam pausados.",
      env: "WORKER_SECRET · SCHEDULER_ENABLED",
    },
  ];
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="UM WORKSPACE DO SEU JEITO"
        title="Configurações"
        description="Fontes, critérios e custos sob seu controle."
        actions={
          <Action busy={busy} onClick={() => void save()}>
            <Save size={15} />
            Salvar alterações
          </Action>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(value) => router.replace(`/settings?tab=${value}`)}
      >
        <TabsList variant="line" className="gallery-tabs settings-tabs">
          <TabsTrigger value="general">
            <Settings2 size={15} />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Database size={15} />
            Fontes & integrações
          </TabsTrigger>
          <TabsTrigger value="score">
            <Gauge size={15} />
            Lead score
          </TabsTrigger>
          <TabsTrigger value="credits">
            <Zap size={15} />
            Créditos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="settings-layout">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Seu contexto comercial</h2>
                  <p>Usado nos scripts e nas propostas.</p>
                </div>
              </div>
              <div className="panel-body dialog-form">
                <label className="form-field">
                  <span className="small-label">Seu nome nas abordagens</span>
                  <input
                    value={settings.sender_name}
                    onChange={(e) => patch({ sender_name: e.target.value })}
                    placeholder="Seu nome"
                    maxLength={80}
                  />
                </label>
                <label className="form-field">
                  <span className="small-label">
                    Nome do estúdio ou agência
                  </span>
                  <input
                    value={settings.agency_name}
                    onChange={(e) => patch({ agency_name: e.target.value })}
                    maxLength={80}
                  />
                </label>
                <label className="form-field">
                  <span className="small-label">
                    Preço inicial para propostas · R$
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={settings.proposal_price}
                    onChange={(e) =>
                      patch({ proposal_price: Number(e.target.value) })
                    }
                  />
                </label>
                <div className="form-field">
                  <label>Fonte padrão para novas pesquisas</label>
                  <Pick
                    value={settings.provider}
                    label="Fonte padrão"
                    onChange={(v) =>
                      patch({ provider: v as OrgSettings["provider"] })
                    }
                    items={[
                      ...(data.provider_status.mock
                        ? [
                            {
                              value: "mock",
                              label: "Demonstração · dados fictícios",
                            },
                          ]
                        : []),
                      { value: "osm", label: "OpenStreetMap · dados reais" },
                      ...(data.provider_status.licensed
                        ? [{ value: "licensed", label: "Provedor licenciado" }]
                        : []),
                    ]}
                  />
                </div>
                <p className="note">
                  A fonte padrão só muda após salvar. A demonstração não
                  substitui silenciosamente uma fonte real em caso de falha.
                </p>
              </div>
            </section>
            <aside className="panel">
              <div className="panel-header">
                <h2>Sua conta</h2>
              </div>
              <div className="panel-body account-details">
                <span className="user-avatar large-avatar">
                  {data.user.name.charAt(0)}
                </span>
                <h3>{data.user.name}</h3>
                <p>{data.user.email}</p>
                <span className="saved-badge">Proprietário do workspace</span>
                <p className="note">
                  Autenticação com sua conta ChatGPT. Dados do produto separados
                  por organização e protegidos no servidor.
                </p>
                <Button asChild variant="outline">
                  <LogoutButton
                  >
                    Sair da conta
                  </LogoutButton>
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleting(true)}
                >
                  Excluir dados comerciais
                </Button>
              </div>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="providers">
          <div className="providers-grid">
            {providers
              .filter((p) => data.provider_status.mock || p.icon !== Database)
              .map((p) => (
                <section className="panel provider-card" key={p.name}>
                  <header>
                    <span className="business-icon">
                      <p.icon size={23} />
                    </span>
                    <span
                      className={`provider-state ${p.ready ? "ready" : ""}`}
                    >
                      {p.ready ? (
                        <CircleCheck size={13} />
                      ) : (
                        <CircleHelp size={13} />
                      )}{" "}
                      {p.ready ? "Disponível" : "Não conectado"}
                    </span>
                  </header>
                  <h2>{p.name}</h2>
                  <p>{p.detail}</p>
                  {p.env && (
                    <div className="provider-env">
                      <small>CONFIGURAÇÃO NO SERVIDOR</small>
                      <code>{p.env}</code>
                    </div>
                  )}
                </section>
              ))}
          </div>
          <p className="note mt-5">
            Chaves não são inseridas ou exibidas no navegador. As variáveis de
            integração estão documentadas no projeto. Conectar uma API requer
            autorização de uso dos dados, além de uma credencial válida.
          </p>
        </TabsContent>
        <TabsContent value="score">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Critérios explicáveis</h2>
                <p>Ajuste o peso máximo. A pontuação final é limitada a 100.</p>
              </div>
              <span className="mode-pill">
                Soma dos pesos:{" "}
                {Object.values(settings.score_weights).reduce(
                  (s, n) => s + n,
                  0,
                )}
              </span>
            </div>
            <div className="panel-body weights-grid">
              {Object.entries(settings.score_weights).map(([key, value]) => (
                <label className="weight-field" key={key}>
                  <span>{WEIGHT_LABELS[key] ?? key}</span>
                  <input
                    className="orbit-input"
                    type="number"
                    min="0"
                    max="50"
                    value={value}
                    onChange={(e) =>
                      patch({
                        score_weights: {
                          ...settings.score_weights,
                          [key]: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <small>pontos</small>
                </label>
              ))}
            </div>
            <div className="settings-info-note">
              <ShieldCheck size={17} />
              <p>
                Dados ausentes não pontuam como fatos conhecidos. A oportunidade
                por ausência de site recebe peso reduzido quando a confiança é
                baixa. Site em rede social, diretório ou agregador não equivale
                a um domínio próprio.
              </p>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="credits">
          <div className="settings-layout">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Créditos por ação</h2>
                  <p>Preços configuráveis para esta organização.</p>
                </div>
              </div>
              <div className="panel-body">
                {Object.entries(settings.credit_costs).map(([key, value]) => (
                  <label className="weight-field" key={key}>
                    <span>{CREDIT_LABELS[key] ?? key}</span>
                    <input
                      className="orbit-input"
                      type="number"
                      min="0"
                      max="100"
                      disabled={!data.provider_status.manage_credits}
                      value={value}
                      onChange={(e) =>
                        patch({
                          credit_costs: {
                            ...settings.credit_costs,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                    <small>créditos</small>
                  </label>
                ))}
                <p className="note mt-5">
                  Busca em cache de fontes permitidas não consome créditos.
                  Ações com erro estornam a reserva. Não há cobrança automática
                  de pagamentos nesta plataforma.
                </p>
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>Saldo disponível</h2>
                <Zap size={18} className="text-primary" />
              </div>
              <div className="panel-body">
                <strong className="credit-balance-number">
                  {data.organization.credits}
                </strong>
                <p className="note">
                  {data.provider_status.mock
                    ? "Créditos de desenvolvimento."
                    : "Créditos disponíveis para as ações do workspace."}
                </p>
                <Action
                  className="mt-5"
                  busy={replenishing}
                  disabled={!data.provider_status.manage_credits}
                  variant="outline"
                  onClick={() => void grant()}
                >
                  Conceder 250 créditos
                </Action>
                <p className="small-label mt-3">
                  {data.provider_status.manage_credits
                    ? "Sem pagamento ou compra de assinatura."
                    : "Concessões e preços reservados ao administrador autorizado."}
                </p>
              </div>
            </section>
          </div>
          <section className="panel mt-6">
            <div className="panel-header">
              <h2>Extrato de utilização</h2>
            </div>
            <div className="panel-body">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Créditos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {CREDIT_LABELS[t.action] ??
                          (t.action === "welcome"
                            ? "Créditos iniciais"
                            : t.action.endsWith("_refund")
                              ? "Estorno de ação"
                              : t.action === "admin_development_grant"
                                ? "Créditos de desenvolvimento"
                                : t.action)}
                      </TableCell>
                      <TableCell>{dateLabel(t.created_at)}</TableCell>
                      <TableCell>
                        <strong className={t.amount > 0 ? "green-text" : "dim"}>
                          {t.amount > 0 ? "+" : ""}
                          {t.amount}
                        </strong>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>
      </Tabs>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir os dados comerciais?</AlertDialogTitle>
            <AlertDialogDescription>
              Leads, pesquisas, listas, sites, scripts, propostas e monitores
              deste workspace serão removidos. Esta ação não pode ser desfeita.
              Sua conta e o extrato de créditos são preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            className="orbit-input"
            aria-label="Digite EXCLUIR para confirmar"
            placeholder="Digite EXCLUIR"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmation !== "EXCLUIR"}
              onClick={() => void deleteData()}
              className="bg-destructive"
            >
              Excluir dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
