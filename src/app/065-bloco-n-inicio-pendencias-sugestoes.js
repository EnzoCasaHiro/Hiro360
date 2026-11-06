/* ===== Bloco N: início, pendências, sugestões e avisos (itens 401–419) ===== */
const xwC=()=>xmcfg("home");
const xwL=k=>xwC()[k]||[];
const xwHoje=()=>hojeIso();
const xwQuem=()=>(typeof f4Quem==="function"&&f4Quem())||"";
const xwUid=()=>ACC.uid||"_";
const xwPerfil=()=>{try{return(S.acessos[ACC.uid]||{}).perfil||(ACC.gestor?"gestor":"")}catch(e){return""}};
/* --- resumo do dia (402) --- */
function xwResumoDados(){
  const h=xwHoje(),plantao=[],nasc=[];
  integList().filter(i=>!semPonto(i)&&(i.situacao||"Ativo")!=="Desligado").forEach(i=>{try{const e=escalaDia(i,h);if(e&&e.on)plantao.push(nomeInteg(i)+(e.turno?" ("+e.turno+")":""))}catch(x){}});
  const md=h.slice(5);integList().forEach(i=>{if(i.nascimento&&i.nascimento.slice(5)===md)nasc.push(nomeInteg(i)+" (integrante)")});resAll().filter(resAtivo).forEach(r=>{if(r.nasc&&r.nasc.slice(5)===md)nasc.push(resNome(r)+" (residente)")});
  const venc=typeof xjVencimentos==="function"&&podeVer("docs")?xjVencimentos(addDaysIso(h,1)).filter(x=>x.d>=h||x.d<h).filter(x=>x.d<=addDaysIso(h,1)&&x.d>=addDaysIso(h,-30)).slice(0,8):[];
  const tar=tarAll().filter(t=>t.status!=="feita"&&t.data===h),cons=typeof xpL==="function"&&podeVer("pres")?xpL("consultas").filter(c=>c.data===h&&(c.status||"Agendada")==="Agendada"):[];
  return{plantao,nasc,venc,tar,cons};
}
function xwResumoHtml(){
  const d=xwResumoDados(),li=a=>a.length?"<ul style='margin:4px 0 8px 18px'>"+a.map(x=>`<li>${f6Esc(x)}</li>`).join("")+"</ul>":'<div class="sub">Nada por aqui hoje.</div>';
  return `<div class="card" data-xwbloco="Resumo do dia"><h2>Resumo de hoje</h2><div class="grid g2"><div><b>Quem está de plantão (${d.plantao.length})</b>${li(d.plantao)}<b>Aniversários</b>${li(d.nasc)}</div><div><b>Tarefas de hoje (${d.tar.length})</b>${li(d.tar.map(t=>(t.hora?t.hora+" ":"")+t.titulo))}<b>Consultas</b>${li(d.cons.map(c=>(c.hora||"")+" "+c.esp+" — "+xmResNome(c.res)))}<b>Vencimentos (até amanhã e recentes)</b>${li(d.venc.map(v=>brDate(v.d)+" "+v.t))}</div></div></div>`;
}
xmReg("home","resumo","Avisos","Resumo do dia",()=>xwResumoHtml(),()=>{});
/* --- tela inicial por perfil e atalhos (401, 419) --- */
const XN_BLOCOS=["Resumo do dia","Atalhos","Fluxo de caixa","A semana em um relance","Para acompanhar","Atenção neste período","Mural de comunicados"];
const xwCfgPerfil=p=>((xwC().inicio||{})[p||"_"])||((xwC().inicio||{})["_"])||{ocultos:[],atalhos:[]};
function xwAtalhosHtml(){
  const c=xwCfgPerfil(xwPerfil()),A=(c.atalhos||[]).filter(a=>podeVer(a.rota));
  if((c.ocultos||[]).includes("Atalhos")||!A.length)return"";
  return `<div class="card" data-xwbloco="Atalhos"><h2>Atalhos</h2><div class="row" style="flex-wrap:wrap">${A.map((a,i)=>`<button class="b sec" data-xwat="${i}" style="flex:none">${f6Esc(a.nome)}</button>`).join("")}</div></div>`;
}
const _pgHomeN=pgHome;
pgHome=function(){
  let html=_pgHomeN.apply(this,arguments);const c=xwCfgPerfil(xwPerfil()),oc=c.ocultos||[];
  const box=document.createElement("div");box.innerHTML=html;
  [...box.children].forEach(el=>{if(!el.classList.contains("card"))return;const h=(el.querySelector("h2")||{}).textContent||"";if(oc.some(b=>b!=="Resumo do dia"&&b!=="Atalhos"&&h.includes(b)))el.remove()});
  const tabs=box.querySelector(".tabs"),ins=(oc.includes("Resumo do dia")?"":xwResumoHtml())+xwAtalhosHtml();
  if(tabs)tabs.insertAdjacentHTML("beforebegin",ins);else box.insertAdjacentHTML("beforeend",ins);
  return box.innerHTML;
};
const _bdHomeN=bindHome;
bindHome=function(){_bdHomeN.apply(this,arguments);document.querySelectorAll("[data-xwat]").forEach(b=>b.onclick=()=>{const a=((xwCfgPerfil(xwPerfil()).atalhos)||[]).filter(x=>podeVer(x.rota))[+b.dataset.xwat];if(!a)return;if(a.sec)XM.sec[a.rota]=a.sec;go(a.rota)})};
xmReg("home","inicio","Personalizar","Tela inicial e atalhos",()=>{
  const PF=perfis(),ids=Object.keys(PF),sel=XM.sim.xwpf||xwPerfil()||"_",c=xwCfgPerfil(sel);
  const opts=[["_","Padrão (todos)"],["gestor","Gestor / administração"],...ids.map(i=>[i,(PF[i]||{}).nome||i])];
  const secs=Object.entries(XMSECS).flatMap(([r,l])=>l.map(s=>({rota:r,sec:s.k,nome:(MOD_NOME[r]||r)+" → "+s.l})));
  return f6Card("Tela inicial por perfil","Escolha o que cada perfil vê na Visão geral. As mudanças valem para quem usa o perfil escolhido.",`<div class="row" style="align-items:flex-end"><div><label>Perfil</label><select id="xwpf">${opts.map(([v,l])=>`<option value="${v}" ${v===sel?"selected":""}>${f6Esc(l)}</option>`).join("")}</select></div></div><div style="margin:8px 0"><b>Mostrar na Visão geral</b><br>${XN_BLOCOS.map(b=>`<label style="display:inline-block;margin-right:14px;font-weight:400"><input type="checkbox" data-xwbl="${b}" ${(c.ocultos||[]).includes(b)?"":"checked"}> ${b}</label>`).join("")}</div><button class="b sm" id="xwps">Salvar</button>`)+
  f6Card("Atalhos rápidos","Botões no topo da Visão geral para este perfil.",`<div class="row" style="align-items:flex-end"><div style="flex:1"><label>Adicionar atalho</label><select id="xwatsel"><option value="">Escolha…</option>${PAGES.filter(p=>p[0]!=="home").map(p=>`<option value="${p[0]}|">${f6Esc(p[1])}</option>`).join("")}${secs.map(s=>`<option value="${s.rota}|${s.sec}">${f6Esc(s.nome)}</option>`).join("")}</select></div><button class="b sec sm" id="xwata">Adicionar</button></div>${(c.atalhos||[]).map((a,i)=>`<span class="pill" style="margin:4px">${f6Esc(a.nome)} <a href="#" data-xwatx="${i}">×</a></span>`).join("")||'<div class="sub">Nenhum atalho.</div>'}`);
},()=>{
  const sel=()=>$("xwpf").value,save=fn=>{const all={...(xwC().inicio||{})},c={...xwCfgPerfil(sel())};fn(c);all[sel()]=c;xmsave("home",{inicio:all});setTimeout(xmGo,250)};
  $("xwpf").onchange=()=>{XM.sim.xwpf=sel();xmGo()};
  $("xwps").onclick=()=>save(c=>{c.ocultos=[...document.querySelectorAll("[data-xwbl]")].filter(x=>!x.checked).map(x=>x.dataset.xwbl);toast("Salvo.")});
  $("xwata").onclick=()=>{const v=$("xwatsel").value;if(!v)return;const[rota,sec]=v.split("|"),nome=$("xwatsel").selectedOptions[0].textContent;save(c=>{c.atalhos=[...(c.atalhos||[]),{rota,sec,nome}]})};
  document.querySelectorAll("[data-xwatx]").forEach(a=>a.onclick=e=>{e.preventDefault();save(c=>{c.atalhos=(c.atalhos||[]).filter((_,i)=>i!==+a.dataset.xwatx)})})});
