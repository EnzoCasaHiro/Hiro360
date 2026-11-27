/* ================= CONTADOR (XLSX + PDF, com a identidade e o estilo Casa Hiro) ================= */
const REQ=[["nomeCompleto","nome completo"],["cpf","CPF"],["admissao","admissão"],["cargo","cargo"],["pis","PIS/NIT"]];
const miss=i=>REQ.filter(([k])=>!semPonto(i)||k==="nomeCompleto"||k==="cpf").filter(([k])=>!i[k]).map(([,l])=>l);
const BR={verdeEsc:"FF1E5C2A",verdeMedio:"FF2E7D32",verdeClaroBg:"FFDCEBD3",areia:"FFF5EFE0",areiaEsc:"FFE8DFCC",madeiraClara:"FFC5A882",ink:"FF3A362C",branco:"FFFFFFFF",mute:"FF8A8577"};
const STAT_BG={ok:"FFD6EDD8",falta:"FFE8DFCC",pendencia:"FFF0E6D3",atestado:"FFD6EAF8",justificada:"FFD6EDD8",esquecido:"FFC5A882",sem_escala:"FFE8DFCC",feriado:"FFE8DFCC",folga:"FFF5F1E6"};
const STAT_FG={ok:"FF2E7D32",falta:"FF6B3A2A",pendencia:"FF7D5A3C",atestado:"FF1B4F72",justificada:"FF1E5C2A",esquecido:"FF3B2A1A",sem_escala:"FF7A7468",feriado:"FF7A7468",folga:"FF7A7468"};
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
  if(r.oc&&r.status==="falta"&&r.oc.tipo==="falta_confirmada")return "Falta"+(r.oc.texto?": "+r.oc.texto:"");
  if(r.oc&&(r.oc.tipo==="banco_horas"||r.oc.tipo==="dobra"))return OC[r.oc.tipo]+(r.oc.texto?": "+r.oc.texto:"");
  if(r.oc&&r.status==="compensada")return "Compensada com o trabalho de "+brDate(r.oc.comp)+(r.oc.texto?": "+r.oc.texto:"");
  if(r.compensa&&r.compensa.length)return "Trabalhou para compensar a falta de "+r.compensa.map(brDate).join(", ");
  if(r.oc&&!OC_FALTA.has(r.oc.tipo)){
    const base=r.oc.tipo==="atestado"?"Atestado":r.oc.tipo==="falta_justificada"?"Justificada":r.oc.tipo==="esquecimento"?"Esquecimento de ponto":"Observação";
    return base+(r.oc.texto?": "+r.oc.texto:"");
  }
  if(r.status==="falta")return "Falta";
  if(r.status==="pendencia"){const fl=flagsVisiveis(r).filter(f=>f!=="justificar");return "Pendência"+(fl.length?": "+fl.map(f=>FLAG_LABEL[f]||f).join(", "):"")}
  if(r.status==="sem_escala")return "Marcação fora da escala";
  if(r.status==="feriado")return "Feriado";
  if(r.status==="folga")return "Folga"+(r.feriadoDia?" (feriado)":"");
  const extra=flagsVisiveis(r).filter(f=>f!=="tolerancia_art58"&&f!=="trabalhou_feriado").map(f=>FLAG_LABEL[f]||f);
  if(r.feriadoMin)extra.push(`Trabalhou no feriado: ${fmtHHMM(r.feriadoMin)} com adicional`);
  if(r.nightReal)extra.push(`Noturno: ${fmtHHMM(r.nightReal)} reais = ${fmtHHMM(r.nightFicta)} (hora de 52min30s)`);
  return extra.length?extra.join(" · "):"";
}
/* ---- visual do XLSX do contador: cores da marca, faixa de título, zebra e formatação condicional ---- */
const XC={esc:"FF1F5C29",med:"FF2E7D33",claro:"FFDCEBD5",creme:"FFFAF7EF",bege:"FFF1EBDA",linha:"FFE2DACA",ink:"FF22302A",mute:"FF6B7469",zebra:"FFFCFAF5",branco:"FFFFFFFF",verm:"FFB3261E",vermClaro:"FFF8DEDA",slogan:"FFE8F1E4"};
const XC_SLOGAN="A ciência do cuidado com o acolhimento de casa.";
const XC_RODAPE="&L&8Casa Hiro · Caraguatatuba — Litoral Norte de SP&R&8Página &P de &N";
const xcFill=a=>({type:"pattern",pattern:"solid",fgColor:{argb:a}});
const xcFonte=o=>({name:"Calibri",size:10,color:{argb:XC.ink},...(o||{})});
const xcCnpj=c=>{const d=String(c||"").replace(/\D/g,"");return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):String(c||"")};
// fundo da linha: sábado e domingo em bege, os outros dias alternando branco e creme
const xcFundo=(i,day)=>day&&pyWeekday(day)>=5?XC.bege:(i%2?XC.zebra:XC.branco);
function xcPagina(ws,orient,titulos,vista){
  ws.views=[{showGridLines:false,...(vista||{})}];
  ws.pageSetup={paperSize:9,orientation:orient,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.4,right:.4,top:.5,bottom:.5,header:.3,footer:.3},...(titulos?{printTitlesRow:titulos}:{})};
  ws.headerFooter={oddFooter:XC_RODAPE};
}
// faixa verde mesclada no topo (título e, embaixo, o slogan ou a empresa em itálico)
function xcFaixa(ws,nC,titulo,sub,tam){
  const L=colLetter(Math.max(2,nC));
  for(const r of[1,2])for(let c=1;c<=Math.max(2,nC);c++)ws.getCell(r,c).fill=xcFill(XC.esc);
  ws.mergeCells(`A1:${L}1`);ws.mergeCells(`A2:${L}2`);
  const a=ws.getCell("A1");a.value=titulo;a.font=xcFonte({size:tam||16,bold:true,color:{argb:XC.branco}});a.alignment={vertical:"middle"};
  const b=ws.getCell("A2");b.value=sub;b.font=xcFonte({size:9,italic:true,color:{argb:XC.slogan}});b.alignment={vertical:"middle"};
  ws.getRow(1).height=30;ws.getRow(2).height=18;
}
// faixa verde de um bloco (Resumo do período, Horas a mais e banco de horas)
function xcBloco(ws,r,nC,txt){
  for(let c=1;c<=nC;c++)ws.getCell(r,c).fill=xcFill(XC.med);
  ws.mergeCells(`A${r}:${colLetter(nC)}${r}`);
  const c=ws.getCell(r,1);c.value=txt;c.font=xcFonte({bold:true,color:{argb:XC.branco}});c.alignment={vertical:"middle"};ws.getRow(r).height=26;
}
function xcCab(ws,r,head,dir){
  head.forEach((h,i)=>{const c=ws.getCell(r,i+1);c.value=h;c.font=xcFonte({size:9,bold:true,color:{argb:XC.branco}});c.fill=xcFill(XC.med);
    c.alignment={horizontal:dir(h,i)?"right":"left",vertical:"middle",wrapText:true}});
  ws.getRow(r).height=24;
}
function xcCel(c,fundo,fonte,al,fmt){c.font=xcFonte(fonte);c.fill=xcFill(fundo||XC.branco);c.border={bottom:{style:"thin",color:{argb:XC.linha}}};c.alignment={vertical:"middle",...(al?{horizontal:al}:{})};if(fmt)c.numFmt=fmt;return c}
function xcRotulo(ws,addr,v,tam){const c=ws.getCell(addr);c.value=v;return xcCel(c,XC.creme,{size:tam||9,bold:true,color:{argb:XC.mute}})}
// cor da observação conforme o texto; a ordem importa (a primeira regra que bate vale)
const XC_OBS=[["Atestado","FF5B3F8C","FFE6DEF3"],["Compensa","FF8A5A00","FFF6E7C6"],["Abateu","FF8A5A00","FFF6E7C6"],["Folga","FF8A5A00","FFF6E7C6"],["Feriado","FF2F5D8A","FFDCE7F2"],["Falta","FFB3261E","FFF8DEDA"]];
function xcCondicional(ws,saldoRef,obsRef){
  const st=(cor,fundo)=>({font:{bold:true,color:{argb:cor}},...(fundo?{fill:{type:"pattern",pattern:"solid",fgColor:{argb:fundo},bgColor:{argb:fundo}}}:{})});
  if(saldoRef)ws.addConditionalFormatting({ref:saldoRef,rules:[{type:"cellIs",operator:"greaterThan",formulae:["0"],style:st(XC.med)},{type:"cellIs",operator:"lessThan",formulae:["0"],style:st(XC.verm)}]});
  if(obsRef){const c0=obsRef.split(":")[0];ws.addConditionalFormatting({ref:obsRef,rules:XC_OBS.map(([t,cor,fundo])=>({type:"expression",stopIfTrue:true,formulae:[`ISNUMBER(SEARCH("${t}",${c0}))`],style:st(cor,fundo)}))})}
}

