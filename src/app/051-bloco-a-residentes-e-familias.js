/* ===== Bloco A: residentes e famílias (itens 1–35) ===== */
const xrCfg=()=>xmcfg("res");
const xrSave=p=>xmsave("res",p);
const xrFoto=id=>(xcfg("foto_"+id)||{}).d||"";
function xrCns(v){
  const d=String(v||"").replace(/\D/g,"");if(d.length!==15)return false;
  if(/^[12]/.test(d)){const s=[...d.slice(0,11)].reduce((t,c,i)=>t+ +c*(15-i),0);let dv=11-(s%11);if(dv===11)dv=0;let r;if(dv===10){const s2=s+2;dv=11-(s2%11);if(dv===11)dv=0;r=d.slice(0,11)+"001"+dv}else r=d.slice(0,11)+"000"+dv;return r===d}
  if(/^[789]/.test(d))return [...d].reduce((t,c,i)=>t+ +c*(15-i),0)%11===0;
  return false;
}
/* ---------- histórico de alterações cadastrais (34) e de quartos (6) ---------- */
const XR_CAMPOS={nome:"Nome",apelido:"Apelido",quarto:"Quarto",grau:"Grau de dependência",sit:"Situação",mensalidade:"Mensalidade",diaVenc:"Dia do vencimento",cpf:"CPF",rg:"RG",alergias:"Alergias",planoSaude:"Plano de saúde",entrada:"Entrada",saida:"Saída",imagemOk:"Autorização de imagem",nasc:"Nascimento"};
function xrDiff(velho,novo){
  const out=[],ts=new Date().toISOString(),u=(typeof f4Quem==="function"&&f4Quem())||"";
  novo.forEach(n=>{const o=velho.find(x=>x.id===n.id);
    if(!o){out.push({t:ts,u,res:n.id,campo:"Cadastro",de:"",para:"criado"});return}
    Object.keys(XR_CAMPOS).forEach(k=>{if(String(o[k]??"")!==String(n[k]??""))out.push({t:ts,u,res:n.id,campo:XR_CAMPOS[k],k,de:String(o[k]??""),para:String(n[k]??"")})});
    const ro=o.resp||{},rn=n.resp||{};[["nome","Responsável"],["tel","Telefone do responsável"],["email","E-mail do responsável"]].forEach(([k,l])=>{if(String(ro[k]??"")!==String(rn[k]??""))out.push({t:ts,u,res:n.id,campo:l,de:String(ro[k]??""),para:String(rn[k]??"")})});
  });
  velho.forEach(o=>{if(!novo.some(n=>n.id===o.id))out.push({t:ts,u,res:o.id,campo:"Cadastro",de:o.nome||"",para:"excluído"})});
  return out;
}
{const orig=resSave;
 resSave=function(l){try{const d=xrDiff(resAll(),l);if(d.length)xrSave({hist:[...(xrCfg().hist||[]),...d].slice(-1500)})}catch(e){console.error(e)}return orig(l)};}
