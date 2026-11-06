/* ================= EXTRAS · NÚCLEO =================
   Estrutura comum dos módulos novos: coleções, histórico/desfazer, aviso de edição simultânea,
   telas com abas, cadastros genéricos (xcrud), pendências, busca global, backup e atalhos. */
const XCOLS={
  ferias:["gp"],bh:["gp"],movgp:["gp"],trein:["gp"],epi:["gp"],benef:["gp"],
  medreg:["cuid"],ocor2:["cuid"],cardapio:["cuid"],ativ:["cuid"],visita:["cuid"],aval:["cuid"],agres:["cuid"],comun:["cuid"],
  espera:["admres"],cres:["admres"],
  manut:["infra"],ativos:["infra"],chk:["infra"],chkreg:["infra"],ouv:["infra"],assin:["infra","gp","admres","docs"],
  orc:["fin2"],extrato:["fin2"],pessoas:["gp","fin","prest","res","admres"],
  links:["pront"],
  hist:[]
};
Object.keys(XCOLS).forEach(c=>{S[c]=S[c]||{}});
const xs=c=>Object.values(S[c]||{});
const NOME_COL={integrantes:"Integrantes",docs:"Documentos",ocorr:"Ocorrências do ponto",marcacoes:"Ponto",acessos:"Acessos",perfis:"Perfis",nfarq:"Notas fiscais (arquivos)",
  ferias:"Férias",bh:"Banco de horas",movgp:"Admissão e desligamento",trein:"Treinamentos",epi:"EPI e uniformes",benef:"Benefícios",medreg:"Medicação administrada",ocor2:"Ocorrências dos residentes",
  cardapio:"Cardápio",ativ:"Atividades",visita:"Visitas",aval:"Avaliações",agres:"Agenda do residente",comun:"Comunicados à família",espera:"Lista de espera",cres:"Contratos de residência",
  manut:"Manutenções",ativos:"Patrimônio",chk:"Modelos de checklist",chkreg:"Checklists feitos",ouv:"Ouvidoria",assin:"Assinaturas",orc:"Orçamento",extrato:"Extrato bancário",pessoas:"Pessoas e empresas"};
const NOME_CFG=[[/^fin_/,"Financeiro"],[/^evo_/,"Evolução do prontuário"],[/^tar_/,"Tarefas"],[/^esc_|^escala/,"Escalas"],[/^(estoque|mov_)/,"Estoque"],[/^residentes$/,"Residentes"],[/^(prestadores|contratos)$/,"Prestadores"],
  [/^nf(_p\d+)?$/,"Notas fiscais"],[/^docs_val$/,"Documentos com validade"],[/^geral$/,"Configurações"],[/^contab$/,"Contabilidade"],[/^recorrencias$/,"Recorrentes"],[/^fech_/,"Fechamento do ponto"]];
const nomeColHist=(c,id)=>c==="config"?((NOME_CFG.find(([re])=>re.test(id))||[])[1]||"Configurações"):(NOME_COL[c]||c);

/* ---------- histórico, desfazer e aviso de edição simultânea ---------- */
const HIST={buf:new Map(),t:null,undo:[],mudo:false,ultAcao:0,off:new Set(["hist","pedidos","acessos","perfis","auditoria"])};
document.addEventListener("click",()=>{HIST.ultAcao=Date.now()},true);document.addEventListener("keydown",()=>{HIST.ultAcao=Date.now()},true);
const sTxt=o=>{try{return JSON.stringify(o)}catch(e){return""}};
function nomeItem(x){return(x&&(x.nome||x.desc||x.titulo||x.objeto||x.nomeCompleto||x.curso||x.item||x.assunto))||(x&&x.id)||"item"}
function histResumo(antes,depois){
  if(!depois)return"Excluído";
  if(!antes)return"Criado";
  const A=antes.itens,B=depois.itens;
  if(Array.isArray(A)&&Array.isArray(B)){
    const ma=new Map(A.map(x=>[x.id,x])),mb=new Map(B.map(x=>[x.id,x])),add=B.filter(x=>!ma.has(x.id)),rem=A.filter(x=>!mb.has(x.id)),alt=B.filter(x=>ma.has(x.id)&&sTxt(ma.get(x.id))!==sTxt(x));
    const p=[];
    if(add.length)p.push(`+${add.length} (${add.slice(0,2).map(nomeItem).join(", ")}${add.length>2?"…":""})`);
    if(rem.length)p.push(`−${rem.length} (${rem.slice(0,2).map(nomeItem).join(", ")}${rem.length>2?"…":""})`);
    if(alt.length)p.push(`~${alt.length} alterado(s) (${alt.slice(0,2).map(nomeItem).join(", ")}${alt.length>2?"…":""})`);
    return p.join(" · ")||"Sem mudança nos itens";
  }
  const ks=[...new Set([...Object.keys(antes),...Object.keys(depois)])].filter(k=>!["_t","_u","id","em","por"].includes(k)&&sTxt(antes[k])!==sTxt(depois[k]));
  return ks.length?"Campos: "+ks.slice(0,6).join(", ")+(ks.length>6?"…":""):"Sem mudança";
}
const limpaH=o=>{if(!o)return null;const c={...o};delete c.id;delete c._t;delete c._u;return c};
function histRegistra(col,id,antes,depois){
  if(HIST.off.has(col)||(col==="config"&&id==="armazenamento"))return;
  if(sTxt(limpaH(antes))===sTxt(limpaH(depois)))return;
  const k=col+"/"+id,b=HIST.buf.get(k);
  if(b){b.depois=depois;b.t=new Date().toISOString()}
  else HIST.buf.set(k,{col,id,antes:antes?strip(antes):null,depois,t:new Date().toISOString()});
  if(!HIST.mudo){
    HIST.undo.push({col,id,antes:antes?strip(antes):null});if(HIST.undo.length>40)HIST.undo.shift();
    if(Date.now()-HIST.ultAcao<2500)mostraDesfazer();
  }
  clearTimeout(HIST.t);HIST.t=setTimeout(histFlush,1800);
}
function histFlush(){
  const L=[...HIST.buf.values()];HIST.buf.clear();if(!RT.db)return;
  L.forEach(e=>{
    const hid=uid8()+e.t.replace(/\D/g,"").slice(2,14);
    const antesTxt=e.antes?sTxt(e.antes):"";
    const reg={t:e.t,u:ACC.uid||"",n:(ACC.me&&ACC.me.name)||"",col:e.col,rid:e.id,tela:nomeColHist(e.col,e.id),res:histResumo(e.antes,e.depois),op:!e.depois?"del":!e.antes?"novo":"edit",antes:antesTxt&&antesTxt.length<=14000?antesTxt:""};
    S.hist[hid]={...reg,id:hid};RT.db.collection("hist").doc(hid).set(reg).catch(()=>{});
  });
  const ids=Object.keys(S.hist);
  if(ids.length>700){ids.sort((a,b)=>(S.hist[a].t||"").localeCompare(S.hist[b].t||"")).slice(0,150).forEach(id=>{delete S.hist[id];RT.db.collection("hist").doc(id).delete().catch(()=>{})})}
}
function mostraDesfazer(){
  const t=$("toast");if(!t)return;
  t.querySelectorAll(".undo").forEach(x=>x.remove());
  const d=document.createElement("div");d.className="undo";d.innerHTML=`Salvo. <button class="b sm" style="margin-left:8px;padding:2px 10px">Desfazer</button>`;
  d.querySelector("button").onclick=()=>{d.remove();xDesfazer()};
  t.appendChild(d);setTimeout(()=>d.remove(),7000);
}
function xDesfazer(){
  const u=HIST.undo.pop();if(!u)return toast("Nada para desfazer nesta sessão.",true);
  HIST.mudo=true;
  try{if(u.antes)put(u.col,u.id,u.antes);else del(u.col,u.id)}finally{HIST.mudo=false}
  toast("Alteração desfeita.");go(ROUTE,true);
}
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==="z"&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||"")&&!document.querySelector(".ov")&&estadoAcesso()==="ok"){e.preventDefault();xDesfazer()}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"&&estadoAcesso()==="ok"){e.preventDefault();abreBusca()}
});
/* edição simultânea: se alguém mudar um registro enquanto uma janela de edição está aberta, avisa */
function avisaConflito(col,id,novo,velho){
  if(!document.querySelector(".ov .modal")||!novo||!novo._u||novo._u===ACC.uid||HIST.off.has(col))return;
  if(velho&&velho._t&&novo._t&&velho._t>=novo._t)return;
  const quem=NOMES_CACHE[novo._u]||"Outra pessoa";
  toast(`${quem} acabou de alterar "${nomeColHist(col,id)}" enquanto esta janela estava aberta. Confira os dados antes de salvar para não sobrescrever o trabalho dela.`,true);
}
const NOMES_CACHE={};
async function nomesCache(ids){
  const f=ids.filter(i=>i&&!NOMES_CACHE[i]);if(!f.length||!RT.user)return;
  try{const p=await RT.user.profiles(f);f.forEach(i=>{NOMES_CACHE[i]=(p[i]&&p[i].name)||"Outra pessoa"})}catch(e){}
}

