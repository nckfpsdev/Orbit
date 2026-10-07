# Gates após o checkpoint de migração

As verificações operacionais da arquitetura anterior estão preservadas no baseline GitHub. Elas não comprovam a arquitetura atual.

TCP do workspace: WORKSPACE_NETWORK_LIMITATION. Não alterar DNS/firewall/credenciais ou converter o runtime para REST por esse motivo.

Código, migrations e testes devem estar persistidos na branch de migração antes de qualquer Preview. O gate seguinte é a autorização para configurar/testar o Preview Vercel existente, incluindo Supabase Auth real, conexão da aplicação e duas buscas reais em mapa/lista. Este checkpoint não promove produção.
