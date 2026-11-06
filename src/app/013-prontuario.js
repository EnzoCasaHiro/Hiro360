/* ================= PRONTUÁRIO ================= */
const PR={sel:null,tab:"dados",q:"",batch:new Set(),docSel:new Set()};
const docsOf=id=>Object.values(S.docs).filter(d=>d.uid===id&&!d.pendente).sort((a,b)=>CATS.indexOf(a.cat)-CATS.indexOf(b.cat)||a.nome.localeCompare(b.nome));
const fsize=b=>b>1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB";
function pgPront(){
  const list=integList().filter(i=>(nomeInteg(i)+" "+(i.nome||"")).toLowerCase().includes(PR.q.toLowerCase())&&((PR.aba==="desl")===((i.situacao||"Ativo")==="Desligado")));
  if(PR.sel&&!S.integrantes[PR.sel])PR.sel=null;
  const nAt=integList().filter(i=>(i.situacao||"Ativo")!=="Desligado").length,nDe=integList().length-nAt;
  const nb=PR.batch.size;
  return banner("","Integrantes","Ficha de cada integrante: CTPS, PIS, CBO, salário, jornada, admissão, ASO/PCMSO e documentos. (O prontuário é do residente — fica em Prontuário.)","folder")+noStore()+
  (RT.ready&&!RT.assets?`<div class="callout sand" style="margin-bottom:16px">O envio de documentos precisa do armazenamento do painel, que não está disponível nesta visualização.</div>`:"")+`
  <div class="split"><div class="card" style="margin:0"><div class="tabs" style="margin-bottom:10px"><button type="button" data-pab="ativos" class="${PR.aba==="desl"?"":"on"}">Ativos (${nAt})</button><button type="button" data-pab="desl" class="${PR.aba==="desl"?"on":""}">Desligados (${nDe})</button></div><div class="row" style="margin-bottom:8px"><input id="q" placeholder="Buscar integrante" value="${esc(PR.q)}"><button class="b sm" id="pnew" style="flex:none">${ic("plus")} Novo</button></div>
   <div class="row" style="margin-bottom:8px;gap:6px"><button class="b sec sm" id="ball" style="flex:none">${nb===list.length&&nb?"Limpar":"Selecionar todos"}</button>
    <button class="b sec sm" id="bzip" style="flex:none" ${nb?"":"disabled"}>${ic("down")} ZIP (${nb})</button>
    <button class="b sec sm" id="bpdf" style="flex:none" ${nb?"":"disabled"}>${ic("merge")} PDF (${nb})</button></div>
   <div class="plist">${list.map(i=>{const nd=docsOf(i.id).length,inc=!i.cpf||!i.nomeCompleto;return `<div class="pitem ${PR.sel===i.id?"on":""}" data-id="${i.id}">
     <input type="checkbox" data-b="${i.id}" ${PR.batch.has(i.id)?"checked":""}><div class="avatar">${esc(initials(nomeInteg(i)))}</div>
     <div style="min-width:0"><div class="nm">${esc(nomeInteg(i))}</div><div class="sub">${esc(i.depto||"Outro")} · ${nd} doc.${semPonto(i)?" · não bate ponto":""}${inc?` · <span style="color:var(--madeira)">dados incompletos</span>`:""}</div></div></div>`}).join("")||`<div class="empty">Nenhum integrante.</div>`}</div></div>
   <div id="pdet">${PR.sel?detPront(S.integrantes[PR.sel]):`<div class="card empty">Escolha um integrante à esquerda ou cadastre um novo.</div>`}</div></div>`;
}
function detPront(i){
  const tabs=[["dados","Dados"],["docs",`Documentos (${docsOf(i.id).length})`],["oc","Ocorrências"],["hist","Histórico"]];
  return `<div class="card" style="margin:0"><div class="uhead"><div class="avatar">${esc(initials(nomeInteg(i)))}</div><div class="grow"><h3>${esc(nomeInteg(i))}</h3>
   <div class="sub">${esc(i.cargo||"Cargo não informado")} · <span class="depto ${deptoClass(i.depto)}">${esc(i.depto||"Outro")}</span> · ${esc(i.situacao||"Ativo")}</div></div></div>
   <div class="tabs">${tabs.map(([k,l])=>`<button data-t="${k}" class="${PR.tab===k?"on":""}">${l}</button>`).join("")}</div>${prRascAviso(i)}${PR.tab==="dados"?fDados(prRascAplica(i)):PR.tab==="docs"?fDocs(i):PR.tab==="hist"?fHist(i):fOc(i)}</div>`;
}
// rascunho por integrante: guarda o valor digitado e o valor salvo na hora; se o salvo mudar por outro caminho, o rascunho daquele campo é descartado
const prRasc=id=>{PR.rasc=PR.rasc||{};return PR.rasc[id]||(PR.rasc[id]={})};
function prRascAplica(i){
  const r=PR.rasc&&PR.rasc[i.id];if(!r)return i;
  const o={...i};
  for(const k of Object.keys(r)){if(String(i[k]??"")===r[k].base)o[k]=r[k].v;else delete r[k]}
  return o;
}
function prRascAviso(i){
  const r=PR.rasc&&PR.rasc[i.id];if(r)prRascAplica(i);
  return r&&Object.keys(r).length?`<div class="callout sand" style="margin:10px 0">Há alterações não salvas na aba Dados. Volte nela e clique em <b>Salvar dados</b> para guardar.</div>`:"";
}
const F=(k,l,i,extra="")=>`<div><label>${l}</label><input data-k="${k}" value="${esc(i[k]||"")}" ${extra}></div>`;
const Fp=(k,l,i,extra="")=>podePii()?F(k,l,i,extra):"";
function fDados(i){
  return `<h2>Identificação</h2><div class="grid g2">${F("nomeCompleto","Nome completo *",i)}${F("nome","Nome no relógio",i)}${Fp("cpf","CPF",i,'placeholder="000.000.000-00"')}${Fp("rg","RG",i)}
   ${Fp("pis","PIS / NIT",i)}${Fp("ctps","CTPS (número/série)",i)}${Fp("nascimento","Nascimento",i,'type="date"')}${F("telefone","Telefone",i)}${F("email","E-mail",i)}
   <div><label>ID no relógio de ponto</label><input data-k="uid" type="number" value="${i.uid??""}"></div></div>
   <h2 style="margin-top:18px">Vínculo</h2><div class="grid g2">${F("cargo","Cargo / função",i)}${F("cbo","CBO (código da ocupação)",i,'placeholder="ex.: 5162-10"')}${podeSal()?F("salario","Salário base (R$)",i,'type="number" min="0" step="1"'):""}${F("jornadaContratual","Jornada contratada",i,'placeholder="ex.: 12x36, 44h semanais"')}
   <div><label>Departamento</label><select data-k="depto">${DEPTOS.map(d=>`<option ${d===i.depto?"selected":""}>${d}</option>`).join("")}</select></div>
   ${F("admissao","Data de admissão",i,'type="date"')}${F("desligamento","Data de desligamento (se houver)",i,'type="date"')}<div><label>Situação</label><select data-k="situacao">${["Ativo","Afastado","Férias","Desligado"].map(d=>`<option ${d===(i.situacao||"Ativo")?"selected":""}>${d}</option>`).join("")}</select></div>
   <div><label>Controle de ponto</label><select data-k="ponto"><option value="">Bate ponto</option><option value="nao" ${i.ponto==="nao"?"selected":""}>Não bate ponto (sócia, direção)</option></select></div></div>
   ${i.ponto==="nao"?`<div class="callout sand" style="margin-top:10px">Esta pessoa <b>não aparece</b> no ponto, nas escalas nem na folha de ponto do contador. Fica no cadastro, e só nome e CPF são cobrados como dados obrigatórios.</div>`:""}
   ${asoInfoHtml(i)}
   <h2 style="margin-top:18px">Endereço e emergência</h2><div class="grid g2">${F("endereco","Endereço",i)}${F("cep","CEP",i)}${F("cidade","Cidade / UF",i)}${F("emergNome","Contato de emergência",i)}${F("emergTel","Telefone do contato",i)}</div>
   <label>Observações administrativas</label><textarea data-k="obs">${esc(i.obs||"")}</textarea>
   <div class="err" id="ferr"></div><div class="row" style="margin-top:12px"><button class="b" id="dsave" style="flex:none">Salvar dados</button><button class="b sec" id="ddel" style="flex:none">${ic("trash")} Excluir integrante</button></div>`;
}
function fDocs(i){
  const ds=docsOf(i.id),sel=[...PR.docSel].filter(id=>S.docs[id]&&S.docs[id].uid===i.id);
  let html=`<div class="row" style="margin-bottom:10px"><div style="flex:0 0 220px"><label>Categoria do envio</label><select id="ucat">${CATS.map(c=>`<option>${c}</option>`).join("")}</select></div>
   <div style="flex:2"><div class="drop" id="udrop" style="padding:14px">${ic("up")}<div>Clique ou solte arquivos aqui (vários de uma vez)</div><div class="sub">PDF, imagens (PNG, JPG, WebP, GIF), TXT e CSV · até 20 MB cada</div></div><input type="file" id="ufile" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv"></div></div>
   <div class="callout blue" style="margin-bottom:10px">Documentos do Word ou Excel: salve como PDF antes de enviar. Fotos de celular em formato HEIC também precisam ser convertidas para JPG.</div>
   <div class="row" style="margin-bottom:8px;gap:6px"><button class="b sec sm" id="dall" style="flex:none">${sel.length===ds.length&&ds.length?"Limpar":"Selecionar todos"}</button>
   <button class="b sec sm" id="dzip" style="flex:none" ${sel.length?"":"disabled"}>${ic("down")} Baixar ZIP (${sel.length})</button>
   <button class="b sec sm" id="dpdf" style="flex:none" ${sel.length?"":"disabled"}>${ic("merge")} Juntar em um PDF (${sel.length})</button></div>`;
  if(!ds.length)return html+`<div class="empty">Nenhum documento enviado ainda.</div>`;
  let cur="";
  for(const d of ds){
    if(d.cat!==cur){cur=d.cat;html+=`<div class="catt">${esc(cur)}</div>`}
    const img=/^image\//.test(d.type);
    html+=`<div class="doc"><input type="checkbox" data-ds="${d.id}" ${PR.docSel.has(d.id)?"checked":""}><div class="th" data-dv="${d.id}" style="cursor:pointer" title="Ver">${img?`<img src="/_blob/${d.assetId}" alt="">`:ic("file")}</div>
     <div class="grow"><div class="nm" title="${esc(d.nome)}">${esc(d.nome)}</div><div class="sub">${fsize(d.size||0)} · ${brDate((d.em||"").slice(0,10))}</div></div>
     <button class="b sec sm" data-dv="${d.id}" title="Ver">${ic("eye")}</button><button class="b sec sm" data-dl="${d.id}" title="Baixar">${ic("down")}</button><button class="b sec sm" data-dx="${d.id}" title="Excluir">${ic("trash")}</button></div>`;
  }
  return html;
}
function fHist(i){
  const h=[...(i.hist||[])].reverse();
  return h.length?`<p class="sub" style="margin:0 0 10px">Mudanças de cargo, turno, escala, situação, admissão e desligamento ficam registradas aqui automaticamente.</p>`+h.map(x=>`<div class="doc"><div class="grow"><div class="nm">${esc(x.campo)}: ${esc(x.de)} → ${esc(x.para)}</div><div class="sub">${new Date(x.em).toLocaleString("pt-BR")}</div></div></div>`).join(""):`<div class="empty">Nenhuma alteração registrada ainda.</div>`;
}
function fOc(i){
  const ocs=Object.values(S.ocorr).filter(o=>o.uid===i.id).sort((a,b)=>b.de.localeCompare(a.de));
  return `<div class="row" style="margin-bottom:10px"><button class="b" id="oadd" style="flex:none" ${i.uid==null?"disabled":""}>${ic("plus")} Lançar ocorrência</button>${i.uid==null?`<span class="sub">Informe o ID do relógio na aba Dados para lançar ocorrências no ponto.</span>`:""}</div>`+
  (ocs.map(o=>`<div class="doc"><div class="grow"><div class="nm">${OC[o.tipo]} · ${brDate(o.de)}${o.ate!==o.de?" a "+brDate(o.ate):""}</div><div class="sub">${esc(o.texto||"Sem observação")}</div></div>
   <button class="b sec sm" data-dxo="${o.id}">${ic("trash")}</button></div>`).join("")||`<div class="empty">Nenhuma ocorrência lançada.</div>`);
}
function bindPront(){
  $("q").oninput=e=>{PR.q=e.target.value;go("pront",true);const q=$("q");q.focus();q.setSelectionRange(q.value.length,q.value.length)};
  $("pnew").onclick=()=>{const id=uid8();put("integrantes",id,{nome:"",nomeCompleto:"Novo integrante",depto:"Outro",turno:"",dias:[0,1,2,3,4],situacao:"Ativo"});PR.sel=id;PR.tab="dados";go("pront",true)};
  document.querySelectorAll(".pitem").forEach(el=>el.onclick=e=>{if(e.target.dataset.b)return;PR.sel=el.dataset.id;PR.docSel=new Set();go("pront",true)});
  document.querySelectorAll("[data-b]").forEach(c=>c.onchange=()=>{c.checked?PR.batch.add(c.dataset.b):PR.batch.delete(c.dataset.b);go("pront",true)});
  $("ball").onclick=()=>{const l=integList().filter(i=>(nomeInteg(i)+" "+(i.nome||"")).toLowerCase().includes(PR.q.toLowerCase())&&((PR.aba==="desl")===((i.situacao||"Ativo")==="Desligado")));
    if(PR.batch.size===l.length)PR.batch.clear();else l.forEach(i=>PR.batch.add(i.id));go("pront",true)};
  $("bzip").onclick=()=>zipDocs([...PR.batch].flatMap(id=>docsOf(id)));
  $("bpdf").onclick=()=>mergeDocs([...PR.batch].flatMap(id=>docsOf(id)));
  document.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{PR.tab=b.dataset.t;go("pront",true)});
  const i=PR.sel&&S.integrantes[PR.sel];if(!i)return;
  if(PR.tab==="dados"){
    document.querySelectorAll("#pdet [data-k]").forEach(el=>{const h=()=>{
      const k=el.dataset.k,cur=S.integrantes[i.id]||i,base=String(cur[k]??""),r=prRasc(i.id);
      if(el.value===base)delete r[k];else r[k]={v:el.value,base};
    };el.addEventListener("input",h);el.addEventListener("change",h)});
    $("dsave").onclick=()=>{
      const o={...strip(i)};document.querySelectorAll("#pdet [data-k]").forEach(el=>{o[el.dataset.k]=el.value.trim()});
      o.uid=o.uid===""||o.uid==null?null:+o.uid;if(!o.uid&&o.uid!==0)o.uid=null;
      if(!o.nomeCompleto)return $("ferr").textContent="Informe o nome completo.";
      if(o.cpf&&!validCPF(o.cpf))return $("ferr").textContent="CPF inválido. Confira os números.";
      if(o.situacao==="Desligado"&&!o.desligamento)return $("ferr").textContent="Informe a data de desligamento — o ponto e a escala param de contar depois dela.";
      if(o.desligamento&&o.admissao&&o.desligamento<o.admissao)return $("ferr").textContent="A data de desligamento não pode ser anterior à admissão.";
      const HC={nomeCompleto:"Nome",cargo:"Cargo",depto:"Departamento",turno:"Turno",situacao:"Situação",admissao:"Admissão",desligamento:"Desligamento",escalaModo:"Escala"};
      const difs=Object.keys(HC).filter(k=>String(i[k]??"")!==String(o[k]??"")&&(i.id&&(i.nomeCompleto||i.cargo||i.admissao)));
      o.hist=[...(i.hist||[]),...difs.map(k=>({em:new Date().toISOString(),campo:HC[k],de:String(i[k]??"")||"—",para:String(o[k]??"")||"—"}))];
      const dup=Object.values(S.integrantes).find(x=>x.id!==i.id&&o.uid!=null&&x.uid!=null&&+x.uid===+o.uid);
      if(dup)return $("ferr").textContent=`O ID ${o.uid} já pertence a ${nomeInteg(dup)}.`;
      o.cpf=fmtCPF(o.cpf);put("integrantes",i.id,o);if(PR.rasc)delete PR.rasc[i.id];toast("Dados salvos.");go("pront",true);
    };
    if($("ddel"))$("ddel").onclick=async()=>{
      if(!await askConfirm(`Excluir ${nomeInteg(i)} e todos os documentos e ocorrências dele? Não dá para desfazer.`,"Excluir"))return;
      for(const d of Object.values(S.docs).filter(x=>x.uid===i.id))await removeDoc(d,true);
      Object.values(S.ocorr).filter(o=>o.uid===i.id).forEach(o=>del("ocorr",o.id));
      del("integrantes",i.id);PR.sel=null;PR.batch.delete(i.id);go("pront",true);
    };
  }else if(PR.tab==="docs"){
    const dz=$("udrop"),uf=$("ufile");dz.onclick=()=>uf.click();
    dz.ondragover=e=>{e.preventDefault();dz.classList.add("on")};dz.ondragleave=()=>dz.classList.remove("on");
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove("on");sendFiles(i,[...e.dataTransfer.files])};
    uf.onchange=()=>sendFiles(i,[...uf.files]);
    document.querySelectorAll("[data-ds]").forEach(c=>c.onchange=()=>{c.checked?PR.docSel.add(c.dataset.ds):PR.docSel.delete(c.dataset.ds);go("pront",true)});
    $("dall").onclick=()=>{const ds=docsOf(i.id);if(ds.every(d=>PR.docSel.has(d.id)))ds.forEach(d=>PR.docSel.delete(d.id));else ds.forEach(d=>PR.docSel.add(d.id));go("pront",true)};
    $("dzip").onclick=()=>zipDocs([...PR.docSel].map(id=>S.docs[id]).filter(Boolean));
    $("dpdf").onclick=()=>mergeDocs([...PR.docSel].map(id=>S.docs[id]).filter(Boolean));
    document.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>downloadDoc(S.docs[b.dataset.dl]));
    document.querySelectorAll("[data-dv]").forEach(b=>b.onclick=()=>verDoc(S.docs[b.dataset.dv]));
    document.querySelectorAll("[data-dx]").forEach(b=>b.onclick=async()=>{const d=S.docs[b.dataset.dx];if(d&&await askConfirm(`Excluir o arquivo "${d.nome}"?`,"Excluir")){await removeDoc(d);go("pront",true)}});
  }else{
    const a=$("oadd");if(a)a.onclick=()=>openOcorr(+i.uid);
    document.querySelectorAll("[data-dxo]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir esta ocorrência?","Excluir")){del("ocorr",b.dataset.dxo);afterOc()}});
  }
}

