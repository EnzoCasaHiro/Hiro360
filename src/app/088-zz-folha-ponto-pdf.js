/* ================= FOLHA DE PONTO EM PDF (uma página por integrante, no modelo visual da Casa Hiro) =================
   Os números vêm de folhaDados (016) — a mesma fonte da aba do integrante no XLSX do contador. Nada é recalculado aqui.
   Fonte Helvetica do jsPDF: só caracteres do Windows-1252 (sem "−" tipográfico, sem ⚠ nem emoji). */
/* >>> folha pdf */
const FPDF_COR={esc:[31,92,41],med:[46,125,51],claro:[220,235,213],creme:[250,247,239],bege:[241,235,218],zebra:[252,250,245],linha:[226,218,202],
  ink:[34,48,42],mute:[107,116,105],branco:[255,255,255],verm:[179,38,30],vermClaro:[248,222,218],slogan:[232,241,228]};
const FPDF_ETQ={"Feriado":[[47,93,138],[220,231,242]],"Feriado trabalhado":[[47,93,138],[220,231,242]],"Atestado":[[91,63,140],[230,222,243]],
  "Falta":[[179,38,30],[248,222,218]],"Compensação":[[138,90,0],[246,231,198]]};
// horas com sinal em h:mm, hífen comum no negativo (o "−" não existe na Helvetica do PDF)
const fpdfHm=(min,sinal)=>{const r=Math.round(min||0),a=Math.abs(r);return(r<0?"-":sinal&&r>0?"+":"")+Math.floor(a/60)+":"+String(a%60).padStart(2,"0")};
const fpdfHora=d=>d?String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"):"";
const fpdfCnpj=c=>{const d=String(c||"").replace(/\D/g,"");return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):String(c||"")};
// nome do arquivo: folha-ponto_<nome-sem-acento>_<AAAA-MM>.pdf
const fpdfSlug=n=>String(n||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"integrante";
const fpdfNomeArq=(nome,ym)=>`folha-ponto_${fpdfSlug(nome)}_${ym}.pdf`;
// altura da linha da tabela: o que sobra na página dividido pelos dias (cabe 31 dias numa página)
const fpdfAlturaLinha=(n,espaco)=>Math.max(8,Math.min(14,espaco/Math.max(1,n)));
// tudo o que a página mostra, já em texto; os números são os mesmos da aba do XLSX
function fpdfPagina(u,R,e){
  const D=folhaDados(u,R),ig=u.ig||{},ym=refYm(R.end),fb=D.fb,maxP=Math.max(2,...D.rows.map(r=>r.pares.length));
  const alerta=fb.notas.find(t=>/negativo acima/i.test(t))||"",outras=fb.notas.filter(t=>t!==alerta);
  return{nome:nomeInteg(ig)||u.nome,cargo:[ig.cargo,ig.depto].filter(Boolean).join(" · ")||"—",cpf:ig.cpf||"—",admissao:ig.admissao?brDate(ig.admissao):"—",
    relogio:u.uid!=null?String(u.uid):"—",escala:ig.id?escalasTexto(ig,R.start,R.end):"—",ym,ref:ym.slice(5)+"/"+ym.slice(0,4),periodo:`${brDate(R.start)} a ${brDate(R.end)}`,
    empresa:(e.razao||"Casa Hiro")+(e.cnpj?" · CNPJ "+fpdfCnpj(e.cnpj):""),razao:e.razao||"Casa Hiro",cnpj:fpdfCnpj(e.cnpj),maxP,
    linhas:D.rows.map(r=>{const p=[];for(let k=0;k<maxP;k++){const iv=r.pares[k]||[];p.push(fpdfHora(iv[0]),fpdfHora(iv[1]))}
      return{data:brDate(r.day).slice(0,5),dia:r.dia==="sab"?"sáb":r.dia,fds:r.fds,pares:p,ajuste:r.ajuste?(r.ajuste>0?"+":"")+r.ajuste+" min":"·",trab:fpdfHm(r.worked),prev:fpdfHm(r.expected),saldo:fpdfHm(r.saldo,true),saldoMin:r.saldo,etq:r.etq,texto:r.texto}}),
    t:D.t,trab:fpdfHm(D.t.worked),prev:fpdfHm(D.t.expected),saldo:fpdfHm(D.t.saldo,true),saldoMin:D.t.saldo,
    ant:fpdfHm(fb.ant,true),antMin:fb.ant,lanc:fpdfHm(fb.lanc,true),fim:fpdfHm(fb.fim,true),fimMin:fb.fim,alerta,notas:outras};
}
/* <<< folha pdf */
function fpdfCabe(doc,t,w){t=String(t||"");if(doc.getTextWidth(t)<=w)return t;while(t.length>1&&doc.getTextWidth(t+"…")>w)t=t.slice(0,-1);return t.trimEnd()+"…"}
function fpdfDesenha(doc,P,lg,emitido){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=34,CW=W-2*M,C=FPDF_COR;
  const fill=c=>doc.setFillColor(c[0],c[1],c[2]),ink=c=>doc.setTextColor(c[0],c[1],c[2]),draw=c=>doc.setDrawColor(c[0],c[1],c[2]);
  const f=(estilo,tam,cor)=>{doc.setFont("helvetica",estilo);doc.setFontSize(tam);ink(cor||C.ink)};
  const txt=(t,x,y,o)=>doc.text(String(t),x,y,{baseline:"middle",...(o||{})});
  const corSaldo=m=>m>0?C.med:m<0?C.verm:C.mute;
  fill(C.creme);doc.rect(0,0,W,H,"F");
  /* cabeçalho verde */
  fill(C.esc);doc.rect(0,0,W,68,"F");
  try{doc.addImage(lg.branco,"PNG",M,9,36,50,"logoFolha","FAST")}catch(err){console.warn("logotipo fora do PDF",err)}
  f("bold",17,C.branco);txt("Folha de ponto",M+48,27);
  f("normal",8,C.slogan);txt(P.empresa,M+48,45);
  f("bold",11,C.branco);txt("Referência "+P.ref,W-M,27,{align:"right"});
  f("normal",8,C.slogan);txt("Período "+P.periodo,W-M,45,{align:"right"});
  /* cartão do integrante */
  let y=85;fill(C.branco);draw(C.linha);doc.setLineWidth(.6);doc.roundedRect(M,y,CW,68,6,6,"FD");
  fill(C.med);doc.roundedRect(M,y,5,68,2.5,2.5,"F");
  f("bold",14,C.esc);txt(fpdfCabe(doc,P.nome,CW-40),M+20,y+15);
  f("normal",8.5,C.mute);txt(fpdfCabe(doc,P.cargo,CW-40),M+20,y+29);
  [["CPF",P.cpf,0],["ADMISSÃO",P.admissao,85],["Nº NO RELÓGIO",P.relogio,170],["ESCALA",P.escala,247]].forEach(([k,v,dx],i)=>{
    f("normal",6,C.mute);txt(k,M+20+dx,y+44);f("bold",8.5,C.ink);txt(fpdfCabe(doc,v,i===3?CW-20-dx-12:78),M+20+dx,y+54)});
  /* 4 cartões de totais */
  y=164;const gap=10,cw=(CW-3*gap)/4;
  [["TRABALHADO",P.trab+" h",P.t.comPonto+" dias com registro",null],["PREVISTO",P.prev+" h",P.t.apurados+" dias na escala",null],
   ["SALDO DO PERÍODO",P.saldo+" h","trabalhado - previsto",P.saldoMin],["BANCO P/ PRÓXIMO PERÍODO",P.fim+" h","antes: "+P.ant+" h",P.fimMin]].forEach(([k,v,s,m],i)=>{
    const x=M+i*(cw+gap),tinta=m==null?null:m<0?C.vermClaro:C.claro;
    fill(tinta||C.branco);draw(tinta?tinta.map(c=>Math.max(0,c-18)):C.linha);doc.roundedRect(x,y,cw,48,6,6,"FD");
    f("bold",6.2,C.mute);txt(k,x+11,y+11);f("bold",14,m==null?C.ink:corSaldo(m));txt(v,x+11,y+26);f("normal",6.8,C.mute);txt(s,x+11,y+40)});
  /* parte de baixo, de baixo para cima, para saber quanto sobra para a tabela */
  const rodapeY=H-22,notasH=(P.notas.length?10*P.notas.length:0)+(P.alerta?22:0);
  let assinY=rodapeY-48,declY=assinY-62,boxY=declY-12-notasH-70;
  /* tabela diária */
  const tabY=227,headH=17,totH=16,n=P.linhas.length,rh=fpdfAlturaLinha(n,boxY-12-tabY-headH-totH);
  // mês com poucos dias: o bloco de baixo sobe para logo depois da tabela (o rodapé fica no fim da página)
  {const sobe=Math.max(0,boxY-(tabY+headH+n*rh+totH+14));boxY-=sobe;declY-=sobe;assinY-=sobe}
  const extra=P.maxP-2,cols=[["Data",44,"l"],["Dia",28,"l"]];
  for(let k=0;k<P.maxP;k++)cols.push(["Entrada",extra?33:38,"r"],["Saída",extra?33:38,"r"]);
  cols.push(["Ajuste",36,"c"],["Trabalhado",48,"r"],["Previsto",40,"r"],["Saldo",38,"r"]);
  const usado=cols.reduce((s,c)=>s+c[1],0);cols.push(["Situação / observação",Math.max(40,CW-usado),"l"]);
  const xs=[];{let x=M;cols.forEach(c=>{xs.push(x);x+=c[1]})}
  const cel=(i,t,yy,al)=>{const c=cols[i],x=xs[i];if(al==="r")txt(t,x+c[1]-6,yy,{align:"right"});else if(al==="c")txt(t,x+c[1]/2,yy,{align:"center"});else txt(t,x+6,yy)};
  fill(C.esc);doc.roundedRect(M,tabY,CW,headH,4,4,"F");doc.rect(M,tabY+headH-4,CW,4,"F");
  f("bold",7,C.branco);cols.forEach((c,i)=>cel(i,c[0],tabY+headH/2,c[2]==="c"?"c":c[2]));
  let ry=tabY+headH;const fs=Math.min(7.2,Math.max(6,rh*.55));
  P.linhas.forEach((l,i)=>{
    fill(l.fds?C.bege:i%2?C.zebra:C.branco);doc.rect(M,ry,CW,rh,"F");draw(C.linha);doc.setLineWidth(.4);doc.line(M,ry+rh,M+CW,ry+rh);
    const cy=ry+rh/2;
    f("bold",fs,C.ink);cel(0,l.data,cy,"l");f("normal",fs,C.mute);cel(1,l.dia,cy,"l");
    f("normal",fs,C.ink);l.pares.forEach((p,k)=>cel(2+k,p||"·",cy,"r"));
    const b=2+l.pares.length;f("normal",fs,C.mute);cel(b,l.ajuste,cy,"c");
    f("bold",fs,C.ink);cel(b+1,l.trab,cy,"r");f("normal",fs,C.mute);cel(b+2,l.prev,cy,"r");
    f("bold",fs,corSaldo(l.saldoMin));cel(b+3,l.saldo,cy,"r");
    let tx=xs[b+4]+6;const fimX=M+CW-4;
    if(l.etq){const[cor,fundo]=FPDF_ETQ[l.etq]||[C.mute,C.linha];f("bold",fs-.8,cor);const w=doc.getTextWidth(l.etq)+10,ph=Math.min(rh-2.5,10);
      fill(fundo);doc.roundedRect(tx,cy-ph/2,w,ph,ph/2,ph/2,"F");txt(l.etq,tx+5,cy);tx+=w+5}
    if(l.texto){f("normal",fs-.6,C.mute);txt(fpdfCabe(doc,l.texto,fimX-tx),tx,cy)}
    ry+=rh});
  fill(C.claro);doc.rect(M,ry,CW,totH,"F");const ty=ry+totH/2,b=2+2*P.maxP;
  f("bold",7.6,C.esc);txt("TOTAIS DO PERÍODO",M+6,ty);cel(b+1,P.trab,ty,"r");cel(b+2,P.prev,ty,"r");f("bold",7.6,corSaldo(P.saldoMin));cel(b+3,P.saldo,ty,"r");
  /* quadros Ocorrências e Banco de horas */
  const by=boxY,bh=70,wo=CW*.46,wb=CW-wo-14,xb=M+wo+14;
  fill(C.branco);draw(C.linha);doc.setLineWidth(.6);doc.roundedRect(M,by,wo,bh,6,6,"FD");doc.roundedRect(xb,by,wb,bh,6,6,"FD");
  f("bold",8.5,C.esc);txt("Ocorrências no período",M+11,by+14);txt("Banco de horas",xb+11,by+14);
  [[P.t.apurados,"Apurados"],[P.t.comPonto,"Com ponto"],[P.t.faltas,"Faltas"],[P.t.atestados,"Atestados"]].forEach(([v,k],i)=>{const x=M+11+i*(wo-22)/4;
    f("bold",14,C.ink);txt(String(v),x,by+40);f("normal",6.6,C.mute);txt(k,x,by+56)});
  const conta=[[P.ant,P.antMin,"Saldo anterior",""],[P.saldo,P.saldoMin,"Saldo do período","+"],[P.lanc,null,"Compensado / pago","+"],[P.fim,P.fimMin,"Novo saldo","="]],pw=(wb-22)/4;
  conta.forEach(([v,m,k,op],i)=>{const x=xb+11+i*pw;
    if(op){f("normal",9,C.mute);txt(op,x-6,by+40,{align:"center"})}
    f("bold",i===3?13:11,m==null?C.ink:corSaldo(m));txt(v,x+4,by+40);f("normal",6.6,C.mute);txt(k,x+4,by+56)});
  /* alerta, notas, declaração, assinaturas e rodapé */
  let ny=by+bh+12;
  if(P.alerta){fill(C.vermClaro);doc.roundedRect(M,ny-6,CW,17,4,4,"F");f("bold",8,C.verm);txt(fpdfCabe(doc,P.alerta+" Combine a compensação com o integrante.",CW-16),M+8,ny+2.5);ny+=22}
  P.notas.forEach(t=>{f("italic",6.6,C.mute);txt(fpdfCabe(doc,t,CW),M,ny);ny+=10});
  f("normal",8.5,C.ink);txt("Declaro que conferi os registros acima e que estão de acordo com a jornada efetivamente cumprida.",M,declY+8);
  txt("Caraguatatuba - SP, ____ de ______________ de ________",M,declY+24);
  const sw=(CW-40)/2;draw(C.ink);doc.setLineWidth(.6);doc.line(M,assinY,M+sw,assinY);doc.line(M+sw+40,assinY,M+CW,assinY);
  f("bold",7.6,C.ink);txt(fpdfCabe(doc,P.nome,sw),M,assinY+10);txt("Casa Hiro",M+sw+40,assinY+10);
  f("normal",6.6,C.mute);txt("CPF "+P.cpf,M,assinY+20);txt(fpdfCabe(doc,P.empresa,sw),M+sw+40,assinY+20);
  draw(C.linha);doc.setLineWidth(.5);doc.line(M,rodapeY-8,M+CW,rodapeY-8);
  f("normal",6.6,C.mute);txt("Casa Hiro · Caraguatatuba — Litoral Norte de SP · casahiro.com.br",M,rodapeY);
  txt(fpdfCabe(doc,"Emitido em "+emitido+" · "+P.nome,CW/2),M+CW,rodapeY,{align:"right"});
}
// um PDF com uma página por integrante (lista de {u}); integrantes sem marcação ficam de fora
async function folhaPdfGerar(users,R){
  if(typeof window.jspdf==="undefined"||!window.jspdf.jsPDF)throw new Error("A biblioteca de PDF não carregou. Recarregue a página e tente de novo.");
  const lg=await logosMarca(),{jsPDF}=window.jspdf,doc=new jsPDF({orientation:"portrait",unit:"pt",format:"a4",compress:true}),e=empresa();
  const agora=new Date(),emitido=agora.toLocaleDateString("pt-BR")+" "+agora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  users.forEach((u,i)=>{if(i)doc.addPage();fpdfDesenha(doc,fpdfPagina(u,R,e),lg,emitido)});
  return new Blob([doc.output("arraybuffer")],{type:"application/pdf"});
}
// botão "Baixar folha (PDF)" no cartão do integrante (aba Ponto)
async function folhaPdfBaixar(uid){
  const R=POINT.result,u=R&&R.users.find(x=>String(x.uid)===String(uid));
  if(!u)return toast("Calcule o ponto primeiro.",true);
  if(!folhaTemMarcacao(u))return toast("Sem marcações de ponto neste período.",true);
  try{
    const nome=nomeInteg(u.ig||{})||u.nome;
    const ok=await saveFile(fpdfNomeArq(nome,refYm(R.end)),await folhaPdfGerar([u],R));
    if(ok&&typeof audit==="function")audit("relatorio","Folha de ponto (PDF): "+nome);
  }catch(err){console.error(err);toast("Não foi possível gerar a folha: "+(err&&err.message?err.message:err),true)}
}
document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest("[data-fpdf]");if(b&&!b.disabled)folhaPdfBaixar(b.dataset.fpdf)});