/* ---------- componentes de tela ---------- */
const PGX={};
function xpage(key,titulo,sub,icone,tabs){
  const st={tab:tabs[0].k};
  PGX[key]={st,tabs,
    pg:()=>{const vis=tabs.filter(t=>!t.mod||podeVer(t.mod)),t=vis.find(x=>x.k===st.tab)||vis[0];st.tab=t.k;
      return banner("",titulo,sub,icone)+noStore()+`<div class="tabs">${vis.map(x=>`<button data-xtab="${x.k}" class="${x.k===t.k?"on":""}">${x.l}</button>`).join("")}</div>`+t.html()},
    bind:()=>{document.querySelectorAll("[data-xtab]").forEach(b=>b.onclick=()=>{st.tab=b.dataset.xtab;go(key,true)});const t=tabs.find(x=>x.k===st.tab)||tabs[0];if(t.bind)t.bind()}};
  return PGX[key];
}
const xPill=(n,t)=>`<span class="pill ${["s-ok","s-atestado","s-pendencia","s-urgente"][n]||"s-ok"}">${esc(t)}</span>`;
const xDias=iso=>iso?daysBetweenIso(hojeIso(),iso):null;
function xSitData(iso,aviso,rotuloOk){ // situação por data de vencimento: 0 ok, 1 perto, 2 vence logo, 3 vencido/urgente
  if(!iso)return[0,"—"];const d=xDias(iso),av=aviso||30;
  if(d<0)return[3,`vencido há ${-d} dia(s)`];if(d===0)return[3,"vence hoje"];if(d<=Math.min(15,av))return[3,`vence em ${d} dia(s)`];if(d<=Math.min(30,av))return[2,`vence em ${d} dia(s)`];if(d<=av)return[1,`vence em ${d} dia(s)`];
  return[0,rotuloOk||`válido até ${brDate(iso)}`];
}
const xInteg=id=>S.integrantes[id];
const xIntegOpts=(sel,ativos)=>integList().filter(i=>!ativos||(i.situacao||"Ativo")!=="Desligado").map(i=>`<option value="${i.id}" ${i.id===sel?"selected":""}>${esc(nomeInteg(i))}${i.cargo?" — "+esc(i.cargo):""}</option>`).join("");
const xResOpts=(sel,todos)=>resAll().filter(r=>todos||resAtivo(r)).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")).map(r=>`<option value="${r.id}" ${r.id===sel?"selected":""}>${esc(resNome(r))}${r.quarto?" · quarto "+esc(r.quarto):""}</option>`).join("");
const xNomeInteg=id=>{const i=S.integrantes[id];return i?nomeInteg(i):"(removido)"};
const xNomeRes=id=>{const r=resAll().find(x=>x.id===id);return r?resNome(r):"(removido)"};
const XST={};
const NUMF=(v,d=2)=>(Number(v)||0).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});

