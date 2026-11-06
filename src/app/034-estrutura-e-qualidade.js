/* ================= ESTRUTURA E QUALIDADE ================= */
/* ---------- patrimônio e manutenção ---------- */
const ATIVO_CATS=["Equipamento de cuidado (cama, cadeira, colchão)","Cozinha","Lavanderia","Elétrica e climatização","Segurança (extintor, alarme)","Informática","Veículo","Móvel","Outro"];
const ativosCrud={id:"ativos",col:"ativos",mod:"infra",novoLabel:"Cadastrar bem",novoTit:"Bem ou equipamento",
  campos:[{k:"nome",l:"Nome",req:true},{k:"cat",l:"Categoria",t:"sel",opts:ATIVO_CATS,req:true},{k:"local",l:"Local (cozinha, quarto 3…)"},{k:"serie",l:"Marca, modelo ou nº de série"},
    {k:"compra",l:"Data da compra",t:"date"},{k:"valor",l:"Valor (R$)",t:"money"},{k:"garantia",l:"Garantia até",t:"date"},{k:"forn",l:"Fornecedor",t:"pessoa"},{k:"estado",l:"Estado",t:"sel",opts:["em uso","em manutenção","baixado"],req:true,def:"em uso"},{k:"obs",l:"Observações",t:"ta",full:true}],
  padrao:()=>({estado:"em uso"}),
  cols:[{h:"Bem",html:r=>`<b>${esc(r.nome)}</b><div class="sub">${esc(r.serie||"")}</div>`},{h:"Categoria",v:r=>(r.cat||"").split(" (")[0]},{h:"Local",k:"local"},{h:"Garantia",html:r=>r.garantia?xPill(xSitData(r.garantia,30,"na garantia")[0],r.garantia<hojeIso()?"garantia vencida":"até "+brDate(r.garantia)):"—"},{h:"Estado",html:r=>xPill(r.estado==="em uso"?0:r.estado==="baixado"?2:1,r.estado)}],
  filtros:{l:"Estado",opts:["em uso","em manutenção","baixado"],fn:(r,f)=>r.estado===f},ordem:(a,b)=>a.nome.localeCompare(b.nome,"pt"),vazio:"Nenhum bem cadastrado.",busca:r=>(r.serie||"")+" "+(r.cat||"")};
