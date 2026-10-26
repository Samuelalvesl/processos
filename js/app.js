// Limite da dispensa por valor (art. 75, II) vigente em 2026 — Decreto nº 12.807/2025.
const LIMITE_DISPENSA = 65492.11;
const STORE_KEY = "gerador-contratacoes:v1";

const DEFAULT_ORG = {
  forca: "MARINHA DO BRASIL", om: "COLÉGIO NAVAL", depto: "DEPARTAMENTO DE INTENDÊNCIA", divisao: "DIVISÃO DE MUNICIAMENTO",
  omArtigo: "do Colégio Naval", setorArtigo: "da Divisão de Municiamento", setorNome: "Divisão de Municiamento do Departamento de Intendência",
  cidade: "Angra dos Reis – RJ", telefone: "(24) 3424-3042",
  endereco: "COLÉGIO NAVAL – Rua Marquês de Leão, s/nº, Angra dos Reis – RJ, CEP 23909-900",
  horario: "segunda a sexta-feira, das 10h às 15h30",
  ug: "762300", fonte: "1000000000", ptres: "174713", nd: "339030", pi: "B44101002DD",
  reqNome: "Luiz Gustavo de Nonno", reqPosto: "1ºTen (T)", reqFuncao: "Encarregado da Divisão de Municiamento",
  ordNome: "José Fernando Barboza dos Santos", ordPosto: "CMG",
  eq1: "Luiz Gustavo de Nonno", eq1Posto: "", eq1mail: "", eq2: "Manoel Ricardo dos Santos Filho", eq2Posto: "", eq2mail: "",
  anexos: true
};

const BLANK = {
  mod: "dispensa", srp: false, srpHipotese: "I", adesaoPermitida: false, adjudicacao: "item", justGrupo: "", sigiloso: false,
  vigenciaMeses: 12, vigenciaDias: 90,
  ata: "", pregaoOrigem: "", gerenciador: "", uasg: "", fornecedor: "", cnpj: "", ataValidade: "", ataProrrogada: false, aditivoNum: "", ataNovaValidade: "", vigenciaAdesao: "", vantagem: "prazo", ataFederal: false, habReduzida: true,
  nomeProcesso: "", nup: "", prioridade: "Médio", dataPretendida: "", objeto: "", motivo: "", necessidade: "", baseQtd: "", pca: "", pcaNaoConsta: false, pcaJustificativa: "",
  itens: [{ itemAta: "", desc: "", catmat: "", un: "", qtd: "", vu: "", qreg: "" }],
  prazoEntrega: 5, fornecimento: "integral", perecivel: false, validadeMeses: 12, requisitos: "",
  fornecedores: [], cloudId: null, anexos: [], driveFolderId: null,
  example: false
};

const EXAMPLE = Object.assign(JSON.parse(JSON.stringify(BLANK)), {
  example: true, prioridade: "Alto", dataPretendida: "2026-12",
  objeto: "aquisição de gêneros alimentícios para o coquetel da Cerimônia de Formatura dos Alunos de 2026",
  motivo: "apoiar a Cerimônia de Formatura dos Alunos, prevista para dezembro de 2026",
  necessidade: "A Cerimônia de Formatura reúne alunos, familiares e autoridades convidadas e inclui coquetel de encerramento sob responsabilidade da Divisão de Municiamento. Os gêneros não fazem parte do cardápio regular do rancho e não há saldo em contratos vigentes que os atenda. Sem a aquisição, o evento ficaria sem o serviço de coquetel previsto na programação oficial.",
  baseQtd: "estimativa de 600 convidados e no consumo registrado na cerimônia de 2025",
  perecivel: true, validadeMeses: 3,
  itens: [
    { desc: "Refrigerante, sabor guaraná, garrafa PET 2 L", catmat: "", un: "unidade", qtd: "180", vu: "8,49", qreg: "" },
    { desc: "Suco de fruta integral, sabor uva, garrafa 1 L", catmat: "", un: "unidade", qtd: "120", vu: "12,35", qreg: "" },
    { desc: "Água mineral sem gás, garrafa 500 mL", catmat: "", un: "unidade", qtd: "600", vu: "1,89", qreg: "" },
    { desc: "Salgado assado sortido, tamanho coquetel, cento", catmat: "", un: "cento", qtd: "30", vu: "89,90", qreg: "" }
  ]
});

let S;
let currentDoc = "dfd";
let brasaoBytes = null, brasaoW = 1, brasaoH = 1;

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const num = v => { if (typeof v === "number") return v; const s = String(v || "").trim().replace(/\s/g, ""); if (!s) return NaN; const n = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s; return parseFloat(n); };
const round2 = n => Math.round(n * 100) / 100;
const brl = n => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQtd = n => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const ph = (v, label) => { const s = (v ?? "").toString().trim(); return s || `[PREENCHER: ${label}]`; };
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function mesAno(v) { if (!v) return ""; const [y, m] = v.split("-"); return `${MESES[+m - 1]} de ${y}`; }
function dataBR(v) { if (!v) return ""; const [y, m, d] = v.split("-"); return `${d}/${m}/${y}`; }
// Validade que vale para a adesão: a nova data, quando a ata foi prorrogada por termo aditivo (art. 84).
const validadeAta = () => (S.ataProrrogada && S.ataNovaValidade) || S.ataValidade;

const UN = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
const DZ = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
const CT = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
function ate999(n) {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(CT[c]);
  if (r) p.push(r < 20 ? UN[r] : (r % 10 ? DZ[Math.floor(r / 10)] + " e " + UN[r % 10] : DZ[r / 10]));
  return p.join(" e ");
}
function inteiroExtenso(n) {
  if (n === 0) return "zero";
  const nomes = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];
  const g = []; for (let x = n; x > 0; x = Math.floor(x / 1000)) g.push(x % 1000);
  const partes = [];
  for (let i = g.length - 1; i >= 0; i--) {
    if (!g[i]) continue;
    let s = (i === 1 && g[i] === 1) ? "mil" : ate999(g[i]) + (i > 0 ? " " + (g[i] === 1 ? nomes[i][0] : nomes[i][1]) : "");
    partes.push({ s, v: g[i] });
  }
  return partes.reduce((out, p, k) => {
    if (k === 0) return p.s;
    const ultimo = k === partes.length - 1;
    return out + ((ultimo && (p.v < 100 || p.v % 100 === 0)) ? " e " : " ") + p.s;
  }, "");
}
function reaisExtenso(v) {
  const cents = Math.round(v * 100), r = Math.floor(cents / 100), c = cents % 100;
  let s = "";
  if (r > 0) s = inteiroExtenso(r) + (r >= 1e6 && r % 1e6 === 0 ? " de reais" : r === 1 ? " real" : " reais");
  if (c > 0) s += (r > 0 ? " e " : "") + inteiroExtenso(c) + (c === 1 ? " centavo" : " centavos");
  return s || "zero real";
}
const prazo = (n, unid) => { const v = parseInt(n, 10); return v > 0 ? `${String(v).padStart(2, "0")} (${inteiroExtenso(v)}) ${unid}` : `[PREENCHER: prazo] ${unid}`; };

function itensCalc() {
  const rows = S.itens.map((it, i) => {
    const q = num(it.qtd), v = num(it.vu);
    const tot = isFinite(q) && isFinite(v) ? round2(q * v) : NaN;
    // Na adesão, o item leva o número que tem na ata; nos demais casos, a ordem do processo.
    const na = String(it.itemAta || "").trim();
    const n = S.mod === "adesao" && na ? (/^\d+$/.test(na) ? String(+na) : na) : i + 1;
    return { ...it, n, q, v, tot };
  });
  const total = round2(rows.reduce((a, r) => a + (isFinite(r.tot) ? r.tot : 0), 0));
  const completo = rows.length > 0 && rows.every(r => isFinite(r.tot));
  return { rows, total, completo };
}