/* campo de formulário genérico */
function xCampo(c,rec){
  const v=rec[c.k]!==undefined?rec[c.k]:(typeof c.def==="function"?c.def(rec):c.def);
  const id="xf_"+c.k,L=c.l+(c.req?" *":""),ph=c.ph?` placeholder="${esc(c.ph)}"`:"",w=c.w?` style="flex:${c.w}"`:"";
  const opts=typeof c.opts==="function"?c.opts(rec):(c.opts||[]);
  let h;
  if(c.t==="ta")h=`<textarea id="${id}" style="min-height:${c.alt||70}px"${ph}>${esc(v||"")}</textarea>`;
  else if(c.t==="sel")h=`<select id="${id}">${c.vazio!==false&&!c.req?`<option value=""></option>`:""}${opts.map(o=>{const[val,txt]=Array.isArray(o)?o:[o,o];return `<option value="${esc(val)}" ${String(val)===String(v??"")?"selected":""}>${esc(txt)}</option>`}).join("")}</select>`;
  else if(c.t==="integ")h=`<select id="${id}"><option value=""></option>${xIntegOpts(v,true)}</select>`;
  else if(c.t==="res")h=`<select id="${id}"><option value=""></option>${xResOpts(v,!!c.todos)}</select>`;
  else if(c.t==="check")return `<div${w}><label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:22px"><input type="checkbox" id="${id}" ${v?"checked":""}><span>${esc(c.l)}</span></label></div>`;
  else if(c.t==="pessoa")h=`<input id="${id}" list="xdl_pessoas" value="${esc(v||"")}"${ph}>`;
  else if(c.t==="resmulti"){const set=new Set(v||[]);h=`<div id="${id}" style="max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px 10px">${resAll().filter(resAtivo).map(r=>`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin:2px 0"><input type="checkbox" value="${r.id}" ${set.has(r.id)?"checked":""}><span>${esc(resNome(r))}</span></label>`).join("")||'<span class="sub">Nenhum residente ativo.</span>'}</div>`}
  else if(c.t==="money")h=`<input id="${id}" type="number" step="0.01" min="0" value="${v??""}"${ph}>`;
  else if(c.t==="num")h=`<input id="${id}" type="number" ${c.min!=null?`min="${c.min}"`:""} ${c.max!=null?`max="${c.max}"`:""} step="${c.step||1}" value="${v??""}"${ph}>`;
  else if(c.t==="date"||c.t==="time")h=`<input id="${id}" type="${c.t}" value="${esc(v||"")}">`;
  else h=`<input id="${id}" value="${esc(v||"")}"${ph}>`;
  return `<div${w}><label for="${id}">${esc(L)}</label>${h}${c.help?`<div class="sub" style="margin-top:2px">${esc(c.help)}</div>`:""}</div>`;
}
function xLer(campos,g){
  const o={};
  campos.forEach(c=>{
    const el=g("#xf_"+c.k);if(!el)return;
    if(c.t==="check")o[c.k]=el.checked;
    else if(c.t==="resmulti")o[c.k]=[...el.querySelectorAll("input:checked")].map(x=>x.value);
    else if(c.t==="num"||c.t==="money")o[c.k]=el.value===""?"":+el.value;
    else o[c.k]=el.value.trim();
  });
  return o;
}
function xForm(d,rec,cb){
  const novo=!rec||!rec.id,r={...(rec||{})};
  const cs=d.campos.filter(c=>!c.so||c.so(r));let corpo="",k=0;
  while(k<cs.length){const a=cs[k],b=cs[k+1];
    if(!a.full&&b&&!b.full){corpo+=`<div class="row" style="align-items:flex-start">${xCampo(a,r)}${xCampo(b,r)}</div>`;k+=2}else{corpo+=`<div>${xCampo(a,r)}</div>`;k++}}
  const ov=openModal(`<h3>${esc(novo?(d.novoTit||"Novo registro"):(d.editTit||"Editar registro"))}</h3>${d.aviso?`<div class="callout sand" style="margin:8px 0">${d.aviso}</div>`:""}${corpo}
   <div class="err" id="xferr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="b sec" id="xfcx">Cancelar</button><button class="b" id="xfsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s);g("#xfcx").onclick=()=>ov.remove();
  if(d.aoAbrir)d.aoAbrir(g,r);
  let gravado=false;
  g("#xfsv").onclick=()=>{
    if(gravado)return; /* clique duplo não grava duas vezes */
    const o=xLer(d.campos,g),erro=d.campos.find(c=>c.req&&(o[c.k]===""||o[c.k]==null||(Array.isArray(o[c.k])&&!o[c.k].length)));
    if(erro)return g("#xferr").textContent=`Preencha: ${erro.l}.`;
    /* erros de digitação comuns: número negativo, fora do limite, ano com 2 dígitos */
    for(const c of d.campos){
      const v=o[c.k];if(v===""||v==null)continue;
      if((c.t==="num"||c.t==="money")&&typeof v==="number"){
        if(!isFinite(v))return g("#xferr").textContent=`${c.l}: número inválido.`;
        if(v<0&&!c.neg&&!(c.min!=null&&c.min<0))return g("#xferr").textContent=`${c.l}: não pode ser negativo.`;
        if(c.min!=null&&v<c.min)return g("#xferr").textContent=`${c.l}: o mínimo é ${c.min}.`;
        if(c.max!=null&&v>c.max)return g("#xferr").textContent=`${c.l}: o máximo é ${c.max}.`;
        if(Math.abs(v)>1e9)return g("#xferr").textContent=`${c.l}: valor grande demais. Confira os zeros.`;
      }
      if(c.t==="date"&&typeof v==="string"){const y=+v.slice(0,4);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v))||y<1900||y>2100)return g("#xferr").textContent=`${c.l}: confira a data (ano ${isNaN(y)?"inválido":y}).`}
    }
    const final={...r,...o};
    if(d.valida){const m=d.valida(final,r);if(m)return g("#xferr").textContent=m}
    if(d.antes)d.antes(final,r);
    gravado=true;ov.remove();cb(final);
  };
  return ov;
}
/* cadastro genérico: lista + busca + novo/editar/excluir.  d = {id,col,mod,campos,cols,ordem,sit,vazio,novo,...} */
const XREG={};
function xcrud(d){
  XREG[d.id]=d;const st=XST[d.id]=XST[d.id]||{q:"",n:40,f:""};
  /* registros incompletos (importados, antigos ou gravados pela metade) nunca podem derrubar a tela */
  const tenta=(fn,pad)=>{try{const v=fn();return v===undefined?pad:v}catch(e){return pad}};
  const pode=podeEd(d.mod),all=xs(d.col).filter(r=>tenta(()=>(d.filtro||(()=>true))(r),true));
  const cmp=d.ordem||((a,b)=>(b.em||"").localeCompare(a.em||""));
  const ord=all.sort((a,b)=>tenta(()=>cmp(a,b),0)),f=st.f&&d.filtros?ord.filter(r=>tenta(()=>d.filtros.fn(r,st.f),false)):ord;
  const q=estNorm(st.q||""),lista=q?f.filter(r=>estNorm(d.cols.map(c=>tenta(()=>c.v?c.v(r):r[c.k],"")).join(" ")+" "+tenta(()=>d.busca?d.busca(r):"","")).includes(q)):f;
  const mostra=lista.slice(0,st.n);
  return `<div class="card">${d.intro?`<p class="sub" style="margin:0 0 10px">${d.intro}</p>`:""}
   <div class="row" style="margin-bottom:10px;align-items:flex-end">${pode&&d.novoLabel!==null?`<button class="b" data-xa="${d.id}|novo" style="flex:none">${ic("plus")} ${esc(d.novoLabel||"Novo")}</button>`:""}${(d.botoes||[]).map((b,i)=>`<button class="b sec" data-xa="${d.id}|btn|${i}" style="flex:none">${b.l}</button>`).join("")}
    ${d.filtros?`<div style="flex:0 0 190px"><label>${esc(d.filtros.l)}</label><select data-xf="${d.id}"><option value="">Todos</option>${d.filtros.opts.map(o=>`<option ${st.f===o?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`:""}
    <div style="flex:2"><label>Buscar</label><input data-xq="${d.id}" value="${esc(st.q||"")}" placeholder="Digite para filtrar"></div></div>
   ${d.resumo?tenta(()=>d.resumo(lista),""):""}
   ${mostra.length?`<div class="wrap"><table><thead><tr>${d.cols.map(c=>`<th>${esc(c.h)}</th>`).join("")}<th></th></tr></thead><tbody>${mostra.map(r=>`<tr>${d.cols.map(c=>`<td>${String(tenta(()=>c.html?c.html(r):esc(c.v?c.v(r):(r[c.k]??"")),"")).replace(/\bundefined\b|\bNaN\b|\[object Object\]/g,"—")}</td>`).join("")}<td style="white-space:nowrap">${(d.linhaBtn||[]).map((b,i)=>(!b.se||tenta(()=>b.se(r),false))?`<button class="b sec sm" data-xa="${d.id}|lb|${r.id}|${i}">${b.l}</button> `:"").join("")}${pode?`<button class="b sec sm" data-xa="${d.id}|edit|${r.id}" title="Editar">${ic("edit")}</button> <button class="b sec sm" data-xa="${d.id}|del|${r.id}" title="Excluir">${ic("trash")}</button>`:""}</td></tr>`).join("")}</tbody></table></div>
     ${lista.length>mostra.length?`<div class="row" style="margin-top:10px"><button class="b sec sm" data-xa="${d.id}|mais" style="flex:none">Mostrar mais (${lista.length-mostra.length})</button></div>`:""}`:`<div class="empty">${esc(d.vazio||"Nada registrado ainda.")}</div>`}
   ${d.rodape?`<p class="sub" style="margin:10px 0 0">${d.rodape}</p>`:""}</div>`;
}
const SEM_META=k=>["id","em","por","_t","_u"].includes(k);
const mesmoConteudo=(a,b)=>{const ka=Object.keys(a).filter(k=>!SEM_META(k)),kb=Object.keys(b).filter(k=>!SEM_META(k));return ka.length===kb.length&&ka.every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]))};
function xcrudSalvar(d,final,antigo){
  const id=final.id||uid8(),o=strip(final),novo=!antigo||!antigo.id;
  if(novo){o.em=new Date().toISOString();o.por=ACC.uid||""}
  const grava=()=>{put(d.col,id,o);if(d.depois)d.depois({...o,id},antigo);toast("Salvo.");go(ROUTE,true)};
  /* aviso de lançamento repetido: evita pagar, entregar ou registrar duas vezes por engano */
  if(novo&&xs(d.col).some(r=>mesmoConteudo(r,o))){
    askConfirm("Já existe um registro idêntico a este. Salvar mesmo assim?","Salvar mesmo assim").then(sim=>{if(sim)grava()});return;
  }
  grava();
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-xa]");if(!b)return;
  const[cid,acao,rid,extra]=b.dataset.xa.split("|"),d=XREG[cid];if(!d)return;
  if(acao==="novo")xForm(d,d.padrao?d.padrao():{},f=>xcrudSalvar(d,f,null));
  else if(acao==="edit"){const r=S[d.col][rid];if(r)xForm(d,r,f=>xcrudSalvar(d,f,r))}
  else if(acao==="del"){const r=S[d.col][rid];if(r&&await askConfirm(d.delMsg?d.delMsg(r):"Excluir este registro? Dá para desfazer logo em seguida.","Excluir")){del(d.col,rid);if(d.aposExcluir)d.aposExcluir(r);go(ROUTE,true)}}
  else if(acao==="mais"){XST[cid].n+=40;go(ROUTE,true)}
  else if(acao==="btn"){d.botoes[+rid].fn()}
  else if(acao==="lb"){const r=S[d.col][rid];if(r)d.linhaBtn[+extra].fn(r)}
});
document.addEventListener("input",e=>{
  const q=e.target.closest("[data-xq]");if(!q)return;
  const id=q.dataset.xq;XST[id].q=q.value;XST[id].n=40;go(ROUTE,true);
  const n=document.querySelector(`[data-xq="${id}"]`);if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}
});
document.addEventListener("change",e=>{const f=e.target.closest("[data-xf]");if(!f)return;XST[f.dataset.xf].f=f.value;XST[f.dataset.xf].n=40;go(ROUTE,true)});

