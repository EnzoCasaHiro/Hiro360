/* ================= planilha do ponto: edição em grade, igual ao Excel ================= */
// colunas 0..ncol-1 = batidas (Entrada/Saída); coluna ncol = Previsto do dia (editável); Trabalhado e Saldo são calculados
const PLN={uid:null,igId:null,de:"",ate:"",dias:[],orig:[],grid:[],prev:[],prevBase:[],prevMan:[],ncol:6,sel:{r0:0,c0:0,r1:0,c1:0},undo:[],snap:"",snapUsado:false,calc:null,calcErro:"",arr:false};
// "7", "730", "07:30", "7h30", "7.30", 0.3125 (hora do Excel) -> "07:30"; vazio -> ""; inválido -> null
function plnHora(v){
  if(typeof v==="number"&&isFinite(v)&&v>=0&&v<1){const m=Math.round(v*1440)%1440;return String(m/60|0).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
  const s=String(v??"").trim().toLowerCase().replace(/\s+/g,"");if(!s)return "";
  const m=s.match(/^(\d{1,2})[:h.,](\d{2})(?::\d{2})?$/)||s.match(/^(\d{1,2})(\d{2})$/)||s.match(/^(\d{1,2})h?()$/);
  if(!m)return null;const h=+m[1],mi=+(m[2]||0);if(h>23||mi>59)return null;
  return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0");
}
// duração do previsto: "8", "8:00", "0800", "7h20", 0.333 (Excel) -> "08:00"; aceita até 99:59 (plantão)
function plnDur(v){
  if(typeof v==="number"&&isFinite(v)&&v>=0&&v<1)return fmtHHMM(Math.round(v*1440));
  const s=String(v??"").trim().toLowerCase().replace(/\s+/g,"");if(!s)return "";
  const m=s.match(/^(\d{1,2})[:h.,](\d{2})(?::\d{2})?$/)||s.match(/^(\d{1,2})(\d{2})$/)||s.match(/^(\d{1,2})h?()$/);
  if(!m)return null;const mi=+(m[2]||0);if(mi>59)return null;
  return fmtHHMM(+m[1]*60+mi);
}
const plnMin=s=>{const m=/^(\d+):(\d{2})$/.exec(s||"");return m?+m[1]*60+ +m[2]:0};
// previsto digitado à mão na planilha: vale no cálculo do ponto no lugar do previsto da escala
function prevManual(igId,dia){const d=S.config["prevm_"+igId],v=d&&d.dias&&d.dias[dia];return v==null?null:+v}
function aplicaPrevManual(r,pm){
  r.expectedMin=pm;r.flags.push("previsto_manual");
  const dif=r.workedMin-pm,tol=Math.abs(dif)<=10; // CLT art. 58 §1º: até 10 min no dia não contam
  r.late=0;r.early=tol||dif>0?0:-dif;r.extra=tol||dif<0?0:dif;
  if(pm>0&&!r.workedMin&&(r.status===SEM_ESCALA||r.status===OK))r.status=FALTA;
  else if(pm===0&&r.status===FALTA)r.status=SEM_ESCALA;
  else if(pm>0&&r.workedMin&&r.status===SEM_ESCALA)r.status=OK;
}
FLAG_LABEL.previsto_manual="previsto alterado à mão";
// data vinda do Excel/colagem: número de série, AAAA-MM-DD, DD/MM/AAAA ou DD/MM
function plnData(v){
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")}
  const s=String(v??"").trim();let m=s.match(/^\d{4}-\d{2}-\d{2}/);if(m)return m[0];
  m=s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?!\d)/);if(!m)return null;
  const y=m[3]?(m[3].length===2?"20"+m[3]:m[3]):PLN.de.slice(0,4);
  return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
}
const plnPessoas=()=>integList().filter(i=>i.uid!=null&&i.uid!==""&&!semPonto(i));
const plnPode=()=>podeEd("ponto");
const plnTrava=r=>!plnPode()||!!mesFechado(PLN.dias[r]);
const plnColNome=c=>c===PLN.ncol?"Previsto":`${c%2?"Saída":"Entrada"} ${(c>>1)+1}`;
const plnFaixa=()=>{const s=PLN.sel;return{rA:Math.min(s.r0,s.r1),rB:Math.max(s.r0,s.r1),cA:Math.min(s.c0,s.c1),cB:Math.max(s.c0,s.c1)}};
const plnNaSel=(r,c)=>{const f=plnFaixa();return r>=f.rA&&r<=f.rB&&c>=f.cA&&c<=f.cB};
const plnMulti=()=>{const s=PLN.sel;return s.r0!==s.r1||s.c0!==s.c1};
const plnNorm=(c,v)=>c===PLN.ncol?plnDur(v):plnHora(v);
const plnCel=(c,v)=>v===""||v==null?"":(plnNorm(c,v)??String(v).trim());
const plnGet=(r,c)=>c===PLN.ncol?PLN.prev[r]:PLN.grid[r][c];
const plnSet=(r,c,v)=>{if(c===PLN.ncol)PLN.prev[r]=v;else PLN.grid[r][c]=v};
const plnBase=(r,c)=>c===PLN.ncol?PLN.prevBase[r]:((PLN.orig[r][c]||{}).h||"");
function plnLargura(n){n+=n%2;if(n<=PLN.ncol)return;PLN.ncol=n;PLN.grid.forEach(l=>{while(l.length<n)l.push("")})}
function plnCarrega(){
  const dias=[];for(let d=PLN.de;d<=PLN.ate&&dias.length<93;d=addDaysIso(d,1))dias.push(d);
  PLN.dias=dias;
  PLN.orig=dias.map(d=>dayMarcas(PLN.uid,d).map(m=>({id:m.id,h:m.ts.slice(11,16),manual:m.origem==="manual"})));
  PLN.ncol=Math.max(6,...PLN.orig.map(o=>o.length+(o.length%2?1:2)));
  PLN.grid=PLN.orig.map(o=>{const l=o.map(x=>x.h);while(l.length<PLN.ncol)l.push("");return l});
  PLN.undo=[];PLN.sel={r0:0,c0:0,r1:0,c1:0};
  const ig=integByUid(PLN.uid);PLN.igId=ig?ig.id:null;
  BHCACHE.clear();
  const ontem=addDaysIso(hojeIso(),-1),ate=PLN.ate<ontem?PLN.ate:ontem;
  const R=PLN.de<=ate?calcSilencioso(PLN.de,ate):null,u=R&&R.users&&R.users.find(x=>+x.uid===+PLN.uid);
  PLN.calc=u?new Map(u.rows.map(x=>[x.day,x])):null;PLN.calcErro=(R&&R.erro)||"";
  PLN.prevMan=dias.map(d=>PLN.igId?prevManual(PLN.igId,d):null);
  PLN.prevBase=dias.map((d,r)=>{const pm=PLN.prevMan[r];if(pm!=null)return fmtHHMM(pm);const cr=PLN.calc&&PLN.calc.get(d);return cr?fmtHHMM(cr.expectedMin):""});
  PLN.prev=PLN.prevBase.slice();
}
// previsto apagado sem ter sido digitado antes não é mudança (só volta a valer a escala)
function plnPrevMudou(r){const h=plnDur(PLN.prev[r]);return h===null||(h===""?PLN.prevMan[r]!=null:h!==PLN.prevBase[r])}
const plnMudouLinha=r=>PLN.grid[r].some((v,c)=>(plnHora(v)??v)!==plnBase(r,c));
function plnClasses(r,c){
  const h=plnNorm(c,plnGet(r,c)),cl=[],prv=c===PLN.ncol;
  if(h===null)cl.push("inv");
  else if(prv?plnPrevMudou(r):h!==plnBase(r,c))cl.push("mud");
  else if(prv?PLN.prevMan[r]!=null:(PLN.orig[r][c]||{}).manual)cl.push("man");
  if(plnNaSel(r,c))cl.push("sel");
  return cl;
}
const plnMudancas=()=>PLN.grid.reduce((s,l,r)=>s+l.reduce((t,v,c)=>t+((plnHora(v)??v)!==plnBase(r,c)?1:0),0)+(plnPrevMudou(r)?1:0),0);
function plnConta(){const b=$("plsv"),n=plnMudancas();if(b){b.disabled=!n;b.innerHTML=`${ic("check")} Salvar alterações${n?` (${n})`:""}`}}
// trabalhado do dia: o do cálculo oficial enquanto a linha não muda; mexeu, soma os pares entrada→saída na hora
function plnTrab(r){
  const cr=PLN.calc&&PLN.calc.get(PLN.dias[r]);
  if(cr&&!plnMudouLinha(r))return cr.workedMin;
  const t=PLN.grid[r].map(plnHora).filter(Boolean).map(plnMin).sort((a,b)=>a-b);let s=0;
  for(let i=0;i+1<t.length;i+=2)s+=t[i+1]-t[i];
  return s;
}
const plnPrevMin=r=>plnMin(plnDur(PLN.prev[r])||"");
const plnSaldoHtml=m=>m?`<span style="color:${m<0?"var(--bad)":"var(--verde-medio)"}">${m>0?"+":""}${fmtHHMM(m)}</span>`:"00:00";
function plnLinhaCalc(r){
  const g=$("plgrid");if(!g)return;const t=plnTrab(r),p=plnPrevMin(r),temP=!!plnDur(PLN.prev[r]);
  const a=g.querySelector(`[data-trab="${r}"]`),b=g.querySelector(`[data-saldo="${r}"]`);
  if(a)a.textContent=t||temP?fmtHHMM(t):"";if(b)b.innerHTML=t||temP?plnSaldoHtml(t-p):"";
  plnTotais();
}
function plnTotais(){
  const T=PLN.dias.reduce((s,_,r)=>s+plnTrab(r),0),P=PLN.dias.reduce((s,_,r)=>s+plnPrevMin(r),0);
  const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
  set("pltt",`<b>${fmtHHMM(T)}</b>`);set("plpt",`<b>${fmtHHMM(P)}</b>`);set("plst",`<b>${plnSaldoHtml(T-P)}</b>`);
}
function plnPinta(focar){
  const g=$("plgrid");if(!g)return;
  const n=PLN.ncol,inp=(r,c,d,ro)=>`<td class="${plnClasses(r,c).join(" ")}"><input class="plc" data-r="${r}" data-c="${c}" value="${esc(plnNorm(c,plnGet(r,c))??plnGet(r,c))}" inputmode="numeric" autocomplete="off" aria-label="${brDate(d)} ${plnColNome(c)}" ${ro?"readonly":""}></td>`;
  $("plerr").innerHTML=PLN.calcErro?`<div class="callout sand" style="margin-top:10px">Não deu para calcular a situação dos dias: ${esc(PLN.calcErro)}</div>`:"";
  PLN.pintando=true;try{const a=document.activeElement;if(a&&g.contains(a))a.blur()}finally{PLN.pintando=false}
  g.innerHTML=`<table class="pltab"><thead><tr><th class="dia">Dia</th><th>Situação</th>${Array.from({length:n},(_,c)=>`<th>${plnColNome(c)}</th>`).join("")}<th>Trabalhado</th><th>Previsto</th><th>Saldo</th></tr></thead><tbody>${PLN.dias.map((d,r)=>{
    const cr=PLN.calc&&PLN.calc.get(d),wd=pyWeekday(d),lock=!!mesFechado(d),ro=plnTrava(r);
    return `<tr class="${wd>=5?"fds":""}${lock?" lock":""}"><td class="dia">${brDate(d).slice(0,5)} ${WD[wd]}${lock?' <span class="sub">fechado</span>':""}</td><td class="num" style="text-align:left">${(()=>{const pl=cr?`<span class="pill s-${cr.status}">${esc(STL[cr.status]||cr.status)}</span>`:"—";return PLN.igId&&plnPode()&&!lock?`<button type="button" class="lnk" data-plesc="${d}" title="Estava escalado(a) ou de folga? Clique para ajustar a escala deste dia">${pl}</button>`:pl})()}</td>${PLN.grid[r].map((_,c)=>inp(r,c,d,ro)).join("")}<td class="num" data-trab="${r}"></td>${inp(r,n,d,ro)}<td class="num" data-saldo="${r}"></td></tr>`;
  }).join("")}</tbody><tfoot><tr><td class="dia">Total</td><td colspan="${n+1}"></td><td class="num" id="pltt"></td><td class="num" id="plpt"></td><td class="num" id="plst"></td></tr></tfoot></table>`;
  PLN.dias.forEach((_,r)=>plnLinhaCalc(r));
  plnConta();
  if(focar)plnFoca(PLN.sel.r1,PLN.sel.c1);
}
function plnMarcaSel(){const g=$("plgrid");if(g)g.querySelectorAll("input.plc").forEach(i=>i.parentNode.classList.toggle("sel",plnNaSel(+i.dataset.r,+i.dataset.c)))}
function plnFoca(r,c){const i=$("plgrid")&&$("plgrid").querySelector(`input[data-r="${r}"][data-c="${c}"]`);if(i){i.focus();i.select()}}
const plnSnapStr=()=>JSON.stringify({g:PLN.grid,p:PLN.prev});
function plnSnap(){PLN.undo.push(plnSnapStr());if(PLN.undo.length>60)PLN.undo.shift()}
function plnDesfaz(){const s=PLN.undo.pop();if(!s)return toast("Nada para desfazer.");const o=JSON.parse(s);PLN.grid=o.g;PLN.prev=o.p;PLN.ncol=PLN.grid[0]?PLN.grid[0].length:6;plnPinta(true)}
// aplica valores célula a célula a partir de (r0,c0); pula meses fechados.
// colagem de fora (externo) começando nas batidas só preenche batidas e abre colunas se precisar
function plnAplica(mat,r0,c0,externo){
  let trav=0;plnSnap();const n0=PLN.ncol;
  mat.forEach((l,i)=>{const r=r0+i;if(r>=PLN.dias.length)return;if(plnTrava(r)){trav++;return}
    if(c0===n0){plnSet(r,PLN.ncol,plnCel(PLN.ncol,l[0]));return}
    if(externo){plnLargura(c0+l.length);l.forEach((v,j)=>plnSet(r,c0+j,plnCel(c0+j,v)));return}
    l.forEach((v,j)=>{const c=c0+j;if(c<n0)plnSet(r,c,plnCel(c,v));else if(c===n0)plnSet(r,PLN.ncol,plnCel(PLN.ncol,v))})});
  if(trav)toast(`${trav} dia(s) em mês fechado ou sem permissão não foram alterados.`,true);
}
function plnCola(txt){
  const f=plnFaixa(),mat=txt.replace(/\r/g,"").replace(/\n+$/,"").split("\n").map(l=>l.split("\t"));
  // um valor só com várias células selecionadas: preenche a seleção inteira, como no Excel
  if(mat.length===1&&mat[0].length===1&&plnMulti()){const v=mat[0][0];plnAplica(Array.from({length:f.rB-f.rA+1},()=>Array(f.cB-f.cA+1).fill(v)),f.rA,f.cA);plnPinta(true);return}
  // primeira coluna com datas (copiado de outra planilha): cada linha vai para o seu dia; textos como "Seg" são ignorados
  const porData=mat.every(l=>!l.join("").trim()||plnData(l[0]))&&mat.some(l=>PLN.dias.includes(plnData(l[0])));
  if(porData){
    let fora=0,trav=0;plnSnap();
    const linhas=[];mat.forEach(l=>{const d=plnData(l[0]),r=PLN.dias.indexOf(d);if(r<0){if(d)fora++;return}linhas.push([r,l.slice(1).filter(x=>plnHora(x)!==null)])});
    linhas.forEach(([r,hs])=>{if(plnTrava(r)){trav++;return}plnLargura(hs.length);PLN.grid[r]=PLN.grid[r].map((_,c)=>plnHora(hs[c]??"")||"")});
    plnPinta(true);toast(`${linhas.length-trav} dia(s) colado(s) pela data.`+(fora?` ${fora} fora do período.`:"")+(trav?` ${trav} em mês fechado.`:""));return;
  }
  plnAplica(mat,f.rA,f.cA,true);
  PLN.sel={r0:f.rA,c0:f.cA,r1:Math.min(PLN.dias.length-1,f.rA+mat.length-1),c1:Math.min(PLN.ncol,f.cA+Math.max(...mat.map(l=>l.length))-1)};
  plnPinta(true);
}
function plnLimpa(){const f=plnFaixa();plnAplica(Array.from({length:f.rB-f.rA+1},()=>Array(f.cB-f.cA+1).fill("")),f.rA,f.cA);plnPinta(true)}
// Ctrl+D: repete a primeira linha da seleção nas de baixo (uma linha só: copia a de cima)
function plnRepete(){
  const f=plnFaixa();let de=f.rA,ini=f.rA+1;
  if(f.rA===f.rB){if(!f.rA)return;de=f.rA-1;ini=f.rA}
  const base=[];for(let c=f.cA;c<=f.cB;c++)base.push(plnGet(de,c));
  plnAplica(Array.from({length:f.rB-ini+1},()=>base.slice()),ini,f.cA);plnPinta(true);
}
function plnCopia(){const f=plnFaixa(),L=[];for(let r=f.rA;r<=f.rB;r++){const l=[];for(let c=f.cA;c<=f.cB;c++)l.push(plnGet(r,c));L.push(l.join("\t"))}
  (navigator.clipboard?navigator.clipboard.writeText(L.join("\n")):Promise.reject()).then(()=>toast("Copiado. Pode colar aqui ou no Excel."),()=>toast("O navegador não deixou copiar.",true))}
