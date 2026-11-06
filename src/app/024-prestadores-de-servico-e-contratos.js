/* ================= PRESTADORES DE SERVIÇO E CONTRATOS ================= */
const prestAll=()=>(S.config.prestadores&&S.config.prestadores.itens)||[];
const prestSave=l=>put("config","prestadores",{itens:l});
const ctAll=()=>(S.config.contratos&&S.config.contratos.itens)||[];
const ctSave=l=>put("config","contratos",{itens:l});
const VINCULOS=["Autônomo (RPA)","MEI","Pessoa jurídica","Cooperado","Voluntário","Outro"];
const CT_TIPOS=["Prestação de serviços","Plantão ou diária","Consultoria","Manutenção","Locação","Fornecimento contínuo","Outro"];
const CT_FORMAS={mensal:"Mensal",bimestral:"A cada 2 meses",trimestral:"Trimestral",semestral:"A cada 6 meses",anual:"Anual",quinzenal:"Quinzenal",semanal:"Semanal",unica:"Pagamento único",servico:"Por serviço (valor variável)"};
const CT_MESES={mensal:1,bimestral:2,trimestral:3,semestral:6,anual:12,quinzenal:14/30.4375,semanal:7/30.4375};
function validCNPJ(v){
  const d=String(v).replace(/\D/g,"");if(d.length!==14||/^(\d)\1+$/.test(d))return false;
  const calc=n=>{let s=0,p=n-7;for(let i=0;i<n;i++){s+=+d[i]*p--;if(p<2)p=9}const r=s%11;return r<2?0:11-r};
  return calc(12)===+d[12]&&calc(13)===+d[13];
}
const docOk=v=>{const d=String(v||"").replace(/\D/g,"");return !d||(d.length===11?validCPF(d):d.length===14?validCNPJ(d):false)};
function prestPagamentos(p){const nn=estNorm(p.nome);return finAll().filter(e=>e.tipo==="pagar"&&(e.prest===p.id||(!e.prest&&e.contra&&estNorm(e.contra)===nn)))}
function ctOcorr(c){
  if(!c.inicio)return[];
  if(c.forma==="unica")return[c.inicio];
  if(c.forma==="servico")return[];
  const lim=c.fim||addMesesIso(hojeIso(),12),out=[];
  const p=REP_PASSO[c.forma]||REP_PASSO.mensal;
  for(let i=0;i<600;i++){const d=p.m?addMesesIso(c.inicio,p.m*i):addDaysIso(c.inicio,p.d*i);if(d>lim)break;out.push(d)}
  return out;
}
function ctInfo(c){
  const h=hojeIso(),oc=ctOcorr(c),v=+c.valor||0,var_=c.forma==="servico";
  const diasFim=c.fim?daysBetweenIso(h,c.fim):null,encerrado=c.fim?c.fim<h:(c.forma==="unica"&&!!c.inicio&&c.inicio<h);
  const futuras=oc.filter(d=>d>=h),indet=!c.fim&&!var_&&c.forma!=="unica";
  const nivel=encerrado||diasFim==null?0:diasFim<=15?3:diasFim<=30?2:0;
  return{oc,futuras,encerrado,diasFim,indet,nivel,vigente:!encerrado,
    comprometido:var_?null:oc.length*v,restante:var_?null:futuras.length*v,
    pago:soma(finAll().filter(e=>e.contrato===c.id&&e.pago),finNum),gerados:finAll().filter(e=>e.contrato===c.id).length,
    sit:encerrado?"Encerrado":c.fim?(diasFim<=30?(diasFim===0?"Vence hoje":`Vence em ${diasFim} dia(s)`):"Vigente"):"Prazo indeterminado"};
}
const ctNome=c=>c.prest?((prestAll().find(p=>p.id===c.prest)||{}).nome||"(prestador removido)"):(c.contraparte||"—");
function prestInfo(p){
  const all=prestPagamentos(p),pagos=all.filter(e=>e.pago&&!e.cancelada).sort((a,b)=>b.pago.localeCompare(a.pago)),abertos=all.filter(e=>!e.pago);
  const cts=ctAll().filter(c=>c.prest===p.id),vig=cts.filter(c=>!ctInfo(c).encerrado),nn=estNorm(p.nome);
  const notas=((S.config.nf&&S.config.nf.rows)||[]).filter(r=>estNorm(r.local)===nn);
  return{pagos,abertos,nPag:pagos.length,total:soma(pagos,finNum),ultimo:pagos[0]?pagos[0].pago:null,aberto:soma(abertos,e=>+e.valor),cts,vig,
    prox:vig.map(c=>c.fim).filter(Boolean).sort()[0]||null,nNotas:new Set(notas.map(nfKey)).size,notasTotal:soma(notas,r=>r.total)};
}
function contratoGerar(c){
  if(c.forma==="servico"){toast("Contrato por serviço tem valor variável — lance cada pagamento quando ele ocorrer.",true);return 0}
  const h=hojeIso(),nome=ctNome(c),fut=ctInfo(c).futuras;
  const novos=fut.map((d,i)=>({id:uid8(),tipo:"pagar",desc:`${c.objeto}${nome&&nome!=="—"?" — "+nome:""}`,contra:nome==="—"?"":nome,cat:c.cat||"Serviços de terceiros",area:c.area||"",forma:"",obs:"Gerado do contrato",valor:+c.valor||0,venc:d,pago:null,valorPago:null,grupo:"ct"+c.id,parcela:fut.length>1?`${i+1}/${fut.length}`:null,contrato:c.id,prest:c.prest||null,fornId:finFornId(nome==="—"?"":nome,c.prest)}));
  finMutate(all=>[...all.filter(e=>!(e.contrato===c.id&&!e.pago&&e.venc>=h)),...novos]);
  return novos.length;
}