/* --- central de notificações, silenciar, preferências (403, 412, 413) --- */
const xwKey=u=>u.tipo+"|"+u.titulo;
const xwPref=()=>((xwC().pref||{})[xwUid()])||{tiposOff:[],nivelMin:1};
function xwLista(){
  const U=xwUid(),pref=xwPref(),sil=((xwC().silencio||{})[U])||{},lid=((xwC().lidas||{})[U])||{},h=xwHoje();
  return urgencias("mes").filter(u=>u.nivel>=(pref.nivelMin||1)&&!(pref.tiposOff||[]).includes(u.tipo)).map(u=>({...u,k:xwKey(u),sil:sil[xwKey(u)]&&sil[xwKey(u)]>=h?sil[xwKey(u)]:null,lida:!!lid[xwKey(u)]})).sort((a,b)=>b.nivel-a.nivel);
}
function xwSet(campo,fn){const U=xwUid(),all={...(xwC()[campo]||{})};all[U]=fn({...(all[U]||{})});xmsave("home",{[campo]:all})}
xmReg("home","notif","Avisos","Central de notificações",()=>{
  const L=xwLista(),vis=L.filter(x=>!x.sil),novas=vis.filter(x=>!x.lida).length,tipos=[...new Set(urgencias("mes").map(u=>u.tipo))].sort(),pref=xwPref();
  return f6Card("Notificações",`${novas} nova(s) · ${L.length-vis.length} silenciada(s). Os avisos vêm das pendências de todas as telas que o seu perfil acessa.`,
   (vis.length?vis.slice(0,80).map((u,i)=>`<div style="padding:8px 0;border-bottom:1px solid #eee;${u.lida?"opacity:.6":""}"><span class="pill ${["","s-ok","s-pendencia","s-urgente"][u.nivel]||""}">${f6Esc(u.tipo)}</span> <b>${f6Esc(u.titulo)}</b><div class="sub">${f6Esc(u.detalhe||"")}${u.quando?" · "+brDate(u.quando):""}</div><div class="row" style="margin-top:4px">${u.lida?"":`<button class="b sec sm" data-xwl="${f6Esc(u.k)}">Marcar como lida</button>`}<button class="b sec sm" data-xws="${f6Esc(u.k)}|1">Silenciar 1 dia</button><button class="b sec sm" data-xws="${f6Esc(u.k)}|7">7 dias</button><button class="b sec sm" data-xws="${f6Esc(u.k)}|30">30 dias</button></div></div>`).join(""):'<div class="empty">Nada pendente.</div>')+(L.length-vis.length?`<h4 style="margin-top:12px">Silenciadas</h4>${L.filter(x=>x.sil).map(u=>`<div class="sub">${f6Esc(u.titulo)} — até ${brDate(u.sil)} <a href="#" data-xwr="${f6Esc(u.k)}">reativar</a></div>`).join("")}`:""))+
  f6Card("Minhas preferências","Valem só para você neste aparelho/conta.",`<div class="row" style="align-items:flex-end"><div><label>Mostrar a partir de</label><select id="xwnv"><option value="1" ${pref.nivelMin<=1?"selected":""}>Tudo (acompanhar)</option><option value="2" ${pref.nivelMin===2?"selected":""}>Atenção e urgentes</option><option value="3" ${pref.nivelMin===3?"selected":""}>Só urgentes</option></select></div></div><div style="margin:8px 0">${tipos.map(t=>`<label style="display:inline-block;margin-right:12px;font-weight:400"><input type="checkbox" data-xwt="${f6Esc(t)}" ${(pref.tiposOff||[]).includes(t)?"":"checked"}> ${f6Esc(t)}</label>`).join("")}</div><button class="b sm" id="xwpv">Salvar preferências</button> <button class="b sec sm" id="xwpush">Ativar avisos do navegador</button><p class="sub">Os avisos do navegador (pop-up) só aparecem enquanto o sistema estiver aberto. Não há notificação push com o sistema fechado.</p>`);
},()=>{
  document.querySelectorAll("[data-xwl]").forEach(b=>b.onclick=()=>{xwSet("lidas",o=>({...o,[b.dataset.xwl]:xwHoje()}));setTimeout(xmGo,250)});
  document.querySelectorAll("[data-xws]").forEach(b=>b.onclick=()=>{const q=b.dataset.xws,i=q.lastIndexOf("|"),k=q.slice(0,i),d=q.slice(i+1);xwSet("silencio",o=>({...o,[k]:addDaysIso(xwHoje(),+d)}));setTimeout(xmGo,250)});
  document.querySelectorAll("[data-xwr]").forEach(a=>a.onclick=e=>{e.preventDefault();xwSet("silencio",o=>{const n={...o};delete n[a.dataset.xwr];return n});setTimeout(xmGo,250)});
  const pv=$("xwpv");if(pv)pv.onclick=()=>{xwSet("pref",()=>({nivelMin:+$("xwnv").value,tiposOff:[...document.querySelectorAll("[data-xwt]")].filter(x=>!x.checked).map(x=>x.dataset.xwt)}));toast("Preferências salvas.");setTimeout(xmGo,250)};
  const pu=$("xwpush");if(pu)pu.onclick=async()=>{if(typeof Notification==="undefined")return toast("Este navegador não oferece notificações.",true);toast((await Notification.requestPermission())==="granted"?"Avisos ativados.":"Avisos não liberados.")}});
