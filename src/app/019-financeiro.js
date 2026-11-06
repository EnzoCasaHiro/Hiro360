/* ================= FINANCEIRO ================= */
const FIN={tab:"geral",ano:new Date().getFullYear(),mes:new Date().getMonth(),status:"todos",q:"",cat:"",incNF:true,projetar:true};
const FIN_REPS=[["1","Única (uma vez só)"],["mensal","Mensal"],["bimestral","A cada 2 meses (bimestral)"],["trimestral","Trimestral (a cada 3 meses)"],["semestral","A cada 6 meses (semestral)"],["anual","Anual"],["quinzenal","Quinzenal (a cada 14 dias)"],["semanal","Semanal"],["parcelado","Parcelado — valor total dividido"]];
const REP_PASSO={mensal:{m:1},bimestral:{m:2},trimestral:{m:3},semestral:{m:6},anual:{m:12},quinzenal:{d:14},semanal:{d:7}};
const REP_QTD_PADRAO={"1":1,mensal:12,bimestral:6,trimestral:4,semestral:4,anual:3,quinzenal:12,semanal:12,parcelado:6};
const REP_CURTO={mensal:"mensal",bimestral:"a cada 2 meses",trimestral:"trimestral",semestral:"a cada 6 meses",anual:"anual",quinzenal:"quinzenal",semanal:"semanal"};
// datas calculadas sempre a partir da primeira (31/01 mensal → 28/02, 31/03...), por quantidade ou até uma data
function repDatas(venc,passo,n,ate){
  const out=[];
  for(let i=0;i<600;i++){const d=passo.m?addMesesIso(venc,passo.m*i):addDaysIso(venc,passo.d*i);if(ate?d>ate:i>=n)break;out.push(d)}
  return out;
}
const FIN_FORMAS=["Boleto","PIX","Transferência","Cartão","Dinheiro","Débito automático","Cheque","Outro"];
const FIN_TABS=[["geral","Visão geral"],["pagar","Contas a pagar"],["receber","Contas a receber"],["rec","Recorrentes"],["fluxo","Fluxo de caixa"],["conc","Conciliação"],["rel","Relatórios"],["contas","Contas e caixa"],["cob","Cobrança"],["cal","Calendário"],["ajus","Ajustes"],["mais","Mais ferramentas"]];
const finKeys=()=>Object.keys(S.config).filter(k=>/^fin_\d{4}$/.test(k));
const finAll=()=>finKeys().flatMap(k=>S.config[k].itens||[]);
const finCfg=()=>S.config.fin_cfg||{};
const hojeIso=()=>isoDate(new Date());
const finNum=e=>+(e.pago?(e.valorPago??e.valor):e.valor)||0;
const finStatus=e=>e.cancelada?"cancelada":e.pago?"pago":(e.venc<hojeIso()?"vencido":"aberto");
const finStatusLabel=e=>{const s=finStatus(e);if(s==="cancelada")return"Cancelada";return s==="pago"?(e.tipo==="receber"?"Recebido":"Pago"):s==="vencido"?"Vencido":"Em aberto"};
const finPill=e=>{const s=finStatus(e);return `<span class="pill ${s==="pago"?"s-ok":s==="vencido"?"s-falta":"s-pendencia"}">${finStatusLabel(e)}</span>`};
const soma=(l,f)=>l.reduce((s,x)=>s+f(x),0);
function addMesesIso(iso,n){
  const[y,m,d]=iso.split("-").map(Number),t=new Date(y,m-1+n,1),ult=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  return isoDate(new Date(t.getFullYear(),t.getMonth(),Math.min(d,ult)));
}
// os lançamentos ficam em um documento por ano de vencimento (fin_2026, fin_2027...), para não estourar o limite de tamanho
function finMutate(fn){
  const antes=finAll(),depois=fn([...antes]),por={};
  depois.forEach(e=>{const y=e.venc.slice(0,4);(por[y]=por[y]||[]).push(e)});
  new Set([...Object.keys(por),...antes.map(e=>e.venc.slice(0,4))]).forEach(y=>{
    const novo=por[y]||[],velho=antes.filter(e=>e.venc.slice(0,4)===y);
    if(JSON.stringify(novo)!==JSON.stringify(velho))put("config","fin_"+y,{itens:novo});
  });
}
function fluxoMeses(ano,incNF,projetar){
  const all=finAll(),hoje=hojeIso(),mesAtual=hoje.slice(0,7);
  const nf=incNF&&S.config.nf&&S.config.nf.rows?S.config.nf.rows.filter(r=>!r.viaFin):[];
  const mk=(y,m)=>`${y}-${String(m+1).padStart(2,"0")}`;
  const real=k=>{
    let e=0,s=0;
    all.forEach(x=>{if(x.pago&&x.pago.slice(0,7)===k){if(x.tipo==="receber")e+=finNum(x);else s+=finNum(x)}});
    nf.forEach(r=>{if(r.date&&r.date.slice(0,7)===k)s+=r.total});
    return{e,s};
  };
  // média dos últimos 12 meses fechados (só meses que tiveram movimento)
  let mE=0,mS=0,n=0;
  for(let i=1;i<=12;i++){const[y,m]=addMesesIso(mesAtual+"-01",-i).slice(0,7).split("-").map(Number);const r=real(mk(y,m-1));if(r.e||r.s){mE+=r.e;mS+=r.s;n++}}
  const mediaE=n?mE/n:0,mediaS=n?mS/n:0;
  const out=[];
  for(let m=0;m<12;m++){
    const k=mk(ano,m),r=real(k);let eP=0,sP=0;
    all.forEach(x=>{if(!x.pago&&x.venc.slice(0,7)===k){if(x.tipo==="receber")eP+=+x.valor;else sP+=+x.valor}});
    const futuro=k>mesAtual;
    const estE=projetar&&futuro?Math.max(0,mediaE-eP):0,estS=projetar&&futuro?Math.max(0,mediaS-sP):0;
    out.push({k,m,eR:r.e,eP,estE,sR:r.s,sP,estS,ent:r.e+eP+estE,sai:r.s+sP+estS});
  }
  return{meses:out,mediaE,mediaS,baseMeses:n};
}
function finChartHtml(ms){
  const mx=Math.max(1,...ms.map(x=>Math.max(x.ent,x.sai)));
  const stack=(partes)=>`<div style="display:flex;flex-direction:column-reverse;height:140px;flex:1 1 0;min-width:3px;max-width:14px">${partes.map(([v,bg,dash])=>v>0?`<div style="height:${v/mx*100}%;${dash?"border:1px dashed var(--madeira);box-sizing:border-box;":"background:"+bg+";"}"></div>`:"").join("")}</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px">${ms.map(x=>`<div style="text-align:center">
    <div style="display:flex;gap:2px;justify-content:center;align-items:flex-end;height:140px" title="${MESES_PT[x.m]}: entradas ${fmtBRL(x.ent)} · saídas ${fmtBRL(x.sai)}">
      ${stack([[x.eR,"var(--verde-medio)"],[x.eP,"var(--verde-claro)"],[x.estE,"",1]])}${stack([[x.sR,"var(--madeira)"],[x.sP,"var(--madeira-clara)"],[x.estS,"",1]])}</div>
    <div class="sub" style="margin-top:4px">${MESES_PT[x.m].slice(0,3)}</div></div>`).join("")}</div>
   <div class="legend" style="margin-top:10px"><span><i style="background:var(--verde-medio)"></i>Entrada realizada</span><span><i style="background:var(--verde-claro)"></i>Entrada prevista</span>
    <span><i style="background:var(--madeira)"></i>Saída realizada</span><span><i style="background:var(--madeira-clara)"></i>Saída prevista</span><span><i style="border:1px dashed var(--madeira)"></i>Estimado pela média</span></div>`;
}
const finMoney=v=>`<span class="${v<0?"num-neg":"num-pos"}">${fmtBRL(v)}</span>`;