/* ---------- textos por modalidade ---------- */
function modTexts(calc) {
  const o = S.org, obj = ph(S.objeto, "objeto"), mot = ph(S.motivo, "motivo da contratação"), cid = ph(o.cidade, "cidade – UF");
  const srp = S.mod === "pregao" && S.srp;
  const ata = ph(S.ata, "nº/ano da ata"), preg = ph(S.pregaoOrigem, "nº/ano do pregão"), ger = ph(S.gerenciador, "órgão gerenciador"), uasg = ph(S.uasg, "UASG");
  const HIP = {
    I: ["I", "as características do objeto demandarem contratações frequentes"],
    II: ["II", "ser conveniente a aquisição de bens com previsão de entregas parceladas"],
    III: ["III", "ser conveniente a aquisição de bens para atendimento a mais de um órgão ou entidade"],
    IV: ["IV", "não ser possível, pela natureza do objeto, definir previamente o quantitativo a ser demandado"]
  };
  const VANT = { prazo: "proporciona ganho de prazo no atendimento da demanda", economia: "gera economia processual e de recursos administrativos", desabastecimento: "afasta o risco de desabastecimento ou de descontinuidade do atendimento" };
  if (S.mod === "dispensa") return {
    dfd_abertura: `Nos termos do disposto no inciso II do art. 75 da Lei nº 14.133/2021 e do inciso I do art. 5º da IN SEGES/ME nº 67/2021, apresento a justificativa abaixo para a ${obj}, visando ${mot}, em proveito ${o.omArtigo}, em ${cid}.`,
    etp_modalidade: "contratação direta por dispensa de licitação, na forma eletrônica, com fundamento no art. 75, inciso II, da Lei nº 14.133/2021",
    etp_precos: "Em conformidade com o art. 23 da Lei nº 14.133/2021 e com a IN SEGES/ME nº 65/2021, foram utilizados como parâmetros o Painel de Preços do Governo Federal e propostas de empresas do ramo, adotando-se a mediana, o que demonstra a vantajosidade econômica da contratação.",
    etp_mercado: "O objeto é comum e amplamente ofertado no mercado, por diversos fornecedores, o que torna a dispensa eletrônica, com disputa aberta no Compras.gov.br, a solução mais adequada e célere, compatível com o valor estimado (art. 75, II, da Lei nº 14.133/2021).",
    tr_vigencia: `O prazo de vigência da contratação é de ${prazo(S.vigenciaDias, "dias")}, contados da divulgação no PNCP, na forma do art. 105 da Lei nº 14.133/2021.`,
    tr_solucao: "A contratação por dispensa eletrônica mostra-se a solução mais adequada, considerado o ciclo de vida do objeto, por se tratar de bens comuns de valor compatível com o art. 75, II, da Lei nº 14.133/2021.",
    tr_selecao: "O fornecedor será selecionado por meio de contratação direta, por **dispensa de licitação**, com fundamento no **art. 75, inciso II, da Lei nº 14.133/2021**, na forma **eletrônica**, nos termos da IN SEGES/ME nº 67/2021, com adoção do critério de julgamento pelo **menor preço**.",
    tr_aceitabilidade: "O critério de aceitabilidade dos preços unitários máximos será o constante da tabela do item 1.1 deste Termo de Referência."
  };
  if (S.mod === "pregao") {
    const h = HIP[S.srpHipotese] || HIP.I;
    return {
      dfd_abertura: `Nos termos do disposto no art. 12, VII, e no art. 18 da Lei nº 14.133/2021, e do Decreto nº 10.947/2022, apresento a justificativa abaixo para a ${obj}, visando ${mot}, em proveito ${o.omArtigo}, em ${cid}, a ser contratada por meio de pregão eletrônico${srp ? " para registro de preços" : ""}.`,
      etp_modalidade: `licitação na modalidade pregão, na forma eletrônica${srp ? ", pelo Sistema de Registro de Preços" : ""}, nos termos dos arts. 6º, XLI, e 29 da Lei nº 14.133/2021`,
      etp_precos: "Em conformidade com o art. 23 da Lei nº 14.133/2021 e com a IN SEGES/ME nº 65/2021, a estimativa considerou o Painel de Preços do Governo Federal, contratações similares de outros órgãos e propostas de fornecedores, adotando-se a mediana." + (S.sigiloso ? " O valor estimado terá caráter sigiloso até o encerramento da fase de lances, nos termos do art. 24 da Lei nº 14.133/2021." : ""),
      etp_mercado: "Trata-se de bem comum, com padrões de desempenho e qualidade objetivamente definidos por especificações usuais de mercado, o que impõe a adoção do pregão (art. 6º, XLI, e art. 29 da Lei nº 14.133/2021)." + (srp ? ` Justifica-se o Sistema de Registro de Preços com fundamento no art. 3º, inciso ${h[0]}, do Decreto nº 11.462/2023, por ${h[1]}.` : ""),
      tr_vigencia: srp
        ? "O prazo de vigência da ata de registro de preços será de 1 (um) ano, contado da sua divulgação no PNCP, prorrogável por igual período, desde que comprovado o preço vantajoso (art. 84 da Lei nº 14.133/2021)."
        : `O prazo de vigência da contratação é de ${prazo(S.vigenciaMeses, "meses")}, contados da assinatura do contrato ou instrumento equivalente, na forma do art. 105 da Lei nº 14.133/2021.`,
      tr_solucao: `A realização de pregão eletrônico${srp ? " para registro de preços" : ""} mostra-se a solução mais adequada, considerado o ciclo de vida do objeto, por ampliar a competitividade e permitir a obtenção da proposta mais vantajosa.`,
      tr_selecao: `O fornecedor será selecionado por meio da realização de procedimento de **licitação, na modalidade pregão, sob a forma eletrônica**, com adoção do critério de julgamento pelo **menor preço**, por ${S.adjudicacao === "grupo" ? "grupo" : "item"}, nos termos da Lei nº 14.133/2021 e da IN SEGES/ME nº 73/2022.`,
      tr_aceitabilidade: "O critério de aceitabilidade de preços será o valor unitário máximo constante da tabela do item 1.1 deste Termo de Referência.",
      tr_srp_item: srp ? `${o.omArtigo.replace(/^d([oa])\s/i, (m, a) => a.toUpperCase() + " ")} será o órgão gerenciador da ata. ${S.adesaoPermitida ? "Será admitida a adesão à ata por órgãos e entidades não participantes, nos limites dos §§ 4º e 5º do art. 86 da Lei nº 14.133/2021." : "Não será admitida a adesão à ata por órgãos e entidades não participantes."}` : null
    };
  }
  const forn = ph(S.fornecedor, "razão social"), cnpj = ph(S.cnpj, "CNPJ");
  const contratadas = (S.fornecedores || []).length > 1
    ? `com as empresas ${S.fornecedores.map(f => `**${f.nome}, CNPJ ${f.cnpj}**`).join("; ")}`
    : `com a empresa **${forn}, CNPJ ${cnpj}**`;
  return {
    dfd_abertura: `Nos termos do art. 86, § 2º, da Lei nº 14.133/2021 e do Decreto nº 11.462/2023, apresento a justificativa abaixo para a ${obj}, visando ${mot}, por meio de adesão à Ata de Registro de Preços nº ${ata}, decorrente do Pregão Eletrônico nº ${preg}, gerenciada pelo(a) ${ger} (UASG ${uasg}), em proveito ${o.omArtigo}, em ${cid}.`,
    etp_modalidade: `adesão, como órgão não participante, à Ata de Registro de Preços nº ${ata}, gerenciada pelo(a) ${ger} (UASG ${uasg}), nos termos do art. 86, § 2º, da Lei nº 14.133/2021`,
    etp_precos: "Em conformidade com o art. 86, § 2º, II, da Lei nº 14.133/2021 e com a IN SEGES/ME nº 65/2021, foi realizada pesquisa de preços que demonstra que os valores registrados na ata são compatíveis com os valores praticados pelo mercado, conforme mapa comparativo anexo.",
    etp_mercado: `Foram avaliadas as alternativas de realizar licitação própria e de aderir à ata vigente. A adesão mostra-se mais vantajosa porque ${VANT[S.vantagem] || VANT.prazo} (art. 86, § 2º, I, da Lei nº 14.133/2021), e os preços registrados estão compatíveis com o mercado. Os quantitativos solicitados respeitam os limites dos §§ 4º e 5º do art. 86 da Lei nº 14.133/2021.`,
    tr_vigencia: `O prazo de vigência da contratação é de ${ph(S.vigenciaAdesao, "90 (noventa) dias / 12 meses")}, contados da assinatura do contrato ou instrumento equivalente, observada a vigência da Ata de Registro de Preços nº ${ata}, válida até ${ph(dataBR(validadeAta()), "data")}${S.ataProrrogada ? `, conforme prorrogação formalizada pelo Termo Aditivo nº ${ph(S.aditivoNum, "nº/ano do termo aditivo")}, nos termos do art. 84 da Lei nº 14.133/2021` : ""}.`,
    tr_solucao: `A adesão à Ata de Registro de Preços nº ${ata} mostra-se a solução mais adequada, considerado o ciclo de vida do objeto, por permitir o atendimento tempestivo da demanda a preços compatíveis com os de mercado, conforme demonstrado no Estudo Técnico Preliminar.`,
    tr_selecao: `O fornecimento será realizado mediante **adesão à Ata de Registro de Preços nº ${ata}**, decorrente do **Pregão Eletrônico nº ${preg}**, gerenciada pelo(a) **${ger} (UASG ${uasg})**, firmada ${contratadas}, com fundamento no art. 86, § 2º, da Lei nº 14.133/2021 e no Decreto nº 11.462/2023, condicionada à anuência do órgão gerenciador e ao aceite do fornecedor.`,
    tr_aceitabilidade: "Os preços unitários são os registrados na ata, conforme tabela do item 1.1 deste Termo de Referência."
  };
}

/* ---------- montagem dos documentos (modelo de blocos) ---------- */
function cabecalho(titulo, anexo) {
  const o = S.org, b = [];
  if (o.anexos && anexo) b.push({ t: "anexo", text: anexo });
  b.push({ t: "brasao" });
  b.push({ t: "cab", lines: [o.forca, o.om, o.depto, o.divisao].filter(x => x && x.trim()) });
  b.push({ t: "title", text: titulo });
  b.push({ t: "subtitle", text: `(Processo Administrativo nº ${ph(S.nup, "NUP")})` });
  return b;
}
const assinatura = (rot, nome, posto, cargo, lblNome) => ({ t: "sign", rot, nome: ph(nome, lblNome), linhas: [posto, cargo].filter(Boolean) });

function buildDFD(calc, M) {
  const o = S.org;
  const prio = ["Baixo", "Médio", "Alto"].map(p => `${p} (${S.prioridade === p ? "X" : " "})`).join("     ");
  const tot = calc.completo ? `R$ ${brl(calc.total)} (${reaisExtenso(calc.total)})` : "R$ [PREENCHER] ([PREENCHER: valor por extenso])";
  return [
    ...cabecalho("FORMALIZAÇÃO DA DEMANDA", "Anexo III"),
    { t: "p", text: M.dfd_abertura },
    { t: "h", text: "JUSTIFICATIVA DA NECESSIDADE DO OBJETO" },
    { t: "sub", text: "A) Razão da necessidade da aquisição" },
    { t: "p", text: ph(S.necessidade, "o problema concreto, a finalidade e o impacto de não contratar") },
    { t: "sub", text: "B) Especificação técnica dos objetos demandados" },
    { t: "p", text: `As especificações técnicas foram mensuradas pela equipe de planejamento ${o.setorArtigo}, conforme segue:` },
    { t: "table", head: ["ITEM", "ESPECIFICAÇÃO", "QTD"], w: [10, 72, 18], numCols: [2],
      rows: calc.rows.map(r => [String(r.n).padStart(2, "0"), ph(r.desc, "descrição no padrão CATMAT"), isFinite(r.q) ? `${fmtQtd(r.q)}${r.un ? " " + r.un : ""}` : "[PREENCHER]"]) },
    { t: "sub", text: "C) Quantitativo do objeto demandado" },
    { t: "p", text: `O quantitativo foi elaborado com base em ${ph(S.baseQtd, "consumo histórico, efetivo atendido, eventos programados")}, de forma a atender às necessidades da Organização, conforme tabela acima.` },
    { t: "sub", text: "D) Estimativa preliminar dos valores da contratação/aquisição" },
    { t: "p", text: S.mod === "adesao"
        ? `O valor da contratação corresponde aos preços registrados na Ata de Registro de Preços nº ${ph(S.ata, "nº/ano da ata")}, sendo o total previsto de ${tot}.`
        : `O valor da contratação foi baseado na mediana de preços da pesquisa no Painel de Preços do Compras.gov.br, sendo o total previsto de ${tot}.` },
    { t: "sub", text: "E) Data pretendida para conclusão" },
    { t: "p", text: ph(mesAno(S.dataPretendida), "mês/ano") },
    { t: "sub", text: "F) Grau de prioridade da compra" },
    { t: "p", text: prio },
    { t: "sub", text: "G) Vinculação da contratação/aquisição com objeto de outro Documento de Formalização da Demanda" },
    { t: "p", text: "Não se observa vinculação da contratação com outra aquisição." },
    { t: "sub", text: "H) Área requisitante" },
    { t: "p", text: `${ph(o.setorNome, "setor requisitante")} – responsável: ${ph([o.reqPosto, o.reqNome].filter(Boolean).join(" "), "nome e posto")}.` },
    { t: "local", text: `${ph(o.cidade, "cidade")}, na data da assinatura.` },
    assinatura(null, o.reqNome, o.reqPosto, o.reqFuncao, "NOME DO REQUISITANTE"),
    assinatura("De acordo: na data da assinatura.", o.ordNome, o.ordPosto, "Ordenador de Despesas", "NOME DO ORDENADOR DE DESPESAS")
  ];
}

function risco(n, titulo, prob, imp, dano, prev, rprev, cont, rcont) {
  return [
    { t: "sub", text: `Risco ${n} – ${titulo}` },
    { t: "table", head: ["Probabilidade", "Impacto", "Dano"], w: [20, 20, 60], rows: [[prob, imp, dano]] },
    { t: "table", head: ["Ação preventiva", "Responsável"], w: [65, 35], rows: [[prev, rprev]] },
    { t: "table", head: ["Ação de contingência", "Responsável"], w: [65, 35], rows: [[cont, rcont]] }
  ];
}

