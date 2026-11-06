/* ===== V40 — Escala no modelo da Casa Hiro (tela, impressão, PDF) + teste de escala =====
   prefixo xmd. Substitui a grade da tela de Escalas (pgEscalaCalendario) e as saídas de impressão/PDF de x_m22. */
const XMD={sim:false,set:{},porFolha:8};
(function(){const st=document.createElement("style");st.id="xmdcss";st.textContent=`
.xmdw{overflow-x:auto;padding-bottom:4px}
table.xmdt{border-collapse:separate;border-spacing:2px;font-size:11px}
.xmdt th.xmdn{position:sticky;left:0;z-index:2;background:#1E5C2A;color:#fff;text-align:left;padding:7px 10px;border-radius:6px;min-width:150px;font-size:12px;text-transform:none;letter-spacing:0}
.xmdt th.xmdh{background:#2E7D32;color:#fff;border-radius:4px;padding:3px 0;min-width:23px;text-align:center;font-size:10px;line-height:1.15;text-transform:none;letter-spacing:0}
.xmdt th.xmdh.w{background:#1E5C2A}
.xmdt th.xmdh small{display:block;font-weight:400;font-size:8.5px;opacity:.85}
.xmdt td{padding:0}
.xmdt td.xmdp{position:sticky;left:0;z-index:1;background:var(--card);font-weight:700;padding:3px 8px;white-space:normal;line-height:1.15;min-width:150px;max-width:160px;font-size:11.5px;border-radius:4px;box-shadow:0 0 0 2px var(--card)}
.xmdt td.xmdp small{display:block;font-weight:400;font-size:9.5px;color:var(--ink-3,#7a7568)}
.xmdt tr.xmdg td{background:#D6EDD8;color:#1E5C2A;font-weight:700;padding:4px 8px;border-radius:4px;font-size:12px;position:sticky;left:0}
button.xmdc{width:23px;height:30px;border:0;border-radius:4px;font-weight:800;font-size:13px;cursor:pointer;padding:0;font-family:inherit}
.k-d{background:#A9D5A0;color:#1E5C2A}.k-n{background:#1B4F72;color:#fff}
.k-f{background:#E6DFD0;color:#8A8577;font-weight:400;font-size:11px}
.k-fe{background:#fff;color:#8C4A1F;box-shadow:inset 0 0 0 2px #8C4A1F;font-size:10px}
.k-na{background:transparent;color:#aaa;box-shadow:inset 0 0 0 1px var(--line);font-weight:400}
.k-sim{background:#E8F1FB!important;color:#2D6FB7!important;box-shadow:inset 0 0 0 2px #2D6FB7!important}
.xmdt tr.xmdcv td.cv{background:#F3EBD8;color:#2E7D32;text-align:center;font-weight:800;font-size:11px;height:24px;border-radius:4px}
.xmdt tr.xmdcv td.cv.bad{background:#8C4A1F;color:#fff;font-size:10px;line-height:1.05}
.xmdt tr.xmdcv td.xmdp{background:#F3EBD8;font-size:11px}
table.xmdr{border-collapse:collapse;font-size:12px;width:100%}
.xmdr th{background:#2E7D32;color:#fff;padding:5px 8px;text-align:left;font-size:11px;text-transform:none;letter-spacing:0;white-space:nowrap}
.xmdr td{border-bottom:1px solid var(--line);padding:4px 8px;vertical-align:middle}
.xmdr td.n,.xmdr th.n{text-align:center}
.xmdr td.dias{font-size:10px;color:var(--ink-3,#6b665a);min-width:150px;max-width:220px}.xmdr td{font-size:11.5px}
.xmdsim{border:2px dashed #2D6FB7;border-radius:10px;padding:10px 12px;background:rgba(45,111,183,.06);margin-bottom:10px}
.xmdchip{display:inline-flex;align-items:center;gap:4px;background:#E8F1FB;color:#1d4f86;border-radius:14px;padding:3px 4px 3px 10px;margin:2px 4px 2px 0;font-size:12px;font-weight:700}
.xmdchip button{border:0;background:transparent;cursor:pointer;font-size:15px;line-height:1;padding:0 6px;color:inherit}
@media(max-width:700px){.xmdt th.xmdn{min-width:120px}button.xmdc{width:24px;height:30px}}
`;document.head.appendChild(st)})();

