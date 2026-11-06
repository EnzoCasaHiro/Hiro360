/* ================= ROTINA: tarefas, documentos com validade, agenda, visão geral e sugestão de folgas ================= */
function mutaAno(prefix,campo,antes,fn){
  const depois=fn([...antes]),por={};
  depois.forEach(e=>{const y=e[campo].slice(0,4);(por[y]=por[y]||[]).push(e)});
  new Set([...Object.keys(por),...antes.map(e=>e[campo].slice(0,4))]).forEach(y=>{
    const novo=por[y]||[],velho=antes.filter(e=>e[campo].slice(0,4)===y);
    if(JSON.stringify(novo)!==JSON.stringify(velho))put("config",prefix+y,{itens:novo});
  });
}
const tarKeys=()=>Object.keys(S.config).filter(k=>/^tar_\d{4}$/.test(k));
const tarAll=()=>tarKeys().flatMap(k=>S.config[k].itens||[]);
const tarMutate=fn=>mutaAno("tar_","data",tarAll(),fn);
const tarAtrasada=t=>t.status!=="feita"&&t.data<hojeIso();
const PRIO={alta:"Alta",normal:"Normal",baixa:"Baixa"};
function feriadosAno(y){
  const m={},off=feriadosOff();
  nationalHolidays(y).forEach(([d,n])=>{if(!off.has(d))m[d]=n});
  feriadosExtra().forEach(x=>{if(String(x.dia).startsWith(String(y)))m[x.dia]=x.nome});
  return m;
}
const nomeDe=id=>{const i=S.integrantes[id];return i?nomeInteg(i):""};

/* ---------- documentos com validade ---------- */
const dvAll=()=>(S.config.docs_val&&S.config.docs_val.itens)||[];
const dvSave=l=>put("config","docs_val",{itens:l});
const DOC_CATS=["Alvará sanitário (Vigilância)","Alvará de funcionamento","AVCB (Bombeiros)","CNES","Registro técnico (COREN, CREFITO, CRN...)","Responsável técnico — certificado","Dedetização e controle de pragas","Limpeza da caixa d'água","Seguro","Contrato","ASO (exame ocupacional)","PCMSO / PGR","Certificado / treinamento","Vacinação","Outro"];
function dvInfo(d){
  const dias=daysBetweenIso(hojeIso(),d.validade),aviso=+d.aviso||60,crit=Math.min(15,aviso),mid=Math.min(30,aviso);
  const nivel=dias<=crit?3:dias<=mid?2:dias<=aviso?1:0;
  const label=dias<0?`Vencido há ${-dias} dia(s)`:dias===0?"Vence hoje":`Vence em ${dias} dia(s)`;
  return{dias,nivel,label,cls:nivel===3?"s-urgente":nivel===2?"s-pendencia":nivel===1?"s-atestado":"s-ok"};
}
const dvVinc=d=>d.vinc==="casa"||!d.vinc?"Casa Hiro":(nomeDe(d.vinc)||"(integrante removido)");

/* ---------- eventos de calendário ---------- */
function eventosDoMes(ano,mes){
  const pre=`${ano}-${String(mes+1).padStart(2,"0")}`,ev={},get=d=>ev[d]=ev[d]||{tar:[],doc:[],fin:[],fer:null};
  if(AG.fTar)tarAll().filter(t=>t.data.startsWith(pre)).forEach(t=>get(t.data).tar.push(t));
  if(AG.fDoc&&podeVer("docs"))dvAll().filter(d=>d.validade.startsWith(pre)).forEach(d=>get(d.validade).doc.push(d));
  if(AG.fDoc&&podeVer("prest"))ctAll().filter(c=>c.fim&&c.fim.startsWith(pre)).forEach(c=>get(c.fim).doc.push({id:c.id,nome:"Contrato: "+c.objeto,validade:c.fim,aviso:30,vinc:"casa"}));
  if(AG.fFin&&podeVer("fin"))finAll().filter(e=>!e.pago&&e.venc.startsWith(pre)).forEach(e=>get(e.venc).fin.push(e));
  if(AG.fDoc)XEVENTOS.forEach(f=>{try{f(pre).forEach(d=>get(d.validade).doc.push(d))}catch(e){}});
  if(AG.fFer){const f=feriadosAno(ano);Object.keys(f).filter(d=>d.startsWith(pre)).forEach(d=>get(d).fer=f[d])}
  return ev;
}
function celulaHtml(iso,ev,fora){
  const e=ev||{tar:[],doc:[],fin:[],fer:null},h=hojeIso(),chips=[];
  if(e.fer)chips.push(`<div class="cev fe" title="${esc(e.fer)}">${esc(e.fer)}</div>`);
  e.tar.forEach(t=>chips.push(`<div class="cev ${t.status==="feita"?"tf":tarAtrasada(t)?"tu":"t"}" title="${esc(t.titulo)}"${podeEd("agenda")?` draggable="true" data-tarid="${t.id}"`:""}>${t.prio==="alta"&&t.status!=="feita"?"! ":""}${esc(t.titulo)}</div>`));
  e.doc.forEach(d=>chips.push(`<div class="cev ${dvInfo(d).nivel===3?"du":"d"}" title="${esc(d.nome)}">Doc: ${esc(d.nome)}</div>`));
  e.fin.forEach(x=>chips.push(`<div class="cev f" title="${esc(x.desc)}">${x.tipo==="pagar"?"−":"+"} ${fmtBRL(x.valor)}</div>`));
  const mostra=chips.slice(0,3).join(""),mais=chips.length>3?`<div class="cev f">+${chips.length-3} mais</div>`:"";
  return `<div class="dc ${fora?"fora":""} ${iso===h?"hoje":""}" data-agdia="${iso}"><div class="dn"><span>${+iso.slice(8)}</span></div>${mostra}${mais}</div>`;
}

