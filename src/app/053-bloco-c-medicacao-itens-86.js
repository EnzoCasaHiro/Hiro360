/* ===== Bloco C: medicação (itens 86–105) ===== */
const xcC=()=>xmcfg("pres");
const xcL=k=>xcC()[k]||[];
const xcHoje=()=>hojeIso();
const xcAgora=()=>new Date().toTimeString().slice(0,5);
function xcHoras(s){return [...new Set((String(s||"").match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/g)||[]).map(t=>{const[h,m]=t.replace("h",":").split(":");return String(h).padStart(2,"0")+":"+(m||"00").padStart(2,"0")}))].sort()}
const xcAtiva=m=>(!m.inicio||m.inicio<=xcHoje())&&(!m.fim||m.fim>=xcHoje());
const xcTurno=h=>h>="06:00"&&h<"13:00"?"Manhã":h>="13:00"&&h<"19:00"?"Tarde":h>="19:00"?"Noite":"Madrugada";
const XC_ALTO=["insulina","heparina","varfarina","warfarina","enoxaparina","digoxina","metotrexato","morfina","metadona","fentanil","potassio","cloreto de potassio","amiodarona","clozapina","litio","tramadol","codeina","midazolam","diazepam","clonazepam"];
const XC_CTRL=["diazepam","clonazepam","alprazolam","lorazepam","bromazepam","fenobarbital","morfina","metadona","tramadol","codeina","risperidona","haloperidol","zolpidem","quetiapina","amitriptilina","carbamazepina","fentanil","midazolam","clobazam"];
const xcNome=n=>estNorm(n||"");
const xcAlto=n=>XC_ALTO.some(a=>xcNome(n).includes(a));
const xcCtrl=n=>XC_CTRL.some(a=>xcNome(n).includes(a));
/* itens do dia: um por residente/medicamento/horário */
function xcDoses(data){
  const out=[];resAll().filter(resAtivo).forEach(r=>(r.meds||[]).filter(m=>(!m.inicio||m.inicio<=data)&&(!m.fim||m.fim>=data)).forEach(m=>xcHoras(m.horarios).forEach(h=>{
    const reg=xcL("adm").find(a=>a.res===r.id&&a.med===m.id&&a.data===data&&a.prev===h);out.push({r,m,h,reg})})));
  return out.sort((a,b)=>a.h.localeCompare(b.h)||resNome(a.r).localeCompare(resNome(b.r),"pt"));
}
const xcMin=h=>{const[a,b]=h.split(":");return +a*60+ +b};
function xcAtrasadas(){const ag=new Date(),min=ag.getHours()*60+ag.getMinutes();return xcDoses(xcHoje()).filter(d=>!d.reg&&min-xcMin(d.h)>30)}
/* interações, duplicidade e alergia (referência simples) */
const XC_INTER=[["varfarina","aas","Risco aumentado de sangramento"],["varfarina","ibuprofeno","Risco aumentado de sangramento"],["varfarina","diclofenaco","Risco aumentado de sangramento"],["enalapril","espironolactona","Risco de potássio alto"],["losartana","espironolactona","Risco de potássio alto"],["captopril","espironolactona","Risco de potássio alto"],["sinvastatina","claritromicina","Risco de lesão muscular"],["sinvastatina","amiodarona","Risco de lesão muscular"],["digoxina","amiodarona","Aumenta o nível de digoxina"],["diazepam","morfina","Sedação e depressão respiratória"],["clonazepam","tramadol","Sedação e depressão respiratória"],["metformina","contraste","Cuidado com função renal"],["levotiroxina","omeprazol","Pode reduzir a absorção"],["levotiroxina","carbonato de calcio","Separar por 4 horas"],["ciprofloxacino","calcio","Separar por 2 horas"],["tramadol","fluoxetina","Risco de síndrome serotoninérgica"],["tramadol","sertralina","Risco de síndrome serotoninérgica"],["losartana","ibuprofeno","Pode prejudicar os rins"],["furosemida","gentamicina","Risco para rins e audição"]];
function xcConflitos(r,extra){
  const ms=[...(r.meds||[]).filter(xcAtiva),...(extra?[extra]:[])],out=[],N=ms.map(m=>xcNome(m.nome));
  for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){
    if(N[i]&&N[i]===N[j])out.push(`Duplicidade: ${ms[i].nome} aparece duas vezes`);
    XC_INTER.forEach(([a,b,t])=>{if((N[i].includes(a)&&N[j].includes(b))||(N[i].includes(b)&&N[j].includes(a)))out.push(`${ms[i].nome} + ${ms[j].nome}: ${t}`)})}
  const al=estNorm(r.alergias||"").split(/[,;\n]/).map(s=>s.trim()).filter(s=>s.length>2);
  ms.forEach((m,i)=>al.forEach(a=>{if(N[i].includes(a)||a.includes(N[i]))out.push(`ALERGIA: ${m.nome} (consta alergia a "${a}")`)}));
  return out;
}
{const orig=openMed;
 openMed=function(resId){orig.apply(this,arguments);
  try{const nm=document.getElementById("mdn")||document.querySelector('[id*="med"][id$="nome"]');if(!nm)return;
   const box=document.createElement("div");box.className="callout sand";box.style.cssText="margin:6px 0;display:none;font-size:13px";nm.parentNode.appendChild(box);
   const rid=resId;const chk=()=>{const r=resAll().find(x=>x.id===rid);if(!r||!nm.value.trim()){box.style.display="none";return}const c=xcConflitos(r,{id:"novo",nome:nm.value});box.style.display=c.length?"block":"none";box.innerHTML=c.length?"<b>Atenção</b> — confira com o médico ou farmacêutico:<br>"+c.map(f6Esc).join("<br>"):""};
   nm.addEventListener("input",chk)}catch(e){console.error(e)}}}