function buildCapa(wb,e,R){
  const ws=wb.addWorksheet("Capa");xcPagina(ws,"portrait");
  ws.columns=[{width:26},{width:70}];
  xcFaixa(ws,2,"Casa Hiro — Relatório de integrantes e apuração de ponto",XC_SLOGAN,18);
  const info=[["Razão social",e.razao],["CNPJ",xcCnpj(e.cnpj)||"—"],["Endereço",e.endereco],["Telefone",e.telefone],["E-mail",e.email],["Site",e.site],
    ["Período apurado",R?`${brDate(R.start)} a ${brDate(R.end)}${R.end<=refFim(refYm(R.end))&&R.start===refIni(refYm(R.end))?" (referência "+refYm(R.end).slice(5)+"/"+refYm(R.end).slice(0,4)+": dia 26 a dia 25)":""}`:"Ponto ainda não calculado"],["Emitido em",new Date().toLocaleString("pt-BR")]];
  let r=4;
  info.forEach(([k,v])=>{xcRotulo(ws,"A"+r,k);const c=ws.getCell("B"+r);c.value=v;xcCel(c);ws.getRow(r).height=22;r++});
  const note=ws.getCell(`A${r+1}`);
  note.value="Abas: Integrantes · Jornadas diárias · uma folha de ponto por integrante (com campo de assinatura).";
  note.font=xcFonte({size:9,italic:true,color:{argb:XC.mute}});
}
function buildIntegrantesSheet(wb,L){
  const ws=wb.addWorksheet("Integrantes");xcPagina(ws,"landscape","1:1",{state:"frozen",xSplit:2,ySplit:1});
  const head=["ID relógio","Nome completo","CPF","RG","PIS/NIT","CTPS","Nascimento","Admissão","Cargo/função","Departamento","Situação","Turno","Telefone","E-mail","Endereço","CEP","Cidade/UF","Contato de emergência","Tel. emergência"];
  ws.columns=[10,34,16,14,15,14,12,12,26,18,10,8,16,30,40,11,14,14,14].map(w=>({width:w}));
  xcCab(ws,1,head,(h,i)=>i===0);
  L.forEach((i,ri)=>{
    const row=ri+2,fundo=ri%2?XC.zebra:XC.branco,vals=[i.uid??"",i.nomeCompleto||i.nome||"",i.cpf||"",i.rg||"",i.pis||"",i.ctps||"",xlDateOnly(i.nascimento),xlDateOnly(i.admissao),i.cargo||"",i.depto||"",i.situacao||"Ativo",i.turno||"",i.telefone||"",i.email||"",i.endereco||"",i.cep||"",i.cidade||"",i.emergNome||"",i.emergTel||""];
    vals.forEach((v,ci)=>{
      const cell=ws.getCell(row,ci+1);cell.value=v;
      xcCel(cell,fundo,ci===1?{bold:true}:ci===10?{size:9,bold:true,color:{argb:(v==="Ativo"?XC.med:XC.mute)}}:null,ci===0?"right":null,ci===6||ci===7?"DD/MM/YYYY":null);
    });
    ws.getRow(row).height=18;
  });
  ws.autoFilter={from:"A1",to:colLetter(head.length)+Math.max(1,L.length+1)};
}
const SALDO_FMT='+0" min";-0" min";0" min"';
const xlHorasTxt=ref=>`IF(${ref}<0,"-",IF(${ref}>0,"+",""))&TEXT(ABS(${ref})/1440,"[h]:mm")&" h"`;
// o mesmo texto que a fórmula acima produz (Excel e Google Planilhas), para o arquivo abrir já igual ao recalculado
const xlHorasRes=min=>{const r=Math.round(min||0),a=Math.abs(r);return(r<0?"-":r>0?"+":"")+Math.floor(a/60)+":"+String(a%60).padStart(2,"0")+" h"};
const xlParesDia=r=>{const M=r.marcas||[],I=r.rawIntervals||[];
  if(!M.length||M.length===2*I.length)return I.map(([a,b])=>[a,b]);
  const L=[];for(let i=0;i<M.length;i+=2)L.push([M[i],M[i+1]||null]);return L};
