/* ================= NOTAS FISCAIS ================= */
const fmtBRL=v=>(+v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const MESES3=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const NFUI={q:"",years:null,months:null,cats:null,allYears:null,allMonths:null};
function nfNorm(s){return String(s??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"")}
function nfParseDate(v){
  if(v instanceof Date&&!isNaN(v))return v;
  if(typeof v==="number"){try{const d=XLSX.SSF.parse_date_code(v);if(d)return new Date(d.y,d.m-1,d.d)}catch(e){}return null}
  if(typeof v==="string"){
    const m=v.match(/(\d{1,2})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d+)/);
    if(m){const day=+m[1],month=+m[2],yy=+m[3].replace(/\D/g,"").slice(-2),year=2000+yy;const d=new Date(year,month-1,day);if(!isNaN(d)&&d.getMonth()===month-1)return d}
  }
  return null;
}
function nfNum(v){
  if(v==null||v==="")return null;
  if(typeof v==="number")return v;
  const s=String(v).replace(/\./g,"").replace(",",".").replace(/[^0-9.\-]/g,"");
  const n=parseFloat(s);return isNaN(n)?null:n;
}
function nfParseWorkbook(wb){
  const sheetName=wb.SheetNames.includes("Página1")?"Página1":wb.SheetNames[0];
  const sheet=wb.Sheets[sheetName];
  const aoa=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null});
  let headerRowIdx=-1,idx={};
  for(let r=0;r<Math.min(aoa.length,15);r++){
    const row=aoa[r];if(!row)continue;const tmp={};
    row.forEach((cell,c)=>{
      const L=nfNorm(cell);
      if(L==="n"&&tmp.num===undefined)tmp.num=c;
      else if(L==="data")tmp.data=c;
      else if(L==="item")tmp.item=c;
      else if(L==="local")tmp.local=c;
      else if(L==="valor")tmp.valor=c;
      else if(L==="quantidade")tmp.qtd=c;
      else if(L.startsWith("desconto"))tmp.desconto=c;
      else if(L==="total")tmp.total=c;
      else if(L==="categoria")tmp.categoria=c;
      else if(L==="subcategoria")tmp.subcategoria=c;
    });
    if(tmp.item!==undefined&&tmp.categoria!==undefined&&tmp.subcategoria!==undefined){headerRowIdx=r;idx=tmp;idx.__ro=row.map(NFROLE);break}
  }
  if(headerRowIdx===-1)return[];
  const rows=[];
  for(let i=headerRowIdx+1;i<aoa.length;i++){
    const rr=aoa[i];if(!rr)continue;
    const item=idx.item!==undefined?rr[idx.item]:null;
    if(item==null||String(item).trim()==="")continue;
    const dateObj=nfParseDate(idx.data!==undefined?rr[idx.data]:null);
    const notaNum=idx.num!==undefined?rr[idx.num]:null;
    const valor=nfNum(idx.valor!==undefined?rr[idx.valor]:null);
    const qtd=nfNum(idx.qtd!==undefined?rr[idx.qtd]:null);
    const desconto=nfNum(idx.desconto!==undefined?rr[idx.desconto]:null);
    let total=nfNum(idx.total!==undefined?rr[idx.total]:null);
    if(total===null)total=(valor||0)*(qtd||1)-(desconto||0);
    const categoria=(idx.categoria!==undefined&&rr[idx.categoria])?String(rr[idx.categoria]).trim():"Sem categoria";
    const subcategoria=(idx.subcategoria!==undefined&&rr[idx.subcategoria])?String(rr[idx.subcategoria]).trim():"Sem subcategoria";
    const local=(idx.local!==undefined&&rr[idx.local])?String(rr[idx.local]).trim():"";
    const ex={};if(idx.__ro)idx.__ro.forEach((ro,c)=>{if(!ro&&rr[c]!=null&&rr[c]!=="")ex[c]=rr[c] instanceof Date?isoDate(rr[c]):rr[c]});
    rows.push({...(Object.keys(ex).length?{ex}:{}),date:dateObj?isoDate(dateObj):null,nota:(notaNum==null||notaNum==="")?null:String(notaNum).trim(),
      item:String(item).trim(),local,valor:valor||0,qtd:qtd||0,desconto:desconto||0,total:total||0,categoria,subcategoria});
  }
  return rows;
}
function nfCountNotas(rows){const seen=new Set();let anon=0;rows.forEach(r=>{if(r.nota!=null)seen.add(r.nota);else anon++});return seen.size+anon}
function ensureNFUI(rows){
  if(NFUI.years)return;
  const ys=new Set(),ms=new Set(),cats=new Set();
  rows.forEach(r=>{if(r.date){ys.add(+r.date.slice(0,4));ms.add(+r.date.slice(5,7)-1)}cats.add(r.categoria)});
  NFUI.allYears=ys;NFUI.allMonths=ms;NFUI.years=new Set(ys);NFUI.months=new Set(ms);NFUI.cats=new Set(cats);
}
function nfFiltered(rows){
  return rows.filter(r=>{
    if(r.date){const y=+r.date.slice(0,4),m=+r.date.slice(5,7)-1;if(!NFUI.years.has(y)||!NFUI.months.has(m))return false}
    else if(NFUI.years.size!==NFUI.allYears.size||NFUI.months.size!==NFUI.allMonths.size)return false;
    if(!NFUI.cats.has(r.categoria))return false;
    if(NFUI.q){const hay=(r.item+" "+r.local).toLowerCase();if(!hay.includes(NFUI.q))return false}
    return true;
  });
}
function pgNF(){
  const store=S.config.nf;
  if(!store||!store.rows||!store.rows.length)return banner("","Notas Fiscais","Envie a planilha de notas fiscais para ver os gastos da casa.","receipt")+noStore()+nfEntradaCard()+`
   <div class="card"><h2>Planilha de notas antigas</h2><div class="drop" id="nfdrop">${ic("up")}<div>Clique ou solte aqui a planilha de notas fiscais (.xlsx)</div></div>
   <input type="file" id="nffile" accept=".xlsx,.xls" hidden><div class="sub" id="nfinfo" style="margin-top:8px"></div></div>${nfArqCard()}`;
  ensureNFUI(store.rows);
  const rows=nfFiltered(store.rows);
  const total=rows.reduce((s,r)=>s+r.total,0),notas=nfCountNotas(rows);
  const byCat={};rows.forEach(r=>byCat[r.categoria]=(byCat[r.categoria]||0)+r.total);
  const catList=Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]),topCat=catList[0];
  const maxCat=Math.max(1,...catList.map(c=>byCat[c]));
  const meses=[...NFUI.allMonths].sort((a,b)=>a-b);
  return banner("","Notas Fiscais",`${esc(store.fileName||"Planilha carregada")} · ${fmtBRL(total)} no filtro atual`,"receipt")+noStore()+nfEntradaCard()+`
  <div class="stats">
   <div class="stat"><b>${fmtBRL(total)}</b><span>total no filtro</span></div>
   <div class="stat"><b>${notas}</b><span>notas</span></div>
   <div class="stat"><b style="font-size:16px">${topCat?esc(topCat):"—"}</b><span>maior categoria</span></div>
   <div class="stat"><b>${rows.length}</b><span>itens lançados</span></div></div>
  <div class="card"><h2>Filtros</h2>
   <label>Ano</label><div class="daypicker">${[...NFUI.allYears].sort().map(y=>`<button type="button" class="daypill ${NFUI.years.has(y)?"on":""}" data-nfyear="${y}" style="width:auto;padding:0 10px">${y}</button>`).join("")||'<span class="sub">sem datas na planilha</span>'}</div>
   <label style="margin-top:10px">Mês</label><div class="daypicker">${meses.map(m=>`<button type="button" class="daypill ${NFUI.months.has(m)?"on":""}" data-nfmonth="${m}">${MESES3[m]}</button>`).join("")}</div>
   <label style="margin-top:10px">Categoria</label><div class="daypicker" style="flex-wrap:wrap">${[...new Set(store.rows.map(r=>r.categoria))].map(c=>`<button type="button" class="daypill ${NFUI.cats.has(c)?"on":""}" data-nfcat="${esc(c)}" style="width:auto;padding:0 10px">${esc(c)}</button>`).join("")}</div>
   <label style="margin-top:10px">Buscar item ou fornecedor</label><input id="nfq" value="${esc(NFUI.q)}" placeholder="ex.: cimento, tinta...">
   </div>
  <div class="card"><h2>Gastos por categoria</h2><p class="sub" style="margin:0 0 10px">Clique numa categoria para ver as subcategorias e os itens.</p>
   ${catList.length?`<div class="wrap"><table><thead><tr><th>Categoria</th><th class="n">Total</th><th class="n">%</th></tr></thead><tbody>
   ${catList.map(c=>`<tr data-nfcat2="${esc(c)}" style="cursor:pointer"><td>${esc(c)}<div class="bar" style="width:160px;margin-top:4px"><i style="width:${byCat[c]/maxCat*100}%"></i></div></td>
     <td class="n">${fmtBRL(byCat[c])}</td><td class="n">${total?(byCat[c]/total*100).toFixed(1):"0.0"}%</td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum lançamento com os filtros atuais.</div>`}</div>
  <div class="row"><button class="b sec" id="nfswap" style="flex:none">${ic("up")} Trocar planilha</button></div>
  ${nfNotasCard()}${nfArqCard()}`;
}
function bindNF(){
  const store=S.config.nf;
  if(!store||!store.rows||!store.rows.length){
    const drop=$("nfdrop"),fi=$("nffile");
    drop.onclick=()=>fi.click();
    drop.ondragover=e=>{e.preventDefault();drop.classList.add("on")};drop.ondragleave=()=>drop.classList.remove("on");
    drop.ondrop=e=>{e.preventDefault();drop.classList.remove("on");if(e.dataTransfer.files[0])nfLoad(e.dataTransfer.files[0])};
    fi.onchange=()=>fi.files[0]&&nfLoad(fi.files[0]);
    const pad=$("nfarqpad");if(pad)pad.onclick=async()=>{if(!await askConfirm("Renomear os arquivos das notas guardadas para o padrão NúmeroDaNF_DataDaCompra? Só muda o nome; o arquivo e os lançamentos continuam iguais.","Renomear"))return;const n=nfArqPadroniza();toast(n+" arquivo(s) renomeado(s).");go("nf",true)};bindNFXml();document.querySelectorAll("[data-nfarq]").forEach(b=>b.onclick=()=>nfArqBaixar(b.dataset.nfarq));document.querySelectorAll("[data-nfver]").forEach(b=>b.onclick=()=>nfArqVer(b.dataset.nfver));
    return;
  }
  bindNFXml();nfNotasBind();
  const pad=$("nfarqpad");if(pad)pad.onclick=async()=>{if(!await askConfirm("Renomear os arquivos das notas guardadas para o padrão NúmeroDaNF_DataDaCompra? Só muda o nome; o arquivo e os lançamentos continuam iguais.","Renomear"))return;const n=nfArqPadroniza();toast(n+" arquivo(s) renomeado(s).");go("nf",true)};
  document.querySelectorAll("[data-nfarq]").forEach(b=>b.onclick=()=>nfArqBaixar(b.dataset.nfarq));
  document.querySelectorAll("[data-nfver]").forEach(b=>b.onclick=()=>nfArqVer(b.dataset.nfver));
  document.querySelectorAll("[data-nfyear]").forEach(b=>b.onclick=()=>{const y=+b.dataset.nfyear;NFUI.years.has(y)?NFUI.years.delete(y):NFUI.years.add(y);go("nf",true)});
  document.querySelectorAll("[data-nfmonth]").forEach(b=>b.onclick=()=>{const m=+b.dataset.nfmonth;NFUI.months.has(m)?NFUI.months.delete(m):NFUI.months.add(m);go("nf",true)});
  document.querySelectorAll("[data-nfcat]").forEach(b=>b.onclick=()=>{const c=b.dataset.nfcat;NFUI.cats.has(c)?NFUI.cats.delete(c):NFUI.cats.add(c);go("nf",true)});
  document.querySelectorAll("[data-nfcat2]").forEach(tr=>tr.onclick=()=>openNFDrill(tr.dataset.nfcat2,null));
  const q=$("nfq");if(q)q.oninput=()=>{NFUI.q=q.value.trim().toLowerCase();go("nf",true);const n=$("nfq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  const sw=$("nfswap");if(sw)sw.onclick=async()=>{if(await askConfirm("Trocar a planilha vai substituir os dados de notas fiscais salvos. Continuar?","Trocar")){nfApaga();NFUI.years=null;go("nf",true)}};
}
async function nfLoad(file){
  if(typeof XLSX==="undefined")return toast("Biblioteca de planilha não carregou. Recarregue a página.",true);
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(new Uint8Array(buf),{type:"array",cellDates:true});
    const rows=nfParseWorkbook(wb);
    if(!rows.length){$("nfinfo").textContent="Não encontrei linhas de item. Confira se a planilha segue o modelo (colunas Item, Categoria, Subcategoria...).";return}
    if(!nfSave(rows,file.name,nfCapturaFmt(wb)))return;
    toast(`${rows.length} lançamento(s) importado(s).`);go("nf",true);
  }catch(e){console.error(e);$("nfinfo").textContent="Não foi possível ler essa planilha: "+e.message}
}
function openNFDrill(cat,sub){
  const store=S.config.nf;if(!store)return;
  const inFilter=r=>{if(r.date){const y=+r.date.slice(0,4),m=+r.date.slice(5,7)-1;if(!NFUI.years.has(y)||!NFUI.months.has(m))return false}
    if(NFUI.q){const hay=(r.item+" "+r.local).toLowerCase();if(!hay.includes(NFUI.q))return false}return true};
  const catRows=store.rows.filter(r=>r.categoria===cat&&inFilter(r));
  function paint(curSub){
    let html;
    if(!curSub){
      const total=catRows.reduce((s,r)=>s+r.total,0);
      const bySub={};catRows.forEach(r=>{bySub[r.subcategoria]=bySub[r.subcategoria]||{total:0,itens:new Set()};bySub[r.subcategoria].total+=r.total;bySub[r.subcategoria].itens.add(r.item)});
      const subs=Object.keys(bySub).sort((a,b)=>bySub[b].total-bySub[a].total);
      const max=Math.max(1,...subs.map(s=>bySub[s].total));
      html=`<h3>${esc(cat)}</h3><div class="sub" style="margin-bottom:10px">${fmtBRL(total)} · ${catRows.length} lançamento(s)</div>
       ${subs.map(s=>`<div class="doc" data-sub="${esc(s)}" style="cursor:pointer"><div class="grow"><div class="nm">${esc(s)}</div><div class="sub">${bySub[s].itens.size} item(ns) distintos</div>
         <div class="bar" style="width:160px;margin-top:4px"><i style="width:${bySub[s].total/max*100}%"></i></div></div><b>${fmtBRL(bySub[s].total)}</b></div>`).join("")||`<div class="empty">Sem lançamentos.</div>`}`;
    }else{
      const subRows=catRows.filter(r=>r.subcategoria===curSub);
      const byItem={};subRows.forEach(r=>{const k=r.item;byItem[k]=byItem[k]||{qtd:0,total:0,local:r.local};byItem[k].qtd+=r.qtd||0;byItem[k].total+=r.total});
      const items=Object.keys(byItem).sort((a,b)=>byItem[b].total-byItem[a].total);
      const subTotal=subRows.reduce((s,r)=>s+r.total,0);
      html=`<button class="lnk" id="nfback">&larr; ${esc(cat)}</button><h3 style="margin-top:4px">${esc(curSub)}</h3><div class="sub" style="margin-bottom:10px">${fmtBRL(subTotal)} · ${items.length} item(ns)</div>
       <div class="wrap"><table><thead><tr><th>Item</th><th>Local</th><th class="n">Qtd.</th><th class="n">Total</th></tr></thead><tbody>
       ${items.map(it=>`<tr><td>${esc(it)}</td><td>${esc(byItem[it].local||"—")}</td><td class="n">${fmtQtdBR(byItem[it].qtd)}</td><td class="n">${fmtBRL(byItem[it].total)}</td></tr>`).join("")}
       </tbody></table></div>`;
    }
    ov.querySelector("#nfbody").innerHTML=html;
    const back=ov.querySelector("#nfback");if(back)back.onclick=()=>paint(null);
    ov.querySelectorAll("[data-sub]").forEach(el=>el.onclick=()=>paint(el.dataset.sub));
  }
  const ov=openModal(`<div id="nfbody"></div><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="b sec" id="nfcx">Fechar</button></div>`);
  ov.querySelector("#nfcx").onclick=()=>ov.remove();
  paint(sub);
}
function fmtQtdBR(v){return (+v||0).toLocaleString("pt-BR",{maximumFractionDigits:2})}

