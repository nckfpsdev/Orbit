# Orbit · arquitetura e decisões

## Produto

Workspace SaaS em português: descoberta geográfica → evidência digital → score explicável → demonstração comercial → abordagem revisável → CRM → proposta. Dados fictícios são identificados no workspace, nos registros e nas exportações. Ausência de campo website nunca confirma ausência de site. Nenhuma mensagem é enviada automaticamente.

## Implantação

React 19, TypeScript strict, Next.js API via Vinext em Cloudflare Workers; D1/SQLite com Drizzle e migrações versionadas. D1 é a alternativa relacional compatível com o ambiente de hospedagem; isolamento por organização é aplicado em todas as queries e APIs. Um adapter de banco permite migração futura para PostgreSQL por HTTP, sem acoplar a interface. Não há Redis ou BullMQ em um Worker: cache e fila duráveis ficam no banco, com leases e retries limitados. A fila é processada explicitamente pelo workspace; monitoramento só roda após ativação e através do endpoint de worker protegido por segredo. Sem scheduler externo configurado, isso é mostrado como pendente e não como executando.

## Módulos

- `lib/domain`: contratos, geografia, deduplicação, presença, score, exportação.
- `lib/providers`: MockProvider, OpenStreetMapProvider, LicensedProvider; geocoding separado.
- `lib/server`: auth, validação, banco, descoberta, enriquecimento, créditos, cache, filas, auditoria e geração.
- `components/orbit`: superfícies de produto e controles reutilizáveis.
- `app/api/v1`: contratos JSON, erros tipados, autorização e limites.
- `app/preview`: renderização segura das demonstrações publicadas.

## Fluxo e modelos

Uma organização pertence a um usuário ChatGPT autenticado. Negócios, localizações e fontes são isolados por organização; leads relacionam negócios com estágios, listas, tags, notas e atividades. DigitalPresence armazena evidências com origem/confiança/data. WebsiteAnalysis registra verificações efetivamente fornecidas pelo proxy configurado; sem proxy, apenas o protocolo da URL é conhecido. Tempo de resposta HTTP não equivale a um Lighthouse score. GeneratedWebsite e WebsiteVersion guardam conteúdo estruturado, nunca HTML arbitrário de IA; publicação tem revisão, aviso comercial permanente e noindex. Propostas referenciam problemas comprovados e preço informado pelo vendedor. Créditos, ProviderUsage e AuditLog têm registros imutáveis.

## Provedores e custos

Mock é exclusivo de desenvolvimento/teste; OpenStreetMap é padrão de produção. Nunca há fallback silencioso para dados fictícios. OSM/Overpass oferece dados comerciais com atribuição ODbL, sem avaliações fabricadas. Nominatim é acionado somente por busca explícita, com cache e limite global. LicensedProvider usa um endpoint HTTPS autorizado e exige licença de persistência/exportação declarada pelo provedor. Integrações Google Places devem respeitar seus termos: conteúdo não é copiado automaticamente para CRM ou mapa OSM; não implementamos um scraper nem assumimos licença por possuir uma chave. IA opcional: API Gemini no servidor, saída JSON validada e fatos do negócio preservados. Sem chave, composição local por nicho é funcional e identificada, sem alegação de uso de IA.

Busca cacheada de fontes permitidas custa zero créditos; demais custos são configuráveis. Créditos são reservados atomicamente antes da ação e estornados em erro. Idempotency-Key registra fingerprint e resultado por organização no D1; concorrência retorna 409, replay não cobra novamente e resultados de commit incerto não são repetidos automaticamente. CRM e listas consultam páginas próprias no servidor, além do bootstrap de 500 registros. Enriquecimento usa TTL e deduplicação por domínio/telefone/coordenadas com evidência de nome/endereço. Fontes não licenciadas para retenção são rejeitadas pelo adapter. Métricas de custo monetário só são apresentadas quando configuradas, sem inventar faturas reais.

## Segurança

Identidade encaminhada pela plataforma SIWC; APIs não aceitam identidade enviada no payload. Cada query recebe organization_id. Origem das mutações e Content-Type são verificadas; Zod valida contratos; statements são preparados. URLs arbitrárias não são requisitadas diretamente: auditoria real usa proxy de auditoria licenciado que bloqueia IPs privados e revalida DNS/redirects; sem proxy a análise é declarada limitada. IA edita conteúdo estruturado com limites, sem scripts ou injeção de HTML. Exports neutralizam fórmulas CSV. Chaves vivem apenas em variáveis de servidor. Logs técnicos sem conteúdo pessoal. Admin exige papel persistido autorizado e e-mail na allowlist não vazia; o padrão é negar.

## Componentes

Shell responsivo com sidebar; pesquisa com localização/nicho/priorização; mapa com clustering e lista paginada; sheet de lead; análise com evidências; editor de demonstrações com desktop/tablet/mobile; geração de scripts por canal; CRM com drag/drop e seletor acessível; listas, histórico, biblioteca, configurações e administração. Preferências de tema são locais; dados do produto são persistidos no servidor.

## Validação

Testes críticos: ausência/incerteza/URLs sociais, DNS/redirect safety, geodistância/limites, deduplicação, filtros, créditos, score, script sem promessas, sanitização de export e isolamento. Typecheck strict, ESLint, build Worker e fluxo integrado no Worker compilado com D1 isolado. Sem credenciais externas, não declarar integrações de produção como verificadas.
