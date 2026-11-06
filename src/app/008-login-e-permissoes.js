/* ================= LOGIN E PERMISSÕES =================
   Quem é a pessoa: a conta do claude.ai (capacidade "user"). O perfil dela fica em "acessos".
   Donos e Editores do painel são a administração (gestor): veem tudo e gerem os usuários.
   Os perfis definem, por tela, Sem acesso / Consulta / Edição, e se a pessoa vê salários e dados pessoais. */
const MODS=PAGES.map(p=>p[0]);
PAGES.push(["acesso","Usuários e permissões","key","Administração"]);
const MOD_NOME=Object.fromEntries(PAGES.map(p=>[p[0],p[1]]));
const NIVEIS=["Sem acesso","Consulta","Edição"];
const mkMods=o=>{const m={};MODS.forEach(k=>m[k]=o[k]||0);return m};
const PERFIS_PADRAO={
  direcao:{nome:"Direção",desc:"Todas as telas, com edição, salários e dados pessoais.",mods:mkMods(Object.fromEntries(MODS.map(k=>[k,2]))),salario:1,pii:1},
  dp:{nome:"RH / Departamento Pessoal",desc:"Integrantes, ponto, escalas e folha.",mods:mkMods({home:1,agenda:2,pend:1,pront:2,ponto:2,turnos:2,contador:2,gp:2,docs:2,infra:1,rel:1,ind:1}),salario:1,pii:1},
  enf:{nome:"Enfermagem e cuidados",desc:"Residentes e prontuário; escala em consulta.",mods:mkMods({home:1,agenda:2,pend:1,turnos:1,res:2,pres:2,cuid:2,admres:1,estoque:1,docs:1,infra:2,rel:1}),salario:0,pii:0},
  fin:{nome:"Financeiro e contabilidade",desc:"Contas, notas fiscais, prestadores e contabilidade.",mods:mkMods({home:1,agenda:2,pend:1,contador:1,estoque:1,fin:2,nf:2,prest:2,contab:2,fin2:2,docs:1,rel:1,ind:1}),salario:1,pii:0},
  est:{nome:"Cozinha e estoque",desc:"Estoque e consulta às notas fiscais.",mods:mkMods({home:1,agenda:2,pend:1,estoque:2,nf:1,infra:1}),salario:0,pii:0},
  leitura:{nome:"Consulta geral",desc:"Só vê a visão geral, a agenda, as escalas e os documentos.",mods:mkMods({home:1,agenda:1,pend:1,turnos:1,docs:1}),salario:0,pii:0}
};
const ACC={uid:null,gestor:false,me:null,lock:false,pedido:false,carregado:false};
const perfis=()=>({...PERFIS_PADRAO,...((S.perfis.matriz&&S.perfis.matriz.custom)||{})});
function estadoAcesso(){
  if(!RT.ready||!ACC.carregado)return"carregando";
  if(!RT.db)return"ok";
  if(ACC.lock)return"bloqueado";
  if(ACC.gestor)return"ok";
  if(!ACC.uid)return"anon";
  if(!RT.acOk)return"carregando";
  const r=S.acessos[ACC.uid];
  if(!r)return(S.pedidos[ACC.uid]||ACC.pedido)?"solicitado":"pendente";
  if(r.ativo===false)return"suspenso";
  if(!perfis()[r.perfil])return"semperfil";
  return"ok";
}
function perfilAtual(){
  if(!RT.db||ACC.gestor)return PERFIS_PADRAO.direcao;
  const r=S.acessos[ACC.uid];
  return r&&r.ativo!==false?(perfis()[r.perfil]||null):null;
}
function nv(m){
  if(m==="acesso")return(ACC.gestor||!RT.db)&&estadoAcesso()==="ok"?2:0;
  if(estadoAcesso()!=="ok")return 0;
  const p=perfilAtual();return p?(+(p.mods||{})[m]||0):0;
}
const podeVer=m=>nv(m)>=1,podeEd=m=>nv(m)>=2;
const podeSal=()=>!!(perfilAtual()||{}).salario,podePii=()=>!!(perfilAtual()||{}).pii;
const GRAVA_COL={integrantes:["pront","turnos","ponto"],ocorr:["ponto","pront","turnos"],marcacoes:["ponto"],docs:["docs"],nfarq:["nf","fin"]};
const GRAVA_CFG=[[/^nf(_p\d+)?$/,["nf"]],[/^fin_cfg$/,["fin","contab"]],[/^fin_\d+$/,["fin","nf","prest","estoque","fin2"]],[/^recorrencias$/,["fin","prest"]],
 [/^(estoque|mov_\d+)$/,["estoque","nf","res","fin2"]],[/^(prestadores|contratos)$/,["prest"]],[/^contab$/,["contab","fin"]],[/^docs_val$/,["docs"]],
 [/^(residentes|evo_\d+)$/,["res","pres","cuid","admres"]],[/^tar_\d+$/,["agenda","cuid","infra"]],[/^(esc_\d+|escalaEx|escala_cfg)$/,["turnos","ponto"]],[/^prevm_/,["ponto"]],
 [/^(x_gp|fech_\d+)$/,["gp"]],[/^x_cuid$/,["cuid"]],[/^x_infra$/,["infra"]],[/^x_ind$/,["ind"]],[/^x_fin2$/,["fin2"]],[/^x_fin4$/,["fin"]],[/^x_fin6$/,["fin"]],[/^x_fin7$/,["fin"]],[/^x_fin8$/,["fin"]],[/^x_fin9$/,["fin"]],[/^x_fin10$/,["fin"]],[/^x_fin11$/,["fin"]],[/^x_admres$/,["admres"]],
 [/^armazenamento$/,["docs","fin","nf","pront","res","pres","turnos","ponto"]],[/^geral$/,["pront","turnos","ponto","contador","docs","fin","prest"]]];
