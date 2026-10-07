# Operação e próxima publicação

Esta auditoria salva a revisão de código e a build sem publicar. A liberação permanece condicionada às três verificações de destino descritas no relatório: autenticação SIWC, descoberta com fonte real e recuperação do D1 gerenciado.

Atualização de 2026-10-06: [evidências dos três blockers](BLOCKERS.md). Overpass respondeu 200 para duas consultas reais após a correção de identificação, com transporte Node e Worker/D1 isolados; isso não valida egress remoto. O procedimento de recuperação gerenciada está em [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md). Nenhum deploy, migration ou restore remoto foi executado.

## Destino preservado

- Runtime: Cloudflare Worker/Vinext, Node 24 para ferramentas, D1 binding `DB`.
- Hospedagem: Sites, com gateway SIWC privado; não usar `wrangler deploy` diretamente nem tornar o Worker bruto público.
- Origem existente: `https://orbit-local-intelligence.leidianebrito125.chatgpt.site`. Domínio personalizado é opcional e não foi criado. Não há exigência de inventar DNS/WWW.
- Acesso atual: allowlist com um usuário, sem visitantes externos. Salvar código não altera essa política.
- Não há R2/upload, Redis, e-mail transacional ou pagamento nesta versão. Não configurar serviços inexistentes como se fossem utilizados.

## Gates de liberação

1. `pnpm install --frozen-lockfile` com Node/pnpm fixados; `pnpm predeploy` deve terminar com exit 0. A CI valida e não publica.
2. No ambiente de destino, configurar `APP_ENV=production` e manter `APP_ORIGIN` igual à origem HTTPS. Revisar `.env.example`; validar pares das integrações opcionais e os três limites globais. `pnpm check:env` lê o processo, sem revelar valores. `DB` é um binding, não uma variável de conexão.
3. Confirmar acesso ao gateway SIWC com conta autorizada, refresh, logout e retorno sem sessão. Testar conta não autorizada e acesso direto a `/admin`. Testes locais de headers/organizações não substituem esse roundtrip. Não usar token de bypass como prova de login.
4. Executar uma pesquisa **real** Ceará/Fortaleza/CEP/nicho/raio, fonte autorizada, mapa/lista, gerar site/abordagem e persistir no CRM. Confirmar egress, termos, atribuição e contato do operador (`NOMINATIM_CONTACT`). Só repetir a fonte depois de resolver disponibilidade/configuração; não contornar bloqueios ou fabricar sucesso.
5. Verificar recuperação do banco gerenciado conforme seção abaixo, antes de qualquer migration remota.

Sem Gemini, gerar site/abordagem local continua funcional e identificado. Sem proxy de auditoria, não medir métricas de navegador nem cobrar auditoria medida. Sem REST licenciado, não habilitar esse provider. `ADMIN_EMAILS` vazio nega administração. Scheduler deve continuar `false` até haver chamada autorizada periódica e segredo forte; monitores iniciam pausados.

## Migração e publicação

As migrações são aditivas: `0000` é a versão anterior, `0001` adiciona idempotência e `0002` índice de resultados. Testes verificam banco novo e avanço a partir de `0000` sem perda do ledger. Não editar migrations já aplicadas nem executar SQL destrutivo.

Na próxima tarefa, criar checkpoint de recuperação, verificar migrations já aplicadas no D1 e aplicar somente as pendentes pelo mecanismo da plataforma. Empacotar fonte/build com migrações, salvar versão e publicar pelo Sites; manter acesso privado. Validar readiness/rotas/API/gateway após cutover. Migração compatível vem antes de servir código que depende de `api_operations`. Uma falha impede avançar ao próximo passo.

`pnpm start` usa Wrangler local com a build de `dist`, sem `--remote`; não é publicação. Use estado isolado para ensaios. O build não deve incluir assets temporários `public/__audit*`; `predeploy` bloqueia esses arquivos.

## Recuperação do banco

