// Login com Google e processos salvos no Firestore (plano gratuito Spark).
// Estrutura: usuarios/{uid} guarda os dados do órgão; usuarios/{uid}/processos/{id} guarda cada processo.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
         <button type="button" id="btnSalvarNuvem" class="primary">Salvar processo</button>
         <button type="button" id="btnMeus">Meus processos</button>
         <button type="button" id="btnSair" class="link">Sair</button>`
      : `<button type="button" id="btnEntrar">Entrar com Google</button><span class="hint">para salvar processos na nuvem</span>`;
  }

  async function listar() {
    const pnl = $("#pnlProcessos");
    pnl.hidden = false;
    pnl.innerHTML = `<h2>Meus processos</h2><p class="hint">Carregando…</p>`;
    const snap = await getDocs(query(procCol(), orderBy("atualizadoEm", "desc")));
    const MOD = { dispensa: "Dispensa", pregao: "Pregão", adesao: "Adesão" };
    pnl.innerHTML = `<h2>Meus processos</h2>${snap.empty ? `<p class="hint">Nenhum processo salvo ainda. Preencha o formulário e clique em Salvar processo.</p>` : `<ul class="proclist">${snap.docs.map(d => {
      const p = d.data(), quando = p.atualizadoEm ? p.atualizadoEm.toDate().toLocaleString("pt-BR") : "";
      return `<li><div><b>${esc(p.titulo || "Sem objeto")}</b><small>${esc(MOD[p.modalidade] || "")} · ${esc(p.nup || "sem NUP")} · ${esc(quando)}</small></div>
        <div class="procact"><button type="button" data-abrir="${d.id}">Abrir</button><button type="button" class="link" data-excluir="${d.id}">Excluir</button></div></li>`;
    }).join("")}</ul>`}<button type="button" class="link" id="btnFecharLista">Fechar</button>`;
  }

  async function salvar() {
    const S = App.getState();
    const { org, ...estado } = S;
    const ref = estado.cloudId ? doc(procCol(), estado.cloudId) : doc(procCol());
    estado.cloudId = ref.id;
    await setDoc(ref, {
      titulo: (S.objeto || "").slice(0, 140), modalidade: S.mod, nup: S.nup || "",
      estado: JSON.stringify(estado), atualizadoEm: serverTimestamp()
    });
    App.state().cloudId = ref.id;
    status(`Processo salvo na nuvem em ${new Date().toLocaleString("pt-BR")}.`);
  }

  async function abrir(id) {
    const d = await getDoc(doc(procCol(), id));
    if (!d.exists()) return status("Esse processo não existe mais.");
    App.setState(JSON.parse(d.data().estado));
    $("#pnlProcessos").hidden = true;
    status("Processo aberto.");
  }

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
      if (id === "btnSair") { await signOut(auth); $("#pnlProcessos").hidden = true; }
      if (id === "btnSalvarNuvem") await salvar();
      if (id === "btnMeus") await listar();
    } catch (err) { status("Não foi possível concluir: " + (err.code || err.message)); }
  });
  $("#pnlProcessos").addEventListener("click", async e => {
    const t = e.target;
    try {
      if (t.id === "btnFecharLista") $("#pnlProcessos").hidden = true;
      if (t.dataset.abrir) await abrir(t.dataset.abrir);
      if (t.dataset.excluir) {
        // Exclusão em dois cliques, sem diálogo do navegador.
        if (t.dataset.confirmar) { await deleteDoc(doc(procCol(), t.dataset.excluir)); await listar(); status("Processo excluído."); }
        else { t.dataset.confirmar = "1"; t.textContent = "Confirmar exclusão"; }
      }
    } catch (err) { status("Não foi possível concluir: " + (err.code || err.message)); }
  });

  onAuthStateChanged(auth, async u => {
    user = u;
    desenharBarra();
    if (u) { try { await carregarOrg(); } catch (e) { status("Não foi possível carregar os dados do órgão: " + (e.code || e.message)); } }
  });
  desenharBarra();
}
