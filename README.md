# Orbit

SaaS de prospecção local: localização/nicho → busca → mapa e lista → evidência digital → score → CRM → demonstração de site → abordagem revisável → proposta. A interface e as regras de negócio foram preservadas.

## Instalação

Node 24.19.x, pnpm 11.25.0. Use a versão de `.nvmrc`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Preencha as variáveis através do secret store autorizado. Somente a URL Supabase e a publishable key são públicas. `DATABASE_URL` usa o papel existente `orbit_backend`, sem BYPASSRLS, no transaction pooler Supabase. Postgres.js desabilita prepared statements e configura claims verificadas dentro de cada transação. Nenhuma chave privilegiada é enviada ao navegador.

## Banco e autenticação

Supabase Orbit existente: `wnqxyoepqpexkshofxhv`, PostgreSQL 17, região `sa-east-1`. Migrations versionadas em `supabase/migrations` reproduzem as três já aplicadas; não reaplicá-las no projeto existente. Use a operação oficial de migrations da integração Supabase para futuras mudanças. Os tipos gerados ficam em `lib/supabase/database.types.ts`.

Auth usa e-mail/senha, confirmação de e-mail e cookies SSR HttpOnly; refresh em `proxy.ts`, verificação no servidor e RLS por sessão/membership. Logout revoga sessões globais e remove cookies. Perfis legados somente são associados ao e-mail confirmado do usuário; IDs, relacionamentos e dados existentes são preservados. Não há migração de senha inventada.

## Validação

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:database
pnpm build
pnpm predeploy
```

Os testes de banco aplicam as migrations em PostgreSQL via PGlite, com catálogo Auth mínimo apenas para fixtures. As mesmas regras de isolamento foram validadas no Supabase real pela integração, sempre com rollback. Esses testes não comprovam um login real. Build não exige conexão com banco. TCP local está classificado `WORKSPACE_NETWORK_LIMITATION`; a conectividade da aplicação e o E2E real ficam para o futuro Preview Vercel autorizado.

## Operação

Next.js nativo na Vercel; Supabase Auth e PostgreSQL. Cache, leases, filas limitadas, créditos e idempotência permanecem duráveis no banco. Não há processo residente nem dependência de filesystem persistente. Assets são estáticos e sites são JSON estruturado no banco; o produto não tem uploads/bucket ativo.

OSM/Overpass é fonte padrão, com identificação legítima, requisições sequenciais, timeout, retry limitado e atribuição. `APP_ORIGIN` identifica a aplicação; Preview pode usar `VERCEL_URL` fornecida pela plataforma. Providers licenciados e IA são opcionais. Nunca há fallback de uma falha real para dados fictícios; fixtures só existem em desenvolvimento/testes.

`pnpm start` executa a build de produção. CI roda gates e não publica. Projeto Vercel existente: `orbit`, `prj_hrn19z3YiqHYsVBHDNwUWXHniTV4`. Nenhum deploy está autorizado no checkpoint atual.

Leia [arquitetura](docs/architecture.md), [API](docs/api.md), [integrações](docs/integrations.md), [operação](docs/production.md), [recuperação](docs/DISASTER_RECOVERY.md) e [migração](docs/MIGRATION.md).
