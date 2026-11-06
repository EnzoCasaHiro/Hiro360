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
   ${integList().length?`<div class="wrap"><table><thead><tr><th>Integrante</th><th>CPF</th><th>Cargo</th><th>Admissão</th><th>Situação dos dados</th></tr></thead><tbody>
   ${integList().map(i=>{const m=miss(i);return `<tr><td><b>${esc(nomeInteg(i))}</b></td><td>${esc(i.cpf||"—")}</td><td>${esc(i.cargo||"—")}</td><td>${brDate(i.admissao)||"—"}</td>
    <td>${m.length?`<span class="pill s-pendencia">falta: ${m.join(", ")}</span>`:`<span class="pill s-ok">completo</span>`}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty">Nenhum integrante cadastrado.</div>`}
   <div class="row" style="margin-top:14px"><button class="b" id="xgo" style="flex:none" ${integList().length?"":"disabled"}>${ic("sheet")} Baixar XLSX</button>
    <button class="b wood" id="pgo" style="flex:none" ${integList().length?"":"disabled"}>${ic("file")} Baixar PDF</button></div>
   <p class="sub">Capa, Integrantes (cadastro completo), Jornadas diárias e uma folha de ponto por integrante com campo de assinatura. Entrada e saída de cada batida em colunas separadas — a previsão de horas de cada dia muda conforme a escala da pessoa. As colunas de resultado (Trabalhado, Totais, Saldo, contagens) são fórmulas do Excel, não números fixos: reabrir ou editar uma célula recalcula tudo. Cores e tipografia seguem o Manual da Marca.</p></div>`;
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
    row.push(fmtHHMM(r.workedMin),fmtHHMM(r.expectedMin),r.late||0,r.early||0,r.extra||0,r.night?"Sim":"",r.nightReal?fmtHHMM(r.nightReal):"",r.nightReal?fmtHHMM(r.nightFicta):"",r.oc?`${OC[r.oc.tipo]}: ${r.oc.texto||""}`:r.flags.join(", "));
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
  if(r.status==="pendencia")return "Pendência"+(r.flags.filter(f=>f!=="justificar").length?": "+r.flags.join(", "):"");
  if(r.status==="sem_escala")return "Marcação fora da escala";
  if(r.status==="feriado")return "Feriado";
  const extra=(r.flags||[]).filter(f=>f!=="tolerancia_art58"&&f!=="trabalhou_feriado").map(f=>FLAG_LABEL[f]||f);
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
function bandTitle(ws,fromCol,toCol,rows){
  // banner de topo reaproveitado em toda aba: linha 1-2 CASA HIRO, linha3 tagline, linha4 título da aba
  const r1=colLetter(fromCol)+"1",r1b=colLetter(toCol)+"2";
  ws.mergeCells(`${r1}:${r1b}`);
  const c1=ws.getCell(r1);c1.value="CASA HIRO";c1.font={name:"Georgia",size:24,bold:true,color:{argb:BR.branco}};
  c1.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};c1.alignment={horizontal:"center",vertical:"center"};
  for(let c=fromCol;c<=toCol;c++)ws.getRow(1).getCell(c).fill=ws.getRow(2).getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};
  ws.mergeCells(`${colLetter(fromCol)}3:${colLetter(toCol)}3`);
  const c3=ws.getCell(`${colLetter(fromCol)}3`);c3.value="A ciência do cuidado com o acolhimento de casa.";
  c3.font={italic:true,size:11,color:{argb:BR.verdeClaroBg}};c3.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};c3.alignment={horizontal:"center",vertical:"center"};
  ws.mergeCells(`${colLetter(fromCol)}4:${colLetter(toCol)}4`);
  const c4=ws.getCell(`${colLetter(fromCol)}4`);c4.value=rows;
  c4.font={bold:true,size:12,color:{argb:BR.branco}};c4.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeMedio}};c4.alignment={horizontal:"center",vertical:"center"};
  ws.getRow(1).height=17;ws.getRow(2).height=17;ws.getRow(4).height=24;
}

function buildCapa(wb,e,R){
  const ws=wb.addWorksheet("Capa");pageBox(ws,"portrait");
  ws.columns=[{width:3},{width:24},{width:60},{width:3}];
  ws.mergeCells("A1:D2");const c1=ws.getCell("A1");c1.value="CASA HIRO";c1.font={name:"Georgia",size:28,bold:true,color:{argb:BR.branco}};
  c1.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};c1.alignment={horizontal:"center",vertical:"center"};
  for(const col of["A","B","C","D"]){ws.getCell(col+"1").fill=ws.getCell(col+"2").fill=c1.fill}
  ws.mergeCells("A3:D3");const c3=ws.getCell("A3");c3.value="A ciência do cuidado com o acolhimento de casa.";
  c3.font={italic:true,size:11,color:{argb:BR.verdeClaroBg}};c3.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};c3.alignment={horizontal:"center",vertical:"center"};
  ws.mergeCells("A4:D4");const c4=ws.getCell("A4");c4.value="Relatório de integrantes e apuração de ponto";
  c4.font={bold:true,size:13,color:{argb:BR.branco}};c4.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeMedio}};c4.alignment={horizontal:"center",vertical:"center"};
  ws.getRow(4).height=26;
  const info=[["Razão social",e.razao],["CNPJ",e.cnpj||"—"],["Endereço",e.endereco],["Telefone",e.telefone],["E-mail",e.email],["Site",e.site],
    ["Período apurado",R?`${brDate(R.start)} a ${brDate(R.end)}`:"Ponto ainda não calculado"],["Emitido em",new Date().toLocaleString("pt-BR")]];
  let r=6;
  info.forEach(([k,v])=>{labelCell(ws,"B"+r,k);valueCell(ws,"C"+r,v);ws.getRow(r).height=22;r++});
  ws.mergeCells(`B${r+1}:C${r+1}`);const note=ws.getCell(`B${r+1}`);
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
// escreve uma linha de jornada (Data/Dia/Entrada-Saída.../Trabalhado/Previsto/Observação) a partir da coluna startCol
function writeJourneyRow(ws,rowIdx,startCol,r,maxP,zebra){
  let c=startCol;
  const put=(v,fmt,formula,align)=>{
    const cell=ws.getCell(rowIdx,c);
    if(formula)cell.value={formula,result:v};else cell.value=v;
    if(fmt)cell.numFmt=fmt;
    cell.font={size:10,color:{argb:BR.ink}};cell.border=thinBorder(BR.areiaEsc);
    cell.alignment={horizontal:align||"center",vertical:"middle",wrapText:align==="left"};
    if(zebra)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}};
    c++;
  };
  put(xlDateOnly(r.day),"dd/mm/yyyy");
  put(WD3[pyWeekday(r.day)]);
  const entC=[],saiC=[];
  for(let k=0;k<maxP;k++){
    const iv=r.rawIntervals&&r.rawIntervals[k];
    entC.push(c);put(iv?xlSerial(iv[0]):null,"hh:mm");
    saiC.push(c);put(iv?xlSerial(iv[1]):null,"hh:mm");
  }
  const workFormula=entC.map((ec,i)=>`${colLetter(saiC[i])}${rowIdx}-${colLetter(ec)}${rowIdx}`).join("+")||"0";
  // se o dia teve desconto de intervalo ou crédito (atestado, esquecimento), o ajuste em minutos aparece na própria fórmula
  const parMin=(r.rawIntervals||[]).reduce((sum,[a,b])=>sum+minutesBetween(a,b),0),adj=Math.round(r.workedMin-parMin);
  put(r.workedMin/1440,"hh:mm",`ROUND((${workFormula})*1440${adj?(adj>0?"+":"")+adj:""},0)/1440`);
  put(xlDur(r.expectedMin),"hh:mm");
  put(obsText(r),null,null,"left");
  return c-1; // última coluna escrita
}
function buildJornadasSheet(wb,R,maxP){
  const ws=wb.addWorksheet("Jornadas diárias");pageBox(ws,"landscape");
  bandTitle(ws,1,4+2*maxP+3,"Jornadas diárias — consolidado");
  const head=["ID","Integrante","Data","Dia"];for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);head.push("Trabalhado","Previsto do dia","Observação");
  head.forEach((h,i)=>headerCell(ws,colLetter(i+1)+"6",h));ws.getRow(6).height=26;
  const widths=[6,26,10,5];for(let k=0;k<maxP;k++)widths.push(9,9);widths.push(11,13,34);
  ws.columns=widths.map(w=>({width:w}));
  let rr=7,zebra=false,uidx=0;
  R.users.forEach(u=>{
    u.rows.forEach(r=>{
      ws.getCell(rr,1).value=u.uid;ws.getCell(rr,1).font={size:10,color:{argb:BR.ink}};ws.getCell(rr,1).border=thinBorder(BR.areiaEsc);
      ws.getCell(rr,1).alignment={horizontal:"center",vertical:"middle"};if(zebra)ws.getCell(rr,1).fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}};
      ws.getCell(rr,2).value=u.nome;ws.getCell(rr,2).font={size:10,color:{argb:BR.ink}};ws.getCell(rr,2).border=thinBorder(BR.areiaEsc);
      ws.getCell(rr,2).alignment={horizontal:"left",vertical:"middle"};if(zebra)ws.getCell(rr,2).fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.areia}};
      writeJourneyRow(ws,rr,3,r,maxP,zebra);
      rr++;
    });
    zebra=!zebra;uidx++;
  });
  ws.views=[{state:"frozen",xSplit:2,ySplit:6,showGridLines:false}];
  ws.autoFilter={from:"A6",to:colLetter(head.length)+"6"};
}
function buildPersonSheet(wb,e,ig,u){
  const name=nomeInteg(ig).slice(0,31)||("ID "+u.uid);
  let sheetName=name,n=1;while(wb.getWorksheet(sheetName)){sheetName=(name.slice(0,28)+" "+(++n)).slice(0,31)}
  const ws=wb.addWorksheet(sheetName);pageBox(ws,"portrait");
  const maxP=Math.max(1,...u.rows.map(r=>r.intervals.length));
  const tableLastCol=2+2*maxP+3; // Data,Dia,(Entrada/Saída)xN,Trabalhado,Previsto,Observação
  const bannerLastCol=Math.max(9,tableLastCol);
  ws.mergeCells(`A1:${colLetter(bannerLastCol)}2`);const c1=ws.getCell("A1");c1.value="CASA HIRO";c1.font={name:"Georgia",size:24,bold:true,color:{argb:BR.branco}};
  c1.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};c1.alignment={horizontal:"center",vertical:"center"};
  for(let c=1;c<=bannerLastCol;c++){ws.getRow(1).getCell(c).fill=ws.getRow(2).getCell(c).fill=c1.fill}
  ws.mergeCells(`A3:${colLetter(bannerLastCol)}3`);const c3=ws.getCell("A3");c3.value="A ciência do cuidado com o acolhimento de casa.";
  c3.font={italic:true,size:11,color:{argb:BR.verdeClaroBg}};c3.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};c3.alignment={horizontal:"center",vertical:"center"};
  ws.mergeCells(`A4:${colLetter(bannerLastCol)}4`);const c4=ws.getCell("A4");c4.value="Folha de apuração de ponto";
  c4.font={bold:true,size:12,color:{argb:BR.branco}};c4.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeMedio}};c4.alignment={horizontal:"center",vertical:"center"};
  ws.getRow(1).height=17;ws.getRow(2).height=17;ws.getRow(4).height=24;
  // bloco de identificação: esquema fixo A-I (label A, valor B:F, label2 G, valor2 H:I)
  const idBlock=[["Integrante",nomeInteg(ig),"ID relógio",u.uid??""],["CPF",ig.cpf||"","RG",ig.rg||""],
    ["Cargo",ig.cargo||"","Departamento",ig.depto||"Outro"],["Admissão",ig.admissao?brDate(ig.admissao):"","Turno",ig.turno||"—"],
    ["Período",`${brDate(POINT.result.start)} a ${brDate(POINT.result.end)}`,"Situação",ig.situacao||"Ativo"]];
  idBlock.forEach((row,ri)=>{
    const r=6+ri;
    ws.mergeCells(`B${r}:F${r}`);ws.mergeCells(`H${r}:I${r}`);
    labelCell(ws,"A"+r,row[0]);valueCell(ws,"B"+r,row[1]);
    labelCell(ws,"G"+r,row[2]);valueCell(ws,"H"+r,row[3]);
    ws.getRow(r).height=21;
  });
  ws.mergeCells("B11:I11");labelCell(ws,"A11","Escala");valueCell(ws,"B11",ig.id?escalasTexto(ig,POINT.result.start,POINT.result.end):"—");ws.getRow(11).height=21;
  const headRowNo=12;
  const head=["Data","Dia"];for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);head.push("Trabalhado","Previsto","Observação");
  head.forEach((h,i)=>headerCell(ws,colLetter(i+1)+headRowNo,h));ws.getRow(headRowNo).height=24;
  const widths=[13,7];for(let k=0;k<maxP;k++)widths.push(10,10);widths.push(12,11,34);
  ws.columns=widths.map(w=>({width:w}));
  let r=headRowNo+1;
  u.rows.forEach((row,ri)=>{ws.getRow(r).height=18;writeJourneyRow(ws,r,1,row,maxP,ri%2===1);r++});
  const lastData=r-1,totRow=lastData+1;
  const workCol=3+2*maxP,prevCol=workCol+1,obsCol=prevCol+1;
  ws.mergeCells(`A${totRow}:${colLetter(workCol-1)}${totRow}`);
  const totLabel=ws.getCell(`A${totRow}`);totLabel.value="TOTAIS";totLabel.font={bold:true,size:10.5,color:{argb:BR.branco}};
  totLabel.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR.verdeEsc}};totLabel.alignment={horizontal:"right",vertical:"middle"};totLabel.border=thinBorder(BR.verdeEsc);
  for(let c=2;c<workCol;c++){const cc=ws.getCell(totRow,c);cc.fill=totLabel.fill;cc.border=thinBorder(BR.verdeEsc)}
  const wc=ws.getCell(totRow,workCol);wc.value={formula:`ROUND(SUM(${colLetter(workCol)}${headRowNo+1}:${colLetter(workCol)}${lastData})*1440,0)/1440`,result:u.t.worked/1440};
  wc.numFmt="[h]:mm";wc.font={bold:true,size:10.5,color:{argb:BR.branco}};wc.fill=totLabel.fill;wc.alignment={horizontal:"center",vertical:"middle"};wc.border=thinBorder(BR.verdeEsc);
  const pc=ws.getCell(totRow,prevCol);pc.value={formula:`ROUND(SUM(${colLetter(prevCol)}${headRowNo+1}:${colLetter(prevCol)}${lastData})*1440,0)/1440`,result:u.t.expected/1440};
  pc.numFmt="[h]:mm";pc.font=wc.font;pc.fill=totLabel.fill;pc.alignment=wc.alignment;pc.border=thinBorder(BR.verdeEsc);
  const ocCell=ws.getCell(totRow,obsCol);
  ocCell.value={formula:`IF(${colLetter(workCol)}${totRow}>=${colLetter(prevCol)}${totRow},"Saldo: +"&TEXT(ROUND((${colLetter(workCol)}${totRow}-${colLetter(prevCol)}${totRow})*1440,0)/1440,"[h]:mm"),"Saldo: -"&TEXT(ROUND((${colLetter(prevCol)}${totRow}-${colLetter(workCol)}${totRow})*1440,0)/1440,"[h]:mm"))`,
    result:(u.t.worked>=u.t.expected?"Saldo: +":"Saldo: -")+fmtHHMM(Math.abs(u.t.worked-u.t.expected))};
  ocCell.font=wc.font;ocCell.fill=totLabel.fill;ocCell.alignment={horizontal:"left",vertical:"middle"};ocCell.border=thinBorder(BR.verdeEsc);
  ws.getRow(totRow).height=22;
  // contadores: esquema fixo A-I (label A:D, valor E, label2 F:H, valor2 I)
  const cRow1=totRow+2,cRow2=totRow+3;
  labelCell(ws,"A"+cRow1,"Dias apurados");ws.mergeCells(`A${cRow1}:D${cRow1}`);
  const d1=ws.getCell("E"+cRow1);d1.value={formula:`COUNTA(A${headRowNo+1}:A${lastData})`,result:u.rows.length};d1.font={bold:true,size:10,color:{argb:BR.ink}};d1.alignment={horizontal:"center"};
  labelCell(ws,"F"+cRow1,"Dias com registro de ponto");ws.mergeCells(`F${cRow1}:H${cRow1}`);
  const d2=ws.getCell("I"+cRow1);
  d2.value={formula:`COUNTIF(${colLetter(workCol)}${headRowNo+1}:${colLetter(workCol)}${lastData},">0")`,result:u.rows.filter(rr=>rr.workedMin>0).length};
  d2.font={bold:true,size:10,color:{argb:BR.ink}};d2.alignment={horizontal:"center"};
  labelCell(ws,"A"+cRow2,"Faltas");ws.mergeCells(`A${cRow2}:D${cRow2}`);
  const f1=ws.getCell("E"+cRow2);f1.value={formula:`COUNTIF(${colLetter(obsCol)}${headRowNo+1}:${colLetter(obsCol)}${lastData},"Falta*")`,result:u.t.faltas};f1.font={bold:true,size:10,color:{argb:BR.ink}};f1.alignment={horizontal:"center"};
  labelCell(ws,"F"+cRow2,"Atestados");ws.mergeCells(`F${cRow2}:H${cRow2}`);
  const a1=ws.getCell("I"+cRow2);a1.value={formula:`COUNTIF(${colLetter(obsCol)}${headRowNo+1}:${colLetter(obsCol)}${lastData},"Atestado*")`,result:u.t.atestados};a1.font={bold:true,size:10,color:{argb:BR.ink}};a1.alignment={horizontal:"center"};
  ws.getRow(cRow1).height=20;ws.getRow(cRow2).height=20;
  // declaração e assinatura: esquema fixo A-I
  const decRow=totRow+6;
  ws.mergeCells(`A${decRow}:I${decRow+1}`);
  const dec=ws.getCell("A"+decRow);dec.value="Declaro que conferi os registros de ponto acima referentes ao período apurado e que estão de acordo com a jornada efetivamente cumprida.";
  dec.font={italic:true,size:9.5,color:{argb:BR.ink}};dec.alignment={horizontal:"left",vertical:"center",wrapText:true};
  const sigDateRow=totRow+9;
  ws.mergeCells(`A${sigDateRow}:I${sigDateRow}`);
  ws.getCell("A"+sigDateRow).value="Caraguatatuba - SP, ____ de ______________ de ________";ws.getCell("A"+sigDateRow).alignment={horizontal:"right"};
  const sigRow=totRow+13,labRow=sigRow+1,nameRow=sigRow+2,docRow=sigRow+3;
  ws.mergeCells(`A${sigRow}:D${sigRow}`);ws.mergeCells(`F${sigRow}:I${sigRow}`);
  ws.getCell("A"+sigRow).border=medBottom(BR.ink);ws.getCell("F"+sigRow).border=medBottom(BR.ink);
  ws.getRow(sigRow).height=30;
  ws.mergeCells(`A${labRow}:D${labRow}`);ws.mergeCells(`F${labRow}:I${labRow}`);
  ws.getCell("A"+labRow).value="INTEGRANTE";ws.getCell("F"+labRow).value="CASA HIRO";
  [ws.getCell("A"+labRow),ws.getCell("F"+labRow)].forEach(c=>{c.font={bold:true,size:10.5,color:{argb:BR.verdeEsc}};c.alignment={horizontal:"center",vertical:"center"}});
  ws.mergeCells(`A${nameRow}:D${nameRow}`);ws.mergeCells(`F${nameRow}:I${nameRow}`);
  ws.getCell("A"+nameRow).value=nomeInteg(ig);ws.getCell("F"+nameRow).value=e.razao;
  [ws.getCell("A"+nameRow),ws.getCell("F"+nameRow)].forEach(c=>{c.font={size:9.5,color:{argb:BR.ink}};c.alignment={horizontal:"center",vertical:"center",wrapText:true}});
  ws.getRow(nameRow).height=28;
  ws.mergeCells(`A${docRow}:D${docRow}`);ws.mergeCells(`F${docRow}:I${docRow}`);
  ws.getCell("A"+docRow).value="CPF "+(ig.cpf||"—");ws.getCell("F"+docRow).value="CNPJ "+(e.cnpj||"—");
  [ws.getCell("A"+docRow),ws.getCell("F"+docRow)].forEach(c=>{c.font={size:8.5,italic:true,color:{argb:BR.mute}};c.alignment={horizontal:"center",vertical:"center"}});
  ws.views=[{state:"frozen",ySplit:headRowNo,showGridLines:false}];
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
  const e=empresa(),R0=POINT.result,L=integList().filter(i=>!semPonto(i)&&(!sel||sel.has(String(i.uid))||sel.has(String(i.id))));
  const R=R0&&sel?{...R0,users:R0.users.filter(u=>sel.has(String(u.uid)))}:R0;
  if(abas.capa)buildCapa(wb,e,R);
  if(abas.integrantes)buildIntegrantesSheet(wb,L);
  if(R){
    const maxP=Math.max(1,...R.users.flatMap(u=>u.rows.map(r=>r.intervals.length)));
    if(abas.jornadas)buildJornadasSheet(wb,R,maxP);
    if(abas.jornadas&&R.users.some(u=>(u.t.nightReal||0)>0))buildNoturnoSheet(wb,R);
    if(abas.individual)R.users.forEach(u=>buildPersonSheet(wb,e,u.ig||{},u));
  }
  if(!wb.worksheets.length)throw new Error("Com essas escolhas não há nenhuma aba para gerar (jornadas e folha individual precisam do ponto calculado).");
  return wb;
}
