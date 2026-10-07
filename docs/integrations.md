# Integrações de servidor

## LeadProviderInterface

`searchBusinesses`, `getBusinessDetails`, `getCoordinates`, `verifyWebsite`, `enrichBusiness`, `normalizeBusiness`. Provedores retornam registros normalizados e autorização de retenção/exportação. O frontend não recebe credenciais nem chama APIs pagas diretamente.

## REST licenciado

`LEAD_PROVIDER_URL` é uma base HTTPS. As chamadas usam `Authorization: Bearer LEAD_PROVIDER_KEY` e JSON.

- `POST /businesses/search`: `{ filters, center: { latitude, longitude }, limit: 100 }`.
- `POST /businesses/details`: `{ external_id }`.

Resposta da busca:

```json
{
  "businesses": [
    {
      "external_id": "id-do-provedor",
      "name": "Nome comercial",
      "category": "Clínicas odontológicas",
      "address": "Endereço comercial público",
      "city": "Fortaleza",
      "state": "CE",
      "neighborhood": "Aldeota",
      "postal_code": "60160-230",
      "latitude": -3.735,
      "longitude": -38.507,
      "phone": null,
      "whatsapp": null,
      "website": null,
      "instagram": null,
      "facebook": null,
      "rating": null,
      "reviews_count": null,
      "hours": null,
      "services": [],
      "can_persist": true,
      "can_export": true
    }
  ],
  "partial": false,
  "license": "Identificação do contrato aplicável",
  "warnings": []
}
```

Detalhes retornam um único objeto no mesmo formato. `external_id`, `name`, coordenadas e direitos são obrigatórios. Ausência de website é uma evidência limitada, não prova inexistência. O adapter exige `can_persist: true`; exportação rejeita registros sem `can_export`. O contrato real e os termos da fonte precisam permitir esses usos. O adapter genérico não equivale a uma integração Google Places, que tem suas próprias restrições.

## Auditoria segura

`POST WEBSITE_AUDIT_URL`, com Bearer `WEBSITE_AUDIT_KEY`:

```json
{
  "url": "https://dominio-comercial.com.br",
  "validate_public_dns": true,
  "max_redirects": 4,
  "check_robots": true,
  "max_bytes": 1000000
}
```

Resposta:

```json
{
  "safety": {
    "public_dns_validated": true,
    "redirects_validated": true,
    "robots_checked": true,
    "final_url": "https://dominio-comercial.com.br"
  },
  "http_status": 200,
  "response_ms": 185,
  "checks": [
    {
      "name": "Viewport",
      "status": "pass",
      "detail": "Meta viewport encontrado no HTML analisado."
    },
    {
      "name": "Performance de navegador",
      "status": "unknown",
      "detail": "Não foi executado Lighthouse."
    }
  ]
}
```

`safety` é obrigatório, com as três confirmações verdadeiras e URL final pública; respostas sem atestação são recusadas. O proxy é uma fronteira de confiança e precisa realmente executar essas verificações. Status aceitos: `pass`, `fail`, `unknown`. O serviço deve resolver e validar DNS público antes de cada conexão, bloquear redes privadas/reservadas, revalidar cada redirecionamento, respeitar robots quando aplicável e limitar bytes/tempo. A aplicação bloqueia hosts obviamente inseguros, mas essa política preliminar não substitui a proteção de DNS do proxy. Não há fetch direto de destinos arbitrários. Nunca converta tempo de resposta HTTP em nota Lighthouse. Sem proxy, somente o protocolo declarado é avaliado, sem cobrança de créditos.

## IA

API Gemini `generateContent`, saída JSON validada no servidor. Configure um modelo compatível com sua conta; o modelo não é presumido. Apenas headline, subtitle, about e CTA podem ser editados pela IA. Nome, contato, serviços, equipe e reputação permanecem dados revisados. Instruções proíbem invenção de fatos, mas revisão humana continua necessária. O fluxo local funciona sem IA e o motor fica registrado em cada artefato.

## Scheduler e fila

Um scheduler externo autorizado pode chamar `POST /api/internal/run` com `x-scheduler-secret: SCHEDULER_SECRET` e `Authorization: Bearer` de uma sessão Supabase real do workspace. Ative `SCHEDULER_ENABLED=true` e então ative monitores desejados. Cada chamada processa até três monitores devidos e uma janela limitada da fila. Monitores começam pausados, têm intervalo mínimo de 24 horas e consumo normal de créditos. Sem scheduler, a UI oferece execução manual e não afirma que há rotina rodando.

Deployment Protection pode exigir acesso autorizado ao Preview, além da sessão Supabase e do segredo do scheduler. Não remover essa proteção apenas para facilitar um teste.

## Resiliência e orçamento

Endpoints configurados devem usar HTTPS, sem userinfo, IP reservado ou porta não padrão. Fetch usa redirect manual e rejeita 3xx, evitando encaminhamento de Bearer para outro destino. Timeout: 20s geral, 30s Overpass, 45s Gemini; JSON é limitado a 2 MB e validado por contrato. Erros de transporte/contrato mantêm o lead básico e estornam reservas. Dados parciais preservam avisos e direitos de uso.

Limites adicionais: `GLOBAL_SEARCH_DAILY_LIMIT`, `GLOBAL_AI_DAILY_LIMIT`, `GLOBAL_AUDIT_DAILY_LIMIT`; créditos e rate limit por organização permanecem ativos. O domínio do alvo nunca é requisitado diretamente pelo backend. Cache de geocoding é compartilhado apenas para informações públicas; caches comerciais incluem organização.

Testes locais validam normalização, presença, geografia, contratos e erros. A disponibilidade real do provider e a descoberta através da aplicação devem ser verificadas no futuro Preview Vercel; nenhuma falha real é convertida silenciosamente em fixture.
