/* ===== V40 · Estrutura em abas para todas as telas (prefixo xab) =====
   Em vez de uma lista longa, cada tela abre só o essencial; as outras partes ficam em abas.
   - Cartões da própria tela viram abas (os que se parecem são juntados).
   - Os "Mais recursos" de cada tela viram abas por assunto, com os itens do assunto logo abaixo.
   Nada muda nas funções: só a organização. Telas que já têm abas próprias ficam como estão. */
const XAB={sub:{},tab:{}};
const XAB_PULA=["fin","fin2","gp","cuid","admres","infra","ind","contab","acesso","pend"];
const XAB_PRI={pront:"Integrantes",ponto:"Calcular jornadas",res:"Residentes",pres:"Prontuário",nf:"Notas fiscais",prest:"Prestadores",docs:"Documentos",estoque:"Estoque"};
const XAB_ABRE={ponto:"fechamento"};
const XAB_FIXO={rel:/per[ií]odo e formatos/i};
const XAB_GRUPOS={
  home:[["Hoje",/urgente|aten[cç][aã]o|resumo de hoje/i],["Semana",/semana|acompanhar/i],["Caixa",/fluxo/i]],
  turnos:[["Escala do mês",/escala do per/i],["Alertas",/alertas/i],["Sugestão de folgas",/sugest/i],["Por pessoa",/escala dos integrantes/i],["Turnos e feriados",/turnos da casa|feriados/i]],
  ponto:[["Importar o relógio",/arquivo do rel|per[ií]odo/i],["Regras do pareamento",/regras/i]],
  contador:[["Conferência",/confer/i],["Folhas de ponto",/folhas de ponto/i],["Dados da empresa",/dados da empresa/i]],
  estoque:[["Movimentar",/lan[cç]ar|[úu]ltimas mov/i],["Itens e áreas",/[áa]reas|^itens/i],["Consumo",/consumo/i]]
};
const XAB_ORDEM_G={
  ponto:["Fechamento do mês","Relógio","Cadastro e conferência","Ajustes e justificativas","Horas e custo","Espelho e consulta","Folha e contador","Fiscalização da jornada","Segurança"],
  turnos:["Montar a escala","Trocas e extras","Feriados e rodízio","Publicar a escala","Escala por pessoa","Escalas de outras áreas"]
};
(function(){const st=document.createElement("style");st.id="xabcss";st.textContent=`
.xabbar{position:sticky;top:0;z-index:15;background:var(--bg);padding-top:6px;margin-top:0}
.xabbar button .n{font-weight:400;font-size:11px;color:var(--mute);margin-left:4px}
.xabbar button.g{font-style:normal}
.xabsub{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px}
.xabsub button{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:5px 12px;font:600 12.5px var(--ui);color:var(--ink);cursor:pointer}
.xabsub button.on{background:var(--verde-medio);color:#fff;border-color:var(--verde-medio)}
.xabmais{margin:0 0 14px}.xabmais>summary{cursor:pointer;font-weight:700;padding:6px 2px;color:var(--verde-esc)}
@media print{.xabbar,.xabsub{display:none!important}}
`;document.head.appendChild(st)})();

