# Verificação exclusiva dos três blockers

## Estado atual — provas reais em 2026-10-06

**SIWC: PASS. Worker real + descoberta: PASS. Mapa/lista: PASS.** O ambiente Cloudflare privado retornou 101 restaurantes e uma clínica odontológica em Fortaleza/CE, CEP de pesquisa 60160-230, raio de 1 km, por duas consultas distintas registradas no D1 com provider `osm` e sem cache. O provider autorizado foi VK Maps/Overpass. O mapa recebeu os mesmos 101 restaurantes da lista: inicialmente clusters de 97 e 4, depois 101 marcadores individuais. O marcador Docentes e Decentes abriu o mesmo estabelecimento da lista; sua página completa carregou dados, origem OSM e incerteza sobre ausência de site. [Prova remota sanitizada](evidence/worker-remote-real-2026-10-06.json). Nenhum mock, transporte Node ou bypass foi usado nessa prova.

Uma consulta de farmácias/1 km recebeu 504 externo e 502 controlado da aplicação; a falha não foi escondida nem transformada em resultado fictício. Os filtros efetivos registrados no D1 foram usados para identificar cada consulta, evitando contar texto digitado sem selecionar a opção do combobox. A origem e o destino do provider foram configurados explicitamente e a página recarregada ao validar a revisão remota nova.

**Único gate externo restante: D1 recovery.** Em 2026-10-07 UTC, o operador informou ter aprovado o OAuth Device Authorization Grant oficial do Wrangler 4.148.0. A continuação da CLI foi bloqueada pela política de rede deste ambiente para `https://dash.cloudflare.com:443`; `wrangler whoami` confirmou que a sessão não foi criada. Não há conector Cloudflare disponível nesta sessão para executar as operações de controle do D1. É necessário liberar o acesso HTTPS autorizado ao OAuth (`dash.cloudflare.com`) e à API D1 (`api.cloudflare.com`), concluir uma nova autorização oficial e identificar o banco físico correto antes de obter bookmark/export e testar import/restore em cópia. [Evidência sanitizada](evidence/d1-access-2026-10-07.json). O D1 principal não foi restaurado, migrado ou substituído. A criação do staging privado não constitui recuperação do principal.

## Execução anterior nesta continuação — histórico

**SIWC real: PASS.** O usuário concluiu o login OpenAI real com senha e MFA pelo formulário protegido. O callback retornou à conta autenticada. Dashboard direto, refresh mantendo conta/dados e nova aba no CRM passaram. “Sair” encerrou o acesso; dashboard e CRM exigiram autenticação após logout e refresh de ambas as abas. [Evidência sanitizada](evidence/siwc-real-2026-10-06.json), sem mock, bypass ou valores de credenciais. O deployment principal existente permaneceu inalterado.

**Worker remoto: em validação.** Foi criado o ambiente privado distinto autorizado `https://orbit-validation-20261006.leidianebrito125.chatgpt.site`, projeto `appgprj_6ac57c4f60e08191852e983ab6dfa4e9`, com D1 próprio, 29 tabelas e `APP_ENV=production`. SIWC autenticou a mesma conta nesse ambiente; nenhum dado fictício foi semeado. A localização CE/Fortaleza/CEP 60160-230 foi resolvida e armazenada pelo Worker no D1 remoto. Restaurantes/2 km na instância padrão receberam erro controlado do provider. A [política atual das instâncias Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances) restringe a instância padrão para este uso; não houve tentativa de contornar restrições, troca de IP/DNS ou User-Agent falso.

Private.coffee, cuja política permite uso em projetos, recebeu configuração explícita. Restaurantes/2 km e farmácias/1 km atingiram timeout de 30 s no Worker, comprovado por logs estruturados; uma consulta de status fora do Worker também expirou em 12 s. VK Maps, igualmente documentado como disponível para projetos, está em validação através de `OVERPASS_URL`. Os requests são sequenciais, limitados e sem rotação automática de instâncias. Até existirem resultados reais no destino, **descoberta e mapa/lista não são PASS**. Os resultados anteriores com transporte Node não substituem essa prova.