/* ---------- cadastro único de pessoas e empresas ---------- */
function pessoasTodas(){
  const m=new Map(),add=(nome,tipo,extra={})=>{
    const n=estNorm(nome);if(!n||n.length<2)return;
    const x=m.get(n)||{nome:String(nome).trim(),tipos:new Set(),doc:"",tel:"",email:"",fontes:0};
    x.tipos.add(tipo);x.fontes++;if(extra.doc&&!x.doc)x.doc=extra.doc;if(extra.tel&&!x.tel)x.tel=extra.tel;if(extra.email&&!x.email)x.email=extra.email;if(extra.pid)x.pid=extra.pid;m.set(n,x)};
  xs("pessoas").forEach(p=>add(p.nome,p.tipo||"Outro",{doc:p.doc,tel:p.tel,email:p.email,pid:p.id}));
  try{prestAll().forEach(p=>add(p.nome,"Prestador",{doc:p.doc||p.cnpj||p.cpf,tel:p.tel||p.telefone,email:p.email}))}catch(e){}
  try{finAll().forEach(e=>{if(e.contra)add(e.contra,e.tipo==="pagar"?"Fornecedor":"Cliente")})}catch(e){}
  try{resAll().forEach(r=>{if(r.resp&&r.resp.nome)add(r.resp.nome,"Responsável de residente",{tel:r.resp.tel,email:r.resp.email})})}catch(e){}
  return[...m.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
}
function datalistPessoas(){
  return `<datalist id="xdl_pessoas">${pessoasTodas().slice(0,400).map(p=>`<option value="${esc(p.nome)}">`).join("")}</datalist>`;
}
function pessoasDuplicadas(){
  const L=pessoasTodas(),out=[];
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const a=estNorm(L[i].nome),b=estNorm(L[j].nome);
    if(a.length>5&&b.length>5&&(a.startsWith(b)||b.startsWith(a)||(L[i].doc&&L[i].doc===L[j].doc)))out.push([L[i],L[j]]);
  }
  return out.slice(0,30);
}

/* ---------- pendências: tudo que está faltando, em uma lista ---------- */
const XURG=[]; // funções (L,h,fim) => empurram itens no formato do urgencias()
const XRES={}; // resolvedores: chave -> fn(id,dia)
function pendTodas(){
  const L=urgencias("mes"),vistos=new Set();
  return L.filter(x=>{const k=x.tipo+"|"+x.titulo;if(vistos.has(k))return false;vistos.add(k);return true});
}
function pgPend(){
  const L=pendTodas(),tipos=[...new Set(L.map(x=>x.tipo))].sort(),f=XST.pend=XST.pend||{tipo:""},V=f.tipo?L.filter(x=>x.tipo===f.tipo):L;
  const por=n=>V.filter(x=>x.nivel===n);
  return banner("","Pendências","Tudo o que está faltando preencher, vencendo ou atrasado, reunido em uma lista. Resolva daqui mesmo.","check")+noStore()+
   `<div class="stats"><div class="stat ${L.filter(x=>x.nivel===3).length?"bad":""}"><b ${L.filter(x=>x.nivel===3).length?'style="color:var(--urgente)"':""}>${L.filter(x=>x.nivel===3).length}</b><span>urgentes</span></div>
    <div class="stat warn"><b>${L.filter(x=>x.nivel===2).length}</b><span>pedem atenção</span></div><div class="stat"><b>${L.filter(x=>x.nivel===1).length}</b><span>para acompanhar</span></div></div>
    <div class="card"><div class="row" style="align-items:flex-end"><div style="flex:0 0 240px"><label>Filtrar por assunto</label><select id="pdtipo"><option value="">Todos</option>${tipos.map(t=>`<option ${f.tipo===t?"selected":""}>${esc(t)}</option>`).join("")}</select></div>
     <div class="sub" style="align-self:flex-end;flex:3">Mostra o que vence neste mês e tudo o que já passou do prazo. Só aparecem os assuntos das telas que o seu perfil acessa.</div></div></div>
    ${[3,2,1].map(n=>por(n).length?`<div class="card"><h2 ${n===3?'style="color:var(--urgente)"':""}>${["","Para acompanhar","Pedem atenção","Urgente"][n]} (${por(n).length})</h2>${por(n).map(homeItemHtml).join("")}</div>`:"").join("")||`<div class="card"><div class="empty">Nada pendente. Tudo em dia.</div></div>`}`;
}
function bindPend(){
  const s=$("pdtipo");if(s)s.onchange=()=>{XST.pend.tipo=s.value;go("pend",true)};
  bindHomeAcoes(document);
}
PGX.pend={pg:pgPend,bind:bindPend};