function buildETP(calc, M) {
  const o = S.org, obj = ph(S.objeto, "objeto");
  const tot = calc.completo ? `R$ ${brl(calc.total)} (${reaisExtenso(calc.total)})` : "R$ [PREENCHER] ([PREENCHER: por extenso])";
  const reqs = S.requisitos.trim() ? S.requisitos.trim() + " " : "";
  const validade = S.perecivel ? ` No recebimento, os itens deverão apresentar validade mínima de ${prazo(S.validadeMeses, "meses")}.` : "";
  const parcel = S.mod === "adesao"
    ? "A contratação observará os itens e o critério de adjudicação definidos no certame que originou a ata."
    : (S.mod === "pregao" && S.adjudicacao === "grupo")
      ? `A adjudicação será por grupo. ${ph(S.justGrupo, "justificativa técnica ou econômica para o agrupamento dos itens")}`
      : "A adjudicação será por item, por se tratar de objeto divisível, o que amplia a competitividade e favorece a obtenção de preços mais vantajosos, em atenção ao princípio do parcelamento (art. 40, V, “b”, e § 2º, da Lei nº 14.133/2021).";
  const mail = m => m && m.trim() ? m.trim() : "[PREENCHER]@marinha.mil.br";
  const sec = (titulo, texto) => [{ t: "h", text: titulo }, { t: "p", text: texto }];
  return [
    ...cabecalho("ESTUDO TÉCNICO PRELIMINAR", "Anexo II"),
    { t: "h", text: "INTRODUÇÃO" },
    { t: "p", text: `Com a aplicação da Instrução Normativa SEGES/ME nº 58, de 8 de agosto de 2022, e considerando o disposto na Lei nº 14.133, de 1º de abril de 2021, a elaboração do Estudo Técnico Preliminar – ETP é essencial para a ${obj}, no âmbito da Administração Pública, de maneira adequada.` },
    { t: "p", text: `Este Estudo tem como objetivo detalhar os requisitos e as circunstâncias necessárias para subsidiar a ${obj}, visando ${ph(S.motivo, "motivo da contratação")}, no âmbito ${o.omArtigo}, por meio de ${M.etp_modalidade}.` },
    { t: "h", text: "ETAPA 1: ESTUDOS PRELIMINARES DE CONTRATAÇÃO" },
    ...sec("I – NECESSIDADE DA CONTRATAÇÃO", ph(S.necessidade, "retomar e aprofundar a razão da necessidade do DFD")),
    { t: "h", text: "II – REQUISITOS DA CONTRATAÇÃO" },
    { t: "p", text: `${reqs}Os bens deverão atender integralmente às especificações constantes do Termo de Referência, ser novos e de primeira qualidade, e estar acondicionados em embalagens originais e adequadas ao transporte e à armazenagem.${validade}` },
    { t: "p", text: `Os bens deverão ser entregues no endereço: ${ph(o.endereco, "endereço de entrega")}.` },
    ...sec("III – LEVANTAMENTO DE MERCADO", M.etp_mercado),
    ...sec("IV – DESCRIÇÃO DA SOLUÇÃO COMO UM TODO", `A solução consiste na ${obj}, com fornecimento ${S.fornecimento === "parcelado" ? "parcelado, conforme cronograma definido pela Administração" : "integral, preferencialmente em remessa única"}, no prazo de ${prazo(S.prazoEntrega, "dias corridos")} contados do recebimento da Nota de Empenho, com garantia nos termos da Lei nº 8.078/1990 (Código de Defesa do Consumidor).`),
    ...sec("V – ESTIMATIVA DAS QUANTIDADES, ACOMPANHADAS DAS MEMÓRIAS DE CÁLCULO E DOS DOCUMENTOS QUE LHE DÃO SUPORTE", `As quantidades foram estimadas com base em ${ph(S.baseQtd, "memória de cálculo do quantitativo")}, conforme detalhado na tabela de itens do Termo de Referência.`),
    ...sec("VI – ESTIMATIVA DE PREÇOS OU PREÇOS REFERENCIAIS", `${M.etp_precos} O valor total estimado é de ${tot}.`),
    ...sec("VII – JUSTIFICATIVA PARA O PARCELAMENTO (OU NÃO) DA SOLUÇÃO", parcel),
    ...sec("VIII – CONTRATAÇÕES CORRELATAS E/OU INTERDEPENDENTES", "Não foram identificadas contratações correlatas ou interdependentes necessárias à viabilidade desta demanda."),
    ...sec("IX – ALINHAMENTO AO PLANO DE CONTRATAÇÕES ANUAL", S.pcaNaoConsta
        ? ((S.pcaJustificativa || "").trim() || "[PREENCHER: justificativa da não previsão da demanda no PCA]")
        : S.pca.trim()
        ? `A demanda está prevista no Plano de Contratações Anual de ${(S.dataPretendida || "").slice(0, 4) || "[PREENCHER: ano]"}, item nº ${S.pca.trim()}.`
        : "[PREENCHER: a demanda consta do PCA do exercício, item nº ..., ou justificativa da não previsão]"),
    ...sec("X – RESULTADOS PRETENDIDOS", `Pretende-se ${ph(S.motivo, "resultado pretendido")}, com economicidade e melhor aproveitamento dos recursos humanos, materiais e financeiros disponíveis.`),
    ...sec("XI – PROVIDÊNCIAS PARA ADEQUAÇÃO DO AMBIENTE DO ÓRGÃO", "Não há necessidade de adequações estruturais no ambiente do órgão para a execução do objeto contratado."),
    ...sec("XII – IMPACTOS AMBIENTAIS", "Não se vislumbram impactos ambientais significativos decorrentes da contratação. A contratada deverá dar destinação ambientalmente adequada às embalagens e resíduos, nos termos da Lei nº 12.305/2010 (Política Nacional de Resíduos Sólidos)."),
    ...sec("XIII – POSICIONAMENTO CONCLUSIVO", "Com base nos elementos levantados neste Estudo, a equipe de planejamento declara **VIÁVEL** a presente contratação, por ser adequada ao atendimento da necessidade a que se destina e economicamente vantajosa para a Administração."),
    { t: "h", text: "ETAPA 2: GERENCIAMENTO DE RISCOS" },
    { t: "p", text: "Assim como toda contratação, vislumbram-se alguns riscos na presente contratação. Não se incluem neste mapa de riscos aqueles voltados à gestão do contrato e à aquisição do objeto, mas apenas os que atingem o processo até a formalização da contratação." },
    ...risco("01", "Não haver disponibilidade orçamentária", "Baixa", "Alto", "Não ocorrer a aquisição.", "Garantir os recursos com provisionamento de créditos para a aquisição.", "Equipe de Planejamento da Contratação", "Buscar remanejamento de valores previstos no orçamento anual, acompanhado da revisão da necessidade imediata dos itens demandados.", "Equipe de Planejamento da Contratação"),
    ...risco("02", "Especificação insuficiente do objeto", "Média", "Alto", "Objeto fornecido de forma a não abranger todas as necessidades institucionais.", "Revisão de cada cláusula de descrição dos itens e dos requisitos da contratação.", "Equipe de Planejamento da Contratação", "Estudar o grau de insuficiência dos itens e refletir sobre a vantajosidade e possíveis adequações.", "Equipe de Fiscalização"),
    ...risco("03", "Atraso na conclusão do processo de contratação", "Média", "Alto", "Não atendimento à demanda no prazo necessário.", "Dar celeridade e confeccionar de forma assertiva os documentos do processo.", "Divisão de Obtenção / Equipe de Planejamento", "Corrigir e/ou substituir de forma célere os eventuais erros do processo para possibilitar a continuidade.", "Divisão de Obtenção / Equipe de Planejamento"),
    { t: "sub", text: "Matriz de riscos" },
    { t: "table", head: ["Probabilidade \\ Impacto", "Baixo", "Médio", "Alto"], w: [28, 24, 24, 24], rows: [["Alta", "", "", ""], ["Média", "", "", "Risco 02, Risco 03"], ["Baixa", "", "", "Risco 01"]] },
    { t: "local", text: `${ph(o.cidade, "cidade")}, na data da assinatura.` },
    { t: "h", text: "Equipe de Planejamento e Fiscalização" },
    { t: "table", head: ["Nome", "Telefone", "E-mail", "Membro da Equipe de Fiscalização"], w: [32, 18, 32, 18],
      rows: [[ph(o.eq1, "nome"), o.telefone || "", mail(o.eq1mail), "SIM"], [ph(o.eq2, "nome"), o.telefone || "", mail(o.eq2mail), "SIM"]] },
    { t: "signs", rot: "Elaborado por:", items: [
      assinatura(null, o.eq1, o.eq1Posto, "Equipe de Planejamento da Contratação", "NOME DO INTEGRANTE DA EQUIPE 1"),
      assinatura(null, o.eq2, o.eq2Posto, "Equipe de Planejamento da Contratação", "NOME DO INTEGRANTE DA EQUIPE 2")] },
    assinatura("Aprovado por:", o.ordNome, o.ordPosto, "Ordenador de Despesa", "NOME DO ORDENADOR DE DESPESAS")
  ];
}

function Num() {
  let c = [0];
  return {
    sec(t) { c = [c[0] + 1]; return { t: "h", text: `${c[0]}. ${t}` }; },
    it(lvl, text) { c.length = lvl + 1; c[lvl] = (c[lvl] || 0) + 1; return { t: "item", lvl, num: c.join(".") + ".", text }; }
  };
}
const alinea = (l, text) => ({ t: "item", lvl: "al", num: l + ")", text });
const sub = text => ({ t: "sub", text });