const XN_AVISADOS=new Set();
function xwChecaUrgentes(){try{if(typeof Notification==="undefined"||Notification.permission!=="granted"||estadoAcesso()!=="ok")return;xwLista().filter(u=>u.nivel===3&&!u.sil&&!u.lida).slice(0,3).forEach(u=>{const k=xwHoje()+u.k;if(XN_AVISADOS.has(k))return;XN_AVISADOS.add(k);new Notification("Casa Hiro — urgente",{body:u.titulo})})}catch(e){}}
if(typeof window!=="undefined"&&!window.__xnTimer)window.__xnTimer=setInterval(xwChecaUrgentes,180000);
/* --- resumo por WhatsApp / e-mail e resumo semanal (405, 406, 407) --- */
function xwTextoResumo(sem){
  const h=xwHoje(),U=urgencias(sem?"semana":"hoje").filter(u=>u.nivel>=2).slice(0,15),d=xwResumoDados(),fim=addDaysIso(h,7),T=sem?tarAll().filter(t=>t.status!=="feita"&&t.data>=h&&t.data<=fim):d.tar;
  return `*${empresa().razao||"Casa Hiro"} — ${sem?"resumo da semana":"resumo de hoje"} (${brDate(h)})*\n\nAvisos importantes (${U.length}):\n${U.map(u=>"• "+u.titulo).join("\n")||"• nenhum"}\n\nTarefas (${T.length}):\n${T.slice(0,15).map(t=>"• "+(sem?brDate(t.data)+" ":"")+t.titulo).join("\n")||"• nenhuma"}`+(sem?"":`\n\nDe plantão: ${d.plantao.join(", ")||"—"}`);
}
const xwCont=xmRegistro({mod:"home",key:"contatos",titulo:"Quem recebe o resumo",sub:"Gestores que recebem o resumo. O envio abre o WhatsApp ou o e-mail do seu aparelho com a mensagem pronta; você toca em enviar. Não há envio automático.",novo:"Novo destinatário",campos:[{k:"nome",l:"Nome"},{k:"tel",l:"WhatsApp (com DDD)"},{k:"email",l:"E-mail"}],ok:v=>v.nome.trim()&&(v.tel||v.email)?null:"Informe o nome e o telefone ou e-mail.",cols:[[x=>f6Esc(x.nome),"Nome"],[x=>f6Esc(x.tel||""),"WhatsApp"],[x=>f6Esc(x.email||""),"E-mail"]],extra:x=>`${x.tel?`<button class="b sec sm" data-xwwa="${x.id}">Enviar resumo (WhatsApp)</button> `:""}${x.email?`<button class="b sec sm" data-xwem="${x.id}">E-mail</button> `:""}`});
xmReg("home","envio","Avisos","Resumo por WhatsApp e e-mail",()=>xwCont()+f6Card("Resumo","",`<label style="font-weight:400"><input type="radio" name="xwper" value="hoje" checked> Hoje</label> <label style="font-weight:400;margin-left:12px"><input type="radio" name="xwper" value="sem"> Semana</label><pre id="xwprev" style="white-space:pre-wrap;background:#fafafa;padding:8px;border:1px solid #ddd;margin-top:8px">${f6Esc(xwTextoResumo(false))}</pre><button class="b sm" id="xwsem">Criar lembrete semanal na agenda</button>`),()=>{
  const sem=()=>(document.querySelector("[name=xwper]:checked")||{}).value==="sem";
  document.querySelectorAll("[name=xwper]").forEach(r=>r.onchange=()=>{$("xwprev").textContent=xwTextoResumo(sem())});
  document.querySelectorAll("[data-xwwa]").forEach(b=>b.onclick=()=>{const c=xwL("contatos").find(x=>x.id===b.dataset.xwwa),t=String(c.tel).replace(/\D/g,"");window.open("https://wa.me/"+(t.length<=11?"55":"")+t+"?text="+encodeURIComponent(xwTextoResumo(sem())),"_blank")});
  document.querySelectorAll("[data-xwem]").forEach(b=>b.onclick=()=>{const c=xwL("contatos").find(x=>x.id===b.dataset.xwem);window.open("mailto:"+c.email+"?subject="+encodeURIComponent("Resumo Casa Hiro")+"&body="+encodeURIComponent(xwTextoResumo(sem()).replace(/\*/g,"")),"_blank")});
  const s=$("xwsem");if(s)s.onclick=()=>{if(!podeEd("agenda"))return toast("Sem permissão na agenda.");const g=uid8(),n=[];let d=addDaysIso(xwHoje(),1);while(pyWeekday(d)!==0)d=addDaysIso(d,1);for(let k=0;k<12;k++)n.push({id:uid8(),titulo:"Enviar o resumo semanal aos gestores",desc:"Visão geral → Resumo por WhatsApp e e-mail",prio:"normal",resp:"",area:"Administrativo",status:"aberta",feitaEm:null,data:addDaysIso(d,7*k),grupo:g});tarMutate(a=>[...a,...n]);toast("12 lembretes semanais criados (segundas-feiras).")}});