/* ---------- agenda ---------- */
const AG={ano:new Date().getFullYear(),mes:new Date().getMonth(),fTar:true,fDoc:true,fFin:true,fFer:true,status:"todas"};
function pgAgenda(){
  const h=hojeIso(),pre=`${AG.ano}-${String(AG.mes+1).padStart(2,"0")}`,ev=eventosDoMes(AG.ano,AG.mes);
  const primeiro=isoDate(new Date(AG.ano,AG.mes,1)),n=new Date(AG.ano,AG.mes+1,0).getDate(),off=pyWeekday(primeiro),total=Math.ceil((off+n)/7)*7;
  const cel=[];for(let i=0;i<total;i++){const iso=addDaysIso(primeiro,i-off);cel.push(celulaHtml(iso,ev[iso],!iso.startsWith(pre)))}
  const tm=tarAll().filter(t=>t.data.startsWith(pre)),feitas=tm.filter(t=>t.status==="feita").length,atr=tm.filter(tarAtrasada).length,pct=tm.length?Math.round(100*feitas/tm.length):0;
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-2,AG.ano);y<=Math.max(y0+3,AG.ano);y++)anos.push(y);
  const lista=tm.filter(t=>AG.status==="todas"||(AG.status==="abertas"?t.status!=="feita":AG.status==="feitas"?t.status==="feita":tarAtrasada(t))).sort((a,b)=>a.data.localeCompare(b.data)||(a.hora||"").localeCompare(b.hora||""));
  return banner("","Agenda e tarefas","Calendário com tarefas, vencimento de documentos, contas e feriados.","agenda")+noStore()+`
  <div class="card"><div class="row" style="align-items:flex-end;margin-bottom:10px">
   <button type="button" class="b sec sm" id="agprev" style="flex:none">◀</button>
   <div><label>Mês</label><select id="agmes">${MESES_PT.map((m,k)=>`<option value="${k}" ${k===AG.mes?"selected":""}>${m}</option>`).join("")}</select></div>
   <div><label>Ano</label><select id="agano">${anos.map(y=>`<option ${y===AG.ano?"selected":""}>${y}</option>`).join("")}</select></div>
   <button type="button" class="b sec sm" id="agnext" style="flex:none">▶</button>
   <button type="button" class="b sec sm" id="aghoje" style="flex:none">Hoje</button>
   <button type="button" class="b" id="agnova" style="flex:none">${ic("plus")} Nova tarefa</button></div>
   <div class="legend" style="margin:0 0 10px">${[["fTar","Tarefas"],["fDoc","Documentos"],["fFin","Contas"],["fFer","Feriados"]].map(([k,l])=>`<label style="display:inline-flex;gap:5px;align-items:center;font-weight:400;color:var(--ink);margin:0"><input type="checkbox" data-agf="${k}" ${AG[k]?"checked":""}> ${l}</label>`).join("")}</div>
   <div class="cal">${["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=>`<div class="dh">${d}</div>`).join("")}${cel.join("")}</div></div>
  <div class="stats"><div class="stat"><b>${tm.length}</b><span>tarefas em ${MESES_PT[AG.mes]}</span></div>
   <div class="stat blue"><b>${feitas}</b><span>feitas · ${pct}%</span><div class="bar" style="width:100%"><i style="width:${pct}%"></i></div></div>
   <div class="stat ${atr?"bad":""}"><b>${atr}</b><span>atrasadas</span></div></div>
  <div class="card"><h2>Tarefas do mês</h2><div class="row" style="margin-bottom:10px"><div style="flex:0 0 220px"><label>Mostrar</label><select id="agstatus">${[["todas","Todas"],["abertas","Em aberto"],["feitas","Feitas"],["atrasadas","Atrasadas"]].map(([v,l])=>`<option value="${v}" ${AG.status===v?"selected":""}>${l}</option>`).join("")}</select></div></div>
   ${lista.length?`<div class="wrap"><table><thead><tr><th style="width:32px"></th><th>Data</th><th>Tarefa</th><th>Responsável</th><th>Prioridade</th><th></th></tr></thead><tbody>
   ${lista.map(t=>`<tr><td><input type="checkbox" data-tardone="${t.id}" ${t.status==="feita"?"checked":""} title="Marcar como feita"></td><td>${brDate(t.data)}${t.hora?" "+esc(t.hora):""}</td>
    <td><b style="${t.status==="feita"?"text-decoration:line-through;color:var(--mute)":""}">${esc(t.titulo)}</b>${t.desc?`<div class="sub">${esc(t.desc)}</div>`:""}</td>
    <td>${esc(nomeDe(t.resp)||"—")}${t.area?`<div class="sub">${esc(t.area)}</div>`:""}</td>
    <td>${tarAtrasada(t)?`<span class="pill s-urgente">atrasada</span>`:`<span class="pill ${t.prio==="alta"?"s-pendencia":"s-ok"}">${PRIO[t.prio]||"Normal"}</span>`}</td>
    <td style="white-space:nowrap"><button class="b sec sm" data-taredit="${t.id}" title="Editar">${ic("edit")}</button> <button class="b sec sm" data-tarresch="${t.id}" title="Reagendar">${ic("cal")}</button> <button class="b sec sm" data-tardel="${t.id}" title="Excluir">${ic("trash")}</button></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhuma tarefa ${AG.status==="todas"?"neste mês":"com esse filtro"}. Clique em um dia do calendário para lançar.</div>`}</div>`;
}
function bindAgenda(){
  const re=()=>go("agenda",true);
  $("agmes").onchange=e=>{AG.mes=+e.target.value;re()};
  $("agano").onchange=e=>{AG.ano=+e.target.value;re()};
  $("agprev").onclick=()=>{AG.mes--;if(AG.mes<0){AG.mes=11;AG.ano--}re()};
  $("agnext").onclick=()=>{AG.mes++;if(AG.mes>11){AG.mes=0;AG.ano++}re()};
  $("aghoje").onclick=()=>{const t=new Date();AG.ano=t.getFullYear();AG.mes=t.getMonth();re()};
  $("agnova").onclick=()=>openTarefa(null,hojeIso());
  $("agstatus").onchange=e=>{AG.status=e.target.value;re()};
  document.querySelectorAll("[data-agf]").forEach(c=>c.onchange=()=>{AG[c.dataset.agf]=c.checked;re()});
  bindTarefasComuns();
}
function bindTarefasComuns(){
  document.querySelectorAll("[data-agdia]").forEach(c=>c.onclick=()=>openDia(c.dataset.agdia));
  document.querySelectorAll("[data-tardone]").forEach(c=>c.onchange=()=>{tarMutate(l=>l.map(t=>t.id===c.dataset.tardone?{...t,status:c.checked?"feita":"aberta",feitaEm:c.checked?hojeIso():null}:t));go(ROUTE,true)});
  document.querySelectorAll("[data-taredit]").forEach(b=>b.onclick=()=>openTarefa(b.dataset.taredit));
  document.querySelectorAll("[data-tardel]").forEach(b=>b.onclick=()=>openTarDel(b.dataset.tardel));
  tarBindExtra();
}
function openDia(iso){
  const ev=eventosDoMes(+iso.slice(0,4),+iso.slice(5,7)-1)[iso]||{tar:[],doc:[],fin:[],fer:null};
  const semana=["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"][pyWeekday(iso)];
  const ov=openModal(`<h3>${semana}, ${brDate(iso)}</h3>${ev.fer?`<div class="callout" style="margin:8px 0">Feriado: <b>${esc(ev.fer)}</b></div>`:""}
   <h2 style="margin-top:12px">Tarefas</h2>
   ${ev.tar.length?ev.tar.map(t=>`<div class="doc"><input type="checkbox" data-odone="${t.id}" ${t.status==="feita"?"checked":""}><div class="grow"><div class="nm" style="${t.status==="feita"?"text-decoration:line-through":""}">${esc(t.titulo)}</div><div class="sub">${[t.hora,nomeDe(t.resp),t.area,PRIO[t.prio]].filter(Boolean).map(esc).join(" · ")}</div></div>
     <span style="white-space:nowrap"><button class="b sec sm" data-oedit="${t.id}" title="Editar">${ic("edit")}</button> <button class="b sec sm" data-oresch="${t.id}" title="Reagendar">${ic("cal")}</button> <button class="b sec sm" data-odel="${t.id}" title="Excluir">${ic("trash")}</button></span></div>`).join(""):`<div class="sub">Nenhuma tarefa neste dia.</div>`}
   ${ev.doc.length?`<h2 style="margin-top:14px">Documentos que vencem</h2>`+ev.doc.map(d=>`<div class="doc"><div class="grow"><div class="nm">${esc(d.nome)}</div><div class="sub">${esc(dvVinc(d))} · ${dvInfo(d).label}</div></div></div>`).join(""):""}
   ${ev.fin.length?`<h2 style="margin-top:14px">Contas</h2>`+ev.fin.map(x=>`<div class="doc"><div class="grow"><div class="nm">${esc(x.desc)}</div><div class="sub">${x.tipo==="pagar"?"A pagar":"A receber"}${x.contra?" · "+esc(x.contra):""}</div></div><b>${fmtBRL(x.valor)}</b></div>`).join(""):""}
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="odcx">Fechar</button><button class="b" id="odnova">${ic("plus")} Nova tarefa neste dia</button></div>`);
  ov.querySelector("#odcx").onclick=()=>ov.remove();
  ov.querySelector("#odnova").onclick=()=>{ov.remove();openTarefa(null,iso)};
  ov.querySelectorAll("[data-odone]").forEach(c=>c.onchange=()=>{tarMutate(l=>l.map(t=>t.id===c.dataset.odone?{...t,status:c.checked?"feita":"aberta",feitaEm:c.checked?hojeIso():null}:t));ov.remove();go(ROUTE,true)});
  ov.querySelectorAll("[data-oedit]").forEach(b=>b.onclick=()=>{ov.remove();openTarefa(b.dataset.oedit)});
  ov.querySelectorAll("[data-oresch]").forEach(b=>b.onclick=()=>{ov.remove();openTarReagenda(b.dataset.oresch)});
  ov.querySelectorAll("[data-odel]").forEach(b=>b.onclick=()=>{ov.remove();openTarDel(b.dataset.odel)});
}
function openTarefa(id,dataPadrao){
  const ed=id?tarAll().find(t=>t.id===id):null,areas=estData().areas,ints=integList();
  const ov=openModal(`<h3>${ed?"Editar tarefa":"Nova tarefa"}</h3>
   <label>O que precisa ser feito</label><input id="ttit" value="${esc(ed?ed.titulo:"")}" placeholder="Ex.: Renovar alvará, conferir estoque da cozinha...">
   <div class="row"><div><label>Data</label><input type="date" id="tdata" value="${ed?ed.data:(dataPadrao||hojeIso())}"></div><div><label>Hora (opcional)</label><input type="time" id="thora" value="${ed?ed.hora||"":""}"></div>
   <div><label>Prioridade</label><select id="tprio">${Object.entries(PRIO).map(([k,v])=>`<option value="${k}" ${(ed?ed.prio:"normal")===k?"selected":""}>${v}</option>`).join("")}</select></div></div>
   <div class="row"><div><label>Responsável</label><select id="tresp"><option value="">—</option>${ints.map(i=>`<option value="${i.id}" ${ed&&ed.resp===i.id?"selected":""}>${esc(nomeInteg(i))}</option>`).join("")}</select></div>
   <div><label>Área</label><select id="tarea"><option value="">—</option>${areas.map(a=>`<option ${ed&&ed.area===a?"selected":""}>${esc(a)}</option>`).join("")}</select></div></div>
   <label>Detalhes (opcional)</label><textarea id="tdesc" style="min-height:56px">${esc(ed?ed.desc||"":"")}</textarea>
   ${ed&&ed.grupo&&tarAll().some(x=>x.grupo===ed.grupo&&x.data>ed.data)?`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="tseg"> Aplicar também às seguintes da série (título, hora, responsável… e o deslocamento da data)</label>`:""}
   ${ed?"":`<div class="row"><div><label>Repetição</label><select id="trep"><option value="0">Não repete</option><option value="sem">Toda semana</option><option value="mes">Todo mês</option></select></div><div id="tnbox" style="display:none"><label>Quantas vezes</label><input type="number" min="2" max="60" id="tn" value="4"></div></div>`}
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="tfeita" ${ed&&ed.status==="feita"?"checked":""}> Já está feita</label>
   <div class="err" id="terr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">${ed?`<button class="b wood" id="tdel" style="margin-right:auto">${ic("trash")} Excluir</button>`:""}<button class="b sec" id="tcx">Cancelar</button><button class="b" id="tsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s),rep=g("#trep");
  if(rep)rep.onchange=()=>g("#tnbox").style.display=rep.value==="0"?"none":"block";
  g("#tcx").onclick=()=>ov.remove();
  {const dl=g("#tdel");if(dl)dl.onclick=()=>{ov.remove();openTarDel(ed.id)}}
  g("#tsv").onclick=()=>{
    const titulo=g("#ttit").value.trim(),data=g("#tdata").value;
    if(!titulo)return g("#terr").textContent="Escreva o que precisa ser feito.";if(!data)return g("#terr").textContent="Escolha a data.";if(!tarDataOk(data))return g("#terr").textContent="Confira a data (ano inválido).";
    const feita=g("#tfeita").checked,base={titulo,hora:g("#thora").value,prio:g("#tprio").value,resp:g("#tresp").value,area:g("#tarea").value,desc:g("#tdesc").value.trim(),status:feita?"feita":"aberta",feitaEm:feita?hojeIso():null};
    if(ed){const seg=g("#tseg")&&g("#tseg").checked,delta=tarDias(ed.data,data);tarMutate(l=>l.map(t=>t.id===ed.id?{...t,...base,data}:(seg&&t.grupo===ed.grupo&&t.data>ed.data)?{...t,titulo:base.titulo,hora:base.hora,prio:base.prio,resp:base.resp,area:base.area,desc:base.desc,data:delta?addDaysIso(t.data,delta):t.data}:t))}
    else{
      const r=g("#trep").value,n=r==="0"?1:Math.max(2,Math.min(60,+g("#tn").value||2)),grupo=n>1?uid8():null,novos=[];
      for(let i=0;i<n;i++)novos.push({id:uid8(),...base,data:r==="sem"?addDaysIso(data,7*i):addMesesIso(data,i),grupo,status:i===0?base.status:"aberta",feitaEm:i===0?base.feitaEm:null});
      tarMutate(l=>[...l,...novos]);
    }
    ov.remove();toast("Tarefa salva.");go(ROUTE,true);
  };
}
function openTarDel(id){
  const t=tarAll().find(x=>x.id===id);if(!t)return;
  const seg=t.grupo?tarAll().filter(x=>x.grupo===t.grupo&&x.data>t.data):[];
  const ov=openModal(`<h3>Excluir tarefa</h3><p>${esc(t.titulo)} · ${brDate(t.data)}</p><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px"><button class="b sec" id="xcx">Cancelar</button>
   ${seg.length?`<button class="b wood" id="xseg">Esta e as ${seg.length} seguinte(s)</button>`:""}<button class="b wood" id="xum">${seg.length?"Só esta":"Excluir"}</button></div>`);
  ov.querySelector("#xcx").onclick=()=>ov.remove();
  ov.querySelector("#xum").onclick=()=>{tarMutate(l=>l.filter(x=>x.id!==id));ov.remove();toast("Tarefa excluída.");go(ROUTE,true)};
  const s=ov.querySelector("#xseg");if(s)s.onclick=()=>{tarMutate(l=>l.filter(x=>!(x.id===id||(x.grupo===t.grupo&&x.data>t.data))));ov.remove();toast("Tarefas excluídas.");go(ROUTE,true)};
}

