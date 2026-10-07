# Recuperação do D1 gerenciado

## Alvo e limites desta verificação

Projeto Sites: `appgprj_6ac448e2a1988191901cfc686bec5acb`, origem `https://orbit-local-intelligence.leidianebrito125.chatgpt.site`, binding `DB`.

Em 2026-10-06, o conector confirmou o D1 publicado e 28 tabelas. Ele não fornece nome/UUID físico, backend, exportação ou Time Travel. `wrangler whoami` informou ausência de autenticação. Portanto **nenhum bookmark remoto, export, import ou restore gerenciado foi comprovado**. Os testes SQLite locais não substituem essa prova. A revisão preparada contém 29 tabelas; não confundir seu schema com o deployment ainda ativo.

Os identificadores `site-creator-d1` e `00000000-0000-4000-8000-000000000000` da configuração de build são placeholders locais, não identificadores do D1 remoto. Não executar recuperação apontando para eles.

Continuação em 2026-10-06: foi criado e publicado somente o ambiente privado de validação `appgprj_6ac57c4f60e08191852e983ab6dfa4e9`, com um D1 independente e as 29 tabelas da revisão preparada. Esse banco vazio de validação **não é uma cópia recuperada do principal**. O painel `https://dash.cloudflare.com/login` foi aberto para obter acesso de controle; a verificação da página deixou “Sign in” desabilitado mesmo após uma única recarga. A etapa depende de autenticação humana e de acesso à conta que efetivamente hospeda os bancos Sites. Não houve exportação ou restauração remota, nem alteração de schema/dados do principal.

Continuação em 2026-10-07 UTC: a aba bloqueada foi encerrada sem automatizar a verificação. Foi iniciada uma autorização oficial por dispositivo com Wrangler 4.148.0, executado temporariamente fora das dependências do projeto e com os escopos `account:read`, `user:read` e `d1:write`. O operador informou a aprovação; a continuação do processo recebeu `Network access to "https://dash.cloudflare.com:443" was blocked by policy`. Uma consulta posterior `wrangler whoami` confirmou ausência de autenticação. Portanto o controle remoto e a prova de recuperação continuam pendentes. Não repetir aprovações enquanto essa saída de rede permanecer bloqueada; não coletar tokens/callbacks por chat nem modificar DNS/proxy para contornar a política. A [evidência sanitizada](evidence/d1-access-2026-10-07.json) distingue aprovação humana de sessão efetivamente criada.

## 1. Identificar e autorizar o alvo

O operador da conta Cloudflare que hospeda este Site deve fornecer os identificadores físicos e uma sessão/credencial de controle da conta. Usar credencial restrita de leitura para identificação/consulta; export, criação, importação e restauração exigem as permissões correspondentes do serviço D1. O acesso ao projeto Sites ou ao viewer SQL não concede essas permissões de controle. Não autenticar uma conta pessoal diferente presumindo que contenha este banco. Não enviar credenciais por chat, argumentos ou Git.

Para uma sessão remota sem callback localhost, após a liberação autorizada de HTTPS para `dash.cloudflare.com` (OAuth) e `api.cloudflare.com` (controle D1), iniciar o fluxo oficial abaixo. Abrir no navegador normal somente a URL de verificação gerada pela CLI e aprovar a solicitação correspondente. O código de pareamento é gerado pela CLI; não solicitar senha, token, cookie ou código 2FA ao operador. Confirmar a conclusão com `whoami` antes de acessar o banco. O escopo D1 permite escrita na conta: a autorização operacional deste ensaio continua restrita à cópia descartável; não executar restore ou alterações no principal.

```bash
# CLI temporária com suporte ao fluxo de dispositivo; não modifica package.json/lockfile.
umask 077
npm exec --yes --package=wrangler@4.148.0 -- wrangler login --device --browser=false \
  --scopes account:read user:read d1:write
npm exec --yes --package=wrangler@4.148.0 -- wrangler whoami
```