Diagnóstico mínimo adicionado: respostas HTTP não bem-sucedidas registram somente evento, hostname, status e duração. Não registram query string, corpo, dados de autenticação ou contatos. POST, cache, lease, limites, deduplicação e retry restrito foram preservados; nenhum componente comercial ou visual foi alterado.

**D1 recovery: pendente de acesso de controle.** O principal mantém 28 tabelas; o D1 de validação com 29 tabelas não é uma cópia recuperada. O conector não expõe nome/UUID físico nem operações de export/Time Travel. Wrangler segue sem autenticação. O painel Cloudflare real abriu a tela de login, mas uma falha de verificação manteve “Sign in” desabilitado após uma única recarga. É necessária intervenção humana e acesso à conta que efetivamente hospeda o D1 do Site. Nenhum bookmark/export/import/restore gerenciado foi alegado, nem houve restore no principal. O [runbook](DISASTER_RECOVERY.md) já define a prova segura em cópia e a reversão.

**Regressão atual: PASS.** Lint, typecheck, 38 testes unitários, 3 testes de banco local, build de produção e 132 verificações isoladas passaram após as mudanças do provider. Fixtures são usadas apenas nos testes determinísticos; não contam como provas reais. Não houve nova auditoria geral ou redesign.

## Registro anterior — preservado como histórico

Data: 2026-10-06. Revisão anterior: `9f1f952cef1901e61e9b6500844b1df408852d1a`.
**NOT READY FOR DEPLOY**. Nenhum deploy, mudança de audiência, alteração de env remoto, migration ou restore remoto foi executado nesta tarefa.

## 1. SIWC real — pendente de autenticação autorizada

A origem real abriu o gateway privado; “Continuar com o ChatGPT” levou ao formulário real `auth.openai.com/log-in`. A solicitação segura de autenticação retornou `declined`; não foi repetida nem substituída por bypass/cookie/token/identidade fictícios. A última observação ainda mostra o formulário desautenticado.

Diagnóstico HTTP real, sem credenciais: `/dashboard` retorna 401; `/signin-with-chatgpt?return_to=%2Fdashboard` retorna 302 para `https://auth.openai.com/oauth/authorize`. `redirect_uri` aponta à mesma origem HTTPS do projeto, `/callback`. Estão presentes os parâmetros `state`, `nonce`, `code_challenge` e `code_challenge_method`. Nos cookies retornados por essas requisições, `Secure` e `HttpOnly` estavam ativos; os contextos usam `SameSite=Lax` e `SameSite=None` com Secure. Nenhum valor de cookie/token/state/nonce foi registrado.

Isso comprova o início do protocolo e a barreira sem sessão, **não** o consumo do callback, a persistência da sessão ou a revogação no logout. Login, refresh, deep link autenticado, nova aba, logout e acesso pós-logout precisam de uma autenticação SIWC real com conta da allowlist. Não há senha própria nem novo provedor de autenticação a configurar no Worker. Código de sessão/cookies pertence ao gateway Sites; o Worker recebe a identidade apenas depois dessa barreira. O middleware/layout e a navegação de logout existentes foram preservados.

## 2. Descoberta real — HTTP corrigido; destino pendente

Correção limitada ao provider: User-Agent `OrbitLocal/0.1.0` com origem real configurada, Accept JSON, POST com `data=` codificado e charset UTF-8; consulta com timeout de 25 s, limite de memória de 32 MiB e saída de até 250 elementos. A requisição possui orçamento total de 30 s; uma falha de rede/502/503 rápida pode receber uma única repetição após 500 ms. 406, 429, redirects, timeout e dados inválidos não são repetidos. Não houve impersonação de navegador, troca de DNS/IP ou rotação de endpoints.

O D1 existente mantém lease atômico de 45 s por endpoint, com liberação pelo token do proprietário e recuperação após crash. Uma só consulta pode ficar em voo em todos os workspaces; o intervalo global é 10 s. Cache e deduplicação existentes foram preservados e verificados. `OVERPASS_URL` continua configurável para instância privada/comercial autorizada, além da abstração de provider licenciado existente; não há fallback automático para instâncias públicas não autorizadas.

