import Link from "next/link";
export default function Terms() {
  return (
    <main id="main-content" className="legal-page panel">
      <Link href="/" className="text-primary">
        Voltar ao workspace
      </Link>
      <h1>Termos de uso</h1>
      <p>
        Orbit auxilia a prospecção legítima de estabelecimentos comerciais e a
        preparação de propostas de presença digital.
      </p>
      <h2>Qualidade dos dados</h2>
      <p>
        As fontes podem estar incompletas ou desatualizadas. “Nenhum site
        identificado” não comprova que um site não exista. Scores são critérios
        configuráveis de priorização, sem garantia de contratação ou retorno
        econômico.
      </p>
      <h2>Uso autorizado</h2>
      <p>
        Respeite as condições e licenças das fontes, a privacidade, os limites
        das APIs e as regras profissionais do segmento. Não use a plataforma
        para coleta clandestina, invasão, quebra de CAPTCHA, spam, assédio ou
        perfis sensíveis sobre indivíduos.
      </p>
      <h2>Conteúdo e demonstrações</h2>
      <p>
        Revise os fatos, os direitos de imagem e os contatos antes de usar
        qualquer material. O aviso de demonstração comercial permanece até que
        haja uma implementação oficial autorizada fora deste fluxo. Não
        apresente a demonstração como um canal oficial do estabelecimento.
      </p>
      <h2>Créditos e planos</h2>
      <p>
        A versão inicial usa créditos de desenvolvimento e gestão manual de
        planos. Nenhum pagamento ou assinatura é cobrado pela aplicação.
        Integrações externas podem ter custos próprios quando configuradas.
      </p>
      <h2>OpenStreetMap</h2>
      <p>
        Dados OpenStreetMap são atribuídos a seus colaboradores e
        disponibilizados conforme a ODbL. Consulte{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          a licença e atribuição
        </a>
        . Serviços públicos possuem limites; consultas automatizadas exigem
        infraestrutura compatível.
      </p>
    </main>
  );
}
