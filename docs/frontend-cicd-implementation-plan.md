# Plano de Implementacao do CI/CD do Frontend

## Objetivo

Este documento detalha como implementar o CI/CD do `frontend` para publicar a storefront Angular SSR no mesmo modelo operacional ja usado pelo `backend`:

- build no GitHub Actions
- deploy por SSH com `rsync`
- instalacao remota com `npm`
- restart via cPanel/Passenger

O frontend sera publicado temporariamente em:

- `https://casadinamo.com.br/store`

No futuro, o mesmo fluxo deve permitir migracao para a raiz:

- `https://casadinamo.com.br/`

## Estado Atual Resumido

### Backend

O `backend` ja possui uma esteira funcional em `.github/workflows/deploy-backend.yml` com este padrao:

1. `checkout`
2. `setup-node`
3. `npm ci`
4. `npm run build`
5. configuracao de SSH
6. `rsync` dos artefatos
7. instalacao remota dentro do `nodevenv`
8. restart da app via `tmp/restart.txt`

Esse modelo ja provou que funciona no cPanel atual.

### Frontend

O `frontend` atual:

- usa Angular com SSR
- gera build com `npm run build:ssr`
- sobe com `node dist/server/main.js`
- consome o backend publicado em `https://casadinamo.com.br/api/shop-api`

Arquivos importantes do frontend:

- `frontend/package.json`
- `frontend/angular.json`
- `frontend/server.ts`
- `frontend/src/environments/environment.prod.ts`

## Arquitetura Proposta de Deploy

### Modelo

O `frontend` nao deve ser tratado como site estatico simples.

Ele deve ser tratado como uma app Node SSR, semelhante ao backend no modelo de publicacao, com as seguintes etapas:

1. build SSR no GitHub Actions
2. envio para o servidor por `rsync`
3. `npm ci --omit=dev` no servidor
4. execucao por app Node no cPanel
5. restart por `tmp/restart.txt`

### URL Temporaria

Enquanto a publicacao ocorrer em `/store`, o frontend precisa ser compilado com:

- `baseHref: "/store/"`

Quando migrar para a raiz, esse valor deve voltar para:

- `baseHref: "/"`

### Recomendacao de Entry Point

Embora o Angular SSR consiga iniciar com:

```bash
node dist/server/main.js
```

recomenda-se criar um wrapper de entrada no estilo do backend, por exemplo:

- `frontend/index.js`

Beneficios:

- melhor compatibilidade com Passenger/cPanel
- ponto de entrada fixo na raiz da app
- logs mais claros de bootstrap
- menor acoplamento com a estrutura interna de `dist`

Esse wrapper deve carregar o bundle SSR e iniciar explicitamente o servidor via export `app()`, porque apenas fazer `require('./dist/server/main.js')` nao garante que o `run()` interno do bundle sera executado quando o arquivo for carregado pelo Passenger.

## Estrutura Esperada do Workflow

### Nome sugerido

Criar:

- `.github/workflows/deploy-frontend.yml`

### Disparo sugerido

Mesmo padrao do backend:

```yml
on:
  push:
    branches: ["master", "main"]
  workflow_dispatch: {}
```

### Concurrency sugerida

```yml
concurrency:
  group: deploy-frontend
  cancel-in-progress: true
```

### Passos sugeridos

1. `actions/checkout@v4`
2. `actions/setup-node@v4`
3. `npm ci`
4. `npm run build:ssr`
5. configurar SSH
6. testar conexao SSH
7. `rsync` dos arquivos para o diretório remoto do frontend
8. ativar `nodevenv` do frontend no cPanel
9. rodar `npm ci --omit=dev --no-audit --no-fund`
10. criar `tmp/restart.txt`

## Arquivos Que Devem Entrar no Deploy

### Minimo esperado

Arquivos e pastas que normalmente precisam subir para o frontend SSR:

- `dist`
- `package.json`
- `package-lock.json`
- `index.js` caso o wrapper seja adotado

### O que nao deve subir

Idealmente nao subir:

- `node_modules`
- `.git`
- `src`
- arquivos de teste
- cache local
- arquivos legados de infraestrutura removidos

## Estrutura Remota Recomendada no cPanel

### App Node separada

O frontend deve ser uma app Node separada da API e do worker.

Conceitualmente teremos:

- app 1: backend API
- app 2: backend worker
- app 3: frontend storefront SSR

### Caminho remoto

Definir um diretório exclusivo, por exemplo:

- `${{ secrets.DEPLOY_PATH_FRONTEND }}`

Configuracao real definida nesta rodada:

```text
/home/dingolan/casadinamo.com.br/frontend
```

Mapeamento atual:

- `Application root`: `casadinamo.com.br/frontend`
- `Application URL`: `casadinamo.com.br/store`
- `Startup file`: `index.js`
- `Passenger log file`: `/home/dingolan/logs/passenger-frontend.log`

### Node version

Padronizar com Node 20, se o ambiente do cPanel ja estiver pronto para isso.

### Nodevenv

Criar ou confirmar um `nodevenv` especifico do frontend, semelhante ao do backend.

Configuracao real esperada:

```text
/home/dingolan/nodevenv/casadinamo.com.br/frontend/20/bin/activate
```

Esse e o caminho que o workflow deve tentar ativar no servidor.

## Variaveis e Segredos Necessarios no GitHub

### Reaproveitaveis

Estes provavelmente podem ser reaproveitados se o mesmo host/usuario/porta forem usados:

- `CPANEL_SSH_HOST`
- `CPANEL_SSH_PORT`
- `CPANEL_SSH_USER`
- `CPANEL_SSH_KEY`

### Novo segredo recomendado

Criar:

- `DEPLOY_PATH_FRONTEND`

Valor esperado nesta configuracao:

- `/home/dingolan/casadinamo.com.br/frontend`

### Possiveis segredos futuros

Se o frontend passar a precisar de variaveis de ambiente em runtime, avaliar segredos adicionais. No estado atual, o principal ajuste esta no build e na app Node do cPanel.

## Ajustes de Codigo Necessarios Antes do Primeiro Deploy

### 1. Ajustar `baseHref`

Em `frontend/angular.json` e em `frontend/src/environments/environment.prod.ts`, a configuracao de producao deve refletir o subpath temporario:

- `baseHref: "/store/"`

Se necessario, tambem validar o comportamento de `deployUrl`. Em muitos cenarios de SSR, apenas o `baseHref` basta, mas isso deve ser testado no primeiro deploy.

### 2. Revisar `environment.prod.ts`

Confirmar se estes valores continuam corretos:

- `apiHost: "https://casadinamo.com.br"`
- `apiPort: "auto"`
- `shopApiPath: "api/shop-api"`

Esses valores parecem coerentes com a publicacao atual do backend.

### 3. Criar wrapper de bootstrap

Recomendado criar:

- `frontend/index.js`

Responsabilidades:

- carregar `dist/server/main.js`
- registrar falhas de bootstrap
- servir como startup file da app no cPanel

### 4. Definir startup file no cPanel

Se o cPanel exigir arquivo de entrada na raiz da app, apontar para:

- `index.js`

Se o ambiente aceitar diretamente o arquivo gerado em `dist/server/main.js`, isso tambem pode funcionar, mas o wrapper segue sendo a opcao mais robusta.

## Esqueleto da Esteira Proposta

Exemplo conceitual do fluxo:

```yml
name: Deploy Frontend (cPanel)

on:
  push:
    branches: ["master", "main"]
  workflow_dispatch: {}

concurrency:
  group: deploy-frontend
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install deps
        run: npm ci

      - name: Build SSR
        run: npm run build:ssr

      - name: Setup SSH
        run: |
          # mesmo padrao usado no backend

      - name: Test SSH connection
        run: |
          # mesmo padrao usado no backend

      - name: Deploy files
        run: |
          # rsync dist package.json package-lock.json index.js

      - name: Install deps + restart
        run: |
          # source nodevenv
          # cd deploy path
          # npm ci --omit=dev --no-audit --no-fund
          # mkdir -p tmp
          # touch tmp/restart.txt
```

Esse bloco e apenas a referencia de implementacao. O arquivo real deve seguir o mesmo padrao de robustez usado no deploy do backend e ativar o `nodevenv` real em `/home/dingolan/nodevenv/casadinamo.com.br/frontend/20/bin/activate`.

## Testes e Validacoes

### Testes locais antes de subir a esteira

Antes de criar a pipeline final, validar localmente:

1. `npm ci`
2. `npm run build:ssr`
3. `node dist/server/main.js`
4. abrir localmente a app renderizada

### Validacoes funcionais locais

Verificar:

- homepage abre
- navegacao entre rotas funciona
- assets carregam corretamente
- requests para `shop-api` funcionam
- pagina de produto funciona
- carrinho funciona
- login de cliente continua funcional

### Validacoes especificas do subpath `/store`

Este e o ponto mais importante da primeira rodada.

Validar:

- `https://casadinamo.com.br/store`
- `https://casadinamo.com.br/store/`
- rotas internas dentro de `/store/...`
- carregamento de CSS, JS e imagens sem apontar para `/` por engano
- HTML SSR contendo referencias corretas ao subpath

### Validacoes apos deploy

Conferir em producao:

1. a app responde sem erro 500
2. o HTML inicial vem do SSR
3. assets estaticos carregam
4. chamadas ao backend funcionam
5. nao ha conflito com `/api`
6. recarregar rotas internas continua funcionando

## Passos Manuais Necessarios

## 1. GitHub

Voce precisa criar ou conferir manualmente:

- `CPANEL_SSH_HOST`
- `CPANEL_SSH_PORT`
- `CPANEL_SSH_USER`
- `CPANEL_SSH_KEY`
- `DEPLOY_PATH_FRONTEND` com valor `/home/dingolan/casadinamo.com.br/frontend`

Tambem precisa conferir:

- se o repositório usa `main`, `master` ou ambos
- se a Actions esta habilitada
- se os secrets estao no repo correto

## 2. cPanel

Voce precisa fazer ou conferir manualmente:

- criar a app Node do frontend
- definir a versao Node da app
- definir o Application Root como `casadinamo.com.br/frontend`
- definir o Application URL como `casadinamo.com.br/store`
- confirmar o Startup File como `index.js`
- criar ou validar o `nodevenv`
- confirmar permissoes de escrita no diretório de deploy
- confirmar que `tmp/restart.txt` aciona restart da app

### Itens a confirmar no cPanel

Checklist:

- o dominio `casadinamo.com.br` aceita app Node em subpath
- `/store` nao conflita com regra ja existente
- a app frontend consegue escutar a porta injetada pelo ambiente
- o Passenger encaminha corretamente as rotas SSR
- o `nodevenv` do frontend existe e ativa com sucesso

## Riscos e Cuidados

### 1. Subpath `/store`

O maior risco funcional da primeira entrega e o subpath:

- links absolutos
- assets
- hydration
- rotas com refresh

### 2. Diferenca entre build e runtime

O frontend SSR compila em CI, mas executa em outro ambiente. Por isso, precisamos garantir:

- mesma major version do Node
- dependencias de producao instaladas com sucesso
- startup file correto

### 3. Compatibilidade com cPanel

Dependendo da configuracao do painel, pode ser necessario adaptar:

- startup file
- app root
- regra de URL
- permissao do diretório `tmp`

## Ordem Recomendada de Implementacao

1. ajustar `angular.json` para `/store/`
2. criar `frontend/index.js`
3. criar `.github/workflows/deploy-frontend.yml`
4. cadastrar `DEPLOY_PATH_FRONTEND`
5. criar e validar a app Node do frontend no cPanel
6. executar deploy manual via workflow dispatch
7. validar `/store`
8. corrigir eventuais problemas de subpath
9. so depois considerar migracao da storefront para a raiz

## Criterios de Conclusao

Considerar a implementacao concluida quando:

- o workflow do frontend roda do inicio ao fim sem erro
- o cPanel reinstala dependencias e reinicia a app
- `https://casadinamo.com.br/store` abre corretamente
- as rotas internas funcionam com refresh
- a storefront consome o backend em producao sem erro
- o fluxo fica documentado para manutencao futura

## Resumo Executivo

O CI/CD do frontend e viavel com o mesmo modelo do backend.

A principal diferenca e que o frontend e uma app Angular SSR, portanto:

- precisa de `build:ssr`
- precisa subir como app Node
- precisa de cuidado especial com `baseHref` em `/store`

O que e automatico via esteira:

- build
- upload
- install remoto
- restart

O que continua manual:

- secrets no GitHub
- criacao/configuracao da app no cPanel
- definicao de path remoto
- validacao funcional inicial do subpath `/store`