function escritaOk(col,id){
  if(!RT.db)return true;
  if(col==="acessos"||col==="perfis")return ACC.gestor&&estadoAcesso()==="ok";
  if(col==="pedidos")return id===ACC.uid||ACC.gestor;
  if(estadoAcesso()!=="ok")return false;
  let mods=GRAVA_COL[col]||XCOLS[col];
  if(!mods&&col==="config"){const g=GRAVA_CFG.find(([re])=>re.test(id));mods=g?g[1]:[ROUTE]}
  return(mods||[ROUTE]).some(podeEd);
}
let _negT=0;
function negado(txt){
  audit("negado",txt);
  if(Date.now()-_negT>2500){_negT=Date.now();toast("Seu perfil não permite alterar isto.",true)}
}
/* relatórios: cada um segue a tela de origem e, se tiver dados pessoais, a permissão de dados pessoais */
const REP_MOD=id=>({dp_integrantes:"pront",dp_escala:"turnos",dp_alertas:"turnos",dp_jornadas:"ponto",dp_resumo:"ponto",dp_ocorr:"ponto",dp_contador:"contador",dp_docs:"docs"})[id]
  ||({fin:"fin",nf:"nf",est:"estoque",rpa:"prest",res:"res",cb:"contab",ag:"agenda",gp:"gp",cu:"cuid",ar:"admres",inf:"infra",f2:"fin2",ix:"ind"})[id.split("_")[0]]||"rel";
const repOk=r=>podeVer(REP_MOD(r.id))&&(!r.pii||podePii());
const rotasPermitidas=()=>PAGES.filter(([k])=>podeVer(k));