const RECORR=[["","Não se repete"],["30","A cada mês"],["90","A cada 3 meses"],["180","A cada 6 meses"],["365","A cada ano"]];
const manutCrud={id:"manut",col:"manut",mod:"infra",novoLabel:"Nova manutenção",novoTit:"Manutenção",
  campos:[{k:"titulo",l:"O que precisa ser feito",req:true},{k:"ativo",l:"Bem ou equipamento",t:"sel",opts:()=>[["","—"],...xs("ativos").map(a=>[a.id,a.nome])]},{k:"tipo",l:"Tipo",t:"sel",opts:["preventiva","corretiva"],req:true,def:"preventiva"},
    {k:"data",l:"Data prevista",t:"date",req:true},{k:"resp",l:"Responsável (empresa ou pessoa)",t:"pessoa"},{k:"custo",l:"Custo previsto ou pago (R$)",t:"money"},{k:"recor",l:"Repetição",t:"sel",opts:RECORR,vazio:false,def:""},
    {k:"status",l:"Situação",t:"sel",opts:["aberta","feita"],req:true,def:"aberta"},{k:"feitaEm",l:"Feita em",t:"date"},{k:"obs",l:"Observações",t:"ta",full:true}],
  padrao:()=>({data:hojeIso(),tipo:"preventiva",status:"aberta",recor:""}),
  depois:(o,antigo)=>{
    if(o.status==="feita"&&(!antigo||antigo.status!=="feita")){
      if(o.recor){const base=o.feitaEm||hojeIso();put("manut",uid8(),{...strip(o),status:"aberta",feitaEm:"",data:addDaysIso(base,+o.recor),em:new Date().toISOString()});toast("Próxima manutenção agendada.")}
      if(+o.custo>0&&podeEd("fin")&&typeof finMutate==="function"&&!o.finOk){
        /* o custo vira conta prevista no Financeiro; o usuário confirma antes */
        askConfirm(`Lançar R$ ${NUMF(o.custo)} (${o.titulo}) no Financeiro como despesa?`,"Lançar").then(sim=>{if(!sim)return;
          const fo=pessoasTodas().find(p=>estNorm(p.nome)===estNorm(o.resp||""));
          finMutate(l=>[...l,{id:uid8(),tipo:"pagar",desc:"Manutenção — "+o.titulo,contra:o.resp||"",cat:"Manutenção",area:"",forma:"",obs:"lançado pela tela Manutenção",valor:+o.custo,venc:o.feitaEm||hojeIso(),pago:null,valorPago:null,manut:o.id}]);
          put("manut",o.id,{...strip(o),finOk:true});toast("Despesa lançada no Financeiro.")})}
    }
  },
  cols:[{h:"Quando",html:r=>r.status==="feita"?xPill(0,"feita "+brDate(r.feitaEm||r.data)):xPill(xSitData(r.data,15)[0]>=3?3:xDias(r.data)<=15?2:0,brDate(r.data))},{h:"O quê",html:r=>`<b>${esc(r.titulo)}</b><div class="sub">${esc(r.ativo&&S.ativos[r.ativo]?S.ativos[r.ativo].nome:"")} ${esc(r.resp||"")}</div>`},{h:"Tipo",k:"tipo"},{h:"Custo",v:r=>r.custo?"R$ "+NUMF(r.custo):""},{h:"Repete",v:r=>(RECORR.find(x=>x[0]===String(r.recor||""))||[0,""])[1].replace("Não se repete","")}],
  filtros:{l:"Situação",opts:["aberta","feita"],fn:(r,f)=>r.status===f},ordem:(a,b)=>(a.status==="feita")-(b.status==="feita")||a.data.localeCompare(b.data),vazio:"Nenhuma manutenção registrada.",busca:r=>r.resp||""};
/* ---------- checklists diários ---------- */
const CHK_PADRAO=[
  {nome:"Abertura do plantão",freq:"diário",itens:["Passagem de plantão feita","Residentes contados e conferidos","Medicação do turno separada","Campainhas e luzes de emergência funcionando","Ocorrências do plantão anterior lidas"]},
  {nome:"Limpeza e higienização",freq:"diário",itens:["Quartos e banheiros higienizados","Corredores e áreas comuns limpos","Lixo retirado e lixeiras higienizadas","Roupas de cama trocadas conforme escala","Álcool em gel e sabonete repostos"]},
  {nome:"Cozinha e higiene de alimentos",freq:"diário",itens:["Temperatura da geladeira conferida","Alimentos identificados e dentro da validade","Bancadas higienizadas","Manipuladores com uniforme e touca","Refeições conforme o cardápio do dia"]},
  {nome:"Segurança e emergência",freq:"semanal",itens:["Extintores no lugar e dentro da validade","Saídas de emergência desobstruídas","Pisos secos e sem obstáculos","Rampas e corrimãos em bom estado","Kit de primeiros socorros completo"]}];
const chkDe=id=>S.chk[id];
const chkCrud={id:"chk",col:"chk",mod:"infra",novoLabel:"Novo modelo de checklist",novoTit:"Modelo de checklist",
  campos:[{k:"nome",l:"Nome",req:true},{k:"freq",l:"Frequência",t:"sel",opts:["diário","semanal","mensal"],req:true,def:"diário"},{k:"itens",l:"Itens (um por linha)",t:"ta",req:true,full:true,alt:140}],
  padrao:()=>({freq:"diário"}),antes:f=>{f.itens=String(f.itens||"").split("\n").map(s=>s.trim()).filter(Boolean).join("\n")},
  cols:[{h:"Modelo",k:"nome"},{h:"Frequência",k:"freq"},{h:"Itens",v:r=>String(r.itens||"").split("\n").filter(Boolean).length}],vazio:"Nenhum modelo. Use “Carregar modelos padrão”.",
  botoes:[{l:"Carregar modelos padrão",fn:()=>{if(!podeEd("infra"))return toast("Seu perfil não permite.",true);const ja=new Set(xs("chk").map(c=>estNorm(c.nome)));let n=0;CHK_PADRAO.forEach(m=>{if(!ja.has(estNorm(m.nome))){put("chk",uid8(),{nome:m.nome,freq:m.freq,itens:m.itens.join("\n"),em:new Date().toISOString()});n++}});toast(n?n+" modelo(s) carregado(s).":"Os modelos padrão já estão carregados.");go("infra",true)}}]};
