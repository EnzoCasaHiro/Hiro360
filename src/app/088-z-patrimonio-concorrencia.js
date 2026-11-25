/* ================= PATRIMÔNIO PARA CONCORRÊNCIA PÚBLICA =================
   Uma lista só com os bens da casa (fogão, sofá, armários, camas…), juntando:
   - o cadastro de Patrimônio (Estrutura e qualidade) e os bens do Financeiro (Patrimônio e depreciação), sem os baixados;
   - os itens das notas fiscais de compra que são móveis, eletrodomésticos e equipamentos (categoria
     "Equipamentos e mobiliário" ou aparelhos como computador, TV e extintor).
   Cada linha pode ser tirada ou incluída à mão; a escolha fica em config/x_infra (patConc). */
const PCONC={q:"",cat:"",ver:"lista"}; // ver: "lista" = só o patrimônio | "notas" = todos os itens das notas, para incluir o que faltou
const PCONC_EXTRA=/computador|notebook|impressora|nobreak|smartphone|celular|tablet|camera de seguranca|\bdvr\b|extintor|televis|\btv\b/;
const PCONC_MAX=300;
const pconcMarcas=()=>xcfg("infra").patConc||{};
function pconcNfCat(r){
  const c=r.categoria;
  if(c&&!/^(sem categoria|a classificar|outros)$/i.test(c))return{cat:c,sub:r.subcategoria||""};
  const k=typeof nfClassificaX==="function"?nfClassificaX(r):null;
  return k?{cat:k.cat,sub:k.sub}:{cat:c||"",sub:""};
}
function pconcTodos(){
  const L=[];
  xs("ativos").filter(a=>a.estado!=="baixado").forEach(a=>L.push({k:"a:"+a.id,nome:a.nome,cat:(a.cat||"").split(" (")[0]||"Outro",qtd:1,unit:+a.valor||0,total:+a.valor||0,data:a.compra||"",
    onde:[a.local,a.serie].filter(Boolean).join(" · "),origem:"Cadastro de patrimônio",auto:true}));
  if(typeof f11Bens==="function")f11Bens().filter(b=>!b.baixa).forEach(b=>L.push({k:"b:"+b.id,nome:b.nome,cat:b.cat||"",qtd:1,unit:+b.valor||0,total:+b.valor||0,data:b.data||"",
    onde:[b.local,b.serie?"série "+b.serie:""].filter(Boolean).join(" · "),origem:"Financeiro (bens)",auto:true}));
  ((S.config.nf&&S.config.nf.rows)||[]).forEach(r=>{
    const c=pconcNfCat(r),equip=c.cat==="Equipamentos e mobiliário",auto=equip||PCONC_EXTRA.test(NFN(r.item));
    L.push({k:"n:"+nfKey(r)+"|"+NFN(r.item),nome:r.item,cat:(equip?c.sub:c.cat)||"Sem categoria",qtd:+r.qtd||1,unit:+r.valor||0,total:+r.total||0,data:r.date||"",
      onde:r.local?"Local na nota: "+r.local:"",origem:"Nota fiscal"+(r.nota?" nº "+r.nota:""),auto});
  });
  const M=pconcMarcas();L.forEach(x=>{x.inc=M[x.k]!==undefined?!!M[x.k]:x.auto});
  return L;
}
function pconcVisiveis(T){
  const q=estNorm(PCONC.q),base=PCONC.ver==="notas"?T.filter(x=>x.k.startsWith("n:")):T.filter(x=>x.inc);
  return base.filter(x=>(!PCONC.cat||x.cat===PCONC.cat)&&(!q||estNorm(x.nome+" "+x.onde+" "+x.origem+" "+x.cat).includes(q)))
    .sort((a,b)=>a.cat.localeCompare(b.cat,"pt")||a.nome.localeCompare(b.nome,"pt"));
}
function pconcHtml(){
  const T=pconcTodos(),ed=podeEd("infra"),inc=T.filter(x=>x.inc),notas=PCONC.ver==="notas";
  const base=notas?T.filter(x=>x.k.startsWith("n:")):inc,cats=[...new Set(base.map(x=>x.cat))].sort((a,b)=>a.localeCompare(b,"pt"));
  if(PCONC.cat&&!cats.includes(PCONC.cat))PCONC.cat="";
  const vis=pconcVisiveis(T),mostra=vis.slice(0,PCONC_MAX),semNf=!podeVer("nf"),semFin=!podeVer("fin");
  const chip=(v,t)=>`<button type="button" class="daypill ${PCONC.cat===v?"on":""}" data-pccat="${esc(v)}" style="width:auto;padding:0 10px">${esc(t)}</button>`;
  return `<div class="card"><h2>Patrimônio para concorrência pública</h2>
   <p class="sub" style="margin:0 0 10px">Junta numa lista só os bens da casa — móveis, eletrodomésticos, camas e equipamentos — vindos do cadastro de Patrimônio, dos bens do Financeiro e dos itens das notas fiscais de compra. Comida, fralda, remédio e outros itens de consumo ficam de fora. Se algo entrou errado ou faltou, desmarque ou marque a linha.</p>
   ${semNf||semFin?`<div class="callout sand" style="margin-bottom:10px">Seu perfil não enxerga ${[semNf?"as notas fiscais":"",semFin?"os bens do Financeiro":""].filter(Boolean).join(" nem ")}: a lista mostra só o que você pode ver.</div>`:""}
   <div class="stats"><div class="stat"><b>${inc.length}</b><span>linhas no patrimônio</span></div><div class="stat"><b>${NUMF(soma(inc,x=>x.qtd),0)}</b><span>unidades</span></div><div class="stat"><b>${fmtBRL(soma(inc,x=>x.total))}</b><span>valor de compra</span></div></div>
   <div class="row" style="margin:12px 0 8px;align-items:flex-end">
    <div style="flex:0 0 260px"><label>Mostrar</label><select id="pcver"><option value="lista" ${notas?"":"selected"}>Só o que é patrimônio</option><option value="notas" ${notas?"selected":""}>Todos os itens das notas (marcar o que faltou)</option></select></div>
    <div style="flex:1 1 220px"><label>Buscar</label><input id="pcq" placeholder="Ex.: cama, fogão, armário" value="${esc(PCONC.q)}"></div>
    <div style="flex:none"><button class="b sec" id="pcxls" ${vis.length?"":"disabled"}>${ic("down")} Excel</button></div>
    <div style="flex:none"><button class="b sec" id="pcpdf" ${vis.length?"":"disabled"}>${ic("down")} PDF</button></div></div>
   <div class="daypicker" style="flex-wrap:wrap;margin-bottom:10px">${chip("","Todas as categorias")}${cats.map(c=>chip(c,c)).join("")}</div>
   ${notas?`<p class="sub" style="margin:0 0 8px">Marcado = entra no patrimônio. O download leva só as linhas marcadas desta busca.</p>`:""}
   ${vis.length?`<div class="wrap"><table><thead><tr>${ed?"<th>Patrimônio?</th>":""}<th>Bem</th><th>Categoria</th><th>Qtd</th><th>Valor</th><th>Aquisição</th><th>Origem</th></tr></thead><tbody>${mostra.map(x=>`<tr style="${x.inc?"":"opacity:.6"}">${ed?`<td><input type="checkbox" data-pck="${esc(x.k)}" data-auto="${x.auto?1:0}" ${x.inc?"checked":""}></td>`:""}<td><b>${esc(x.nome)}</b>${x.onde?`<div class="sub">${esc(x.onde)}</div>`:""}</td><td>${esc(x.cat)}</td><td class="n">${NUMF(x.qtd,0)}</td><td class="n">${fmtBRL(x.total)}</td><td class="n">${x.data?brDate(x.data):"—"}</td><td>${esc(x.origem)}${x.auto!==x.inc?` <span class="sub">(marcado à mão)</span>`:""}</td></tr>`).join("")}</tbody></table></div>
     ${vis.length>PCONC_MAX?`<p class="sub" style="margin:8px 0 0">Mostrando ${PCONC_MAX} de ${vis.length} linhas. Use a busca ou a categoria para achar as outras (o download leva todas).</p>`:""}`:`<div class="empty">Nada encontrado.</div>`}</div>`;
}
function pconcBaixar(fmt){
  const L=pconcVisiveis(pconcTodos()).filter(x=>x.inc);if(!L.length)return toast("Nenhum bem marcado nesta lista.",true);
  const filtro=[PCONC.cat,PCONC.q?"busca: "+PCONC.q:""].filter(Boolean).join(" · ");
  const spec={titulo:"Patrimônio da Casa Hiro",sub:`Bens e equipamentos · posição em ${brDate(hojeIso())}${filtro?" · "+filtro:""}`,sensivel:false,
    cols:[{h:"Bem",w:36},{h:"Categoria",w:24},{h:"Qtd",t:"num",w:7},{h:"Valor unitário",t:"money",w:13},{h:"Valor total",t:"money",w:13},{h:"Aquisição",t:"date",w:11},{h:"Onde fica / detalhe",w:28},{h:"Origem",w:22}],
    rows:L.map(x=>[x.nome,x.cat,x.qtd,x.unit,x.total,x.data,x.onde,x.origem]),tot:[null,null,"sum",null,"sum",null,null,null]};
  (async()=>{try{
    const blob=fmt==="pdf"?await relPdf([spec],{}):await relXlsx([spec]);
    await saveFile(`patrimonio-casa-hiro_${hojeIso()}.${fmt}`,blob);
  }catch(e){console.error(e);toast("Não foi possível gerar o arquivo: "+(e&&e.message?e.message:e),true)}})();
}
function pconcBind(){
  const re=()=>go("infra",true);
  const v=$("pcver");if(v)v.onchange=()=>{PCONC.ver=v.value;PCONC.cat="";re()};
  const q=$("pcq");if(q)q.oninput=()=>{PCONC.q=q.value;re();const n=$("pcq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  document.querySelectorAll("[data-pccat]").forEach(b=>b.onclick=()=>{PCONC.cat=b.dataset.pccat;re()});
  document.querySelectorAll("[data-pck]").forEach(c=>c.onchange=()=>{
    if(!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const M={...pconcMarcas()},k=c.dataset.pck;
    if(c.checked===(c.dataset.auto==="1"))delete M[k];else M[k]=c.checked; // só guarda o que foi mudado à mão
    xcfgSave("infra",{patConc:M});re()});
  const x=$("pcxls");if(x)x.onclick=()=>pconcBaixar("xlsx");
  const p=$("pcpdf");if(p)p.onclick=()=>pconcBaixar("pdf");
}
{const t=PGX.infra.tabs,i=t.findIndex(x=>x.k==="ativos");t.splice(i+1,0,{k:"conc",l:"Patrimônio p/ concorrência",html:pconcHtml,bind:pconcBind})}