/* ---------- registro de acessos (cada pessoa grava só o próprio) ---------- */
const AUD={pend:[],t:null,busy:false};
function audit(k,x){
  if(!RT.db||!ACC.uid)return;
  AUD.pend.push({t:new Date().toISOString(),k,x:String(x||"").slice(0,160)});
  clearTimeout(AUD.t);AUD.t=setTimeout(auditFlush,2500);
}
async function auditFlush(){
  if(AUD.busy){AUD.t=setTimeout(auditFlush,1500);return}
  if(!AUD.pend.length||!RT.db||!ACC.uid)return;
  AUD.busy=true;const novos=AUD.pend;AUD.pend=[];
  try{
    const ref=RT.db.doc(`auditoria/${ACC.uid}/m/${novos[0].t.slice(0,7).replace("-","")}`);
    const s=await ref.get();
    await ref.set({ev:[...(s.exists?(s.data().ev||[]):[]),...novos].slice(-150)});
  }catch(e){AUD.pend=[...novos,...AUD.pend]}
  AUD.busy=false;
}
const AUD_ROT={acesso:"Entrou",bloqueio:"Bloqueou a tela",negado:"Ação negada",perm:"Mudou permissões",relatorio:"Baixou relatórios",pedido:"Pediu acesso"};

/* ---------- identificação ---------- */
async function identificar(){
  try{
    if(RT.user){const me=await RT.user.me();ACC.me=me;ACC.uid=me.id||null;ACC.gestor=!!(me.isOwner||me.canEdit)}
  }catch(e){}
  if(!RT.db){ACC.gestor=true}
  ACC.carregado=true;
}
let _entrou=false;
function registrarEntrada(){
  if(_entrou||estadoAcesso()!=="ok"||!RT.db)return;_entrou=true;
  const p=perfilAtual(),r=S.acessos[ACC.uid];
  audit("acesso",ACC.gestor?"Administração":((p&&p.nome)||(r&&r.perfil)||""));
}

/* ---------- tela de entrada (porteiro) ---------- */
const GATE_TXT={
  carregando:["Verificando seu acesso…","Só um instante."],
  anon:["Não foi possível identificar você","Entre no claude.ai com a sua conta e abra o painel pelo link que a Casa Hiro compartilhou."],
  pendente:["Bem-vindo(a) à Casa Hiro","Sua conta ainda não tem um perfil neste sistema. Diga quem você é e a direção libera o seu acesso."],
  solicitado:["Pedido enviado","A direção vai escolher o seu perfil. Esta tela atualiza sozinha quando o acesso for liberado."],
  suspenso:["Acesso suspenso","Seu acesso foi suspenso pela direção. Fale com ela para reativar."],
  semperfil:["Perfil indisponível","O perfil que você tinha foi removido. Fale com a direção para receber outro."],
  bloqueado:["Tela bloqueada","Por segurança, a tela foi bloqueada. Continue para voltar de onde parou."]
};
function renderGate(est){
  const g=$("gate"),[t,s]=GATE_TXT[est]||GATE_TXT.carregando,nome=(ACC.me&&ACC.me.name)||"";
  const logo=(document.querySelector("aside .logo")||{}).src||"";
  g.innerHTML=`<div class="gate-card">${logo?`<img src="${logo}" alt="Casa Hiro">`:""}<h1>${esc(t)}</h1><p class="sub">${esc(s)}</p>
   ${est==="pendente"?`<label style="text-align:left">Seu nome e função</label><input id="gmsg" placeholder="ex.: Maria Souza, enfermeira" maxlength="120"><button class="b" id="gped" style="margin-top:12px;width:100%">Pedir acesso</button>`:""}
   ${est==="bloqueado"?`<button class="b" id="gcont" style="margin-top:6px;width:100%">Continuar${nome?" como "+esc(nome):""}</button>`:""}
   ${est==="solicitado"||est==="suspenso"||est==="semperfil"||est==="anon"?`<button class="b sec" id="gver" style="margin-top:6px;width:100%">Verificar de novo</button>`:""}
   <p class="sub" style="margin:16px 0 0;font-size:11.5px">Dados pessoais e de saúde seguem a LGPD (Lei 13.709/2018). Cada pessoa vê só o que o seu perfil permite.</p></div>`;
  const b=id=>$(id);
  if(b("gped"))b("gped").onclick=()=>{
    const msg=b("gmsg").value.trim();if(!msg){toast("Escreva seu nome e função.",true);return}
    ACC.pedido=true;put("pedidos",ACC.uid,{msg,em:new Date().toISOString()});audit("pedido",msg);renderGate("solicitado");
  };
  if(b("gcont"))b("gcont").onclick=()=>{ACC.lock=false;idleT=Date.now();go(ROUTE,true)};
  if(b("gver"))b("gver").onclick=()=>{go(ROUTE,true)};
}
function bloquear(){ACC.lock=true;audit("bloqueio","");go(ROUTE,true)}
let idleT=Date.now();const IDLE_MS=20*60*1000;
["pointerdown","keydown","touchstart"].forEach(e=>addEventListener(e,()=>{idleT=Date.now()},{passive:true,capture:true}));
setInterval(()=>{if(RT.db&&ACC.uid&&!ACC.lock&&Date.now()-idleT>IDLE_MS&&estadoAcesso()==="ok")bloquear()},30000);

