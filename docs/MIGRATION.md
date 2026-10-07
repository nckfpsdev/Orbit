# Migração Orbit — Supabase + Vercel

Branch exclusiva: `migration/supabase-vercel-v2`. Baseline GitHub: `480e50d25f60ddacd149ab1366166e671be38a1b`. A branch `main` permanece intacta. Nenhum deployment está autorizado nesta etapa.

## CLOUDFLARE_DEPENDENCY_MAP

| Arquivo | Dependência atual | Função | Substituição planejada |
| --- | --- | --- | --- |
| `lib/server/db.ts`, `db/index.ts` | Binding de banco e import de runtime | Queries, transações e configuração | Postgres.js, Supabase PostgreSQL, variáveis Node e RLS por sessão verificada |
| `db/schema.ts`, `drizzle.config.ts`, `drizzle/` | SQLite e adapter D1 | Schema, constraints e migrations | Recuperar as três migrations já existentes no Supabase; tipos PostgreSQL |
| `app/chatgpt-auth.ts`, `app/login/page.tsx`, workspace layout, security e shell | SIWC e identidade encaminhada por headers | Login, sessão, autorização e logout | Supabase Auth SSR, cookies, claims verificadas e refresh por Proxy Next.js |
| `vite.config.ts`, `build/`, scripts de framework e ambiente | Vinext, Workers e Wrangler | Compilação e inicialização | Next.js nativo em runtime Node/Vercel |
| `package.json`, lockfile, workspace pnpm, TypeScript e declarações | Pacotes, tipos e bindings Cloudflare | Toolchain | Remover pacotes e tipos específicos após implementar substitutos |
| `lib/server/credits.ts` | `changes()` | Débito e estorno atômicos | CTEs PostgreSQL e transações reais |
| Store, search e geocoding | `INSERT OR IGNORE/REPLACE`, JSON textual, booleans inteiros | CRUD, cache e paginação | Upserts PostgreSQL explícitos; JSONB, timestamps UTC e booleans |
| Scheduler e jobs | Secret e agendamento do runtime anterior | Monitores, leases e processamento | Endpoint Next.js protegido; sessão do usuário e processamento limitado |
| Preview público | Leitura direta da tabela privada | HTML demonstrativo publicado | Função restrita `private.published_website`, sem expor CRM |
| Testes de integração e banco | Miniflare/D1/SQLite | Verificação de banco e runtime | Testes Node/PostgreSQL e validação remota pela integração Supabase |
| CI, README, env e docs operacionais | Build/deploy e recuperação antigos | Operação | Instruções Supabase/Vercel e gates sem deploy automático |
| Exemplos D1 e bridge de conectores de desenvolvimento | Runtime antigo; sem consumidores no produto | Exemplos/preview internos | Remover após confirmar ausência de uso funcional |

## Paridade a preservar

Rotas workspace, dashboard, busca geográfica/nicho, mapa Leaflet/lista, filtros, score, leads, listas, CRM/notas/tags/histórico, sites/versões/preview, abordagens, propostas, settings/créditos/admin e monitores. Não há upload de arquivos ou bucket ativo no produto; conteúdo dos sites está no banco e assets estáticos estão no repositório. Não criar uma funcionalidade nova de uploads.

## Estado externo existente

Supabase Orbit `wnqxyoepqpexkshofxhv`, PostgreSQL 17, região `sa-east-1`, 29 tabelas públicas com RLS e três migrations existentes. Preservar dados e recursos. Runtime utiliza a conexão já configurada com papel restrito `orbit_backend` e pooler transaction mode; prepared statements devem permanecer desabilitados.

Vercel existente: `orbit`, `prj_hrn19z3YiqHYsVBHDNwUWXHniTV4`. Não recriar nem publicar. Cada etapa de código deve ser persistida pela integração GitHub antes da seguinte.

## Validação

TCP PostgreSQL local: `SKIPPED_WORKSPACE_NETWORK_LIMITATION`. Introspecção, constraints, RLS e SQL são validados pela integração Supabase. Compilação não acessa banco. Conexão real da aplicação e E2E Auth serão validados no futuro Preview Vercel autorizado; não inferir esse sucesso de testes locais.

Não alterar DNS, proxy, firewall, credenciais, recursos legados ou produção para resolver a limitação do workspace.