/* ---------- dados ---------- */
const xmdKey=(id,d)=>id+"|"+d;
function xmdEd(ig,d){
  const e=escalaDia(ig,d);
  if(XMD.sim&&XMD.set[xmdKey(ig.id,d)]&&!e.antes&&!e.depois)return{...e,on:false,turno:null,ajuste:{tipo:"folga",sim:true}};
  return e;
}
function xmdInfo(no){
  const t=turnosList().find(x=>String(x.no)===String(no));
  if(!t)return{tp:"D",hor:"",nome:""};
  const rg=[...String(t.texto||"").matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)];
  if(!rg.length)return{tp:/noturn/i.test(t.nome||"")?"N":"D",hor:String(t.texto||""),nome:t.nome||""};
  const a=rg[0],z=rg[rg.length-1],ini=+a[1]*60+ +a[2],fim=+z[3]*60+ +z[4];
  const noturno=fim<=ini||ini>=18*60||ini<5*60;
  const f=(h,m)=>String(+h).padStart(2,"0")+"h"+(+m?String(+m).padStart(2,"0"):"");
  return{tp:noturno?"N":"D",hor:f(a[1],a[2])+" às "+f(z[3],z[4]),nome:t.nome||""};
}
function xmdCod(ig,d){
  const e=xmdEd(ig,d);
  if(e.antes||e.depois)return{c:"–",k:"na"};
  if(e.on){const i=xmdInfo(e.turno||ig.turno);return{c:i.tp,k:i.tp==="N"?"n":"d"}}
  const aj=e.ajuste;
  if(aj&&aj.tipo==="folga"&&(aj.sim||(typeof baseTrabalha==="function"&&baseTrabalha(ig,d))))return{c:"FE",k:"fe",sim:!!aj.sim};
  return{c:"F",k:"f"};
}
const xmdSemana=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
function xmdTrabalha(ig,dias){
  const base=dias.filter(d=>escalaDia(ig,d).on||(typeof baseTrabalha==="function"&&baseTrabalha(ig,d)));
  const modo=ig.escalaModo||"semana";
  if(modo==="semana"){
    const ds=[...new Set(ig.dias||[0,1,2,3,4])].sort((a,b)=>a-b);if(!ds.length)return"—";
    const seq=ds.every((v,i)=>i===0||v===ds[i-1]+1);
    return seq&&ds.length>2?xmdSemana[ds[0]]+" a "+xmdSemana[ds[ds.length-1]]:ds.map(v=>xmdSemana[v]).join(", ");
  }
  if(modo==="ciclo"&&!((+ig.cicloTrab||1)===1&&(+(ig.cicloFolga??1))===1))return"ciclo "+(+ig.cicloTrab||1)+"×"+(+ig.cicloFolga||0);
  if(!base.length)return"—";
  const par=base.filter(d=>+d.slice(8)%2===0).length;
  return par===base.length?"dias pares":par===0?"dias ímpares":"alternados";
}
function xmdPessoa(ig,dias){
  const cods=dias.map(d=>xmdCod(ig,d));
  const trab=dias.filter((d,i)=>cods[i].k==="d"||cods[i].k==="n");
  const folgas=cods.filter(c=>c.k==="f"||c.k==="fe").length,extras=cods.filter(c=>c.k==="fe").length;
  const info=xmdInfo(ig.turno);
  return{ig,cods,trab,folgas,extras,plantoes:trab.length,info,trabalha:xmdTrabalha(ig,dias),nomeTurno:info.tp==="N"?"Noturno":"Diurno"};
}
const xmdCobCfg=()=>{const c=(xmcfg("turnos").cobMin)||{};return{d:c.d==null?1:+c.d,n:c.n==null?1:+c.n}};
/* todo o time elegível (não só quem está filtrado) — a cobertura precisa olhar o cargo inteiro */
const xmdTodos=()=>integList().filter(i=>!semPonto(i)&&(i.turno||escalaEx().some(a=>a.uid===i.id)));
function xmdCobertura(cargos,dias){
  const cfg=xmdCobCfg(),todos=xmdTodos();
  return cargos.map(cargo=>{
    const ps=todos.filter(i=>cargoDe(i)===cargo&&i.turno);
    const temD=ps.some(i=>xmdInfo(i.turno).tp==="D"),temN=ps.some(i=>xmdInfo(i.turno).tp==="N");
    const linha=dias.map(d=>{let nd=0,nn=0;ps.forEach(i=>{const c=xmdCod(i,d);if(c.k==="d")nd++;else if(c.k==="n")nn++});
      const falta=[];if(temD&&nd<cfg.d)falta.push("D");if(temN&&nn<cfg.n)falta.push("N");return{nd,nn,falta}});
    return{cargo,n:ps.length,temD,temN,linha};
  }).filter(c=>c.n>0&&(c.temD||c.temN));
}
function xmdRotuloCob(c){const cfg=xmdCobCfg(),p=[];if(c.temD)p.push(cfg.d+" diurno");if(c.temN)p.push(cfg.n+" noturno");return"Cobertura 24h — "+c.cargo+" ("+p.join(" + ")+")"}
function xmdImpacto(cargos,dias){
  const antes=(()=>{const s=XMD.sim;XMD.sim=false;const r=xmdCobertura(cargos,dias);XMD.sim=s;return r})(),depois=xmdCobertura(cargos,dias),out=[];
  depois.forEach((c,i)=>c.linha.forEach((x,k)=>{const a=antes[i].linha[k];x.falta.forEach(l=>{if(!a.falta.includes(l))out.push({cargo:c.cargo,dia:dias[k],turno:l})})}));
  return out;
}
/* lista exibida: filtros + organização */
function xmdLista(dias){
  const{p,cargos}=xfoPessoas(),ym=xfoYm(ESCUI.start||isoDate(new Date()));
  let ps=p.map(ig=>({ig,ps:xmdPessoa(ig,dias),mt:xfoMeta(ig.id,ym)}));
  ps=ps.map(x=>{const mesCont=xmdPessoa(x.ig,xfoDiasMes(ym));x.mes=mesCont;x.sit=xfoSit(mesCont.extras,x.mt.v);return x}).filter(x=>!ESCUI.meta||x.sit.k===ESCUI.meta);
  if(ESCUI.group==="cargo")ps.sort((a,b)=>cargoDe(a.ig).localeCompare(cargoDe(b.ig),"pt")||nomeInteg(a.ig).localeCompare(nomeInteg(b.ig),"pt"));
  return{lista:ps,cargos};
}
const xmdCorLegenda=()=>`<span><i class="k-d" style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;text-align:center;font-size:9px;font-weight:800;line-height:14px">D</i> Plantão diurno</span> <span><i class="k-n" style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;text-align:center;font-size:9px;font-weight:800;line-height:14px">N</i> Plantão noturno (começa no dia marcado e vai até a manhã seguinte)</span> <span><i class="k-f" style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px"></i> Folga da escala</span> <span><i class="k-fe" style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px"></i> FE: folga extra (lançada em dia de plantão)</span> <span><i class="k-sim" style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px"></i> Folga em teste (não gravada)</span> <span><i style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;background:#8C4A1F"></i> Plantão descoberto</span>`;

