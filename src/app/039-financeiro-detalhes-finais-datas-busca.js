/* ================= FINANCEIRO: detalhes finais (datas, busca, boleto, juros, baixa parcial/em lote, cancelar, recibo, PDF…) ================= */
const finDataOk=d=>{
  if(typeof d!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
  const[y,m,dd]=d.split("-").map(Number);if(y<2000||y>2100)return false;
  const t=new Date(y,m-1,dd);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===dd;
};
// linha digitável (47/48 números) ou código de barras (44): devolve só os números, "" se vazio, null se inválido
function finBarrasOk(v){
  const n=String(v||"").replace(/[\s.\-]/g,"");if(!n)return"";
  return/^\d+$/.test(n)&&[44,47,48].includes(n.length)?n:null;
}
const finBarrasFmt=n=>n.length===47?n.replace(/^(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})$/,"$1.$2 $3.$4 $5.$6 $7 $8"):n;

/* ---------- busca sem acento, em vários campos ---------- */
function finBusca(e,q){
  const termos=estNorm(q).split(" ").filter(Boolean);if(!termos.length)return true;
  const v=String(e.valor??"");
  const hay=estNorm([e.desc,e.contra,e.cat,e.area,e.obs,e.forma,e.parcela,e.doc,e.residente?resNomeDe(e.residente):"",v,v.replace(".",","),(+e.valor||0).toLocaleString("pt-BR",{minimumFractionDigits:2})].join(" "));
  return termos.every(t=>hay.includes(t));
}
/* ---------- ordenação por coluna e paginação ---------- */
const FIN_ORD={venc:e=>e.venc,desc:e=>estNorm(e.desc),cat:e=>estNorm(e.cat||""),area:e=>estNorm(e.area||""),valor:e=>finNum(e),status:e=>({vencido:0,aberto:1,pago:2,cancelada:3})[finStatus(e)]};
function finOrdem(a,b){
  const s=FIN.sort||{k:"venc",dir:1},f=FIN_ORD[s.k]||FIN_ORD.venc,x=f(a),y=f(b);
  const c=typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y),"pt");
  return (c*s.dir)||a.venc.localeCompare(b.venc)||a.desc.localeCompare(b.desc);
}
function finLim(){
  const sig=[FIN.tab,FIN.ano,FIN.mes,FIN.status,FIN.cat,FIN.q].join("|");
  if(FIN._sig!==sig){FIN._sig=sig;FIN.lim=100}
  return FIN.lim||100;
}
function finThSort(k,rot,cls){
  const s=FIN.sort||{k:"venc",dir:1};
  return `<th${cls?` class="${cls}"`:""}><button type="button" class="lnk" data-fsort="${k}" style="font:inherit;color:inherit;font-weight:inherit">${rot}${s.k===k?(s.dir>0?" ▲":" ▼"):""}</button></th>`;
}
/* ---------- saldo inicial do exercício: vem do ano anterior se não for informado ---------- */
function finSaldoIni(ano,prof){
  prof=prof||0;const c=finCfg().saldoIni||{};
  if(c[ano]!==undefined&&c[ano]!==""&&c[ano]!==null)return +c[ano]||0;
  if(prof>8)return 0;
  const ant=ano-1;
  if(!finKeys().some(k=>+k.slice(4)<=ant)&&!Object.keys(c).some(y=>+y<=ant))return 0;
  const fl=fluxoMeses(ant,FIN.incNF,false);
  return +(finSaldoIni(ant,prof+1)+soma(fl.meses,x=>x.ent-x.sai)).toFixed(2);
}
function finSaldoMuda(v){
  const c={...(finCfg().saldoIni||{})};
  if(v===""||v==null)delete c[FIN.ano];else c[FIN.ano]=+v||0;
  return c;
}
/* ---------- dia da semana, feriado e atraso ---------- */
function feriadoNome(iso){
  if(!iso||iso.length<10)return"";
  if(feriadosOff().has(iso))return"";
  const f=nationalHolidays(+iso.slice(0,4)).find(x=>x[0]===iso);if(f)return f[1];
  const x=feriadosExtra().find(h=>h.dia===iso);return x?(x.nome||x.desc||"feriado"):"";
}
const DIA_SEM=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const diaSem=iso=>{const[y,m,d]=iso.split("-").map(Number);return new Date(y,m-1,d).getDay()};
function proxDiaUtil(iso){
  let d=iso;for(let i=0;i<10;i++){const w=diaSem(d);if(w!==0&&w!==6&&!feriadoNome(d))return d;d=addDaysIso(d,1)}
  return d;
}
function finDiaAviso(iso){
  if(!finDataOk(iso))return"";
  const w=diaSem(iso),fer=feriadoNome(iso);
  if(w!==0&&w!==6&&!fer)return"";
  return `Cai ${fer?"no feriado ("+fer+")":"num "+DIA_SEM[w]}. Boletos e transferências costumam valer no próximo dia útil: ${brDate(proxDiaUtil(iso))} (${DIA_SEM[diaSem(proxDiaUtil(iso))]}).`;
}
function finDiaInfo(e){
  if(e.pago||!finDataOk(e.venc))return"";
  const h=hojeIso(),partes=[];
  if(e.venc<h){const n=daysBetweenIso(e.venc,h);partes.push(`<span style="color:var(--urgente)">${n} dia${n>1?"s":""} de atraso</span>`)}
  else{const w=diaSem(e.venc),fer=feriadoNome(e.venc);if(fer)partes.push("feriado: "+esc(fer));else if(w===0||w===6)partes.push("cai em "+DIA_SEM[w])}
  return partes.length?`<div class="sub">${partes.join(" · ")}</div>`:"";
}
/* ---------- ações extras de cada linha ---------- */
function finAcoes3(e){
  let h="";
  if(e.barras&&!e.pago)h+=`<button class="b sec sm" data-fcopia="${e.id}" title="Copiar a linha digitável do boleto">Copiar boleto</button> `;
  if(e.tipo==="receber"&&e.pago&&!e.cancelada)h+=`<button class="b sec sm" data-frecibo="${e.id}" title="Gerar recibo em PDF">${ic("receipt")} Recibo</button> `;
  if(!e.pago)h+=`<button class="b sec sm" data-fcancel="${e.id}" title="Cancelar a conta sem pagar (fica no histórico)">Cancelar</button> `;
  return h;
}
/* ---------- valor por extenso e recibo ---------- */
function extensoBRL(v){
  v=Math.round((+v||0)*100)/100;const reais=Math.floor(v),cent=Math.round((v-reais)*100);
  const U=["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const D=["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const C=["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  const ate999=n=>{if(n===0)return"";if(n===100)return"cem";const c=Math.floor(n/100),r=n%100,p=[];if(c)p.push(C[c]);if(r){if(r<20)p.push(U[r]);else p.push(D[Math.floor(r/10)]+(r%10?" e "+U[r%10]:""))}return p.join(" e ")};
  const mi=Math.floor(reais/1e6),mil=Math.floor(reais/1000)%1000,u=reais%1000,partes=[];
  if(mi)partes.push(ate999(mi)+(mi===1?" milhão":" milhões"));
  if(mil)partes.push(mil===1?"mil":ate999(mil)+" mil");
  if(u)partes.push(ate999(u));
  let txt="";
  if(partes.length){
    const ult=u||mil||mi;const simples=partes.length>1&&(u?(u<100||u%100===0):(mil?(mil<100||mil%100===0):true));
    txt=partes[0];
    for(let i=1;i<partes.length;i++){const ult_=i===partes.length-1;txt+=(ult_?(simples?" e ":(partes[i-1]==="mil"?" ":", ")):", ")+partes[i]}
    txt+=(mi&&!mil&&!u?" de":"")+(reais===1?" real":" reais");
  }
  if(cent)txt+=(txt?" e ":"")+ate999(cent)+(cent===1?" centavo":" centavos");
  return txt||"zero reais";
}
async function finReciboPdf(id){
  const e=finAll().find(x=>x.id===id);if(!e||!e.pago)return toast("Só há recibo de conta já recebida.",true);
  if(typeof window.jspdf==="undefined")return toast("Biblioteca de PDF não carregou. Recarregue a página e tente de novo.",true);
  try{
    const{jsPDF}=window.jspdf,doc=new jsPDF({unit:"pt",format:"a4"}),W=doc.internal.pageSize.getWidth(),emp=empresa(),val=finNum(e);
    const txt=(t,x,y,o)=>doc.text(String(t),x,y,o||{});
    doc.setFillColor(30,92,42);doc.rect(0,0,W,70,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(20);txt("RECIBO",40,44);
    doc.setFontSize(10);doc.setFont("helvetica","normal");txt(`Nº ${e.pago.replace(/-/g,"")}-${e.id.slice(0,4).toUpperCase()}`,W-40,44,{align:"right"});
    doc.setTextColor(60,60,60);doc.setFontSize(12);
    doc.setFont("helvetica","bold");doc.setFontSize(22);txt(fmtBRL(val),W/2,130,{align:"center"});
    doc.setFont("helvetica","normal");doc.setFontSize(12);
    const corpo=`Recebemos de ${e.contra||"(não informado)"}${e.residente?` (residente ${resNomeDe(e.residente)})`:""} a importância de ${fmtBRL(val)} (${extensoBRL(val)}), referente a ${e.desc}${e.comp?`, competência ${e.comp.slice(5)}/${e.comp.slice(0,4)}`:""}, com vencimento em ${brDate(e.venc)}, recebida em ${brDate(e.pago)}${e.forma?` por ${e.forma}`:""}.`;
    const linhas=doc.splitTextToSize(corpo,W-80);txt(linhas,40,180);
    let y=180+linhas.length*17+40;
    txt("Para maior clareza, firmamos o presente recibo.",40,y);y+=60;
    doc.setDrawColor(120,120,120);doc.line(W/2-130,y,W/2+130,y);y+=16;
    doc.setFont("helvetica","bold");doc.setFontSize(11);txt(emp.razao,W/2,y,{align:"center"});y+=15;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    if(emp.cnpj)txt("CNPJ "+emp.cnpj,W/2,y,{align:"center"}),y+=14;
    txt(emp.endereco,W/2,y,{align:"center"});y+=14;txt([emp.telefone,emp.email].filter(Boolean).join(" · "),W/2,y,{align:"center"});
    await saveFile(`recibo_${e.pago}_${safe(e.contra||e.desc).slice(0,30)}.pdf`,doc.output("blob"));
  }catch(err){console.error(err);toast("Não foi possível gerar o recibo: "+(err.message||err),true)}
}
/* ---------- PDF da lista filtrada ---------- */
async function finPdfLista(){
  const l=finFiltrar(FIN.tab),pagar=FIN.tab==="pagar";
  if(!l.length)return toast("Não há lançamentos na lista para gerar o PDF.",true);
  const per=FIN.mes<0?`${FIN.ano}`:`${MESES_PT[FIN.mes]} de ${FIN.ano}`;
  const spec={titulo:pagar?"Contas a pagar":"Contas a receber",sub:`${per} · ${l.length} lançamento(s) · ${relSub({},false)}`,sensivel:false,
    cols:[{h:"Vencimento",t:"date",w:13},{h:"Descrição",w:34},{h:pagar?"Fornecedor":"Cliente",w:24},{h:"Categoria",w:20},{h:"Valor",t:"money",w:15},{h:"Situação",w:13},{h:"Pago em",t:"date",w:13}],
    rows:l.map(e=>[e.venc,e.desc+(e.parcela?` (${e.parcela})`:""),e.contra||"",e.cat||"",finNum(e),finStatusLabel(e),e.pago||""]),tot:[null,null,null,null,"sum",null,null]};
  try{await saveFile(`contas-a-${FIN.tab}-${FIN.ano}${FIN.mes<0?"":"-"+String(FIN.mes+1).padStart(2,"0")}.pdf`,await relPdf([spec]))}
  catch(e){toast("Não foi possível gerar o PDF: "+(e.message||e),true)}
}
/* ---------- baixa: juros e multa, pagamento parcial, cancelar ---------- */
const arred2=v=>Math.round((+v||0)*100)/100;
function openFinBaixa(id){
  const e=finAll().find(x=>x.id===id);if(!e)return;
  const h=hojeIso(),atraso=e.venc<h?daysBetweenIso(e.venc,h):0,cfg=finCfg(),en=(typeof f4EncDe==="function"&&e.tipo==="receber")?f4EncDe(e):{multa:cfg.multa??2,juros:cfg.juros??1,proprio:false},mu=en.multa,ju=en.juros;
  const ov=openModal(`<h3>${e.tipo==="pagar"?"Dar baixa no pagamento":"Dar baixa no recebimento"}</h3><div class="sub" style="margin-bottom:10px">${esc(e.desc)} · vencimento ${brDate(e.venc)} · ${fmtBRL(e.valor)}${atraso?` · <b style="color:var(--urgente)">${atraso} dia(s) de atraso</b>`:""}</div>
   <div class="row"><div><label>Data</label><input type="date" id="fbdata" value="${h}"></div><div><label>Valor efetivo (R$) — com juros ou desconto</label><input type="number" min="0" step="0.01" data-stepby="1" id="fbval" value="${e.valor}"></div></div>
   ${atraso?`<div class="row" style="align-items:flex-end"><div><label>Multa (%)</label><input type="number" min="0" step="0.01" id="fbmulta" value="${mu}"></div><div><label>Juros (% ao mês)</label><input type="number" min="0" step="0.01" id="fbjuros" value="${ju}"></div><button type="button" class="b sec" id="fbcalc" style="flex:none">Calcular com multa e juros</button></div><div class="sub" id="fbcalcinfo"></div>`:""}
   <label style="display:none;gap:8px;align-items:center;font-weight:400;color:var(--ink)" id="fbparclbl"><input type="checkbox" id="fbparc"> <span>Foi pagamento <b>parcial</b>: manter o restante (<span id="fbrest"></span>) em aberto, vencendo em</span> <input type="date" id="fbvenc2" style="max-width:160px" value="${addDaysIso(h,15)}"></label>
   ${f4BaixaCampos(e)}
   <label>Comprovante (opcional)</label><input type="file" id="fbfile" multiple accept="${ANEXO_ACCEPT}"><div class="sub" style="margin-top:4px">${ANEXO_NOTA}</div>
   <div class="err" id="fberr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="b sec" id="fbcancela" style="margin-right:auto" title="Não vai ser pago: fica no histórico como cancelada">Cancelar esta conta</button><button class="b sec" id="fbcx">Fechar</button><button class="b" id="fbsv">Confirmar</button></div>`);
  const g=s=>ov.querySelector(s),er=m=>g("#fberr").textContent=m;
  const parcInfo=()=>{const v=+g("#fbval").value,lb=g("#fbparclbl");if(v>0&&v<e.valor-0.005){lb.style.display="flex";g("#fbrest").textContent=fmtBRL(arred2(e.valor-v))}else{lb.style.display="none";g("#fbparc").checked=false}};
  g("#fbval").oninput=parcInfo;g("#fbval").onchange=parcInfo;
  const bc=g("#fbcalc");if(bc)bc.onclick=()=>{
    const m=Math.max(0,+g("#fbmulta").value||0),j=Math.max(0,+g("#fbjuros").value||0);
    const dias=Math.max(0,daysBetweenIso(e.venc,g("#fbdata").value||h)),multa=arred2(e.valor*m/100),juros=arred2(e.valor*(j/100)/30*dias),tot=arred2(+e.valor+multa+juros);
    g("#fbval").value=tot;g("#fbcalcinfo").textContent=`${fmtBRL(e.valor)} + multa ${fmtBRL(multa)} + juros ${fmtBRL(juros)} (${dias} dia(s)) = ${fmtBRL(tot)}. Confira com o valor do boleto.`;parcInfo();
    if(!en.proprio)put("config","fin_cfg",{...strip(finCfg()),multa:m,juros:j});
  };
  g("#fbcx").onclick=()=>ov.remove();
  g("#fbcancela").onclick=async()=>{
    if(!await askConfirm(`Cancelar "${e.desc}"? A conta deixa de contar como pendente e fica no histórico como cancelada. Dá para desfazer em "estornar".`,"Cancelar a conta"))return;
    finMutate(all=>all.map(x=>x.id===id?{...x,pago:hojeIso(),valorPago:0,cancelada:true}:x));ov.remove();toast("Conta cancelada.");go(ROUTE,true);
  };
  g("#fbsv").onclick=async()=>{
    const d=g("#fbdata").value,v=+g("#fbval").value,btn=g("#fbsv");
    if(!finDataOk(d))return er("Confira a data: ano inválido.");
    if(f4DataFechada(d))return er("O mês dessa data está fechado ("+brDate(f4Fech())+"). Use uma data posterior.");
    if(!(v>0))return er("Informe um valor maior que zero. Se a conta não vai ser paga, use “Cancelar esta conta”.");
    const parcial=g("#fbparc").checked&&v<e.valor-0.005,v2=g("#fbvenc2").value;
    if(parcial&&!finDataOk(v2))return er("Confira o vencimento do restante.");
    if(d>hojeIso()&&!await askConfirm(`A data da baixa (${brDate(d)}) ainda não chegou. Registrar mesmo assim?`,"Registrar"))return;
    const files=[...g("#fbfile").files];let novos=[];
    if(files.length){
      btn.disabled=true;btn.textContent="Enviando…";
      try{novos=await anexarArquivos(files,(e.anexos||[]).length)}catch(err){btn.disabled=false;btn.textContent="Confirmar";return er(err.message)}
    }
    const rest=arred2(e.valor-v);
    finMutate(all=>{
      const out=all.map(x=>x.id===id?{...x,pago:d,valorPago:v,...f4BaixaExtra(ov,e),...(parcial?{parcial:true}:{}),...(novos.length?{anexos:[...(x.anexos||[]),...novos]}:{})}:x);
      if(parcial){
        const c={...e,id:uid8(),valor:rest,venc:v2,pago:null,valorPago:null,obs:(e.obs?e.obs+" · ":"")+`saldo de pagamento parcial (pago ${fmtBRL(v)} em ${brDate(d)})`};
        ["recorrencia","folha","manut","anexo","anexos","nf","nfarq","conc","grupo","parcela","rep","contrato","cancelada","parcial","barras","conta","cheque","hist","aprov","aprovStatus","ret","retGuias","criadoEm","criadoPor","repasse","repassado"].forEach(k=>delete c[k]);
        out.push(c);
      }
      return out;
    });
    ov.remove();toast(parcial?`Baixa parcial registrada. Restante de ${fmtBRL(rest)} em aberto.`:novos.length?`Baixa registrada com ${novos.length} comprovante(s).`:"Baixa registrada.");go(ROUTE,true);
  };
}
function openFinBaixaLote(ids){
  const L=finAll().filter(e=>ids.includes(e.id)&&!e.pago);
  if(!L.length)return toast("Marque ao menos uma conta em aberto.",true);
  const tot=soma(L,e=>+e.valor),tipo=L[0].tipo,misto=L.some(e=>e.tipo!==tipo);
  const ov=openModal(`<h3>Dar baixa em ${L.length} conta(s)</h3><div class="sub" style="margin-bottom:10px">${misto?"Pagar e receber misturados. ":""}Total: <b>${fmtBRL(tot)}</b>. Cada conta é baixada pelo valor previsto; para juros, desconto ou comprovante, dê a baixa individualmente.</div>
   <div class="row"><div><label>Data da baixa</label><input type="date" id="blddata" value="${hojeIso()}"></div>${f4ContasPag().length>1?`<div><label>Conta</label>${f4SelConta("bldconta")}</div>`:""}</div>
   <div style="max-height:30vh;overflow:auto;margin-top:8px">${L.slice(0,40).map(e=>`<div class="sub">${brDate(e.venc)} · ${esc(e.desc)} · ${fmtBRL(e.valor)}</div>`).join("")}${L.length>40?`<div class="sub">… e mais ${L.length-40}</div>`:""}</div>
   <div class="err" id="blderr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="bldcx">Cancelar</button><button class="b" id="bldok">Dar baixa</button></div>`);
  ov.querySelector("#bldcx").onclick=()=>ov.remove();
  ov.querySelector("#bldok").onclick=async()=>{
    const d=ov.querySelector("#blddata").value;if(!finDataOk(d))return ov.querySelector("#blderr").textContent="Confira a data: ano inválido.";if(f4DataFechada(d))return ov.querySelector("#blderr").textContent="O mês dessa data está fechado ("+brDate(f4Fech())+"). Use uma data posterior.";
    if(d>hojeIso()&&!await askConfirm(`A data (${brDate(d)}) ainda não chegou. Registrar mesmo assim?`,"Registrar"))return;
    const set=new Set(L.map(e=>e.id));
    const cta=ov.querySelector("#bldconta");finMutate(all=>all.map(x=>set.has(x.id)&&!x.pago?{...x,pago:d,valorPago:+x.valor,...(cta?{conta:cta.value}:{})}:x));
    ov.remove();toast(`${L.length} conta(s) baixada(s).`);go("fin",true);
  };
}
/* ---------- ligações da tela do Financeiro ---------- */
const _bindFin3=bindFin;
bindFin=function(){
  _bindFin3();
  const re=()=>go("fin",true);
  document.querySelectorAll("[data-fsort]").forEach(b=>b.onclick=()=>{const k=b.dataset.fsort,s=FIN.sort||{k:"venc",dir:1};FIN.sort=s.k===k?{k,dir:-s.dir}:{k,dir:1};re()});
  const sa=$("fselall");if(sa)sa.onchange=()=>document.querySelectorAll("[data-fsel]").forEach(c=>c.checked=sa.checked);
  const bl=$("finbaixalote");if(bl)bl.onclick=()=>openFinBaixaLote([...document.querySelectorAll("[data-fsel]:checked")].map(c=>c.dataset.fsel));
  const pf=$("finpdf");if(pf)pf.onclick=finPdfLista;
  const mais=$("finmais");if(mais)mais.onclick=()=>{FIN.lim=(FIN.lim||100)+200;re()};
  document.querySelectorAll("[data-fcopia]").forEach(b=>b.onclick=async()=>{
    const e=finAll().find(x=>x.id===b.dataset.fcopia);if(!e)return;
    try{await navigator.clipboard.writeText(finBarrasFmt(e.barras));toast("Linha digitável copiada.")}catch(err){window.prompt("Copie a linha digitável:",finBarrasFmt(e.barras))}
  });
  document.querySelectorAll("[data-frecibo]").forEach(b=>b.onclick=()=>finReciboPdf(b.dataset.frecibo));
  document.querySelectorAll("[data-fcancel]").forEach(b=>b.onclick=async()=>{
    const e=finAll().find(x=>x.id===b.dataset.fcancel);if(!e)return;
    if(!await askConfirm(`Cancelar "${e.desc}" (${fmtBRL(e.valor)})? Ela deixa de contar como pendente e fica no histórico como cancelada. Dá para desfazer em "estornar".`,"Cancelar a conta"))return;
    finMutate(all=>all.map(x=>x.id===e.id?{...x,pago:hojeIso(),valorPago:0,cancelada:true}:x));toast("Conta cancelada.");re();
  });
  document.querySelectorAll("[data-fver]").forEach(b=>b.onclick=()=>{
    FIN.tab=b.dataset.fver;FIN.status=b.dataset.fst||"abertos";FIN.cat="";FIN.q="";FIN.mes=-1;if(b.dataset.fano)FIN.ano=+b.dataset.fano;re();
  });
  const gp=$("gprev");if(gp)gp.onclick=()=>{FIN.ano--;re()};
  const gn=$("gnext");if(gn)gn.onclick=()=>{FIN.ano++;re()};
  const ge=$("fgoext");if(ge)ge.onclick=()=>{if(typeof XF!=="undefined")XF.tab="conc";go("fin2")};
};
/* ---------- Visão geral: seletor de ano, contas esquecidas, "ver todas" ---------- */
const _finGeral3=finGeralHtml;
finGeralHtml=function(){
  let h=_finGeral3();
  const hoje=hojeIso(),velhas=finAll().filter(e=>!e.pago&&e.venc<addDaysIso(hoje,-90)).sort((a,b)=>a.venc.localeCompare(b.venc));
  const vp=velhas.filter(e=>e.tipo==="pagar"),vr=velhas.filter(e=>e.tipo==="receber");
  const aviso=velhas.length?`<div class="callout sand" style="margin-bottom:14px"><b>${velhas.length}</b> conta(s) em aberto há mais de 90 dias (a mais antiga venceu em ${brDate(velhas[0].venc)}): ${vp.length} a pagar (${fmtBRL(soma(vp,e=>+e.valor))}) e ${vr.length} a receber (${fmtBRL(soma(vr,e=>+e.valor))}). Confira se já foram pagas — dê baixa ou cancele.
    ${vp.length?`<button class="b sm" data-fver="pagar" data-fst="vencidos" data-fano="${vp[0].venc.slice(0,4)}" style="margin-left:8px">Ver a pagar</button>`:""}${vr.length?`<button class="b sm" data-fver="receber" data-fst="vencidos" data-fano="${vr[0].venc.slice(0,4)}" style="margin-left:6px">Ver a receber</button>`:""}</div>`:"";
  h=h.replace(/<h2>Fluxo de caixa de (\d{4})<\/h2>/,`<h2>Fluxo de caixa de <button type="button" class="b sec sm" id="gprev" title="Ano anterior">◀</button> $1 <button type="button" class="b sec sm" id="gnext" title="Próximo ano">▶</button></h2>`);
  h=h.replace("<h2>Próximos a pagar</h2>",`<h2>Próximos a pagar <button type="button" class="b sec sm" data-fver="pagar" style="float:right">Ver todas</button></h2>`);
  h=h.replace("<h2>Próximos a receber</h2>",`<h2>Próximos a receber <button type="button" class="b sec sm" data-fver="receber" style="float:right">Ver todas</button></h2>`);
  return aviso+h;
};
/* ---------- Conciliação manual: caminho para importar o extrato ---------- */
const _finConc3=finConcHtml;
finConcHtml=function(){
  return `<div class="callout" style="margin-bottom:14px">Para conferir linha a linha com o extrato do banco (arquivo OFX ou CSV), use a conciliação com extrato. <button class="b sm" id="fgoext" style="margin-left:8px">Importar extrato do banco</button></div>`+_finConc3();
};


/* >>> x_fin4.js */
