/* ================= RECORRÊNCIAS SEM FIM: internet, aluguel, mensalidades que continuam todo período ================= */
const recAll=()=>(S.config.recorrencias&&S.config.recorrencias.itens)||[];
const recSave=l=>put("config","recorrencias",{itens:l});
const recHorizonte=p=>p&&p.d?addDaysIso(hojeIso(),120):addMesesIso(hojeIso(),13);
function recValor(r,d){const x=(r.reaj||[]).filter(a=>a.desde<=d).sort((a,b)=>a.desde.localeCompare(b.desde)).pop();return x?+x.valor:+r.valor}
function recEntrada(r,d){
  return{id:`rc_${r.id}_${d}`,tipo:r.tipo,desc:r.desc,contra:r.contra||"",cat:r.cat||"",area:r.area||"",forma:r.forma||"",obs:r.obs||"",prest:r.prest||null,
    valor:recValor(r,d),venc:d,pago:null,valorPago:null,grupo:"rc"+r.id,parcela:null,rep:r.passo,recorrencia:r.id,...(r.residente?{residente:r.residente}:{}),...(r.rateio?{rateio:r.rateio}:{}),...(r.conta?{conta:r.conta}:{}),...(r.ret?{ret:r.ret}:{}),...(r.tipo==="pagar"&&(r.contra||r.prest)?{fornId:finFornId(r.contra,r.prest)}:{})};
}
function recDatas(r,ate){
  const p=REP_PASSO[r.passo],out=[];if(!p||!r.inicio)return out;
  for(let i=0;i<3000;i++){const d=p.m?addMesesIso(r.inicio,p.m*i):addDaysIso(r.inicio,p.d*i);if(d>ate||(r.fim&&d>r.fim))break;out.push(d)}
  return out;
}
// o que falta criar: datas daqui para frente (ou depois da última já criada), sem as que a pessoa pulou
function recFaltantes(){
  const h=hojeIso(),ex=new Set(),maxPor={},out=[];
  finAll().forEach(e=>{if(e.recorrencia){ex.add(e.recorrencia+"|"+e.venc);if(!maxPor[e.recorrencia]||e.venc>maxPor[e.recorrencia])maxPor[e.recorrencia]=e.venc}});
  recAll().filter(r=>r.ativa!==false).forEach(r=>{
    recDatas(r,recHorizonte(REP_PASSO[r.passo])).forEach(d=>{
      if(ex.has(r.id+"|"+d)||(r.pular||[]).includes(d))return;
      if(!(d>=h||d>(maxPor[r.id]||"")))return;
      out.push(recEntrada(r,d));
    });
  });
  // contratos sem data final que já geraram contas continuam gerando
  ctAll().forEach(c=>{
    if(!CT_MESES[c.forma]||!ctInfo(c).indet||!finAll().some(e=>e.contrato===c.id))return;
    const nome=ctNome(c),p=REP_PASSO[c.forma],lim=recHorizonte(p),ja=new Set(finAll().filter(e=>e.contrato===c.id).map(e=>e.venc));
    for(let k=0;k<3000;k++){
      const d=p.m?addMesesIso(c.inicio,p.m*k):addDaysIso(c.inicio,p.d*k);if(d>lim)break;if(d<h||ja.has(d))continue;
      out.push({id:`ct_${c.id}_${d}`,tipo:"pagar",desc:`${c.objeto}${nome&&nome!=="—"?" — "+nome:""}`,contra:nome==="—"?"":nome,cat:c.cat||"Serviços de terceiros",area:c.area||"",forma:"",obs:"Gerado do contrato",valor:+c.valor||0,venc:d,pago:null,valorPago:null,grupo:"ct"+c.id,parcela:null,contrato:c.id,prest:c.prest||null,rep:c.forma});
    }
  });
  return out;
}
// roda sozinho a cada navegação; só depois de os dados terem carregado (senão poderia sobrescrever lançamentos que ainda não chegaram)
let _recBusy=false,_recUlt=0;
function autoRecorrencias(forcar){
  if(!RT.cfgOk||_recBusy)return 0;
  const t=Date.now();if(!forcar&&t-_recUlt<4000)return 0;_recUlt=t;
  _recBusy=true;
  try{const n=recFaltantes();if(n.length)finMutate(all=>[...all,...n]);return n.length}
  catch(e){console.error(e);return 0}
  finally{_recBusy=false}
}
const recPular=(id,d)=>recSave(recAll().map(r=>r.id===id?{...r,pular:[...(r.pular||[]),d]}:r));
const recEncerrarEm=(id,fim)=>recSave(recAll().map(r=>r.id===id?{...r,fim}:r));
function recInfo(r){
  const h=hojeIso(),es=finAll().filter(e=>e.recorrencia===r.id),ab=es.filter(e=>!e.pago&&e.venc>=h).sort((a,b)=>a.venc.localeCompare(b.venc));
  const encerrada=!!(r.fim&&r.fim<h);
  return{pagas:es.filter(e=>e.pago).length,prox:ab[0]?ab[0].venc:null,valor:recValor(r,h>r.inicio?h:r.inicio),encerrada,programadas:ab.length};
}
function finRecHtml(){
  const rs=recAll(),h=hojeIso(),inf=Object.fromEntries(rs.map(r=>[r.id,recInfo(r)]));
  const ativas=rs.filter(r=>r.ativa!==false&&!inf[r.id].encerrada),eq=l=>soma(l,r=>inf[r.id].valor/(CT_MESES[r.passo]||1));
  const pg=ativas.filter(r=>r.tipo==="pagar"),rc=ativas.filter(r=>r.tipo==="receber");
  return `<div class="stats"><div class="stat"><b>${ativas.length}</b><span>recorrências ativas</span></div>
   <div class="stat warn"><b>${fmtBRL(eq(pg))}</b><span>gasto mensal equivalente (a pagar)</span></div>
   <div class="stat blue"><b>${fmtBRL(eq(rc))}</b><span>entrada mensal equivalente (a receber)</span></div>
   <div class="stat"><b>${soma(ativas,r=>inf[r.id].programadas)}</b><span>cobranças já programadas à frente</span></div></div>
  <div class="card"><h2>Pagamentos e recebimentos recorrentes</h2><p class="sub" style="margin:0 0 10px">Contas que se repetem <b>sem número de parcelas</b> — internet, aluguel, mensalidade. O sistema cria sozinho as próximas cobranças e mantém cerca de 12 meses à frente. Quando o valor mudar, edite aqui; para parar, encerre.</p>
   <div class="row" style="margin-bottom:12px"><button class="b" id="recnova" style="flex:none">${ic("plus")} Nova recorrência</button></div>
   ${rs.length?`<div class="wrap"><table><thead><tr><th>Descrição</th><th>Tipo</th><th class="n">Valor atual</th><th>Repete</th><th>Próxima cobrança</th><th class="n">Já pagas</th><th>Término</th><th></th></tr></thead><tbody>
   ${rs.map(r=>{const i=inf[r.id];return `<tr><td><b>${esc(r.desc)}</b><div class="sub">${esc([r.contra,r.cat].filter(Boolean).join(" · "))}</div></td><td>${r.tipo==="pagar"?"A pagar":"A receber"}</td><td class="n">${fmtBRL(i.valor)}</td>
    <td>${esc(REP_CURTO[r.passo]||r.passo)}</td><td>${i.prox?brDate(i.prox):"—"}</td><td class="n">${i.pagas}</td>
    <td>${r.fim?`${brDate(r.fim)} ${i.encerrada?`<span class="pill s-falta">encerrada</span>`:""}`:`<span class="pill s-ok">sem fim</span>`}</td>
    <td style="white-space:nowrap">${i.encerrada?"":`<button class="b sec sm" data-recedit="${r.id}" title="Editar">${ic("edit")}</button> <button class="b sec sm" data-recfim="${r.id}" title="Encerrar">Encerrar</button> `}<button class="b sec sm" data-recdel="${r.id}" title="Excluir">${ic("trash")}</button></td></tr>`}).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhuma recorrência. Clique em “Nova recorrência” para lançar a internet, o aluguel ou uma mensalidade que continua todo mês.</div>`}</div>`;
}
function bindRec(){
  const n=$("recnova");if(n)n.onclick=()=>openFinLanc(null,"pagar",{rep:"mensal",fim:"nunca"});
  document.querySelectorAll("[data-recedit]").forEach(b=>b.onclick=()=>openRecEditar(b.dataset.recedit));
  document.querySelectorAll("[data-recfim]").forEach(b=>b.onclick=()=>openRecEncerrar(b.dataset.recfim));
  document.querySelectorAll("[data-recdel]").forEach(b=>b.onclick=()=>openRecExcluir(b.dataset.recdel));
}
function openRecEditar(id){
  const r=recAll().find(x=>x.id===id);if(!r)return;const h=hojeIso(),cur=recValor(r,h>r.inicio?h:r.inicio),areas=estData().areas;
  const ov=openModal(`<h3>Editar recorrência</h3><div class="sub" style="margin-bottom:10px">${esc(REP_CURTO[r.passo])} · desde ${brDate(r.inicio)}. As cobranças já pagas não mudam.</div>
   <label>Descrição</label><input id="rcd" value="${esc(r.desc)}">
   <div class="row"><div><label>${r.tipo==="pagar"?"Fornecedor":"Cliente / fonte"}</label><input id="rcc" value="${esc(r.contra||"")}"></div><div><label>Categoria</label><input id="rcat" value="${esc(r.cat||"")}"></div>
    <div><label>Área</label><select id="rca"><option value="">—</option>${areas.map(a=>`<option ${r.area===a?"selected":""}>${esc(a)}</option>`).join("")}</select></div></div>
   <div class="row"><div><label>Valor de cada cobrança (R$)</label><input type="number" min="0" step="0.01" data-stepby="1" id="rcv" value="${cur}"></div><div><label>O novo valor vale a partir de</label><input type="date" id="rcdesde" value="${h}"></div>
    <div><label>Terminar em (opcional)</label><input type="date" id="rcfim" value="${r.fim||""}"></div></div>
   <label>Observação</label><input id="rcobs" value="${esc(r.obs||"")}">
   <div class="err" id="rcerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="rccx">Cancelar</button><button class="b" id="rcsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s);g("#rccx").onclick=()=>ov.remove();
  g("#rcsv").onclick=()=>{
    const desc=g("#rcd").value.trim(),valor=+g("#rcv").value,desde=g("#rcdesde").value||h,fim=g("#rcfim").value||null,er=m=>g("#rcerr").textContent=m;
    if(!desc)return er("Informe a descrição.");if(!(valor>0))return er("Informe um valor maior que zero.");if(!finDataOk(desde)||(fim&&!finDataOk(fim)))return er("Confira as datas: o ano não é válido.");if(fim&&fim<r.inicio)return er("O término não pode ser antes do início.");
    const novo={...r,desc,contra:g("#rcc").value.trim(),cat:g("#rcat").value.trim(),area:g("#rca").value,obs:g("#rcobs").value.trim(),fim,
      reaj:valor!==cur?[...(r.reaj||[]).filter(a=>a.desde!==desde),{desde,valor}]:(r.reaj||[])};
    recSave(recAll().map(x=>x.id===id?novo:x));
    finMutate(all=>all.filter(e=>!(e.recorrencia===id&&!e.pago&&fim&&e.venc>fim)).map(e=>(e.recorrencia===id&&!e.pago&&e.venc>=h)?{...e,desc:novo.desc,contra:novo.contra,cat:novo.cat,area:novo.area,obs:novo.obs,valor:recValor(novo,e.venc)}:e));
    ov.remove();toast("Recorrência atualizada.");go("fin",true);
  };
}
function openRecEncerrar(id){
  const r=recAll().find(x=>x.id===id);if(!r)return;
  const ov=openModal(`<h3>Encerrar recorrência</h3><p>${esc(r.desc)} — ${esc(REP_CURTO[r.passo])}</p><label>Última cobrança em</label><input type="date" id="rfd" value="${hojeIso()}">
   <div class="sub" style="margin-top:6px">As cobranças em aberto depois dessa data são removidas; o que já foi pago continua no histórico.</div><div class="err" id="rferr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="rfcx">Cancelar</button><button class="b wood" id="rfsv">Encerrar</button></div>`);
  ov.querySelector("#rfcx").onclick=()=>ov.remove();
  ov.querySelector("#rfsv").onclick=()=>{
    const d=ov.querySelector("#rfd").value;if(!d||!finDataOk(d))return ov.querySelector("#rferr").textContent="Informe uma data válida.";
    recEncerrarEm(id,d);finApagar(e=>e.recorrencia===id&&!e.pago&&e.venc>d);ov.remove();toast("Recorrência encerrada.");go("fin",true);
  };
}
async function openRecExcluir(id){
  const r=recAll().find(x=>x.id===id);if(!r)return;
  if(!await askConfirm(`Excluir a recorrência "${r.desc}"? As cobranças futuras em aberto também serão removidas; as já pagas ficam no histórico.`,"Excluir"))return;
  finApagar(e=>e.recorrencia===id&&!e.pago&&e.venc>=hojeIso());recSave(recAll().filter(x=>x.id!==id));toast("Recorrência excluída.");go("fin",true);
}
REPORTS.push({id:"fin_recorrentes",g:"Financeiro",t:"Recorrências (contas sem fim)",d:"Internet, aluguel, mensalidades: valor atual, próxima cobrança e quantas já foram pagas.",b:()=>{
  const l=recAll();return{titulo:"Recorrências",sub:relSub({},false),sensivel:false,cols:[{h:"Descrição",w:34},{h:"Tipo",w:11},{h:"Valor atual",t:"money",w:14},{h:"Repete",w:18},{h:"Início",t:"date",w:12},{h:"Término",w:14},{h:"Próxima cobrança",t:"date",w:15},{h:"Cobranças pagas",t:"num",w:13}],
   rows:l.map(r=>{const i=recInfo(r);return[r.desc,r.tipo==="pagar"?"A pagar":"A receber",i.valor,REP_CURTO[r.passo]||r.passo,r.inicio,r.fim?brDate(r.fim):"sem fim",i.prox||"",i.pagas]})}}});


