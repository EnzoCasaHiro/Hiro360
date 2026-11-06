/* ================= ocorrências (atestado / esquecimento) ================= */
function openOcorr(uid,day){
  const ig=integByUid(uid);if(!ig){toast("Integrante não encontrado no cadastro.",true);return}
  const d0=day||POINT.start||isoDate(new Date());
  const ocs=Object.values(S.ocorr).filter(o=>o.uid===ig.id).sort((a,b)=>b.de.localeCompare(a.de));
  const ov=openModal(`<h3>${esc(nomeInteg(ig))}</h3><div class="sub" style="margin-bottom:10px">Lançar ocorrência no ponto</div>
   <label>Tipo</label><select id="otipo">${Object.entries(OC).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select>
   <div class="row"><div><label>De</label><input type="date" id="ode" value="${d0}"></div><div><label>Até (igual ao "De" se for um dia só)</label><input type="date" id="oate" value="${d0}"></div></div>
   <label>Observação</label><textarea id="otxt" placeholder="Ex.: esqueceu de bater a saída; atestado de 2 dias."></textarea>
   <div class="callout blue" style="margin-top:8px">Não registre diagnóstico ou CID. Anexe o atestado abaixo: ele fica no Prontuário, na pasta Atestados.</div>
   <label>Anexar atestado (PDF ou imagem, opcional)</label><input type="file" id="ofile" accept=".pdf,.png,.jpg,.jpeg,.webp">
   <div class="sub" style="margin-top:8px">Precisa mudar a escala desse dia (folga ou dia trabalhado fora do padrão)? <button type="button" class="lnk" id="oesc">Ajustar escala</button></div>
   <div class="err" id="oerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ocx">Fechar</button><button class="b" id="osv">Lançar</button></div>
   ${ocs.length?`<h2 style="margin-top:20px">Lançamentos deste integrante</h2>`+ocs.map(o=>`<div class="doc"><div class="grow"><div class="nm">${OC[o.tipo]} · ${brDate(o.de)}${o.ate!==o.de?" a "+brDate(o.ate):""}</div><div class="sub">${esc(o.texto||"")}</div></div><button class="b sec sm" data-del="${o.id}" title="Excluir">${ic("trash")}</button></div>`).join(""):""}`);
  ov.querySelector("#ocx").onclick=()=>ov.remove();
  ov.querySelector("#oesc").onclick=()=>{ov.remove();openEscalaAjuste(ig.id,ov.querySelector("#ode").value||d0)};
  ov.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir este lançamento?","Excluir")){del("ocorr",b.dataset.del);ov.remove();afterOc()}});
  ov.querySelector("#osv").onclick=async()=>{
    const tipo=ov.querySelector("#otipo").value,de=ov.querySelector("#ode").value,ate=ov.querySelector("#oate").value,texto=ov.querySelector("#otxt").value.trim(),f=ov.querySelector("#ofile").files[0];
    const er=m=>ov.querySelector("#oerr").textContent=m;
    if(!de||!ate)return er("Informe as datas.");if(ate<de)return er("A data final precisa ser igual ou depois da inicial.");
    if((tipo==="esquecimento"||tipo==="outro")&&!texto)return er("Escreva uma observação para este tipo de ocorrência.");
    ov.querySelector("#osv").disabled=true;
    try{
      let docId=null;
      if(f){docId=await uploadDoc(ig.id,f,"Atestados")}
      put("ocorr",uid8(),{uid:ig.id,tipo,de,ate,texto,docId,em:new Date().toISOString()});
      ov.remove();toast("Ocorrência lançada.");afterOc();
    }catch(e){er(e.message||String(e));ov.querySelector("#osv").disabled=false}
  };
}
function afterOc(){if(POINT.result)calcular(false);go(ROUTE,true)}

