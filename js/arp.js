// Consulta de atas de registro de preços na API de Dados Abertos do Compras.gov.br
// (módulo ARP), sempre por meio do proxy configurado em CONFIG.proxyUrl, porque a
// API recusa chamadas feitas diretamente pelo navegador (CORS).
(() => {
  const $ = s => document.querySelector(s);
  const { brl, fmtQtd, esc } = App;
  let encontrados = []; // itens da ata exibidos na tabela de importação

  const pad5 = v => String(v).trim().padStart(5, "0");
  function numAno(v) {
    const m = String(v || "").match(/^\s*(\d+)\s*\/\s*(\d{4})\s*$/);
    return m ? { num: pad5(m[1]), ano: m[2] } : null;
  }
  function apiUrl(path, params) {
    const base = ((window.CONFIG && CONFIG.proxyUrl) || "").replace(/\/$/, "");
    const u = new URL(`${base}/modulo-arp/${path}`, location.href);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v); });
    return u;
  }
  async function get(path, params) {
    let r;
    try { r = await fetch(apiUrl(path, params)); }
    catch (e) { throw new Error("Não foi possível falar com o serviço de consulta. Confira o endereço do proxy em js/config.js."); }
    if (!r.ok) throw new Error(`O Compras.gov.br respondeu com erro ${r.status}. Tente de novo em alguns minutos.`);
    return r.json();
  }
  // Executa tarefas assíncronas com no máximo `n` em paralelo.
  async function emLotes(lista, n, fn) {
    const out = new Array(lista.length); let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => {
      while (i < lista.length) { const k = i++; out[k] = await fn(lista[k], k); }
    }));
    return out;
  }

  async function itensDaCompra(uasg, compra) {
    const out = [];
    for (let pagina = 1; pagina <= 20; pagina++) {
      const j = await get("2_consultarARPItem", {
        pagina, tamanhoPagina: 500, codigoUnidadeGerenciadora: uasg, numeroCompra: compra.num,
        dataVigenciaInicialMin: `${compra.ano}-01-01`, dataVigenciaInicialMax: `${+compra.ano + 1}-12-31`
      });
      out.push(...(j.resultado || []));
      if (!j.paginasRestantes) break;
    }
    return out.filter(r => r.anoCompra === compra.ano && !r.itemExcluido && !r.dataHoraExclusao);
  }

  // Saldo de um item: o gerenciador informa o saldo para adesões (limite global, art. 86, § 5º);
  // o limite do órgão aderente é 50% do registrado, descontado o que ele já aderiu (§ 4º).
  async function saldoItem(ata, uasg, numeroItem, uasgPropria) {
    numeroItem = pad5(numeroItem); // a API só encontra o item com 5 dígitos (00010)
    const u = await get("3_consultarUnidadesItem", { numeroAta: ata, unidadeGerenciadora: uasg, numeroItem });
    const linhas = u.resultado || [];
    const ger = linhas.find(l => l.tipoUnidade === "GERENCIADORA") || linhas[0];
    if (!ger) return null;
    let jaAderido = 0;
    if (uasgPropria) {
      try {
        const ad = await get("5_consultarAdesoesItem", { numeroAta: ata, unidadeGerenciadora: uasg, numeroItem, unidade: uasgPropria });
        jaAderido = (ad.resultado || []).reduce((s, x) => s + (Number(x.quantidadeAprovadaAdesao) || 0), 0);
      } catch (e) { /* sem histórico de adesões: segue com zero */ }
    }
    const registrada = Number(ger.quantidadeRegistrada) || 0;
    const saldoAdesoes = Number(ger.saldoAdesoes) || 0;
    const aceita = ger.aceitaAdesao !== false;
    const limiteOrgao = Math.max(0, registrada * 0.5 - jaAderido);
    return {
      numeroItem, registrada, saldoAdesoes, aceita, jaAderido, limiteOrgao,
      disponivel: aceita ? Math.max(0, Math.floor(Math.min(limiteOrgao, saldoAdesoes) * 1000) / 1000) : 0,
      consultadoEm: new Date().toISOString(),
      descricao: ger.descricaoItem || "", fornecedor: ger.fornecedor || ""
    };
  }

  // Itens do pregão já baixados, para não repetir a consulta a cada item digitado.
  const cacheCompra = new Map();
  function itensDaCompraCache(uasg, compra) {
    const k = `${uasg}|${compra.num}/${compra.ano}`;
    if (!cacheCompra.has(k)) cacheCompra.set(k, itensDaCompra(uasg, compra).catch(e => { cacheCompra.delete(k); throw e; }));
    return cacheCompra.get(k);
  }

  // Consulta um item pelo número que ele tem na ata, digitado no card do item.
  async function consultarItem(i) {
    const S = App.state(), it = S.itens[i];
    const n = String(it?.itemAta || "").replace(/\D/g, "");
    if (!n) return;
    const uasg = String(S.uasg || "").trim(), ata = numAno(S.ata);
    if (!/^\d{6}$/.test(uasg) || !ata) return status("Para consultar o item, preencha acima a UASG gerenciadora e o número da ata (ex.: 00067/2025).");
    const ataNum = `${ata.num}/${ata.ano}`;
    status(`Consultando o item ${+n} da ata ${ataNum}…`);
    try {
      const s = await saldoItem(ataNum, uasg, n, S.org.uasgPropria);
      if (!s) { delete it.arp; App.refresh(); return status(`O item ${+n} não foi encontrado na ata ${ataNum} da UASG ${uasg}. Confira o número.`); }
      // Preço e CATMAT só vêm na consulta do pregão; se ele não foi informado, ficam para preencher.
      let r = null;
      const compra = numAno(S.pregaoOrigem);
      if (compra) {
        try { r = (await itensDaCompraCache(uasg, compra)).find(x => x.numeroAtaRegistroPreco === ataNum && x.numeroItem === s.numeroItem) || null; }
        catch (e) { /* segue só com o saldo */ }
      }
      it.arp = s;
      it.qreg = String(s.registrada);
      // Na adesão, objeto e preço são os registrados na ata.
      it.desc = (r && r.descricaoItem) || s.descricao || it.desc;
      if (r) { it.catmat = String(r.codigoItem || ""); it.vu = brl(Number(r.valorUnitario) || 0); }
      const m = String(s.fornecedor).match(/^(\d{11,14})\s*-\s*(.+)$/);
      const forn = r ? { nome: r.nomeRazaoSocialFornecedor || "", cnpj: fmtCnpj(r.niFornecedor) } : m ? { nome: m[2].trim(), cnpj: fmtCnpj(m[1]) } : null;
      if (forn) {
        const lista = new Map((S.fornecedores || []).map(f => [f.cnpj, f]));
        lista.set(forn.cnpj, forn);
        S.fornecedores = [...lista.values()];
        S.fornecedor = S.fornecedores.length === 1 ? forn.nome : "";
        S.cnpj = S.fornecedores.length === 1 ? forn.cnpj : "";
      }
      if (!S.arpRef || S.arpRef.ata !== ataNum || S.arpRef.uasg !== uasg) S.arpRef = { uasg, compra: compra ? `${compra.num}/${compra.ano}` : "", ata: ataNum };
      S.ata = ataNum;
      if (r) { S.gerenciador = S.gerenciador || r.nomeUnidadeGerenciadora || ""; S.ataValidade = S.ataValidade || r.dataVigenciaFinal || ""; }
      S.example = false;
      App.refresh();
      status(`Item ${+n} da ata ${ataNum}: disponível para você ${fmtQtd(s.disponivel)}.${r ? "" : " Informe o pregão acima para trazer também o preço e o CATMAT."}`);
    } catch (e) { status(e.message); }
  }

  const fmtCnpj = c => String(c || "").replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  const status = t => { $("#arpStatus").textContent = t; };

  async function buscar() {
    const S = App.state();
    const uasg = String(S.uasg || "").trim(), compra = numAno(S.pregaoOrigem), ata = numAno(S.ata);
    if (!/^\d{6}$/.test(uasg)) return status("Informe a UASG gerenciadora com 6 dígitos.");
    if (!compra) return status("Informe o pregão no formato número/ano, por exemplo 90006/2025.");
    $("#btnBuscarAta").disabled = true; $("#arpResult").innerHTML = "";
    try {
      status("Buscando os itens do pregão no Compras.gov.br…");
      const itens = await itensDaCompraCache(uasg, compra);
      if (!itens.length) return status("Nenhuma ata encontrada para esse pregão e essa UASG. Confira os números.");
      const atas = [...new Set(itens.map(r => r.numeroAtaRegistroPreco))].sort();
      const ataNum = ata ? `${ata.num}/${ata.ano}` : null;
      if (!ataNum || !atas.includes(ataNum)) {
        status(ataNum ? `A ata ${ataNum} não está nesse pregão. Escolha uma das atas encontradas:` : "Escolha a ata:");
        $("#arpResult").innerHTML = `<div class="atas">${atas.map(a => {
          const f = itens.find(r => r.numeroAtaRegistroPreco === a);
          return `<button type="button" class="ataopt" data-ata="${esc(a)}"><b>Ata ${esc(a)}</b><span>${esc(f.nomeRazaoSocialFornecedor || "")}</span><span>vigente até ${esc((f.dataVigenciaFinal || "").split("-").reverse().join("/"))}</span></button>`;
        }).join("")}</div>`;
        return;
      }
      const daAta = itens.filter(r => r.numeroAtaRegistroPreco === ataNum).sort((a, b) => a.numeroItem.localeCompare(b.numeroItem));
      status(`Consultando o saldo de ${daAta.length} item(ns)…`);
      const saldos = await emLotes(daAta, 4, r => saldoItem(ataNum, uasg, r.numeroItem, S.org.uasgPropria).catch(() => null));
      encontrados = daAta.map((r, i) => ({ r, s: saldos[i] }));
      const f = daAta[0];
      Object.assign(S, {
        ata: ataNum, gerenciador: f.nomeUnidadeGerenciadora || S.gerenciador, ataValidade: f.dataVigenciaFinal || S.ataValidade,
        arpRef: { uasg, compra: `${compra.num}/${compra.ano}`, ata: ataNum }
      });
      App.refresh();
      renderTabela();
      status(`Ata ${ataNum}: ${daAta.length} item(ns). Marque os que vai aderir e informe a quantidade.`);
    } catch (e) { status(e.message); }
    finally { $("#btnBuscarAta").disabled = false; }
  }

  function renderTabela() {
    $("#arpResult").innerHTML = `<div class="arpwrap"><table class="arptab"><thead><tr><th></th><th>Item</th><th>Descrição e fornecedor</th><th>Valor unit.</th><th>Registrada</th><th>Saldo adesões</th><th>Disponível</th><th>Aderir</th></tr></thead><tbody>${
      encontrados.map(({ r, s }, i) => {
        const ok = s && s.aceita && s.disponivel > 0;
        return `<tr class="${ok ? "" : "off"}"><td><input type="checkbox" id="arp-sel-${i}" ${ok ? "" : "disabled"} aria-label="Selecionar item ${esc(r.numeroItem)}"></td>
          <td class="n">${esc(r.numeroItem)}</td>
          <td><div class="desc">${esc(r.descricaoItem || "")}</div><small>${esc(r.nomeRazaoSocialFornecedor || "")} · CATMAT ${esc(String(r.codigoItem || ""))}</small></td>
          <td class="n">R$ ${brl(Number(r.valorUnitario) || 0)}</td>
          <td class="n">${s ? fmtQtd(s.registrada) : "—"}</td>
          <td class="n">${s ? fmtQtd(s.saldoAdesoes) : "—"}</td>
          <td class="n"><b>${s ? (s.aceita ? fmtQtd(s.disponivel) : "não aceita") : "sem dados"}</b></td>
          <td><input type="text" inputmode="decimal" id="arp-q-${i}" class="q" ${ok ? "" : "disabled"} placeholder="0"></td></tr>`;
      }).join("")}</tbody></table></div>
      <p class="hint">Disponível = o menor valor entre o saldo para adesões informado pelo gerenciador e 50% da quantidade registrada${App.state().org.uasgPropria ? ", descontado o que sua UASG já aderiu" : ""} (art. 86, §§ 4º e 5º).</p>
      <button type="button" class="primary" id="btnImportar">Usar itens marcados no processo</button>`;
  }

  function importar() {
    const S = App.state(), sel = [];
    encontrados.forEach(({ r, s }, i) => {
      if (!$(`#arp-sel-${i}`)?.checked) return;
      sel.push({
        itemAta: String(+r.numeroItem), desc: r.descricaoItem || "", catmat: String(r.codigoItem || ""), un: "", qtd: $(`#arp-q-${i}`).value.trim(),
        vu: brl(Number(r.valorUnitario) || 0), qreg: String(s.registrada), arp: s,
        forn: { nome: r.nomeRazaoSocialFornecedor || "", cnpj: fmtCnpj(r.niFornecedor) }
      });
    });
    if (!sel.length) return status("Marque pelo menos um item.");
    const forns = [...new Map(sel.map(x => [x.forn.cnpj, x.forn])).values()];
    S.itens = sel.map(({ forn, ...it }) => it);
    S.fornecedores = forns;
    S.fornecedor = forns.length === 1 ? forns[0].nome : "";
    S.cnpj = forns.length === 1 ? forns[0].cnpj : "";
    S.example = false;
    App.refresh();
    status(`${sel.length} item(ns) incluído(s). Informe a unidade de fornecimento de cada um na seção Itens.`);
  }

  async function atualizar() {
    const S = App.state(), ref = S.arpRef;
    const alvo = S.itens.filter(it => it.arp);
    if (!ref || !alvo.length) return status("Busque a ata primeiro.");
    $("#btnAtualizarSaldo").disabled = true;
    status("Atualizando saldos…");
    try {
      await emLotes(alvo, 4, async it => { const s = await saldoItem(ref.ata, ref.uasg, it.arp.numeroItem, S.org.uasgPropria); if (s) it.arp = s; });
      App.refresh();
      status(`Saldos atualizados em ${new Date().toLocaleString("pt-BR")}.`);
    } catch (e) { status(e.message); }
    finally { $("#btnAtualizarSaldo").disabled = false; }
  }

  $("#btnBuscarAta").addEventListener("click", buscar);
  $("#btnAtualizarSaldo").addEventListener("click", atualizar);
  $("#arpResult").addEventListener("click", e => {
    const a = e.target.closest(".ataopt");
    if (a) { const S = App.state(); S.ata = a.dataset.ata; App.refresh(); buscar(); return; }
    if (e.target.id === "btnImportar") importar();
  });
  // Número do item digitado no card: consulta ao sair do campo, ou pelo link do card.
  $("#items").addEventListener("change", e => {
    if (e.target.dataset.f !== "itemAta") return;
    const i = +e.target.closest(".itemcard").dataset.i, it = App.state().itens[i];
    if (it.arp && it.arp.numeroItem !== pad5(String(it.itemAta).replace(/\D/g, "") || "0")) delete it.arp;
    if (String(it.itemAta).trim()) consultarItem(i); else App.refresh();
  });
  $("#items").addEventListener("click", e => { const b = e.target.closest("[data-consultar]"); if (b) consultarItem(+b.dataset.consultar); });
  App.listeners.push(S => { $("#btnAtualizarSaldo").hidden = !S.itens.some(it => it.arp); });
})();
