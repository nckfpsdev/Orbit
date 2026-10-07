"use client";
import Link from "next/link";
import {
  PanelsTopLeft,
  Plus,
  ExternalLink,
  FileText,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkspace } from "./providers";
import { PageHeading, EmptyState } from "./primitives";
import { buildSiteHtml } from "@/lib/domain/site-html";
import { currency, dateLabel } from "@/lib/client/api";
export function SitesGallery() {
  const { data } = useWorkspace();
  return (
    <div className="fade-in">
      <PageHeading
        eyebrow="DA IDEIA À APRESENTAÇÃO"
        title="Seu estúdio comercial"
        description="Demonstrações personalizadas e propostas prontas para revisão."
        actions={
          <Button asChild>
            <Link href="/">
              <Plus size={16} />
              Encontrar próximo negócio
            </Link>
          </Button>
        }
      />
      <Tabs defaultValue="websites">
        <TabsList variant="line" className="gallery-tabs">
          <TabsTrigger value="websites">
            <PanelsTopLeft size={16} />
            Sites<span className="tab-count">{data.websites.length}</span>
          </TabsTrigger>
          <TabsTrigger value="proposals">
            <FileText size={16} />
            Propostas<span className="tab-count">{data.proposals.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="websites">
          {data.websites.length ? (
            <div className="sites-gallery">
              {data.websites.map((s) => (
                <article className="site-gallery-card panel" key={s.id}>
                  <Link
                    href={`/sites/${s.id}`}
                    className="site-mini-preview"
                    aria-label={`Editar site de ${s.business_name}`}
                  >
                    <iframe
                      title={`Miniatura de ${s.business_name}`}
                      srcDoc={buildSiteHtml(s.content, { isFictional: true })}
                      sandbox=""
                      loading="lazy"
                      tabIndex={-1}
                    />
                  </Link>
                  <div className="site-gallery-card-body">
                    <div>
                      <h3>{s.business_name}</h3>
                      <span className={`site-status ${s.status}`}>
                        {s.status === "published" ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                    <p>
                      {s.content.category} · {s.content.city}
                    </p>
                    <div className="site-gallery-card-bottom">
                      <small>
                        <Clock size={12} />
                        {dateLabel(s.updated_at)} · v{s.version}
                      </small>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/sites/${s.id}`}>Editar site</Link>
                      </Button>
                      {s.status === "published" && (
                        <a
                          href={`/preview/${s.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Abrir demonstração"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                title="Seu primeiro projeto começa com uma oportunidade"
                description="Selecione um negócio na pesquisa e clique em Gerar site. Os dados serão revisados antes da criação."
                action={
                  <Button asChild>
                    <Link href="/">
                      <Sparkles size={16} />
                      Explorar oportunidades
                    </Link>
                  </Button>
                }
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="proposals">
          {data.proposals.length ? (
            <div className="sites-gallery">
              {data.proposals.map((p) => (
                <article className="panel proposal-gallery-card" key={p.id}>
                  <div className="proposal-card-icon">
                    <FileText size={24} />
                  </div>
                  <h3>{p.business_name}</h3>
                  <p className="note">
                    {p.scope.length} entregas · {p.delivery_days} dias úteis
                  </p>
                  <strong className="proposal-price">
                    {currency(p.price)}
                  </strong>
                  <div className="site-gallery-card-bottom">
                    <small>Rascunho · {dateLabel(p.created_at)}</small>
                    <Button asChild variant="outline">
                      <Link href={`/proposals/${p.id}`}>Abrir proposta</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel">
              <EmptyState
                title="Propostas com contexto e escopo claro"
                description="Abra um lead e use Preparar proposta. O preço e o prazo são definidos por você."
                action={
                  <Button asChild>
                    <Link href="/opportunities">Ver oportunidades</Link>
                  </Button>
                }
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