function buildTR(calc, M) {
  const o = S.org, N = Num(), obj = ph(S.objeto, "objeto");
  const acimaLimite = calc.completo && calc.total > LIMITE_DISPENSA;
  const srp = S.mod === "pregao" && S.srp;
  const linhas = calc.rows.map(r => [String(r.n), ph(r.desc, "descrição"), ph(r.catmat, "CATMAT"), ph(r.un, "UF"),
    isFinite(r.q) ? fmtQtd(r.q) : "[PREENCHER]", isFinite(r.v) ? `R$ ${brl(r.v)}` : "R$ [PREENCHER]", isFinite(r.tot) ? `R$ ${brl(r.tot)}` : "R$ [PREENCHER]"]);
  linhas.push(["", "**TOTAL PREVISTO PARA AQUISIÇÃO**", "", "", "", "", calc.completo ? `**R$ ${brl(calc.total)}**` : "**R$ [PREENCHER]**"]);
  const tot = calc.completo ? `R$ ${brl(calc.total)} (${reaisExtenso(calc.total)})` : "R$ [PREENCHER] ([PREENCHER: por extenso])";
  const b = [...cabecalho("TERMO DE REFERÊNCIA", "Anexo I")];
  const add = (...x) => b.push(...x);

  add(N.sec("CONDIÇÕES GERAIS DA CONTRATAÇÃO"),
    N.it(1, `A presente contratação tem por objeto a **${obj}**, para atender às necessidades **${o.setorArtigo} ${o.omArtigo}**, conforme especificações, quantidades e demais condições estabelecidas neste instrumento, visando **${ph(S.motivo, "finalidade")}**, de acordo com a tabela abaixo e em conformidade com as exigências aqui descritas.`),
    { t: "table", head: ["ITEM", "DESCRIÇÃO DO OBJETO", "CATMAT", "UF", "QTD", "VALOR UNITÁRIO", "VALOR TOTAL"], w: [6, 34, 11, 10, 8, 15, 16], numCols: [4, 5, 6], rows: linhas },
    N.it(1, "O objeto desta contratação não se enquadra como bem de luxo, conforme Decreto nº 10.818, de 27 de setembro de 2021."),
    N.it(1, M.tr_vigencia));
  if (srp) add(N.it(1, M.tr_srp_item));

  add(N.sec("FUNDAMENTAÇÃO E DESCRIÇÃO DA NECESSIDADE DA CONTRATAÇÃO"),
    N.it(1, ph(S.necessidade, "mesma justificativa central do DFD e do ETP")),
    N.it(1, "A fundamentação da contratação e de seus quantitativos encontra-se pormenorizada no Estudo Técnico Preliminar, apêndice deste Termo de Referência."));

  add(N.sec("DESCRIÇÃO DA SOLUÇÃO COMO UM TODO CONSIDERADO O CICLO DE VIDA DO OBJETO E ESPECIFICAÇÃO DO PRODUTO"),
    N.it(1, S.requisitos.trim() || "Os bens deverão atender integralmente às especificações da tabela do item 1.1, ser novos e de primeira qualidade, e estar acondicionados em embalagens originais e adequadas ao transporte e à armazenagem."),
    N.it(1, M.tr_solucao + (S.perecivel ? ` Será observada, no recebimento, a validade mínima de ${prazo(S.validadeMeses, "meses")}.` : "")));

  add(N.sec("REQUISITOS DA CONTRATAÇÃO"),
    sub("Sustentabilidade"), N.it(1, "Além dos critérios de sustentabilidade eventualmente inseridos na descrição do objeto, devem ser atendidos os requisitos que se baseiam no Guia Nacional de Contratações Sustentáveis, no que couber, em especial a destinação ambientalmente adequada das embalagens."),
    sub("Indicação de marcas ou modelos"), N.it(1, "Não haverá indicação de marcas ou modelos."),
    sub("Da exigência de amostra"), N.it(1, "Não serão exigidas amostras. Durante a fase de apresentação das propostas será solicitada foto do objeto ofertado."),
    sub("Da exigência de carta de solidariedade"), N.it(1, "Não será exigida carta de solidariedade."),
    sub("Subcontratação"), N.it(1, "Não será admitida a subcontratação do objeto contratual."),
    sub("Garantia da contratação"), N.it(1, "Não haverá exigência da garantia da contratação dos arts. 96 e seguintes da Lei nº 14.133, de 2021, pelas razões constantes do Estudo Técnico Preliminar."));

  add(N.sec("MODELO DE EXECUÇÃO DO OBJETO"),
    sub("Condições de entrega"),
    N.it(1, `O prazo de entrega dos bens é de ${prazo(S.prazoEntrega, "dias corridos")}, contados do recebimento da Nota de Empenho, ${S.fornecimento === "parcelado" ? "em parcelas, conforme cronograma definido pela Administração" : "preferencialmente em remessa única"}.`),
    N.it(1, "Caso não seja possível a entrega na data assinalada, a empresa deverá comunicar as razões respectivas com pelo menos 02 (dois) dias de antecedência, para que qualquer pleito de prorrogação de prazo seja analisado, ressalvadas situações de caso fortuito e força maior."),
    N.it(1, `Os bens deverão ser entregues no seguinte endereço: ${ph(o.endereco, "endereço")}. O horário de funcionamento da unidade para recebimento é de ${ph(o.horario, "horário")}.`),
    sub("Garantia, manutenção e assistência técnica"),
    N.it(1, "O prazo de garantia é aquele estabelecido na Lei nº 8.078, de 11 de setembro de 1990 (Código de Defesa do Consumidor)."),
    N.it(1, "As comunicações entre o órgão e a contratada devem ser realizadas por escrito sempre que o ato exigir tal formalidade, admitindo-se o uso de mensagem eletrônica para esse fim."));

  add(N.sec("MODELO DE GESTÃO DO CONTRATO"),
    N.it(1, "O contrato deverá ser executado fielmente pelas partes, de acordo com as cláusulas avençadas e as normas da Lei nº 14.133, de 2021, e cada parte responderá pelas consequências de sua inexecução total ou parcial."),
    N.it(1, "Em caso de impedimento, ordem de paralisação ou suspensão do contrato, o cronograma de execução será prorrogado automaticamente pelo tempo correspondente, anotadas tais circunstâncias mediante simples apostila."),
    N.it(1, "O órgão poderá convocar representante da empresa para adoção de providências que devam ser cumpridas de imediato."),
    N.it(1, "Após a assinatura do contrato ou instrumento equivalente, o órgão poderá convocar o representante da empresa contratada para reunião inicial para apresentação do plano de fiscalização, que conterá informações acerca das obrigações contratuais, dos mecanismos de fiscalização, das estratégias para execução do objeto, do método de aferição dos resultados e das sanções aplicáveis, dentre outros."),
    sub("Fiscalização"),
    N.it(1, "A execução do contrato deverá ser acompanhada e fiscalizada pelo(s) fiscal(is) do contrato, ou pelos respectivos substitutos."),
    sub("Fiscalização técnica"),
    N.it(1, "O fiscal técnico do contrato acompanhará a execução do contrato, para que sejam cumpridas todas as condições estabelecidas no contrato, de modo a assegurar os melhores resultados para a Administração."),
    N.it(1, "O fiscal técnico anotará no histórico de gerenciamento do contrato todas as ocorrências relacionadas à execução, com a descrição do que for necessário para a regularização das faltas ou dos defeitos observados."),
    N.it(1, "Identificada qualquer inexatidão ou irregularidade, o fiscal técnico emitirá notificações para a correção da execução do contrato, determinando prazo para a correção."),
    N.it(1, "O fiscal técnico informará ao gestor do contrato, em tempo hábil, a situação que demandar decisão ou adoção de medidas que ultrapassem sua competência, para que adote as medidas necessárias e saneadoras, se for o caso."),
    N.it(1, "No caso de ocorrências que possam inviabilizar a execução do contrato nas datas aprazadas, o fiscal técnico comunicará o fato imediatamente ao gestor do contrato."),
    N.it(1, "O fiscal técnico comunicará ao gestor do contrato, em tempo hábil, o término do contrato sob sua responsabilidade, com vistas à renovação tempestiva ou à prorrogação contratual."),
    sub("Fiscalização administrativa"),
    N.it(1, "O fiscal administrativo verificará a manutenção das condições de habilitação da contratada, acompanhará o empenho, o pagamento, as garantias, as glosas e a formalização de apostilamento e termos aditivos, solicitando quaisquer documentos comprobatórios pertinentes, caso necessário."),
    N.it(1, "Caso ocorra descumprimento das obrigações contratuais, o fiscal administrativo atuará tempestivamente na solução do problema, reportando ao gestor do contrato para que tome as providências cabíveis, quando ultrapassar a sua competência."),
    N.it(1, "A fiscalização de que trata esta cláusula não exclui nem reduz a responsabilidade do Contratado, inclusive perante terceiros, por qualquer irregularidade, ainda que resultante de imperfeições técnicas, vícios redibitórios ou emprego de material inadequado ou de qualidade inferior, e, na ocorrência desta, não implica corresponsabilidade da Contratante ou de seus agentes, gestores e fiscais."),
    sub("Gestor do contrato"),
    N.it(1, "Cabe ao gestor do contrato:"),
    N.it(2, "coordenar a atualização do processo de acompanhamento e fiscalização do contrato, contendo todos os registros formais da execução no histórico de gerenciamento, a exemplo da ordem de serviço, do registro de ocorrências, das alterações e das prorrogações contratuais;"),
    N.it(2, "acompanhar os registros realizados pelos fiscais de todas as ocorrências relacionadas à execução do contrato e as medidas adotadas, informando à autoridade superior aquelas que ultrapassarem a sua competência;"),
    N.it(2, "acompanhar a manutenção das condições de habilitação da contratada, para fins de empenho de despesa e pagamento, e anotar os problemas que obstem o fluxo normal da liquidação e do pagamento da despesa no relatório de riscos eventuais;"),
    N.it(2, "emitir documento comprobatório da avaliação realizada pelos fiscais quanto ao cumprimento de obrigações assumidas pelo Contratado, com menção ao seu desempenho na execução contratual, baseado em indicadores objetivamente definidos e aferidos, e a eventuais penalidades aplicadas, devendo constar do cadastro de atesto de cumprimento de obrigações;"),
    N.it(2, "tomar providências para a formalização de processo administrativo de responsabilização para fins de aplicação de sanções, a ser conduzido pela comissão de que trata o art. 158 da Lei nº 14.133, de 2021, ou pelo agente ou setor com competência para tal, conforme o caso;"),
    N.it(2, "elaborar relatório final com informações sobre a consecução dos objetivos que tenham justificado a contratação e eventuais condutas a serem adotadas para o aprimoramento das atividades da Administração; e"),
    N.it(2, "enviar a documentação pertinente ao setor de contratos para a formalização dos procedimentos de liquidação e pagamento, no valor dimensionado pela fiscalização e gestão nos termos do contrato."));

  add(N.sec("INFRAÇÕES E SANÇÕES ADMINISTRATIVAS"),
    N.it(1, "Comete infração administrativa, nos termos da Lei nº 14.133, de 2021, o Contratado que:"),
    alinea("a", "der causa à inexecução parcial do contrato;"),
    alinea("b", "der causa à inexecução parcial do contrato que cause grave dano à Administração ou ao funcionamento dos serviços públicos ou ao interesse coletivo;"),
    alinea("c", "der causa à inexecução total do contrato;"),
    alinea("d", "ensejar o retardamento da execução ou da entrega do objeto da contratação sem motivo justificado;"),
    alinea("e", "apresentar documentação falsa ou prestar declaração falsa durante a execução do contrato;"),
    alinea("f", "praticar ato fraudulento na execução do contrato;"),
    alinea("g", "comportar-se de modo inidôneo ou cometer fraude de qualquer natureza;"),
    alinea("h", "praticar ato lesivo previsto no art. 5º da Lei nº 12.846, de 1º de agosto de 2013."),
    N.it(1, "Serão aplicadas ao Contratado que incorrer nas infrações acima descritas as seguintes sanções:"),
    N.it(2, "Advertência, quando o Contratado der causa à inexecução parcial do contrato, sempre que não se justificar a imposição de penalidade mais grave (art. 156, § 2º, da Lei nº 14.133, de 2021);"),
    N.it(2, "Impedimento de licitar e contratar, quando praticadas as condutas descritas nas alíneas \"b\", \"c\" e \"d\" do subitem acima, sempre que não se justificar a imposição de penalidade mais grave (art. 156, § 4º);"),
    N.it(2, "Declaração de inidoneidade para licitar e contratar, quando praticadas as condutas descritas nas alíneas \"e\", \"f\", \"g\" e \"h\" do subitem acima, bem como nas alíneas \"b\", \"c\" e \"d\", que justifiquem a imposição de penalidade mais grave (art. 156, § 5º);"),
    N.it(2, "Multa:"),
    N.it(3, "moratória de 0,5% (cinco décimos por cento) por dia de atraso injustificado sobre o valor da parcela inadimplida, até o limite de 30 (trinta) dias;"),
    N.it(3, "compensatória de 0,5% (cinco décimos por cento) sobre o valor total do contrato, no caso de inexecução total do objeto;"),
    N.it(3, "o atraso superior ao limite do subitem 7.2.4.1 caracterizará inexecução total do objeto, autorizando a Administração a promover a extinção do contrato (art. 137, I, da Lei nº 14.133, de 2021)."),
    N.it(1, "A aplicação das sanções previstas neste Termo de Referência não exclui, em hipótese alguma, a obrigação de reparação integral do dano causado ao Contratante."),
    N.it(1, "Todas as sanções previstas neste Termo de Referência poderão ser aplicadas cumulativamente com a multa."),
    N.it(1, "Antes da aplicação da multa será facultada a defesa do interessado no prazo de 15 (quinze) dias úteis, contado da data de sua intimação."),
    N.it(1, "Se a multa aplicada e as indenizações cabíveis forem superiores ao valor do pagamento eventualmente devido pelo Contratante ao Contratado, além da perda desse valor, a diferença será cobrada judicialmente."),
    N.it(1, "A multa poderá ser recolhida administrativamente no prazo máximo de 10 (dez) dias, a contar da data do recebimento da comunicação enviada pela autoridade competente."),
    N.it(1, "A aplicação das sanções realizar-se-á em processo administrativo que assegure o contraditório e a ampla defesa ao Contratado, observando-se o procedimento previsto no art. 158 da Lei nº 14.133, de 2021, para as penalidades de impedimento de licitar e contratar e de declaração de inidoneidade."),
    N.it(2, "Para a garantia da ampla defesa e do contraditório, as notificações serão enviadas eletronicamente para os endereços de e-mail informados na proposta comercial e os cadastrados pela empresa no SICAF."),
    N.it(2, "Os endereços de e-mail informados na proposta e/ou cadastrados no SICAF serão considerados de uso contínuo da empresa, não cabendo alegação de desconhecimento das comunicações a eles comprovadamente enviadas."),
    N.it(1, "Na aplicação das sanções serão considerados: a natureza e a gravidade da infração cometida; as peculiaridades do caso concreto; as circunstâncias agravantes ou atenuantes; os danos que dela provierem para o Contratante; e a implantação ou o aperfeiçoamento de programa de integridade, conforme normas e orientações dos órgãos de controle."),
    N.it(1, "Os atos previstos como infrações administrativas na Lei nº 14.133, de 2021, que também sejam tipificados como atos lesivos na Lei nº 12.846, de 2013, serão apurados e julgados conjuntamente, nos mesmos autos, observados o rito procedimental e a autoridade competente definidos na referida Lei."),
    N.it(1, "A personalidade jurídica do Contratado poderá ser desconsiderada sempre que utilizada com abuso do direito para facilitar, encobrir ou dissimular a prática dos atos ilícitos previstos neste Termo de Referência ou para provocar confusão patrimonial, estendendo-se os efeitos das sanções aos administradores e sócios com poderes de administração, à pessoa jurídica sucessora ou à empresa do mesmo ramo com relação de coligação ou controle, observados o contraditório, a ampla defesa e a obrigatoriedade de análise jurídica prévia."),
    N.it(1, "O Contratante deverá, no prazo máximo de 15 (quinze) dias úteis, contado da data de aplicação da sanção, informar e manter atualizados os dados relativos às sanções aplicadas, para fins de publicidade no Cadastro Nacional de Empresas Inidôneas e Suspensas (CEIS) e no Cadastro Nacional de Empresas Punidas (CNEP)."),
    N.it(1, "As penalidades serão obrigatoriamente registradas no SICAF."),
    N.it(1, "As sanções de impedimento de licitar e contratar e de declaração de inidoneidade são passíveis de reabilitação na forma do art. 163 da Lei nº 14.133, de 2021."),
    N.it(1, "Os débitos do Contratado para com a Administração, resultantes de multa administrativa e/ou indenizações, não inscritos em dívida ativa, poderão ser compensados, total ou parcialmente, com os créditos devidos pelo órgão decorrentes deste ou de outros contratos administrativos que o Contratado possua com o mesmo órgão, na forma da Instrução Normativa SEGES/ME nº 26, de 13 de abril de 2022."));

  add(N.sec("CRITÉRIOS DE MEDIÇÃO E DE PAGAMENTO"), sub("Recebimento"),
    N.it(1, "Os bens serão recebidos provisoriamente, de forma sumária, no ato da entrega, juntamente com a nota fiscal ou instrumento de cobrança equivalente, pelo responsável pelo acompanhamento e fiscalização do contrato, para efeito de posterior verificação de sua conformidade com as especificações constantes do Termo de Referência e da proposta."),
    N.it(1, "Os bens poderão ser rejeitados, no todo ou em parte, inclusive antes do recebimento provisório, quando em desacordo com as especificações constantes do Termo de Referência e da proposta, devendo ser substituídos no prazo de 10 (dez) dias, a contar da notificação da contratada, às suas custas, sem prejuízo da aplicação das penalidades."),
    N.it(1, "O recebimento definitivo ocorrerá no prazo de 10 (dez) dias úteis, a contar do recebimento da nota fiscal ou instrumento de cobrança equivalente pela Administração, após a verificação da qualidade e quantidade do material e consequente aceitação mediante termo detalhado."));
  if (!acimaLimite) add(N.it(1, "Para as contratações decorrentes de despesas cujos valores não ultrapassem o limite de que trata o inciso II do art. 75 da Lei nº 14.133, de 2021, o prazo máximo para o recebimento definitivo será de até 10 (dez) dias úteis."));
  add(N.it(1, "O prazo para recebimento definitivo poderá ser excepcionalmente prorrogado, de forma justificada, por igual período, quando houver necessidade de diligências para a aferição do atendimento das exigências contratuais."),
    N.it(1, "No caso de controvérsia sobre a execução do objeto, quanto à dimensão, qualidade e quantidade, deverá ser observado o teor do art. 143 da Lei nº 14.133, de 2021, comunicando-se à empresa para emissão de nota fiscal quanto à parcela incontroversa, para efeito de liquidação e pagamento."),
    N.it(1, "O prazo para a solução, pelo Contratado, de inconsistências na execução do objeto ou de saneamento da nota fiscal, verificadas pela Administração durante a análise prévia à liquidação de despesa, não será computado para os fins do recebimento definitivo."),
    N.it(1, "O recebimento provisório ou definitivo não excluirá a responsabilidade civil pela solidez e pela segurança dos bens nem a responsabilidade ético-profissional pela perfeita execução do contrato."),
    sub("Liquidação"),
    N.it(1, "Recebida a nota fiscal ou documento de cobrança equivalente, correrá o prazo de 10 (dez) dias úteis para fins de liquidação, prorrogáveis por igual período, nos termos do art. 7º, § 3º, da Instrução Normativa SEGES/ME nº 77/2022."));
  if (!acimaLimite) add(N.it(1, "O prazo de que trata o item anterior será reduzido à metade, mantendo-se a possibilidade de prorrogação, no caso de contratações decorrentes de despesas cujos valores não ultrapassem o limite de que trata o inciso II do art. 75 da Lei nº 14.133, de 2021."));
  add(N.it(1, "Para fins de liquidação, o setor competente deverá verificar se a nota fiscal ou instrumento de cobrança equivalente expressa os elementos necessários e essenciais do documento, tais como: o prazo de validade; a data da emissão; os dados do contrato e do órgão contratante; o período de execução; o valor a pagar; e eventual destaque do valor de retenções tributárias cabíveis."),
    N.it(1, "Havendo erro na apresentação da nota fiscal ou circunstância que impeça a liquidação da despesa, esta ficará sobrestada até que o Contratado providencie as medidas saneadoras, reiniciando-se o prazo após a comprovação da regularização, sem ônus ao Contratante."),
    N.it(1, "A nota fiscal deverá ser obrigatoriamente acompanhada da comprovação da regularidade fiscal, constatada por meio de consulta on-line ao SICAF ou, na impossibilidade de acesso, mediante consulta aos sítios eletrônicos oficiais ou à documentação mencionada no art. 68 da Lei nº 14.133, de 2021."),
    N.it(1, "Constatada, junto ao SICAF, situação de irregularidade do Contratado, será providenciada sua notificação, por escrito, para que, no prazo de 5 (cinco) dias úteis, regularize sua situação ou apresente defesa, prazo prorrogável uma vez por igual período. Não havendo regularização, serão comunicados os órgãos responsáveis pela fiscalização da regularidade fiscal e, persistindo a irregularidade, adotadas as medidas necessárias à extinção contratual, assegurada a ampla defesa. Havendo efetiva execução do objeto, os pagamentos serão realizados normalmente até a decisão."),
    sub("Prazo e forma de pagamento"),
    N.it(1, "O pagamento será efetuado no prazo de até 15 (quinze) dias úteis contados da finalização da liquidação da despesa, nos termos da Instrução Normativa SEGES/ME nº 77, de 2022."),
    N.it(1, "No caso de atraso pelo Contratante, os valores devidos serão atualizados monetariamente entre o termo final do prazo de pagamento e a data de sua efetiva realização, mediante aplicação do índice IPCA."),
    N.it(1, "O pagamento será realizado por meio de ordem bancária, para crédito em banco, agência e conta corrente indicados pelo Contratado, considerando-se data do pagamento o dia em que constar como emitida a ordem bancária."),
    N.it(1, "Quando do pagamento, será efetuada a retenção tributária prevista na legislação aplicável. O Contratado optante pelo Simples Nacional não sofrerá a retenção quanto aos tributos abrangidos por aquele regime, mediante comprovação por documento oficial."),
    N.it(1, "Não haverá antecipação de pagamento nem cessão de crédito."),
    N.it(1, "Não haverá reajuste para esta contratação."));

  add(N.sec("FORMA E CRITÉRIOS DE SELEÇÃO DO FORNECEDOR E FORMA DE FORNECIMENTO"),
    sub("Forma de seleção e critério de julgamento da proposta"), N.it(1, M.tr_selecao),
    sub("Forma de fornecimento"), N.it(1, `O fornecimento do objeto será ${S.fornecimento === "parcelado" ? "parcelado, conforme cronograma definido pela Administração" : "integral"}.`),
    sub("Critérios de aceitabilidade de preços"), N.it(1, M.tr_aceitabilidade),
    sub("Exigências de habilitação"));
  if (S.mod === "adesao" && S.habReduzida) {
    add(N.it(1, "A habilitação do fornecedor foi verificada no certame de origem; será exigida a manutenção das condições de habilitação, mediante consulta ao SICAF, para a contratação e o pagamento."));
  } else {
    add(N.it(1, "Para fins de habilitação, deverá o interessado comprovar os seguintes requisitos:"),
      sub("Habilitação jurídica"),
      N.it(1, "Pessoa física: cédula de identidade (RG) ou documento equivalente que, por força de lei, tenha validade para fins de identificação em todo o território nacional;"),
      N.it(1, "Empresário individual: inscrição no Registro Público de Empresas Mercantis, a cargo da Junta Comercial da respectiva sede;"),
      N.it(1, "Microempreendedor Individual – MEI: Certificado da Condição de Microempreendedor Individual – CCMEI, cuja aceitação ficará condicionada à verificação da autenticidade no sítio https://www.gov.br/empresas-e-negocios/pt-br/empreendedor;"),
      N.it(1, "Sociedade empresária ou sociedade limitada unipessoal – SLU: inscrição do ato constitutivo, estatuto ou contrato social no Registro Público de Empresas Mercantis, a cargo da Junta Comercial da respectiva sede, acompanhada de documento comprobatório de seus administradores;"),
      N.it(1, "Sociedade empresária estrangeira: portaria de autorização de funcionamento no Brasil, publicada no Diário Oficial da União e arquivada na Junta Comercial da unidade federativa onde se localizar a filial, agência, sucursal ou estabelecimento, conforme Instrução Normativa DREI/ME nº 77, de 18 de março de 2020;"),
      N.it(1, "Sociedade simples: inscrição do ato constitutivo no Registro Civil de Pessoas Jurídicas do local de sua sede, acompanhada de documento comprobatório de seus administradores;"),
      N.it(1, "Filial, sucursal ou agência de sociedade simples ou empresária: inscrição do ato constitutivo da filial, sucursal ou agência no Registro Civil das Pessoas Jurídicas ou no Registro Público de Empresas Mercantis onde opera, com averbação no registro onde tem sede a matriz;"),
      N.it(1, "Sociedade cooperativa: ata de fundação e estatuto social, com a ata da assembleia que o aprovou, devidamente arquivado na Junta Comercial ou inscrito no Registro Civil das Pessoas Jurídicas da respectiva sede, além do registro de que trata o art. 107 da Lei nº 5.764, de 16 de dezembro de 1971."),
      N.it(1, "Os documentos apresentados deverão estar acompanhados de todas as alterações ou da consolidação respectiva."),
      sub("Habilitação fiscal, social e trabalhista"),
      N.it(1, "Prova de inscrição no Cadastro Nacional de Pessoas Jurídicas ou no Cadastro de Pessoas Físicas, conforme o caso;"),
      N.it(1, "Prova de regularidade fiscal perante a Fazenda Nacional, mediante certidão expedida conjuntamente pela Secretaria da Receita Federal do Brasil e pela Procuradoria-Geral da Fazenda Nacional, referente a todos os créditos tributários federais e à Dívida Ativa da União, inclusive os relativos à Seguridade Social, nos termos da Portaria Conjunta nº 1.751, de 2 de outubro de 2014;"),
      N.it(1, "Prova de regularidade com o Fundo de Garantia do Tempo de Serviço (FGTS);"),
      N.it(1, "Prova de inexistência de débitos inadimplidos perante a Justiça do Trabalho, mediante certidão negativa ou positiva com efeito de negativa, nos termos do Título VII-A da Consolidação das Leis do Trabalho;"),
      N.it(1, "Prova de inscrição no cadastro de contribuintes estadual ou distrital relativo ao domicílio ou sede do fornecedor, pertinente ao seu ramo de atividade e compatível com o objeto contratual;"),
      N.it(1, "Prova de regularidade com a Fazenda Estadual ou Distrital do domicílio ou sede do fornecedor, relativa à atividade em cujo exercício contrata ou concorre;"),
      N.it(1, "Caso o fornecedor seja considerado isento dos tributos relacionados ao objeto contratual, deverá comprovar tal condição mediante declaração da Fazenda respectiva do seu domicílio ou sede, ou outra equivalente, na forma da lei;"),
      N.it(1, "O fornecedor enquadrado como microempreendedor individual que pretenda auferir os benefícios do tratamento diferenciado previstos na Lei Complementar nº 123, de 2006, estará dispensado da prova de inscrição nos cadastros de contribuintes estadual e municipal."),
      sub("Qualificação econômico-financeira"),
      N.it(1, "Certidão negativa de insolvência civil expedida pelo distribuidor do domicílio ou sede do interessado, caso se trate de pessoa física, desde que admitida a sua participação, ou de sociedade simples;"),
      N.it(1, "Certidão negativa de falência expedida pelo distribuidor da sede do fornecedor;"),
      N.it(1, "Balanço patrimonial, demonstração de resultado de exercício e demais demonstrações contábeis dos dois últimos exercícios sociais, comprovando índices de Liquidez Geral (LG), Liquidez Corrente (LC) e Solvência Geral (SG) superiores a 1 (um), em que: LG = (Ativo Circulante + Realizável a Longo Prazo) ÷ (Passivo Circulante + Passivo Não Circulante); SG = Ativo Total ÷ (Passivo Circulante + Passivo Não Circulante); LC = Ativo Circulante ÷ Passivo Circulante."),
      N.it(1, "Caso a empresa apresente resultado inferior ou igual a 1 (um) em qualquer dos índices acima, será exigido, para fins de habilitação, patrimônio líquido mínimo de [PREENCHER: 1% a 10%] do valor total estimado da contratação."),
      N.it(1, "Os documentos referidos acima limitar-se-ão ao último exercício no caso de a pessoa jurídica ter sido constituída há menos de 2 (dois) anos, e as empresas criadas no exercício financeiro da contratação poderão substituir os demonstrativos contábeis pelo balanço de abertura. O atendimento dos índices deverá ser atestado mediante declaração assinada por profissional habilitado da área contábil."),
      sub("Qualificação técnica"),
      N.it(1, "Não será exigida qualificação técnica."),
      sub("Disposições gerais sobre habilitação"),
      N.it(1, "Não serão aceitos documentos de habilitação com indicação de CNPJ/CPF diferentes, salvo aqueles legalmente permitidos. Se o fornecedor for a matriz, todos os documentos deverão estar em nome da matriz; se for a filial, em nome da filial, exceto os documentos que, pela própria natureza, forem emitidos somente em nome da matriz."),
      N.it(1, "Serão aceitos registros de CNPJ de fornecedor matriz e filial com diferenças de números de documentos pertinentes à CND e ao CRF/FGTS, quando for comprovada a centralização do recolhimento dessas contribuições."));
  }

  add(N.sec("ESTIMATIVAS DO VALOR DA CONTRATAÇÃO"),
    N.it(1, `O custo estimado total da contratação, que corresponde ao valor máximo aceitável, é de ${tot}, conforme custos unitários apostos na tabela do item 1.1 acima.${S.mod === "pregao" && S.sigiloso ? " O valor estimado terá caráter sigiloso até o encerramento da fase de lances (art. 24 da Lei nº 14.133/2021)." : ""}`),
    N.it(1, "A estimativa de custo levou em consideração o risco envolvido na contratação e sua alocação entre Contratante e Contratado."));
  if (srp) add(N.it(1, "Em caso de registro de preços, os preços registrados poderão ser alterados ou atualizados em decorrência de eventual redução dos preços praticados no mercado ou de fato que eleve o custo dos bens registrados, nas hipóteses do art. 124, II, \"d\", da Lei nº 14.133, de 2021, ou de criação, alteração ou extinção de tributos ou encargos legais com comprovada repercussão sobre os preços registrados."));

  add(N.sec("ADEQUAÇÃO ORÇAMENTÁRIA"),
    N.it(1, "As despesas decorrentes da presente contratação correrão à conta de recursos específicos consignados no Orçamento Geral da União."),
    N.it(1, srp ? "A dotação orçamentária será indicada no momento da formalização de cada contratação decorrente da ata, conforme o art. 17, § 1º, do Decreto nº 11.462/2023:" : "A contratação será atendida pela seguinte dotação:"),
    { t: "list", items: [`Gestão/Unidade: ${ph(o.ug, "UG")}`, `Fonte de recursos: ${ph(o.fonte, "fonte")}`, `Programa de trabalho: ${ph(o.ptres, "programa de trabalho")}`, `Elemento de despesa: ${ph(o.nd, "elemento de despesa")}`, `Plano interno: ${ph(o.pi, "plano interno")}`] },
    { t: "local", text: `${ph(o.cidade, "cidade")}, na data da assinatura.` },
    assinatura("Elaborado por:", o.reqNome, o.reqPosto, o.reqFuncao, "NOME DO REQUISITANTE"),
    assinatura("Aprovado por:", o.ordNome, o.ordPosto, "Ordenador de Despesa", "NOME DO ORDENADOR DE DESPESAS"),
    { t: "foot", text: "Elaborado com base no Modelo de Termo de Referência – Aquisições – Licitação e Contratação Direta (Lei nº 14.133/2021) da Câmara Nacional de Modelos de Licitações e Contratos da CGU/AGU" });
  return b;
}

