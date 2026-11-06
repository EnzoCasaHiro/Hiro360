/* ===== Bloco R (V38) · RH: ponto e escalas ===== */
const xvC=()=>xmcfg("ponto"),xvL=k=>xvC()[k]||[],xvT=()=>xmcfg("turnos"),xvTL=k=>xvT()[k]||[];
const xvHoje=()=>hojeIso(),xvQuem=()=>(typeof f4Quem==="function"&&f4Quem())||"";
const xvAtivos=()=>integList().filter(i=>(i.situacao||"Ativo")!=="Desligado");
const xvDt=s=>{try{return new Date(s).toLocaleString("pt-BR")}catch(e){return String(s||"")}};
const xvIdM=p=>"r"+p.userId+"_"+localIso(p.ts).replace(/\D/g,"");
const xvDepts=()=>[...new Set(integList().map(i=>i.depto||i.cargo||"Outro"))].sort();
/* ---------- importação em lote com prévia ---------- */
const XV={prev:null};
const xvPrevia=()=>xvC().previa!==false;
async function xvLerArq(f){
  let txt="";try{txt=decodeFile(await f.arrayBuffer())}catch(e){return{nome:f.name,erro:"Não foi possível abrir o arquivo."}}
  const{punches,divergences}=parseRawlog(txt);
  if(!punches.length)return{nome:f.name,erro:"Não reconheci este arquivo como registro do relógio (formato AllGLog). Se o seu relógio grava outro formato, me avise.",amostra:(txt.split(/\r?\n/).find(l=>l.trim())||"").slice(0,90)};
  const novasP=[],rep=[],desc=new Map();
  punches.forEach(p=>{(S.marcacoes[xvIdM(p)]?rep:novasP).push(p);if(!integByUid(p.userId)&&!desc.has(p.userId))desc.set(p.userId,p.uname)});
  const dupMin=xeCfg().dup,ord=[...punches].sort((a,b)=>a.userId-b.userId||a.ts-b.ts);let dup=0;
  for(let i=1;i<ord.length;i++)if(ord[i].userId===ord[i-1].userId&&xeMin(ord[i-1].ts,ord[i].ts)<=dupMin)dup++;
  const agora=Date.now(),fut=punches.filter(p=>p.ts.getTime()>agora+864e5).length,velhas=punches.filter(p=>p.ts.getTime()<agora-400*864e5).length;
  const dias=punches.map(p=>isoDate(p.ts)).sort(),h=punches.length+"|"+punches[0].ts.getTime()+"|"+punches[punches.length-1].ts.getTime();
  return{nome:f.name,punches,div:divergences,novasP,rep:rep.length,desc,dup,fut,velhas,ini:dias[0],fim:dias[dias.length-1],pessoas:new Set(punches.map(p=>p.userId)).size,igual:xeL("arqs").some(a=>a.h===h)};
}
async function xvStage(files){
  if(!files.length)return;
  const itens=[];for(const f of files)itens.push(await xvLerArq(f));
  const novos=new Map();itens.forEach(x=>(x.desc||new Map()).forEach((nm,u)=>novos.set(u,nm)));
  const nNov=itens.reduce((s,x)=>s+(x.novasP?x.novasP.length:0),0);
  const ov=openModal(`<h3>Prévia da importação</h3><p class="sub">Nada foi gravado ainda. Confira e confirme.</p>`+
   f6Tbl(["Arquivo","Situação","Período","Pessoas","Novas","Já existiam","Atenção"],[itens.map(x=>x.erro?`<tr><td>${f6Esc(x.nome)}</td><td colspan="6" class="err" style="margin:0">${f6Esc(x.erro)}${x.amostra?` <span class="sub">Primeira linha: ${f6Esc(x.amostra)}</span>`:""}</td></tr>`:`<tr><td>${f6Esc(x.nome)}</td><td>Lido</td><td>${brDate(x.ini)} a ${brDate(x.fim)}</td><td class="n">${x.pessoas}</td><td class="n"><b>${x.novasP.length}</b></td><td class="n">${x.rep}</td><td>${[x.igual?"arquivo igual a um já importado":"",x.dup?x.dup+" batida(s) muito próxima(s)":"",x.fut?x.fut+" com data futura":"",x.velhas?x.velhas+" com mais de 400 dias":"",x.div.length?x.div.length+" divergência(s) de formato":"",x.desc.size?x.desc.size+" pessoa(s) sem cadastro":""].filter(Boolean).map(f6Esc).join("; ")||"—"}</td></tr>`).join("")],"txt")+
   (novos.size?`<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-weight:400"><input type="checkbox" id="xvcad" checked> <span>Cadastrar as ${novos.size} pessoa(s) que ainda não estão no sistema (${[...novos.values()].slice(0,6).map(f6Esc).join(", ")}${novos.size>6?"…":""}). Depois complete os dados no Prontuário.</span></label>`:"")+
   `<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="b sec" id="xvno">Cancelar</button><button class="b" id="xvok" ${nNov||novos.size?"":"disabled"}>${nNov?`Importar ${nNov} batida(s)`:"Nada novo para importar"}</button></div>`);
  ov.querySelector("#xvno").onclick=()=>ov.remove();
  ov.querySelector("#xvok").onclick=()=>{const cad=!!ov.querySelector("#xvcad")&&ov.querySelector("#xvcad").checked;ov.remove();xvConfirma(itens,cad)};
}
function xvConfirma(itens,cad){
  const ids=[],criados=[],arqs=[];let nov=0,rep=0,ate="";
  itens.filter(x=>!x.erro).forEach(x=>{
    const P=POINT;P.punches=x.punches;P.file=x.nome;P.div=x.div;P.result=null;P.err="";P.start=x.ini;P.end=x.fim;
    if(cad)x.desc.forEach((nm,u)=>{if(!integByUid(u)){put("integrantes","u"+u,{uid:u,nome:nm,nomeCompleto:"",depto:"Outro",turno:"",escalaModo:"semana",dias:[0,1,2,3,4],situacao:"Ativo"});criados.push("u"+u)}});
    x.novasP.forEach(p=>ids.push(xvIdM(p)));importMarcas(x.punches);nov+=x.novasP.length;rep+=x.rep;arqs.push(x.nome);if(x.fim>ate)ate=x.fim;
  });
  if(!arqs.length)return;
  const hist=xvL("imps").map((h,i,a)=>i<a.length-15?{...h,ids:[]}:h);
  xmsave("ponto",{imps:[...hist,{id:uid8(),em:new Date().toISOString(),por:xvQuem(),arqs,novas:nov,rep,ate,ids:ids.length<=4000?ids:[],criados}].slice(-60)});
  toast(`${nov} batida(s) importada(s)${criados.length?`; ${criados.length} pessoa(s) cadastrada(s)`:""}.`);go("ponto",true);
}
{const _ll=loadLog;loadLog=function(f){return xvPrevia()?xvStage([f]):_ll.apply(this,arguments)};
 const _bp=bindPonto;bindPonto=function(){_bp.apply(this,arguments);try{if(!xvPrevia())return;const fi=$("file"),drop=$("drop");fi.multiple=true;fi.accept=".txt,.log,.csv";fi.onchange=()=>fi.files.length&&xvStage([...fi.files]);drop.ondrop=e=>{e.preventDefault();drop.classList.remove("on");if(e.dataTransfer.files.length)xvStage([...e.dataTransfer.files])}}catch(e){console.error(e)}}}