/* ---------- tela de prestadores ---------- */
const PRS={q:"",sit:"ativos"};
function pgPrest(){
  const ps=prestAll(),ano=hojeIso().slice(0,4);
  const infos=Object.fromEntries(ps.map(p=>[p.id,prestInfo(p)]));
  const lista=ps.filter(p=>(PRS.sit==="todos"||(PRS.sit==="ativos"?p.sit!=="Encerrado":p.sit==="Encerrado"))&&(!PRS.q||estNorm(p.nome+" "+(p.servico||"")+" "+(p.vinculo||"")).includes(estNorm(PRS.q)))).sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  const pagoAno=soma(ps,p=>soma(infos[p.id].pagos.filter(e=>e.pago.startsWith(ano)),finNum));
  const venc=ctAll().filter(c=>{const i=ctInfo(c);return !i.encerrado&&i.diasFim!=null&&i.diasFim<=30}).length;
  return banner("","Prestadores","Quem presta serviço à casa, o tipo de contrato e quanto já foi pago a cada um.","users")+noStore()+`
  <div class="stats"><div class="stat"><b>${ps.filter(p=>p.sit!=="Encerrado").length}</b><span>prestadores ativos</span></div>
   <div class="stat ${venc?"warn":""}"><b>${venc}</b><span>contratos vencem em até 30 dias</span></div>
   <div class="stat blue"><b>${fmtBRL(pagoAno)}</b><span>pago a prestadores em ${ano}</span></div>
   <div class="stat"><b>${soma(ps,p=>infos[p.id].nPag)}</b><span>pagamentos realizados (todos)</span></div></div>
  <div class="card"><div class="row" style="margin-bottom:12px;align-items:flex-end"><button class="b" id="psnovo" style="flex:none">${ic("plus")} Novo prestador</button>
   <button class="b sec" id="psct" style="flex:none">${ic("sheet")} Contratos e compromissos</button></div>
   <div class="row" style="margin-bottom:12px"><div style="flex:0 0 200px"><label>Situação</label><select id="pssit">${[["ativos","Ativos"],["encerrados","Encerrados"],["todos","Todos"]].map(([v,l])=>`<option value="${v}" ${PRS.sit===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div style="flex:2"><label>Buscar</label><input id="psq" value="${esc(PRS.q)}" placeholder="nome, serviço ou tipo de contrato"></div></div>
   ${lista.length?`<div class="wrap"><table><thead><tr><th>Prestador</th><th>Tipo de contrato</th><th>Contratos</th><th class="n">Pagamentos feitos</th><th class="n">Total pago</th><th>Último</th><th class="n">Em aberto</th><th></th></tr></thead><tbody>
   ${lista.map(p=>{const i=infos[p.id];return `<tr><td><b>${esc(p.nome)}</b>${p.sit==="Encerrado"?` <span class="pill s-falta">encerrado</span>`:""}<div class="sub">${esc([p.servico,p.doc].filter(Boolean).join(" · "))}</div></td>
    <td>${esc(p.vinculo||"—")}</td><td>${i.cts.length?`${i.vig.length} vigente(s)${i.prox?`<div class="sub">próximo fim ${brDate(i.prox)}</div>`:""}`:`<span class="sub">sem contrato lançado</span>`}</td>
    <td class="n"><b>${i.nPag}</b>${i.nNotas?`<div class="sub">+ ${i.nNotas} nota(s) fiscal(is)</div>`:""}</td><td class="n">${fmtBRL(i.total)}</td><td>${i.ultimo?brDate(i.ultimo):"—"}</td><td class="n">${i.aberto?fmtBRL(i.aberto):"—"}</td>
    <td style="white-space:nowrap"><button class="b sm" data-psver="${p.id}">Pagamentos</button> <button class="b sec sm" data-psed="${p.id}" title="Editar">${ic("edit")}</button> <button class="b sec sm" data-psdel="${p.id}" title="Excluir">${ic("trash")}</button></td></tr>`}).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum prestador ${PRS.q||PRS.sit!=="ativos"?"com esses filtros":"cadastrado ainda"}. Cadastre quem presta serviço à casa — fisioterapeuta, nutricionista, manutenção, limpeza terceirizada.</div>`}</div>`;
}
function bindPrest(){
  const re=()=>go("prest",true);
  $("psnovo").onclick=()=>openPrestador(null);
  $("psct").onclick=()=>{CTB.tab="ct";go("contab")};
  $("pssit").onchange=e=>{PRS.sit=e.target.value;re()};
  const q=$("psq");q.oninput=()=>{PRS.q=q.value;re();const n=$("psq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  document.querySelectorAll("[data-psver]").forEach(b=>b.onclick=()=>openPrestDetalhe(b.dataset.psver));
  document.querySelectorAll("[data-psed]").forEach(b=>b.onclick=()=>openPrestador(b.dataset.psed));
  document.querySelectorAll("[data-psdel]").forEach(b=>b.onclick=async()=>{
    const p=prestAll().find(x=>x.id===b.dataset.psdel);if(!p)return;
    const n=prestInfo(p).nPag;
    if(!await askConfirm(`Excluir "${p.nome}"?${n?` Os ${n} pagamento(s) já feitos continuam no Financeiro, mas deixam de ficar ligados a ele.`:""}`,"Excluir"))return;
    prestSave(prestAll().filter(x=>x.id!==p.id));toast("Prestador excluído.");re();
  });
}
function openPrestador(id){
  const ed=id?prestAll().find(p=>p.id===id):null,areas=estData().areas;
  const ov=openModal(`<h3>${ed?"Editar prestador":"Novo prestador"}</h3>
   <label>Nome ou razão social</label><input id="pnome" value="${esc(ed?ed.nome:"")}">
   <div class="row"><div><label>CPF ou CNPJ</label><input id="pdoc" value="${esc(ed?ed.doc||"":"")}" inputmode="numeric"></div>
    <div><label>Tipo de contrato</label><select id="pvinc">${VINCULOS.map(v=>`<option ${(ed?ed.vinculo:"")===v?"selected":""}>${v}</option>`).join("")}</select></div></div>
   <label>Serviço prestado</label><input id="pserv" value="${esc(ed?ed.servico||"":"")}" placeholder="Ex.: fisioterapia, nutrição, manutenção elétrica">
   <div class="row"><div><label>Telefone ou e-mail</label><input id="pcont" value="${esc(ed?ed.contato||"":"")}"></div>
    <div><label>Área da casa</label><select id="parea"><option value="">—</option>${areas.map(a=>`<option ${ed&&ed.area===a?"selected":""}>${esc(a)}</option>`).join("")}</select></div></div>
   <label>Dados para pagamento (PIX ou banco)</label><input id="ppix" value="${esc(ed?ed.pix||"":"")}">
   <div class="row"><div><label>Situação</label><select id="psit2"><option ${!ed||ed.sit!=="Encerrado"?"selected":""}>Ativo</option><option ${ed&&ed.sit==="Encerrado"?"selected":""}>Encerrado</option></select></div>
    <div><label>Observação</label><input id="pobs" value="${esc(ed?ed.obs||"":"")}"></div></div>
   <div class="err" id="perr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="pcx">Cancelar</button><button class="b" id="psv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s);g("#pcx").onclick=()=>ov.remove();
  g("#psv").onclick=()=>{
    const nome=g("#pnome").value.trim(),doc=g("#pdoc").value.trim();
    if(!nome)return g("#perr").textContent="Informe o nome do prestador.";
    if(!docOk(doc))return g("#perr").textContent="CPF ou CNPJ inválido. Confira os números.";
    if(prestAll().some(p=>p.id!==(ed&&ed.id)&&estNorm(p.nome)===estNorm(nome)))return g("#perr").textContent="Já existe um prestador com esse nome.";
    const reg={id:ed?ed.id:uid8(),nome,doc,vinculo:g("#pvinc").value,servico:g("#pserv").value.trim(),contato:g("#pcont").value.trim(),area:g("#parea").value,pix:g("#ppix").value.trim(),sit:g("#psit2").value,obs:g("#pobs").value.trim()};
    prestSave(ed?prestAll().map(p=>p.id===ed.id?reg:p):[...prestAll(),reg]);
    ov.remove();toast("Prestador salvo.");go(ROUTE,true);
  };
}
function openPrestDetalhe(id){
  const p=prestAll().find(x=>x.id===id);if(!p)return;
  const i=prestInfo(p),pag=[...i.pagos,...i.abertos.sort((a,b)=>a.venc.localeCompare(b.venc))];
  const ov=openModal(`<h3>${esc(p.nome)}</h3><div class="sub" style="margin-bottom:10px">${esc([p.vinculo,p.servico,p.doc,p.contato].filter(Boolean).join(" · "))}${p.pix?`<br>Pagamento: ${esc(p.pix)}`:""}</div>
   <div class="stats" style="margin-bottom:10px"><div class="stat"><b>${i.nPag}</b><span>pagamentos feitos</span></div><div class="stat blue"><b>${fmtBRL(i.total)}</b><span>total pago</span></div><div class="stat ${i.aberto?"warn":""}"><b>${fmtBRL(i.aberto)}</b><span>em aberto · ${i.abertos.length}</span></div></div>
   ${i.nNotas?`<div class="callout" style="margin-bottom:10px">Também há <b>${i.nNotas}</b> nota(s) fiscal(is) deste fornecedor, somando <b>${fmtBRL(i.notasTotal)}</b>.</div>`:""}
   <h2>Contratos</h2>${i.cts.length?i.cts.map(c=>{const ci=ctInfo(c);return `<div class="doc ${ci.nivel===3?"urg":ci.nivel===2?"atn":""}"><div class="grow"><div class="nm">${esc(c.objeto)}</div><div class="sub">${esc(c.tipo||"")} · ${CT_FORMAS[c.forma]} ${c.forma!=="servico"?"· "+fmtBRL(c.valor):""} · ${esc(ci.sit)}</div></div><button class="b sec sm" data-pdct="${c.id}">Abrir</button></div>`}).join(""):`<div class="sub">Nenhum contrato lançado.</div>`}
   <h2 style="margin-top:14px">Pagamentos</h2>${pag.length?`<div class="wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${pag.map(e=>`<tr><td>${brDate(e.pago||e.venc)}</td><td>${esc(e.desc)}</td><td class="n">${fmtBRL(finNum(e))}</td><td>${finPill(e)}</td><td><button class="b sec sm" data-fanexo="${e.id}" title="Comprovantes">${ic("clip")}${(e.anexos||[]).length?" "+e.anexos.length:""}</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhum pagamento ligado a este prestador ainda.</div>`}
   <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px"><button class="b sec" id="pdcx">Fechar</button><button class="b sec" id="pdct">${ic("sheet")} Novo contrato</button><button class="b" id="pdpg">${ic("plus")} Lançar pagamento</button>${p.vinculo==="Autônomo (RPA)"?`<button class="b wood" id="pdrpa">${ic("calc")} Pagamento RPA (com retenções)</button>`:""}</div>`);
  ov.querySelector("#pdcx").onclick=()=>ov.remove();
  ov.querySelectorAll("[data-fanexo]").forEach(b=>b.onclick=()=>{ov.remove();openFinAnexos(b.dataset.fanexo)});
  ov.querySelector("#pdpg").onclick=()=>{ov.remove();openFinLanc(null,"pagar",{contra:p.nome,prest:p.id,cat:"Serviços de terceiros",desc:p.servico||"",area:p.area||""})};
  ov.querySelector("#pdct").onclick=()=>{ov.remove();openContrato(null,{prest:p.id,area:p.area||""})};
  const rb=ov.querySelector("#pdrpa");if(rb)rb.onclick=()=>{ov.remove();openRpa(p.id)};
  ov.querySelectorAll("[data-pdct]").forEach(b=>b.onclick=()=>{ov.remove();openContrato(b.dataset.pdct)});
}

/* ---------- RPA: INSS, IRRF e ISS retidos de autônomo — estimativa gerencial, o contador confirma ---------- */
// 2026: teto do INSS R$ 8.475,55 (11% do contribuinte individual); tabela do IRRF com desconto simplificado de R$ 607,20;
// Lei 15.270/2025: imposto zero até R$ 5.000 e redutor decrescente até R$ 7.350 (redução = 978,62 − 0,133145 × rendimento)
const RPA_T={ano:2026,tetoInss:8475.55,aliqInss:0.11,patronal:0.20,simpl:607.20,dep:189.59,isencao:5000,redA:978.62,redB:0.133145,redMax:7350,
  faixas:[[2428.80,0,0],[2826.65,0.075,182.16],[3751.05,0.15,394.16],[4664.68,0.225,675.49],[Infinity,0.275,908.73]]};
const rpaR2=x=>Math.round((+x+Number.EPSILON)*100)/100;
function rpaCalc(bruto,o){
  o=o||{};const T=RPA_T,dep=+o.dep||0,outras=+o.outras||0,issPct=+o.issPct||0;
  const baseInss=Math.max(0,Math.min(bruto,T.tetoInss-outras));
  const inss=o.inssFixo!==undefined?+o.inssFixo:rpaR2(baseInss*T.aliqInss);
  const ded=Math.max(inss+dep*T.dep,T.simpl),base=Math.max(0,bruto-ded);
  const f=T.faixas.find(x=>base<=x[0]);let irrf=Math.max(0,Math.floor(base*f[1]*100)/100-f[2]),red=0;
  if(bruto<=T.isencao)red=irrf;else if(bruto<=T.redMax)red=Math.min(irrf,Math.max(0,T.redA-T.redB*bruto));
  irrf=rpaR2(Math.max(0,irrf-red));
  const iss=rpaR2(bruto*issPct/100),pat=o.patronal?rpaR2(baseInss*T.patronal):0;
  return{bruto:rpaR2(bruto),inss,irrf,iss,patronal:pat,liquido:rpaR2(bruto-inss-irrf-iss),baseIr:rpaR2(base),simplificado:ded===T.simpl&&inss+dep*T.dep<T.simpl,reducao:rpaR2(red)};
}
// GPS vence dia 20 do mês seguinte e o DARF 0588 no último dia útil do mês seguinte (só fins de semana; feriados: confira com o contador)
function rpaPrazos(pagIso){
  const[y,m]=pagIso.split("-").map(Number);
  let g=new Date(y,m,20);while(g.getDay()===0||g.getDay()===6)g.setDate(g.getDate()-1);
  let d=new Date(y,m+1,0);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);
  return{gps:isoDate(g),darf:isoDate(d),iss:isoDate(new Date(y,m,10))};
}
function openRpa(prestId){
  const p=prestAll().find(x=>x.id===prestId);if(!p)return;
  const ov=openModal(`<h3>Pagamento de autônomo (RPA)</h3><div class="sub" style="margin-bottom:8px">${esc(p.nome)}${p.doc?" · "+esc(p.doc):""}</div>
   ${String(p.doc||"").replace(/\D/g,"").length===14?`<div class="callout sand" style="margin-bottom:8px">Este prestador tem CNPJ. RPA é para pessoa física — para empresa, lance a nota fiscal.</div>`:""}
   <div class="row"><div><label>Valor bruto do serviço (R$)</label><input type="number" min="0" step="0.01" id="rpb"></div><div><label>Data do pagamento</label><input type="date" id="rpd" value="${hojeIso()}"></div></div>
   <label>Descrição do serviço</label><input id="rpdesc" value="${esc(p.servico||"")}" placeholder="Ex.: sessões de fisioterapia — outubro">
   <div class="row"><div><label>Dependentes (para o IRRF)</label><input type="number" min="0" id="rpdep" value="0"></div>
    <div><label>Base já recolhida ao INSS em outras fontes no mês (R$)</label><input type="number" min="0" step="0.01" id="rpout" value="0"></div>
    <div><label>ISS retido (%)</label><input type="number" min="0" step="0.01" id="rpiss" value="0"></div></div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="rppat"> Recolher também o INSS patronal de 20% (empresa fora do Simples ou no Anexo IV)</label>
   <div id="rpprev" style="margin-top:10px"></div>
   <div class="sub" style="margin-top:6px">Estimativa gerencial com a tabela de ${RPA_T.ano} (teto do INSS R$ ${RPA_T.tetoInss.toLocaleString("pt-BR",{minimumFractionDigits:2})}). O contador confirma antes do recolhimento; não é orientação jurídica ou tributária.</div>
   <div class="err" id="rperr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="rpcx">Cancelar</button><button class="b" id="rpsv">Lançar pagamento e guias</button></div>`);
  const g=q=>ov.querySelector(q),cur=()=>rpaCalc(+g("#rpb").value||0,{dep:+g("#rpdep").value,outras:+g("#rpout").value,issPct:+g("#rpiss").value,patronal:g("#rppat").checked});
  const pv=()=>{const c=cur(),pr=rpaPrazos(g("#rpd").value||hojeIso());
    g("#rpprev").innerHTML=c.bruto>0?`<table><tbody><tr><td>Valor bruto</td><td class="n">${fmtBRL(c.bruto)}</td></tr><tr><td>(−) INSS retido (11%)</td><td class="n">${fmtBRL(c.inss)}</td></tr>
     <tr><td>(−) IRRF retido${c.reducao?` <span class="sub">(com redução da Lei 15.270)</span>`:""}</td><td class="n">${fmtBRL(c.irrf)}</td></tr>${c.iss?`<tr><td>(−) ISS retido</td><td class="n">${fmtBRL(c.iss)}</td></tr>`:""}
     <tr style="font-weight:700"><td>Líquido a pagar ao prestador</td><td class="n">${fmtBRL(c.liquido)}</td></tr>
     ${c.patronal?`<tr><td class="sub">INSS patronal (custo da casa)</td><td class="n sub">${fmtBRL(c.patronal)}</td></tr>`:""}</tbody></table>
     <div class="sub" style="margin-top:4px">Guias geradas em Contas a pagar: GPS ${brDate(pr.gps)}${c.irrf>=10?` · DARF 0588 ${brDate(pr.darf)}`:c.irrf>0?" · IRRF abaixo de R$ 10,00 não gera DARF":""}${c.iss?` · ISS ${brDate(pr.iss)}`:""}.</div>`:"";};
  ["#rpb","#rpd","#rpdep","#rpout","#rpiss","#rppat"].forEach(i=>{g(i).oninput=pv;g(i).onchange=pv});pv();
  g("#rpcx").onclick=()=>ov.remove();
  g("#rpsv").onclick=()=>{
    const bruto=+g("#rpb").value,pag=g("#rpd").value,er=m=>g("#rperr").textContent=m;
    if(!(bruto>0))return er("Informe o valor bruto.");if(!pag)return er("Informe a data do pagamento.");
    const c=cur(),pr=rpaPrazos(pag),id=uid8(),[y,m]=pag.split("-"),comp=`${m}/${y}`,desc=g("#rpdesc").value.trim()||p.servico||"Serviço";
    const base={tipo:"pagar",forma:"",pago:null,valorPago:null,grupo:"rpa"+id,parcela:null};
    const novos=[{id:uid8(),...base,desc:`RPA ${comp} — ${p.nome} — ${desc}`,contra:p.nome,cat:"Serviços de terceiros",area:p.area||"",obs:`Bruto ${fmtBRL(c.bruto)}; INSS ${fmtBRL(c.inss)}; IRRF ${fmtBRL(c.irrf)}${c.iss?"; ISS "+fmtBRL(c.iss):""}. Estimativa gerencial.`,valor:c.liquido,venc:pag,prest:p.id,fornId:"p:"+p.id,rpa:id,rpaDados:{...c,comp}}];
    const guia=(d,contra,v,venc)=>novos.push({id:uid8(),...base,desc:d,contra,cat:"Tributos e contribuições",area:"",obs:`Retido de ${p.nome} (RPA ${comp}). Confirmar valor e código com o contador.`,valor:v,venc,prest:null,fornId:finFornId(contra,null),rpa:id});
    if(c.inss+c.patronal>0)guia(`GPS — INSS RPA ${comp} — ${p.nome}`,"Receita Federal (GPS)",rpaR2(c.inss+c.patronal),pr.gps);
    if(c.irrf>=10)guia(`DARF 0588 — IRRF RPA ${comp} — ${p.nome}`,"Receita Federal (DARF)",c.irrf,pr.darf);
    if(c.iss>0)guia(`ISS retido RPA ${comp} — ${p.nome}`,"Prefeitura (ISS)",c.iss,pr.iss);
    finMutate(all=>[...all,...novos]);ov.remove();toast(`RPA lançado: líquido ${fmtBRL(c.liquido)} e ${novos.length-1} guia(s) de tributo em Contas a pagar.`);go(ROUTE,true);
  };
}
function specRpa(c){
  const l=finAll().filter(e=>e.rpaDados&&relNoPer(e.venc,c)).sort((a,b)=>a.venc.localeCompare(b.venc));
  return{titulo:"Retenções de autônomos (RPA)",sub:relSub(c,true)+" · estimativa gerencial, o contador confirma",sensivel:true,
   cols:[{h:"Pagamento",t:"date",w:12},{h:"Prestador",w:28},{h:"Bruto",t:"money",w:13},{h:"INSS",t:"money",w:12},{h:"IRRF",t:"money",w:12},{h:"ISS",t:"money",w:11},{h:"Líquido",t:"money",w:13},{h:"INSS patronal",t:"money",w:13}],
   rows:l.map(e=>[e.venc,e.contra,e.rpaDados.bruto,e.rpaDados.inss,e.rpaDados.irrf,e.rpaDados.iss||0,e.rpaDados.liquido,e.rpaDados.patronal||0]),tot:[null,null,"sum","sum","sum","sum","sum","sum"]};
}

