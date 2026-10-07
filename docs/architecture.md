# Arquitetura Orbit

Next.js 16 / React 19 / TypeScript strict na Vercel. Backend em Route Handlers Node.js, PostgreSQL 17 e Auth no Supabase existente. Não há upload/bucket ativo; JSON dos sites e versões fica no banco, assets no repositório.

- `lib/domain`: contratos, filtros/geografia, score, deduplicação, presença, geração e exportação.
- `lib/providers`: abstração de fontes; OSM e provider licenciado server-side; fixtures explícitas de desenvolvimento.
- `lib/server`: queries parametrizadas, transações, cache, leases, créditos, filas, auditoria e regras de negócio.
- `lib/supabase`: cliente SSR, verificação criptográfica de claims, tipos e redirects restritos.
- `components/orbit`: interface existente, sem acesso privilegiado ao banco.
- `app/api/v1`: APIs comerciais com sessão, autorização, validação e limites.
- `app/preview`: demonstração publicada via função restrita que não expõe CRM.

## Banco e ownership

29 tabelas públicas com RLS. IDs textuais existentes preservados; Auth UUID associa-se ao perfil apenas com e-mail confirmado. Timestamps UTC em timestamptz, JSONB, booleans nativos e FKs compostas de organização para relações comerciais.

Postgres.js inicializa conexão apenas no runtime. `prepare:false` é compatível com transaction pooling. Cada transação recebe `request.jwt.claims` de sessão verificada, com escopo local: a identidade nunca permanece na conexão compartilhada. Papel `orbit_backend` não possui BYPASSRLS, privilégios administrativos ou bypass global. Sessões revogadas são recusadas no banco.

As três migrations existentes estão versionadas. Políticas de UPDATE usam USING e WITH CHECK. Data API exige ownership, não apenas autenticação. Views não são usadas para contornar RLS; funções privilegiadas têm search_path restrito, grants específicos e finalidade limitada.

## Consistência e custos

Créditos: CTE de débito+ledger; saldo insuficiente não cria débito; estorno idempotente. CRM, tags e atividades usam batch transacional. Edição de site usa atualização condicional+versão na mesma CTE. Idempotência por organização persiste fingerprint/resposta e bloqueia resultados de commit incerto.

Cache e limites persistem no banco; leases limitam concorrência por fonte, sem depender da memória da função. Jobs processam até três itens por chamada, com lease/backoff. Scheduler opcional exige segredo e token Supabase do workspace, sem superusuário global.

## Segurança e paridade

Admin exige papel persistido e e-mail na allowlist. Dados de metadata editável nunca concedem privilégios. Auditoria de website usa proxy autorizado que atesta DNS público, redirects e robots; não há fetch direto de URLs arbitrárias. Conteúdo de sites é estruturado e escapado, scripts externos são recusados, preview tem aviso comercial/noindex. Exportações neutralizam fórmulas. Não há envio automático de mensagens.

Mapa/lista, filtros, score, leads, CRM, notas/tags, listas, sites/versões, scripts, propostas, créditos, settings e monitores preservam os contratos do produto. Login e logout usam Supabase Auth. Testes PostgreSQL e validação remota não substituem o E2E futuro da aplicação em Preview.
