"use client";
import Link from "next/link";
import {
  Printer,
  Copy,
  FileText,
  CircleCheck,
  ExternalLink,
  Orbit,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./providers";
import { PageHeading, EmptyState } from "./primitives";
import { currency, dateLabel } from "@/lib/client/api";
export function ProposalView({ proposalId }: { proposalId: string }) {
  const { data } = useWorkspace();
  const p = data.proposals.find((p) => p.id === proposalId);
  const s = data.websites.find((s) => s.id === p?.website_id);
  if (!p)
    return (
      <div className="panel">
        <EmptyState
          title="Proposta não encontrada"
          description="Verifique o link ou selecione uma proposta do seu estúdio."
          action={
            <Button asChild>
              <Link href="/sites">Ver propostas</Link>
            </Button>
          }
        />
      </div>
    );
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado. O acesso segue as permissões do workspace.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }
  return (
    <div className="fade-in">
      <div className="no-print">
        <PageHeading
          eyebrow="PROPOSTA COMERCIAL · RASCUNHO"
          title={`Uma nova presença para ${p.business_name}`}
          actions={
            <>
              <Button variant="outline" onClick={() => void copy()}>
                <Copy size={15} />
                Copiar link
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={16} />
                Imprimir / PDF
              </Button>
            </>
          }
        />
      </div>
      <article className="proposal-document panel">
        <header className="proposal-document-header">
          <span>
            <Orbit size={24} />
            {p.agency_name}
          </span>
          <small>{dateLabel(p.created_at)}</small>
        </header>
        <div className="proposal-document-hero">
          <p className="eyebrow">PROPOSTA DE PRESENÇA DIGITAL</p>
          <h1>
            Seu negócio,
            <br />
            bem apresentado.
          </h1>
          <p>
            Uma proposta personalizada para <strong>{p.business_name}</strong>.
          </p>
        </div>
        <section>
          <div className="proposal-section-title">
            <span>01</span>
            <h2>O que observamos</h2>
          </div>
          {p.evidence.map((e, i) => (
            <p className="proposal-evidence" key={i}>
              {e}
            </p>
          ))}
          <p className="note">
            Os argumentos acima se baseiam nas fontes consultadas. Nenhum
            resultado comercial é garantido.
          </p>
        </section>
        <section>
          <div className="proposal-section-title">
            <span>02</span>
            <h2>O que será entregue</h2>
          </div>
          <div className="proposal-scope">
            {p.scope.map((scope, i) => (
              <div key={i}>
                <CircleCheck size={19} />
                {scope}
              </div>
            ))}
          </div>
        </section>
        {s && (
          <section>
            <div className="proposal-section-title">
              <span>03</span>
              <h2>A ideia, na prática</h2>
            </div>
            <p className="note">
              Uma demonstração comercial criada para visualizar a proposta.
              Sujeita à revisão do estabelecimento.
            </p>
            <Button asChild variant="outline" className="mt-4 no-print">
              <Link
                href={
                  s.status === "published"
                    ? `/preview/${s.slug}`
                    : `/sites/${s.id}`
                }
                target={s.status === "published" ? "_blank" : undefined}
              >
                <ExternalLink size={15} />
                Ver demonstração
              </Link>
            </Button>
          </section>
        )}
        <section className="proposal-investment">
          <div>
            <p className="eyebrow">INVESTIMENTO PROPOSTO</p>
            <strong>{currency(p.price)}</strong>
            <p>
              {p.delivery_days} dias úteis após aprovação e recebimento dos
              materiais.
            </p>
          </div>
          <FileText size={45} />
        </section>
        <footer>
          <p>
            Escopo, condições de pagamento, manutenção, domínio e hospedagem
            devem ser confirmados em contrato. Publicação oficial somente após
            autorização.
          </p>
          <span>{p.agency_name} · Proposta em rascunho</span>
        </footer>
      </article>
    </div>
  );
}
