/* ================= COMPROVANTES: anexos dos lançamentos do Financeiro ================= */
const ANEXO_MAX=10;
const anexoTam=n=>n>=1048576?(n/1048576).toFixed(1).replace(".",",")+" MB":Math.max(1,Math.round((n||0)/1024))+" KB";
async function downloadAnexo(a){try{await saveFile(safe(a.nome),await anexoBytes(a))}catch(e){toast(e.message,true)}}
// só uma lista, usada pela tela e pelo "baixar comprovantes": mesmos filtros da tabela
function finFiltrar(tipo){
  return finAll().filter(e=>e.tipo===tipo&&e.venc.slice(0,4)===String(FIN.ano)&&(FIN.mes<0||+e.venc.slice(5,7)-1===FIN.mes)).filter(e=>{
    if(FIN.status==="abertos"&&e.pago)return false;
    if(FIN.status==="vencidos"&&finStatus(e)!=="vencido")return false;
    if(FIN.status==="pagos"&&!e.pago)return false;
    if(FIN.status==="semcomp"&&!(e.pago&&!e.cancelada&&!(e.anexos||[]).length))return false;
    if(FIN.cat&&e.cat!==FIN.cat)return false;
    if(FIN.q&&!finBusca(e,FIN.q))return false;
    return true;
  }).sort(finOrdem);
}
// apaga lançamentos e também os arquivos anexados a eles
function finApagar(pred){
  const rem=finAll().filter(pred);
  finMutate(all=>all.filter(e=>!pred(e)));
  rem.forEach(e=>(e.anexos||[]).forEach(a=>anexoApagar(a)));
}
async function anexarArquivos(files,jaTem){
  if((jaTem||0)+files.length>ANEXO_MAX)throw new Error(`Cada lançamento aceita até ${ANEXO_MAX} arquivos.`);
  const ok=[];
  try{for(const f of files)ok.push(await anexoEnviar(f))}
  catch(e){await Promise.all(ok.map(anexoApagar));throw e}
  return ok;
}
function openFinAnexos(id){
  const e=finAll().find(x=>x.id===id);if(!e)return;
  const lista=e.anexos||[];
  const ov=openModal(`<h3>Comprovantes e anexos</h3><div class="sub" style="margin-bottom:10px">${esc(e.desc)} · ${brDate(e.venc)} · ${fmtBRL(finNum(e))} · ${finStatusLabel(e)}</div>
   ${lista.length?lista.map(a=>`<div class="doc">${/^image\/(png|jpe?g|webp|gif)/.test(a.type||"")?`<img src="${esc(anexoUrl(a))}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:8px;flex:none">`:`<div style="width:54px;height:54px;border-radius:8px;background:var(--areia-esc);display:grid;place-items:center;flex:none;font:700 11px var(--ui);color:var(--madeira)">${esc((a.nome.split(".").pop()||"").toUpperCase().slice(0,4))}</div>`}
     <div class="grow"><div class="nm">${esc(a.nome)}</div><div class="sub">${anexoTam(a.size)}${a.em?" · enviado em "+new Date(a.em).toLocaleDateString("pt-BR"):""}</div></div>
     <button class="b sec sm" data-adl="${esc(a.id)}">${ic("down")} Baixar</button><button class="b sec sm" data-arm="${esc(a.id)}" title="Remover">${ic("trash")}</button></div>`).join(""):`<div class="empty">Nenhum comprovante anexado${e.pago?" — este lançamento está pago e ainda não tem comprovante":""}.</div>`}
   <label style="margin-top:12px">Adicionar arquivos</label><input type="file" id="anf" multiple accept="${ANEXO_ACCEPT}"><div class="sub" style="margin-top:4px">${ANEXO_NOTA}</div><div class="err" id="anerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ancx">Fechar</button><button class="b" id="anadd">${ic("up")} Anexar</button></div>`);
  ov.querySelector("#ancx").onclick=()=>ov.remove();
  ov.querySelectorAll("[data-adl]").forEach(b=>b.onclick=()=>downloadAnexo(lista.find(a=>a.id===b.dataset.adl)));
  ov.querySelectorAll("[data-arm]").forEach(b=>b.onclick=async()=>{
    const a=lista.find(x=>x.id===b.dataset.arm);if(!a||!await askConfirm(`Remover "${a.nome}" deste lançamento?`,"Remover"))return;
    await anexoApagar(a);finMutate(all=>all.map(x=>x.id===id?{...x,anexos:(x.anexos||[]).filter(y=>y.id!==a.id)}:x));
    toast("Arquivo removido.");ov.remove();openFinAnexos(id);go(ROUTE,true);
  });
  ov.querySelector("#anadd").onclick=async()=>{
    const files=[...ov.querySelector("#anf").files],er=m=>ov.querySelector("#anerr").textContent=m;
    if(!files.length)return er("Escolha ao menos um arquivo.");
    const btn=ov.querySelector("#anadd");btn.disabled=true;btn.textContent="Enviando…";
    try{
      const novos=await anexarArquivos(files,lista.length);
      finMutate(all=>all.map(x=>x.id===id?{...x,anexos:[...(x.anexos||[]),...novos]}:x));
      toast(`${novos.length} arquivo(s) anexado(s).`);ov.remove();openFinAnexos(id);go(ROUTE,true);
    }catch(err){er(err.message);btn.disabled=false;btn.innerHTML=`${ic("up")} Anexar`}
  };
}
async function baixarComprovantes(lista){
  const itens=lista.flatMap(e=>(e.anexos||[]).map(a=>({e,a})));
  if(!itens.length)return toast("Nenhum comprovante anexado nos lançamentos listados.",true);
  if(typeof JSZip==="undefined")return toast("Biblioteca de ZIP não carregou. Recarregue a página.",true);
  toast(`Preparando ${itens.length} arquivo(s)…`);
  const zip=new JSZip(),usados=new Set(),falhas=[];
  for(const{e,a}of itens){
    try{
      const ext=(a.nome.split(".").pop()||"").toLowerCase(),val=String(Math.round(finNum(e)*100)/100).replace(".",",");
      const base=`${e.pago||e.venc}_${safe(e.desc).slice(0,50)}_R$${val}`;let nm=`${base}.${ext}`,n=1;
      while(usados.has(nm))nm=`${base}_${++n}.${ext}`;usados.add(nm);
      zip.file(nm,await anexoBytes(a));
    }catch(err){falhas.push(a.nome)}
  }
  const ok=await saveFile(`comprovantes-${FIN.tab}-${FIN.mes<0?FIN.ano:FIN.ano+"-"+String(FIN.mes+1).padStart(2,"0")}.zip`,await zip.generateAsync({type:"blob"}));
  if(ok)toast(`${itens.length-falhas.length} comprovante(s) no .zip${falhas.length?` — ${falhas.length} não encontrado(s)`:""}.`,!!falhas.length);
}