/* ---------- busca global ---------- */
function indiceBusca(){
  const L=[],add=(tipo,titulo,det,fn,mod)=>{if(!mod||podeVer(mod))L.push({tipo,titulo:String(titulo||""),det:String(det||""),fn,n:estNorm(titulo+" "+det)})};
  integList().forEach(i=>add("Integrante",nomeInteg(i),[i.cargo,i.depto,podePii()?i.cpf:""].filter(Boolean).join(" · "),()=>{PR.sel=i.id;go("pront")},"pront"));
  resAll().forEach(r=>add("Residente",resNome(r),[r.nome!==resNome(r)?r.nome:"","quarto "+(r.quarto||"—"),GRAU_CURTO[r.grau]||""].filter(Boolean).join(" · "),()=>{go("res");setTimeout(()=>openResidente(r.id),50)},"res"));
  try{finAll().slice(-1500).forEach(e=>add(e.tipo==="pagar"?"Conta a pagar":"A receber",e.desc,`${e.contra||""} · ${fmtBRL(e.valor)} · ${brDate(e.venc)}`,()=>{FIN.tab=e.tipo==="pagar"?"pagar":"receber";FIN.mes=-1;FIN.q=e.desc;go("fin")},"fin"))}catch(e){}
  try{prestAll().forEach(p=>add("Prestador",p.nome,p.servico||p.tipo||"",()=>{go("prest");setTimeout(()=>openPrestador(p.id),50)},"prest"))}catch(e){}
  try{dvAll().forEach(d=>add("Documento",d.nome,`${dvVinc(d)} · vence ${brDate(d.validade)}`,()=>go("docs"),"docs"))}catch(e){}
  try{tarAll().slice(-400).forEach(t=>add("Tarefa",t.titulo,`${brDate(t.data)}${t.status==="feita"?" · feita":""}`,()=>go("agenda"),"agenda"))}catch(e){}
  try{estData().itens.forEach(it=>add("Estoque",it.nome,`${it.area||""} · ${it.qtd} ${it.unidade||"un."}${it.cod?" · cód. "+it.cod:""}`,()=>go("estoque"),"estoque"))}catch(e){}
  Object.values(S.nfarq||{}).forEach(n=>add("Nota fiscal",`NF ${n.nota||""} — ${n.forn||""}`,n.nome||"",()=>go("nf"),"nf"));
  xs("pessoas").forEach(p=>add("Pessoa/empresa",p.nome,[p.tipo,p.doc,p.tel].filter(Boolean).join(" · "),()=>go(ROUTE),"fin"));
  xs("ouv").forEach(o=>add("Ouvidoria",o.assunto,`${o.status||""} · ${brDate(o.data)}`,()=>{PGX.infra.st.tab="ouv";go("infra")},"infra"));
  xs("espera").forEach(o=>add("Lista de espera",o.nome,o.status||"",()=>{PGX.admres.st.tab="espera";go("admres")},"admres"));
  xs("ativos").forEach(o=>add("Patrimônio",o.nome,o.local||"",()=>{PGX.infra.st.tab="ativos";go("infra")},"infra"));
  return L;
}
function abreBusca(){
  if(document.getElementById("xbusca"))return;
  const idx=indiceBusca();
  const ov=openModal(`<h3>Buscar em todo o sistema</h3><input id="xbusca" placeholder="Nome, nota, residente, fornecedor, documento…" autocomplete="off" style="margin-top:10px"><div id="xbres" style="margin-top:10px;max-height:55vh;overflow:auto"></div>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xbcx">Fechar</button></div>`);
  const inp=ov.querySelector("#xbusca"),box=ov.querySelector("#xbres");ov.querySelector("#xbcx").onclick=()=>ov.remove();
  let lista=[];
  const desenha=()=>{
    const q=estNorm(inp.value);
    lista=q.length<2?[]:idx.filter(x=>q.split(" ").every(p=>x.n.includes(p))).slice(0,40);
    box.innerHTML=lista.length?lista.map((x,i)=>`<div class="doc" data-bi="${i}" style="cursor:pointer"><div class="grow"><div class="nm">${esc(x.titulo)}</div><div class="sub">${esc(x.tipo)}${x.det?" · "+esc(x.det):""}</div></div><button class="b sec sm">Abrir</button></div>`).join(""):`<div class="sub">${q.length<2?"Digite ao menos 2 letras.":"Nada encontrado."}</div>`;
    box.querySelectorAll("[data-bi]").forEach(el=>el.onclick=()=>{const x=lista[+el.dataset.bi];ov.remove();x.fn()});
  };
  inp.oninput=desenha;inp.onkeydown=e=>{if(e.key==="Enter"&&lista[0]){ov.remove();lista[0].fn()}if(e.key==="Escape")ov.remove()};
  inp.focus();desenha();
}

