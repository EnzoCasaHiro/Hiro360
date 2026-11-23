/* ===== Ponto · aba Pendências: arrumar o ponto integrante por integrante (prefixo ppd) =====
   1) lista quem tem problema no período de referência (26 a 25);
   2) escolhido o integrante, mostra as pendências dele com o botão que resolve cada uma;
   3) baixa a folha de ponto dele em Excel para terminar de arrumar (Excel ou Google Planilhas);
   4) recebe o .xlsx arrumado, mostra as diferenças na planilha do ponto e, ao salvar,
      marca a folha como enviada e guarda o PDF final no prontuário. */
const PPD={tipo:"",quem:"",ver:""};
const PPD_INFO={
  falta:{cor:"var(--bad)",d:p=>"Não tem nenhuma batida e a pessoa estava na escala. Se era folga (troca, folga combinada), lance a folga. Se faltou com motivo (atestado), justifique. Se faltou mesmo, confirme a falta. Se trabalhou a mais em outro dia para cobrir, lance a compensação. Se trabalhou, lance as batidas."},
  falta_pontual:{cor:"var(--madeira)",d:p=>`${p.detail.charAt(0).toUpperCase()+p.detail.slice(1)}. Lance a batida que faltou${p.sugereHora?` (horário esperado pela escala: ${p.sugereHora})`:""}.`},
  falta_entrada:{cor:"var(--madeira)",d:p=>`Tem só uma batida (${p.detail.replace(/^marcação /,"").replace(/ sem par$/,"")}) e falta a entrada. Lance a batida que faltou ou justifique.`},
  falta_saida:{cor:"var(--madeira)",d:p=>`Tem só uma batida (${p.detail.replace(/^marcação /,"").replace(/ sem par$/,"")}) e falta a saída. Lance a batida que faltou ou justifique.`},
  marcacao_sem_escala:{cor:"var(--azul-mar)",d:p=>"A pessoa bateu ponto num dia em que não estava na escala. Se trabalhou nesse dia (troca ou plantão extra), marque como dia de trabalho. Se veio para cobrir uma falta, lance a compensação. Se foi engano, apague a batida."}
};
const ppdDia=d=>`${brDate(d).slice(0,5)} (${WD_FULL[pyWeekday(d)]})`;
// falta sem justificativa confirmada: o dia continua falta (desconta e aparece na folha), só sai das pendências
function ppdConfirmaFalta(u,dia){
  const ig=u.ig;if(!ig||!ig.id)return toast("Integrante sem cadastro.",true);
  const ov=openModal(`<h3>${esc(nomeInteg(ig))}</h3><div class="sub" style="margin-bottom:10px">Confirmar a falta de ${ppdDia(dia)}</div>
   <div class="callout sand">O dia continua como <b>falta sem justificativa</b>: as horas são descontadas e a falta aparece na folha de ponto e no relatório do contador. Ele só sai da lista de pendências.</div>
   <label>Observação (opcional)</label><input id="pfobs" placeholder="Ex.: não avisou">
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="pfcx">Fechar</button><button class="b" id="pfsv">Confirmar falta</button></div>`);
  ov.querySelector("#pfcx").onclick=()=>ov.remove();
  ov.querySelector("#pfsv").onclick=()=>{
    put("ocorr",uid8(),{uid:ig.id,tipo:"falta_confirmada",de:dia,ate:dia,texto:ov.querySelector("#pfobs").value.trim(),docId:null,em:new Date().toISOString()});
    ov.remove();toast(`Falta de ${brDate(dia).slice(0,5)} confirmada.`);afterOc()};
}
// liga uma falta ao dia em que a pessoa trabalhou a mais para cobrir. lado "falta": `dia` é a falta; "extra": `dia` é o dia trabalhado
function ppdCompensa(u,dia,lado){
  const ig=u.ig;if(!ig||!ig.id)return toast("Integrante sem cadastro.",true);
  const rows=u.rows||[],ehFalta=lado==="falta";
  const cand=ehFalta
    ?rows.filter(r=>r.day!==dia&&r.workedMin>0&&(r.status==="sem_escala"||r.extra>0)).map(r=>[r.day,`${ppdDia(r.day)} · ${r.status==="sem_escala"?`trabalhou ${fmtHHMM(r.workedMin)} em dia de folga`:`${fmtHHMM(r.extra)} além do horário`}`])
    :rows.filter(r=>r.day!==dia&&r.status==="falta").map(r=>[r.day,`${ppdDia(r.day)} · falta de ${fmtHHMM(r.expectedMin)}`]);
  const ov=openModal(`<h3>${esc(nomeInteg(ig))}</h3>
   <div class="sub" style="margin-bottom:10px">${ehFalta?`Falta de ${ppdDia(dia)}: em que dia a pessoa trabalhou a mais para compensar?`:`Trabalhou a mais em ${ppdDia(dia)}: qual falta isso compensa?`}</div>
   <label>${ehFalta?"Dia trabalhado a mais":"Dia da falta"}</label>
   <select id="pcsel">${cand.map(([d,t])=>`<option value="${d}">${esc(t)}</option>`).join("")}<option value="">Outro dia…</option></select>
   <div id="pcoutro" style="display:${cand.length?"none":"block"}"><label>Data</label><input type="date" id="pcdia"></div>
   <label>Observação (opcional)</label><input id="pcobs" placeholder="Ex.: combinado com a coordenação">
   <div class="callout blue" style="margin-top:8px">A falta deixa de contar como falta. No dia da falta as horas ficam negativas e as horas trabalhadas a mais cobrem esse saldo, sem virar hora extra paga. Se o dia a mais estiver marcado como “dia de trabalho”, tire essa marcação em Escalas, senão as horas dele não sobram para cobrir a falta.</div>
   <div class="err" id="pcerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="pccx">Fechar</button><button class="b" id="pcsv">Lançar compensação</button></div>`);
  ov.querySelector("#pcsel").onchange=e=>{ov.querySelector("#pcoutro").style.display=e.target.value?"none":"block"};
  ov.querySelector("#pccx").onclick=()=>ov.remove();
  ov.querySelector("#pcsv").onclick=()=>{
    const outro=ov.querySelector("#pcsel").value||ov.querySelector("#pcdia").value,er=m=>ov.querySelector("#pcerr").textContent=m;
    if(!outro)return er("Escolha o dia.");if(outro===dia)return er("Escolha um dia diferente.");
    const falta=ehFalta?dia:outro,extra=ehFalta?outro:dia;
    // troca o que já havia sido lançado para essa falta (confirmada ou outra compensação)
    Object.values(S.ocorr).filter(o=>o.uid===ig.id&&o.de===falta&&o.ate===falta&&OC_FALTA.has(o.tipo)).forEach(o=>del("ocorr",o.id));
    put("ocorr",uid8(),{uid:ig.id,tipo:"falta_compensada",de:falta,ate:falta,comp:extra,texto:ov.querySelector("#pcobs").value.trim(),docId:null,em:new Date().toISOString()});
    ov.remove();toast(`Falta de ${brDate(falta).slice(0,5)} compensada com ${brDate(extra).slice(0,5)}.`);afterOc()};
}
if(!CATS.includes("Folhas de ponto"))CATS.splice(CATS.length-1,0,"Folhas de ponto");
function ppdDados(){
  const ym=pontoRef(),ini=refIni(ym),fim=fimCalc(ym);
  if(fim<ini)return{ym,ini,fim,futuro:true,L:[],U:[]};
  if(!Object.keys(S.marcacoes).length&&!POINT.punches.length)return{ym,ini,fim,semBatidas:true,L:[],U:[]};
  const r=calcSilencioso(ini,fim);
  if(!r||r.erro)return{ym,ini,fim,erro:(r&&r.erro)||"não foi possível calcular",L:[],U:[]};
  const U=r.users.filter(u=>!semPonto(u.ig||integByUid(u.uid))).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  const L=[];U.forEach(u=>u.pendencies.forEach(p=>L.push({u,p})));
  return{ym,ini,fim,L,U};
}
const ppdConta=()=>{try{return ppdDados().L.length}catch(e){return 0}};
// folhas enviadas no período: config/pfolha_AAAA-MM → {pessoas:{[nº do relógio]:{em,por,mud,arq,docId,de,ate,pend}}}
const ppdEnvDoc=ym=>S.config["pfolha_"+ym]||{};
const ppdEnvio=(ym,uid)=>(ppdEnvDoc(ym).pessoas||{})[String(uid)]||null;
const ppdSituacao=(D,u)=>ppdEnvio(D.ym,u.uid)?"enviada":u.pendencies.length?"pendente":"pronta";
const PPD_SIT={pendente:["Com pendências","var(--bad)"],pronta:["Pronta para enviar","var(--madeira)"],enviada:["Folha enviada","var(--verde-medio)"]};
// cálculo completo (com datas) de um período, sem mexer no que está aberto na tela do Ponto
function ppdCalcula(ini,fim){
  const P=POINT,sv={s:P.start,e:P.end,r:P.result,er:P.err};let R=null;
  try{P.start=ini;P.end=fim;calcular(false);R=P.result}finally{P.start=sv.s;P.end=sv.e;P.result=sv.r;P.err=sv.er}
  if(!R)throw new Error(sv.er||"não foi possível calcular o ponto deste período");
  return R;
}
// gera com o resultado R no lugar do POINT.result (as funções da folha leem dali) e devolve o que gerar
function ppdComResultado(R,fn){const sv=POINT.result;POINT.result=R;try{return fn()}finally{POINT.result=sv}}
const ppdArqNome=(u,ym,ext)=>`folha-ponto_${safe(u.nome)}_${ym}.${ext}`;
async function ppdBaixaExcel(u,D){
  try{
    if(typeof ExcelJS==="undefined")throw new Error("a biblioteca de planilha não carregou. Recarregue a página.");
    const R=ppdCalcula(D.ini,D.fim);
    const wb=ppdComResultado(R,()=>buildWorkbook({uids:[String(u.uid)],abas:{capa:false,integrantes:false,jornadas:false,individual:true}}));
    await saveFile(ppdArqNome(u,D.ym,"xlsx"),new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  }catch(e){console.error(e);toast("Não foi possível gerar a folha: "+(e&&e.message||e),true)}
}
async function ppdPdfFinal(u,D){
  const R=ppdCalcula(D.ini,D.fim);
  return ppdComResultado(R,()=>gerarPdfContador({uids:[String(u.uid)],abas:{capa:false,integrantes:false,jornadas:false,individual:true}}));
}
async function ppdMarcaEnviada(uid,info){
  BHCACHE.clear();
  const D=ppdDados(),u=D.U.find(x=>+x.uid===+uid);if(!u)return toast("Integrante não encontrado neste período.",true);
  const ig=u.ig||integByUid(u.uid)||{},ant=ppdEnvio(D.ym,u.uid);
  const reg={em:new Date().toISOString(),por:(typeof f4Quem==="function"&&f4Quem())||"",mud:info.mud||0,arq:info.arq||"",de:D.ini,ate:D.fim,pend:u.pendencies.length,docId:null};
  // guarda a folha final (PDF) no prontuário do integrante
  let aviso="";
  try{
    if(!ig.id)throw new Error("o integrante não tem cadastro");
    const blob=await ppdPdfFinal(u,D);
    reg.docId=await uploadDoc(ig.id,new File([blob],ppdArqNome(u,D.ym,"pdf"),{type:"application/pdf"}),"Folhas de ponto");
    if(ant&&ant.docId&&S.docs&&S.docs[ant.docId])await removeDoc(S.docs[ant.docId],true);
  }catch(e){console.error(e);aviso=" A folha em PDF não foi guardada no prontuário ("+(e&&e.message||e)+"); baixe e guarde à mão."}
  const doc=ppdEnvDoc(D.ym);
  put("config","pfolha_"+D.ym,{...strip(doc),pessoas:{...(doc.pessoas||{}),[String(u.uid)]:reg}});
  toast(`Folha de ${u.nome} enviada (${refRotulo(D.ym)}).`+(reg.pend?` Atenção: ainda tem ${reg.pend} pendência(s).`:"")+aviso,!!aviso);
  go("ponto",true);
}
async function ppdDesfazEnvio(uid){
  const ym=pontoRef(),doc=ppdEnvDoc(ym),p={...(doc.pessoas||{})},reg=p[String(uid)];if(!reg)return;
  if(!await askConfirm("Desfazer o envio desta folha? As batidas continuam como estão; só a marcação de enviada sai (e o PDF guardado no prontuário é apagado).","Desfazer envio"))return;
  if(reg.docId&&S.docs&&S.docs[reg.docId])await removeDoc(S.docs[reg.docId],true);
  delete p[String(uid)];put("config","pfolha_"+ym,{...strip(doc),pessoas:p});go("ponto",true);
}
function ppdRecebeArquivo(uid,f,D){
  if(!/\.(xlsx|xls|csv)$/i.test(f.name))return toast("Envie a folha em .xlsx (no Google Planilhas: Arquivo › Fazer download › Microsoft Excel).",true);
  openPlanilha(+uid,D.ini,D.fim,{arquivo:f,aoSalvar:n=>ppdMarcaEnviada(uid,{mud:n,arq:f.name}),
    depoisImportar:async ov=>{
      if(plnMudancas())return;
      if(await askConfirm("O arquivo não tem nenhuma batida diferente do que já está no sistema. Marcar a folha como enviada assim mesmo?","Marcar como enviada")){ov.remove();PLN.aoSalvar=null;ppdMarcaEnviada(uid,{mud:0,arq:f.name})}
    }});
}
/* turno 12x36 com a escala em "dias fixos da semana": a grade não alterna e gera faltas e "dia de folga" falsos.
   Pelas batidas, acha os dias em que a pessoa começou plantão (perto da hora de entrada do turno) e sugere o início do ciclo. */
function ppd1236(ig,uid,D){
  if(!ig||!ig.id||typeof xfoTurno12!=="function"||!xfoTurno12(ig))return null;
  const modo=ig.escalaModo||"semana";
  const t=turnosList().find(x=>String(x.no)===String(ig.turno)),m=/(\d{1,2}):(\d{2})/.exec((t&&t.texto)||"");
  const ent=m?+m[1]*60+ +m[2]:null,cont=[0,0],dias=[[],[]];
  if(ent!=null)for(const x of marcasOf(uid,D.ini,D.fim)){const min=x.ts.getHours()*60+x.ts.getMinutes(),dif=Math.abs(min-ent);
    if(Math.min(dif,1440-dif)>180)continue;const d=isoDate(x.ts),par=Math.round((parseLocalIso(d+"T12:00:00")-parseLocalIso(D.ini+"T12:00:00"))/864e5)%2;
    if(!dias[par].includes(d)){dias[par].push(d);cont[par]++}}
  const par=cont[1]>cont[0]?1:0,ok=cont[par]>=3&&cont[par]>=3*cont[1-par],inicio=ok?dias[par].sort()[0]:null;
  // dias fixos da semana nunca servem para 12x36; dias pares/ímpares erram depois de todo dia 31; ciclo pode estar com o início trocado.
  // Fora dos dias fixos, só avisa quando os plantões batidos caem em dia que a escala diz que é folga.
  if(modo==="semana")return{inicio,n:cont[par],outros:cont[1-par],modo};
  if(!inicio)return null;
  const errados=dias[par].filter(d=>{try{return !escalaDia(ig,d).on}catch(e){return false}}).length;
  return errados>=3?{inicio,n:cont[par],outros:cont[1-par],modo,errados}:null;
}
function ppdBotoes(u,p){
  const b=(attr,txt,sec)=>`<button type="button" class="b ${sec?"sec ":""}sm" ${attr} style="flex:none">${txt}</button>`;
  const cad=u.ig&&u.ig.id;
  if(p.kind==="marcacao_sem_escala")return(cad?b(`data-ppdesc="${u.ig.id}" data-day="${p.day}"`,"Era dia de trabalho")+b(`data-ppdcomp="${u.uid}" data-day="${p.day}" data-lado="extra"`,"Trabalhou para compensar falta",1):"")+b(`data-ppdmk="${u.uid}" data-day="${p.day}"`,"Ver ou apagar batidas",1);
  const folga=cad?b(`data-ppdfolga="${u.ig.id}" data-day="${p.day}"`,"Lançar folga",1):"";
  if(p.kind==="falta")return b(`data-ppdoc="${u.uid}" data-day="${p.day}"`,"Justificar ou lançar atestado")+(cad?b(`data-ppdconf="${u.uid}" data-day="${p.day}"`,"Confirmar falta",1)+b(`data-ppdcomp="${u.uid}" data-day="${p.day}" data-lado="falta"`,"Compensou em outro dia",1):"")+folga+b(`data-ppdmk="${u.uid}" data-day="${p.day}"`,"Lançar batidas",1);
  return b(`data-ppdmk="${u.uid}" data-day="${p.day}" ${p.sugereHora?`data-sug="${p.sugereHora}"`:""}`,"Lançar a batida que faltou")+b(`data-ppdoc="${u.uid}" data-day="${p.day}"`,"Justificar",1);
}
const ppdPasso=(n,ok,titulo,corpo)=>`<div style="display:flex;gap:12px;padding:14px 0;border-top:1px solid var(--line)">
  <div style="flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;${ok?"background:var(--verde-medio);color:#fff":"background:var(--areia-esc);color:var(--ink)"}">${ok?"✓":n}</div>
  <div class="grow" style="min-width:0"><h3 style="margin:4px 0 6px;font-size:16px">${titulo}</h3>${corpo}</div></div>`;
function ppdPessoaHtml(D,u,lista){
  const ed=podeEd("ponto"),env=ppdEnvio(D.ym,u.uid),pend=u.pendencies,ig=u.ig||{};
  const conta={};pend.forEach(p=>conta[p.kind]=(conta[p.kind]||0)+1);
  if(PPD.tipo&&!conta[PPD.tipo])PPD.tipo="";
  const itens=pend.filter(p=>!PPD.tipo||p.kind===PPD.tipo).slice().sort((a,b)=>a.day.localeCompare(b.day));
  const chip=(k,t,n)=>`<button type="button" class="b ${PPD.tipo===k?"":"sec "}sm" data-ppdtipo="${k}" style="flex:none">${esc(t)} <b>${n}</b></button>`;
  const i=lista.findIndex(x=>+x.uid===+u.uid),ant=lista[i-1],prox=lista[i+1];
  const ate=D.fim<refFim(D.ym)?`${brDate(D.fim)} (o período ainda não terminou: a folha vai só até ontem)`:brDate(D.fim);
  return `<div class="card" id="ppdpessoa">
   <div class="row" style="align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:4px">
    <button type="button" class="b sec sm" data-ppdsel="" style="flex:none">◀ Voltar à lista</button><span style="flex:1"></span>
    ${ant?`<button type="button" class="b sec sm" data-ppdsel="${ant.uid}" style="flex:none" title="${esc(ant.nome)}">◀ Anterior</button>`:""}
    <span class="sub">${i+1} de ${lista.length}</span>
    ${prox?`<button type="button" class="b sec sm" data-ppdsel="${prox.uid}" style="flex:none" title="${esc(prox.nome)}">Próximo ▶</button>`:""}</div>
   <h2 style="margin:8px 0 2px">${esc(u.nome)}</h2>
   <p class="sub" style="margin:0 0 6px">${esc(ig.cargo||"—")} · nº ${esc(u.uid)} no relógio · ${refRotulo(D.ym)}</p>
   ${(()=>{const e=ppd1236(ig,u.uid,D);return e?`<div class="callout sand" style="margin:8px 0"><b>Escala errada:</b> o turno é 12x36, mas ${e.modo==="semana"?`a escala está em “dias fixos da semana”: ${esc(escalasTexto(ig,D.ini,D.fim))}`:`a escala cadastrada (${esc(typeof xfoLabel==="function"?xfoLabel(ig):escalasTexto(ig,D.ini,D.fim))}) não bate com os dias em que a pessoa fez plantão: ${e.errados} plantão(ões) caíram em dia que a escala diz que é folga${e.modo==="par"||e.modo==="impar"?" (dias pares/ímpares se desencontram depois de todo dia 31)":""}`}. Por isso aparecem faltas e “bateu ponto em dia de folga” que não existiram. ${e.inicio?`Pelas batidas, os plantões começam em ${brDate(e.inicio)} e seguem dia sim, dia não (${e.n} plantões${e.outros?`, ${e.outros} fora desse padrão`:""}).`:"Não deu para descobrir pelas batidas em que dias são os plantões."} ${ed?(e.inicio?`<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button type="button" class="b sm" data-ppd1236="${ig.id}" data-ini="${e.inicio}" style="flex:none">Mudar para 12x36 alternado a partir de ${brDate(e.inicio).slice(0,5)}</button><button type="button" class="b sec sm" data-ppdescala="1" style="flex:none">Arrumar em Escalas</button></div>`:`<button type="button" class="b sm" data-ppdescala="1" style="flex:none;margin-top:6px">Arrumar em Escalas</button>`):""}</div>`:""})()}
   ${cadRelogio(ig)?`<div class="callout sand" style="margin:8px 0">Este cadastro foi <b>criado sozinho pelo relógio</b> (só com o nome “${esc(ig.nome||"")}”, sem escala), por isso as batidas aparecem como dia de folga. Se é alguém que já está em Integrantes, junte os dois cadastros. ${ed?`<button type="button" class="b sm" data-ppdjunta="${ig.id}" style="flex:none;margin-top:6px">Juntar com o cadastro da pessoa</button>`:""}</div>`:""}
   ${ppdPasso(1,!pend.length,`Resolver as pendências ${pend.length?`<span style="color:var(--bad)">(${pend.length})</span>`:""}`,
     (pend.length?`<p class="sub" style="margin:0 0 10px">Cada linha diz o que aconteceu e tem o botão que resolve. Resolvida, a linha sai da lista.</p>
      ${Object.keys(conta).length>1?`<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:10px">${chip("","Todas",pend.length)}${Object.keys(PEND_TIPO).filter(k=>conta[k]).map(k=>chip(k,PEND_TIPO[k],conta[k])).join("")}</div>`:""}
      ${itens.map(p=>`<div class="doc" style="align-items:flex-start;gap:12px;flex-wrap:wrap"><div style="width:84px;flex:none"><b>${brDate(p.day).slice(0,5)}</b><div class="sub">${WD_FULL[pyWeekday(p.day)]}</div></div>
       <div class="grow" style="min-width:200px"><div class="nm" style="color:${(PPD_INFO[p.kind]||{}).cor||"var(--ink)"}">${esc(PEND_TIPO[p.kind]||p.kind)}</div><div class="sub">${esc((PPD_INFO[p.kind]||{d:()=>p.detail}).d(p))}</div></div>
       ${ed?`<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${ppdBotoes(u,p)}</div>`:""}</div>`).join("")}`
     :`<p style="margin:0 0 8px;color:var(--verde-medio)"><b>Nenhuma pendência.</b></p>`)+
     `<p class="sub" style="margin:10px 0 0">Para ver e corrigir todos os dias de uma vez: <button type="button" class="lnk" data-ppdpln="${u.uid}">abrir a planilha do ponto de ${esc(u.nome.split(" ")[0])}</button>.</p>`)}
   ${ppdPasso(2,false,"Baixar a folha de ponto (Excel)",`<p class="sub" style="margin:0 0 10px">De <b>${brDate(D.ini)}</b> até <b>${ate}</b>. Abra no Excel ou no Google Planilhas e termine de arrumar: corrija as horas nas colunas <b>Entrada</b> e <b>Saída</b> (formato 07:30). Trabalhado, saldo e banco de horas recalculam sozinhos. Depois salve em .xlsx (no Google: Arquivo › Fazer download › Microsoft Excel).</p>
     ${pend.length?`<div class="callout sand" style="margin-bottom:10px">Ainda há ${pend.length} pendência(s). Dá para baixar assim, mas o mais fácil é resolver no passo 1 antes.</div>`:""}
     <button type="button" class="b sec" data-ppdxls="${u.uid}" style="flex:none">${ic("down")} Baixar a folha de ${esc(u.nome.split(" ")[0])} (.xlsx)</button>`)}
   ${ppdPasso(3,!!env,"Enviar a folha arrumada",env?`<div class="callout" style="margin-bottom:10px"><b style="color:var(--verde-medio)">Folha enviada</b> em ${new Date(env.em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}${env.por?" por "+esc(env.por):""} · de ${brDate(env.de)} a ${brDate(env.ate)}${env.arq?` · arquivo ${esc(env.arq)} (${env.mud} alteração(ões))`:""}.${env.pend?` <b style="color:var(--bad)">Foi enviada com ${env.pend} pendência(s).</b>`:""}${env.ate<D.fim?` <b>Depois do envio entraram mais dias (até ${brDate(D.fim)}): envie de novo quando o período fechar.</b>`:""}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${env.docId&&S.docs&&S.docs[env.docId]?`<button type="button" class="b sec sm" data-ppdpdf="${esc(env.docId)}" style="flex:none">${ic("down")} Baixar a folha enviada (PDF)</button>`:""}
       ${ed?`<button type="button" class="b sec sm" data-ppdup="${u.uid}" style="flex:none">${ic("up")} Enviar de novo (outro arquivo)</button><button type="button" class="b sec sm" data-ppddes="${u.uid}" style="flex:none">Desfazer envio</button>`:""}</div>`
     :ed?`<p class="sub" style="margin:0 0 10px">Escolha o arquivo .xlsx que você arrumou. A planilha do ponto abre com o que mudou em <span style="background:#fff1b8;padding:0 4px;border-radius:4px">amarelo</span>; confira e clique em <b>Salvar alterações</b>. A folha fica marcada como enviada até ${brDate(D.fim)} e a versão final em PDF vai para o prontuário de ${esc(u.nome.split(" ")[0])}.</p>
      <div class="row" style="flex-wrap:wrap;gap:8px;align-items:center"><button type="button" class="b" data-ppdup="${u.uid}" style="flex:none">${ic("up")} Enviar a folha arrumada (.xlsx)</button>
      <button type="button" class="lnk" data-ppdok="${u.uid}">A folha já está certa: enviar sem arquivo</button></div>`
     :`<p class="sub" style="margin:0">Seu perfil não permite enviar a folha.</p>`)}
   <input type="file" id="ppdfile" accept=".xlsx,.xls,.csv" hidden></div>`;
}
function ppdHtml(){
  const D=ppdDados();
  const pedidos=typeof xeL==="function"?xeL("ajustes").filter(x=>(x.status||"Pendente")==="Pendente").length:0;
  const sit={pendente:0,pronta:0,enviada:0};D.U.forEach(u=>sit[ppdSituacao(D,u)]++);
  if(PPD.ver&&!sit[PPD.ver])PPD.ver="";
  const lista=D.U.filter(u=>!PPD.ver||ppdSituacao(D,u)===PPD.ver);
  const sel=PPD.quem&&D.U.find(u=>String(u.uid)===PPD.quem);if(PPD.quem&&!sel)PPD.quem="";
  const nav=sel?(lista.some(u=>+u.uid===+sel.uid)?lista:D.U):lista;
  const chip=(k,t,n)=>`<button type="button" class="b ${PPD.ver===k?"":"sec "}sm" data-ppdver="${k}" style="flex:none">${esc(t)} <b>${n}</b></button>`;
  const topo=`<div class="card"><h2>Arrumar o ponto, integrante por integrante</h2>
   <p class="sub" style="margin:0 0 10px">Escolha um integrante, resolva as pendências dele, baixe a folha em Excel para terminar de arrumar e envie a folha arrumada. Repita com o próximo.</p>
   ${pontoPeriodoSel()}
   ${D.futuro?`<div class="callout sand" style="margin-top:10px">Esse período ainda não começou (começa em ${brDate(D.ini)}).</div>`:
     D.semBatidas?`<div class="callout sand" style="margin-top:10px">Nenhuma batida importada ainda. Importe o arquivo do relógio na primeira aba do Ponto.</div>`:
     D.erro?`<div class="callout sand" style="margin-top:10px">Não consegui calcular: ${esc(D.erro)}</div>`:`
   <p class="sub" style="margin:10px 0">Conferido de <b>${brDate(D.ini)}</b> até <b>${brDate(D.fim)}</b>${D.fim<refFim(D.ym)?" (só até ontem: os próximos dias entram quando passarem)":""}.</p>
   ${pedidos?`<div class="callout sand" style="margin-bottom:10px"><b>${pedidos} pedido(s) de ajuste</b> dos integrantes aguardando sua aprovação. <button type="button" class="lnk" id="ppdped">Ver os pedidos</button></div>`:""}
   <div class="callout ${D.L.length?"sand":""}" style="margin-bottom:10px;font-size:15px">${D.L.length?`<b>${D.L.length} pendência(s)</b> em ${D.U.filter(u=>u.pendencies.length).length} pessoa(s)`:`<b style="color:var(--verde-medio)">Nenhuma pendência no período</b>`} · <b>${sit.enviada}</b> de ${D.U.length} folha(s) enviada(s).${!D.L.length&&sit.enviada===D.U.length&&D.U.length?` Pode seguir para o <button type="button" class="lnk" id="ppdfech">Fechamento do mês</button>.`:""}</div>`}
  </div>`;
  if(D.futuro||D.semBatidas||D.erro)return topo;
  if(sel)return topo+ppdPessoaHtml(D,sel,nav);
  return topo+`<div class="card"><h2>Integrantes</h2>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:10px">${chip("","Todos",D.U.length)}${Object.keys(PPD_SIT).filter(k=>sit[k]).map(k=>chip(k,PPD_SIT[k][0],sit[k])).join("")}</div>
   ${lista.length?`<div class="wrap"><table><thead><tr><th>Integrante</th><th style="text-align:center">Pendências</th><th>Folha</th><th></th></tr></thead><tbody>
   ${lista.map(u=>{const s=ppdSituacao(D,u),env=ppdEnvio(D.ym,u.uid);return `<tr><td><button type="button" class="lnk" data-ppdsel="${u.uid}" style="font-weight:600">${esc(u.nome)}</button><div class="sub">${esc((u.ig&&u.ig.cargo)||"")}</div></td>
     <td style="text-align:center">${u.pendencies.length?`<b style="color:var(--bad)">${u.pendencies.length}</b>`:`<span style="color:var(--verde-medio)">✓</span>`}</td>
     <td><span style="color:${PPD_SIT[s][1]};font-weight:600">${PPD_SIT[s][0]}</span>${env?`<div class="sub">em ${brDate(env.em.slice(0,10))}</div>`:""}</td>
     <td style="text-align:right"><button type="button" class="b ${s==="enviada"?"sec ":""}sm" data-ppdsel="${u.uid}" style="flex:none">${s==="enviada"?"Ver":"Arrumar"} ▸</button></td></tr>`}).join("")}
   </tbody></table></div>`:`<div class="empty">Ninguém nesta situação.</div>`}</div>`;
}
function ppdBind(){
  bindPontoPeriodo();
  const re=()=>go("ponto",true),D=()=>ppdDados();
  document.querySelectorAll("[data-ppdver]").forEach(b=>b.onclick=()=>{PPD.ver=b.dataset.ppdver;re()});
  document.querySelectorAll("[data-ppdsel]").forEach(b=>b.onclick=()=>{PPD.quem=b.dataset.ppdsel;PPD.tipo="";re();const c=$("ppdpessoa");if(c)c.scrollIntoView({block:"start"});else window.scrollTo(0,0)});
  document.querySelectorAll("[data-ppdtipo]").forEach(b=>b.onclick=()=>{PPD.tipo=b.dataset.ppdtipo;re()});
  document.querySelectorAll("[data-ppdoc]").forEach(b=>b.onclick=()=>openOcorr(+b.dataset.ppdoc,b.dataset.day));
  const pessoa=uid=>D().U.find(x=>+x.uid===+uid);
  document.querySelectorAll("[data-ppdconf]").forEach(b=>b.onclick=()=>{const u=pessoa(b.dataset.ppdconf);if(u)ppdConfirmaFalta(u,b.dataset.day)});
  document.querySelectorAll("[data-ppdcomp]").forEach(b=>b.onclick=()=>{const u=pessoa(b.dataset.ppdcomp);if(u)ppdCompensa(u,b.dataset.day,b.dataset.lado)});
  document.querySelectorAll("[data-ppdmk]").forEach(b=>b.onclick=()=>openMarcas(+b.dataset.ppdmk,b.dataset.day,{suggest:b.dataset.sug}));
  document.querySelectorAll("[data-ppd1236]").forEach(b=>b.onclick=async()=>{const ig=S.integrantes[b.dataset.ppd1236];if(!ig)return;
    if(!await askConfirm(`Mudar a escala de ${nomeInteg(ig)} para 12x36 (trabalha um dia, folga no outro), com plantão em ${brDate(b.dataset.ini)}? Vale para todos os dias. Se antes de alguma data a escala era outra, lance depois em Escalas → “Mudou de escala? Lançar a escala que valia antes”.`,"Mudar a escala"))return;
    put("integrantes",ig.id,{...strip(ig),escalaModo:"ciclo",cicloTrab:1,cicloFolga:1,cicloInicio:b.dataset.ini,hist:[...(ig.hist||[]),{em:new Date().toISOString(),campo:"Escala",de:(typeof xfoLabel==="function"?xfoLabel(ig):"")||"—",para:"12x36 a partir de "+brDate(b.dataset.ini)}]});
    toast("Escala mudada para 12x36.");afterOc()});
  document.querySelectorAll("[data-ppdescala]").forEach(b=>b.onclick=()=>go("turnos"));
  document.querySelectorAll("[data-ppdfolga]").forEach(b=>b.onclick=()=>openEscalaAjuste(b.dataset.ppdfolga,b.dataset.day,{tipo:"folga"}));
  document.querySelectorAll("[data-ppdjunta]").forEach(b=>b.onclick=()=>abrirJuntarCadastro(b.dataset.ppdjunta,uid=>{PPD.quem=String(uid);re()}));
  document.querySelectorAll("[data-ppdesc]").forEach(b=>b.onclick=()=>openEscalaAjuste(b.dataset.ppdesc,b.dataset.day,{tipo:"trabalho"}));
  document.querySelectorAll("[data-ppdpln]").forEach(b=>b.onclick=()=>{const d=D();openPlanilha(+b.dataset.ppdpln,d.ini,d.fim,{aoSalvar:()=>re()})});
  document.querySelectorAll("[data-ppdxls]").forEach(b=>b.onclick=()=>{const d=D(),u=d.U.find(x=>+x.uid===+b.dataset.ppdxls);if(u)ppdBaixaExcel(u,d)});
  const fi=$("ppdfile");
  document.querySelectorAll("[data-ppdup]").forEach(b=>b.onclick=()=>{if(!fi)return;fi.dataset.uid=b.dataset.ppdup;fi.click()});
  if(fi)fi.onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)ppdRecebeArquivo(fi.dataset.uid,f,D())};
  document.querySelectorAll("[data-ppdok]").forEach(b=>b.onclick=async()=>{const d=D(),u=d.U.find(x=>+x.uid===+b.dataset.ppdok);if(!u)return;
    if(!await askConfirm(`Marcar a folha de ${u.nome} como enviada, do jeito que está no sistema (${brDate(d.ini)} a ${brDate(d.fim)})?${u.pendencies.length?` Ainda tem ${u.pendencies.length} pendência(s).`:""}`,"Enviar a folha"))return;
    ppdMarcaEnviada(u.uid,{mud:0})});
  document.querySelectorAll("[data-ppddes]").forEach(b=>b.onclick=()=>ppdDesfazEnvio(b.dataset.ppddes));
  document.querySelectorAll("[data-ppdpdf]").forEach(b=>b.onclick=async()=>{const d=S.docs[b.dataset.ppdpdf];if(!d)return;try{await saveFile(d.nome,new Blob([await bytesOf(d)],{type:"application/pdf"}))}catch(e){toast(e.message,true)}});
  const f=$("ppdfech");if(f)f.onclick=()=>{XM.sec.ponto="fechamento";re()};
  const pd=$("ppdped");if(pd)pd.onclick=()=>{XM.sec.ponto="ajustes";re()};
}
xmReg("ponto","pendencias","Pendências","Arrumar o ponto, integrante por integrante",ppdHtml,ppdBind);
/* depois de salvar batida, justificativa ou escala, a lista é recalculada na hora (sem esperar o cache de 1 minuto) */
{const afterOc0=afterOc;afterOc=function(){BHCACHE.clear();return afterOc0.apply(this,arguments)}}