/* ---------- alertas ---------- */
function buildAlerts(calc) {
  const a = [], t = calc.total;
  if (S.mod === "dispensa") {
    if (calc.completo && t > LIMITE_DISPENSA) a.push(["err", `O total de R$ ${brl(t)} ultrapassa o limite da dispensa por valor (R$ ${brl(LIMITE_DISPENSA)}, art. 75, II). Reduza os itens ou use pregão.`]);
    else if (calc.completo && t > LIMITE_DISPENSA * 0.8) a.push(["warn", `O total usa ${Math.round(t / LIMITE_DISPENSA * 100)}% do limite da dispensa. Some as despesas de mesma natureza já realizadas no exercício pela UG para afastar fracionamento (art. 75, § 1º).`]);
    else if (calc.completo) a.push(["ok", `Dentro do limite da dispensa (R$ ${brl(LIMITE_DISPENSA)}). Confira o somatório do exercício para objetos de mesma natureza (art. 75, § 1º).`]);
  }
  if (S.mod === "pregao") {
    if (calc.completo && t <= LIMITE_DISPENSA && !S.srp) a.push(["warn", `O total cabe no limite da dispensa (R$ ${brl(LIMITE_DISPENSA)}). Avalie se a dispensa eletrônica atende com menos prazo.`]);
    if (S.srp) a.push(["ok", `SRP com fundamento no art. 3º, ${S.srpHipotese}, do Decreto nº 11.462/2023. Lembre-se da IRP antes da publicação.`]);
  }
  if (S.mod === "adesao") {
    if (!S.ataFederal) a.push(["err", "Confirme que a ata é de órgão federal: a adesão a ata estadual, distrital ou municipal não é permitida a órgão federal (art. 86, § 8º)."]);
    const hoje = new Date().toISOString().slice(0, 10), val = validadeAta();
    if (S.ataProrrogada && !S.ataNovaValidade) a.push(["warn", "Informe a nova validade da ata prorrogada pelo termo aditivo."]);
    if (S.ataProrrogada && !String(S.aditivoNum || "").trim()) a.push(["warn", "Informe o número do termo aditivo de prorrogação da ata."]);
    if (val && val < hoje) a.push(["err", S.ataProrrogada && S.ataNovaValidade
      ? `A ata prorrogada venceu em ${dataBR(val)}. A adesão só é possível com ata vigente.`
      : `A ata venceu em ${dataBR(val)}. A adesão só é possível com ata vigente. Se houve prorrogação, marque "A ata foi prorrogada por termo aditivo" e informe a nova validade.`]);
    if (S.ataProrrogada && S.ataValidade && S.ataNovaValidade) {
      const [y, m, d] = S.ataValidade.split("-");
      const limite = `${+y + 1}-${m}-${d}`;
      if (S.ataNovaValidade <= S.ataValidade) a.push(["warn", "A nova validade deve ser posterior à vigência original da ata."]);
      else if (S.ataNovaValidade > limite) a.push(["warn", `A prorrogação passa de 1 ano além da vigência original (até ${dataBR(limite)}). O art. 84 admite prorrogação por igual período; confira o termo aditivo.`]);
    }
    calc.rows.forEach(r => {
      const reg = num(r.qreg);
      if (isFinite(reg) && isFinite(r.q) && r.q > reg * 0.5) a.push(["err", `Item ${r.n}: ${fmtQtd(r.q)} excede 50% do quantitativo registrado (${fmtQtd(reg)}), limite do art. 86, § 4º.`]);
    });
    if (calc.rows.some(r => !String(r.qreg || "").trim())) a.push(["warn", "Informe a quantidade registrada na ata de cada item para conferir o limite de 50% (art. 86, § 4º)."]);
  }
  if (calc.rows.some(r => !String(r.catmat || "").trim())) a.push(["warn", "Há itens sem código CATMAT. Ele é exigido na tabela do TR."]);
  if (!calc.completo) a.push(["warn", "Há itens sem quantidade ou valor unitário: os totais ficam em branco nos documentos."]);
  return a;
}

