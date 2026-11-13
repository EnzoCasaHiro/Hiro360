/* ================= PONTO ================= */
const POINT={punches:[],file:"",div:[],start:"",end:"",hol:"",dup:3,keep:"first",wb:240,wa:240,brk:true,result:null,err:""};
function pgPonto(){
  const P=POINT;
  return banner("","Ponto eletrônico","Conferência das marcações do relógio, com tolerância da CLT, hora noturna, atestados e justificativas.","clock")+noStore()+`
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card" style="margin:0"><h2>1 · Arquivo do relógio</h2>
      <div class="drop" id="drop" tabindex="0">${ic("up")}<div>${P.file?esc(P.file):"Clique ou solte o AllGLog001.txt"}</div></div>
      <input type="file" id="file" accept=".txt,.log" hidden>
      <div class="sub" id="info" style="margin-top:8px">${P.punches.length?infoText():""}</div></div>
    <div class="card" style="margin:0"><h2>2 · Período</h2>
      <div class="row"><div><label>De</label><input type="date" id="start" value="${P.start}"></div><div><label>Até</label><input type="date" id="end" value="${P.end}"></div></div>
      <label>Feriados (AAAA-MM-DD, separados por vírgula)</label><input id="hol" value="${esc(P.hol)}" placeholder="2026-09-07"></div>
    <div class="card" style="margin:0"><h2>3 · Regras do pareamento</h2>
      <div class="row"><div><label>Duplicata (min)</label><input type="number" id="dup" value="${P.dup}"></div>
      <div><label>Vale a</label><select id="keep"><option value="first" ${P.keep==="first"?"selected":""}>primeira</option><option value="last" ${P.keep==="last"?"selected":""}>última</option></select></div></div>
      <div class="row"><div><label>Janela antes (min)</label><input type="number" id="wb" value="${P.wb}"></div><div><label>Janela depois (min)</label><input type="number" id="wa" value="${P.wa}"></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="brk" ${P.brk?"checked":""}> Descontar intervalo pré-assinalado</label></div>
  </div>
  <div class="row" style="margin-bottom:16px"><button class="b" id="go" style="flex:none">${ic("calc")} Calcular jornadas</button>
   <button class="b sec" id="toPln" style="flex:none">${ic("sheet")} Planilha do ponto</button>
   <button class="b sec" id="toXlsx" style="flex:none" ${P.result?"":"disabled"}>${ic("sheet")} XLSX para o contador</button>
   <button class="b sec" id="toPdf" style="flex:none" ${P.result?"":"disabled"}>${ic("file")} PDF para o contador</button><span class="err" id="err" style="margin:0">${esc(P.err)}</span></div>
  <div id="out">${P.result?renderResult(P.result):`<div class="empty">Carregue o arquivo do relógio e clique em "Calcular jornadas".<br>Os turnos de cada integrante ficam na aba Turnos.</div>`}</div>`;
}
function infoText(){
  const P=POINT,users=new Set(P.punches.map(p=>p.userId)),days=P.punches.map(p=>isoDate(p.ts)).sort();
  return `<b style="color:var(--verde-medio)">${P.punches.length}</b> marcações · <b style="color:var(--verde-medio)">${users.size}</b> integrantes · ${brDate(days[0])} a ${brDate(days[days.length-1])}`+
    (P.div.length?`<br><b style="color:var(--madeira)">${P.div.length} divergência(s)</b>: ${[...new Set(P.div.map(d=>d.kind))].join(", ")}`:"");
}
function bindPonto(){
  const P=POINT,drop=$("drop"),fi=$("file");
  drop.onclick=()=>fi.click();drop.onkeydown=e=>{if(e.key==="Enter")fi.click()};
  drop.ondragover=e=>{e.preventDefault();drop.classList.add("on")};drop.ondragleave=()=>drop.classList.remove("on");
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove("on");if(e.dataTransfer.files[0])loadLog(e.dataTransfer.files[0])};
  fi.onchange=()=>fi.files[0]&&loadLog(fi.files[0]);
  const sync=()=>{P.start=$("start").value;P.end=$("end").value;P.hol=$("hol").value;P.dup=+$("dup").value;P.keep=$("keep").value;P.wb=+$("wb").value;P.wa=+$("wa").value;P.brk=$("brk").checked};
  ["start","end","hol","dup","keep","wb","wa","brk"].forEach(k=>$(k).onchange=sync);
  $("go").onclick=()=>{sync();calcular(true)};
  $("toPln").onclick=()=>openPlanilha();
  $("toXlsx").onclick=()=>exportXlsx();
  $("toPdf").onclick=()=>exportPdfContador();
  bindResult();
}
async function loadLog(f){
  try{
    const{punches,divergences}=parseRawlog(decodeFile(await f.arrayBuffer()));
    const P=POINT;P.punches=punches;P.file=f.name;P.div=divergences;P.result=null;P.err="";
    const days=punches.map(p=>isoDate(p.ts)).sort();if(days.length){P.start=days[0];P.end=days[days.length-1]}
    const novos=new Map();for(const p of punches)if(!integByUid(p.userId)&&!novos.has(p.userId))novos.set(p.userId,p.uname);
    for(const[u,nm]of novos)put("integrantes","u"+u,{uid:u,nome:nm,nomeCompleto:"",depto:"Outro",turno:"",escalaModo:"semana",dias:[0,1,2,3,4],situacao:"Ativo"});
    const novasMarcas=importMarcas(punches);
    if(novos.size)toast(`${novos.size} integrante(s) cadastrado(s) a partir do relógio. Complete os dados no Prontuário.`);
    if(novasMarcas)toast(`${novasMarcas} marcação(ões) nova(s) importada(s) para o histórico.`);
    go("ponto",true);
  }catch(e){toast("Erro ao ler o arquivo: "+e.message,true)}
}
function calcular(show){
  const P=POINT;P.err="";
  try{
    if(!P.punches.length&&!Object.keys(S.marcacoes).length)throw new Error("Carregue o arquivo do relógio primeiro.");
    if(!P.start||!P.end)throw new Error("Defina o período (de/até).");
    if(P.start>P.end)throw new Error("A data 'De' precisa ser antes de 'Até'.");
    const shifts=buildShifts(),holidays=new Set([...holidaySet(P.start,P.end),...P.hol.split(",").map(s=>s.trim()).filter(Boolean)]);
    const cfg={dupWindowMin:P.dup,dupKeep:P.keep,windowBeforeMin:P.wb,windowAfterMin:P.wa,tolPerPunchMin:5,tolDailyMin:10,deductPresetBreak:P.brk};
    const span=[];for(let d=P.start;d<=P.end;d=addDaysIso(d,1))span.push(d);
    const uids=new Set([...P.punches.map(p=>p.userId),...Object.values(S.marcacoes).map(m=>+m.uid)]);
    Object.values(S.integrantes).forEach(i=>{if(i.uid!=null&&i.turno)uids.add(+i.uid)});
    const users=[],semCadastro=[];
    for(const uid of[...uids].sort((a,b)=>a-b)){
      const ig=integByUid(uid)||{};
      if(semPonto(ig))continue;
      // desligado antes do período não entra; número sem cadastro vira aviso, não cartão
      if(ig.id&&((ig.desligamento&&ig.desligamento<P.start)||(ig.situacao==="Desligado"&&!ig.desligamento)))continue;
      if(!ig.id){const n=marcasOf(uid,P.start,P.end).length;if(n)semCadastro.push({uid,n,nome:(P.punches.find(p=>p.userId===uid)||{}).uname||""});continue}
      if(ig.turno&&!shifts.get(+ig.turno))throw new Error(`${nomeInteg(ig)}: o turno ${ig.turno} não existe. Ajuste na aba Turnos.`);
      const schedule=new Map();
      for(const d of span){
        const e=escalaDia(ig,d);
        if(!e.on||!e.turno)continue;
        const shd=shifts.get(e.turno);
        if(!shd)throw new Error(`${nomeInteg(ig)}: o turno ${e.turno} (escala lançada em ${brDate(d)}) não existe. Ajuste na aba Turnos.`);
        schedule.set(d,shd);
      }
      const pun=marcasOf(uid,addDaysIso(P.start,-1),addDaysIso(P.end,1));
      const res=pairPunches(pun,schedule,cfg,holidays,P.end<hojeIso()?P.end:addDaysIso(hojeIso(),-1));
      // dia com previsto digitado à mão mas sem escala nem batida: entra no cálculo (pode virar falta)
      if(ig.id){const lim=P.end<hojeIso()?P.end:addDaysIso(hojeIso(),-1),tem=new Set(res.journeys.map(j=>j.day));
        Object.keys(((S.config["prevm_"+ig.id]||{}).dias)||{}).forEach(d=>{if(d>=P.start&&d<=lim&&!tem.has(d))res.journeys.push({day:d,status:"sem_escala",shiftNo:null,intervals:[],workedMin:0,expectedMin:0,lateMin:0,earlyLeaveMin:0,extraMin:0,feriadoMin:0,turnoNoturno:false,endsOn:d,flags:[]})});
        res.journeys.sort((a,b)=>a.day.localeCompare(b.day))}
      const nome=ig.id?nomeInteg(ig):((P.punches.find(p=>p.userId===uid)||{}).uname||String(uid));
      const ocs=Object.values(S.ocorr).filter(o=>ig.id&&o.uid===ig.id);
      const rows=res.journeys.filter(j=>j.day>=P.start&&j.day<=P.end).map(j=>{
        const r={day:j.day,wd:WD[pyWeekday(j.day)],status:j.status,shift:j.shiftNo,
          intervals:j.intervals.map(([a,b])=>hm(a)+"–"+hm(b)+(isoDate(b)!==isoDate(a)?" (+1)":"")),
          rawIntervals:j.intervals,
          workedMin:j.workedMin,expectedMin:j.expectedMin,late:j.lateMin,early:j.earlyLeaveMin,extra:j.extraMin,tolMin:j.tolMin||0,feriadoMin:j.feriadoMin||0,
          night:j.turnoNoturno,endsOn:j.endsOn,flags:[...j.flags],oc:null};
        {const nm=nightMinutes(j.intervals,j.turnoNoturno&&cfg.prorrogNoturna!==false);r.nightReal=nm.real;r.nightPror=nm.pror;r.nightFicta=nm.ficta}
        const ajd=ig.id?ajusteDe(ig.id,r.day):null;
        if(ajd&&ajd.tipo==="trabalho")r.flags.push("escala_lancada");
        {const pm=ig.id?prevManual(ig.id,r.day):null;if(pm!=null)aplicaPrevManual(r,pm)}
        const o=ocs.find(x=>x.de<=r.day&&r.day<=x.ate);
        if(o){
          r.oc=o;
          const credita=o.tipo==="atestado"||o.tipo==="esquecimento"||o.tipo==="falta_justificada";
          if(r.status===FALTA){r.status=o.tipo==="atestado"?"atestado":o.tipo==="esquecimento"?"esquecido":"justificada";if(credita){r.workedMin=r.expectedMin;r.late=0;r.early=0;r.extra=0}}
          else if(r.status===PENDENCIA&&(o.tipo==="esquecimento"||o.tipo==="falta_justificada")){r.status="esquecido";if(credita){r.workedMin=r.expectedMin;r.late=0;r.early=0;r.extra=0}}
          else r.flags.push(o.tipo==="atestado"?"atestado":"justificativa");
        }
        r.saldo=saldoDia(r);
        return r;
      });
      const okDays=new Set(rows.filter(r=>["atestado","justificada","esquecido"].includes(r.status)).map(r=>r.day));
      const pend=res.pendencies.filter(p=>p.day>=P.start&&p.day<=P.end&&!okDays.has(p.day));
      const sum=k=>rows.reduce((s,r)=>s+r[k],0),cnt=s=>rows.filter(r=>r.status===s).length;
      users.push({uid,ig,nome,depto:ig.depto||"Outro",turno:ig.turno||"",rows,pendencies:pend,ocs,
        t:{worked:sum("workedMin"),expected:sum("expectedMin"),late:sum("late"),early:sum("early"),extra:sum("extra"),
           saldo:sum("saldo"),mais:rows.reduce((s,r)=>s+Math.max(0,r.saldo),0),menos:rows.reduce((s,r)=>s+Math.min(0,r.saldo),0),nightReal:sum("nightReal"),nightFicta:sum("nightFicta"),
           escalados:rows.filter(r=>r.expectedMin>0).length,trab:rows.filter(r=>r.workedMin>0).length,
           faltas:cnt("falta"),atestados:cnt("atestado"),justificadas:cnt("justificada"),esquecidos:cnt("esquecido")}});
    }
    P.result={users,start:P.start,end:P.end,semCadastro};
  }catch(e){P.err=e.message;P.result=null}
  if(show)go("ponto",true);
}
const CLR={ok:"var(--verde-medio)",falta:"var(--bad)",pendencia:"var(--madeira)",atestado:"var(--azul-mar)",justificada:"#5f9d62",esquecido:"var(--madeira-clara)",sem_escala:"var(--areia-esc)",feriado:"var(--areia-esc)"};
function heatmap(R){
  const days=[];for(let d=R.start;d<=R.end;d=addDaysIso(d,1))days.push(d);
  if(days.length>62)return "";
  return `<div class="card"><h2>Mapa de frequência do período</h2><p class="sub" style="margin:0 0 10px">Cada quadrado é um dia. Clique para ver ou resolver.</p><div class="wrap"><table style="font-size:11px"><thead><tr><th style="position:sticky;left:0;background:var(--card);z-index:1">Integrante</th>${days.map(d=>`<th class="n" style="padding:4px 2px">${d.slice(8)}</th>`).join("")}</tr></thead><tbody>
   ${R.users.map(u=>{
     const byDay=new Map(u.rows.map(r=>[r.day,r]));
     return `<tr><td style="position:sticky;left:0;background:var(--card);white-space:nowrap;font-weight:700">${esc(u.nome)}</td>${days.map(d=>{
       const r=byDay.get(d);if(!r)return `<td></td>`;
       return `<td style="padding:2px"><button data-oc="${u.uid}" data-day="${d}" title="${brDate(d)} ${r.wd} — ${STL[r.status]}${r.oc?": "+esc(r.oc.texto||OC[r.oc.tipo]):""}" style="width:19px;height:19px;border:0;border-radius:4px;background:${CLR[r.status]};cursor:pointer"></button></td>`;
     }).join("")}</tr>`;
   }).join("")}</tbody></table></div></div>`;
}
function renderResult(R){
  const U=R.users,tot=k=>U.reduce((s,u)=>s+u.t[k],0),pend=U.reduce((s,u)=>s+u.pendencies.length,0);
  return `<div class="stats">
   <button class="stat" data-stat="integrantes"><b>${U.length}</b><span>integrantes</span></button>
   <button class="stat ${tot("faltas")?"bad":""}" data-stat="faltas"><b>${tot("faltas")}</b><span>faltas sem justificativa</span></button>
   <button class="stat ${pend?"warn":""}" data-stat="pendencias"><b>${pend}</b><span>pendências a resolver</span></button>
   <button class="stat blue" data-stat="atestados"><b>${tot("atestados")}</b><span>dias de atestado</span></button>
   <button class="stat" data-stat="extra"><b>${fmtHHMM(tot("extra"))}</b><span>horas extras</span></button>
   <button class="stat ${tot("late")?"warn":""}" data-stat="atraso"><b>${tot("late")}</b><span>min. de atraso</span></button></div>
  ${(R.semCadastro||[]).length?`<div class="callout sand" style="margin:10px 0">Números do relógio <b>sem cadastro</b> (ficam fora do cálculo e do fechamento): ${R.semCadastro.map(x=>`nº ${x.uid}${x.nome?" ("+esc(x.nome)+")":""} — ${x.n} batida(s)`).join("; ")}. Se for alguém da casa, cadastre em Integrantes com esse número no relógio, ou ligue em Ponto → Cadastro e conferência → De-para.</div>`:""}
  <div class="legend">${["ok","falta","pendencia","atestado","justificada","esquecido","sem_escala"].map(s=>`<span><i style="background:${CLR[s]}"></i>${STL[s]}</span>`).join("")}
   <span style="margin-left:auto;font-style:italic">Clique num card, num dia ou no nome para ver detalhes e resolver.</span></div>`+
  heatmap(R)+
  U.map(u=>{
    const pct=u.t.expected?Math.min(100,Math.round(100*u.t.worked/u.t.expected)):0;
    return `<div class="card"><div class="uhead"><div class="avatar">${esc(initials(u.nome))}</div>
     <div class="grow"><button class="namebtn" data-oc="${u.uid}" title="Lançar atestado ou justificativa">${esc(u.nome)}</button>
      <button class="b sec sm" data-rn="${u.uid}" title="Editar nome" style="padding:3px 7px;margin-left:6px">${ic("user")}</button>
      <div class="sub">ID ${u.uid} · <span class="depto ${deptoClass(u.depto)}">${esc(u.depto)}</span>${u.turno?` · turno ${esc(u.turno)}`:` · <i>sem turno definido</i>`}</div></div>
     <button class="b sec sm" data-oc="${u.uid}">${ic("plus")} Lançar ocorrência</button>
     <button class="b sec sm" data-mk="${u.uid}" data-mday="${u.rows[0]?u.rows[0].day:R.start}" data-mpicker="1">${ic("clock")} Editar marcações</button>
     <button class="b sec sm" data-pln="${u.uid}">${ic("sheet")} Planilha</button>
     ${u.ig&&u.ig.id?`<button class="b sec sm" data-esc="${u.ig.id}" data-escday="${u.rows[0]?u.rows[0].day:R.start}">${ic("cal")} Ajustar escala</button>`:""}</div>
     <div class="strip">${u.rows.map(r=>`<button class="d-${r.status}" data-oc="${u.uid}" data-day="${r.day}" title="${brDate(r.day)} ${r.wd} — ${STL[r.status]}${r.oc?": "+esc(r.oc.texto||OC[r.oc.tipo]):""}">${r.day.slice(8)}</button>`).join("")}</div>
     <div class="sum"><div><b>${fmtHHMM(u.t.worked)}</b><span>trabalhadas</span><div class="bar ${pct<90?"low":""}"><i style="width:${pct}%"></i></div></div>
      <div><b>${fmtHHMM(u.t.expected)}</b><span>previstas</span></div><div><b>${u.t.late}</b><span>min atraso</span></div>
      <div><b>${fmtHHMM(u.t.extra)}</b><span>extra</span></div><div><b>${u.t.faltas}</b><span>faltas</span></div>
      <div><b>${u.t.atestados+u.t.justificadas+u.t.esquecidos}</b><span>justificados</span></div><div><b>${u.pendencies.length}</b><span>pendências</span></div></div>
     ${u.pendencies.length?`<div class="callout sand" style="margin-bottom:8px"><b>Pendências:</b> ${u.pendencies.map(p=>p.kind==="marcacao_sem_escala"&&u.ig&&u.ig.id?`<button class="lnk" data-esc="${u.ig.id}" data-escday="${p.day}" data-esctipo="trabalho">${brDate(p.day).slice(0,5)} · ${esc(p.detail)} — lançar escala</button>`:/falta_(entrada|saida|pontual)/.test(p.kind)?`<button class="lnk" data-mk="${u.uid}" data-mday="${p.day}" ${p.sugereHora?`data-msug="${p.sugereHora}"`:""}>${brDate(p.day).slice(0,5)} · ${esc(p.detail)}</button>`:`<button class="lnk" data-oc="${u.uid}" data-day="${p.day}">${brDate(p.day).slice(0,5)} · ${esc(p.kind)}</button>`).join(" &nbsp;·&nbsp; ")}</div>`:""}
     <details><summary>Ver jornada dia a dia</summary><div class="wrap"><table><thead><tr><th>Dia</th><th>Situação</th><th>Marcações</th><th class="n">Trab.</th><th class="n">Prev.</th><th class="n">Atraso</th><th class="n">Saída ant.</th><th class="n">Extra</th><th>Avisos</th></tr></thead><tbody>
     ${u.rows.map(r=>`<tr><td>${brDate(r.day).slice(0,5)} ${r.wd}</td><td><span class="pill s-${r.status}">${STL[r.status]}</span></td><td><button class="lnk" data-mk="${u.uid}" data-mday="${r.day}">${r.intervals.join("<br>")||"— editar"}</button></td>
      <td class="n">${fmtHHMM(r.workedMin)}</td><td class="n">${fmtHHMM(r.expectedMin)}</td><td class="n">${r.late||""}</td><td class="n">${r.early||""}</td><td class="n">${r.extra||""}</td>
      <td>${r.night?`<span class="chip night">noturno → ${brDate(r.endsOn).slice(0,5)}</span>`:""}${flagsVisiveis(r).map(f=>`<span class="chip">${esc(FLAG_LABEL[f]||f)}</span>`).join("")}${r.oc?`<span class="chip" title="${esc(r.oc.texto)}">${esc(OC[r.oc.tipo])}</span>`:""}</td></tr>`).join("")||`<tr><td colspan="9">Sem jornadas no período.</td></tr>`}
     </tbody></table></div></details></div>`}).join("");
}
function bindResult(){
  document.querySelectorAll("[data-oc]").forEach(b=>b.onclick=()=>openOcorr(+b.dataset.oc,b.dataset.day));
  document.querySelectorAll("[data-mk]").forEach(b=>b.onclick=()=>openMarcas(+b.dataset.mk,b.dataset.mday,{picker:b.dataset.mpicker==="1",suggest:b.dataset.msug}));
  document.querySelectorAll("[data-rn]").forEach(b=>b.onclick=()=>openRename(+b.dataset.rn));
  document.querySelectorAll("[data-pln]").forEach(b=>b.onclick=()=>openPlanilha(+b.dataset.pln,POINT.result&&POINT.result.start,POINT.result&&POINT.result.end));
  document.querySelectorAll("[data-esc]").forEach(b=>b.onclick=()=>openEscalaAjuste(b.dataset.esc,b.dataset.escday,{tipo:b.dataset.esctipo}));
  document.querySelectorAll("[data-stat]").forEach(b=>b.onclick=()=>openStatModal(b.dataset.stat));
}
function openStatModal(kind){
  const R=POINT.result;if(!R)return;
  const TT={integrantes:"Integrantes no período",faltas:"Faltas sem justificativa",pendencias:"Pendências a resolver",atestados:"Dias de atestado",extra:"Horas extras",atraso:"Atrasos"}[kind];
  let rows=[];
  if(kind==="integrantes")rows=R.users.map(u=>({uid:u.uid,nome:u.nome,detail:`${u.depto} · ${u.t.trab}/${u.t.escalados} dias trabalhados no período`,action:"pront"}));
  else if(kind==="faltas")R.users.forEach(u=>u.rows.filter(r=>r.status==="falta").forEach(r=>rows.push({uid:u.uid,nome:u.nome,day:r.day,detail:`${brDate(r.day)} ${r.wd} — sem marcação, sem justificativa`,action:"oc"})));
  else if(kind==="pendencias")R.users.forEach(u=>u.pendencies.forEach(p=>rows.push({uid:u.uid,nome:u.nome,day:p.day,detail:`${brDate(p.day)} — ${p.kind}: ${esc(p.detail)}`,sugereHora:p.sugereHora,action:p.kind==="marcacao_sem_escala"?"esc":/falta_(entrada|saida|pontual)/.test(p.kind)?"mk":"oc"})));
  else if(kind==="atestados")R.users.forEach(u=>u.rows.filter(r=>r.status==="atestado").forEach(r=>rows.push({uid:u.uid,nome:u.nome,day:r.day,detail:`${brDate(r.day)} ${r.wd}${r.oc&&r.oc.texto?" — "+esc(r.oc.texto):""}`,action:"oc"})));
  else if(kind==="extra")R.users.forEach(u=>u.rows.filter(r=>r.extra>0).forEach(r=>rows.push({uid:u.uid,nome:u.nome,day:r.day,detail:`${brDate(r.day)} ${r.wd} — ${fmtHHMM(r.extra)} de extra`,action:"mk"})));
  else if(kind==="atraso")R.users.forEach(u=>u.rows.filter(r=>r.late>0).forEach(r=>rows.push({uid:u.uid,nome:u.nome,day:r.day,detail:`${brDate(r.day)} ${r.wd} — ${r.late} min de atraso`,action:"mk"})));
  const ov=openModal(`<h3>${TT}</h3><div class="sub" style="margin-bottom:10px">${rows.length} registro(s)${rows.length?". Clique para resolver.":""}</div>
   ${rows.length?rows.map(r=>`<div class="doc"><div class="grow"><div class="nm">${esc(r.nome)}</div><div class="sub">${r.detail}</div></div>
     ${r.action==="oc"?`<button class="b sec sm" data-goc="${r.uid}" data-gday="${r.day}">Resolver</button>`:r.action==="esc"?`<button class="b sec sm" data-gesc="${r.uid}" data-gday="${r.day}">Lançar escala</button>`:r.action==="mk"?`<button class="b sec sm" data-gmk="${r.uid}" data-gday="${r.day}" ${r.sugereHora?`data-gsug="${r.sugereHora}"`:""}>Lançar marcação</button>`:`<button class="b sec sm" data-gpr="${r.uid}">Abrir prontuário</button>`}
    </div>`).join(""):`<div class="empty">Nada por aqui — tudo certo.</div>`}
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b sec" id="scx">Fechar</button></div>`);
  ov.querySelector("#scx").onclick=()=>ov.remove();
  ov.querySelectorAll("[data-goc]").forEach(b=>b.onclick=()=>{ov.remove();openOcorr(+b.dataset.goc,b.dataset.gday)});
  ov.querySelectorAll("[data-gmk]").forEach(b=>b.onclick=()=>{ov.remove();openMarcas(+b.dataset.gmk,b.dataset.gday,{suggest:b.dataset.gsug})});
  ov.querySelectorAll("[data-gesc]").forEach(b=>b.onclick=()=>{const ig=integByUid(+b.dataset.gesc);ov.remove();if(ig)openEscalaAjuste(ig.id,b.dataset.gday,{tipo:"trabalho"})});
  ov.querySelectorAll("[data-gpr]").forEach(b=>b.onclick=()=>{const ig=integByUid(+b.dataset.gpr);ov.remove();PR.sel=ig?ig.id:null;PR.tab="dados";go("pront")});
}
function openRename(uid){
  const ig=integByUid(uid);if(!ig){toast("Integrante não encontrado.",true);return}
  const ov=openModal(`<h3>Editar nome</h3><label>Nome completo</label><input id="rnm" value="${esc(nomeInteg(ig))}">
   <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="b sec" id="rcx">Cancelar</button><button class="b" id="rsv">Salvar</button></div>`);
  ov.querySelector("#rcx").onclick=()=>ov.remove();
  ov.querySelector("#rsv").onclick=()=>{
    const v=ov.querySelector("#rnm").value.trim();if(!v)return;
    put("integrantes",ig.id,{...strip(ig),nomeCompleto:v});ov.remove();toast("Nome atualizado.");afterOc();
  };
}
function dayMarcas(uid,fromDay,toDay){toDay=toDay||fromDay;return Object.values(S.marcacoes).filter(m=>+m.uid===+uid&&!m.removida&&m.ts.slice(0,10)>=fromDay&&m.ts.slice(0,10)<=toDay).sort((a,b)=>a.ts.localeCompare(b.ts))}
function openMarcas(uid,day,opts){
  opts=opts||{};
  const ig=integByUid(uid);
  const rows=(POINT.result&&(POINT.result.users.find(u=>u.uid===uid)||{}).rows)||[];
  const rowFor=d=>rows.find(x=>x.day===d);
  const endsFor=d=>{const row=rowFor(d);return row&&row.night?row.endsOn:d};
  const dayLabel=d=>{const row=rowFor(d);return row?`${brDate(d)} ${row.wd} — ${STL[row.status]}`:brDate(d)};
  const mkRow=m=>`<div class="doc" data-mid="${m.id}"><input type="datetime-local" value="${m.ts.slice(0,16)}" style="max-width:210px"><span class="chip ${m.origem==="manual"?"night":""}">${m.origem==="manual"?"manual":"relógio"}</span>
   <button class="b sec sm" data-msave="1">Salvar</button><button class="b sec sm" data-mdel="${m.id}" title="Remover">${ic("trash")}</button></div>`;
  const bodyHtml=curDay=>{
    const to=endsFor(curDay),list=dayMarcas(uid,curDay,to);
    const sug=(opts.suggest&&curDay===day)?opts.suggest:null;
    return `<div id="mlist">${list.length?list.map(mkRow).join(""):`<div class="empty">Nenhuma marcação em ${brDate(curDay)}${to!==curDay?" – "+brDate(to):""}.</div>`}</div>
     ${sug?`<div class="callout blue" style="margin-top:10px">Marcação sugerida: <b>${sug}</b> (horário esperado pela escala). Confira e ajuste se não for exatamente esse o horário.</div>`:""}
     <div class="row" style="margin-top:12px;align-items:flex-end"><div><label>Adicionar marcação</label><input type="datetime-local" id="madd" value="${curDay}T${sug||"08:00"}"></div>
      <button class="b sec sm" id="maddbtn" style="flex:none">${ic("plus")} Adicionar</button></div>`;
  };
  function paint(curDay){
    ov.querySelector("#mbody").innerHTML=bodyHtml(curDay);
    ov.querySelectorAll("[data-mdel]").forEach(b=>b.onclick=async()=>{
      if(!await askConfirm("Remover esta marcação?","Remover"))return;
      const m=S.marcacoes[b.dataset.mdel];put("marcacoes",m.id,{...strip(m),removida:true,motivo:"Removida manualmente"});
      toast("Marcação removida.");afterOc();paint(curDay);
    });
    ov.querySelectorAll("[data-msave]").forEach(b=>b.onclick=()=>{
      const rowEl=b.closest("[data-mid]"),m=S.marcacoes[rowEl.dataset.mid],val=rowEl.querySelector("input[type=datetime-local]").value;
      if(!val)return;
      put("marcacoes",m.id,{...strip(m),ts:val+":00",origem:"manual",tsOriginal:m.tsOriginal||m.ts,motivo:"Editada manualmente"});
      toast("Marcação atualizada.");afterOc();paint(curDay);
    });
    ov.querySelector("#maddbtn").onclick=()=>{
      const v=ov.querySelector("#madd").value;if(!v)return;
      put("marcacoes",uid8(),{uid,ts:v+":00",origem:"manual",motivo:"Adicionada manualmente",removida:false});
      toast("Marcação adicionada.");afterOc();paint(curDay);
    };
  }
  const picker=opts.picker&&rows.length>1;
  const ov=openModal(`<h3>${esc(ig?nomeInteg(ig):"ID "+uid)}</h3>
   <div class="sub" style="margin-bottom:10px">${picker?"Escolha o dia do período e edite as marcações dele.":`Marcações de ${brDate(day)}${endsFor(day)!==day?" a "+brDate(endsFor(day)):""}.`}</div>
   ${picker?`<label>Dia</label><select id="mday">${rows.map(r=>`<option value="${r.day}" ${r.day===day?"selected":""}>${dayLabel(r.day)}</option>`).join("")}</select>`:""}
   <div id="mbody" style="margin-top:${picker?"10px":"0"}"></div>
   <div class="callout sand" style="margin-top:10px">Cada edição altera só o dia mostrado aqui. A hora original de uma marcação editada fica guardada no histórico.</div>
   <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="b sec" id="mcx">Fechar</button></div>`);
  ov.querySelector("#mcx").onclick=()=>ov.remove();
  if(picker)ov.querySelector("#mday").onchange=e=>paint(e.target.value);
  paint(day);
}

