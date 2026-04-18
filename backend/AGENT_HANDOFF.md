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

### O que foi corrigido nas rodadas locais mais recentes

- A configuracao do Admin UI agora usa `apiHost: 'auto'`.
- O `adminApiPath` do Admin UI agora passa a ser `api/admin-api` quando o backend estiver sob `/api`.
- O `HealthCheckService` do bundle do Vendure foi corrigido para usar `/api/admin/health` em vez de `/health`.
- O `base href` servido pelo Admin UI ficou em `/api/admin/`.
- O erro local `ReferenceError: adminApiPath is not defined` foi corrigido no patch do Vendure.
- O erro local anterior `ReferenceError: Cannot access 'withBasePath' before initialization` tambem foi corrigido.
- O SQLite local foi restaurado a partir do backup em `bk-vendure`.
- O schema antigo do SQLite restaurado foi completado localmente para recriar a tabela `asset_translation` sem apagar os dados existentes.
- O arquivo original da marca d'agua foi restaurado em `src/plugins/images/watermark.png`.
- O plugin da marca d'agua passou a localizar o PNG em `src` e em `dist/src`.
- O build passou a copiar `src/plugins/images` para `dist/src/plugins/images`.
- O workflow de deploy foi ajustado localmente para remover apenas `better-sqlite3` no remoto antes do `npm ci`, evitando quebrar o cPanel sem reabrir o problema do `sharp`.

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
- `http://localhost:3050/api/admin/catalog/assets` responde `200`.
- O local voltou a carregar sem o erro `no such table: asset_translation`.
- O `shop-api` local voltou a responder com `54` produtos depois da restauracao do SQLite.
- O dashboard local carregou sem erro de console e sem quebrar o healthcheck.
- O backend local esta pronto para testar upload de imagem com marca d'agua.

### Divergencia conhecida entre local e producao

- Local e producao nao estao com o mesmo estado de dados.
- O `shop-api` local respondeu com `54` produtos.
- O `shop-api` publico respondeu com `0` produtos.
- Apos essa confirmacao, nenhuma nova alteracao foi aplicada em producao nesta rodada.

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
- Plugin de marca d'agua:
  - [image-watermark.plugin.js](file:///e:/venture-casadinamo/backend/src/plugins/image-watermark.plugin.js)
- Asset da marca d'agua:
  - `backend/src/plugins/images/watermark.png`

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

### 9. SQLite local restaurado com schema completado

O backup local em `bk-vendure` continha os dados do SQLite, mas nao continha o schema completo esperado pela versao atual do Vendure.

Sintoma observado:

- `no such table: asset_translation`

Correcao aplicada:

- restauracao do `vendure.sqlite` a partir do backup local
- restauracao dos `static/assets` locais
- sincronizacao local controlada por ambiente para completar o schema sem apagar os dados restaurados

Resultado:

- o local voltou a subir
- a tela de imagens deixou de quebrar por falta da tabela `asset_translation`
- os dados principais do SQLite local voltaram

### 10. Marca d'agua restaurada

O plugin de marca d'agua dependia de um PNG fora do Git e o arquivo havia sumido do workspace.

Arquivo restaurado:

- `backend/src/plugins/images/watermark.png`

Origem usada na restauracao:

- `backend_deploy/watermark.png`

Correcao aplicada no plugin:

- resolucao do `watermark.png` por caminhos candidatos em `src` e `dist/src`

Correcao aplicada no build:

- copia da pasta `src/plugins/images` para `dist/src/plugins/images`

## Ajustes locais aplicados nesta rodada

### `src/vendure-config.backup.js`

Mudancas principais:

- `withBasePath` passou a ser declarado antes do uso
- `adminUiApiHost` passou para `'auto'`
- `adminUiAdminApiPath` passou a usar `withBasePath('admin-api')`
- `sqliteDbExists` passou a ser registrado no debug de configuracao
- `shouldSynchronizeSqlite` passou a poder ser ativado por `SQLITE_SYNCHRONIZE=true`

### `src/vendure-config.ts`

Mudancas principais:

- `adminUiApiHost` passou para `'auto'`
- `adminUiAdminApiPath` passou a usar `withBasePath('admin-api')`

### `patch-vendure-ui.js`

Mudancas principais:

- patch do `vendure-admin-ui-core.mjs`
- correcao idempotente para substituir tanto a versao original quanto a versao quebrada do patch anterior
- preservacao dos patches existentes de locale e coluna de shipping

### `src/plugins/image-watermark.plugin.js`

Mudancas principais:

- restauracao da procura do `watermark.png`
- busca por caminhos robustos em `src/plugins/images` e `dist/src/plugins/images`
- preservacao do comportamento de aplicar overlays em mosaico

### `package.json`

Mudancas principais:

- o script `build` agora copia `src/plugins/images` para `dist/src/plugins/images`

### `.github/workflows/deploy-backend.yml`

Mudancas principais:

- o install remoto foi ajustado localmente para remover apenas `better-sqlite3` do `package.json` e `package-lock.json` no servidor antes do `npm ci`
- isso evita recompilacao do SQLite no cPanel
- isso preserva a instalacao de `sharp`
- este ajuste ainda precisa ser enviado para o remoto

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

### Servidor local compilado com sincronizacao pontual do SQLite

Usar apenas quando um backup antigo do `vendure.sqlite` vier com schema incompleto:

```bash
cd backend
$env:PORT=3050
$env:SQLITE_SYNCHRONIZE='true'
node dist/index.js
```

### URLs locais esperadas

- `http://localhost:3050/api/admin/`
- `http://localhost:3050/api/admin/login`
- `http://localhost:3050/api/admin/health?languageCode=pt_BR`
- `http://localhost:3050/api/admin/vendure-ui-config.json`
- `http://localhost:3050/api/admin-api`
- `http://localhost:3050/api/admin/catalog/assets`

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

### 5. Confirmar estado real dos dados

Comparar rapidamente:

- `https://casadinamo.com.br/api/shop-api`
- `http://localhost:3050/api/shop-api`

Observacao:

- no estado mais recente observado, producao respondeu `0` produtos e o local respondeu `54`

## Commits importantes recentes

- `a5c3812` - `Fix admin UI health route under /api`
  - ajusta `vendure-config.backup.js`
  - ajusta `vendure-config.ts`
  - adiciona patch do `HealthCheckService` em `patch-vendure-ui.js`

Observacao:

- houve varios commits anteriores durante a fase de correcao de deploy, banco e Admin UI
- este commit acima concentra a correcao final local para `/api/admin/health`
- as correcoes mais recentes de SQLite local, workflow remoto para ignorar `better-sqlite3` e restauracao da marca d'agua ainda estavam locais no momento desta atualizacao do handoff

## Segredos e cuidados

- Nao colocar segredos neste arquivo.
- Nao colocar conteudo do `.env` neste arquivo.
- Os pontos sensiveis continuam sendo:
  - `backend/.env`
  - `backend-worker/.env`
  - GitHub Secrets do deploy

## Proximo passo imediato

O proximo passo, a partir deste estado, e:

1. validar localmente um upload real de imagem com a marca d'agua restaurada
2. revisar se o efeito visual da marca d'agua esta correto
3. decidir quando enviar o ajuste do workflow que ignora apenas `better-sqlite3` no cPanel
4. depois do push, validar `https://casadinamo.com.br/api/admin`
5. validar `https://casadinamo.com.br/api/admin/health?languageCode=pt_BR`
6. confirmar por que a producao esta com `0` produtos apesar de o local restaurado ter `54`
