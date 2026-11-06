/* ================= ADMISSÕES E CONTRATOS DE RESIDÊNCIA ================= */
const capacidadeCasa=()=>+((xcfg("ind")||{}).capacidade)||0;
let ESP_PEND="";
const esperaCrud={id:"espera",col:"espera",mod:"admres",novoLabel:"Adicionar à lista de espera",novoTit:"Pessoa na lista de espera",
  campos:[{k:"nome",l:"Nome da pessoa",req:true},{k:"nasc",l:"Nascimento",t:"date"},{k:"grau",l:"Grau de dependência provável",t:"sel",opts:[["1","Grau I"],["2","Grau II"],["3","Grau III"]],def:"1"},{k:"pedido",l:"Data do contato",t:"date",req:true},
    {k:"resp",l:"Responsável / contato",t:"pessoa",req:true},{k:"tel",l:"Telefone"},{k:"email",l:"E-mail"},{k:"prior",l:"Prioridade",t:"sel",opts:["normal","alta","urgente"],req:true,def:"normal"},
    {k:"status",l:"Situação",t:"sel",opts:["aguardando","visita agendada","admitido","desistiu"],req:true,def:"aguardando"},{k:"visita",l:"Visita à casa em",t:"date"},{k:"horaV",l:"Hora da visita",t:"time"},
    {k:"obs",l:"Observações (condição de saúde, expectativas, valor combinado)",t:"ta",full:true}],
  padrao:()=>({pedido:hojeIso(),prior:"normal",status:"aguardando",grau:"1"}),
  resumo:L=>{const ag=L.filter(x=>x.status==="aguardando"||x.status==="visita agendada").length,cap=capacidadeCasa(),at=resAll().filter(resAtivo).length;
    return `<div class="stats"><div class="stat"><b>${ag}</b><span>aguardando</span></div><div class="stat"><b>${at}</b><span>residentes ativos</span></div>${cap?`<div class="stat ${cap-at<=0?"warn":""}"><b>${Math.max(0,cap-at)}</b><span>vaga(s) livre(s) de ${cap}</span></div>`:`<div class="stat"><b>—</b><span>defina a capacidade em Indicadores</span></div>`}</div>`},
  cols:[{h:"Contato",v:r=>brDate(r.pedido)},{h:"Pessoa",html:r=>`<b>${esc(r.nome)}</b><div class="sub">${esc(r.resp||"")} ${esc(r.tel||"")}</div>`},{h:"Grau",v:r=>"Grau "+["","I","II","III"][+r.grau||1]},{h:"Prioridade",html:r=>xPill(r.prior==="urgente"?3:r.prior==="alta"?2:0,r.prior)},
    {h:"Situação",html:r=>xPill(r.status==="admitido"?0:r.status==="desistiu"?2:1,r.status)+(r.visita&&r.status==="visita agendada"?`<div class="sub">visita ${brDate(r.visita)}${r.horaV?" "+r.horaV:""}</div>`:"")}],
  filtros:{l:"Situação",opts:["aguardando","visita agendada","admitido","desistiu"],fn:(r,f)=>r.status===f},
  ordem:(a,b)=>({urgente:0,alta:1,normal:2}[a.prior]-({urgente:0,alta:1,normal:2}[b.prior]))||a.pedido.localeCompare(b.pedido),vazio:"Ninguém na lista de espera.",busca:r=>(r.resp||"")+" "+(r.tel||""),
  linhaBtn:[{l:"Admitir",se:r=>r.status!=="admitido"&&r.status!=="desistiu",fn:r=>{
    ESP_PEND=r.id;window.RES_PRESET={nome:r.nome,nasc:r.nasc||"",grau:+r.grau||1,resp:{nome:r.resp||"",tel:r.tel||"",email:r.email||"",parent:"",cpf:""},obs:r.obs||""};
    PGX.admres.st.tab="espera";openResidente(null)}}]};
