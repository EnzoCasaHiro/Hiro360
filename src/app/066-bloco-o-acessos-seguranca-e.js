/* ===== Bloco O: acessos, segurança e LGPD (itens 421–455) ===== */
const xoC=()=>xmcfg("acesso");
const xoL=k=>xoC()[k]||[];
const xoHoje=()=>hojeIso();
const xoQuem=()=>(typeof f4Quem==="function"&&f4Quem())||"";
const xoPid=()=>{try{return(S.acessos[ACC.uid]||{}).perfil||""}catch(e){return""}};
Object.assign(AUD_ROT,{visu:"Abriu prontuário",export:"Exportou arquivo",impr:"Imprimiu",disp:"Dispositivo",termos:"Aceitou os termos de uso",consent:"Consulta a dados de titular"});
/* --- simulação de perfil para teste (455) --- */
const XO={ver:null};
const _nvO=nv;
nv=function(m){if(XO.ver){if(m==="acesso")return 2;return+((XO.ver.mods||{})[m])||0}return _nvO(m)};
const _perfAtO=perfilAtual;
perfilAtual=function(){return XO.ver||_perfAtO()};
function xoBarra(){let b=document.getElementById("xosimbar");if(!XO.ver){if(b)b.remove();return}if(!b){b=document.createElement("div");b.id="xosimbar";b.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7a3b00;color:#fff;padding:8px 12px;display:flex;gap:10px;align-items:center;justify-content:center;font-size:14px";document.body.appendChild(b)}b.innerHTML=`Simulando o perfil <b>${f6Esc(XO.ver.nome)}</b> (só visualização para teste). <button class="b sm" id="xosimx" style="background:#fff;color:#7a3b00">Sair da simulação</button>`;b.querySelector("#xosimx").onclick=()=>{XO.ver=null;xoBarra();go("acesso")}}
/* --- ações sensíveis por perfil: exportar, excluir, imprimir (421, 434, 447) --- */
const xoAcoes=pid=>((xoC().acoes||{})[pid])||{};
const xoPode=ac=>{if(!RT.db||ACC.gestor&&!XO.ver)return true;const a=xoAcoes(XO.ver?XO.ver.id:xoPid());return a[ac]!==false};
const _sfO=saveFile;
saveFile=async function(nome){if(!xoPode("exportar")){audit("negado","exportar "+nome);toast("Seu perfil não permite baixar arquivos.",true);return false}audit("export",nome);return _sfO.apply(this,arguments)};
const _delO=del;
del=function(col,id){if(!xoPode("excluir")&&!["hist"].includes(col)){negado("excluir em "+col);return}return _delO.apply(this,arguments)};
/* --- impressão: bloqueio, registro e marca d'água (447, 448) --- */
const _xpO=xmPrint;
xmPrint=function(titulo,html){
  if(!xoPode("imprimir")){audit("negado","imprimir "+titulo);toast("Seu perfil não permite imprimir.",true);return null}
  audit("impr",titulo);
  const wm=xoC().marcaDagua?`<div class="xowm" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:.12;font-size:42px;font-weight:700;transform:rotate(-30deg);text-align:center;z-index:1">CONFIDENCIAL<br><span style="font-size:18px">${f6Esc(xoQuem()||"uso interno")} · ${brDate(xoHoje())}</span></div>`:"";
  return _xpO.call(this,titulo,wm+html);
};
/* --- horário de acesso por perfil (423) --- */
function xoFora(){
  if(!RT.db||(ACC.gestor&&!XO.ver))return null;const pid=XO.ver?XO.ver.id:xoPid(),h=((xoC().horario||{})[pid]);if(!h||!h.ini||!h.fim)return null;
  const d=new Date(),min=d.getHours()*60+d.getMinutes(),[a,b]=h.ini.split(":"),[c,e]=h.fim.split(":"),ini=+a*60+ +b,fim=+c*60+ +e,dia=d.getDay(),dias=h.dias||[0,1,2,3,4,5,6];
  const dentro=ini<=fim?(min>=ini&&min<=fim):(min>=ini||min<=fim);
  return dentro&&dias.includes(dia)?null:`Seu perfil acessa o sistema entre ${h.ini} e ${h.fim}${h.dias&&h.dias.length<7?" nos dias permitidos":""}.`;
}
const _goO=go;
go=function(r,keep){const f=xoFora();if(f){ROUTE=r;$("view").innerHTML=banner("","Fora do horário de acesso",f+" Fale com a direção se precisar entrar agora.","key");return}return _goO.call(this,r,keep)};
/* --- acesso com validade (452) e vínculo com integrante (451) --- */
const _estO=estadoAcesso;
estadoAcesso=function(){const s=_estO();if(s!=="ok"||!RT.db||ACC.gestor)return s;const r=S.acessos[ACC.uid];return r&&r.ate&&r.ate<xoHoje()?"suspenso":s};
function xoAutoSuspende(){
  if(!ACC.gestor||!RT.db)return;const vinc=xoC().vinculos||{},h=xoHoje();let n=0;
  Object.entries(vinc).forEach(([uid,ig])=>{const i=S.integrantes[ig],r=S.acessos[uid];if(i&&r&&r.ativo!==false&&((i.situacao==="Desligado")||(i.desligamento&&i.desligamento<=h))){put("acessos",uid,{...strip(r),ativo:false,obs:r.obs});n++}});
  if(n)toast(n+" acesso(s) de integrante desligado foram suspensos.");
}
/* --- registros: dispositivo, prontuário, entrada --- */
const _regO=registrarEntrada;
registrarEntrada=function(){const antes=_entrou;_regO.apply(this,arguments);if(!antes&&_entrou){try{audit("disp",(navigator.userAgent||"").replace(/\s+/g," ").slice(0,110)+" | "+(Intl.DateTimeFormat().resolvedOptions().timeZone||""))}catch(e){}xoAutoSuspende()}};
const _orO=openResidente;
openResidente=function(id){try{if(id)audit("visu",resNome(resAll().find(r=>r.id===id)||{}))}catch(e){}return _orO.apply(this,arguments)};
let _xoUlt="";
const _goO2=go;
go=function(r,keep){const out=_goO2.apply(this,arguments);try{if(r==="pres"&&PRES.sel){const k=PRES.sel+xoHoje()+(ACC.uid||"");if(k!==_xoUlt){_xoUlt=k;audit("visu",resNome(resAll().find(x=>x.id===PRES.sel)||{}))}}xoBarra()}catch(e){}return out};
/* --- guias do painel de acesso --- */
xmReg("acesso","acoes","Perfis e controles","Ações sensíveis e horário por perfil",()=>{
  const P=perfis(),A=xoC().acoes||{},H=xoC().horario||{};
  return f6Card("Ações sensíveis por perfil","Além de ver/editar cada tela, defina se o perfil pode baixar arquivos, excluir registros e imprimir. Vale para quem não é administrador. Tudo fica no registro de acessos.",f6Tbl(["Perfil","Baixar arquivos","Excluir","Imprimir","Horário permitido"],[Object.entries(P).map(([id,p])=>{const a=A[id]||{},h=H[id]||{};return`<tr><td>${f6Esc(p.nome)}</td>${["exportar","excluir","imprimir"].map(k=>`<td><input type="checkbox" data-xoa="${id}|${k}" ${a[k]===false?"":"checked"}></td>`).join("")}<td><input type="time" data-xoh="${id}|ini" value="${h.ini||""}"> às <input type="time" data-xoh="${id}|fim" value="${h.fim||""}"></td></tr>`}).join("")],"txt")+`<button class="b sm" id="xoas" style="margin-top:8px">Salvar</button><p class="sub">Deixe o horário vazio para acesso livre. Estas travas funcionam na tela do próprio navegador: protegem contra uso comum, mas não substituem o controle de quem recebe acesso ao painel.</p>`)+
  f6Card("Marca d'água e impressão",`Quando ligada, toda impressão sai com “CONFIDENCIAL”, o nome de quem imprimiu e a data.`,`<label style="font-weight:400"><input type="checkbox" id="xowm" ${xoC().marcaDagua?"checked":""}> Marca d'água nas impressões</label> <button class="b sec sm" id="xowms">Salvar</button>`);
},()=>{
  $("xoas").onclick=()=>{const A={},H={};document.querySelectorAll("[data-xoa]").forEach(c=>{const[i,k]=c.dataset.xoa.split("|");(A[i]=A[i]||{})[k]=c.checked});document.querySelectorAll("[data-xoh]").forEach(c=>{const[i,k]=c.dataset.xoh.split("|");(H[i]=H[i]||{})[k]=c.value});Object.keys(H).forEach(i=>{if(!H[i].ini||!H[i].fim)delete H[i]});xmsave("acesso",{acoes:A,horario:H});toast("Salvo.")};
  $("xowms").onclick=()=>{xmsave("acesso",{marcaDagua:$("xowm").checked});toast("Salvo.")}});
xmReg("acesso","simular","Perfis e controles","Testar um perfil",()=>{
  const P=perfis();
  return f6Card("Ver como outro perfil","Antes de liberar um perfil, veja exatamente o que ele enxerga. Durante o teste, o sistema se comporta como se você fosse essa pessoa, até clicar em “Sair da simulação”.",`<div class="row" style="align-items:flex-end"><div><label>Perfil</label><select id="xosp">${Object.entries(P).map(([id,p])=>`<option value="${id}" ${id===(XM.sim.xosp||"")?"selected":""}>${f6Esc(p.nome)}</option>`).join("")}</select></div><button class="b sec sm" id="xospv">Ver resumo</button><button class="b sm" id="xospg">Simular</button></div>`+(XM.sim.xosp&&P[XM.sim.xosp]?f6Tbl(["Tela","Acesso"],[PAGES.filter(p=>p[0]!=="acesso").map(p=>`<tr><td>${f6Esc(p[1])}</td><td>${NIVEIS[+((P[XM.sim.xosp].mods||{})[p[0]])||0]}</td></tr>`).join("")+`<tr><td>Salários</td><td>${P[XM.sim.xosp].salario?"vê":"não vê"}</td></tr><tr><td>Dados pessoais (CPF, RG…)</td><td>${P[XM.sim.xosp].pii?"vê":"não vê"}</td></tr>`],"txt"):""));
},()=>{$("xospv").onclick=()=>{XM.sim.xosp=$("xosp").value;xmGo()};$("xospg").onclick=()=>{const id=$("xosp").value,p=perfis()[id];if(!p)return;XO.ver={...p,id};xoBarra();go("home")}});
/* --- revisão trimestral e vínculos (450, 451, 452) --- */
xmReg("acesso","revisao","Revisão de acessos","Revisão trimestral e validade",()=>{
  const A=Object.entries(S.acessos),rev=xoC().rev||{},V=xoC().vinculos||{},h=xoHoje();
  return f6Card("Quem ainda precisa de acesso?","Confira cada pessoa. “Revisado” registra a data; use a validade para acessos temporários (prestadores, estagiários). Vincule ao integrante para suspender sozinho quando ele for desligado.",A.length?f6Tbl(["Pessoa","Perfil","Integrante vinculado","Válido até","Última revisão",""],[A.map(([id,r])=>`<tr><td><span data-xonome="${f6Esc(id)}">${f6Esc(r.obs||id)}</span>${r.ativo===false?' <span class="pill s-pendencia">suspenso</span>':""}</td><td>${f6Esc((perfis()[r.perfil]||{}).nome||r.perfil||"")}</td><td><select data-xov="${f6Esc(id)}"><option value="">—</option>${integList().map(i=>`<option value="${i.id}" ${V[id]===i.id?"selected":""}>${f6Esc(nomeInteg(i))}</option>`).join("")}</select></td><td><input type="date" data-xoat="${f6Esc(id)}" value="${r.ate||""}"></td><td class="n">${rev[id]?brDate(rev[id]):"nunca"}</td><td><button class="b sec sm" data-xorv="${f6Esc(id)}">Revisado</button></td></tr>`).join("")],"txt")+`<div class="row" style="margin-top:8px"><button class="b sm" id="xorvs">Salvar vínculos e validades</button><button class="b sec sm" id="xorva">Marcar todos como revisados hoje</button><button class="b sec sm" id="xorvt">Criar lembrete trimestral na agenda</button></div>`:'<div class="empty">Ninguém com acesso cadastrado.</div>');
},()=>{
  if(typeof resolverNomes==="function")resolverNomes(document.getElementById("view"));
  document.querySelectorAll("[data-xorv]").forEach(b=>b.onclick=()=>{xmsave("acesso",{rev:{...(xoC().rev||{}),[b.dataset.xorv]:xoHoje()}});setTimeout(xmGo,250)});
  const s=$("xorvs");if(s)s.onclick=()=>{const V={...(xoC().vinculos||{})};document.querySelectorAll("[data-xov]").forEach(x=>{if(x.value)V[x.dataset.xov]=x.value;else delete V[x.dataset.xov]});xmsave("acesso",{vinculos:V});document.querySelectorAll("[data-xoat]").forEach(x=>{const r=S.acessos[x.dataset.xoat];if(r&&(r.ate||"")!==x.value){const n={...strip(r)};if(x.value)n.ate=x.value;else delete n.ate;put("acessos",r.id||x.dataset.xoat,n)}});toast("Salvo.");setTimeout(()=>{xoAutoSuspende();xmGo()},300)};
  const a=$("xorva");if(a)a.onclick=()=>{const r={};Object.keys(S.acessos).forEach(i=>r[i]=xoHoje());xmsave("acesso",{rev:r});setTimeout(xmGo,250)};
  const t=$("xorvt");if(t)t.onclick=()=>{if(!podeEd("agenda"))return toast("Sem permissão na agenda.");const g=uid8(),n=[];for(let k=1;k<=8;k++)n.push({id:uid8(),titulo:"Revisar quem ainda precisa de acesso ao sistema",desc:"Usuários e permissões → Revisão de acessos",prio:"normal",resp:"",area:"Administrativo",status:"aberta",feitaEm:null,data:addMesesIso(xoHoje(),3*k),grupo:g});tarMutate(l=>[...l,...n]);toast("8 lembretes trimestrais criados.")}});
xmUrg(()=>{if(!ACC.gestor)return[];const L=[],h=xoHoje(),V=xoC().vinculos||{};
  Object.entries(V).forEach(([uid,ig])=>{const i=S.integrantes[ig],r=S.acessos[uid];if(i&&r&&r.ativo!==false&&(i.situacao==="Desligado"||(i.desligamento&&i.desligamento<=h)))L.push({nivel:3,tipo:"Acessos",titulo:`${nomeInteg(i)} foi desligado e ainda tem acesso ao sistema`,detalhe:"Suspenda em Usuários e permissões",quando:i.desligamento||null,rota:"acesso"})});
  const rev=xoC().rev||{},ult=Object.values(rev).sort().pop();if(Object.keys(S.acessos).length&&(!ult||daysBetweenIso(ult,h)>95))L.push({nivel:1,tipo:"Acessos",titulo:"Revisão trimestral de acessos em atraso",detalhe:ult?"Última em "+brDate(ult):"Nunca feita",quando:null,rota:"acesso"});return L});
/* --- entradas, dispositivos e entradas suspeitas (430, 432) --- */
xmReg("acesso","entradas","Revisão de acessos","Entradas e dispositivos",()=>f6Card("Entradas recentes","Lê o registro de acessos dos últimos dois meses. Entrada marcada como suspeita: horário de madrugada (23h–5h) ou aparelho/navegador nunca visto antes para aquela pessoa. É um alerta de apoio, não prova de invasão.",`<div id="xoent" class="sub">Carregando…</div>`),async()=>{
  const box=$("xoent");if(!box)return;if(!RT.db){box.textContent="O registro de acessos só existe quando o sistema está ligado ao armazenamento.";return}
  const ids=[...new Set([...Object.keys(S.acessos),ACC.uid].filter(Boolean))],ms=[xoHoje().slice(0,7).replace("-",""),addMesesIso(xoHoje(),-1).slice(0,7).replace("-","")],E=[];
  await Promise.all(ids.flatMap(id=>ms.map(async m=>{try{const s=await RT.db.doc(`auditoria/${id}/m/${m}`).get();if(s.exists)(s.data().ev||[]).forEach(e=>E.push({...e,id}))}catch(e){}})));
  E.sort((a,b)=>a.t.localeCompare(b.t));const vistos={},L=[];
  E.forEach(e=>{if(e.k==="disp"){const k=e.id+"|"+e.x,novo=!vistos[e.id+"#"]?false:!vistos[k];vistos[k]=1;vistos[e.id+"#"]=1;L.push({...e,novo})}else if(e.k==="acesso"){const h=new Date(e.t).getHours();L.push({...e,madr:h>=23||h<5})}});
  if(!$("xoent"))return;L.reverse();
  box.innerHTML=L.length?`<table class="mx"><tr><th>Quando</th><th>Quem</th><th>Evento</th><th>Alerta</th></tr>${L.slice(0,200).map(e=>`<tr><td>${esc(new Date(e.t).toLocaleString("pt-BR"))}</td><td><span data-xonome="${esc(e.id)}">${esc(e.id)}</span></td><td>${e.k==="disp"?esc(e.x):"Entrou ("+esc(e.x)+")"}</td><td>${e.novo?'<span class="pill s-urgente">aparelho novo</span>':""}${e.madr?'<span class="pill s-pendencia">madrugada</span>':""}</td></tr>`).join("")}</table>`:"Nenhuma entrada registrada.";
  if(typeof resolverNomes==="function")resolverNomes(box)});


/* >>> x_m16.js */