function finFornId(contra,prest){
  if(prest)return"p:"+prest;
  const n=estNorm(contra);if(!n)return null;
  const p=prestAll().find(x=>estNorm(x.nome)===n);if(p)return"p:"+p.id;
  const ex=finAll().find(e=>e.fornId&&e.fornId[0]!=="p"&&e.fornId[0]!=="n"&&estNorm(e.contra)===n);   // reaproveita o CNPJ vindo da NF-e
  return ex?ex.fornId:"n:"+n;
}
const finOrfa=e=>e.tipo==="pagar"&&!e.fornId&&!e.nf&&!e.prest&&!e.contrato&&!e.rpa;
function finIntegHtml(){
  const o=finAll().filter(finOrfa);if(!o.length)return"";
  const comNome=o.filter(e=>e.contra).length;
  return `<div class="callout sand" style="margin-bottom:14px"><b>${o.length}</b> conta(s) a pagar sem fornecedor ou nota vinculada. Toda conta a pagar deve apontar para um fornecedor, prestador ou nota fiscal, para o relatório por fornecedor e a conciliação baterem.
   ${comNome?`<button class="b sm" id="finvinc" style="margin-left:8px">Vincular automaticamente (${comNome})</button>`:`<span class="sub"> Abra cada uma e informe o fornecedor.</span>`}</div>`;
}
function finVincularAuto(){
  let n=0;
  finMutate(all=>all.map(e=>{if(finOrfa(e)&&e.contra){const f=finFornId(e.contra,null);if(f){n++;return{...e,fornId:f}}}return e}));
  toast(n?`${n} conta(s) vinculada(s) ao fornecedor.`:"Nada para vincular.");go("fin",true);
}
function pgFin(){
  return banner("","Financeiro","Contas a pagar, contas a receber e fluxo de caixa — com lançamentos feitos à mão e as notas fiscais.","wallet")+noStore()+
   `<div class="tabs" style="flex-wrap:wrap">${FIN_TABS.map(([k,l])=>`<button data-fintab="${k}" class="${FIN.tab===k?"on":""}">${l}</button>`).join("")}</div>`+
   (FIN.tab==="pagar"||FIN.tab==="geral"?finIntegHtml():"")+
   (FIN.tab==="geral"?finGeralHtml():FIN.tab==="fluxo"?finFluxoHtml():FIN.tab==="conc"?finConcHtml():FIN.tab==="rel"?finRelHtml():FIN.tab==="rec"?finRecHtml():FIN.tab==="contas"?finContasHtml():FIN.tab==="cob"?finCobHtml():FIN.tab==="cal"?finCalHtml():FIN.tab==="ajus"?finAjustesHtml():FIN.tab==="mais"?finMaisHtml():finListaHtml(FIN.tab));
}
function finPeriodoHtml(){
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-3,FIN.ano);y<=Math.max(y0+5,FIN.ano);y++)anos.push(y);
  return `<div class="row" style="align-items:flex-end;margin-bottom:10px">
   <button type="button" class="b sec sm" id="finprev" title="Anterior" style="flex:none">◀</button>
   <div><label>Mês</label><select id="finmes"><option value="-1" ${FIN.mes<0?"selected":""}>Todos os meses</option>${MESES_PT.map((n,k)=>`<option value="${k}" ${FIN.mes===k?"selected":""}>${n}</option>`).join("")}</select></div>
   <div><label>Ano</label><select id="finano">${anos.map(y=>`<option ${y===FIN.ano?"selected":""}>${y}</option>`).join("")}</select></div>
   <button type="button" class="b sec sm" id="finnext" title="Próximo" style="flex:none">▶</button></div>`;
}
function finListaHtml(tipo){
  const todos=finAll().filter(e=>e.tipo===tipo),hoje=hojeIso(),em7=addDaysIso(hoje,7),pagar=tipo==="pagar";
  const abertos=todos.filter(e=>!e.pago),venc=abertos.filter(e=>e.venc<hoje),prox=abertos.filter(e=>e.venc>=hoje&&e.venc<=em7);
  const noPer=todos.filter(e=>e.venc.slice(0,4)===String(FIN.ano)&&(FIN.mes<0||+e.venc.slice(5,7)-1===FIN.mes));
  const cats=[...new Set(todos.map(e=>e.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
  const listaAll=finFiltrar(tipo),lista=listaAll.slice(0,finLim());
  const pagoNoPer=noPer.filter(e=>e.pago&&!e.cancelada);
  return `<div class="stats">
   <div class="stat"><b>${fmtBRL(soma(abertos,e=>+e.valor))}</b><span>${pagar?"a pagar":"a receber"} em aberto · ${abertos.length}</span></div>
   <div class="stat ${venc.length?"bad":""}"><b>${fmtBRL(soma(venc,e=>+e.valor))}</b><span>vencido · ${venc.length}</span></div>
   <div class="stat ${prox.length?"warn":""}"><b>${fmtBRL(soma(prox,e=>+e.valor))}</b><span>vence nos próximos 7 dias · ${prox.length}</span></div>
   <div class="stat blue"><b>${fmtBRL(soma(pagoNoPer,finNum))}</b><span>${pagar?"pago":"recebido"} no período · ${pagoNoPer.length}</span></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px;align-items:flex-end"><button class="b" data-fnovo="${tipo}" style="flex:none">${ic("plus")} ${pagar?"Nova conta a pagar":"Nova conta a receber"}</button>
   <button class="b sec" id="fincsv" style="flex:none">${ic("down")} Baixar CSV</button>
   <button class="b sec" id="finpdf" style="flex:none">${ic("down")} Baixar PDF</button>
   <button class="b" id="finbaixalote" style="flex:none">${ic("check")} Dar baixa nas marcadas</button>
   <button class="b sec" id="fincomp" style="flex:none">${ic("clip")} Baixar comprovantes (.zip)</button></div>
   ${finPeriodoHtml()}
   <div class="row" style="margin-bottom:12px">
    <div><label>Situação</label><select id="finstatus">${[["todos","Todas"],["abertos","Em aberto"],["vencidos","Vencidas"],["pagos",pagar?"Pagas":"Recebidas"],["semcomp",pagar?"Pagas sem comprovante":"Recebidas sem comprovante"]].map(([v,l])=>`<option value="${v}" ${FIN.status===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div><label>Categoria</label><select id="fincat"><option value="">Todas</option>${cats.map(c=>`<option ${c===FIN.cat?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    <div style="flex:2"><label>Buscar</label><input id="finq" value="${esc(FIN.q)}" placeholder="descrição ou ${pagar?"fornecedor":"cliente"}"></div></div>
   ${lista.length?`<div class="wrap"><table><thead><tr><th style="width:28px"><input type="checkbox" id="fselall" title="Marcar todas as contas em aberto da lista"></th>${finThSort("venc","Vencimento")}${finThSort("desc","Descrição")}${finThSort("cat","Categoria")}${finThSort("area","Área")}${finThSort("valor","Valor","n")}${finThSort("status","Situação")}<th></th></tr></thead><tbody>
   ${lista.map(e=>`<tr><td>${e.pago?"":`<input type="checkbox" data-fsel="${e.id}">`}</td><td>${brDate(e.venc)}${finDiaInfo(e)}</td><td><b>${esc(e.desc)}</b>${e.parcela?` <span class="chip">${esc(e.parcela)}</span>`:""}<div class="sub">${esc([e.contra,e.forma,e.doc?"doc. "+e.doc:"",e.comp?"competência "+e.comp.slice(5)+"/"+e.comp.slice(0,4):"",e.rep?REP_CURTO[e.rep]+(e.recorrencia?" · sem fim":""):"",e.residente?"residente: "+resNomeDe(e.residente):""].filter(Boolean).join(" · "))}</div></td>
    <td>${esc(e.cat||"—")}</td><td>${esc(e.area||"—")}</td><td class="n">${fmtBRL(finNum(e))}${e.pago&&finNum(e)!==+e.valor?`<div class="sub">previsto ${fmtBRL(e.valor)}</div>`:""}</td>
    <td>${finPill(e)}${e.pago?`<div class="sub">${brDate(e.pago)}${(e.anexos||[]).length||e.cancelada?"":" · sem comprovante"}${e.parcial?" · pagamento parcial":""}</div>`:""}</td>
    <td style="white-space:nowrap">${finAcoes3(e)}${e.nfarq&&S.nfarq[e.nfarq]?`<button class="b sec sm" data-fnfarq="${e.nfarq}" title="Baixar a nota fiscal">${ic("receipt")}</button> `:""}<button class="b sec sm" data-fanexo="${e.id}" title="Comprovantes e anexos">${ic("clip")}${(e.anexos||[]).length?" "+e.anexos.length:""}</button> ${e.pago?`<button class="b sec sm" data-festorno="${e.id}" title="Estornar baixa">${ic("undo")}</button>`:`<button class="b sm" data-fbaixa="${e.id}" title="Dar baixa">${ic("check")} ${pagar?"Pagar":"Receber"}</button>`}
     <button class="b sec sm" data-fedit="${e.id}" title="Editar">${ic("edit")}</button><button class="b sec sm" data-fdel="${e.id}" title="Excluir">${ic("trash")}</button></td></tr>`).join("")}
   </tbody></table></div>
   <p class="sub" style="margin:10px 0 0">${listaAll.length} lançamento(s) · total listado <b>${fmtBRL(soma(listaAll,finNum))}</b>${listaAll.length>lista.length?` · mostrando ${lista.length} <button type="button" class="b sec sm" id="finmais">Mostrar mais</button>`:""}</p>`:`<div class="empty">Nenhum lançamento ${FIN.mes<0?"em "+FIN.ano:"em "+MESES_PT[FIN.mes]+" de "+FIN.ano} com esses filtros.</div>`}</div>`;
}
function finGeralHtml(){
  const all=finAll(),hoje=hojeIso(),ab=all.filter(e=>!e.pago);
  const pg=ab.filter(e=>e.tipo==="pagar"),rc=ab.filter(e=>e.tipo==="receber"),venc=pg.filter(e=>e.venc<hoje),vencR=rc.filter(e=>e.venc<hoje);
  const lim30=addDaysIso(hoje,30),saldo=soma(rc.filter(e=>e.venc<=lim30),e=>+e.valor)-soma(pg.filter(e=>e.venc<=lim30),e=>+e.valor);
  const fl=fluxoMeses(FIN.ano,FIN.incNF,FIN.projetar);
  const prox=l=>l.sort((a,b)=>a.venc.localeCompare(b.venc)).slice(0,6);
  const linhaP=e=>`<div class="doc"><div class="grow"><div class="nm">${esc(e.desc)}</div><div class="sub">${brDate(e.venc)}${e.contra?" · "+esc(e.contra):""}</div></div><b>${fmtBRL(e.valor)}</b>${e.venc<hoje?` <span class="pill s-falta">vencido</span>`:""}<button class="b sm" data-fbaixa="${e.id}">${ic("check")}</button></div>`;
  const ano=FIN.ano,cat={};
  all.filter(e=>e.tipo==="pagar"&&e.venc.startsWith(String(ano))).forEach(e=>cat[e.cat||"Sem categoria"]=(cat[e.cat||"Sem categoria"]||0)+finNum(e));
  if(FIN.incNF&&S.config.nf&&S.config.nf.rows)S.config.nf.rows.forEach(r=>{if(!r.viaFin&&r.date&&r.date.startsWith(String(ano)))cat[r.categoria]=(cat[r.categoria]||0)+r.total});
  const cl=Object.keys(cat).sort((a,b)=>cat[b]-cat[a]).slice(0,6),cmax=Math.max(1,...cl.map(c=>cat[c]));
  return `<div class="stats">
   <div class="stat"><b>${fmtBRL(soma(pg,e=>+e.valor))}</b><span>a pagar em aberto · ${pg.length}</span></div>
   <div class="stat"><b>${fmtBRL(soma(rc,e=>+e.valor))}</b><span>a receber em aberto · ${rc.length}</span></div>
   <div class="stat ${venc.length?"bad":""}"><b>${fmtBRL(soma(venc,e=>+e.valor))}</b><span>contas vencidas a pagar · ${venc.length}</span></div>
   <div class="stat ${saldo<0?"warn":"blue"}"><b>${fmtBRL(saldo)}</b><span>saldo previsto até ${brDate(addDaysIso(hoje,30))} (receber − pagar, com as vencidas)</span></div></div>
  <div class="row" style="margin-bottom:16px"><button class="b" data-fnovo="pagar" style="flex:none">${ic("plus")} Nova conta a pagar</button><button class="b sec" data-fnovo="receber" style="flex:none">${ic("plus")} Nova conta a receber</button></div>
  <div class="grid g2" style="margin-bottom:16px">
   <div class="card" style="margin:0"><h2>Próximos a pagar</h2>${prox(pg).map(linhaP).join("")||`<div class="empty">Nada em aberto.</div>`}</div>
   <div class="card" style="margin:0"><h2>Próximos a receber</h2>${prox(rc).map(linhaP).join("")||`<div class="empty">Nada em aberto.</div>`}${vencR.length?`<p class="sub" style="margin:8px 0 0">${vencR.length} recebimento(s) em atraso.</p>`:""}</div></div>
  <div class="card"><h2>Fluxo de caixa de ${ano}</h2>${finChartHtml(fl.meses)}<p class="sub" style="margin:10px 0 0">Veja o detalhe mês a mês, o saldo acumulado e a projeção na aba "Fluxo de caixa".</p></div>
  <div class="card"><h2>Compras e estoque</h2><div class="stats" style="margin:0 0 10px">
   <div class="stat"><b>${fmtBRL(soma(nfRowsPer({ano:+hoje.slice(0,4),mes:+hoje.slice(5,7)-1}),r=>r.total))}</b><span>compras do mês (notas fiscais)</span></div>
   <div class="stat blue"><b>${fmtBRL(estValor())}</b><span>valor estimado em estoque</span></div>
   <div class="stat ${estData().itens.some(estBaixo)?"warn":""}"><b>${estData().itens.filter(estBaixo).length}</b><span>itens para repor</span></div></div>
   <div class="row"><button class="b sec" id="fingoest" style="flex:none">${ic("box")} Abrir o estoque</button><button class="b sec" id="finnfest" style="flex:none">${ic("receipt")} Dar entrada de uma nota no estoque</button></div></div>
  <div class="card"><h2>Maiores saídas de ${ano} por categoria</h2>${cl.length?cl.map(c=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>${esc(c)}</span><b>${fmtBRL(cat[c])}</b></div><div class="bar" style="width:100%"><i style="width:${cat[c]/cmax*100}%"></i></div></div>`).join(""):`<div class="empty">Sem saídas lançadas neste ano.</div>`}</div>`;
}
function finFluxoHtml(){
  const fl=fluxoMeses(FIN.ano,FIN.incNF,FIN.projetar),ms=fl.meses,ini=finSaldoIni(FIN.ano);
  let ac=ini;const lin=ms.map(x=>{const res=x.ent-x.sai;ac+=res;return{...x,res,ac}});
  const totE=soma(ms,x=>x.ent),totS=soma(ms,x=>x.sai);
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-3,FIN.ano);y<=Math.max(y0+5,FIN.ano);y++)anos.push(y);
  const det=(a,b,c)=>[a?"real "+fmtBRL(a):"",b?"prev. "+fmtBRL(b):"",c?"est. "+fmtBRL(c):""].filter(Boolean).join(" · ");
  return `<div class="card"><div class="row" style="align-items:flex-end;margin-bottom:10px">
    <button type="button" class="b sec sm" id="fluprev" style="flex:none">◀</button>
    <div><label>Exercício (ano)</label><select id="fluano">${anos.map(y=>`<option ${y===FIN.ano?"selected":""}>${y}</option>`).join("")}</select></div>
    <button type="button" class="b sec sm" id="flunext" style="flex:none">▶</button>
    <div><label>Saldo inicial do exercício (R$) <span class="sub">— em branco: usa o saldo final do ano anterior</span></label><input type="number" step="0.01" data-stepby="1" id="flusaldo" value="${(finCfg().saldoIni||{})[FIN.ano]??""}" placeholder="${ini?NUMF(ini):"0"}"></div></div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="flunf" ${FIN.incNF?"checked":""}> Incluir as notas fiscais como saídas realizadas</label>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:6px"><input type="checkbox" id="fluproj" ${FIN.projetar?"checked":""}> Projetar os meses futuros: completar até a média dos últimos 12 meses${fl.baseMeses?` (base: ${fl.baseMeses} mês(es) com movimento — entradas ${fmtBRL(fl.mediaE)}, saídas ${fmtBRL(fl.mediaS)} por mês)`:" (ainda sem histórico para calcular a média)"}</label></div>
  <div class="stats"><div class="stat"><b>${fmtBRL(totE)}</b><span>entradas do exercício (real + previsto + estimado)</span></div>
   <div class="stat"><b>${fmtBRL(totS)}</b><span>saídas do exercício</span></div>
   <div class="stat ${totE-totS<0?"warn":"blue"}"><b>${fmtBRL(totE-totS)}</b><span>resultado do exercício</span></div>
   <div class="stat"><b>${fmtBRL(ini+totE-totS)}</b><span>saldo final esperado</span></div></div>
  <div class="card"><h2>Fluxo de caixa de ${FIN.ano}</h2>${finChartHtml(ms)}</div>
  <div class="card"><h2>Mês a mês</h2><div class="wrap"><table><thead><tr><th>Mês</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Resultado</th><th class="n">Saldo acumulado</th></tr></thead><tbody>
   ${lin.map(x=>`<tr><td><b>${MESES_PT[x.m]}</b></td><td class="n">${fmtBRL(x.ent)}<div class="sub">${det(x.eR,x.eP,x.estE)}</div></td><td class="n">${fmtBRL(x.sai)}<div class="sub">${det(x.sR,x.sP,x.estS)}</div></td>
    <td class="n">${finMoney(x.res)}</td><td class="n">${finMoney(x.ac)}</td></tr>`).join("")}
   <tr style="font-weight:700"><td>Total</td><td class="n">${fmtBRL(totE)}</td><td class="n">${fmtBRL(totS)}</td><td class="n">${finMoney(totE-totS)}</td><td class="n">${finMoney(ini+totE-totS)}</td></tr>
  </tbody></table></div><p class="sub" style="margin:10px 0 0">Realizado = já pago/recebido (e notas fiscais). Previsto = lançado e ainda em aberto, no mês do vencimento. Estimado = complemento pela média histórica, só nos meses futuros.</p></div>`;
}
function bindFin(){
  document.querySelectorAll("[data-fintab]").forEach(b=>b.onclick=()=>{FIN.tab=b.dataset.fintab;FIN.status="todos";FIN.cat="";FIN.q="";go("fin",true)});
  const re=()=>go("fin",true);
  const em=$("finmes");
  if(em){
    em.onchange=()=>{FIN.mes=+em.value;re()};
    $("finano").onchange=e=>{FIN.ano=+e.target.value;re()};
    $("finprev").onclick=()=>{if(FIN.mes<0)FIN.ano--;else{FIN.mes--;if(FIN.mes<0){FIN.mes=11;FIN.ano--}}re()};
    $("finnext").onclick=()=>{if(FIN.mes<0)FIN.ano++;else{FIN.mes++;if(FIN.mes>11){FIN.mes=0;FIN.ano++}}re()};
    if($("finstatus")){
      $("finstatus").onchange=e=>{FIN.status=e.target.value;re()};
      $("fincat").onchange=e=>{FIN.cat=e.target.value;re()};
      const q=$("finq");q.oninput=()=>{FIN.q=q.value;re();const n=$("finq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
      $("fincsv").onclick=()=>finCsv(FIN.tab);
    }
  }
  bindFinExtras();
  const fa=$("fluano");
  if(fa){
    fa.onchange=()=>{FIN.ano=+fa.value;re()};
    $("fluprev").onclick=()=>{FIN.ano--;re()};$("flunext").onclick=()=>{FIN.ano++;re()};
    $("flunf").onchange=e=>{FIN.incNF=e.target.checked;re()};
    $("fluproj").onchange=e=>{FIN.projetar=e.target.checked;re()};
    $("flusaldo").onchange=e=>{put("config","fin_cfg",{...strip(finCfg()),saldoIni:finSaldoMuda(e.target.value)});toast("Saldo inicial salvo.");setTimeout(re,0)};
  }
  document.querySelectorAll("[data-fnovo]").forEach(b=>b.onclick=()=>openFinLanc(null,b.dataset.fnovo));
  document.querySelectorAll("[data-fedit]").forEach(b=>b.onclick=()=>openFinLanc(b.dataset.fedit));
  document.querySelectorAll("[data-fbaixa]").forEach(b=>b.onclick=()=>openFinBaixa(b.dataset.fbaixa));
  document.querySelectorAll("[data-fdel]").forEach(b=>b.onclick=()=>openFinDel(b.dataset.fdel));
  document.querySelectorAll("[data-festorno]").forEach(b=>b.onclick=async()=>{const e0=finAll().find(x=>x.id===b.dataset.festorno);if(!e0)return;if(!await askConfirm(`Estornar a baixa de "${e0.desc}"? A conta volta para "em aberto".`,"Estornar"))return;finMutate(all=>all.map(e=>e.id===e0.id?{...e,pago:null,valorPago:null,cancelada:null,parcial:null,conc:false}:e));toast("Baixa estornada.");go("fin",true)});
}
function openFinLanc(id,tipoPadrao,preset){
  const pre=preset||{},ed=id?finAll().find(e=>e.id===id):null,tipo=ed?ed.tipo:(tipoPadrao||"pagar"),areas=estData().areas;
  const cats=[...new Set([...finAll().map(e=>e.cat),...((S.config.nf&&S.config.nf.rows)||[]).map(r=>r.categoria)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
  const ov=openModal(`<h3>${ed?"Editar lançamento":"Novo lançamento"}</h3>
   <div class="row"><div><label>Tipo</label><select id="fltipo"><option value="pagar" ${tipo==="pagar"?"selected":""}>A pagar (saída)</option><option value="receber" ${tipo==="receber"?"selected":""}>A receber (entrada)</option></select></div>
   <div><label>Vencimento</label><input type="date" id="flvenc" value="${ed?ed.venc:hojeIso()}"></div></div>
   <label>Descrição</label><input id="fldesc" value="${esc(ed?ed.desc:(pre.desc||""))}" placeholder="Ex.: Energia elétrica, mensalidade, convênio...">
   <div class="row"><div><label id="flcl">${tipo==="pagar"?"Fornecedor":"Cliente / fonte"}</label><input id="flcontra" value="${esc(ed?ed.contra||"":(pre.contra||""))}"></div>
   <div><label>Valor (R$)</label><input type="number" min="0" step="0.01" data-stepby="1" id="flvalor" value="${ed?ed.valor:(pre.valor||"")}"></div></div>
   <div class="row"><div><label>Categoria</label><input id="flcat" list="flcats" value="${esc(ed?ed.cat||"":(pre.cat||""))}"><datalist id="flcats">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
   <div><label>Área / centro de custo</label><select id="flarea"><option value="">—</option>${areas.map(a=>`<option ${(ed?ed.area:pre.area)===a?"selected":""}>${esc(a)}</option>`).join("")}</select></div>
   <div><label>Forma</label><select id="flforma">${FIN_FORMAS.map(f=>`<option ${ed&&ed.forma===f?"selected":""}>${f}</option>`).join("")}</select></div></div>
   <div class="row"><div><label>Prestador de serviço (opcional)</label><select id="flprest"><option value="">—</option>${prestAll().map(p=>`<option value="${p.id}" ${(ed?ed.prest:pre.prest)===p.id?"selected":""}>${esc(p.nome)}</option>`).join("")}</select></div></div>
   ${ed?(ed.grupo&&finAll().some(e=>e.grupo===ed.grupo&&e.venc>ed.venc&&!e.pago)?`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="flseg"> Aplicar as mudanças (valor, descrição, categoria...) também às próximas parcelas em aberto desta série</label>`:""):`
   <div class="row"><div><label>Repetição</label><select id="flrep">${FIN_REPS.map(([k,l])=>`<option value="${k}" ${pre.rep===k?"selected":""}>${l}</option>`).join("")}</select></div>
    <div id="flpassobox" style="display:none"><label>Intervalo entre as parcelas</label><select id="flpasso">${[["mensal","Todo mês"],["bimestral","A cada 2 meses"],["trimestral","A cada 3 meses"],["semestral","A cada 6 meses"],["anual","Todo ano"]].map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div></div>
   <div class="row" id="flqbox" style="display:none"><div id="flfimbox"><label>Quando termina</label><select id="flfim"><option value="qtd">Depois de uma quantidade de vezes</option><option value="data">Em uma data</option><option value="nunca">Não termina — continua todo período</option></select></div>
    <div id="flnbox2"><label id="flqlbl">Quantas vezes</label><input type="number" min="2" max="120" id="fln" value="12"></div><div id="flabox2" style="display:none"><label>Repetir até</label><input type="date" id="flate"></div></div>
   <div class="sub" id="flprev" style="margin:0 0 8px"></div>`}
   <label>Observação</label><input id="flobs" value="${esc(ed?ed.obs||"":"")}">
   <div class="row"><div><label>Nº do documento / nota (opcional)</label><input id="fldoc" maxlength="40" value="${esc(ed?ed.doc||"":(pre.doc||""))}"></div><div><label>Competência (mês a que se refere)</label><input type="month" id="flcomp" value="${esc(ed?ed.comp||"":"")}"></div>
    <div><label>Residente (opcional)</label><select id="flres"><option value="">—</option>${resAll().filter(r=>(ed&&ed.residente===r.id)||(typeof resAtivo!=="function"||resAtivo(r))).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")).map(r=>`<option value="${r.id}" ${ed&&ed.residente===r.id?"selected":""}>${esc(resNome(r))}</option>`).join("")}</select></div></div>
   <label>Linha digitável / código de barras do boleto (opcional)</label><input id="flbarras" inputmode="numeric" maxlength="70" value="${esc(ed?finBarrasFmt(ed.barras||""):"")}" placeholder="47 ou 48 números do boleto"><div class="sub">Depois fica o botão “Copiar boleto” na lista, para colar no aplicativo do banco.</div>
   <label>Anexar comprovante ou boleto (opcional)</label><input type="file" id="flfile" multiple accept="${ANEXO_ACCEPT}"><div class="sub" style="margin:4px 0 0">${ANEXO_NOTA}${ed?` Anexos atuais: <b>${(ed.anexos||[]).length}</b> — <button type="button" class="lnk" id="flanx">ver, baixar ou remover</button>.`:" Numa série, o arquivo vai para o primeiro lançamento."}</div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="flpago" ${ed&&ed.pago?"checked":""}><span>Já foi <span id="flpl">${tipo==="pagar"?"pago":"recebido"}</span></span></label>
   <div class="row" id="flpbox" style="display:${ed&&ed.pago?"flex":"none"}"><div><label>Data</label><input type="date" id="flpem" value="${ed&&ed.pago?ed.pago:hojeIso()}"></div>
    <div><label>Valor efetivo (R$)</label><input type="number" min="0" step="0.01" data-stepby="1" id="flvp" value="${ed&&ed.pago&&ed.valorPago!=null?ed.valorPago:""}" placeholder="igual ao valor"></div></div>
   ${finLancCampos(ed,pre,tipo)}
   <div class="err" id="flerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="flcx">Cancelar</button><button class="b" id="flsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s),er=m=>g("#flerr").textContent=m;
  g("#fltipo").onchange=()=>{const t=g("#fltipo").value;g("#flcl").textContent=t==="pagar"?"Fornecedor":"Cliente / fonte";g("#flpl").textContent=t==="pagar"?"pago":"recebido"};
  g("#flpago").onchange=()=>g("#flpbox").style.display=g("#flpago").checked?"flex":"none";
  const rep=g("#flrep");
  const modoFim=()=>rep.value==="parcelado"?"qtd":g("#flfim").value;
  const datasDaSerie=()=>{
    const r=rep.value;if(r==="1"||modoFim()==="nunca")return null;
    return repDatas(g("#flvenc").value||hojeIso(),r==="parcelado"?REP_PASSO[g("#flpasso").value]:REP_PASSO[r],Math.max(2,Math.min(120,+g("#fln").value||2)),modoFim()==="data"?(g("#flate").value||null):null);
  };
  const previa=()=>{
    const el=g("#flprev"),r=rep.value;if(r==="1"){el.textContent="";return}
    const v=+g("#flvalor").value||0;
    if(modoFim()==="nunca"){el.textContent=`Sem data para terminar. A primeira cobrança é em ${brDate(g("#flvenc").value||hojeIso())}; as seguintes são criadas sozinhas, sempre com cerca de 12 meses à frente. Para parar, é só encerrar em “Recorrentes”.`;return}
    const d=datasDaSerie();
    el.textContent=d.length<2?"Com esses dados só sobra um lançamento — aumente a quantidade ou a data final.":`${d.length} lançamentos, de ${brDate(d[0])} a ${brDate(d[d.length-1])} — total ${fmtBRL(r==="parcelado"?v:v*d.length)}${r==="parcelado"?` (parcelas de cerca de ${fmtBRL(v/d.length)})`:""}.`;
  };
  const mostra=()=>{
    const r=rep.value,m=modoFim();
    g("#flpassobox").style.display=r==="parcelado"?"block":"none";g("#flqbox").style.display=r==="1"?"none":"flex";
    g("#flfimbox").style.display=r==="parcelado"?"none":"block";g("#flnbox2").style.display=m==="qtd"?"block":"none";g("#flabox2").style.display=m==="data"?"block":"none";
    g("#flqlbl").textContent=r==="parcelado"?"Número de parcelas":"Quantas vezes";
  };
  if(rep){
    rep.onchange=()=>{g("#fln").value=REP_QTD_PADRAO[rep.value]||12;mostra();previa()};
    g("#flfim").onchange=()=>{mostra();previa()};
    ["#flpasso","#fln","#flate","#flvalor","#flvenc"].forEach(id=>{g(id).oninput=previa;g(id).onchange=previa});
    if(pre.rep){rep.value=pre.rep;g("#fln").value=REP_QTD_PADRAO[pre.rep]||12;if(pre.fim)g("#flfim").value=pre.fim;mostra();previa()}
  }
  g("#flcx").onclick=()=>ov.remove();
  {const hd=document.createElement("div");hd.className="sub";hd.style.color="var(--pend-tx)";g("#flvenc").closest(".row").insertAdjacentElement("afterend",hd);const dh=()=>{hd.textContent=finDiaAviso(g("#flvenc").value)};g("#flvenc").addEventListener("input",dh);g("#flvenc").addEventListener("change",dh);dh()}
  const fax=g("#flanx");if(fax)fax.onclick=()=>{ov.remove();openFinAnexos(ed.id)};
  g("#flsv").onclick=async()=>{
    const t=g("#fltipo").value,desc=g("#fldesc").value.trim(),venc=g("#flvenc").value,valor=+g("#flvalor").value;
    if(!desc)return er("Informe a descrição.");if(!venc)return er("Informe o vencimento.");if(!finDataOk(venc))return er("Confira o vencimento: o ano não é válido.");if(!(valor>0))return er("Informe um valor maior que zero.");const bar=finBarrasOk(g("#flbarras").value);if(bar===null)return er("Linha digitável ou código de barras: só números, com 44, 47 ou 48 dígitos.");
    if(t==="pagar"&&!g("#flcontra").value.trim()&&!g("#flprest").value)return er("Informe o fornecedor (ou escolha o prestador). Toda conta a pagar fica ligada a um fornecedor.");
    const pago=g("#flpago").checked?(g("#flpem").value||hojeIso()):null;if(pago&&!finDataOk(pago))return er("Confira a data do pagamento: ano inválido.");const vp0=g("#flvp").value;if(pago&&vp0!==""&&!(+vp0>0))return er("O valor efetivo precisa ser maior que zero. Para uma conta que não vai ser paga, use o botão Cancelar da lista.");const vp=pago?(vp0===""?valor:+vp0):null;
    const prest=g("#flprest").value||null,pr=prest?prestAll().find(p=>p.id===prest):null;
    const base={tipo:t,desc,contra:g("#flcontra").value.trim()||(pr?pr.nome:""),cat:g("#flcat").value.trim()||(pr?"Serviços de terceiros":""),area:g("#flarea").value,forma:g("#flforma").value,obs:g("#flobs").value.trim(),prest,doc:g("#fldoc").value.trim(),comp:g("#flcomp").value||"",residente:g("#flres").value||"",barras:bar};
    {const xe=finLancExtra(g,t);if(xe.erro)return er(xe.erro);Object.assign(base,xe.campos)}
    if(t==="pagar")base.fornId=finFornId(base.contra,prest);
    if(!ed){
      const r0=g("#flrep").value;
      if(r0!=="1"){
        const m0=r0==="parcelado"?"qtd":g("#flfim").value;
        if(m0==="data"&&!g("#flate").value)return er("Informe até que data a conta se repete.");if(m0==="data"&&!finDataOk(g("#flate").value))return er("Confira a data final: ano inválido.");
        if(m0!=="nunca"&&datasDaSerie().length<2)return er("Com esses dados só sobra um lançamento — aumente a quantidade ou a data final.");
      }
    }
    let novosAnexos=[];const arqs=[...g("#flfile").files];
    if(arqs.length){
      g("#flsv").disabled=true;
      try{novosAnexos=await anexarArquivos(arqs,ed?(ed.anexos||[]).length:0)}catch(err){g("#flsv").disabled=false;return er(err.message)}
    }
    if(ed){
      const seg=!!(ed.grupo&&g("#flseg")&&g("#flseg").checked);
      finMutate(all=>all.map(e=>{
        if(e.id===ed.id)return{...e,...base,valor,venc,pago,valorPago:vp,...(novosAnexos.length?{anexos:[...(e.anexos||[]),...novosAnexos]}:{})};
        if(seg&&e.grupo===ed.grupo&&e.venc>ed.venc&&!e.pago)return{...e,...base,valor:valor!==+ed.valor?valor:e.valor};
        return e;
      }));
      if(seg&&ed.recorrencia)recSave(recAll().map(x=>x.id===ed.recorrencia?{...x,desc:base.desc,contra:base.contra,cat:base.cat,area:base.area,forma:base.forma,obs:base.obs,prest:base.prest,rateio:base.rateio||null,conta:base.conta||null,ret:base.ret||null,...(valor!==+ed.valor?{reaj:[...(x.reaj||[]).filter(a=>a.desde!==ed.venc),{desde:ed.venc,valor}]}:{})}:x));
    }else{
      const r=g("#flrep").value;
      if(r!=="1"&&r!=="parcelado"&&g("#flfim").value==="nunca"){
        const rec={id:uid8(),tipo:t,desc,contra:base.contra,cat:base.cat,area:base.area,forma:base.forma,obs:base.obs,prest:base.prest,...(base.residente?{residente:base.residente}:{}),...(base.rateio?{rateio:base.rateio}:{}),...(base.conta?{conta:base.conta}:{}),...(base.ret?{ret:base.ret}:{}),valor,inicio:venc,passo:r,fim:null,ativa:true,pular:[],reaj:[]};
        recSave([...recAll(),rec]);
        const novos=recDatas(rec,recHorizonte(REP_PASSO[r])).map(d=>recEntrada(rec,d));
        novos[0]={...novos[0],pago,valorPago:vp,...(novosAnexos.length?{anexos:novosAnexos}:{})};
        finMutate(all=>[...all,...novos]);
        ov.remove();toast(`Recorrência criada — ${novos.length} cobranças já programadas; as próximas surgem sozinhas.`);go("fin",true);return;
      }
      const datas=r==="1"?[venc]:datasDaSerie();
      const n=datas.length,grupo=n>1?uid8():null;
      const novos=datas.map((d,i)=>{
        let v=valor;if(r==="parcelado"){const cent=Math.round(valor*100),b=Math.floor(cent/n);v=(i===n-1?cent-b*(n-1):b)/100}
        return{id:uid8(),...base,valor:v,venc:d,pago:i===0?pago:null,valorPago:i===0?vp:null,grupo,parcela:n>1?`${i+1}/${n}`:null,rep:r==="1"||r==="parcelado"?null:r,...(i>0?{barras:""}:{}),...(i===0&&novosAnexos.length?{anexos:novosAnexos}:{})};
      });
      finMutate(all=>[...all,...novos]);
    }
    ov.remove();toast("Lançamento salvo.");go("fin",true);
  };
}
function openFinBaixa(id){
  const e=finAll().find(x=>x.id===id);if(!e)return;
  const ov=openModal(`<h3>${e.tipo==="pagar"?"Dar baixa no pagamento":"Dar baixa no recebimento"}</h3><div class="sub" style="margin-bottom:10px">${esc(e.desc)} · vencimento ${brDate(e.venc)} · ${fmtBRL(e.valor)}</div>
   <div class="row"><div><label>Data</label><input type="date" id="fbdata" value="${hojeIso()}"></div><div><label>Valor efetivo (R$) — com juros ou desconto</label><input type="number" min="0" step="1" id="fbval" value="${e.valor}"></div></div>
   <label>Comprovante (opcional)</label><input type="file" id="fbfile" multiple accept="${ANEXO_ACCEPT}"><div class="sub" style="margin-top:4px">${ANEXO_NOTA}</div>
   <div class="err" id="fberr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="fbcx">Cancelar</button><button class="b" id="fbsv">Confirmar</button></div>`);
  ov.querySelector("#fbcx").onclick=()=>ov.remove();
  ov.querySelector("#fbsv").onclick=async()=>{
    const d=ov.querySelector("#fbdata").value,v=+ov.querySelector("#fbval").value,er=m=>ov.querySelector("#fberr").textContent=m,btn=ov.querySelector("#fbsv");
    if(!d||!(v>0))return er("Informe a data e um valor maior que zero.");
    const files=[...ov.querySelector("#fbfile").files];let novos=[];
    if(files.length){
      btn.disabled=true;btn.textContent="Enviando…";
      try{novos=await anexarArquivos(files,(e.anexos||[]).length)}catch(err){btn.disabled=false;btn.textContent="Confirmar";return er(err.message)}
    }
    finMutate(all=>all.map(x=>x.id===id?{...x,pago:d,valorPago:v,...(novos.length?{anexos:[...(x.anexos||[]),...novos]}:{})}:x));
    ov.remove();toast(novos.length?`Baixa registrada com ${novos.length} comprovante(s).`:"Baixa registrada.");go(ROUTE,true);
  };
}
function openFinDel(id){
  const e=finAll().find(x=>x.id===id);if(!e)return;
  const irmaos=e.grupo?finAll().filter(x=>x.grupo===e.grupo&&x.venc>e.venc):[];
  const ov=openModal(`<h3>Excluir lançamento</h3><p>${esc(e.desc)}${e.parcela?" ("+esc(e.parcela)+")":""} · ${brDate(e.venc)} · ${fmtBRL(e.valor)}</p>
   <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px"><button class="b sec" id="fdcx">Cancelar</button>
   ${irmaos.length||e.recorrencia?`<button class="b wood" id="fdseg">${e.recorrencia?"Esta e todas as seguintes (encerra a recorrência)":`Esta e as ${irmaos.length} seguinte(s)`}</button>`:""}<button class="b wood" id="fdum">${e.recorrencia?"Só esta (pular esta cobrança)":irmaos.length?"Só esta":"Excluir"}</button></div>`);
  ov.querySelector("#fdcx").onclick=()=>ov.remove();
  ov.querySelector("#fdum").onclick=()=>{finApagar(x=>x.id===id);if(e.recorrencia)recPular(e.recorrencia,e.venc);ov.remove();toast("Lançamento excluído.");go("fin",true)};
  const sg=ov.querySelector("#fdseg");if(sg)sg.onclick=()=>{finApagar(x=>x.id===id||(x.grupo===e.grupo&&x.venc>e.venc));if(e.recorrencia)recEncerrarEm(e.recorrencia,addDaysIso(e.venc,-1));ov.remove();toast("Lançamentos excluídos.");go("fin",true)};
}
function finCsv(tipo){
  const rows=finAll().filter(e=>e.tipo===tipo&&e.venc.slice(0,4)===String(FIN.ano)&&(FIN.mes<0||+e.venc.slice(5,7)-1===FIN.mes)).sort((a,b)=>a.venc.localeCompare(b.venc));
  const L=[["vencimento","descricao","contraparte","categoria","area","forma","valor","situacao","pago_em","valor_efetivo","parcela","observacao","comprovantes"],
    ...rows.map(e=>[e.venc,e.desc,e.contra||"",e.cat||"",e.area||"",e.forma||"",String(e.valor).replace(".",","),finStatusLabel(e),e.pago||"",e.pago?String(finNum(e)).replace(".",","):"",e.parcela||"",e.obs||"",(e.anexos||[]).length])];
  const t=L.map(l=>l.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  saveFile(`contas-a-${tipo}-${FIN.ano}${FIN.mes<0?"":"-"+String(FIN.mes+1).padStart(2,"0")}.csv`,new Blob(["\ufeff"+t],{type:"text/csv"}));
}

