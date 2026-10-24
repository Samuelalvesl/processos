# Gerador de Contratações

Gera o **DFD**, o **ETP** e o **Termo de Referência** (.docx) para dispensa eletrônica, pregão eletrônico e adesão a ata de registro de preços, pela Lei nº 14.133/2021. Na adesão, busca a ata no Compras.gov.br e confere o **saldo disponível para adesão** de cada item, em tempo real.

Tudo roda em serviços gratuitos, sem cartão de crédito:

| Parte | Serviço | Para quê |
|---|---|---|
| Site | GitHub Pages | Hospeda as páginas |
| Consulta de saldos | Cloudflare Workers | Repassa as consultas ao Compras.gov.br, que bloqueia chamadas feitas direto pelo navegador |
| Banco de dados | Firebase (plano Spark) | Login com Google e processos salvos na nuvem |

Sem o Worker, a busca de ata não funciona (o resto funciona). Sem o Firebase, o sistema funciona em modo local: os dados ficam só no navegador.

## Estrutura

```
index.html             página principal
css/app.css            aparência
js/config.js           endereços do proxy e do Firebase (você preenche)
js/app.js              gerador dos documentos
js/arp.js              busca de ata e cálculo do saldo de adesão
js/nuvem.js            login e processos no Firebase
img/brasao.png         brasão usado nos documentos
proxy/worker.js        código do Cloudflare Worker
firestore.rules        regras de segurança do Firestore
ferramentas/servidor-local.ps1   teste no seu computador
```

## 1. Publicar no GitHub Pages

1. Crie um repositório **público** no GitHub (no plano gratuito, o Pages exige repositório público). Exemplo: `gerador-contratacoes`.
2. Envie todos os arquivos desta pasta para o repositório.
3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`. Salve.
4. Em um ou dois minutos, o site fica em `https://SEU-USUARIO.github.io/gerador-contratacoes/`.

## 2. Criar o proxy de saldos (Cloudflare Workers)

1. Crie uma conta gratuita em <https://dash.cloudflare.com>.
2. Vá em **Workers & Pages → Create → Create Worker**, dê o nome `saldo-arp` e clique em **Deploy**.
3. Clique em **Edit code**, apague o conteúdo, cole o arquivo `proxy/worker.js` e clique em **Deploy**.
4. Em **Settings → Variables and Secrets**, crie a variável `ALLOWED_ORIGINS` com o valor `https://SEU-USUARIO.github.io`. Isso impede que outros sites usem o seu proxy.
5. Copie o endereço do Worker (ex.: `https://saldo-arp.SEU-USUARIO.workers.dev`) e cole em `proxyUrl` no `js/config.js`.

O plano gratuito permite 100 mil consultas por dia. As respostas ficam em cache por 60 segundos, então os saldos estão sempre, no máximo, um minuto atrasados.

## 3. Configurar o Firebase (opcional, para salvar na nuvem)

1. Em <https://console.firebase.google.com>, crie um projeto. Não precisa ativar o Google Analytics.
2. **Build → Authentication → Get started → Sign-in method → Google → Ativar**.
3. Em **Authentication → Settings → Authorized domains**, adicione `SEU-USUARIO.github.io`.
4. **Build → Firestore Database → Create database**, local `southamerica-east1` (São Paulo), modo de produção.
5. Na aba **Rules** do Firestore, cole o conteúdo de `firestore.rules` e clique em **Publish**. Com essas regras, cada pessoa só enxerga os próprios processos.
6. Em **Configurações do projeto → Seus apps**, clique em **</>** (Web), registre o app e copie `apiKey`, `authDomain`, `projectId` e `appId` para o `js/config.js`.
7. Envie o `js/config.js` atualizado ao GitHub.

O `apiKey` do Firebase não é segredo: quem protege os dados são as regras do Firestore. O plano Spark é gratuito e suporta, por dia, 50 mil leituras e 20 mil gravações.

## Testar no seu computador

No PowerShell, dentro da pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\servidor-local.ps1
```

Abra <http://localhost:8765>. O servidor local também repassa as consultas ao Compras.gov.br, então a busca de ata funciona sem o Worker (deixe `proxyUrl` vazio). O login do Firebase só funciona localmente se `localhost` estiver nos domínios autorizados, o que já vem por padrão.

## Como o saldo de adesão é calculado

A consulta usa a API de Dados Abertos do Compras.gov.br (módulo ARP):

1. `2_consultarARPItem`: itens do pregão na UASG gerenciadora, com descrição, CATMAT, fornecedor e preço registrado.
2. `3_consultarUnidadesItem`: para cada item, a quantidade registrada, o **saldo para adesões** e se o gerenciador aceita adesão.
3. `5_consultarAdesoesItem`: se a UASG do seu órgão estiver preenchida em "Dados do órgão", soma o que ela já aderiu ao item.

**Disponível para você** = o menor valor entre o saldo para adesões (limite global, art. 86, § 5º) e 50% da quantidade registrada menos o que você já aderiu (limite por órgão, art. 86, § 4º).

Os números vêm do Compras.gov.br e podem ter atraso em relação ao sistema do gerenciador. A confirmação final é a anuência do órgão gerenciador.

## Limite da dispensa

O limite do art. 75, II, está em `js/app.js` (`LIMITE_DISPENSA`), com o valor de 2026 (R$ 65.492,11, Decreto nº 12.807/2025). Atualize quando sair o decreto de reajuste.
