/* ================= CUIDADOS E ROTINA ================= */
const resAtivos=()=>resAll().filter(resAtivo);
const agoraHM=()=>{const d=new Date();return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const minDe=hm=>{const[a,b]=hm.split(":").map(Number);return a*60+(b||0)};

/* ---------- medicação do dia (registro de administração) ---------- */
function medHoras(txt){
  txt=String(txt||"").toLowerCase();if(!txt.trim())return[];
  const iv=txt.match(/(\d{1,2})\s*\/\s*\d{1,2}\s*h/);
  if(iv){const n=+iv[1];const mapa={4:["06:00","10:00","14:00","18:00","22:00","02:00"],6:["06:00","12:00","18:00","00:00"],8:["06:00","14:00","22:00"],12:["08:00","20:00"],24:["08:00"]};if(mapa[n])return mapa[n]}
  const out=[],re=/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/g;let m;
  while((m=re.exec(txt))){const h=+m[1],mi=m[2]?+m[2]:0;if(h<24&&mi<60)out.push(String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0"))}
  return[...new Set(out)].sort();
}
const MAR={data:hojeIso(),por:"",res:""};
function marSlots(data){
  const out=[];
  resAtivos().forEach(r=>(r.meds||[]).forEach(m=>{
    if((m.inicio&&m.inicio>data)||(m.fim&&m.fim<data))return;
    const hs=medHoras(m.horarios);
    (hs.length?hs:[""]).forEach(h=>out.push({r,m,h,id:`${r.id}_${m.id}_${data}_${h?h.replace(":",""):"sem"}`}));
  }));
  return out.sort((a,b)=>(a.h||"99").localeCompare(b.h||"99")||resNome(a.r).localeCompare(resNome(b.r),"pt"));
}
const marAtrasada=(s,data)=>{if(S.medreg[s.id]||!s.h)return false;const h=hojeIso();return data<h||(data===h&&minDe(s.h)+30<=minDe(agoraHM()))};
const MAR_ST={dado:["Administrado",0],recusado:["Recusou",2],indisponivel:["Não disponível",3]};
function marHtml(){
  const sl=marSlots(MAR.data).filter(s=>!MAR.res||s.r.id===MAR.res),reg=s=>S.medreg[s.id],h=hojeIso();
  const dados=sl.filter(s=>reg(s)&&reg(s).status==="dado").length,outros=sl.filter(s=>reg(s)&&reg(s).status!=="dado").length,atr=sl.filter(s=>marAtrasada(s,MAR.data)).length,pend=sl.length-dados-outros;
  const pode=podeEd("cuid");
  const controlados=resAtivos().flatMap(r=>(r.meds||[]).filter(m=>m.controlado&&(!m.fim||m.fim>=h)).map(m=>({r,m})));
  return `<div class="card"><div class="row" style="align-items:flex-end">
    <div style="flex:none"><label>Dia</label><div style="display:flex;gap:6px"><button class="b sec sm" data-mard="-1">‹</button><input type="date" id="mardata" value="${MAR.data}" style="width:150px"><button class="b sec sm" data-mard="1">›</button><button class="b sec sm" data-mard="0">Hoje</button></div></div>
    <div><label>Residente</label><select id="marres"><option value="">Todos</option>${xResOpts(MAR.res)}</select></div>
    ${pode?`<div><label>Quem está administrando *</label><select id="marpor"><option value=""></option>${xIntegOpts(MAR.por,true)}</select></div>`:""}</div>
   <div class="stats" style="margin-top:12px"><div class="stat"><b>${dados}</b><span>administradas</span></div><div class="stat ${pend?"warn":""}"><b>${pend}</b><span>a administrar</span></div><div class="stat"><b>${outros}</b><span>recusadas ou indisponíveis</span></div>
    <div class="stat ${atr?"bad":""}" ${atr?'style="border-left-color:var(--urgente)"':""}><b ${atr?'style="color:var(--urgente)"':""}>${atr}</b><span>atrasadas</span></div></div>
   ${sl.length?`<div class="wrap" style="margin-top:12px"><table><thead><tr><th>Hora</th><th>Residente</th><th>Medicamento</th><th>Dose / via</th><th>Situação</th><th></th></tr></thead><tbody>${sl.map(s=>{
     const g=reg(s),atras=marAtrasada(s,MAR.data),al=(s.r.alergias||"").trim();
     return `<tr ${atras?'style="background:var(--urgente-bg,#fdecea)"':""}><td><b>${s.h||"—"}</b></td><td><b>${esc(resNome(s.r))}</b><div class="sub">quarto ${esc(s.r.quarto||"—")}${al?` · <span style="color:var(--urgente)">alergia: ${esc(al)}</span>`:""}</div></td>
      <td>${esc(s.m.nome)}${s.m.controlado?` <span class="pill s-atestado">controlado</span>`:""}${s.m.obs?`<div class="sub">${esc(s.m.obs)}</div>`:""}${!s.h?`<div class="sub">sem horário definido</div>`:""}</td><td>${esc([s.m.dose,s.m.via].filter(Boolean).join(" · "))}</td>
      <td>${g?xPill(MAR_ST[g.status][1],MAR_ST[g.status][0])+`<div class="sub">${esc(xNomeInteg(g.por)||"")}${g.conf?" · conf. "+esc(xNomeInteg(g.conf)):""}${g.obs?" · "+esc(g.obs):""}</div>`:atras?xPill(3,"atrasada"):xPill(1,"a administrar")}</td>
      <td style="white-space:nowrap">${pode?(g?`<button class="b sec sm" data-mar="${s.id}|desfaz">Desfazer</button>`:`<button class="b sm" data-mar="${s.id}|dado">Administrado</button> <button class="b sec sm" data-mar="${s.id}|recusado">Recusou</button> <button class="b sec sm" data-mar="${s.id}|indisponivel">Faltou</button>`):""}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty" style="margin-top:12px">Nenhum medicamento com horário para este dia. Cadastre os medicamentos no Prontuário, aba “Medicamentos em uso”. Aceito horários como “8h e 20h”, “08:00, 14:00” ou “8/8h”.</div>`}
   <p class="sub" style="margin:10px 0 0">Registro interno de apoio à rotina. A prescrição válida é a assinada pelo médico. Horários do tipo “6/6h” são interpretados automaticamente (06h, 12h, 18h e 00h); confira.</p></div>
   ${controlados.length?`<div class="card"><h2>Medicamentos controlados — estoque de doses</h2>${controlados.map(({r,m})=>{const q=+m.estoque;return `<div class="doc"><div class="grow"><div class="nm">${esc(m.nome)} — ${esc(resNome(r))}</div><div class="sub">${isNaN(q)||m.estoque===""||m.estoque==null?"estoque não informado":q+" dose(s) restante(s)"}</div></div>${m.estoque!==""&&m.estoque!=null&&q<=5?xPill(q<=0?3:2,q<=0?"acabou":"acabando"):""}${pode?`<button class="b sec sm" data-marest="${r.id}|${m.id}">Ajustar estoque</button>`:""}</div>`}).join("")}</div>`:""}`;
}
function marRegistra(slotId,acao){
  const s=marSlots(MAR.data).find(x=>x.id===slotId);if(!s)return;
  const baixa=(delta)=>{if(!s.m.controlado||s.m.estoque===""||s.m.estoque==null)return;resSave(resAll().map(x=>x.id===s.r.id?{...x,meds:(x.meds||[]).map(m=>m.id===s.m.id?{...m,estoque:Math.max(0,+m.estoque+delta)}:m)}:x))};
  const antes=S.medreg[slotId];
  if(acao==="desfaz"){if(antes&&antes.status==="dado")baixa(1);del("medreg",slotId);return go("cuid",true)}
  if(!MAR.por)return toast("Escolha acima quem está administrando.",true);
  const grava=(extra)=>{
    if(antes&&antes.status==="dado"&&acao!=="dado")baixa(1);if(acao==="dado"&&!(antes&&antes.status==="dado"))baixa(-1);
    put("medreg",slotId,{res:s.r.id,med:s.m.id,medNome:s.m.nome,dose:s.m.dose||"",data:MAR.data,hora:s.h,status:acao,por:MAR.por,...extra,em:new Date().toISOString()});go("cuid",true);
  };
  if(acao==="dado"&&s.m.controlado){
    const ov=openModal(`<h3>Medicamento controlado</h3><p class="sub">${esc(s.m.nome)} — ${esc(resNome(s.r))}. Peça a conferência de uma segunda pessoa.</p><label>Conferido por *</label><select id="mcconf"><option value=""></option>${xIntegOpts("",true)}</select><div class="err" id="mcerr"></div>
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="mccx">Cancelar</button><button class="b" id="mcok">Registrar</button></div>`);
    ov.querySelector("#mccx").onclick=()=>ov.remove();
    ov.querySelector("#mcok").onclick=()=>{const c=ov.querySelector("#mcconf").value;if(!c)return ov.querySelector("#mcerr").textContent="Informe quem conferiu.";if(c===MAR.por)return ov.querySelector("#mcerr").textContent="Quem confere precisa ser outra pessoa.";ov.remove();grava({conf:c})};
    return;
  }
  if(acao!=="dado"){
    const ov=openModal(`<h3>${acao==="recusado"?"Residente recusou":"Medicamento não disponível"}</h3><label>O que aconteceu?</label><input id="mmobs" placeholder="Motivo e o que foi feito (ex.: avisada a enfermeira)"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="mmcx">Cancelar</button><button class="b" id="mmok">Registrar</button></div>`);
    ov.querySelector("#mmcx").onclick=()=>ov.remove();ov.querySelector("#mmok").onclick=()=>{const o=ov.querySelector("#mmobs").value.trim();ov.remove();grava({obs:o})};return;
  }
  grava({});
}
function bindMar(){
  const re=()=>go("cuid",true);
  document.querySelectorAll("[data-mard]").forEach(b=>b.onclick=()=>{const n=+b.dataset.mard;MAR.data=n===0?hojeIso():addDaysIso(MAR.data,n);re()});
  const d=$("mardata");if(d)d.onchange=()=>{if(d.value){MAR.data=d.value;re()}};
  const r=$("marres");if(r)r.onchange=()=>{MAR.res=r.value;re()};
  const p=$("marpor");if(p)p.onchange=()=>{MAR.por=p.value};
  document.querySelectorAll("[data-mar]").forEach(b=>b.onclick=()=>{const[id,ac]=b.dataset.mar.split("|");marRegistra(id,ac)});
  document.querySelectorAll("[data-marest]").forEach(b=>b.onclick=()=>{
    const[rid,mid]=b.dataset.marest.split("|"),r=resAll().find(x=>x.id===rid),m=(r.meds||[]).find(x=>x.id===mid);
    const ov=openModal(`<h3>Estoque de doses — ${esc(m.nome)}</h3><label>Doses restantes</label><input type="number" min="0" id="meq" value="${m.estoque??""}"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="mecx">Cancelar</button><button class="b" id="meok">Salvar</button></div>`);
    ov.querySelector("#mecx").onclick=()=>ov.remove();
    ov.querySelector("#meok").onclick=()=>{const v=ov.querySelector("#meq").value;resSave(resAll().map(x=>x.id===rid?{...x,meds:(x.meds||[]).map(y=>y.id===mid?{...y,estoque:v===""?"":+v}:y)}:x));ov.remove();re()};
  });
}
/* o formulário de medicamento ganha “controlado” e estoque de doses */
function openMed(resId){
  const ov=openModal(`<h3>Adicionar medicamento</h3><label>Medicamento</label><input id="mdn"><div class="row"><div><label>Dose</label><input id="mdd" placeholder="Ex.: 50 mg"></div><div><label>Via</label><input id="mdv" placeholder="Ex.: oral"></div></div>
   <div class="row"><div><label>Horários</label><input id="mdh" placeholder="Ex.: 8h e 20h, 08:00 14:00 ou 8/8h"></div><div><label>Início</label><input type="date" id="mdi" value="${hojeIso()}"></div></div><label>Observação (prescritor, cuidados)</label><input id="mdo">
   <div class="row" style="align-items:flex-end"><label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="mdc"><span>Medicamento controlado (exige dupla conferência)</span></label><div><label>Doses em estoque (opcional)</label><input type="number" min="0" id="mde"></div></div>
   <div class="err" id="mderr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="mdcx">Cancelar</button><button class="b" id="mdsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s);g("#mdcx").onclick=()=>ov.remove();
  g("#mdsv").onclick=()=>{
    const nome=g("#mdn").value.trim();if(!nome)return g("#mderr").textContent="Informe o medicamento.";
    const est=g("#mde").value;
    resSave(resAll().map(x=>x.id===resId?{...x,meds:[...(x.meds||[]),{id:uid8(),nome,dose:g("#mdd").value.trim(),via:g("#mdv").value.trim(),horarios:g("#mdh").value.trim(),inicio:g("#mdi").value,obs:g("#mdo").value.trim(),fim:"",controlado:g("#mdc").checked,estoque:est===""?"":+est}]}:x));
    ov.remove();toast("Medicamento adicionado.");go("pres",true);
  };
}

/* ---------- ocorrências dos residentes ---------- */
const OCO_TIPOS=["Queda","Lesão por pressão","Intercorrência clínica","Febre ou infecção","Diarreia aguda","Desidratação","Escabiose","Perda de peso ou desnutrição","Recusa alimentar","Erro ou evento com medicação","Evasão","Conflito ou agressão","Óbito","Outro"];
const OCO_RDC=["Queda","Lesão por pressão","Diarreia aguda","Desidratação","Escabiose","Perda de peso ou desnutrição","Óbito"];
const ocoCrud={id:"ocor2",col:"ocor2",mod:"cuid",novoLabel:"Registrar ocorrência",novoTit:"Registrar ocorrência",editTit:"Ocorrência",
  campos:[{k:"res",l:"Residente",t:"res",req:true,todos:true},{k:"tipo",l:"Tipo",t:"sel",opts:OCO_TIPOS,req:true},{k:"data",l:"Data",t:"date",req:true},{k:"hora",l:"Hora",t:"time"},
    {k:"local",l:"Local (quarto, banheiro, pátio…)"},{k:"grav",l:"Gravidade",t:"sel",opts:["leve","moderada","grave"],req:true,def:"leve"},
    {k:"desc",l:"O que aconteceu",t:"ta",req:true,full:true},{k:"conduta",l:"Condutas tomadas",t:"ta",full:true},
    {k:"famNot",l:"Família ou responsável avisado(a)",t:"check"},{k:"medNot",l:"Médico ou enfermeiro avisado",t:"check"},{k:"remocao",l:"Encaminhado a hospital ou pronto-socorro",t:"check"},{k:"evo",l:"Registrar também na evolução do prontuário",t:"check",def:true},
    {k:"status",l:"Situação",t:"sel",opts:["aberta","em acompanhamento","encerrada"],req:true,def:"aberta"},{k:"acomp",l:"Acompanhamento e desfecho",t:"ta",full:true}],
  padrao:()=>({data:hojeIso(),hora:agoraHM(),grav:"leve",status:"aberta",evo:true}),
  depois:(o,antigo)=>{
    if(!o.evo||antigo)return;
    evoMutate(l=>[...l,{id:uid8(),res:o.res,data:o.data,hora:o.hora||"",cat:"Enfermagem",prof:"",texto:`Ocorrência — ${o.tipo} (${o.grav}). ${o.desc}${o.conduta?" Condutas: "+o.conduta:""}${o.famNot?" Família avisada.":""}`,interc:true,em:new Date().toISOString()}]);
  },
  resumo:(L)=>{const ab=L.filter(x=>x.status!=="encerrada").length,m=hojeIso().slice(0,7),mes=L.filter(x=>(String(x.data||"")).startsWith(m)).length;
    return `<div class="stats"><div class="stat ${ab?"warn":""}"><b>${ab}</b><span>em aberto</span></div><div class="stat"><b>${mes}</b><span>neste mês</span></div><div class="stat"><b>${L.filter(x=>(String(x.data||"")).startsWith(m)&&x.tipo==="Queda").length}</b><span>quedas no mês</span></div></div>`},
  cols:[{h:"Data",v:r=>brDate(r.data)+(r.hora?" "+r.hora:"")},{h:"Residente",v:r=>xNomeRes(r.res)},{h:"Tipo",k:"tipo"},{h:"Gravidade",html:r=>xPill(r.grav==="grave"?3:r.grav==="moderada"?2:0,r.grav)},{h:"Situação",html:r=>xPill(r.status==="encerrada"?0:1,r.status)},{h:"Família",v:r=>r.famNot?"avisada":""}],
  filtros:{l:"Situação",opts:["aberta","em acompanhamento","encerrada"],fn:(r,f)=>r.status===f},
  ordem:(a,b)=>(b.data+(b.hora||"")).localeCompare(a.data+(a.hora||"")),vazio:"Nenhuma ocorrência registrada.",busca:r=>xNomeRes(r.res)+" "+r.desc,
  rodape:"Quedas, lesões por pressão, diarreia aguda, desidratação, escabiose, desnutrição e óbitos são os eventos que a RDC 502/2021 manda acompanhar e notificar à vigilância. Confira o prazo e o formato na norma vigente."};

/* ---------- avaliações (Katz, Braden, Morse) ---------- */
const ESCALAS={
  katz:{nome:"Katz — atividades de vida diária",max:6,itens:["Banho","Vestir-se","Higiene pessoal (uso do banheiro)","Transferência (cama/cadeira)","Continência","Alimentação"].map(t=>[t,[[1,"Independente"],[0,"Precisa de ajuda ou é dependente"]]]),
    classe:p=>p===6?["Independente",0]:p>=3?["Dependência moderada",2]:["Dependência grave",3],dias:p=>p>=6?180:90},
  braden:{nome:"Braden — risco de lesão por pressão",max:23,itens:[
    ["Percepção sensorial",[[1,"Totalmente limitada"],[2,"Muito limitada"],[3,"Levemente limitada"],[4,"Nenhuma limitação"]]],
    ["Umidade",[[1,"Completamente molhada"],[2,"Muito molhada"],[3,"Ocasionalmente molhada"],[4,"Raramente molhada"]]],
    ["Atividade",[[1,"Acamado"],[2,"Confinado à cadeira"],[3,"Anda ocasionalmente"],[4,"Anda com frequência"]]],
    ["Mobilidade",[[1,"Totalmente imóvel"],[2,"Muito limitada"],[3,"Levemente limitada"],[4,"Sem limitações"]]],
    ["Nutrição",[[1,"Muito pobre"],[2,"Provavelmente inadequada"],[3,"Adequada"],[4,"Excelente"]]],
    ["Fricção e cisalhamento",[[1,"Problema"],[2,"Problema potencial"],[3,"Nenhum problema"]]]],
    classe:p=>p<=9?["Risco muito alto",3]:p<=12?["Risco alto",3]:p<=14?["Risco moderado",2]:p<=18?["Risco baixo",1]:["Sem risco",0],dias:p=>p<=12?7:p<=18?30:90},
  morse:{nome:"Morse — risco de queda",max:125,itens:[
    ["Histórico de quedas (últimos 3 meses)",[[0,"Não"],[25,"Sim"]]],["Diagnóstico secundário",[[0,"Não"],[15,"Sim"]]],
    ["Auxílio na deambulação",[[0,"Nenhum, acamado ou auxiliado por profissional"],[15,"Muleta, bengala ou andador"],[30,"Apoia-se em móveis"]]],
    ["Terapia endovenosa",[[0,"Não"],[20,"Sim"]]],["Marcha",[[0,"Normal, acamado ou cadeira de rodas"],[10,"Fraca"],[20,"Comprometida"]]],
    ["Estado mental",[[0,"Orienta-se quanto à própria capacidade"],[15,"Superestima capacidade ou esquece limitações"]]]],
    classe:p=>p>=45?["Risco alto",3]:p>=25?["Risco médio",2]:["Risco baixo",0],dias:p=>p>=45?30:p>=25?60:90}
};
function openAval(resId,escala){
  const E=ESCALAS[escala],ov=openModal(`<h3>${esc(E.nome)}</h3><div class="row"><div><label>Residente</label><select id="avres">${xResOpts(resId)}</select></div><div><label>Data</label><input type="date" id="avdata" value="${hojeIso()}"></div></div>
   ${E.itens.map(([t,ops],k)=>`<label>${esc(t)}</label><select data-avk="${k}">${ops.map(([p,x])=>`<option value="${p}">${esc(x)} (${p})</option>`).join("")}</select>`).join("")}
   <div class="callout" id="avres2" style="margin-top:12px"></div><label>Observações</label><input id="avobs"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="avcx">Cancelar</button><button class="b" id="avsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s),calc=()=>{const v=[...ov.querySelectorAll("[data-avk]")].map(s=>+s.value),p=v.reduce((a,b)=>a+b,0),[c]=E.classe(p);g("#avres2").innerHTML=`<b>${p} ponto(s)</b> — ${esc(c)}. Próxima avaliação sugerida em ${E.dias(p)} dias.`;return{v,p}};
  ov.querySelectorAll("[data-avk]").forEach(s=>s.onchange=calc);calc();g("#avcx").onclick=()=>ov.remove();
  g("#avsv").onclick=()=>{const{v,p}=calc(),[c,n]=E.classe(p),data=g("#avdata").value;
    put("aval",uid8(),{res:g("#avres").value,escala,data,itens:v,pontos:p,classe:c,nivel:n,prox:addDaysIso(data,E.dias(p)),obs:g("#avobs").value.trim(),em:new Date().toISOString(),por:ACC.uid||""});
    ov.remove();toast("Avaliação salva.");go("cuid",true)};
}
const avalUltima=(resId,esc2)=>xs("aval").filter(a=>a.res===resId&&a.escala===esc2).sort((a,b)=>b.data.localeCompare(a.data))[0];
function avalHtml(){
  const pode=podeEd("cuid"),rs=resAtivos().sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt"));
  return `<div class="card"><h2>Escalas de avaliação</h2><p class="sub" style="margin:0 0 10px">Katz (autonomia no dia a dia), Braden (risco de lesão por pressão) e Morse (risco de queda). O sistema calcula a pontuação, classifica o risco e sugere a data da próxima avaliação. Apoio à equipe: a classificação não substitui o julgamento profissional.</p>
   ${rs.length?`<div class="wrap"><table><thead><tr><th>Residente</th>${Object.values(ESCALAS).map(e=>`<th>${esc(e.nome.split(" — ")[0])}</th>`).join("")}</tr></thead><tbody>${rs.map(r=>`<tr><td><b>${esc(resNome(r))}</b><div class="sub">quarto ${esc(r.quarto||"—")}</div></td>${Object.keys(ESCALAS).map(k=>{const a=avalUltima(r.id,k),vencida=a&&a.prox<hojeIso();
      return `<td>${a?xPill(a.nivel,a.classe)+`<div class="sub">${a.pontos??"—"} pts · ${brDate(a.data)}${vencida?` · <b>reavaliar</b>`:""}</div>`:`<span class="sub">nunca avaliado</span>`}${pode?`<div><button class="b sec sm" data-aval="${r.id}|${k}">Avaliar</button></div>`:""}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`:`<div class="empty">Cadastre residentes ativos.</div>`}</div>
   <div class="card"><h2>Histórico</h2>${xs("aval").sort((a,b)=>b.data.localeCompare(a.data)).slice(0,40).map(a=>`<div class="doc"><div class="grow"><div class="nm">${esc(xNomeRes(a.res))} — ${esc(((ESCALAS[a.escala]||{})||{nome:"Escala"}).nome)}</div><div class="sub">${brDate(a.data)} · ${a.pontos??"—"} pts · ${esc(a.classe)}${a.obs?" · "+esc(a.obs):""}</div></div>${xPill(a.nivel,a.classe)}${pode?`<button class="b sec sm" data-avdel="${a.id}">${ic("trash")}</button>`:""}</div>`).join("")||`<div class="empty">Nenhuma avaliação registrada.</div>`}</div>`;
}
function bindAval(){
  document.querySelectorAll("[data-aval]").forEach(b=>b.onclick=()=>{const[r,k]=b.dataset.aval.split("|");openAval(r,k)});
  document.querySelectorAll("[data-avdel]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir esta avaliação?","Excluir")){del("aval",b.dataset.avdel);go("cuid",true)}});
}

/* ---------- cardápio e nutrição ---------- */
const DIETAS=["Geral","Diabética","Hipossódica","Pastosa","Triturada / líquida","Hipercalórica","Sem lactose","Sem glúten"];
const REFEICOES=["Café da manhã","Lanche da manhã","Almoço","Lanche da tarde","Jantar","Ceia"];
const NUT={ini:addDaysIso(hojeIso(),-pyWeekday(hojeIso()))};
const dietaDe=r=>r.dieta||"Geral";
const cardCrud={id:"cardapio",col:"cardapio",mod:"cuid",novoLabel:"Adicionar prato",novoTit:"Prato do cardápio",
  campos:[{k:"data",l:"Data",t:"date",req:true},{k:"refeicao",l:"Refeição",t:"sel",opts:REFEICOES,req:true},{k:"dieta",l:"Dieta",t:"sel",opts:DIETAS,req:true,def:"Geral"},{k:"prato",l:"Prato",req:true},
    {k:"ingred",l:"Ingredientes (um por linha: nome ; quantidade por pessoa ; unidade)",t:"ta",full:true,ph:"arroz ; 0,08 ; kg\nfeijão ; 0,06 ; kg",alt:90}],
  padrao:()=>({data:hojeIso(),dieta:"Geral"}),
  filtro:r=>r.data>=NUT.ini&&r.data<=addDaysIso(NUT.ini,6),
  cols:[{h:"Dia",v:r=>WD_FULL[pyWeekday(r.data)].slice(0,3)+" "+brDate(r.data).slice(0,5)},{h:"Refeição",k:"refeicao"},{h:"Dieta",k:"dieta"},{h:"Prato",k:"prato"}],
  ordem:(a,b)=>a.data.localeCompare(b.data)||REFEICOES.indexOf(a.refeicao)-REFEICOES.indexOf(b.refeicao),vazio:"Cardápio da semana vazio. Use “Copiar semana anterior” para começar.",busca:r=>r.prato+" "+(r.ingred||"")};
const ingLinhas=r=>String(r.ingred||"").split("\n").map(l=>l.split(";").map(x=>x.trim())).filter(a=>a[0]).map(a=>({nome:a[0],qtd:parseFloat(String(a[1]||"0").replace(",","."))||0,un:a[2]||"un"}));
function alergiaAvisos(){
  const av=[];
  const cards=xs("cardapio").filter(c=>c.data>=hojeIso()&&c.data<=addDaysIso(hojeIso(),14));
  resAtivos().forEach(r=>{
    const al=String(r.alergias||"").split(/[,;\n]|\be\b/).map(s=>estNorm(s)).filter(s=>s.length>=3);if(!al.length)return;
    cards.filter(c=>c.dieta===dietaDe(r)).forEach(c=>{const txt=estNorm(c.prato+" "+(c.ingred||""));al.forEach(a=>{if(txt.includes(a))av.push({r,c,a})})});
  });
  return av;
}
function nutriHtml(){
  const fim=addDaysIso(NUT.ini,6),rs=resAtivos().sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")),cont={};
  rs.forEach(r=>{cont[dietaDe(r)]=(cont[dietaDe(r)]||0)+1});
  const av=alergiaAvisos(),pode=podeEd("cuid");
  return `<div class="card"><div class="row" style="align-items:flex-end"><div style="flex:none"><label>Semana</label><div style="display:flex;gap:6px"><button class="b sec sm" data-nsem="-7">‹</button><b style="align-self:center;padding:0 8px">${brDate(NUT.ini).slice(0,5)} a ${brDate(fim).slice(0,5)}</b><button class="b sec sm" data-nsem="7">›</button></div></div>
    ${pode?`<button class="b sec" id="ncopia" style="flex:none">Copiar semana anterior</button>`:""}<button class="b sec" id="ncompras" style="flex:none">Lista de compras da semana</button></div>
   ${av.length?`<div class="callout" style="margin-top:12px;border-color:var(--urgente)"><b style="color:var(--urgente)">Atenção, possível alergia no cardápio:</b>${av.slice(0,6).map(x=>`<div>${esc(resNome(x.r))} tem alergia a “${esc(x.a)}” e o prato “${esc(x.c.prato)}” (${brDate(x.c.data).slice(0,5)}, ${esc(x.c.refeicao)}) parece conter isso.</div>`).join("")}</div>`:""}</div>
   ${xcrud(cardCrud)}
   <div class="card"><h2>Dieta de cada residente</h2><p class="sub" style="margin:0 0 10px">Define para quantas pessoas cada prato é feito. ${Object.entries(cont).map(([d,n])=>`${esc(d)}: ${n}`).join(" · ")||""}</p>
    ${rs.length?`<div class="wrap"><table><thead><tr><th>Residente</th><th>Dieta</th><th>Restrições e alergias (do prontuário)</th></tr></thead><tbody>${rs.map(r=>`<tr><td><b>${esc(resNome(r))}</b></td><td>${pode?`<select data-dieta="${r.id}">${DIETAS.map(d=>`<option ${dietaDe(r)===d?"selected":""}>${d}</option>`).join("")}</select>`:esc(dietaDe(r))}</td><td class="sub">${esc([r.restricoes,r.alergias?"Alergia: "+r.alergias:""].filter(Boolean).join(" · "))}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Sem residentes ativos.</div>`}</div>`;
}
function listaCompras(){
  const fim=addDaysIso(NUT.ini,6),rs=resAtivos(),n={};rs.forEach(r=>{n[dietaDe(r)]=(n[dietaDe(r)]||0)+1});
  const tot=new Map();
  xs("cardapio").filter(c=>c.data>=NUT.ini&&c.data<=fim).forEach(c=>ingLinhas(c).forEach(i=>{
    const k=estNorm(i.nome)+"|"+i.un.toLowerCase(),x=tot.get(k)||{nome:i.nome,un:i.un,qtd:0};x.qtd+=i.qtd*(n[c.dieta]||0);tot.set(k,x);
  }));
  return[...tot.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt")).map(x=>{const it=estAchar(x.nome);return{...x,estoque:it?+it.qtd:null,falta:it?Math.max(0,x.qtd-(+it.qtd)):x.qtd}});
}
function bindNutri(){
  document.querySelectorAll("[data-nsem]").forEach(b=>b.onclick=()=>{NUT.ini=addDaysIso(NUT.ini,+b.dataset.nsem);go("cuid",true)});
  const c=$("ncopia");if(c)c.onclick=async()=>{
    const ant=xs("cardapio").filter(x=>x.data>=addDaysIso(NUT.ini,-7)&&x.data<=addDaysIso(NUT.ini,-1));
    if(!ant.length)return toast("A semana anterior está vazia.",true);
    if(!await askConfirm(`Copiar ${ant.length} prato(s) da semana anterior para esta?`,"Copiar"))return;
    ant.forEach(x=>{const o=strip(x);o.data=addDaysIso(x.data,7);o.em=new Date().toISOString();put("cardapio",uid8(),o)});toast("Semana copiada.");go("cuid",true);
  };
  const lc=$("ncompras");if(lc)lc.onclick=()=>{
    const L=listaCompras(),texto=L.map(x=>`${x.nome}: ${NUMF(x.qtd)} ${x.un}${x.estoque!=null?` (em estoque ${NUMF(x.estoque)}; falta ${NUMF(x.falta)})`:""}`).join("\n");
    const ov=openModal(`<h3>Lista de compras — semana de ${brDate(NUT.ini).slice(0,5)}</h3>${L.length?`<div class="wrap"><table><thead><tr><th>Item</th><th>Precisa</th><th>No estoque</th><th>Falta</th></tr></thead><tbody>${L.map(x=>`<tr><td>${esc(x.nome)}</td><td>${NUMF(x.qtd)} ${esc(x.un)}</td><td>${x.estoque==null?'<span class="sub">não cadastrado</span>':NUMF(x.estoque)}</td><td>${x.falta>0?`<b>${NUMF(x.falta)}</b>`:"—"}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Preencha os ingredientes nos pratos (nome ; quantidade por pessoa ; unidade).</div>`}
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="lccp">Copiar texto</button>${podeEd("agenda")&&L.length?`<button class="b sec" id="lctar">Criar tarefa de compra</button>`:""}<button class="b" id="lcok">Fechar</button></div>`);
    ov.querySelector("#lcok").onclick=()=>ov.remove();
    ov.querySelector("#lccp").onclick=()=>{try{navigator.clipboard.writeText(texto);toast("Lista copiada.")}catch(e){toast("Não foi possível copiar.",true)}};
    const t=ov.querySelector("#lctar");if(t)t.onclick=()=>{tarMutate(l=>[...l,{id:uid8(),titulo:"Comprar (cardápio da semana)",desc:texto,data:addDaysIso(NUT.ini,-1)<hojeIso()?hojeIso():addDaysIso(NUT.ini,-1),hora:"",prio:"normal",status:"aberta",em:new Date().toISOString()}]);ov.remove();toast("Tarefa criada na agenda.")};
  };
  document.querySelectorAll("[data-dieta]").forEach(s=>s.onchange=()=>{resSave(resAll().map(r=>r.id===s.dataset.dieta?{...r,dieta:s.value}:r));toast("Dieta atualizada.")});
}

/* ---------- atividades e terapias ---------- */
const ATIV_TIPOS=["Fisioterapia","Terapia ocupacional","Fonoaudiologia","Psicologia","Recreação","Música","Atividade religiosa","Passeio","Oficina","Outra"];
const ativCrud={id:"ativ",col:"ativ",mod:"cuid",novoLabel:"Registrar atividade",novoTit:"Atividade ou terapia",
  campos:[{k:"data",l:"Data",t:"date",req:true},{k:"hora",l:"Hora",t:"time"},{k:"tipo",l:"Tipo",t:"sel",opts:ATIV_TIPOS,req:true},{k:"titulo",l:"Título",req:true},{k:"prof",l:"Profissional ou condutor"},{k:"local",l:"Local"},
    {k:"part",l:"Participantes (marque quem esteve presente)",t:"resmulti",full:true},{k:"obs",l:"Observações",t:"ta",full:true},{k:"evo",l:"Registrar na evolução de cada participante",t:"check"}],
  padrao:()=>({data:hojeIso()}),
  depois:(o,antigo)=>{if(!o.evo||antigo)return;evoMutate(l=>[...l,...(o.part||[]).map(rid=>({id:uid8(),res:rid,data:o.data,hora:o.hora||"",cat:o.tipo==="Fisioterapia"?"Fisioterapia":o.tipo==="Psicologia"?"Psicologia":o.tipo==="Terapia ocupacional"?"Terapia ocupacional":o.tipo==="Fonoaudiologia"?"Fonoaudiologia":"Outra",prof:o.prof||"",texto:`Participou de “${o.titulo}” (${o.tipo}).${o.obs?" "+o.obs:""}`,interc:false,em:new Date().toISOString()}))])},
  cols:[{h:"Data",v:r=>brDate(r.data)+(r.hora?" "+r.hora:"")},{h:"Tipo",k:"tipo"},{h:"Atividade",k:"titulo"},{h:"Quem conduziu",k:"prof"},{h:"Participantes",v:r=>(r.part||[]).length}],
  filtros:{l:"Tipo",opts:ATIV_TIPOS,fn:(r,f)=>r.tipo===f},ordem:(a,b)=>(b.data+(b.hora||"")).localeCompare(a.data+(a.hora||"")),vazio:"Nenhuma atividade registrada.",busca:r=>r.titulo+" "+(r.prof||"")};
function ativHtml(){
  const ini=addDaysIso(hojeIso(),-30),rs=resAtivos().sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")),ats=xs("ativ").filter(a=>a.data>=ini);
  const cont=r=>ats.filter(a=>(a.part||[]).includes(r.id)).length;
  return xcrud(ativCrud)+`<div class="card"><h2>Participação nos últimos 30 dias</h2>${rs.length?`<div class="xgrid">${rs.map(r=>{const n=cont(r);return `<div class="xcell"><b>${esc(resNome(r))}</b><span class="sub">${n} atividade(s)</span>${n===0?`<div>${xPill(2,"sem atividades")}</div>`:""}</div>`}).join("")}</div>`:`<div class="empty">Sem residentes ativos.</div>`}</div>`;
}

/* ---------- família: visitas, comunicados e resumo semanal ---------- */
const visitaCrud={id:"visita",col:"visita",mod:"cuid",novoLabel:"Agendar ou registrar visita",novoTit:"Visita",
  campos:[{k:"res",l:"Residente",t:"res",req:true},{k:"visitante",l:"Visitante",req:true,t:"pessoa"},{k:"parent",l:"Parentesco"},{k:"data",l:"Data",t:"date",req:true},{k:"hora",l:"Hora"},{k:"status",l:"Situação",t:"sel",opts:["agendada","realizada","cancelada"],req:true,def:"agendada"},{k:"obs",l:"Observações",full:true}],
  padrao:()=>({data:hojeIso(),status:"agendada"}),
  cols:[{h:"Data",v:r=>brDate(r.data)+(r.hora?" "+r.hora:"")},{h:"Residente",v:r=>xNomeRes(r.res)},{h:"Visitante",v:r=>r.visitante+(r.parent?" ("+r.parent+")":"")},{h:"Situação",html:r=>xPill(r.status==="realizada"?0:r.status==="cancelada"?2:1,r.status)}],
  ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhuma visita registrada.",busca:r=>xNomeRes(r.res)+" "+r.visitante};
const comunCrud={id:"comun",col:"comun",mod:"cuid",novoLabel:"Registrar comunicado",novoTit:"Comunicado à família",
  campos:[{k:"res",l:"Residente",t:"res",req:true,todos:true},{k:"data",l:"Data",t:"date",req:true},{k:"canal",l:"Canal",t:"sel",opts:["WhatsApp","Telefone","E-mail","Pessoalmente"],req:true},{k:"com",l:"Falou com",t:"pessoa"},{k:"assunto",l:"Assunto",req:true,full:true},{k:"texto",l:"O que foi dito ou combinado",t:"ta",full:true}],
  padrao:()=>({data:hojeIso()}),
  cols:[{h:"Data",v:r=>brDate(r.data)},{h:"Residente",v:r=>xNomeRes(r.res)},{h:"Canal",k:"canal"},{h:"Com",k:"com"},{h:"Assunto",k:"assunto"}],
  ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhum comunicado registrado.",busca:r=>xNomeRes(r.res)+" "+r.assunto};
const FAMST={res:"",ini:addDaysIso(hojeIso(),-pyWeekday(hojeIso()))};
function resumoFamilia(r,ini){
  const fim=addDaysIso(ini,6),ev=evoAll().filter(e=>e.res===r.id&&e.data>=ini&&e.data<=fim),at=xs("ativ").filter(a=>(a.part||[]).includes(r.id)&&a.data>=ini&&a.data<=fim),
    ag=xs("agres").filter(a=>a.res===r.id&&a.data>=ini&&a.data<=addDaysIso(fim,7)&&a.status!=="cancelado"),oc=xs("ocor2").filter(o=>o.res===r.id&&o.data>=ini&&o.data<=fim);
  const resp=(r.resp&&r.resp.nome)||"família";
  let t=`Olá, ${resp.split(" ")[0]}! Segue o resumo da semana de ${resNome(r)} (${brDate(ini).slice(0,5)} a ${brDate(fim).slice(0,5)}).\n`;
  t+=at.length?`\nAtividades de que participou:\n${at.map(a=>`• ${brDate(a.data).slice(0,5)} — ${a.titulo}`).join("\n")}\n`:"\nNesta semana não houve atividade em grupo registrada.\n";
  if(oc.length)t+=`\nOcorrências comunicadas:\n${oc.map(o=>`• ${brDate(o.data).slice(0,5)} — ${o.tipo}${o.famNot?" (a família já foi avisada)":""}`).join("\n")}\n`;
  if(ag.length)t+=`\nPróximos compromissos de saúde:\n${ag.map(a=>`• ${brDate(a.data).slice(0,5)}${a.hora?" "+a.hora:""} — ${a.tipo}${a.esp?" ("+a.esp+")":""}`).join("\n")}\n`;
  t+=`\nQualquer dúvida, estamos à disposição. Casa Hiro${empresa().telefone?" — "+empresa().telefone:""}.`;
  return t;
}
function famHtml(){
  const rs=resAtivos().sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")),r=rs.find(x=>x.id===FAMST.res)||rs[0];if(r)FAMST.res=r.id;
  return `<div class="card"><h2>Resumo semanal para a família</h2><p class="sub" style="margin:0 0 10px">Monta uma mensagem com as atividades, ocorrências comunicadas e compromissos de saúde da semana. Não inclui diagnósticos nem o texto do prontuário (dado sensível, LGPD). Leia antes de enviar.</p>
   ${r?`<div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="famres">${xResOpts(r.id)}</select></div><div style="flex:0 0 190px"><label>Semana começando em</label><input type="date" id="famini" value="${FAMST.ini}"></div></div>
    <label style="margin-top:10px">Mensagem</label><textarea id="famtxt" style="min-height:230px">${esc(resumoFamilia(r,FAMST.ini))}</textarea>
    <div class="row" style="margin-top:8px"><button class="b" id="famcp" style="flex:none">Copiar mensagem</button>${r.resp&&r.resp.tel?`<button class="b sec" id="famwa" style="flex:none">Abrir no WhatsApp</button>`:""}${podeEd("cuid")?`<button class="b sec" id="famreg" style="flex:none">Registrar como comunicado</button>`:""}</div>`:`<div class="empty">Cadastre residentes.</div>`}</div>
   ${xcrud(visitaCrud)}${xcrud(comunCrud)}`;
}
function bindFam(){
  const s=$("famres");if(s)s.onchange=()=>{FAMST.res=s.value;go("cuid",true)};const i=$("famini");if(i)i.onchange=()=>{FAMST.ini=i.value;go("cuid",true)};
  const cp=$("famcp");if(cp)cp.onclick=()=>{try{navigator.clipboard.writeText($("famtxt").value);toast("Mensagem copiada.")}catch(e){toast("Não foi possível copiar.",true)}};
  const wa=$("famwa");if(wa)wa.onclick=()=>{const r=resAll().find(x=>x.id===FAMST.res),n=String(r.resp.tel).replace(/\D/g,"");window.open(`https://wa.me/${n.length<=11?"55"+n:n}?text=${encodeURIComponent($("famtxt").value)}`,"_blank","noopener")};
  const rg=$("famreg");if(rg)rg.onclick=()=>{put("comun",uid8(),{res:FAMST.res,data:hojeIso(),canal:"WhatsApp",com:(resAll().find(x=>x.id===FAMST.res).resp||{}).nome||"",assunto:"Resumo semanal",texto:$("famtxt").value,em:new Date().toISOString()});toast("Registrado em Comunicados.");go("cuid",true)};
}

/* ---------- consultas, exames e vacinas ---------- */
const agresCrud={id:"agres",col:"agres",mod:"cuid",novoLabel:"Agendar consulta, exame ou vacina",novoTit:"Compromisso de saúde",
  campos:[{k:"res",l:"Residente",t:"res",req:true},{k:"tipo",l:"Tipo",t:"sel",opts:["Consulta","Exame","Vacina","Retorno","Procedimento","Outro"],req:true},{k:"esp",l:"Especialidade ou exame",ph:"Ex.: cardiologia, hemograma, gripe"},{k:"local",l:"Local ou profissional"},
    {k:"data",l:"Data",t:"date",req:true},{k:"hora",l:"Hora",t:"time"},{k:"acomp",l:"Quem acompanha",t:"integ"},{k:"transp",l:"Transporte",ph:"Ex.: carro da casa, ambulância"},{k:"prep",l:"Preparo (jejum, documentos, pedido médico)",full:true},
    {k:"status",l:"Situação",t:"sel",opts:["agendado","realizado","cancelado","remarcado"],req:true,def:"agendado"},{k:"obs",l:"Resultado ou observações",t:"ta",full:true}],
  padrao:()=>({data:hojeIso(),status:"agendado"}),
  depois:(o)=>{if(o.status==="realizado"&&o.obs&&!o.evoOk){evoMutate(l=>[...l,{id:uid8(),res:o.res,data:o.data,hora:o.hora||"",cat:"Outra",prof:"",texto:`${o.tipo}${o.esp?" ("+o.esp+")":""} realizado(a). ${o.obs}`,interc:false,em:new Date().toISOString()}])}},
  cols:[{h:"Data",v:r=>brDate(r.data)+(r.hora?" "+r.hora:"")},{h:"Residente",v:r=>xNomeRes(r.res)},{h:"O quê",v:r=>r.tipo+(r.esp?" — "+r.esp:"")},{h:"Acompanha",v:r=>r.acomp?xNomeInteg(r.acomp):""},{h:"Situação",html:r=>xPill(r.status==="realizado"?0:r.status==="cancelado"?2:1,r.status)}],
  filtros:{l:"Situação",opts:["agendado","realizado","cancelado","remarcado"],fn:(r,f)=>r.status===f},ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhum compromisso de saúde registrado.",busca:r=>xNomeRes(r.res)+" "+(r.esp||"")};

/* ---------- linha do tempo do prontuário ---------- */
const TLINHA={tipos:new Set(),dias:90};
function linhaItens(r){
  const L=[],ini=addDaysIso(hojeIso(),-TLINHA.dias);
  evoAll().filter(e=>e.res===r.id).forEach(e=>L.push({d:e.data,h:e.hora||"",t:e.interc?"Intercorrência":"Evolução",ti:`${e.cat}${e.prof?" · "+e.prof:""}`,tx:e.texto,n:e.interc?2:0}));
  xs("ocor2").filter(o=>o.res===r.id).forEach(o=>L.push({d:o.data,h:o.hora||"",t:"Ocorrência",ti:`${o.tipo} (${o.grav})`,tx:o.desc,n:o.grav==="grave"?3:o.grav==="moderada"?2:1}));
  xs("aval").filter(a=>a.res===r.id).forEach(a=>L.push({d:a.data,h:"",t:"Avaliação",ti:((ESCALAS[a.escala]||{})||{nome:"Escala"}).nome.split(" — ")[0],tx:`${a.pontos} pontos — ${a.classe}`,n:a.nivel}));
  xs("agres").filter(a=>a.res===r.id).forEach(a=>L.push({d:a.data,h:a.hora||"",t:"Saúde",ti:`${a.tipo}${a.esp?" — "+a.esp:""} (${a.status})`,tx:a.obs||"",n:0}));
  xs("medreg").filter(m=>m.res===r.id&&m.status!=="dado").forEach(m=>L.push({d:m.data,h:m.hora||"",t:"Medicação",ti:`${m.medNome}: ${MAR_ST[m.status][0].toLowerCase()}`,tx:m.obs||"",n:MAR_ST[m.status][1]}));
  xs("ativ").filter(a=>(a.part||[]).includes(r.id)).forEach(a=>L.push({d:a.data,h:a.hora||"",t:"Atividade",ti:`${a.tipo} — ${a.titulo}`,tx:"",n:0}));
  xs("visita").filter(v=>v.res===r.id&&v.status!=="cancelada").forEach(v=>L.push({d:v.data,h:v.hora||"",t:"Visita",ti:v.visitante+(v.parent?" ("+v.parent+")":""),tx:v.obs||"",n:0}));
  xs("comun").filter(c=>c.res===r.id).forEach(c=>L.push({d:c.data,h:"",t:"Família",ti:`${c.canal}: ${c.assunto}`,tx:"",n:0}));
  return L.filter(x=>x.d>=ini&&x.d<=addDaysIso(hojeIso(),30)).sort((a,b)=>(b.d+b.h).localeCompare(a.d+a.h));
}
function linhaTempoHtml(r){
  const L=linhaItens(r),tipos=[...new Set(L.map(x=>x.t))],V=TLINHA.tipos.size?L.filter(x=>TLINHA.tipos.has(x.t)):L;
  const ult=Object.keys(ESCALAS).map(k=>avalUltima(r.id,k)).filter(Boolean).filter(a=>a.nivel>=2);
  return `<div class="card"><div class="row" style="align-items:flex-end"><div style="flex:0 0 200px"><label>Período</label><select id="tlper">${[30,90,365].map(d=>`<option value="${d}" ${TLINHA.dias===d?"selected":""}>Últimos ${d} dias</option>`).join("")}</select></div>
    <div style="flex:3;display:flex;gap:6px;flex-wrap:wrap;align-self:flex-end">${tipos.map(t=>`<button class="b sm ${TLINHA.tipos.has(t)?"":"sec"}" data-tltipo="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>
   ${ult.length?`<div class="callout sand" style="margin-top:10px"><b>Riscos em atenção:</b> ${ult.map(a=>`${((ESCALAS[a.escala]||{})||{nome:"Escala"}).nome.split(" — ")[0]}: ${esc(a.classe)}`).join(" · ")}</div>`:""}
   <div style="margin-top:12px">${V.length?V.slice(0,150).map(x=>`<div class="doc ${x.n>=3?"urg":x.n===2?"atn":""}" style="align-items:flex-start"><div style="flex:0 0 92px"><b>${brDate(x.d).slice(0,5)}</b><div class="sub">${esc(x.h)}</div></div><div class="grow"><div class="nm">${esc(x.t)} · ${esc(x.ti)}</div>${x.tx?`<div style="white-space:pre-wrap;margin-top:2px">${esc(x.tx.length>260?x.tx.slice(0,260)+"…":x.tx)}</div>`:""}</div></div>`).join(""):`<div class="empty">Nada registrado neste período.</div>`}</div></div>`;
}
const EVO_MODELOS=[["Alimentação","Aceitação da dieta: ( ) total ( ) parcial ( ) recusou. Hidratação: ___ ml. Observações: "],["Higiene e conforto","Banho e higiene realizados: ( ) sim. Pele íntegra: ( ) sim ( ) alterações em ___. Mudança de decúbito/troca: ___."],
  ["Sinais vitais","PA ___ x ___ mmHg · FC ___ bpm · FR ___ irpm · Temp ___ °C · SatO2 ___ % · Glicemia ___ mg/dL."],["Queda ou intercorrência","Ocorrência: ___ às ___ h, local ___. Estado ao ser encontrado(a): ___. Condutas: ___. Família avisada: ( ) sim às ___ h. Médico ou serviço acionado: ___."],
  ["Humor e comportamento","Humor: ___ · Orientação: ___ · Sono: ___ · Participação nas atividades: ___."],["Fisioterapia","Conduta realizada: ___ · Tolerância: ___ · Observações: ___."]];

/* ---------- página ---------- */
xpage("cuid","Cuidados e rotina","Medicação do dia, ocorrências, avaliações de risco, cardápio, atividades, família e compromissos de saúde dos residentes.","heart",[
  {k:"mar",l:"Medicação do dia",html:marHtml,bind:bindMar,mod:"cuid"},
  {k:"ocor",l:"Ocorrências",html:()=>xcrud(ocoCrud)},
  {k:"aval",l:"Avaliações de risco",html:avalHtml,bind:bindAval},
  {k:"agres",l:"Consultas e exames",html:()=>xcrud(agresCrud)},
  {k:"nutri",l:"Cardápio e nutrição",html:nutriHtml,bind:bindNutri},
  {k:"ativ",l:"Atividades e terapias",html:ativHtml},
  {k:"fam",l:"Família",html:famHtml,bind:bindFam}
]);

/* ---------- pendências, calendário e relatórios ---------- */
XURG.push((L,h)=>{
  if(!podeVer("cuid"))return;
  const sl=marSlots(h).filter(s=>marAtrasada(s,h)),dias=new Set();
  if(sl.length)L.push({nivel:3,tipo:"Medicação",titulo:`${sl.length} dose(s) de medicação atrasada(s) hoje`,detalhe:sl.slice(0,3).map(s=>`${s.h} ${resNome(s.r)} — ${s.m.nome}`).join("; "),quando:h,rota:"cuid",res:{k:"cuidmar"},resLabel:"Abrir medicação"});
  resAtivos().forEach(r=>(r.meds||[]).forEach(m=>{if(m.controlado&&m.estoque!==""&&m.estoque!=null&&+m.estoque<=5&&(!m.fim||m.fim>=h))L.push({nivel:+m.estoque<=0?3:2,tipo:"Medicação",titulo:`Estoque de ${m.nome} (${resNome(r)}): ${+m.estoque} dose(s)`,detalhe:"medicamento controlado",quando:null,rota:"cuid",res:{k:"cuidmar"},resLabel:"Abrir medicação"})}));
  xs("ocor2").filter(o=>o.status!=="encerrada"&&daysBetweenIso(o.data,h)>=7).forEach(o=>L.push({nivel:2,tipo:"Ocorrência",titulo:`${o.tipo} de ${xNomeRes(o.res)} ainda aberta`,detalhe:`registrada em ${brDate(o.data)}`,quando:o.data,rota:"cuid",res:{k:"cuidoc"},resLabel:"Acompanhar"}));
  xs("ocor2").filter(o=>(o.grav==="grave"||o.remocao)&&!o.famNot&&o.status!=="encerrada").forEach(o=>L.push({nivel:3,tipo:"Ocorrência",titulo:`Avisar a família: ${o.tipo} de ${xNomeRes(o.res)}`,detalhe:"ocorrência grave sem aviso registrado",quando:o.data,rota:"cuid",res:{k:"cuidoc"},resLabel:"Abrir ocorrência"}));
  const sem=resAtivos().filter(r=>!avalUltima(r.id,"morse")&&!avalUltima(r.id,"braden")).length;
  if(sem)L.push({nivel:1,tipo:"Avaliação",titulo:`${sem} residente(s) sem avaliação de risco de queda ou lesão por pressão`,detalhe:"Morse e Braden ajudam a prevenir os dois eventos mais comuns",quando:null,rota:"cuid",res:{k:"cuidaval"},resLabel:"Avaliar"});
  resAtivos().forEach(r=>Object.keys(ESCALAS).forEach(k=>{const a=avalUltima(r.id,k);if(a&&a.prox<h)L.push({nivel:a.nivel>=3?2:1,tipo:"Avaliação",titulo:`Reavaliar ${ESCALAS[k].nome.split(" — ")[0]} — ${resNome(r)}`,detalhe:`prazo era ${brDate(a.prox)} (${a.classe})`,quando:a.prox,rota:"cuid",res:{k:"cuidaval"},resLabel:"Avaliar"})}));
  alergiaAvisos().slice(0,3).forEach(x=>L.push({nivel:3,tipo:"Cardápio",titulo:`Possível alergia: ${resNome(x.r)} e “${x.c.prato}”`,detalhe:`${brDate(x.c.data)} · ${x.c.refeicao} (contém “${x.a}”)`,quando:x.c.data,rota:"cuid",res:{k:"cuidnutri"},resLabel:"Ver cardápio"}));
  xs("agres").filter(a=>a.status==="agendado"&&a.data>=h&&a.data<=addDaysIso(h,2)).forEach(a=>L.push({nivel:a.data===h?3:2,tipo:"Saúde",titulo:`${a.tipo}${a.esp?" — "+a.esp:""}: ${xNomeRes(a.res)}`,detalhe:`${brDate(a.data)}${a.hora?" às "+a.hora:""}${a.prep?" · preparo: "+a.prep:""}`,quando:a.data,rota:"cuid",res:{k:"cuidag"},resLabel:"Abrir"}));
  xs("agres").filter(a=>a.status==="agendado"&&a.data<h).forEach(a=>L.push({nivel:2,tipo:"Saúde",titulo:`Atualizar situação: ${a.tipo} de ${xNomeRes(a.res)}`,detalhe:`era para ${brDate(a.data)}; marque como realizado, cancelado ou remarcado`,quando:a.data,rota:"cuid",res:{k:"cuidag"},resLabel:"Atualizar"}));
});
const irCuid=t=>()=>{PGX.cuid.st.tab=t;go("cuid")};
XRES.cuidmar=irCuid("mar");XRES.cuidoc=irCuid("ocor");XRES.cuidaval=irCuid("aval");XRES.cuidnutri=irCuid("nutri");XRES.cuidag=irCuid("agres");
XEVENTOS.push(pre=>xs("agres").filter(a=>a.status==="agendado"&&(String(a.data||"")).startsWith(pre)&&podeVer("cuid")).map(a=>({id:a.id,nome:`${a.tipo}${a.esp?" — "+a.esp:""}: ${xNomeRes(a.res)}`,validade:a.data,aviso:2,vinc:"casa"})));
REPORTS.push(
 {id:"cu_mar",g:"Residentes",t:"Folha de medicação do dia",d:"Horários, doses e quem administrou, para o dia escolhido na aba Medicação.",pii:true,b:()=>({titulo:"Medicação — "+brDate(MAR.data),sub:relSub({},false),sensivel:true,
   cols:[{h:"Hora",w:8},{h:"Residente",w:24},{h:"Quarto",w:8},{h:"Medicamento",w:28},{h:"Dose / via",w:20},{h:"Situação",w:16},{h:"Responsável",w:22}],
   rows:marSlots(MAR.data).map(s=>{const g=S.medreg[s.id];return[s.h||"—",resNome(s.r),s.r.quarto||"",s.m.nome+(s.m.controlado?" (controlado)":""),[s.m.dose,s.m.via].filter(Boolean).join(" · "),g?MAR_ST[g.status][0]:"A administrar",g?xNomeInteg(g.por)+(g.conf?" / "+xNomeInteg(g.conf):""):""]})})},
 {id:"cu_ocor",g:"Residentes",t:"Ocorrências dos residentes",d:"Quedas, intercorrências e demais eventos, com gravidade e situação.",pii:true,b:()=>({titulo:"Ocorrências dos residentes",sub:relSub({},false),sensivel:true,
   cols:[{h:"Data",t:"date",w:12},{h:"Residente",w:24},{h:"Tipo",w:26},{h:"Gravidade",w:12},{h:"Situação",w:16},{h:"Família avisada",w:12,c:true},{h:"Descrição",w:50}],
   rows:xs("ocor2").sort((a,b)=>b.data.localeCompare(a.data)).map(o=>[o.data,xNomeRes(o.res),o.tipo,o.grav,o.status,o.famNot?"Sim":"Não",o.desc])})},
 {id:"cu_aval",g:"Residentes",t:"Avaliações de risco (última de cada escala)",d:"Katz, Braden e Morse por residente.",pii:true,b:()=>({titulo:"Avaliações de risco",sub:relSub({},false),sensivel:true,
   cols:[{h:"Residente",w:26},{h:"Katz",w:24},{h:"Braden",w:24},{h:"Morse",w:24}],rows:resAtivos().map(r=>[resNome(r),...Object.keys(ESCALAS).map(k=>{const a=avalUltima(r.id,k);return a?`${a.pontos??"—"} pts — ${a.classe} (${brDate(a.data)})`:"nunca avaliado"})])})},
 {id:"cu_cardapio",g:"Residentes",t:"Cardápio da semana",d:"Pratos por dia, refeição e dieta.",pii:false,b:()=>({titulo:"Cardápio — semana de "+brDate(NUT.ini).slice(0,5),sub:relSub({},false),
   cols:[{h:"Dia",w:16},{h:"Refeição",w:20},{h:"Dieta",w:18},{h:"Prato",w:50}],rows:xs("cardapio").filter(cardCrud.filtro).sort(cardCrud.ordem).map(c=>[WD_FULL[pyWeekday(c.data)]+" "+brDate(c.data).slice(0,5),c.refeicao,c.dieta,c.prato])})},
 {id:"cu_compras",g:"Residentes",t:"Lista de compras do cardápio",d:"Ingredientes da semana, com o que já há no estoque.",pii:false,b:()=>({titulo:"Lista de compras — semana de "+brDate(NUT.ini).slice(0,5),sub:relSub({},false),
   cols:[{h:"Item",w:34},{h:"Precisa",t:"num",w:12},{h:"Unidade",w:10},{h:"No estoque",t:"num",w:12},{h:"Falta",t:"num",w:12}],rows:listaCompras().map(x=>[x.nome,+x.qtd.toFixed(2),x.un,x.estoque==null?"":x.estoque,+x.falta.toFixed(2)])})}
);


/* >>> x_admres.js */