/* ---------- tela ---------- */
function xmdGrade(lista,days,cobs,opt){
  opt=opt||{};
  const fim=days.length,head=`<tr><th class="xmdn">Integrante</th>${days.map(d=>{const w=pyWeekday(d);return`<th class="xmdh ${w>=5?"w":""}">${d.slice(8)}<small>${WD[w]}</small></th>`}).join("")}</tr>`;
  const cel=(x,d,i)=>{const c=x.ps.cods[i];const tit=brDate(d)+" — "+({d:"plantão diurno",n:"plantão noturno",f:"folga",fe:c.sim?"folga em teste (não gravada)":"folga extra",na:"fora do período de contrato"})[c.k]+". "+(XMD.sim?"Clique para simular folga neste dia.":"Clique para ajustar.");
    return`<td><button type="button" class="xmdc k-${c.k}${c.sim?" k-sim":""}" data-escd="${x.ig.id}|${d}" title="${tit}">${c.c}</button></td>`};
  const linha=x=>`<tr><td class="xmdp">${esc(nomeInteg(x.ig))}${ESCUI.group==="nome"?`<small>${esc(cargoDe(x.ig))}</small>`:""}</td>${days.map((d,i)=>cel(x,d,i)).join("")}</tr>`;
  const cobRow=c=>`<tr class="xmdcv"><td class="xmdp">${esc(xmdRotuloCob(c))}</td>${c.linha.map(x=>x.falta.length?`<td class="cv bad" title="Falta ${x.falta.map(l=>l==="D"?"plantão diurno":"plantão noturno").join(" e ")} neste dia">${x.falta.join("/")}<br>?</td>`:`<td class="cv">✓</td>`).join("")}</tr>`;
  let corpo="";
  if(ESCUI.group==="cargo"){
    const gs=[...new Set(lista.map(x=>cargoDe(x.ig)))];
    corpo=gs.map(g=>`<tr class="xmdg"><td colspan="${fim+1}">${esc(g)} · ${lista.filter(x=>cargoDe(x.ig)===g).length} pessoa(s)</td></tr>`+lista.filter(x=>cargoDe(x.ig)===g).map(linha).join("")+cobs.filter(c=>c.cargo===g).map(cobRow).join("")).join("");
  }else corpo=lista.map(linha).join("")+cobs.map(cobRow).join("");
  return`<div class="xmdw"><table class="xmdt"><thead>${head}</thead><tbody>${corpo}</tbody></table></div>`;
}
function xmdResumo(lista,ym,podeE){
  const modos=[["semana","Dias fixos da semana"],["ciclo","12×36 · alterna"],["par","12×36 · dias pares"],["impar","12×36 · dias ímpares"]];
  return`<h3 style="margin:16px 0 6px;font-family:'Playfair Display',Georgia,serif;color:var(--verde,#1E5C2A)">Resumo do mês</h3>
  <div class="wrap"><table class="xmdr"><thead><tr><th>Integrante</th><th>Cargo</th><th>Horário</th><th>Escala</th><th>Trabalha</th><th>Dias de plantão no mês</th><th class="n">Plantões</th><th class="n">Folgas</th><th class="n">Extras</th><th class="n" title="Quantas folgas extras (além da escala) a pessoa deve ter no mês">Meta de extras</th><th>Situação</th></tr></thead><tbody>
  ${lista.map(x=>{const ig=x.ig,m=x.mes,mo=xfoModoDe(ig),inc=xfoTurno12(ig)&&mo==="semana";
    return`<tr><td><b>${esc(nomeInteg(ig))}</b></td><td>${esc(cargoDe(ig))}</td><td style="white-space:nowrap">${esc(m.nomeTurno)}${m.info.hor?" · "+esc(m.info.hor):""}</td>
    <td><select data-xfomodo="${ig.id}" ${podeE?"":"disabled"} title="Como essa pessoa se reveza" style="font-size:11px;padding:3px 4px;min-width:116px;max-width:130px${inc?";box-shadow:0 0 0 2px var(--urgente)":""}">${modos.map(([v,n])=>`<option value="${v}" ${mo===v||(v==="ciclo"&&mo==="ciclo")?"selected":""}>${v==="ciclo"&&mo==="ciclo"?esc(xfoLabel(ig)):n}</option>`).join("")}</select></td>
    <td style="white-space:nowrap">${esc(m.trabalha)}</td><td class="dias">${m.trab.map(d=>+d.slice(8)).join(" · ")||"—"}</td>
    <td class="n"><b>${m.plantoes}</b></td><td class="n">${m.folgas}</td><td class="n">${m.extras}</td>
    <td class="n"><input type="number" min="0" max="31" data-xfometa="${ig.id}" value="${x.mt.exp?x.mt.v:""}" placeholder="${x.mt.v!=null?x.mt.v:"—"}" ${podeE?"":"disabled"} title="${x.mt.exp?"Meta lançada para este mês":x.mt.v!=null?"Valendo a meta de "+x.mt.de.split("-").reverse().join("/")+" (digite para mudar este mês)":"Informe quantas folgas extras no mês (além da escala)"}" style="width:54px;padding:3px 4px;font-size:12px"></td>
    <td style="white-space:nowrap;font-weight:700;color:${x.sit.c}">${x.sit.t}</td></tr>`}).join("")}
  </tbody></table></div>`;
}
function pgEscalaCalendario(){
  if(!ESCUI.start||!ESCUI.end){const t=new Date();ESCUI.start=isoDate(new Date(t.getFullYear(),t.getMonth(),1));ESCUI.end=isoDate(new Date(t.getFullYear(),t.getMonth()+1,0))}
  const days=[];if(ESCUI.start<=ESCUI.end)for(let d=ESCUI.start;d<=ESCUI.end&&days.length<=46;d=addDaysIso(d,1))days.push(d);
  const sy=+ESCUI.start.slice(0,4),sm=+ESCUI.start.slice(5,7)-1;
  const mesCheio=ESCUI.start===isoDate(new Date(sy,sm,1))&&ESCUI.end===isoDate(new Date(sy,sm+1,0));
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-3,sy);y<=Math.max(y0+3,sy);y++)anos.push(y);
  const ym=xfoYm(ESCUI.start),podeE=podeEd("turnos");
  const{lista,cargos}=xmdLista(days);
  const gcargos=[...new Set(lista.map(x=>cargoDe(x.ig)))];
  const cobs=xmdCobertura(gcargos,days),cfgc=xmdCobCfg();
  const todosElegiveis=xmdTodos(),incons=lista.filter(x=>xfoTurno12(x.ig)&&xfoModoDe(x.ig)==="semana").map(x=>x.ig);
  const turnos=turnosList(),cont={abaixo:0,acima:0,ok:0,sem:0};lista.forEach(x=>cont[x.sit.k]++);
  const nomeMes=MESES_PT[+ym.slice(5,7)-1];
  const simN=Object.keys(XMD.set).length,imp=XMD.sim&&simN?xmdImpacto(gcargos,days):[];
  const opts=xfoOpcoes();
  const simBox=`<div class="${XMD.sim?"xmdsim":""}" style="margin-bottom:10px">
    <label style="display:flex;gap:8px;align-items:center;font-weight:700;cursor:pointer"><input type="checkbox" id="xmdsim" ${XMD.sim?"checked":""}> Teste de escala <span class="sub" style="font-weight:400">— simule folgas e veja a cobertura na hora, sem gravar nada</span></label>
    ${XMD.sim?`<div class="row" style="align-items:flex-end;margin-top:8px"><div><label>Quem quer folgar</label><select id="xmdsp">${lista.map(x=>`<option value="${x.ig.id}">${esc(nomeInteg(x.ig))} — ${esc(cargoDe(x.ig))}</option>`).join("")}</select></div><div><label>Dia</label><input type="date" id="xmdsd" value="${days[0]||""}" min="${days[0]||""}" max="${days[days.length-1]||""}"></div><button type="button" class="b sm" id="xmdsadd" style="flex:none">Simular folga</button></div>
    <p class="sub" style="margin:6px 0">Você também pode clicar direto num quadradinho de plantão da grade. Os dias em azul são só simulação.</p>
    <div>${simN?Object.keys(XMD.set).sort((a,b)=>a.split("|")[1].localeCompare(b.split("|")[1])).map(k=>{const[id,d]=k.split("|"),ig=S.integrantes[id];return ig?`<span class="xmdchip">${esc(nomeInteg(ig))} · ${brDate(d).slice(0,5)}<button type="button" data-xmdsdel="${esc(k)}" title="Tirar do teste">×</button></span>`:""}).join(""):`<span class="sub">Nenhuma folga simulada ainda.</span>`}</div>
    ${simN?`<div class="callout ${imp.length?"sand":""}" style="margin:8px 0">${imp.length?`<b>Atenção:</b> com esse teste ${imp.length===1?"fica 1 plantão descoberto":"ficam "+imp.length+" plantões descobertos"}: ${imp.slice(0,8).map(x=>`dia ${x.dia.slice(8)}/${x.dia.slice(5,7)} (${esc(x.cargo)}, falta ${x.turno==="D"?"diurno":"noturno"})`).join("; ")}${imp.length>8?"…":""}.`:`<b>Tudo certo:</b> com essas folgas a cobertura mínima (${cfgc.d} diurno + ${cfgc.n} noturno) continua atendida em todos os dias mostrados.`}</div>
    <div class="chips"><button type="button" class="b" id="xmdsapl" ${podeE?"":"disabled"}>Aplicar essas folgas de verdade</button><button type="button" class="b sec" id="xmdslimpa">Limpar o teste</button></div>`:""}`:""}</div>`;
  return `<div class="card"><h2>Escala do período — quem trabalha em cada dia</h2>
   <p class="sub" style="margin:0 0 10px">Cada quadradinho é um dia: <b>D</b> plantão diurno, <b>N</b> noturno, <b>F</b> folga, <b>FE</b> folga extra. <b>Clique num quadradinho</b> para lançar uma folga ou ajustar o dia. Na tabela <b>Resumo do mês</b>, abaixo da grade, ficam o horário, a escala, os dias de plantão e a meta de folgas extras de cada pessoa.</p>
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
    <input id="xfobusca" list="xfodl" autocomplete="off" placeholder="Ex.: Venice" style="max-width:440px"><datalist id="xfodl">${opts.map(o=>`<option value="${esc(o.label)}"></option>`).join("")}</datalist>
    <div class="chips" style="margin-top:6px">${ESCUI.sel.length?ESCUI.sel.map(id=>S.integrantes[id]?`<span class="xmdchip" style="background:#D6EDD8;color:#1E5C2A">${esc(nomeInteg(S.integrantes[id]))}<button type="button" data-xfodel="${id}" title="Tirar da lista">×</button></span>`:"").join(""):`<span class="sub">Nenhuma pessoa escolhida: aparecem todas.</span>`}</div></div>
   <details id="xfopessoas" ${ESCUI.selAberto?"open":""} style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700">Ou marque na lista completa: ${ESCUI.sel.length?ESCUI.sel.length+" selecionada(s)":"todas"}</summary>
    <div style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:6px;columns:2 220px">${todosElegiveis.map(i=>`<label style="display:block;break-inside:avoid;font-weight:400;padding:2px 0"><input type="checkbox" data-xfosel="${i.id}" ${ESCUI.sel.includes(i.id)?"checked":""}> ${esc(nomeInteg(i))} <span class="sub">${esc(cargoDe(i))}</span></label>`).join("")||'<span class="sub">Ninguém com turno definido.</span>'}</div>
    <div class="chips" style="margin-top:6px"><button type="button" class="b sec sm" id="xfoselnada">Mostrar todas as pessoas</button><button type="button" class="b sec sm" id="xfoselfiltro">Marcar quem está nos filtros acima</button></div></details>
   ${simBox}
   ${incons.length?`<div class="callout sand" style="margin-bottom:10px"><b>Atenção:</b> ${incons.length} pessoa(s) estão com turno 12×36, mas a escala está em “dias fixos da semana”, por isso a grade não alterna: ${incons.slice(0,6).map(i=>esc(nomeInteg(i))).join(", ")}${incons.length>6?"…":""}. No <b>Resumo do mês</b>, coluna <b>Escala</b>, escolha <b>12×36 · alterna</b> (informe um dia em que a pessoa trabalha).</div>`:""}
   <div class="chips" style="margin-bottom:10px">
    <button type="button" class="b" id="xfopdf">Baixar PDF do mês</button>
    <button type="button" class="b sec" id="xfoprint">Imprimir escala do mês</button>
    <label style="display:inline-flex;gap:6px;align-items:center;font-size:12px" title="Quantas pessoas cabem em cada folha do PDF e da impressão">Pessoas por folha <select id="xmdpf" style="width:auto">${[4,6,8,10].map(n=>`<option ${n===XMD.porFolha?"selected":""}>${n}</option>`).join("")}</select></label>
    <button type="button" class="b sec sm" id="xfotodos" ${podeE?"":"disabled"}>Definir a mesma meta para todos os filtrados</button>
    <button type="button" class="b sec sm" id="xfocopia" ${podeE?"":"disabled"}>Copiar metas do mês anterior</button>
    <button type="button" class="b sec sm" id="xfocsv">Baixar planilha (CSV)</button>
    ${(ESCUI.cargo||ESCUI.modo||ESCUI.turno||ESCUI.meta||ESCUI.sel.length)?`<button type="button" class="b sec sm" id="xfolimpa">Limpar filtros</button>`:""}</div>
   <div class="sub" style="margin-bottom:8px">Folgas extras em ${nomeMes} de ${ym.slice(0,4)}: <b>${cont.ok}</b> na meta · <b style="color:var(--urgente)">${cont.abaixo}</b> abaixo · <b style="color:var(--madeira)">${cont.acima}</b> acima · ${cont.sem} sem meta. Mostrando ${lista.length} pessoa(s).${cobs.length?` Cobertura mínima:
     <input type="number" min="0" max="9" id="xmdcd" value="${cfgc.d}" style="width:46px;padding:2px 4px;font-size:12px" ${podeE?"":"disabled"}> diurno e
     <input type="number" min="0" max="9" id="xmdcn" value="${cfgc.n}" style="width:46px;padding:2px 4px;font-size:12px" ${podeE?"":"disabled"}> noturno por dia.`:""}</div>
   ${!days.length?`<div class="callout sand">Período inválido: a data "De" precisa ser antes da data "Até".</div>`:days.length>46?`<div class="callout sand">Escolha um período de até 45 dias para ver a grade.</div>`:
   !lista.length?`<div class="empty">${xfoPessoas().base.length?"Nenhuma pessoa com esses filtros.":"Nenhum integrante com turno definido ainda. Defina o turno de cada um logo abaixo."}</div>`:
   `${XMD.sim?`<div class="callout" style="margin-bottom:8px;background:#E8F1FB;color:#1d4f86"><b>TESTE:</b> nada foi gravado. Os quadradinhos em azul são folgas simuladas.</div>`:""}
    ${xmdGrade(lista,days,cobs)}
    <div class="legend" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px">${xmdCorLegenda()}</div>
    ${xmdResumo(lista,ym,podeE)}
    <p class="sub" style="margin-top:8px">“Folgas” conta todos os dias de folga do mês; “Extras” são as folgas lançadas em dias em que a pessoa trabalharia pela escala (FE). A meta de extras vale para o mês mostrado e continua valendo nos meses seguintes até você mudar. Quem tem 12×36 “alterna” troca de dias pares para ímpares sozinha na virada do mês, conforme o ciclo.</p>`}
   </div>`;
}
const xmdBindTurnos0=bindTurnos;
bindTurnos=function(){
  xmdBindTurnos0.apply(this,arguments);
  const R=()=>go("turnos",true);
  const sim=document.getElementById("xmdsim");
  if(sim)sim.onchange=()=>{XMD.sim=sim.checked;if(!sim.checked)XMD.set={};R()};
  const toggle=(id,d)=>{
    const ig=S.integrantes[id];if(!ig)return;
    const k=xmdKey(id,d);
    if(XMD.set[k]){delete XMD.set[k];R();return}
    const e=(()=>{const s=XMD.sim;XMD.sim=false;const r=escalaDia(ig,d);XMD.sim=s;return r})();
    if(!e.on){toast("Essa pessoa já não trabalha nesse dia ("+brDate(d).slice(0,5)+"): escolha um dia de plantão.",true);return}
    XMD.set[k]=true;R();
  };
  if(XMD.sim)document.querySelectorAll(".xmdc[data-escd]").forEach(b=>b.onclick=()=>{const[id,d]=b.dataset.escd.split("|");toggle(id,d)});
  const add=document.getElementById("xmdsadd");if(add)add.onclick=()=>{const id=document.getElementById("xmdsp").value,d=document.getElementById("xmdsd").value;if(!id||!d)return toast("Escolha a pessoa e o dia.",true);toggle(id,d)};
  document.querySelectorAll("[data-xmdsdel]").forEach(b=>b.onclick=()=>{delete XMD.set[b.dataset.xmdsdel];R()});
  const lim=document.getElementById("xmdslimpa");if(lim)lim.onclick=()=>{XMD.set={};R()};
  const apl=document.getElementById("xmdsapl");if(apl)apl.onclick=async()=>{
    if(!podeEd("turnos"))return toast("Você só pode consultar esta tela.",true);
    const ks=Object.keys(XMD.set);if(!ks.length)return;
    if(!(await askConfirm("Gravar "+ks.length+" folga(s) de verdade na escala?","Gravar")))return;
    const em=new Date().toISOString();
    escMutate(l=>[...l,...ks.map(k=>{const[id,d]=k.split("|");return{id:uid8(),uid:id,tipo:"folga",de:d,ate:d,turno:null,obs:"Folga pedida (teste de escala)",em}})]);
    try{audit("Folgas do teste de escala",ks.length+" folga(s)")}catch(e){}
    XMD.set={};XMD.sim=false;toast(ks.length+" folga(s) gravadas na escala.");afterOc();
  };
  const pf=document.getElementById("xmdpf");if(pf)pf.onchange=()=>{XMD.porFolha=+pf.value||8};
  const cd=document.getElementById("xmdcd"),cn=document.getElementById("xmdcn");
  const salvaCob=()=>{if(!podeEd("turnos"))return;xmsave("turnos",{cobMin:{d:Math.max(0,+cd.value||0),n:Math.max(0,+cn.value||0)}});R()};
  if(cd)cd.onchange=salvaCob;if(cn)cn.onchange=salvaCob;
};

