// Preencha depois de criar o proxy (Cloudflare) e o projeto Firebase. Veja o README.
// Esses valores não são segredos: a proteção dos dados vem das regras do Firestore.
window.CONFIG = {
  // Endereço do Cloudflare Worker, ex.: "https://saldo-arp.seu-usuario.workers.dev"
  proxyUrl: "https://saldo-arp.samuelcaldasalves.workers.dev",

  // Firebase → Configurações do projeto → Seus apps → App da Web → Configuração do SDK.
  // Deixe apiKey vazio para usar só o modo local (sem login).
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  }
};
