# Orbit · inteligência comercial local

SaaS em português para descoberta geográfica, evidências de presença digital, score explicável, demonstrações de sites, abordagens revisáveis, propostas e CRM. Não envia mensagens automaticamente. “Nenhum site próprio identificado” expressa a evidência disponível, sem afirmar inexistência.

## Runtime e acesso

React 19, TypeScript strict, Tailwind 4, Shadcn/Base UI, Leaflet e Recharts. Next.js via Vinext em Cloudflare Workers, D1/SQLite e Drizzle; 29 tabelas, cache e jobs persistentes. Todas as APIs comerciais aplicam isolamento por organização no servidor.

A autenticação pertence ao gateway privado SIWC do Site. Não há senhas, cadastro próprio ou reset de senha no Worker. Nunca exponha o Worker bruto em outra origem: os headers de identidade só são confiáveis após o gateway. Administração exige papel autorizado **e** e-mail em `ADMIN_EMAILS`; allowlist vazia nega acesso.

## Instalação e validação

Use Node indicado em `.nvmrc` e pnpm indicado em `packageManager`; há um único lockfile.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm predeploy
```

`predeploy` executa lint, typecheck, testes de domínio, migrações/restore isolado, build real, integração no Worker compilado e auditoria de dependências de produção. Interrompe no primeiro erro e **não publica**. CI repete os mesmos gates. `pnpm start` serve a build local com Wrangler, sem deploy remoto; exige D1 local migrado.

## Ambiente e banco

`.env.example` lista todas as variáveis de servidor. Em produção configure `APP_ENV=production`, `APP_ORIGIN` com a origem HTTPS do Site e o binding D1 `DB` gerenciado pela plataforma. Não existe `DATABASE_URL` neste runtime. Nenhuma chave tem prefixo público. `pnpm check:env` valida as variáveis presentes no processo sem imprimir valores; não substitui validação no destino.

Depois de `pnpm build`, aplique **cada migration SQL em ordem**, inclusive `0001` e `0002`, a um banco local novo (uma vez; não reaplique a um banco existente):

```sh
for migration in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration"
done
```

O teste `pnpm test:database` verifica criação do zero, atualização da versão anterior sem perder créditos, constraints e restauração de uma cópia SQLite isolada. A migration original é imutável; alterações são aditivas. Migrações remotas são parte da próxima etapa, não desta auditoria.

## Fontes e geração

| Integração        | Variáveis                                            | Sem configuração                                                   |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Gemini            | `GEMINI_API_KEY`, `GEMINI_MODEL`                     | Composição local por nicho, identificada; edição manual disponível |
| Dados licenciados | `LEAD_PROVIDER_URL`, `LEAD_PROVIDER_KEY`             | Adapter desativado; sem resultados fabricados                      |
| Auditoria medida  | `WEBSITE_AUDIT_URL`, `WEBSITE_AUDIT_KEY`             | Diagnóstico limitado e gratuito da URL; métricas desconhecidas     |
| Administração     | `ADMIN_EMAILS`                                       | Acesso e concessões negados                                        |
| Geocoding/OSM     | `GEOCODING_URL`, `OVERPASS_URL`, `NOMINATIM_CONTACT` | Endpoints públicos padrão; cobertura/disponibilidade variáveis     |
| Scheduler         | `SCHEDULER_ENABLED`, `WORKER_SECRET`                 | Monitores pausados; sem execução periódica alegada                 |

OpenStreetMap é a fonte padrão de produção; buscas explícitas têm cache, atribuição e limites globais. O User-Agent identifica a aplicação com `APP_ORIGIN` real e, opcionalmente, `NOMINATIM_CONTACT`. Overpass usa POST codificado, orçamento de 30 segundos, memória limitada, uma consulta simultânea por endpoint e intervalo global de 10 segundos. Uma falha transitória rápida pode receber uma única repetição; 406/429/redirect/timeout não são repetidos. `OVERPASS_URL` permite um endpoint privado/comercial autorizado; nenhuma instância é trocada para contornar bloqueios. REST licenciado exige direitos de retenção/exportação. Falhas não são convertidas silenciosamente em fixtures.

Fixtures só são habilitadas em desenvolvimento/teste. Em produção, geração de fixtures é bloqueada e registros fictícios antigos ficam invisíveis. No desenvolvimento, Ceará → Fortaleza → Clínicas odontológicas → 10 km permite ensaiar mapa/lista, análise, site, abordagem, notas, listas e estágio do CRM. Os dados são explicitamente fictícios.

Sites guardam conteúdo estruturado, versões concorrentes e aviso permanente de demonstração comercial. Preview isolado, HTML escapado e `noindex`; links obedecem ao acesso privado do Site. A geração não torna uma demonstração pública nem cria um site oficial. IA indisponível tem fallback local explícito para geração; edição com IA requer configuração e devolve erro com estorno se falhar.

## Limites e operação

Descoberta: até 250 resultados por pesquisa e raio OSM até 20 km. Bootstrap: até 500 registros prioritários. CRM e listas: paginação própria no servidor, até 100 por chamada; a interface mostra 50 e exporta a página selecionada. Agregados consideram todo o banco. Clustering limita pins visíveis; não há promessa de volume ilimitado.

Planos são internos/manuais; não há checkout ou cobrança automática. Pesquisa natural e copiloto usam funções estruturadas locais. Não há scraping de Google Maps, disparo em massa, perfis pessoais sensíveis ou diagnóstico de domínio expirado sem evidência.

O diagnóstico opcional de fontes reais é separado da CI determinística:

```sh
ORBIT_SMOKE_APP_ORIGIN=https://orbit-local-intelligence.leidianebrito125.chatgpt.site pnpm test:provider-live
```

Se workerd local não resolver DNS, `ORBIT_SMOKE_NODE_TRANSPORT=1` permite comparar as mesmas requisições HTTPS pelo transporte Node; esse modo **não comprova DNS/egress do Worker de destino ou login SIWC**. `ORBIT_SMOKE_REPORT` pode apontar para arquivo restrito de evidência sanitizada. O teste usa identidade sintética apenas no Worker/D1 isolados e nunca envia headers de gateway a um Site publicado. Não usar esse harness como prova de autenticação real.

Em 2026-10-06, duas consultas reais pelo transporte Node passaram: Fortaleza/CEP 60160-230, restaurantes/2 km (234 negócios) e farmácias/1 km (23). ViaCEP, Nominatim e Overpass responderam 200; normalização, leitura do lead e cache foram verificados. O DNS direto de workerd local continua falhando e o teste no Worker de destino está pendente. SIWC chegou à OpenAI, mas a autenticação segura foi recusada. Recuperação gerenciada do D1 exige acesso do operador da conta Cloudflare. **Não está aprovado para deploy**.

Leia [verificação dos três blockers](docs/BLOCKERS.md), [recuperação D1](docs/DISASTER_RECOVERY.md), [auditoria anterior](docs/audit.md), [runbook de produção](docs/production.md), [arquitetura](docs/architecture.md), [integrações](docs/integrations.md) e [API](docs/api.md). A revisão foi preparada sem publicação.