function plnMove(dr,dc,estende){
  const s=PLN.sel,r=Math.max(0,Math.min(PLN.dias.length-1,s.r1+dr)),c=Math.max(0,Math.min(PLN.ncol,s.c1+dc));
  PLN.sel=estende?{...s,r1:r,c1:c}:{r0:r,c0:c,r1:r,c1:c};plnMarcaSel();plnFoca(r,c);
}
async function plnSalva(){
  if(!plnPode())return toast("Seu perfil não permite alterar o ponto.",true);
  const inval=PLN.grid.reduce((s,l)=>s+l.filter(v=>plnHora(v)===null).length,0)+PLN.prev.filter(v=>plnDur(v)===null).length;
  if(inval)return toast(`${inval} célula(s) com hora inválida (em vermelho). Use o formato 07:30.`,true);
  const ops=[],prevOps=[];let dias=0;
  PLN.dias.forEach((d,r)=>{
    if(plnTrava(r))return;
    if(plnPrevMudou(r)){const h=plnDur(PLN.prev[r]);prevOps.push({d,min:h===""?null:plnMin(h)})}
    const novo=PLN.grid[r].map(plnHora).filter(Boolean).sort(),restO=[...PLN.orig[r]],restN=[];
    novo.forEach(h=>{const i=restO.findIndex(o=>o.h===h);if(i>=0)restO.splice(i,1);else restN.push(h)});
    if(!restO.length&&!restN.length)return;dias++;
    for(let i=0;i<Math.max(restO.length,restN.length);i++){
      const o=restO[i],h=restN[i];
      if(o&&h)ops.push({t:"alt",id:o.id,ts:d+"T"+h+":00"});else if(o)ops.push({t:"rem",id:o.id});else ops.push({t:"add",ts:d+"T"+h+":00"});
    }
  });
  if(!ops.length&&!prevOps.length)return toast("Nada para salvar.");
  if(prevOps.length&&!PLN.igId)return toast("Este integrante não está cadastrado; não dá para gravar o previsto.",true);
  const q=t=>ops.filter(o=>o.t===t).length,partes=[];
  if(ops.length)partes.push(`Batidas: ${q("add")} incluída(s), ${q("alt")} alterada(s), ${q("rem")} removida(s), em ${dias} dia(s).`);
  if(prevOps.length)partes.push(`Previsto alterado em ${prevOps.length} dia(s)${prevOps.some(p=>p.min==null)?" (os apagados voltam a seguir a escala)":""}.`);
  if(!await askConfirm(`Salvar? ${partes.join(" ")} A hora original das batidas alteradas fica guardada no histórico.`,"Salvar"))return;
  ops.forEach(o=>{
    const m=o.id&&S.marcacoes[o.id];
    if(o.t==="add")put("marcacoes",uid8(),{uid:+PLN.uid,ts:o.ts,origem:"manual",motivo:"Adicionada na planilha do ponto",removida:false});
    else if(o.t==="alt"&&m)put("marcacoes",m.id,{...strip(m),ts:o.ts,origem:"manual",tsOriginal:m.tsOriginal||m.ts,motivo:"Editada na planilha do ponto"});
    else if(o.t==="rem"&&m)put("marcacoes",m.id,{...strip(m),removida:true,motivo:"Removida na planilha do ponto"});
  });
  if(prevOps.length){
    const id="prevm_"+PLN.igId,doc=S.config[id]||{},dd={...(doc.dias||{})};
    prevOps.forEach(p=>{if(p.min==null)delete dd[p.d];else dd[p.d]=p.min});
    put("config",id,{...strip(doc),dias:dd});
  }
  afterOc();plnCarrega();plnPinta(false);toast(`Ponto salvo: ${ops.length+prevOps.length} alteração(ões).`);
}
function plnExcel(){
  if(typeof XLSX==="undefined")return toast("A biblioteca de Excel não carregou. Recarregue a página e tente de novo.",true);
  const ig=integByUid(PLN.uid),nome=ig?nomeInteg(ig):"ID "+PLN.uid,n=PLN.ncol;
  const cab=["Data","Dia",...Array.from({length:n},(_,c)=>plnColNome(c)),"Previsto","Trabalhado","Saldo","Situação"];
  const linhas=PLN.dias.map((d,r)=>{const cr=PLN.calc&&PLN.calc.get(d),t=plnTrab(r),p=plnPrevMin(r);return[brDate(d),WD[pyWeekday(d)],...PLN.grid[r].map(v=>plnHora(v)??v),plnDur(PLN.prev[r])??PLN.prev[r],fmtHHMM(t),fmtHHMM(t-p),cr?STL[cr.status]||cr.status:""]});
  const ws=XLSX.utils.aoa_to_sheet([["Integrante",nome,"Nº no relógio",String(PLN.uid)],["Período",brDate(PLN.de)+" a "+brDate(PLN.ate)],["Altere as colunas de Entrada, Saída e Previsto (formato 07:30). Depois use \"Importar Excel\" na Planilha do ponto e confira antes de salvar."],[],cab,...linhas]);
  ws["!cols"]=cab.map((_,i)=>({wch:i===0?12:i===1?5:11}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Ponto");
  XLSX.writeFile(wb,safe(`Ponto ${nome} ${PLN.de} a ${PLN.ate}`)+".xlsx");
}
async function plnImporta(f){
  try{
    if(typeof XLSX==="undefined")throw new Error("a biblioteca de Excel não carregou. Recarregue a página.");
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:""});
    const hi=A.findIndex(l=>/^data$/i.test(String(l[0]).trim()));
    if(hi<0)throw new Error('não achei o cabeçalho com "Data" na primeira coluna. Use o arquivo de "Baixar Excel".');
    const cols=A[hi].map((h,i)=>/^(entrada|sa[ií]da|batida)/i.test(String(h).trim())?i:-1).filter(i=>i>=0),cp=A[hi].findIndex(h=>/^previst/i.test(String(h).trim()));
    if(!cols.length&&cp<0)throw new Error("não achei as colunas de Entrada, Saída ou Previsto.");
    plnSnap();let n=0,fora=0,trav=0;
    A.slice(hi+1).forEach(l=>{const d=plnData(l[0]);if(!d)return;const r=PLN.dias.indexOf(d);if(r<0){fora++;return}if(plnTrava(r)){trav++;return}
      if(cols.length){plnLargura(cols.length);PLN.grid[r]=PLN.grid[r].map((_,c)=>plnCel(c,c<cols.length?l[cols[c]]:""))}
      if(cp>=0)PLN.prev[r]=plnCel(PLN.ncol,l[cp]);n++});
    plnPinta(false);
    toast(`${n} dia(s) lido(s) do Excel. Confira as células amarelas e clique em Salvar alterações.`+(fora?` ${fora} dia(s) fora do período ignorado(s).`:"")+(trav?` ${trav} em mês fechado ignorado(s).`:""));
  }catch(e){toast("Não foi possível ler a planilha: "+e.message,true)}
}
document.addEventListener("mouseup",()=>{PLN.arr=false});
xmReg("ponto","planilha","Ajustes e justificativas","Planilha do ponto (como no Excel)",()=>`<div class="card"><h2>Planilha do ponto</h2>
  <p class="sub" style="margin:0 0 12px">Veja e corrija as batidas de um integrante num período inteiro, numa grade igual à do Excel: um dia por linha, entradas e saídas nas colunas. Dá para editar vários dias de uma vez, colar direto do Excel, baixar a planilha e importar de volta. Nada é gravado até você clicar em <b>Salvar alterações</b>, e a hora original de cada batida alterada fica no histórico.</p>
  <button class="b" id="plabre" style="flex:none">${ic("sheet")} Abrir a planilha do ponto</button></div>`,()=>{const b=$("plabre");if(b)b.onclick=()=>openPlanilha()});
