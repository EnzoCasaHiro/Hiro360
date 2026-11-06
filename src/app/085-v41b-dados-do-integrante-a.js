/* ===== V41b · Dados do integrante a partir dos documentos: mais campos, dependentes e releitura (prefixo xdc) ===== */
const XDC_PARENT_DEP=["filho(a)","cônjuge"];
function xdcDepsDe(rows){
  return rows.filter(r=>r.quem==="familiar"&&XDC_PARENT_DEP.includes(r.parent)&&String(r.pessoa||"").trim()).map(r=>{
    const d=r.dados||{},o={nome:xdcTitulo(r.pessoa),parentesco:r.parent};
    if(d.nascimento)o.nascimento=d.nascimento;if(d.cpf&&xdcCpfOk(d.cpf))o.cpf=d.cpf;return o;
  });
}
function xdcJuntaDeps(lista,novos){
  const L=lista.map(x=>({...x}));let mudou=false;const nomes=[];
  for(const n of novos){
    const a=L.find(x=>xdcMesmoNome(x.nome,n.nome));
    if(a){for(const k of["nascimento","cpf","parentesco"])if(n[k]&&!a[k]){a[k]=n[k];mudou=true;if(!nomes.includes(a.nome))nomes.push(a.nome)}}
    else{L.push({id:xdcId(),...n});mudou=true;nomes.push(n.nome)}
  }
  return{lista:L,mudou,nomes};
}
const xdcIdade=iso=>{if(!iso)return"";const n=new Date(iso+"T12:00:00"),h=new Date();let a=h.getFullYear()-n.getFullYear();if(h<new Date(h.getFullYear(),n.getMonth(),n.getDate()))a--;return a>=0?a+" anos":""};
const XDC_ESTCIVIL=["Solteiro(a)","Casado(a)","União estável","Separado(a)","Divorciado(a)","Viúvo(a)"];
const XDC_TIPOS_ID=new Set(["RG","CPF","CNH","CTPS","PIS/NIS","Cartão do Cidadão (NIS)","Título de eleitor","Reservista","Certidão de nascimento","Certidão de casamento","Comprovante de residência"]);
const xdcDocsParaLer=i=>docsOf(i.id).filter(d=>/^(image\/|application\/pdf)/.test(d.type||"")&&(d.tipoDoc?XDC_TIPOS_ID.has(d.tipoDoc):!d.cat||d.cat==="Documentos pessoais")).slice(0,30);