function xmSecG(r){const c=xabSecs(r).find(s=>s.k===XM.sec[r]);return c?c.g:""}
function xabTitulo(e){
  if(!e||!e.matches||!e.matches(".card"))return null;
  const h=e.querySelector("h2");if(!h)return null;
  return h.textContent.replace(/\s+/g," ").trim();
}
function xabRot(t){return t.replace(/^\d+\s*[·.\-)]\s*/,"").replace(/\s*[—–-]\s*.*$/,"").replace(/\s*\(.*$/,"").slice(0,26)}
function xabSecs(r){return(XMSECS[r]||[])}
function xabGrupos(r){
  const L=xabSecs(r),g=[...new Set(L.map(s=>s.g))],ord=XAB_ORDEM_G[r]||[];
  return g.sort((a,b)=>{const i=ord.indexOf(a),j=ord.indexOf(b);return(i<0?99:i)-(j<0?99:j)});
}
function xabShell(){
  const r=ROUTE;if(!r||XAB_PULA.includes(r))return;
  const v=document.getElementById("view");if(!v||document.getElementById("xabbar"))return;
  const kids=[...v.children],ip=kids.findIndex(e=>e.id==="xmpanel");
  const antes=ip>=0?kids.slice(0,ip):kids,depois=ip>=0?kids.slice(ip+1):[];
  const fixo=XAB_FIXO[r];
  const cards=antes.map(e=>({e,t:xabTitulo(e)})).filter(x=>x.t&&!(fixo&&fixo.test(x.t)));
  // junta cartões parecidos
  const abas=[],usados=new Map();
  (XAB_GRUPOS[r]||[]).forEach(([lab,re])=>{const es=cards.filter(c=>!usados.has(c.e)&&re.test(c.t));if(es.length){const a={k:"p:"+lab,l:lab,els:es.map(c=>c.e)};es.forEach(c=>usados.set(c.e,a));abas.push(a)}});
  cards.forEach(c=>{if(!usados.has(c.e)){const a={k:"p:"+xabRot(c.t),l:xabRot(c.t),els:[c.e]};usados.set(c.e,a);abas.push(a)}});
  let ancora=null;
  if(abas.length){
    // o que vem solto depois de um cartão (números, botões) acompanha esse cartão
    let ult=null;
    antes.forEach(e=>{if(usados.has(e)){ult=usados.get(e)}else if(ult&&!e.classList.contains("banner")&&e.id!=="roaviso"&&!(fixo&&fixo.test(xabTitulo(e)||"\u0000"))){ult.els.push(e)}});
  }else{
    const els=antes.filter(e=>!e.classList.contains("banner")&&e.id!=="roaviso");
    if(els.length){abas.push({k:"p:"+(XAB_PRI[r]||"Principal"),l:XAB_PRI[r]||"Principal",els});ancora=els[0]}
  }
  const G=xabGrupos(r).map(g=>({k:"g:"+g,l:g,g,secs:xabSecs(r).filter(s=>s.g===g)}));
  if(abas.length+G.length<2)return;
  // aba ativa
  if(XM.sec[r]===undefined&&XAB.tab[r]===undefined&&XAB_ABRE[r]&&xabSecs(r).some(s=>s.k===XAB_ABRE[r])){XM.sec[r]=XAB_ABRE[r];go(r,true);return}
  const cur=xabSecs(r).find(s=>s.k===XM.sec[r]);
  let ativa=cur?"g:"+cur.g:(XAB.tab[r]&&abas.some(a=>a.k===XAB.tab[r])?XAB.tab[r]:(abas[0]?abas[0].k:(G[0]?G[0].k:"")));
  if(!cur&&ativa.startsWith("g:")){const g=G.find(x=>x.k===ativa);if(g&&g.secs.length){XM.sec[r]=(XAB.sub[r+"|"+g.g]&&g.secs.some(s=>s.k===XAB.sub[r+"|"+g.g])?XAB.sub[r+"|"+g.g]:g.secs[0].k);go(r,true);return}}
  const curG=xabSecs(r).find(s=>s.k===XM.sec[r]);
  // esconde / mostra
  abas.forEach(a=>a.els.forEach(e=>{e.style.display=a.k===ativa?"":"none"}));
  const pn=document.getElementById("xmpanel");if(pn)pn.style.display="none";
  depois.forEach(e=>{e.style.display=ativa.startsWith("g:")?"":"none"});
  // barra de abas
  const bar=document.createElement("div");bar.className="tabs xabbar";bar.id="xabbar";
  bar.innerHTML=abas.map(a=>`<button type="button" data-xabt="${esc(a.k)}" class="${a.k===ativa?"on":""}">${esc(a.l)}</button>`).join("")+G.map(g=>`<button type="button" class="g ${g.k===ativa?"on":""}" data-xabt="${esc(g.k)}">${esc(g.l)}<span class="n">${g.secs.length>1?g.secs.length:""}</span></button>`).join("");
    v.insertBefore(bar,ancora||antes.find(e=>cards.some(c=>c.e===e))||pn||null);
  const gAt=G.find(x=>x.k===ativa);
  if(gAt&&gAt.secs.length>1){
    const sub=document.createElement("div");sub.className="xabsub";sub.id="xabsub";
    sub.innerHTML=gAt.secs.map(s=>`<button type="button" data-xabs="${esc(s.k)}" class="${curG&&curG.k===s.k?"on":""}">${esc(s.l)}</button>`).join("");
    bar.after(sub);
  }
  bar.querySelectorAll("[data-xabt]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.xabt;
    if(k.startsWith("g:")){const g=G.find(x=>x.k===k),mem=XAB.sub[r+"|"+g.g];XM.sec[r]=g.secs.some(s=>s.k===mem)?mem:g.secs[0].k}
    else{XM.sec[r]="";XAB.tab[r]=k}
    go(r,true);
  });
  document.querySelectorAll("[data-xabs]").forEach(b=>b.onclick=()=>{XM.sec[r]=b.dataset.xabs;XAB.sub[r+"|"+gAt.g]=b.dataset.xabs;go(r,true)});
}
/* ---------- Financeiro mais enxuto ---------- */
const XAB_FIN_PRINC=["geral","pagar","receber","fluxo","conc","rel"];
function xabFin(){
  if(ROUTE!=="fin")return;
  const v=document.getElementById("view");if(!v||document.getElementById("xabfin"))return;
  const bs=[...v.querySelectorAll("[data-fintab]")];if(!bs.length)return;
  const extras=bs.filter(b=>!XAB_FIN_PRINC.includes(b.dataset.fintab));
  const aberto=extras.some(b=>b.dataset.fintab===FIN.tab);
  extras.forEach(b=>{b.style.display=aberto?"":"none";b.dataset.xabx="1"});
  const bar=bs[0].parentElement;
  const mais=document.createElement("button");mais.type="button";mais.id="xabfin";mais.textContent=aberto?"Menos ▴":"Mais ▾";
  mais.onclick=()=>{const abre=extras[0].style.display==="none";extras.forEach(b=>b.style.display=abre?"":"none");mais.textContent=abre?"Menos ▴":"Mais ▾"};
  bar.appendChild(mais);extras.forEach(b=>bar.appendChild(b));
  bar.style.flexWrap="wrap";
  if(FIN.tab==="geral"){
    // números de apoio ficam recolhidos; abre só o que decide o dia
    const apoio=[...v.querySelectorAll(":scope>.card")].filter(c=>/^(fluxo de caixa de|compras e estoque|maiores sa[ií]das)/i.test((c.querySelector("h2")||{textContent:""}).textContent.trim()));
    if(apoio.length){
      const d=document.createElement("details");d.className="xabmais";d.innerHTML=`<summary>Mais números: fluxo do ano, compras e maiores saídas</summary>`;
      apoio[0].before(d);apoio.forEach(c=>d.appendChild(c));
    }
  }
}
(function(){
  const go0=go;
  go=function(){const R=go0.apply(this,arguments);if(window.__semAbas)return R;try{xabShell();xabFin()}catch(e){console.error(e)}return R};
})();


/* >>> x_m25.js */
