/* ===== Financeiro 5: avisos, saldo único, conciliação em lote, reajuste, Excel e PDF ===== */
/* ---------- nota fiscal em mês fechado ---------- */
function f5NfTrava(rows){
  const F=f4Fech();if(!F||f4Gestor())return false;
  const fil=l=>(l||[]).filter(r=>r&&r.date&&r.date<=F).map(r=>JSON.stringify(r)).sort().join("|");
  return fil((S.config.nf&&S.config.nf.rows)||[])!==fil(rows);
}
const _nfSave5=nfSave;
nfSave=function(rows,fileName,fmt){
  if(f5NfTrava(rows)){f4Nega(`alterar notas fiscais de mês fechado (até ${brDate(f4Fech())}); peça ao gestor para reabrir o mês`);return false}
  return _nfSave5(rows,fileName,fmt);
};
const _nfApaga5=nfApaga;
nfApaga=function(){
  if(f5NfTrava([])){f4Nega(`apagar notas fiscais de mês fechado (até ${brDate(f4Fech())})`);return}
  return _nfApaga5();
};
/* ---------- mensagens de sucesso não aparecem logo depois de uma ação negada ---------- */
const _toast5=toast;
toast=function(m,bad){if(!bad&&Date.now()-(F4._neg||0)<900)return;return _toast5.apply(this,arguments)};
/* ---------- avisos na tela inicial ---------- */
function f5Urg(){
  if(!podeVer("fin"))return[];
  const h=hojeIso(),L=[],it=(nivel,titulo,detalhe,quando)=>L.push({nivel,tipo:"Financeiro",titulo,detalhe,quando:quando||h,rota:"fin"});
  if(f4Gestor()){
    const p=finAll().filter(e=>e.tipo==="pagar"&&!e.pago&&!e.cancelada&&e.aprovStatus==="pendente"&&!e.aprov);
    if(p.length)it(2,`${p.length} pagamento(s) aguardando a sua aprovação`,`${fmtBRL(soma(p,e=>+e.valor))} — abra Contas a pagar e aprove ou recuse`);
    const F=f4Fech(),pp=addDaysIso(addMesesIso(h.slice(0,7)+"-01",-1),-1);
    if(F&&F<pp)it(1,"Há meses sem fechar no Financeiro",`Último fechamento em ${brDate(F)}. Feche o mês depois de conferir com o contador (aba Ajustes).`);
  }
  f4Devedores().forEach(d=>{const u=d.contatos[d.contatos.length-1];if(u&&u.prom&&u.prom<h)it(2,`Promessa de pagamento vencida — ${d.nome}`,`Prometeu pagar em ${brDate(u.prom)}; segue devendo ${fmtBRL(d.total)}`,u.prom)});
  const lim=addDaysIso(h,-15),ch=finAll().filter(e=>e.cheque&&e.tipo==="pagar"&&e.pago&&!e.cancelada&&!e.cheque.comp&&!e.cheque.st&&e.pago<=lim);
  if(ch.length)it(1,`${ch.length} cheque(s) emitido(s) há mais de 15 dias sem compensar`,`${fmtBRL(soma(ch,e=>finNum(e)))} — confira no extrato e marque como compensado (aba Contas e caixa)`);
  f4Contas().filter(c=>c.tipo==="cartao").forEach(c=>f4Faturas(c.id).forEach(f=>{
    const ab=f.itens.filter(e=>!e.pago);if(!ab.length)return;const v=f4FaturaVenc(c,f.key);
    if(v<=addDaysIso(h,5))it(v<h?3:2,v<h?`Fatura do ${c.nome} vencida`:`Fatura do ${c.nome} vence ${v===h?"hoje":"em "+daysBetweenIso(h,v)+" dia(s)"}`,`${fmtBRL(soma(ab,e=>+e.valor))} — vencimento ${brDate(v)}`,v);
  }));
  return L;
}
const _urg5=urgencias;
urgencias=function(per){const L=_urg5(per);try{L.push(...f5Urg())}catch(e){console.error(e)}return L};
/* ---------- um só saldo de abertura: o das contas ---------- */
const f5ContasModo=()=>{const l=f4cfg().contas;return !!(l&&l.length)};
const f5SaldoContasEm=iso=>arred2(soma(f4ContasPag(),c=>f4SaldoConta(c,iso)));
const _finSaldoIni5=finSaldoIni;
finSaldoIni=function(ano,prof){
  const c=finCfg().saldoIni||{};
  if(c[ano]!==undefined&&c[ano]!==""&&c[ano]!==null)return +c[ano]||0;
  if(f5ContasModo()){const fim=`${ano-1}-12-31`;if(f4ContasPag().every(x=>(x.data0||"0000")<=fim))return f5SaldoContasEm(fim)}
  return _finSaldoIni5(ano,prof);
};
function f5ContabCfg(c){
  if(f5ContasModo()&&!(+((S.config.contab||{}).caixa0))){const t=soma(f4ContasPag(),x=>+x.saldo0||0);if(t)c.caixa0=t}
  return c;
}
/* ---------- conciliação: várias contas / fatura de cartão / transferência ---------- */
function f5PagaItens(L,total,data,conta){
  const ids=new Set(L.map(e=>e.id)),base=soma(L,e=>+e.valor)||1,q=L.length;let resto=Math.round(total*100),i=0;
  finMutate(all=>all.map(x=>{if(!ids.has(x.id))return x;i++;const c=i===q?resto:Math.round(total*100*(+x.valor)/base);resto-=c;return{...x,pago:data,valorPago:c/100,conta}}));
  return L.every(e=>{const x=finAll().find(y=>y.id===e.id);return x&&x.pago});
}
function f5ConcLote(lid){
  const l=S.extrato[lid];if(!l)return;
  const tipo=sinalTipo(l.valor),alvo=arred2(Math.abs(l.valor)),conta=l.conta||F4_PRINC;
  const faturas=[];
  if(tipo==="pagar")f4Contas().filter(c=>c.tipo==="cartao").forEach(c=>f4Faturas(c.id).forEach(f=>{const ab=f.itens.filter(e=>!e.pago);if(ab.length)faturas.push({c,f,ab,t:arred2(soma(ab,e=>+e.valor))})}));
  const cand=finAll().filter(e=>e.tipo===tipo&&!e.pago&&!e.cancelada&&!e.cartao&&Math.abs(daysBetweenIso(e.venc,l.data))<=60).sort((a,b)=>Math.abs(daysBetweenIso(a.venc,l.data))-Math.abs(daysBetweenIso(b.venc,l.data))).slice(0,80);
  const ov=openModal(`<h3>Conciliar com várias contas</h3><div class="sub" style="margin-bottom:8px">${brDate(l.data)} · ${esc(l.desc)} · ${l.valor<0?"saiu":"entrou"} <b>${fmtBRL(alvo)}</b></div>
   ${faturas.length?`<h4 style="margin:6px 0">É o pagamento de uma fatura de cartão?</h4>${faturas.map((x,i)=>`<div class="doc"><div class="grow"><div class="nm">${esc(x.c.nome)} — fatura ${MESES_PT[+x.f.key.slice(5)-1]}/${x.f.key.slice(0,4)}</div><div class="sub">${x.ab.length} compra(s) em aberto · ${fmtBRL(x.t)}${Math.abs(x.t-alvo)<0.01?" · <b>valor igual ao do extrato</b>":""}</div></div><button class="b ${Math.abs(x.t-alvo)<0.01?"":"sec"} sm" data-f5fat="${i}">É esta</button></div>`).join("")}`:""}
   <h4 style="margin:12px 0 6px">Ou marque as contas que esse valor pagou</h4>
   <div style="max-height:34vh;overflow:auto">${cand.map(e=>`<label class="doc" style="cursor:pointer"><input type="checkbox" data-f5sel="${e.id}" data-v="${e.valor}"><div class="grow"><div class="nm">${esc(e.desc)}</div><div class="sub">${esc(e.contra||"")} · vence ${brDate(e.venc)}</div></div><b>${fmtBRL(e.valor)}</b></label>`).join("")||`<div class="empty">Nenhuma conta em aberto perto dessa data.</div>`}</div>
   <div class="callout" id="f5tot" style="margin-top:8px">Marcadas: R$ 0,00 — faltam ${fmtBRL(alvo)}</div><div class="err" id="f5err"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="f5cx">Cancelar</button><button class="b" id="f5ok" disabled>Conciliar</button></div>`);
  const sel=()=>[...ov.querySelectorAll("[data-f5sel]:checked")],er=m=>ov.querySelector("#f5err").textContent=m;
  const upd=()=>{const s=arred2(soma(sel(),c=>+c.dataset.v)),d=arred2(alvo-s);ov.querySelector("#f5tot").innerHTML=`Marcadas: <b>${fmtBRL(s)}</b> — ${Math.abs(d)<0.01?"<b>bate com o extrato</b>":d>0?`faltam ${fmtBRL(d)}`:`passou ${fmtBRL(-d)}`}`;ov.querySelector("#f5ok").disabled=Math.abs(d)>=0.01||!sel().length};
  ov.querySelectorAll("[data-f5sel]").forEach(c=>c.onchange=upd);
  ov.querySelector("#f5cx").onclick=()=>ov.remove();
  const fim=(L)=>{put("extrato",lid,{...strip(S.extrato[lid]),conc:L[0].id,concIds:L.map(e=>e.id)});ov.remove();toast(`${L.length} conta(s) conciliada(s).`);go("fin",true)};
  ov.querySelector("#f5ok").onclick=()=>{
    if(f4DataFechada(l.data))return er(`O mês dessa data está fechado (até ${brDate(f4Fech())}).`);
    const L=sel().map(c=>finAll().find(e=>e.id===c.dataset.f5sel)).filter(Boolean);
    if(!f5PagaItens(L,alvo,l.data,conta))return er("Não foi possível dar baixa (verifique permissão, aprovação ou mês fechado).");
    fim(L);
  };
  ov.querySelectorAll("[data-f5fat]").forEach(b=>b.onclick=()=>{
    const x=faturas[+b.dataset.f5fat];
    if(f4DataFechada(l.data))return er(`O mês dessa data está fechado (até ${brDate(f4Fech())}).`);
    if(!f5PagaItens(x.ab,alvo,l.data,conta))return er("Não foi possível dar baixa (verifique permissão, aprovação ou mês fechado).");
    fim(x.ab);
  });
}
function f5ConcTransf(lid){
  const l=S.extrato[lid];if(!l)return;
  const cs=f4ContasPag(),minha=l.conta||F4_PRINC,outras=cs.filter(c=>c.id!==minha),alvo=arred2(Math.abs(l.valor));
  if(outras.length<1)return toast("Cadastre ao menos duas contas (aba Contas e caixa) para registrar transferências.",true);
  const par=o=>Object.values(S.extrato).find(x=>!x.conc&&x.id!==l.id&&Math.sign(x.valor)===-Math.sign(l.valor)&&Math.abs(Math.abs(x.valor)-alvo)<0.01&&Math.abs(daysBetweenIso(x.data,l.data))<=4&&(x.conta||F4_PRINC)===o);
  const padrao=(outras.find(c=>par(c.id))||outras[0]).id;
  const ov=openModal(`<h3>Transferência entre as minhas contas</h3><div class="sub" style="margin-bottom:8px">${brDate(l.data)} · ${esc(l.desc)} · ${l.valor<0?"saiu de":"entrou em"} <b>${esc(f4NomeConta(minha))}</b> · ${fmtBRL(alvo)}</div>
   <label>${l.valor<0?"Foi para a conta":"Veio da conta"}</label><select id="f5to">${outras.map(c=>`<option value="${c.id}" ${c.id===padrao?"selected":""}>${esc(c.nome)}</option>`).join("")}</select>
   <div class="sub" id="f5par" style="margin-top:6px"></div><div class="err" id="f5err2"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="f5tcx">Cancelar</button><button class="b" id="f5tok">Registrar transferência</button></div>`);
  const g=s=>ov.querySelector(s),info=()=>{const p=par(g("#f5to").value);g("#f5par").textContent=p?`Achei a linha correspondente em ${f4NomeConta(p.conta||F4_PRINC)} (${brDate(p.data)}): ela será conciliada junto.`:"Não achei a linha correspondente no extrato da outra conta (talvez ainda não importada)."};
  g("#f5to").onchange=info;info();g("#f5tcx").onclick=()=>ov.remove();
  g("#f5tok").onclick=()=>{
    if(f4DataFechada(l.data))return g("#f5err2").textContent=`O mês dessa data está fechado (até ${brDate(f4Fech())}).`;
    const o=g("#f5to").value,de=l.valor<0?minha:o,para=l.valor<0?o:minha,tr=f4cfg().transf||[];
    let t=tr.find(x=>x.de===de&&x.para===para&&Math.abs(+x.valor-alvo)<0.01&&Math.abs(daysBetweenIso(x.data,l.data))<=4);
    if(!t){t={id:uid8(),data:l.data,de,para,valor:alvo,obs:"conciliação: "+l.desc.slice(0,60),u:f4Quem()};f4save({transf:[...tr,t].slice(-600)})}
    const p=par(o);
    put("extrato",lid,{...strip(l),conc:"transf:"+t.id});
    if(p)put("extrato",p.id,{...strip(p),conc:"transf:"+t.id});
    ov.remove();toast(p?"Transferência registrada e as duas linhas conciliadas.":"Transferência registrada.");go("fin",true);
  };
}
/* ---------- reajuste do residente: diferença retroativa e reajuste agendado ---------- */
function f5ReajusteDif(rid,recId,desde,n){
  if(!recId)return;
  const L=finAll().filter(e=>e.recorrencia===recId&&e.pago&&!e.cancelada&&e.venc>=desde&&+e.valor<n-0.005);
  if(!L.length)return;
  const dif=arred2(soma(L,e=>n-(+e.valor))),r=resAll().find(x=>x.id===rid)||{},rp=r.resp&&typeof r.resp==="object"?r.resp.nome:"";
  askConfirm(`${L.length} mensalidade(s) desde ${brDate(desde)} já foram pagas com o valor antigo. Criar a cobrança da diferença (${fmtBRL(dif)})?`,"Criar cobrança").then(ok=>{
    if(!ok)return;
    finMutate(all=>[...all,{id:uid8(),tipo:"receber",desc:`Diferença de reajuste — ${resNome(r)}`,contra:rp||resNome(r),cat:"Mensalidades",area:"",forma:"Boleto",valor:dif,venc:addDaysIso(hojeIso(),7),pago:null,valorPago:null,residente:rid,obs:`diferença do reajuste desde ${brDate(desde)}: ${L.map(e=>e.venc.slice(5,7)+"/"+e.venc.slice(0,4)).join(", ")}`.slice(0,300)}]);
    toast("Cobrança da diferença criada em Contas a receber.");go(ROUTE,true);
  });
}
function f5AplicaReajustes(){
  if(!RT.cfgOk||F4._rj)return;
  const h=hojeIso(),pend=resAll().filter(r=>r.reajAg&&r.reajAg.desde<=h);
  if(!pend.length)return;
  F4._rj=true;
  try{
    let lista=resAll();
    pend.forEach(r=>{
      const a=r.reajAg,novo={...r,mensalidade:a.valor};delete novo.reajAg;
      novo.recId=resMensalidade(novo,a.desde)||novo.recId||null;
      lista=lista.map(x=>x.id===r.id?novo:x);
      const c=(S.cres||{})[a.cid];
      if(c)put("cres",c.id,{...strip(c),valor:a.valor,ultReaj:a.desde,reajustes:[...(c.reajustes||[]),{em:a.desde,pct:a.pct,de:a.de,para:a.valor}]});
    });
    resSave(lista);
    toast(`Reajuste aplicado a ${pend.length} residente(s): ${pend.map(r=>resNome(r)).join(", ")}.`);
  }finally{F4._rj=false}
}
const _autoRec5=autoRecorrencias;
autoRecorrencias=function(f){const n=_autoRec5(f);try{f5AplicaReajustes()}catch(e){console.error(e)}return n};
/* ---------- Excel e PDF das listas e relatórios ---------- */
async function f5Xlsx(nome,specs){
  if(typeof ExcelJS==="undefined")return toast("A biblioteca de Excel não carregou. Recarregue a página e tente de novo.",true);
  try{
    const wb=new ExcelJS.Workbook();wb.creator="Casa Hiro";wb.created=new Date();
    specs.forEach((sp,i)=>{
      const ws=wb.addWorksheet((String(sp.titulo).replace(/[\\\/?*\[\]:]/g," ").slice(0,31))||"Planilha "+(i+1));
      ws.addRow([sp.titulo]);ws.getRow(1).font={bold:true,size:14};
      if(sp.sub){ws.addRow([sp.sub]);ws.getRow(2).font={italic:true,size:10}}
      ws.addRow([]);
      const hr=ws.addRow(sp.cols.map(c=>c.h));hr.font={bold:true,color:{argb:"FFFFFFFF"}};
      hr.eachCell(c=>{c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1E5C2A"}}});
      sp.rows.forEach(r=>ws.addRow(r.map((v,ci)=>{const t=sp.cols[ci]&&sp.cols[ci].t;if(t==="date"&&typeof v==="string"&&/^\d{4}-\d\d-\d\d$/.test(v))return new Date(+v.slice(0,4),+v.slice(5,7)-1,+v.slice(8,10));return v})));
      if(sp.tot){const tr=ws.addRow(sp.cols.map((c,ci)=>sp.tot[ci]==="sum"?sp.rows.reduce((s,r)=>s+(+r[ci]||0),0):ci===0?"Total":null));tr.font={bold:true}}
      sp.cols.forEach((c,ci)=>{const col=ws.getColumn(ci+1);col.width=Math.max(10,Math.min(60,(c.w||14)*1.1));if(c.t==="money")col.numFmt='"R$" #,##0.00';if(c.t==="date")col.numFmt="dd/mm/yyyy"});
      ws.views=[{state:"frozen",ySplit:4}];
    });
    const buf=await wb.xlsx.writeBuffer();
    await saveFile(nome,new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  }catch(e){console.error(e);toast("Não foi possível gerar o Excel: "+(e.message||e),true)}
}
async function f5Pdf(nome,specs){
  try{await saveFile(nome,await relPdf(specs))}catch(e){toast("Não foi possível gerar o PDF: "+(e.message||e),true)}
}
function f5ListaSpec(){
  const l=finFiltrar(FIN.tab),pagar=FIN.tab==="pagar",per=FIN.mes<0?`${FIN.ano}`:`${MESES_PT[FIN.mes]} de ${FIN.ano}`;
  return{titulo:pagar?"Contas a pagar":"Contas a receber",sub:`${per} · ${l.length} lançamento(s)`,sensivel:false,
    cols:[{h:"Vencimento",t:"date",w:13},{h:"Descrição",w:34},{h:pagar?"Fornecedor":"Cliente",w:24},{h:"Categoria",w:20},{h:"Valor",t:"money",w:15},{h:"Situação",w:13},{h:"Pago em",t:"date",w:13}],
    rows:l.map(e=>[e.venc,e.desc+(e.parcela?` (${e.parcela})`:""),e.contra||"",e.cat||"",finNum(e),finStatusLabel(e),e.pago||""]),tot:[null,null,null,null,"sum",null,null]};
}
function f5CobSpec(){
  const dv=f4Devedores();
  return{titulo:"Inadimplência",sub:`Posição em ${brDate(hojeIso())} · ${dv.length} devedor(es) · multa e juros estimados`,sensivel:false,
    cols:[{h:"Devedor",w:30},{h:"Contas",w:8},{h:"Valor",t:"money",w:14},{h:"Encargos",t:"money",w:14},{h:"Total",t:"money",w:14},{h:"Atraso (dias)",w:10},{h:"Último contato",w:22}],
    rows:dv.map(x=>{const u=x.contatos[x.contatos.length-1];return[x.nome,x.itens.length,x.total,x.enc,arred2(x.total+x.enc),x.atraso,u?`${brDate(u.em)} ${u.tipo}`:""]}),tot:[null,null,"sum","sum","sum",null,null]};
}
function f5CalSpec(){
  f4CalIni();const pref=`${F4CAL.ano}-${f4pad(F4CAL.mes+1)}-`;
  const l=finAll().filter(e=>e.venc.startsWith(pref)&&!e.cancelada).sort((a,b)=>a.venc.localeCompare(b.venc)||a.tipo.localeCompare(b.tipo));
  return{titulo:`Vencimentos de ${MESES_PT[F4CAL.mes]} de ${F4CAL.ano}`,sub:`${l.length} conta(s)`,sensivel:false,
    cols:[{h:"Vencimento",t:"date",w:13},{h:"Tipo",w:10},{h:"Descrição",w:36},{h:"Fornecedor / cliente",w:26},{h:"Valor",t:"money",w:14},{h:"Situação",w:13}],
    rows:l.map(e=>[e.venc,e.tipo==="pagar"?"A pagar":"A receber",e.desc+(e.parcela?` (${e.parcela})`:""),e.contra||"",finNum(e),finStatusLabel(e)])};
}
const _lista5=finListaHtml;
finListaHtml=function(t){return _lista5(t).replace('<button class="b sec" id="finpdf"',`<button class="b sec" id="finxls" style="flex:none">${ic("down")} Baixar Excel</button>\n   <button class="b sec" id="finpdf"`)};
const _rel5=finRelHtml;
finRelHtml=function(){return _rel5().replace('<button class="b sec" id="frelpdf"',`<button class="b sec" id="frelxls" style="flex:none">${ic("down")} Baixar Excel</button><button class="b sec" id="frelpdf"`)};
const _cal5=finCalHtml;
finCalHtml=function(){return _cal5().replace('<p class="sub" style="margin:8px 0 0">Vermelho',`<div class="row" style="margin-top:10px"><button class="b sec" id="f4calpdf" style="flex:none">${ic("down")} Baixar PDF do mês</button><button class="b sec" id="f4calxls" style="flex:none">${ic("down")} Baixar Excel do mês</button></div><p class="sub" style="margin:8px 0 0">Vermelho`)};
const _bindFin5=bindFin;
bindFin=function(){
  _bindFin5();
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  on("finxls",()=>{const s=f5ListaSpec();if(!s.rows.length)return toast("Não há lançamentos na lista para gerar o Excel.",true);f5Xlsx(`contas-a-${FIN.tab}-${FIN.ano}${FIN.mes<0?"":"-"+f4pad(FIN.mes+1)}.xlsx`,[s])});
  on("frelxls",()=>{const D=f4RelDados(),A=!!D.ant;const specs=D.tabs.filter(t=>t.lin.length).map(t=>{const cols=[{h:t.col,w:34},{h:"Entradas",t:"money",w:14},{h:"Saídas",t:"money",w:14},{h:"Resultado",t:"money",w:14}];if(A)cols.push({h:D.ant.rot,t:"money",w:14},{h:"Variação",w:16});if(t.abc)cols.push({h:"% acum.",w:9},{h:"ABC",w:6});
    const row=l=>{const r=[l.k,l.e,l.s,l.r];if(A)r.push(l.a,f4Var(l.r,l.a));if(t.abc)r.push(l.pa!=null?l.pa.toFixed(0)+"%":"",l.cl||"");return r};
    return{titulo:t.titulo,sub:(FIN.mes<0?`${FIN.ano}`:`${MESES_PT[FIN.mes]} de ${FIN.ano}`)+(A?" · comparado com "+D.ant.rot:""),cols,rows:[...t.lin.map(row),...(t.demais?[row(t.demais)]:[]),row(t.tot)]}});
    if(!specs.length)return toast("Sem lançamentos no período.",true);f5Xlsx(`relatorios-financeiros-${FIN.ano}${FIN.mes<0?"":"-"+f4pad(FIN.mes+1)}.xlsx`,specs)});
  on("f4cobpdf",()=>f5Pdf(`inadimplencia-${hojeIso()}.pdf`,[f5CobSpec()]));
  on("f4cobxls",()=>f5Xlsx(`inadimplencia-${hojeIso()}.xlsx`,[f5CobSpec()]));
  on("f4calpdf",()=>{const s=f5CalSpec();if(!s.rows.length)return toast("Nada vence neste mês.",true);f5Pdf(`vencimentos-${F4CAL.ano}-${f4pad(F4CAL.mes+1)}.pdf`,[s])});
  on("f4calxls",()=>{const s=f5CalSpec();if(!s.rows.length)return toast("Nada vence neste mês.",true);f5Xlsx(`vencimentos-${F4CAL.ano}-${f4pad(F4CAL.mes+1)}.xlsx`,[s])});
};


/* >>> x_fin6.js */