/* ---------- checklist ---------- */
const CHECK = {
  dispensa: ["Dispensa eletrônica · art. 75, II", [
    ["Somar as despesas do exercício com objetos de mesma natureza na mesma UG e confirmar que o total fica dentro do limite.", "art. 75, § 1º"],
    ["Fazer a pesquisa de preços e juntar o mapa comparativo.", "IN SEGES/ME nº 65/2021"],
    ["Aprovar DFD, ETP e TR. O ETP é facultativo nesta hipótese, mas a OM o elabora.", "IN 58/2022, art. 14, I"],
    ["Demonstrar a compatibilidade da previsão de recursos orçamentários.", "art. 72, IV"],
    ["Verificar se é necessária manifestação jurídica ou se há parecer referencial aplicável.", "art. 72, III; art. 53, § 5º"],
    ["Divulgar o aviso de dispensa eletrônica no Compras.gov.br, com prazo mínimo de 3 dias úteis para propostas.", "IN SEGES/ME nº 67/2021"],
    ["Conferir habilitação e certidões do vencedor: SICAF, CEIS/CNEP, TCU.", "art. 72, V"],
    ["Obter a autorização da autoridade competente e divulgar o ato no PNCP.", "art. 72, VIII e parágrafo único"]]],
  pregao: ["Pregão eletrônico · art. 29", [
    ["Fazer a pesquisa de preços e decidir se o orçamento será sigiloso.", "IN 65/2021; art. 24"],
    ["Se SRP: divulgar a Intenção de Registro de Preços (IRP), salvo justificativa.", "Decreto nº 11.462/2023, art. 9º"],
    ["Aprovar DFD, ETP e TR e registrar o ETP e o TR no Compras.gov.br.", "art. 18"],
    ["Elaborar minuta de edital e de contrato ou ata pelos modelos da AGU.", "art. 25"],
    ["Submeter o processo à assessoria jurídica.", "art. 53"],
    ["Publicar o edital no PNCP com prazo mínimo de 8 dias úteis (bens, menor preço).", "art. 55, I, “a”"],
    ["Conduzir sessão pública, julgamento, habilitação e recursos; adjudicar e homologar.", "arts. 17 e 71"],
    ["Se SRP: assinar e divulgar a ata no PNCP.", "art. 84"]]],
  adesao: ["Adesão a ata · art. 86, § 2º", [
    ["Confirmar que a ata é de órgão ou entidade federal e está vigente.", "art. 86, § 8º"],
    ["Justificar a vantagem da adesão e demonstrar, por pesquisa, que os preços registrados são compatíveis com o mercado.", "art. 86, § 2º, I e II; IN 65/2021"],
    ["Conferir os limites: até 50% do quantitativo de cada item por aderente e, no total, até o dobro do registrado.", "art. 86, §§ 4º e 5º"],
    ["Solicitar a anuência do órgão gerenciador e o aceite do fornecedor e juntá-los ao processo.", "art. 86, § 2º, III"],
    ["Aprovar DFD, ETP e TR; consultar SICAF, CEIS/CNEP e TCU.", "art. 18"],
    ["Efetivar a contratação em até 90 dias da autorização do gerenciador, dentro da vigência da ata.", "Decreto nº 11.462/2023"]]]
};

