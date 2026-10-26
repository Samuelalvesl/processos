// Login com Google e processos salvos no Firestore (plano gratuito Spark).
// Estrutura: usuarios/{uid} guarda os dados do órgão; usuarios/{uid}/processos/{id} guarda cada processo.
// Os documentos anexados vão para o Google Drive do próprio usuário (escopo drive.file: o site só enxerga o que ele mesmo criou).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const cfg = window.CONFIG && window.CONFIG.firebase;
const box = $("#cloud");

if (!cfg || !cfg.apiKey) {
  box.innerHTML = `<span class="hint">Modo local: os dados ficam só neste navegador.</span>`;
} else {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let user = null, orgSalva = "", timerOrg;
  const esc = App.esc;
  const status = t => App.status(t);

  const userDoc = () => doc(db, "usuarios", user.uid);
  const procCol = () => collection(db, "usuarios", user.uid, "processos");

  function desenharBarra() {
    box.innerHTML = user
      ? `<span class="who">${esc(user.displayName || user.email || "Conectado")}</span>
         <button type="button" id="btnNovo">Novo processo</button>
         <button type="button" id="btnSalvarNuvem" class="primary">Salvar processo</button>
         <button type="button" id="btnSalvarCopia" hidden>Salvar como novo</button>
         <button type="button" id="btnMeus">Meus processos</button>
         <button type="button" id="btnSair" class="link">Sair</button>
         <span class="hint" id="procAtual"></span>`
      : `<button type="button" id="btnEntrar">Entrar com Google</button><span class="hint">para salvar processos na nuvem</span>`;
    mostrarAtual(App.state());
  }

  // Indica se "Salvar processo" vai atualizar um processo existente ou criar um novo.
  function mostrarAtual(S) {
    const el = $("#procAtual");
    if (!el) return;
    el.textContent = S.cloudId ? `Editando processo salvo: ${(S.nomeProcesso || S.objeto || "sem objeto").slice(0, 60)}` : "Processo novo, ainda não salvo";
    $("#btnSalvarCopia").hidden = !S.cloudId;
  }
  App.listeners.push(mostrarAtual);

  async function listar() {
    const pnl = $("#pnlProcessos");
    pnl.hidden = false;
    pnl.innerHTML = `<h2>Meus processos</h2><p class="hint">Carregando…</p>`;
    const snap = await getDocs(query(procCol(), orderBy("atualizadoEm", "desc")));
    const MOD = { dispensa: "Dispensa", pregao: "Pregão", adesao: "Adesão" };
    // Mesma conta do total dos documentos: soma de quantidade × valor unitário dos itens preenchidos.
    const valor = p => {
      try {
        const tots = (JSON.parse(p.estado || "{}").itens || []).map(it => Math.round(App.num(it.qtd) * App.num(it.vu) * 100) / 100).filter(isFinite);
        return tots.length ? `R$ ${App.brl(Math.round(tots.reduce((a, b) => a + b, 0) * 100) / 100)}` : "";
      } catch { return ""; }
    };
    const busca = $("#buscaProc")?.value || "";
    pnl.innerHTML = `<div class="prochead"><h2>Meus processos</h2><button type="button" class="link" id="btnMinLista"></button></div>
      <div class="procbody">${snap.empty ? `<p class="hint">Nenhum processo salvo ainda. Preencha o formulário e clique em Salvar processo.</p>` : `<input type="search" id="buscaProc" placeholder="Buscar por nome, objeto, NUP ou modalidade" aria-label="Buscar processos">
      <p class="hint" id="buscaVazia" hidden>Nenhum processo encontrado.</p><ul class="proclist">${snap.docs.map(d => {
      const p = d.data(), quando = p.atualizadoEm ? p.atualizadoEm.toDate().toLocaleString("pt-BR") : "", v = valor(p);
      const chave = semAcento([p.titulo, p.nome, p.objeto, p.nup, MOD[p.modalidade], quando, v].join(" "));
      return `<li data-busca="${esc(chave)}"><div><b>${esc(p.titulo || "Sem objeto")}</b><small>${esc(MOD[p.modalidade] || "")} · ${esc(p.nup || "sem NUP")} · ${esc(quando)}</small>${p.nome && p.objeto ? `<small>${esc(p.objeto)}</small>` : ""}</div>
        <div class="procvalor"><small>Valor estimado</small>${v ? `<b>${v}</b>` : `<small>sem itens</small>`}</div>
        <div class="procact"><button type="button" data-abrir="${d.id}">Abrir</button><button type="button" class="link" data-excluir="${d.id}">Excluir</button></div></li>`;
    }).join("")}</ul>`}<button type="button" class="link" id="btnFecharLista">Fechar</button></div>`;
    if ($("#buscaProc")) { $("#buscaProc").value = busca; filtrarLista(); }
    minimizarLista(listaMinimizada);
  }

  // Minimizar deixa só o título da lista; a escolha vale até fechar o site.
  let listaMinimizada = false;
  function minimizarLista(min) {
    listaMinimizada = min;
    $("#pnlProcessos").classList.toggle("minimizado", min);
    const b = $("#btnMinLista");
    if (b) { b.textContent = min ? "Expandir" : "Minimizar"; b.setAttribute("aria-expanded", String(!min)); }
  }

  const semAcento = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function filtrarLista() {
    const termos = semAcento($("#buscaProc").value).split(/\s+/).filter(Boolean);
    let achados = 0;
    for (const li of $("#pnlProcessos").querySelectorAll(".proclist li")) {
      const ok = termos.every(t => li.dataset.busca.includes(t));
      li.hidden = !ok;
      achados += ok;
    }
    $("#buscaVazia").hidden = achados > 0;
  }

  // Sem nome, o primeiro clique leva ao campo "Nome do processo"; o segundo salva assim mesmo (o objeto vira o título).
  let pediuNome = false;
  async function salvar(comoNovo) {
    const S = App.getState();
    const nome = (S.nomeProcesso || "").trim();
    if (!nome && !pediuNome) {
      pediuNome = true;
      const campo = $("#nomeProcesso");
      campo.scrollIntoView({ behavior: "smooth", block: "center" });
      campo.focus();
      return status("Dê um nome ao processo para encontrá-lo depois e clique em Salvar de novo. Sem nome, o objeto será usado como título.");
    }
    pediuNome = false;
    const { org, ...estado } = S;
    const ref = estado.cloudId && !comoNovo ? doc(procCol(), estado.cloudId) : doc(procCol());
    estado.cloudId = ref.id;
    await setDoc(ref, {
      titulo: (nome || S.objeto || "").slice(0, 140), nome, objeto: (S.objeto || "").slice(0, 140), modalidade: S.mod, nup: S.nup || "",
      estado: JSON.stringify(estado), atualizadoEm: serverTimestamp()
    });
    App.state().cloudId = ref.id;
    mostrarAtual(App.state());
    status(`${comoNovo || !S.cloudId ? "Novo processo salvo" : "Processo atualizado"} na nuvem em ${new Date().toLocaleString("pt-BR")}.`);
  }

  async function abrir(id) {
    const d = await getDoc(doc(procCol(), id));
    if (!d.exists()) return status("Esse processo não existe mais.");
    App.setState(JSON.parse(d.data().estado));
    $("#pnlProcessos").hidden = true;
    status("Processo aberto.");
  }

  /* ---------- documentos do processo no Google Drive ---------- */
  const DRIVE = "https://www.googleapis.com/drive/v3/files";
  const PASTA_RAIZ = "Gerador de Contratações";
  let driveToken = null, driveExp = 0, anexosDesenhados = "";
  const driveOk = () => driveToken && Date.now() < driveExp;

  // O token do Drive não sobrevive a recarregar a página: pede-se de novo, num popup, a cada sessão.
  async function conectarDrive() {
    const p = new GoogleAuthProvider();
    p.addScope("https://www.googleapis.com/auth/drive.file");
    const cred = GoogleAuthProvider.credentialFromResult(await reauthenticateWithPopup(user, p));
    driveToken = cred.accessToken;
    driveExp = Date.now() + 55 * 60 * 1000;
    desenharAnexos(App.state());
    status("Conectado ao Google Drive.");
  }

  async function api(url, opts = {}) {
    const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${driveToken}`, ...(opts.headers || {}) } });
    if (r.status === 401) { driveToken = null; desenharAnexos(App.state()); throw new Error("a conexão com o Drive expirou. Clique em Conectar ao Google Drive."); }
    if (!r.ok) throw new Error(`Drive ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.status === 204 ? null : r;
  }
  const json = async (url, opts) => (await api(url, opts)).json();

  async function criarPasta(nome, pai) {
    const meta = { name: nome, mimeType: "application/vnd.google-apps.folder", ...(pai ? { parents: [pai] } : {}) };
    return (await json(`${DRIVE}?fields=id`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(meta) })).id;
  }

  // Uma pasta por processo, dentro de "Gerador de Contratações". Recria se tiver ido para a lixeira.
  async function pastaDoProcesso(S) {
    if (S.driveFolderId) {
      try { const f = await json(`${DRIVE}/${S.driveFolderId}?fields=trashed`); if (!f.trashed) return S.driveFolderId; } catch (e) { if (!/Drive 404/.test(e.message)) throw e; }
    }
    const q = `name='${PASTA_RAIZ}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const achou = await json(`${DRIVE}?q=${encodeURIComponent(q)}&fields=files(id)`);
    const raiz = achou.files.length ? achou.files[0].id : await criarPasta(PASTA_RAIZ);
    const nome = `${S.nup || "Sem NUP"} - ${(S.objeto || "sem objeto").slice(0, 60)}`.replace(/[\\/]/g, "-");
    S.driveFolderId = await criarPasta(nome, raiz);
    return S.driveFolderId;
  }

  // Envio "resumable": uma requisição abre a sessão e outra manda o arquivo inteiro.
  async function enviarArquivo(file, pasta) {
    const ini = await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,size", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": file.type || "application/octet-stream" },
      body: JSON.stringify({ name: file.name, parents: [pasta] })
    });
    const r = await fetch(ini.headers.get("Location"), { method: "PUT", body: file });
    if (!r.ok) throw new Error(`Drive ${r.status} ao enviar ${file.name}`);
    return r.json();
  }

  async function anexar(files) {
    const S = App.state();
    if (!S.objeto && !S.nup) return status("Preencha o objeto ou o NUP antes de anexar: eles dão nome à pasta do processo no Drive.");
    const pasta = await pastaDoProcesso(S);
    for (const [i, f] of [...files].entries()) {
      status(`Enviando ${i + 1} de ${files.length}: ${f.name}…`);
      const d = await enviarArquivo(f, pasta);
      S.anexos = [...(S.anexos || []), { id: d.id, nome: d.name, link: d.webViewLink, tamanho: +d.size || f.size, data: new Date().toISOString() }];
      desenharAnexos(S);
    }
    await salvar(false); // grava a lista de anexos junto com o processo
    status(`${files.length === 1 ? "Documento anexado" : files.length + " documentos anexados"} e processo salvo.`);
  }

  // Remover manda o arquivo para a lixeira do Drive (dá para recuperar por 30 dias).
  async function removerAnexo(id) {
    const S = App.state();
    try { await api(`${DRIVE}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) }); }
    catch (e) { if (!/Drive 404/.test(e.message)) throw e; }
    S.anexos = (S.anexos || []).filter(a => a.id !== id);
    desenharAnexos(S);
    await salvar(false);
    status("Documento removido do processo e enviado para a lixeira do Drive.");
  }

  const tamanho = b => b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  function desenharAnexos(S) {
    const lista = S.anexos || [];
    const chave = JSON.stringify([lista, !!user, driveOk()]);
    if (chave === anexosDesenhados) return;
    anexosDesenhados = chave;
    $("#anexosAcoes").innerHTML = !user
      ? `<p class="hint">Entre com Google (no alto da página) para anexar documentos.</p>`
      : !driveOk()
        ? `<button type="button" id="btnDrive">Conectar ao Google Drive</button> <span class="hint">pedido uma vez por sessão</span>`
        : `<label class="upload"><input type="file" id="anexoArquivos" multiple> <span>Anexar documentos</span></label> <span class="hint">ou arraste os arquivos para esta área</span>`;
    $("#anexosLista").innerHTML = lista.map(a => `<li><div><a href="${esc(a.link || "#")}" target="_blank" rel="noopener"><b>${esc(a.nome)}</b></a><small>${tamanho(a.tamanho || 0)} · ${new Date(a.data).toLocaleDateString("pt-BR")}</small></div>
      ${user ? `<div class="procact"><button type="button" class="link" data-remover="${esc(a.id)}">Remover</button></div>` : ""}</li>`).join("");
  }
  App.listeners.push(desenharAnexos);

  $("#pnlAnexos").addEventListener("click", async e => {
    const t = e.target;
    try {
      if (t.id === "btnDrive") await conectarDrive();
      if (t.dataset.remover) {
        if (!driveOk()) return status("Clique em Conectar ao Google Drive antes de remover.");
        if (t.dataset.confirmar) await removerAnexo(t.dataset.remover);
        else { t.dataset.confirmar = "1"; t.textContent = "Confirmar remoção"; }
      }
    } catch (err) { status("Não foi possível concluir: " + (err.code || err.message)); }
  });
  $("#pnlAnexos").addEventListener("change", async e => {
    if (e.target.id !== "anexoArquivos" || !e.target.files.length) return;
    const files = [...e.target.files];
    e.target.value = "";
    try { await anexar(files); } catch (err) { status("Não foi possível anexar: " + (err.code || err.message)); }
  });

  // Arrastar e soltar: o painel inteiro recebe os arquivos, como se fossem escolhidos no botão.
  const pnlAnexos = $("#pnlAnexos");
  let arrastando = 0;
  const temArquivos = e => [...(e.dataTransfer?.types || [])].includes("Files");
  pnlAnexos.addEventListener("dragenter", e => {
    if (!temArquivos(e)) return;
    e.preventDefault();
    if (++arrastando === 1) pnlAnexos.classList.add("soltar");
  });
  pnlAnexos.addEventListener("dragover", e => {
    if (!temArquivos(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = user && driveOk() ? "copy" : "none";
  });
  pnlAnexos.addEventListener("dragleave", () => {
    if (arrastando && --arrastando === 0) pnlAnexos.classList.remove("soltar");
  });
  pnlAnexos.addEventListener("drop", async e => {
    if (!temArquivos(e)) return;
    e.preventDefault();
    arrastando = 0;
    pnlAnexos.classList.remove("soltar");
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    if (!user) return status("Entre com Google antes de anexar documentos.");
    if (!driveOk()) return status("Clique em Conectar ao Google Drive antes de anexar.");
    try { await anexar(files); } catch (err) { status("Não foi possível anexar: " + (err.code || err.message)); }
  });

  // Os dados do órgão acompanham o usuário: carregam no login e são salvos quando mudam.
  async function carregarOrg() {
    const d = await getDoc(userDoc());
    if (d.exists() && d.data().org) { App.setOrg(d.data().org); orgSalva = JSON.stringify(App.state().org); }
    else { orgSalva = ""; agendarOrg(App.state()); }
  }
  function agendarOrg(S) {
    if (!user) return;
    const atual = JSON.stringify(S.org);
    if (atual === orgSalva) return;
    clearTimeout(timerOrg);
    timerOrg = setTimeout(async () => {
      try { await setDoc(userDoc(), { org: S.org }, { merge: true }); orgSalva = atual; } catch (e) { console.error(e); }
    }, 2000);
  }
  App.listeners.push(agendarOrg);

  box.addEventListener("click", async e => {
    const id = e.target.id;
    try {
      if (id === "btnEntrar") await signInWithPopup(auth, new GoogleAuthProvider());
      if (id === "btnSair") { await signOut(auth); driveToken = null; $("#pnlProcessos").hidden = true; }
      if (id === "btnNovo") { App.novo(); $("#pnlProcessos").hidden = true; }
      if (id === "btnSalvarNuvem") await salvar(false);
      if (id === "btnSalvarCopia") await salvar(true);
      if (id === "btnMeus") await listar();
    } catch (err) { status("Não foi possível concluir: " + (err.code || err.message)); }
  });
  $("#pnlProcessos").addEventListener("click", async e => {
    const t = e.target;
    try {
      if (t.id === "btnFecharLista") $("#pnlProcessos").hidden = true;
      if (t.id === "btnMinLista") minimizarLista(!listaMinimizada);
      if (t.dataset.abrir) await abrir(t.dataset.abrir);
      if (t.dataset.excluir) {
        // Exclusão em dois cliques, sem diálogo do navegador.
        if (t.dataset.confirmar) { await deleteDoc(doc(procCol(), t.dataset.excluir)); await listar(); status("Processo excluído."); }
        else { t.dataset.confirmar = "1"; t.textContent = "Confirmar exclusão"; }
      }
    } catch (err) { status("Não foi possível concluir: " + (err.code || err.message)); }
  });
  $("#pnlProcessos").addEventListener("input", e => { if (e.target.id === "buscaProc") filtrarLista(); });

  onAuthStateChanged(auth, async u => {
    user = u;
    desenharBarra();
    desenharAnexos(App.state());
    if (u) { try { await carregarOrg(); } catch (e) { status("Não foi possível carregar os dados do órgão: " + (e.code || e.message)); } }
  });
  desenharBarra();
}
