# Handoff Backend Vendure, cPanel e CI/CD

## Objetivo

Este arquivo resume o estado real mais recente do backend Vendure publicado em cPanel/Passenger, evitando retrabalho em deploy, bootstrap e Admin UI.

O backend atende:

- `https://casadinamo.com.br/api`
- `https://casadinamo.com.br/api/admin`
- `https://casadinamo.com.br/backend-worker`

## Estado Atual

### O que ja foi corrigido

- CI/CD via GitHub Actions esta funcional.
- SSH do deploy esta funcional.
- `rsync` do deploy esta funcional.
- `nodevenv` do cPanel com Node 20 esta funcional.
- `sharp` em producao foi corrigido removendo `--omit=optional` do install remoto.
- O backend em producao ja deixou de cair por falta de `@vendure/ui-devkit/compiler`.
- O `.env` passou a ser resolvido corretamente tanto em runtime compilado quanto em ambiente local.
- O backend passou a usar PostgreSQL em producao.
- As tabelas do PostgreSQL foram criadas.
- O bootstrap do backend em producao ja chegou a subir e o Admin UI passou a abrir.
- O problema restante deixou de ser Passenger/bootstrap puro e passou a ser roteamento/configuracao do Admin UI.

### O que foi corrigido nesta rodada local

- A configuracao do Admin UI agora usa `apiHost: 'auto'`.
- O `adminApiPath` do Admin UI agora passa a ser `api/admin-api` quando o backend estiver sob `/api`.
- O `HealthCheckService` do bundle do Vendure foi corrigido para usar `/api/admin/health` em vez de `/health`.
- O `base href` servido pelo Admin UI ficou em `/api/admin/`.
- O erro local `ReferenceError: adminApiPath is not defined` foi corrigido no patch do Vendure.
- O erro local anterior `ReferenceError: Cannot access 'withBasePath' before initialization` tambem foi corrigido.

### Status local no momento deste handoff

Validado com o servidor local em `PORT=3050`:

- `http://localhost:3050/api/admin/` abre corretamente.
- `http://localhost:3050/api/admin/login` responde `200`.
- `http://localhost:3050/api/admin-api` responde `200`.
- `http://localhost:3050/api/admin/health?languageCode=pt_BR` responde `{"status":"ok"}`.
- `http://localhost:3050/api/admin/vendure-ui-config.json` serve:
  - `apiHost: "auto"`
  - `apiPort: "auto"`
  - `adminApiPath: "api/admin-api"`
- O dashboard local carregou sem erro de console e sem quebrar o healthcheck.

## Arquivos mais importantes