/* ---------- documentos com validade ---------- */
const DV={vinc:"",cat:"",q:"",sit:""};
function pgDocs(){
  const todos=dvAll().map(d=>({d,i:dvInfo(d)})),venc=todos.filter(x=>x.i.dias<0),crit=todos.filter(x=>x.i.dias>=0&&x.i.nivel===3),aten=todos.filter(x=>x.i.nivel===2),soon=todos.filter(x=>x.i.nivel===1),ok=todos.filter(x=>x.i.nivel===0);
  const cats=[...new Set(dvAll().map(d=>d.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
  const lista=todos.filter(({d,i})=>{
    if(DV.vinc==="casa"&&d.vinc&&d.vinc!=="casa")return false;
    if(DV.vinc&&DV.vinc!=="casa"&&d.vinc!==DV.vinc)return false;
    if(DV.cat&&d.cat!==DV.cat)return false;
    if(DV.sit==="vencidos"&&i.dias>=0)return false;if(DV.sit==="avencer"&&i.nivel===0)return false;if(DV.sit==="validos"&&i.nivel!==0)return false;
    if(DV.q&&!(d.nome+" "+dvVinc(d)+" "+(d.cat||"")).toLowerCase().includes(DV.q.toLowerCase()))return false;
    return true;
  }).sort((a,b)=>a.d.validade.localeCompare(b.d.validade));
  return banner("","Documentos e compliance","Alvará, AVCB, registro técnico, dedetização, ASO e demais prazos — o sistema avisa aos 60, 30 e 15 dias e cria a tarefa na agenda.","shield")+noStore()+`
  <div class="stats"><div class="stat ${venc.length?"bad":""}"><b>${venc.length}</b><span>vencidos</span></div>
   <div class="stat ${crit.length?"bad":""}"><b>${crit.length}</b><span>vencem em até 15 dias</span></div>
   <div class="stat ${aten.length?"warn":""}"><b>${aten.length}</b><span>vencem em até 30 dias</span></div>
   <div class="stat blue"><b>${soon.length}</b><span>vencem em até 60 dias</span></div>
   <div class="stat"><b>${ok.length}</b><span>em dia</span></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px;align-items:flex-end"><button class="b" id="dvnovo" style="flex:none">${ic("plus")} Novo documento</button></div>
   <div class="row" style="margin-bottom:12px">
    <div><label>Vinculado a</label><select id="dvvinc"><option value="">Todos</option><option value="casa" ${DV.vinc==="casa"?"selected":""}>Casa Hiro (institucional)</option>${integList().map(i=>`<option value="${i.id}" ${DV.vinc===i.id?"selected":""}>${esc(nomeInteg(i))}</option>`).join("")}</select></div>
    <div><label>Tipo</label><select id="dvcat"><option value="">Todos</option>${cats.map(c=>`<option ${c===DV.cat?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    <div><label>Situação</label><select id="dvsit">${[["","Todas"],["vencidos","Vencidos"],["avencer","A vencer"],["validos","Em dia"]].map(([v,l])=>`<option value="${v}" ${DV.sit===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div style="flex:2"><label>Buscar</label><input id="dvq" value="${esc(DV.q)}" placeholder="nome do documento"></div></div>
   ${lista.length?`<div class="wrap"><table><thead><tr><th>Documento</th><th>Vinculado a</th><th>Validade</th><th>Situação</th><th></th></tr></thead><tbody>
   ${lista.map(({d,i})=>`<tr><td><b>${esc(d.nome)}</b><div class="sub">${esc(d.cat||"")}${d.local?" · "+esc(d.local):""}</div></td><td>${esc(dvVinc(d))}</td><td>${brDate(d.validade)}</td>
    <td><span class="pill ${i.cls}">${i.label}</span></td>
    <td style="white-space:nowrap">${d.arquivo&&S.docs[d.arquivo]?`<button class="b sec sm" data-dvfile="${d.id}" title="Abrir arquivo">${ic("file")}</button> `:""}<button class="b sm" data-dvren="${d.id}">Renovar</button>
     <button class="b sec sm" data-dvedit="${d.id}">${ic("edit")}</button> <button class="b sec sm" data-dvdel="${d.id}">${ic("trash")}</button></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum documento cadastrado${DV.q||DV.cat||DV.vinc||DV.sit?" com esses filtros":""}. Lance alvarás, licenças, ASO, certificados e o que mais tiver prazo.</div>`}</div>`;
}
function bindDocs(){
  const re=()=>go("docs",true);
  $("dvnovo").onclick=()=>openDocVal(null);
  $("dvvinc").onchange=e=>{DV.vinc=e.target.value;re()};$("dvcat").onchange=e=>{DV.cat=e.target.value;re()};$("dvsit").onchange=e=>{DV.sit=e.target.value;re()};
  const q=$("dvq");q.oninput=()=>{DV.q=q.value;re();const n=$("dvq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  document.querySelectorAll("[data-dvedit]").forEach(b=>b.onclick=()=>openDocVal(b.dataset.dvedit));
  document.querySelectorAll("[data-dvren]").forEach(b=>b.onclick=()=>openDocRenovar(b.dataset.dvren));
  document.querySelectorAll("[data-dvfile]").forEach(b=>b.onclick=()=>{const d=dvAll().find(x=>x.id===b.dataset.dvfile);if(d&&S.docs[d.arquivo])verDoc(S.docs[d.arquivo])});
  document.querySelectorAll("[data-dvdel]").forEach(b=>b.onclick=async()=>{const d=dvAll().find(x=>x.id===b.dataset.dvdel);if(d&&await askConfirm(`Excluir "${d.nome}" da lista de documentos?`,"Excluir")){dvSave(dvAll().filter(x=>x.id!==d.id));toast("Documento excluído.");re()}});
}
function criaTarefaDoc(d){
  if(tarAll().some(t=>t.docRef===d.id&&t.status!=="feita"))return false;
  const aviso=+d.aviso||30,quando=[addDaysIso(d.validade,-aviso),hojeIso()].sort().pop();
  tarMutate(l=>[...l,{id:uid8(),titulo:`Renovar: ${d.nome}${d.vinc&&d.vinc!=="casa"?" — "+nomeDe(d.vinc):""}`,data:quando,hora:"",prio:"alta",resp:d.resp||"",area:"",desc:`Validade em ${brDate(d.validade)}.`,status:"aberta",feitaEm:null,grupo:null,docRef:d.id}]);
  return true;
}
function openDocVal(id,pre){
  pre=pre||{};const ed=id?dvAll().find(d=>d.id===id):null,ints=integList();
  const ov=openModal(`<h3>${ed?"Editar documento":"Novo documento"}</h3>
   <label>Nome do documento</label><input id="dvnome" value="${esc(ed?ed.nome:(pre.nome||""))}" placeholder="Ex.: Alvará de funcionamento 2026, ASO — Maria, COREN — Ana">
   <div class="row"><div><label>Tipo</label><input id="dvc" list="dvcl" value="${esc(ed?ed.cat||"":(pre.cat||""))}"><datalist id="dvcl">${DOC_CATS.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
   <div><label>Vinculado a</label><select id="dvv"><option value="casa">Casa Hiro (institucional)</option>${ints.map(i=>`<option value="${i.id}" ${(ed?ed.vinc:pre.vinc)===i.id?"selected":""}>${esc(nomeInteg(i))}</option>`).join("")}</select></div></div>
   <div class="row"><div><label>Emissão (opcional)</label><input type="date" id="dve" value="${ed?ed.emissao||"":""}"></div><div><label>Validade</label><input type="date" id="dvval" value="${ed?ed.validade:""}"></div>
   <div><label>Avisar com quantos dias</label><input type="number" min="1" max="365" id="dva" value="${ed?ed.aviso||60:60}"></div></div>
   <div class="sub" style="margin:-2px 0 6px">O sistema avisa em azul quando faltar esse prazo (padrão 60 dias), em laranja a 30 dias e em vermelho a 15 dias ou menos, ou se já venceu.</div>
   <div class="row"><div><label>Responsável (opcional)</label><select id="dvr"><option value="">—</option>${ints.map(i=>`<option value="${i.id}" ${ed&&ed.resp===i.id?"selected":""}>${esc(nomeInteg(i))}</option>`).join("")}</select></div>
   <div><label>Onde está guardado (pasta, link, armário)</label><input id="dvlocal" value="${esc(ed?ed.local||"":"")}"></div></div>
   <div id="dvfbox"><label>Arquivo (PDF ou imagem) — só para documentos de integrante; fica também no Prontuário</label><input type="file" id="dvfile" accept=".pdf,.png,.jpg,.jpeg,.webp"></div>
   <label>Observação</label><input id="dvobs" value="${esc(ed?ed.obs||"":"")}">
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="dvtar" ${ed?"":"checked"}> Criar tarefa na agenda para renovar</label>
   <div class="err" id="dverr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="dvcx">Cancelar</button><button class="b" id="dvsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s),vis=()=>g("#dvfbox").style.display=g("#dvv").value==="casa"?"none":"block";
  g("#dvv").onchange=vis;vis();g("#dvcx").onclick=()=>ov.remove();
  g("#dvsv").onclick=async()=>{
    const nome=g("#dvnome").value.trim(),validade=g("#dvval").value,vinc=g("#dvv").value;
    if(!nome)return g("#dverr").textContent="Informe o nome do documento.";if(!validade)return g("#dverr").textContent="Informe a data de validade.";
    let arquivo=ed?ed.arquivo||null:null;const f=g("#dvfile").files[0];
    if(f&&vinc!=="casa"){
      try{const cat=/aso|exame/i.test(g("#dvc").value)?"ASO e exames":/certific|treinamento|registro/i.test(g("#dvc").value)?"Certificados e treinamentos":"Documentos pessoais";arquivo=await uploadDoc(vinc,f,cat)}
      catch(e){return g("#dverr").textContent=e.message||String(e)}
    }
    const reg={id:ed?ed.id:uid8(),nome,cat:g("#dvc").value.trim(),vinc,emissao:g("#dve").value,validade,aviso:+g("#dva").value||30,resp:g("#dvr").value,local:g("#dvlocal").value.trim(),obs:g("#dvobs").value.trim(),arquivo,hist:ed?ed.hist||[]:[]};
    dvSave(ed?dvAll().map(d=>d.id===ed.id?reg:d):[...dvAll(),reg]);
    if(g("#dvtar").checked)criaTarefaDoc(reg);
    ov.remove();toast("Documento salvo.");go(ROUTE,true);
  };
}
function openDocRenovar(id){
  const d=dvAll().find(x=>x.id===id);if(!d)return;
  const sug=addMesesIso(daysBetweenIso(hojeIso(),d.validade)<0?hojeIso():d.validade,12);
  const ov=openModal(`<h3>Renovar documento</h3><div class="sub" style="margin-bottom:10px">${esc(d.nome)} · validade atual ${brDate(d.validade)}</div>
   <div class="row"><div><label>Nova emissão</label><input type="date" id="rnem" value="${hojeIso()}"></div><div><label>Nova validade</label><input type="date" id="rnval" value="${sug}"></div></div>
   <div class="err" id="rnerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="rncx">Cancelar</button><button class="b" id="rnsv">Renovar</button></div>`);
  ov.querySelector("#rncx").onclick=()=>ov.remove();
  ov.querySelector("#rnsv").onclick=()=>{
    const nv=ov.querySelector("#rnval").value;if(!nv)return ov.querySelector("#rnerr").textContent="Informe a nova validade.";
    const novo={...d,emissao:ov.querySelector("#rnem").value,validade:nv,hist:[...(d.hist||[]),{validade:d.validade,emissao:d.emissao||"",em:hojeIso()}]};
    dvSave(dvAll().map(x=>x.id===id?novo:x));
    tarMutate(l=>l.map(t=>t.docRef===id&&t.status!=="feita"?{...t,status:"feita",feitaEm:hojeIso()}:t));
    ov.remove();toast("Documento renovado.");go(ROUTE,true);
  };
}

/* ---------- visão geral (tela inicial) ---------- */
const HOME={per:"semana"};
function periodoHome(per){
  const h=hojeIso();if(per==="hoje")return[h,h];
  if(per==="mes")return[h.slice(0,8)+"01",isoDate(new Date(+h.slice(0,4),+h.slice(5,7),0))];
  const ini=addDaysIso(h,-pyWeekday(h));return[ini,addDaysIso(ini,6)];
}
const itemTarefa=(t,h)=>({nivel:t.status==="feita"?0:(t.data<=h?3:2),tipo:"Tarefa",titulo:t.titulo,detalhe:t.status==="feita"?"feita":t.data<h?`atrasada — era para ${brDate(t.data)}`:t.data===h?"é para hoje"+(t.hora?" às "+t.hora:""):`para ${brDate(t.data)}`,quando:t.data,rota:"agenda",res:t.status==="feita"?null:{k:"tarefa",id:t.id},resLabel:"Concluir"});
const itemDoc=d=>{const i=dvInfo(d);return{nivel:i.nivel,tipo:"Documento",titulo:`${d.nome}${d.vinc&&d.vinc!=="casa"?" — "+dvVinc(d):""}`,detalhe:`${i.label} (${brDate(d.validade)})`,quando:d.validade,rota:"docs",res:{k:"doc",id:d.id},resLabel:"Renovar"}};
const itemContrato=(c,i)=>({nivel:i.nivel,tipo:"Contrato",titulo:`${c.objeto} — ${ctNome(c)}`,detalhe:`${i.sit} (${brDate(c.fim)})`,quando:c.fim,rota:"contab",res:{k:"contrato",id:c.id},resLabel:"Renovar"});
const itemFin=(e,h)=>{const pg=e.tipo==="pagar";return{nivel:e.venc<h?(pg?3:2):(pg&&e.venc===h?3:2),tipo:pg?"Conta a pagar":"A receber",titulo:e.desc,detalhe:`${fmtBRL(e.valor)} — ${e.venc<h?"venceu em":"vence em"} ${brDate(e.venc)}`,quando:e.venc,rota:"fin",res:{k:"fin",id:e.id},resLabel:pg?"Dar baixa":"Receber"}};
const itemEst=it=>({nivel:+it.qtd<=0?3:2,tipo:"Estoque",titulo:it.nome,detalhe:+it.qtd<=0?`acabou (${it.area})`:`no mínimo ou abaixo: ${it.qtd} de ${it.minimo} ${it.unidade||"un."} (${it.area})`,quando:null,rota:"estoque",res:{k:"est",id:it.id},resLabel:"Dar entrada"});
function urgencias(per){
  const h=hojeIso(),fim=periodoHome(per)[1],L=[],amanha=addDaysIso(h,1);
  tarAll().filter(t=>t.status!=="feita").forEach(t=>{
    if(t.data<=h)L.push(itemTarefa(t,h));
    else if(t.data<=fim){const x=itemTarefa(t,h);x.nivel=t.prio==="alta"&&t.data<=amanha?3:2;L.push(x)}
  });
  dvAll().forEach(d=>{if(dvInfo(d).nivel)L.push(itemDoc(d))});
  ctAll().forEach(c=>{const i=ctInfo(c);if(i.nivel)L.push(itemContrato(c,i))});
  finAll().filter(e=>!e.pago&&e.venc<=fim).forEach(e=>L.push(itemFin(e,h)));
  estData().itens.forEach(it=>{if(estBaixo(it)||+it.qtd<=0)L.push(itemEst(it))});
  estAlertasVal(30).forEach(a=>L.push({nivel:a.dias<=15?3:2,tipo:"Estoque",titulo:`${a.it.nome} — lote ${a.l.lote||"sem número"}`,detalhe:a.dias<0?`venceu em ${brDate(a.l.val)} · ${a.l.qtd} ${a.it.unidade||"un."} para dar baixa`:`vence em ${brDate(a.l.val)} (${a.dias} dia(s)) · ${a.l.qtd} ${a.it.unidade||"un."}`,quando:a.l.val,rota:"estoque",res:{k:"rota",id:"estoque"},resLabel:"Ver estoque"}));
  {const n=finAll().filter(e=>finOrfa(e)&&!e.pago).length;if(n)L.push({nivel:1,tipo:"Financeiro",titulo:`${n} conta(s) a pagar sem fornecedor ou nota vinculada`,detalhe:"Vincule para fechar o relatório por fornecedor e a conciliação",quando:null,rota:"fin",res:{k:"rota",id:"fin"},resLabel:"Abrir financeiro"})}
  if(POINT.result){const n=POINT.result.users.reduce((s,u)=>s+u.pendencies.length,0);if(n)L.push({nivel:2,tipo:"Ponto",titulo:`${n} pendência(s) de ponto para resolver`,detalhe:`período ${brDate(POINT.result.start)} a ${brDate(POINT.result.end)}`,quando:null,rota:"ponto",res:{k:"rota",id:"ponto"},resLabel:"Resolver no Ponto"})}
  try{const c=conflitosEscala(h,addDaysIso(h,14));if(c.length){const p=c.find(x=>x.ig);L.push({nivel:Math.max(...c.map(x=>x.nivel)),tipo:"Escala",titulo:`${c.length} conflito(s) de escala nos próximos 14 dias`,detalhe:c[0].txt,quando:null,rota:"turnos",res:p?{k:"escala",id:p.ig.id,dia:p.dia}:{k:"rota",id:"turnos"},resLabel:"Ajustar"})}}catch(e){console.error(e)}
  resAll().filter(r=>resAtivo(r)&&r.plano&&r.plano.revisao&&r.plano.revisao<=h).forEach(r=>L.push({nivel:2,tipo:"Residente",titulo:`Revisar o plano terapêutico — ${resNome(r)}`,detalhe:`revisão marcada para ${brDate(r.plano.revisao)}`,quando:r.plano.revisao,rota:"pres",res:{k:"pres",id:r.id},resLabel:"Abrir prontuário"}));
  const semImg=resAll().filter(r=>resAtivo(r)&&!r.imagemOk).length;
  if(semImg)L.push({nivel:1,tipo:"Residente",titulo:`${semImg} residente(s) sem autorização de imagem registrada`,detalhe:"Fotos e vídeos só circulam com autorização escrita",quando:null,rota:"res",res:{k:"rota",id:"res"},resLabel:"Ver residentes"});
  const inc=integList().filter(i=>miss(i).length).length;
  if(inc)L.push({nivel:1,tipo:"Cadastro",titulo:`${inc} integrante(s) com dados incompletos`,detalhe:"CPF, admissão, cargo ou PIS faltando — necessário para o contador",quando:null,rota:"pront",res:{k:"rota",id:"pront"},resLabel:"Completar cadastros"});
  XURG.forEach(f=>{try{f(L,h,fim)}catch(e){console.error(e)}});
  return L.filter(x=>!x.rota||!MODS.includes(x.rota)||podeVer(x.rota)).sort((a,b)=>b.nivel-a.nivel||(a.quando||"9999").localeCompare(b.quando||"9999"));
}
const homeItemHtml=x=>`<div class="doc ${x.nivel===3?"urg":x.nivel===2?"atn":""}"><div class="grow"><div class="nm">${esc(x.titulo)}</div><div class="sub">${esc(x.tipo)} · ${esc(x.detalhe)}</div></div>
  ${x.res?`<button class="b sm" data-hres="${x.res.k}|${esc(x.res.id||"")}|${esc(x.res.dia||"")}">${esc(x.resLabel||"Resolver")}</button>`:`<span class="pill s-ok">feita</span>`}<button class="b sec sm" data-hgo="${x.rota}">Abrir a aba</button></div>`;
function homeLista(kind){
  const h=hojeIso(),[ini,fim]=periodoHome(HOME.per),porData=(a,b)=>(a.quando||"9999").localeCompare(b.quando||"9999");
  if(kind==="urg")return{t:"Urgente agora",l:urgencias(HOME.per).filter(x=>x.nivel===3)};
  if(kind==="atn")return{t:"Pedem atenção no período",l:urgencias(HOME.per).filter(x=>x.nivel===2)};
  if(kind==="tar")return{t:"Tarefas do período",l:tarAll().filter(t=>t.data>=ini&&t.data<=fim).map(t=>itemTarefa(t,h)).sort(porData)};
  if(kind==="doc")return{t:"Documentos e contratos vencidos ou a vencer",l:[...dvAll().filter(d=>dvInfo(d).nivel).map(itemDoc),...ctAll().filter(c=>ctInfo(c).nivel).map(c=>itemContrato(c,ctInfo(c)))].sort(porData)};
  const tipo=kind==="pagar"?"pagar":"receber";
  return{t:kind==="pagar"?"A pagar no período":"A receber no período",l:finAll().filter(e=>!e.pago&&e.tipo===tipo&&e.venc>=ini&&e.venc<=fim).map(e=>itemFin(e,h)).sort(porData)};
}
function openHomeLista(kind){
  const{t,l}=homeLista(kind);
  const ov=openModal(`<h3>${t}</h3>${l.length?l.map(homeItemHtml).join(""):`<div class="empty">Nada aqui. Tudo em dia.</div>`}<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="b sec" id="hlcx">Fechar</button></div>`);
  ov.querySelector("#hlcx").onclick=()=>ov.remove();
  bindHomeAcoes(ov,()=>ov.remove());
}
// "Resolver" abre o próprio formulário da pendência (baixa, renovação, entrada...), sem sair da Visão geral
function resolverHome(k,id,dia){
  if(k==="tarefa"){tarMutate(l=>l.map(t=>t.id===id?{...t,status:"feita",feitaEm:hojeIso()}:t));toast("Tarefa concluída.");go(ROUTE,true)}
  else if(k==="doc")openDocRenovar(id);
  else if(k==="contrato")openContrato(id);
  else if(k==="fin")openFinBaixa(id);
  else if(k==="est"){const it=estData().itens.find(x=>x.id===id);if(it)openEstLote("entrada",{rows:[{nome:it.nome,qtd:estRepor(it),custo:it.custo||""}]})}
  else if(k==="escala")openEscalaAjuste(id,dia);
  else if(k==="pres"){PRES.sel=id;PRES.tab="plano";go("pres")}
  else if(XRES[k])XRES[k](id,dia);
  else if(k==="rota")go(id);
}
function bindHomeAcoes(root,fechar){
  root.querySelectorAll("[data-hres]").forEach(b=>b.onclick=()=>{const[k,id,dia]=b.dataset.hres.split("|");if(fechar)fechar();resolverHome(k,id,dia)});
  root.querySelectorAll("[data-hgo]").forEach(b=>b.onclick=()=>{if(fechar)fechar();go(b.dataset.hgo)});
}
function pgHome(){
  const h=hojeIso(),L=urgencias(HOME.per),u=L.filter(x=>x.nivel===3),a=L.filter(x=>x.nivel===2),i=L.filter(x=>x.nivel===1);
  const[ini,fim]=periodoHome(HOME.per),tp=tarAll().filter(t=>t.data>=ini&&t.data<=fim),feitas=tp.filter(t=>t.status==="feita").length;
  const hora=new Date().getHours(),saud=hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
  const flAno=fluxoMeses(+h.slice(0,4),FIN.incNF,FIN.projetar),mAt=flAno.meses.find(x=>x.k===h.slice(0,7)),resMes=mAt?mAt.ent-mAt.sai:0;
  const segIni=addDaysIso(h,-pyWeekday(h)),ev0=eventosDoMes(+segIni.slice(0,4),+segIni.slice(5,7)-1),ev1=eventosDoMes(+addDaysIso(segIni,6).slice(0,4),+addDaysIso(segIni,6).slice(5,7)-1);
  const semana=[0,1,2,3,4,5,6].map(k=>{const d=addDaysIso(segIni,k);return celulaHtml(d,(ev0[d]||ev1[d]),false)});
  const sPag=finAll().filter(e=>!e.pago&&e.tipo==="pagar"&&e.venc>=ini&&e.venc<=fim),sRec=finAll().filter(e=>!e.pago&&e.tipo==="receber"&&e.venc>=ini&&e.venc<=fim);
  return banner("","Visão geral",`${saud}! ${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}. Toque em um cartão para resolver a pendência ou ir direto para a aba.`,"home")+noStore()+`
  <div class="tabs">${[["hoje","Hoje"],["semana","Esta semana"],["mes","Este mês"]].map(([k,l])=>`<button data-hper="${k}" class="${HOME.per===k?"on":""}">${l}</button>`).join("")}</div>
  <div class="stats">
   <div class="stat ${u.length?"bad":""}" data-hcard="urg" ${u.length?'style="border-left-color:var(--urgente)"':""}><b ${u.length?'style="color:var(--urgente)"':""}>${u.length}</b><span>urgentes agora</span></div>
   <div class="stat ${a.length?"warn":""}" data-hcard="atn"><b>${a.length}</b><span>pedem atenção no período</span></div>
   <div class="stat blue" data-hcard="tar"><b>${feitas}/${tp.length}</b><span>tarefas feitas no período</span><div class="bar" style="width:100%"><i style="width:${tp.length?Math.round(100*feitas/tp.length):0}%"></i></div></div>
   ${podeVer("docs")||podeVer("prest")?`<div class="stat" data-hcard="doc"><b>${dvAll().filter(d=>dvInfo(d).nivel).length+ctAll().filter(c=>ctInfo(c).nivel).length}</b><span>documentos e contratos vencidos ou a vencer</span></div>`:""}</div>
  <div class="stats">
   ${podeVer("pront")?`<div class="stat" data-hcard="ativos"><b>${integList().filter(i=>(i.situacao||"Ativo")==="Ativo").length}</b><span>integrantes ativos</span></div>`:""}
   ${podeVer("fin")?`<div class="stat" data-hcard="pagar"><b>${fmtBRL(soma(sPag,e=>+e.valor))}</b><span>a pagar no período · ${sPag.length}</span></div>
   <div class="stat" data-hcard="receber"><b>${fmtBRL(soma(sRec,e=>+e.valor))}</b><span>a receber no período · ${sRec.length}</span></div>
   <div class="stat ${resMes<0?"warn":"blue"}" data-hcard="fluxo"><b>${fmtBRL(resMes)}</b><span>resultado esperado do mês</span></div>`:""}</div>
  <div class="row" style="margin-bottom:16px">${podeEd("agenda")?`<button class="b" id="hnova" style="flex:none">${ic("plus")} Nova tarefa</button>`:""}${podeEd("docs")?`<button class="b sec" id="hdoc" style="flex:none">${ic("shield")} Novo documento</button>`:""}</div>
  <div class="card" style="border-color:${u.length?"var(--urgente)":"var(--line)"}"><h2 style="color:var(--urgente)">Urgente — resolver primeiro</h2>${u.map(homeItemHtml).join("")||`<div class="empty">Nada urgente. Tudo em dia por aqui.</div>`}</div>
  ${a.length?`<div class="card"><h2>Atenção neste período</h2>${a.map(homeItemHtml).join("")}</div>`:""}
  ${podeVer("fin")?`<div class="card"><h2>Fluxo de caixa de ${h.slice(0,4)}</h2>${finChartHtml(flAno.meses)}<div class="row" style="margin-top:10px"><button class="b sec" data-hgo="fin" style="flex:none">Abrir o Financeiro</button></div></div>`:""}
  <div class="card"><h2>A semana em um relance</h2><div class="cal">${["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=>`<div class="dh">${d}</div>`).join("")}${semana.join("")}</div>
   <p class="sub" style="margin:8px 0 0">Clique em um dia para ver e lançar tarefas. O calendário completo fica em Agenda e tarefas.</p></div>
  ${i.length?`<div class="card"><h2>Para acompanhar</h2>${i.map(homeItemHtml).join("")}</div>`:""}`;
}
function bindHome(){
  document.querySelectorAll("[data-hper]").forEach(b=>b.onclick=()=>{HOME.per=b.dataset.hper;go("home",true)});
  bindHomeAcoes(document);
  document.querySelectorAll("[data-hcard]").forEach(c=>c.onclick=()=>{
    const k=c.dataset.hcard;
    if(k==="ativos")go("pront");else if(k==="fluxo"){FIN.tab="fluxo";go("fin")}else openHomeLista(k);
  });
  if($("hnova"))$("hnova").onclick=()=>openTarefa(null,hojeIso());if($("hdoc"))$("hdoc").onclick=()=>openDocVal(null);
  bindTarefasComuns();
}

/* ---------- sugestão de folgas (não mexe em turno nem jornada) ---------- */
const escCfg=()=>({extra1236:2,extraSemana:0,minCob:1,...(S.config.escala_cfg||{})});
const eh1236=ig=>ig.escalaModo==="par"||ig.escalaModo==="impar"||(ig.escalaModo==="ciclo"&&(+ig.cicloTrab||1)===1&&(+(ig.cicloFolga??1))===1);
const baseTrabalha=(p,d)=>!!p.turno&&(!p.admissao||d>=p.admissao)&&(!p.desligamento||d<=p.desligamento)&&scheduledOn(p,d);
const SUG={meses:1,lista:null,sel:new Set()};
function sugerirFolgas(ano,mes0,nMeses){
  const cfg=escCfg(),hoje=hojeIso(),out={};
  const pessoas=integList().filter(i=>!semPonto(i)&&i.turno&&(i.situacao||"Ativo")!=="Desligado");
  const feriados={};for(let k=0;k<nMeses;k++)Object.assign(feriados,feriadosAno(new Date(ano,mes0+k,1).getFullYear()));
  const porCargo={};pessoas.forEach(p=>(porCargo[cargoDe(p)]=porCargo[cargoDe(p)]||[]).push(p));
  for(let k=0;k<nMeses;k++){
    const b=new Date(ano,mes0+k,1),y=b.getFullYear(),m=b.getMonth(),n=new Date(y,m+1,0).getDate();
    const dias=Array.from({length:n},(_,i)=>isoDate(new Date(y,m,i+1)));
    const trab={};pessoas.forEach(p=>{trab[p.id]={};dias.forEach(d=>trab[p.id][d]=escalaDia(p,d).on)});
    const cont=(cargo,d)=>porCargo[cargo].filter(p=>trab[p.id][d]).length;
    const falta={},esc_={},fixas={};
    pessoas.forEach(p=>{
      const alvo=typeof xfoAlvoP==="function"?xfoAlvoP(p,y,m,cfg):(eh1236(p)?cfg.extra1236:cfg.extraSemana);
      fixas[p.id]=dias.filter(d=>{const aj=ajusteDe(p.id,d);return aj&&aj.tipo==="folga"});
      const ja=fixas[p.id].filter(d=>baseTrabalha(p,d)).length;
      falta[p.id]=Math.max(0,alvo-ja);esc_[p.id]=[];
    });
    const ordem=[...pessoas].sort((a,b)=>cargoDe(a).localeCompare(cargoDe(b),"pt")||nomeInteg(a).localeCompare(nomeInteg(b),"pt"));
    const maxR=Math.max(0,...Object.values(falta));
    for(let r=1;r<=maxR;r++)for(const p of ordem){
      if(!falta[p.id])continue;
      const cargo=cargoDe(p),alvo=typeof xfoAlvoP==="function"?xfoAlvoP(p,y,m,cfg):(eh1236(p)?cfg.extra1236:cfg.extraSemana),ideal=(r/(alvo+1))*n,ja=[...fixas[p.id],...esc_[p.id].map(e=>e.dia)];
      let melhor=null;
      dias.forEach((d,idx)=>{
        if(d<hoje||!trab[p.id][d])return;
        const rest=cont(cargo,d)-1;
        let sc=rest*100-Math.abs(idx-ideal)*3-(feriados[d]?15:0);
        if(ja.some(x=>Math.abs(daysBetweenIso(x,d))<=3))sc-=80;
        if(!melhor||sc>melhor.sc)melhor={d,sc,rest};
      });
      if(!melhor){falta[p.id]=0;continue}
      trab[p.id][melhor.d]=false;
      esc_[p.id].push({dia:melhor.d,restantes:melhor.rest,unico:porCargo[cargo].length===1,baixo:melhor.rest<cfg.minCob});
      falta[p.id]--;
    }
    pessoas.forEach(p=>{if(esc_[p.id].length){(out[p.id]=out[p.id]||{ig:p,dias:[]}).dias.push(...esc_[p.id])}});
  }
  Object.values(out).forEach(o=>o.dias.sort((a,b)=>a.dia.localeCompare(b.dia)));
  return Object.values(out).sort((a,b)=>cargoDe(a.ig).localeCompare(cargoDe(b.ig),"pt")||nomeInteg(a.ig).localeCompare(nomeInteg(b.ig),"pt"));
}
function pgSugestoes(){
  const c=escCfg(),ini=ESCUI.start||isoDate(new Date()),sy=+ini.slice(0,4),sm=+ini.slice(5,7)-1;
  const dias=[];if(ESCUI.start&&ESCUI.end&&ESCUI.start<=ESCUI.end)for(let d=ESCUI.start;d<=ESCUI.end&&dias.length<=46;d=addDaysIso(d,1))dias.push(d);
  const gente=integList().filter(i=>!semPonto(i)&&i.turno),cargos=[...new Set(gente.map(cargoDe))].sort((a,b)=>a.localeCompare(b,"pt"));
  const cob=cargos.length&&dias.length&&dias.length<=46?`<h2 style="margin-top:14px">Cobertura por cargo (quantas pessoas trabalham em cada dia)</h2><div class="wrap"><table style="font-size:11px"><thead><tr><th style="position:sticky;left:0;background:var(--card)">Cargo</th>${dias.map(d=>`<th class="n" style="padding:4px 2px">${d.slice(8)}</th>`).join("")}</tr></thead><tbody>
    ${cargos.map(cg=>{const ps=gente.filter(i=>cargoDe(i)===cg);return `<tr><td style="position:sticky;left:0;background:var(--card);white-space:nowrap;font-weight:700">${esc(cg)}</td>${dias.map(d=>{const n=ps.filter(p=>escalaDia(p,d).on).length;const bg=n===0?"rgba(156,74,31,.25)":n<=c.minCob?"var(--madeira-clara)":"var(--verde-palido)";return `<td style="padding:2px"><div title="${brDate(d)}: ${n} pessoa(s)" style="min-width:18px;text-align:center;border-radius:4px;background:${bg};font-weight:700">${n}</div></td>`}).join("")}</tr>`}).join("")}</tbody></table></div>`:"";
  const res=SUG.lista;
  return `<div class="card"><h2>Sugestão de folgas — a escala se organiza sozinha</h2>
   <p class="sub" style="margin:0 0 10px">O sistema propõe em quais dias cada pessoa pode folgar, <b>sem mexer no turno nem na jornada</b>: ele escolhe dias de trabalho em que sobram colegas do mesmo cargo, espalha as folgas ao longo do mês e evita folgas coladas. Quem trabalha 12x36 tem direito às folgas extras abaixo (ajuste se a regra da casa for outra). Você escolhe o que aceitar.</p>
   <div class="row"><div><label>Folgas extras por mês — 12x36</label><input type="number" min="0" max="15" id="sgx1236" value="${c.extra1236}"></div>
    <div><label>Folgas extras por mês — demais escalas</label><input type="number" min="0" max="15" id="sgxsem" value="${c.extraSemana}"></div>
    <div><label>Mínimo de colegas do cargo trabalhando</label><input type="number" min="0" max="20" id="sgmin" value="${c.minCob}"></div>
    <div><label>Cargo que conta como cuidador (RDC 502)</label><input id="sgcuid" value="${esc(c.cargoCuid||"cuidador")}"></div>
    <div><label>Gerar para (a partir do mês da grade)</label><select id="sgmeses">${[1,2,3,6].map(n=>`<option value="${n}" ${SUG.meses===n?"selected":""}>${n} mês(es) — ${MESES_PT[sm]} ${sy}${n>1?" em diante":""}</option>`).join("")}</select></div></div>
   <div class="row" style="margin-top:12px"><button class="b" id="sggerar" style="flex:none">${ic("cal")} Gerar sugestões</button></div>
   ${res?(res.length?`<h2 style="margin-top:16px">Sugestões</h2>${res.map(o=>`<div class="doc" style="align-items:flex-start"><div class="grow"><div class="nm">${esc(nomeInteg(o.ig))}</div><div class="sub">${esc(cargoDe(o.ig))} · ${eh1236(o.ig)?"12x36":"escala semanal"}</div>
     <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">${o.dias.map(x=>{const key=o.ig.id+"|"+x.dia;return `<label class="chip ${x.baixo?"night":""}" style="cursor:pointer;display:inline-flex;gap:5px;align-items:center;margin:0;font-weight:400"><input type="checkbox" data-sugsel="${key}" ${SUG.sel.has(key)?"checked":""}> ${brDate(x.dia).slice(0,5)} ${WD3[pyWeekday(x.dia)]} · ${x.unico?"único no cargo":x.baixo?"fica "+x.restantes+" (baixa cobertura)":"ficam "+x.restantes+" no cargo"}</label>`}).join("")}</div></div></div>`).join("")}
     <div class="row" style="margin-top:12px"><button class="b" id="sgapply" style="flex:none">${ic("check")} Lançar as selecionadas (${SUG.sel.size})</button><button class="b sec" id="sgclear" style="flex:none">Descartar</button></div>
     <p class="sub" style="margin:8px 0 0">As folgas aceitas entram como "folga lançada" na grade e já valem para o cálculo do ponto. Você pode remover qualquer uma depois, clicando no dia.</p>`:`<div class="empty" style="margin-top:12px">Nada a sugerir: todos já têm as folgas do mês lançadas, ou não há dias futuros de trabalho no período escolhido.</div>`):""}
   ${cob}</div>`;
}
function bindSugestoes(){
  const sv=(k,el)=>el.onchange=()=>{put("config","escala_cfg",{...escCfg(),[k]:Math.max(0,+el.value||0)});toast("Regra salva.")};
  const a=$("sgx1236");if(!a)return;sv("extra1236",a);sv("extraSemana",$("sgxsem"));sv("minCob",$("sgmin"));$("sgcuid").onchange=e=>{put("config","escala_cfg",{...escCfg(),cargoCuid:e.target.value.trim()||"cuidador"});toast("Cargo salvo.")};
  $("sgmeses").onchange=e=>{SUG.meses=+e.target.value};
  $("sggerar").onclick=()=>{
    const ini=ESCUI.start||isoDate(new Date());
    SUG.lista=sugerirFolgas(+ini.slice(0,4),+ini.slice(5,7)-1,SUG.meses);
    SUG.sel=new Set(SUG.lista.flatMap(o=>o.dias.map(x=>o.ig.id+"|"+x.dia)));go("turnos",true);
  };
  document.querySelectorAll("[data-sugsel]").forEach(c=>c.onchange=()=>{c.checked?SUG.sel.add(c.dataset.sugsel):SUG.sel.delete(c.dataset.sugsel);const b=$("sgapply");if(b)b.lastChild.textContent=` Lançar as selecionadas (${SUG.sel.size})`});
  const ap=$("sgapply");if(ap)ap.onclick=()=>{
    if(!SUG.sel.size)return toast("Marque ao menos uma sugestão.",true);
    const novos=[...SUG.sel].map(k=>{const[id,d]=k.split("|");return{id:uid8(),uid:id,tipo:"folga",de:d,ate:d,turno:null,obs:"Sugestão do sistema",em:new Date().toISOString()}});
    escMutate(l=>[...l,...novos]);
    SUG.lista=null;SUG.sel=new Set();toast(`${novos.length} folga(s) lançada(s).`);afterOc();
  };
  const cl=$("sgclear");if(cl)cl.onclick=()=>{SUG.lista=null;SUG.sel=new Set();go("turnos",true)};
}