/* --- pendências por responsável, escalonamento, resolver com comentário (408–411) --- */
const xwEscDias=()=>+(xwC().escDias||3);
const xwEscal=()=>tarAll().filter(t=>t.status!=="feita"&&t.data&&daysBetweenIso(t.data,xwHoje())>=xwEscDias());
xmReg("home","resp","Pendências","Pendências por responsável",()=>{
  const A=tarAll().filter(t=>t.status!=="feita"),por={};A.forEach(t=>{const k=nomeDe(t.resp)||"(sem responsável)";(por[k]=por[k]||[]).push(t)});
  return f6Card("Escalonamento",`Tarefas atrasadas há ${xwEscDias()} dia(s) ou mais aparecem como urgentes na Visão geral para a gestão acompanhar.`,`<div class="row" style="align-items:flex-end"><div><label>Escalar após quantos dias de atraso</label><input type="number" id="xwed" value="${xwEscDias()}" min="1" style="width:90px"></div><button class="b sec sm" id="xweds">Salvar</button></div><p class="sub">${xwEscal().length} tarefa(s) escalonada(s) agora.</p>`)+
  f6Card("Tarefas abertas por pessoa","Marque como resolvida com um comentário do que foi feito.",Object.keys(por).length?Object.entries(por).sort((a,b)=>b[1].length-a[1].length).map(([k,l])=>`<h4 style="margin:10px 0 4px">${f6Esc(k)} <span class="sub">${l.length} aberta(s), ${l.filter(tarAtrasada).length} atrasada(s)</span></h4>`+f6Tbl(["Prazo","Tarefa","Prioridade",""],[l.sort((a,b)=>a.data.localeCompare(b.data)).map(t=>`<tr><td class="n">${tarAtrasada(t)?'<b style="color:#c62828">'+brDate(t.data)+"</b>":brDate(t.data)}</td><td>${f6Esc(t.titulo)}</td><td>${f6Esc(t.prio||"")}</td><td>${podeEd("agenda")?`<button class="b sec sm" data-xwrs="${t.id}">Resolver…</button>`:""}</td></tr>`).join("")],"txt")).join(""):'<div class="empty">Nenhuma tarefa aberta.</div>');
},()=>{
  const b=$("xweds");if(b)b.onclick=()=>{xmsave("home",{escDias:Math.max(1,+$("xwed").value||3)});setTimeout(xmGo,250)};
  document.querySelectorAll("[data-xwrs]").forEach(x=>x.onclick=()=>f6Form("Resolver tarefa",[{k:"com",l:"O que foi feito? (comentário)",t:"textarea"}],v=>{const id=x.dataset.xwrs;tarMutate(a=>a.map(t=>t.id===id?{...t,status:"feita",feitaEm:xwHoje()}:t));if(typeof xjDetSave==="function"&&v.com.trim()){const d=xjDet(id);xjDetSave(id,{coms:[...(d.coms||[]),{t:"Resolvida: "+v.com.trim(),por:xwQuem(),em:new Date().toISOString()}]})}setTimeout(xmGo,400);return null},{ok:"Marcar como resolvida"}))});