function xvUltimaImp(){const t=[...xvL("imps").map(x=>x.em),...xeL("arqs").map(x=>x.em)].sort();return t.length?t[t.length-1]:null}
xmReg("ponto","lote","Relógio","Importar arquivos do relógio (com prévia)",()=>{
  const u=xvUltimaImp(),H=xvL("imps").slice().reverse(),dias=u?daysBetweenIso(u.slice(0,10),xvHoje()):null;
  return f6Card("Importar arquivos do relógio","Escolha ou arraste um ou vários arquivos de uma vez. O sistema lê cada um e mostra uma prévia (quantas batidas são novas, repetidas, quem não está cadastrado e o que parece estranho) antes de gravar. O navegador não consegue buscar os arquivos no relógio sozinho: o caminho é o pen drive.",
   `<div class="drop" id="xvdrop" tabindex="0">${ic("up")}<div>Clique ou solte os arquivos do relógio aqui</div></div><input type="file" id="xvfile" multiple accept=".txt,.log,.csv" hidden>
   <div class="row" style="margin-top:10px;align-items:center"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="xvpv" ${xvPrevia()?"checked":""}> Sempre mostrar a prévia ao importar (recomendado)</label>
   <div><label>Avisar se passar de (dias)</label><input type="number" id="xvdi" value="${xvC().diasImp||3}" style="width:80px"></div></div>
   <p class="sub">Última importação: <b>${u?xvDt(u)+" ("+(dias===0?"hoje":dias+" dia(s) atrás")+")":"nenhuma ainda"}</b></p>`)+
  f6Card("Histórico de importações","Cada importação feita por aqui pode ser desfeita: as batidas que ela trouxe são removidas (as que você ajustou à mão ficam).",H.length?f6Tbl(["Quando","Quem","Arquivos","Novas","Repetidas",""],[H.map(h=>`<tr><td>${xvDt(h.em)}</td><td>${f6Esc(h.por||"—")}</td><td>${h.arqs.map(f6Esc).join(", ")}</td><td class="n">${h.novas}</td><td class="n">${h.rep}</td><td>${h.desfeita?'<span class="sub">desfeita</span>':(h.ids&&h.ids.length?`<button class="b sec sm" data-xvund="${h.id}">Desfazer</button>`:'<span class="sub">sem como desfazer</span>')}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhuma importação registrada por aqui ainda.</div>');
},()=>{
  const d=$("xvdrop"),f=$("xvfile");if(!d)return;
  d.onclick=()=>f.click();d.ondragover=e=>{e.preventDefault();d.classList.add("on")};d.ondragleave=()=>d.classList.remove("on");
  d.ondrop=e=>{e.preventDefault();d.classList.remove("on");xvStage([...e.dataTransfer.files])};f.onchange=()=>{xvStage([...f.files]);f.value=""};
  $("xvpv").onchange=()=>xmsave("ponto",{previa:$("xvpv").checked});$("xvdi").onchange=()=>xmsave("ponto",{diasImp:Math.max(1,+$("xvdi").value||3)});
  document.querySelectorAll("[data-xvund]").forEach(b=>b.onclick=async()=>{const h=xvL("imps").find(x=>x.id===b.dataset.xvund);if(!h||!await askConfirm("Desfazer esta importação? As batidas que ela trouxe serão removidas.","Desfazer"))return;
    let n=0;(h.ids||[]).forEach(id=>{const m=S.marcacoes[id];if(m&&m.origem==="relogio"){del("marcacoes",id);n++}});
    (h.criados||[]).forEach(id=>{const g=S.integrantes[id];if(g&&!g.nomeCompleto&&!g.cargo&&!Object.values(S.marcacoes).some(m=>+m.uid===+g.uid))del("integrantes",id)});
    xmsave("ponto",{imps:xvL("imps").map(x=>x.id===h.id?{...x,desfeita:true,desfeitaEm:new Date().toISOString(),desfeitaPor:xvQuem()}:x)});audit("ponto_desfaz",h.arqs.join(", "));toast(n+" batida(s) removida(s).");xmGo()});
});
xmUrg(()=>{if(!podeVer("ponto"))return[];const u=xvUltimaImp();if(!u)return[];const n=daysBetweenIso(u.slice(0,10),xvHoje()),lim=xvC().diasImp||3;return n>lim?[{nivel:1,tipo:"Ponto",titulo:`Ponto sem importar há ${n} dias`,detalhe:"Pegue o arquivo no relógio (pen drive) e importe em Ponto → Importar arquivos.",quando:u.slice(0,10),rota:"ponto"}]:[]});
/* ---------- relógios cadastrados ---------- */
const xvRel=xmRegistro({mod:"ponto",key:"relogios",titulo:"Relógios de ponto cadastrados",sub:"Cadastre cada relógio (modelo, local, número de série) e anote a última coleta do arquivo.",novo:"Novo relógio",campos:[{k:"nome",l:"Nome (ex.: Portaria)"},{k:"modelo",l:"Modelo (ex.: IT-Blue SC9008U)"},{k:"local",l:"Local"},{k:"serie",l:"Número de série"},{k:"devId",l:"Número do relógio no arquivo (DevId)",t:"number"},{k:"coleta",l:"Última coleta",t:"date"},{k:"obs",l:"Observações",t:"textarea"}],ok:v=>v.nome.trim()?null:"Dê um nome ao relógio.",cols:[[x=>f6Esc(x.nome),"Relógio"],[x=>f6Esc(x.modelo||""),"Modelo"],[x=>f6Esc(x.local||""),"Local"],[x=>x.coleta?brDate(x.coleta):"—","Coleta"]]});
xmReg("ponto","relogios","Relógio","Relógios cadastrados",()=>{const m={};Object.values(S.marcacoes).forEach(x=>{if(x.devId!=null){const o=m[x.devId]||(m[x.devId]={n:0,u:""});o.n++;if(x.ts>o.u)o.u=x.ts}});const k=Object.keys(m);
  return xvRel()+(k.length?f6Card("Relógios que aparecem nos arquivos","Número do relógio (DevId) lido dos arquivos importados.",f6Tbl(["DevId","Batidas","Última batida"],[k.map(d=>`<tr><td>${d}</td><td class="n">${m[d].n}</td><td>${xvDt(m[d].u)}</td></tr>`).join("")],"txt")):"")},()=>{});
/* ---------- painel do dia ---------- */
function xvPainelDados(iso){
  const sh=buildShifts(),c=xeCfg(),agora=new Date(),hoje=xvHoje();
  return xvAtivos().filter(i=>!semPonto(i)).map(i=>{
    if(typeof xeAfastado==="function"&&xeAfastado(i.id,iso))return{i,k:"af",st:"Afastado / férias"};
    const e=escalaDia(i,iso);if(!e.on)return{i,k:"fo",st:"Folga"};
    let ini=null;try{ini=expectedPeriods(iso,sh.get(e.turno))[0][0]}catch(x){}
    const m=i.uid!=null?marcasOf(i.uid,iso,iso).map(x=>x.ts).sort((a,b)=>a-b):[];
    if(m.length){const at=ini?xeMin(ini,m[0]):0;return at>c.tol?{i,k:"at",st:`Atrasado ${xeHM(at)} (entrou ${m[0].toTimeString().slice(0,5)})`,ini}:{i,k:"ok",st:`Presente (entrou ${m[0].toTimeString().slice(0,5)})`,ini}}
    if(iso>hoje)return{i,k:"fu",st:"Previsto",ini};
    if(ini&&agora<ini&&iso===hoje)return{i,k:"fu",st:"Ainda não começou ("+ini.toTimeString().slice(0,5)+")",ini};
    return{i,k:"nb",st:"Não bateu o ponto",ini};
  });
}
xmReg("ponto","painel","Relógio","Painel do dia",()=>{
  const iso=XM.sim.xvdia||xvHoje(),L=xvPainelDados(iso),ult=Object.values(S.marcacoes).filter(m=>!m.removida).map(m=>m.ts).sort().pop(),n=k=>L.filter(x=>x.k===k).length,ord={nb:0,at:1,fu:2,ok:3,fo:4,af:5};
  const stale=!ult||ult.slice(0,10)<iso;
  return f6Card("Quem bateu, quem falta bater",`Mostra, para o dia escolhido, quem deveria estar trabalhando e se já há batida importada. O painel só sabe o que já foi importado do relógio${ult?` (última batida: ${xvDt(ult)})`:""}.`,
   `<div class="row" style="align-items:flex-end"><div><label>Dia</label><input type="date" id="xvdia" value="${iso}"></div></div>${stale?`<div class="callout sand" style="margin:8px 0">Os dados do relógio só vão até ${ult?brDate(ult.slice(0,10)):"—"}. Importe o arquivo mais recente para ver quem já bateu.</div>`:""}
   <div class="stats" style="margin:10px 0"><div class="stat"><b>${n("ok")}</b><span>presentes</span></div><div class="stat"><b>${n("at")}</b><span>atrasados</span></div><div class="stat"><b>${n("nb")}</b><span>não bateram</span></div><div class="stat"><b>${n("fo")+n("af")}</b><span>folga ou afastados</span></div></div>`+
   (L.length?f6Tbl(["Integrante","Cargo","Situação"],[L.sort((a,b)=>ord[a.k]-ord[b.k]||nomeInteg(a.i).localeCompare(nomeInteg(b.i),"pt")).map(x=>`<tr><td>${f6Esc(nomeInteg(x.i))}</td><td>${f6Esc(x.i.cargo||"")}</td><td>${x.k==="nb"?'<b style="color:var(--urgente)">':x.k==="at"?'<b style="color:var(--madeira)">':"<span>"}${f6Esc(x.st)}${x.k==="nb"||x.k==="at"?"</b>":"</span>"}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhum integrante com ponto cadastrado.</div>'));
},()=>{const d=$("xvdia");if(d)d.onchange=()=>{XM.sim.xvdia=d.value||xvHoje();xmGo()}});
/* ---------- conferência dos dados importados ---------- */
xmReg("ponto","conf","Relógio","Conferência dos dados do relógio",()=>{
  const fim=XM.sim.xvcf||xvHoje(),ini=XM.sim.xvci||addDaysIso(fim,-29),cols=xvAtivos().filter(i=>!semPonto(i)&&i.uid!=null);
  const por={};Object.values(S.marcacoes).filter(m=>!m.removida).forEach(m=>{const d=m.ts.slice(0,10);if(d>=ini&&d<=fim)por[d]=(por[d]||0)+1});
  const dias=[];for(let d=ini;d<=fim&&dias.length<400;d=addDaysIso(d,1))dias.push(d);
  const semDia=dias.filter(d=>!por[d]);
  const semBat=cols.filter(i=>{if(marcasOf(i.uid,ini,fim).length)return false;return dias.some(d=>escalaDia(i,d).on&&!(typeof xeAfastado==="function"&&xeAfastado(i.id,d)))});
  const desc=new Map();Object.values(S.marcacoes).filter(m=>!m.removida&&m.ts.slice(0,10)>=ini&&m.ts.slice(0,10)<=fim&&!integByUid(m.uid)).forEach(m=>desc.set(m.uid,(desc.get(m.uid)||0)+1));
  const v=Object.values(por),med=v.length?v.reduce((a,b)=>a+b,0)/v.length:0,fraco=dias.filter(d=>por[d]&&med&&por[d]<med*0.4);
  return f6Card("Conferência dos dados do relógio","Aponta buracos nos dados importados: dias sem nenhuma batida, pessoas escaladas que não bateram nunca, números do relógio sem cadastro e dias com muito menos batidas que o normal.",
   `<div class="row" style="align-items:flex-end"><div><label>De</label><input type="date" id="xvci" value="${ini}"></div><div><label>Até</label><input type="date" id="xvcf" value="${fim}"></div></div>
   <h4 style="margin:12px 0 4px">Dias sem nenhuma batida (${semDia.length})</h4>${semDia.length?`<p>${semDia.slice(0,40).map(d=>brDate(d)).join(", ")}${semDia.length>40?"…":""}</p><p class="sub">Domingos e feriados podem ser normais; nos demais, falta importar ou o relógio ficou desligado.</p>`:'<div class="sub">Todos os dias do período têm batidas.</div>'}
   <h4 style="margin:12px 0 4px">Escalados que não têm nenhuma batida no período (${semBat.length})</h4>${semBat.length?`<p>${semBat.map(i=>f6Esc(nomeInteg(i))).join(", ")}</p>`:'<div class="sub">Nenhum.</div>'}
   <h4 style="margin:12px 0 4px">Números do relógio sem cadastro (${desc.size})</h4>${desc.size?`<p>${[...desc.entries()].map(([u,n])=>`nº ${u} (${n} batidas)`).join(", ")}</p><p class="sub">Vincule em Ponto → De-para e vínculos.</p>`:'<div class="sub">Nenhum.</div>'}
   <h4 style="margin:12px 0 4px">Dias com poucas batidas (${fraco.length})</h4>${fraco.length?`<p>${fraco.map(d=>`${brDate(d)} (${por[d]})`).join(", ")}</p><p class="sub">Média do período: ${med.toFixed(0)} batidas por dia.</p>`:'<div class="sub">Nenhum dia fora do padrão.</div>'}`);
},()=>{["xvci","xvcf"].forEach(k=>{const e=$(k);if(e)e.onchange=()=>{XM.sim[k==="xvci"?"xvci":"xvcf"]=e.value;xmGo()}})});
/* ---------- batida esquecida, autorização de horas extras, adicionais, jornadas, licenças curtas ---------- */
const XV_STAT=x=>x.status==="Aprovada"?f6Dot("#2e7d32")+"aprovada":x.status==="Recusada"?f6Dot("#c62828")+"recusada":f6Dot("#e0a100")+"aguardando";
const xvBat=xmRegistro({mod:"ponto",key:"esquecida",titulo:"Batida esquecida (com foto e aprovação)",sub:"O integrante (ou o gestor) registra a batida que faltou, com o motivo e a foto do relógio ou do papel. Ao aprovar, a batida entra no ponto com a marca “ajuste”.",novo:"Nova batida esquecida",campos:[{k:"col",l:"Integrante",t:"select",opts:xmColOpts},{k:"data",l:"Data",t:"date",d:xvHoje},{k:"hora",l:"Hora (HH:MM)",d:()=>"07:00"},{k:"tipo",l:"Tipo",t:"select",opts:["Entrada","Saída","Saída para intervalo","Volta do intervalo"]},{k:"mot",l:"Motivo",t:"textarea"},{k:"status",l:"Situação",t:"select",opts:["Aguardando","Aprovada","Recusada"]}],
  ok:v=>v.col&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.hora||"")&&v.data?null:"Informe integrante, data e hora (HH:MM).",
  cols:[[x=>f6Esc(xmColNome(x.col)),"Integrante"],[x=>brDate(x.data)+" "+f6Esc(x.hora),"Quando","n"],[x=>f6Esc(x.tipo||""),"Tipo"],[x=>XV_STAT(x),"Situação"]],
  extra:x=>xmAnexoBtn(x.id)+((x.status||"Aguardando")==="Aguardando"&&f4Gestor()?xmAcao(XMREG["ponto|esquecida"],x.id,"ok","Aprovar e lançar","")+xmAcao(XMREG["ponto|esquecida"],x.id,"no","Recusar"):""),
  acoes:{ok:x=>{const g=S.integrantes[x.col];if(!g||g.uid==null){toast("Este integrante não tem número no relógio (De-para).",true);return null}const ts=x.data+"T"+x.hora+":00",id="aj"+g.uid+"_"+ts.replace(/\D/g,"");put("marcacoes",id,{uid:g.uid,ts,origem:"ajuste",removida:false,motivo:"Batida esquecida: "+(x.mot||x.tipo||"")});return{status:"Aprovada",por:xvQuem(),em:xvHoje()}},no:x=>({status:"Recusada",por:xvQuem(),em:xvHoje()})}});
xmReg("ponto","esquecida","Ajustes e justificativas","Batida esquecida",xvBat,()=>{});
xmUrg(()=>podeVer("ponto")&&f4Gestor()?xvL("esquecida").filter(x=>(x.status||"Aguardando")==="Aguardando").slice(0,5).map(x=>({nivel:1,tipo:"Ponto",titulo:`Batida esquecida a aprovar: ${xmColNome(x.col)}`,detalhe:brDate(x.data)+" "+x.hora,quando:x.data,rota:"ponto"})):[]);
const xvHE=xmRegistro({mod:"ponto",key:"heaut",titulo:"Autorização prévia de horas extras",sub:"Hora extra só com autorização antes de acontecer. O quadro abaixo compara o que foi feito com o que foi autorizado.",novo:"Nova autorização",campos:[{k:"col",l:"Integrante",t:"select",opts:xmColOpts},{k:"data",l:"Data",t:"date",d:xvHoje},{k:"horas",l:"Horas autorizadas",t:"number"},{k:"mot",l:"Motivo"},{k:"aut",l:"Autorizado por",d:xvQuem}],ok:v=>v.col&&v.horas>0?null:"Informe integrante e horas.",cols:[[x=>f6Esc(xmColNome(x.col)),"Integrante"],[x=>brDate(x.data),"Data","n"],[x=>x.horas+" h","Horas","n"],[x=>f6Esc(x.mot||""),"Motivo"],[x=>f6Esc(x.aut||""),"Quem autorizou"]]});
xmReg("ponto","heaut","Horas e custo","Autorização e limite de horas extras",()=>{
  const ym=XM.sim.xvhem||xvHoje().slice(0,7),lim=xvC().heLim==null?20:xvC().heLim,F=xeFolhaHoras(ym),L=(F.L||[]).map(x=>{const aut=xvL("heaut").filter(a=>a.col===x.ig.id&&(a.data||"").slice(0,7)===ym).reduce((s,a)=>s+(+a.horas||0),0),h=x.ex/60;return{x,aut,h,st:h<=0?"—":aut<=0?"sem autorização":h>aut+0.01?"acima do autorizado":h>lim?"acima do limite mensal":"ok"}});
  return xvHE()+f6Card("Extras feitas × autorizadas",`Compara o resultado do cálculo de jornadas do mês com as autorizações acima. Limite mensal da casa: <input type="number" id="xvlim" value="${lim}" style="width:70px"> horas por pessoa (a casa define; a CLT limita 2 h por dia).`,
   `<div class="row" style="align-items:flex-end"><div><label>Mês</label><input type="month" id="xvhem" value="${ym}"></div></div>`+(F.erro?`<div class="err">${f6Esc(F.erro)}</div>`:"")+(L.length?f6Tbl(["Integrante","Extras feitas","Autorizadas","Situação"],[L.sort((a,b)=>b.h-a.h).map(r=>`<tr><td>${f6Esc(nomeInteg(r.x.ig))}</td><td class="n">${xeHM(r.x.ex)}</td><td class="n">${r.aut.toFixed(1).replace(".",",")} h</td><td>${r.st==="ok"||r.st==="—"?r.st:`<b style="color:var(--madeira)">${r.st}</b>`}</td></tr>`).join("")],"txt"):'<div class="empty">Calcule o ponto do mês para comparar.</div>'));
},()=>{const m=$("xvhem");if(m)m.onchange=()=>{XM.sim.xvhem=m.value;xmGo()};const l=$("xvlim");if(l)l.onchange=()=>xmsave("ponto",{heLim:Math.max(0,+l.value||0)})});
const xvAd=xmRegistro({mod:"ponto",key:"adicionais",titulo:"Adicionais por função (insalubridade e periculosidade)",sub:"Quem recebe adicional e em que percentual. Apoio para conferência com o contador.",novo:"Novo adicional",campos:[{k:"funcao",l:"Função / cargo"},{k:"tipo",l:"Adicional",t:"select",opts:["Insalubridade","Periculosidade","Noturno","Outro"]},{k:"perc",l:"Percentual (%)",t:"number"},{k:"base",l:"Base de cálculo",list:["Salário mínimo","Salário base","Outra"]},{k:"laudo",l:"Laudo / fundamento"}],ok:v=>v.funcao.trim()&&v.perc>=0?null:"Informe a função e o percentual.",cols:[[x=>f6Esc(x.funcao),"Função"],[x=>f6Esc(x.tipo),"Adicional"],[x=>x.perc+"%","%","n"],[x=>f6Esc(x.base||""),"Base"]]});
xmReg("ponto","adicionais","Horas e custo","Adicionais por função",xvAd,()=>{});
const xvJ=xmRegistro({mod:"ponto",key:"jornesp",titulo:"Jornadas especiais",sub:"Meio período, 4x2, 5x1, banda de horário flexível e outras jornadas fora do padrão, com quem as usa.",novo:"Nova jornada",campos:[{k:"nome",l:"Nome",list:["Meio período","4x2","5x1","Horário flexível","Jornada reduzida"]},{k:"horas",l:"Horas por dia",t:"number"},{k:"dias",l:"Dias por semana",t:"number"},{k:"banda",l:"Banda de entrada (ex.: 07:00–09:00)"},{k:"cols",l:"Quem usa (nomes)",t:"textarea"},{k:"obs",l:"Observações"}],ok:v=>v.nome.trim()?null:"Dê um nome à jornada.",cols:[[x=>f6Esc(x.nome),"Jornada"],[x=>(x.horas||"—")+" h × "+(x.dias||"—")+" d","Carga"],[x=>f6Esc(x.banda||""),"Banda"],[x=>f6Esc(x.cols||""),"Quem usa"]]});
xmReg("ponto","jornesp","Ajustes e justificativas","Jornadas especiais",xvJ,()=>{});
const XV_LEG={"Casamento":3,"Falecimento de familiar":2,"Nascimento de filho (licença-paternidade)":5,"Doação de sangue":1,"Prova de vestibular":1,"Acompanhar filho até 6 anos ao médico":1,"Acompanhar consulta/exame de familiar":0,"Outra":0};
const xvLeg=xmRegistro({mod:"ponto",key:"legais",titulo:"Faltas legais com comprovante",sub:"Casamento, luto, nascimento, doação de sangue, vestibular e outras ausências previstas em lei. Os dias sugeridos seguem a CLT (art. 473) e podem ser maiores por convenção coletiva: confirme com o contador.",novo:"Nova ausência legal",campos:[{k:"col",l:"Integrante",t:"select",opts:xmColOpts},{k:"tipo",l:"Motivo",t:"select",opts:Object.keys(XV_LEG)},{k:"ini",l:"A partir de",t:"date",d:xvHoje},{k:"dias",l:"Dias",t:"number"},{k:"obs",l:"Observações"}],ok:v=>v.col&&v.dias>0?null:"Informe integrante e dias.",
  rodape:()=>`<p class="sub">Dias sugeridos: ${Object.entries(XV_LEG).filter(([,d])=>d).map(([k,d])=>f6Esc(k)+" "+d).join("; ")}.</p>`,cols:[[x=>f6Esc(xmColNome(x.col)),"Integrante"],[x=>f6Esc(x.tipo),"Motivo"],[x=>brDate(x.ini)+" ("+x.dias+" d)","Período","n"]],extra:x=>xmAnexoBtn(x.id)});
xmReg("ponto","legais","Ajustes e justificativas","Faltas legais (casamento, luto, doação…)",xvLeg,()=>{});
const xvAH=xmRegistro({mod:"ponto",key:"atesthoras",titulo:"Atestado em horas (comparecimento)",sub:"Declaração de comparecimento a consulta ou exame, abonando só as horas fora do trabalho.",novo:"Novo atestado em horas",campos:[{k:"col",l:"Integrante",t:"select",opts:xmColOpts},{k:"data",l:"Data",t:"date",d:xvHoje},{k:"de",l:"Das (HH:MM)"},{k:"ate",l:"Às (HH:MM)"},{k:"obs",l:"Observações"}],ok:v=>v.col&&/^\d{2}:\d{2}$/.test(v.de||"")&&/^\d{2}:\d{2}$/.test(v.ate||"")?null:"Informe integrante e horário (HH:MM).",cols:[[x=>f6Esc(xmColNome(x.col)),"Integrante"],[x=>brDate(x.data),"Data","n"],[x=>f6Esc(x.de)+"–"+f6Esc(x.ate),"Horas","n"]],extra:x=>xmAnexoBtn(x.id)});
xmReg("ponto","atesthoras","Ajustes e justificativas","Atestado em horas",xvAH,()=>{});
const xvNiv=xmRegistro({mod:"ponto",key:"folganiver",titulo:"Folga de aniversário (opcional)",sub:"Registro das folgas de aniversário concedidas pela casa, uma por integrante por ano.",novo:"Registrar folga",campos:[{k:"col",l:"Integrante",t:"select",opts:xmColOpts},{k:"data",l:"Data da folga",t:"date",d:xvHoje},{k:"obs",l:"Observações"}],ok:v=>v.col&&v.data?null:"Informe integrante e data.",cols:[[x=>f6Esc(xmColNome(x.col)),"Integrante"],[x=>brDate(x.data),"Folga","n"]]});
xmReg("ponto","folganiver","Ajustes e justificativas","Folga de aniversário",()=>{const ano=xvHoje().slice(0,4),tem=new Set(xvL("folganiver").filter(x=>(x.data||"").startsWith(ano)).map(x=>x.col)),sem=xvAtivos().filter(i=>!tem.has(i.id));return xvNiv()+f6Card("Ainda sem folga de aniversário em "+ano,"",sem.length?`<p>${sem.map(i=>f6Esc(nomeInteg(i))).join(", ")}</p>`:'<div class="empty">Todos já usaram.</div>')},()=>{});
const xvAp=xmRegistro({mod:"ponto",key:"aprovsetor",titulo:"Aprovação do ponto pelo gestor do setor",sub:"Antes do fechamento geral, cada gestor de setor confere o ponto da sua equipe e aprova.",novo:"Registrar aprovação",campos:[{k:"setor",l:"Setor",list:xvDepts},{k:"comp",l:"Competência (AAAA-MM)",d:()=>xvHoje().slice(0,7)},{k:"por",l:"Aprovado por",d:xvQuem},{k:"data",l:"Data",t:"date",d:xvHoje},{k:"obs",l:"Observações"}],ok:v=>v.setor.trim()&&/^\d{4}-\d{2}$/.test(v.comp)?null:"Informe setor e competência (AAAA-MM).",cols:[[x=>f6Esc(x.setor),"Setor"],[x=>x.comp.slice(5)+"/"+x.comp.slice(0,4),"Competência","n"],[x=>f6Esc(x.por||""),"Aprovado por"],[x=>brDate(x.data),"Em","n"]]});
xmReg("ponto","aprovsetor","Espelho e consulta","Aprovação do ponto por setor",()=>{const ym=xvHoje().slice(0,7),ap=new Set(xvL("aprovsetor").filter(a=>a.comp===ym).map(a=>a.setor));return xvAp()+f6Card("Setores em "+ym.slice(5)+"/"+ym.slice(0,4),"",f6Tbl(["Setor","Pessoas","Situação"],[xvDepts().map(s=>`<tr><td>${f6Esc(s)}</td><td class="n">${integList().filter(i=>(i.depto||i.cargo||"Outro")===s).length}</td><td>${ap.has(s)?"aprovado":'<b style="color:var(--madeira)">pendente</b>'}</td></tr>`).join("")],"txt"))},()=>{});