/* ---------- preparo para impressão e PDF (modelo da Casa Hiro) ---------- */
function xmdPrep(){
  const ym=xfoYm(ESCUI.start||isoDate(new Date())),dias=xfoDiasMes(ym),{lista}=xmdLista(dias);
  if(!lista.length){toast("Nenhuma pessoa para emitir com esses filtros.",true);return null}
  const cargosL=[...new Set(lista.map(x=>cargoDe(x.ig)))],cobs=xmdCobertura(cargosL,dias);
  const n=Math.max(2,+XMD.porFolha||8),folhas=[];
  for(let i=0;i<lista.length;i+=n)folhas.push(lista.slice(i,i+n));
  const filtros=[ESCUI.cargo&&"Cargo: "+ESCUI.cargo,ESCUI.modo&&"Escala: "+(XFO_MODOS.find(x=>x[0]===ESCUI.modo)||[0,""])[1],ESCUI.turno&&"Turno "+ESCUI.turno,ESCUI.sel.length&&ESCUI.sel.length+" pessoa(s) escolhida(s)"].filter(Boolean).join(" · ");
  const tipos=[...new Set(lista.map(x=>x.ps.info.tp))],turnoTxt=tipos.length===2?"diurno e noturno":tipos[0]==="N"?"noturno":"diurno";
  const doze=lista.some(x=>eh1236(x.ig));
  return{ym,dias,lista,cobs,folhas,filtros,nomeMes:MESES_PT[+ym.slice(5,7)-1]+" de "+ym.slice(0,4),sim:XMD.sim&&Object.keys(XMD.set).length>0,sub:(doze?"Plantões 12×36 · ":"")+turnoTxt};
}
const xmdHoje=()=>new Date().toLocaleDateString("pt-BR");
function xmdHtml(D,lg){
  const nd=D.dias.length,wk=d=>pyWeekday(d)>=5,rowH=D.folhas[0].length>=8?22:D.folhas[0].length>=6?26:32;
  const css=`<style>.xmpf{font-family:Arial,Helvetica,sans-serif;color:#222;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:always;break-after:page;background:#fff}.xmpf:last-child{page-break-after:auto;break-after:auto}
  .xmpf .band{background:#1E5C2A;color:#fff;border-radius:6px;padding:7px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .xmpf .band b{font-family:Georgia,serif;font-size:20px;letter-spacing:.5px}.xmpf .band i{font-size:9px;opacity:.85;display:block}.xmpf .band .r{text-align:right}.xmpf .band .r b{font-size:17px}
  .xmpf table.g{width:100%;border-collapse:separate;border-spacing:1.5px;table-layout:fixed;font-size:9px}
  .xmpf table.g th{background:#2E7D32;color:#fff;border-radius:3px;padding:2px 0;line-height:1.1;font-size:9px}.xmpf table.g th.w{background:#1E5C2A}.xmpf table.g th small{display:block;font-weight:400;font-size:6.5px}
  .xmpf table.g th.n{text-align:left;padding-left:6px;font-size:10px;width:128px}
  .xmpf table.g td.p{border:1px solid #d8d0bd;border-radius:3px;font-weight:700;font-size:9px;padding:0 5px;height:${rowH}px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .xmpf td.c{text-align:center;border-radius:3px;font-weight:800;font-size:${rowH>24?12:10}px;height:${rowH}px;padding:0}
  .xmpf .k-d{background:#A9D5A0;color:#1E5C2A}.xmpf .k-n{background:#1B4F72;color:#fff}.xmpf .k-f{background:#E6DFD0;color:#8A8577;font-weight:400;font-size:8px}.xmpf .k-fe{background:#fff;color:#8C4A1F;box-shadow:inset 0 0 0 1.5px #8C4A1F;font-size:8px}.xmpf .k-na{color:#aaa;font-weight:400;box-shadow:inset 0 0 0 .5px #ccc}.xmpf .k-sim{background:#E8F1FB!important;color:#2D6FB7!important;box-shadow:inset 0 0 0 1.5px #2D6FB7!important}
  .xmpf tr.gr td{background:#D6EDD8;color:#1E5C2A;font-weight:700;font-size:9px;padding:2px 6px;border-radius:3px}
  .xmpf td.cvl{background:#F3EBD8;font-weight:700;font-size:8px;padding:0 5px;border-radius:3px;height:20px;white-space:nowrap;overflow:hidden}.xmpf td.cv{background:#F3EBD8;color:#2E7D32;text-align:center;font-weight:800;font-size:10px;border-radius:3px}.xmpf td.cv.bad{background:#8C4A1F;color:#fff;font-size:7.5px;line-height:1}
  .xmpf .rl{display:flex;gap:14px;margin-top:8px;align-items:flex-start}.xmpf .rl .res{flex:1 1 66%}.xmpf .rl .leg{flex:0 0 31%;font-size:8.5px;line-height:1.7}
  .xmpf h4{font-family:Georgia,serif;color:#1E5C2A;font-size:12px;margin:0 0 3px}
  .xmpf table.r{width:100%;border-collapse:collapse;font-size:8.5px}.xmpf table.r th{background:#2E7D32;color:#fff;padding:3px 5px;text-align:left;font-size:8.5px}.xmpf table.r td{border:1px solid #cfc7b3;padding:2px 5px}.xmpf table.r td.n,.xmpf table.r th.n{text-align:center}.xmpf table.r td.d{font-size:7.5px}
  .xmpf .leg i{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:-2px;text-align:center;font-style:normal;font-size:8px;font-weight:800;line-height:12px;margin-right:4px}
  .xmpf .sig{display:flex;justify-content:space-between;gap:60px;margin-top:22px;font-size:9px}.xmpf .sig div{flex:1;border-top:1px solid #444;padding-top:2px}.xmpf .sig div:last-child{flex:0 0 22%}
  .xmpf .ft{display:flex;justify-content:space-between;font-size:7.5px;color:#8C5A32;font-style:italic;margin-top:6px}</style>`;
  const logo=lg&&lg.branco?`<img src="${lg.branco}" style="height:34px;margin-right:10px;vertical-align:middle">`:"";
  const folhas=D.folhas.map((fl,fi)=>{
    const ultima=fi===D.folhas.length-1;
    const head=`<tr><th class="n">Integrante</th>${D.dias.map(d=>`<th class="${wk(d)?"w":""}">${d.slice(8)}<small>${WD[pyWeekday(d)]}</small></th>`).join("")}</tr>`;
    const linha=x=>`<tr><td class="p">${esc(nomeInteg(x.ig))}</td>${x.ps.cods.map(c=>`<td class="c k-${c.k}${c.sim?" k-sim":""}">${c.c}</td>`).join("")}</tr>`;
    let corpo="";
    if(ESCUI.group==="cargo"){const gs=[...new Set(fl.map(x=>cargoDe(x.ig)))];corpo=gs.map(g=>`<tr class="gr"><td colspan="${nd+1}">${esc(g)}</td></tr>`+fl.filter(x=>cargoDe(x.ig)===g).map(linha).join("")).join("")}
    else corpo=fl.map(linha).join("");
    const cov=ultima?D.cobs.map(c=>`<tr><td class="cvl">${esc(xmdRotuloCob(c))}</td>${c.linha.map(x=>x.falta.length?`<td class="cv bad">${x.falta.join("/")}<br>?</td>`:`<td class="cv">✓</td>`).join("")}</tr>`).join(""):"";
    const res=`<table class="r"><thead><tr><th>Integrante</th><th>Cargo</th><th>Horário</th><th>Trabalha</th><th>Dias de plantão</th><th class="n">Plant.</th><th class="n">Folgas</th><th class="n">Extras</th></tr></thead><tbody>${fl.map(x=>{const m=x.mes;return`<tr><td><b>${esc(nomeInteg(x.ig))}</b></td><td>${esc(cargoDe(x.ig))}</td><td style="white-space:nowrap">${esc(m.nomeTurno)} ${esc(m.info.hor)}</td><td style="white-space:nowrap">${esc(m.trabalha)}</td><td class="d">${m.trab.map(d=>+d.slice(8)).join(" ")}</td><td class="n"><b>${m.plantoes}</b></td><td class="n">${m.folgas}</td><td class="n">${m.extras}</td></tr>`}).join("")}</tbody></table>`;
    const leg=`<h4>Legenda</h4><div><i class="k-d">D</i>Plantão diurno</div><div><i class="k-n">N</i>Plantão noturno (do dia marcado até a manhã seguinte)</div><div><i class="k-f" style="background:#E6DFD0">F</i>Folga da escala</div><div><i class="k-fe">FE</i>Folga extra (lançada em dia de plantão)</div>${D.cobs.length?`<div><i style="background:#8C4A1F;color:#fff">?</i>Plantão descoberto — definir quem cobre</div>`:""}<div style="color:#666">Colunas em verde-escuro = sábados e domingos.</div>`;
    return`<div class="xmpf"><div class="band"><div>${logo}<b>CASA HIRO</b><i>A ciência do cuidado com o acolhimento de casa.</i></div><div class="r"><b>Escala de ${esc(D.nomeMes)}</b><i>${esc(D.sub)}${D.filtros?" · "+esc(D.filtros):""} · emitida em ${xmdHoje()}${D.sim?" · SIMULAÇÃO, NÃO GRAVADA":""}</i></div></div>
     <table class="g"><thead>${head}</thead><tbody>${corpo}${cov}</tbody></table>
     <div class="rl"><div class="res"><h4>Resumo do mês</h4>${res}</div><div class="leg">${leg}</div></div>
     <div class="sig"><div>Responsável</div><div>Data</div></div><div class="ft"><span>Casa Hiro™ · Caraguatatuba — Litoral Norte de SP</span><span>Página ${fi+1} de ${D.folhas.length}</span></div></div>`;
  }).join("");
  return css+folhas;
}
async function xfoImprime(){
  const D=xmdPrep();if(!D)return;
  let lg=null;try{lg=await logosMarca()}catch(e){}
  const pg=document.createElement("style");pg.id="xfopage";pg.textContent="@page{size:A4 landscape;margin:8mm}";document.head.appendChild(pg);
  const ov=xmPrint("Escala de "+D.nomeMes,xmdHtml(D,lg));
  const fim=()=>{const e=document.getElementById("xfopage");if(e)e.remove()};
  const mo=new MutationObserver(()=>{if(!ov.isConnected){fim();mo.disconnect()}});mo.observe(document.body,{childList:true,subtree:true});
}

