/* ===== V39 — Escalas: folgas no mês por pessoa + filtros (período, cargo, escala, turno) =====
   prefixo xfo. Substitui a grade "Escala do período" (pgEscalaCalendario) e acrescenta filtros e metas. */
ESCUI.modo="";ESCUI.turno="";ESCUI.meta="";ESCUI.sel=[];ESCUI.selAberto=false;
const XFO_MODOS=[["","Todas as escalas"],["semana","Dias fixos da semana"],["12x36","12×36 (pares, ímpares ou ciclo 1×1)"],["par","12×36 — só dias pares"],["impar","12×36 — só dias ímpares"],["ciclo","Ciclo (trabalha/folga)"]];
const xfoModoDe=ig=>ig.escalaModo||"semana";
const xfoModoOk=(ig,f)=>!f||(f==="12x36"?(typeof eh1236==="function"&&eh1236(ig)):xfoModoDe(ig)===f);
const xfoTurno12=ig=>{const t=turnosList().find(x=>String(x.no)===String(ig.turno));return !!t&&/12\s*[x×]\s*36/i.test((t.nome||"")+" "+(t.texto||""))};
const xfoLabel=ig=>{const m=xfoModoDe(ig);if(m==="par")return"12×36 · dias pares";if(m==="impar")return"12×36 · dias ímpares";if(m==="ciclo")return(+ig.cicloTrab||1)===1&&(+(ig.cicloFolga??1))===1?"12×36 · alterna":"Ciclo "+(+ig.cicloTrab||1)+"×"+(+ig.cicloFolga||0);return"Dias fixos da semana"};
const xfoYm=iso=>String(iso).slice(0,7);
const xfoDiasMes=ym=>{const y=+ym.slice(0,4),m=+ym.slice(5,7)-1,n=new Date(y,m+1,0).getDate(),l=[];for(let d=1;d<=n;d++)l.push(ym+"-"+String(d).padStart(2,"0"));return l};
const xfoMetas=()=>(xmcfg("turnos").folgaMeta)||{};
/* meta do mês: valor lançado para o mês; se não houver, vale a do último mês anterior em que foi lançada */
function xfoMeta(uid,ym){
  const m=xfoMetas(),k=ym+"|"+uid;
  if(m[k]!=null&&m[k]!=="")return{v:+m[k],exp:true};
  let best=null;
  for(const kk of Object.keys(m)){const[y,u]=kk.split("|");if(u===String(uid)&&y<ym&&m[kk]!==""&&m[kk]!=null&&(!best||y>best.y))best={y,v:+m[kk]}}
  return best?{v:best.v,exp:false,de:best.y}:{v:null,exp:false};
}
function xfoSetMeta(ym,uid,val){
  const novo={...xfoMetas()},k=ym+"|"+uid;
  if(val===""||val==null||isNaN(+val))delete novo[k];else novo[k]=Math.max(0,Math.min(31,Math.round(+val)));
  xmsave("turnos",{folgaMeta:novo});
}
function xfoConta(ig,dias){
  let folgas=0,lanc=0,trab=0;
  for(const d of dias){const e=escalaDia(ig,d);if(e.antes||e.depois)continue;if(e.on)trab++;else{folgas++;if(e.ajuste&&e.ajuste.tipo==="folga"&&(typeof baseTrabalha==="function"?baseTrabalha(ig,d):true))lanc++}}
  return{folgas,lanc,trab};
}
/* alvo de folgas extras da pessoa no mês: a meta digitada na grade; sem meta, vale o padrão da sugestão (12×36: 2; demais: 0) */
function xfoAlvoP(p,y,m,cfg){const mt=xfoMeta(p.id,y+"-"+String(m+1).padStart(2,"0"));return mt.v!=null?mt.v:(eh1236(p)?cfg.extra1236:cfg.extraSemana)}
function xfoSit(n,meta){
  if(meta==null)return{t:"sem meta",c:"var(--ink-3,#777)",k:"sem"};
  if(n===meta)return{t:"na meta",c:"var(--verde-medio)",k:"ok"};
  if(n<meta)return{t:"faltam "+(meta-n),c:"var(--urgente)",k:"abaixo"};
  return{t:(n-meta)+" a mais",c:"var(--madeira)",k:"acima"};
}
/* pessoas já filtradas (cargo, escala, turno) */
function xfoOpcoes(){
  const L=integList().filter(i=>!semPonto(i)&&(i.turno||escalaEx().some(a=>a.uid===i.id))),seen={};
  return L.map(i=>{let l=nomeInteg(i)+" — "+cargoDe(i);if(seen[l]){seen[l]++;l+=" #"+seen[l]}else seen[l]=1;return{id:i.id,label:l}});
}
function xfoPessoas(){
  let p=integList().filter(i=>!semPonto(i)&&(i.turno||escalaEx().some(a=>a.uid===i.id)));
  const cargos=[...new Set(p.map(cargoDe))].sort((a,b)=>a==="Sem cargo"?1:b==="Sem cargo"?-1:a.localeCompare(b,"pt"));
  if(ESCUI.cargo&&!cargos.includes(ESCUI.cargo))ESCUI.cargo="";
  if(ESCUI.cargo)p=p.filter(i=>cargoDe(i)===ESCUI.cargo);
  if(ESCUI.modo)p=p.filter(i=>xfoModoOk(i,ESCUI.modo));
  if(ESCUI.turno)p=p.filter(i=>String(i.turno)===String(ESCUI.turno));
  const base=p;
  if(ESCUI.sel.length)p=p.filter(i=>ESCUI.sel.includes(i.id));
  return{p,cargos,base};
}
function pgEscalaCalendario(){
  if(!ESCUI.start||!ESCUI.end){const t=new Date();ESCUI.start=isoDate(new Date(t.getFullYear(),t.getMonth(),1));ESCUI.end=isoDate(new Date(t.getFullYear(),t.getMonth()+1,0))}
  const days=[];if(ESCUI.start<=ESCUI.end)for(let d=ESCUI.start;d<=ESCUI.end&&days.length<=46;d=addDaysIso(d,1))days.push(d);
  const sy=+ESCUI.start.slice(0,4),sm=+ESCUI.start.slice(5,7)-1;
  const mesCheio=ESCUI.start===isoDate(new Date(sy,sm,1))&&ESCUI.end===isoDate(new Date(sy,sm+1,0));
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-3,sy);y<=Math.max(y0+3,sy);y++)anos.push(y);
  const ym=xfoYm(ESCUI.start),diasMes=xfoDiasMes(ym),{p:todas,cargos}=xfoPessoas();
  const todosElegiveis=integList().filter(i=>!semPonto(i)&&(i.turno||escalaEx().some(a=>a.uid===i.id)));
  const incons=todas.filter(i=>xfoTurno12(i)&&xfoModoDe(i)==="semana");
  const linhas=todas.map(ig=>{const c=xfoConta(ig,diasMes),per=mesCheio?c:xfoConta(ig,days),mt=xfoMeta(ig.id,ym);return{ig,c,per,mt,sit:xfoSit(c.lanc,mt.v)}});
  const people=linhas.filter(l=>!ESCUI.meta||l.sit.k===ESCUI.meta).map(l=>l.ig);
  const byId=Object.fromEntries(linhas.map(l=>[l.ig.id,l]));
  const cell=(ig,d)=>{
    const e=escalaDia(ig,d),aj=e.ajuste;
    let bg="var(--areia-esc)",ring="",tit=e.on?"trabalha":"folga";
    if(e.antes||e.depois){bg="transparent";ring=";border:1px dashed var(--line)";tit=e.antes?"antes da admissão":"depois do desligamento"}
    else if(aj&&aj.tipo==="folga"){bg="var(--azul-palido)";ring=";box-shadow:inset 0 0 0 2px var(--azul-mar)";tit="folga lançada"+(aj.obs?" — "+aj.obs:"")}
    else if(aj){bg="var(--verde-medio)";ring=";box-shadow:0 0 0 2px var(--madeira)";tit="escala lançada"+(aj.obs?" — "+aj.obs:"")}
    else if(e.on)bg="var(--verde-medio)";
    return `<td style="padding:2px"><button type="button" data-escd="${ig.id}|${d}" title="${brDate(d)} — ${tit}. Clique para ajustar." style="width:18px;height:18px;border:0;border-radius:4px;padding:0;cursor:pointer;background:${bg}${ring}"></button></td>`;
  };
  const podeE=podeEd("turnos");
  const linha=ig=>{const l=byId[ig.id];
    return `<tr><td style="position:sticky;left:0;background:var(--card);white-space:nowrap;font-weight:700">${esc(nomeInteg(ig))}${ESCUI.group==="nome"?`<span class="sub" style="font-weight:400;margin-left:6px">${esc(cargoDe(ig))}</span>`:""}</td>
     <td style="padding:2px 4px;white-space:nowrap"><select data-xfomodo="${ig.id}" ${podeE?"":"disabled"} title="Como essa pessoa se reveza (12×36 alterna = trabalha um dia e folga o outro, sem depender do dia do mês)" style="font-size:11px;padding:3px 4px;min-width:138px;max-width:170px${xfoTurno12(ig)&&xfoModoDe(ig)==="semana"?";box-shadow:0 0 0 2px var(--urgente)":""}"><option value="semana" ${xfoModoDe(ig)==="semana"?"selected":""}>Dias fixos da semana</option><option value="ciclo" ${xfoModoDe(ig)==="ciclo"?"selected":""}>${xfoModoDe(ig)==="ciclo"?xfoLabel(ig):"12×36 · alterna (informar um dia de plantão)"}</option><option value="par" ${xfoModoDe(ig)==="par"?"selected":""}>12×36 · dias pares</option><option value="impar" ${xfoModoDe(ig)==="impar"?"selected":""}>12×36 · dias ímpares</option></select></td>
     <td class="n" style="padding:2px 6px;text-align:center" data-xfofl="${ig.id}"><b>${l.c.folgas}</b></td>
     <td class="n" style="padding:2px 6px;text-align:center"><b>${l.c.lanc}</b></td>
     ${mesCheio?"":`<td class="n" style="padding:2px 6px;text-align:center">${l.per.folgas}</td>`}
     <td style="padding:2px 4px"><input type="number" min="0" max="31" data-xfometa="${ig.id}" value="${l.mt.exp?l.mt.v:""}" placeholder="${l.mt.v!=null?l.mt.v:"—"}" ${podeE?"":"disabled"} title="${l.mt.exp?"Meta lançada para este mês":l.mt.v!=null?"Valendo a meta de "+l.mt.de.split("-").reverse().join("/")+" (digite para mudar este mês)":"Informe quantas folgas extras no mês (além da escala)"}" style="width:54px;padding:3px 4px;font-size:12px"></td>
     <td style="padding:2px 6px;white-space:nowrap;font-size:11px;color:${l.sit.c};font-weight:700">${l.sit.t}</td>
     ${days.map(d=>cell(ig,d)).join("")}</tr>`};
  const extra=mesCheio?5:6;
  let corpo;
  if(ESCUI.group==="cargo"){
    corpo=cargos.filter(c=>people.some(i=>cargoDe(i)===c)).map(c=>{
      const ps=people.filter(i=>cargoDe(i)===c);
      return `<tr><td colspan="${days.length+1+extra}" style="position:sticky;left:0;background:var(--bege);font-weight:700;color:var(--madeira);padding:6px 8px">${esc(c)} <span class="sub" style="font-weight:400">· ${ps.length} pessoa(s)</span></td></tr>`+ps.map(linha).join("");
    }).join("");
  }else corpo=people.map(linha).join("");
  const cont={abaixo:0,acima:0,ok:0,sem:0};linhas.forEach(l=>cont[l.sit.k]++);
  const turnos=turnosList();
  const hoje=isoDate(new Date());
  return `<div class="card"><h2>Escala do período — quem trabalha em cada dia</h2>
   <p class="sub" style="margin:0 0 10px">Mostra os dias de trabalho e de folga de cada integrante a partir do turno e da escala configurados. <b>Clique num quadradinho</b> para lançar uma folga (que vai ocorrer ou que já ocorreu) ou lançar a escala de um dia que a pessoa trabalhou fora do padrão. Na coluna <b>Meta de extras</b>, digite quantas folgas <b>extras</b> (além das da escala) a pessoa deve ter no mês, por exemplo 2: o sistema compara com as folgas que você já lançou e mostra quantas faltam. Para o sistema sugerir os melhores dias, use a “Sugestão de folgas” logo abaixo: ela usa essas metas.</p>
   <div class="row" style="align-items:flex-end;margin-bottom:10px">
    <button type="button" class="b sec sm" id="escprev" title="Mês anterior" style="flex:none">◀</button>
    <div><label>Mês</label><select id="escmes">${mesCheio?"":`<option value="" selected>Período personalizado</option>`}${MESES_PT.map((n,k)=>`<option value="${k}" ${mesCheio&&k===sm?"selected":""}>${n}</option>`).join("")}</select></div>
    <div><label>Ano</label><select id="escano">${anos.map(y=>`<option ${y===sy?"selected":""}>${y}</option>`).join("")}</select></div>
    <button type="button" class="b sec sm" id="escnext" title="Próximo mês" style="flex:none">▶</button>
    <div><label>De</label><input type="date" id="escstart" value="${ESCUI.start}"></div><div><label>Até</label><input type="date" id="escend" value="${ESCUI.end}"></div></div>
   <div class="chips" style="margin-bottom:10px"><span class="sub">Período rápido:</span>
    <button type="button" class="b sec sm" data-xfopre="semana">Esta semana</button>
    <button type="button" class="b sec sm" data-xfopre="15">Próximos 15 dias</button>
    <button type="button" class="b sec sm" data-xfopre="mes">Mês atual</button></div>
   <div class="row" style="margin-bottom:10px">
    <div><label>Organizar por</label><select id="escgrupo"><option value="nome" ${ESCUI.group==="nome"?"selected":""}>Nome (A–Z)</option><option value="cargo" ${ESCUI.group==="cargo"?"selected":""}>Cargo (agrupado)</option></select></div>
    <div><label>Cargo</label><select id="esccargo"><option value="">Todos os cargos</option>${cargos.map(c=>`<option ${c===ESCUI.cargo?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    <div><label>Escala</label><select id="escmodo">${XFO_MODOS.map(([v,n])=>`<option value="${v}" ${v===ESCUI.modo?"selected":""}>${n}</option>`).join("")}</select></div>
    <div><label>Turno</label><select id="escturno"><option value="">Todos os turnos</option>${turnos.map(t=>`<option value="${t.no}" ${String(t.no)===String(ESCUI.turno)?"selected":""}>${t.no} · ${esc(t.nome||t.texto)}</option>`).join("")}</select></div>
    <div><label>Folgas extras do mês</label><select id="escmeta"><option value="">Todas as pessoas</option><option value="abaixo" ${ESCUI.meta==="abaixo"?"selected":""}>Abaixo da meta</option><option value="acima" ${ESCUI.meta==="acima"?"selected":""}>Acima da meta</option><option value="ok" ${ESCUI.meta==="ok"?"selected":""}>Na meta</option><option value="sem" ${ESCUI.meta==="sem"?"selected":""}>Sem meta definida</option></select></div></div>
   <div style="margin-bottom:10px"><label>Integrante específico — digite o nome e escolha na lista</label>
    <input id="xfobusca" list="xfodl" autocomplete="off" placeholder="Ex.: Venice" style="max-width:440px"><datalist id="xfodl">${xfoOpcoes().map(o=>`<option value="${esc(o.label)}"></option>`).join("")}</datalist>
    <div class="chips" style="margin-top:6px">${ESCUI.sel.length?ESCUI.sel.map(id=>S.integrantes[id]?`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--verde-palido,#D6EDD8);border-radius:14px;padding:3px 4px 3px 10px;margin:2px 4px 2px 0;font-size:12px;font-weight:700">${esc(nomeInteg(S.integrantes[id]))}<button type="button" data-xfodel="${id}" title="Tirar da lista" style="border:0;background:transparent;cursor:pointer;font-size:15px;line-height:1;padding:0 6px">×</button></span>`:"").join(""):`<span class="sub">Nenhuma pessoa escolhida: aparecem todas. Escolha uma por uma para ver só as que você quer.</span>`}</div></div>
   <details id="xfopessoas" ${ESCUI.selAberto?"open":""} style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700">Ou marque na lista completa: ${ESCUI.sel.length?ESCUI.sel.length+" selecionada(s)":"todas"}</summary>
    <div style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:6px;columns:2 220px">${todosElegiveis.map(i=>`<label style="display:block;break-inside:avoid;font-weight:400;padding:2px 0"><input type="checkbox" data-xfosel="${i.id}" ${ESCUI.sel.includes(i.id)?"checked":""}> ${esc(nomeInteg(i))} <span class="sub">${esc(cargoDe(i))}</span></label>`).join("")||'<span class="sub">Ninguém com turno definido.</span>'}</div>
    <div class="chips" style="margin-top:6px"><button type="button" class="b sec sm" id="xfoselnada">Mostrar todas as pessoas</button><button type="button" class="b sec sm" id="xfoselfiltro">Marcar quem está nos filtros acima</button></div></details>
   ${incons.length?`<div class="callout sand" style="margin-bottom:10px"><b>Atenção:</b> ${incons.length} pessoa(s) estão com turno 12×36, mas a escala está em “dias fixos da semana”, por isso a grade não alterna: ${incons.slice(0,6).map(i=>esc(nomeInteg(i))).join(", ")}${incons.length>6?"…":""}. Na coluna <b>Escala</b>, escolha <b>12×36 · alterna</b> (informe um dia em que a pessoa trabalha) ou dias pares/ímpares.</div>`:""}
   <div class="chips" style="margin-bottom:10px">
    <button type="button" class="b" id="xfopdf">Baixar PDF do mês</button>
    <button type="button" class="b sec" id="xfoprint">Imprimir escala do mês</button>
    <button type="button" class="b sec sm" id="xfotodos" ${podeE?"":"disabled"}>Definir a mesma meta para todos os filtrados</button>
    <button type="button" class="b sec sm" id="xfocopia" ${podeE?"":"disabled"}>Copiar metas do mês anterior</button>
    <button type="button" class="b sec sm" id="xfocsv">Baixar planilha (CSV)</button>
    ${(ESCUI.cargo||ESCUI.modo||ESCUI.turno||ESCUI.meta||ESCUI.sel.length)?`<button type="button" class="b sec sm" id="xfolimpa">Limpar filtros</button>`:""}</div>
   <div class="sub" style="margin-bottom:8px">Folgas extras em ${MESES_PT[+ym.slice(5,7)-1]} de ${ym.slice(0,4)}: <b>${cont.ok}</b> na meta · <b style="color:var(--urgente)">${cont.abaixo}</b> abaixo · <b style="color:var(--madeira)">${cont.acima}</b> acima · ${cont.sem} sem meta. Mostrando ${people.length} de ${linhas.length} pessoa(s).</div>
   ${!days.length?`<div class="callout sand">Período inválido: a data "De" precisa ser antes da data "Até".</div>`:days.length>46?`<div class="callout sand">Escolha um período de até 45 dias para ver a grade.</div>`:
   !people.length?`<div class="empty">${linhas.length?"Nenhuma pessoa com esses filtros.":"Nenhum integrante com turno definido"+(ESCUI.cargo?" nesse cargo":" ainda")+". Defina o turno de cada um logo abaixo."}</div>`:
   `<div class="wrap"><table style="font-size:11px"><thead><tr><th style="position:sticky;left:0;background:var(--card);z-index:1">Integrante</th><th style="padding:4px 6px" title="Como a pessoa se reveza: dias fixos da semana ou 12×36">Escala</th><th class="n" style="padding:4px 6px" title="Folgas em ${MESES_PT[+ym.slice(5,7)-1]}, mês inteiro">Folgas no mês</th><th class="n" style="padding:4px 6px" title="Folgas lançadas em dias em que a pessoa trabalharia pela escala (folgas extras)">Extras lançadas</th>${mesCheio?"":`<th class="n" style="padding:4px 6px" title="Folgas só dentro do período escolhido">No período</th>`}<th style="padding:4px 6px" title="Quantas folgas extras (além da escala) essa pessoa deve ter no mês">Meta de extras</th><th style="padding:4px 6px">Situação</th>${days.map(d=>`<th class="n" style="padding:4px 2px">${d.slice(8)}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table></div>
   <div class="legend" style="margin-top:10px"><span><i style="background:var(--verde-medio)"></i>Trabalha</span><span><i style="background:var(--areia-esc)"></i>Folga</span>
    <span><i style="background:var(--azul-palido);box-shadow:inset 0 0 0 2px var(--azul-mar)"></i>Folga lançada</span>
    <span><i style="background:var(--verde-medio);box-shadow:0 0 0 2px var(--madeira)"></i>Escala lançada</span>
    <span><i style="background:transparent;border:1px dashed var(--line)"></i>Antes da admissão / após desligamento</span></div>
   <p class="sub" style="margin-top:8px">“Folgas no mês” conta todos os dias de folga do mês (da escala e as lançadas). “Extras lançadas” conta só as folgas que você lançou em dias em que a pessoa trabalharia; é com elas que a meta é comparada. A meta vale para o mês mostrado e continua valendo nos meses seguintes até você mudar. Dias antes da admissão ou depois do desligamento não contam. Se o mês estiver parcialmente fechado em período personalizado, a comparação continua sendo do mês inteiro.</p>`}
   </div>`;
}
const xfoBindTurnos0=bindTurnos;
bindTurnos=function(){
  xfoBindTurnos0.apply(this,arguments);
  const R=()=>go("turnos",true);
  const sel=(id,k)=>{const e=document.getElementById(id);if(e)e.onchange=()=>{ESCUI[k]=e.value;R()}};
  sel("escmodo","modo");sel("escturno","turno");sel("escmeta","meta");
  document.querySelectorAll("[data-xfopre]").forEach(b=>b.onclick=()=>{
    const h=new Date(),iso=isoDate(h),k=b.dataset.xfopre;
    if(k==="semana"){const w=pyWeekday(iso);ESCUI.start=addDaysIso(iso,-w);ESCUI.end=addDaysIso(iso,6-w)}
    else if(k==="15"){ESCUI.start=iso;ESCUI.end=addDaysIso(iso,14)}
    else{ESCUI.start=isoDate(new Date(h.getFullYear(),h.getMonth(),1));ESCUI.end=isoDate(new Date(h.getFullYear(),h.getMonth()+1,0))}
    R();
  });
  const lim=document.getElementById("xfolimpa");if(lim)lim.onclick=()=>{ESCUI.cargo="";ESCUI.modo="";ESCUI.turno="";ESCUI.meta="";ESCUI.sel=[];R()};
  const det=document.getElementById("xfopessoas");if(det)det.addEventListener("toggle",()=>{ESCUI.selAberto=det.open});
  document.querySelectorAll("[data-xfosel]").forEach(c=>c.onchange=()=>{const id=c.dataset.xfosel,a=new Set(ESCUI.sel);c.checked?a.add(id):a.delete(id);ESCUI.sel=[...a];ESCUI.selAberto=true;R()});
  const sn=document.getElementById("xfoselnada");if(sn)sn.onclick=()=>{ESCUI.sel=[];ESCUI.selAberto=true;R()};
  const sf=document.getElementById("xfoselfiltro");if(sf)sf.onclick=()=>{const keep=ESCUI.sel;ESCUI.sel=[];ESCUI.sel=xfoPessoas().p.map(i=>i.id);ESCUI.selAberto=true;R()};
  document.querySelectorAll("[data-xfomodo]").forEach(sl=>sl.onchange=async()=>{
    const ig=S.integrantes[sl.dataset.xfomodo];if(!ig)return;
    if(!podeEd("turnos")){toast("Você só pode consultar esta tela.",true);R();return}
    const m=sl.value;let o={...strip(ig),escalaModo:m};
    if(m==="ciclo"){
      const dia=await xfoPedeDia(nomeInteg(ig),ig.cicloInicio||isoDate(new Date()));if(!dia){R();return}
      o={...o,cicloTrab:1,cicloFolga:1,cicloInicio:dia};
    }
    put("integrantes",ig.id,o);if(POINT.result)calcular(false);
    try{audit("Escala do integrante",nomeInteg(ig)+" · "+xfoLabel(o))}catch(e){}
    toast(nomeInteg(ig)+": "+xfoLabel(o)+".");R();
  });
  const bu=document.getElementById("xfobusca");
  if(bu){const tenta=()=>{const v=bu.value.trim().toLowerCase();if(!v)return;
    const ops=xfoOpcoes();let o=ops.find(x=>x.label.toLowerCase()===v);
    if(!o){const c=ops.filter(x=>x.label.toLowerCase().startsWith(v)||x.label.toLowerCase().includes(v));if(c.length===1&&bu.dataset.enter==="1")o=c[0]}
    if(o){if(!ESCUI.sel.includes(o.id))ESCUI.sel=[...ESCUI.sel,o.id];bu.value="";R()}};
    bu.addEventListener("input",tenta);bu.addEventListener("change",tenta);
    bu.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();bu.dataset.enter="1";tenta();bu.dataset.enter=""}});}
  document.querySelectorAll("[data-xfodel]").forEach(b=>b.onclick=()=>{ESCUI.sel=ESCUI.sel.filter(x=>x!==b.dataset.xfodel);R()});
  const pdf=document.getElementById("xfopdf");if(pdf)pdf.onclick=()=>xfoPdf();
  const pr=document.getElementById("xfoprint");if(pr)pr.onclick=()=>xfoImprime();
  const ym=xfoYm(ESCUI.start||isoDate(new Date()));
  document.querySelectorAll("[data-xfometa]").forEach(inp=>inp.onchange=()=>{
    if(!podeEd("turnos")){toast("Você só pode consultar esta tela.",true);R();return}
    const v=inp.value.trim();
    if(v!==""&&(isNaN(+v)||+v<0||+v>31)){toast("Informe um número de folgas entre 0 e 31.",true);R();return}
    xfoSetMeta(ym,inp.dataset.xfometa,v);
    try{audit("Meta de folgas",nomeInteg(S.integrantes[inp.dataset.xfometa])+" · "+ym+" · "+(v===""?"removida":v))}catch(e){}
    R();
  });
  const td=document.getElementById("xfotodos");if(td)td.onclick=async()=>{
    const r=await xyAsk("Quantas folgas extras no mês para todas as pessoas que estão na tela?");if(r==null)return;
    const v=String(r).trim();if(v===""||isNaN(+v)||+v<0||+v>31){toast("Informe um número entre 0 e 31.",true);return}
    const {p}=xfoPessoas();const lista=p.filter(i=>!ESCUI.meta||xfoSit(xfoConta(i,xfoDiasMes(ym)).lanc,xfoMeta(i.id,ym).v).k===ESCUI.meta);
    const novo={...xfoMetas()};lista.forEach(i=>{novo[ym+"|"+i.id]=Math.round(+v)});
    xmsave("turnos",{folgaMeta:novo});toast(lista.length+" pessoa(s) com meta de "+Math.round(+v)+" folga(s).");try{audit("Meta de folgas em lote",lista.length+" pessoa(s) · "+ym+" · "+v)}catch(e){}R();
  };
  const cp=document.getElementById("xfocopia");if(cp)cp.onclick=()=>{
    const y=+ym.slice(0,4),m=+ym.slice(5,7)-1,ant=isoDate(new Date(y,m-1,1)).slice(0,7);
    const {p}=xfoPessoas();const novo={...xfoMetas()};let n=0;
    p.forEach(i=>{const k=ant+"|"+i.id;if(novo[k]!=null&&novo[k]!==""){novo[ym+"|"+i.id]=novo[k];n++}});
    if(!n){toast("Ninguém tem meta lançada em "+ant.split("-").reverse().join("/")+".",true);return}
    xmsave("turnos",{folgaMeta:novo});toast("Metas copiadas de "+ant.split("-").reverse().join("/")+" ("+n+").");R();
  };
  const cv=document.getElementById("xfocsv");if(cv)cv.onclick=async()=>{
    const dias=[];for(let d=ESCUI.start;d<=ESCUI.end&&dias.length<=46;d=addDaysIso(d,1))dias.push(d);
    const {p}=xfoPessoas(),dm=xfoDiasMes(ym);
    const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
    const linhas=[["Integrante","Cargo","Escala","Turno",...dias.map(brDate),"Folgas no mês","Folgas extras","Meta de extras","Situação"].map(q).join(";")];
    p.forEach(i=>{const c=xfoConta(i,dm),mt=xfoMeta(i.id,ym),sit=xfoSit(c.lanc,mt.v);
      if(ESCUI.meta&&sit.k!==ESCUI.meta)return;
      linhas.push([nomeInteg(i),cargoDe(i),(XFO_MODOS.find(x=>x[0]===xfoModoDe(i))||[0,xfoModoDe(i)])[1],i.turno||"",...dias.map(d=>{const e=escalaDia(i,d);return e.antes||e.depois?"-":e.on?"T":"F"}),c.folgas,c.lanc,mt.v==null?"":mt.v,sit.t].map(q).join(";"))});
    const ok=await saveFile("escala-folgas-"+ym+".csv","﻿"+linhas.join("\r\n")+"\r\n");if(ok)toast("Planilha baixada (T = trabalha, F = folga).");
  };
};