/* aba Dados: seção de documentos/filiação, dependentes e botão de leitura */
const xdcFDados1=fDados;
fDados=function(i){
  let h=xdcFDados1.apply(this,arguments);
  if(!podePii())return h;
  const n=xdcDocsParaLer(i).length;
  const topo=`<div class="callout blue xdcler"><div><b>Preencher a partir dos documentos</b><div class="sub">${n?`O sistema lê ${n} documento(s) desta pessoa (RG, CPF, título, comprovantes…) e mostra o que encontrou para você confirmar.`:"Envie os documentos na aba Documentos; os dados lidos aparecem aqui."}</div></div>${n&&podeEd("pront")?`<button class="b" id="xdcler" style="flex:none">Ler dados dos documentos</button>`:""}</div>${n&&!RT.sample?`<div class="sub" style="margin:-8px 0 12px">A leitura é feita no próprio navegador: os documentos não saem do computador. Na primeira vez ela demora um pouco para preparar o leitor. Confira os números antes de salvar.</div>`:""}`;
  const deps=(i.dependentes||[]);
  const sec=`<h2 style="margin-top:18px">Documentos e filiação</h2><div class="grid g2">${Fp("rgOrgao","Órgão emissor do RG",i,'placeholder="ex.: SSP-SP"')}${Fp("rgEmissao","Expedição do RG",i,'type="date"')}${Fp("naturalidade","Naturalidade",i,'placeholder="cidade - UF"')}
     <div><label>Estado civil</label><select data-k="estadoCivil"><option value="">—</option>${XDC_ESTCIVIL.map(e=>`<option ${e===i.estadoCivil?"selected":""}>${e}</option>`).join("")}</select></div>
     ${Fp("mae","Nome da mãe",i)}${Fp("pai","Nome do pai",i)}${Fp("titulo","Título de eleitor",i)}<div class="grid g2" style="gap:8px">${Fp("tituloZona","Zona",i)}${Fp("tituloSecao","Seção",i)}</div>${Fp("cnh","CNH (número)",i)}</div>
   <h2 style="margin-top:18px">Dependentes</h2>
   <div class="xdcdeps">${deps.length?deps.map((d,k)=>`<div class="doc"><div class="grow"><div class="nm">${esc(d.nome)} <span class="sub">· ${esc(d.parentesco||"dependente")}</span></div><div class="sub">${d.nascimento?brDate(d.nascimento)+" ("+xdcIdade(d.nascimento)+")":"nascimento não informado"}${d.cpf?" · CPF "+esc(d.cpf):""}</div></div>${podeEd("pront")?`<button class="b sec sm" data-xdepe="${k}" title="Editar">Editar</button><button class="b sec sm" data-xdep="${k}" title="Excluir">${ic("trash")}</button>`:""}</div>`).join(""):`<div class="sub" style="margin:4px 0 8px">Nenhum dependente. Os filhos aparecem aqui sozinhos quando você envia o RG ou a certidão deles.</div>`}</div>
   ${podeEd("pront")?`<button class="b sec sm" id="xdcdepadd" style="margin-top:4px">${ic("plus")} Adicionar dependente</button>`:""}`;
  h=h.replace(/<h2>Identificação<\/h2>/,m=>topo+m);
  const k=h.indexOf('<h2 style="margin-top:18px">Vínculo</h2>');
  return k>=0?h.slice(0,k)+sec+h.slice(k):h+sec;
};
function xdcDepModal(i,k){
  const atual=S.integrantes[i.id]||i,L=[...(atual.dependentes||[])],d=k==null?{parentesco:"filho(a)"}:{...L[k]};
  const ov=openModal(`<h3>${k==null?"Adicionar":"Editar"} dependente</h3>
   <label>Nome completo<input id="xdpn" value="${esc(d.nome||"")}"></label>
   <div class="grid g2"><div><label>Parentesco</label><select id="xdpp">${["filho(a)","enteado(a)","cônjuge","companheiro(a)","pai","mãe","outro"].map(p=>`<option ${p===d.parentesco?"selected":""}>${p}</option>`).join("")}</select></div>
   <div><label>Nascimento</label><input id="xdpd" type="date" value="${esc(d.nascimento||"")}"></div><div><label>CPF</label><input id="xdpc" value="${esc(d.cpf||"")}" placeholder="000.000.000-00"></div></div>
   <div class="err" id="xdpe"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xdpx">Cancelar</button><button class="b" id="xdps">Salvar</button></div>`);
  ov.querySelector("#xdpx").onclick=()=>ov.remove();
  ov.querySelector("#xdps").onclick=()=>{
    const nome=ov.querySelector("#xdpn").value.trim(),cpf=ov.querySelector("#xdpc").value.trim();
    if(!nome)return ov.querySelector("#xdpe").textContent="Informe o nome.";
    if(cpf&&!xdcCpfOk(cpf))return ov.querySelector("#xdpe").textContent="CPF inválido. Confira os números.";
    const o={...d,id:d.id||xdcId(),nome,parentesco:ov.querySelector("#xdpp").value,nascimento:ov.querySelector("#xdpd").value,cpf:cpf?xdcFmt.cpf(cpf):""};
    if(k==null)L.push(o);else L[k]=o;
    put("integrantes",i.id,{...strip(atual),dependentes:L});ov.remove();toast("Dependente salvo.");go("pront",true);
  };
}