function desenharQuem(){
  const q=$("quem");if(!q)return;
  if(!RT.db){q.innerHTML=`<div class="qn">Modo sem login</div><div class="qp">pré-visualização, sem armazenamento</div>`;return}
  const p=perfilAtual(),me=ACC.me||{};
  q.innerHTML=`<div class="qrow"><img class="qav" alt="" src="${me.avatarUrl||""}"><div class="grow"><div class="qn"></div><div class="qp"></div></div></div><button class="b sec sm" id="qlock" style="width:100%;margin-top:8px">Bloquear a tela</button>`;
  q.querySelector(".qn").textContent=me.name||"Você";
  q.querySelector(".qp").textContent=ACC.gestor?"Administração":((p&&p.nome)||"");
  $("qlock").onclick=bloquear;
}

/* ---------- tela "Usuários e permissões" ---------- */
const ACS={tab:"pessoas",hits:[],q:"",mes:new Date().toISOString().slice(0,7),novoP:"leitura"};
const perfOpts=sel=>Object.entries(perfis()).map(([k,p])=>`<option value="${k}" ${k===sel?"selected":""}>${esc(p.nome)}</option>`).join("");
const spanNome=(id,fb)=>`<b data-pn="${esc(id)}" data-fb="${esc(fb||"")}">…</b>`;
async function resolverNomes(root){
  const els=[...root.querySelectorAll("[data-pn]")];if(!els.length)return;
  let ps={};try{if(RT.user)ps=await RT.user.profiles([...new Set(els.map(e=>e.dataset.pn))])}catch(e){}
  els.forEach(e=>{const p=ps[e.dataset.pn];e.textContent=(p&&p.name)||e.dataset.fb||"Pessoa sem nome visível"});
}
function pgAcesso(){
  const T=[["pessoas","Pessoas"],["perfis","Perfis e permissões"],["log","Registro de acessos"],["armaz","Armazenamento"],["hist","Histórico de alterações"],["bkp","Backup e restauração"]];
  return banner("","Usuários e permissões","Quem entra no sistema, o que cada perfil pode ver e alterar, e o armazenamento dos arquivos.","key")+noStore()+
   `<div class="tabs">${T.map(([k,l])=>`<button data-act="${k}" class="${ACS.tab===k?"on":""}">${l}</button>`).join("")}</div>`+
   (ACS.tab==="hist"?acHistorico():ACS.tab==="bkp"?acBackup():ACS.tab==="pessoas"?acPessoas():ACS.tab==="perfis"?acPerfis():ACS.tab==="armaz"?acArmazenamento():acLog());
}
function acPessoas(){
  const reg=Object.entries(S.acessos).sort((a,b)=>(a[1].obs||"").localeCompare(b[1].obs||"")),ped=Object.entries(S.pedidos).filter(([id])=>!S.acessos[id]);
  return `<div class="callout">Cada pessoa entra com a <b>própria conta do claude.ai</b>. Para dar acesso: (1) compartilhe o painel com ela no nível que permite alterar dados (Integrante); (2) ela abre o painel e pede acesso; (3) você escolhe o perfil aqui. Donos e Editores do painel são a administração e sempre têm acesso total.</div>
  ${ped.length?`<div class="card"><h2>Pedidos de acesso (${ped.length})</h2>${ped.map(([id,p])=>`<div class="doc"><div class="grow"><div class="nm">${spanNome(id,p.msg)}</div><div class="sub">${esc(p.msg||"")}</div></div>
    <select data-pedp="${esc(id)}" style="max-width:220px">${perfOpts("leitura")}</select><button class="b sm" data-pedok="${esc(id)}">Liberar</button><button class="b sec sm" data-pednao="${esc(id)}">Recusar</button></div>`).join("")}</div>`:""}
  <div class="card"><h2>Adicionar pessoa</h2><div class="row" style="align-items:flex-end"><div><label>Buscar pelo nome ou e-mail</label><input id="acbusca" placeholder="Digite para buscar" value="${esc(ACS.q)}"></div>
   <div><label>Perfil</label><select id="acnovop">${perfOpts(ACS.novoP)}</select></div></div><div id="achits" style="margin-top:8px"></div>
   <p class="sub" style="margin:8px 0 0">Se a busca não achar a pessoa, peça para ela abrir o painel e “Pedir acesso”: o pedido aparece acima.</p></div>
  <div class="card"><h2>Pessoas com acesso (${reg.length})</h2>${reg.length?reg.map(([id,r])=>`<div class="doc" ${r.ativo===false?'style="opacity:.6"':""}><div class="grow"><div class="nm">${spanNome(id,r.obs)}${r.ativo===false?' <span class="chip">suspenso</span>':""}</div>
    <input data-aobs="${esc(id)}" value="${esc(r.obs||"")}" placeholder="Anotação (função, setor)" style="margin-top:4px;max-width:320px"></div>
    <select data-aperf="${esc(id)}" style="max-width:220px">${perfOpts(r.perfil)}</select>
    <button class="b sec sm" data-aativo="${esc(id)}">${r.ativo===false?"Reativar":"Suspender"}</button><button class="b sec sm" data-arem="${esc(id)}">Remover</button></div>`).join(""):`<div class="empty">Ninguém ainda. Além da administração, ninguém entra até receber um perfil.</div>`}</div>`;
}
function acPerfis(){
  const uso=pid=>Object.values(S.acessos).filter(r=>r.perfil===pid).length,custom=(S.perfis.matriz&&S.perfis.matriz.custom)||{};
  return `<div class="callout sand">Cada perfil define, <b>por tela</b>, se a pessoa não vê, só consulta ou também altera. Duas permissões à parte controlam os dados mais sensíveis. Mudanças valem para todos que usam o perfil, na hora.</div>`+
  Object.entries(perfis()).map(([pid,p])=>`<details class="card" data-perfil="${esc(pid)}"><summary style="cursor:pointer"><b>${esc(p.nome)}</b> <span class="chip">${uso(pid)} pessoa(s)</span> <span class="sub">${esc(p.desc||"")}</span></summary>
   <div style="margin-top:12px"><label>Nome do perfil</label><input data-pnome value="${esc(p.nome)}" style="max-width:340px"></div>
   <table class="mx" style="margin-top:10px"><tr><th>Tela</th><th>Acesso</th></tr>${MODS.map(m=>`<tr><td>${esc(MOD_NOME[m])}</td><td><select data-pm="${m}">${NIVEIS.map((n,k)=>`<option value="${k}" ${(+(p.mods||{})[m]||0)===k?"selected":""}>${n}</option>`).join("")}</select></td></tr>`).join("")}</table>
   <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink);margin-top:10px"><input type="checkbox" data-pf="salario" ${p.salario?"checked":""}> Ver salários e valores da ficha do integrante</label>
   <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" data-pf="pii" ${p.pii?"checked":""}> Ver dados pessoais (CPF, RG, PIS, CTPS, nascimento) e relatórios com dados pessoais</label>
   <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" data-pf="finbaixa" ${p.finbaixa===0?"":"checked"}> Financeiro: dar baixa, estornar e cancelar contas</label>
   <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" data-pf="finexcluir" ${p.finexcluir===0?"":"checked"}> Financeiro: excluir lançamentos</label>
   <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" data-pf="finro" ${p.finro===1?"checked":""}> Financeiro: somente leitura (não lança nem altera nada)</label>
   <div class="row" style="margin-top:12px"><button class="b sm" data-psave="${esc(pid)}" style="flex:none">Salvar perfil</button>
   ${PERFIS_PADRAO[pid]&&custom[pid]?`<button class="b sec sm" data-prest="${esc(pid)}" style="flex:none">Restaurar o padrão</button>`:""}
   ${!PERFIS_PADRAO[pid]?`<button class="b sec sm" data-pdel="${esc(pid)}" style="flex:none">Excluir perfil</button>`:""}</div></details>`).join("")+
  `<div class="row"><button class="b sec" id="pnovo" style="flex:none">${ic("plus")} Novo perfil</button></div>`;
}
function acLog(){
  return `<div class="card"><h2>Registro de acessos</h2><div class="row" style="align-items:flex-end"><div><label>Mês</label><input type="month" id="aclogmes" value="${esc(ACS.mes)}"></div></div>
   <div id="aclog" class="sub" style="margin-top:10px">Carregando…</div>
   <p class="sub" style="margin:10px 0 0">Mostra entradas, bloqueios, downloads de relatórios, ações negadas e mudanças de permissão. Cada pessoa grava só o próprio histórico; guarda os 150 últimos eventos de cada um por mês.</p></div>`;
}
async function acCarregarLog(){
  const box=$("aclog");if(!box||!RT.db)return;
  const ids=[...new Set([...Object.keys(S.acessos),ACC.uid].filter(Boolean))],m=ACS.mes.replace("-",""),L=[];
  await Promise.all(ids.map(async id=>{try{const s=await RT.db.doc(`auditoria/${id}/m/${m}`).get();if(s.exists)(s.data().ev||[]).forEach(e=>L.push({...e,id}))}catch(e){}}));
  if(!$("aclog"))return;
  L.sort((a,b)=>b.t.localeCompare(a.t));
  box.innerHTML=L.length?`<table class="mx"><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Detalhe</th></tr>${L.slice(0,300).map(e=>`<tr><td>${esc(new Date(e.t).toLocaleString("pt-BR"))}</td><td>${spanNome(e.id,"")}</td><td>${esc(AUD_ROT[e.k]||e.k)}</td><td>${esc(e.x||"")}</td></tr>`).join("")}</table>`:"Nada registrado neste mês.";
  resolverNomes(box);
}
function bindAcesso(){
  const re=()=>go("acesso",true),v=$("view");
  v.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{ACS.tab=b.dataset.act;re()});
  resolverNomes(v);
  if(ACS.tab==="log"){$("aclogmes").onchange=e=>{ACS.mes=e.target.value||ACS.mes;re()};acCarregarLog();return}
  if(ACS.tab==="perfis"){bindPerfis();return}
  if(ACS.tab==="armaz"){bindArmaz();return}
  if(ACS.tab==="hist"){bindHistorico();return}
  if(ACS.tab==="bkp"){bindBackup();return}
  const dar=(id,perfil,obs)=>{put("acessos",id,{perfil,ativo:true,obs:obs||"",por:ACC.uid,em:new Date().toISOString()});audit("perm",`liberou ${(perfis()[perfil]||{}).nome||perfil}`)};
  v.querySelectorAll("[data-pedok]").forEach(b=>b.onclick=()=>{const id=b.dataset.pedok,p=S.pedidos[id]||{},sel=v.querySelector(`[data-pedp="${id}"]`).value;dar(id,sel,p.msg);del("pedidos",id);toast("Acesso liberado.");re()});
  v.querySelectorAll("[data-pednao]").forEach(b=>b.onclick=()=>{del("pedidos",b.dataset.pednao);audit("perm","recusou um pedido");re()});
  v.querySelectorAll("[data-aperf]").forEach(s=>s.onchange=()=>{const id=s.dataset.aperf,r=S.acessos[id];put("acessos",id,{...strip(r),perfil:s.value,por:ACC.uid,em:new Date().toISOString()});audit("perm",`mudou para ${(perfis()[s.value]||{}).nome||s.value}`)});
  v.querySelectorAll("[data-aobs]").forEach(i=>i.onchange=()=>{const id=i.dataset.aobs;put("acessos",id,{...strip(S.acessos[id]),obs:i.value.trim()})});
  v.querySelectorAll("[data-aativo]").forEach(b=>b.onclick=()=>{const id=b.dataset.aativo,r=S.acessos[id];put("acessos",id,{...strip(r),ativo:r.ativo===false,por:ACC.uid,em:new Date().toISOString()});audit("perm",r.ativo===false?"reativou":"suspendeu");re()});
  v.querySelectorAll("[data-arem]").forEach(b=>b.onclick=()=>{askConfirm("Remover o acesso desta pessoa?","Remover").then(ok=>{if(!ok)return;del("acessos",b.dataset.arem);audit("perm","removeu o acesso");re()})});
  $("acnovop").onchange=e=>{ACS.novoP=e.target.value};
  const busca=$("acbusca");
  busca.oninput=async()=>{
    ACS.q=busca.value;const box=$("achits");let hs=[];
    try{if(RT.user&&ACS.q.trim())hs=await RT.user.search(ACS.q.trim())}catch(e){}
    ACS.hits=hs.filter(h=>h.id&&!S.acessos[h.id]);
    box.innerHTML="";
    if(ACS.q.trim()&&!ACS.hits.length){box.innerHTML=`<div class="sub">Ninguém encontrado. Peça para a pessoa abrir o painel e pedir acesso.</div>`;return}
    ACS.hits.forEach(h=>{const d=document.createElement("div");d.className="doc";d.innerHTML=`<div class="grow"><div class="nm"></div></div><button class="b sm">Adicionar</button>`;
      d.querySelector(".nm").textContent=h.name||"Pessoa sem nome";
      d.querySelector("button").onclick=()=>{dar(h.id,$("acnovop").value,h.name||"");toast("Pessoa adicionada.");ACS.q="";re()};box.appendChild(d)});
  };
}
function bindPerfis(){
  const v=$("view"),custom=()=>({...((S.perfis.matriz&&S.perfis.matriz.custom)||{})});
  const salvaCustom=c=>{put("perfis","matriz",{custom:c});audit("perm","alterou perfis");go("acesso",true)};
  v.querySelectorAll("[data-psave]").forEach(b=>b.onclick=()=>{
    const pid=b.dataset.psave,box=v.querySelector(`[data-perfil="${pid}"]`),mods={};
    box.querySelectorAll("[data-pm]").forEach(s=>mods[s.dataset.pm]=+s.value);
    const nome=box.querySelector("[data-pnome]").value.trim()||perfis()[pid].nome,c=custom();
    c[pid]={nome,desc:(perfis()[pid]||{}).desc||"",mods,salario:box.querySelector('[data-pf="salario"]').checked?1:0,pii:box.querySelector('[data-pf="pii"]').checked?1:0,finbaixa:box.querySelector('[data-pf="finbaixa"]').checked?1:0,finexcluir:box.querySelector('[data-pf="finexcluir"]').checked?1:0,finro:box.querySelector('[data-pf="finro"]').checked?1:0};
    salvaCustom(c);toast("Perfil salvo.");
  });
  v.querySelectorAll("[data-prest]").forEach(b=>b.onclick=()=>{const c=custom();delete c[b.dataset.prest];salvaCustom(c)});
  v.querySelectorAll("[data-pdel]").forEach(b=>b.onclick=()=>{
    const pid=b.dataset.pdel;if(Object.values(S.acessos).some(r=>r.perfil===pid)){toast("Há pessoas neste perfil. Mude o perfil delas antes de excluir.",true);return}
    const c=custom();delete c[pid];salvaCustom(c)});
  $("pnovo").onclick=()=>{const c=custom(),base=PERFIS_PADRAO.leitura;c["p"+uid8()]={nome:"Novo perfil",desc:"",mods:{...base.mods},salario:0,pii:0};salvaCustom(c)};
}