function xfoPedeDia(nome,def){return new Promise(res=>{
  const ov=openModal(`<h3>${esc(nome)} · 12×36</h3><p class="sub">Informe um dia em que essa pessoa <b>trabalha</b> (um plantão qualquer, passado ou futuro). A partir dele a escala alterna: trabalha um dia e folga o seguinte.</p><label>Dia de plantão</label><input type="date" id="xfopd" value="${def}"><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="b sec" id="xfopn">Cancelar</button><button class="b" id="xfops">Aplicar</button></div>`);
  ov.querySelector("#xfopn").onclick=()=>{ov.remove();res(null)};
  ov.querySelector("#xfops").onclick=()=>{const v=ov.querySelector("#xfopd").value;if(!v){toast("Escolha o dia.",true);return}ov.remove();res(v)};
})}
function xfoDados(){
  const ym=xfoYm(ESCUI.start||isoDate(new Date())),dias=xfoDiasMes(ym),{p,cargos}=xfoPessoas();
  const lista=p.map(ig=>{const c=xfoConta(ig,dias),mt=xfoMeta(ig.id,ym);return{ig,c,mt,sit:xfoSit(c.lanc,mt.v)}}).filter(l=>!ESCUI.meta||l.sit.k===ESCUI.meta);
  if(!lista.length){toast("Nenhuma pessoa para emitir com esses filtros.",true);return null}
  const nomeMes=MESES_PT[+ym.slice(5,7)-1]+" de "+ym.slice(0,4);
  const filtros=[ESCUI.cargo&&"Cargo: "+ESCUI.cargo,ESCUI.modo&&"Escala: "+(XFO_MODOS.find(x=>x[0]===ESCUI.modo)||[0,""])[1],ESCUI.turno&&"Turno "+ESCUI.turno,ESCUI.sel.length&&ESCUI.sel.length+" pessoa(s) escolhida(s)"].filter(Boolean).join(" · ");
  return{ym,dias,cargos,lista,nomeMes,filtros};
}
function xfoImprime(){
  const D=xfoDados();if(!D)return;const{ym,dias,cargos,lista,nomeMes,filtros}=D;
  const th=d=>`<th style="border:1px solid #444;padding:1px 0;width:19px;font-size:8px;line-height:1.1">${d.slice(8)}<br>${WD[pyWeekday(d)]}</th>`;
  const td=(ig,d)=>{const e=escalaDia(ig,d);if(e.antes||e.depois)return`<td style="border:1px solid #444;text-align:center;font-size:9px">–</td>`;
    return e.on?`<td style="border:1px solid #444;text-align:center;font-size:9px;font-weight:700">T</td>`:`<td style="border:1px solid #444;text-align:center;font-size:9px;background:#d9d9d9">F</td>`};
  const linha=l=>`<tr><td style="border:1px solid #444;padding:2px 4px;white-space:nowrap;font-size:10px"><b>${esc(nomeInteg(l.ig))}</b></td><td style="border:1px solid #444;padding:2px 4px;font-size:9px;white-space:nowrap">${esc(cargoDe(l.ig))}</td><td style="border:1px solid #444;padding:2px 4px;font-size:9px;white-space:nowrap">${esc(xfoLabel(l.ig))}</td>${dias.map(d=>td(l.ig,d)).join("")}<td style="border:1px solid #444;text-align:center;font-size:10px"><b>${l.c.folgas}</b></td><td style="border:1px solid #444;text-align:center;font-size:10px">${l.c.lanc}</td><td style="border:1px solid #444;text-align:center;font-size:10px">${l.mt.v==null?"":l.mt.v}</td></tr>`;
  let corpo;
  if(ESCUI.group==="cargo")corpo=cargos.filter(c=>lista.some(l=>cargoDe(l.ig)===c)).map(c=>`<tr><td colspan="${dias.length+6}" style="border:1px solid #444;background:#eee;padding:2px 4px;font-size:10px"><b>${esc(c)}</b></td></tr>`+lista.filter(l=>cargoDe(l.ig)===c).map(linha).join("")).join("");
  else corpo=lista.map(linha).join("");
  const html=`<div style="font-family:Arial,sans-serif;color:#000"><h2 style="margin:0 0 2px">Casa Hiro · Escala de ${nomeMes}</h2><div style="font-size:10px;margin-bottom:6px">${filtros||"Todas as pessoas com escala"} · emitida em ${new Date().toLocaleDateString("pt-BR")}</div>
   <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr><th style="border:1px solid #444;padding:2px 4px;font-size:9px;text-align:left">Integrante</th><th style="border:1px solid #444;font-size:9px">Cargo</th><th style="border:1px solid #444;font-size:9px">Escala</th>${dias.map(th).join("")}<th style="border:1px solid #444;font-size:8px;padding:1px 3px">Folgas</th><th style="border:1px solid #444;font-size:8px;padding:1px 3px">Extras</th><th style="border:1px solid #444;font-size:8px;padding:1px 3px">Meta</th></tr></thead><tbody>${corpo}</tbody></table></div>
   <div style="font-size:9px;margin-top:6px">T = trabalha · F = folga (cinza) · – = antes da admissão ou após o desligamento. Folgas = todos os dias de folga do mês; Extras = folgas lançadas em dias de trabalho; Meta = folgas extras previstas.</div>
   <p style="margin-top:22px;font-size:11px">Responsável: ______________________________ &nbsp;&nbsp; Data: ___/___/_____</p></div>`;
  const pg=document.createElement("style");pg.id="xfopage";pg.textContent="@page{size:A4 landscape;margin:8mm}";document.head.appendChild(pg);
  const ov=xmPrint("Escala de "+nomeMes,html);
  const fim=()=>{const e=document.getElementById("xfopage");if(e)e.remove()};
  const mo=new MutationObserver(()=>{if(!ov.isConnected){fim();mo.disconnect()}});mo.observe(document.body,{childList:true,subtree:true});
}