Prova real pela build compilada em Worker/D1 **isolados**, transportando as mesmas requisições HTTPS pelo Node:

| País/estado/cidade/CEP              | Nicho        | Raio | Negócios normalizados | Overpass |
| ----------------------------------- | ------------ | ---- | --------------------- | -------- |
| Brasil / CE / Fortaleza / 60160-230 | Restaurantes | 2 km | 234                   | 200      |
| Brasil / CE / Fortaleza / 60160-230 | Farmácias    | 1 km | 23                    | 200      |

ViaCEP e Nominatim também responderam 200. Todos os registros têm fonte `osm`, `is_demo=false`, nome/categoria/coordenadas e score válido. Avaliações ausentes continuam null; nenhum dado de reputação foi fabricado. A leitura individual de lead confirmou persistência. Repetir cada filtro retornou cache sem novo request externo nem cobrança de créditos. Exemplos de origem pública: Restaurante Frederico, Two Brothers e Pague Menos; os IDs OSM e coordenadas estão na [evidência sanitizada](evidence/osm-real-2026-10-06.json), concluída em `2026-10-06T18:09:35.441Z`.

Uma consulta anterior de farmácias/2 km recebeu 504, sem repetição automática. A consulta representativa menor, de 1 km e memória explicitamente limitada, foi executada posteriormente e passou. Não se presume disponibilidade permanente de uma instância pública gratuita.

O ensaio direto em workerd local continua falhando na resolução de `viacep.com.br`, antes de consultar Overpass. A API responde 503 `PROVIDER_UNAVAILABLE`, sem converter falha em resultado vazio/fictício; [registro do ensaio local](evidence/local-dns-2026-10-06.json). O transporte Node diferencia a limitação local da disponibilidade da fonte, mas **não comprova DNS/egress do Worker Cloudflare de destino**. Não existe acesso Cloudflare autenticado para remote bindings/Worker staging nesta sessão. O teste final no destino e mapa/lista com esses resultados reais continuam pendentes; o login real também bloqueia esse smoke. Identidade sintética é restrita ao harness em memória e não foi enviada ao gateway publicado nem contabilizada como SIWC.

## 3. D1 recovery — pendente de acesso de controle

O conector confirmou o binding `DB` do Site existente e 28 tabelas publicadas. Nome/UUID físico, backend e retenção Time Travel não são expostos. A configuração de build usa placeholders locais e não pode servir para identificar o banco gerenciado. `wrangler whoami` informou que não há autenticação. Nenhuma credencial Cloudflare foi disponibilizada; as ferramentas nativas oferecem viewer de dados, sem export, criação de cópia ou Time Travel.

Não foi possível obter bookmark oficial, exportar, criar/importar um D1 de recovery ou executar Estado A → B → A remotamente. Não houve restauração destrutiva sobre o principal. Os testes SQLite locais continuam passando e **não** aprovam esse blocker.

O [runbook DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) define identificação, comandos oficiais, checkpoint/export restritos, cópia autorizada, import, validação de schema/contagens/FKs/sentinela, restore e reversão. Para executar, o operador da **conta que hospeda este D1** deve confirmar nome/UUID e conceder acesso às operações necessárias. `wrangler d1 time-travel info NOME_FISICO --config CONFIG_DE_RECOVERY --json` deve produzir o bookmark do principal; `d1 export --remote`, `d1 create`, `d1 execute --remote --file` e `d1 time-travel restore --bookmark` devem ser ensaiados na cópia, conforme o runbook. Restore no principal exige autorização específica e não faz parte da prova descartável.

## Regressão e smoke final

Lint e TypeScript strict passaram; 38 testes unitários, 3 testes de banco local e 132 verificações de integração no Worker compilado/D1 isolado passaram. Build de produção final passou. Os contratos de teste simulam falhas apenas para validar tratamento, cabeçalhos, cache, concorrência e retry; não são usados como evidência de disponibilidade real.

O smoke real completo `Login → refresh → dashboard → busca real → abrir lead → logout` permanece interrompido no login. As duas consultas públicas e a leitura de lead passaram somente no harness de provider. A versão preparada deve permanecer sem publicação até as três provas de destino restantes.