/* ---------- renderização HTML ---------- */
function segs(text) {
  const out = [];
  String(text ?? "").split("**").forEach((p, i) => {
    const b = i % 2 === 1, re = /\[PREENCHER[^\]]*\]/g; let last = 0, m;
    while ((m = re.exec(p))) { if (m.index > last) out.push({ t: p.slice(last, m.index), b }); out.push({ t: m[0], b, hl: true }); last = m.index + m[0].length; }
    if (last < p.length) out.push({ t: p.slice(last), b });
  });
  return out;
}
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inl = text => segs(text).map(s => { let h = esc(s.t).replace(/\n/g, "<br>"); if (s.hl) h = `<mark>${h}</mark>`; if (s.b) h = `<strong>${h}</strong>`; return h; }).join("");

function toHTML(blocks) {
  return blocks.map(b => {
    switch (b.t) {
      case "anexo": return `<p class="d-anexo">${inl(b.text)}</p>`;
      case "brasao": return `<img class="d-brasao" src="img/brasao.png" alt="Brasão da República">`;
      case "cab": return `<p class="d-cab">${b.lines.map(l => esc(l)).join("<br>")}</p>`;
      case "title": return `<p class="d-title">${inl(b.text)}</p>`;
      case "subtitle": return `<p class="d-subtitle">${inl(b.text)}</p>`;
      case "h": return `<p class="d-h">${inl(b.text)}</p>`;
      case "sub": return `<p class="d-sub">${inl(b.text)}</p>`;
      case "p": return `<p class="d-p">${inl(b.text)}</p>`;
      case "item": return `<p class="d-item ${b.lvl === "al" ? "al" : "l" + b.lvl}">${esc(b.num)} ${inl(b.text)}</p>`;
      case "table": return `<div class="tblwrap"><table><thead><tr>${b.head.map(h => `<th>${inl(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map((c, i) => `<td${(b.numCols || []).includes(i) ? ' class="num"' : ""}>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      case "list": return `<ul>${b.items.map(i => `<li>${inl(i)}</li>`).join("")}</ul>`;
      case "local": return `<p class="d-local">${inl(b.text)}</p>`;
      case "sign": return `<div class="d-sign">${b.rot ? `<p class="rot">${inl(b.rot)}</p>` : ""}<div class="nm">${inl(b.nome)}</div>${b.linhas.map(l => `<div>${inl(l)}</div>`).join("")}</div>`;
      case "signs": return `<div class="d-signs">${b.rot ? `<p class="rot">${inl(b.rot)}</p>` : ""}<div class="lado">${toHTML(b.items)}</div></div>`;
      case "foot": return `<p class="d-foot">${inl(b.text)}</p>`;
    }
    return "";
  }).join("");
}

/* ---------- geração DOCX (WordprocessingML) ---------- */
const TEXT_W = 9071; // A4 com margens de 3 cm (esq.) e 2 cm (dir.), em twips
const ESPACO_ASSINATURA = 1985; // 3,5 cm acima do nome, para o carimbo da assinatura gov.br
const xe = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function wr(text, o = {}) {
  return segs(text).map(s => {
    const pr = (o.b || s.b ? "<w:b/><w:bCs/>" : "") + (o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : "") + (o.caps ? "<w:caps/>" : "") + (s.hl ? '<w:highlight w:val="yellow"/>' : "");
    return s.t.split("\n").map(part => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${xe(part)}</w:t></w:r>`).join('<w:r><w:br/></w:r>');
  }).join("");
}
function wp(inner, { jc = "both", ind = "", before = 0, after = 120, keep = false } = {}) {
  return `<w:p><w:pPr>${keep ? "<w:keepNext/>" : ""}<w:spacing w:before="${before}" w:after="${after}"/>${ind}<w:jc w:val="${jc}"/></w:pPr>${inner}</w:p>`;
}
function wtable(b) {
  const tot = b.w.reduce((x, y) => x + y, 0), cols = b.w.map(x => Math.round(x / tot * TEXT_W));
  const cell = (txt, i, head) => `<w:tc><w:tcPr><w:tcW w:w="${cols[i]}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E4E4E4"/>' : ""}</w:tcPr>${wp(wr(txt, { b: head, sz: 20 }), { jc: head ? "center" : ((b.numCols || []).includes(i) ? "right" : "left"), after: 0 })}</w:tc>`;
  const bd = ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="444444"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_W}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cols.map(c => `<w:gridCol w:w="${c}"/>`).join("")}</w:tblGrid>`
    + `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.head.map((h, i) => cell(h, i, true)).join("")}</w:tr>`
    + b.rows.map(r => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, i, false)).join("")}</w:tr>`).join("") + `</w:tbl>` + wp("", { after: 60 });
}
// Assinaturas lado a lado: tabela sem bordas, uma coluna por assinante
function wsigns(items) {
  const w = Math.floor(TEXT_W / items.length);
  const cell = s => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${wp(wr(s.nome, { b: true, caps: true }), { jc: "center", after: 0 })}${s.linhas.map(l => wp(wr(l), { jc: "center", after: 0 })).join("")}</w:tc>`;
  const bd = ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="nil"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_W}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${items.map(() => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`
    + `<w:tr><w:trPr><w:cantSplit/></w:trPr>${items.map(cell).join("")}</w:tr></w:tbl>` + wp("", { after: 60 });
}
function brasaoXML() {
  if (!brasaoBytes) return "";
  const cx = 720000, cy = Math.round(cx * brasaoH / brasaoW);
  return wp(`<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Brasao"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="brasao.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`, { jc: "center", after: 60 });
}
function toDocXML(blocks) {
  const body = blocks.map(b => {
    switch (b.t) {
      case "anexo": return wp(wr(b.text, { b: true }), { jc: "right" });
      case "brasao": return brasaoXML();
      case "cab": return wp(b.lines.map(l => wr(l, { b: true })).join('<w:r><w:br/></w:r>'), { jc: "center", after: 240 });
      case "title": return wp(wr(b.text, { b: true, sz: 24 }), { jc: "center", before: 120, after: 40 });
      case "subtitle": return wp(wr(b.text), { jc: "center", after: 280 });
      case "h": return wp(wr(b.text, { b: true }), { before: 240, keep: true });
      case "sub": return wp(wr(b.text, { b: true }), { before: 120, keep: true, jc: "left" });
      case "p": return wp(wr(b.text), { ind: '<w:ind w:firstLine="709"/>' });
      case "item": { const left = b.lvl === "al" || b.lvl === 2 ? 425 : b.lvl === 3 ? 851 : 0; return wp(`<w:r><w:t xml:space="preserve">${xe(b.num)} </w:t></w:r>` + wr(b.text), { ind: left ? `<w:ind w:left="${left}"/>` : "" }); }
      case "table": return wtable(b);
      case "list": return b.items.map(i => wp(`<w:r><w:t xml:space="preserve">•  </w:t></w:r>` + wr(i), { ind: '<w:ind w:left="709" w:hanging="284"/>', after: 40, jc: "left" })).join("");
      case "local": return wp(wr(b.text), { jc: "right", before: 360, after: 240 });
      case "sign": return (b.rot ? wp(wr(b.rot), { jc: "left", before: 360, after: ESPACO_ASSINATURA, keep: true }) : wp("", { before: ESPACO_ASSINATURA, after: 0, keep: true }))
        + wp(wr(b.nome, { b: true, caps: true }), { jc: "center", after: 0, keep: true }) + b.linhas.map((l, i) => wp(wr(l), { jc: "center", after: 0, keep: i < b.linhas.length - 1 })).join("");
      case "signs": return wp(b.rot ? wr(b.rot) : "", { jc: "left", before: 360, after: ESPACO_ASSINATURA, keep: true }) + wsigns(b.items);
      case "foot": return wp(wr(b.text, { sz: 16 }), { jc: "center", before: 480 });
    }
    return "";
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
async function docxBlob(blocks) {
  // Sem entradas de pasta no pacote: o Word espera apenas as partes.
  const z = new JSZip(), add = z.file.bind(z);
  z.file = (n, d) => add(n, d, { createFolders: false });
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${brasaoBytes ? '<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/brasao.png"/>' : ""}</Relationships>`);
  z.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
  z.file("word/document.xml", toDocXML(blocks));
  if (brasaoBytes) z.file("word/media/brasao.png", brasaoBytes);
  return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

/* ---------- salvar arquivos ---------- */
async function saveFile(filename, blob) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  setStatus(`${filename} gerado.`);
}
// O nome do processo, quando informado, vira o nome dos arquivos baixados.
const slugNome = () => (S.nomeProcesso || "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s\/\\]+/g, "_").replace(/[^\w.-]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
const slug = () => slugNome() || (S.objeto || "contratacao").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^(aquisicao|contratacao)\s+de\s+/i, "").split(/\s+/).slice(0, 5).join("_").replace(/[^\w]/g, "").slice(0, 48) || "contratacao";
const MODNOME = { dispensa: "Dispensa", pregao: "Pregao", adesao: "Adesao" };

/* ---------- estado, formulário e ciclo de render ---------- */
function getPath(o, k) { return k.split(".").reduce((x, p) => x && x[p], o); }
function setPath(o, k, v) { const ps = k.split("."); const last = ps.pop(); ps.reduce((x, p) => x[p], o)[last] = v; }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); return Object.assign(clone(BLANK), s, { org: Object.assign(clone(DEFAULT_ORG), s.org || {}) }); } } catch (e) {}
  return Object.assign(clone(EXAMPLE), { org: clone(DEFAULT_ORG) });
}
function fillForm() {
  document.querySelectorAll("[data-k]").forEach(el => { const v = getPath(S, el.dataset.k); if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; });
  document.querySelectorAll('input[name="mod"]').forEach(r => r.checked = r.value === S.mod);
  renderItems();
}
function applyVisibility() {
  document.querySelectorAll("[data-show]").forEach(el => el.hidden = el.dataset.show !== S.mod);
  document.querySelectorAll("[data-show-if]").forEach(el => {
    const c = el.dataset.showIf; let ok;
    if (c.startsWith("!")) ok = !S[c.slice(1)]; else if (c.includes("=")) { const [k, v] = c.split("="); ok = S[k] === v; } else ok = !!S[c];
    el.hidden = !ok;
  });
  $("#exampleBanner").hidden = !S.example;
}
function renderItems() {
  const box = $("#items"), ades = S.mod === "adesao";
  box.innerHTML = S.itens.map((it, i) => `
    <div class="itemcard" data-i="${i}">
      <div class="itemhead"><b>ITEM ${String(i + 1).padStart(2, "0")}</b>${S.itens.length > 1 ? `<button type="button" class="icon" data-del="${i}" aria-label="Remover item ${i + 1}">Remover</button>` : ""}</div>
      <textarea id="it-${i}-desc" data-f="desc" rows="2" placeholder="Descrição no padrão CATMAT" aria-label="Descrição do item ${i + 1}">${esc(it.desc || "")}</textarea>
      <div class="itemgrid${ades ? " ades" : ""}">
        ${ades ? `<div class="field"><label for="it-${i}-itemAta">Item da ata</label><input type="text" inputmode="numeric" id="it-${i}-itemAta" data-f="itemAta" value="${xe(it.itemAta || "")}" placeholder="ex.: 10"></div>` : ""}
        <div class="field"><label for="it-${i}-catmat">CATMAT</label><input type="text" id="it-${i}-catmat" data-f="catmat" value="${xe(it.catmat || "")}"></div>
        <div class="field"><label for="it-${i}-un">Unidade</label><input type="text" id="it-${i}-un" data-f="un" value="${xe(it.un || "")}"></div>
        <div class="field"><label for="it-${i}-qtd">Qtd</label><input type="text" inputmode="decimal" id="it-${i}-qtd" data-f="qtd" value="${xe(it.qtd || "")}"></div>
        <div class="field"><label for="it-${i}-vu">Valor unit. (R$)</label><input type="text" inputmode="decimal" id="it-${i}-vu" data-f="vu" value="${xe(it.vu || "")}"></div>
        ${ades ? `<div class="field"><label for="it-${i}-qreg">Qtd na ata</label><input type="text" inputmode="decimal" id="it-${i}-qreg" data-f="qreg" value="${xe(it.qreg || "")}"></div>` : ""}
      </div>
      <div class="subtotal" id="it-${i}-sub"></div>
    </div>`).join("");
}
function updateSubtotals(calc) {
  calc.rows.forEach((r, i) => { const el = $(`#it-${i}-sub`); if (el) el.textContent = isFinite(r.tot) ? `${fmtQtd(r.q)} × R$ ${brl(r.v)} = R$ ${brl(r.tot)}` : "informe quantidade e valor unitário"; });
  $("#totalVal").textContent = `R$ ${brl(calc.total)}`;
}

let DOCS = {};
function build() {
  const calc = itensCalc(), M = modTexts(calc);
  DOCS = { dfd: buildDFD(calc, M), etp: buildETP(calc, M), tr: buildTR(calc, M) };
  return calc;
}
function setStatus(t) { $("#status").textContent = t; }
function render() {
  applyVisibility();
  const calc = build();
  updateSubtotals(calc);
  $("#alerts").innerHTML = buildAlerts(calc).map(([l, t]) => `<div class="alert ${l}"><span>${esc(t)}</span></div>`).join("");
  ["dfd", "etp", "tr"].forEach(d => {
    const n = (JSON.stringify(DOCS[d]).match(/\[PREENCHER/g) || []).length;
    const el = $(`#tab-${d} .pend`); el.textContent = n; el.classList.toggle("zero", n === 0); el.title = n ? `${n} trecho(s) a preencher` : "Sem pendências";
  });
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", String(t.dataset.doc === currentDoc)));
  const isCheck = currentDoc === "check";
  $("#btnCopy").disabled = isCheck; $("#btnDocx").disabled = isCheck;
  if (isCheck) {
    const [tit, list] = CHECK[S.mod];
    $("#view").innerHTML = `<div class="checklist"><h3>${esc(tit)}</h3><p class="hint">O que ainda falta no processo além destes três documentos.</p><ol>${list.map(([t, r]) => `<li>${esc(t)} <span class="ref">${esc(r)}</span></li>`).join("")}</ol></div>`;
  } else {
    $("#view").innerHTML = `<article class="paper" id="paper">${toHTML(DOCS[currentDoc])}</article>`;
  }
  save();
  App.listeners.forEach(f => { try { f(S); } catch (e) { console.error(e); } });
}

// Ponte para o módulo de nuvem (nuvem.js).
const App = window.App = {
  listeners: [],
  state: () => S,
  getState: () => clone(S),
  setState(ns) { S = Object.assign(clone(BLANK), ns, { org: S.org }); fillForm(); render(); },
  setOrg(o) { S.org = Object.assign(clone(DEFAULT_ORG), o); fillForm(); render(); },
  refresh() { fillForm(); render(); },
  novo: () => novoProcesso(),
  status: t => setStatus(t),
  brl, num, fmtQtd, esc
};
let timer;
const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 120); };

$("#form").addEventListener("input", e => {
  const el = e.target;
  if (el.name === "mod") { S.mod = el.value; renderItems(); render(); return; }
  if (el.dataset.k) { setPath(S, el.dataset.k, el.type === "checkbox" ? el.checked : el.value); S.example = S.example && !["objeto", "motivo"].includes(el.dataset.k); }
  const card = el.closest(".itemcard");
  if (card && el.dataset.f) S.itens[+card.dataset.i][el.dataset.f] = el.value;
  if (el.type === "checkbox" || el.tagName === "SELECT") render(); else schedule();
});
$("#form").addEventListener("submit", e => e.preventDefault());
$("#items").addEventListener("click", e => { const d = e.target.closest("[data-del]"); if (!d) return; S.itens.splice(+d.dataset.del, 1); renderItems(); render(); });
$("#btnAddItem").addEventListener("click", () => { S.itens.push({ itemAta: "", desc: "", catmat: "", un: "", qtd: "", vu: "", qreg: "" }); renderItems(); render(); $(`#it-${S.itens.length - 1}-desc`).focus(); });
// Formulário em branco, sem vínculo com processo salvo (o próximo "Salvar" cria um processo novo).
function novoProcesso() { const org = S.org; S = Object.assign(clone(BLANK), { org }); fillForm(); render(); $("#objeto").focus(); setStatus("Formulário limpo para um novo processo. Os dados do órgão foram mantidos."); }
$("#btnClear").addEventListener("click", novoProcesso);
$("#btnResetOrg").addEventListener("click", () => { S.org = clone(DEFAULT_ORG); fillForm(); render(); setStatus("Dados do órgão restaurados."); });
$("#tabs").addEventListener("click", e => { const t = e.target.closest(".tab"); if (!t) return; currentDoc = t.dataset.doc; render(); });

$("#btnDocx").addEventListener("click", async () => {
  if (currentDoc === "check") return;
  setStatus("Gerando .docx…");
  try { await saveFile(`${currentDoc.toUpperCase()}_${MODNOME[S.mod]}_${slug()}.docx`, await docxBlob(DOCS[currentDoc])); }
  catch (e) { setStatus("Falha ao gerar o arquivo: " + e.message); }
});
$("#btnZip").addEventListener("click", async () => {
  setStatus("Gerando os três documentos…");
  try {
    const z = new JSZip(), base = `${MODNOME[S.mod]}_${slug()}`;
    for (const d of ["dfd", "etp", "tr"]) z.file(`${d.toUpperCase()}_${base}.docx`, await (await docxBlob(DOCS[d])).arrayBuffer());
    await saveFile(`Documentos_${base}.zip`, await z.generateAsync({ type: "blob" }));
  } catch (e) { setStatus("Falha ao gerar o pacote: " + e.message); }
});
$("#btnCopy").addEventListener("click", () => {
  const paper = $("#paper"); if (!paper) return;
  const html = paper.innerHTML.replace(/<img[^>]*>/g, ""), text = paper.innerText;
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(paper); const s = getSelection(); s.removeAllRanges(); s.addRange(r); let ok = false; try { ok = document.execCommand("copy"); } catch (e) {} setStatus(ok ? "Texto copiado. Cole no Word, no LibreOffice ou no Compras.gov.br." : "Texto selecionado: use Ctrl+C para copiar."); };
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })])
        .then(() => setStatus("Texto copiado com formatação. Cole no Word, no LibreOffice ou no Compras.gov.br."), fallback);
    } else fallback();
  } catch (e) { fallback(); }
});

/* ---------- início ---------- */
S = load();
fillForm();
render();
fetch("img/brasao.png").then(r => r.ok ? r.arrayBuffer() : null).then(buf => {
  if (!buf) return;
  brasaoBytes = new Uint8Array(buf);
  const img = new Image();
  img.onload = () => { brasaoW = img.naturalWidth || 1; brasaoH = img.naturalHeight || 1; };
  img.src = URL.createObjectURL(new Blob([buf], { type: "image/png" }));
}).catch(() => {});