- Workflow de deploy:
  - [deploy-backend.yml](file:///e:/venture-casadinamo/.github/workflows/deploy-backend.yml)
- Config principal do Vendure:
  - [vendure-config.backup.js](file:///e:/venture-casadinamo/backend/src/vendure-config.backup.js)
  - [vendure-config.ts](file:///e:/venture-casadinamo/backend/src/vendure-config.ts)
- Patch aplicado no Admin UI do Vendure:
  - [patch-vendure-ui.js](file:///e:/venture-casadinamo/backend/patch-vendure-ui.js)
- Entradas do backend:
  - [index.ts](file:///e:/venture-casadinamo/backend/src/index.ts)
  - [index-worker.ts](file:///e:/venture-casadinamo/backend/src/index-worker.ts)
- Wrappers do cPanel:
  - [index.js](file:///e:/venture-casadinamo/backend/index.js)
  - [index-worker.js](file:///e:/venture-casadinamo/backend/index-worker.js)
- Scripts do backend:
  - [package.json](file:///e:/venture-casadinamo/backend/package.json)

## Correcoes que deram certo

### 1. Build do Admin UI fora do runtime do Passenger

Antes, o runtime em producao tentava compilar o Admin UI usando `@vendure/ui-devkit/compiler`, mas o deploy remoto fazia install sem dependencias de desenvolvimento.

Foi corrigido com:

- script de build dedicado do Admin UI
- uso do bundle compilado em runtime
- ajuste da configuracao do `AdminUiPlugin`

### 2. `sharp` em producao

O deploy remoto usava `npm ci --omit=dev --omit=optional`, o que quebrava `sharp`.

Foi corrigido removendo `--omit=optional` no fluxo remoto.

### 3. `.env` correto em runtime compilado

O build em `dist` fazia o backend procurar o `.env` no lugar errado.

Foi corrigido com busca explicita por:

- `../.env`
- `../../.env`

### 4. Logs de bootstrap

Foram adicionados logs de bootstrap para enxergar melhor falhas do backend e worker.

Arquivos relevantes:

- `tmp/bootstrap-config.log`
- `tmp/bootstrap-server.log`
- `tmp/bootstrap-worker.log`

### 5. PostgreSQL em producao

O backend passou a respeitar:

- `DB_TYPE=postgres`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SSL`

O Postgres passou a ser o caminho de producao, enquanto o SQLite segue como fallback local.

### 6. Paths de runtime

Foi corrigida a resolucao de paths para ambiente compilado:

- assets
- templates de email
- mailbox
- SQLite local
- bundle compilado do Admin UI

### 7. Base path `/api`

Foi corrigida a aplicacao do base path para:

- Admin API
- Shop API
- assets
- mailbox
- rota do Admin UI

### 8. Healthcheck do dashboard

O problema final estava no bundle do Admin UI do Vendure:

- o `HealthCheckService` construia `getServerLocation() + '/health'`
- isso ignorava o fato de o projeto estar publicado sob `/api`

Foi corrigido em [patch-vendure-ui.js](file:///e:/venture-casadinamo/backend/patch-vendure-ui.js) para:

- manter `/health` no caso padrao
- transformar `adminApiPath` com base path em `/api/admin/health`

## Ajustes locais aplicados nesta rodada

### `src/vendure-config.backup.js`

Mudancas principais:

- `withBasePath` passou a ser declarado antes do uso
- `adminUiApiHost` passou para `'auto'`
- `adminUiAdminApiPath` passou a usar `withBasePath('admin-api')`

### `src/vendure-config.ts`

Mudancas principais:

- `adminUiApiHost` passou para `'auto'`
- `adminUiAdminApiPath` passou a usar `withBasePath('admin-api')`

### `patch-vendure-ui.js`

Mudancas principais:

- patch do `vendure-admin-ui-core.mjs`
- correcao idempotente para substituir tanto a versao original quanto a versao quebrada do patch anterior
- preservacao dos patches existentes de locale e coluna de shipping

## Como validar localmente

### Build

```bash
cd backend
npm run build
```

### Servidor local compilado

```bash
cd backend
$env:PORT=3050
node dist/index.js
```

### URLs locais esperadas

- `http://localhost:3050/api/admin/`
- `http://localhost:3050/api/admin/login`
- `http://localhost:3050/api/admin/health?languageCode=pt_BR`
- `http://localhost:3050/api/admin/vendure-ui-config.json`
- `http://localhost:3050/api/admin-api`

## Como validar em producao apos a esteira

### 1. Confirmar que o deploy terminou

O workflow esperado continua sendo:

1. checkout
2. setup-node
3. `npm ci`
4. `npm run build`
5. `Setup SSH`
6. `Test SSH connection`
7. `Deploy to API app`
8. `Install deps + restart API`
9. `Deploy to Worker app`
10. `Install deps + restart Worker`

### 2. Verificar URLs publicas

Abrir:

- `https://casadinamo.com.br/api/admin`
- `https://casadinamo.com.br/api/admin/health?languageCode=pt_BR`

### 3. Confirmar config servida

Verificar:

- `https://casadinamo.com.br/api/admin/vendure-ui-config.json`

Esperado:

- `apiHost: "auto"`
- `apiPort: "auto"`
- `adminApiPath: "api/admin-api"`

### 4. Confirmar Admin API publica

Validar que a API continua acessivel em:

- `https://casadinamo.com.br/api/admin-api`

## Commits importantes recentes

- `a5c3812` - `Fix admin UI health route under /api`
  - ajusta `vendure-config.backup.js`
  - ajusta `vendure-config.ts`
  - adiciona patch do `HealthCheckService` em `patch-vendure-ui.js`

Observacao:

- houve varios commits anteriores durante a fase de correcao de deploy, banco e Admin UI
- este commit acima concentra a correcao final local para `/api/admin/health`

## Segredos e cuidados

- Nao colocar segredos neste arquivo.
- Nao colocar conteudo do `.env` neste arquivo.
- Os pontos sensiveis continuam sendo:
  - `backend/.env`
  - `backend-worker/.env`
  - GitHub Secrets do deploy

## Proximo passo imediato

O proximo passo, a partir deste estado, e:

1. fazer push no `master`
2. aguardar a esteira terminar
3. validar `https://casadinamo.com.br/api/admin`
4. validar `https://casadinamo.com.br/api/admin/health?languageCode=pt_BR`
5. confirmar se o comportamento em producao bate com o validado localmente
