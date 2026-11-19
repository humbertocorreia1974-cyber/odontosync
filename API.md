# API do OdontoSync (JGNEXT API v1)

Sua aplicação expõe uma API REST para você (ou o seu sistema) integrar.

## Autenticação
Header `x-api-key: SUA_CHAVE` em toda requisição.
As chaves ficam na variável de ambiente `APP_API_KEYS` (separadas por vírgula).
Peça/gere chaves no painel da JGNEXT.

## Endpoints

```
GET  /api/v1/{recurso}?limit=50&offset=0   → lista paginada
GET  /api/v1/{recurso}?id={id}             → um registro
```

### Recursos disponíveis
- `user`
- `project`
- `clinic`
- `unit`
- `patient`
- `dentist`
- `chair`
- `appointment`
- `procedure`
- `insurance`
- `insurance-price-table`
- `insurance-guide`
- `treatment-plan`
- `treatment-plan-stage`
- `treatment-plan-signature`
- `tooth-record`
- `clinical-evolution`
- `attachment`
- `inventory-item`
- `inventory-movement`
- `procedure-bom`
- `commission-rule`
- `commission`
- `transaction`
- `notification`
- `audit-log`
- `plan`
- `subscription`
- `pause-record`
- `payment`
- `address`
- `shipment`

### Exemplo
```bash
curl -H "x-api-key: SUA_CHAVE" "https://SEU-APP/api/v1/user?limit=10"
```

## Escrita (POST / PATCH / DELETE)
Disponível — **desativada por padrão**. Ative com `APP_API_WRITE=true` no ambiente.

```
POST   /api/v1/{recurso}            body JSON  → cria (201)
PATCH  /api/v1/{recurso}?id={id}    body JSON  → atualiza
DELETE /api/v1/{recurso}?id={id}               → remove
```

Sempre com `x-api-key`. Comece só com leitura; ligue a escrita quando o seu
integrador estiver pronto.
