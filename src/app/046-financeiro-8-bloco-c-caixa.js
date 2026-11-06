/* ===== Financeiro 8: Bloco C — caixa e bancos ===== */
const f8cfg=()=>xcfg("fin8");
const f8save=p=>xcfgSave("fin8",p);
const f8Id=()=>uid8();
const F8={sim:{}};
/* ---------- saldos: disponível × vinculado ---------- */
const f8Vinc=()=>f8cfg().vinculadas||{};
const f8SaldoTotal=ate=>arred2(soma(f4ContasPag(),c=>f4SaldoConta(c,ate)));
const f8Disponivel=()=>arred2(soma(f4ContasPag().filter(c=>!f8Vinc()[c.id]),c=>f4SaldoConta(c)));
/* ---------- A. saldo projetado por dia e cenários ---------- */
const F8_CEN={otimista:{nome:"Otimista",atraso:0,perda:0,sobra:0},realista:{nome:"Realista",atraso:5,perda:3,sobra:3},pessimista:{nome:"Pessimista",atraso:15,perda:10,sobra:10}};
function f8Limite(){const L=f8cfg().limites||{};return soma(f4ContasPag(),c=>+((L[c.id]||{}).limite)||0)}
function f8Serie(dias,cen,incVencidos){
  cen=cen||F8_CEN.realista;const h=hojeIso(),fim=addDaysIso(h,dias),ev={};
  const add=(d,v)=>{if(d<h)d=h;if(d>fim)return;ev[d]=(ev[d]||0)+v};
  finAll().filter(e=>!e.cancelada&&!e.pago).forEach(e=>{
    if(e.tipo==="receber"){if(e.venc<h&&!incVencidos)return;add(addDaysIso(e.venc<h?h:e.venc,cen.atraso||0),(+e.valor)*(1-(cen.perda||0)/100))}
    else add(e.venc,-(+e.valor)*(1+(cen.sobra||0)/100));
  });
  const T=f8cfg().tarifas||{};
  Object.entries(T).forEach(([cid,v])=>{if(!(+v>0))return;for(let m=0;m<=Math.ceil(dias/28)+1;m++){const d=addMesesIso(h.slice(0,8)+"05",m);if(d>=h&&d<=fim)add(d,-(+v))}});
  let s=f8SaldoTotal(),min=s,minD=h,neg=null;const out=[];
  for(let i=0;i<=dias;i++){const d=addDaysIso(h,i);s+=ev[d]||0;if(i===0&&!ev[d])s=s;out.push({d,s:arred2(s)});if(s<min){min=s;minD=d}if(s<0&&!neg)neg=d}
  return{serie:out,min:arred2(min),minD,neg,fim:out[out.length-1].s};
}
function f8Chart(serie,lim){
  const W=640,H=200,pl=60,pb=22,mx=Math.max(...serie.map(x=>x.s),1),mn=Math.min(...serie.map(x=>x.s),0,-lim),sc=v=>H-pb-((v-mn)/((mx-mn)||1))*(H-pb-12),n=serie.length;
  const pts=serie.map((x,i)=>`${pl+(W-pl-6)*i/(n-1||1)},${sc(x.s)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto"><line x1="${pl}" y1="${sc(0)}" x2="${W}" y2="${sc(0)}" stroke="#c62828" stroke-dasharray="4 3" opacity=".6"/>${lim?`<line x1="${pl}" y1="${sc(-lim)}" x2="${W}" y2="${sc(-lim)}" stroke="#e0a100" stroke-dasharray="2 3" opacity=".7"/>`:""}<polyline fill="none" stroke="#2e7d32" stroke-width="2" points="${pts}"/>${[mn,(mn+mx)/2,mx].map(v=>`<text x="${pl-4}" y="${sc(v)+4}" font-size="10" text-anchor="end" fill="currentColor" opacity=".7">${f6Abrev(v)}</text>`).join("")}<text x="${pl}" y="${H-6}" font-size="10" fill="currentColor" opacity=".7">${brDate(serie[0].d)}</text><text x="${W-6}" y="${H-6}" font-size="10" text-anchor="end" fill="currentColor" opacity=".7">${brDate(serie[n-1].d)}</text></svg>`;
}
function f8ProjHtml(){
  const dias=F8.sim.dias||60,sel=F8.sim.cen||"realista",lim=f8Limite(),R={};Object.keys(F8_CEN).forEach(k=>R[k]=f8Serie(dias,F8_CEN[k]));
  const S1=R[sel];
  const juros=(()=>{const L=f8cfg().limites||{},tx=Math.max(0,...Object.values(L).map(x=>+x.juros||0))/100;return arred2(soma(S1.serie.filter(x=>x.s<0),x=>Math.min(-x.s,lim||1e12)*tx/30))})();
  return f6Card("Saldo projetado dia a dia",`Parte do saldo de hoje (${f6Money(f8SaldoTotal())}) e soma as contas a receber e a pagar em aberto. Contas a receber já vencidas ficam de fora. Tarifas bancárias previstas entram todo dia 5.`,
   `<div class="row" style="margin-bottom:8px"><div><label>Horizonte</label><select id="f8dias">${[30,60,90,180].map(d=>`<option value="${d}" ${d===dias?"selected":""}>${d} dias</option>`).join("")}</select></div><div><label>Cenário do gráfico</label><select id="f8cen">${Object.entries(F8_CEN).map(([k,v])=>`<option value="${k}" ${k===sel?"selected":""}>${v.nome}</option>`).join("")}</select></div></div>`+
   f8Chart(S1.serie,lim)+
   `<p class="sub">Linha vermelha tracejada: saldo zero.${lim?" Amarela: limite do cheque especial.":""}</p>`+
   f6Tbl(["Cenário","Premissas","Menor saldo","Em","Fica negativo em","Saldo final"],[Object.entries(F8_CEN).map(([k,v])=>`<tr${k===sel?' style="font-weight:700"':""}><td>${v.nome}</td><td class="n">receita ${v.atraso}d atrasada, ${v.perda}% perdida; despesa +${v.sobra}%</td><td class="n" style="color:${R[k].min<0?"#c62828":"inherit"}">${f6Money(R[k].min)}</td><td class="n">${brDate(R[k].minD)}</td><td class="n">${R[k].neg?brDate(R[k].neg):"não fica"}</td><td class="n">${f6Money(R[k].fim)}</td></tr>`).join("")])+
   (S1.neg&&lim?`<p>Estimativa de juros do cheque especial neste cenário: <b>${f6Money(juros)}</b> (limite cadastrado ${f6Money(lim)}).</p>`:"")+
   (S1.neg?`<div class="callout err">No cenário ${F8_CEN[sel].nome.toLowerCase()} o caixa fica negativo em ${brDate(S1.neg)}. Antecipe recebimentos, negocie prazos ou faça uma transferência de reserva.</div>`:""));
}
function f8ProjBind(){
  const d=$("f8dias");if(d)d.onchange=()=>{F8.sim.dias=+d.value;f6Go()};const c=$("f8cen");if(c)c.onchange=()=>{F8.sim.cen=c.value;f6Go()};
}
f6Reg("proj8","Caixa e bancos","Saldo projetado",f8ProjHtml,f8ProjBind);
/* ---------- B. conferir saldo, contas vinculadas, limites e tarifas ---------- */
function f8ConfHtml(){
  const cs=f4ContasPag(),c=f8cfg(),L=c.limites||{},T=c.tarifas||{},V=f8Vinc(),H=(c.conferencias||[]).slice().reverse().slice(0,12);
  const pend=cid=>Object.values(S.extrato||{}).filter(l=>!l.conc&&(l.conta||F4_PRINC)===cid);
  return f6Card("Conferir o saldo com o banco",`Digite o saldo que o banco mostra hoje e veja a diferença para o sistema.`,
    f6Tbl(["Conta","Saldo no sistema","Saldo no banco","Diferença","Extrato sem conciliar",""],[cs.map(x=>{const s=f4SaldoConta(x),p=pend(x.id);return `<tr><td>${f6Esc(x.nome)}${V[x.id]?` <span class="sub">(vinculada)</span>`:""}</td><td class="n">${f6Money(s)}</td><td class="n"><input type="number" step="any" data-f8bk="${x.id}" style="width:120px"></td><td class="n" id="f8df_${x.id}">—</td><td class="n">${p.length} linha(s) · ${f6Money(soma(p,l=>l.valor))}</td><td><button class="b sec sm" data-f8reg="${x.id}">Registrar</button></td></tr>`}).join("")])+
    (H.length?`<h4 style="margin-top:12px">Últimas conferências</h4>`+f6Tbl(["Data","Conta","Sistema","Banco","Diferença","Quem"],[H.map(x=>`<tr><td>${brDate(x.data)}</td><td>${f6Esc(f4NomeConta(x.conta))}</td><td class="n">${f6Money(x.sis)}</td><td class="n">${f6Money(x.banco)}</td><td class="n" style="color:${Math.abs(x.dif)<0.01?"#2e7d32":"#c62828"}">${f6Money(x.dif)}</td><td>${f6Esc(x.por||"")}</td></tr>`).join("")]):""))
   +f6Card("Limite de cheque especial, tarifas e contas vinculadas","Limite e tarifa entram na projeção de caixa. Contas vinculadas (caução, depósito judicial, reserva intocável) não contam como dinheiro disponível.",
    f6Tbl(["Conta","Limite (R$)","Juros do limite (% ao mês)","Tarifas por mês (R$)","Vinculada / bloqueada"],[cs.map(x=>`<tr><td>${f6Esc(x.nome)}</td><td class="n"><input type="number" step="any" data-f8lim="${x.id}" value="${(L[x.id]||{}).limite||""}" style="width:110px"></td><td class="n"><input type="number" step="any" data-f8jur="${x.id}" value="${(L[x.id]||{}).juros||""}" style="width:90px"></td><td class="n"><input type="number" step="any" data-f8tar="${x.id}" value="${T[x.id]||""}" style="width:110px"></td><td class="n"><input type="text" data-f8vin="${x.id}" value="${f6Esc(V[x.id]||"")}" placeholder="motivo, se vinculada" style="width:170px"></td></tr>`).join("")])+`<div class="row" style="margin-top:8px"><button class="b" id="f8cfsv">Salvar</button><span class="sub">Disponível hoje: <b>${f6Money(f8Disponivel())}</b> de ${f6Money(f8SaldoTotal())} no total.</span></div>`);
}
function f8ConfBind(){
  document.querySelectorAll("[data-f8bk]").forEach(i=>i.oninput=()=>{const cid=i.dataset.f8bk,c=f4Conta(cid),d=$("f8df_"+cid);if(i.value===""){d.textContent="—";return}const dif=arred2(f6Num(i.value)-f4SaldoConta(c));d.innerHTML=`<b style="color:${Math.abs(dif)<0.01?"#2e7d32":"#c62828"}">${f6Money(dif)}</b>`});
  document.querySelectorAll("[data-f8reg]").forEach(b=>b.onclick=()=>{const cid=b.dataset.f8reg,i=document.querySelector(`[data-f8bk="${cid}"]`);if(!i.value)return toast("Digite o saldo do banco.",true);const sis=f4SaldoConta(f4Conta(cid)),banco=f6Num(i.value);
    f8save({conferencias:[...(f8cfg().conferencias||[]),{data:hojeIso(),conta:cid,sis,banco,dif:arred2(banco-sis),por:f4Quem()}].slice(-60)});toast("Conferência registrada.");f6Go()});
  const sv=$("f8cfsv");if(sv)sv.onclick=()=>{const L={},T={},V={};
    document.querySelectorAll("[data-f8lim]").forEach(i=>{const cid=i.dataset.f8lim,lim=f6Num(i.value),ju=f6Num(document.querySelector(`[data-f8jur="${cid}"]`).value);if(lim||ju)L[cid]={limite:lim,juros:ju}});
    document.querySelectorAll("[data-f8tar]").forEach(i=>{if(f6Num(i.value)>0)T[i.dataset.f8tar]=f6Num(i.value)});
    document.querySelectorAll("[data-f8vin]").forEach(i=>{if(i.value.trim())V[i.dataset.f8vin]=i.value.trim()});
    f8save({limites:L,tarifas:T,vinculadas:V});toast("Salvo.");f6Go()};
}
f6Reg("conf8","Caixa e bancos","Conferir saldo e limites",f8ConfHtml,f8ConfBind);
/* ---------- C. empréstimos, financiamentos, consórcios e leasing ---------- */
const f8Emps=()=>f8cfg().emprestimos||[];
function f8Tabela(e){
  const n=+e.parcelas||0,P=+e.valor||0,i=(+e.taxa||0)/100,out=[];let sd=P;
  if(e.sistema==="fixo"){const pm=+e.parcela||P/n;for(let k=1;k<=n;k++){sd=Math.max(0,sd-pm);out.push({k,pm,j:0,am:pm,sd})}return out}
  const pmt=i?P*i/(1-Math.pow(1+i,-n)):P/n;
  for(let k=1;k<=n;k++){const j=sd*i,am=e.sistema==="sac"?P/n:pmt-j,pm=e.sistema==="sac"?am+j:pmt;sd=Math.max(0,sd-am);out.push({k,pm:arred2(pm),j:arred2(j),am:arred2(am),sd:arred2(sd)})}
  return out;
}
const f8EmpVenc=(e,k)=>addMesesIso(e.primeira,k-1);
function f8EmpPagas(e){return finAll().filter(x=>x.emprestimo===e.id&&x.pago&&!x.cancelada).length}
function f8EmpSaldo(e){const t=f8Tabela(e),k=f8EmpPagas(e);if(e.sistema==="fixo")return arred2(Math.max(0,(+e.valor||0)-(+e.parcela||0)*k));return k?(t[Math.min(k,t.length)-1]||{sd:+e.valor}).sd:+e.valor}
function f6DividaTotal(){return arred2(soma(f8Emps(),e=>f8EmpSaldo(e)))}
function f8EmpHtml(){
  const L=f8Emps();
  const cards=L.map(e=>{const t=f8Tabela(e),k=f8EmpPagas(e),gerado=finAll().filter(x=>x.emprestimo===e.id).length,totJ=soma(t,x=>x.j),totP=soma(t,x=>x.pm);
    return `<div class="card" style="margin:8px 0"><div class="row" style="justify-content:space-between"><div><b>${f6Esc(e.nome)}</b> <span class="sub">${f6Esc(e.tipo)} · ${f6Esc(e.banco||"")}</span><div class="sub">${f6Money(e.valor)} em ${e.parcelas}x ${e.sistema==="fixo"?"de "+f6Money(e.parcela):"· "+(e.sistema==="sac"?"SAC":"Price")+" · "+e.taxa+"% ao mês"} · 1ª parcela ${brDate(e.primeira)}</div></div><div style="text-align:right"><div class="sub">Saldo devedor</div><b style="font-size:18px">${f6Money(f8EmpSaldo(e))}</b><div class="sub">${k}/${e.parcelas} parcelas pagas</div></div></div>${f6Bar(k/e.parcelas*100)}<p class="sub">Total a pagar ${f6Money(totP)}${totJ?` · juros ${f6Money(totJ)}`:""}${gerado?` · ${gerado} parcela(s) já lançada(s)`:""}</p><div class="row"><button class="b sm" data-f8eg="${e.id}">${gerado?"Gerar parcelas que faltam":"Gerar parcelas em Contas a pagar"}</button><button class="b sec sm" data-f8et="${e.id}">Ver tabela</button><button class="b sec sm" data-f8ee="${e.id}">Editar</button><button class="b sec sm" data-f8ed="${e.id}">Excluir</button></div></div>`}).join("");
  return f6Card("Empréstimos, financiamentos, consórcios e leasing",`Dívida total hoje: <b>${f6Money(f6DividaTotal())}</b>. As parcelas viram contas a pagar com a divisão entre principal e juros na observação.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f8enew">Nova dívida</button></div>`+(cards||`<div class="empty">Nenhuma dívida cadastrada.</div>`));
}
function f8EmpEdit(id){
  const e=f8Emps().find(x=>x.id===id)||{tipo:"Empréstimo",sistema:"price",primeira:addMesesIso(hojeIso(),1)};
  f6Form(id?"Editar dívida":"Nova dívida",[{k:"nome",l:"Nome",v:e.nome||"",ph:"ex.: Financiamento do micro-ônibus"},{k:"tipo",l:"Tipo",t:"select",opts:["Empréstimo","Financiamento","Consórcio","Leasing","Parcelamento de equipamento"],v:e.tipo},{k:"banco",l:"Banco / credor",v:e.banco||""},{k:"valor",l:"Valor total (R$)",t:"number",v:e.valor||""},{k:"parcelas",l:"Número de parcelas",t:"number",v:e.parcelas||""},{k:"sistema",l:"Sistema",t:"select",opts:[["price","Price (parcela fixa com juros)"],["sac","SAC (amortização fixa)"],["fixo","Parcela fixa sem juros (consórcio, parcelamento)"]],v:e.sistema},{k:"taxa",l:"Taxa de juros (% ao mês)",t:"number",v:e.taxa||""},{k:"parcela",l:"Valor da parcela (só no tipo sem juros)",t:"number",v:e.parcela||""},{k:"primeira",l:"Vencimento da 1ª parcela",t:"date",v:e.primeira}],v=>{
    if(!v.nome.trim())return"Informe o nome.";if(!(v.valor>0)||!(v.parcelas>=1))return"Informe valor e número de parcelas.";if(!v.primeira||!finDataOk(v.primeira))return"Data inválida.";
    if(v.sistema==="fixo"&&!(v.parcela>0))return"Informe o valor da parcela.";
    const reg={id:e.id||f8Id(),nome:v.nome.trim(),tipo:v.tipo,banco:v.banco.trim(),valor:v.valor,parcelas:Math.round(v.parcelas),sistema:v.sistema,taxa:v.sistema==="fixo"?0:(v.taxa||0),parcela:v.parcela||0,primeira:v.primeira};
    f8save({emprestimos:id?f8Emps().map(x=>x.id===id?reg:x):[...f8Emps(),reg]});f6Go()});
}
function f8EmpGerar(id){
  const e=f8Emps().find(x=>x.id===id),t=f8Tabela(e),ja=new Set(finAll().filter(x=>x.emprestimo===id).map(x=>x.parcelaNum));
  const novos=t.filter(p=>!ja.has(p.k)).map(p=>({id:`emp_${id}_${p.k}`,tipo:"pagar",desc:`${e.nome} — parcela ${p.k}/${e.parcelas}`,contra:e.banco||e.nome,fornId:finFornId(e.banco||e.nome,null),cat:"Financiamentos e empréstimos",area:"",forma:"Boleto",valor:p.pm,venc:f8EmpVenc(e,p.k),pago:null,valorPago:null,emprestimo:id,parcelaNum:p.k,parcela:`${p.k}/${e.parcelas}`,obs:e.sistema==="fixo"?"":`principal ${fmtBRL(p.am)} · juros ${fmtBRL(p.j)}`}));
  if(!novos.length)return toast("Todas as parcelas já foram lançadas.",true);
  finMutate(all=>[...all,...novos]);toast(`${novos.length} parcela(s) lançada(s) em Contas a pagar.`);f6Go();
}
function f8EmpBind(){
  const n=$("f8enew");if(n)n.onclick=()=>f8EmpEdit();
  document.querySelectorAll("[data-f8ee]").forEach(b=>b.onclick=()=>f8EmpEdit(b.dataset.f8ee));
  document.querySelectorAll("[data-f8eg]").forEach(b=>b.onclick=()=>f8EmpGerar(b.dataset.f8eg));
  document.querySelectorAll("[data-f8ed]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir esta dívida do cadastro? As parcelas já lançadas em Contas a pagar continuam lá.","Excluir")){f8save({emprestimos:f8Emps().filter(x=>x.id!==b.dataset.f8ed)});f6Go()}});
  document.querySelectorAll("[data-f8et]").forEach(b=>b.onclick=()=>{const e=f8Emps().find(x=>x.id===b.dataset.f8et),t=f8Tabela(e);const ov=openModal(`<h3>${f6Esc(e.nome)} — tabela</h3>${f6Tbl(["Parcela","Vencimento","Valor","Juros","Amortização","Saldo"],[t.map(p=>`<tr><td>${p.k}</td><td class="n">${brDate(f8EmpVenc(e,p.k))}</td><td class="n">${f6Money(p.pm)}</td><td class="n">${f6Money(p.j)}</td><td class="n">${f6Money(p.am)}</td><td class="n">${f6Money(p.sd)}</td></tr>`).join("")])}<div style="text-align:right;margin-top:10px"><button class="b" id="f8tx">Fechar</button></div>`);ov.querySelector("#f8tx").onclick=()=>ov.remove()});
}
f6Reg("emp","Caixa e bancos","Empréstimos e consórcios",f8EmpHtml,f8EmpBind);
/* ---------- D. aplicações financeiras ---------- */
const f8Apls=()=>f8cfg().aplicacoes||[];
function f8IrAliq(dias){return dias<=180?22.5:dias<=360?20:dias<=720?17.5:15}
function f8Apl(a){
  const mv=(a.mov||[]).slice().sort((x,y)=>x.data.localeCompare(y.data)),ap=soma(mv.filter(m=>m.t==="aporte"),m=>m.v),rg=soma(mv.filter(m=>m.t==="resgate"),m=>m.v);
  const sd=mv.filter(m=>m.t==="saldo").pop(),aposSd=sd?soma(mv.filter(m=>m.data>sd.data&&m.t!=="saldo").map(m=>({v:m.t==="aporte"?m.v:-m.v})),m=>m.v):0;
  const saldo=sd?sd.v+aposSd:ap-rg,rend=saldo+rg-ap,prim=mv.find(m=>m.t==="aporte"),dias=prim?daysBetweenIso(prim.data,hojeIso()):0,aliq=a.isento?0:f8IrAliq(dias);
  return{saldo:arred2(saldo),aplicado:arred2(ap-rg),rend:arred2(rend),ir:arred2(Math.max(0,rend)*aliq/100),aliq,liq:arred2(saldo-Math.max(0,rend)*aliq/100),dias};
}
function f8AplHtml(){
  const L=f8Apls(),R=L.map(a=>({a,r:f8Apl(a)})),T=k=>soma(R,x=>x.r[k]);
  return f6Card("Aplicações financeiras",`Informe os aportes, resgates e, de tempos em tempos, o saldo atualizado que o banco mostra. O IR é uma estimativa pela tabela regressiva (22,5% a 15%); confira no informe do banco.`,
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f8anew">Nova aplicação</button></div>`+
   (R.length?f6Tbl(["Aplicação","Aplicado","Saldo bruto","Rendimento","IR estimado","Saldo líquido",""],[R.map(({a,r})=>`<tr><td><b>${f6Esc(a.nome)}</b><div class="sub">${f6Esc(a.tipo||"")} · ${r.dias} dias · alíquota ${r.aliq}%</div></td><td class="n">${f6Money(r.aplicado)}</td><td class="n">${f6Money(r.saldo)}</td><td class="n">${f6Money(r.rend)}</td><td class="n">${f6Money(r.ir)}</td><td class="n"><b>${f6Money(r.liq)}</b></td><td><button class="b sec sm" data-f8am="${a.id}">Movimentar</button> <button class="b sec sm" data-f8ad="${a.id}">Excluir</button></td></tr>`).join(""),f6Tr(["Total",f6Money(T("aplicado")),f6Money(T("saldo")),f6Money(T("rend")),f6Money(T("ir")),f6Money(T("liq")),""],1)]):`<div class="empty">Nenhuma aplicação cadastrada.</div>`));
}
function f8AplBind(){
  const n=$("f8anew");if(n)n.onclick=()=>f6Form("Nova aplicação",[{k:"nome",l:"Nome",ph:"ex.: CDB Banco X 110% CDI"},{k:"tipo",l:"Tipo",t:"select",opts:["CDB","Poupança","Tesouro Direto","Fundo","LCI/LCA (isento de IR)","Outro"]},{k:"valor",l:"Valor aplicado (R$)",t:"number"},{k:"data",l:"Data",t:"date",v:hojeIso()}],v=>{if(!v.nome.trim()||!(v.valor>0))return"Informe nome e valor.";f8save({aplicacoes:[...f8Apls(),{id:f8Id(),nome:v.nome.trim(),tipo:v.tipo,isento:/isento|poupan/i.test(v.tipo),mov:[{data:v.data,t:"aporte",v:v.valor}]}]});f6Go()});
  document.querySelectorAll("[data-f8am]").forEach(b=>b.onclick=()=>f6Form("Movimentar aplicação",[{k:"t",l:"O que aconteceu",t:"select",opts:[["aporte","Novo aporte"],["resgate","Resgate"],["saldo","Atualizar saldo (valor que o banco mostra)"]]},{k:"v",l:"Valor (R$)",t:"number"},{k:"data",l:"Data",t:"date",v:hojeIso()}],v=>{if(!(v.v>=0)||v.v===null)return"Informe o valor.";f8save({aplicacoes:f8Apls().map(a=>a.id===b.dataset.f8am?{...a,mov:[...(a.mov||[]),{data:v.data,t:v.t,v:v.v}]}:a)});f6Go()}));
  document.querySelectorAll("[data-f8ad]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir esta aplicação?","Excluir")){f8save({aplicacoes:f8Apls().filter(a=>a.id!==b.dataset.f8ad)});f6Go()}});
}
f6Reg("apl","Caixa e bancos","Aplicações",f8AplHtml,f8AplBind);
/* ---------- E. sócios, pró-labore, retiradas e aporte ---------- */
function f8CapMov(){return finAll().filter(e=>e.semResultado&&!e.cancelada).sort((a,b)=>b.venc.localeCompare(a.venc))}
function f8SocHtml(){
  const S0=f8cfg().socios||[],mv=f8CapMov();
  return f6Card("Sócios",`Pró-labore é despesa normal. Retirada de lucro e aporte de capital movimentam o caixa mas ficam fora do resultado (receitas − despesas) dos relatórios.`,
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f8snew">Cadastrar sócio</button><button class="b sec sm" id="f8sret">Registrar retirada de lucro</button><button class="b sec sm" id="f8sapo">Registrar aporte de capital</button></div>`+
   (S0.length?f6Tbl(["Sócio","Participação","Pró-labore/mês","Retirado no ano","Aportado no ano",""],[S0.map(s=>{const a=String(new Date().getFullYear());return `<tr><td>${f6Esc(s.nome)}</td><td class="n">${s.pct||0}%</td><td class="n">${f6Money(s.prolabore||0)}</td><td class="n">${f6Money(soma(mv.filter(e=>e.socio===s.id&&e.tipo==="pagar"&&e.venc.startsWith(a)),e=>+e.valor))}</td><td class="n">${f6Money(soma(mv.filter(e=>e.socio===s.id&&e.tipo==="receber"&&e.venc.startsWith(a)),e=>+e.valor))}</td><td><button class="b sec sm" data-f8sp="${s.id}">Gerar pró-labore do ano</button> <button class="b sec sm" data-f8sd="${s.id}">Excluir</button></td></tr>`}).join("")]):`<div class="empty">Nenhum sócio cadastrado.</div>`))
   +(mv.length?f6Card("Movimentos de capital","",f6Tbl(["Data","Tipo","Sócio","Valor","Situação"],[mv.slice(0,30).map(e=>`<tr><td>${brDate(e.venc)}</td><td>${e.tipo==="pagar"?"Retirada de lucro":"Aporte de capital"}</td><td>${f6Esc((S0.find(s=>s.id===e.socio)||{}).nome||"")}</td><td class="n">${fmtBRL(e.valor)}</td><td>${finStatusLabel(e)}</td></tr>`).join("")],"txt")):"");
}
function f8SocMov(tipo){
  const S0=f8cfg().socios||[];if(!S0.length)return toast("Cadastre um sócio primeiro.",true);
  f6Form(tipo==="pagar"?"Retirada de lucro":"Aporte de capital",[{k:"s",l:"Sócio",t:"select",opts:S0.map(s=>[s.id,s.nome])},{k:"v",l:"Valor (R$)",t:"number"},{k:"d",l:"Data",t:"date",v:hojeIso()},{k:"conta",l:"Conta",t:"select",opts:f4ContasPag().map(c=>[c.id,c.nome])}],v=>{
    if(!(v.v>0))return"Informe o valor.";const s=S0.find(x=>x.id===v.s),id=f8Id(),e={id,tipo,desc:(tipo==="pagar"?"Retirada de lucro — ":"Aporte de capital — ")+s.nome,contra:s.nome,cat:tipo==="pagar"?"Retirada de lucro":"Aporte de capital",area:"",forma:"Transferência",valor:arred2(v.v),venc:v.d,pago:v.d,valorPago:arred2(v.v),conta:v.conta,semResultado:true,socio:s.id};
    if(tipo==="pagar")e.fornId=finFornId(s.nome,null);
    finMutate(all=>[...all,e]);if(!finAll().some(x=>x.id===id))return"Não foi possível salvar (permissão ou mês fechado).";f6Go()});
}
function f8SocBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f8snew",()=>f6Form("Cadastrar sócio",[{k:"nome",l:"Nome"},{k:"pct",l:"Participação (%)",t:"number"},{k:"pro",l:"Pró-labore mensal (R$)",t:"number"}],v=>{if(!v.nome.trim())return"Informe o nome.";f8save({socios:[...(f8cfg().socios||[]),{id:f8Id(),nome:v.nome.trim(),pct:v.pct||0,prolabore:v.pro||0}]});f6Go()}));
  g("f8sret",()=>f8SocMov("pagar"));g("f8sapo",()=>f8SocMov("receber"));
  document.querySelectorAll("[data-f8sd]").forEach(b=>b.onclick=()=>{f8save({socios:(f8cfg().socios||[]).filter(s=>s.id!==b.dataset.f8sd)});f6Go()});
  document.querySelectorAll("[data-f8sp]").forEach(b=>b.onclick=async()=>{const s=(f8cfg().socios||[]).find(x=>x.id===b.dataset.f8sp);if(!(s.prolabore>0))return toast("Informe o pró-labore do sócio (excluir e cadastrar de novo).",true);
    const ano=new Date().getFullYear();if(!await askConfirm(`Lançar 12 meses de pró-labore de ${s.nome} (${fmtBRL(s.prolabore)}/mês) em ${ano}?`,"Lançar"))return;
    const novos=[...Array(12).keys()].filter(m=>!finAll().some(e=>e.socio===s.id&&e.cat==="Pró-labore"&&e.venc.slice(0,7)===`${ano}-${f4pad(m+1)}`)).map(m=>({id:f8Id(),tipo:"pagar",desc:`Pró-labore ${MESES_PT[m]} — ${s.nome}`,contra:s.nome,fornId:finFornId(s.nome,null),cat:"Pró-labore",area:"Administrativo",forma:"Transferência",valor:s.prolabore,venc:`${ano}-${f4pad(m+1)}-05`,pago:null,valorPago:null,socio:s.id}));
    if(!novos.length)return toast("O pró-labore do ano já está lançado.",true);finMutate(all=>[...all,...novos]);toast(`${novos.length} mês(es) lançado(s).`);f6Go()});
}
f6Reg("soc","Caixa e bancos","Sócios e capital",f8SocHtml,f8SocBind);
/* ---------- F. caixa físico e fundo fixo ---------- */
const F8_NOTAS=[200,100,50,20,10,5,2,1,0.5,0.25,0.1,0.05];
function f8CaixaHtml(){
  const cx=f4Contas().filter(c=>c.tipo==="caixa"),c=f8cfg(),F=c.fundo||{},H=(c.contagens||[]).slice().reverse().slice(0,12);
  const fs=F.conta?f4SaldoConta(f4Conta(F.conta)||{}):0;
  return f6Card("Fechamento de caixa (contagem do dinheiro)","Conte as notas e moedas e compare com o saldo do sistema. Registre a diferença, se houver.",
   cx.length?`<div class="row" style="margin-bottom:8px"><button class="b sm" id="f8cnt">Contar o caixa</button></div>`:`<div class="empty">Cadastre uma conta do tipo “Caixa” em Contas e caixa.</div>`)
   +f6Card("Fundo fixo (caixinha)","Valor fixo que fica no caixa para pequenas despesas e é reposto quando baixa.",
    `<p>${F.conta?`Caixinha: <b>${f6Esc(f4NomeConta(F.conta))}</b> · valor do fundo <b>${f6Money(F.valor||0)}</b> · saldo agora <b>${f6Money(fs)}</b> ${fs<(F.valor||0)*(F.min||0.3)?f6Dot("#c62828")+"precisa repor":f6Dot("#2e7d32")+"ok"}`:"Fundo fixo ainda não configurado."}</p><div class="row"><button class="b sec sm" id="f8fcfg">Configurar fundo fixo</button>${F.conta&&fs<(F.valor||0)?`<button class="b sm" id="f8frep">Repor ${f6Money((F.valor||0)-fs)}</button>`:""}</div>`)
   +(H.length?f6Card("Últimas contagens","",f6Tbl(["Data","Caixa","Contado","Sistema","Diferença","Quem"],[H.map(x=>`<tr><td>${brDate(x.data)}</td><td>${f6Esc(f4NomeConta(x.conta))}</td><td class="n">${f6Money(x.total)}</td><td class="n">${f6Money(x.sis)}</td><td class="n" style="color:${Math.abs(x.dif)<0.01?"#2e7d32":"#c62828"}">${f6Money(x.dif)}</td><td>${f6Esc(x.por||"")}</td></tr>`).join("")])):"");
}
function f8Contar(){
  const cx=f4Contas().filter(c=>c.tipo==="caixa");
  const campos=[{k:"conta",l:"Caixa",t:"select",opts:cx.map(c=>[c.id,c.nome])},{t:"sep",l:"Quantidade de cada nota/moeda"},...F8_NOTAS.map((n,i)=>({k:"n"+i,l:(n>=2?"Nota de R$ "+n:"Moeda de R$ "+String(n).replace(".",",")),t:"number",v:0}))];
  f6Form("Contagem do caixa",campos,async(v,ov)=>{
    const total=arred2(F8_NOTAS.reduce((t,n,i)=>t+n*Math.max(0,Math.round(v["n"+i]||0)),0)),c=f4Conta(v.conta),sis=f4SaldoConta(c),dif=arred2(total-sis);
    f8save({contagens:[...(f8cfg().contagens||[]),{data:hojeIso(),conta:v.conta,total,sis,dif,por:f4Quem()}].slice(-60)});
    if(Math.abs(dif)>=0.01&&await askConfirm(`Contado ${fmtBRL(total)}; o sistema diz ${fmtBRL(sis)}. ${dif>0?"Sobram":"Faltam"} ${fmtBRL(Math.abs(dif))}. Lançar essa diferença para o caixa bater?`,"Lançar diferença")){
      const id=f8Id();finMutate(all=>[...all,{id,tipo:dif>0?"receber":"pagar",desc:dif>0?"Sobra de caixa":"Falta de caixa",contra:"Diferença de caixa",cat:"Diferenças de caixa",area:"Administrativo",forma:"Dinheiro",valor:Math.abs(dif),venc:hojeIso(),pago:hojeIso(),valorPago:Math.abs(dif),conta:v.conta}]);
    }
    toast(Math.abs(dif)<0.01?"Caixa conferido: bateu.":"Contagem registrada.");f6Go();return"";
  },{ok:"Registrar contagem"});
}
function f8CaixaBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f8cnt",f8Contar);
  g("f8fcfg",()=>{const cx=f4Contas().filter(c=>c.tipo==="caixa");if(!cx.length)return toast("Cadastre uma conta do tipo Caixa.",true);const F=f8cfg().fundo||{};f6Form("Fundo fixo",[{k:"conta",l:"Caixa",t:"select",opts:cx.map(c=>[c.id,c.nome]),v:F.conta},{k:"valor",l:"Valor do fundo (R$)",t:"number",v:F.valor||""},{k:"min",l:"Avisar quando restar menos de (%)",t:"number",v:Math.round((F.min||0.3)*100)}],v=>{if(!(v.valor>0))return"Informe o valor.";f8save({fundo:{conta:v.conta,valor:v.valor,min:(v.min||30)/100}});f6Go()})});
  g("f8frep",()=>{const F=f8cfg().fundo,fs=f4SaldoConta(f4Conta(F.conta)),v=arred2(F.valor-fs),orig=f4ContasPag().find(c=>c.id!==F.conta&&c.tipo==="banco")||f4ContasPag().find(c=>c.id!==F.conta);
    if(!orig)return toast("Não há outra conta para repor.",true);
    f4save({transf:[...(f4cfg().transf||[]),{id:f8Id(),data:hojeIso(),de:orig.id,para:F.conta,valor:v,obs:"reposição do fundo fixo",u:f4Quem()}].slice(-600)});toast(`Reposição de ${fmtBRL(v)} registrada (de ${orig.nome}).`);f6Go()});
}
f6Reg("caixa","Caixa e bancos","Caixa físico e fundo fixo",f8CaixaHtml,f8CaixaBind);
/* ---------- G. maquininha, antecipação e moeda estrangeira ---------- */
function f8MaqHtml(){
  const M=f8cfg().maq||{},pend=finAll().filter(e=>e.maq&&!e.pago&&!e.cancelada&&e.tipo==="receber").sort((a,b)=>a.venc.localeCompare(b.venc));
  const A=F8.sim.ant||{v:10000,dias:20,tx:3};const desc=arred2(A.v*(A.tx/100)/30*A.dias);
  return f6Card("Maquininha de cartão",`Taxas: débito ${M.deb||0}% (D+${M.pdeb||1}) · crédito ${M.cre||0}% (D+${M.pcre||30}). Cada venda gera o valor bruto a receber e a taxa estimada como despesa na mesma data do repasse.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sec sm" id="f8mcfg">Taxas e prazos</button><button class="b sm" id="f8mnew">Registrar venda na maquininha</button></div>`+
    (pend.length?f6Tbl(["Venda","Repasse previsto","Bruto","Taxa estimada","Líquido previsto",""],[pend.map(e=>`<tr><td>${f6Esc(e.desc)}</td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td><td class="n">${fmtBRL(e.maq.taxa)}</td><td class="n">${fmtBRL(e.valor-e.maq.taxa)}</td><td><button class="b sec sm" data-f8mr="${e.id}">Confirmar repasse</button></td></tr>`).join("")]):`<div class="empty">Nenhum repasse pendente.</div>`))
   +f6Card("Antecipação de recebíveis","Quanto custa antecipar um valor a receber.",
    `<div class="row"><div><label>Valor (R$)</label><input type="number" id="f8av" value="${A.v}"></div><div><label>Dias antecipados</label><input type="number" id="f8ad_" value="${A.dias}"></div><div><label>Taxa (% ao mês)</label><input type="number" step="0.01" id="f8at" value="${A.tx}"></div><button class="b sec" id="f8ab" style="align-self:flex-end">Calcular</button></div><p>Desconto: <b>${f6Money(desc)}</b> · você recebe <b>${f6Money(A.v-desc)}</b> (${(A.v?desc/A.v*100:0).toFixed(2).replace(".",",")}% do valor).</p>`)
   +f6Card("Lançamento em moeda estrangeira","Registra uma conta em dólar, euro etc. já convertida para reais, guardando a cotação usada.",`<button class="b sm" id="f8fx">Novo lançamento em moeda estrangeira</button>`);
}
function f8MaqBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f8mcfg",()=>{const M=f8cfg().maq||{};f6Form("Maquininha",[{k:"deb",l:"Taxa do débito (%)",t:"number",v:M.deb||""},{k:"pdeb",l:"Prazo do débito (dias)",t:"number",v:M.pdeb||1},{k:"cre",l:"Taxa do crédito (%)",t:"number",v:M.cre||""},{k:"pcre",l:"Prazo do crédito (dias)",t:"number",v:M.pcre||30}],v=>{f8save({maq:{deb:v.deb||0,pdeb:v.pdeb||1,cre:v.cre||0,pcre:v.pcre||30}});f6Go()})});
  g("f8mnew",()=>{const M=f8cfg().maq||{};f6Form("Venda na maquininha",[{k:"v",l:"Valor bruto (R$)",t:"number"},{k:"t",l:"Modalidade",t:"select",opts:[["deb","Débito"],["cre","Crédito"]]},{k:"d",l:"Data da venda",t:"date",v:hojeIso()},{k:"desc",l:"Descrição",v:"Pagamento no cartão"},{k:"res",l:"Residente (opcional)",t:"select",opts:[["","—"],...resAtivos().map(r=>[r.id,resNome(r)])]}],v=>{
    if(!(v.v>0))return"Informe o valor.";const tx=v.t==="deb"?M.deb||0:M.cre||0,pr=v.t==="deb"?M.pdeb||1:M.pcre||30,venc=addDaysIso(v.d,pr),taxa=arred2(v.v*tx/100),gid=f8Id(),r=v.res?resAll().find(x=>x.id===v.res):null;
    finMutate(all=>[...all,{id:f8Id(),tipo:"receber",desc:`${v.desc} (${v.t==="deb"?"débito":"crédito"} ${brDate(v.d)})`,contra:r&&r.resp&&r.resp.nome||"Maquininha",cat:r?"Mensalidades":"Vendas na maquininha",area:"",forma:v.t==="deb"?"Cartão de débito":"Cartão de crédito",valor:arred2(v.v),venc,pago:null,valorPago:null,...(r?{residente:r.id}:{}),maq:{taxa,grupo:gid}},
      ...(taxa>0?[{id:"mq_"+gid,tipo:"pagar",desc:`Taxa da maquininha (${v.t==="deb"?"débito":"crédito"} ${brDate(v.d)})`,contra:"Operadora da maquininha",fornId:"n:operadora-maquininha",cat:"Taxas de maquininha",area:"Administrativo",forma:"Desconto no repasse",valor:taxa,venc,pago:null,valorPago:null,maqGrupo:gid}]:[])]);f6Go()})});
  document.querySelectorAll("[data-f8mr]").forEach(b=>b.onclick=()=>{const e=finAll().find(x=>x.id===b.dataset.f8mr);
    f6Form("Confirmar repasse",[{t:"note",l:`Venda ${fmtBRL(e.valor)} · taxa estimada ${fmtBRL(e.maq.taxa)} · líquido esperado ${fmtBRL(e.valor-e.maq.taxa)}.`},{k:"liq",l:"Valor líquido que caiu na conta (R$)",t:"number",v:arred2(e.valor-e.maq.taxa)},{k:"d",l:"Data do repasse",t:"date",v:hojeIso()}],v=>{
      if(!(v.liq>0)||v.liq>e.valor)return"Valor líquido inválido.";const taxa=arred2(e.valor-v.liq);
      finMutate(all=>{const out=all.map(x=>x.id===e.id?{...x,pago:v.d,valorPago:x.valor}:x).filter(x=>x.id!=="mq_"+e.maq.grupo);if(taxa>0)out.push({id:"mq_"+e.maq.grupo,tipo:"pagar",desc:`Taxa da maquininha — ${e.desc}`,contra:"Operadora da maquininha",fornId:"n:operadora-maquininha",cat:"Taxas de maquininha",area:"Administrativo",forma:"Desconto no repasse",valor:taxa,venc:v.d,pago:v.d,valorPago:taxa,maqGrupo:e.maq.grupo});return out});
      toast(`Repasse confirmado. Taxa real: ${fmtBRL(taxa)} (${(taxa/e.valor*100).toFixed(2).replace(".",",")}%).`);f6Go()})});
  g("f8ab",()=>{F8.sim.ant={v:f6Num($("f8av").value),dias:f6Num($("f8ad_").value),tx:f6Num($("f8at").value)};f6Go()});
  g("f8fx",()=>f6Form("Lançamento em moeda estrangeira",[{k:"tipo",l:"Tipo",t:"select",opts:[["pagar","A pagar"],["receber","A receber"]]},{k:"moeda",l:"Moeda",t:"select",opts:["USD","EUR","GBP","Outra"]},{k:"v",l:"Valor na moeda",t:"number"},{k:"cot",l:"Cotação (R$ por unidade)",t:"number"},{k:"desc",l:"Descrição"},{k:"contra",l:"Fornecedor / cliente"},{k:"venc",l:"Vencimento",t:"date",v:hojeIso()}],v=>{
    if(!(v.v>0)||!(v.cot>0))return"Informe valor e cotação.";if(!v.desc.trim())return"Informe a descrição.";const brl=arred2(v.v*v.cot),e={id:f8Id(),tipo:v.tipo,desc:v.desc.trim(),contra:v.contra.trim(),cat:"",area:"",forma:"Transferência",valor:brl,venc:v.venc,pago:null,valorPago:null,moeda:{cod:v.moeda,valor:v.v,cot:v.cot},obs:`${v.moeda} ${NUMF(v.v)} × cotação ${NUMF(v.cot)}`};
    if(v.tipo==="pagar"&&e.contra)e.fornId=finFornId(e.contra,null);finMutate(all=>[...all,e]);toast(`Lançado: ${fmtBRL(brl)}.`);f6Go()}));
}
f6Reg("maq","Caixa e bancos","Maquininha e moeda",f8MaqHtml,f8MaqBind);
/* ---------- H. conferir fatura do cartão ---------- */
function f8FatHtml(){
  const cartoes=f4Contas().filter(c=>c.tipo==="cartao"),P=F8.fatura;
  let res="";
  if(P){
    if(P.erro)res=`<div class="callout err">${f6Esc(P.erro)}</div>`;
    else res=`<p><b>${P.ok.length}</b> compra(s) conferem · <b>${P.faltam.length}</b> estão na fatura e não foram lançadas · <b>${P.sobram.length}</b> foram lançadas e não aparecem na fatura</p>`+
     (P.faltam.length?`<h4>Na fatura, mas não lançadas</h4>`+f6Tbl(["Data","Descrição","Valor"],[P.faltam.map(x=>`<tr><td>${brDate(x.data)}</td><td>${f6Esc(x.desc)}</td><td class="n">${fmtBRL(x.valor)}</td></tr>`).join("")],"txt")+`<div class="row" style="margin-top:8px"><button class="b" id="f8fcria">Lançar as ${P.faltam.length} que faltam</button></div>`:"")+
     (P.sobram.length?`<h4>Lançadas, mas não encontradas na fatura</h4>`+f6Tbl(["Data","Descrição","Valor"],[P.sobram.map(e=>`<tr><td>${brDate(e.venc)}</td><td>${f6Esc(e.desc)}</td><td class="n">${fmtBRL(e.valor)}</td></tr>`).join("")],"txt"):"");
  }
  return f6Card("Conferir a fatura do cartão","Carregue o arquivo da fatura (CSV com data, descrição e valor) e compare com as compras lançadas no cartão.",
   cartoes.length?`<div class="row"><div><label>Cartão</label><select id="f8fc">${cartoes.map(c=>`<option value="${c.id}" ${F8.fcartao===c.id?"selected":""}>${f6Esc(c.nome)}</option>`).join("")}</select></div><label class="b" style="cursor:pointer;align-self:flex-end">Escolher fatura (CSV)<input type="file" id="f8ff" accept=".csv,.txt" hidden></label></div>`+res:`<div class="empty">Cadastre um cartão em Contas e caixa.</div>`);
}
function f8FatLer(txt,cid){
  const rows=f7Csv(txt);if(rows.length<2)return{erro:"Arquivo vazio."};
  const H=rows[0].map(h=>f7Norm(h).replace(/[^a-z]/g,"")),iD=H.findIndex(h=>h.startsWith("data")),iH=H.findIndex(h=>/descri|historico|estabelec|lancamento/.test(h)),iV=H.findIndex(h=>/^valor/.test(h));
  if(iD<0||iV<0)return{erro:"Não encontrei as colunas de data e valor."};
  const L=rows.slice(1).map(r=>({data:f7Data(r[iD]),desc:(r[iH>=0?iH:1]||"Compra").trim(),valor:Math.abs(f7Valor(r[iV]))})).filter(x=>x.data&&finDataOk(x.data)&&x.valor>0);
  const comp=finAll().filter(e=>e.cartao===cid&&!e.cancelada),usados=new Set(),ok=[],faltam=[];
  L.forEach(x=>{const m=comp.find(e=>!usados.has(e.id)&&Math.abs(+e.valor-x.valor)<0.01&&((e.obs||"").includes(brDate(x.data))||Math.abs(daysBetweenIso(e.venc,x.data))<=45));if(m){usados.add(m.id);ok.push(m)}else faltam.push(x)});
  const datas=L.map(x=>x.data).sort(),min=datas[0],max=datas[datas.length-1];
  return{ok,faltam,sobram:comp.filter(e=>!usados.has(e.id)&&e.venc>=min&&e.venc<=addDaysIso(max,45)&&!e.pago),cid};
}
function f8FatBind(){
  const sc=$("f8fc");if(sc)sc.onchange=()=>{F8.fcartao=sc.value};
  const f=$("f8ff");if(f)f.onchange=async()=>{const a=f.files[0];if(!a)return;F8.fcartao=$("f8fc").value;F8.fatura=f8FatLer(await a.text(),F8.fcartao);f6Go()};
  const c=$("f8fcria");if(c)c.onclick=()=>{const cart=f4Conta(F8.fatura.cid),novos=F8.fatura.faltam.map(x=>{const k=f4FaturaKey(cart,x.data);return{id:f8Id(),tipo:"pagar",desc:x.desc,contra:x.desc,fornId:finFornId(x.desc,null),cat:"A classificar",area:"",forma:"Cartão",valor:x.valor,venc:f4FaturaVenc(cart,k),pago:null,valorPago:null,comp:k,cartao:cart.id,fatura:k,grupo:f8Id(),parcela:null,obs:`compra de ${brDate(x.data)} no cartão ${cart.nome}`}});
    finMutate(all=>[...all,...novos]);F8.fatura=null;toast(`${novos.length} compra(s) lançada(s) como “A classificar”.`);f6Go()};
}
f6Reg("fat","Caixa e bancos","Conferir fatura do cartão",f8FatHtml,f8FatBind);
/* ---------- I. conciliação: aprendizado, regras e conciliação em lote ---------- */
const f8ChaveExt=d=>f7Norm(d).replace(/[0-9]/g,"").replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>2).slice(0,3).join(" ");
function f8Apr(l){const A=f8cfg().apr||{},k=f8ChaveExt(l.desc);if(A[k])return A[k];const t=f7Norm(l.desc);const m=Object.entries(A).find(([x])=>x&&t.includes(x));return m?m[1]:{contra:"",cat:""}}
function f8Aprende(l,contra,cat){const k=f8ChaveExt(l.desc);if(!k||!contra)return;const A={...(f8cfg().apr||{})};A[k]={contra,cat:cat||""};const ks=Object.keys(A);if(ks.length>300)delete A[ks[0]];f8save({apr:A})}
function f8Plano(){
  const pend=Object.values(S.extrato||{}).filter(l=>!l.conc),plano=[],usados=new Set();
  pend.forEach(l=>{
    const tipo=sinalTipo(l.valor),v=Math.abs(l.valor);
    const cand=finAll().filter(e=>e.tipo===tipo&&!e.pago&&!e.cancelada&&!e.cartao&&!usados.has(e.id)&&Math.abs(+e.valor-v)<0.01&&Math.abs(daysBetweenIso(e.venc,l.data))<=7);
    if(cand.length===1){usados.add(cand[0].id);plano.push({l,ac:"baixa",e:cand[0]});return}
    const ap=f8Apr(l);if(ap.contra)plano.push({l,ac:"criar",contra:ap.contra,cat:ap.cat});
  });
  return{plano,pend};
}
function f8ConclHtml(){
  const{plano,pend}=f8Plano(),A=f8cfg().apr||{};
  return f6Card("Conciliar tudo de uma vez",`Das ${pend.length} linha(s) do extrato sem conciliar, ${plano.length} têm resposta segura: uma única conta em aberto com o mesmo valor (até 7 dias de diferença) ou um fornecedor que você já classificou antes. Funciona também para meses antigos.`,
   (plano.length?f6Tbl(["Data","Extrato","Valor","O que vai acontecer"],[plano.slice(0,60).map(p=>`<tr><td>${brDate(p.l.data)}</td><td>${f6Esc(p.l.desc)}</td><td class="n">${fmtBRL(p.l.valor)}</td><td>${p.ac==="baixa"?`dar baixa em “${f6Esc(p.e.desc)}” (vence ${brDate(p.e.venc)})`:`criar lançamento: ${f6Esc(p.contra)}${p.cat?" · "+f6Esc(p.cat):""}`}</td></tr>`).join("")],"txt")+`<div class="row" style="margin-top:10px"><button class="b" id="f8cok">Conciliar ${plano.length} linha(s)</button></div>`:`<div class="empty">Nada para conciliar automaticamente.</div>`))
   +f6Card("O que o sistema aprendeu",`Quando você cria um lançamento a partir do extrato, o fornecedor e a categoria ficam guardados para as próximas linhas parecidas.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sec sm" id="f8anew2">Nova regra manual</button></div>`+(Object.keys(A).length?f6Tbl(["Se o extrato tiver","Fornecedor/cliente","Categoria",""],[Object.entries(A).map(([k,v])=>`<tr><td>${f6Esc(k)}</td><td class="n">${f6Esc(v.contra)}</td><td class="n">${f6Esc(v.cat||"")}</td><td><button class="b sec sm" data-f8ard="${f6Esc(k)}">Esquecer</button></td></tr>`).join("")]):`<div class="empty">Ainda nada.</div>`));
}
function f8ConclBind(){
  const ok=$("f8cok");if(ok)ok.onclick=async()=>{const{plano}=f8Plano();let n=0,bloq=0;
    for(const p of plano){
      if(f4DataFechada(p.l.data)){bloq++;continue}
      if(p.ac==="baixa"){finMutate(all=>all.map(e=>e.id===p.e.id?{...e,pago:p.l.data,valorPago:Math.abs(p.l.valor),...(p.l.conta?{conta:p.l.conta}:{})}:e));const x=finAll().find(e=>e.id===p.e.id);if(x&&x.pago===p.l.data){put("extrato",p.l.id,{...strip(p.l),conc:p.e.id});n++}else bloq++}
      else{const id=f8Id(),t=sinalTipo(p.l.valor);finMutate(all=>[...all,{id,tipo:t,desc:p.l.desc,contra:p.contra,...(t==="pagar"?{fornId:finFornId(p.contra,null)}:{}),cat:p.cat||"A classificar",area:"",forma:"Transferência",obs:"criado pela conciliação automática",valor:Math.abs(p.l.valor),venc:p.l.data,pago:p.l.data,valorPago:Math.abs(p.l.valor),...(p.l.conta?{conta:p.l.conta}:{})}]);if(finAll().some(e=>e.id===id)){put("extrato",p.l.id,{...strip(p.l),conc:id});n++}else bloq++}
    }
    f7LogSimples("conciliou em lote",`${n} linha(s) do extrato`);toast(`${n} linha(s) conciliada(s)${bloq?`; ${bloq} não puderam (mês fechado ou permissão)`:""}.`);f6Go()};
  const nr=$("f8anew2");if(nr)nr.onclick=()=>f6Form("Regra de conciliação",[{k:"t",l:"Se a descrição do extrato contiver",ph:"ex.: SANEPAR"},{k:"contra",l:"Fornecedor / cliente"},{k:"cat",l:"Categoria",list:f6Cats()}],v=>{const k=f8ChaveExt(v.t)||f7Norm(v.t).trim();if(!k||!v.contra.trim())return"Preencha o texto e o fornecedor.";f8save({apr:{...(f8cfg().apr||{}),[k]:{contra:v.contra.trim(),cat:v.cat.trim()}}});f6Go()});
  document.querySelectorAll("[data-f8ard]").forEach(b=>b.onclick=()=>{const A={...(f8cfg().apr||{})};delete A[b.dataset.f8ard];f8save({apr:A});f6Go()});
}
f6Reg("concl","Caixa e bancos","Conciliação automática",f8ConclHtml,f8ConclBind);
/* alerta de caixa negativo na tela inicial */
const _urg8=urgencias;
urgencias=function(per){const L=_urg8(per);try{if(podeVer("fin")){const S1=f8Serie(30,F8_CEN.realista);if(S1.neg)L.push({nivel:S1.neg<=addDaysIso(hojeIso(),10)?3:2,tipo:"Financeiro",titulo:"O caixa deve ficar negativo",detalhe:`Em ${brDate(S1.neg)}, no cenário realista (menor saldo ${fmtBRL(S1.min)}). Veja Mais ferramentas → Saldo projetado.`,quando:S1.neg,rota:"fin"});
  const F=f8cfg().fundo;if(F&&F.conta&&f4Conta(F.conta)&&f4SaldoConta(f4Conta(F.conta))<F.valor*(F.min||0.3))L.push({nivel:1,tipo:"Financeiro",titulo:"Fundo fixo (caixinha) precisa de reposição",detalhe:`Saldo ${fmtBRL(f4SaldoConta(f4Conta(F.conta)))} de ${fmtBRL(F.valor)}`,quando:hojeIso(),rota:"fin"})}}catch(e){console.error(e)}return L};


/* >>> x_fin9.js */
