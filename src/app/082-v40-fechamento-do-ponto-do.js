/* ===== V40 · Fechamento do ponto do mês: lista de conferência passo a passo (prefixo xfp) =====
   Reúne em um só lugar tudo o que costuma faltar antes de fechar o ponto: relógio importado,
   quem ficou sem batida, cadastros incompletos, jornadas calculadas, pendências, pedidos de ajuste,
   conformidade, feriados, aprovação por setor e a exportação para o contador.
   Apoio à conferência: não altera o ponto nem trava nada. */
const XFP={de:"",ate:"",cmp:null};
const xfpMesIni=ym=>ym+"-01";
const xfpMesFim=ym=>{const [y,m]=ym.split("-").map(Number);return ym+"-"+String(new Date(y,m,0).getDate()).padStart(2,"0")};
const xfpYmPadrao=()=>{const h=hojeIso(),ym=h.slice(0,7);if(+h.slice(8)<=10){const [y,m]=ym.split("-").map(Number);const d=new Date(y,m-2,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}return ym};
function xfpPeriodo(){
  if(!XFP.de||!XFP.ate){const ym=xfpYmPadrao();XFP.de=xfpMesIni(ym);XFP.ate=xfpMesFim(ym)}
  return{de:XFP.de,ate:XFP.ate,ym:XFP.de.slice(0,7)};
}
const xfpCfg=()=>xmcfg("ponto");
const xfpConf=ym=>((xfpCfg().fechConf||{})[ym])||{};
const xfpFechados=()=>xfpCfg().fechados||[];
const xfpFmt=iso=>brDate(iso).slice(0,5);
function xfpNomes(l,max){max=max||6;const n=l.map(x=>typeof x==="string"?x:nomeInteg(x));return n.slice(0,max).join(", ")+(n.length>max?" e mais "+(n.length-max):"")}
/* Cada verificação devolve {k, nivel:0 ok|1 atenção|2 pendente, t, d, acao?:{rot, fn}} */
function xfpVerifica(){
  const {de,ate,ym}=xfpPeriodo(),hoje=hojeIso(),fimEf=ate<hoje?ate:hoje,out=[];
  const dias=[];for(let d=de;d<=ate;d=addDaysIso(d,1))dias.push(d);
  const cols=integList().filter(i=>!semPonto(i)&&(i.situacao||"Ativo")!=="Desligado");
  const marcas=Object.values(S.marcacoes).filter(m=>!m.removida&&m.ts.slice(0,10)>=de&&m.ts.slice(0,10)<=ate);
  // 1 relógio
  {const dd=[...new Set(marcas.map(m=>m.ts.slice(0,10)))].sort(),ult=dd[dd.length-1];
   const nivel=!marcas.length?2:(ult<addDaysIso(fimEf,-1)?1:0);
   out.push({k:"relogio",nivel,t:"Batidas do relógio no período",d:marcas.length?`${marcas.length} batida(s) em ${dd.length} dia(s); a última é de ${brDate(ult)}.${ult<addDaysIso(fimEf,-1)?` Faltam batidas até ${brDate(fimEf)}: importe o arquivo mais recente.`:""}`:"Nenhuma batida importada neste período. Importe o arquivo do relógio.",acao:{rot:"Importar o relógio",id:"imp"}})}
  // 2 sem número no relógio / sem batida
  {const semNum=cols.filter(i=>i.uid==null);
   out.push({k:"semnum",nivel:semNum.length?2:0,t:"Integrantes sem número no relógio",d:semNum.length?`${xfpNomes(semNum)}. Sem o número (De-para) o ponto não é calculado.`:"Todos os integrantes com ponto têm número no relógio.",acao:semNum.length?{rot:"Abrir o De-para",id:"vinculos"}:null});
   const sem=cols.filter(i=>i.uid!=null&&i.turno&&!marcas.some(m=>+m.uid===+i.uid)&&dias.some(d=>d<=fimEf&&escalaDia(i,d).on));
   out.push({k:"sembatida",nivel:sem.length?2:0,t:"Escalados que não têm nenhuma batida",d:sem.length?`${xfpNomes(sem)}. Confira se faltaram o ano todo, se estão de férias/afastamento ou se o número do relógio está trocado.`:"Todo mundo que estava escalado tem batida no período.",acao:sem.length?{rot:"Abrir o De-para",id:"vinculos"}:null})}
  // 3 cadastros incompletos vindos do relógio
  {const inc=integList().filter(i=>i.uid!=null&&(i.situacao||"Ativo")!=="Desligado"&&i.depto==="Outro"&&!(i.nomeCompleto||"").trim());
   out.push({k:"cadinc",nivel:inc.length?1:0,t:"Cadastros criados pelo relógio e ainda incompletos",d:inc.length?`${xfpNomes(inc)}. Complete nome, cargo e turno em Integrantes.`:"Nenhum cadastro incompleto vindo do relógio.",acao:inc.length?{rot:"Abrir Integrantes",rota:"pront"}:null})}
  // 4 sem turno
  {const st=cols.filter(i=>!i.turno);
   out.push({k:"semturno",nivel:st.length?2:0,t:"Integrantes sem turno definido",d:st.length?`${xfpNomes(st)}. Sem turno o sistema não sabe a jornada esperada.`:"Todos têm turno definido.",acao:st.length?{rot:"Abrir Escalas",rota:"turnos"}:null})}
  // 5 jornadas calculadas
  const R=POINT.result,calc=!!(R&&R.start===de&&R.end===ate);
  out.push({k:"calc",nivel:calc?0:1,t:"Jornadas calculadas para este período",d:calc?`Calculado para ${R.users.length} pessoa(s), de ${brDate(de)} a ${brDate(ate)}.${ate>=hoje?" O período ainda não terminou: só contam os dias até ontem (dias futuros não viram falta).":""}`:(R?`O último cálculo é de outro período (${brDate(R.start)} a ${brDate(R.end)}). Calcule de novo para este.`:"Ainda não foi calculado. Calcule para ver faltas, atrasos e pendências."),acao:{rot:calc?"Recalcular":"Calcular agora",id:"calc"}});
  if(calc){
    const pend=R.users.filter(u=>u.pendencies.length),totP=R.users.reduce((s,u)=>s+u.pendencies.length,0);
    out.push({k:"pend",nivel:totP?2:0,t:"Dias com batida faltando ou sobrando",d:totP?`${totP} dia(s): ${pend.slice(0,5).map(u=>`${u.nome} (${u.pendencies.slice(0,3).map(p=>xfpFmt(p.day)).join(", ")}${u.pendencies.length>3?"…":""})`).join("; ")}${pend.length>5?" e mais "+(pend.length-5)+" pessoa(s)":""}. Resolva com batida esquecida, pedido de ajuste ou justificativa.`:"Nenhum dia com batida faltando.",acao:totP?{rot:"Ver o mapa de frequência",id:"mapa"}:null});
    const fl=R.users.filter(u=>u.t.faltas),totF=R.users.reduce((s,u)=>s+u.t.faltas,0);
    out.push({k:"faltas",nivel:totF?2:0,t:"Faltas sem justificativa",d:totF?`${totF} falta(s): ${fl.slice(0,6).map(u=>`${u.nome} (${u.t.faltas})`).join(", ")}${fl.length>6?" e mais "+(fl.length-6):""}. Lance atestado, folga ou justificativa; o que sobrar vira desconto na folha.`:"Nenhuma falta sem justificativa.",acao:totF?{rot:"Ver o mapa de frequência",id:"mapa"}:null});
    const ex=R.users.reduce((s,u)=>s+u.t.extra,0),at=R.users.reduce((s,u)=>s+u.t.late+u.t.early,0);
    {const sc=R.semCadastro||[];out.push({k:"semcad",nivel:sc.length?1:0,t:"Números do relógio sem cadastro",d:sc.length?`${sc.map(x=>"nº "+x.uid+" ("+x.n+" batida(s))").join(", ")}. Ficam fora do cálculo. Se for alguém da casa, cadastre ou ligue no De-para.`:"Todas as batidas do período são de integrantes cadastrados.",acao:sc.length?{rot:"Abrir o De-para",id:"vinculos"}:null})}
    out.push({k:"horas",nivel:0,t:"Horas extras e atrasos (só para conhecimento)",d:`Extras: ${xeHM(ex)} · atrasos e saídas antecipadas: ${xeHM(at)}. Confira se as extras foram autorizadas antes de pagar.`,acao:{rot:"Ver autorização de horas extras",id:"heaut"}});
  }
  // 6 pedidos aguardando
  {const aj=xeL("ajustes").filter(x=>(x.status||"Pendente")==="Pendente"),es=(xvL("esquecida")||[]).filter(x=>(x.status||"Aguardando")==="Aguardando"),n=aj.length+es.length;
   out.push({k:"pedidos",nivel:n?2:0,t:"Pedidos de ajuste e batidas esquecidas aguardando",d:n?`${aj.length} pedido(s) de ajuste e ${es.length} batida(s) esquecida(s) aguardando aprovação. Aprove ou recuse antes de calcular.`:"Nada aguardando aprovação.",acao:n?{rot:"Abrir os pedidos",id:aj.length?"ajustes":"esquecida"}:null})}
  // 7 conformidade
  {let n=0;try{n=xeConformidade(de,ate).length}catch(e){}
   out.push({k:"clt",nivel:n?1:0,t:"Alertas de conformidade (CLT)",d:n?`${n} ocorrência(s) de excesso de jornada, falta de intervalo ou descanso curto. Veja se há correção ou pagamento a fazer.`:"Nenhum alerta de conformidade no período.",acao:n?{rot:"Ver a conformidade",id:"conform"}:null})}
  // 8 feriados
  {const fer=[...holidaySet(de,ate)].sort();
   out.push({k:"feriados",nivel:0,t:"Feriados no período",d:fer.length?`${fer.map(brDate).map(x=>x.slice(0,5)).join(", ")}. Confira se estão certos (inclusive os municipais) antes de calcular.`:"Nenhum feriado cadastrado neste período. Se houver feriado municipal, inclua nas regras do cálculo.",acao:{rot:"Ver as regras do cálculo",id:"regras"}})}
  // 9 aprovação por setor
  {const ap=new Set((xvL("aprovsetor")||[]).filter(a=>a.comp===ym).map(a=>a.setor)),pend=xvDepts().filter(s=>integList().some(i=>!semPonto(i)&&(i.depto||i.cargo||"Outro")===s)&&!ap.has(s));
   out.push({k:"setores",nivel:pend.length?1:0,t:"Aprovação do ponto por setor",d:pend.length?`Faltam aprovar: ${pend.join(", ")}.`:"Todos os setores aprovaram.",acao:pend.length?{rot:"Registrar aprovação",id:"aprovsetor"}:null})}
  return out;
}
const xfpIco=n=>n===0?`<b style="color:var(--verde-medio)">✔</b>`:n===1?`<b style="color:var(--madeira)">▲</b>`:`<b style="color:var(--bad)">●</b>`;
function xfpGoTab(id){
  if(id==="imp"||id==="regras"||id==="mapa"||id==="calc"){XM.sec.ponto="";XAB.tab.ponto="p:Calcular jornadas";go("ponto",true);return}
  XM.sec.ponto=id;go("ponto",true);
}
function xfpHtml(){
  const {de,ate,ym}=xfpPeriodo(),L=xfpVerifica(),conf=xfpConf(ym),ed=podeEd("ponto");
  const pend=L.filter(x=>x.nivel===2&&!conf[x.k]),at=L.filter(x=>x.nivel===1&&!conf[x.k]);
  const fech=xfpFechados().filter(f=>f.ym===ym).slice(-1)[0];
  const resumo=pend.length?`<b style="color:var(--bad)">${pend.length} pendência(s)</b> a resolver${at.length?` e ${at.length} ponto(s) de atenção`:""}.`:at.length?`<b style="color:var(--madeira)">${at.length} ponto(s) de atenção</b> para olhar; nada pendente.`:`<b style="color:var(--verde-medio)">Tudo conferido.</b> Pode exportar e fechar.`;
  return `<div class="card"><h2>Fechamento do ponto</h2>
   <p class="sub" style="margin:0 0 10px">Siga a lista de cima para baixo. Cada linha diz o que falta e leva direto para onde resolver. É um apoio à conferência: nada é travado nem alterado por aqui.</p>
   <div class="row" style="align-items:flex-end;margin-bottom:10px">
    <div><label>De</label><input type="date" id="xfpde" value="${de}"></div><div><label>Até</label><input type="date" id="xfpate" value="${ate}"></div>
    <button type="button" class="b sec" data-xfpper="ant" style="flex:none">Mês passado</button><button type="button" class="b sec" data-xfpper="atual" style="flex:none">Este mês</button></div>
   <div class="callout ${pend.length?"sand":""}" style="margin-bottom:10px">${resumo}${fech?` <span class="sub">Fechado em ${brDate(fech.em)} por ${esc(fech.por||"—")}.</span>`:""}</div>
   ${L.map(x=>`<div class="doc" style="align-items:flex-start;gap:10px;${conf[x.k]?"opacity:.6":""}"><div style="width:18px;text-align:center;padding-top:2px">${xfpIco(conf[x.k]&&x.nivel?0:x.nivel)}</div>
     <div class="grow"><div class="nm">${esc(x.t)}</div><div class="sub">${esc(x.d)}</div></div>
     <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${x.acao?`<button type="button" class="b sec sm" data-xfpa="${x.k}" style="flex:none">${esc(x.acao.rot)}</button>`:""}${x.nivel?`<label style="display:inline-flex;gap:4px;align-items:center;font-size:12px;white-space:nowrap"><input type="checkbox" data-xfpc="${x.k}" ${conf[x.k]?"checked":""} ${ed?"":"disabled"}> já conferi</label>`:""}</div></div>`).join("")}
   <div class="row" style="margin-top:14px">
    <button type="button" class="b sec" id="xfpxlsx" style="flex:none">${ic("down")} Planilha para o contador</button><button type="button" class="b sec" id="xfppdf" style="flex:none">${ic("down")} PDF para o contador</button><button type="button" class="b sec" id="xfpfolha" style="flex:none">Ir para o fechamento da folha</button>
    <button type="button" class="b" id="xfpfechar" style="flex:none" ${ed?"":"disabled"}>Registrar o fechamento de ${ym.slice(5)}/${ym.slice(0,4)}</button></div>
   <p class="sub" style="margin:8px 0 0">O registro guarda quem fechou, quando e quantas pendências ficaram. Não impede ajustes depois.</p></div>`;
}
function xfpBind(){
  const R=()=>go("ponto",true);
  const de=document.getElementById("xfpde"),ate=document.getElementById("xfpate");
  if(de)de.onchange=()=>{if(de.value){XFP.de=de.value;if(XFP.ate<XFP.de)XFP.ate=XFP.de}R()};
  if(ate)ate.onchange=()=>{if(ate.value){XFP.ate=ate.value;if(XFP.de>XFP.ate)XFP.de=XFP.ate}R()};
  document.querySelectorAll("[data-xfpper]").forEach(b=>b.onclick=()=>{let ym=xfpYmPadrao();const h=hojeIso().slice(0,7);if(b.dataset.xfpper==="atual")ym=h;else{const [y,m]=h.split("-").map(Number),d=new Date(y,m-2,1);ym=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}XFP.de=xfpMesIni(ym);XFP.ate=xfpMesFim(ym);R()});
  const L=xfpVerifica();
  document.querySelectorAll("[data-xfpa]").forEach(b=>b.onclick=()=>{
    const x=L.find(v=>v.k===b.dataset.xfpa);if(!x||!x.acao)return;const a=x.acao;
    if(a.rota){go(a.rota);return}
    if(a.id==="calc"){const {de,ate}=xfpPeriodo();POINT.start=de;POINT.end=ate;calcular(false);if(POINT.err)toast(POINT.err,true);R();return}
    xfpGoTab(a.id);
  });
  document.querySelectorAll("[data-xfpc]").forEach(c=>c.onchange=()=>{
    if(!podeEd("ponto"))return toast("Você só pode consultar esta tela.",true);
    const {ym}=xfpPeriodo(),all=xfpCfg().fechConf||{},m={...(all[ym]||{})};if(c.checked)m[c.dataset.xfpc]=true;else delete m[c.dataset.xfpc];
    xmsave("ponto",{fechConf:{...all,[ym]:m}});R();
  });
  const x1=document.getElementById("xfpxlsx"),x2=document.getElementById("xfppdf"),fo=document.getElementById("xfpfolha"),fe=document.getElementById("xfpfechar");
  const precisa=()=>{const {de,ate}=xfpPeriodo(),r=POINT.result;if(!r||r.start!==de||r.end!==ate){toast("Calcule as jornadas deste período primeiro (linha \"Jornadas calculadas\").",true);return false}return true};
  if(x1)x1.onclick=()=>{if(precisa())exportXlsx()};
  if(x2)x2.onclick=()=>{if(precisa())exportPdfContador()};
  if(fo)fo.onclick=()=>go("contador");
  if(fe)fe.onclick=async()=>{
    if(!podeEd("ponto"))return toast("Você só pode consultar esta tela.",true);
    const {de,ate,ym}=xfpPeriodo(),L2=xfpVerifica(),conf=xfpConf(ym),pend=L2.filter(x=>x.nivel===2&&!conf[x.k]).length;
    if(!(await askConfirm(pend?`Ainda há ${pend} pendência(s) sem conferir. Registrar o fechamento mesmo assim?`:"Registrar o fechamento do ponto deste período?","Registrar")))return;
    const reg={ym,de,ate,em:hojeIso(),por:(typeof f4Quem==="function"&&f4Quem())||"",pend};
    xmsave("ponto",{fechados:[...xfpFechados(),reg].slice(-60)});
    try{audit("Fechamento do ponto",ym+" · "+pend+" pendência(s)")}catch(e){}
    toast("Fechamento registrado.");R();
  };
}
xmReg("ponto","fechamento","Fechamento do mês","Conferir e fechar o mês",xfpHtml,xfpBind);


/* >>> x_m26.js */
