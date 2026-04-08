# Contexto e recuperação do projeto (Git/Vendure)

## Resumo
Este arquivo registra o que aconteceu com o repositório local, por que parte do trabalho não apareceu no GitHub, quais ações foram feitas para recuperar o máximo possível, e quais são os próximos passos para estabilizar o deploy no cPanel.

## O que aconteceu (linha do tempo)

### 1) Dúvida inicial: “subir só dist”
- Foi validado que subir apenas `backend/dist` não é suficiente porque o runtime precisa de `node_modules`, `.env`, `static/` e (no caso de SQLite) o arquivo do banco e paths fora do `dist`.

### 2) CI/CD no cPanel
- Foi criado um workflow de deploy para cPanel via SSH + rsync: [.github/workflows/deploy-backend.yml](file:///e:/venture-casadinamo/.github/workflows/deploy-backend.yml).
- Como o cPanel tem Node.js App, o objetivo é:
  - App “API”: startup `dist/index.js` e URL `/api`.
  - App “Worker”: startup `dist/index-worker.js` em outro root e URL não conflitante (ideal `/__worker` ou subdomínio).

### 3) SSH: Cloudflare e erro “Corrupted MAC”
- O domínio `dingolandia.com` está atrás de Cloudflare, então SSH por `dingolandia.com` não funciona. O correto é usar o host/IP do servidor (`az1-ss103.a2hosting.com` / `68.66.226.123`).
- Houve erro `Corrupted MAC on input` e a conexão estabilizou forçando:
  - `MACs=hmac-sha2-256`
  - `Ciphers=aes256-ctr`
- Isso foi incorporado no workflow para evitar falhas no GitHub Actions.

### 4) Chave com passphrase x CI
- A chave antiga `cpanel_id_rsa` exigia passphrase. Para CI/CD (não-interativo) isso falha.
- Foi gerada uma chave de deploy sem passphrase (`deploy_backend`) e testado com `BatchMode=yes` com sucesso.
- A pasta `ssh/` foi adicionada ao `.gitignore` para evitar subir chaves.

### 5) Push falhando (permissão/autenticação)
- O push inicial falhou por credenciais/permitẽncias no Git.
- Foi feito push com sucesso usando um PAT.
- Importante: o PAT acabou aparecendo no chat/histórico, então ele deve ser tratado como comprometido (revogar e emitir outro).

### 6) “Perdi minhas modificações locais”
- O GitHub mostrava apenas commits antigos (7 meses) em `master` e em `ajustes-visuais`.
- O repositório local passou por operações que podem apagar arquivos não versionados e/ou perder histórico local (ex.: clean/reset e reinit), então o que não estava em Git não aparecia mais.

### 7) Descoberta do backup `bk-vendure` e recuperação
- Foi encontrado o diretório `e:\venture-casadinamo\bk-vendure` com artefatos do projeto.
- Backend: o backup tinha principalmente código compilado em `backend/dist` contendo:
  - plugins PagSeguro (API/Payment/Webhook)
  - Melhor Envio (calculator/provision)
  - watermark (sharp)
  - shipping toggle + scripts + migrations
- Frontend: os templates do backup estavam equivalentes ao `frontend/src` atual (hashes iguais no que foi comparado).
- O backend custom foi restaurado para o repositório e subido no GitHub (commit no `master` com os plugins/migrations/scripts).

## O que já foi feito no repositório para corrigir

### Backend
- Restaurado:
  - `backend/src/plugins/*`
  - `backend/src/migrations/*`
  - `backend/src/scripts/*`
  - `backend/src/vendure-config.js` (config completo recuperado)
- Atualizado `backend/package.json` para refletir dependências requeridas pelos plugins (Vendure 3.5.5, `express`, `sharp`).
- Ajustado `backend/tsconfig.json`:
  - `allowJs: true` para permitir manter código recuperado em JS
  - `exclude: ["dist"]` para evitar o TS incluir `dist` como input
  - exclusão do `admin-ui` dos plugins (não compilar os arquivos do Admin UI)

### Correção do erro “Cannot read properties of undefined (reading 'plugins')”
- Causa: `dist/vendure-config.js` estava importando `./vendure-config.js`, gerando auto-import/ciclo e deixando `config` indefinido.
- Correção:
  - `backend/src/vendure-config.ts` passou a importar de `./vendure-config.backup.js`
  - Foi criado `backend/src/vendure-config.backup.js` com o config completo

### .gitignore
- Adicionado ignore para:
  - `ssh/` (chaves locais)
  - `bk-vendure/` (backup local)
  - `backend/log-melhorenvio/` (logs)
  - outputs locais (SQLite, caches etc.)

## Situação atual (o que esperar ao rodar)
- O backend sobe e registra as rotas (ex.: PagSeguro proxy montado).
- Pode aparecer aviso de “schema does not match your current configuration” (TypeORM/Vendure) indicando que o SQLite local não está migrado para a versão/config atual.

## Próximos passos

### 1) Segurança
- Revogar o PAT que foi usado e gerar um novo (ele foi exposto em histórico/chat).
- Conferir se o GitHub Actions Secrets e o cPanel não contêm tokens/chaves desnecessárias.

### 2) Banco de dados / migrations (local e produção)
- Se o banco for SQLite e já existe `vendure.sqlite` antigo, será necessário:
  - rodar as migrations existentes e, se necessário, gerar uma nova migration para os diffs reportados.
- Em produção, evitar `synchronize: true`. Manter migrations versionadas.

### 3) Worker no cPanel
- Garantir que o worker não “rouba” a raiz do domínio:
  - App do worker deve ter URI dedicada (ex.: `/__worker`) ou subdomínio.

### 4) Validar CI/CD
- Confirmar no GitHub Actions o run do workflow “Deploy Backend (cPanel)” no último commit do `master`.
- Verificar no cPanel se:
  - API app inicia com `dist/index.js`
  - Worker app inicia com `dist/index-worker.js`
  - env vars estão configuradas (SUPERADMIN_*, COOKIE_SECRET, chaves PagSeguro, Melhor Envio etc.)

### 5) Evolução do código recuperado
- O backend foi recuperado majoritariamente em JS. Próximo passo opcional:
  - converter plugins/migrations/scripts para TypeScript novamente e ajustar imports/tipos gradualmente.