async function xfoPdf(){
  const D=xfoDados();if(!D)return;const{ym,dias,cargos,lista,nomeMes,filtros}=D;
  if(typeof window.jspdf==="undefined"||!window.jspdf.jsPDF){toast("A biblioteca de PDF não carregou. Recarregue a página e tente de novo.",true);return}
  try{
    const lg=await logosMarca(),{jsPDF}=window.jspdf,doc=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"});
    if(typeof doc.autoTable!=="function"){toast("A biblioteca de tabelas do PDF não carregou. Recarregue a página.",true);return}
    const VERDE=[30,92,42],VMED=[46,125,50],AREIA=[245,239,224],LINHA=[232,223,204],TXT=[68,68,68],MUTE=[138,133,119],PAL=[214,237,216];
    const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),nd=dias.length;
    const faixa=()=>{doc.setFillColor(...VERDE);doc.rect(0,0,W,58,"F");try{doc.addImage(lg.branco,"PNG",24,8,30,42)}catch(e){}
      doc.setTextColor(255,255,255);doc.setFont("times","bold");doc.setFontSize(18);doc.text("CASA HIRO",64,29);
      doc.setFont("times","italic");doc.setFontSize(8.5);doc.setTextColor(...PAL);doc.text("A ciência do cuidado com o acolhimento de casa.",64,43);
      doc.setFont("times","bold");doc.setFontSize(13);doc.setTextColor(255,255,255);doc.text("Escala de "+nomeMes,W-24,27,{align:"right"});
      doc.setFont("times","normal");doc.setFontSize(8.5);doc.setTextColor(...PAL);doc.text((filtros||"Todas as pessoas com escala")+" · emitida em "+new Date().toLocaleDateString("pt-BR"),W-24,43,{align:"right"})};
    const linha=l=>[nomeInteg(l.ig),cargoDe(l.ig),xfoLabel(l.ig),...dias.map(d=>{const e=escalaDia(l.ig,d);return e.antes||e.depois?"–":e.on?"T":"F"}),String(l.c.folgas),String(l.c.lanc),l.mt.v==null?"":String(l.mt.v)];
    const body=[];
    if(ESCUI.group==="cargo")cargos.filter(c=>lista.some(l=>cargoDe(l.ig)===c)).forEach(c=>{body.push([{content:c,colSpan:nd+6,styles:{fillColor:PAL,fontStyle:"bold",textColor:VERDE,halign:"left"}}]);lista.filter(l=>cargoDe(l.ig)===c).forEach(l=>body.push(linha(l)))});
    else lista.forEach(l=>body.push(linha(l)));
    const cw=Math.max(11,Math.min(15,(W-48-95-72-78-66)/nd)),cs={0:{cellWidth:95,halign:"left",fontStyle:"bold"},1:{cellWidth:72,halign:"left"},2:{cellWidth:78,halign:"left"}};
    for(let i=0;i<nd;i++)cs[3+i]={cellWidth:cw,halign:"center"};cs[3+nd]={cellWidth:22,halign:"center",fontStyle:"bold"};cs[4+nd]={cellWidth:22,halign:"center"};cs[5+nd]={cellWidth:22,halign:"center"};
    const pag0=1;
    const fundo=()=>{doc.setFillColor(...AREIA);doc.rect(0,0,W,H,"F")};fundo();faixa();
    doc.autoTable({startY:70,margin:{top:70,left:24,right:24,bottom:36},theme:"grid",
      head:[["Integrante","Cargo","Escala",...dias.map(d=>d.slice(8)+"\n"+WD[pyWeekday(d)]),"Folgas","Extras","Meta"]],body,
      styles:{font:"times",fontSize:7,cellPadding:2,lineColor:LINHA,lineWidth:.5,textColor:TXT,valign:"middle",overflow:"ellipsize"},
      headStyles:{fillColor:VMED,textColor:255,fontStyle:"bold",halign:"center",fontSize:6.2,overflow:"linebreak"},bodyStyles:{fillColor:[255,255,255]},columnStyles:cs,
      didParseCell:d=>{if(d.section==="body"&&d.column.index>=3&&d.column.index<3+nd){const v=d.cell.raw;if(v==="F")d.cell.styles.fillColor=[210,210,210];else if(v==="T"){d.cell.styles.fontStyle="bold";d.cell.styles.textColor=VERDE}else if(v==="–")d.cell.styles.textColor=MUTE}},
      willDrawPage:d=>{if(d.pageNumber>pag0){fundo();faixa()}},
      didDrawPage:d=>{doc.setFont("times","italic");doc.setFontSize(8);doc.setTextColor(...MUTE);doc.text("Casa Hiro™ · Caraguatatuba — Litoral Norte de SP",24,H-16);doc.text("Página "+d.pageNumber,W-24,H-16,{align:"right"})}});
    let y=doc.lastAutoTable.finalY+14;if(y>H-70){doc.addPage();fundo();faixa();y=90}
    doc.setFont("times","normal");doc.setFontSize(8);doc.setTextColor(...TXT);
    doc.text("T = trabalha · F = folga (cinza) · – = antes da admissão ou após o desligamento. Folgas = todos os dias de folga do mês; Extras = folgas lançadas em dias de trabalho; Meta = folgas extras previstas.",24,y);
    doc.setDrawColor(...MUTE);doc.line(24,y+34,300,y+34);doc.text("Responsável",24,y+45);doc.line(340,y+34,480,y+34);doc.text("Data",340,y+45);
    const ok=await saveFile("escala-"+ym+(ESCUI.sel.length===1&&S.integrantes[ESCUI.sel[0]]?"-"+estNorm(nomeInteg(S.integrantes[ESCUI.sel[0]])).replace(/\s+/g,"-"):"")+".pdf",new Uint8Array(doc.output("arraybuffer")));
    if(ok)toast("PDF da escala de "+nomeMes+" baixado.");
  }catch(e){console.error(e);toast("Não consegui gerar o PDF: "+(e.message||e),true)}
}


/* >>> x_m23.js */