/* ---------- backup e restauração ---------- */
const BKP_COLS=["integrantes","docs","ocorr","config","marcacoes","acessos","perfis","nfarq"];
function bkpDados(){
  const colecoes={};
  [...BKP_COLS,...Object.keys(XCOLS).filter(c=>c!=="hist")].forEach(c=>{colecoes[c]=Object.fromEntries(Object.entries(S[c]||{}).map(([id,o])=>[id,strip(o)]))});
  return{sistema:"Casa Hiro",versao:2,gerado:new Date().toISOString(),por:ACC.uid||"",colecoes};
}
function bkpContagem(){const d=bkpDados();return Object.entries(d.colecoes).map(([c,o])=>[c,Object.keys(o).length]).filter(([,n])=>n)}
async function bkpBaixar(comArquivos){
  const dados=bkpDados(),json=JSON.stringify(dados),dia=hojeIso();
  let ok=false;
  if(comArquivos&&typeof JSZip!=="undefined"&&RT.assets){
    toast("Reunindo os arquivos… pode levar um minuto.");
    const zip=new JSZip();zip.file("dados.json",json);const falhas=[];
    const ids=new Set();
    Object.values(S.docs).forEach(d=>d.assetId&&ids.add(d.assetId));Object.values(S.nfarq).forEach(d=>d.asset&&ids.add(d.asset));
    try{finAll().forEach(e=>(e.anexos||[]).forEach(a=>a.id&&ids.add(a.id)))}catch(e){}
    for(const id of ids){try{const r=await fetch("/_blob/"+id);if(!r.ok)throw 0;zip.file("arquivos/"+id,await r.arrayBuffer())}catch(e){falhas.push(id)}}
    const meta={};Object.values(S.docs).forEach(d=>{if(d.assetId)meta[d.assetId]={nome:d.nome,type:d.type}});Object.values(S.nfarq).forEach(d=>{if(d.asset)meta[d.asset]={nome:d.nome,type:d.type}});
    zip.file("arquivos.json",JSON.stringify(meta));
    ok=await saveFile(`casa-hiro-backup-${dia}.zip`,await zip.generateAsync({type:"blob",compression:"DEFLATE"}));
    if(ok&&falhas.length)toast(`${falhas.length} arquivo(s) não puderam ser lidos e ficaram fora do backup.`,true);
  }else ok=await saveFile(`casa-hiro-backup-${dia}.json`,new Blob([json],{type:"application/json"}));
  if(ok){saveCfg({backup:{ultimo:new Date().toISOString(),por:ACC.uid||"",n:bkpContagem().reduce((s,[,n])=>s+n,0)}});audit("backup","gerou backup");toast("Backup gerado.")}
}
async function bkpRestaurar(file){
  let dados;
  try{
    if(/\.zip$/i.test(file.name)){
      if(typeof JSZip==="undefined")throw new Error("Biblioteca de ZIP não carregou.");
      const z=await JSZip.loadAsync(await file.arrayBuffer()),j=z.file("dados.json");if(!j)throw new Error("O ZIP não tem dados.json.");dados=JSON.parse(await j.async("string"));
    }else dados=JSON.parse(await file.text());
  }catch(e){return toast("Arquivo de backup inválido: "+(e.message||e),true)}
  if(!dados||dados.sistema!=="Casa Hiro"||!dados.colecoes)return toast("Este arquivo não é um backup da Casa Hiro.",true);
  const total=Object.values(dados.colecoes).reduce((s,o)=>s+Object.keys(o).length,0);
  if(!await askConfirm(`Restaurar o backup de ${dados.gerado?brDate(dados.gerado.slice(0,10)):"data desconhecida"} (${total} registros)? Os registros do backup substituem os de mesmo código; o que foi criado depois fica como está. Faça um backup novo antes se houver dúvida.`,"Restaurar"))return;
  if(dados.colecoes.acessos||dados.colecoes.perfis){/* acessos e perfis só voltam se o gestor confirmar de novo */
    if(!await askConfirm("O backup também traz as permissões de acesso. Restaurar as permissões também?","Restaurar permissões")){delete dados.colecoes.acessos;delete dados.colecoes.perfis}
  }
  let n=0;HIST.mudo=true;
  try{for(const[c,regs]of Object.entries(dados.colecoes)){if(!S[c]||c==="hist")continue;for(const[id,o]of Object.entries(regs)){put(c,id,o);n++}}}finally{HIST.mudo=false}
  audit("backup","restaurou backup");toast(`${n} registro(s) restaurado(s).`);go(ROUTE,true);
}
function acBackup(){
  const b=(cfgG().backup)||{},dias=b.ultimo?-xDias(b.ultimo.slice(0,10)):null,cnt=bkpContagem();
  return `<div class="card"><h2>Backup completo</h2><p class="sub" style="margin:0 0 10px">Um arquivo com todos os dados do sistema (cadastros, ponto, financeiro, prontuário, estoque e os módulos novos). Guarde-o fora do painel, por exemplo no Drive da casa. Recomendo fazer uma vez por mês.</p>
   <div class="callout ${dias==null||dias>30?"sand":""}">${b.ultimo?`Último backup: <b>${brDate(b.ultimo.slice(0,10))}</b> (${dias} dia(s) atrás).`:"<b>Nenhum backup feito ainda.</b>"}</div>
   <div class="row" style="margin-top:12px"><button class="b" id="bkjson" style="flex:none">${ic("down")} Baixar backup dos dados (.json)</button><button class="b sec" id="bkzip" style="flex:none" ${RT.assets?"":"disabled"}>${ic("down")} Dados + arquivos enviados (.zip)</button></div>
   <p class="sub" style="margin:8px 0 0">O .zip inclui PDFs e fotos enviados (leva mais tempo). Só quem é Editor do painel consegue ler os arquivos.</p></div>
  <div class="card"><h2>Restaurar</h2><p class="sub" style="margin:0 0 10px">Escolha um backup (.json ou .zip) gerado por este sistema. Os registros voltam como estavam; nada é apagado.</p>
   <div class="row"><input type="file" id="bkfile" accept=".json,.zip" style="flex:2"><button class="b sec" id="bkrest" style="flex:none">Restaurar</button></div></div>
  <div class="card"><h2>O que há hoje no sistema</h2><div class="stats">${cnt.map(([c,n])=>`<div class="stat"><b>${n}</b><span>${esc(nomeColHist(c,c==="config"?"geral":c))}${c==="config"?" (documentos de configuração)":""}</span></div>`).join("")}</div></div>`;
}
function bindBackup(){
  $("bkjson").onclick=()=>bkpBaixar(false);$("bkzip").onclick=()=>bkpBaixar(true);
  $("bkrest").onclick=()=>{const f=$("bkfile").files[0];if(!f)return toast("Escolha o arquivo de backup.",true);bkpRestaurar(f)};
}

/* ---------- histórico de alterações (tela do gestor) ---------- */
const HST={q:"",col:"",n:60};
function acHistorico(){
  const L=xs("hist").sort((a,b)=>(b.t||"").localeCompare(a.t||"")),telas=[...new Set(L.map(x=>x.tela))].sort();
  const q=estNorm(HST.q),V=L.filter(x=>(!HST.col||x.tela===HST.col)&&(!q||estNorm(x.res+" "+x.tela+" "+x.n).includes(q)));
  return `<div class="card"><p class="sub" style="margin:0 0 10px">Cada alteração fica registrada com quem fez e quando. Quando o registro guarda a versão anterior, dá para restaurá-la. Guardamos as últimas ~700 alterações.</p>
   <div class="row" style="align-items:flex-end"><div style="flex:0 0 220px"><label>Tela</label><select id="hscol"><option value="">Todas</option>${telas.map(t=>`<option ${HST.col===t?"selected":""}>${esc(t)}</option>`).join("")}</select></div><div style="flex:2"><label>Buscar</label><input id="hsq" value="${esc(HST.q)}"></div></div></div>
  <div class="card">${V.slice(0,HST.n).map(x=>`<div class="doc"><div class="grow"><div class="nm">${esc(x.tela)} — ${esc(x.res)}</div><div class="sub">${new Date(x.t).toLocaleString("pt-BR")} · <span data-uid="${esc(x.u)}">${esc(x.n||"")}</span></div></div>
    ${x.antes&&podeEd("acesso")?`<button class="b sec sm" data-hrest="${x.id}">Restaurar versão anterior</button>`:""}</div>`).join("")||`<div class="empty">Nenhuma alteração registrada ainda.</div>`}
   ${V.length>HST.n?`<div class="row" style="margin-top:10px"><button class="b sec sm" id="hsmais" style="flex:none">Mostrar mais</button></div>`:""}</div>
  <div class="card"><h2>Trilha do servidor</h2><p class="sub" style="margin:0 0 10px">Registro guardado pelo próprio servidor de tudo o que foi gravado ou apagado, por quem e de qual endereço. Ninguém consegue apagar por aqui.</p>
   <div class="row" style="align-items:flex-end"><div style="flex:0 0 200px"><label>Mês</label><input type="month" id="trmes" value="${esc(HST.trMes||new Date().toISOString().slice(0,7))}"></div><button class="b sec" id="trver" style="flex:none">Ver trilha</button></div><div id="trbox" style="margin-top:10px"></div></div>`;
}
function bindHistorico(){
  $("hscol").onchange=e=>{HST.col=e.target.value;go("acesso",true)};
  $("hsq").oninput=e=>{HST.q=e.target.value;go("acesso",true);const n=$("hsq");n.focus();n.setSelectionRange(n.value.length,n.value.length)};
  if($("hsmais"))$("hsmais").onclick=()=>{HST.n+=60;go("acesso",true)};
  if($("trver"))$("trver").onclick=async()=>{HST.trMes=$("trmes").value;const box=$("trbox");box.textContent="Carregando…";
    try{const r=await fetch("/api/trilha?mes="+encodeURIComponent(HST.trMes),{credentials:"same-origin"});const j=await r.json();if(!r.ok)throw new Error(j.erro||"erro");
      box.innerHTML=j.itens.length?`<table class="tbl"><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Onde</th><th>IP</th></tr>${j.itens.slice(0,800).map(x=>`<tr><td>${esc(new Date(x.t).toLocaleString("pt-BR"))}</td><td>${esc(x.n||x.u)}</td><td>${esc(x.acao)}</td><td>${esc(x.alvo)}</td><td>${esc(x.ip)}</td></tr>`).join("")}</table>${j.itens.length>800?`<p class="sub">Mostrando as 800 mais recentes de ${j.itens.length}.</p>`:""}`:`<div class="empty">Nada registrado neste mês.</div>`}
    catch(e){box.textContent="Não consegui carregar: "+e.message}};
  document.querySelectorAll("[data-hrest]").forEach(b=>b.onclick=async()=>{
    const h=S.hist[b.dataset.hrest];if(!h||!h.antes)return;
    if(!await askConfirm(`Voltar "${h.tela}" para a versão de antes desta alteração? O estado atual também fica no histórico.`,"Restaurar"))return;
    put(h.col,h.rid,JSON.parse(h.antes));toast("Versão restaurada.");go("acesso",true);
  });
}