const chkChave=(c,d)=>c.freq==="mensal"?d.slice(0,7):c.freq==="semanal"?addDaysIso(d,-pyWeekday(d)):d;
const chkFeito=(c,d)=>xs("chkreg").find(r=>r.chk===c.id&&r.per===chkChave(c,d));
const CHK={por:""};
function chkHtml(){
  const h=hojeIso(),L=xs("chk").sort((a,b)=>a.nome.localeCompare(b.nome,"pt")),pode=podeEd("infra");
  const regs=xs("chkreg").sort((a,b)=>b.data.localeCompare(a.data)).slice(0,25);
  return `<div class="card"><h2>Checklists de hoje</h2>${pode?`<div style="max-width:320px"><label>Quem está preenchendo *</label><select id="chkpor"><option value=""></option>${xIntegOpts(CHK.por,true)}</select></div>`:""}
   ${L.length?L.map(c=>{const f=chkFeito(c,h),its=String(c.itens||"").split("\n").filter(Boolean);
     return `<div class="doc" style="align-items:flex-start;flex-wrap:wrap"><div class="grow"><div class="nm">${esc(c.nome)} <span class="sub">(${esc(c.freq)})</span></div>${f?`<div class="sub">feito em ${brDate(f.data)} ${esc(f.hora||"")} por ${esc(xNomeInteg(f.por))}${f.pend?` · <b>${f.pend} item(ns) com problema</b>`:""}</div>`:`<div class="sub">${its.length} itens</div>`}</div>${f?xPill(f.pend?2:0,f.pend?"feito, com pendências":"feito"):xPill(2,"a fazer")}${pode&&!f?`<button class="b sm" data-chkfaz="${c.id}">Preencher</button>`:""}</div>`}).join(""):`<div class="empty">Nenhum modelo ainda. Carregue os modelos padrão abaixo.</div>`}</div>
   ${xcrud(chkCrud)}
   <div class="card"><h2>Últimos preenchimentos</h2>${regs.map(r=>`<div class="doc"><div class="grow"><div class="nm">${esc((chkDe(r.chk)||{}).nome||r.nomeChk||"(modelo removido)")} — ${brDate(r.data)}</div><div class="sub">${esc(xNomeInteg(r.por))}${r.obs?" · "+esc(r.obs):""}</div></div>${xPill(r.pend?2:0,r.pend?r.pend+" problema(s)":"tudo certo")}</div>`).join("")||`<div class="empty">Nenhum checklist preenchido.</div>`}</div>`;
}
function chkPreencher(id){
  const c=chkDe(id),its=String(c.itens||"").split("\n").filter(Boolean);
  const ov=openModal(`<h3>${esc(c.nome)}</h3><p class="sub">${brDate(hojeIso())}. Marque o que está em ordem; o que ficar desmarcado vira pendência.</p>${its.map((t,i)=>`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin:6px 0"><input type="checkbox" data-ci="${i}" checked><span>${esc(t)}</span></label>`).join("")}
   <label>Observações</label><input id="chobs"><div class="err" id="cherr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="chcx">Cancelar</button><button class="b" id="chok">Concluir</button></div>`);
  ov.querySelector("#chcx").onclick=()=>ov.remove();
  ov.querySelector("#chok").onclick=()=>{
    if(!CHK.por)return ov.querySelector("#cherr").textContent="Escolha quem está preenchendo (campo na tela anterior).";
    const falhas=its.filter((t,i)=>!ov.querySelector(`[data-ci="${i}"]`).checked);
    put("chkreg",uid8(),{chk:id,nomeChk:c.nome,per:chkChave(c,hojeIso()),data:hojeIso(),hora:agoraHM(),por:CHK.por,pend:falhas.length,falhas,obs:ov.querySelector("#chobs").value.trim(),em:new Date().toISOString()});
    if(falhas.length&&podeEd("agenda"))tarMutate(l=>[...l,{id:uid8(),titulo:`Corrigir: ${falhas[0]}${falhas.length>1?" (+"+(falhas.length-1)+")":""}`,data:hojeIso(),hora:"",prio:"alta",resp:"",area:"",desc:`Itens com problema no checklist “${c.nome}”:\n- ${falhas.join("\n- ")}`,status:"aberta",feitaEm:null,grupo:null}]);
    ov.remove();toast(falhas.length?"Concluído. Criei uma tarefa para corrigir os problemas.":"Checklist concluído.");go("infra",true);
  };
}
function bindChk(){
  const p=$("chkpor");if(p)p.onchange=()=>{CHK.por=p.value};
  document.querySelectorAll("[data-chkfaz]").forEach(b=>b.onclick=()=>chkPreencher(b.dataset.chkfaz));
}
/* ---------- ouvidoria ---------- */
const ouvCrud={id:"ouv",col:"ouv",mod:"infra",novoLabel:"Registrar manifestação",novoTit:"Manifestação (reclamação, sugestão ou elogio)",
  campos:[{k:"data",l:"Data",t:"date",req:true},{k:"tipo",l:"Tipo",t:"sel",opts:["reclamação","sugestão","elogio","denúncia"],req:true,def:"reclamação"},{k:"origem",l:"Quem manifestou",t:"pessoa"},{k:"res",l:"Residente relacionado (se houver)",t:"res",todos:true},
    {k:"canal",l:"Canal",t:"sel",opts:["pessoalmente","telefone","WhatsApp","e-mail","caixa de sugestões"],def:"pessoalmente"},{k:"prazo",l:"Prazo para responder",t:"date"},{k:"texto",l:"O que foi dito",t:"ta",req:true,full:true},
    {k:"status",l:"Situação",t:"sel",opts:["aberta","em análise","respondida","arquivada"],req:true,def:"aberta"},{k:"resp",l:"Resposta dada e providências",t:"ta",full:true}],
  padrao:()=>({data:hojeIso(),prazo:addDaysIso(hojeIso(),7),tipo:"reclamação",status:"aberta"}),
  resumo:L=>{const ab=L.filter(x=>x.status==="aberta"||x.status==="em análise");return `<div class="stats"><div class="stat ${ab.length?"warn":""}"><b>${ab.length}</b><span>em aberto</span></div><div class="stat"><b>${L.filter(x=>x.tipo==="elogio").length}</b><span>elogios</span></div><div class="stat"><b>${L.filter(x=>x.tipo==="reclamação").length}</b><span>reclamações</span></div></div>`},
  cols:[{h:"Data",v:r=>brDate(r.data)},{h:"Tipo",k:"tipo"},{h:"Quem",k:"origem"},{h:"Assunto",v:r=>String(r.texto||"").slice(0,70)},{h:"Prazo",html:r=>r.status==="respondida"||r.status==="arquivada"?"—":xPill(xSitData(r.prazo,3)[0]>=3?3:xDias(r.prazo)<=2?2:0,brDate(r.prazo))},{h:"Situação",html:r=>xPill(r.status==="respondida"||r.status==="arquivada"?0:1,r.status)}],
  filtros:{l:"Situação",opts:["aberta","em análise","respondida","arquivada"],fn:(r,f)=>r.status===f},ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhuma manifestação registrada.",busca:r=>r.texto};
/* ---------- fiscalização ---------- */
function fiscItens(){
  const h=hojeIso(),L=[],add=(grupo,item,sit,det)=>L.push([grupo,item,sit,det]);
  dvAll().forEach(d=>{const i=dvInfo(d);add("Documentos",d.nome,i.label,`${dvVinc(d)} · validade ${brDate(d.validade)}`)});
  const M=typeof treinMatriz==="function"?treinMatriz():[];
  const nunca=M.filter(x=>x.s.n===3).length,vig=M.filter(x=>x.s.n===0).length;
  add("Treinamentos","Treinamentos obrigatórios em dia",`${vig} de ${M.length}`,nunca?`${nunca} nunca registrado(s)`:"");
  const cap=capacidadeCasa(),at=resAll().filter(resAtivo),g=[1,2,3].map(k=>at.filter(r=>+r.grau===k).length);
  add("Residentes","Residentes ativos",String(at.length),`Grau I: ${g[0]} · Grau II: ${g[1]} · Grau III: ${g[2]}${cap?" · capacidade "+cap:""}`);
  const mes=h.slice(0,7),oc=xs("ocor2").filter(o=>(String(o.data||"")).startsWith(mes));
  OCO_RDC.forEach(t=>add("Eventos do mês (RDC 502)",t,String(oc.filter(o=>o.tipo===t).length),"mês "+mes));
  add("Manutenção","Manutenções vencidas",String(xs("manut").filter(m=>m.status==="aberta"&&m.data<h).length),"");
  add("Manutenção","Preventivas feitas nos últimos 12 meses",String(xs("manut").filter(m=>m.status==="feita"&&m.tipo==="preventiva"&&(m.feitaEm||m.data)>=addDaysIso(h,-365)).length),"");
  const dias30=addDaysIso(h,-30);add("Checklists","Preenchimentos nos últimos 30 dias",String(xs("chkreg").filter(r=>r.data>=dias30).length),`${xs("chkreg").filter(r=>r.data>=dias30&&r.pend).length} com pendência`);
  add("Ouvidoria","Manifestações em aberto",String(xs("ouv").filter(o=>o.status==="aberta"||o.status==="em análise").length),"");
  return L;
}
function fiscHtml(){
  const L=fiscItens(),grupos=[...new Set(L.map(x=>x[0]))];
  return `<div class="card"><h2>Pacote de fiscalização</h2><p class="sub" style="margin:0 0 10px">Reúne em uma tela o que a vigilância sanitária costuma pedir: documentos e validades, treinamentos, perfil dos residentes, eventos do mês, manutenção, checklists e ouvidoria. Baixe tudo em um clique ou imprima pela Central de relatórios (grupo Fiscalização).</p>
   <div class="row"><button class="b" id="fiscbx" style="flex:none">${ic("down")} Baixar relatórios de fiscalização</button><button class="b sec" id="fiscrel" style="flex:none">Abrir Central de relatórios</button></div></div>
   ${grupos.map(g=>`<div class="card"><h2>${esc(g)}</h2><div class="wrap"><table><tbody>${L.filter(x=>x[0]===g).map(x=>`<tr><td>${esc(x[1])}</td><td><b>${esc(x[2])}</b></td><td class="sub">${esc(x[3])}</td></tr>`).join("")}</tbody></table></div></div>`).join("")}`;
}
function bindFisc(){
  const b=$("fiscbx");if(b)b.onclick=()=>{try{relBaixar(["inf_fisc","inf_chk","inf_manut"],["xlsx"])}catch(e){toast("Abra a Central de relatórios e escolha o grupo Fiscalização.",true)}};
  const r=$("fiscrel");if(r)r.onclick=()=>go("rel");
}
function assinHtml(){
  const L=xs("assin").sort((a,b)=>b.em.localeCompare(a.em)).slice(0,60);
  return `<div class="card"><h2>Assinaturas eletrônicas registradas</h2><p class="sub" style="margin:0 0 10px">Termos de EPI, contratos e demais documentos assinados no sistema. Cada assinatura guarda nome, data, hora e um selo que prova que o texto não foi alterado.</p>
   ${L.map(a=>`<div class="doc"><div class="grow"><div class="nm">${esc(a.titulo||a.tipo||"Assinatura")}</div><div class="sub">${esc(a.nome)} · ${brDate(String(a.em||"").slice(0,10))}</div></div>${assinChip(a.id)}</div>`).join("")||`<div class="empty">Nenhuma assinatura registrada.</div>`}</div>`;
}
xpage("infra","Estrutura e qualidade","Manutenção, patrimônio, checklists diários, ouvidoria, assinaturas e o pacote para fiscalização.","shield",[
  {k:"chk",l:"Checklists",html:chkHtml,bind:bindChk},
  {k:"manut",l:"Manutenção",html:()=>xcrud(manutCrud)},
  {k:"ativos",l:"Patrimônio",html:()=>xcrud(ativosCrud)},
  {k:"ouv",l:"Ouvidoria",html:()=>xcrud(ouvCrud)},
  {k:"fisc",l:"Fiscalização",html:fiscHtml,bind:bindFisc},
  {k:"assin",l:"Assinaturas",html:assinHtml}
]);
XURG.push((L,h)=>{
  if(!podeVer("infra"))return;
  xs("manut").filter(m=>m.status==="aberta"&&xDias(m.data)<=15).forEach(m=>{const n=xDias(m.data);L.push({nivel:n<0?3:n<=3?2:1,tipo:"Manutenção",titulo:`${m.titulo}${m.ativo&&S.ativos[m.ativo]?" — "+S.ativos[m.ativo].nome:""}`,detalhe:n<0?`atrasada ${-n} dia(s)`:`prevista para ${brDate(m.data)}`,quando:m.data,rota:"infra",res:{k:"infman"},resLabel:"Abrir"})});
  xs("ativos").filter(a=>a.garantia&&a.estado!=="baixado"&&xDias(a.garantia)>=0&&xDias(a.garantia)<=30).forEach(a=>L.push({nivel:1,tipo:"Patrimônio",titulo:`Garantia de ${a.nome} termina em ${xDias(a.garantia)} dia(s)`,detalhe:"revise o equipamento antes de acabar",quando:a.garantia,rota:"infra",res:{k:"infati"},resLabel:"Ver"}));
  const hora=new Date().getHours();
  xs("chk").filter(c=>c.freq==="diário").forEach(c=>{if(hora>=10&&!chkFeito(c,h))L.push({nivel:2,tipo:"Checklist",titulo:`Checklist “${c.nome}” de hoje não foi preenchido`,detalhe:"preencha no começo do turno",quando:h,rota:"infra",res:{k:"infchk"},resLabel:"Preencher"})});
  xs("chk").filter(c=>c.freq==="semanal").forEach(c=>{if(pyWeekday(h)>=2&&!chkFeito(c,h))L.push({nivel:1,tipo:"Checklist",titulo:`Checklist semanal “${c.nome}” pendente`,detalhe:"ainda não foi feito nesta semana",quando:h,rota:"infra",res:{k:"infchk"},resLabel:"Preencher"})});
  xs("ouv").filter(o=>(o.status==="aberta"||o.status==="em análise")&&o.prazo&&xDias(o.prazo)<=2).forEach(o=>L.push({nivel:xDias(o.prazo)<0?3:2,tipo:"Ouvidoria",titulo:`Responder ${o.tipo}${o.origem?" de "+o.origem:""}`,detalhe:xDias(o.prazo)<0?`prazo vencido há ${-xDias(o.prazo)} dia(s)`:`prazo ${brDate(o.prazo)}`,quando:o.prazo,rota:"infra",res:{k:"infouv"},resLabel:"Responder"}));
});
const irInfra=t=>()=>{PGX.infra.st.tab=t;go("infra")};
XRES.infman=irInfra("manut");XRES.infati=irInfra("ativos");XRES.infchk=irInfra("chk");XRES.infouv=irInfra("ouv");
XEVENTOS.push(pre=>[...xs("manut").filter(m=>m.status==="aberta"&&(String(m.data||"")).startsWith(pre)&&podeVer("infra")).map(m=>({id:m.id,nome:"Manutenção: "+m.titulo,validade:m.data,aviso:5,vinc:"casa"})),
  ...xs("ouv").filter(o=>(o.status==="aberta"||o.status==="em análise")&&o.prazo&&(String(o.prazo||"")).startsWith(pre)&&podeVer("infra")).map(o=>({id:o.id,nome:"Responder "+o.tipo,validade:o.prazo,aviso:2,vinc:"casa"}))]);
REPORTS.push(
 {id:"inf_fisc",g:"Fiscalização",t:"Pacote de fiscalização (resumo geral)",d:"Documentos, treinamentos, perfil dos residentes, eventos do mês, manutenção, checklists e ouvidoria.",pii:false,b:()=>({titulo:"Pacote de fiscalização",sub:relSub({},false),sensivel:false,cols:[{h:"Assunto",w:24},{h:"Item",w:42},{h:"Situação",w:22},{h:"Detalhe",w:46}],rows:fiscItens()})},
 {id:"inf_chk",g:"Fiscalização",t:"Checklists preenchidos",d:"Registro dos checklists diários, semanais e mensais, com problemas encontrados.",pii:false,b:()=>({titulo:"Checklists preenchidos",sub:relSub({},false),sensivel:false,cols:[{h:"Data",t:"date",w:12},{h:"Checklist",w:30},{h:"Responsável",w:24},{h:"Problemas",t:"num",w:10},{h:"Itens com problema",w:50}],rows:xs("chkreg").sort((a,b)=>b.data.localeCompare(a.data)).map(r=>[r.data,r.nomeChk||"",xNomeInteg(r.por),r.pend||0,(r.falhas||[]).join("; ")])})},
 {id:"inf_manut",g:"Fiscalização",t:"Manutenções e equipamentos",d:"Manutenções preventivas e corretivas, custo e situação.",pii:false,b:()=>({titulo:"Manutenções",sub:relSub({},false),sensivel:false,cols:[{h:"Data",t:"date",w:12},{h:"Manutenção",w:36},{h:"Equipamento",w:28},{h:"Tipo",w:12},{h:"Situação",w:12},{h:"Custo",t:"money",w:12}],rows:xs("manut").sort((a,b)=>b.data.localeCompare(a.data)).map(m=>[m.data,m.titulo,m.ativo&&S.ativos[m.ativo]?S.ativos[m.ativo].nome:"",m.tipo,m.status,+m.custo||0])})},
 {id:"inf_ativos",g:"Fiscalização",t:"Patrimônio",d:"Bens e equipamentos, local, valor e garantia.",pii:false,b:()=>({titulo:"Patrimônio",sub:relSub({},false),sensivel:false,cols:[{h:"Bem",w:30},{h:"Categoria",w:28},{h:"Local",w:18},{h:"Compra",t:"date",w:12},{h:"Valor",t:"money",w:12},{h:"Garantia",t:"date",w:12},{h:"Estado",w:12}],rows:xs("ativos").sort(ativosCrud.ordem).map(a=>[a.nome,a.cat||"",a.local||"",a.compra||"",+a.valor||0,a.garantia||"",a.estado])})},
 {id:"inf_ouv",g:"Fiscalização",t:"Ouvidoria",d:"Reclamações, sugestões e elogios com prazo e resposta.",pii:true,b:()=>({titulo:"Ouvidoria",sub:relSub({},false),sensivel:true,cols:[{h:"Data",t:"date",w:12},{h:"Tipo",w:14},{h:"Quem",w:22},{h:"Situação",w:14},{h:"Manifestação",w:50},{h:"Resposta",w:44}],rows:xs("ouv").sort((a,b)=>b.data.localeCompare(a.data)).map(o=>[o.data,o.tipo,o.origem||"",o.status,o.texto,o.resp||""])})}
);


/* >>> x_fin2.js */