Criar configuração Wrangler **separada**, fora do repositório ou em `recovery-private/`, com `account_id` correto e dois bindings: `SOURCE_DB` para o banco físico publicado e `RECOVERY_DB` para a cópia descartável autorizada. Usar nomes/UUIDs retornados pela conta. Não alterar a configuração da aplicação nem publicar Worker durante o ensaio.

```bash
# Preencher com caminhos/nomes reais verificados; não usar placeholders de build.
export ORBIT_DR_CONFIG=/caminho-restrito/wrangler-recovery.jsonc
export ORBIT_SOURCE_DB=NOME_FISICO_CONFIRMADO
export ORBIT_RECOVERY_DB=NOME_RECOVERY_TEST_AUTORIZADO
export ORBIT_DR_DIR=/caminho-restrito/orbit-recovery
umask 077
mkdir -p "$ORBIT_DR_DIR"
pnpm exec wrangler whoami
pnpm exec wrangler d1 list --config "$ORBIT_DR_CONFIG" --json
pnpm exec wrangler d1 info "$ORBIT_SOURCE_DB" --config "$ORBIT_DR_CONFIG" --json
```

Conferir conta, UUID, ambiente, backend/versão, tamanho, localização/jurisdição e retenção do plano. Registrar a correspondência `Site → Worker → binding DB → D1 físico` com o operador. Não avançar se houver dúvida sobre o alvo.

## 2. Obter restore point do principal — somente leitura

```bash
date -u +%FT%TZ > "$ORBIT_DR_DIR/checkpoint-timestamp.txt"
pnpm exec wrangler d1 time-travel info "$ORBIT_SOURCE_DB" \
  --config "$ORBIT_DR_CONFIG" --json > "$ORBIT_DR_DIR/source-bookmark.json"
```

Registrar timestamp UTC, bookmark retornado, UUID/nome/ambiente e responsável no registro operacional restrito. `time-travel` atua no D1 remoto e não aceita `--remote`. Um erro, saída vazia ou backend não compatível deixa o gate pendente; não inferir suporte. Bookmarks de sessões de leitura D1 não substituem esse comando.

## 3. Exportar schema + dados

```bash
pnpm exec wrangler d1 export "$ORBIT_SOURCE_DB" --remote \
  --config "$ORBIT_DR_CONFIG" --output "$ORBIT_DR_DIR/database-recovery.sql"
chmod 600 "$ORBIT_DR_DIR/database-recovery.sql"
sha256sum "$ORBIT_DR_DIR/database-recovery.sql" > "$ORBIT_DR_DIR/export.sha256"
```

Não usar `--no-data` ou `--no-schema` para o backup completo. O dump pode conter dados pessoais/comerciais: acesso restrito, armazenamento criptografado aprovado e retenção definida pelo operador. Nunca anexar o dump ao relatório, à conversa ou ao Git. Export pode impactar temporariamente o banco; escolher uma janela operacional apropriada.

## 4. Criar e importar na cópia autorizada

```bash
pnpm exec wrangler d1 create "$ORBIT_RECOVERY_DB" --config "$ORBIT_DR_CONFIG"
```

Copiar o nome/UUID retornados para `RECOVERY_DB` na configuração separada, respeitando a jurisdição aprovada para os dados. Confirmar que UUID e nome são diferentes dos de `SOURCE_DB`, que o banco está vazio e que não pertence a usuário real. O ensaio de recuperação descartável foi autorizado na tarefa; isso não autoriza apagar ou restaurar o principal.

```bash
pnpm exec wrangler d1 info "$ORBIT_RECOVERY_DB" --config "$ORBIT_DR_CONFIG" --json
pnpm exec wrangler d1 execute "$ORBIT_RECOVERY_DB" --remote \
  --config "$ORBIT_DR_CONFIG" --file "$ORBIT_DR_DIR/database-recovery.sql"
```

Não importar sobre um banco preenchido. Time Travel não clona outro D1: a cópia é feita por export/import.

## 5. Validar a importação