xmUrg(()=>podeVer("home")||podeVer("agenda")?xwEscal().slice(0,10).map(t=>({nivel:3,tipo:"Escalonada",titulo:`Tarefa atrasada há ${daysBetweenIso(t.data,xwHoje())} dia(s): ${t.titulo}`,detalhe:nomeDe(t.resp)||"sem responsável",quando:t.data,rota:"agenda"})):[]);
/* --- sugestões com votação (414–416) e caixa anônima (417) --- */
const xwSug=xmRegistro({mod:"home",key:"sugestoes",titulo:"Sugestões",sub:"Ideias para melhorar a casa. Cada pessoa apoia uma vez; a direção responde e atualiza a situação.",novo:"Nova sugestão",campos:[{k:"texto",l:"Sua sugestão",t:"textarea"},{k:"area",l:"Área",list:["Cuidados","Cozinha","Limpeza","Administrativo","Estrutura","Equipe","Outro"]},{k:"status",l:"Situação",t:"select",opts:["Nova","Analisando","Em andamento","Feita","Não será feita"]},{k:"resposta",l:"Resposta da direção",t:"textarea"}],ok:v=>v.texto.trim()?null:"Escreva a sugestão.",
  cols:[[x=>`<b>${(x.votos||[]).length}</b>`,"Apoios","n"],[x=>f6Esc(x.texto),"Sugestão"],[x=>`<span class="pill">${f6Esc(x.status||"Nova")}</span>`,"Situação"],[x=>f6Esc(x.resposta||""),"Resposta"]],extra:x=>`<button class="b sec sm" data-xwvt="${x.id}">${(x.votos||[]).includes(xwUid())?"Retirar apoio":"Apoiar"}</button> `});
