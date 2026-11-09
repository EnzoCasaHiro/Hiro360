/* ================= AUDITORIA: conformidade da escala, troca de plantão, NF-e XML, conciliação e relatórios ================= */
function conflitosEscala(de,ate){
  const out=[],cfg=escCfg();let shifts;
  try{shifts=buildShifts()}catch(e){return[{nivel:3,dia:de,txt:"Há turno com horário inválido: "+e.message}]}
  const gente=integList().filter(i=>!semPonto(i)&&i.turno&&(i.situacao||"Ativo")!=="Desligado");
  const dias=[];for(let d=addDaysIso(de,-7);d<=addDaysIso(ate,1);d=addDaysIso(d,1))dias.push(d);
  const plan={};
  gente.forEach(p=>{plan[p.id]={};dias.forEach(d=>{const e=escalaDia(p,d);if(e.on&&e.turno&&shifts.get(e.turno))plan[p.id][d]=expectedPeriods(d,shifts.get(e.turno))})});
  gente.forEach(p=>{
    let seq=0,avisou=false;
    dias.forEach(d=>{
      const per=plan[p.id][d];
      if(!per){seq=0;avisou=false;return}
      seq++;
      if(seq>=7&&!avisou&&d>=de&&d<=ate){avisou=true;out.push({nivel:2,ig:p,dia:d,txt:`${nomeInteg(p)}: ${seq} dias seguidos de trabalho até ${brDate(d)} — falta um dia de descanso na semana`})}
      const prox=plan[p.id][addDaysIso(d,1)];
      if(prox&&d>=de&&d<=ate){const h=(prox[0][0]-per[per.length-1][1])/3600000;if(h<11)out.push({nivel:3,ig:p,dia:d,txt:`${nomeInteg(p)}: só ${h.toFixed(1).replace(".",",")}h entre a jornada de ${brDate(d)} e a de ${brDate(addDaysIso(d,1))} (mínimo de 11h)`})}
      if(d>=de&&d<=ate&&!eh1236(p)){const m=per.reduce((s,[a,b])=>s+minutesBetween(a,b),0);if(m>600)out.push({nivel:2,ig:p,dia:d,txt:`${nomeInteg(p)}: jornada planejada de ${fmtHHMM(m)} em ${brDate(d)} (acima de 10h)`})}
    });
  });
  // cobertura: só para cargos de plantão (com alguém em 12x36) e com mais de uma pessoa
  const porCargo={};gente.forEach(p=>(porCargo[cargoDe(p)]=porCargo[cargoDe(p)]||[]).push(p));
  Object.entries(porCargo).forEach(([cargo,ps])=>{
    if(ps.length<2||!ps.some(eh1236))return;
    for(let d=de;d<=ate;d=addDaysIso(d,1)){
      const n=ps.filter(p=>plan[p.id][d]).length;
      if(n===0)out.push({nivel:3,dia:d,txt:`Nenhum(a) ${cargo} escalado(a) em ${brDate(d)}`});
      else if(n<cfg.minCob)out.push({nivel:2,dia:d,txt:`${cargo}: só ${n} escalado(a) em ${brDate(d)} (mínimo ${cfg.minCob})`});
    }
  });
  // RDC 502/2021: cuidadores por grau de dependência dos residentes (grau I 1/20 em 8h; grau II 1/10; grau III 1/6 por turno)
  try{
    const ex=rdcExigido();
    if(ex.total>0&&(ex.dia>0||ex.noite>0)){
      const re=new RegExp(cfg.cargoCuid||"cuidador","i"),cu=gente.filter(p=>re.test(cargoDe(p)));
      const graus=`grau I: ${ex.n1}, II: ${ex.n2}, III: ${ex.n3}`;
      if(!cu.length)out.push({nivel:3,dia:de,txt:`RDC 502/2021: há ${ex.total} residente(s) e nenhum integrante com cargo "${cfg.cargoCuid||"cuidador"}" na escala (mínimo ${ex.dia} de dia${ex.noite?` e ${ex.noite} à noite`:""})`});
      else for(let d=de;d<=ate;d=addDaysIso(d,1)){
        let dia=0,noite=0;
        cu.forEach(p=>{const per=plan[p.id][d];if(!per)return;const h0=per[0][0].getHours();(h0>=5&&h0<17)?dia++:noite++});
        if(dia<ex.dia)out.push({nivel:3,dia:d,txt:`RDC 502/2021: ${dia} cuidador(es) de dia em ${brDate(d)}; mínimo ${ex.dia} para ${ex.total} residente(s) (${graus})`});
        if(ex.noite>0&&noite<ex.noite)out.push({nivel:3,dia:d,txt:`RDC 502/2021: ${noite} cuidador(es) à noite em ${brDate(d)}; mínimo ${ex.noite} (${graus})`});
      }
    }
  }catch(e){console.error(e)}
  return out.sort((a,b)=>b.nivel-a.nivel||a.dia.localeCompare(b.dia));
}
function pgAlertasEscala(){
  const de=ESCUI.start,ate=ESCUI.end;if(!de||!ate||de>ate||daysBetweenIso(de,ate)>92)return "";
  let l=[];try{l=conflitosEscala(de,ate)}catch(e){console.error(e)}
  return `<div class="card"><h2>Alertas de escala e conformidade</h2>
   <p class="sub" style="margin:0 0 10px">Confere o período da grade: 11h de intervalo entre jornadas, 7 dias seguidos sem folga, jornada planejada acima de 10h (12x36 não entra) cargos de plantão sem ninguém escalado e a cobertura mínima de cuidadores por grau de dependência (RDC 502/2021).</p>
   <div class="row" style="margin-bottom:10px"><button class="b sec" id="trocabtn" style="flex:none">${ic("cal")} Registrar troca de plantão</button></div>
   ${l.length?l.slice(0,60).map(x=>`<div class="doc ${x.nivel===3?"urg":"atn"}"><div class="grow"><div class="nm">${esc(x.txt)}</div></div>${x.ig?`<button class="b sec sm" data-escd="${x.ig.id}|${x.dia}">Ajustar</button>`:""}</div>`).join("")+(l.length>60?`<p class="sub">+${l.length-60} alertas. Reduza o período para ver todos.</p>`:""):`<div class="callout">Nenhum conflito encontrado neste período.</div>`}</div>`;
}
function bindAlertas(){const b=$("trocabtn");if(b)b.onclick=openTroca}
function openTroca(){
  const gente=integList().filter(i=>!semPonto(i)&&i.turno&&(i.situacao||"Ativo")!=="Desligado");
  if(gente.length<2)return toast("Cadastre ao menos duas pessoas com turno para registrar uma troca.",true);
  const opt=sel=>gente.map(i=>`<option value="${i.id}" ${i.id===sel?"selected":""}>${esc(nomeInteg(i))} · ${esc(cargoDe(i))}</option>`).join("");
  const ov=openModal(`<h3>Troca de plantão</h3><div class="sub" style="margin-bottom:10px">Uma pessoa cobre o dia da outra. O turno de cada dia não muda — só quem trabalha.</div>
   <div class="row"><div><label>Quem vai folgar</label><select id="tra">${opt(gente[0].id)}</select></div><div><label>No dia</label><input type="date" id="trd1" value="${hojeIso()}"></div></div>
   <div class="row"><div><label>Quem vai cobrir</label><select id="trb">${opt(gente[1].id)}</select></div><div><label>E devolve no dia (opcional)</label><input type="date" id="trd2"></div></div>
   <div class="err" id="trerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="trcx">Cancelar</button><button class="b" id="trsv">Registrar troca</button></div>`);
  const g=s=>ov.querySelector(s),er=m=>g("#trerr").textContent=m;
  g("#trcx").onclick=()=>ov.remove();
  g("#trsv").onclick=()=>{
    const A=S.integrantes[g("#tra").value],B=S.integrantes[g("#trb").value],d1=g("#trd1").value,d2=g("#trd2").value;
    if(!A||!B||A.id===B.id)return er("Escolha duas pessoas diferentes.");if(!d1)return er("Informe o dia da troca.");
    const a1=escalaDia(A,d1),b1=escalaDia(B,d1);
    if(!a1.on)return er(`${nomeInteg(A)} não está escalado(a) em ${brDate(d1)}.`);
    if(b1.on)return er(`${nomeInteg(B)} já trabalha em ${brDate(d1)} — não precisa cobrir.`);
    const em=new Date().toISOString(),novos=[
      {id:uid8(),uid:A.id,tipo:"folga",de:d1,ate:d1,turno:null,obs:"Troca de plantão com "+nomeInteg(B),em},
      {id:uid8(),uid:B.id,tipo:"trabalho",de:d1,ate:d1,turno:a1.turno,obs:"Troca de plantão com "+nomeInteg(A),em}];
    if(d2){
      const a2=escalaDia(A,d2),b2=escalaDia(B,d2);
      if(!b2.on)return er(`${nomeInteg(B)} não está escalado(a) em ${brDate(d2)} para devolver.`);
      if(a2.on)return er(`${nomeInteg(A)} já trabalha em ${brDate(d2)}.`);
      novos.push({id:uid8(),uid:B.id,tipo:"folga",de:d2,ate:d2,turno:null,obs:"Troca de plantão com "+nomeInteg(A),em},
        {id:uid8(),uid:A.id,tipo:"trabalho",de:d2,ate:d2,turno:b2.turno,obs:"Troca de plantão com "+nomeInteg(B),em});
    }
    escMutate(l=>[...l,...novos]);ov.remove();toast("Troca registrada.");afterOc();
  };
}

