/* ================= RESIDENTES e PRONTUÁRIO MULTIDISCIPLINAR (separados dos integrantes) ================= */
const resAll=()=>(S.config.residentes&&S.config.residentes.itens)||[];
let resSave=l=>put("config","residentes",{itens:l});
const evoAll=()=>Object.keys(S.config).filter(k=>/^evo_\d{4}$/.test(k)).flatMap(k=>S.config[k].itens||[]);
let evoMutate=fn=>mutaAno("evo_","data",evoAll(),fn);
const GRAUS={1:"Grau I — independente",2:"Grau II — dependência em até 3 atividades de autocuidado",3:"Grau III — dependência que exige assistência em todas as atividades"};
const GRAU_CURTO={1:"Grau I",2:"Grau II",3:"Grau III"};
const RES_SIT=["Ativo","Hospitalizado","Desligado","Óbito"];
const EVO_CATS=["Enfermagem","Cuidador","Fisioterapia","Nutrição","Psicologia","Terapia ocupacional","Médica","Serviço social","Fonoaudiologia","Outra"];
const resNome=r=>r.apelido||r.nome;
const resNomeDe=id=>{const r=resAll().find(x=>x.id===id);return r?resNome(r):""};
const resAtivo=r=>(r.sit||"Ativo")==="Ativo";
const idadeDe=n=>{if(!n)return"";const d=new Date(n+"T00:00:00"),h=new Date();let a=h.getFullYear()-d.getFullYear();if(h<new Date(h.getFullYear(),d.getMonth(),d.getDate()))a--;return a};
// RDC 502/2021 (Anvisa): 1 cuidador/20 idosos no grau I (8h/dia); 1/10 no grau II e 1/6 no grau III, por turno — fração conta como um
const RDC_RATIO={1:20,2:10,3:6};
function rdcExigido(){
  const a=resAll().filter(resAtivo),n=k=>a.filter(r=>+r.grau===k).length,c=k=>Math.ceil(n(k)/RDC_RATIO[k]);
  return{n1:n(1),n2:n(2),n3:n(3),total:a.length,dia:c(1)+c(2)+c(3),noite:c(2)+c(3)};
}
function resMensalidade(r,desdeX){
  const rec=r.recId?recAll().find(x=>x.id===r.recId):null,h=hojeIso(),hd=desdeX&&desdeX<=h?desdeX:h,ativo=resAtivo(r)&&+r.mensalidade>0&&r.gerarMens;
  if(!ativo){
    if(rec&&!rec.fim){const fim=r.saida||h;recEncerrarEm(rec.id,fim);finApagar(e=>e.recorrencia===rec.id&&!e.pago&&e.venc>fim)}
    return rec?rec.id:null;
  }
  const nome=resNome(r),contra=(r.resp&&r.resp.nome)||r.nome;
  if(rec){
    const cur=recValor(rec,h>rec.inicio?h:rec.inicio),v=+r.mensalidade;
    recSave(recAll().map(x=>x.id===rec.id?{...x,desc:`Mensalidade — ${nome}`,contra,fim:null,reaj:v!==cur?[...(x.reaj||[]).filter(a=>a.desde!==hd),{desde:hd,valor:v}]:(x.reaj||[])}:x));
    if(v!==cur)finMutate(all=>all.map(e=>(e.recorrencia===rec.id&&!e.pago&&e.venc>=hd)?{...e,valor:v}:e));
    return rec.id;
  }
  const dia=Math.max(1,Math.min(31,+r.diaVenc||10));
  let d=`${h.slice(0,7)}-${String(Math.min(dia,new Date(+h.slice(0,4),+h.slice(5,7),0).getDate())).padStart(2,"0")}`;
  if(d<h)d=addMesesIso(d,1);
  const novo={id:uid8(),tipo:"receber",desc:`Mensalidade — ${nome}`,contra,cat:"Mensalidades",area:"",forma:"Boleto",obs:"Gerada pelo cadastro do residente",prest:null,valor:+r.mensalidade,inicio:d,passo:"mensal",fim:null,ativa:true,pular:[],reaj:[],residente:r.id};
  recSave([...recAll(),novo]);
  finMutate(all=>[...all,...recDatas(novo,recHorizonte(REP_PASSO.mensal)).map(x=>recEntrada(novo,x))]);
  return novo.id;
}
/* ---------- cadastro ---------- */
const RES={sit:"ativos",grau:"",q:""};
function pgRes(){
  const rs=resAll(),ex=rdcExigido(),ativos=rs.filter(resAtivo);
  const lista=rs.filter(r=>(RES.sit==="todos"||(RES.sit==="ativos"?(r.sit||"Ativo")==="Ativo"||r.sit==="Hospitalizado":(r.sit==="Desligado"||r.sit==="Óbito")))&&(!RES.grau||String(r.grau)===RES.grau)&&(!RES.q||estNorm(r.nome+" "+(r.apelido||"")+" "+(r.quarto||"")).includes(estNorm(RES.q)))).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt"));
  return banner("","Residentes","Quem mora na casa: contrato, responsável, grau de dependência e mensalidade. O prontuário de cada residente fica no menu ao lado.","heart")+noStore()+`
  <div class="stats"><div class="stat"><b>${ativos.length}</b><span>residentes ativos</span></div>
   <div class="stat"><b>${ex.n1} · ${ex.n2} · ${ex.n3}</b><span>Grau I · II · III</span></div>
   <div class="stat blue"><b>${fmtBRL(soma(ativos,r=>+r.mensalidade||0))}</b><span>mensalidades previstas por mês</span></div>
   <div class="stat ${ativos.some(r=>!r.imagemOk)?"warn":""}"><b>${ativos.filter(r=>!r.imagemOk).length}</b><span>sem autorização de imagem</span></div></div>
  <div class="callout" style="margin-bottom:14px"><b>Cuidadores mínimos pela RDC 502/2021:</b> ${ex.dia} no turno do dia e ${ex.noite} no da noite (grau I: 1 para cada 20 idosos, 8 h/dia; grau II: 1 para cada 10; grau III: 1 para cada 6, por turno; fração conta como um). O alerta de escala usa esse número.</div>
  <div class="card"><div class="row" style="margin-bottom:12px"><button class="b" id="rsnovo" style="flex:none">${ic("plus")} Novo residente</button></div>
   <div class="row" style="margin-bottom:12px"><div style="flex:0 0 190px"><label>Situação</label><select id="rssit">${[["ativos","Na casa"],["saiu","Desligados e óbitos"],["todos","Todos"]].map(([v,l])=>`<option value="${v}" ${RES.sit===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div style="flex:0 0 190px"><label>Grau</label><select id="rsgrau"><option value="">Todos</option>${[1,2,3].map(k=>`<option value="${k}" ${RES.grau===String(k)?"selected":""}>${GRAU_CURTO[k]}</option>`).join("")}</select></div>
    <div style="flex:2"><label>Buscar</label><input id="rsq" value="${esc(RES.q)}" placeholder="nome ou quarto"></div></div>
   ${lista.length?`<div class="wrap"><table><thead><tr><th>Residente</th><th>Idade</th><th>Quarto</th><th>Grau</th><th>Responsável</th><th class="n">Mensalidade</th><th>Situação</th><th></th></tr></thead><tbody>
   ${lista.map(r=>`<tr><td><b>${esc(resNome(r))}</b>${r.apelido?`<div class="sub">${esc(r.nome)}</div>`:""}${(r.alergias||"").trim()?`<div class="sub" style="color:var(--urgente)">Alergia: ${esc(r.alergias)}</div>`:""}</td><td>${idadeDe(r.nasc)||"—"}</td><td>${esc(r.quarto||"—")}</td>
    <td><span class="pill ${+r.grau===3?"s-pendencia":+r.grau===2?"s-atestado":"s-ok"}">${GRAU_CURTO[r.grau]||"—"}</span></td><td>${esc((r.resp&&r.resp.nome)||"—")}<div class="sub">${esc([(r.resp&&r.resp.parent),(r.resp&&r.resp.tel)].filter(Boolean).join(" · "))}</div></td>
    <td class="n">${+r.mensalidade?fmtBRL(r.mensalidade):"—"}</td><td><span class="pill ${(r.sit||"Ativo")==="Ativo"?"s-ok":r.sit==="Hospitalizado"?"s-pendencia":"s-falta"}">${esc(r.sit||"Ativo")}</span></td>
    <td style="white-space:nowrap"><button class="b sm" data-rspr="${r.id}">Prontuário</button> <button class="b sec sm" data-rsed="${r.id}" title="Editar">${ic("edit")}</button> <button class="b sec sm" data-rsdel="${r.id}" title="Excluir">${ic("trash")}</button></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum residente ${RES.q||RES.grau||RES.sit!=="ativos"?"com esses filtros":"cadastrado ainda"}.</div>`}</div>
  <p class="sub">Dados de saúde são sensíveis (LGPD, Lei 13.709/2018): acesso restrito à direção, à responsável técnica e à equipe assistencial. Foto e vídeo só circulam com autorização escrita.</p>`;
}
function bindRes(){
  const re=()=>go("res",true);
  $("rsnovo").onclick=()=>openResidente(null);
  $("rssit").onchange=e=>{RES.sit=e.target.value;re()};$("rsgrau").onchange=e=>{RES.grau=e.target.value;re()};
  const q=$("rsq");q.oninput=()=>{RES.q=q.value;re();const n=$("rsq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  document.querySelectorAll("[data-rsed]").forEach(b=>b.onclick=()=>openResidente(b.dataset.rsed));
  document.querySelectorAll("[data-rspr]").forEach(b=>b.onclick=()=>{PRES.sel=b.dataset.rspr;go("pres")});
  document.querySelectorAll("[data-rsdel]").forEach(b=>b.onclick=async()=>{
    const r=resAll().find(x=>x.id===b.dataset.rsdel);if(!r)return;
    const n=evoAll().filter(e=>e.res===r.id).length;
    if(n)return toast(`${resNome(r)} tem ${n} registro(s) clínico(s). O prontuário deve ser guardado: marque como "Desligado" em vez de excluir.`,true);
    if(!await askConfirm(`Excluir o cadastro de "${resNome(r)}"? A mensalidade recorrente dele também será encerrada.`,"Excluir"))return;
    resMensalidade({...r,sit:"Desligado"});resSave(resAll().filter(x=>x.id!==r.id));toast("Cadastro excluído.");re();
  });
}
function openResidente(id){
  const ed=id?resAll().find(r=>r.id===id):null,r=ed||{resp:{},meds:[],plano:{},gerarMens:true,diaVenc:10,sit:"Ativo",grau:1,entrada:hojeIso(),...((()=>{const p=window.RES_PRESET;window.RES_PRESET=null;return p||{}})())},rp=r.resp||{};
  const T=(i,l,v,x="")=>`<div><label>${l}</label><input id="${i}" value="${esc(v??"")}" ${x}></div>`;
  const ov=openModal(`<h3>${ed?"Editar residente":"Novo residente"}</h3>
   <h2>Identificação</h2><div class="row">${T("rnome","Nome completo *",r.nome)}${T("rapel","Como gosta de ser chamado(a)",r.apelido,'placeholder="Ex.: Dona Maria, Sr. Antônio"')}</div>
   <div class="row">${T("rnasc","Nascimento",r.nasc,'type="date"')}${T("rcpf","CPF",r.cpf,'inputmode="numeric"')}${T("rrg","RG",r.rg)}</div>
   <div class="row">${T("rquarto","Quarto ou leito",r.quarto)}<div><label>Grau de dependência (RDC 502/2021)</label><select id="rgrau">${[1,2,3].map(k=>`<option value="${k}" ${+r.grau===k?"selected":""}>${GRAUS[k]}</option>`).join("")}</select></div></div>
   <div class="row"><div><label>Situação</label><select id="rsit">${RES_SIT.map(x=>`<option ${(r.sit||"Ativo")===x?"selected":""}>${x}</option>`).join("")}</select></div>${T("rentrada","Entrada na casa",r.entrada,'type="date"')}${T("rsaida","Saída (se houver)",r.saida,'type="date"')}</div>
   <h2 style="margin-top:14px">Responsável legal</h2><div class="row">${T("rrn","Nome",rp.nome)}${T("rrp","Parentesco",rp.parent)}</div><div class="row">${T("rrt","Telefone",rp.tel)}${T("rre","E-mail",rp.email)}${T("rrc","CPF",rp.cpf,'inputmode="numeric"')}</div>
   <h2 style="margin-top:14px">Contrato e mensalidade</h2><div class="row">${T("rmens","Mensalidade (R$)",r.mensalidade||"",'type="number" min="0" step="1"')}${T("rdia","Dia do vencimento",r.diaVenc,'type="number" min="1" max="31"')}</div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="rger" ${r.gerarMens!==false?"checked":""}><span>Lançar a mensalidade todo mês em Contas a receber (sem data para acabar)</span></label>
   <h2 style="margin-top:14px">Saúde e imagem</h2><div class="row">${T("ralerg","Alergias",r.alergias,'placeholder="Ex.: dipirona, frutos do mar"')}${T("rplano","Plano de saúde",r.planoSaude)}</div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="rimg" ${r.imagemOk?"checked":""}><span>Autorização escrita de uso de imagem assinada</span></label>
   <label>Observações</label><input id="robs" value="${esc(r.obs||"")}"><div class="err" id="rerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="rcx">Cancelar</button><button class="b" id="rsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s);g("#rcx").onclick=()=>ov.remove();
  g("#rsv").onclick=()=>{
    const v=i=>g("#"+i).value.trim(),er=m=>g("#rerr").textContent=m,sit=g("#rsit").value;
    if(!v("rnome"))return er("Informe o nome completo.");
    if(v("rcpf")&&!validCPF(v("rcpf")))return er("CPF do residente inválido.");if(v("rrc")&&!validCPF(v("rrc")))return er("CPF do responsável inválido.");
    if((sit==="Desligado"||sit==="Óbito")&&!v("rsaida"))return er("Informe a data de saída.");
    {const dOk=(x,min,max)=>!x||(/^\d{4}-\d{2}-\d{2}$/.test(x)&&x>=min&&x<=max),hj=hojeIso();
     if(!dOk(v("rnasc"),"1900-01-01",hj))return er("Confira a data de nascimento (não pode ser futura nem anterior a 1900).");
     if(!dOk(v("rentrada"),"1990-01-01","2100-12-31"))return er("Confira a data de entrada (ano inválido).");
     if(!dOk(v("rsaida"),"1990-01-01","2100-12-31"))return er("Confira a data de saída (ano inválido).");
     if(v("rentrada")&&v("rsaida")&&v("rsaida")<v("rentrada"))return er("A saída não pode ser anterior à entrada.");
     if(v("rmens")&&(!isFinite(+v("rmens").replace(",","."))||+v("rmens").replace(",",".")<0||+v("rmens").replace(",",".")>1e7))return er("Confira a mensalidade (valor negativo ou inválido).");
     if(v("rdia")&&(!(+v("rdia")>=1&&+v("rdia")<=31)))return er("O dia de vencimento deve ficar entre 1 e 31.")}
    if(g("#rsv").dataset.busy)return;
    const nrm=x=>(x||"").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
    const avisos=[];
    if(!ed){const ativos=resAll().filter(x=>x.id!==(ed&&ed.id));
      if(ativos.some(x=>nrm(x.nome)===nrm(v("rnome"))))avisos.push("Já existe um residente com este nome.");
      if(v("rquarto")&&ativos.some(x=>resAtivo(x)&&nrm(x.quarto)===nrm(v("rquarto"))&&!/(coletivo|enfermaria)/.test(nrm(x.quarto))))avisos.push("O quarto "+v("rquarto")+" já tem outro residente ativo.")}
    const grava=()=>{
    g("#rsv").dataset.busy="1";
    const novo={...r,id:ed?ed.id:uid8(),nome:v("rnome"),apelido:v("rapel"),nasc:v("rnasc"),cpf:v("rcpf"),rg:v("rrg"),quarto:v("rquarto"),grau:+g("#rgrau").value,sit,entrada:v("rentrada"),saida:v("rsaida"),
      resp:{nome:v("rrn"),parent:v("rrp"),tel:v("rrt"),email:v("rre"),cpf:v("rrc")},mensalidade:+v("rmens")||0,diaVenc:+v("rdia")||10,gerarMens:g("#rger").checked,alergias:v("ralerg"),planoSaude:v("rplano"),imagemOk:g("#rimg").checked,obs:v("robs")};
    novo.recId=resMensalidade(novo)||novo.recId||null;
    resSave(ed?resAll().map(x=>x.id===ed.id?novo:x):[...resAll(),novo]);
    if(!ed&&typeof esperaAdmitido==="function")esperaAdmitido(novo);
    ov.remove();toast("Residente salvo.");go(ROUTE,true);
    };
    if(avisos.length){g("#rsv").dataset.busy="1";askConfirm(avisos.join(" ")+" Salvar mesmo assim?","Salvar mesmo assim").then(sim=>{delete g("#rsv").dataset.busy;if(sim)grava()})}else grava();
  };
}
/* ---------- prontuário multidisciplinar ---------- */
const PRES={sel:"",tab:"evo",catf:"",q:""};
const PRES_TABS=[["linha","Linha do tempo"],["evo","Evolução"],["med","Medicamentos em uso"],["saude","Saúde e alimentação"],["plano","Plano terapêutico"]];
function pgPres(){
  const rs=resAll().slice().sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")),r=rs.find(x=>x.id===PRES.sel)||rs.find(resAtivo)||rs[0];
  if(r)PRES.sel=r.id;
  const cab=banner("","Prontuário","Registro multidisciplinar do residente: evolução, medicamentos, alimentação e plano terapêutico.","clipboard")+noStore();
  if(!r)return cab+`<div class="empty">Cadastre um residente em “Residentes” para abrir o prontuário.</div>`;
  const evo=evoAll().filter(e=>e.res===r.id).sort((a,b)=>(b.data+(b.hora||"")).localeCompare(a.data+(a.hora||"")));
  const meds=(r.meds||[]),ativas=meds.filter(m=>!m.fim||m.fim>=hojeIso());
  let corpo="";
  if(PRES.tab==="linha"){corpo=linhaTempoHtml(r)}
  else if(PRES.tab==="evo"){
    const l=evo.filter(e=>(!PRES.catf||e.cat===PRES.catf)&&(!PRES.q||estNorm(e.texto+" "+(e.prof||"")).includes(estNorm(PRES.q))));
    corpo=`<div class="card"><div class="row" style="margin-bottom:10px;align-items:flex-end"><button class="b" id="pvnova" style="flex:none">${ic("plus")} Nova evolução</button>
     <div style="flex:0 0 200px"><label>Categoria</label><select id="pvcat"><option value="">Todas</option>${EVO_CATS.map(c=>`<option ${PRES.catf===c?"selected":""}>${c}</option>`).join("")}</select></div><div style="flex:2"><label>Buscar no texto</label><input id="pvq" value="${esc(PRES.q)}"></div></div>
     ${l.length?l.map(e=>`<div class="doc ${e.interc?"atn":""}" style="align-items:flex-start"><div class="grow"><div class="nm">${brDate(e.data)}${e.hora?" "+esc(e.hora):""} · ${esc(e.cat)}${e.interc?` <span class="pill s-pendencia">intercorrência</span>`:""}</div>
      <div style="margin-top:4px;white-space:pre-wrap">${esc(e.texto)}</div><div class="sub" style="margin-top:4px">${esc(e.prof||"—")}${e.retifica?" · retificação":""}</div></div>
      <button class="b sec sm" data-pvret="${e.id}" title="Registrar uma retificação">Retificar</button>${e.em&&e.em.slice(0,10)===hojeIso()?`<button class="b sec sm" data-pvdel="${e.id}" title="Excluir (só no dia do registro)">${ic("trash")}</button>`:""}</div>`).join(""):`<div class="empty">Nenhum registro de evolução${PRES.catf||PRES.q?" com esses filtros":" ainda"}.</div>`}
     <p class="sub" style="margin:10px 0 0">Registros não são editados depois do dia: para corrigir, use “Retificar”, que cria um novo registro ligado ao anterior.</p></div>`;
  }else if(PRES.tab==="med"){
    corpo=`<div class="card"><div class="row" style="margin-bottom:10px"><button class="b" id="pmnova" style="flex:none">${ic("plus")} Adicionar medicamento</button></div>
     ${meds.length?`<div class="wrap"><table><thead><tr><th>Medicamento</th><th>Dose e via</th><th>Horários</th><th>Início</th><th>Situação</th><th></th></tr></thead><tbody>${meds.slice().sort((a,b)=>(a.fim?1:0)-(b.fim?1:0)||a.nome.localeCompare(b.nome,"pt")).map(m=>`<tr><td><b>${esc(m.nome)}</b>${m.obs?`<div class="sub">${esc(m.obs)}</div>`:""}</td><td>${esc([m.dose,m.via].filter(Boolean).join(" · "))}</td><td>${esc(m.horarios||"—")}</td><td>${m.inicio?brDate(m.inicio):"—"}</td>
      <td>${!m.fim||m.fim>=hojeIso()?`<span class="pill s-ok">em uso</span>`:`<span class="pill s-falta">suspenso ${brDate(m.fim)}</span>`}</td><td style="white-space:nowrap">${!m.fim||m.fim>=hojeIso()?`<button class="b sec sm" data-pmsus="${m.id}">Suspender</button> `:""}<button class="b sec sm" data-pmdel="${m.id}">${ic("trash")}</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhum medicamento registrado.</div>`}
     <p class="sub" style="margin:10px 0 0">Registro interno da casa. A prescrição válida é a assinada pelo médico — guarde a via original no prontuário físico.</p></div>`;
  }else if(PRES.tab==="saude"){
    corpo=`<div class="card"><h2>Saúde e alimentação</h2><label>Alergias</label><textarea id="psa" style="min-height:50px">${esc(r.alergias||"")}</textarea><label>Restrições alimentares e consistência da dieta</label><textarea id="psr" style="min-height:60px">${esc(r.restricoes||"")}</textarea>
     <label>Diagnósticos e condições de saúde</label><textarea id="psd" style="min-height:70px">${esc(r.diag||"")}</textarea><div class="row" style="margin-top:12px"><button class="b" id="pssv" style="flex:none">Salvar</button></div></div>`;
  }else{
    const p=r.plano||{};
    corpo=`<div class="card"><h2>Plano terapêutico individual</h2><label>Objetivos (o que a pessoa quer e pode alcançar)</label><textarea id="ppo" style="min-height:70px">${esc(p.objetivos||"")}</textarea><label>Intervenções e responsáveis</label><textarea id="ppi" style="min-height:90px">${esc(p.intervencoes||"")}</textarea>
     <div class="row"><div style="flex:0 0 220px"><label>Próxima revisão</label><input type="date" id="ppr" value="${p.revisao||""}"></div><div class="sub" style="align-self:flex-end">${p.atualizadoEm?"Atualizado em "+brDate(p.atualizadoEm):"Ainda não preenchido"}. A Visão geral avisa quando a revisão vencer.</div></div>
     <div class="row" style="margin-top:12px"><button class="b" id="ppsv" style="flex:none">Salvar plano</button></div></div>`;
  }
  return cab+`<div class="card"><div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="pvres">${rs.map(x=>`<option value="${x.id}" ${x.id===r.id?"selected":""}>${esc(resNome(x))}${resAtivo(x)?"":" ("+(x.sit||"")+")"}</option>`).join("")}</select></div>
    <div style="flex:3"><div class="nm" style="font-size:16px"><b>${esc(r.nome)}</b> ${idadeDe(r.nasc)?`· ${idadeDe(r.nasc)} anos`:""} · quarto ${esc(r.quarto||"—")} · <span class="pill ${+r.grau===3?"s-pendencia":+r.grau===2?"s-atestado":"s-ok"}">${GRAU_CURTO[r.grau]||"—"}</span></div>
     <div class="sub">Responsável: ${esc((r.resp&&r.resp.nome)||"—")}${r.resp&&r.resp.tel?" · "+esc(r.resp.tel):""} · ${ativas.length} medicamento(s) em uso</div></div></div>
    ${(r.alergias||"").trim()?`<div class="callout sand" style="margin-top:10px"><b>Alergias:</b> ${esc(r.alergias)}</div>`:""}</div>
  <div class="tabs">${PRES_TABS.map(([k,l])=>`<button data-pvtab="${k}" class="${PRES.tab===k?"on":""}">${l}</button>`).join("")}</div>`+corpo+
  `<p class="sub">Registro interno e sigiloso (LGPD). Não substitui o prontuário oficial assinado nem a prescrição médica.</p>`;
}
function bindPres(){
  const re=()=>go("pres",true),r=resAll().find(x=>x.id===PRES.sel);
  const sv=$("pvres");if(sv)sv.onchange=()=>{PRES.sel=sv.value;re()};
  document.querySelectorAll("[data-pvtab]").forEach(b=>b.onclick=()=>{PRES.tab=b.dataset.pvtab;re()});
  const n=$("pvnova");if(n)n.onclick=()=>openEvolucao(r.id);
  const tp=$("tlper");if(tp)tp.onchange=()=>{TLINHA.dias=+tp.value;re()};
  document.querySelectorAll("[data-tltipo]").forEach(b=>b.onclick=()=>{const t=b.dataset.tltipo;TLINHA.tipos.has(t)?TLINHA.tipos.delete(t):TLINHA.tipos.add(t);re()});
  const c=$("pvcat");if(c)c.onchange=()=>{PRES.catf=c.value;re()};
  const q=$("pvq");if(q)q.oninput=()=>{PRES.q=q.value;re();const x=$("pvq");if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length)}};
  document.querySelectorAll("[data-pvret]").forEach(b=>b.onclick=()=>openEvolucao(r.id,evoAll().find(e=>e.id===b.dataset.pvret)));
  document.querySelectorAll("[data-pvdel]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir este registro? Só é possível no mesmo dia em que foi feito.","Excluir")){evoMutate(l=>l.filter(e=>e.id!==b.dataset.pvdel));re()}});
  const pm=$("pmnova");if(pm)pm.onclick=()=>openMed(r.id);
  document.querySelectorAll("[data-pmsus]").forEach(b=>b.onclick=()=>{resSave(resAll().map(x=>x.id===r.id?{...x,meds:(x.meds||[]).map(m=>m.id===b.dataset.pmsus?{...m,fim:hojeIso()}:m)}:x));toast("Medicamento suspenso.");re()});
  document.querySelectorAll("[data-pmdel]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Remover este medicamento da lista?","Remover")){resSave(resAll().map(x=>x.id===r.id?{...x,meds:(x.meds||[]).filter(m=>m.id!==b.dataset.pmdel)}:x));re()}});
  const ss=$("pssv");if(ss)ss.onclick=()=>{resSave(resAll().map(x=>x.id===r.id?{...x,alergias:$("psa").value.trim(),restricoes:$("psr").value.trim(),diag:$("psd").value.trim()}:x));toast("Saúde e alimentação salvas.");re()};
  const ps=$("ppsv");if(ps)ps.onclick=()=>{resSave(resAll().map(x=>x.id===r.id?{...x,plano:{objetivos:$("ppo").value.trim(),intervencoes:$("ppi").value.trim(),revisao:$("ppr").value||"",atualizadoEm:hojeIso()}}:x));toast("Plano terapêutico salvo.");re()};
}
function openEvolucao(resId,retifica){
  const ints=integList(),now=new Date();
  const ov=openModal(`<h3>${retifica?"Retificar registro":"Nova evolução"}</h3>${retifica?`<div class="callout sand" style="margin-bottom:10px">Corrige o registro de ${brDate(retifica.data)} ${esc(retifica.hora||"")} (${esc(retifica.cat)}). O original continua guardado.</div>`:""}
   <div class="row"><div><label>Data</label><input type="date" id="evd" value="${hojeIso()}"></div><div><label>Hora</label><input type="time" id="evh" value="${now.toTimeString().slice(0,5)}"></div>
   <div><label>Categoria</label><select id="evc">${EVO_CATS.map(c=>`<option ${(retifica?retifica.cat:"Enfermagem")===c?"selected":""}>${c}</option>`).join("")}</select></div></div>
   <label>Profissional</label><input id="evp" list="evpl" placeholder="Quem está registrando"><datalist id="evpl">${ints.map(i=>`<option value="${esc(nomeInteg(i))}${i.cargo?" — "+esc(i.cargo):""}">`).join("")}</datalist>
   ${retifica?"":`<label>Modelo de registro (opcional)</label><select id="evmod"><option value="">—</option>${EVO_MODELOS.map(([n],i)=>`<option value="${i}">${n}</option>`).join("")}</select>`}
   <label>Registro</label><textarea id="evt" style="min-height:110px" placeholder="Descreva o que foi observado e feito, sem julgar a pessoa."></textarea>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="evi"><span>Intercorrência (queda, febre, recusa alimentar, mudança de comportamento...)</span></label>
   <div class="err" id="everr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="evcx">Cancelar</button><button class="b" id="evsv">Registrar</button></div>`);
  const g=s=>ov.querySelector(s);g("#evcx").onclick=()=>ov.remove();
  const mm=g("#evmod");if(mm)mm.onchange=()=>{if(mm.value!==""){const t=g("#evt");t.value=(t.value?t.value+"\n":"")+EVO_MODELOS[+mm.value][1];t.focus()}};
  g("#evsv").onclick=()=>{
    const texto=g("#evt").value.trim(),data=g("#evd").value;if(!texto)return g("#everr").textContent="Escreva o registro.";if(!data)return g("#everr").textContent="Informe a data.";
    const novo={id:uid8(),res:resId,data,hora:g("#evh").value,cat:g("#evc").value,prof:g("#evp").value.trim(),texto:retifica?`Retificação do registro de ${brDate(retifica.data)} ${retifica.hora||""}: ${texto}`:texto,interc:g("#evi").checked,em:new Date().toISOString(),...(retifica?{retifica:retifica.id}:{})};
    evoMutate(l=>[...l,novo]);ov.remove();toast("Registro salvo.");go("pres",true);
  };
}
function openMed(resId){
  const ov=openModal(`<h3>Adicionar medicamento</h3><label>Medicamento</label><input id="mdn"><div class="row"><div><label>Dose</label><input id="mdd" placeholder="Ex.: 50 mg"></div><div><label>Via</label><input id="mdv" placeholder="Ex.: oral"></div></div>
   <div class="row"><div><label>Horários</label><input id="mdh" placeholder="Ex.: 8h e 20h"></div><div><label>Início</label><input type="date" id="mdi" value="${hojeIso()}"></div></div><label>Observação (prescritor, cuidados)</label><input id="mdo">
   <div class="err" id="mderr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="mdcx">Cancelar</button><button class="b" id="mdsv">Salvar</button></div>`);
  const g=s=>ov.querySelector(s);g("#mdcx").onclick=()=>ov.remove();
  g("#mdsv").onclick=()=>{
    const nome=g("#mdn").value.trim();if(!nome)return g("#mderr").textContent="Informe o medicamento.";
    resSave(resAll().map(x=>x.id===resId?{...x,meds:[...(x.meds||[]),{id:uid8(),nome,dose:g("#mdd").value.trim(),via:g("#mdv").value.trim(),horarios:g("#mdh").value.trim(),inicio:g("#mdi").value,obs:g("#mdo").value.trim(),fim:""}]}:x));
    ov.remove();toast("Medicamento adicionado.");go("pres",true);
  };
}
REPORTS.push(
 {id:"res_cadastro",g:"Residentes",t:"Residentes (cadastro)",d:"Grau de dependência, responsável, mensalidade e situação.",pii:true,b:()=>({titulo:"Residentes",sub:relSub({},false),sensivel:true,
   cols:[{h:"Residente",w:30},{h:"Como é chamado(a)",w:18},{h:"Idade",t:"num",w:8},{h:"Quarto",w:9},{h:"Grau",w:10},{h:"Situação",w:13},{h:"Entrada",t:"date",w:12},{h:"Responsável",w:26},{h:"Telefone",w:16},{h:"Mensalidade",t:"money",w:14},{h:"Imagem autorizada",w:12,c:true}],
   rows:resAll().slice().sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")).map(r=>[r.nome,r.apelido||"",idadeDe(r.nasc)||"",r.quarto||"",GRAU_CURTO[r.grau]||"",r.sit||"Ativo",r.entrada||"",(r.resp&&r.resp.nome)||"",(r.resp&&r.resp.tel)||"",+r.mensalidade||0,r.imagemOk?"Sim":"Não"]),tot:[null,null,null,null,null,null,null,null,null,"sum",null]})},
 {id:"res_meds",g:"Residentes",t:"Medicamentos em uso",d:"Lista de medicamentos, dose e horários por residente.",pii:true,b:()=>({titulo:"Medicamentos em uso",sub:relSub({},false),sensivel:true,
   cols:[{h:"Residente",w:28},{h:"Medicamento",w:28},{h:"Dose",w:14},{h:"Via",w:10},{h:"Horários",w:16},{h:"Início",t:"date",w:12},{h:"Observação",w:30}],
   rows:resAll().filter(resAtivo).flatMap(r=>(r.meds||[]).filter(m=>!m.fim||m.fim>=hojeIso()).map(m=>[resNome(r),m.nome,m.dose||"",m.via||"",m.horarios||"",m.inicio||"",m.obs||""]))})});


/* >>> x_core.js */