const XC_AVISO=`<p class="sub" style="margin-top:6px">Tabela de apoio simples e <b>incompleta</b>: não substitui a análise do médico ou do farmacêutico.</p>`;
xmReg("pres","medcheck","Medicação","Interações e alertas",()=>f6Card("Conferência de prescrições","Duplicidade, interações conhecidas e alergias cadastradas, por residente.",(()=>{const L=resAll().filter(resAtivo).map(r=>({r,c:xcConflitos(r)})).filter(x=>x.c.length);return (L.length?f6Tbl(["Residente","Alertas"],[L.map(x=>`<tr><td>${f6Esc(resNome(x.r))}</td><td>${x.c.map(c=>/ALERGIA/.test(c)?`<b style="color:#c62828">${f6Esc(c)}</b>`:f6Esc(c)).join("<br>")}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhum alerta encontrado nas prescrições atuais.</div>')+XC_AVISO})()),()=>{});
xmUrg(()=>podeVer("pres")?resAll().filter(resAtivo).flatMap(r=>xcConflitos(r).filter(c=>/ALERGIA/.test(c)).map(c=>({nivel:3,tipo:"Medicação",titulo:`${c.split(" (")[0]}: ${resNome(r)}`,detalhe:c,quando:xcHoje(),rota:"pres"}))):[]);
/* mapa de medicação por turno (imprimível) */
function xcMapa(turno){
  const D=xcDoses(xcHoje()).filter(d=>!turno||xcTurno(d.h)===turno);
  return `<table style="width:100%;border-collapse:collapse;font-size:12px"><tr>${["Hora","Residente","Quarto","Medicamento","Dose / via","Obs.","✔"].map(h=>`<th style="border:1px solid #333;padding:4px;text-align:left">${h}</th>`).join("")}</tr>${D.map(d=>`<tr>${[d.h,resNome(d.r),d.r.quarto||"",d.m.nome+(xcAlto(d.m.nome)?" ⚠ ALTO RISCO":""),`${d.m.dose||""} ${d.m.via||""}`,d.m.obs||"","☐"].map(c=>`<td style="border:1px solid #333;padding:4px">${f6Esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
}
/* administração do dia (87, 88, 89) */
function xcMarca(d,status,mot){
  if(!podeEd("pres"))return toast("Sem permissão para registrar.");
  xmsave("pres",{adm:[...xcL("adm").filter(a=>!(a.res===d.r.id&&a.med===d.m.id&&a.data===xcHoje()&&a.prev===d.h)),{id:uid8(),res:d.r.id,med:d.m.id,nome:d.m.nome,data:xcHoje(),prev:d.h,hora:xcAgora(),status,mot:mot||"",por:(typeof f4Quem==="function"&&f4Quem())||""}]});
}
xmReg("pres","admin","Medicação","Administração do dia",()=>{
  const D=xcDoses(xcHoje()),ag=new Date(),min=ag.getHours()*60+ag.getMinutes(),ed=podeEd("pres");
  const st=d=>d.reg?`<b style="color:${d.reg.status==="Administrado"?"#2e7d32":"#c62828"}">${d.reg.status}</b><div class="sub">${d.reg.hora} ${f6Esc(d.reg.por||"")} ${f6Esc(d.reg.mot||"")}</div>`:(min-xcMin(d.h)>30?`<b style="color:#c62828">atrasada</b>`:"pendente");
  const bt=(d,i)=>ed?(d.reg?`<button class="b sec sm" data-xcm="${i}|Pendente">Desfazer</button>`:`<button class="b sm" data-xcm="${i}|Administrado">Administrado</button> <button class="b sec sm" data-xcm="${i}|Recusou">Recusou</button> <button class="b sec sm" data-xcm="${i}|Adiado">Adiado</button>`):"";
  XM.sim.xcD=D;
  return f6Card("Administração de hoje",`${brDate(xcHoje())}. Marque cada dose no momento em que for dada. Doses sem registro há mais de 30 minutos ficam como atrasadas.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sec sm" id="xcmp">Imprimir mapa (todos)</button><button class="b sec sm" id="xcmpm">Manhã</button><button class="b sec sm" id="xcmpt">Tarde</button><button class="b sec sm" id="xcmpn">Noite</button></div>`+(D.length?f6Tbl(["Hora","Residente","Medicamento","Dose","Situação",""],[D.map((d,i)=>`<tr><td class="n"><b>${d.h}</b></td><td>${f6Esc(resNome(d.r))}</td><td>${f6Esc(d.m.nome)}${xcAlto(d.m.nome)?` <span class="pill s-falta">alto risco</span>`:""}</td><td>${f6Esc(d.m.dose||"")} ${f6Esc(d.m.via||"")}</td><td>${st(d)}</td><td>${bt(d,i)}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhum medicamento com horário cadastrado para hoje. Cadastre os horários na ficha do residente (ex.: 08:00, 20:00).</div>'));
},()=>{
  document.querySelectorAll("[data-xcm]").forEach(b=>b.onclick=()=>{const[i,s]=b.dataset.xcm.split("|"),d=XM.sim.xcD[+i];if(s==="Pendente"){xmsave("pres",{adm:xcL("adm").filter(a=>!(a.res===d.r.id&&a.med===d.m.id&&a.data===xcHoje()&&a.prev===d.h))});return xmGo()}
    if(s==="Administrado"){xcMarca(d,s);return xmGo()}
    f6Form(`${s}: ${d.m.nome}`,[{k:"mot",l:"Motivo"}],v=>{xcMarca(d,s,v.mot);xmGo()},{ok:"Registrar"})});
  [["xcmp",""],["xcmpm","Manhã"],["xcmpt","Tarde"],["xcmpn","Noite"]].forEach(([id,t])=>{const b=$(id);if(b)b.onclick=()=>xmPrint("Mapa de medicação"+(t?" — "+t:""),xcMapa(t))});
});
xmUrg(()=>podeVer("pres")?xcAtrasadas().map(d=>({nivel:2,tipo:"Medicação",titulo:`Dose atrasada: ${d.m.nome} às ${d.h}`,detalhe:resNome(d.r),quando:xcHoje(),rota:"pres"})):[]);
/* SOS (se necessário) */
const xcSos=xmRegistro({mod:"pres",key:"sos",res:true,titulo:"Medicação se necessário (SOS)",sub:"Toda dose fora do horário fixo, com o motivo e o resultado.",novo:"Registrar dose SOS",campos:[{k:"data",l:"Data",t:"date",d:xcHoje},{k:"hora",l:"Hora",t:"time",d:xcAgora},{k:"nome",l:"Medicamento e dose"},{k:"mot",l:"Motivo (dor, febre, náusea…)"},{k:"res2",l:"Resultado depois de 1 hora"},{k:"por",l:"Quem deu"}],ok:v=>v.nome.trim()&&v.mot.trim()?null:"Informe medicamento e motivo.",cols:[[x=>brDate(x.data)+" "+x.hora,"Quando","n"],[x=>f6Esc(x.nome),"Medicamento"],[x=>f6Esc(x.mot),"Motivo"],[x=>f6Esc(x.res2||"—"),"Resultado"],[x=>f6Esc(x.por||""),"Quem"]]});
xmReg("pres","sos","Medicação","Doses SOS",xcSos,()=>{});
/* controlados (92, 93) */
const xcCt=xmRegistro({mod:"pres",key:"controlados",res:true,titulo:"Livro de medicamentos controlados",sub:"Cada entrada ou saída de comprimidos de controle especial. O saldo é calculado por medicamento e residente; confira com a contagem física a cada troca de plantão.",novo:"Registrar movimento",campos:[{k:"data",l:"Data",t:"date",d:xcHoje},{k:"hora",l:"Hora",t:"time",d:xcAgora},{k:"nome",l:"Medicamento"},{k:"tipo",l:"Tipo",t:"select",opts:["Entrada (recebimento)","Saída (administração)","Perda ou descarte","Devolução à família"]},{k:"q",l:"Quantidade (comprimidos/ampolas)",t:"number"},{k:"por",l:"Responsável"},{k:"test",l:"Testemunha"},{k:"obs",l:"Observações"}],ok:v=>v.nome.trim()&&v.q>0?null:"Informe medicamento e quantidade.",
  cols:[[x=>brDate(x.data)+" "+(x.hora||""),"Quando","n"],[x=>f6Esc(x.nome),"Medicamento"],[x=>`<b style="color:${x.tipo.startsWith("Entrada")?"#2e7d32":"#c62828"}">${x.tipo.startsWith("Entrada")?"+":"−"}${x.q}</b> <span class="sub">${f6Esc(x.tipo)}</span>`,"Movimento","n"],[x=>f6Esc(x.por||""),"Responsável"],[x=>f6Esc(x.test||""),"Testemunha"]],
  rodape:L=>{const s={};L.forEach(x=>{const k=x.res+"|"+xcNome(x.nome);s[k]=s[k]||{res:x.res,nome:x.nome,q:0};s[k].q+=x.tipo.startsWith("Entrada")?+x.q:-x.q});const v=Object.values(s);return v.length?`<h4 style="margin:12px 0 4px">Saldo atual</h4>`+f6Tbl(["Residente","Medicamento","Saldo"],[v.map(a=>`<tr><td>${f6Esc(xmResNome(a.res))}</td><td>${f6Esc(a.nome)}</td><td class="n"><b style="color:${a.q<0?"#c62828":"inherit"}">${a.q}</b></td></tr>`).join("")]):""}});
xmReg("pres","controlados","Medicação","Livro de controlados",()=>{
  const sug=resAll().filter(resAtivo).flatMap(r=>(r.meds||[]).filter(m=>xcAtiva(m)&&xcCtrl(m.nome)).map(m=>`${resNome(r)}: ${m.nome}`));
  return (sug.length?`<div class="callout sand" style="margin-bottom:8px"><b>Pelo nome, parecem controlados nas prescrições:</b> ${sug.map(f6Esc).join("; ")}. Confirme na receita.</div>`:"")+xcCt()},()=>{});
/* estoque de medicação por residente (94, 95) */
const xcEst=xmRegistro({mod:"pres",key:"estmed",res:true,titulo:"Estoque de medicação por residente",sub:"O que a família trouxe e o que a casa guarda. Informe o saldo atual; o sistema calcula quantos dias duram, pelo número de doses por dia da prescrição.",novo:"Informar estoque",campos:[{k:"nome",l:"Medicamento"},{k:"q",l:"Quantidade atual (unidades)",t:"number"},{k:"porDose",l:"Unidades por dose",t:"number",d:1},{k:"val",l:"Validade",t:"date"},{k:"lote",l:"Lote"},{k:"data",l:"Contagem feita em",t:"date",d:xcHoje}],ok:v=>v.nome.trim()&&v.q!=null?null:"Informe medicamento e quantidade.",
  cols:[[x=>f6Esc(x.nome),"Medicamento"],[x=>x.q,"Saldo","n"],[x=>{const d=xcDias(x);return d==null?"—":`<b style="color:${d<=5?"#c62828":d<=10?"#e0a100":"inherit"}">${d} dias</b>`},"Duração","n"],[x=>x.val?xmVenc(x.val,30):"—","Validade"],[x=>brDate(x.data),"Contado em","n"]]});
function xcDias(x){const r=resAll().find(a=>a.id===x.res);if(!r)return null;const m=(r.meds||[]).find(a=>xcAtiva(a)&&xcNome(a.nome).includes(xcNome(x.nome).split(" ")[0]));if(!m)return null;const dia=xcHoras(m.horarios).length*(+x.porDose||1);if(!dia)return null;return Math.max(0,Math.floor(x.q/dia)-Math.max(0,daysBetweenIso(x.data,xcHoje())))}
xmReg("pres","estmed","Medicação","Estoque por residente",xcEst,()=>{});
xmUrg(()=>podeVer("pres")?[...xcL("estmed").filter(x=>{const d=xcDias(x);return d!=null&&d<=5}).map(x=>({nivel:2,tipo:"Medicação",titulo:`Medicação acabando: ${x.nome}`,detalhe:`${xmResNome(x.res)} — dura cerca de ${xcDias(x)} dia(s)`,quando:xcHoje(),rota:"pres"})),...xcL("estmed").filter(x=>x.val&&xmDias(x.val)<=30).map(x=>({nivel:xmDias(x.val)<0?3:1,tipo:"Medicação",titulo:`Medicamento ${xmDias(x.val)<0?"vencido — descartar":"vencendo"}: ${x.nome}`,detalhe:`${xmResNome(x.res)}, validade ${brDate(x.val)}`,quando:x.val,rota:"pres"}))]:[]);
/* recebimento da família (96) e descarte (97) */
const xcRec=xmRegistro({mod:"pres",key:"recebimento",res:true,titulo:"Recebimento de medicação da família",novo:"Registrar recebimento",campos:[{k:"data",l:"Data",t:"date",d:xcHoje},{k:"nome",l:"Medicamento e apresentação"},{k:"q",l:"Quantidade",t:"number"},{k:"val",l:"Validade",t:"date"},{k:"quem",l:"Quem entregou"},{k:"rec",l:"Quem recebeu"},{k:"emb",l:"Embalagem original e receita conferidas",t:"check"},{k:"obs",l:"Observações"}],ok:v=>v.nome.trim()&&v.q>0?null:"Informe medicamento e quantidade.",cols:[[x=>brDate(x.data),"Data","n"],[x=>f6Esc(x.nome),"Medicamento"],[x=>x.q,"Qtd.","n"],[x=>f6Esc(x.quem||""),"Entregou"],[x=>f6Esc(x.rec||""),"Recebeu"],[x=>x.emb?"conferida":"<b style='color:#c62828'>não conferida</b>","Embalagem"]]});
xmReg("pres","recebmed","Medicação","Recebimento da família",xcRec,()=>{});
const xcDesc=xmRegistro({mod:"pres",key:"descarte",res:true,titulo:"Descarte de medicamentos",sub:"Medicamentos vencidos, suspensos ou de residente que saiu. Registre como foi descartado (devolução à farmácia ou coleta apropriada).",novo:"Registrar descarte",campos:[{k:"data",l:"Data",t:"date",d:xcHoje},{k:"nome",l:"Medicamento"},{k:"q",l:"Quantidade",t:"number"},{k:"mot",l:"Motivo",t:"select",opts:["Vencido","Suspenso pelo médico","Residente saiu","Contaminado ou danificado","Outro"]},{k:"dest",l:"Destino (farmácia, coleta)"},{k:"por",l:"Responsável"}],ok:v=>v.nome.trim()?null:"Informe o medicamento.",cols:[[x=>brDate(x.data),"Data","n"],[x=>f6Esc(x.nome),"Medicamento"],[x=>x.q??"—","Qtd.","n"],[x=>f6Esc(x.mot||""),"Motivo"],[x=>f6Esc(x.dest||""),"Destino"]]});
xmReg("pres","descarte","Medicação","Descarte",xcDesc,()=>{});
/* checklist de troca de plantão da medicação (98) */
const xcCk=xmChecklist({mod:"pres",key:"trocaplantao",res:false,periodo:true,titulo:"Conferência de medicação na troca de plantão",sub:"Marque o que foi conferido hoje.",itens:["Contagem dos controlados conferida com o livro","Medicações do turno anterior todas registradas","Doses atrasadas ou recusadas comunicadas","Geladeira de medicação: temperatura anotada","Medicamentos novos ou suspensos repassados","Carrinho/maleta de medicação organizado e trancado","Receitas vencendo repassadas ao responsável"]});
xmReg("pres","ckmed","Medicação","Conferência na troca de plantão",xcCk.html,xcCk.bind);
/* etiquetas (99) */
xmReg("pres","etiq","Medicação","Etiquetas de medicamentos",()=>f6Card("Etiquetas para frascos e porta-comprimidos","Imprime uma etiqueta por medicamento ativo do residente escolhido.",`<div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="xcer"><option value="">Escolha…</option>${xmResOpts().map(([i,n])=>`<option value="${i}" ${PRES.sel===i?"selected":""}>${f6Esc(n)}</option>`).join("")}</select></div><button class="b sm" id="xceb">Imprimir etiquetas</button></div>`),()=>{const b=$("xceb");if(b)b.onclick=()=>{const r=resAll().find(x=>x.id===$("xcer").value);if(!r)return toast("Escolha o residente.");xmPrint("Etiquetas",`<div style="display:flex;flex-wrap:wrap;gap:6px">${(r.meds||[]).filter(xcAtiva).map(m=>`<div style="border:1px solid #333;padding:6px;width:210px;font-size:12px"><b>${f6Esc(resNome(r))}</b> · Q ${f6Esc(r.quarto||"")}<br><b>${f6Esc(m.nome)}</b> ${f6Esc(m.dose||"")}<br>${f6Esc(m.via||"")} · ${f6Esc(m.horarios||"")}${xcAlto(m.nome)?"<br><b>⚠ ALTO RISCO</b>":""}${r.alergias?"<br>Alergia: "+f6Esc(r.alergias):""}</div>`).join("")}</div>`)}});
/* histórico de mudanças da prescrição (100) */
{const orig=resSave;
 resSave=function(l){try{const novos=[],ant=resAll();l.forEach(r=>{const a=ant.find(x=>x.id===r.id);if(!a)return;const A=new Map((a.meds||[]).map(m=>[m.id,m])),B=new Map((r.meds||[]).map(m=>[m.id,m]));
   B.forEach((m,id)=>{const o=A.get(id);if(!o)novos.push({id:uid8(),res:r.id,data:xcHoje(),hora:xcAgora(),ac:"Incluído",txt:`${m.nome} ${m.dose||""} ${m.horarios||""}`});else if(o.nome!==m.nome||o.dose!==m.dose||o.horarios!==m.horarios||o.via!==m.via||o.fim!==m.fim)novos.push({id:uid8(),res:r.id,data:xcHoje(),hora:xcAgora(),ac:m.fim&&!o.fim?"Suspenso":"Alterado",txt:`${o.nome} ${o.dose||""} ${o.horarios||""} → ${m.nome} ${m.dose||""} ${m.horarios||""}${m.fim?" (até "+m.fim+")":""}`})});
   A.forEach((m,id)=>{if(!B.has(id))novos.push({id:uid8(),res:r.id,data:xcHoje(),hora:xcAgora(),ac:"Removido",txt:`${m.nome} ${m.dose||""}`})})});
  if(novos.length)xmsave("pres",{hprescr:[...xcL("hprescr"),...novos].slice(-1500)})}catch(e){console.error(e)}return orig(l)}}
xmReg("pres","hprescr","Medicação","Histórico de prescrições",()=>{const F=PRES.sel||"";const L=xcL("hprescr").filter(x=>!F||x.res===F).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora)).slice(0,200);return f6Card("Mudanças nas prescrições",F?"Do residente selecionado.":"De todos os residentes.",L.length?f6Tbl(["Quando","Residente","Ação","Detalhe"],[L.map(x=>`<tr><td class="n">${brDate(x.data)} ${x.hora}</td><td>${f6Esc(xmResNome(x.res))}</td><td><b>${x.ac}</b></td><td>${f6Esc(x.txt)}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhuma mudança registrada ainda (valem as alterações feitas daqui para frente).</div>')},()=>{});
/* erros e relatório (101, 102) */
xmReg("pres","relmed","Medicação","Relatório de adesão e erros",()=>{
  const d0=XM.sim.xcd0||addDaysIso(xcHoje(),-30),A=xcL("adm").filter(a=>a.data>=d0),tot=A.length,por={};A.forEach(a=>por[a.status]=(por[a.status]||0)+1);
  const err=xpL("incidentes").filter(x=>x.tipo==="Erro de medicação"&&x.data>=d0),rec={};A.filter(a=>a.status==="Recusou").forEach(a=>rec[a.res]=(rec[a.res]||0)+1);
  return f6Card("Adesão e erros de medicação",`Desde ${brDate(d0)}.`,`<div class="row" style="align-items:flex-end"><div><label>A partir de</label><input type="date" id="xcd0" value="${d0}"></div><button class="b sec sm" id="xcd0b">Atualizar</button></div><p style="margin-top:8px">Doses registradas: <b>${tot}</b> · Administradas: <b>${por.Administrado||0}</b> · Recusadas: <b>${por.Recusou||0}</b> · Adiadas: <b>${por.Adiado||0}</b> · Erros de medicação notificados: <b>${err.length}</b></p>`+(Object.keys(rec).length?f6Tbl(["Residente","Recusas"],[Object.entries(rec).sort((a,b)=>b[1]-a[1]).map(([i,n])=>`<tr><td>${f6Esc(xmResNome(i))}</td><td class="n">${n}</td></tr>`).join("")]):""));
},()=>{const b=$("xcd0b");if(b)b.onclick=()=>{XM.sim.xcd0=$("xcd0").value;xmGo()}});
/* alto risco (103) e reposição de controlada (104) */
xmReg("pres","altorisco","Medicação","Medicamentos de alto risco",()=>{const L=resAll().filter(resAtivo).flatMap(r=>(r.meds||[]).filter(m=>xcAtiva(m)&&xcAlto(m.nome)).map(m=>({r,m})));return f6Card("Medicamentos potencialmente perigosos em uso","Identificados pelo nome (insulinas, anticoagulantes, opioides e outros). Exigem dupla checagem.",L.length?f6Tbl(["Residente","Medicamento","Dose","Horários"],[L.map(x=>`<tr><td>${f6Esc(resNome(x.r))}</td><td><b>${f6Esc(x.m.nome)}</b></td><td>${f6Esc(x.m.dose||"")}</td><td>${f6Esc(x.m.horarios||"")}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhum encontrado.</div>')+XC_AVISO},()=>{});
xmUrg(()=>podeVer("pres")?resAll().filter(resAtivo).flatMap(r=>(r.meds||[]).filter(m=>xcAtiva(m)&&xcCtrl(m.nome)).filter(m=>!xpL("receitas").some(x=>x.res===r.id&&x.ctrl&&xcNome(x.med).includes(xcNome(m.nome).split(" ")[0])&&(!x.val||xmDias(x.val)>=0))).map(m=>({nivel:2,tipo:"Medicação",titulo:`Controlado sem receita válida: ${m.nome}`,detalhe:`${resNome(r)} — cadastre a receita (Receitas e validade)`,quando:xcHoje(),rota:"pres"}))):[]);
/* custo de medicação (105) */
xmReg("pres","customed","Medicação","Custo de medicação",()=>{
  const ms=XM.sim.xcmes||xcHoje().slice(0,7),ed=podeEd("pres")&&f4Gestor(),P=xmcfg("pres").precos||{};
  const L=resAll().filter(resAtivo).map(r=>({r,v:(xcL("custos").filter(c=>c.res===r.id&&c.mes===ms).reduce((s,c)=>s+(+c.valor||0),0))}));
  return xcCustos()+f6Card("Total do mês",ms,f6Tbl(["Residente","Medicação do mês (R$)",""],[L.map(x=>`<tr><td>${f6Esc(resNome(x.r))}</td><td class="n">${fmtBRL(x.v)}</td><td>${ed&&x.v>0?`<button class="b sec sm" data-xcc="${x.r.id}">Lançar a receber</button>`:""}</td></tr>`).join("")],"txt"));
},()=>{document.querySelectorAll("[data-xcc]").forEach(b=>b.onclick=()=>{const r=resAll().find(x=>x.id===b.dataset.xcc),ms=XM.sim.xcmes||xcHoje().slice(0,7),v=xcL("custos").filter(c=>c.res===r.id&&c.mes===ms).reduce((s,c)=>s+(+c.valor||0),0);
  f6Form("Lançar medicação a receber",[{k:"venc",l:"Vencimento",t:"date",v:addDaysIso(xcHoje(),10)}],w=>{const e=f10Novo(r,{desc:`Medicação ${ms} — ${resNome(r)}`,cat:"Outras receitas",valor:arred2(v),venc:w.venc,comp:ms});return f10Lanca([e],"Lançado em Contas a receber.")},{ok:"Lançar"})})});
const xcCustos=xmRegistro({mod:"pres",key:"custos",res:true,titulo:"Gastos com medicação do residente",sub:"Compras de medicamentos feitas pela casa para o residente, para repassar à família.",novo:"Registrar gasto",campos:[{k:"mes",l:"Mês (AAAA-MM)",d:()=>xcHoje().slice(0,7)},{k:"desc",l:"Descrição"},{k:"valor",l:"Valor (R$)",t:"number"}],ok:v=>v.valor>0&&/^\d{4}-\d{2}$/.test(v.mes)?null:"Informe mês (AAAA-MM) e valor.",cols:[[x=>x.mes,"Mês","n"],[x=>f6Esc(x.desc||""),"Descrição"],[x=>fmtBRL(x.valor),"Valor","n"]]});


/* >>> x_m4.js */