xmReg("home","sugestoes","Participação","Sugestões e votação",xwSug,()=>{document.querySelectorAll("[data-xwvt]").forEach(b=>b.onclick=()=>{const u=xwUid();xmsave("home",{sugestoes:xwL("sugestoes").map(s=>s.id===b.dataset.xwvt?{...s,votos:(s.votos||[]).includes(u)?(s.votos||[]).filter(v=>v!==u):[...(s.votos||[]),u]}:s)});setTimeout(xmGo,250)})});
const xwAnon=xmRegistro({mod:"home",key:"anonimas",anon:true,titulo:"Caixa de reclamações anônima",sub:"Este formulário não grava o nome de quem escreveu. Quem lê as mensagens são os usuários com acesso a esta tela. A plataforma onde o sistema roda pode manter registros técnicos próprios de acesso, fora do controle deste sistema.",novo:"Registrar mensagem anônima",campos:[{k:"tipo",l:"Tipo",t:"select",opts:["Reclamação","Elogio","Denúncia","Sugestão"]},{k:"texto",l:"Mensagem",t:"textarea"},{k:"status",l:"Situação",t:"select",opts:["Recebida","Em análise","Resolvida"]},{k:"resposta",l:"Providência da direção (visível no mural interno)",t:"textarea"}],ok:v=>v.texto.trim()?null:"Escreva a mensagem.",cols:[[x=>x.em?brDate(x.em):"","Data","n"],[x=>f6Esc(x.tipo),"Tipo"],[x=>f6Esc(x.texto),"Mensagem"],[x=>f6Esc(x.status||"Recebida"),"Situação"],[x=>f6Esc(x.resposta||""),"Providência"]]});
xmReg("home","anonimas","Participação","Caixa anônima",xwAnon,()=>{});


/* >>> x_m15.js */
