/* ================= CONTADOR (XLSX + PDF, com a identidade e o estilo Casa Hiro) ================= */
const REQ=[["nomeCompleto","nome completo"],["cpf","CPF"],["admissao","admissão"],["cargo","cargo"],["pis","PIS/NIT"]];
const miss=i=>REQ.filter(([k])=>!semPonto(i)||k==="nomeCompleto"||k==="cpf").filter(([k])=>!i[k]).map(([,l])=>l);
const BR={verdeEsc:"FF1E5C2A",verdeMedio:"FF2E7D32",verdeClaroBg:"FFDCEBD3",areia:"FFF5EFE0",areiaEsc:"FFE8DFCC",madeiraClara:"FFC5A882",ink:"FF3A362C",branco:"FFFFFFFF",mute:"FF8A8577"};
const STAT_BG={ok:"FFD6EDD8",falta:"FFE8DFCC",pendencia:"FFF0E6D3",atestado:"FFD6EAF8",justificada:"FFD6EDD8",esquecido:"FFC5A882",sem_escala:"FFE8DFCC",feriado:"FFE8DFCC"};
const STAT_FG={ok:"FF2E7D32",falta:"FF6B3A2A",pendencia:"FF7D5A3C",atestado:"FF1B4F72",justificada:"FF1E5C2A",esquecido:"FF3B2A1A",sem_escala:"FF7A7468",feriado:"FF7A7468"};
const WD3=["seg","ter","qua","qui","sex","sab","dom"];
function pgContadorBase(){
  const e=empresa(),R=POINT.result;
  return banner("","Fechamento da folha","Fechamento do período: planilha e PDF para a contabilidade e folhas de ponto por filtro.","sheet")+noStore()+`
  <div class="card"><h2>Dados da empresa (vão na capa do relatório)</h2><div class="grid g2">
   ${["razao:Razão social","cnpj:CNPJ","endereco:Endereço","telefone:Telefone","email:E-mail","site:Site"].map(x=>{const[k,l]=x.split(":");return `<div><label>${l}</label><input data-e="${k}" value="${esc(e[k])}" ${k==="cnpj"?'placeholder="00.000.000/0000-00"':""}></div>`}).join("")}</div>
   <div class="row" style="margin-top:12px"><button class="b" id="esave" style="flex:none">Salvar dados da empresa</button></div>
   ${e.cnpj?"":`<div class="callout sand" style="margin-top:10px">O site da Casa Hiro não publica o CNPJ. Preencha aqui para ele sair na capa.</div>`}</div>
  <div class="card"><h2>Conferência antes de enviar</h2>
   ${R?`<p class="sub" style="margin:0 0 8px">Período apurado: <b>${brDate(R.start)}</b> a <b>${brDate(R.end)}</b></p>`:`<div class="callout sand" style="margin-bottom:10px">Ainda não há jornadas calculadas. Vá na aba Ponto e clique em "Calcular jornadas" para incluir horas, faltas e atestados. Sem isso o relatório sai só com os dados cadastrais.</div>`}
   ${integList().filter(i=>ativoEm(i,R&&R.start)).length?`<div class="wrap"><table><thead><tr><th>Integrante</th><th>CPF</th><th>Cargo</th><th>Admissão</th><th>Situação dos dados</th></tr></thead><tbody>
   ${integList().filter(i=>ativoEm(i,R&&R.start)).map(i=>{const m=miss(i);return `<tr><td><b>${esc(nomeInteg(i))}</b></td><td>${esc(i.cpf||"—")}</td><td>${esc(i.cargo||"—")}</td><td>${brDate(i.admissao)||"—"}</td>
    <td>${m.length?`<span class="pill s-pendencia">falta: ${m.join(", ")}</span>`:`<span class="pill s-ok">completo</span>`}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty">Nenhum integrante cadastrado.</div>`}
   <div class="row" style="margin-top:14px"><button class="b" id="xgo" style="flex:none" ${integList().length?"":"disabled"}>${ic("sheet")} Baixar XLSX</button>
    <button class="b wood" id="pgo" style="flex:none" ${integList().length?"":"disabled"}>${ic("file")} Baixar PDF</button></div>
   <p class="sub">Capa, Integrantes (cadastro completo), Jornadas diárias e uma folha de ponto por integrante com campo de assinatura. Entrada e saída de cada batida em colunas separadas — a previsão de horas de cada dia muda conforme a escala da pessoa. As colunas de resultado (Trabalhado, Totais, contagens) são fórmulas do Excel; o saldo e o banco de horas descontam a tolerância da CLT, não números fixos: reabrir ou editar uma célula recalcula tudo. Cores e tipografia seguem o Manual da Marca.</p></div>`;
}
function bindContadorBase(){
  $("esave").onclick=()=>{const emp={};document.querySelectorAll("[data-e]").forEach(el=>emp[el.dataset.e]=el.value.trim());saveCfg({empresa:emp});toast("Dados da empresa salvos.");setTimeout(()=>go("contador",true),50)};
  $("xgo").onclick=()=>exportXlsx();
  $("pgo").onclick=()=>exportPdfContador();
}
// monta as colunas Entrada 1/Saída 1/Entrada 2/Saída 2... a partir das marcações pareadas de cada dia (para o PDF, que usa texto simples)
function journeyTable(R){
  const maxP=Math.max(1,...R.users.flatMap(u=>u.rows.map(r=>r.intervals.length)));
  const head=["ID","Integrante","Data","Dia","Situação"];
  for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);
  head.push("Trabalhado","Previsto do dia","Atraso (min)","Saída antec. (min)","Extra (min)","Noturno","Noturno real","Noturno reduzido","Observação");
  const rows=[],statuses=[];
  R.users.forEach(u=>u.rows.forEach(r=>{
    const row=[u.uid,u.nome,brDate(r.day),r.wd,STL[r.status]];
    for(let k=0;k<maxP;k++){
      const iv=r.intervals[k],m=iv&&iv.match(/^(\d{2}:\d{2})–(\d{2}:\d{2})(\s\(\+1\))?$/);
      row.push(m?m[1]:"",m?m[2]+(m[3]?" (+1)":""):"");
    }
    row.push(fmtHHMM(r.workedMin),fmtHHMM(r.expectedMin),r.late||0,r.early||0,r.extra||0,r.night?"Sim":"",r.nightReal?fmtHHMM(r.nightReal):"",r.nightReal?fmtHHMM(r.nightFicta):"",r.oc?`${OC[r.oc.tipo]}: ${r.oc.texto||""}`:flagsVisiveis(r).map(f=>FLAG_LABEL[f]||f).join(", "));
    rows.push(row);statuses.push(r.status);
  }));
  return{head,rows,statuses,maxP};
}
/* ---- helpers de planilha (ExcelJS) ---- */
function thinBorder(argb){const s={style:"thin",color:{argb}};return{top:s,left:s,bottom:s,right:s}}
function medBottom(argb){return{bottom:{style:"medium",color:{argb}}}}
function colLetter(n){let x="";while(n>0){const m=(n-1)%26;x=String.fromCharCode(65+m)+x;n=Math.floor((n-1)/26)}return x}
function pageBox(ws,orientation){ws.views=[{showGridLines:false}];ws.pageSetup={margins:{left:.5,right:.5,top:.6,bottom:.5,header:.3,footer:.3},orientation:orientation||"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0}}
// Excel guarda data/hora como número (dias desde 30/12/1899). Escrever um Date do JS faz o ExcelJS converter
// em UTC e o horário aparece deslocado (+3h no Brasil). Por isso calculamos o número a partir dos
// componentes locais, sem passar por fuso horário.
function xlSerial(d){
  const dias=Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(1899,11,30))/86400000);
  return dias+(d.getHours()*3600+d.getMinutes()*60+d.getSeconds())/86400;
}
function xlDur(mins){return Math.max(0,Math.round(mins||0))/1440}
function xlDateOnly(iso){if(!iso)return null;const[y,m,d]=iso.split("-").map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000)}
function obsText(r){
  if(r.oc){
    const base=r.oc.tipo==="atestado"?"Atestado":r.oc.tipo==="falta_justificada"?"Justificada":r.oc.tipo==="esquecimento"?"Esquecimento de ponto":"Observação";
    return base+(r.oc.texto?": "+r.oc.texto:"");
  }
  if(r.status==="falta")return "Falta";
  if(r.status==="pendencia"){const fl=flagsVisiveis(r).filter(f=>f!=="justificar");return "Pendência"+(fl.length?": "+fl.map(f=>FLAG_LABEL[f]||f).join(", "):"")}
  if(r.status==="sem_escala")return "Marcação fora da escala";
  if(r.status==="feriado")return "Feriado";
  const extra=flagsVisiveis(r).filter(f=>f!=="tolerancia_art58"&&f!=="trabalhou_feriado").map(f=>FLAG_LABEL[f]||f);
  if(r.feriadoMin)extra.push(`Trabalhou no feriado: ${fmtHHMM(r.feriadoMin)} com adicional`);
  if(r.nightReal)extra.push(`Noturno: ${fmtHHMM(r.nightReal)} reais = ${fmtHHMM(r.nightFicta)} (hora de 52min30s)`);
  return extra.length?extra.join(" · "):"";
}
function headerCell(ws,addr,val,opts){
  const c=ws.getCell(addr);c.value=val;
  c.font={name:"Calibri",size:opts&&opts.size||10.5,bold:true,color:{argb:BR.branco}};
  c.fill={type:"pattern",pattern:"solid",fgColor:{argb:(opts&&opts.bg)||BR.verdeMedio}};
  c.alignment={horizontal:(opts&&opts.h)||"center",vertical:"middle",wrapText:true};
  if(!(opts&&opts.noBorder))c.border=thinBorder(BR.verdeEsc);
}
function labelCell(ws,addr,val){
  const c=ws.getCell(addr);c.value=val;
  c.font={name:"Calibri",size:9.5,bold:true,color:{argb:BR.verdeEsc}};
  c.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeClaroBg}};
  c.alignment={vertical:"middle"};c.border={bottom:{style:"thin",color:{argb:"FFB9DCB9"}}};
}
function valueCell(ws,addr,val,opts){
  const c=ws.getCell(addr);c.value=val;
  c.font={name:"Calibri",size:10,color:{argb:BR.ink}};
  c.alignment={horizontal:"left",vertical:"middle",wrapText:true};
  c.border={bottom:{style:"thin",color:{argb:"FFB9DCB9"}}};
  if(opts&&opts.numFmt)c.numFmt=opts.numFmt;
}
// título de aba sem células mescladas (mesclar atrapalha editar no Google Planilhas e no Excel)
function bandTitle(ws,fromCol,toCol,rows){
  const c1=ws.getCell(1,fromCol);c1.value="Casa Hiro — "+rows;c1.font={name:"Calibri",size:14,bold:true,color:{argb:BR.verdeEsc}};
  const c2=ws.getCell(2,fromCol);c2.value="A ciência do cuidado com o acolhimento de casa.";c2.font={italic:true,size:9.5,color:{argb:BR.mute}};
}

function buildCapa(wb,e,R){
  const ws=wb.addWorksheet("Capa");pageBox(ws,"portrait");
  ws.columns=[{width:24},{width:70}];
  bandTitle(ws,1,2,"Relatório de integrantes e apuração de ponto");
  const info=[["Razão social",e.razao],["CNPJ",e.cnpj||"—"],["Endereço",e.endereco],["Telefone",e.telefone],["E-mail",e.email],["Site",e.site],
    ["Período apurado",R?`${brDate(R.start)} a ${brDate(R.end)}${R.end<=refFim(refYm(R.end))&&R.start===refIni(refYm(R.end))?" (referência "+refYm(R.end).slice(5)+"/"+refYm(R.end).slice(0,4)+": dia 26 a dia 25)":""}`:"Ponto ainda não calculado"],["Emitido em",new Date().toLocaleString("pt-BR")]];
  let r=4;
  info.forEach(([k,v])=>{labelCell(ws,"A"+r,k);valueCell(ws,"B"+r,v);r++});
  const note=ws.getCell(`A${r+1}`);
  note.value="Abas: Integrantes · Jornadas diárias · uma folha de ponto por integrante (com campo de assinatura).";
  note.font={italic:true,size:9.5,color:{argb:BR.mute}};
}
function buildIntegrantesSheet(wb,L){
  const ws=wb.addWorksheet("Integrantes");pageBox(ws,"landscape");
  const head=["ID relógio","Nome completo","CPF","RG","PIS/NIT","CTPS","Nascimento","Admissão","Cargo/função","Departamento","Situação","Turno","Telefone","E-mail","Endereço","CEP","Cidade/UF","Contato de emergência","Tel. emergência"];
  const widths=[9,30,15,13,14,13,11,11,20,16,10,7,15,26,34,10,17,22,15];
  ws.columns=widths.map(w=>({width:w}));
  head.forEach((h,i)=>headerCell(ws,colLetter(i+1)+"1",h));
  ws.getRow(1).height=30;
  L.forEach((i,ri)=>{
    const row=ri+2,vals=[i.uid??"",i.nomeCompleto||i.nome||"",i.cpf||"",i.rg||"",i.pis||"",i.ctps||"",xlDateOnly(i.nascimento),xlDateOnly(i.admissao),i.cargo||"",i.depto||"",i.situacao||"Ativo",i.turno||"",i.telefone||"",i.email||"",i.endereco||"",i.cep||"",i.cidade||"",i.emergNome||"",i.emergTel||""];
    vals.forEach((v,ci)=>{
      const cell=ws.getCell(row,ci+1);cell.value=v;
      cell.font={size:10,color:{argb:BR.ink}};cell.border=thinBorder(BR.areiaEsc);
      cell.alignment={vertical:"middle",horizontal:"left",wrapText:false};
      if(ci===6||ci===7)cell.numFmt="dd/mm/yyyy";
      if(ri%2)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}};
    });
  });
  ws.views=[{state:"frozen",xSplit:2,ySplit:1,showGridLines:false}];
  ws.autoFilter={from:"A1",to:colLetter(head.length)+"1"};
}
const SALDO_FMT="+0;-0;0";
const xlHorasTxt=ref=>`IF(${ref}<0,"-",IF(${ref}>0,"+",""))&TEXT(ABS(${ref})/1440,"[h]:mm")&" h"`;
// o mesmo texto que a fórmula acima produz (Excel e Google Planilhas), para o arquivo abrir já igual ao recalculado
const xlHorasRes=min=>{const r=Math.round(min||0),a=Math.abs(r);return(r<0?"-":r>0?"+":"")+Math.floor(a/60)+":"+String(a%60).padStart(2,"0")+" h"};
// escreve uma linha de jornada a partir da coluna startCol:
// Data | Dia | Entrada/Saída… | Ajuste (min) | Trabalhado | Previsto | Saldo (min) | Observação
// Tudo é valor de verdade ou fórmula visível: mexendo nas batidas, o trabalhado e o saldo recalculam (Excel e Google Planilhas).
const xlParesDia=r=>{const M=r.marcas||[],I=r.rawIntervals||[];
  if(!M.length||M.length===2*I.length)return I.map(([a,b])=>[a,b]);
  const L=[];for(let i=0;i<M.length;i+=2)L.push([M[i],M[i+1]||null]);return L};
const xlMaxPares=rows=>Math.max(1,...rows.map(r=>Math.max(r.intervals.length,xlParesDia(r).length)));
function writeJourneyRow(ws,rowIdx,startCol,r,maxP,zebra){
  let c=startCol;
  const put=(v,fmt,formula,align)=>{
    const cell=ws.getCell(rowIdx,c);
    cell.value=formula?{formula,result:v}:v;
    if(fmt)cell.numFmt=fmt;
    cell.font={size:10,color:{argb:BR.ink}};cell.border=thinBorder(BR.areiaEsc);
    cell.alignment={horizontal:align||"center",vertical:"middle"};
    if(zebra)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}};
    return c++;
  };
  const L=n=>colLetter(n)+rowIdx;
  put(xlDateOnly(r.day),"dd/mm/yyyy");
  put(WD3[pyWeekday(r.day)]);
  const entC=[],saiC=[],pares=xlParesDia(r);
  for(let k=0;k<maxP;k++){
    const iv=pares[k];
    entC.push(put(iv&&iv[0]?xlSerial(iv[0]):null,"hh:mm"));
    saiC.push(put(iv&&iv[1]?xlSerial(iv[1]):null,"hh:mm"));
  }
  // ajuste em minutos: intervalo descontado (negativo) ou dia abonado por atestado/esquecimento (positivo)
  const parMin=pares.filter(([a,b])=>a&&b).reduce((sum,[a,b])=>sum+minutesBetween(a,b),0),adj=Math.round(r.workedMin-parMin);
  const ajC=put(adj||null,"0");
  // cada par só conta com entrada e saída preenchidas; MOD aceita plantão que passa da meia-noite
  const fP=entC.map((ec,i)=>`IF(AND(${L(ec)}<>"",${L(saiC[i])}<>""),MOD(${L(saiC[i])}-${L(ec)},1),0)`).join("+")||"0";
  const wC=put(r.workedMin/1440,"[h]:mm",`ROUND((${fP})*1440+N(${L(ajC)}),0)/1440`);
  const pC=put(xlDur(r.expectedMin),"[h]:mm");
  // saldo do dia em minutos; até 10 min de diferença no dia não conta (CLT art. 58 §1º); dia com pendência fica fora (0)
  const dm=Math.round(r.workedMin-r.expectedMin),dif=`ROUND((${L(wC)}-${L(pC)})*1440,0)`;
  let sF=null;
  if(r.status!==PENDENCIA){if(r.saldo===0&&dm!==0&&Math.abs(dm)<=10)sF=`IF(ABS(${dif})<=10,0,${dif})`;else if(r.saldo===dm)sF=dif}
  // dia com batida faltando: saldo 0 enquanto o número de batidas for ímpar; completou na planilha, passa a calcular
  else if(!r.saldo&&maxP)sF=`IF(MOD(COUNT(${L(entC[0])}:${L(saiC[maxP-1])}),2)=1,0,IF(ABS(${dif})<=10,0,${dif}))`;
  const sC=put(r.saldo||0,SALDO_FMT,sF);
  const oC=put(obsText(r),null,null,"left");
  return{wC,pC,sC,oC};
}
function buildJornadasSheet(wb,R,maxP){
  const ws=wb.addWorksheet("Jornadas diárias");pageBox(ws,"landscape");
  const head=["ID","Integrante","Data","Dia"];for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);head.push("Ajuste (min)","Trabalhado","Previsto","Saldo (min)","Observação");
  bandTitle(ws,1,head.length,"Jornadas diárias de "+brDate(R.start)+" a "+brDate(R.end));
  const hr=4;head.forEach((h,i)=>headerCell(ws,colLetter(i+1)+hr,h));ws.getRow(hr).height=30;
  const widths=[6,26,11,6];for(let k=0;k<maxP;k++)widths.push(8,8);widths.push(9,11,10,10,38);
  ws.columns=widths.map(w=>({width:w}));
  let rr=hr+1,zebra=false;
  R.users.forEach(u=>{
    u.rows.forEach(r=>{
      [[1,u.uid,"center"],[2,u.nome,"left"]].forEach(([col,v,al])=>{const cell=ws.getCell(rr,col);cell.value=v;cell.font={size:10,color:{argb:BR.ink}};cell.border=thinBorder(BR.areiaEsc);
        cell.alignment={horizontal:al,vertical:"middle"};if(zebra)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}}});
      writeJourneyRow(ws,rr,3,r,maxP,zebra);
      rr++;
    });
    zebra=!zebra;
  });
  ws.views=[{state:"frozen",xSplit:2,ySplit:hr,showGridLines:false}];
  ws.autoFilter={from:"A"+hr,to:colLetter(head.length)+hr};
}
// folha de ponto de uma pessoa: sem células mescladas, com fórmulas visíveis, pronta para editar no Excel ou no Google Planilhas
function buildPersonSheet(wb,e,ig,u){
  const name=nomeInteg(ig).slice(0,31)||("ID "+u.uid);
  let sheetName=name,n=1;while(wb.getWorksheet(sheetName)){sheetName=(name.slice(0,28)+" "+(++n)).slice(0,31)}
  const ws=wb.addWorksheet(sheetName);pageBox(ws,"portrait");
  const R=POINT.result,ym=refYm(R.end),maxP=xlMaxPares(u.rows);
  const widths=[11,6];for(let k=0;k<maxP;k++)widths.push(8,8);widths.push(9,11,10,10,38);
  ws.columns=widths.map(w=>({width:w}));
  const ink={size:10,color:{argb:BR.ink}},forte={size:10.5,bold:true,color:{argb:BR.verdeEsc}};
  const cel=(addr,v,font,fmt)=>{const c=ws.getCell(addr);c.value=v;c.font=font||ink;c.alignment={vertical:"middle"};if(fmt)c.numFmt=fmt;return c};
  cel("A1","Folha de apuração de ponto",{size:15,bold:true,color:{argb:BR.verdeEsc}});
  cel("A2",(e.razao||"Casa Hiro")+(e.cnpj?" · CNPJ "+e.cnpj:""),{size:9.5,italic:true,color:{argb:BR.mute}});
  const per=`${brDate(R.start)} a ${brDate(R.end)}`+(R.start===refIni(ym)?` (referência ${ym.slice(5)}/${ym.slice(0,4)}: do dia 26 ao dia 25)`:"");
  const ident=[["Integrante",nomeInteg(ig)],["CPF",ig.cpf||"—"],["Cargo",ig.cargo||"—"],["Departamento",ig.depto||"Outro"],["Admissão",ig.admissao?brDate(ig.admissao):"—"],["Nº no relógio",u.uid!=null?String(u.uid):"—"],["Escala",ig.id?escalasTexto(ig,R.start,R.end):"—"],["Período",per]];
  let r=4;ident.forEach(([k,v])=>{labelCell(ws,"A"+r,k);cel("B"+r,v);r++});
  const hr=r+1,head=["Data","Dia"];for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);head.push("Ajuste (min)","Trabalhado","Previsto","Saldo (min)","Observação");
  head.forEach((h,i)=>headerCell(ws,colLetter(i+1)+hr,h));ws.getRow(hr).height=30;
  let rr=hr+1,cols=null;
  u.rows.forEach((row,ri)=>{cols=writeJourneyRow(ws,rr,1,row,maxP,ri%2===1);rr++});
  const ini=hr+1,fim=Math.max(ini,rr-1),wC=3+2*maxP+1,pC=wC+1,sC=pC+1,oC=sC+1;
  const faixa=col=>`${colLetter(col)}${ini}:${colLetter(col)}${fim}`;
  // totais
  const tr=rr,tot=(col,formula,res,fmt)=>{const c=ws.getCell(tr,col);c.value={formula,result:res};c.numFmt=fmt;c.font={bold:true,size:10.5,color:{argb:BR.branco}}};
  for(let c=1;c<=oC;c++){const cc=ws.getCell(tr,c);cc.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};cc.border=thinBorder(BR.verdeEsc);cc.alignment={horizontal:c===oC?"left":"center",vertical:"middle"}}
  const tl=ws.getCell(tr,1);tl.value="TOTAIS";tl.font={bold:true,size:10.5,color:{argb:BR.branco}};
  tot(wC,`ROUND(SUM(${faixa(wC)})*1440,0)/1440`,u.t.worked/1440,"[h]:mm");
  tot(pC,`ROUND(SUM(${faixa(pC)})*1440,0)/1440`,u.t.expected/1440,"[h]:mm");
  tot(sC,`SUM(${faixa(sC)})`,u.t.saldo||0,SALDO_FMT);
  const S=colLetter(sC)+tr;ws.getCell(tr,oC).value={formula:`"Saldo do período: "&${xlHorasTxt(S)}`,result:"Saldo do período: "+xlHorasRes(u.t.saldo)};ws.getCell(tr,oC).font={bold:true,size:10.5,color:{argb:BR.branco}};
  // resumo: rótulo na coluna A, número na coluna "Previsto"
  r=tr+2;cel("A"+r,"Resumo do período",forte);r++;
  [["Dias apurados",`COUNT(${faixa(1)})`,u.rows.length],["Dias com registro de ponto",`COUNTIF(${faixa(wC)},">0")`,u.rows.filter(x=>x.workedMin>0).length],
   ["Faltas",`COUNTIFS(${faixa(oC)},"Falta*",${faixa(wC)},0)`,u.t.faltas],["Atestados",`COUNTIF(${faixa(oC)},"Atestado*")`,u.t.atestados]].forEach(([k,f,v])=>{cel("A"+r,k);const c=ws.getCell(r,pC);c.value={formula:f,result:v};c.font=forte;c.alignment={horizontal:"center"};r++});
  // banco de horas: minutos na coluna "Saldo", em horas na "Observação"
  const fb=folhaBanco(u,R);r++;
  cel("A"+r,"Horas a mais e banco de horas — referência "+fb.mm,forte);r++;
  const linhaB=(k,valor,formula,negrito)=>{cel("A"+r,k,negrito?forte:ink);const c=ws.getCell(r,sC);c.value=formula?{formula,result:valor}:valor;c.numFmt=SALDO_FMT;c.font=negrito?forte:ink;c.alignment={horizontal:"center"};
    const h=ws.getCell(r,oC);h.value={formula:xlHorasTxt(colLetter(sC)+r),result:xlHorasRes(valor)};h.font=negrito?forte:ink;const ref=colLetter(sC)+r;r++;return ref};
  linhaB("Horas trabalhadas a mais que o previsto (min)",u.t.mais||0,`SUMIF(${faixa(sC)},">0")`);
  linhaB("Horas trabalhadas a menos que o previsto (min)",u.t.menos||0,`SUMIF(${faixa(sC)},"<0")`);
  const rS=linhaB("Saldo do período (min)",u.t.saldo||0,`${S}`,true);
  const rA=linhaB(`Banco de horas antes de ${brDate(refIni(ym))} (min)`,fb.ant,null);
  const rL=linhaB("Folgas compensadas e horas pagas no período (min)",fb.lanc,null);
  linhaB("Banco de horas para o próximo período (min)",fb.fim,`${rA}+${rS}+${rL}`,true);
  fb.notas.forEach(t=>{cel("A"+r,t,{italic:true,size:8.5,color:{argb:BR.mute}});r++});
  // declaração e assinaturas
  r++;cel("A"+r,"Declaro que conferi os registros de ponto acima referentes ao período apurado e que estão de acordo com a jornada efetivamente cumprida.",{italic:true,size:9.5,color:{argb:BR.ink}});
  r+=2;cel("A"+r,"Caraguatatuba - SP, ____ de ______________ de ________");
  r+=2;const meio=Math.max(3,Math.floor(oC/2));
  for(let c=1;c<=oC;c++)if(c<meio||c>meio)ws.getCell(r,c).border=medBottom(BR.ink);
  r++;cel("A"+r,"INTEGRANTE",forte);cel(colLetter(meio+1)+r,"CASA HIRO",forte);
  r++;cel("A"+r,nomeInteg(ig)+" · CPF "+(ig.cpf||"—"));cel(colLetter(meio+1)+r,(e.razao||"")+(e.cnpj?" · CNPJ "+e.cnpj:""));
  // sem linhas congeladas: o Google Planilhas repete as linhas congeladas no topo de cada página impressa
  ws.views=[{showGridLines:false}];
}
function buildNoturnoSheet(wb,R){
  const ws=wb.addWorksheet("Adicional noturno");pageBox(ws,"landscape");
  const head=["ID","Integrante","Dias com trabalho noturno","Noturno real (h)","Prorrogação após 5h (h)","Noturno reduzido (h)","Acréscimo pela hora de 52min30s (h)"];
  bandTitle(ws,1,head.length,"Adicional noturno");
  ws.getCell("A5").value="Hora noturna: 22h às 5h, com hora de 52min30s (CLT art. 73). Turno noturno prorroga após as 5h (Súmula 60, II, TST). Estimativa gerencial — o contador confirma o adicional de 20%.";
  ws.getCell("A5").font={italic:true,size:9.5,color:{argb:BR.mute}};
  head.forEach((h,i)=>headerCell(ws,colLetter(i+1)+"6",h));ws.getRow(6).height=34;
  ws.columns=[7,28,16,14,16,16,20].map(w=>({width:w}));
  R.users.forEach((u,ri)=>{
    const dias=u.rows.filter(r=>r.nightReal>0).length,real=u.t.nightReal||0,pr=u.rows.reduce((t,r)=>t+(r.nightPror||0),0),fic=u.t.nightFicta||0;
    [u.uid,u.nome,dias,real/1440,pr/1440,fic/1440,(fic-real)/1440].forEach((v,ci)=>{
      const c=ws.getCell(7+ri,ci+1);c.value=v;c.font={size:10,color:{argb:BR.ink}};c.border=thinBorder(BR.areiaEsc);
      c.alignment={horizontal:ci===1?"left":"center",vertical:"middle"};if(ci>=3)c.numFmt="[h]:mm";if(ri%2)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}};
    });
  });
  ws.views=[{state:"frozen",ySplit:6,showGridLines:false}];
}
function buildWorkbook(opt){
  opt=opt||{};
  const abas={capa:true,integrantes:true,jornadas:true,individual:true,...(opt.abas||{})},sel=opt.uids?new Set([...opt.uids].map(String)):null;
  const wb=new ExcelJS.Workbook();wb.creator="Casa Hiro";wb.created=new Date();
  const e=empresa(),R0=POINT.result,L=integList().filter(i=>!semPonto(i)&&ativoEm(i,R0&&R0.start)&&(!sel||sel.has(String(i.uid))||sel.has(String(i.id))));
  const R=R0&&sel?{...R0,users:R0.users.filter(u=>sel.has(String(u.uid)))}:R0;
  if(abas.capa)buildCapa(wb,e,R);
  if(abas.integrantes)buildIntegrantesSheet(wb,L);
  if(R){
    const maxP=xlMaxPares(R.users.flatMap(u=>u.rows));
    if(abas.jornadas)buildJornadasSheet(wb,R,maxP);
    if(abas.jornadas&&R.users.some(u=>(u.t.nightReal||0)>0))buildNoturnoSheet(wb,R);
    if(abas.individual)R.users.forEach(u=>buildPersonSheet(wb,e,u.ig||{},u));
  }
  if(!wb.worksheets.length)throw new Error("Com essas escolhas não há nenhuma aba para gerar (jornadas e folha individual precisam do ponto calculado).");
  return wb;
}
