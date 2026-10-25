# Gerador de Contratações

Gera o **DFD**, o **ETP** e o **Termo de Referência** (.docx) para dispensa eletrônica, pregão eletrônico e adesão a ata de registro de preços, pela Lei nº 14.133/2021.

Tudo roda em serviços gratuitos, sem cartão de crédito:

| Parte | Serviço | Para quê |
|---|---|---|
| Site | GitHub Pages | Hospeda as páginas |
| Banco de dados | Firebase (plano Spark) | Login com Google e processos salvos na nuvem |

Sem o Firebase, o sistema funciona em modo local: os dados ficam só no navegador.

## Estrutura

```
index.html             página principal
css/app.css            aparência
js/config.js           configuração do Firebase
js/app.js              gerador dos documentos
js/nuvem.js            login e processos no Firebase
img/brasao.png         brasão usado nos documentos
firestore.rules        regras de segurança do Firestore
ferramentas/servidor-local.ps1   teste no seu computador
```

## 1. Publicar no GitHub Pages

1. Crie um repositório **público** no GitHub (no plano gratuito, o Pages exige repositório público).
2. Envie todos os arquivos desta pasta para o repositório.
3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`. Salve.
4. Em um ou dois minutos, o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## 2. Configurar o Firebase (opcional, para salvar na nuvem)

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

Abra <http://localhost:8765>. O login do Firebase funciona localmente porque `localhost` já vem nos domínios autorizados.

## Adesão: limite de 50%

Em cada item, informe o número do item na ata e a quantidade registrada. O sistema avisa quando a quantidade pedida passa de 50% do registrado (art. 86, § 4º). O saldo para adesões deve ser confirmado com o órgão gerenciador.

## Limite da dispensa

O limite do art. 75, II, está em `js/app.js` (`LIMITE_DISPENSA`), com o valor de 2026 (R$ 65.492,11, Decreto nº 12.807/2025). Atualize quando sair o decreto de reajuste.