// toda aba sai com as mesmas colunas de batidas, no mínimo Entrada 1/Saída 1/Entrada 2/Saída 2 (mesmo que fiquem vazias)
const xlMaxPares=rows=>Math.max(2,...rows.map(r=>Math.max(r.intervals.length,xlParesDia(r).length)));
// ajuste em minutos: intervalo descontado (negativo) ou dia abonado por atestado/esquecimento (positivo)
function xlAjuste(r){const parMin=xlParesDia(r).filter(([a,b])=>a&&b).reduce((s,[a,b])=>s+minutesBetween(a,b),0);return Math.round(r.workedMin-parMin)}
// escreve uma linha de jornada a partir da coluna startCol:
// Data | Dia | Entrada/Saída… | Ajuste (min) | Trabalhado | Previsto | Saldo (min) | Observação
// Tudo é valor de verdade ou fórmula visível: mexendo nas batidas, o trabalhado e o saldo recalculam (Excel e Google Planilhas).
function writeJourneyRow(ws,rowIdx,startCol,r,maxP,fundo,opt){
  let c=startCol;
  const put=(v,fmt,formula,align,fonte)=>{
    const cell=ws.getCell(rowIdx,c);
    cell.value=formula?{formula,result:v}:v;
    xcCel(cell,fundo,fonte,align||"right",fmt);
    if(opt&&opt.separa)cell.border={...cell.border,top:{style:"medium",color:{argb:XC.med}}};
    return c++;
  };
  const L=n=>colLetter(n)+rowIdx;
  put(xlDateOnly(r.day),"DD/MM/YYYY",null,"left",opt&&opt.dataNegrito?{bold:true}:null);
  put(WD3[pyWeekday(r.day)],null,null,"center");
  const entC=[],saiC=[],pares=xlParesDia(r);
  for(let k=0;k<maxP;k++){
    const iv=pares[k];
    entC.push(put(iv&&iv[0]?xlSerial(iv[0]):null,"HH:MM"));
    saiC.push(put(iv&&iv[1]?xlSerial(iv[1]):null,"HH:MM"));
  }
  const adj=xlAjuste(r);
  const ajC=put(adj||null,"0");
  // cada par só conta com entrada e saída preenchidas; MOD aceita plantão que passa da meia-noite
  const fP=entC.map((ec,i)=>`IF(AND(${L(ec)}<>"",${L(saiC[i])}<>""),MOD(${L(saiC[i])}-${L(ec)},1),0)`).join("+")||"0";
  const wC=put(r.workedMin/1440,"[H]:MM",`ROUND((${fP})*1440+N(${L(ajC)}),0)/1440`,null,{bold:true});
  const pC=put(xlDur(r.expectedMin),"[H]:MM",null,null,{color:{argb:XC.mute}});
  // saldo do dia em minutos; até 10 min de diferença no dia não conta (CLT art. 58 §1º); dia com pendência fica fora (0)
  const dm=Math.round(r.workedMin-r.expectedMin),dif=`ROUND((${L(wC)}-${L(pC)})*1440,0)`;
  let sF=null;
  if(r.status!==PENDENCIA){if(r.saldo===0&&dm!==0&&Math.abs(dm)<=10)sF=`IF(ABS(${dif})<=10,0,${dif})`;else if(r.saldo===dm)sF=dif}
  // dia com batida faltando: saldo 0 enquanto o número de batidas for ímpar; completou na planilha, passa a calcular
  else if(!r.saldo&&maxP)sF=`IF(MOD(COUNT(${L(entC[0])}:${L(saiC[maxP-1])}),2)=1,0,IF(ABS(${dif})<=10,0,${dif}))`;
  const sC=put(r.saldo||0,SALDO_FMT,sF);
  const oC=put(obsText(r),null,null,"left",{size:9,color:{argb:XC.mute}});
  return{wC,pC,sC,oC};
}
function buildJornadasSheet(wb,R,maxP){
  const ws=wb.addWorksheet("Jornadas diárias");
  const head=["ID","Integrante","Data","Dia"];for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);head.push("Ajuste (min)","Trabalhado","Previsto","Saldo (min)","Observação");
  const hr=4,nC=head.length;
  xcPagina(ws,"landscape",`${hr}:${hr}`,{state:"frozen",xSplit:2,ySplit:hr});
  xcFaixa(ws,nC,"Casa Hiro — Jornadas diárias de "+brDate(R.start)+" a "+brDate(R.end),XC_SLOGAN);
  xcCab(ws,hr,head,(h,i)=>i===0||i>=4&&h!=="Observação");
  const widths=[7,34,12,7];for(let k=0;k<maxP;k++)widths.push(9,9);widths.push(9,11,10,10,52);
  ws.columns=widths.map(w=>({width:w}));
  let rr=hr+1,i=0;
  R.users.forEach((u,ui)=>{
    u.rows.forEach((r,k)=>{
      const fundo=xcFundo(i++,r.day),separa=ui>0&&k===0;
      [[1,u.uid,"center"],[2,u.nome,"left"]].forEach(([col,v,al])=>{const cell=ws.getCell(rr,col);cell.value=v;xcCel(cell,fundo,null,al);
        if(separa)cell.border={...cell.border,top:{style:"medium",color:{argb:XC.med}}}});
      writeJourneyRow(ws,rr,3,r,maxP,fundo,{separa});
      ws.getRow(rr).height=18;rr++;
    });
  });
  const ult=Math.max(hr+1,rr-1);
  ws.autoFilter={from:"A"+hr,to:colLetter(nC)+ult};
  xcCondicional(ws,`${colLetter(nC-1)}${hr+1}:${colLetter(nC-1)}${ult}`,`${colLetter(nC)}${hr+1}:${colLetter(nC)}${ult}`);
}
// dados de uma folha individual: a mesma fonte para a aba do XLSX e para o PDF da folha de ponto (nada é recalculado de outro jeito)
const folhaTemMarcacao=u=>u.rows.some(r=>(r.marcas&&r.marcas.length)||(r.rawIntervals&&r.rawIntervals.length));
function folhaEtiqueta(r){
  if(r.feriadoMin>0||(r.flags||[]).includes("trabalhou_feriado"))return"Feriado trabalhado";
  if(r.status==="feriado")return"Feriado";
  if(r.status==="folga")return"Folga";
  if(r.status==="atestado"||(r.oc&&r.oc.tipo==="atestado"))return"Atestado";
  if(r.status==="compensada"||(r.compensa&&r.compensa.length)||(r.oc&&r.oc.tipo==="banco_horas"))return"Compensação";
  if(r.status==="falta")return"Falta";
  return"";
}
// texto da observação ao lado da etiqueta, sem repetir o que a etiqueta já diz
function folhaObsCurta(obs,etq){
  let t=String(obs||"");
  if(etq==="Feriado")t=t.replace(/^Feriado/,"");
  if(etq==="Folga")t=t.replace(/^Folga/,"");
  if(etq==="Falta")t=t.replace(/^Falta/,"");
  if(etq==="Atestado")t=t.replace(/^Atestado/,"");
  if(etq==="Feriado trabalhado")t=t.replace(/Trabalhou no feriado: /,"");
  return t.replace(/^[:\s·]+/,"").trim();
}
function folhaDados(u,R){
  const rows=u.rows.map(r=>{const obs=obsText(r),etq=folhaEtiqueta(r);
    return{day:r.day,dia:WD3[pyWeekday(r.day)],fds:pyWeekday(r.day)>=5,pares:xlParesDia(r),ajuste:xlAjuste(r),worked:r.workedMin||0,expected:r.expectedMin||0,saldo:r.saldo||0,status:r.status,obs,etq,texto:folhaObsCurta(obs,etq)}});
  return{rows,fb:folhaBanco(u,R),temMarcacao:folhaTemMarcacao(u),
    t:{worked:u.t.worked||0,expected:u.t.expected||0,saldo:u.t.saldo||0,mais:u.t.mais||0,menos:u.t.menos||0,
       apurados:u.rows.filter(x=>x.status!=="folga").length,comPonto:u.rows.filter(x=>x.workedMin>0).length,faltas:u.t.faltas||0,atestados:u.t.atestados||0}};
}
// folha de ponto de uma pessoa: fórmulas visíveis, pronta para editar no Excel ou no Google Planilhas; mesclagem só fora da tabela de dias
function buildPersonSheet(wb,e,ig,u,maxP){
  const name=nomeInteg(ig).slice(0,31)||("ID "+u.uid);
  let sheetName=name,n=1;while(wb.getWorksheet(sheetName)){sheetName=(name.slice(0,28)+" "+(++n)).slice(0,31)}
  const ws=wb.addWorksheet(sheetName);
  const R=POINT.result,ym=refYm(R.end),D=folhaDados(u,R);maxP=Math.max(maxP||0,xlMaxPares(u.rows));
  const widths=[11.5,6];for(let k=0;k<maxP;k++)widths.push(9.5,9.5);widths.push(9,11.5,10,10,46);
  ws.columns=widths.map(w=>({width:w}));
  const nC=widths.length,LC=colLetter(nC),ink=xcFonte(),forte=xcFonte({bold:true,color:{argb:XC.esc}});
  const cel=(addr,v,font,fmt)=>{const c=ws.getCell(addr);c.value=v;c.font=font||ink;c.alignment={vertical:"middle"};if(fmt)c.numFmt=fmt;return c};
  const texto=(r,v,font,h,box)=>{if(box)for(let c=1;c<=nC;c++)ws.getCell(r,c).fill=xcFill(box);ws.mergeCells(`A${r}:${LC}${r}`);const c=cel("A"+r,v,font);c.alignment={vertical:"middle",wrapText:true};if(h)ws.getRow(r).height=h;return c};
  xcFaixa(ws,nC,"Folha de apuração de ponto",(e.razao||"Casa Hiro")+(e.cnpj?" · CNPJ "+xcCnpj(e.cnpj):""));
  const per=`${brDate(R.start)} a ${brDate(R.end)}`+(R.start===refIni(ym)?` (referência ${ym.slice(5)}/${ym.slice(0,4)}: do dia 26 ao dia 25)`:"");
  const ident=[["Integrante",nomeInteg(ig)],["CPF",ig.cpf||"—"],["Cargo",ig.cargo||"—"],["Departamento",ig.depto||"Outro"],["Admissão",ig.admissao?brDate(ig.admissao):"—"],["Nº no relógio",u.uid!=null?String(u.uid):"—"],["Escala",ig.id?escalasTexto(ig,R.start,R.end):"—"],["Período",per]];
  let r=4;ident.forEach(([k,v],i)=>{xcRotulo(ws,"A"+r,k,8);for(let c=2;c<=nC;c++)xcCel(ws.getCell(r,c));ws.mergeCells(`B${r}:${LC}${r}`);
    const c=ws.getCell("B"+r);c.value=v;xcCel(c,XC.branco,i===0?{size:13,bold:true,color:{argb:XC.esc}}:null);ws.getRow(r).height=i===0?24:18;r++});
  const hr=r+1,head=["Data","Dia"];for(let k=1;k<=maxP;k++)head.push("Entrada "+k,"Saída "+k);head.push("Ajuste (min)","Trabalhado","Previsto","Saldo (min)","Observação");
  xcCab(ws,hr,head,(h,i)=>i>=2&&h!=="Observação");
  let rr=hr+1;
  u.rows.forEach((row,ri)=>{writeJourneyRow(ws,rr,1,row,maxP,xcFundo(ri,row.day),{dataNegrito:true});ws.getRow(rr).height=18;rr++});
  const ini=hr+1,fim=Math.max(ini,rr-1),wC=3+2*maxP+1,pC=wC+1,sC=pC+1,oC=sC+1;
  const faixa=col=>`${colLetter(col)}${ini}:${colLetter(col)}${fim}`;
  xcCondicional(ws,faixa(sC),faixa(oC));
  // totais
  const tr=rr,tot=(col,formula,res,fmt)=>{const c=ws.getCell(tr,col);c.value={formula,result:res};c.numFmt=fmt};
  for(let c=1;c<=oC;c++){const cc=ws.getCell(tr,c);cc.fill=xcFill(XC.claro);cc.font=forte;cc.alignment={horizontal:c===oC||c===1?"left":"right",vertical:"middle"}}
  ws.getCell(tr,1).value="TOTAIS";ws.getRow(tr).height=22;
  tot(wC,`ROUND(SUM(${faixa(wC)})*1440,0)/1440`,D.t.worked/1440,"[H]:MM");
  tot(pC,`ROUND(SUM(${faixa(pC)})*1440,0)/1440`,D.t.expected/1440,"[H]:MM");
  tot(sC,`SUM(${faixa(sC)})`,D.t.saldo,SALDO_FMT);
  const S=colLetter(sC)+tr;ws.getCell(tr,oC).value={formula:`"Saldo do período: "&${xlHorasTxt(S)}`,result:"Saldo do período: "+xlHorasRes(D.t.saldo)};
  // resumo: rótulo na coluna A, número na coluna "Previsto"
  r=tr+2;xcBloco(ws,r,nC,"Resumo do período");r++;
  const linhaFundo=(rw,fundo,font)=>{for(let c=1;c<=nC;c++)xcCel(ws.getCell(rw,c),fundo,font)};
  [["Dias apurados",`COUNT(${faixa(1)})-COUNTIF(${faixa(oC)},"Folga*")`,D.t.apurados],["Dias com registro de ponto",`COUNTIF(${faixa(wC)},">0")`,D.t.comPonto],
   ["Faltas",`COUNTIFS(${faixa(oC)},"Falta*",${faixa(wC)},0)`,D.t.faltas],["Atestados",`COUNTIF(${faixa(oC)},"Atestado*")`,D.t.atestados]].forEach(([k,f,v])=>{
    linhaFundo(r);ws.getCell(r,1).value=k;const c=ws.getCell(r,pC);c.value={formula:f,result:v};c.font=xcFonte({bold:true});c.alignment={horizontal:"right",vertical:"middle"};ws.getRow(r).height=19;r++});
  // banco de horas: minutos na coluna "Saldo", em horas na "Observação"
  const fb=D.fb;r++;
  xcBloco(ws,r,nC,"Horas a mais e banco de horas — referência "+fb.mm);r++;
  const linhaB=(k,valor,formula,final)=>{
    const font=final?xcFonte({size:11,bold:true,color:{argb:XC.esc}}):null;linhaFundo(r,final?XC.claro:XC.branco,font);
    ws.getCell(r,1).value=k;const c=ws.getCell(r,sC);c.value=formula?{formula,result:valor}:valor;c.numFmt=SALDO_FMT;c.font=font||xcFonte({bold:true});c.alignment={horizontal:"right",vertical:"middle"};
    const h=ws.getCell(r,oC);h.value={formula:xlHorasTxt(colLetter(sC)+r),result:xlHorasRes(valor)};h.font=font||xcFonte({bold:true,color:{argb:XC.esc}});h.alignment={horizontal:"right",vertical:"middle"};
    ws.getRow(r).height=final?24:19;const ref=colLetter(sC)+r;r++;return ref};
  linhaB("Horas trabalhadas a mais que o previsto (min)",D.t.mais,`SUMIF(${faixa(sC)},">0")`);
  linhaB("Horas trabalhadas a menos que o previsto (min)",D.t.menos,`SUMIF(${faixa(sC)},"<0")`);
  const rS=linhaB("Saldo do período (min)",D.t.saldo,`${S}`);
  const rA=linhaB(`Banco de horas antes de ${brDate(refIni(ym))} (min)`,fb.ant,null);
  const rL=linhaB("Folgas compensadas e horas pagas no período (min)",fb.lanc,null);
  linhaB("Banco de horas para o próximo período (min)",fb.fim,`${rA}+${rS}+${rL}`,true);
  // notas; o alerta de saldo negativo acima do limite vai numa caixa vermelha
  fb.notas.forEach(t=>{const alerta=/negativo acima/i.test(t);
    texto(r,t,alerta?xcFonte({bold:true,color:{argb:XC.verm}}):xcFonte({size:8,italic:true,color:{argb:XC.mute}}),alerta?22:26,alerta?XC.vermClaro:null);r++});
  // declaração e assinaturas
  r++;texto(r,"Declaro que conferi os registros de ponto acima referentes ao período apurado e que estão de acordo com a jornada efetivamente cumprida.",xcFonte({size:9}),30);
  r+=2;cel("A"+r,"Caraguatatuba - SP, ____ de ______________ de ________");ws.getRow(r).height=30;
  r+=3;const meio=Math.ceil(nC/2);ws.getRow(r).height=40;
  for(let c=1;c<=nC;c++)if(c<meio-1||c>=meio)ws.getCell(r,c).border={top:{style:"thin",color:{argb:XC.ink}}};
  const rot=xcFonte({size:9,bold:true,color:{argb:XC.mute}});
  cel("A"+r,"INTEGRANTE",rot).alignment={vertical:"top"};cel(colLetter(meio)+r,"CASA HIRO",rot).alignment={vertical:"top"};
  r++;const peq=xcFonte({size:8,color:{argb:XC.mute}});
  cel("A"+r,nomeInteg(ig)+" · CPF "+(ig.cpf||"—"),peq);cel(colLetter(meio)+r,(e.razao||"")+(e.cnpj?" · CNPJ "+xcCnpj(e.cnpj):""),peq);
  // sem linhas congeladas: o Google Planilhas repete as linhas congeladas no topo de cada página impressa; o cabeçalho da tabela se repete na impressão
  xcPagina(ws,"portrait",`${hr}:${hr}`);ws.pageSetup.printArea=`A1:${LC}${r}`;
}
function buildNoturnoSheet(wb,R){
  const ws=wb.addWorksheet("Adicional noturno");xcPagina(ws,"landscape","6:6",{state:"frozen",xSplit:2,ySplit:6});
  const head=["ID","Integrante","Dias com trabalho noturno","Noturno real (h)","Prorrogação após 5h (h)","Noturno reduzido (h)","Acréscimo pela hora de 52min30s (h)"];
  xcFaixa(ws,head.length,"Casa Hiro — Adicional noturno",XC_SLOGAN);
  ws.mergeCells("A4:G4");const nt=ws.getCell("A4");
  nt.value="Hora noturna: 22h às 5h, com hora de 52min30s (CLT art. 73). Turno noturno prorroga após as 5h (Súmula 60, II, TST). Estimativa gerencial — o contador confirma o adicional de 20%.";
  nt.font=xcFonte({size:9,italic:true,color:{argb:XC.mute}});nt.alignment={vertical:"middle",wrapText:true};ws.getRow(4).height=30;
  xcCab(ws,6,head,(h,i)=>i!==1);
  ws.columns=[6,34,16,16,20,20,24].map(w=>({width:w}));
  R.users.forEach((u,ri)=>{
    const dias=u.rows.filter(r=>r.nightReal>0).length,real=u.t.nightReal||0,pr=u.rows.reduce((t,r)=>t+(r.nightPror||0),0),fic=u.t.nightFicta||0,fundo=ri%2?XC.zebra:XC.branco;
    [u.uid,u.nome,dias,real/1440,pr/1440,fic/1440,(fic-real)/1440].forEach((v,ci)=>{
      const c=ws.getCell(7+ri,ci+1);c.value=v;xcCel(c,fundo,ci===1?{bold:true}:null,ci===1?"left":"right",ci>=3?'[H]:MM;;"—"':null);
    });
    ws.getRow(7+ri).height=18;
  });
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
    if(abas.individual)R.users.forEach(u=>buildPersonSheet(wb,e,u.ig||{},u,maxP));
  }
  if(!wb.worksheets.length)throw new Error("Com essas escolhas não há nenhuma aba para gerar (jornadas e folha individual precisam do ponto calculado).");
  return wb;
}