function esperaAdmitido(novo){
  const e=xs("espera").find(x=>x.id===ESP_PEND||(x.status!=="admitido"&&estNorm(x.nome)===estNorm(novo.nome)));
  if(e){put("espera",e.id,{...strip(e),status:"admitido",admitidoEm:hojeIso(),resId:novo.id});ESP_PEND=""}
}
/* ---------- contratos de residência ---------- */
const INDICES=["IPCA","IGP-M","INPC","Percentual fixo"];
const contratoDe=resId=>xs("cres").find(c=>c.res===resId&&c.status!=="encerrado");
const cresCrud={id:"cres",col:"cres",mod:"admres",novoLabel:"Novo contrato",novoTit:"Contrato de residência",
  campos:[{k:"res",l:"Residente",t:"res",req:true,todos:true},{k:"ini",l:"Início da vigência",t:"date",req:true},{k:"fim",l:"Término (se houver)",t:"date"},
    {k:"valor",l:"Mensalidade contratada (R$)",t:"money",req:true},{k:"indice",l:"Índice de reajuste",t:"sel",opts:INDICES,req:true,def:"IPCA"},{k:"mesReaj",l:"Mês do reajuste anual",t:"sel",opts:[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>[String(n),["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][n]]),req:true,def:"1"},
    {k:"pctFixo",l:"Percentual fixo (%), se for o caso",t:"num",step:0.01},{k:"status",l:"Situação",t:"sel",opts:["vigente","encerrado"],req:true,def:"vigente"},{k:"obs",l:"Cláusulas especiais",t:"ta",full:true}],
  padrao:()=>({ini:hojeIso(),indice:"IPCA",mesReaj:String(new Date().getMonth()+1),status:"vigente"}),
  valida:(f)=>xs("cres").some(c=>c.id!==f.id&&c.res===f.res&&c.status==="vigente"&&f.status==="vigente")?"Esse residente já tem um contrato vigente.":"",
  cols:[{h:"Residente",v:r=>xNomeRes(r.res)},{h:"Vigência",v:r=>brDate(r.ini)+(r.fim?" a "+brDate(r.fim):"")},{h:"Mensalidade",v:r=>"R$ "+NUMF(r.valor)},{h:"Reajuste",v:r=>r.indice+" em "+["","jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][+r.mesReaj]},
    {h:"Assinatura",html:r=>r.assin?assinChip(r.assin):'<span class="sub">não assinado</span>'}],
  linhaBtn:[{l:"Contrato",fn:r=>textoContrato(r)},{l:"Reajustar",se:r=>r.status==="vigente",fn:r=>reajustarContrato(r)},{l:"Assinar",se:r=>!r.assin&&podeEd("admres"),fn:r=>assinarContrato(r)}],
  ordem:(a,b)=>xNomeRes(a.res).localeCompare(xNomeRes(b.res),"pt"),vazio:"Nenhum contrato cadastrado.",busca:r=>xNomeRes(r.res),
  rodape:"O reajuste só atualiza a mensalidade do residente e as parcelas futuras ainda não pagas no Financeiro. O percentual do índice é informado por você (consulte o valor oficial do período)."};
const REAJ_MES=r=>{const h=hojeIso(),a=+h.slice(0,4);let d=`${a}-${String(r.mesReaj).padStart(2,"0")}-01`;if(d<h&&(r.ultReaj||"")>=d)d=`${a+1}-${String(r.mesReaj).padStart(2,"0")}-01`;return d};
function reajustarContrato(c){
  const res=resAll().find(x=>x.id===c.res);if(!res)return toast("Residente não encontrado.",true);
  const atual=+res.mensalidade||+c.valor;
  const ov=openModal(`<h3>Reajuste — ${esc(resNome(res))}</h3><p class="sub">Índice do contrato: <b>${esc(c.indice)}</b>. Mensalidade atual: <b>R$ ${NUMF(atual)}</b>.</p>
   <div class="row"><div><label>Percentual do reajuste (%) *</label><input type="number" step="0.01" id="rjp" value="${c.indice==="Percentual fixo"&&c.pctFixo?c.pctFixo:""}"></div><div><label>Vale a partir de</label><input type="date" id="rjd" value="${hojeIso()}"></div></div>
   <div class="callout" id="rjn" style="margin-top:10px">Informe o percentual.</div><div class="err" id="rjerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="rjcx">Cancelar</button><button class="b" id="rjok">Aplicar reajuste</button></div>`);
  const g=s=>ov.querySelector(s),calc=()=>{const p=parseFloat(g("#rjp").value);if(isNaN(p)){g("#rjn").textContent="Informe o percentual.";return null}const n=Math.round(atual*(1+p/100)*100)/100;g("#rjn").innerHTML=`Nova mensalidade: <b>R$ ${NUMF(n)}</b> (${p>=0?"+":""}R$ ${NUMF(n-atual)})`;return n};
  g("#rjp").oninput=calc;calc();g("#rjcx").onclick=()=>ov.remove();
  g("#rjok").onclick=()=>{const n=calc();if(n==null||n<=0)return g("#rjerr").textContent="Percentual inválido.";const p=parseFloat(g("#rjp").value),desde=g("#rjd").value||hojeIso();
    if(desde>hojeIso()){if(!finDataOk(desde))return g("#rjerr").textContent="Confira a data: ano inválido.";resSave(resAll().map(x=>x.id===res.id?{...x,reajAg:{desde,valor:n,pct:p,de:atual,cid:c.id}}:x));ov.remove();toast("Reajuste agendado para "+brDate(desde)+": R$ "+NUMF(n)+". Ele será aplicado sozinho nessa data.");go("admres",true);return}if(!finDataOk(desde))return g("#rjerr").textContent="Confira a data: ano inválido.";const novo={...res,mensalidade:n};novo.recId=resMensalidade(novo,desde)||novo.recId||null;resSave(resAll().map(x=>x.id===res.id?novo:x));
    put("cres",c.id,{...strip(c),valor:n,ultReaj:desde,reajustes:[...(c.reajustes||[]),{em:desde,pct:p,de:atual,para:n}]});ov.remove();toast("Reajuste aplicado: R$ "+NUMF(n));try{f5ReajusteDif(res.id,novo.recId,desde,n)}catch(e){console.error(e)}go("admres",true)};
}
function textoContrato(c){
  const r=resAll().find(x=>x.id===c.res)||{},e=empresa(),rp=r.resp||{};
  const t=`CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE RESIDÊNCIA E CUIDADOS

CONTRATADA: ${e.razao}${e.cnpj?", CNPJ "+e.cnpj:""}, com sede em ${e.endereco}.
RESIDENTE: ${r.nome||"____"}${r.cpf?", CPF "+r.cpf:""}${r.nasc?", nascido(a) em "+brDate(r.nasc):""}.
RESPONSÁVEL: ${rp.nome||"____"}${rp.cpf?", CPF "+rp.cpf:""}${rp.tel?", telefone "+rp.tel:""}.

1. OBJETO. Hospedagem, alimentação, higiene, acompanhamento e cuidados de acordo com o grau de dependência avaliado (${GRAU_CURTO[r.grau]||"a avaliar"}), conforme a RDC 502/2021 da Anvisa.
2. VIGÊNCIA. A partir de ${brDate(c.ini)}${c.fim?" até "+brDate(c.fim):", por prazo indeterminado"}.
3. VALOR. Mensalidade de R$ ${NUMF(c.valor)}, com vencimento todo dia ${r.diaVenc||10}.
4. REAJUSTE. Anual, no mês de ${["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][+c.mesReaj]}, pelo ${c.indice}${c.indice==="Percentual fixo"&&c.pctFixo?" ("+c.pctFixo+"%)":""}. Mudança do grau de dependência pode alterar o valor, mediante aviso prévio.
5. SERVIÇOS NÃO INCLUÍDOS. Medicamentos, fraldas, consultas, exames, transporte e itens de uso pessoal, salvo combinado em contrário.
6. VISITAS E COMUNICAÇÃO. A família será informada sobre intercorrências relevantes de saúde; as visitas seguem os horários da casa.
7. RESCISÃO. Por qualquer das partes, com aviso por escrito de ___ dias.
8. PROTEÇÃO DE DADOS. Os dados do residente e do responsável são tratados conforme a LGPD, para a execução deste contrato e o cumprimento de obrigações legais e sanitárias.
${c.obs?"\n9. CLÁUSULAS ESPECIAIS. "+c.obs+"\n":""}
Caraguatatuba, ${new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}.`;
  const ov=openModal(`<h3>Contrato — ${esc(resNome(r))}</h3><div class="callout sand">Modelo-base gerado automaticamente. Peça a revisão de um advogado antes de usar; este texto não é aconselhamento jurídico.</div>
   <textarea id="ctx" style="min-height:300px;margin-top:10px">${esc(t)}</textarea><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap"><button class="b sec" id="ctcp">Copiar</button><button class="b sec" id="ctpr">Imprimir</button><button class="b" id="ctok">Fechar</button></div>`);
  ov.querySelector("#ctok").onclick=()=>ov.remove();
  ov.querySelector("#ctcp").onclick=()=>{try{navigator.clipboard.writeText(ov.querySelector("#ctx").value);toast("Copiado.")}catch(e){toast("Não foi possível copiar.",true)}};
  ov.querySelector("#ctpr").onclick=()=>{const w=window.open("","_blank");if(!w)return toast("Libere pop-ups para imprimir.",true);w.document.write(`<pre style="font:14px/1.5 Georgia,serif;white-space:pre-wrap;max-width:720px;margin:30px auto">${esc(ov.querySelector("#ctx").value)}</pre>`);w.document.close();w.print()};
  c._texto=t;return t;
}
function assinarContrato(c){
  const t=textoContrato(c);document.querySelectorAll(".ov").forEach(o=>o.remove());const rp=(resAll().find(x=>x.id===c.res)||{}).resp||{};
  openAssinar({titulo:"Assinatura do contrato",texto:t,tipo:"contrato",ref:c.id,nome:rp.nome||"",doc:rp.cpf||""},id=>{put("cres",c.id,{...strip(c),assin:id});go("admres",true)});
}
/* ---------- página ---------- */
function sairHtml(){
  const L=resAll().filter(r=>!resAtivo(r)).sort((a,b)=>(b.saida||"").localeCompare(a.saida||""));
  return `<div class="card"><h2>Saídas e óbitos</h2><p class="sub" style="margin:0 0 10px">Para registrar uma saída, abra o residente em “Residentes” e mude a situação. A mensalidade recorrente é encerrada sozinha.</p>
   ${L.length?`<div class="wrap"><table><thead><tr><th>Residente</th><th>Situação</th><th>Entrada</th><th>Saída</th><th>Permanência</th></tr></thead><tbody>${L.map(r=>`<tr><td><b>${esc(resNome(r))}</b></td><td>${esc(r.sit)}</td><td>${r.entrada?brDate(r.entrada):"—"}</td><td>${r.saida?brDate(r.saida):"—"}</td><td>${r.entrada&&r.saida?daysBetweenIso(r.entrada,r.saida)+" dias":"—"}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhuma saída registrada.</div>`}</div>`;
}
xpage("admres","Admissões e contratos","Lista de espera, admissão de novos residentes, contratos com reajuste anual e histórico de saídas.","clip",[
  {k:"espera",l:"Lista de espera",html:()=>xcrud(esperaCrud)},
  {k:"cres",l:"Contratos",html:()=>xcrud(cresCrud)+reajusteAviso()},
  {k:"saidas",l:"Saídas e óbitos",html:sairHtml}
]);
function reajusteAviso(){
  const L=xs("cres").filter(c=>c.status==="vigente");if(!L.length)return"";
  return `<div class="card"><h2>Próximos reajustes</h2>${L.map(c=>({c,d:REAJ_MES(c)})).sort((a,b)=>a.d.localeCompare(b.d)).map(({c,d})=>`<div class="doc"><div class="grow"><div class="nm">${esc(xNomeRes(c.res))}</div><div class="sub">${esc(c.indice)} · a partir de ${brDate(d)}${c.ultReaj?" · último em "+brDate(c.ultReaj):""}</div></div>${xPill(xDias(d)<=45&&xDias(d)>=0?2:0,xDias(d)<0?"em atraso":"em "+xDias(d)+" dia(s)")}</div>`).join("")}</div>`;
}
XURG.push((L,h)=>{
  if(!podeVer("admres"))return;
  xs("espera").filter(e=>e.status==="visita agendada"&&e.visita&&e.visita>=h&&e.visita<=addDaysIso(h,2)).forEach(e=>L.push({nivel:e.visita===h?3:2,tipo:"Admissão",titulo:`Visita de ${e.nome} à casa`,detalhe:`${brDate(e.visita)}${e.horaV?" às "+e.horaV:""} · contato: ${e.resp||""} ${e.tel||""}`,quando:e.visita,rota:"admres",res:{k:"admesp"},resLabel:"Abrir"}));
  const cap=capacidadeCasa(),at=resAll().filter(resAtivo).length,espera=xs("espera").filter(e=>e.status==="aguardando"||e.status==="visita agendada").length;
  if(cap&&cap>at&&espera)L.push({nivel:1,tipo:"Admissão",titulo:`${cap-at} vaga(s) livre(s) e ${espera} pessoa(s) na lista de espera`,detalhe:"entre em contato com quem está aguardando",quando:null,rota:"admres",res:{k:"admesp"},resLabel:"Ver lista"});
  xs("cres").filter(c=>c.status==="vigente").forEach(c=>{const d=REAJ_MES(c),n=xDias(d);if(n<=45&&(!c.ultReaj||c.ultReaj<addDaysIso(d,-300)))L.push({nivel:n<=15?3:2,tipo:"Contrato",titulo:`Reajuste da mensalidade de ${xNomeRes(c.res)} (${c.indice})`,detalhe:n<0?`atrasado ${-n} dia(s)`:`a partir de ${brDate(d)}; avise a família com antecedência`,quando:d,rota:"admres",res:{k:"admcon"},resLabel:"Reajustar"})});
  xs("cres").filter(c=>c.status==="vigente"&&!c.assin&&daysBetweenIso(c.ini,h)>=0).forEach(c=>L.push({nivel:1,tipo:"Contrato",titulo:`Contrato de ${xNomeRes(c.res)} sem assinatura`,detalhe:"registre a assinatura do responsável",quando:null,rota:"admres",res:{k:"admcon"},resLabel:"Assinar"}));
  resAll().filter(r=>resAtivo(r)&&+r.mensalidade>0&&!contratoDe(r.id)).slice(0,5).forEach(r=>L.push({nivel:1,tipo:"Contrato",titulo:`${resNome(r)} sem contrato cadastrado`,detalhe:"cadastre o contrato para controlar reajuste e assinatura",quando:null,rota:"admres",res:{k:"admcon"},resLabel:"Cadastrar"}));
});
XRES.admesp=()=>{PGX.admres.st.tab="espera";go("admres")};XRES.admcon=()=>{PGX.admres.st.tab="cres";go("admres")};
XEVENTOS.push(pre=>xs("espera").filter(e=>e.status==="visita agendada"&&e.visita&&e.visita.startsWith(pre)&&podeVer("admres")).map(e=>({id:e.id,nome:`Visita à casa: ${e.nome}`,validade:e.visita,aviso:2,vinc:"casa"})));
REPORTS.push(
 {id:"ar_espera",g:"Residentes",t:"Lista de espera",d:"Pessoas aguardando vaga, com prioridade e contato.",pii:true,b:()=>({titulo:"Lista de espera",sub:relSub({},false),sensivel:true,cols:[{h:"Contato em",t:"date",w:12},{h:"Pessoa",w:28},{h:"Grau",w:8},{h:"Prioridade",w:12},{h:"Situação",w:16},{h:"Responsável",w:24},{h:"Telefone",w:16}],
   rows:xs("espera").sort(esperaCrud.ordem).map(e=>[e.pedido,e.nome,"Grau "+["","I","II","III"][+e.grau||1],e.prior,e.status,e.resp||"",e.tel||""])})},
 {id:"ar_contratos",g:"Residentes",t:"Contratos de residência",d:"Vigência, mensalidade, índice de reajuste e assinatura.",pii:true,b:()=>({titulo:"Contratos de residência",sub:relSub({},false),sensivel:true,cols:[{h:"Residente",w:28},{h:"Início",t:"date",w:12},{h:"Mensalidade",t:"money",w:14},{h:"Índice",w:14},{h:"Mês do reajuste",w:12},{h:"Último reajuste",t:"date",w:14},{h:"Assinado",w:10,c:true}],
   rows:xs("cres").map(c=>[xNomeRes(c.res),c.ini,+c.valor||0,c.indice,["","jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][+c.mesReaj],c.ultReaj||"",c.assin?"Sim":"Não"])})}
);


/* >>> x_infra.js */