Executar as consultas abaixo separadamente em `SOURCE_DB` e `RECOVERY_DB`, sem imprimir conteúdo de registros. Comparar nomes e definição de tabelas/índices com a versão efetivamente publicada; conferir contagens de todas as tabelas de aplicação, especialmente `organizations`, `businesses`, `leads`, `searches`, `generated_websites`, `credit_transactions` e `crm_activities`. Se houver escrita no principal durante export/contagem, estabelecer uma janela consistente antes de alegar igualdade.

```sql
SELECT name, type, sql FROM sqlite_master
WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
ORDER BY type, name;
PRAGMA foreign_key_check;
SELECT count(*) FROM organizations;
SELECT count(*) FROM businesses;
SELECT count(*) FROM leads;
SELECT count(*) FROM credit_transactions;
SELECT count(*) FROM generated_websites;
```

`foreign_key_check` deve retornar zero violações. Conferir migrations/constraints, relacionamentos e ledger. A cópia deve usar o código compatível com o schema exportado; migrations novas, se necessárias, são aplicadas somente na cópia após documentar o estado importado. Validar leitura pela aplicação em staging privado com SIWC e `APP_ENV=production`, sem jobs/IA/contatos externos. Não apontar a aplicação publicada para a cópia.

## 6. Provar Estado A → alteração → recuperação na cópia

Somente em `RECOVERY_DB`, criar `dr_probe` e registrar uma sentinela sem dados reais:

```sql
CREATE TABLE dr_probe (id TEXT PRIMARY KEY, state TEXT NOT NULL);
INSERT INTO dr_probe (id,state) VALUES ('recovery-check','A');
```

Obter o bookmark **A** da cópia após confirmar a gravação, com `wrangler d1 time-travel info "$ORBIT_RECOVERY_DB" --config "$ORBIT_DR_CONFIG" --json`. Guardar a saída no diretório restrito. Alterar a sentinela para **B**, confirmar sua leitura e obter o bookmark **B** antes do restore:

```sql
UPDATE dr_probe SET state='B' WHERE id='recovery-check';
SELECT id,state FROM dr_probe;
```

Com o bookmark A real, executar somente na cópia:

```bash
: "${ORBIT_RECOVERY_BOOKMARK_A:?Defina o bookmark A real obtido da copia}"
test "$ORBIT_RECOVERY_DB" != "$ORBIT_SOURCE_DB"
pnpm exec wrangler d1 time-travel restore "$ORBIT_RECOVERY_DB" \
  --config "$ORBIT_DR_CONFIG" --bookmark "$ORBIT_RECOVERY_BOOKMARK_A" --json
```

Confirmar sentinela **A**, schema, contagens de tabelas de aplicação, foreign keys e leitura em staging. Guardar a saída do restore, incluindo o bookmark de retorno, de modo restrito. Registrar início/fim UTC, duração, hash do dump, versão do código e resultados. Não marcar sucesso com base apenas na execução do comando.

## 7. Desfazer restore e autorizar produção

Para comprovar reversão **na cópia**, restaurar usando o bookmark B previamente guardado ou o bookmark de retorno indicado pelo comando e verificar a sentinela B. Depois recuperar A novamente se necessário. Não adivinhar bookmarks nem presumir que um ponto já expirado permanece disponível.

Restore em produção exige autorização específica do responsável pelo banco/incidente: validar identidade do alvo, pausar/quiescer gravações, obter checkpoint/export atual, estimar perda das gravações posteriores e escolher o ponto. O comando é o mesmo, com o **nome físico principal confirmado**, mas não está autorizado como ensaio nesta tarefa. Pausar workers/jobs que escrevem evita recompor dados incompatíveis durante a recuperação. Registrar bookmark anterior para retorno, restaurar, validar e só então reabrir gravações. Voltar o código não restaura dados automaticamente.

Riscos: perda de gravações posteriores ao ponto escolhido, indisponibilidade durante operação, credencial/conta errada, import parcial, conflito de schema e retenção expirada. Um dump local ou a existência genérica de Time Travel não aprova a recuperação gerenciada deste projeto.

Referências oficiais: [Wrangler/D1](https://developers.cloudflare.com/d1/wrangler-commands/), [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) e [export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
