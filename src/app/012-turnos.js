/* ================= TURNOS ================= */
let TURN_DRAFT=null;
function pgTurnos(){
  TURN_DRAFT=TURN_DRAFT||turnosList().map(t=>({...t,dias:{...(t.dias||{})}}));
  const shifts=TURN_DRAFT;
  return banner("","Escalas e turnos","Turnos da casa, escala de cada integrante, folgas, trocas de plantão e alertas de cobertura.","cal")+noStore()+`
  <div class="card"><h2>Turnos da casa</h2>
   <p class="sub" style="margin:0 0 10px">Escreva os períodos como 08:00-12:00, 13:30-17:30. Se algum dia da semana tiver horário diferente — sexta mais curta, sábado só de manhã — abra "Personalizar por dia" e ajuste só aquele dia; o resto segue o padrão.</p>
   <div id="tl">${shifts.map((t,i)=>turnoRow(t,i)).join("")}</div>
   <div class="row" style="margin-top:6px"><button class="b sec" id="tadd" style="flex:none">${ic("plus")} Novo turno</button><button class="b" id="tsave" style="flex:none">Salvar turnos</button></div></div>
  ${pgFeriados()}
  ${pgEscalaCalendario()}
  ${pgAlertasEscala()}
  ${pgSugestoes()}
  <div class="card"><h2>Escala dos integrantes</h2>
   <p class="sub" style="margin:0 0 10px">Marque os dias em que cada integrante trabalha. Para plantão 12x36 (ou qualquer ciclo "trabalha X, folga Y"), use o modo Ciclo — funciona certo mesmo virando o mês. Pares/ímpares é um atalho rápido, mas falha em meses de 31 dias.</p>
   ${integList().filter(i=>!semPonto(i)).length?`<div class="wrap"><table><thead><tr><th style="width:200px">Integrante</th><th style="width:150px">Turno</th><th>Quando trabalha</th></tr></thead><tbody>
   ${integList().filter(i=>!semPonto(i)).map(i=>`<tr data-id="${i.id}"><td><b>${esc(nomeInteg(i))}</b><div class="sub">${esc(i.depto||"Outro")}${i.uid!=null?" · ID "+i.uid:""}</div></td>
    <td><select data-e="turno"><option value="">Folga / sem escala</option>${turnosList().map(t=>`<option value="${t.no}" ${String(i.turno)===String(t.no)?"selected":""}>${t.no} · ${esc(t.nome||t.texto)}</option>`).join("")}</select></td>
    <td><div class="escalabox">
     <select data-e="modo" style="max-width:220px;margin-bottom:8px"><option value="semana" ${(i.escalaModo||"semana")==="semana"?"selected":""}>Dias fixos da semana</option><option value="ciclo" ${i.escalaModo==="ciclo"?"selected":""}>Ciclo (ex.: 12x36, 6x1…)</option><option value="par" ${i.escalaModo==="par"?"selected":""}>Dias pares do mês</option><option value="impar" ${i.escalaModo==="impar"?"selected":""}>Dias ímpares do mês</option></select>
     ${modoFields(i)}${escHistResumo(i)}</div></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum integrante cadastrado. Carregue o arquivo do relógio na aba Ponto ou cadastre no Prontuário.</div>`}</div>`;
}
function turnoRow(t,i){
  const dias=t.dias||{},base=shiftSummary(t.texto);
  return `<div class="escalabox" style="margin-bottom:10px" data-i="${i}">
   <div class="row"><div style="flex:0 0 60px"><label>Nº</label><input type="number" min="1" data-f="no" value="${t.no}"></div>
   <div style="flex:1.3"><label>Nome</label><input data-f="nome" value="${esc(t.nome||"")}"></div>
   <div style="flex:2"><label>Períodos padrão</label><input data-f="texto" value="${esc(t.texto)}"></div>
   <div style="flex:0 0 120px;padding-bottom:8px">${base?`<span class="pill s-ok">${fmtHHMM(base.min)}/dia</span>${base.night?` <span class="chip night">noturno</span>`:""}`:`<span class="pill s-falta">inválido</span>`}</div>
   <button class="b sec sm" data-rm="${i}" title="Remover turno" style="align-self:flex-end">${ic("trash")}</button></div>
   <details ${Object.keys(dias).length?"open":""}><summary>Personalizar por dia da semana (jornadas diferentes, ex.: 9h Seg–Qui e 8h na Sex)</summary>
   <div class="grid g2" style="margin-top:8px">
   ${WD_FULL.map((lbl,w)=>{
     const on=dias[w]!=null,val=on?dias[w]:"",s=shiftSummary(on&&val?val:t.texto);
     return `<div><label style="display:flex;align-items:center;gap:6px;font-weight:600;margin:0 0 3px"><input type="checkbox" data-dayon="${w}" ${on?"checked":""}> ${lbl}
      <span class="sub" style="margin-left:auto">${s?fmtHHMM(s.min):"—"}</span></label>
      <input data-dayval="${w}" placeholder="${esc(t.texto)} (padrão)" value="${esc(val)}" ${on?"":"disabled"}></div>`;
   }).join("")}
   </div></details></div>`;
}
const ESCUI={start:null,end:null,group:"nome",cargo:""};
const MESES_PT=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const cargoDe=i=>String(i.cargo||"").trim()||"Sem cargo";
function pgEscalaCalendario(){
  if(!ESCUI.start||!ESCUI.end){const t=new Date();ESCUI.start=isoDate(new Date(t.getFullYear(),t.getMonth(),1));ESCUI.end=isoDate(new Date(t.getFullYear(),t.getMonth()+1,0))}
  const days=[];if(ESCUI.start<=ESCUI.end)for(let d=ESCUI.start;d<=ESCUI.end&&days.length<=46;d=addDaysIso(d,1))days.push(d);
  const sy=+ESCUI.start.slice(0,4),sm=+ESCUI.start.slice(5,7)-1;
  const mesCheio=ESCUI.start===isoDate(new Date(sy,sm,1))&&ESCUI.end===isoDate(new Date(sy,sm+1,0));
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-3,sy);y<=Math.max(y0+3,sy);y++)anos.push(y);
  let people=integList().filter(i=>!semPonto(i)&&(i.turno||escalaEx().some(a=>a.uid===i.id)));
  const cargos=[...new Set(people.map(cargoDe))].sort((a,b)=>a==="Sem cargo"?1:b==="Sem cargo"?-1:a.localeCompare(b,"pt"));
  if(ESCUI.cargo&&!cargos.includes(ESCUI.cargo))ESCUI.cargo="";
  if(ESCUI.cargo)people=people.filter(i=>cargoDe(i)===ESCUI.cargo);
  const cell=(ig,d)=>{
    const e=escalaDia(ig,d),aj=e.ajuste;
    let bg="var(--areia-esc)",ring="",tit=e.on?"trabalha":"folga";
    if(e.antes||e.depois){bg="transparent";ring=";border:1px dashed var(--line)";tit=e.antes?"antes da admissão":"depois do desligamento"}
    else if(aj&&aj.tipo==="folga"){bg="var(--azul-palido)";ring=";box-shadow:inset 0 0 0 2px var(--azul-mar)";tit="folga lançada"+(aj.obs?" — "+aj.obs:"")}
    else if(aj){bg="var(--verde-medio)";ring=";box-shadow:0 0 0 2px var(--madeira)";tit="escala lançada"+(aj.obs?" — "+aj.obs:"")}
    else if(e.on)bg="var(--verde-medio)";
    return `<td style="padding:2px"><button type="button" data-escd="${ig.id}|${d}" title="${brDate(d)} — ${tit}. Clique para ajustar." style="width:18px;height:18px;border:0;border-radius:4px;padding:0;cursor:pointer;background:${bg}${ring}"></button></td>`;
  };
  const linha=ig=>`<tr><td style="position:sticky;left:0;background:var(--card);white-space:nowrap;font-weight:700">${esc(nomeInteg(ig))}${ESCUI.group==="nome"?`<span class="sub" style="font-weight:400;margin-left:6px">${esc(cargoDe(ig))}</span>`:""}</td>${days.map(d=>cell(ig,d)).join("")}</tr>`;
  let corpo;
  if(ESCUI.group==="cargo"){
    corpo=cargos.filter(c=>people.some(i=>cargoDe(i)===c)).map(c=>{
      const ps=people.filter(i=>cargoDe(i)===c);
      return `<tr><td colspan="${days.length+1}" style="position:sticky;left:0;background:var(--bege);font-weight:700;color:var(--madeira);padding:6px 8px">${esc(c)} <span class="sub" style="font-weight:400">· ${ps.length} pessoa(s)</span></td></tr>`+ps.map(linha).join("");
    }).join("");
  }else corpo=people.map(linha).join("");
  return `<div class="card"><h2>Escala do período — quem trabalha em cada dia</h2>
   <p class="sub" style="margin:0 0 10px">Mostra os dias de trabalho e de folga de cada integrante a partir do turno e da escala configurados. <b>Clique num quadradinho</b> para lançar uma folga (que vai ocorrer ou que já ocorreu) ou lançar a escala de um dia que a pessoa trabalhou fora do padrão.</p>
   <div class="row" style="align-items:flex-end;margin-bottom:10px">
    <button type="button" class="b sec sm" id="escprev" title="Mês anterior" style="flex:none">◀</button>
    <div><label>Mês</label><select id="escmes">${mesCheio?"":`<option value="" selected>Período personalizado</option>`}${MESES_PT.map((n,k)=>`<option value="${k}" ${mesCheio&&k===sm?"selected":""}>${n}</option>`).join("")}</select></div>
    <div><label>Ano</label><select id="escano">${anos.map(y=>`<option ${y===sy?"selected":""}>${y}</option>`).join("")}</select></div>
    <button type="button" class="b sec sm" id="escnext" title="Próximo mês" style="flex:none">▶</button>
    <div><label>De</label><input type="date" id="escstart" value="${ESCUI.start}"></div><div><label>Até</label><input type="date" id="escend" value="${ESCUI.end}"></div></div>
   <div class="row" style="margin-bottom:10px">
    <div><label>Organizar por</label><select id="escgrupo"><option value="nome" ${ESCUI.group==="nome"?"selected":""}>Nome (A–Z)</option><option value="cargo" ${ESCUI.group==="cargo"?"selected":""}>Cargo (agrupado)</option></select></div>
    <div><label>Cargo</label><select id="esccargo"><option value="">Todos os cargos</option>${cargos.map(c=>`<option ${c===ESCUI.cargo?"selected":""}>${esc(c)}</option>`).join("")}</select></div></div>
   ${!days.length?`<div class="callout sand">Período inválido: a data "De" precisa ser antes da data "Até".</div>`:days.length>46?`<div class="callout sand">Escolha um período de até 45 dias para ver a grade.</div>`:
   !people.length?`<div class="empty">Nenhum integrante com turno definido${ESCUI.cargo?" nesse cargo":" ainda"}. Defina o turno de cada um logo abaixo.</div>`:
   `<div class="wrap"><table style="font-size:11px"><thead><tr><th style="position:sticky;left:0;background:var(--card);z-index:1">Integrante</th>${days.map(d=>`<th class="n" style="padding:4px 2px">${d.slice(8)}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table></div>
   <div class="legend" style="margin-top:10px"><span><i style="background:var(--verde-medio)"></i>Trabalha</span><span><i style="background:var(--areia-esc)"></i>Folga</span>
    <span><i style="background:var(--azul-palido);box-shadow:inset 0 0 0 2px var(--azul-mar)"></i>Folga lançada</span>
    <span><i style="background:var(--verde-medio);box-shadow:0 0 0 2px var(--madeira)"></i>Escala lançada</span>
    <span><i style="background:transparent;border:1px dashed var(--line)"></i>Antes da admissão / após desligamento</span></div>`}
   </div>`;
}
function escHistResumo(i){
  const h=(i.escalaHist||[]).slice().sort((a,b)=>a.ate.localeCompare(b.ate));
  return `<div class="sub" style="margin:8px 0 0">${h.length?"Antes: "+h.map(x=>`<b>${esc(escalaNome(x))}</b> até ${brDate(x.ate)}`).join(" · ")+". Acima, a escala atual. ":""}<button type="button" class="lnk" data-eschist="${i.id}">${h.length?"Ver ou mudar escalas anteriores":"Mudou de escala? Lançar a escala que valia antes"}</button></div>`;
}
// escala com data: a configuração de cima vale a partir do dia seguinte ao "até" de cada escala anterior
function openEscalaHist(igId){
  const ig=S.integrantes[igId];if(!ig)return toast("Integrante não encontrado.",true);
  const turnos=turnosList(),F={turno:ig.turno||(turnos[0]&&turnos[0].no)||"",escalaModo:"semana",dias:[0,1,2,3,4,5],cicloTrab:1,cicloFolga:1,cicloInicio:"",ate:""};
  const ov=openModal(`<h3>Escalas anteriores — ${esc(nomeInteg(ig))}</h3>
   <div class="sub" style="margin-bottom:10px">Use quando a pessoa mudou de escala (ex.: era <b>44h semanais até 22/10</b> e passou para <b>12x36</b>). A escala configurada na aba Turnos vale <b>depois</b> da última data lançada aqui. O cálculo do ponto e a folha de ponto usam a escala certa de cada dia.</div>
   <div id="ehlista"></div>
   <h2 style="margin-top:14px">Lançar escala anterior</h2>
   <div class="row"><div><label>Valeu até (último dia)</label><input type="date" id="ehate"></div>
    <div><label>Turno</label><select id="ehturno">${turnos.map(t=>`<option value="${t.no}" ${String(t.no)===String(F.turno)?"selected":""}>${t.no} · ${esc(t.nome||t.texto)} (${esc(t.texto)})</option>`).join("")}</select></div></div>
   <label>Como trabalhava</label><select id="ehmodo"><option value="semana">Dias fixos da semana (ex.: 44h semanais)</option><option value="ciclo">Ciclo (ex.: 12x36, 6x1…)</option><option value="par">Dias pares do mês</option><option value="impar">Dias ímpares do mês</option></select>
   <div id="ehcampos" class="escalabox" style="margin-top:8px"></div>
   <div class="err" id="eherr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ehcx">Fechar</button>${podeEd("turnos")||podeEd("ponto")?'<button class="b" id="ehsv">Lançar</button>':""}</div>`);
  const $o=q=>ov.querySelector(q);
  const campos=()=>{
    F.escalaModo=$o("#ehmodo").value;
    $o("#ehcampos").innerHTML=F.escalaModo==="semana"?`<div class="daypicker">${WD.map((d,k)=>`<button type="button" class="daypill ${F.dias.includes(k)?"on":""}" data-ehd="${k}" title="${WD_FULL[k]}">${d}</button>`).join("")}</div>`
     :F.escalaModo==="ciclo"?`<div class="cicline">Trabalha <input type="number" min="1" id="ehtrab" value="${F.cicloTrab}" style="width:60px"> dia(s), folga <input type="number" min="0" id="ehfolga" value="${F.cicloFolga}" style="width:60px"> dia(s). Uma data em que trabalhou: <input type="date" id="ehini" value="${F.cicloInicio}"></div>`
     :`<div class="sub">Trabalhava nos dias ${F.escalaModo==="par"?"pares":"ímpares"} do mês.</div>`;
    ov.querySelectorAll("[data-ehd]").forEach(b=>b.onclick=()=>{const k=+b.dataset.ehd;F.dias=F.dias.includes(k)?F.dias.filter(x=>x!==k):[...F.dias,k].sort();b.classList.toggle("on")});
  };
  $o("#ehmodo").onchange=campos;campos();
  const salva=h=>{put("integrantes",ig.id,{...strip(S.integrantes[ig.id]),escalaHist:h});BHCACHE.clear();if(POINT.result)calcular(false);afterOc()};
  const paint=()=>{
    const h=(S.integrantes[ig.id].escalaHist||[]).slice().sort((a,b)=>a.ate.localeCompare(b.ate));
    let ini=ig.admissao||"";
    $o("#ehlista").innerHTML=(h.length?h.map(x=>{const t=`<div class="doc"><div class="grow"><div class="nm">${esc(escalaNome(x))}</div><div class="sub">${ini?"de "+brDate(ini)+" ":""}até ${brDate(x.ate)} · turno ${esc(x.turno)}</div></div><button class="b sec sm" data-ehdel="${x.ate}" title="Remover">${ic("trash")}</button></div>`;ini=addDaysIso(x.ate,1);return t}).join(""):`<div class="empty">Nenhuma escala anterior lançada.</div>`)
     +`<div class="doc"><div class="grow"><div class="nm">${esc(escalaNome(ig))} <span class="chip">atual</span></div><div class="sub">${ini?"a partir de "+brDate(ini):"sempre"} · muda na aba Turnos</div></div></div>`;
    ov.querySelectorAll("[data-ehdel]").forEach(b=>b.onclick=async()=>{if(!await askConfirm("Remover esta escala anterior?","Remover"))return;salva((S.integrantes[ig.id].escalaHist||[]).filter(x=>x.ate!==b.dataset.ehdel));toast("Escala anterior removida.");paint()});
  };
  paint();
  $o("#ehcx").onclick=()=>ov.remove();
  const sv=$o("#ehsv");if(sv)sv.onclick=()=>{
    const er=m=>$o("#eherr").textContent=m,ate=$o("#ehate").value,turno=$o("#ehturno").value;
    if(!ate)return er("Informe o último dia em que essa escala valeu.");
    if(!turno)return er("Escolha o turno. Se não existir, crie em Turnos.");
    const x={ate,turno,escalaModo:F.escalaModo};
    if(F.escalaModo==="semana"){if(!F.dias.length)return er("Marque os dias da semana em que trabalhava.");x.dias=F.dias.slice()}
    if(F.escalaModo==="ciclo"){x.cicloTrab=+$o("#ehtrab").value||1;x.cicloFolga=+$o("#ehfolga").value||0;x.cicloInicio=$o("#ehini").value||"";if(!x.cicloInicio)return er("Informe uma data em que a pessoa trabalhou nesse ciclo.")}
    salva([...(S.integrantes[ig.id].escalaHist||[]).filter(h=>h.ate!==ate),x]);
    toast("Escala anterior lançada. O ponto foi recalculado.");$o("#ehate").value="";paint();
  };
}
function openEscalaAjuste(igId,day,opts){
  const ig=S.integrantes[igId];if(!ig){toast("Integrante não encontrado.",true);return}
  opts=opts||{};
  const turnos=turnosList();
  const lista=()=>escalaEx().filter(a=>a.uid===igId).sort((a,b)=>b.de.localeCompare(a.de));
  const ov=openModal(`<h3>${esc(nomeInteg(ig))}</h3>
   <div class="sub" style="margin-bottom:10px">Ajustar a escala em dias específicos. Vale para dias que ainda vão acontecer e também para dias que já passaram.</div>
   <label>O que lançar</label><select id="ejtipo"><option value="folga" ${opts.tipo==="folga"?"selected":""}>Folga — não trabalha nesse(s) dia(s)</option><option value="trabalho" ${opts.tipo==="trabalho"?"selected":""}>Trabalha — lançar a escala nesse(s) dia(s)</option></select>
   <div class="row"><div><label>De</label><input type="date" id="ejde" value="${day}"></div><div><label>Até (igual ao "De" se for um dia só)</label><input type="date" id="ejate" value="${day}"></div></div>
   <div id="ejturnobox" style="display:none"><label>Turno desse(s) dia(s)</label><select id="ejturno">${turnos.map(t=>`<option value="${t.no}" ${String(t.no)===String(ig.turno)?"selected":""}>${t.no} · ${esc(t.nome||t.texto)} (${esc(t.texto)})</option>`).join("")}</select></div>
   <label>Observação (opcional)</label><input id="ejobs" placeholder="Ex.: troca de plantão, férias, cobertura">
   <div class="err" id="ejerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ejcx">Fechar</button><button class="b" id="ejsv">Lançar</button></div>
   <div id="ejlista"></div>`);
  const showTurno=()=>{ov.querySelector("#ejturnobox").style.display=ov.querySelector("#ejtipo").value==="trabalho"?"block":"none"};
  ov.querySelector("#ejtipo").onchange=showTurno;showTurno();
  const paintLista=()=>{
    const l=lista();
    ov.querySelector("#ejlista").innerHTML=l.length?`<h2 style="margin-top:20px">Ajustes lançados para esta pessoa</h2>`+l.map(a=>`<div class="doc"><div class="grow"><div class="nm">${a.tipo==="folga"?"Folga":"Escala lançada"} · ${brDate(a.de)}${a.ate!==a.de?" a "+brDate(a.ate):""}</div>
      <div class="sub">${a.tipo==="trabalho"?"Turno "+esc(a.turno||ig.turno||"—")+(a.obs?" · ":""):""}${esc(a.obs||"")}</div></div>
      <button class="b sec sm" data-ejdel="${a.id}" title="Remover ajuste">${ic("trash")}</button></div>`).join(""):"";
    ov.querySelectorAll("[data-ejdel]").forEach(b=>b.onclick=()=>{
      escMutate(l=>l.filter(x=>x.id!==b.dataset.ejdel));
      toast("Ajuste removido.");afterOc();paintLista();if(opts.onSave)opts.onSave();
    });
  };
  paintLista();
  ov.querySelector("#ejcx").onclick=()=>ov.remove();
  ov.querySelector("#ejsv").onclick=()=>{
    const tipo=ov.querySelector("#ejtipo").value,de=ov.querySelector("#ejde").value,ate=ov.querySelector("#ejate").value,obs=ov.querySelector("#ejobs").value.trim();
    const er=m=>ov.querySelector("#ejerr").textContent=m;
    if(!de||!ate)return er("Informe as datas.");if(ate<de)return er("A data final precisa ser igual ou depois da inicial.");
    let turno=null;
    if(tipo==="trabalho"){turno=+ov.querySelector("#ejturno").value||null;if(!turno)return er("Escolha o turno desse(s) dia(s). Se ainda não existe nenhum, crie em Turnos.")}
    escMutate(l=>[...l,{id:uid8(),uid:igId,tipo,de,ate,turno,obs,em:new Date().toISOString()}]);
    toast(tipo==="folga"?"Folga lançada.":"Escala lançada.");afterOc();ov.remove();if(opts.onSave)opts.onSave();
  };
}
function pgFeriados(){
  const y=new Date().getFullYear(),off=feriadosOff(),extra=feriadosExtra();
  const nac=[...nationalHolidays(y).map(h=>[...h,y]),...nationalHolidays(y+1).map(h=>[...h,y+1])];
  return `<div class="card"><h2>Calendário de feriados</h2>
   <p class="sub" style="margin:0 0 10px">Feriados nacionais já vêm marcados e valem para qualquer período calculado. Desmarque os que a casa não observa e adicione feriados estaduais, municipais ou pontos facultativos — fica salvo para sempre.</p>
   <div class="wrap"><table><thead><tr><th style="width:28px"></th><th>Data</th><th>Feriado</th></tr></thead><tbody>
   ${nac.map(([d,nome])=>`<tr><td><input type="checkbox" data-holoff="${d}" ${off.has(d)?"":"checked"}></td><td>${brDate(d)}</td><td>${esc(nome)}</td></tr>`).join("")}
   ${extra.map((x,i)=>`<tr><td><input type="checkbox" checked disabled></td><td>${brDate(x.dia)}</td><td>${esc(x.nome)} <button class="lnk" data-delextra="${i}" style="color:var(--bad);margin-left:6px">remover</button></td></tr>`).join("")}
   </tbody></table></div>
   <div class="row" style="margin-top:10px;align-items:flex-end"><div><label>Novo feriado</label><input type="date" id="fnova"></div>
   <div style="flex:2"><label>Nome</label><input id="fnome" placeholder="Ex.: Aniversário de Caraguatatuba, ponto facultativo"></div>
   <button class="b sec" id="faddbtn" style="flex:none">${ic("plus")} Adicionar</button></div></div>`;
}
function modoFields(i){
  const modo=i.escalaModo||"semana";
  if(modo==="ciclo"){
    const dm=WD[pyWeekday(i.cicloInicio||isoDate(new Date()))];
    return `<div class="cicline">Trabalha <span class="stepwrap"><input type="number" min="1" data-e="cicloTrab" value="${i.cicloTrab||1}" title="Dias trabalhados seguidos"></span> dia(s), depois folga <span class="stepwrap"><input type="number" min="0" data-e="cicloFolga" value="${i.cicloFolga??1}" title="Dias de folga seguidos"></span> dia(s).</div>
     <div class="cicline" style="margin-top:6px">Uma data em que trabalhou: <input type="date" data-e="cicloInicio" value="${i.cicloInicio||""}"> <button type="button" class="b sec sm" data-preset1212="${i.id}">12×36</button> <button type="button" class="b sec sm" data-preset61="${i.id}">6×1</button></div>
     <div class="sub" style="margin-top:6px">${i.cicloInicio?`Ex.: ${brDate(i.cicloInicio)} (${dm}) foi dia trabalhado.`:"Escolha qualquer data marcada como dia trabalhado para calibrar o ciclo."}</div>`;
  }
  if(modo==="par"||modo==="impar")return `<div class="sub">Trabalha automaticamente nos dias <b>${modo==="par"?"pares (2, 4, 6…)":"ímpares (1, 3, 5…)"}</b> do mês.</div>`;
  return `<div class="daypicker">${WD.map((d,k)=>`<button type="button" class="daypill ${(i.dias||[0,1,2,3,4]).includes(k)?"on":""}" data-day="${k}" title="${["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"][k]}">${d}</button>`).join("")}</div>`;
}
function bindTurnos(){
  const D=TURN_DRAFT;
  $("tl").querySelectorAll("[data-f]").forEach(inp=>inp.onchange=()=>{
    const i=+inp.closest("[data-i]").dataset.i;D[i][inp.dataset.f]=inp.dataset.f==="no"?+inp.value:inp.value;go("turnos",true)});
  $("tl").querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{D.splice(+b.dataset.rm,1);go("turnos",true)});
  $("tl").querySelectorAll("[data-dayon]").forEach(cb=>cb.onchange=()=>{
    const i=+cb.closest("[data-i]").dataset.i,w=+cb.dataset.dayon,t=D[i];t.dias=t.dias||{};
    if(cb.checked)t.dias[w]=t.dias[w]||t.texto;else delete t.dias[w];
    go("turnos",true);
  });
  $("tl").querySelectorAll("[data-dayval]").forEach(inp=>inp.onchange=()=>{
    const i=+inp.closest("[data-i]").dataset.i,w=+inp.dataset.dayval,t=D[i];t.dias=t.dias||{};t.dias[w]=inp.value;go("turnos",true);
  });
  $("tadd").onclick=()=>{D.push({no:Math.max(0,...D.map(t=>+t.no||0))+1,nome:"",texto:"08:00-17:00",dias:{}});go("turnos",true)};
  $("tsave").onclick=()=>{
    const nos=D.map(t=>+t.no);
    if(new Set(nos).size!==nos.length||nos.some(n=>!n))return toast("Os números dos turnos precisam ser únicos.",true);
    for(const t of D){
      if(!shiftSummary(t.texto))return toast(`Turno ${t.no}: período padrão inválido.`,true);
      for(const w in(t.dias||{}))if(t.dias[w]&&!shiftSummary(t.dias[w]))return toast(`Turno ${t.no}: período inválido em ${WD_FULL[w]}.`,true);
    }
    saveCfg({turnos:D.map(t=>({no:+t.no,nome:t.nome||"",texto:t.texto,dias:{...(t.dias||{})}}))});toast("Turnos salvos.");TURN_DRAFT=null;
    if(POINT.result)calcular(false);setTimeout(()=>go("turnos",true),50);
  };
  document.querySelectorAll("[data-holoff]").forEach(cb=>cb.onchange=()=>{
    const d=cb.dataset.holoff,off=cfgG().feriadosOff||[];
    const novo=cb.checked?off.filter(x=>x!==d):[...new Set([...off,d])];
    saveCfg({feriadosOff:novo});if(POINT.result)calcular(false);toast("Calendário atualizado.");setTimeout(()=>go("turnos",true),50);
  });
  document.querySelectorAll("[data-delextra]").forEach(b=>b.onclick=()=>{
    const arr=[...feriadosExtra()];arr.splice(+b.dataset.delextra,1);
    saveCfg({feriadosExtra:arr});if(POINT.result)calcular(false);toast("Feriado removido.");setTimeout(()=>go("turnos",true),50);
  });
  document.querySelectorAll("[data-escd]").forEach(b=>b.onclick=()=>{const[id,d]=b.dataset.escd.split("|");openEscalaAjuste(id,d)});
  document.querySelectorAll("[data-eschist]").forEach(b=>b.onclick=()=>openEscalaHist(b.dataset.eschist));
  bindSugestoes();bindAlertas();
  const es=$("escstart"),ee=$("escend");
  if(es)es.onchange=()=>{ESCUI.start=es.value;setTimeout(()=>go("turnos",true),0)};
  if(ee)ee.onchange=()=>{ESCUI.end=ee.value;setTimeout(()=>go("turnos",true),0)};
  const goMes=(y,m)=>{ESCUI.start=isoDate(new Date(y,m,1));ESCUI.end=isoDate(new Date(y,m+1,0));go("turnos",true)};
  const baseY=()=>+(ESCUI.start||isoDate(new Date())).slice(0,4),baseM=()=>+(ESCUI.start||isoDate(new Date())).slice(5,7)-1;
  const em=$("escmes"),ea=$("escano");
  if(em)em.onchange=()=>{if(em.value!=="")goMes(+ea.value,+em.value)};
  if(ea)ea.onchange=()=>goMes(+ea.value,em&&em.value!==""?+em.value:baseM());
  const ep=$("escprev"),en=$("escnext");
  if(ep)ep.onclick=()=>goMes(baseY(),baseM()-1);
  if(en)en.onclick=()=>goMes(baseY(),baseM()+1);
  const eg=$("escgrupo"),ec=$("esccargo");
  if(eg)eg.onchange=()=>{ESCUI.group=eg.value;go("turnos",true)};
  if(ec)ec.onchange=()=>{ESCUI.cargo=ec.value;go("turnos",true)};
  const fa=$("faddbtn");if(fa)fa.onclick=()=>{
    const d=$("fnova").value,nome=$("fnome").value.trim();
    if(!d||!nome)return toast("Informe a data e o nome do feriado.",true);
    saveCfg({feriadosExtra:[...feriadosExtra(),{dia:d,nome}]});if(POINT.result)calcular(false);
    toast("Feriado adicionado.");setTimeout(()=>go("turnos",true),50);
  };
  document.querySelectorAll("tr[data-id]").forEach(tr=>{
    const save=()=>{
      const ig=S.integrantes[tr.dataset.id];if(!ig)return;
      const o={...strip(ig),turno:tr.querySelector("[data-e=turno]").value,escalaModo:tr.querySelector("[data-e=modo]").value};
      const pills=tr.querySelectorAll(".daypill");if(pills.length)o.dias=[...pills].filter(b=>b.classList.contains("on")).map(b=>+b.dataset.day);
      const ct=tr.querySelector("[data-e=cicloTrab]"),cf=tr.querySelector("[data-e=cicloFolga]"),ci=tr.querySelector("[data-e=cicloInicio]");
      if(ct)o.cicloTrab=+ct.value||1;if(cf)o.cicloFolga=+cf.value||0;if(ci)o.cicloInicio=ci.value||"";
      put("integrantes",ig.id,o);if(POINT.result)calcular(false);
    };
    tr.querySelector("[data-e=turno]").onchange=()=>{save();toast("Escala atualizada.")};
    tr.querySelector("[data-e=modo]").onchange=()=>{save();toast("Escala atualizada.");go("turnos",true)};
    tr.querySelectorAll("[data-e=cicloTrab],[data-e=cicloFolga],[data-e=cicloInicio]").forEach(el=>el.onchange=()=>{save();toast("Escala atualizada.")});
    tr.querySelectorAll(".daypill").forEach(b=>b.onclick=()=>{b.classList.toggle("on");save();toast("Escala atualizada.")});
    const p1=tr.querySelector("[data-preset1212]"),p2=tr.querySelector("[data-preset61]");
    if(p1)p1.onclick=()=>{tr.querySelector("[data-e=cicloTrab]").value=1;tr.querySelector("[data-e=cicloFolga]").value=1;save();toast("Ciclo 12×36 aplicado.");go("turnos",true)};
    if(p2)p2.onclick=()=>{tr.querySelector("[data-e=cicloTrab]").value=6;tr.querySelector("[data-e=cicloFolga]").value=1;save();toast("Ciclo 6×1 aplicado.");go("turnos",true)};
  });
}