let ROUTE="home";
function go(r,keep){
  const est=estadoAcesso();
  document.body.classList.toggle("gated",est!=="ok");
  if(est!=="ok"){ROUTE=r;renderGate(est);return}
  if(!podeVer(r)){
    const pm=rotasPermitidas();
    if(r!=="home")negado("abrir "+(MOD_NOME[r]||r));
    if(!pm.length){ROUTE=r;$("nav").innerHTML="";$("view").innerHTML=banner("","Sem telas liberadas","Seu perfil ainda não tem acesso a nenhuma tela. Fale com a direção.","key");desenharQuem();return}
    r=pm[0][0];
  }
  ROUTE=r;if(podeEd("fin"))autoRecorrencias();
  let sec="",h="";
  PAGES.forEach(([k,l,i,sc])=>{if(sc)sec=sc;if(!podeVer(k))return;if(sec){h+=`<div class="navsec">${sec}</div>`;sec=""}h+=`<button class="${k===r?"on":""}" data-r="${k}">${ic(i)}<span>${l}</span></button>`});
  $("nav").innerHTML=h;
  $("nav").querySelectorAll("button").forEach(b=>b.onclick=()=>go(b.dataset.r));
  desenharQuem();
  $("view").innerHTML=({ponto:pgPonto,turnos:pgTurnos,pront:pgPront,contador:pgContador,nf:pgNF,estoque:pgEstoque,fin:pgFin,home:pgHome,agenda:pgAgenda,docs:pgDocs,rel:pgRel,prest:pgPrest,contab:pgContab,res:pgRes,pres:pgPres,acesso:pgAcesso,...Object.fromEntries(Object.entries(PGX).map(([k,v])=>[k,v.pg]))})[r]();
  if(nv(r)===1&&!["home","rel"].includes(r))$("view").insertAdjacentHTML("afterbegin",`<div class="callout sand" id="roaviso" style="margin-bottom:14px"><b>Acesso de consulta.</b> Você pode ver esta tela, mas não alterar o que está nela.</div>`);
  ({ponto:bindPonto,turnos:bindTurnos,pront:bindPront,contador:bindContador,nf:bindNF,estoque:bindEstoque,fin:bindFin,home:bindHome,agenda:bindAgenda,docs:bindDocs,rel:bindRel,prest:bindPrest,contab:bindContab,res:bindRes,pres:bindPres,acesso:bindAcesso,...Object.fromEntries(Object.entries(PGX).map(([k,v])=>[k,v.bind]))})[r]();
  mountSteppers($("view"));xPosGo();
  if(!keep)window.scrollTo(0,0);
}
const banner=(n,t,s,i)=>`<div class="banner"><div><h1>${t}</h1><p>${s}</p></div><div class="ico">${ic(i)}</div></div>`;
const noStore=()=>RT.ready&&!RT.db?`<div class="callout sand" style="margin-bottom:16px"><b>Modo sem salvamento.</b> Este painel não está conectado ao armazenamento: o que você cadastrar some ao fechar a página.</div>`:"";