/* ler de novo os documentos já guardados e propor os dados */
async function xdcRelerDados(i){
  if(!podeEd("pront")||!podePii())return toast("Você só pode consultar esta tela.",true);
  const docs=xdcDocsParaLer(i);if(!docs.length)return toast("Nenhum documento pessoal para ler.",true);
  const ov=openModal(`<h3>Lendo documentos de ${esc(nomeInteg(i))}</h3><p class="sub" id="xrlp">Lendo 0 de ${docs.length}…</p><div class="xdcprogbar"><i id="xrlb"></i></div><div class="sub" id="xrll" style="margin-top:8px"></div>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xrlx">Cancelar</button></div>`);
  let cancel=false;ov.querySelector("#xrlx").onclick=()=>{cancel=true;ov.remove()};
  const lidos=[],fila=docs.slice();let feitos=0;
  const passo=()=>{feitos++;const p=ov.querySelector("#xrlp"),b=ov.querySelector("#xrlb");if(p)p.textContent=`Lendo ${feitos} de ${docs.length}…`;if(b)b.style.width=Math.round(100*feitos/docs.length)+"%"};
  const trab=async()=>{while(fila.length&&!cancel){const d=fila.shift();let leu=null;
    try{const bl=await(await fetch("/_blob/"+d.assetId)).blob();leu=await xdcLe(i,new File([bl],d.nome,{type:d.type}))}catch(e){leu={erro:e.message}}
    if(leu&&!leu.erro)lidos.push({d,leu,t:xdcTitular(i,leu)});
    else{const l=ov.querySelector("#xrll");if(l)l.innerHTML+=`<div>Não consegui ler: ${esc(d.nome)}${leu&&leu.erro?` (${esc(leu.erro)})`:""}</div>`}
    passo()}};
  await Promise.all([trab(),trab(),trab()]);
  if(cancel)return;ov.remove();
  const atual=S.integrantes[i.id]||i;
  // junta o que cada documento do integrante trouxe, campo a campo (vence o valor que mais aparece)
  const por=new Map();
  for(const x of lidos){if(x.t.quem!=="colab")continue;
    for(const p of xdcPropostas(atual,x.leu.dados||{})){const key=p.k==="nomeCompleto"||!/\d/.test(p.valor)?xdcNorm(p.valor):p.valor.replace(/\D/g,"");
      if(!por.has(p.k))por.set(p.k,{p,vals:new Map()});const e=por.get(p.k);
      if(!e.vals.has(key))e.vals.set(key,{valor:p.valor,fontes:[],p});e.vals.get(key).fontes.push(x.d.nome)}}
  const props=[];
  XDC_CAMPOS.forEach(([k])=>{const e=por.get(k);if(!e)return;
    const vs=[...e.vals.values()].sort((a,b)=>b.fontes.length-a.fontes.length),top=vs[0],empate=vs[1]&&vs[1].fontes.length===top.fontes.length;
    const p={...top.p,valor:top.valor,fontes:top.fontes,outros:vs.slice(1)};
    if(empate)p.on=false;props.push(p)});
  const fam=lidos.filter(x=>x.t.quem==="familiar"&&x.t.parent==="filho(a)").map(x=>({quem:"familiar",parent:"filho(a)",pessoa:x.t.pessoa,dados:x.leu.dados||{}}));
  const deps=xdcDepsDe(fam);
  const novosDeps=deps.filter(n=>{const a=(atual.dependentes||[]).find(x=>xdcMesmoNome(x.nome,n.nome));return !a||["nascimento","cpf"].some(k=>n[k]&&!a[k])});
  const ov2=openModal(`<h3>Dados encontrados nos documentos</h3>
   <p class="sub">${lidos.length} de ${docs.length} documento(s) lidos. Marque o que deve ir para o cadastro de <b>${esc(nomeInteg(i))}</b>. Campos que já estão preenchidos vêm desmarcados.</p>
   ${props.length?`<div class="xdcrd">${props.map((p,n)=>`<label class="xdcdd ${p.invalido?"bad":""}"><input type="checkbox" data-rk="${n}" ${p.on&&!p.igual?"checked":""} ${p.igual?"disabled":""}> <span class="xdcdl">${esc(p.l)}</span><input data-rv="${n}" value="${esc(p.valor)}" ${p.igual?"disabled":""}><em>${p.igual?"já está no cadastro":p.invalido?"dígito verificador não confere, confira no documento":p.atual?`cadastro tem: ${esc(p.atual)}`:`lido em: ${esc(p.fontes.slice(0,2).join(", "))}`}${p.outros.length?` · outro documento diz: ${p.outros.map(o=>esc(o.valor)).join(" / ")}`:""}</em></label>`).join("")}</div>`:`<div class="callout sand">Não encontrei dados do integrante nos documentos lidos. Confira se as fotos estão nítidas e se o nome do integrante está igual ao dos documentos.</div>`}
   ${novosDeps.length?`<h4 style="margin:12px 0 4px">Dependentes</h4>${novosDeps.map((d,n)=>`<label class="xdcck"><input type="checkbox" data-rd="${n}" checked> ${esc(d.nome)} (${esc(d.parentesco)})${d.nascimento?" · "+brDate(d.nascimento):""}${d.cpf?" · CPF "+esc(d.cpf):""}</label>`).join("")}`:""}
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xrdx">Fechar</button>${props.length||novosDeps.length?`<button class="b" id="xrds">Aplicar no cadastro</button>`:""}</div>`);
  const box=ov2.querySelector(".modal");if(box){box.style.maxWidth="720px";box.style.width="96vw"}
  ov2.querySelector("#xrdx").onclick=()=>ov2.remove();
  const sv=ov2.querySelector("#xrds");
  if(sv)sv.onclick=()=>{
    const cur=S.integrantes[i.id]||i,o={...strip(cur)},ap=[];
    ov2.querySelectorAll("[data-rk]").forEach(c=>{if(!c.checked)return;const p=props[+c.dataset.rk],v=ov2.querySelector(`[data-rv="${c.dataset.rk}"]`).value.trim(),f=xdcFmt[p.k](v);if(f){o[p.k]=f;ap.push(p.l)}});
    const escolhidos=novosDeps.filter((d,n)=>{const c=ov2.querySelector(`[data-rd="${n}"]`);return c&&c.checked});
    if(escolhidos.length){const r=xdcJuntaDeps(o.dependentes||[],escolhidos);o.dependentes=r.lista;ap.push(r.nomes.length+" dependente(s)")}
    if(!ap.length){ov2.remove();return}
    put("integrantes",i.id,o);try{audit("Cadastro preenchido por documento",nomeInteg(i)+": "+ap.join(", "))}catch(e){}
    ov2.remove();toast("Cadastro atualizado: "+ap.join(", ")+".");PR.tab="dados";go("pront",true);
  };
}
const xdcBindPront1=bindPront;
bindPront=function(){
  xdcBindPront1.apply(this,arguments);
  const i=PR.sel&&S.integrantes[PR.sel];if(!i||PR.tab!=="dados")return;
  const b=document.getElementById("xdcler");if(b)b.onclick=()=>xdcRelerDados(i);
  const a=document.getElementById("xdcdepadd");if(a)a.onclick=()=>xdcDepModal(i,null);
  document.querySelectorAll("[data-xdepe]").forEach(x=>x.onclick=()=>xdcDepModal(i,+x.dataset.xdepe));
  document.querySelectorAll("[data-xdep]").forEach(x=>x.onclick=async()=>{const cur=S.integrantes[i.id]||i,L=[...(cur.dependentes||[])],d=L[+x.dataset.xdep];
    if(d&&await askConfirm(`Tirar ${d.nome} da lista de dependentes?`,"Excluir")){L.splice(+x.dataset.xdep,1);put("integrantes",i.id,{...strip(cur),dependentes:L});go("pront",true)}});
};
(function(){const st=document.createElement("style");st.textContent=`
.xdcler{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}
.xdcprogbar{height:8px;background:var(--line);border-radius:4px;overflow:hidden}.xdcprogbar i{display:block;height:100%;width:0;background:var(--verde,#1E5C2A);transition:width .3s}
.xdcrd{max-height:56vh;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px 10px}
.xdcrd .xdcdd{grid-template-columns:auto 150px minmax(140px,1fr)}
@media(max-width:560px){.xdcrd .xdcdd{grid-template-columns:auto 1fr}.xdcrd .xdcdd input:not([type=checkbox]){grid-column:1/-1}.xdcrd .xdcdd em{grid-column:1/-1}}
`;document.head.appendChild(st)})();


/* >>> x_host.js */
