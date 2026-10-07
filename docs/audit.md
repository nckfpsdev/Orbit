# Validação da migração

A auditoria histórica pré-migração está preservada no baseline GitHub 480e50d25f60ddacd149ab1366166e671be38a1b. Artefatos em evidence/ e imagens de auditoria são registros históricos, não instruções operacionais nem provas do runtime atual.

A reconstrução preserva produto/UI e utiliza Next.js, Vercel e Supabase. Gates atuais: pnpm lint, typecheck, test, test:database, build e auditoria de dependências. O banco é validado pela integração Supabase com RLS, constraints e fixtures revertidas. Não há bypass de autenticação.

Build não acessa banco. TCP local é SKIPPED_WORKSPACE_NETWORK_LIMITATION. Login real, busca real e paridade ponta a ponta serão validados exclusivamente no futuro Preview autorizado. Não há deployment nesta etapa.
