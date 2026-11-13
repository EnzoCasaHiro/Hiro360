/* ================= DP: FOLHAS DE PONTO POR FILTRO (cargo, departamento, pessoa, abas e formato) ================= */
const deptoDe=i=>String(i.depto||"").trim()||"Sem departamento";
const FOLHA={cargos:new Set(),deptos:new Set(),pessoas:new Set(),q:"",abas:{capa:true,integrantes:true,jornadas:true,individual:true},fmt:new Set(["xlsx"]),modo:"junto"};
const FOLHA_ABAS=[["capa","Capa"],["integrantes","Integrantes (cadastro)"],["jornadas","Jornadas diárias (e resumo, no PDF)"],["individual","Folha individual com assinatura"]];
const chaveFolha=x=>String(x.uid??x.ig.id??x.nome);
function folhaBase(){
  const R=POINT.result;
  return R?R.users.filter(u=>!semPonto(u.ig||integByUid(u.uid))).map(u=>({uid:u.uid,nome:u.nome,ig:u.ig||integByUid(u.uid)||{}})):integList().filter(i=>!semPonto(i)).map(i=>({uid:i.uid,nome:nomeInteg(i),ig:i}));
}
function folhaSel(){
  const b=folhaBase();if(!(FOLHA.cargos.size||FOLHA.deptos.size||FOLHA.pessoas.size))return b;
  return b.filter(x=>FOLHA.pessoas.has(chaveFolha(x))||FOLHA.cargos.has(cargoDe(x.ig))||FOLHA.deptos.has(deptoDe(x.ig)));
}
// nome do arquivo quando vários integrantes vão juntos: reflete o filtro usado
function rotuloFolha(sel){
  if(sel.length===folhaBase().length)return"todos";
  if(sel.length===1)return safe(sel[0].nome);
  if(!FOLHA.pessoas.size&&!FOLHA.deptos.size&&FOLHA.cargos.size===1)return"cargo-"+safe([...FOLHA.cargos][0]);
  if(!FOLHA.pessoas.size&&!FOLHA.cargos.size&&FOLHA.deptos.size===1)return"depto-"+safe([...FOLHA.deptos][0]);
  return"selecionados";
}
function pgFolhasFiltro(){
  const base=folhaBase(),sel=folhaSel(),R=POINT.result,pt=(a,b)=>a.localeCompare(b,"pt");
  const cargos=[...new Set(base.map(x=>cargoDe(x.ig)))].sort(pt),deptos=[...new Set(base.map(x=>deptoDe(x.ig)))].sort(pt);
  const q=estNorm(FOLHA.q),vis=base.filter(x=>!q||estNorm(x.nome).includes(q)).sort((a,b)=>pt(a.nome,b.nome));
  const nf=FOLHA.fmt.size,nArq=FOLHA.modo==="pessoa"?sel.length*nf:nf;
  const chip=(set,attr,v,n)=>`<button type="button" class="daypill ${set.has(v)?"on":""}" ${attr}="${esc(v)}" style="width:auto;padding:0 10px">${esc(v)} <span style="opacity:.7">${n}</span></button>`;
  return `<div class="card"><h2>Baixar folhas de ponto por filtro</h2>
   <p class="sub" style="margin:0 0 10px">Escolha quem entra — por cargo, por departamento ou pessoa a pessoa —, quais abas e o formato. Sem nenhum filtro, entram todos.</p>
   ${R?`<p class="sub" style="margin:0 0 8px">Período apurado: <b>${brDate(R.start)}</b> a <b>${brDate(R.end)}</b></p>`:`<div class="callout sand" style="margin-bottom:10px">O ponto ainda não foi calculado: as abas de jornadas e a folha individual só saem depois de “Calcular jornadas” na aba Ponto.</div>`}
   <label>Cargos</label><div class="daypicker" style="flex-wrap:wrap;margin-bottom:10px">${cargos.map(c=>chip(FOLHA.cargos,"data-fcargo",c,base.filter(x=>cargoDe(x.ig)===c).length)).join("")}</div>
   <label>Departamentos</label><div class="daypicker" style="flex-wrap:wrap;margin-bottom:10px">${deptos.map(c=>chip(FOLHA.deptos,"data-fdepto",c,base.filter(x=>deptoDe(x.ig)===c).length)).join("")}</div>
   <label>Pessoas</label><div class="row" style="margin-bottom:6px"><input id="fpq" placeholder="Buscar pelo nome" value="${esc(FOLHA.q)}"><button class="b sec sm" id="fpvis" style="flex:none">Marcar as exibidas</button><button class="b sec sm" id="fplimpa" style="flex:none">Limpar tudo</button></div>
   <div style="max-height:190px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-bottom:12px">${vis.length?vis.map(x=>`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin:3px 0"><input type="checkbox" data-fpes="${esc(chaveFolha(x))}" ${FOLHA.pessoas.has(chaveFolha(x))?"checked":""}> ${esc(x.nome)} <span class="sub">${esc(cargoDe(x.ig))}</span></label>`).join(""):`<div class="sub">Nenhuma pessoa encontrada.</div>`}</div>
   <div class="row"><div><label>Abas</label>${FOLHA_ABAS.map(([k,l])=>`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin:3px 0"><input type="checkbox" data-faba="${k}" ${FOLHA.abas[k]?"checked":""}> ${l}</label>`).join("")}</div>
    <div><label>Formatos</label>${[["xlsx","XLSX (Excel)"],["pdf","PDF"],["csv","CSV (jornadas)"]].map(([k,l])=>`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin:3px 0"><input type="checkbox" data-ffmt="${k}" ${FOLHA.fmt.has(k)?"checked":""}> ${l}</label>`).join("")}
     <label style="margin-top:8px">Como entregar</label><select id="fmodo"><option value="junto" ${FOLHA.modo==="junto"?"selected":""}>Tudo em um arquivo por formato</option><option value="pessoa" ${FOLHA.modo==="pessoa"?"selected":""}>Um arquivo por integrante (.zip)</option></select></div></div>
   <div class="callout" style="margin:12px 0 0"><b>${sel.length}</b> integrante(s) selecionado(s) · <b>${nArq}</b> arquivo(s)${nArq>1?" em um .zip":""}</div>
   <div class="row" style="margin-top:12px"><button class="b" id="fgo" style="flex:none" ${sel.length&&nf?"":"disabled"}>${ic("down")} Baixar folhas</button></div></div>`;
}
function bindFolhas(){
  const re=()=>go("contador",true),tg=(set,v)=>{set.has(v)?set.delete(v):set.add(v)};
  document.querySelectorAll("[data-fcargo]").forEach(b=>b.onclick=()=>{tg(FOLHA.cargos,b.dataset.fcargo);re()});
  document.querySelectorAll("[data-fdepto]").forEach(b=>b.onclick=()=>{tg(FOLHA.deptos,b.dataset.fdepto);re()});
  document.querySelectorAll("[data-fpes]").forEach(c=>c.onchange=()=>{c.checked?FOLHA.pessoas.add(c.dataset.fpes):FOLHA.pessoas.delete(c.dataset.fpes);re()});
  document.querySelectorAll("[data-faba]").forEach(c=>c.onchange=()=>{FOLHA.abas[c.dataset.faba]=c.checked;re()});
  document.querySelectorAll("[data-ffmt]").forEach(c=>c.onchange=()=>{c.checked?FOLHA.fmt.add(c.dataset.ffmt):FOLHA.fmt.delete(c.dataset.ffmt);re()});
  const q=$("fpq");if(q)q.oninput=()=>{FOLHA.q=q.value;re();const n=$("fpq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  const v=$("fpvis");if(v)v.onclick=()=>{const t=estNorm(FOLHA.q);folhaBase().filter(x=>!t||estNorm(x.nome).includes(t)).forEach(x=>FOLHA.pessoas.add(chaveFolha(x)));re()};
  const l=$("fplimpa");if(l)l.onclick=()=>{FOLHA.cargos.clear();FOLHA.deptos.clear();FOLHA.pessoas.clear();FOLHA.q="";re()};
  const m=$("fmodo");if(m)m.onchange=()=>{FOLHA.modo=m.value;re()};
  const g=$("fgo");if(g)g.onclick=()=>folhasBaixar();
}
async function xlsxFiltrado(uids,abas){
  if(typeof ExcelJS==="undefined")throw new Error("Biblioteca de planilha não carregou. Recarregue a página e tente de novo.");
  const wb=buildWorkbook({uids,abas});
  return new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
async function folhasBaixar(){
  const sel=folhaSel(),A=FOLHA.abas,fm=[...FOLHA.fmt],R=POINT.result;
  if(!sel.length)return toast("Nenhum integrante selecionado.",true);
  if(!fm.length)return toast("Marque ao menos um formato.",true);
  if(!Object.values(A).some(Boolean))return toast("Marque ao menos uma aba.",true);
  if(!R&&!A.capa&&!A.integrantes)return toast("Calcule o ponto na aba Ponto primeiro — jornadas e folha individual dependem dele.",true);
  const per=R?R.start.slice(0,7):"sem-periodo";
  toast("Gerando as folhas…");
  try{
    const arq=[],gerar=async(uids,rot)=>{
      if(fm.includes("xlsx"))arq.push({nome:`folha-ponto_${rot}_${per}.xlsx`,blob:await xlsxFiltrado(uids,A)});
      if(fm.includes("pdf"))arq.push({nome:`folha-ponto_${rot}_${per}.pdf`,blob:await gerarPdfContador({uids,abas:A})});
      if(fm.includes("csv")&&R&&(A.jornadas||A.individual))arq.push({nome:`folha-ponto_${rot}_${per}.csv`,blob:relCsv(specJornadas(uids))});
    };
    if(FOLHA.modo==="pessoa"){const usados=new Set();for(const x of sel){let r=safe(x.nome),n=1;while(usados.has(r))r=safe(x.nome)+"_"+(++n);usados.add(r);await gerar([chaveFolha(x)],r)}}
    else await gerar(sel.map(chaveFolha),rotuloFolha(sel));
    if(!arq.length)return toast("Nada para gerar com essas escolhas.",true);
    if(arq.length===1){await saveFile(arq[0].nome,arq[0].blob);return}
    if(typeof JSZip==="undefined")throw new Error("Biblioteca de compactação não carregou. Recarregue a página e tente de novo.");
    const zip=new JSZip();arq.forEach(a=>zip.file(a.nome,a.blob));
    const ok=await saveFile(`folhas-de-ponto_${per}.zip`,await zip.generateAsync({type:"blob"}));
    if(ok)toast(`${arq.length} arquivo(s) em um .zip.`);
  }catch(e){console.error(e);toast("Não foi possível gerar as folhas: "+(e&&e.message?e.message:e),true)}
}
function specFolhaIndividual(u,R){
  const maxP=Math.max(1,...u.rows.map(r=>r.intervals.length)),cols=[{h:"Data",t:"date",w:12},{h:"Dia",w:6,c:true},{h:"Situação",w:14}];
  for(let k=1;k<=maxP;k++)cols.push({h:"Entrada "+k,w:9,c:true},{h:"Saída "+k,w:11,c:true});
  cols.push({h:"Trabalhado",t:"hm",w:11},{h:"Previsto",t:"hm",w:10},{h:"Atraso (min)",t:"num",w:11},{h:"Extra (min)",t:"num",w:10},{h:"Observação",w:34});
  const rows=u.rows.map(r=>{
    const row=[r.day,r.wd,STL[r.status]];
    for(let k=0;k<maxP;k++){const iv=r.intervals[k],m=iv&&iv.match(/^(\d{2}:\d{2})–(\d{2}:\d{2})(\s\(\+1\))?$/);row.push(m?m[1]:"",m?m[2]+(m[3]?" (+1)":""):"")}
    row.push(r.workedMin,r.expectedMin,r.late||0,r.extra||0,obsText(r));return row;
  });
  const nC=cols.length,tot=new Array(nC).fill(null);[nC-5,nC-4,nC-3,nC-2].forEach(i=>tot[i]="sum");
  const tint={col:2,map:{[STL.ok]:[214,237,216],[STL.falta]:[232,223,204],[STL.pendencia]:[240,230,211],[STL.atestado]:[214,234,248],[STL.justificada]:[214,237,216],[STL.esquecido]:[197,168,130]}};
  const fb=folhaBanco(u,R),quadro={titulo:"Horas a mais e banco de horas — "+fb.mm,linhas:fb.linhas,notas:fb.notas};
  return{titulo:`Folha de ponto — ${u.nome}`,sub:`${(u.ig&&u.ig.cargo)||"—"} · ${brDate(R.start)} a ${brDate(R.end)}${u.ig&&u.ig.id?" · Escala: "+escalasTexto(u.ig,R.start,R.end):""}`,sensivel:true,cols,rows,tot,tint,quadro,assinatura:{esq:`Integrante: ${u.nome}`,dir:"Casa Hiro — responsável"}};
}

function pgContador(){return pgContadorBase()+pgFolhasFiltro()}
function bindContador(){bindContadorBase();bindFolhas()}

function asoInfoHtml(i){
  if(!i.id)return"";
  const l=dvAll().filter(d=>d.vinc===i.id&&/aso|exame ocupacional/i.test((d.cat||"")+" "+d.nome)).sort((a,b)=>b.validade.localeCompare(a.validade)),u=l[0];
  const inf=u?dvInfo(u):null;
  return `<div class="callout ${inf&&inf.nivel>=2?"sand":""}" style="margin-top:12px"><b>Exame periódico (ASO / PCMSO):</b> ${u?`${esc(inf.label)} — validade ${brDate(u.validade)}`:"nenhum ASO lançado para este integrante"}. <button type="button" class="lnk" data-gaso="${i.id}">${u?"Renovar":"Lançar ASO"}</button></div>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("[data-gaso]");if(!b)return;
  const ig=S.integrantes[b.dataset.gaso];if(!ig)return;
  const l=dvAll().filter(d=>d.vinc===ig.id&&/aso|exame ocupacional/i.test((d.cat||"")+" "+d.nome)).sort((a,b)=>b.validade.localeCompare(a.validade));
  if(l[0])openDocRenovar(l[0].id);else openDocVal(null,{vinc:ig.id,cat:"ASO (exame ocupacional)",nome:"ASO — "+nomeInteg(ig)});
});


