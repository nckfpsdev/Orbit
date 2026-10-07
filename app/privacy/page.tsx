import Link from "next/link";
export default function Privacy() {
  return (
    <main id="main-content" className="legal-page panel">
      <Link href="/" className="text-primary">
        Voltar ao workspace
      </Link>
      <h1>Privacidade no Orbit</h1>
      <p>
        O produto trabalha com informações comerciais públicas de
        estabelecimentos. Cada organização possui seus próprios leads,
        pesquisas, notas, demonstrações, scripts e propostas.
      </p>
      <h2>Dados armazenados</h2>
      <p>
        Identificador da conta autenticada, nome e e-mail para acesso;
        informações comerciais com origem e confiança; histórico das ações e
        consumo de créditos. Não coletamos dados privados de pacientes,
        clientes, funcionários ou perfis sensíveis.
      </p>
      <h2>Fontes e integrações</h2>
      <p>
        Fontes são identificadas por registro. O modo de desenvolvimento utiliza
        dados fictícios. Ao conectar uma fonte real, o operador deve possuir
        autorização de uso e respeitar os termos aplicáveis. Conteúdo enviado à
        integração Gemini configurada fica sujeito aos termos dessa integração.
      </p>
      <h2>Demonstrações e contato</h2>
      <p>
        Demonstrações publicadas carregam aviso comercial e noindex. Mensagens
        são rascunhos: não há disparo automático ou coleta de dados privados. O
        acesso externo aos links depende das permissões do workspace.
      </p>
      <h2>Controle dos dados</h2>
      <p>
        Os dados comerciais autorizados podem ser exportados. Para excluir os
        dados do workspace, abra Configurações e use a opção de exclusão. Essa
        ação remove seus registros comerciais, preservando somente o mínimo
        técnico necessário quando aplicável.
      </p>
      <p>
        Esta é a política operacional da versão inicial do produto. Antes de
        oferecer o SaaS a clientes externos, o operador deve informar sua
        identidade e canal de atendimento, política de retenção e responsáveis
        pelas integrações.
      </p>
    </main>
  );
}
