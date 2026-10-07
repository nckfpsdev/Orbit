# Contratos de API

Todas as APIs comerciais exigem sessão Supabase verificada no servidor. Organização e papel são obtidos no servidor; IDs de outras organizações retornam 404. Mutações exigem JSON, origem permitida, validação Zod e limite de frequência. Valores não reconhecidos são rejeitados.

Resposta: `{ "data": ... }`. Erro: `{ "error": { "code", "message", "retry_after"?, "fields"? } }`. Status principais: 401 autenticação, 403 autorização/origem/licença, 402 créditos, 409 versão concorrente, 422 validação, 429 rate limit, 502/503 provedor indisponível.

| Método   | Endpoint                                                   | Ação                                                                        |
| -------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| GET      | `/api/health`                                              | Application/PostgreSQL health: 200 ou 503, sem dependência de APIs externas |
| GET      | `/api/v1/leads?saved=true&page=1&page_size=50&q=&list_id=` | Página de leads do usuário; máximo 100, busca e lista no servidor           |
| GET      | `/api/v1/bootstrap`                                        | Workspace, registros prioritários, agregados e capacidades                  |
| POST     | `/api/v1/search`                                           | Localização/nicho/filtros tipados; cache, dedupe e score                    |
| GET      | `/api/v1/search/:id?page=1&page_size=250`                  | Resultados persistidos; page_size máximo 250                                |
| GET      | `/api/v1/leads/:id`                                        | Negócio, evidências, histórico e auditorias                                 |
| POST     | `/api/v1/leads/:id/enrich`                                 | Reanálise com cache de 24h e evidência de website                           |
| POST     | `/api/v1/leads/:id/audit`                                  | Auditoria limitada ou medida                                                |
| POST     | `/api/v1/leads/save`                                       | business_id, stage?, tags?, notes?, list_id?                                |
| POST     | `/api/v1/leads/batch`                                      | ids (máximo 100), save/tag/move/analyze                                     |
| POST     | `/api/v1/lists`                                            | Criar lista com nome                                                        |
| GET/POST | `/api/v1/websites`                                         | Listar/criar demonstração com business_id e data revisada opcional          |
| GET/POST | `/api/v1/websites/:id`                                     | Ler/salvar content com versão esperada                                      |
| POST     | `/api/v1/websites/:id/edit`                                | instruction e section?; requer IA configurada                               |
| POST     | `/api/v1/websites/:id/publish`                             | Publicar demonstração com aviso e noindex                                   |
| GET      | `/preview/:slug`                                           | HTML comercial publicado; dados privados não são retornados                 |
| GET/POST | `/api/v1/scripts`                                          | Listar/gerar por business_id, channel, kind, objection?                     |
| POST     | `/api/v1/scripts/:id`                                      | Salvar revisão humana do texto                                              |
| GET/POST | `/api/v1/proposals`                                        | Listar/gerar com preço, escopo, prazo e site do mesmo lead                  |
| POST     | `/api/v1/export`                                           | ids, fields, format csv/xlsx; direitos validados                            |
| POST     | `/api/v1/settings`                                         | Critérios, contexto comercial e preços autorizados                          |
| GET      | `/api/v1/credits`                                          | Extrato por organização                                                     |
| GET/POST | `/api/v1/monitors`                                         | Listar/criar monitor pausado                                                |
| POST     | `/api/v1/monitors/:id`                                     | Ativar/pausar, sujeito ao scheduler conectado                               |
| POST     | `/api/v1/monitors/:id/run`                                 | Executar uma busca manual                                                   |
| GET      | `/api/v1/jobs`                                             | Estado da fila                                                              |
| POST     | `/api/v1/jobs/process`                                     | Processar até três análises com lease e retry limitado                      |
| GET      | `/api/v1/admin`                                            | Uso/custos/usuários/plano/auditoria da organização                          |
| POST     | `/api/v1/admin/credits`                                    | Concessão autorizada, sem cobrança                                          |
| POST     | `/api/v1/admin/subscription`                               | Plano interno manual, sem gateway de pagamento                              |
| POST     | `/api/v1/workspace/delete-data`                            | Proprietário; exige confirmation exatamente EXCLUIR                         |
| POST     | `/api/internal/run`                                        | Scheduler com segredo e sessão Supabase do workspace                        |

Listas, tags e CRM são ligados ao negócio, sem recriar o mesmo lead. Reanálise calcula score com os pesos da organização. Créditos são reservados e estornados atomicamente. Conteúdo de site não aceita HTML arbitrário; versões concorrentes não sobrescrevem silenciosamente mudanças.

## Repetição, erros e limites

O client envia `Idempotency-Key` nas mutações JSON. Chave: 16–100 caracteres alfanuméricos, `_` ou `-`; escopo organização. A mesma chave e fingerprint de rota/payload devolve a resposta salva com `Idempotency-Replayed: true`. Payload diferente ou operação em andamento retorna 409. Commit incerto fica bloqueado para inspeção; não é reexecutado automaticamente. Clientes de integração devem enviar a chave para operações caras/persistentes.

APIs privadas respondem com `Cache-Control: private, no-store`. Payload JSON tem limite de 80 KB de bytes UTF-8, incluindo exportações; tamanho excessivo é 413. Batch até 100 negócios; export até 250 IDs autorizados com CSV/XLSX e neutralização de fórmulas. Chamadas do client têm timeout de 75s e cancelamento; 429 informa retry quando disponível. Diagnóstico ao usuário não contém stack trace ou resposta bruta do upstream.

POST de administração exige role e allowlist; ocultar o link não é a autorização. Exclusão de dados exige owner e confirmação explícita, remove registros comerciais/idempotência e não recria fixtures. Health consulta PostgreSQL sem depender de APIs externas. Não há gateway legado.

Auth: POST /api/auth/login e /api/auth/signup recebem e-mail/senha; POST /api/auth/logout revoga sessões. Cookies SSR HttpOnly/Secure em produção, refresh por proxy.ts, callback /auth/confirm e redirects restritos à aplicação. Nenhum token é retornado no JSON.