function xrHistHtml(){
  const H=(xrCfg().hist||[]).slice().reverse(),sel=XM.sim.xrh||"",L=H.filter(h=>!sel||h.res===sel);
  return f6Card("Histórico de alterações do cadastro","Quem mudou o quê e quando, em cada residente. Fica guardado neste navegador junto com os dados.",
   `<div class="row"><div><label>Residente</label><select id="xrhs"><option value="">Todos</option>${xmResOpts().map(([i,n])=>`<option value="${i}" ${sel===i?"selected":""}>${f6Esc(n)}</option>`).join("")}</select></div></div>`+(L.length?f6Tbl(["Quando","Quem","Residente","Campo","De","Para"],[L.slice(0,150).map(h=>`<tr><td class="n">${brDate(h.t.slice(0,10))} ${h.t.slice(11,16)}</td><td>${f6Esc(h.u||"—")}</td><td>${f6Esc(xmResNome(h.res)||"(excluído)")}</td><td>${f6Esc(h.campo)}</td><td>${f6Esc(h.de)}</td><td>${f6Esc(h.para)}</td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma alteração registrada ainda.</div>`));
}
xmReg("res","hist","Cadastro e identificação","Histórico de alterações",xrHistHtml,()=>{const s=$("xrhs");if(s)s.onchange=()=>{XM.sim.xrh=s.value;xmGo()}});
/* ---------- foto, cartão e etiquetas (1, 31, 32) ---------- */
function xrCartaoHtml(r){
  const emp=empresa(),f=xrFoto(r.id);
  return `<div class="cartao"><div style="display:flex;gap:8px"><div style="width:2.2cm;height:2.8cm;background:#eee;border:1px solid #999;display:flex;align-items:center;justify-content:center">${f?`<img src="${f}" style="width:100%;height:100%;object-fit:cover">`:"sem foto"}</div><div><b style="font-size:14px">${f6Esc(resNome(r))}</b><br>${r.nasc?brDate(r.nasc)+" ("+idadeDe(r.nasc)+" anos)<br>":""}Quarto: ${f6Esc(r.quarto||"—")}<br>${(r.alergias||"").trim()?`<b style="color:#b00">ALERGIA: ${f6Esc(r.alergias)}</b><br>`:""}${r.planoSaude?"Plano: "+f6Esc(r.planoSaude)+"<br>":""}</div></div><div style="margin-top:6px;border-top:1px solid #999;padding-top:4px">Responsável: ${f6Esc((r.resp&&r.resp.nome)||"—")} ${f6Esc((r.resp&&r.resp.tel)||"")}<br><small>${f6Esc(emp.razao||"")}</small></div></div>`;
}
function xrFotosHtml(){
  const L=resAll().filter(resAtivo).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")),ed=podeEd("res");
  return f6Card("Fotos, cartão de identificação e etiquetas","A foto é reduzida automaticamente. Use o cartão para a equipe e para consultas externas, e a etiqueta para pulseira ou porta do quarto.",
   `<div class="row" style="margin-bottom:8px"><button class="b sec sm" id="xrcart">Cartões de todos (imprimir)</button><button class="b sec sm" id="xrpuls">Pulseiras de todos (imprimir)</button></div>`+f6Tbl(["","Residente","Quarto",""],[L.map(r=>`<tr><td>${xrFoto(r.id)?`<img src="${xrFoto(r.id)}" style="width:44px;height:56px;object-fit:cover;border-radius:6px">`:"—"}</td><td>${f6Esc(resNome(r))}</td><td class="n">${f6Esc(r.quarto||"—")}</td><td>${ed?`<label class="b sec sm" style="cursor:pointer">Foto<input type="file" accept="image/*" hidden data-xrfoto="${r.id}"></label> `:""}<button class="b sec sm" data-xrc1="${r.id}">Cartão</button></td></tr>`).join("")],"txt"));
}
function xrFotoRedimensiona(file,max){
  return new Promise((ok,er)=>{const rd=new FileReader();rd.onerror=()=>er(new Error("arquivo ilegível"));rd.onload=()=>{const im=new Image();im.onerror=()=>er(new Error("imagem inválida"));im.onload=()=>{const m=max||240,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.7))};im.src=rd.result};rd.readAsDataURL(file)});
}
xmReg("res","fotos","Cadastro e identificação","Fotos, cartão e pulseira",xrFotosHtml,()=>{
  document.querySelectorAll("[data-xrfoto]").forEach(i=>i.onchange=async()=>{try{const d=await xrFotoRedimensiona(i.files[0]);xcfgSave("foto_"+i.dataset.xrfoto,{d});toast("Foto salva.");xmGo()}catch(e){toast("Não foi possível usar a foto: "+e.message,true)}});
  document.querySelectorAll("[data-xrc1]").forEach(b=>b.onclick=()=>xmPrint("Cartão de identificação",xrCartaoHtml(resAll().find(r=>r.id===b.dataset.xrc1))));
  $("xrcart").onclick=()=>xmPrint("Cartões de identificação",resAll().filter(resAtivo).map(xrCartaoHtml).join(""));
  $("xrpuls").onclick=()=>xmPrint("Pulseiras",resAll().filter(resAtivo).map(r=>`<div class="pulseira"><b>${f6Esc(resNome(r))}</b> · ${r.nasc?brDate(r.nasc):"—"} · quarto ${f6Esc(r.quarto||"—")}${(r.alergias||"").trim()?` · <b>ALERGIA: ${f6Esc(r.alergias)}</b>`:""}</div>`).join(""));
});
/* ---------- perfil pessoal, biografia e documentos (17, 18, 20) ---------- */
const xrPerfil=xmFicha({mod:"res",key:"perfil",titulo:"Perfil pessoal, preferências e biografia",sub:"Para a equipe conhecer a pessoa: como gosta de ser tratada, o que come, o que a acalma. Também guarda o cartão SUS.",
  campos:[{k:"cns",l:"Cartão Nacional de Saúde (SUS)",t:"text"},{k:"religiao",l:"Religião e práticas"},{k:"comida",l:"Comidas e bebidas de que gosta"},{k:"naogosta",l:"O que não gosta ou não aceita"},{k:"horarios",l:"Horários e rotina preferidos (acordar, banho, sono)"},{k:"musica",l:"Músicas, programas e atividades que gosta",t:"textarea"},{k:"acalma",l:"O que acalma quando está agitado(a)",t:"textarea"},{k:"bio",l:"História de vida (profissão, família, lugares, marcos)",t:"textarea"},{k:"estadocivil",l:"Estado civil"},{k:"escolaridade",l:"Escolaridade e profissão anterior"}],
  ok:v=>v.cns&&!xrCns(v.cns)?"Número do cartão SUS inválido (confira os 15 dígitos).":null}
);
xmReg("res","perfil","Cadastro e identificação","Perfil e biografia",xrPerfil.html,xrPerfil.bind);
/* ---------- contatos, responsáveis e visitas permitidas (8, 9, 10, 19) ---------- */
const xrContatos=xmRegistro({mod:"res",key:"contatos",res:true,titulo:"Contatos, responsáveis e permissão de visita",sub:"Quem a casa deve chamar, em que ordem, e quem pode ou não visitar. Vale para vários contatos por residente.",novo:"Novo contato",
  campos:[{k:"nome",l:"Nome"},{k:"parent",l:"Parentesco ou vínculo"},{k:"tel",l:"Telefone"},{k:"email",l:"E-mail"},{k:"papel",l:"Papel",t:"select",opts:["Emergência","Responsável financeiro","Responsável pela saúde","Representante legal","Visitante","Outro"]},{k:"prio",l:"Ordem para ligar em emergência (1 = primeiro)",t:"number",d:1},{k:"visita",l:"Visitas",t:"select",opts:[["livre","Permitidas"],["agendada","Somente agendadas"],["supervisionada","Somente com a equipe presente"],["proibida","Proibidas (decisão judicial ou da família)"]]},{k:"obs",l:"Observações"}],
  ok:v=>v.nome.trim()?null:"Informe o nome.",
  cols:[[x=>f6Esc(x.nome),"Contato"],[x=>f6Esc(x.parent||""),"Vínculo"],[x=>f6Esc(x.tel||""),"Telefone"],[x=>f6Esc(x.papel||""),"Papel"],[x=>x.prio||"—","Ordem","n"],[x=>({livre:"permitidas",agendada:"agendadas",supervisionada:"supervisionadas",proibida:`<b style="color:#c62828">PROIBIDAS</b>`}[x.visita]||"permitidas"),"Visitas"]]});
xmReg("res","contatos","Cadastro e identificação","Contatos e vínculos",xrContatos,()=>{});
/* ---------- pertences (4, 5) ---------- */
const xrPertences=xmRegistro({mod:"res",key:"pertences",res:true,titulo:"Inventário de pertences",sub:"O que o residente trouxe e o estado de cada peça. Faça uma nova conferência de tempos em tempos e registre a data.",novo:"Registrar pertence",
  campos:[{k:"item",l:"Item"},{k:"qtd",l:"Quantidade",t:"number",d:1},{k:"estado",l:"Estado",t:"select",opts:["Novo","Bom","Usado","Danificado"]},{k:"valor",l:"Valor estimado (R$, opcional)",t:"number"},{k:"entrega",l:"Entregue por"},{k:"data",l:"Data da entrada",t:"date",d:hojeIso},{k:"conf",l:"Última conferência",t:"date"},{k:"sit",l:"Situação",t:"select",opts:[["na casa","Na casa"],["devolvido","Devolvido à família"],["perdido","Extraviado"],["descartado","Descartado"]]},{k:"obs",l:"Observações"}],
  ok:v=>v.item.trim()?null:"Informe o item.",
  cols:[[x=>f6Esc(x.item),"Item"],[x=>x.qtd||1,"Qtd","n"],[x=>f6Esc(x.estado||""),"Estado"],[x=>x.valor?f6Money(x.valor):"—","Valor","n"],[x=>x.conf?brDate(x.conf):`<span class="sub">nunca</span>`,"Conferido em","n"],[x=>f6Esc(x.sit||"na casa"),"Situação"]],
  extra:x=>(x.sit||"na casa")==="na casa"?xmAcao(XMREG["res|pertences"],x.id,"conf","Conferi hoje"):"",acoes:{conf:()=>({conf:hojeIso()})},
  topo:()=>`<button class="b sec sm" id="xrpdf" style="align-self:flex-end">Inventário (PDF)</button>`});
xmReg("res","pertences","Cadastro e identificação","Pertences",xrPertences,()=>{const b=$("xrpdf");if(b)b.onclick=()=>{const sel=XM.sim["f_respertences"]||"",L=(xrCfg().pertences||[]).filter(x=>!sel||x.res===sel);if(!L.length)return toast("Nenhum pertence para listar.",true);f5Pdf("inventario-pertences.pdf",[{titulo:"Inventário de pertences",sub:sel?xmResNome(sel):"Todos os residentes",cols:[{h:"Residente",w:24},{h:"Item",w:28},{h:"Qtd",w:6},{h:"Estado",w:12},{h:"Situação",w:14},{h:"Conferido em",t:"date",w:14}],rows:L.map(x=>[xmResNome(x.res),x.item,+x.qtd||1,x.estado||"",x.sit||"na casa",x.conf||""])}])}});
/* ---------- mapa de quartos e histórico (6, 7) ---------- */
function xrMapaHtml(){
  const at=resAll().filter(resAtivo),q={};at.forEach(r=>{const k=(r.quarto||"").trim()||"(sem quarto)";(q[k]=q[k]||[]).push(r)});
  const ks=Object.keys(q).sort((a,b)=>a.localeCompare(b,"pt",{numeric:true})),H=(xrCfg().hist||[]).filter(h=>h.k==="quarto").slice().reverse();
  return f6Card("Mapa da casa por quarto",`${at.length} residente(s) em ${ks.length} quarto(s). Verde: vaga; amarelo: lotado conforme a capacidade informada.`,
   `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${ks.map(k=>`<div style="border:1px solid var(--line,#ccc);border-radius:10px;padding:8px"><b>Quarto ${f6Esc(k)}</b><div class="sub">${q[k].length} ocupante(s)</div>${q[k].map(r=>`<div style="display:flex;gap:6px;align-items:center;margin-top:4px">${xrFoto(r.id)?`<img src="${xrFoto(r.id)}" style="width:22px;height:28px;object-fit:cover;border-radius:4px">`:""}<span>${f6Esc(resNome(r))}</span></div>`).join("")}</div>`).join("")||`<div class="empty">Nenhum residente.</div>`}</div>`)
   +f6Card("Histórico de mudanças de quarto","Registrado automaticamente quando o quarto muda no cadastro.",H.length?f6Tbl(["Quando","Residente","De","Para","Quem"],[H.slice(0,100).map(h=>`<tr><td class="n">${brDate(h.t.slice(0,10))}</td><td>${f6Esc(xmResNome(h.res))}</td><td>${f6Esc(h.de||"—")}</td><td>${f6Esc(h.para||"—")}</td><td>${f6Esc(h.u||"")}</td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma mudança registrada.</div>`);
}
xmReg("res","mapa","Cadastro e identificação","Mapa de quartos",xrMapaHtml);
/* ---------- duplicados (23) ---------- */
function xrDuplicados(){
  const L=resAll(),out=[];
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const a=L[i],b=L[j],cpf=a.cpf&&b.cpf&&a.cpf.replace(/\D/g,"")===b.cpf.replace(/\D/g,"");
    const na=estNorm(a.nome),nb=estNorm(b.nome),d=xmLev(na,nb),perto=na&&nb&&(d<=2||na===nb)&&(!a.nasc||!b.nasc||a.nasc===b.nasc);
    if(cpf||perto)out.push([a,b,cpf?"mesmo CPF":d===0?"mesmo nome":"nome muito parecido"]);
  }
  return out;
}
function xrDupHtml(){
  const D=xrDuplicados();
  return f6Card("Possíveis cadastros duplicados","Pares com o mesmo CPF ou nome muito parecido (e mesma data de nascimento, quando informada).",D.length?f6Tbl(["Cadastro 1","Cadastro 2","Motivo"],[D.map(([a,b,m])=>`<tr><td>${f6Esc(a.nome)}<div class="sub">${f6Esc(a.sit||"Ativo")} · quarto ${f6Esc(a.quarto||"—")}</div></td><td>${f6Esc(b.nome)}<div class="sub">${f6Esc(b.sit||"Ativo")} · quarto ${f6Esc(b.quarto||"—")}</div></td><td>${m}</td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma duplicidade encontrada.</div>`);
}
xmReg("res","dup","Cadastro e identificação","Duplicados",xrDupHtml);
/* ---------- importação por planilha (35) ---------- */
const XR_COLS={nome:["nome","residente","nome completo"],nasc:["nascimento","data de nascimento","nasc"],cpf:["cpf"],quarto:["quarto","leito"],grau:["grau","grau de dependencia"],resp:["responsavel","nome do responsavel"],tel:["telefone","tel","telefone do responsavel","celular"],mensalidade:["mensalidade","valor"],entrada:["entrada","data de entrada"],alergias:["alergias"]};
function xrImportParse(txt){
  const R=xmCsv(txt);if(R.length<2)return{erro:"A planilha precisa de uma linha de títulos e ao menos um residente."};
  const H=R[0].map(estNorm),idx={};Object.entries(XR_COLS).forEach(([k,al])=>{const i=H.findIndex(h=>al.includes(h));if(i>=0)idx[k]=i});
  if(idx.nome==null)return{erro:"Não encontrei a coluna “Nome”."};
  const dt=s=>{s=String(s||"").trim();const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:/^\d{4}-\d{2}-\d{2}$/.test(s)?s:""};
  const ex=resAll(),linhas=R.slice(1).map((r,n)=>{const g=k=>idx[k]!=null?String(r[idx[k]]||"").trim():"";const o={nome:g("nome"),nasc:dt(g("nasc")),cpf:g("cpf"),quarto:g("quarto"),grau:[1,2,3].includes(+g("grau"))?+g("grau"):1,resp:g("resp"),tel:g("tel"),mensalidade:f6Num(g("mensalidade")),entrada:dt(g("entrada"))||hojeIso(),alergias:g("alergias")};
    o.erro=!o.nome?"sem nome":o.cpf&&!validCPF(o.cpf)?"CPF inválido":ex.some(x=>estNorm(x.nome)===estNorm(o.nome))?"já cadastrado":"";return{n:n+2,o}});
  return{linhas};
}
function xrImportHtml(){
  const P=XM.sim.xrimp;
  return f6Card("Importar residentes de uma planilha","Planilha CSV (exportada do Excel ou Google Planilhas) com colunas como: Nome, Nascimento, CPF, Quarto, Grau, Responsável, Telefone, Mensalidade, Entrada, Alergias.",
   `<label class="b" style="cursor:pointer">Escolher arquivo CSV<input type="file" id="xrimf" accept=".csv,text/csv,.txt" hidden></label>`+(P?(P.erro?`<div class="callout sand" style="margin-top:8px">${f6Esc(P.erro)}</div>`:f6Tbl(["Linha","Nome","Nascimento","CPF","Quarto","Situação"],[P.linhas.map(l=>`<tr><td class="n">${l.n}</td><td>${f6Esc(l.o.nome)}</td><td class="n">${l.o.nasc?brDate(l.o.nasc):"—"}</td><td>${f6Esc(l.o.cpf)}</td><td>${f6Esc(l.o.quarto)}</td><td>${l.o.erro?`<span style="color:#c62828">${l.o.erro}</span>`:"ok"}</td></tr>`).join("")],"txt")+`<div class="row" style="margin-top:8px"><button class="b" id="xrimok">Importar ${P.linhas.filter(l=>!l.o.erro).length} residente(s)</button><button class="b sec" id="xrimcx">Cancelar</button></div>`):""));
}
xmReg("res","import","Cadastro e identificação","Importar planilha",xrImportHtml,()=>{
  const f=$("xrimf");if(f)f.onchange=async()=>{XM.sim.xrimp=xrImportParse(await f.files[0].text());xmGo()};
  const ok_=$("xrimok");if(ok_)ok_.onclick=()=>{const L=XM.sim.xrimp.linhas.filter(l=>!l.o.erro).map(l=>({id:uid8(),nome:l.o.nome,nasc:l.o.nasc,cpf:l.o.cpf,quarto:l.o.quarto,grau:l.o.grau,sit:"Ativo",entrada:l.o.entrada,resp:{nome:l.o.resp,tel:l.o.tel},mensalidade:l.o.mensalidade,diaVenc:10,gerarMens:false,alergias:l.o.alergias,meds:[],plano:{}}));
    if(!L.length)return toast("Nada a importar.",true);resSave([...resAll(),...L]);XM.sim.xrimp=null;toast(`${L.length} residente(s) importado(s). A mensalidade recorrente não foi criada: ative no cadastro de cada um.`);xmGo()};
  const c=$("xrimcx");if(c)c.onclick=()=>{XM.sim.xrimp=null;xmGo()};
});
/* ---------- visitas: registro e agendamento (11, 12) ---------- */
const xrVisitas=xmRegistro({mod:"res",key:"visitas",res:true,titulo:"Visitas",sub:"Registre a entrada e a saída de quem visita, ou agende uma visita combinada com a família.",novo:"Nova visita",
  campos:[{k:"tipo",l:"Tipo",t:"select",opts:[["visita","Visita acontecendo agora"],["agendada","Visita agendada"]]},{k:"visitante",l:"Visitante"},{k:"parent",l:"Parentesco"},{k:"data",l:"Data",t:"date",d:hojeIso},{k:"hora",l:"Hora de chegada ou horário marcado",t:"time",d:()=>new Date().toTimeString().slice(0,5)},{k:"saida",l:"Hora de saída",t:"time"},{k:"obs",l:"Observações"}],
  ok:(v)=>{if(!v.visitante.trim())return"Informe o visitante.";const c=(xrCfg().contatos||[]).find(c=>c.res===v.res&&estNorm(c.nome)===estNorm(v.visitante)&&c.visita==="proibida");return c?`ATENÇÃO: ${c.nome} está com visitas PROIBIDAS para este residente.`:null},
  cols:[[x=>x.tipo==="agendada"?"agendada":"visita","Tipo"],[x=>f6Esc(x.visitante)+(x.parent?` <span class="sub">(${f6Esc(x.parent)})</span>`:""),"Visitante"],[x=>brDate(x.data),"Data","n"],[x=>(x.hora||"—")+(x.saida?" às "+x.saida:x.tipo==="visita"?` <span class="pill s-pendencia">na casa</span>`:""),"Horário","n"]],
  extra:x=>x.tipo==="agendada"?xmAcao(XMREG["res|visitas"],x.id,"chegou","Chegou"):(!x.saida?xmAcao(XMREG["res|visitas"],x.id,"saiu","Registrar saída"):""),
  acoes:{chegou:()=>({tipo:"visita",hora:new Date().toTimeString().slice(0,5),data:hojeIso()}),saiu:()=>({saida:new Date().toTimeString().slice(0,5)})}});
xmReg("res","visitas","Rotina da casa","Visitas",xrVisitas,()=>{});
/* ---------- saídas do residente e termo (13, 14) ---------- */
const xrSaidas=xmRegistro({mod:"res",key:"saidas",res:true,titulo:"Saídas do residente",sub:"Passeios, consultas e visitas à família. O termo de responsabilidade pode ser impresso para assinatura.",novo:"Nova saída",
  campos:[{k:"motivo",l:"Motivo",t:"select",opts:["Consulta ou exame","Passeio","Casa da família","Evento religioso","Outro"]},{k:"data",l:"Data",t:"date",d:hojeIso},{k:"hora",l:"Hora da saída",t:"time",d:()=>new Date().toTimeString().slice(0,5)},{k:"prev",l:"Retorno previsto (data)",t:"date"},{k:"acomp",l:"Quem leva / acompanha"},{k:"doc",l:"Documento de quem leva"},{k:"med",l:"Medicação entregue para o período",t:"textarea"},{k:"retorno",l:"Retornou em (data)",t:"date"},{k:"obs",l:"Observações"}],
  ok:v=>!v.acomp.trim()?"Informe quem acompanha o residente.":null,
  cols:[[x=>f6Esc(x.motivo),"Motivo"],[x=>brDate(x.data)+" "+(x.hora||""),"Saída","n"],[x=>x.prev?brDate(x.prev):"—","Previsto","n"],[x=>f6Esc(x.acomp||""),"Acompanhante"],[x=>x.retorno?brDate(x.retorno):(x.prev&&x.prev<hojeIso()?`<b style="color:#c62828">atrasado</b>`:`<span class="pill s-pendencia">fora da casa</span>`),"Retorno","n"]],
  extra:x=>(x.retorno?"":xmAcao(XMREG["res|saidas"],x.id,"voltou","Retornou"))+`<button class="b sec sm" data-xrterm="${x.id}">Termo</button> `,
  acoes:{voltou:()=>({retorno:hojeIso()})}});
xmReg("res","saidas","Rotina da casa","Saídas e termo",xrSaidas,()=>{
  document.querySelectorAll("[data-xrterm]").forEach(b=>b.onclick=()=>{const x=(xrCfg().saidas||[]).find(a=>a.id===b.dataset.xrterm),r=resAll().find(a=>a.id===x.res),emp=empresa();
    xmPrint("Termo de responsabilidade para saída",`<h3 style="text-align:center">TERMO DE RESPONSABILIDADE PARA SAÍDA</h3><p>Eu, <b>${f6Esc(x.acomp)}</b>${x.doc?`, documento ${f6Esc(x.doc)}`:""}, retiro o(a) residente <b>${f6Esc(r?r.nome:"")}</b> da instituição <b>${f6Esc(emp.razao||"")}</b> em ${brDate(x.data)}, às ${f6Esc(x.hora||"__:__")}, para: ${f6Esc(x.motivo)}.</p><p>Responsabilizo-me por sua segurança, alimentação e medicação durante o período e comprometo-me a devolvê-lo(a) ${x.prev?"em "+brDate(x.prev):"na data combinada"}.</p>${x.med?`<p><b>Medicação entregue:</b> ${f6Esc(x.med)}</p>`:""}<br><br><p>______________________________<br>Assinatura de quem retira</p><p>______________________________<br>Assinatura do responsável da casa</p><p style="font-size:11px">Retorno registrado em: ____/____/______ às ____:____</p>`)});
});
/* ---------- aniversários e datas (15, 16) ---------- */
function xrDatas(dias){
  const h=hojeIso(),out=[];
  const prox=(iso)=>{const [y,m,d]=iso.split("-").map(Number),a=+h.slice(0,4);let t=`${a}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;if(t<h)t=`${a+1}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return t};
  resAll().filter(resAtivo).forEach(r=>{
    if(r.nasc){const t=prox(r.nasc),n=daysBetweenIso(h,t);if(n<=dias)out.push({r,t,n,tipo:"Aniversário",anos:+t.slice(0,4)-+r.nasc.slice(0,4)})}
    if(r.entrada){const t=prox(r.entrada),n=daysBetweenIso(h,t),anos=+t.slice(0,4)-+r.entrada.slice(0,4);if(n<=dias&&anos>=1)out.push({r,t,n,tipo:"Aniversário na casa",anos})}
  });
  return out.sort((a,b)=>a.n-b.n);
}
function xrDatasHtml(){
  const L=xrDatas(60);
  return f6Card("Aniversários e datas especiais (próximos 60 dias)","Aniversário de nascimento e de entrada na casa.",L.length?f6Tbl(["Dia","Residente","Data","Quando"],[L.map(x=>`<tr><td>${x.tipo}</td><td>${f6Esc(resNome(x.r))}<div class="sub">${x.anos} ano(s)</div></td><td class="n">${brDate(x.t)}</td><td class="n">${x.n===0?"<b>hoje</b>":x.n===1?"amanhã":"em "+x.n+" dias"}</td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma data nos próximos 60 dias.</div>`);
}
xmReg("res","datas","Rotina da casa","Aniversários",xrDatasHtml);
xmUrg(()=>podeVer("res")?xrDatas(1).map(x=>({nivel:1,tipo:"Residentes",titulo:`${x.tipo}: ${resNome(x.r)} ${x.n===0?"hoje":"amanhã"} (${x.anos} anos)`,detalhe:"",quando:x.t,rota:"res"})):[]);
/* ---------- admissão (2) e óbito (25) ---------- */
const XR_ADM=["Documento de identidade e CPF do residente","Comprovante de endereço","Laudo médico e lista de diagnósticos","Receitas e lista de medicamentos","Cartão de vacinação","Cartão SUS e plano de saúde","Contrato de prestação de serviço assinado","Termo de uso de imagem","Inventário de pertences feito","Contatos de emergência cadastrados","Documento do responsável legal","Plano de cuidado inicial definido","Dieta e alergias registradas","Avaliação funcional e cognitiva inicial"];
const xrAdm=xmChecklist({mod:"res",key:"adm",titulo:"Ficha de admissão guiada",sub:"Acompanhe tudo o que precisa ser feito ou recebido na entrada. Cada residente tem a sua lista.",itens:XR_ADM});
xmReg("res","adm","Admissão e saída","Admissão (passo a passo)",()=>xrAdm.html()+f6Card("Andamento das admissões","",f6Tbl(["Residente","Entrada","Concluído"],[resAll().filter(resAtivo).sort((a,b)=>(b.entrada||"").localeCompare(a.entrada||"")).slice(0,30).map(r=>`<tr><td>${f6Esc(resNome(r))}</td><td class="n">${r.entrada?brDate(r.entrada):"—"}</td><td class="n">${(()=>{const d=(xrCfg().adm||{})[r.id]||{};return Math.round(XR_ADM.filter((_,i)=>d[i]).length/XR_ADM.length*100)})()}%</td></tr>`).join("")],"txt")),xrAdm.bind);
const XR_OBITO=["Médico ou SAMU acionado e óbito constatado","Família ou responsável comunicado (registrar hora)","Declaração de óbito providenciada","Funerária contatada pela família","Pertences conferidos e entregues","Medicação do residente recolhida e baixada","Vaga e quarto liberados e higienizados","Comunicação à vigilância sanitária, se exigido","Cadastro marcado como Óbito com a data","Mensalidade encerrada no financeiro","Prontuário arquivado"];
const xrObito=xmChecklist({mod:"res",key:"obito",titulo:"Protocolo de óbito",sub:"Lista para conduzir o momento com cuidado e sem esquecer providências.",itens:XR_OBITO});
xmReg("res","obito","Admissão e saída","Protocolo de óbito",xrObito.html,xrObito.bind);
/* ---------- contrato por modelo e assinatura (3) ---------- */
const XM_MODELO_CONTRATO=`CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ACOLHIMENTO

CONTRATADA: {{empresa}}, CNPJ {{cnpj}}.
CONTRATANTE: {{responsavel}}, CPF {{cpf_resp}}, responsável por {{residente}}, nascido(a) em {{nascimento}}, CPF {{cpf}}.

1. A CONTRATADA prestará serviços de acolhimento, alimentação, higiene e cuidados de rotina ao(à) residente a partir de {{entrada}}.
2. A mensalidade é de {{mensalidade}}, com vencimento todo dia {{dia_venc}}.
3. O atraso implica multa e juros conforme combinado e a legislação.
4. O contrato pode ser rescindido por qualquer das partes com aviso prévio de 30 dias.

{{cidade}}, {{hoje}}.

______________________________      ______________________________
Contratante                         Contratada`;
function xmModelo(txt,r){
  const emp=empresa(),rp=(r&&r.resp)||{},m={empresa:emp.razao||"",cnpj:emp.cnpj||"",responsavel:rp.nome||"",cpf_resp:rp.cpf||"",residente:r?r.nome:"",nascimento:r&&r.nasc?brDate(r.nasc):"",cpf:r?r.cpf||"":"",entrada:r&&r.entrada?brDate(r.entrada):"",mensalidade:r&&r.mensalidade?fmtBRL(r.mensalidade):"",dia_venc:r?r.diaVenc||10:"",quarto:r?r.quarto||"":"",hoje:brDate(hojeIso()),cidade:emp.cidade||""};
  return String(txt).replace(/\{\{(\w+)\}\}/g,(a,k)=>k in m?m[k]:a);
}
const xrContratos=xmRegistro({mod:"res",key:"contratos",res:true,titulo:"Contratos gerados e assinaturas",sub:"Gera o contrato a partir do cadastro, imprime e registra quando foi assinado.",novo:"Registrar contrato",
  campos:[{k:"versao",l:"Versão do modelo",d:"1"},{k:"geradoEm",l:"Gerado em",t:"date",d:hojeIso},{k:"assinadoEm",l:"Assinado em",t:"date"},{k:"obs",l:"Observações"}],
  cols:[[x=>f6Esc(x.versao||""),"Versão"],[x=>x.geradoEm?brDate(x.geradoEm):"—","Gerado","n"],[x=>x.assinadoEm?brDate(x.assinadoEm):`<span class="pill s-pendencia">sem assinatura</span>`,"Assinado","n"]],
  topo:()=>`<button class="b sec sm" id="xrctg" style="align-self:flex-end">Gerar contrato</button><button class="b sec sm" id="xrctm" style="align-self:flex-end">Editar modelo</button>`});
xmReg("res","contratos","Admissão e saída","Contrato e assinatura",xrContratos,()=>{
  $("xrctm").onclick=()=>f6Form("Modelo do contrato",[{t:"note",l:"Campos: {{empresa}} {{cnpj}} {{responsavel}} {{cpf_resp}} {{residente}} {{nascimento}} {{cpf}} {{entrada}} {{mensalidade}} {{dia_venc}} {{quarto}} {{hoje}} {{cidade}}. Peça a um advogado para revisar o texto."},{k:"t",l:"Texto",t:"textarea",v:xrCfg().modeloContrato||XM_MODELO_CONTRATO}],v=>{xrSave({modeloContrato:v.t});xmGo()});
  $("xrctg").onclick=()=>{const sel=XM.sim["f_rescontratos"];if(!sel)return toast("Escolha o residente no filtro acima.",true);const r=resAll().find(a=>a.id===sel);xmPrint("Contrato — "+resNome(r),`<pre style="white-space:pre-wrap;font-family:inherit">${f6Esc(xmModelo(xrCfg().modeloContrato||XM_MODELO_CONTRATO,r))}</pre>`)};
});
/* ---------- lista de espera e visita técnica (26, 27) ---------- */
const xrEspera=xmRegistro({mod:"res",key:"espera",titulo:"Lista de espera e visitas técnicas",sub:"Interessados em uma vaga, a data de visita à casa e em que ponto está cada conversa.",novo:"Novo interessado",
  campos:[{k:"nome",l:"Nome do idoso"},{k:"contato",l:"Contato (nome da família)"},{k:"tel",l:"Telefone"},{k:"grau",l:"Grau de dependência estimado",t:"select",opts:[["","—"],["1","Grau I"],["2","Grau II"],["3","Grau III"]]},{k:"orig",l:"Como conheceu a casa"},{k:"prio",l:"Prioridade",t:"select",opts:["Normal","Alta","Baixa"]},{k:"visita",l:"Data da visita à casa",t:"date"},{k:"status",l:"Situação",t:"select",opts:["Aguardando","Visita agendada","Visita feita","Admitido","Desistiu"]},{k:"obs",l:"Observações",t:"textarea"}],
  ok:v=>v.nome.trim()?null:"Informe o nome.",
  cols:[[x=>f6Esc(x.nome)+`<div class="sub">${f6Esc(x.contato||"")} ${f6Esc(x.tel||"")}</div>`,"Interessado"],[x=>x.grau?"Grau "+"I".repeat(+x.grau):"—","Grau"],[x=>f6Esc(x.prio||"Normal"),"Prioridade"],[x=>x.visita?xmVenc(x.visita,7):"—","Visita"],[x=>f6Esc(x.status||"Aguardando"),"Situação"]]});
xmReg("res","espera","Admissão e saída","Lista de espera",xrEspera,()=>{});
xmUrg(()=>podeVer("res")?(xrCfg().espera||[]).filter(x=>x.visita&&["Visita agendada","Aguardando"].includes(x.status||"")&&xmDias(x.visita)>=0&&xmDias(x.visita)<=1).map(x=>({nivel:1,tipo:"Residentes",titulo:`Visita à casa: ${x.nome} ${xmDias(x.visita)===0?"hoje":"amanhã"}`,detalhe:x.contato||"",quando:x.visita,rota:"res"})):[]);
/* ---------- avaliação de perfil e adequação (28) ---------- */
const xrAval=xmRegistro({mod:"res",key:"aval",res:true,resObrig:false,titulo:"Avaliação de perfil e adequação à casa",sub:"Antes de aceitar a vaga: a casa consegue cuidar bem desta pessoa? Pode ser de um residente ou de um candidato.",novo:"Nova avaliação",
  campos:[{k:"nome",l:"Nome (se candidato)"},{k:"data",l:"Data",t:"date",d:hojeIso},{k:"grau",l:"Grau estimado",t:"select",opts:["I","II","III"]},{k:"mob",l:"Mobilidade",t:"select",opts:["Independente","Usa bengala ou andador","Cadeira de rodas","Acamado"]},{k:"cog",l:"Cognição",t:"select",opts:["Preservada","Alteração leve","Demência moderada","Demência grave"]},{k:"cuid",l:"Cuidados especiais (sonda, curativos, oxigênio, insulina…)",t:"textarea"},{k:"adeq",l:"Parecer",t:"select",opts:["Adequado","Adequado com ressalvas","Não adequado para a casa"]},{k:"parecer",l:"Justificativa",t:"textarea"},{k:"por",l:"Avaliador"}],
  cols:[[x=>f6Esc(x.nome||"")+" "+brDate(x.data),"Avaliação"],[x=>f6Esc(x.mob||""),"Mobilidade"],[x=>f6Esc(x.cog||""),"Cognição"],[x=>`<b>${f6Esc(x.adeq||"")}</b>`,"Parecer"]]});
xmReg("res","aval","Admissão e saída","Avaliação de adequação",xrAval,()=>{});
/* ---------- ex-residentes e motivos de saída (24) ---------- */
const xrMotivos=xmRegistro({mod:"res",key:"motivos",res:true,titulo:"Motivo de saída",sub:"Por que cada residente deixou a casa.",novo:"Registrar motivo",
  campos:[{k:"tipo",l:"Tipo de saída",t:"select",opts:["Retorno à família","Transferência para outra instituição","Hospitalização definitiva","Óbito","Inadimplência","Decisão da casa","Outro"]},{k:"data",l:"Data",t:"date",d:hojeIso},{k:"obs",l:"Detalhes",t:"textarea"}],
  cols:[[x=>f6Esc(x.tipo),"Tipo"],[x=>brDate(x.data),"Data","n"],[x=>f6Esc(x.obs||""),"Detalhes"]]});
xmReg("res","motivos","Admissão e saída","Ex-residentes e motivos",()=>{
  const L=resAll().filter(r=>r.sit==="Desligado"||r.sit==="Óbito").sort((a,b)=>(b.saida||"").localeCompare(a.saida||"")),M=xrCfg().motivos||[],perm=(a,b)=>a&&b?Math.max(0,daysBetweenIso(a,b)):null;
  return f6Card("Ex-residentes","Cadastros arquivados: o prontuário é mantido.",L.length?f6Tbl(["Residente","Situação","Entrada","Saída","Permanência","Motivo"],[L.map(r=>{const m=M.filter(x=>x.res===r.id).slice(-1)[0],d=perm(r.entrada,r.saida);return `<tr><td>${f6Esc(resNome(r))}</td><td>${r.sit}</td><td class="n">${r.entrada?brDate(r.entrada):"—"}</td><td class="n">${r.saida?brDate(r.saida):"—"}</td><td class="n">${d==null?"—":d>=365?(d/365).toFixed(1).replace(".",",")+" anos":d+" dias"}</td><td>${m?f6Esc(m.tipo):"—"}</td></tr>`}).join("")],"txt"):`<div class="empty">Nenhum ex-residente.</div>`)+xrMotivos();
},()=>{});
/* ---------- observações privadas do gestor (33) ---------- */
const xrObsP=xmRegistro({mod:"res",key:"obspriv",res:true,titulo:"Observações privadas da direção",sub:"Só o gestor vê este registro. Use para assuntos delicados de família ou de pagamento.",novo:"Nova observação",
  campos:[{k:"data",l:"Data",t:"date",d:hojeIso},{k:"texto",l:"Observação",t:"textarea"}],ok:v=>v.texto.trim()?null:"Escreva a observação.",cols:[[x=>brDate(x.data),"Data","n"],[x=>f6Esc(x.texto),"Observação"]]});
xmReg("res","obspriv","Cadastro e identificação","Observações privadas",()=>f4Gestor()?xrObsP():f6Card("Observações privadas","",`<div class="empty">Somente o gestor vê esta área.</div>`),()=>{});
/* ---------- linha do tempo e ficha completa (29, 30) ---------- */
function xrLinha(rid){
  const T=[];
  evoAll().filter(e=>e.res===rid).forEach(e=>T.push({d:e.data,t:"Evolução",x:`${e.cat}: ${String(e.texto||"").slice(0,140)}${e.interc?" (intercorrência)":""}`}));
  finAll().filter(e=>e.residente===rid&&!e.cancelada).forEach(e=>T.push({d:e.pago||e.venc,t:"Financeiro",x:`${e.desc} — ${fmtBRL(e.valor)} ${e.pago?"(pago)":"(em aberto)"}`}));
  [["saidas","Saída",x=>`${x.motivo}, acompanhante ${x.acomp||"—"}`],["visitas","Visita",x=>`${x.visitante||""} ${x.tipo==="agendada"?"(agendada)":""}`],["pertences","Pertences",x=>`${x.item} (${x.sit||"na casa"})`],["contratos","Contrato",x=>x.assinadoEm?"assinado em "+brDate(x.assinadoEm):"gerado"]].forEach(([k,t,f])=>(xrCfg()[k]||[]).filter(x=>x.res===rid).forEach(x=>T.push({d:x.data||x.geradoEm||x.em||"",t,x:f(x)})));
  (xrCfg().hist||[]).filter(h=>h.res===rid).forEach(h=>T.push({d:h.t.slice(0,10),t:"Cadastro",x:`${h.campo}: ${h.de||"—"} → ${h.para}`}));
  return T.filter(x=>x.d).sort((a,b)=>b.d.localeCompare(a.d));
}
function xrFichaSpecs(rid){
  const r=resAll().find(x=>x.id===rid),rp=r.resp||{},p=(xrCfg().perfil||{})[rid]||{};
  const dados=[["Nome",r.nome],["Nascimento",r.nasc?`${brDate(r.nasc)} (${idadeDe(r.nasc)} anos)`:""],["CPF",r.cpf||""],["RG",r.rg||""],["Cartão SUS",p.cns||""],["Quarto",r.quarto||""],["Grau",GRAUS[r.grau]||""],["Situação",r.sit||"Ativo"],["Entrada",r.entrada?brDate(r.entrada):""],["Responsável",`${rp.nome||""} ${rp.parent?"("+rp.parent+")":""} ${rp.tel||""}`],["Alergias",r.alergias||""],["Plano de saúde",r.planoSaude||""],["Diagnósticos",r.diag||""],["Restrições alimentares",r.restricoes||""],["Preferências",[p.comida,p.horarios,p.musica].filter(Boolean).join(" · ")]];
  const meds=(r.meds||[]).filter(m=>!m.fim||m.fim>=hojeIso()),ev=evoAll().filter(e=>e.res===rid).sort((a,b)=>(b.data+(b.hora||"")).localeCompare(a.data+(a.hora||""))).slice(0,20);
  return[{titulo:"Ficha do residente",sub:`${empresa().razao||""} · emitida em ${brDate(hojeIso())}`,cols:[{h:"Campo",w:26},{h:"Informação",w:74}],rows:dados.filter(x=>x[1])},
   ...(meds.length?[{titulo:"Medicamentos em uso",cols:[{h:"Medicamento",w:34},{h:"Dose e via",w:26},{h:"Horários",w:24}],rows:meds.map(m=>[m.nome,`${m.dose||""} ${m.via||""}`,m.horarios||""])}]:[]),
   ...(ev.length?[{titulo:"Últimas evoluções",cols:[{h:"Data",t:"date",w:12},{h:"Categoria",w:16},{h:"Registro",w:72}],rows:ev.map(e=>[e.data,e.cat,String(e.texto||"").slice(0,300)])}]:[])];
}
xmReg("res","linha","Ficha completa","Linha do tempo e ficha em PDF",()=>{
  const sel=XM.sim.xrl||"",L=sel?xrLinha(sel):[];
  return f6Card("Linha do tempo do residente","Tudo o que aconteceu com a pessoa, em ordem: evoluções, financeiro, saídas, visitas, contrato e mudanças de cadastro.",
   `<div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="xrls"><option value="">Escolha…</option>${xmResOpts().map(([i,n])=>`<option value="${i}" ${sel===i?"selected":""}>${f6Esc(n)}</option>`).join("")}</select></div>${sel?`<button class="b" id="xrlpdf">Ficha completa (PDF)</button>`:""}</div>`+(sel?(L.length?f6Tbl(["Data","Tipo","O que aconteceu"],[L.slice(0,200).map(x=>`<tr><td class="n">${brDate(x.d)}</td><td>${x.t}</td><td>${f6Esc(x.x)}</td></tr>`).join("")],"txt"):`<div class="empty">Sem registros.</div>`):""));
},()=>{const s=$("xrls");if(s)s.onchange=()=>{XM.sim.xrl=s.value;xmGo()};const b=$("xrlpdf");if(b)b.onclick=()=>f5Pdf(`ficha-${safe(xmResNome(XM.sim.xrl)).slice(0,25)}.pdf`,xrFichaSpecs(XM.sim.xrl))});


/* >>> x_m2.js */
