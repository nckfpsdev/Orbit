# Operação e próximo Preview

Esta etapa termina no checkpoint GitHub. Não conectar projeto, criar deployment ou promover produção antes da autorização seguinte. Use somente Vercel `orbit` (`prj_hrn19z3YiqHYsVBHDNwUWXHniTV4`) e Supabase Orbit `wnqxyoepqpexkshofxhv`.

## Configuração

Framework nextjs, raiz do repositório, Node 24.x, pnpm 11.25.0. Install: `pnpm install --frozen-lockfile`; build: `pnpm build`; start local: `pnpm start`. `vercel.json` registra framework/comandos. CI e `pnpm predeploy` executam lint/typecheck/testes/banco/build/audit, sem deploy.

Defina URL/publishable key Supabase, DATABASE_URL do papel existente orbit_backend, APP_ENV=production em Preview/Production; opcionais estão em .env.example. Nunca usar service key pública nem conexão postgres administrativa no runtime. Transaction pooler 6543, prepare:false, TLS verificado, max=3 por instância, statement_timeout de 20s. Não girar credenciais em resposta à limitação TCP local.

Se o pooler apresentar `SELF_SIGNED_CERT_IN_CHAIN`, baixe a CA pública em Supabase Database Settings → SSL Configuration e configure o PEM em `SUPABASE_DB_CA_CERT` no ambiente autorizado. O driver continua verificando certificado e hostname. Não desativar TLS nem usar `rejectUnauthorized:false`. A validação da migração configurou essa variável somente em Preview, na branch `migration/supabase-vercel-v2`; produção permanece sem alteração. Renovar a CA através do dashboard quando necessário.

`APP_ORIGIN` é a origem HTTPS canônica; Preview usa VERCEL_URL quando não definido. Na próxima etapa, registrar a URL real de Preview nas URLs de callback/redirect do Supabase Auth (incluindo `/auth/confirm`), sem inventar domínio nem alterar a origem de produção. Confirmar templates de confirmação de e-mail e SMTP do ambiente antes de testar cadastro real.

## Validação futura obrigatória

No Preview autorizado: login Supabase real → dashboard → refresh → deep link/nova aba → busca CE/Fortaleza/restaurantes → resultados reais em mapa/lista → filtro sem site → lead → salvar → refresh → CRM/notas/tags → refresh → site/preview/responsividade → script → logout → rota privada bloqueada. Repetir outra consulta para excluir hardcode. Nunca contabilizar fixtures como fonte real.

Monitorar `/api/health`, logs de funções e erros estruturados sem secrets/headers/corpos. Health verifica aplicação e banco, sem depender de APIs externas. PostgreSQL deve ser validado no runtime Vercel; o workspace local não possui TCP adequado e essa limitação não bloqueia compilação.

## Scheduler

Desativado por padrão. Se ativado, chamar POST `/api/internal/run` com `x-scheduler-secret` e `Authorization: Bearer` de uma sessão Supabase real do workspace. O endpoint executa até três monitores e jobs limitados. O agendador deve obter/renovar essa sessão através de mecanismo autorizado, nunca inserir claims sintéticas ou usar bypass global. Execução manual continua disponível.

## Rollback

Conservar main/baseline e commits de migração remotos. A tarefa atual não altera deployment nem banco remoto. Após futuras publicações, reimplantar a versão previamente aprovada na Vercel; migrations posteriores devem ser compatíveis com ambas as versões. Não executar rollback destrutivo de banco automaticamente. Leia DISASTER_RECOVERY.md antes de restaurar dados.