/* ---------- PDF (desenhado direto no jsPDF, no mesmo modelo) ---------- */
const XMDC={verde:[30,92,42],verde2:[46,125,50],pal:[214,237,216],d:[169,213,160],n:[27,79,114],f:[230,223,208],fm:[138,133,119],mad:[140,74,31],creme:[243,235,216],txt:[34,34,34],linha:[207,199,179],sim:[45,111,183],simbg:[232,241,251]};
function xmdFit(doc,s,w){s=String(s);if(doc.getTextWidth(s)<=w)return s;while(s.length>1&&doc.getTextWidth(s+"…")>w)s=s.slice(0,-1);return s+"…"}
function xmdQuebra(doc,str,w,max){
  const ps=String(str).split(/\s+/),L=[];let cur="";
  ps.forEach(p=>{const t=cur?cur+" "+p:p;if(doc.getTextWidth(t)<=w||!cur)cur=t;else{L.push(cur);cur=p}});if(cur)L.push(cur);
  if(L.length>max){const rest=L.slice(max-1).join(" ");L.length=max-1;L.push(xmdFit(doc,rest,w))}
  return L.map(x=>xmdFit(doc,x,w));
}
function xmdDesenha(doc,D,lg){
  const C=XMDC,W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=24,nd=D.dias.length,nameW=132;
  const dayW=(W-2*M-nameW)/nd;
  const fill=c=>doc.setFillColor(c[0],c[1],c[2]),draw=c=>doc.setDrawColor(c[0],c[1],c[2]),ink=c=>doc.setTextColor(c[0],c[1],c[2]);
  D.folhas.forEach((fl,fi)=>{
    if(fi>0)doc.addPage();
    const ultima=fi===D.folhas.length-1;
    /* faixa */
    fill(C.verde);doc.roundedRect(M,16,W-2*M,40,5,5,"F");
    if(lg&&lg.branco){try{doc.addImage(lg.branco,"PNG",M+8,20,24,33)}catch(e){}}
    ink([255,255,255]);doc.setFont("times","bold");doc.setFontSize(17);doc.text("CASA HIRO",M+40,34);
    doc.setFont("times","italic");doc.setFontSize(7.5);ink([214,237,216]);doc.text("A ciência do cuidado com o acolhimento de casa.",M+40,46);
    doc.setFont("times","bold");doc.setFontSize(15);ink([255,255,255]);doc.text("Escala de "+D.nomeMes,W-M-10,33,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);ink([214,237,216]);
    doc.text(xmdFit(doc,D.sub+(D.filtros?" · "+D.filtros:"")+" · emitida em "+xmdHoje()+(D.sim?" · SIMULAÇÃO, NÃO GRAVADA":""),W-2*M-190),W-M-10,46,{align:"right"});
    /* cabeçalho da grade */
    let y=64;const headH=24;
    fill(C.verde2);doc.roundedRect(M,y,nameW-2,headH,3,3,"F");ink([255,255,255]);doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text("Integrante",M+7,y+headH/2,{baseline:"middle"});
    D.dias.forEach((d,i)=>{const x=M+nameW+i*dayW,w=pyWeekday(d)>=5;fill(w?C.verde:C.verde2);doc.roundedRect(x+.6,y,dayW-1.2,headH,2,2,"F");ink([255,255,255]);
      doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(d.slice(8),x+dayW/2,y+9,{align:"center",baseline:"middle"});doc.setFont("helvetica","normal");doc.setFontSize(5.5);doc.text(WD[pyWeekday(d)],x+dayW/2,y+18,{align:"center",baseline:"middle"})});
    y+=headH+2;
    /* altura das linhas conforme o que ainda precisa caber embaixo */
    const grupos=ESCUI.group==="cargo"?[...new Set(fl.map(x=>cargoDe(x.ig)))]:[];
    const reserva=(ultima?D.cobs.length*17:0)+16+13+fl.length*12.5+8+40;
    const rowH=Math.max(15,Math.min(36,(H-y-reserva-grupos.length*13)/fl.length));
    const linha=x=>{
      fill([255,255,255]);draw(C.linha);doc.setLineWidth(.5);doc.roundedRect(M,y,nameW-2,rowH-2,3,3,"FD");ink(C.txt);doc.setFont("helvetica","bold");doc.setFontSize(7.5);
      {let nl=xmdQuebra(doc,nomeInteg(x.ig),nameW-14,2);if(nl.length>1&&rowH<19){nl=[xmdFit(doc,nomeInteg(x.ig),nameW-14)]}
       if(nl.length>1)doc.setFontSize(6.8);nl.forEach((t,k)=>doc.text(t,M+6,y+(rowH-2)/2+(k-(nl.length-1)/2)*8,{baseline:"middle"}))}
      x.ps.cods.forEach((c,i)=>{const cx=M+nameW+i*dayW+.6,cw=dayW-1.2,ch=rowH-2;
        if(c.k==="d"){fill(C.d);doc.roundedRect(cx,y,cw,ch,2,2,"F");ink(C.verde);doc.setFont("helvetica","bold");doc.setFontSize(Math.min(10,rowH*.42));doc.text("D",cx+cw/2,y+ch/2,{align:"center",baseline:"middle"})}
        else if(c.k==="n"){fill(C.n);doc.roundedRect(cx,y,cw,ch,2,2,"F");ink([255,255,255]);doc.setFont("helvetica","bold");doc.setFontSize(Math.min(10,rowH*.42));doc.text("N",cx+cw/2,y+ch/2,{align:"center",baseline:"middle"})}
        else if(c.k==="fe"){fill(c.sim?C.simbg:[255,255,255]);draw(c.sim?C.sim:C.mad);doc.setLineWidth(1.1);doc.roundedRect(cx+.5,y+.5,cw-1,ch-1,2,2,"FD");ink(c.sim?C.sim:C.mad);doc.setFont("helvetica","bold");doc.setFontSize(Math.min(7,rowH*.3));doc.text("FE",cx+cw/2,y+ch/2,{align:"center",baseline:"middle"})}
        else if(c.k==="na"){draw([200,200,200]);doc.setLineWidth(.4);doc.roundedRect(cx,y,cw,ch,2,2,"S");ink([170,170,170]);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text("-",cx+cw/2,y+ch/2,{align:"center",baseline:"middle"})}
        else{fill(C.f);doc.roundedRect(cx,y,cw,ch,2,2,"F");ink(C.fm);doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.text("F",cx+cw/2,y+ch/2,{align:"center",baseline:"middle"})}});
      y+=rowH;
    };
    if(grupos.length)grupos.forEach(g=>{fill(C.pal);doc.roundedRect(M,y,W-2*M,11,2,2,"F");ink(C.verde);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(g,M+6,y+5.5,{baseline:"middle"});y+=13;fl.filter(x=>cargoDe(x.ig)===g).forEach(linha)});
    else fl.forEach(linha);
    /* cobertura 24h */
    if(ultima)D.cobs.forEach(c=>{
      fill(C.creme);doc.roundedRect(M,y,nameW-2,15,2,2,"F");ink(C.txt);doc.setFont("helvetica","bold");doc.setFontSize(5.4);{const rl=xmdRotuloCob(c),i2=rl.indexOf(" (");const l1=i2>0?rl.slice(0,i2):rl,l2=i2>0?rl.slice(i2+1):"";doc.text(xmdFit(doc,l1,nameW-8),M+4,y+(l2?5.3:7.5),{baseline:"middle"});if(l2)doc.text(xmdFit(doc,l2,nameW-8),M+4,y+11,{baseline:"middle"})}
      c.linha.forEach((x,i)=>{const cx=M+nameW+i*dayW+.6,cw=dayW-1.2;
        if(x.falta.length){fill(C.mad);doc.roundedRect(cx,y,cw,15,2,2,"F");ink([255,255,255]);doc.setFont("helvetica","bold");doc.setFontSize(5.5);doc.text(x.falta.join("/"),cx+cw/2,y+5,{align:"center",baseline:"middle"});doc.text("?",cx+cw/2,y+11,{align:"center",baseline:"middle"})}
        else{fill(C.creme);doc.roundedRect(cx,y,cw,15,2,2,"F");draw(C.verde2);doc.setLineWidth(1);const mx=cx+cw/2,my=y+7.5;doc.line(mx-3,my,mx-1,my+2.5);doc.line(mx-1,my+2.5,mx+3.5,my-3)}});
      y+=17;
    });
    /* resumo do mês */
    y+=6;ink(C.verde);doc.setFont("times","bold");doc.setFontSize(10);doc.text("Resumo do mês",M,y+7);y+=11;
    const cols=[["Integrante",134],["Cargo",66],["Horário",78],["Trabalha",54],["Dias de plantão",150],["Plant.",28],["Folgas",28],["Extras",28]],tw=cols.reduce((s,c)=>s+c[1],0);
    fill(C.verde2);doc.rect(M,y,tw,13,"F");ink([255,255,255]);doc.setFont("helvetica","bold");doc.setFontSize(6.8);
    let cx=M;cols.forEach((c,k)=>{if(k>=5)doc.text(c[0],cx+c[1]/2,y+6.5,{align:"center",baseline:"middle"});else doc.text(c[0],cx+4,y+6.5,{baseline:"middle"});cx+=c[1]});y+=13;
    fl.forEach((x,ri)=>{const m=x.mes,vals=[nomeInteg(x.ig),cargoDe(x.ig),(m.nomeTurno+" "+m.info.hor).trim(),m.trabalha,m.trab.map(d=>+d.slice(8)).join(" "),String(m.plantoes),String(m.folgas),String(m.extras)];
      if(ri%2){fill([248,244,234]);doc.rect(M,y,tw,12.5,"F")}draw(C.linha);doc.setLineWidth(.4);doc.rect(M,y,tw,12.5,"S");
      let px=M;vals.forEach((v,k)=>{ink(C.txt);doc.setFont("helvetica",k===0||k===5?"bold":"normal");doc.setFontSize(k===4?5.8:6.6);
        if(k>=5)doc.text(v,px+cols[k][1]/2,y+6.3,{align:"center",baseline:"middle"});else doc.text(xmdFit(doc,v,cols[k][1]-7),px+4,y+6.3,{baseline:"middle"});px+=cols[k][1]});
      y+=12.5});
    /* legenda */
    let ly=y-fl.length*12.5-13-2;const lx=M+tw+18;
    ink(C.verde);doc.setFont("times","bold");doc.setFontSize(10);doc.text("Legenda",lx,ly-4);ly+=6;
    const item=(k,t,txt)=>{if(k==="d"){fill(C.d);doc.roundedRect(lx,ly-5,11,9,1.5,1.5,"F");ink(C.verde)}else if(k==="n"){fill(C.n);doc.roundedRect(lx,ly-5,11,9,1.5,1.5,"F");ink([255,255,255])}else if(k==="f"){fill(C.f);doc.roundedRect(lx,ly-5,11,9,1.5,1.5,"F");ink(C.fm)}else if(k==="fe"){fill([255,255,255]);draw(C.mad);doc.setLineWidth(1);doc.roundedRect(lx,ly-5,11,9,1.5,1.5,"FD");ink(C.mad)}else{fill(C.mad);doc.roundedRect(lx,ly-5,11,9,1.5,1.5,"F");ink([255,255,255])}
      doc.setFont("helvetica","bold");doc.setFontSize(5.8);doc.text(t,lx+5.5,ly-.5,{align:"center",baseline:"middle"});ink(C.txt);doc.setFont("helvetica","normal");doc.setFontSize(6.6);doc.text(xmdFit(doc,txt,W-M-lx-16),lx+16,ly-.5,{baseline:"middle"});ly+=12};
    item("d","D","Plantão diurno");item("n","N","Plantão noturno (do dia marcado até a manhã seguinte)");item("f","F","Folga da escala");item("fe","FE","Folga extra (lançada em dia de plantão)");if(D.cobs.length)item("x","?","Plantão descoberto — definir quem cobre");
    ink(C.fm);doc.setFont("helvetica","normal");doc.setFontSize(6.2);doc.text("Colunas em verde-escuro = sábados e domingos.",lx,ly+2);
    /* assinatura e rodapé */
    draw(C.txt);doc.setLineWidth(.5);doc.line(M,H-44,W-M-170,H-44);doc.line(W-M-130,H-44,W-M,H-44);ink(C.txt);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text("Responsável",M,H-35);doc.text("Data",W-M-130,H-35);
    doc.setFont("times","italic");doc.setFontSize(6.5);ink([140,90,50]);doc.text("Casa Hiro™ · Caraguatatuba — Litoral Norte de SP",M,H-18);doc.text("Página "+(fi+1)+" de "+D.folhas.length,W-M,H-18,{align:"right"});
  });
}
async function xfoPdf(){
  const D=xmdPrep();if(!D)return;
  if(typeof window.jspdf==="undefined"||!window.jspdf.jsPDF){toast("A biblioteca de PDF não carregou. Recarregue a página e tente de novo.",true);return}
  try{
    const lg=await logosMarca(),{jsPDF}=window.jspdf,doc=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"});
    xmdDesenha(doc,D,lg);
    const un=ESCUI.sel.length===1&&S.integrantes[ESCUI.sel[0]]?"-"+estNorm(nomeInteg(S.integrantes[ESCUI.sel[0]])).replace(/\s+/g,"-"):"";
    const ok=await saveFile("escala-"+D.ym+un+".pdf",new Uint8Array(doc.output("arraybuffer")));
    if(ok)toast("PDF da escala de "+D.nomeMes+" baixado ("+D.folhas.length+" folha"+(D.folhas.length>1?"s":"")+").");
  }catch(e){console.error(e);toast("Não consegui gerar o PDF: "+(e.message||e),true)}
}


/* >>> x_m24.js */
