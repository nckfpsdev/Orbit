# Recuperação PostgreSQL/Supabase

Projeto correto: Orbit, `wnqxyoepqpexkshofxhv`, sa-east-1. Não recriar nem restaurar o banco principal como teste.

1. Identificar projeto, ambiente, schema e histórico pela integração Supabase. Comparar migrations versionadas e contagens relevantes antes de qualquer ação.
2. No dashboard oficial, conferir Database → Backups e retenção efetiva do plano. Não foi verificado o plano/PITR neste checkpoint. A documentação oficial oferece backups diários para planos pagos; projetos Free precisam manter exports próprios. Não presumir PITR habilitado.
3. Um operador autorizado, em ambiente com acesso de banco apropriado, pode exportar schema, roles e dados com a CLI oficial, usando credenciais de manutenção no secret store. O papel orbit_backend não é credencial de backup global, pois respeita RLS. Este workspace não deve tentar driblar sua limitação TCP.

```sh
umask 077
mkdir -p recovery-private
supabase db dump --db-url "$BACKUP_DATABASE_URL" --role-only --file recovery-private/roles.sql
supabase db dump --db-url "$BACKUP_DATABASE_URL" --file recovery-private/schema.sql
supabase db dump --db-url "$BACKUP_DATABASE_URL" --data-only --use-copy --file recovery-private/data.sql
```

4. Dumps nunca entram no Git, chat ou logs. Criptografar em armazenamento separado, guardar checksums, timestamp UTC, retenção e acesso mínimo. Se Storage for adotado futuramente, objetos exigem backup separado; um dump contém apenas metadados. O produto atual não usa uploads.
5. Restaurar somente em cópia de recuperação previamente autorizada, com proprietário confirmando o destino. Seguir a ordem oficial roles/schema/data; manter as configurações gerenciadas do Supabase e grants padrão. Nunca apontar comandos de restore para o projeto principal como prova.
6. Validar migrations, RLS em todas as tabelas, FKs, contagens, UTF-8, IDs, timestamps, ledger e sentinelas. Executar checks de isolamento A/B e leitura da aplicação na cópia; testes de Auth precisam usar contas reais autorizadas.
7. Em recuperação gerenciada/PITR, usar exclusivamente o fluxo oficial disponível no plano e confirmar a janela de indisponibilidade. Restaurar exige aprovação explícita do proprietário. Registrar o checkpoint/export anterior para reversão.
8. Antes de restaurar principal, obter backup atual separado e plano de rollback. Se a recuperação estiver errada, voltar ao backup anterior na cópia e validar antes de autorizar outra ação. Nunca apagar dados ou recursos legados automaticamente.

Migrations do projeto são reproduzíveis: os testes aplicam as três em PostgreSQL vazio. O teste de RLS remoto executa fixtures dentro de BEGIN/ROLLBACK e confirma zero resíduo; isso não é uma prova de restore gerenciado. Nenhum backup físico ou PITR foi alegado nesta migração.

Documentação oficial: https://supabase.com/docs/guides/platform/backups e https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.