/* ---------- contratos ---------- */
function openContrato(id,preset){
  const ed=id?ctAll().find(c=>c.id===id):null,pre=preset||{},areas=estData().areas,v=k=>ed?(ed[k]??""):(pre[k]??"");
  const ov=openModal(`<h3>${ed?"Editar contrato":"Novo contrato"}</h3>
   <div class="row"><div><label>Prestador</label><select id="ctp"><option value="">— outro (digitar abaixo)</option>${prestAll().map(p=>`<option value="${p.id}" ${v("prest")===p.id?"selected":""}>${esc(p.nome)}</option>`).join("")}</select></div>
    <div id="ctcbox"><label>Contraparte (se não for prestador)</label><input id="ctc" value="${esc(v("contraparte"))}" placeholder="Ex.: imobiliária, operadora de internet"></div></div>
   <label>Objeto do contrato</label><input id="cto" value="${esc(v("objeto"))}" placeholder="Ex.: Fisioterapia respiratória, aluguel do prédio">
   <div class="row"><div><label>Tipo de contrato</label><select id="ctt">${CT_TIPOS.map(t=>`<option ${v("tipo")===t?"selected":""}>${t}</option>`).join("")}</select></div>
    <div><label>Pagamento</label><select id="ctf">${Object.entries(CT_FORMAS).map(([k,l])=>`<option value="${k}" ${(ed?ed.forma:"mensal")===k?"selected":""}>${l}</option>`).join("")}</select></div>
    <div><label id="ctvl">Valor (R$)</label><input type="number" min="0" step="1" id="ctv" value="${v("valor")}"></div></div>
   <div class="row"><div><label>Início</label><input type="date" id="cti" value="${v("inicio")||hojeIso()}"></div><div><label>Fim (vazio = prazo indeterminado)</label><input type="date" id="ctfim" value="${v("fim")}"></div></div>
   <div class="row"><div><label>Categoria no financeiro</label><input id="ctcat" value="${esc(v("cat")||"Serviços de terceiros")}"></div>
    <div><label>Área</label><select id="cta"><option value="">—</option>${areas.map(a=>`<option ${v("area")===a?"selected":""}>${esc(a)}</option>`).join("")}</select></div></div>
   <label>Observação</label><input id="ctobs" value="${esc(v("obs"))}">
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="ctger" ${ed?"":"checked"}> Gerar as contas a pagar deste contrato no Financeiro</label>
   <div class="sub" style="margin:2px 0 0">É assim que o valor a ser gasto entra no fluxo de caixa, no DRE e na Visão geral. Contrato por serviço não gera parcelas: lance cada pagamento quando ocorrer.</div>
   <div class="err" id="ctee"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ctcx">Cancelar</button><button class="b" id="ctsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s),vis=()=>{g("#ctcbox").style.display=g("#ctp").value?"none":"block";g("#ctvl").textContent=g("#ctf").value==="servico"?"Valor de referência por serviço (R$)":"Valor de cada pagamento (R$)"};
  g("#ctp").onchange=vis;g("#ctf").onchange=vis;vis();g("#ctcx").onclick=()=>ov.remove();
  g("#ctsv").onclick=()=>{
    const objeto=g("#cto").value.trim(),prest=g("#ctp").value,contraparte=g("#ctc").value.trim(),forma=g("#ctf").value,valor=+g("#ctv").value,inicio=g("#cti").value,fim=g("#ctfim").value,er=m=>g("#ctee").textContent=m;
    if(!objeto)return er("Descreva o objeto do contrato.");if(!prest&&!contraparte)return er("Escolha o prestador ou informe a contraparte.");
    if(!(valor>0))return er("Informe o valor.");if(!inicio)return er("Informe a data de início.");if(fim&&fim<inicio)return er("O fim não pode ser antes do início.");
    if(forma==="unica"&&fim)return er("Pagamento único não tem data de fim — deixe o fim em branco.");
    const reg={id:ed?ed.id:uid8(),prest,contraparte:prest?"":contraparte,objeto,tipo:g("#ctt").value,forma,valor,inicio,fim,cat:g("#ctcat").value.trim()||"Serviços de terceiros",area:g("#cta").value,obs:g("#ctobs").value.trim()};
    ctSave(ed?ctAll().map(c=>c.id===ed.id?reg:c):[...ctAll(),reg]);
    let n=0;if(g("#ctger").checked)n=contratoGerar(reg);
    ov.remove();toast(`Contrato salvo${n?` e ${n} conta(s) a pagar gerada(s)`:""}.`);go(ROUTE,true);
  };
}
function ctListaHtml(){
  const cts=ctAll().map(c=>({c,i:ctInfo(c)})).sort((a,b)=>(a.i.encerrado-b.i.encerrado)||((a.c.fim||"9999").localeCompare(b.c.fim||"9999")));
  const vig=cts.filter(x=>!x.i.encerrado),comp=soma(vig,x=>x.i.restante||0),mensal=soma(vig.filter(x=>CT_MESES[x.c.forma]),x=>(+x.c.valor||0)/CT_MESES[x.c.forma]);
  return `<div class="stats"><div class="stat"><b>${vig.length}</b><span>contratos vigentes</span></div>
   <div class="stat ${vig.some(x=>x.i.nivel)?"warn":""}"><b>${vig.filter(x=>x.i.nivel).length}</b><span>vencem em até 30 dias</span></div>
   <div class="stat blue"><b>${fmtBRL(comp)}</b><span>ainda a gastar (compromisso restante)</span></div>
   <div class="stat"><b>${fmtBRL(mensal)}</b><span>gasto mensal equivalente em contratos</span></div></div>
  <div class="card"><div class="row" style="margin-bottom:12px"><button class="b" id="ctnovo" style="flex:none">${ic("plus")} Novo contrato</button><button class="b sec" id="ctprest" style="flex:none">${ic("users")} Prestadores</button></div>
   ${cts.length?`<div class="wrap"><table><thead><tr><th>Contrato</th><th>Contraparte</th><th>Pagamento</th><th>Vigência</th><th class="n">Comprometido</th><th class="n">Já pago</th><th class="n">Ainda a gastar</th><th></th></tr></thead><tbody>
   ${cts.map(({c,i})=>`<tr><td><b>${esc(c.objeto)}</b><div class="sub">${esc(c.tipo||"")}</div></td><td>${esc(ctNome(c))}</td><td>${CT_FORMAS[c.forma]}${c.forma!=="servico"?`<div class="sub">${fmtBRL(c.valor)}</div>`:""}</td>
    <td>${brDate(c.inicio)}${c.fim?" a "+brDate(c.fim):" — sem fim"}<div><span class="pill ${i.encerrado?"s-falta":i.nivel===3?"s-urgente":i.nivel===2?"s-pendencia":"s-ok"}">${esc(i.sit)}</span></div></td>
    <td class="n">${i.comprometido==null?"variável":fmtBRL(i.comprometido)}${i.indet?`<div class="sub">próx. 12 meses</div>`:""}</td><td class="n">${fmtBRL(i.pago)}</td><td class="n"><b>${i.restante==null?"—":fmtBRL(i.restante)}</b>${i.gerados?`<div class="sub">${i.gerados} lançamento(s) no financeiro</div>`:""}</td>
    <td style="white-space:nowrap">${c.forma!=="servico"&&!i.encerrado?`<button class="b sm" data-ctger="${c.id}" title="Gerar ou atualizar as contas a pagar futuras">${ic("wallet")} Gerar</button> `:""}<button class="b sec sm" data-cted="${c.id}">${ic("edit")}</button> <button class="b sec sm" data-ctdel="${c.id}">${ic("trash")}</button></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum contrato lançado. Lance aluguel, internet, prestadores — o sistema calcula o que ainda vai ser gasto e avisa antes de vencer.</div>`}</div>`;
}
function bindCt(){
  const re=()=>go(ROUTE,true);
  const n=$("ctnovo");if(n)n.onclick=()=>openContrato(null);const p=$("ctprest");if(p)p.onclick=()=>go("prest");
  document.querySelectorAll("[data-cted]").forEach(b=>b.onclick=()=>openContrato(b.dataset.cted));
  document.querySelectorAll("[data-ctger]").forEach(b=>b.onclick=()=>{const c=ctAll().find(x=>x.id===b.dataset.ctger);if(!c)return;const k=contratoGerar(c);if(k)toast(`${k} conta(s) a pagar gerada(s) no Financeiro.`);re()});
  document.querySelectorAll("[data-ctdel]").forEach(b=>b.onclick=async()=>{
    const c=ctAll().find(x=>x.id===b.dataset.ctdel);if(!c)return;const abertos=finAll().filter(e=>e.contrato===c.id&&!e.pago).length;
    if(!await askConfirm(`Excluir o contrato "${c.objeto}"?${abertos?` As ${abertos} conta(s) a pagar em aberto geradas por ele também serão removidas; as já pagas ficam.`:""}`,"Excluir"))return;
    ctSave(ctAll().filter(x=>x.id!==c.id));if(abertos)finApagar(e=>e.contrato===c.id&&!e.pago);toast("Contrato excluído.");re();
  });
}


