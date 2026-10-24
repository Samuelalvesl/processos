// Cloudflare Worker (plano gratuito): repassa ao Compras.gov.br as consultas do módulo ARP,
// que a API não aceita receber direto do navegador (CORS).
// Variável opcional ALLOWED_ORIGINS: lista separada por vírgula, ex.: "https://seu-usuario.github.io".
const UPSTREAM = "https://dadosabertos.compras.gov.br";
const CACHE_SEGUNDOS = 60; // saldos quase em tempo real, sem sobrecarregar a API

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const permitidas = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const liberada = permitidas.length === 0 || permitidas.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": liberada ? (origin || "*") : "null",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin"
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return new Response("Método não permitido", { status: 405, headers: cors });
    if (!liberada) return new Response("Origem não autorizada", { status: 403, headers: cors });

    const url = new URL(req.url);
    if (!/^\/modulo-arp\/[\w.]+$/.test(url.pathname)) return new Response("Rota não permitida", { status: 404, headers: cors });

    const resp = await fetch(UPSTREAM + url.pathname + url.search, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: CACHE_SEGUNDOS, cacheEverything: true }
    });
    return new Response(await resp.text(), {
      status: resp.status,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SEGUNDOS}` }
    });
  }
};