O ensaio automatizado restaurou uma cópia SQLite local e conferiu integridade, FKs e dados. Isso **não comprova recuperação do D1 gerenciado**. A integração disponível nesta auditoria permite leitura SQL, mas não expõe export/restore. Nenhuma restauração ou exclusão foi executada no banco publicado.

Antes da liberação, o operador deve confirmar o mecanismo disponível no plano de hospedagem e sua permissão de recuperação. D1 oferece Time Travel e export/import, mas disponibilidade e retenção precisam ser verificadas para este banco, não presumidas. Registrar checkpoint/bookmark ou export consistente, restaurar para um banco de ensaio autorizado e comparar contagens, ledger e integridade; registrar responsável, data, duração e instruções de retorno. Não ensaiar restore destrutivo no banco ativo.

Política mínima proposta a confirmar: recuperação diária e checkpoint antes de mudanças; retenção de pelo menos 7 dias em armazenamento restrito, sem dumps no Git; objetivo RPO de 24h/RTO de 1h. São metas operacionais, não SLAs comprovados. Testar recuperação periodicamente e após mudança do mecanismo. Um backup sem acesso e procedimento de restauração comprovado não aprova a liberação.

Referências primárias: [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) e [export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

## Rollback

Guardar versão/commit/build auditados, política de acesso, revisão das variáveis e checkpoint do banco. Se o smoke pós-publicação falhar, interromper novas operações caras e retornar ao último artefato **auditado e compatível com o schema**, pela versão de hospedagem. Não retornar automaticamente ao baseline desta auditoria, que continha falhas de autorização e fixtures de produção. Migrations aditivas podem permanecer; não desfazer a tabela de idempotência apagando dados.

Se já houver gravações de usuários após cutover, priorizar correção compatível; restauração de checkpoint exige avaliar perda dessas gravações e autorização específica. O procedimento de rollback está documentado, mas nenhuma troca de deployment foi ensaiada nesta etapa, conforme a proibição de publicação.

## Observabilidade e incidentes

`GET /api/health` retorna 200 quando application/D1 respondem e 503 quando D1 falha. APIs externas não determinam o health geral. O gateway privado pode exigir identidade; usar monitor da infraestrutura autorizado, sem abrir uma rota pública para contorná-lo.

Cada resposta do Worker tem `X-Request-Id`; erros e operações lentas registram rota, método, status e duração. Logs de upstream omitem query, payload e headers. AuditLog, ProviderUsage, jobs, transações e páginas administrativas permitem investigar consumo; nenhum custo monetário é inventado sem configuração.

Monitorar taxa de 5xx/429, latência, crédito reservado/estorno, jobs pendentes e falhas de provider. Segredos ficam nas variáveis de servidor; rotação/remoção não exige expô-los no log. Verificar alertas e retenção de logs do destino antes de admitir usuários. Não há integração Sentry contratada nesta versão.

## Dependências e limites verificados

Patches compatíveis removeram as vulnerabilidades de produção reportadas pelo registry. A auditoria completa mantém dois advisories em ferramentas de build: `esbuild@0.18.20` via Drizzle Kit e `braces@3.0.3` via fast-glob. Não são executados pelo Worker nem recebem padrões de usuários; não usar servidores de desenvolvimento de ferramentas expostos ou entradas de build não confiáveis. Mantê-los registrados e revisar patch/upstream; não ocultar `pnpm audit` completo nem forçar atualização major nesta estabilização.

QA de navegador verificou fluxo com fixtures identificadas, dark/light/system, onze larguras, mapa e preview em três modos. Não houve teste em hardware móvel real nem medição Lighthouse/CrUX; nenhum valor de CWV é prometido. A descoberta live não foi aprovada: workerd local falhou DNS; via transporte Node, ViaCEP/Nominatim responderam 200 e Overpass 406. Contratos simulados verificam reação a falhas, não disponibilidade do vendor.