function openPlanilha(uid,de,ate){
  const pes=plnPessoas();if(!pes.length)return toast("Nenhum integrante com número no relógio. Cadastre no Prontuário.",true);
  PLN.uid=uid!=null&&pes.some(i=>+i.uid===+uid)?+uid:(PLN.uid!=null&&pes.some(i=>+i.uid===+PLN.uid)?+PLN.uid:+pes[0].uid);
  const R=POINT.result,hoje=hojeIso();
  PLN.de=de||(R&&R.start)||hoje.slice(0,8)+"01";PLN.ate=ate||(R&&R.end)||hoje;
  const ov=openModal(`<h3>Planilha do ponto</h3><div class="sub" style="margin-bottom:10px">Edite vários dias de uma vez, como no Excel. Nada muda até você clicar em <b>Salvar alterações</b>.</div>
   <div class="row" style="align-items:flex-end;flex-wrap:wrap">
    <div style="flex:2 1 220px"><label>Integrante</label><select id="plp">${pes.map(i=>`<option value="${esc(i.uid)}" ${+i.uid===+PLN.uid?"selected":""}>${esc(nomeInteg(i))} (nº ${esc(i.uid)})</option>`).join("")}</select></div>
    <div style="flex:1 1 140px"><label>De</label><input type="date" id="plde" value="${PLN.de}"></div>
    <div style="flex:1 1 140px"><label>Até</label><input type="date" id="plate" value="${PLN.ate}"></div>
    <button class="b sec sm" id="plmes" style="flex:none">Este mês</button><button class="b sec sm" id="plant" style="flex:none">Mês passado</button></div>
   <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">
    ${plnPode()?`<button class="b sec sm" id="plrep" style="flex:none">Repetir para baixo</button><button class="b sec sm" id="pllim" style="flex:none">${ic("trash")} Limpar seleção</button><button class="b sec sm" id="pldes" style="flex:none">${ic("undo")} Desfazer</button>`:""}
    <span style="flex:1"></span>
    <button class="b sec sm" id="plxls" style="flex:none">${ic("down")} Baixar Excel</button>
    ${plnPode()?`<button class="b sec sm" id="plimp" style="flex:none">${ic("up")} Importar Excel</button><input type="file" id="plfile" accept=".xlsx,.xls,.csv" hidden>`:""}</div>
   <div id="plerr"></div>
   <div class="wrap" id="plgrid" style="margin-top:10px;max-height:58vh;overflow:auto"></div>
   <p class="sub" style="margin:8px 0 0">Clique na célula e digite <b>0730</b> ou <b>7:30</b> (substitui o valor; para corrigir só um pedaço, dê <b>duplo clique</b> ou aperte <b>F2</b>). Setas e Enter andam entre as células; arraste o mouse ou use Shift+setas para selecionar várias. <b>Ctrl+C</b> e <b>Ctrl+V</b> copiam e colam (inclusive do Excel); <b>Ctrl+D</b> repete a primeira linha da seleção para baixo; <b>Delete</b> limpa; <b>Ctrl+Z</b> desfaz; <b>Ctrl+S</b> salva.</p>
   <div class="legend" style="margin-top:6px"><span><i style="background:#fff1b8"></i>alterado, ainda não salvo</span><span><i style="background:rgba(46,125,50,.2)"></i>selecionado</span><span><i style="background:var(--azul-mar)"></i>lançado à mão (batida ou previsto)</span><span><i style="background:var(--line)"></i>mês fechado (só leitura)</span></div>
   <p class="sub" style="margin:6px 0 0"><b>Trabalhado</b> e <b>Saldo</b> recalculam na hora, enquanto você digita. O <b>Previsto</b> vem da escala; digite outro valor para trocar o daquele dia (apague para voltar à escala). A Situação é recalculada ao salvar. Turno da noite: a batida depois da meia-noite fica na linha do dia seguinte, como no relógio.</p>
   <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="b sec" id="plcx">Fechar</button>${plnPode()?`<button class="b" id="plsv">${ic("check")} Salvar alterações</button>`:""}</div>`);
  ov.querySelector(".modal").classList.add("largo","planilha");
  const $o=s=>ov.querySelector(s),g=$o("#plgrid");
  const descarta=async()=>!plnMudancas()||await askConfirm("Há alterações não salvas nesta planilha. Descartar?","Descartar");
  const fecha=async()=>{if(await descarta())ov.remove()};
  // clique fora da janela não pode jogar fora o que foi digitado
  ov.addEventListener("mousedown",e=>{if(e.target===ov&&plnMudancas()){e.stopImmediatePropagation();fecha()}},{capture:true});
  const recarrega=()=>{plnCarrega();plnPinta(false)};
  const periodo=async(de,ate)=>{
    if(!de||!ate||!await descarta()){$o("#plde").value=PLN.de;$o("#plate").value=PLN.ate;return}
    if(ate<de)[de,ate]=[ate,de];
    if(daysBetweenIso(de,ate)>92){ate=addDaysIso(de,92);toast("A planilha mostra até 93 dias por vez.")}
    PLN.de=de;PLN.ate=ate;$o("#plde").value=de;$o("#plate").value=ate;recarrega();
  };
  $o("#plp").onchange=async e=>{if(!await descarta()){e.target.value=PLN.uid;return}PLN.uid=+e.target.value;recarrega()};
  $o("#plde").onchange=()=>periodo($o("#plde").value,$o("#plate").value);
  $o("#plate").onchange=()=>periodo($o("#plde").value,$o("#plate").value);
  $o("#plmes").onclick=()=>periodo(hojeIso().slice(0,8)+"01",hojeIso());
  $o("#plant").onclick=()=>{const ym=addDaysIso(hojeIso().slice(0,8)+"01",-1).slice(0,7);periodo(ym+"-01",mesFimIso(ym))};
  $o("#plcx").onclick=fecha;
  $o("#plxls").onclick=plnExcel;
  if(plnPode()){
    $o("#plsv").onclick=plnSalva;$o("#plrep").onclick=plnRepete;$o("#pllim").onclick=plnLimpa;$o("#pldes").onclick=plnDesfaz;
    $o("#plimp").onclick=()=>$o("#plfile").click();$o("#plfile").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)plnImporta(f)};
  }
  // Situação: lança folga/escala do dia sem perder o que já foi digitado na planilha
  const recalcula=()=>{const k={g:PLN.grid,p:PLN.prev,b:PLN.prevBase,u:PLN.undo,s:PLN.sel,n:PLN.ncol};plnCarrega();
    if(k.g.length===PLN.grid.length){PLN.grid=k.g;PLN.ncol=k.n;PLN.prev=k.p.map((v,r)=>v===k.b[r]?PLN.prev[r]:v);PLN.undo=k.u;PLN.sel=k.s}plnPinta(false)};
  g.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-plesc]");if(!b)return;const d=b.dataset.plesc,cr=PLN.calc&&PLN.calc.get(d);
    openEscalaAjuste(PLN.igId,d,{tipo:cr&&cr.status!=="sem_escala"?"folga":"trabalho",onSave:recalcula})});
  const cel=e=>e.target.closest&&e.target.closest("input.plc");
  g.addEventListener("mousedown",e=>{const t=cel(e);if(!t)return;const r=+t.dataset.r,c=+t.dataset.c;
    if(e.shiftKey){e.preventDefault();PLN.sel={...PLN.sel,r1:r,c1:c};plnMarcaSel();return}
    if(document.activeElement===t&&t.dataset.ed)return; // em edição (duplo clique/F2): deixa posicionar o cursor
    // como no Excel: um clique seleciona a célula inteira e o que for digitado substitui o valor
    e.preventDefault();PLN.sel={r0:r,c0:c,r1:r,c1:c};PLN.arr=true;plnMarcaSel();t.focus();t.select()});
  const editaDentro=t=>{t.dataset.ed="1";const n=t.value.length;t.setSelectionRange(n,n)};
  g.addEventListener("dblclick",e=>{const t=cel(e);if(t)editaDentro(t)});
  g.addEventListener("focusout",e=>{const t=cel(e);if(t)delete t.dataset.ed});
  g.addEventListener("mouseover",e=>{const t=PLN.arr&&cel(e);if(!t)return;const r=+t.dataset.r,c=+t.dataset.c;if(r===PLN.sel.r1&&c===PLN.sel.c1)return;PLN.sel={...PLN.sel,r1:r,c1:c};plnMarcaSel()});
  g.addEventListener("focusin",e=>{const t=cel(e);if(!t)return;const r=+t.dataset.r,c=+t.dataset.c;
    if(PLN.sel.r1!==r||PLN.sel.c1!==c){PLN.sel={r0:r,c0:c,r1:r,c1:c};plnMarcaSel()}PLN.snap=plnSnapStr();PLN.snapUsado=false});
  // o "antes" vai para o desfazer já na primeira tecla, então Ctrl+Z funciona mesmo sem sair da célula
  g.addEventListener("input",e=>{const t=cel(e);if(!t||PLN.pintando)return;const r=+t.dataset.r,c=+t.dataset.c;
    if(!PLN.snapUsado){PLN.undo.push(PLN.snap);if(PLN.undo.length>60)PLN.undo.shift();PLN.snapUsado=true}
    plnSet(r,c,t.value);t.parentNode.className=plnClasses(r,c).join(" ");plnLinhaCalc(r);plnConta()});
  // célula que sumiu ao redesenhar a grade (ex.: Ctrl+Z) não pode regravar o valor antigo
  g.addEventListener("change",e=>{const t=cel(e);if(!t||PLN.pintando||!t.isConnected)return;const r=+t.dataset.r,c=+t.dataset.c,h=plnNorm(c,t.value);
    if(h!==null&&h!==t.value){t.value=h;plnSet(r,c,h)}
    t.parentNode.className=plnClasses(r,c).join(" ");plnLinhaCalc(r);plnConta()});
  g.addEventListener("paste",e=>{const t=cel(e);if(!t||t.readOnly&&!plnMulti())return;const txt=(e.clipboardData||window.clipboardData).getData("text");
    if(!/[\t\n]/.test(txt.replace(/\n+$/,""))&&!plnMulti())return;e.preventDefault();plnCola(txt)});
  g.addEventListener("keydown",e=>{const t=cel(e);if(!t)return;const k=e.key,kl=k.toLowerCase(),ctrl=e.ctrlKey||e.metaKey,multi=plnMulti(),ed=plnPode();
    if(ctrl&&kl==="s"){e.preventDefault();if(ed){t.dispatchEvent(new Event("change",{bubbles:true}));plnSalva()}return}
    if(ctrl&&kl==="z"&&ed){e.preventDefault();plnDesfaz();return}
    if(k==="F2"){e.preventDefault();editaDentro(t);return}
    if(ctrl&&kl==="d"&&ed){e.preventDefault();plnRepete();return}
    if(ctrl&&kl==="c"&&multi){e.preventDefault();plnCopia();return}
    if(ctrl&&kl==="x"&&multi&&ed){e.preventDefault();plnCopia();plnLimpa();return}
    if((k==="Delete"||k==="Backspace")&&multi&&ed){e.preventDefault();plnLimpa();return}
    const tudo=t.selectionStart===0&&t.selectionEnd===t.value.length;let dr=0,dc=0;
    if(k==="ArrowUp")dr=-1;else if(k==="ArrowDown")dr=1;else if(k==="Enter")dr=e.shiftKey?-1:1;
    else if(k==="ArrowLeft"&&(e.shiftKey||tudo||t.selectionEnd===0))dc=-1;
    else if(k==="ArrowRight"&&(e.shiftKey||tudo||t.selectionStart===t.value.length))dc=1;
    if(!dr&&!dc)return;
    e.preventDefault();if(k==="Enter")t.dispatchEvent(new Event("change",{bubbles:true}));plnMove(dr,dc,e.shiftKey&&k!=="Enter");
  });
  recarrega();
}

