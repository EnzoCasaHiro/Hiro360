/* ============ Agenda: reagendar, excluir e arrastar tarefas ============ */
const tarDias=(a,b)=>Math.round((new Date(b+"T12:00")-new Date(a+"T12:00"))/864e5);
const tarDataOk=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>="2000-01-01"&&d<="2100-12-31";
function tarMove(id,data,hora,comSeguintes){
  const t=tarAll().find(x=>x.id===id);if(!t)return false;
  const delta=tarDias(t.data,data);
  tarMutate(l=>l.map(x=>x.id===id?{...x,data,...(hora!==undefined?{hora}:{})}:(comSeguintes&&t.grupo&&x.grupo===t.grupo&&x.data>t.data)?{...x,data:delta?addDaysIso(x.data,delta):x.data}:x));
  return true;
}
function openTarReagenda(id){
  const t=tarAll().find(x=>x.id===id);if(!t)return;
  if(!podeEd("agenda"))return toast("Seu perfil não permite alterar tarefas.",true);
  const seg=t.grupo?tarAll().filter(x=>x.grupo===t.grupo&&x.data>t.data):[];
  const ov=openModal(`<h3>Reagendar tarefa</h3><p>${esc(t.titulo)}<br><span class="sub">Hoje marcada para ${brDate(t.data)}${t.hora?" às "+esc(t.hora):""}</span></p>
   <div class="row"><div><label>Nova data</label><input type="date" id="rgd" value="${t.data}"></div><div><label>Hora (opcional)</label><input type="time" id="rgh" value="${esc(t.hora||"")}"></div></div>
   <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${[["amanha","Amanhã"],["sem","+ 1 semana"],["sem2","+ 2 semanas"],["mes","+ 1 mês"],["seg","Segunda que vem"]].map(([k,l])=>`<button type="button" class="b sec sm" data-rgq="${k}">${l}</button>`).join("")}</div>
   ${seg.length?`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="rgseg"> Mover também as ${seg.length} seguinte(s) da série, mantendo o intervalo</label>`:""}
   <div class="err" id="rgerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="rgcx">Cancelar</button><button class="b" id="rgsv">Reagendar</button></div>`);
  const g=s=>ov.querySelector(s);
  ov.querySelectorAll("[data-rgq]").forEach(b=>b.onclick=()=>{
    const cur=tarDataOk(g("#rgd").value)?g("#rgd").value:t.data,k=b.dataset.rgq,h=hojeIso();
    g("#rgd").value=k==="amanha"?addDaysIso(h,1):k==="sem"?addDaysIso(cur,7):k==="sem2"?addDaysIso(cur,14):k==="mes"?addMesesIso(cur,1):addDaysIso(h,7-pyWeekday(h))});
  g("#rgcx").onclick=()=>ov.remove();
  let feito=false;
  g("#rgsv").onclick=()=>{
    if(feito)return;const d=g("#rgd").value;
    if(!tarDataOk(d))return g("#rgerr").textContent="Confira a data (ano inválido).";
    feito=true;tarMove(id,d,g("#rgh").value,!!(g("#rgseg")&&g("#rgseg").checked));
    ov.remove();toast("Tarefa reagendada para "+brDate(d)+".");go(ROUTE,true);
  };
}
function tarBindExtra(){
  document.querySelectorAll("[data-tarresch]").forEach(b=>b.onclick=e=>{e.stopPropagation();openTarReagenda(b.dataset.tarresch)});
  if(!podeEd("agenda"))return;
  document.querySelectorAll(".cev[data-tarid]").forEach(c=>{c.ondragstart=e=>{e.dataTransfer.setData("text/plain",c.dataset.tarid);e.dataTransfer.effectAllowed="move"}});
  document.querySelectorAll(".dc[data-agdia]").forEach(c=>{
    c.ondragover=e=>{e.preventDefault();c.classList.add("dragover")};c.ondragleave=()=>c.classList.remove("dragover");
    c.ondrop=e=>{e.preventDefault();c.classList.remove("dragover");const id=e.dataTransfer.getData("text/plain"),t=tarAll().find(x=>x.id===id);
      if(!t||t.data===c.dataset.agdia)return;tarMove(id,c.dataset.agdia);toast("Tarefa movida para "+brDate(c.dataset.agdia)+".");go(ROUTE,true)};
  });
}


/* >>> x_fin3.js */