/* ---------- resumo do dia, avisos do navegador e calendário ---------- */
function resumoDia(){
  const L=urgencias("hoje"),u=L.filter(x=>x.nivel===3),a=L.filter(x=>x.nivel===2);
  const ov=openModal(`<h3>Hoje na Casa Hiro</h3><p class="sub" style="margin:4px 0 12px">${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</p>
   ${u.length?`<h2 style="color:var(--urgente)">Urgente (${u.length})</h2>${u.slice(0,8).map(homeItemHtml).join("")}`:`<div class="callout">Nada urgente hoje.</div>`}
   ${a.length?`<h2 style="margin-top:14px">Atenção (${a.length})</h2>${a.slice(0,6).map(homeItemHtml).join("")}`:""}
   <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="b sec" id="rdav">Ativar avisos neste navegador</button><button class="b sec" id="rdics">Baixar calendário (.ics)</button><button class="b" id="rdok">Fechar</button></div>`);
  ov.querySelector("#rdok").onclick=()=>ov.remove();
  bindHomeAcoes(ov,()=>ov.remove());
  ov.querySelector("#rdics").onclick=baixarICS;
  ov.querySelector("#rdav").onclick=async()=>{
    if(!("Notification" in window))return toast("Este navegador não oferece avisos.",true);
    const p=await Notification.requestPermission();
    if(p==="granted"){try{localStorage.setItem("hiro_avisos","1")}catch(e){}toast("Avisos ativados: você será avisado ao abrir o painel quando houver algo urgente.");avisoNavegador(true)}else toast("Os avisos não foram permitidos.",true);
  };
}
function avisoNavegador(forca){
  try{
    if(!("Notification" in window)||Notification.permission!=="granted")return;
    if(!forca&&localStorage.getItem("hiro_avisos")!=="1")return;
    const u=urgencias("hoje").filter(x=>x.nivel===3);if(!u.length)return;
    new Notification("Casa Hiro: "+u.length+" item(ns) urgente(s)",{body:u.slice(0,3).map(x=>x.titulo).join(" • ")});
  }catch(e){}
}
function icsEscapa(s){return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g," ")}
async function baixarICS(){
  const L=urgencias("mes").filter(x=>x.quando),dt=iso=>iso.replace(/-/g,"");
  const linhas=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Casa Hiro//Sistema//PT-BR","CALSCALE:GREGORIAN"];
  L.forEach((x,i)=>{linhas.push("BEGIN:VEVENT",`UID:hiro-${dt(x.quando)}-${i}@casahiro`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").slice(0,15)}Z`,`DTSTART;VALUE=DATE:${dt(x.quando)}`,`DTEND;VALUE=DATE:${dt(addDaysIso(x.quando,1))}`,`SUMMARY:${icsEscapa(x.tipo+": "+x.titulo)}`,`DESCRIPTION:${icsEscapa(x.detalhe)}`,"END:VEVENT")});
  linhas.push("END:VCALENDAR");
  if(await saveFile("casa-hiro-prazos.ics",new Blob([linhas.join("\r\n")],{type:"text/calendar"})))toast("Abra o arquivo para importar no calendário do celular.");
}

/* ---------- atalhos de lançamento rápido ---------- */
const ATALHOS=[
  {l:"Nova conta a pagar",m:"fin",fn:()=>{go("fin");setTimeout(()=>openFinLanc(null,"pagar"),60)}},
  {l:"Nova tarefa",m:"agenda",fn:()=>openTarefa(null,hojeIso())},
  {l:"Registrar evolução",m:"pres",fn:()=>{const r=resAll().find(resAtivo);if(!r)return toast("Cadastre um residente.",true);PRES.sel=PRES.sel||r.id;openEvolucao(PRES.sel)}},
  {l:"Registrar ocorrência (queda, intercorrência…)",m:"cuid",fn:()=>{PGX.cuid.st.tab="ocor";go("cuid");setTimeout(()=>XREG.ocor2&&xForm(XREG.ocor2,XREG.ocor2.padrao(),f=>xcrudSalvar(XREG.ocor2,f,null)),80)}},
  {l:"Medicação do dia",m:"cuid",fn:()=>{PGX.cuid.st.tab="mar";go("cuid")}},
  {l:"Entrada de nota fiscal",m:"nf",fn:()=>go("nf")},
  {l:"Reclamação / sugestão (ouvidoria)",m:"infra",fn:()=>{PGX.infra.st.tab="ouv";go("infra");setTimeout(()=>XREG.ouv&&xForm(XREG.ouv,XREG.ouv.padrao(),f=>xcrudSalvar(XREG.ouv,f,null)),80)}},
  {l:"Buscar no sistema",fn:abreBusca},{l:"Resumo de hoje",fn:resumoDia}
];
function abreAtalhos(){
  const L=ATALHOS.filter(a=>!a.m||podeEd(a.m)||a.fn===abreBusca);
  const ov=openModal(`<h3>Lançamento rápido</h3><div style="display:grid;gap:8px;margin-top:12px">${L.map((a,i)=>`<button class="b sec" data-at="${i}" style="justify-content:flex-start;padding:14px">${esc(a.l)}</button>`).join("")}</div>`);
  ov.querySelectorAll("[data-at]").forEach(b=>b.onclick=()=>{ov.remove();L[+b.dataset.at].fn()});
}
function montaChrome(){
  if(document.getElementById("xfab"))return;
  const f=document.createElement("button");f.id="xfab";f.className="b";f.title="Lançamento rápido";f.innerHTML=ic("plus");f.onclick=abreAtalhos;document.body.appendChild(f);
  const dl=document.createElement("div");dl.id="xdl";document.body.appendChild(dl);
  const s=document.createElement("button");s.id="xsearch";s.className="b sec sm";s.innerHTML=`Buscar <span class="sub">Ctrl+K</span>`;s.onclick=abreBusca;
  const q=document.getElementById("quem");if(q&&q.parentNode)q.parentNode.insertBefore(s,q);
}

/* ---------- ganchos de pendências do núcleo ---------- */
const XEVENTOS=[];
let _xAvisou=false;
function xPosGo(){
  montaChrome();
  const dl=document.getElementById("xdl");if(dl)dl.innerHTML=datalistPessoas();
  if(!_xAvisou&&estadoAcesso()==="ok"){_xAvisou=true;setTimeout(()=>avisoNavegador(false),1500)}
}
XURG.push((L,h)=>{
  if(!podeVer("acesso")&&!ACC.gestor)return;
  const b=cfgG().backup,d=b&&b.ultimo?-xDias(b.ultimo.slice(0,10)):null;
  if(RT.db&&(d==null||d>30))L.push({nivel:d==null||d>60?2:1,tipo:"Segurança dos dados",titulo:d==null?"Nenhum backup do sistema foi feito":`O último backup tem ${d} dias`,detalhe:"Baixe um backup completo e guarde fora do painel",quando:null,rota:"acesso",res:{k:"bkp"},resLabel:"Fazer backup"});
});
XRES.bkp=()=>{ACS.tab="bkp";go("acesso")};
XURG.push((L,h)=>{
  if(!podeVer("ponto"))return;
  const m=Object.values(S.marcacoes).filter(x=>!x.removida).map(x=>x.ts.slice(0,10)).sort().pop();
  if(!m)return;
  const d=-xDias(m);
  if(d>=4)L.push({nivel:d>=8?2:1,tipo:"Ponto",titulo:`A última marcação importada do relógio é de ${brDate(m)}`,detalhe:`${d} dias sem importar o arquivo do relógio`,quando:null,rota:"ponto",res:{k:"rota",id:"ponto"},resLabel:"Importar relógio"});
});

/* ---------- assinatura eletrônica simples (desenhada + selo de integridade) ---------- */
async function sha256Hex(txt){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(txt));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function openAssinar(o,cb){
  const ov=openModal(`<h3>${esc(o.titulo||"Assinatura")}</h3>
   <div class="callout" style="white-space:pre-wrap;max-height:30vh;overflow:auto;margin:10px 0">${esc(o.texto||"")}</div>
   <div class="row"><div><label>Nome de quem assina *</label><input id="asnome" value="${esc(o.nome||"")}"></div><div><label>CPF (opcional)</label><input id="asdoc" value="${esc(o.doc||"")}"></div></div>
   <label>Assinatura (desenhe com o dedo ou o mouse)</label><canvas id="ascv" class="xsig" width="600" height="200"></canvas>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:10px"><input type="checkbox" id="asok"><span>Li o texto acima e concordo.</span></label>
   <p class="sub" style="margin:6px 0 0">Assinatura eletrônica simples (Lei 14.063/2020): registra nome, data, hora e um selo de integridade do texto. Serve para termos e controles internos; contratos que exijam assinatura avançada ou ICP-Brasil precisam de outro meio.</p>
   <div class="err" id="aserr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="aslimpa">Limpar</button><button class="b sec" id="ascx">Cancelar</button><button class="b" id="assv">Assinar</button></div>`);
  const g=s=>ov.querySelector(s),cv=g("#ascv"),cx=cv.getContext("2d");let desenhando=false,tem=false;
  cx.lineWidth=3;cx.lineCap="round";cx.strokeStyle="#111";
  const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
  cv.onpointerdown=e=>{desenhando=true;tem=true;const[x,y]=pos(e);cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+.1,y+.1);cx.stroke();cv.setPointerCapture(e.pointerId)};
  cv.onpointermove=e=>{if(!desenhando)return;const[x,y]=pos(e);cx.lineTo(x,y);cx.stroke()};
  cv.onpointerup=cv.onpointercancel=()=>{desenhando=false};
  g("#aslimpa").onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);tem=false};g("#ascx").onclick=()=>ov.remove();
  g("#assv").onclick=async()=>{
    const nome=g("#asnome").value.trim();if(!nome)return g("#aserr").textContent="Informe o nome de quem assina.";
    if(!tem)return g("#aserr").textContent="Desenhe a assinatura no quadro.";if(!g("#asok").checked)return g("#aserr").textContent="Marque que leu e concorda.";
    const png=cv.toDataURL("image/png"),em=new Date().toISOString(),doc=g("#asdoc").value.trim(),texto=String(o.texto||"").slice(0,8000);
    const hash=await sha256Hex([texto,nome,doc,png,em].join("|")),id=uid8();
    put("assin",id,{tipo:o.tipo||"",ref:o.ref||"",titulo:o.titulo||"",nome,doc,png,texto,hash,em,por:ACC.uid||""});
    ov.remove();toast("Assinatura registrada.");if(cb)cb(id);
  };
}
async function assinVerifica(a){return a&&a.hash===await sha256Hex([a.texto||"",a.nome,a.doc||"",a.png,a.em].join("|"))}
const assinChip=id=>{const a=S.assin[id];return a?`<span class="pill s-ok" title="Selo ${esc(String(a.hash||"").slice(0,16))}">assinado por ${esc(a.nome)} em ${brDate(String(a.em||"").slice(0,10))}</span> <button class="b sec sm" data-asver="${id}">Ver</button>`:`<span class="pill s-pendencia">sem assinatura</span>`};
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-asver]");if(!b)return;const a=S.assin[b.dataset.asver];if(!a)return;
  const v=await assinVerifica(a);
  const ov=openModal(`<h3>${esc(a.titulo||"Assinatura")}</h3><p class="sub">${esc(a.nome)}${a.doc?" · CPF "+esc(a.doc):""} · ${new Date(a.em).toLocaleString("pt-BR")}</p><img src="${a.png}" style="max-width:100%;border:1px solid var(--line);border-radius:8px;background:#fff">
   <div class="callout ${v?"":"sand"}" style="margin-top:10px">${v?"Selo de integridade conferido: o texto e a assinatura não foram alterados.":"<b>Atenção:</b> o selo não confere. O registro foi alterado depois de assinado."}<div class="sub" style="word-break:break-all">${esc(a.hash)}</div></div>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b" id="avx">Fechar</button></div>`);
  ov.querySelector("#avx").onclick=()=>ov.remove();
});
/* configuração própria dos módulos novos (um documento por área) */
const xcfg=k=>S.config["x_"+k]||{};
const xcfgSave=(k,patch)=>put("config","x_"+k,{...strip(xcfg(k)),...patch});
/* barreiras de gravação (ex.: mês de ponto fechado) */
const XGUARD=[];

/* rede de segurança: comparador de ordenação que falha por registro incompleto não derruba a tela */
(()=>{const o=Array.prototype.sort;Array.prototype.sort=function(f){if(typeof f!=="function")return o.call(this);return o.call(this,(a,b)=>{try{const v=f(a,b);return typeof v==="number"&&!isNaN(v)?v:0}catch(e){return 0}})}})();


/* >>> x_gp.js */