/* ---------- notas fiscais: XML da NF-e e limite de armazenamento ---------- */
function nfSave(rows,fileName,fmt){
  const doc={fileName,rows,...(fmt?{fmt}:((S.config.nf&&S.config.nf.fmt)?{fmt:S.config.nf.fmt}:{}))};
  if(JSON.stringify(doc).length>240000){toast("A base de notas fiscais chegou ao limite de armazenamento. Arquive as notas mais antigas antes de importar mais.",true);return false}
  put("config","nf",doc);NFUI.years=null;return true;
}
function nfParseXml(txt){
  const doc=new DOMParser().parseFromString(txt,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw new Error("XML inválido");
  const inf=doc.getElementsByTagName("infNFe")[0];if(!inf)throw new Error("não parece uma NF-e (sem <infNFe>)");
  const t=(el,tag)=>{const n=el&&el.getElementsByTagName(tag)[0];return n?n.textContent.trim():""};
  const ide=inf.getElementsByTagName("ide")[0],emit=inf.getElementsByTagName("emit")[0];
  const nota=t(ide,"nNF"),date=(t(ide,"dhEmi")||t(ide,"dEmi")).slice(0,10),forn=t(emit,"xNome"),cnpj=t(emit,"CNPJ")||t(emit,"CPF"),chave=(inf.getAttribute("Id")||"").replace(/^NFe/,"");
  const rows=[...inf.getElementsByTagName("det")].map(det=>{
    const p=det.getElementsByTagName("prod")[0],q=+t(p,"qCom")||0,vu=+t(p,"vUnCom")||0,vd=+t(p,"vDesc")||0,vp=+t(p,"vProd")||q*vu;
    const ras=det.getElementsByTagName("rastro")[0],ncm=t(p,"NCM"),un=t(p,"uCom"),lote=ras?t(ras,"nLote"):"",val=ras?t(ras,"dVal").slice(0,10):"";
    return{date,nota,item:t(p,"xProd"),local:forn,valor:vu,qtd:q,desconto:vd,total:+(vp-vd).toFixed(2),chave,...(ncm?{ncm}:{}),...(un?{un}:{}),...(lote?{lote}:{}),...(val?{validade:val}:{})};
  });
  const dups=[...inf.getElementsByTagName("dup")].map(d=>({n:t(d,"nDup"),venc:t(d,"dVenc"),valor:+t(d,"vDup")||0}));
  const vNF=+t(inf.getElementsByTagName("ICMSTot")[0],"vNF")||rows.reduce((s,r)=>s+r.total,0);
  if(!rows.length)throw new Error("NF-e sem itens");
  return{nota,date,forn,cnpj,chave,rows,dups,vNF};
}
// primeira coisa da página: dar entrada numa nota (arquivo, foto ou arrastar)
function nfEntradaCard(){
  return `<div class="card"><h2>Dar entrada em nota fiscal</h2>
   <p class="sub" style="margin:0 0 10px">1. Envie a nota: o <b>XML</b> é o mais preciso; também serve <b>PDF</b> ou <b>foto</b>. Ou baixe a <b>planilha</b>, preencha as linhas em branco e envie o arquivo. 2. Confira os itens que o sistema leu. 3. Confirme: ele lança itens, estoque e contas a pagar.</p>
   <div class="drop" id="nfxmldrop">${ic("up")}<div><b>Clique aqui ou arraste a nota</b> (XML, PDF, foto ou planilha). Pode mandar várias notas de uma vez.</div></div>
   <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
    <button class="b" id="nfxmlbtn" style="flex:none">${ic("file")} Escolher arquivo da nota</button>
    <button class="b sec" id="nfcambtn" style="flex:none">${ic("camera")} Tirar foto da nota</button>
    <button class="b sec" id="nfnovabtn" style="flex:none">${ic("plus")} Nova nota (digitar)</button>
    <button class="b sec" id="nfplanbtn" style="flex:none">${ic("sheet")} Baixar planilha para preencher</button>
    <button class="b sec" id="nfestbtn" style="flex:none">${ic("box")} Dar entrada no estoque</button></div>
   <input type="file" id="nfxmlfile" accept="${NF_ACCEPT}" multiple hidden><input type="file" id="nfcamfile" accept="image/*" capture="environment" hidden></div>`;
}
// nota sem arquivo: abre a mesma conferência das notas lidas, em branco, para digitar
function nfNovaManual(){
  const vazio=()=>({item:"",qtd:1,valor:"",total:""});
  nfImportar([],{interno:true,prontas:[{nota:"",date:hojeIso(),forn:"",cnpj:"",chave:"",rows:[vazio(),vazio(),vazio()],dups:[],vNF:"",fonte:"manual",tipo:"produto",av:[],_ord:0}]});
}
function bindNFXml(){
  const eb=$("nfestbtn");if(eb)eb.onclick=openEstDeNF;
  const b=$("nfxmlbtn"),f=$("nfxmlfile");if(!b||!f)return;
  const vai=fl=>{const l=[...fl],xl=l.filter(f=>/\.xlsx?$/i.test(f.name));if(xl.length){if(l.length>1)return toast("Envie a planilha sozinha, um arquivo de cada vez.",true);return nfImportarPlanilha(xl[0])}const js=l.filter(f=>/\.json$/i.test(f.name));if(js.length)return nfImportarJson(js,l.filter(f=>!js.includes(f)));if(l.length)nfImportar(l)};
  b.onclick=()=>f.click();f.onchange=()=>{const l=[...f.files];f.value="";vai(l)};
  const nb=$("nfnovabtn");if(nb)nb.onclick=nfNovaManual;
  const pb=$("nfplanbtn");if(pb)pb.onclick=nfExportaPlanilha;
  const cb=$("nfcambtn"),cf=$("nfcamfile");if(cb&&cf){cb.onclick=()=>cf.click();cf.onchange=()=>{const l=[...cf.files];cf.value="";vai(l)}}
  const d=$("nfxmldrop");if(d){d.onclick=()=>f.click();d.ondragover=e=>{e.preventDefault();d.classList.add("on")};d.ondragleave=()=>d.classList.remove("on");
    d.ondrop=e=>{e.preventDefault();d.classList.remove("on");vai(e.dataTransfer.files)}}
}
// categoria contábil e centro de custo pela NCM e pela descrição; o que não for reconhecido fica "A classificar"
const NF_REGRAS=[
 [r=>/^(3005|3006|4015|9018|9019|9021|9619)/.test(r.ncm||"")||/\b(luva|seringa|agulha|gaze|atadura|m[aá]scara|esparadrapo|curativo|fralda|sonda|cateter|term[oô]metro|glicos[ií]metro|len[cç]ol descart|absorvente geri|compressa)/i.test(r.item),"Material de enfermagem","Material médico-hospitalar","Enfermagem"],
 [r=>/^30/.test(r.ncm||"")||/\b(dipirona|paracetamol|losartana|omeprazol|insulina|soro|comprimid|xarope|pomada|amp[oô]la|vitamina|medicament|antibi|[aá]lcool 70|clorexidina)/i.test(r.item),"Medicamentos","Medicamentos e insumos de saúde","Enfermagem"],
 [r=>/^(0[1-9]|1\d|2[0-4])/.test(r.ncm||"")||/\b(arroz|feij[aã]o|carne|frango|leite|p[aã]o|fruta|verdura|legume|[oó]leo|a[cç][uú]car|caf[eé]|ovo|macarr[aã]o|farinha|queijo|iogurte|suco|biscoito|peixe|batata|tomate|cebola)/i.test(r.item),"Alimentação","Gêneros alimentícios","Cozinha"],
 [r=>/^(3401|3402|3808|3405|4818|6307|3924|9603)/.test(r.ncm||"")||/\b(detergente|desinfetante|sab[aã]o|[aá]gua sanit|cloro|esponja|vassoura|rodo|saco de lixo|papel higi|multiuso|limpa|pano de|flanela|amaciante)/i.test(r.item),"Limpeza e higiene","Produtos de limpeza","Aux de Limpeza"],
 [r=>/^(4802|4820|9608|8443)/.test(r.ncm||"")||/\b(sulfite|caneta|toner|cartucho|envelope|pasta|grampe|etiqueta|papel a4)/i.test(r.item),"Material de escritório","Escritório","Administrativo"],
 [r=>/^(8536|8539|3917|7318|3208|3209)/.test(r.ncm||"")||/\b(l[aâ]mpada|tinta|parafuso|torneira|fita isolante|cimento|tomada|disjuntor|cano|registro)/i.test(r.item),"Manutenção e reparos","Materiais de manutenção","Manutenção"]];
function nfClassificaBase(r){const g=NF_REGRAS.find(x=>x[0](r));return g?{cat:g[1],sub:g[2],cc:g[3]}:null}
function nfClassifica(r){const c=nfClassificaX(r);return c?{cat:c.cat,sub:c.sub,cc:c.cc}:null}
const nfFisico=r=>!(r.ncm&&/^0+$/.test(r.ncm));
const nfFornId=n=>n.cnpj?String(n.cnpj).replace(/\D/g,""):"n:"+estNorm(n.forn);
const nfUnEst=u=>{const x=String(u||"").trim().toLowerCase();return!x||/^(un|und|unid|unidade|pc|pç|pca)$/.test(x)?"un.":x.slice(0,6)};
/* ---------- leitor de notas fiscais: XML, PDF e foto ----------
   XML da NF-e: leitura exata, no próprio navegador.
   PDF (DANFE) e foto: o Claude lê o documento (capacidade "sample"); o resultado passa por conferências
   (dígito verificador da chave, CNPJ, número, mês, somas) e por uma tela de conferência antes de lançar.
   O arquivo original fica guardado (armazenamento de arquivos do painel ou, se não houver, no banco). */
const NF_ACCEPT=".xml,.pdf,.png,.jpg,.jpeg,.webp,.json,.xlsx,.xls,image/*";
const PDFJS_URL="/vendor/pdfjs-3.11.174/pdf.min.js",PDFJS_WORKER="/vendor/pdfjs-3.11.174/pdf.worker.min.js";
let _pdfjs=null;
function pdfjsCarrega(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  return _pdfjs||(_pdfjs=new Promise((ok,no)=>{
    const s=document.createElement("script");s.src=PDFJS_URL;
    s.onload=()=>{try{const L=window.pdfjsLib;L.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
      // PDF malicioso não executa código (falha conhecida desta versão do leitor: CVE-2024-4367)
      const gd=L.getDocument.bind(L);L.getDocument=o=>gd({...(o&&o.data?o:{data:o}),isEvalSupported:false,enableXfa:false})}catch(e){}ok(window.pdfjsLib)};
    s.onerror=()=>{_pdfjs=null;no(new Error("Não consegui carregar o leitor de PDF. Envie uma foto da nota ou o XML."))};
    document.head.appendChild(s);
  }));
}
const nfTipoArq=f=>{const n=(f.name||"").toLowerCase();return/\.xml$/.test(n)||/xml/.test(f.type)?"xml":/\.pdf$/.test(n)||f.type==="application/pdf"?"pdf":/^image\//.test(f.type)||/\.(png|jpe?g|webp)$/.test(n)?"img":""};
const blobDe=(cv,tipo,q)=>new Promise(r=>cv.toBlob(r,tipo,q));
async function nfImgPrep(file,maxLado,q){
  const bmp=await createImageBitmap(file),k=Math.min(1,maxLado/Math.max(bmp.width,bmp.height)),cv=document.createElement("canvas");
  cv.width=Math.round(bmp.width*k);cv.height=Math.round(bmp.height*k);cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
  return blobDe(cv,"image/jpeg",q);
}
async function nfPdfLer(file,soTexto){
  const lib=await pdfjsCarrega(),pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  let texto="";const imgs=[];
  for(let p=1;p<=Math.min(pdf.numPages,3);p++){
    const pg=await pdf.getPage(p),tc=await pg.getTextContent();
    texto+=tc.items.map(i=>i.str).join(" ")+"\n";
    if(!soTexto&&imgs.length<2){const vp=pg.getViewport({scale:1.6}),cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
      await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;imgs.push(await blobDe(cv,"image/jpeg",.85))}
  }
  return{texto:texto.replace(/[ \t]+/g," ").trim().slice(0,30000),imgs};
}
const NF_PROMPT=`Você lê notas fiscais brasileiras (DANFE de NF-e, NFC-e, cupom fiscal ou nota fiscal de serviço) e devolve os dados em JSON.
Regras: copie exatamente o que está impresso; NÃO invente nada. Campo ilegível ou ausente = null. Datas em AAAA-MM-DD. Valores como número com ponto decimal (1234.56). CNPJ, CPF e chave de acesso só com dígitos. "valor" é o valor unitário. Se for nota de serviço sem itens, use um único item com a descrição do serviço.
Responda APENAS com um objeto JSON neste formato:
{"tipo":"produto ou servico","nota":"número da nota","date":"AAAA-MM-DD","forn":"razão social do emitente","cnpj":"dígitos","chave":"44 dígitos ou null","vNF":0,"itens":[{"item":"descrição","qtd":0,"un":"UN","valor":0,"desconto":0,"total":0,"ncm":"8 dígitos ou null","lote":null,"validade":null}],"dups":[{"n":"001","venc":"AAAA-MM-DD","valor":0}],"obs":"ressalvas de legibilidade, se houver"}`;
function nfDeJson(j){
  if(!j||typeof j!=="object"||!Array.isArray(j.itens)||!j.itens.length)throw new Error("nota sem itens");
  const num=v=>{const x=+String(v??"").replace(",",".");return isFinite(x)?x:0};
  const forn=String(j.forn||"").trim(),nota=String(j.nota??"").trim(),date=nfData(j.date);
  const comp=!!(j.comprovante||j.semNfe),info=j.info?String(j.info):"";
  const rows=j.itens.map(it=>({date,nota,item:String(it.item||"").trim(),local:forn,valor:num(it.valor),qtd:num(it.qtd)||1,desconto:num(it.desconto),total:num(it.total),chave:"",
    ...(it.categoria?{_sug:{cat:String(it.categoria),sub:String(it.subcategoria||"")}}:{}),...(info?{obs:info}:{}),
    ...(it.ncm?{ncm:so(it.ncm)}:{}),...(it.un?{un:String(it.un)}:{}),...(it.lote?{lote:String(it.lote)}:{}),...(nfData(it.validade)?{validade:nfData(it.validade)}:{})}));
  const res={nota,date,forn,cnpj:so(j.cnpj),chave:so(j.chave),tipo:j.tipo==="servico"?"servico":"produto",rows,vNF:num(j.vNF),
    dups:(j.dups||[]).map((d,i)=>({n:String(d.n||i+1),venc:nfData(d.venc)||"",valor:num(d.valor)})),obsIA:j.obs?String(j.obs):"",fonte:comp?"comprovante":"leitura"};
  return res;
}
// notas lidas fora do sistema (ex.: pelo Claude Code) num arquivo .json; os PDFs/fotos escolhidos junto são anexados pelo nome
async function nfImportarJson(js,outros){
  if(!podeEd("nf"))return toast("Seu perfil não permite lançar notas fiscais.",true);
  const porNome=new Map(outros.map(f=>[f.name.toLowerCase(),f])),prontas=[],erros=[];let o=0;
  for(const f of js){
    let L;try{L=JSON.parse(await f.text())}catch(e){erros.push(f.name+": arquivo inválido");continue}
    for(const j of(Array.isArray(L)?L:(L&&L.notas)||[L])){
      try{const n=nfDeJson(j),a=j.arquivo&&porNome.get(String(j.arquivo).toLowerCase());
        if(a){n.arq=a;n.arqTipo=nfTipoArq(a);porNome.delete(a.name.toLowerCase())}
        n._ord=o++;n.av=nfCorrige(n).concat(typeof nfAvisosExtra==="function"?nfAvisosExtra(n):[]);prontas.push(n)}
      catch(e){erros.push((j&&j.arquivo||"nota "+(o+1))+": "+e.message)}
    }
  }
  if(erros.length)toast(erros.length+" nota(s) com erro: "+erros.slice(0,3).join(" | "),true);
  if(prontas.length)await nfLancaProntas(prontas);
}
async function nfLancaProntas(prontas){
  if(prontas.length<30)return nfImportar([],{interno:true,prontas});
  // muitas notas: lança direto as sem divergência e junta o resto para conferir no fim
  const res={lancadas:0,erros:[],parou:false},rev=[];
  for(let i=0;i<prontas.length&&!res.parou;i+=100)await nfImportar([],{interno:true,auto:true,rev,res,prontas:prontas.slice(i,i+100)});
  toast(`${res.lancadas} nota(s) lançada(s) direto${rev.length?`; ${rev.length} para você conferir`:""}.`);
  go("nf",true);
  if(rev.length)await nfImportar([],{interno:true,prontas:rev});
}
// planilha gerada pelo sistema: só as linhas de notas novas viram lançamento; as notas que já existem nunca são alteradas
async function nfImportarPlanilha(file){
  if(!podeEd("nf"))return toast("Seu perfil não permite lançar notas fiscais.",true);
  if(typeof XLSX==="undefined")return toast("Biblioteca de planilha não carregou. Recarregue a página.",true);
  let linhas;
  try{linhas=nfParseWorkbook(XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:"array",cellDates:true}))}
  catch(e){console.error(e);return toast("Não foi possível ler essa planilha: "+e.message,true)}
  if(!linhas.length)return toast("Não encontrei linhas de item. Use a planilha baixada aqui do sistema.",true);
  const limpaCat=v=>/^(sem categoria|sem subcategoria)$/i.test(String(v||"").trim())?"":String(v||"").trim();
  const din=v=>(+v||0).toFixed(2),base=r=>[r.date||"",NFN(r.item),NFN(r.local),din(r.total)].join("|");
  const igual=(f,e)=>NFN(f.item)===NFN(e.item)&&din(f.total)===din(e.total)&&(!f.local||NFN(f.local)===NFN(e.local))&&(!f.date||f.date===e.date)
    &&(!f.qtd||din(f.qtd)===din(e.qtd))&&(!f.valor||din(f.valor)===din(e.valor))&&(!f.desconto||din(f.desconto)===din(e.desconto))
    &&(!limpaCat(f.categoria)||limpaCat(f.categoria)===limpaCat(e.categoria))&&(!limpaCat(f.subcategoria)||limpaCat(f.subcategoria)===limpaCat(e.subcategoria));
  const mesmaNota=(arq,atuais)=>{if(arq.length!==atuais.length)return false;const resto=[...atuais];return arq.every(f=>{const i=resto.findIndex(e=>igual(f,e));if(i<0)return false;resto.splice(i,1);return true})};
  const existentes=(S.config.nf&&S.config.nf.rows)||[],porNum=new Map(),semNum=new Map();
  existentes.forEach(r=>{
    const k=r.nota==null?"":String(r.nota).trim();
    if(k){if(!porNum.has(k))porNum.set(k,[]);porNum.get(k).push(r)}
    semNum.set(base(r),(semNum.get(base(r))||0)+1);
  });
  const grupos=new Map();let semData=0;
  linhas.forEach(r=>{const k=r.nota?"#"+r.nota:"s|"+NFN(r.local)+"|"+(r.date||"");if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(r)});
  const prontas=[],alteradas=[];let iguais=0,o=0;
  for(const[k,g0]of grupos){
    let g=g0;
    if(k[0]==="#"){
      const atuais=porNum.get(k.slice(1));
      if(atuais){
        if(mesmaNota(g,atuais))iguais++;else alteradas.push(k.slice(1));
        continue;
      }
    }else{
      g=g.filter(r=>{const b=base(r),c=semNum.get(b)||0;if(c){semNum.set(b,c-1);return false}return true});
      if(!g.length){iguais++;continue}
    }
    const forn=(g.find(r=>r.local)||{}).local||"",date=(g.find(r=>r.date)||{}).date||"",aviso=[];
    if(new Set(g.map(r=>NFN(r.local)).filter(Boolean)).size>1)aviso.push("Esta nota tem fornecedores diferentes nas linhas. Confira se o Nº está certo.");
    if(new Set(g.map(r=>r.date).filter(Boolean)).size>1)aviso.push("Esta nota tem datas diferentes nas linhas. Confira a emissão.");
    const n={nota:"",_seq:k[0]==="#"?k.slice(1):"",_k:k,date,forn,cnpj:"",chave:"",tipo:"produto",vNF:0,dups:[],obsIA:"",fonte:"planilha",_ord:o++,
      rows:g.map(r=>{
        const cat=limpaCat(r.categoria),sub=limpaCat(r.subcategoria),qtd=r.qtd||1,sugSub=cat&&!sub?(()=>{const c=nfClassifica({item:r.item});return c&&c.cat===cat?c.sub:""})():sub;
        return{date,nota:"",item:r.item,local:forn,valor:r.valor||0,qtd,desconto:r.desconto||0,total:r.total||0,chave:"",...(cat?{_sug:{cat,sub:sugSub}}:{}),...(r.ex?{ex:r.ex}:{})};
      })};
    n.av=aviso.concat(nfCorrige(n),typeof nfAvisosExtra==="function"?nfAvisosExtra(n):[]);
    prontas.push(n);
  }
  if(alteradas.length)toast(`${alteradas.length} nota(s) já lançada(s) estão diferentes na planilha (Nº ${alteradas.slice(0,5).join(", ")}${alteradas.length>5?"…":""}) e não foram alteradas. Para corrigir, use Editar em Notas lançadas.`,true);
  if(!prontas.length)return alteradas.length?undefined:toast(`Nenhuma nota nova na planilha. ${iguais} nota(s) já estão no sistema.`);
  if(iguais)toast(`${iguais} nota(s) da planilha já estão no sistema e foram ignoradas.`);
  await nfLancaProntas(prontas);
}
async function nfLerIA(file,tipo,forca){
  if(!RT.sample)throw new Error("A leitura de PDF e foto por IA não está ativada neste servidor. Use o XML da nota.");
  let texto="",imgs=[];
  let soTexto=false;
  if(tipo==="pdf"){const r=await nfPdfLer(file,!forca);texto=r.texto;imgs=r.imgs;soTexto=!forca&&texto.length>=300;if(!soTexto&&!imgs.length){const r2=await nfPdfLer(file,false);imgs=r2.imgs}}
  else imgs=[await nfImgPrep(file,2200,.88)];
  const lim=await RT.sample.limits().catch(()=>null);
  if(!(lim&&lim.images)&&!texto)throw new Error("Neste acesso o Claude não recebe imagens. Use o PDF original (com texto) ou o XML.");
  const entrada=NF_PROMPT+(texto?`\n\nTEXTO EXTRAÍDO DO PDF (pode estar fora de ordem):\n${texto}`:"\n\nA nota está na imagem anexa.");
  let j;
  try{j=await RT.sample.json(entrada,{images:(lim&&lim.images&&imgs.length)?imgs:undefined,modelTier:"default"})}
  catch(e){
    const m={not_granted:"Você não autorizou o uso do Claude para ler a nota.",rate_limited:"Muitas leituras seguidas. Aguarde um minuto.",images_unavailable:"Neste acesso o Claude não recebe imagens.",image_rejected:"A imagem não foi aceita (muito grande ou ilegível)."}[e&&e.code];
    throw new Error(m||"O Claude não conseguiu ler esta nota ("+((e&&e.message)||(e&&e.code)||"erro")+").");
  }
  if(!j||typeof j!=="object"||!Array.isArray(j.itens)||!j.itens.length)throw new Error("Não encontrei itens nessa nota. Tente uma foto mais nítida ou o XML.");
  const res=nfDeJson(j);
  if(soTexto){let av=[1];try{av=nfCorrige(JSON.parse(JSON.stringify(res)))}catch(e){}if(av.length)return nfLerIA(file,tipo,true)}
  return res;
}
const so=v=>String(v??"").replace(/\D/g,"");
function nfData(v){
  const s=String(v||"").trim();if(!s)return"";
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return"";
}
const fmtCnpj=d=>d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):d.length===11?d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4"):d;
function chaveOk(c){
  if(!/^\d{44}$/.test(c))return false;
  let s=0,p=2;for(let i=42;i>=0;i--){s+=+c[i]*p;p=p===9?2:p+1}
  const r=s%11;return(r<2?0:11-r)===+c[43];
}
/* confere e corrige a nota lida; devolve a lista de avisos (o que foi ajustado e o que precisa de olho humano) */
function nfCorrige(n){
  const av=[];
  n.nota=String(n.nota??"").trim();n.forn=(n.forn||"").replace(/\s+/g," ").trim();n.chave=so(n.chave);n.cnpj=so(n.cnpj);
  if(n.chave){
    if(!chaveOk(n.chave))av.push("A chave de acesso não passa na conferência (dígito verificador). Confira os 44 números.");
    else{
      const cn=n.chave.slice(6,20),num=String(+n.chave.slice(25,34)),aamm=n.chave.slice(2,6);
      if(n.cnpj!==cn){if(n.cnpj)av.push(`CNPJ corrigido pela chave de acesso: ${fmtCnpj(n.cnpj)} → ${fmtCnpj(cn)}.`);n.cnpj=cn}
      if(n.nota&&String(+n.nota)!==num)av.push(`Número da nota corrigido pela chave de acesso: ${n.nota} → ${num}.`);
      n.nota=num;
      if(n.date&&(n.date.slice(2,4)+n.date.slice(5,7))!==aamm)av.push(`A data de emissão (${brDate(n.date)}) não é do mês da chave (${aamm.slice(2)}/20${aamm.slice(0,2)}). Confira.`);
    }
  }else if(n.tipo!=="servico"&&n.fonte!=="comprovante"&&n.fonte!=="planilha")av.push("Sem chave de acesso legível: não deu para conferir o CNPJ e o número da nota.");
  if(n.cnpj&&!docOk(n.cnpj))av.push("CNPJ/CPF do fornecedor com dígito verificador inválido. Confira.");
  if(!n.date){n.date=hojeIso();av.push("Não achei a data de emissão; coloquei a de hoje.")}
  const conhecido=n.cnpj&&finAll().find(e=>e.fornId===n.cnpj&&e.contra);
  if(conhecido&&conhecido.contra!==n.forn){av.push(`Fornecedor padronizado como já está no financeiro: “${conhecido.contra}”.`);n.forn=conhecido.contra}
  n.rows.forEach(r=>{
    r.local=n.forn;r.nota=n.nota;r.date=n.date;r.chave=n.chave;
    const tot=+((r.qtd*r.valor)-(r.desconto||0)).toFixed(2);
    if(r.qtd&&r.valor&&Math.abs((r.total||0)-tot)>.02){
      if(r.total)av.push(`Item “${r.item.slice(0,32)}”: o total lido (${fmtBRL(r.total)}) não bate com quantidade × valor (${fmtBRL(tot)}). Usei ${fmtBRL(tot)}.`);
      r.total=tot;
    }else if(!r.total)r.total=tot;
    if(!r.valor&&r.qtd&&r.total)r.valor=+(r.total/r.qtd).toFixed(4);
  });
  const si=+n.rows.reduce((s,r)=>s+r.total,0).toFixed(2);
  if(!n.vNF)n.vNF=si;
  else if(Math.abs(si-n.vNF)>.05)av.push(`Os itens somam ${fmtBRL(si)} e a nota diz ${fmtBRL(n.vNF)}${n.vNF>si?" (frete, seguro ou outras despesas?)":""}. Confira se faltou algum item.`);
  n.dups=(n.dups||[]).filter(d=>d.valor>0||d.venc);
  if(n.dups.length){
    n.dups.forEach(d=>{if(!d.valor&&n.dups.length===1)d.valor=n.vNF});
    const sd=+n.dups.reduce((s,d)=>s+d.valor,0).toFixed(2);
    if(Math.abs(sd-n.vNF)>.05)av.push(`Os vencimentos somam ${fmtBRL(sd)}, diferente do valor da nota (${fmtBRL(n.vNF)}).`);
    if(n.dups.some(d=>!d.venc))av.push("Algum vencimento está sem data. Preencha antes de lançar.");
  }
  if(n.obsIA)av.push("Observação da leitura: "+n.obsIA);
  return av;
}

/* ---------- guarda do arquivo original ---------- */
const NFARQ_MAX=170000;
const b64De=u8=>{let s="";for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
const u8De=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
async function gz(u8,dir){const cs=new(dir==="c"?CompressionStream:DecompressionStream)("gzip"),w=cs.writable.getWriter();w.write(u8);w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer())}
async function nfArquivar(file,tipo,n,previa){
  const id=uid8(),meta={nome:file.name,tipo,type:file.type||guessType(file)||"application/octet-stream",nota:n.nota,forn:n.forn,chave:n.chave||"",em:new Date().toISOString(),tam:file.size,...(n.date?{date:n.date}:{})};
  const padrao=o=>({...o,nome:nfArqNomePadrao(n.nota,n.date,o.nome,id)});
  if(RT.assets){
    if(tipo!=="xml"){file=(await comprimir(file)).file;meta.nome=file.name;meta.type=file.type||meta.type;meta.tam=file.size}
    const r=await RT.assets.upload(file,{type:meta.type}).catch(e=>{throw new Error(`Não consegui guardar "${file.name}": ${e.message||e.code}`)});
    put("nfarq",id,padrao({...meta,asset:r.id}));return id;
  }
  if(!RT.db)return null;
  let alvo=file,metaDb={...meta};
  if(tipo==="pdf"){const c=await comprimir(file);alvo=file=c.file;metaDb.tam=file.size}
  if(tipo==="img"){for(const [lado,q] of [[1600,.72],[1300,.62],[1000,.55],[800,.5]]){alvo=await nfImgPrep(file,lado,q);if(alvo.size<=NFARQ_MAX)break}metaDb.type="image/jpeg";metaDb.nome=file.name.replace(/\.[a-z0-9]+$/i,"")+".jpg"}
  let u8=new Uint8Array(await alvo.arrayBuffer());
  if(tipo!=="img"){u8=await gz(u8,"c");metaDb.gz=true}
  if(u8.length>NFARQ_MAX&&tipo==="pdf"&&previa){ // PDF grande: guarda a imagem da primeira página
    u8=new Uint8Array(await previa.arrayBuffer());metaDb={...metaDb,nome:file.name.replace(/\.pdf$/i,"")+" (1ª página).jpg",type:"image/jpeg",gz:false,parcial:true};
  }
  if(u8.length>NFARQ_MAX)throw new Error(`"${file.name}" é grande demais para guardar sem o armazenamento de arquivos (só Editores do painel têm). Os dados foram lidos, mas o arquivo não ficou guardado.`);
  put("nfarq",id,padrao({...metaDb,b64:b64De(u8)}));return id;
}
/* nome padrão do arquivo guardado: NumeroDaNF_DataDaCompra (ex.: 12345_03-11-2026.pdf) */
const nfExt=n=>(String(n||"").match(/\.[A-Za-z0-9]{2,5}$/)||[""])[0].toLowerCase();
const nfDataArq=d=>/^\d{4}-\d{2}-\d{2}/.test(d||"")?d.slice(8,10)+"-"+d.slice(5,7)+"-"+d.slice(0,4):"sem-data";
const nfNumArq=v=>String(v==null?"":v).trim().replace(/[\\/:*?"<>|\s]+/g,"-").replace(/^-+|-+$/g,"")||"SN";
function nfArqNomePadrao(nota,date,nomeAtual,excetoId){
  const parcial=/\(1ª página\)/.test(nomeAtual||"")?" (1ª página)":"",ext=nfExt(nomeAtual)||".pdf";
  const base=nfNumArq(nota)+"_"+nfDataArq(date);
  const usados=new Set(Object.values(S.nfarq).filter(d=>d.id!==excetoId).map(d=>String(d.nome||"").toLowerCase()));
  let nome=base+parcial+ext,k=2;while(usados.has(nome.toLowerCase()))nome=base+" ("+(k++)+")"+parcial+ext;
  return nome;
}
/* número e data de um arquivo guardado: vêm da nota lançada que aponta para ele (o número do fornecedor vale mais que o Nº da planilha) */
function nfArqInfo(d){
  const L=(S.config.nf&&S.config.nf.rows)||[],num=d.nota==null?"":String(d.nota).trim();
  const r=L.find(x=>x.arq===d.id)||(num?L.find(x=>[x.notaForn,x.nota].some(v=>v!=null&&String(v).trim()===num)&&(!d.forn||!x.local||NFN(x.local)===NFN(d.forn))):null)||null;
  const nota=r?(r.notaForn!=null&&r.notaForn!==""?r.notaForn:(r.nota!=null&&r.nota!==""?r.nota:d.nota)):d.nota;
  return{nota,date:(r&&r.date)||d.date||""};
}
/* o nome atual já está no padrão (descontando o " (2)" de nomes repetidos)? */
function nfArqNoPadrao(d){
  const i=nfArqInfo(d);if(!i.date)return true; // sem data da compra (nota excluída ou sem ligação): fica com o nome que tem
  const base=nfNumArq(i.nota)+"_"+nfDataArq(i.date);
  const sem=String(d.nome||"").replace(/\.[A-Za-z0-9]{2,5}$/,"").replace(/ \(1ª página\)$/,"").replace(/ \(\d+\)$/,"");
  return sem===base;
}
/* renomeia os arquivos guardados para o padrão; ids = só esses (ex.: depois de editar uma nota) */
function nfArqPadroniza(ids){
  if(!podeEd("nf")&&!podeEd("fin"))return 0;
  let n=0;
  Object.values(S.nfarq).filter(d=>!ids||ids.includes(d.id)).forEach(d=>{
    if(nfArqNoPadrao(d))return;
    const i=nfArqInfo(d),nome=nfArqNomePadrao(i.nota,i.date,d.nome,d.id);
    put("nfarq",d.id,{...strip(d),nome,...(i.date&&!d.date?{date:i.date}:{})});n++;
  });
  if(n&&!ids)try{audit("Notas fiscais: arquivos renomeados",n+" arquivo(s) no padrão NumeroDaNF_DataDaCompra")}catch(e){}
  return n;
}
async function nfArqBytes(d){
  if(d.asset){const r=await fetch("/_blob/"+d.asset);if(!r.ok)throw new Error(`"${d.nome}" não foi encontrado no armazenamento.`);return new Uint8Array(await r.arrayBuffer())}
  let u=u8De(d.b64);if(d.gz)u=await gz(u,"d");return u;
}
function nfArqVer(id){const d=S.nfarq[id];if(!d)return toast("Arquivo não encontrado.",true);verArquivo(d.nome||"Nota fiscal",d.type||guessType({type:"",name:d.nome||""}),()=>nfArqBytes(d),()=>nfArqBaixar(id))}
async function nfArqBaixar(id){const d=S.nfarq[id];if(!d)return toast("Arquivo não encontrado.",true);try{await saveFile(safe(d.nome),await nfArqBytes(d))}catch(e){toast(e.message,true)}}
function nfArqCard(){
  const l=Object.values(S.nfarq).sort((a,b)=>(b.em||"").localeCompare(a.em||"")).slice(0,12);
  if(!l.length)return"";
  const fora=(podeEd("nf")||podeEd("fin"))?Object.values(S.nfarq).filter(d=>!nfArqNoPadrao(d)).length:0;
  return `<div class="card"><h2>Notas lidas e guardadas</h2><p class="sub" style="margin:0 0 8px">O arquivo original de cada nota lida fica guardado aqui e também na conta a pagar dela. O nome segue o padrão <b>NúmeroDaNF_DataDaCompra</b> (ex.: 12345_03-11-2026.pdf).</p>
   ${fora?`<div class="callout sand" style="margin:0 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="grow">${fora} arquivo(s) guardado(s) ainda estão com o nome antigo.</span><button class="b sm" id="nfarqpad">Renomear para o padrão</button></div>`:""}
   ${l.map(d=>`<div class="doc"><div class="grow"><div class="nm">NF ${esc(d.nota||"s/n")} — ${esc(d.forn||"")}</div><div class="sub">${esc(d.nome)} · ${d.em?brDate(d.em.slice(0,10)):""}${d.parcial?" · só a 1ª página":""}</div></div><button class="b sec sm" data-nfver="${esc(d.id)}">${ic("eye")} Ver</button> <button class="b sec sm" data-nfarq="${esc(d.id)}">${ic("down")} Baixar</button></div>`).join("")}</div>`;
}

/* ---------- importação com tela de conferência ---------- */
async function nfImportar(files,opts){
  opts=opts||{};
  if(!podeEd("nf"))return toast("Seu perfil não permite lançar notas fiscais.",true);
  if(!opts.interno&&files&&files.length>=30)return nfImportarLote(files);
  const notas=[],erros=[],st=document.createElement("div");st.className="callout sand";st.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:9000;max-width:92vw";
  document.body.appendChild(st);
  try{
    const total=files.length;let feitos=0,parar=false,ord=0,espera="";
    st.innerHTML=`<span id="nfprog"></span> <button type="button" class="b sec sm" id="nfstop" style="margin-left:8px">Parar e usar o que já foi lido</button>`;
    st.querySelector("#nfstop").onclick=()=>{parar=true;if(opts.res)opts.res.parou=true};
    const prog=()=>{const e=st.querySelector("#nfprog");if(e)e.textContent=`${opts.etapa?opts.etapa+" · ":""}Lendo ${Math.min(feitos+1,total)} de ${total}${notas.length?` · ${notas.length} nota(s) lida(s)`:""}${erros.length?` · ${erros.length} com erro`:""}${espera}`};
    prog();
    const um=async(f,o)=>{
      const tipo=nfTipoArq(f);
      try{
        if(!tipo)throw new Error("formato não aceito (use XML, PDF ou foto)");
        if(f.size>20*1048576)throw new Error("passa de 20 MB");
        let n;
        if(tipo==="xml")n={...nfParseXml(await f.text()),fonte:"xml"};
        else{for(let t=0;;t++){try{n=await nfLerIA(f,tipo);break}catch(e){if(/Muitas leituras|rate/i.test(e.message)&&t<5&&!parar){conc=Math.max(1,conc-1);espera=" · aguardando o Claude liberar novas leituras…";prog();await new Promise(r=>setTimeout(r,15000*(t+1)));espera="";continue}throw e}}}
        n.arq=f;n.arqTipo=tipo;n._ord=o;n.av=nfCorrige(n).concat(typeof nfAvisosExtra==="function"?nfAvisosExtra(n):[]);
        if(n.fonte==="xml"&&!n.tipo)n.tipo="produto";
        notas.push(n);
      }catch(e){erros.push(`${f.name}: ${e.message}`)}
    };
    let conc=Math.min(5,Math.max(1,total)),ativos=0;
    const fila=[...files],trab=async w=>{while(fila.length&&!parar&&!(opts.res&&opts.res.parou)){if(w>=conc){await new Promise(r=>setTimeout(r,1500));continue}const f=fila.shift();ativos++;await um(f,ord++);ativos--;feitos++;prog();if(feitos%10===0)await new Promise(r=>setTimeout(r,0))}};
    await Promise.all(Array.from({length:Math.min(5,total)},(_,w)=>trab(w)));
    if(fila.length)erros.push(`${fila.length} arquivo(s) não lido(s), porque você parou a leitura.`);
    if(opts.prontas)notas.push(...opts.prontas);
    notas.sort((a,b)=>a._ord-b._ord);
    if(opts.res)opts.res.erros.push(...erros);
    {const vistos=new Set();let rep=0;for(let i=0;i<notas.length;i++){const k=notas[i].chave||notas[i]._k||("n"+notas[i].nota+"|"+notas[i].forn);if(vistos.has(k)){notas.splice(i--,1);rep++}else vistos.add(k)}if(rep)erros.push(`${rep} arquivo(s) repetido(s) no lote foram ignorados.`)}
  }finally{st.remove()}
  if(!notas.length)return toast("Nenhuma nota lida. "+erros.join(" | "),true);
  const store=S.config.nf||{rows:[]},chaveDe=n=>n.chave||("n"+n.nota+"|"+n.forn);
  const jaTem=new Set((store.rows||[]).map(r=>r.chave||("n"+(r.notaForn||r.nota)+"|"+r.local)));
  let novas=await nfSeparaExistentes(notas);
  if(!novas.length)return;
  if(opts.auto){const limpa=n=>!n.av.length&&n.rows.length&&n.date&&n.forn&&!n.obsIA&&n.rows.every(r=>r.item&&r.total>0);opts.rev.push(...novas.filter(n=>!limpa(n)));novas=novas.filter(limpa);if(!novas.length)return;opts.autoClick=true}
  const cats=[...new Set((store.rows||[]).map(r=>r.categoria).filter(Boolean).concat(NF_REGRAS.map(x=>x[1])))];
  {let ult=null;novas.forEach(n=>{n.seq=n._seq||nfProximoNumero(ult);ult=n.seq})}
  novas.forEach(n=>n.rows.forEach(r=>{const k=(r._sug&&{cat:r._sug.cat,sub:r._sug.sub||"A classificar",cc:NFX_CC[r._sug.cat]||""})||nfClassifica(r);r._cat=k?k.cat:"A classificar";r._sub=k?k.sub:"A classificar";r._cc=k?k.cc:""}));
  const comDup=novas.some(n=>n.dups.length);
  const itemRow=(r,j)=>`<tr data-item="${j}"><td><input data-r="item" value="${esc(r.item)}" style="min-width:180px"></td><td><input data-r="qtd" inputmode="decimal" value="${r.qtd}" style="width:64px"></td><td><input data-r="un" value="${esc(r.un||"")}" style="width:52px"></td>
    <td><input data-r="valor" inputmode="decimal" value="${r.valor}" style="width:84px"></td><td><input data-r="total" inputmode="decimal" value="${r.total}" style="width:90px"></td>
    <td><input data-r="cat" list="nfcats" value="${esc(r._cat)}" style="min-width:150px"></td><td><input data-r="sub" list="nfsubs" value="${esc(r._sub)}" style="min-width:150px"></td><td><button type="button" class="b sec sm" data-rdel title="Remover item">${ic("trash")}</button></td></tr>`;
  const secao=(n,i)=>`<details class="card" data-nota="${i}" style="margin:0 0 10px" ${(novas.length<=20&&(n.av.length||n.fonte==="leitura"))||novas.length===1||(novas.length>20&&i<3)?"open":""}>
   <summary style="cursor:pointer"><b>NF ${esc(n.nota||"s/n")} — ${esc(n.forn)}</b> <span class="chip">${n.fonte==="xml"?"XML (leitura exata)":n.fonte==="manual"?"digitada":n.fonte==="comprovante"?"comprovante sem NF-e":n.fonte==="planilha"?"da planilha":"lida por IA — confira"}</span> <span class="sub">${fmtBRL(n.vNF)}</span></summary>
   ${n.av.length?`<div class="callout sand" style="margin:10px 0">${n.av.map(a=>`<div>• ${esc(a)}</div>`).join("")}</div>`:`<div class="callout" style="margin:10px 0">Nenhuma divergência encontrada nas conferências.</div>`}
   <div class="grid g2"><div><label>Fornecedor</label><input data-h="forn" value="${esc(n.forn)}"></div><div><label>CNPJ/CPF</label><input data-h="cnpj" value="${esc(fmtCnpj(n.cnpj))}"></div>
    <div><label>Nº no sistema (sequência da planilha)</label><input data-h="seq" value="${esc(n.seq)}"></div><div><label>Nº na nota do fornecedor</label><input data-h="nota" value="${esc(n.nota)}"></div><div><label>Emissão</label><input type="date" data-h="date" value="${esc(n.date)}"></div>
    <div><label>Valor total (R$)</label><input data-h="vNF" inputmode="decimal" value="${n.vNF}"></div><div><label>Chave de acesso</label><input data-h="chave" value="${esc(n.chave)}"></div></div>
   <div class="wrap" style="margin-top:10px"><table><thead><tr><th>Item</th><th class="n">Qtd</th><th>Un</th><th class="n">Valor un.</th><th class="n">Total</th><th>Categoria</th><th>Subcategoria</th><th></th></tr></thead><tbody>
   ${n.rows.map((r,j)=>itemRow(r,j)).join("")}</tbody></table></div>
   <button type="button" class="b sec sm" data-radd="${i}" style="margin-top:6px">${ic("plus")} Item</button>
   <label style="margin-top:10px">Vencimentos (duplicatas)</label><div data-dups>${n.dups.map((d,j)=>dupRow(d)).join("")}</div>
   <button type="button" class="b sec sm" data-dupadd style="margin-top:6px">${ic("plus")} Vencimento</button>
   ${n.arq?`<div class="sub" style="margin-top:8px">${ic("clip")} Arquivo guardado: ${esc(n.arq.name)}</div>`:""}</details>`;
  const dupRow=d=>`<div class="row" data-dup style="margin-bottom:4px"><input type="date" data-d="venc" value="${esc(d.venc||"")}"><input data-d="valor" inputmode="decimal" value="${d.valor||""}" placeholder="Valor"><button type="button" class="b sec sm" data-dupdel style="flex:none">${ic("trash")}</button></div>`;
  const ov=openModal(`<h3>Conferir e lançar notas fiscais</h3>
   <div class="sub" style="margin-bottom:10px">${novas.length} nota(s) lida(s)${notas.length>novas.length?` · ${notas.length-novas.length} já estava(m) no sistema`:""}${erros.length?` · ${erros.length} arquivo(s) com erro: ${esc(erros.join(" | "))}`:""}. Corrija o que precisar: o que você ajustar aqui é o que vai para o sistema.</div>
   <datalist id="nfcats">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
   <datalist id="nfsubs">${[...new Set((store.rows||[]).map(r=>r.subcategoria).filter(Boolean).concat(NFX_REGRAS.map(x=>x[2])))].map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
   ${novas.map(secao).join("")}
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:10px"><input type="checkbox" id="xest" checked> Dar entrada dos itens no estoque, com lote e validade (você confere antes de confirmar)</label>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="xfin" ${comDup?"checked":""}> Lançar os vencimentos em Contas a pagar, com a nota anexada</label>
   <div class="sub" style="margin-top:4px">Notas lançadas em Contas a pagar não entram duas vezes no fluxo de caixa.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="xcx">Cancelar</button><button class="b" id="xsv">Lançar</button></div>`);
  const pn=v=>{const x=+String(v).trim().replace(",",".");return isFinite(x)?x:0};
  ov.querySelectorAll("[data-rdel]").forEach(b=>b.onclick=()=>b.closest("tr").remove());
  ov.querySelectorAll("[data-radd]").forEach(b=>b.onclick=()=>{const n=novas[+b.dataset.radd],r={item:"",qtd:1,valor:"",total:"",_cat:"A classificar",_sub:"A classificar",_cc:""};n.rows.push(r);
    const tb=b.previousElementSibling.querySelector("tbody");tb.insertAdjacentHTML("beforeend",itemRow(r,n.rows.length-1));const tr=tb.lastElementChild;tr.querySelector("[data-rdel]").onclick=()=>tr.remove();tr.querySelector('[data-r="item"]').focus()});
  nfIAPreenche(ov,novas);
  ov.querySelectorAll("[data-dupdel]").forEach(b=>b.onclick=()=>b.closest("[data-dup]").remove());
  ov.querySelectorAll("[data-dupadd]").forEach(b=>b.onclick=()=>{b.previousElementSibling.insertAdjacentHTML("beforeend",dupRow({}));const r=b.previousElementSibling.lastElementChild;r.querySelector("[data-dupdel]").onclick=()=>r.remove()});
  ov.querySelector("#xcx").onclick=()=>ov.remove();
  ov.querySelector("#xsv").onclick=async()=>{
    const btn=ov.querySelector("#xsv");btn.disabled=true;btn.textContent="Lançando…";
    const lanca=ov.querySelector("#xfin").checked,paraEst=ov.querySelector("#xest").checked,final=[];
    // lê de volta o que a pessoa conferiu
    ov.querySelectorAll("details[data-nota]").forEach(box=>{
      const n=novas[+box.dataset.nota],h=k=>box.querySelector(`[data-h="${k}"]`).value.trim();
      const cnpj=so(h("cnpj")),chave=so(h("chave")),forn=h("forn"),nota=h("nota"),seq=h("seq")||n.seq,date=nfData(h("date"))||n.date;
      const rows=[...box.querySelectorAll("tr[data-item]")].map(tr=>{
        const g=k=>tr.querySelector(`[data-r="${k}"]`).value.trim(),base=n.rows[+tr.dataset.item],qtd=pn(g("qtd"))||1,valor=pn(g("valor")),total=pn(g("total"))||+(qtd*valor).toFixed(2);
        const k=nfClassifica({item:g("item"),ncm:base.ncm}),cat=(g("cat")&&g("cat")!=="A classificar")?g("cat"):(k?k.cat:"A classificar");
        const o={...base,date,nota:seq,notaForn:nota,item:g("item"),local:forn,qtd,valor,total,chave,categoria:cat,subcategoria:g("sub")||(k&&k.cat===cat?k.sub:(cat===base._cat?base._sub:"A classificar")),...(g("un")?{un:g("un")}:{}),viaFin:false};
        delete o._cat;delete o._sub;delete o._cc;delete o._sug;
        if(k&&k.cat===cat&&k.cc)o.cc=k.cc;else if(cat===base._cat&&base._cc)o.cc=base._cc;
        o[n.fonte==="xml"?"xml":n.fonte==="manual"?"manual":n.fonte==="comprovante"?"semNfe":n.fonte==="planilha"?"planilha":"lida"]=true;return o;
      }).filter(r=>r.item);
      const dups=[...box.querySelectorAll("[data-dup]")].map((d,i)=>({n:String(i+1),venc:nfData(d.querySelector('[data-d="venc"]').value),valor:pn(d.querySelector('[data-d="valor"]').value)})).filter(d=>d.valor>0);
      final.push({...n,forn,cnpj,chave,nota,seq,date,vNF:pn(h("vNF"))||rows.reduce((s,r)=>s+r.total,0),rows,dups});
    });
    {const usados=new Set((store.rows||[]).map(r=>String(r.nota))),vistos=new Set();for(const n of final){if(usados.has(String(n.seq))||vistos.has(String(n.seq))){btn.disabled=false;btn.textContent="Lançar";return toast("O número "+n.seq+" já está em uso por outra nota. Ajuste o Nº no sistema.",true)}vistos.add(String(n.seq))}}
    if(final.some(n=>!n.forn)){btn.disabled=false;btn.textContent="Lançar";return toast("Informe o fornecedor de todas as notas.",true)}
    if(final.some(n=>!n.rows.length)){btn.disabled=false;btn.textContent="Lançar";return toast("Uma das notas ficou sem itens.",true)}
    if(lanca&&final.some(n=>n.dups.some(d=>!d.venc))){btn.disabled=false;btn.textContent="Lançar";return toast("Preencha a data de todos os vencimentos.",true)}
    // guarda o arquivo original
    const avisos=[];let kk=0;
    for(const n of final){
      btn.textContent=`Guardando arquivos ${++kk}/${final.length}…`;await new Promise(r=>setTimeout(r,0));
      try{
        if(!n.arq){n.arqId=null;continue}
        let previa=null;if(n.arqTipo==="pdf"&&!RT.assets)try{previa=(await nfPdfLer(n.arq)).imgs[0]}catch(e){}
        n.arqId=await nfArquivar(n.arq,n.arqTipo,n,previa);
      }catch(e){avisos.push(e.message);n.arqId=null}
    }
    const rows=final.flatMap(n=>n.rows.map(r=>({...r,viaFin:lanca&&n.dups.length>0,...(n.arqId?{arq:n.arqId}:{})})));
    const nome=(store.rows&&store.rows.length&&store.fileName)?store.fileName:"Notas lançadas";
    if(!nfSave([...(store.rows||[]),...rows],nome)){btn.disabled=false;btn.textContent="Lançar";return}
    let nFin=0;
    if(lanca){
      const novosFin=[];
      final.forEach(n=>{
        const ref=n.chave||n.nota;if(finAll().some(e=>e.nf===ref))return;
        const grupo=n.dups.length>1?uid8():null,pesos={};
        rows.filter(r=>(r.chave||r.notaForn||r.nota)===ref||(r.notaForn||r.nota)===n.nota&&r.local===n.forn).forEach(r=>{const k=r.categoria+"|"+(r.cc||"");pesos[k]=(pesos[k]||0)+r.total});
        const topo=Object.keys(pesos).sort((a,b)=>pesos[b]-pesos[a])[0]||"A classificar|",[catN,ccN]=topo.split("|");
        n.dups.forEach((d,i)=>novosFin.push({id:uid8(),tipo:"pagar",desc:`NF ${n.nota} — ${n.forn}`,contra:n.forn,cat:catN,area:ccN||"",forma:"Boleto",obs:n.fonte==="xml"?"Importada do XML da NF-e":n.fonte==="comprovante"?"Comprovante de compra sem NF-e":n.fonte==="planilha"?"Lançada pela planilha de notas":"Lida do documento da nota",valor:d.valor||n.vNF,venc:d.venc||n.date||hojeIso(),pago:null,valorPago:null,grupo,parcela:n.dups.length>1?`${i+1}/${n.dups.length}`:null,nf:ref,fornId:nfFornId(n),...(n.arqId?{nfarq:n.arqId}:{})}));
      });
      if(novosFin.length){finMutate(all=>[...all,...novosFin]);nFin=novosFin.length}
    }
    ov.remove();
    toast(`${rows.length} item(ns) de ${final.length} nota(s) lançado(s)${nFin?` e ${nFin} vencimento(s) em Contas a pagar`:""}.`);
    avisos.forEach(a=>toast(a,true));
    go("nf",true);
    if(paraEst){
      const est=estData(),fis=rows.filter(nfFisico);
      if(fis.length)setTimeout(()=>openEstLote("entrada",{motivo:"Compra",data:final.length===1?(final[0].date||hojeIso()):hojeIso(),nfRot:final.length===1?`${final[0].forn} ${final[0].nota}`:`${final.length} notas lançadas`,
        rows:fis.map(r=>{const a=estAchar(r.item),area=a?a.area:(r.cc&&est.areas.includes(r.cc)?r.cc:"");return{nome:r.item,qtd:r.qtd||1,custo:r.valor||(r.total&&r.qtd?+(r.total/r.qtd).toFixed(2):""),area,unidade:nfUnEst(r.un),lote:r.lote||"",val:r.validade||"",nf:nfKey(r),forn:r.local||"",rastreavel:(r.lote||r.validade||/enferm|fisio/i.test(area))?true:undefined}})}),150);
    }
  };
  if(opts.autoClick){
    ov.style.display="none";ov.querySelector("#xest").checked=false;ov.querySelector("#xsv").click();
    for(let i=0;i<9000&&document.body.contains(ov);i++){const bt=ov.querySelector("#xsv");if(i>10&&bt&&!bt.disabled&&bt.textContent==="Lançar")break;await new Promise(r=>setTimeout(r,200))}
    if(document.body.contains(ov)){opts.rev.push(...novas);ov.remove()}else if(opts.res)opts.res.lancadas+=novas.length;
  }
}
const nfImportXml=nfImportar;

/* ---------- financeiro: conciliação e relatórios ---------- */
const finSinal=e=>(e.tipo==="receber"?1:-1)*finNum(e);
function finConcHtml(){
  const todos=finAll().filter(e=>e.pago&&!e.cancelada&&e.pago.slice(0,4)===String(FIN.ano)&&(FIN.mes<0||+e.pago.slice(5,7)-1===FIN.mes)).sort((a,b)=>a.pago.localeCompare(b.pago)||a.desc.localeCompare(b.desc));
  const conf=todos.filter(e=>e.conc),pend=todos.filter(e=>!e.conc),chave=FIN.mes<0?null:`${FIN.ano}-${String(FIN.mes+1).padStart(2,"0")}`;
  const ext=chave?((finCfg().extrato||{})[chave]):undefined,liq=soma(conf,finSinal),dif=(ext!==undefined&&ext!=="")?(+ext)-liq:null;
  return `<div class="card"><h2>Conciliação bancária</h2><p class="sub" style="margin:0 0 10px">Confira cada pagamento e recebimento com o extrato do banco e marque como conferido. Informe o movimento líquido do extrato no mês (entradas − saídas) para ver se bate.</p>
   ${finPeriodoHtml()}
   ${chave?`<div class="row" style="margin-bottom:10px;align-items:flex-end"><div><label>Movimento líquido do extrato em ${MESES_PT[FIN.mes]} (R$)</label><input type="number" id="fextrato" step="0.01" data-stepby="1" value="${ext===undefined?"":ext}" placeholder="ex.: 12500"></div>
    <button class="b sec" id="fconcall" style="flex:none" ${pend.length?"":"disabled"}>${ic("check")} Marcar todos como conferidos</button></div>`:`<div class="callout sand" style="margin-bottom:10px">Escolha um mês específico para comparar com o extrato.</div>`}</div>
  <div class="stats"><div class="stat"><b>${todos.length}</b><span>movimentos no período</span></div>
   <div class="stat blue"><b>${fmtBRL(liq)}</b><span>conferido · ${conf.length}</span></div>
   <div class="stat ${pend.length?"warn":""}"><b>${fmtBRL(soma(pend,finSinal))}</b><span>pendente de conferência · ${pend.length}</span></div>
   <div class="stat ${dif===null?"":Math.abs(dif)<0.005?"blue":"bad"}"><b>${dif===null?"—":fmtBRL(dif)}</b><span>${dif===null?"diferença (informe o extrato)":Math.abs(dif)<0.005?"bateu com o extrato":"diferença contra o extrato"}</span></div></div>
  <div class="card">${todos.length?`<div class="wrap"><table><thead><tr><th style="width:32px"></th><th>Data</th><th>Descrição</th><th>Tipo</th><th class="n">Valor</th><th>Comprovante</th></tr></thead><tbody>
   ${todos.map(e=>`<tr><td><input type="checkbox" data-fconc="${e.id}" ${e.conc?"checked":""}></td><td>${brDate(e.pago)}</td><td><b>${esc(e.desc)}</b><div class="sub">${esc([e.contra,e.forma].filter(Boolean).join(" · "))}</div></td><td>${e.tipo==="receber"?"Entrada":"Saída"}</td><td class="n">${finMoney(finSinal(e))}</td><td><button class="b sec sm" data-fanexo="${e.id}" title="Comprovantes e anexos">${ic("clip")}${(e.anexos||[]).length?" "+e.anexos.length:" sem"}</button></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum pagamento ou recebimento baixado neste período.</div>`}</div>`;
}
function finRelData(ctx){
  ctx=ctx||FIN;
  const noPer=d=>d&&d.slice(0,4)===String(ctx.ano)&&(ctx.mes<0||+d.slice(5,7)-1===ctx.mes);
  const nf=FIN.incNF&&S.config.nf&&S.config.nf.rows?S.config.nf.rows.filter(r=>!r.viaFin&&noPer(r.date)):[];
  const l=finAll().filter(e=>noPer(e.venc)&&!e.semResultado);
  const acc=chave=>{const m={};l.forEach(e=>{const k=chave(e)||"Sem classificação";(m[k]=m[k]||{e:0,s:0})[e.tipo==="receber"?"e":"s"]+=finNum(e)});return m};
  const porCat=acc(e=>e.cat),porArea=finAccArea(l),porContra=acc(e=>e.contra);
  const add=(m,k)=>m[k]=m[k]||{e:0,s:0};
  nf.forEach(r=>{add(porCat,r.categoria||"Sem classificação").s+=r.total;add(porArea,"Notas fiscais (sem área)").s+=r.total;add(porContra,r.local||"Sem fornecedor").s+=r.total});
  return{porCat,porArea,porContra};
}
function finRelHtml(){
  const{porCat,porArea,porContra}=finRelData();
  const tab=(titulo,m,limite)=>{const ks=Object.keys(m).sort((a,b)=>(m[b].s+m[b].e)-(m[a].s+m[a].e)).slice(0,limite||99);
    return `<div class="card"><h2>${titulo}</h2>${ks.length?`<div class="wrap"><table><thead><tr><th>${titulo.split(" por ")[1]||"Item"}</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Resultado</th></tr></thead><tbody>
    ${ks.map(k=>`<tr><td>${esc(k)}</td><td class="n">${fmtBRL(m[k].e)}</td><td class="n">${fmtBRL(m[k].s)}</td><td class="n">${finMoney(m[k].e-m[k].s)}</td></tr>`).join("")}
    ${Object.keys(m).length>ks.length?(()=>{const ou=Object.keys(m).filter(k=>!ks.includes(k));return `<tr><td class="sub">Demais (${ou.length})</td><td class="n">${fmtBRL(soma(ou,k=>m[k].e))}</td><td class="n">${fmtBRL(soma(ou,k=>m[k].s))}</td><td class="n">${finMoney(soma(ou,k=>m[k].e-m[k].s))}</td></tr>`})():""}<tr style="font-weight:700"><td>Total</td><td class="n">${fmtBRL(soma(Object.keys(m),k=>m[k].e))}</td><td class="n">${fmtBRL(soma(Object.keys(m),k=>m[k].s))}</td><td class="n">${finMoney(soma(Object.keys(m),k=>m[k].e-m[k].s))}</td></tr></tbody></table></div>`:`<div class="empty">Sem lançamentos no período.</div>`}</div>`};
  return `<div class="card"><h2>Relatórios gerenciais</h2><p class="sub" style="margin:0 0 10px">Pelo vencimento, somando o que já foi pago/recebido e o que está em aberto. ${FIN.incNF?"Inclui as notas fiscais da planilha.":""}</p>${finPeriodoHtml()}
   <div class="row"><button class="b sec" id="frelcsv" style="flex:none">${ic("down")} Baixar CSV</button></div></div>
  ${tab("Resultado por categoria",porCat)}${tab("Resultado por área (centro de custo)",porArea)}${tab("Resultado por fornecedor / cliente",porContra,12)}`;
}
function finRelCsv(){
  const{porCat,porArea,porContra}=finRelData(),L=[["relatorio","grupo","entradas","saidas","resultado"]];
  [["categoria",porCat],["area",porArea],["contraparte",porContra]].forEach(([n,m])=>Object.keys(m).forEach(k=>L.push([n,k,m[k].e,m[k].s,m[k].e-m[k].s].map(v=>typeof v==="number"?String(+v.toFixed(2)).replace(".",","):v))));
  const t=L.map(l=>l.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  saveFile(`relatorio-financeiro-${FIN.ano}${FIN.mes<0?"":"-"+String(FIN.mes+1).padStart(2,"0")}.csv`,new Blob(["\ufeff"+t],{type:"text/csv"}));
}
function bindFinExtras(){
  bindRec();
  const fv=$("finvinc");if(fv)fv.onclick=finVincularAuto;
  document.querySelectorAll("[data-fanexo]").forEach(b=>b.onclick=()=>openFinAnexos(b.dataset.fanexo));
  document.querySelectorAll("[data-fnfarq]").forEach(b=>b.onclick=()=>nfArqBaixar(b.dataset.fnfarq));
  const fcz=$("fincomp");if(fcz)fcz.onclick=()=>baixarComprovantes(finFiltrar(FIN.tab));
  const g1=$("fingoest");if(g1)g1.onclick=()=>go("estoque");
  const g2=$("finnfest");if(g2)g2.onclick=openEstDeNF;
  document.querySelectorAll("[data-fconc]").forEach(c=>c.onchange=()=>{finMutate(all=>all.map(e=>e.id===c.dataset.fconc?{...e,conc:c.checked}:e));go("fin",true)});
  const ca=$("fconcall");if(ca)ca.onclick=()=>{
    const ids=new Set(finAll().filter(e=>e.pago&&!e.conc&&e.pago.slice(0,7)===`${FIN.ano}-${String(FIN.mes+1).padStart(2,"0")}`).map(e=>e.id));
    finMutate(all=>all.map(e=>ids.has(e.id)?{...e,conc:true}:e));go("fin",true);
  };
  const ex=$("fextrato");if(ex)ex.onchange=()=>{
    const k=`${FIN.ano}-${String(FIN.mes+1).padStart(2,"0")}`;
    put("config","fin_cfg",{...strip(finCfg()),extrato:{...(finCfg().extrato||{}),[k]:ex.value===""?"":+ex.value}});setTimeout(()=>go("fin",true),0);
  };
  const rc=$("frelcsv");if(rc)rc.onclick=finRelCsv;
}

/* ---------- rede de segurança: nenhum erro some em silêncio ---------- */
let _ultimoErro=0;
function avisaErro(msg){const t=Date.now();if(t-_ultimoErro<3000)return;_ultimoErro=t;toast(msg,true)}
window.addEventListener("error",e=>{if(!e.message||/ResizeObserver/.test(e.message))return;console.error(e.error||e.message);avisaErro("Algo deu errado: "+e.message+". Se repetir, recarregue a página.")});
window.addEventListener("unhandledrejection",e=>{console.error(e.reason);avisaErro("Não foi possível concluir: "+((e.reason&&e.reason.message)||e.reason||"erro inesperado"))});


