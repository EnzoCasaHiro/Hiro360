/* ===== V41 · Integrantes: envio de documentos em lote com nome automático + link de envio (prefixo xdc) =====
   1) Arrastar vários arquivos: cada um é lido (IA), recebe tipo, titular e nome sugerido; o RH confere e salva.
   2) Link com validade para o integrante mandar a própria documentação (só na versão hospedada).
   Os arquivos recebidos pelo link ficam "pendentes" até o RH conferir. */
const XDC_TIPOS=["RG","CPF","CNH","CTPS","PIS/NIS","Cartão do Cidadão (NIS)","Título de eleitor","Reservista","Certidão de nascimento","Certidão de casamento","Comprovante de residência","Cartão de vacinação","Foto 3x4","ASO","Atestado médico","Contrato","Diploma ou certificado","Registro profissional (conselho)","Comprovante bancário","Outro"];
const XDC_CAT={"ASO":"ASO e exames","Atestado médico":"Atestados","Contrato":"Contrato e admissão","Diploma ou certificado":"Certificados e treinamentos","Registro profissional (conselho)":"Certificados e treinamentos","Outro":"Outros"};
const XDC_PEDIDOS=["RG (frente e verso)","CPF","CTPS (carteira de trabalho)","PIS/NIS","Título de eleitor","Comprovante de residência","Certidão de nascimento ou casamento","Foto 3x4","Cartão de vacinação","Comprovante bancário (conta ou PIX)","Diploma, curso ou registro profissional","RG e CPF dos filhos","Certidão de nascimento dos filhos","Cartão de vacinação dos filhos"];
const xdcNorm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
const xdcStop=new Set(["de","da","do","das","dos","e"]);
const xdcToks=s=>xdcNorm(s).split(" ").filter(t=>t&&!xdcStop.has(t));
/* dois nomes são da mesma pessoa? primeiro e último nome iguais, ou boa parte dos nomes em comum */
function xdcMesmoNome(a,b){
  const A=xdcToks(a),B=xdcToks(b);if(!A.length||!B.length)return false;
  if(A.length>=2&&B.length>=2&&A[0]===B[0]&&A[A.length-1]===B[B.length-1])return true;
  if(A.length>=2&&B.length>=2&&A[0]!==B[0])return false; // primeiro nome diferente: outra pessoa da família (filhos têm o mesmo sobrenome)
  const c=A.filter(t=>B.includes(t)).length;return c>=2&&c/Math.min(A.length,B.length)>=.6;
}
const xdcPrimeiro=n=>String(n||"").trim().split(/\s+/)[0]||"";
const xdcNomeC=i=>i.nomeCompleto||i.nome||"";
const xdcExt=n=>{const m=String(n||"").match(/\.([A-Za-z0-9]{2,5})$/);return m?"."+m[1].toLowerCase():""};
const xdcSemExt=n=>String(n||"").replace(/\.[A-Za-z0-9]{2,5}$/,"");
const xdcLadoNorm=v=>{const t=xdcNorm(v);return /frente e verso|verso e frente|ambos|aberto|dois lados|os dois/.test(t)?"ambos":/^frente/.test(t)?"frente":/^verso/.test(t)?"verso":""};
const xdcLadoNome={frente:"Frente",verso:"Verso",ambos:"Frente e verso"};
const xdcHeurLado=n=>{const t=xdcNorm(n);return /frente e verso|verso e frente|frente verso|ambos|completo/.test(t)?"ambos":/\bfrente\b/.test(t)?"frente":/\bverso\b/.test(t)?"verso":""};
const xdcId=()=>Math.random().toString(36).slice(2,10);

/* ---------- nome final ---------- */
function xdcNomeFinal(i,r){
  const tipo=r.tipo==="Outro"?(r.outro||"Documento"):r.tipo;
  let doc=tipo;
  if(r.quem==="familiar"){
    const pn=(r.pessoa||"").trim(),rel=r.parent&&r.parent!=="familiar"?r.parent:"familiar";
    doc=tipo+" de "+(pn||"familiar")+" ("+rel+")";
  }
  if(r.lado==="frente")doc+=" (frente)";else if(r.lado==="verso")doc+=" (verso)";
  return doc+" - "+nomeInteg(i);
}
/* decide se o documento é do integrante ou de um familiar, a partir do que a IA leu */
/* documentos que trazem a filiação (mãe/pai) impressa junto com o nome do titular: a leitura às vezes pega o nome da mãe */
const XDC_COM_FILIACAO=new Set(["RG","CNH","CPF","CTPS","PIS/NIS","Cartão do Cidadão (NIS)","Título de eleitor","Reservista"]);
const xdcTemNome=(txt,nome)=>{const t=" "+xdcNorm(txt)+" ",n=xdcToks(nome);return n.length>=2&&t.includes(" "+n[0]+" ")&&t.includes(" "+n[n.length-1]+" ")&&n.every(p=>t.includes(" "+p+" "))};
function xdcTitular(i,leu){
  const meu=xdcNomeC(i),nome=String(leu.nome||"").trim(),fil=Array.isArray(leu.filiacao)?leu.filiacao:[];
  const colab={quem:"colab",pessoa:"",parent:""};
  if(!nome||!meu)return colab;
  if(xdcMesmoNome(meu,nome))return colab;
  /* a leitura pegou o nome da mãe ou do pai no lugar do titular (comum na CTPS, que mostra os dois nomes):
     o nome lido é a mãe/pai do cadastro, ou aparece na própria filiação do documento, ou o nome do integrante
     está impresso no documento (e não como filiação) */
  if(XDC_COM_FILIACAO.has(leu.tipo)){
    const ehPai=[i.mae,i.pai].some(p=>p&&xdcMesmoNome(p,nome));
    const naFil=fil.some(f=>xdcMesmoNome(f,nome));
    const meuNaFil=fil.some(f=>xdcMesmoNome(meu,f));
    const impresso=leu.txt&&xdcTemNome(leu.txt,meu);
    if(ehPai||naFil||(leu.temIntegrante===true&&!meuNaFil)||(impresso&&!meuNaFil)||(leu.tipo==="CTPS"&&meuNaFil))return{...colab,troca:nome};
  }
  if(fil.some(f=>xdcMesmoNome(meu,f)))return{quem:"familiar",pessoa:xdcTitulo(nome),parent:"filho(a)"};
  return{quem:"familiar",pessoa:xdcTitulo(nome),parent:"familiar"};
}

/* ---------- leitura por IA ---------- */
const XDC_PROMPT=(i,pags,nimg)=>`Você ajuda o RH de uma casa de repouso no Brasil a organizar e cadastrar documentos de um integrante. Olhe com atenção TODAS as imagens (são as páginas/fotos de UM arquivo, em ordem). A foto pode estar girada, de lado ou de cabeça para baixo: leia mesmo assim.
${xdcNomeC(i)?`O integrante desta pasta se chama "${xdcNomeC(i)}". O documento pode ser dele ou de outra pessoa (filho, cônjuge, mãe…).`:"É um integrante novo e o nome dele ainda não foi digitado: leia com cuidado o nome completo do titular, porque ele será usado no cadastro."}${pags?` O arquivo tem ${pags} página(s); você recebeu ${nimg} imagem(ns).`:""}
Responda APENAS com um objeto JSON, sem comentários, neste formato (use null no que não existir ou não der para ler):
{"tipo":"um destes valores exatos: ${XDC_TIPOS.join(" | ")}",
 "nome":"nome completo de quem é o documento, como impresso",
 "filiacao":["nome da mãe","nome do pai"],
 "lado":"frente | verso | frente e verso | null",
 "validade":"AAAA-MM-DD ou null",
 "legivel":true,
 "aparece_integrante":"true se o nome do integrante desta pasta está impresso no documento como titular (não como mãe/pai); senão false",
 "dados":{"cpf":"","rg":"","rgOrgao":"","rgEmissao":"AAAA-MM-DD","nascimento":"AAAA-MM-DD","naturalidade":"cidade - UF","mae":"","pai":"","estadoCivil":"","pis":"","ctps":"número e série/UF","titulo":"","tituloZona":"","tituloSecao":"","cnh":"","endereco":"logradouro, número, complemento - bairro","cep":"","cidade":"cidade - UF"}}
Como preencher:
- ATENÇÃO à filiação: RG, CNH, CTPS (inclusive a Carteira de Trabalho Digital), título e NIT trazem também o nome da mãe e do pai. Esses nomes vão SÓ em "filiacao", nunca em "nome". Na CTPS o titular é o nome que aparece no topo/na identificação do trabalhador, acima de "Filiação" ou "Nome da mãe".
- "nome": RG/CPF/CNH/título/CTPS/NIT = o titular; certidão de nascimento = quem nasceu; comprovante de residência = o titular da conta; certidão de casamento = se "${xdcNomeC(i)}" for um dos cônjuges, use o nome dele(a).
- "dados": copie TUDO o que estiver legível neste arquivo sobre a pessoa do campo "nome" (não deixe em branco o que dá para ler). Datas sempre no formato AAAA-MM-DD (ex.: 10/MAR/1977 vira 1977-03-10). Números como impressos (pode manter pontos e traços). RG: o "Registro Geral". CPF: 11 dígitos (no verso do RG aparece como "CPF"). PIS/NIT/NIS/PASEP vão em "pis" (o Cartão do Cidadão e o comprovante de inscrição NIT trazem esse número). CTPS: número e série. Título: número de inscrição, zona e seção. Estado civil: só se o documento disser (certidão de casamento com averbação de divórcio = "divorciado(a)").
- "lado": "frente e verso" se o arquivo mostra os dois lados (um RG aberto, ou um lado em cada página/foto); "frente" ou "verso" se só um lado; null se o documento não tem lados (digital, conta, certidão).
- Cartão do Cidadão da Caixa: tipo "Cartão do Cidadão (NIS)". Comprovante de cadastramento do NIT/PIS: tipo "PIS/NIS".
- Não invente. Se não tiver certeza do tipo, use "Outro". Se a imagem estiver ilegível, "legivel": false.`;
/* recorta as margens brancas (um RG pequeno no canto de uma folha A4 fica legível para a leitura) */
function xdcRecorta(cv){
  try{
    /* ignora as bordas escuras de scanner (2% de cada lado) e acha onde há conteúdo de verdade, por densidade de linhas e colunas */
    const w=cv.width,h=cv.height,k=Math.max(1,Math.floor(Math.max(w,h)/600)),d=cv.getContext("2d").getImageData(0,0,w,h).data;
    const mx=Math.round(w*.02),my=Math.round(h*.02),lin=new Float32Array(h),col=new Float32Array(w);let nx=0,ny=0;
    for(let y=my;y<h-my;y+=k){ny++;for(let x=mx;x<w-mx;x+=k){const o=(y*w+x)*4;if(d[o+3]>10&&(d[o]<236||d[o+1]<236||d[o+2]<236)){lin[y]++;col[x]++}}}
    for(let x=mx;x<w-mx;x+=k)nx++;
    let x0=-1,x1=-1,y0=-1,y1=-1;
    for(let y=my;y<h-my;y+=k)if(lin[y]/nx>.02){if(y0<0)y0=y;y1=y}
    for(let x=mx;x<w-mx;x+=k)if(col[x]/ny>.02){if(x0<0)x0=x;x1=x}
    if(x0<0||y0<0||x1<=x0||y1<=y0)return cv;
    const px=Math.round(w*.02),py=Math.round(h*.02);x0=Math.max(0,x0-px);y0=Math.max(0,y0-py);x1=Math.min(w,x1+px);y1=Math.min(h,y1+py);
    if((x1-x0)*(y1-y0)>w*h*.85)return cv;
    const o=document.createElement("canvas");o.width=x1-x0;o.height=y1-y0;o.getContext("2d").drawImage(cv,x0,y0,o.width,o.height,0,0,o.width,o.height);return o;
  }catch(e){return cv}
}
async function xdcPdfImgs(file){
  const lib=await pdfjsCarrega(),pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,imgs=[];
  for(let p=1;p<=Math.min(pdf.numPages,4);p++){
    const pg=await pdf.getPage(p),vp=pg.getViewport({scale:2}),cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
    const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);
    await pg.render({canvasContext:cx,viewport:vp}).promise;
    let c=xdcRecorta(cv);const m=1400/Math.max(c.width,c.height);
    if(m<1){const o=document.createElement("canvas");o.width=Math.round(c.width*m);o.height=Math.round(c.height*m);o.getContext("2d").drawImage(c,0,0,o.width,o.height);c=o}
    imgs.push(await blobDe(c,"image/jpeg",.85));
  }
  imgs.paginas=pdf.numPages;return imgs;
}
async function xdcImagem(file){
  const t=file.type||guessType(file);
  if(t==="application/pdf"){return await xdcPdfImgs(file)}
  if(/^image\//.test(t))return[await nfImgPrep(file,2000,.85)];
  return[];
}
function xdcHeur(nome){
  const n=xdcNorm(nome),m=[[/\brg\b|identidade/,"RG"],[/\bcpf\b/,"CPF"],[/\bcnh\b|habilitacao/,"CNH"],[/ctps|carteira de trabalho/,"CTPS"],[/cidadao/,"Cartão do Cidadão (NIS)"],[/\bpis\b|\bnis\b/,"PIS/NIS"],[/titulo/,"Título de eleitor"],[/nascimento/,"Certidão de nascimento"],[/casamento/,"Certidão de casamento"],[/residencia|endereco|conta de (luz|agua)/,"Comprovante de residência"],[/vacina/,"Cartão de vacinação"],[/\b3x4\b|foto 3x4|foto de rosto/,"Foto 3x4"],[/\baso\b/,"ASO"],[/atestado/,"Atestado médico"],[/contrato/,"Contrato"],[/diploma|certificado|curso/,"Diploma ou certificado"],[/coren|crm|crefito|conselho/,"Registro profissional (conselho)"],[/banco|pix|extrato/,"Comprovante bancário"]];
  const h=m.find(([re])=>re.test(n));return h?h[1]:"";
}
function xdcCpfOk(c){c=String(c).replace(/\D/g,"");if(c.length!==11||/^(\d)\1+$/.test(c))return false;
  for(const n of[9,10]){let t=0;for(let k=0;k<n;k++)t+=+c[k]*(n+1-k);const d=(t*10)%11%10;if(d!==+c[n])return false}return true}
function xdcPisOk(p){p=String(p).replace(/\D/g,"");if(p.length!==11)return false;const w=[3,2,9,8,7,6,5,4,3,2];let t=0;for(let k=0;k<10;k++)t+=+p[k]*w[k];const d=11-t%11;return(d>=10?0:d)===+p[10]}
const XDC_MESES={jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
/* aceita 1977-03-10, 10/03/1977, 10.03.1977, 10/MAR/1977, 10 de março de 1977 */
function xdcData(v){
  const t=String(v??"").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");if(!t||t==="null")return"";
  let m,y,mo,d;
  if(m=t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)){y=+m[1];mo=+m[2];d=+m[3]}
  else if(m=t.match(/^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})$/)){d=+m[1];mo=+m[2];y=+m[3]}
  else if(m=t.replace(/[^a-z0-9]+/g," ").trim().match(/^(\d{1,2}) (?:de )?([a-z]{3})[a-z]* (?:de )?(\d{4})$/)){d=+m[1];mo=XDC_MESES[m[2]];y=+m[3]}
  else return"";
  if(!mo||mo>12||!d||d>31||y<1900)return"";
  const iso=`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`,dt=new Date(iso+"T12:00:00");
  if(isNaN(dt)||dt.getDate()!==d||iso>hojeIso())return"";
  return iso;
}
const XDC_UF=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
/* NOME EM MAIÚSCULAS vira Nome em Maiúsculas (mantém UF e siglas curtas) */
function xdcTitulo(v){
  const t=String(v??"").replace(/\s+/g," ").trim();if(!t||t==="null")return"";
  const letras=t.replace(/[^A-Za-zÀ-ÿ]/g,"");if(letras&&letras!==letras.toUpperCase()&&letras!==letras.toLowerCase())return t;
  return t.toLowerCase().split(" ").map((w,k)=>{const W=w.toUpperCase();if(XDC_UF.has(W.replace(/[^A-Z]/g,""))&&W.replace(/[^A-Z]/g,"").length===2&&k>0)return W;if(k>0&&/^(da|de|do|das|dos|e)$/.test(w))return w;return w.replace(/(^|[-'(\/])([a-zà-ÿ])/g,(m,a,b)=>a+b.toUpperCase())}).join(" ");
}
const xdcTxt=(n,tc)=>v=>{const t=String(v??"").replace(/\s+/g," ").trim();if(!t||/^(null|undefined|-|—|n\/a)$/i.test(t)||t.length>n)return"";return tc?xdcTitulo(t):t};
const xdcCidUf=t=>String(t||"").replace(/\s*[-\/,]\s*([A-Za-z]{2})\.?$/,(m,u)=>XDC_UF.has(u.toUpperCase())?" - "+u.toUpperCase():m);
function xdcEstCivil(v){const t=xdcNorm(v);return /divorc/.test(t)?"Divorciado(a)":/separad/.test(t)?"Separado(a)":/viuv/.test(t)?"Viúvo(a)":/uniao|estavel/.test(t)?"União estável":/casad/.test(t)?"Casado(a)":/solteir/.test(t)?"Solteiro(a)":""}
const xdcDig=(min,max,f)=>v=>{const d=String(v??"").replace(/\D/g,"");return d.length>=min&&d.length<=max?(f?f(d):d):""};
const xdcFmt={
  cpf:xdcDig(11,11,d=>d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4")),
  pis:xdcDig(11,11,d=>d.replace(/(\d{3})(\d{5})(\d{2})(\d)/,"$1.$2.$3-$4")),
  cep:xdcDig(8,8,d=>d.replace(/(\d{5})(\d{3})/,"$1-$2")),
  nascimento:xdcData,rgEmissao:xdcData,
  rg:v=>{const t=xdcTxt(25)(v).replace(/^rg[:\s]*/i,"").trim();return (t.match(/\d/g)||[]).length>=5?t:""},
  rgOrgao:v=>xdcTxt(20)(v).toUpperCase(),
  ctps:v=>{const t=xdcTxt(40)(v);return (t.match(/\d/g)||[]).length>=4?t:""},
  titulo:xdcDig(10,13,d=>d.length===12?d.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3"):d),
  tituloZona:xdcDig(1,4),tituloSecao:xdcDig(1,4),
  cnh:xdcDig(9,11),
  naturalidade:v=>xdcCidUf(xdcTxt(80,true)(v)),mae:xdcTxt(90,true),pai:xdcTxt(90,true),
  estadoCivil:xdcEstCivil,
  endereco:xdcTxt(160,true),cidade:v=>xdcCidUf(xdcTxt(80,true)(v)),
  nomeCompleto:xdcTxt(120,true)
};
const XDC_CAMPOS=[["nomeCompleto","Nome completo"],["cpf","CPF"],["rg","RG"],["rgOrgao","Órgão emissor do RG"],["rgEmissao","Expedição do RG"],["nascimento","Nascimento"],["naturalidade","Naturalidade"],["mae","Nome da mãe"],["pai","Nome do pai"],["estadoCivil","Estado civil"],["pis","PIS/NIT"],["ctps","CTPS"],["titulo","Título de eleitor"],["tituloZona","Zona eleitoral"],["tituloSecao","Seção eleitoral"],["cnh","CNH"],["endereco","Endereço"],["cep","CEP"],["cidade","Cidade/UF"]];
function xdcDados(j){
  const d=j&&typeof j.dados==="object"&&j.dados?j.dados:{},o={};
  XDC_CAMPOS.forEach(([k])=>{if(k==="nomeCompleto")return;const v=xdcFmt[k](d[k]);if(v)o[k]=v});
  const nm=xdcFmt.nomeCompleto(j&&j.nome);if(nm)o.nomeCompleto=nm;
  return o;
}
/* o que o documento propõe para o cadastro: marcado por padrão só quando o campo está vazio e o número é válido */
function xdcPropostas(i,dados){
  return XDC_CAMPOS.filter(([k])=>dados[k]).map(([k,l])=>{
    const atual=String(i[k]||"").trim(),v=dados[k];
    if(k==="nomeCompleto"){
      /* só sugere o nome do documento quando ele completa o nome do cadastro (ex.: "Ana Cristina" → "Ana Cristina Francisco") */
      const A=xdcToks(atual),V=xdcToks(v);
      if(!(V.length>A.length&&A.every(t=>V.includes(t))))return null;
      return{k,l,valor:v,atual,invalido:false,igual:false,on:true};
    }
    const invalido=(k==="cpf"&&!xdcCpfOk(v))||(k==="pis"&&!xdcPisOk(v));
    const num=/\d/.test(v)&&!/[a-z]{3}/i.test(v);
    const igual=!!atual&&(num?atual.replace(/\D/g,"")===v.replace(/\D/g,""):xdcNorm(atual)===xdcNorm(v));
    return{k,l,valor:v,atual,invalido,igual,on:!invalido&&!igual&&!atual};
  }).filter(Boolean);
}
async function xdcJpeg(file,max,q){
  const bmp=await createImageBitmap(file),k=Math.min(1,max/Math.max(bmp.width,bmp.height)),cv=document.createElement("canvas");
  cv.width=Math.max(1,Math.round(bmp.width*k));cv.height=Math.max(1,Math.round(bmp.height*k));
  const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(bmp,0,0,cv.width,cv.height);
  return new Promise(r=>cv.toBlob(r,"image/jpeg",q));
}
/* fotos viram PDF (uma página por foto): bem menor que a foto original. Devolve null se não der (a foto original é guardada). */
async function xdcParaPdf(files,base){
  if(typeof PDFLib==="undefined")return null;
  try{
    const out=await PDFLib.PDFDocument.create();
    for(const f of files){
      if((f.type||guessType(f))==="application/pdf"){const src=await PDFLib.PDFDocument.load(new Uint8Array(await f.arrayBuffer()),{ignoreEncryption:true});(await out.copyPages(src,src.getPageIndices())).forEach(pg=>out.addPage(pg));continue}
      const b=await xdcJpeg(f,2000,.82),im=await out.embedJpg(new Uint8Array(await b.arrayBuffer())),k=Math.min(1,842/Math.max(im.width,im.height)),w=im.width*k,h=im.height*k;
      out.addPage([w,h]).drawImage(im,{x:0,y:0,width:w,height:h});
    }
    try{out.setTitle(base);out.setProducer("Casa Hiro")}catch(e){}
    return new File([await out.save()],base+".pdf",{type:"application/pdf"});
  }catch(e){return null}
}
const xdcEsperar=ms=>new Promise(r=>setTimeout(r,ms));
/* ---------- leitura sem IA: texto lido no próprio navegador (Tesseract), os arquivos não saem do computador ---------- */
const XOCR_DIR="/vendor/tesseract-7.0.0/";let _xocr=null;
function xocrSimd(){try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))}catch(e){return false}}
function xocrCarrega(){
  return _xocr||(_xocr=(async()=>{
    if(!window.Tesseract)await new Promise((ok,no)=>{const s=document.createElement("script");s.src=XOCR_DIR+"tesseract.min.js";s.onload=ok;s.onerror=()=>no(new Error("não consegui carregar o leitor"));document.head.appendChild(s)});
    return Tesseract.createWorker("por",1,{workerPath:XOCR_DIR+"worker.min.js",corePath:XOCR_DIR+(xocrSimd()?"tesseract-core-simd-lstm.wasm.js":"tesseract-core-lstm.wasm.js"),langPath:XOCR_DIR+"lang",workerBlobURL:false,gzip:true});
  })().catch(e=>{_xocr=null;throw e}));
}
async function xocrGira(blob,graus){
  const bmp=await createImageBitmap(blob),cv=document.createElement("canvas"),v=graus%180!==0;
  cv.width=v?bmp.height:bmp.width;cv.height=v?bmp.width:bmp.height;
  const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.translate(cv.width/2,cv.height/2);cx.rotate(graus*Math.PI/180);cx.drawImage(bmp,-bmp.width/2,-bmp.height/2);
  return blobDe(cv,"image/jpeg",.9);
}
/* lê uma imagem; se o texto vier fraco, tenta a foto girada (documento de lado ou de cabeça para baixo) */
async function xocrImagem(blob){
  const w=await xocrCarrega(),nota=d=>(d.confidence||0)*Math.min(1,(String(d.text||"").replace(/[^A-Za-z0-9]/g,"").length)/120);
  let melhor=(await w.recognize(blob)).data;
  if(nota(melhor)<45)for(const g of[90,270,180]){const d=(await w.recognize(await xocrGira(blob,g))).data;if(nota(d)>nota(melhor))melhor=d;if(nota(melhor)>=60)break}
  return String(melhor.text||"");
}
/* PDF digital já tem o texto; só PDF escaneado e foto passam pelo leitor */
async function xocrTextoArquivo(file,imgs){
  if((file.type||guessType(file))==="application/pdf"){
    try{const lib=await pdfjsCarrega(),pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let t="";
      for(let p=1;p<=Math.min(pdf.numPages,4);p++){const tc=await(await pdf.getPage(p)).getTextContent();let y=null;for(const it of tc.items){const yy=it.transform&&Math.round(it.transform[5]);t+=(y!==null&&yy!==y?"\n":" ")+it.str;y=yy}t+="\n"}
      if(t.replace(/\s/g,"").length>60)return t}catch(e){}
  }
  let t="";for(const b of imgs)t+=await xocrImagem(b)+"\n";return t;
}
const XOCR_TIPOS=[[/CARTEIRA NACIONAL DE HABILITA|PERMISSAO PARA DIRIGIR/,"CNH"],[/CARTEIRA DE TRABALHO/,"CTPS"],[/TITULO ELEITORAL|TITULO DE ELEITOR|JUSTICA ELEITORAL/,"Título de eleitor"],[/CARTAO DO CIDADAO/,"Cartão do Cidadão (NIS)"],
  [/CERTIDAO DE NASCIMENTO/,"Certidão de nascimento"],[/CERTIDAO DE CASAMENTO/,"Certidão de casamento"],[/CARTEIRA DE IDENTIDADE|REGISTRO GERAL|CEDULA DE IDENTIDADE|IDENTIDADE NACIONAL/,"RG"],
  [/CADASTRO DE PESSOAS? FISICAS?|COMPROVANTE DE INSCRICAO NO CPF|CARTAO CPF/,"CPF"],[/\b(NIT|PIS|PASEP|NIS)\b.{0,40}(INSCRICAO|CADASTRO|COMPROVANTE)|(INSCRICAO|CADASTRO|COMPROVANTE).{0,40}\b(NIT|PIS|PASEP|NIS)\b/,"PIS/NIS"],
  [/RESERVISTA|CERTIFICADO DE DISPENSA/,"Reservista"],[/VACINA/,"Cartão de vacinação"],[/ATESTADO DE SAUDE OCUPACIONAL|\bA\.?S\.?O\b/,"ASO"],[/ATESTADO/,"Atestado médico"],
  [/CONTA DE (LUZ|AGUA|ENERGIA)|SABESP|ELEKTRO|ENEL|CONSUMO.{0,30}(KWH|M3)|FATURA|2A VIA/,"Comprovante de residência"]];
function xocrExtrai(texto,file){
  const L=String(texto).split(/\n+/).map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean);
  const U=L.map(l=>l.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()),TU=U.join("\n");
  const tipo=(XOCR_TIPOS.find(([re])=>re.test(TU))||[])[1]||xdcHeur(file.name||"")||"Outro";
  // números: corrige letras que o leitor confunde com algarismos (O→0, I/l→1, S→5, B→8) só em trechos quase todos numéricos
  const limpaNum=s=>s.replace(/[0-9OoIlSB][0-9OoIlSB.\-\/ ]{6,20}[0-9OoIlSBX]/g,m=>((m.match(/\d/g)||[]).length>=m.replace(/[.\-\/ ]/g,"").length*.7)?m.replace(/[Oo]/g,"0").replace(/[Il]/g,"1").replace(/S/g,"5").replace(/B/g,"8"):m);
  const UN=U.map(limpaNum);
  const perto=(re,n=2)=>{const r=[];UN.forEach((l,k)=>{const m=l.search(re);if(m>=0){r.push(l.slice(m));for(let j=1;j<=n&&k+j<UN.length;j++)r.push(UN[k+j])}});return r};
  const digs=s=>(s.match(/\d[\d.\-\/ ]{7,18}\d/g)||[]).map(x=>x.replace(/\D/g,""));
  const todos=digs(UN.join("\n"));
  const dados={};
  const cpf=[...digs(perto(/CPF/).join(" ")),...todos].find(d=>d.length===11&&xdcCpfOk(d));if(cpf)dados.cpf=cpf;
  if(/\b(PIS|NIT|NIS|PASEP)\b/.test(TU)){const pis=[...digs(perto(/\b(PIS|NIT|NIS|PASEP)\b/).join(" ")),...todos].find(d=>d.length===11&&d!==cpf&&xdcPisOk(d));if(pis)dados.pis=pis}
  const data=(re,n=2)=>{for(const l of perto(re,n)){const m=l.match(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})/);if(m){const v=xdcData(m[1]+"/"+m[2]+"/"+m[3]);if(v)return v}}return""};
  const nasc=data(/NASCIMENTO|DATA DE NASC|\bNASC\b/);if(nasc)dados.nascimento=nasc;
  if(tipo==="RG"){const e=data(/EXPEDI|EMISSAO/);if(e)dados.rgEmissao=e}
  if(tipo==="RG"||/REGISTRO GERAL/.test(TU)){for(const l of perto(/REGISTRO GERAL|\bR\.?G\.?\b|IDENTIDADE/,1)){const m=l.match(/\b\d{1,3}[.\s]?\d{3}[.\s]?\d{3}[\-\s]?[\dX]\b/);if(m&&m[0].replace(/\D/g,"")!==cpf){dados.rg=m[0].replace(/\s/g,"");break}}}
  const texto1=(re,n=1,ok=/^[A-Z ]{5,}$/,min=2)=>{for(const l of perto(re,n)){const t=l.replace(re,"").replace(/^[\s:.\-]+/,"").trim();if(ok.test(t)&&t.split(" ").filter(x=>x.length>1).length>=min)return t}return""};
  const nome=texto1(/^NOME( CIVIL)?\b(?! D[AO] (MAE|PAI))|(?<!D[AO] (MAE|PAI) )\bNOME:(?! ?D[AO] (MAE|PAI))/);
  // texto sem a parte da filiação (para saber se o nome do integrante aparece como titular)
  const semFil=[];let pula=0;UN.forEach(l=>{if(/FILIACAO/.test(l)){pula=3;return}if(/\b(MAE|PAI)\b/.test(l)){pula=Math.max(pula,1);return}if(pula>0){pula--;return}semFil.push(l)});
  const nat=texto1(/NATURALIDADE/,1,/^[A-Z][A-Z .\-\/]{3,}$/,1);if(nat)dados.naturalidade=nat;
  const mae=texto1(/\bMAE\b:?/);if(mae)dados.mae=mae;const pai=texto1(/\bPAI\b:?/);if(pai)dados.pai=pai;
  const fil=[];UN.forEach((l,k)=>{if(/FILIACAO/.test(l))for(let j=1;j<=3&&k+j<UN.length;j++){const t=UN[k+j].trim();if(/^[A-Z ]{5,}$/.test(t)&&t.split(" ").length>=2)fil.push(t)}});
  if(tipo==="Título de eleitor"){const t=digs(perto(/INSCRICAO/).join(" ")).find(d=>d.length===12);if(t)dados.titulo=t;
    const z=(perto(/ZONA/,1).join(" ").match(/ZONA\D{0,6}(\d{1,4})/)||[])[1];if(z)dados.tituloZona=z;const s=(perto(/SECAO/,1).join(" ").match(/SECAO\D{0,6}(\d{1,4})/)||[])[1];if(s)dados.tituloSecao=s}
  if(tipo==="CNH"){const r=digs(perto(/REGISTRO/).join(" ")).find(d=>d.length===11&&d!==cpf);if(r)dados.cnh=r}
  if(tipo==="Comprovante de residência"){const c=(perto(/CEP/,1).join(" ").match(/\b\d{5}-?\d{3}\b/)||UN.join(" ").match(/\b\d{5}-\d{3}\b/)||[])[0];if(c)dados.cep=c}
  const validade=data(/VALIDADE/,1);
  return{tipo,nome,filiacao:fil.slice(0,2),lado:null,paginas:0,validade,legivel:L.join("").replace(/[^A-Za-z0-9]/g,"").length>=20,dados:xdcDados({nome,dados}),ocr:true,txt:semFil.join("\n")};
}
async function xocrLe(file,imgs){
  try{const t=await xocrTextoArquivo(file,imgs);const r=xocrExtrai(t,file);r.paginas=imgs.paginas||imgs.length||0;return r}
  catch(e){console.error(e);return{erro:"não consegui ler no navegador ("+((e&&e.message)||e)+")"}}
}
async function xdcLe(i,file){
  let imgs=[];
  try{imgs=await xdcImagem(file)}catch(e){}
  if(!imgs.length)return{erro:"não consegui abrir a imagem"};
  if(!RT.sample)return xocrLe(file,imgs);
  for(let t=0;t<4;t++){
    try{
      const j=await RT.sample.json(XDC_PROMPT(i,imgs.paginas,imgs.length),{images:imgs,modelTier:"default"});
      if(!j||typeof j!=="object")return{erro:"resposta vazia"};
      return{tipo:XDC_TIPOS.includes(j.tipo)?j.tipo:"Outro",nome:j.nome&&String(j.nome).trim()!=="null"?String(j.nome).trim():"",filiacao:Array.isArray(j.filiacao)?j.filiacao.filter(Boolean).map(String):[],lado:xdcLadoNorm(j.lado),paginas:imgs.paginas||0,validade:/^\d{4}-\d{2}-\d{2}$/.test(j.validade||"")?j.validade:"",legivel:j.legivel!==false,temIntegrante:j.aparece_integrante===true||j.aparece_integrante==="true",dados:xdcDados(j)};
    }catch(e){
      const c=e&&e.code;
      if(c==="rate_limited"&&t<3){await xdcEsperar(20000);continue}
      if(c==="not_granted"||c==="ia_off")return xocrLe(file,imgs);
      return{erro:c==="not_granted"?"a leitura por IA não está liberada":c==="rate_limited"?"limite de leituras":(e&&e.message)||"falha na leitura",semIA:c==="not_granted"};
    }
  }
  return{erro:"limite de leituras"};
}

/* ---------- tela de conferência ---------- */
const XDC={rows:[],autoPadrao:true};
const xdcThumb=r=>r.file&&/^image\//.test(r.file.type||"")?`<img src="${r.url}" alt="">`:r.doc&&/^image\//.test(r.doc.type||"")?`<img src="/_blob/${r.doc.assetId}" alt="">`:`<div class="xdcpdf">PDF</div>`;
function xdcBlocoDados(r){
  const P=r.props||[];if(!P.length||r.quem!=="colab"||!podePii())return`<div class="xdcdados" hidden></div>`;
  return`<div class="xdcdados"><div class="xdcdt">Dados lidos neste documento: marque os que devem ir para o cadastro</div>${P.map(p=>`<label class="xdcdd ${p.invalido?"bad":""}"><input type="checkbox" data-dk="${p.k}" ${p.on?"checked":""}> <span class="xdcdl">${esc(p.l)}</span><input data-dv="${p.k}" value="${esc(p.valor)}">${p.invalido?`<em>dígito verificador não confere, confira no documento</em>`:p.igual?`<em>já confere com o cadastro</em>`:p.atual?`<em>cadastro tem: ${esc(p.atual)}</em>`:""}</label>`).join("")}</div>`;
}
function xdcSelo(r){
  if(r.estado==="lendo")return`<span class="xdcb wait">Identificando…${r.tipo&&r.tipo!=="Outro"?` (parece ${esc(r.tipo)}${r.lado?`, ${xdcLadoNome[r.lado].toLowerCase()}`:""})`:""}</span>`;
  const t=r.tipo==="Outro"?(r.outro||"Outro documento"):r.tipo,de=r.quem==="familiar"?` de ${esc(r.pessoa||"familiar")}`:"";
  return`<span class="xdcb tipo">${esc(t)}${de}</span><span class="xdcb lado ${r.lado||"nenhum"}">${r.lado?xdcLadoNome[r.lado]:"Sem lados"}</span>${r.paginas>1?`<span class="xdcb pg">${r.paginas} páginas</span>`:""}`;
}
function xdcLinha(i,r){
  const st=r.estado==="lendo"?`<span class="xdcst">Lendo…</span>`:r.estado==="erro"?`<span class="xdcst err">Não consegui ler (${esc(r.msg||"")}). Escolha o tipo.</span>`:r.estado==="ok"?`<span class="xdcst ok">Lido pelo sistema. Confira.</span>`:"";
  return `<div class="xdcrow" data-xr="${r.id}">
   <div class="xdcth">${xdcThumb(r)}</div>
   <div class="xdcf">
    <div class="xdcor">${esc(r.orig)} ${st}</div>
    <div class="xdcbadge" data-xbadge>${xdcSelo(r)}</div>
    <div class="xdcg">
     <label>Documento<select data-f="tipo">${XDC_TIPOS.map(t=>`<option ${t===r.tipo?"selected":""}>${esc(t)}</option>`).join("")}</select></label>
     <label>De quem<select data-f="quem"><option value="colab" ${r.quem==="colab"?"selected":""}>${esc(nomeInteg(i))}</option><option value="familiar" ${r.quem==="familiar"?"selected":""}>Familiar</option></select></label>
     <label class="xdcfam" ${r.quem==="familiar"?"":"hidden"}>Nome do familiar<input data-f="pessoa" value="${esc(r.pessoa||"")}"></label>
     <label class="xdcfam" ${r.quem==="familiar"?"":"hidden"}>Parentesco<select data-f="parent">${["filho(a)","cônjuge","pai","mãe","familiar"].map(p=>`<option ${p===r.parent?"selected":""}>${p}</option>`).join("")}</select></label>
     <label class="xdcout" ${r.tipo==="Outro"?"":"hidden"}>Qual documento<input data-f="outro" value="${esc(r.outro||"")}" placeholder="ex.: Carteira de reservista"></label>
     <label>Frente/verso<select data-f="lado"><option value="">Sem lados</option><option value="frente" ${r.lado==="frente"?"selected":""}>Frente</option><option value="verso" ${r.lado==="verso"?"selected":""}>Verso</option><option value="ambos" ${r.lado==="ambos"?"selected":""}>Frente e verso</option></select></label>
    </div>
    <label class="xdcnm">Nome que será salvo<input data-f="nome" value="${esc(r.nome)}"></label>
    ${xdcBlocoDados(r)}
   </div>
   <button class="b sec sm xdcx" data-xx="${r.id}" title="Tirar da lista">${ic("trash")}</button>
  </div>`;
}
function xdcRecompoe(i,r,el){
  if(!r.nomeEd)r.nome=xdcNomeFinal(i,r);
  if(r.tipo!=="Outro")r.cat=XDC_CAT[r.tipo]||"Documentos pessoais";else r.cat="Outros";
}
function xdcAbre(i,itens){
  if(!podeEd("pront"))return toast("Você só pode consultar esta tela.",true);
  XDC.rows=itens.map(it=>{
    const f=it.file||null,d=it.doc||null,orig=f?f.name:d.nome;
    const tipo0=(d&&d.rotulo&&xdcHeur(d.rotulo))||xdcHeur(orig)||"Outro";
    const r={id:xdcId(),...(it.leu?{leu:it.leu}:{}),file:f,doc:d,orig,url:f&&/^image\//.test(f.type||"")?URL.createObjectURL(f):"",tipo:tipo0,quem:"colab",pessoa:"",parent:"filho(a)",lado:"",outro:"",validade:"",estado:"lendo",nomeEd:false,nome:""};r.lado=xdcHeurLado(orig)||(d&&xdcHeurLado(d.rotulo))||"";
    xdcRecompoe(i,r);return r;
  });
  const ov=openModal(`<h3>Conferir documentos de ${esc(nomeInteg(i))}</h3>
   <p class="sub">O sistema olha cada arquivo, descobre o documento e de quem é, e sugere o nome. Os arquivos são guardados em PDF, com o nome <b>DOCUMENTO - NOME DO INTEGRANTE</b>. Corrija o que precisar; se o item acima estiver marcado, o que foi lido bem é salvo sozinho e só ficam aqui os que precisam da sua ajuda. ${RT.sample?"A leitura usa IA (Claude): as imagens são enviadas ao serviço só para identificar o documento.":"A leitura é feita aqui no navegador, sem enviar os documentos para fora. Ela erra mais que a IA: confira o tipo e os números de cada arquivo."}</p>
   <div class="xdcopc"><label><input type="checkbox" id="xdcauto" ${XDC.autoPadrao?"checked":""}> Salvar sozinho quando terminar de ler</label><label><input type="checkbox" id="xdcjunta" checked> Juntar frente e verso no mesmo PDF</label></div>
   <div class="xdcprog sub" id="xdcprog"></div>
   <div id="xdclist" class="xdclist">${XDC.rows.map(r=>xdcLinha(i,r)).join("")}</div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap"><button class="b sec" id="xdccancel">Cancelar</button><button class="b" id="xdcsave">Salvar ${XDC.rows.length} documento(s)</button></div>`);
  const box=ov.querySelector(".modal")||ov.firstElementChild;if(box){box.style.maxWidth="760px";box.style.width="96vw"}
  const list=ov.querySelector("#xdclist");
  const rebind=(row)=>{
    const r=XDC.rows.find(x=>x.id===row.dataset.xr);if(!r)return;
    row.querySelectorAll("[data-f]").forEach(c=>{c.onchange=c.oninput=()=>{
      const f=c.dataset.f;r[f]=c.value;
      if(f==="nome"){r.nomeEd=true;return}
      xdcRecompoe(i,r);
      const sl=row.querySelector("[data-xbadge]");if(sl)sl.innerHTML=xdcSelo(r);
      const nm=row.querySelector('[data-f="nome"]');if(nm&&!r.nomeEd)nm.value=r.nome;
      if(f==="quem"){row.querySelectorAll(".xdcfam").forEach(e=>e.hidden=r.quem!=="familiar");const dd=row.querySelector(".xdcdados");if(dd&&(r.props||[]).length)dd.outerHTML=xdcBlocoDados(r),rebind(row)}
      if(f==="tipo")row.querySelector(".xdcout").hidden=r.tipo!=="Outro";
    }});
    row.querySelectorAll("[data-dk]").forEach(c=>c.onchange=()=>{const p=(r.props||[]).find(x=>x.k===c.dataset.dk);if(p)p.on=c.checked});
    row.querySelectorAll("[data-dv]").forEach(c=>c.oninput=()=>{const p=(r.props||[]).find(x=>x.k===c.dataset.dv);if(p){p.valor=c.value;const b=row.querySelector(`[data-dk="${p.k}"]`);if(b&&c.value.trim()&&!p.atual){b.checked=p.on=true}}});
    row.querySelector("[data-xx]").onclick=()=>{XDC.rows=XDC.rows.filter(x=>x.id!==r.id);row.remove();cont()};
  };
  const cont=()=>{const b=ov.querySelector("#xdcsave");if(b)b.textContent=`Salvar ${XDC.rows.length} documento(s)`;const lendo=XDC.rows.filter(r=>r.estado==="lendo").length;ov.querySelector("#xdcprog").textContent=lendo?`Lendo ${lendo} de ${itens.length}…`:""};
  list.querySelectorAll(".xdcrow").forEach(rebind);cont();
  ov.querySelector("#xdccancel").onclick=()=>{XDC.rows.forEach(r=>r.url&&URL.revokeObjectURL(r.url));XDC.rows=[];ov.remove()};
  // leitura com 3 em paralelo
  const fila=XDC.rows.slice();let semIA=false;
  const trab=async()=>{
    while(fila.length){
      const r=fila.shift();if(!XDC.rows.includes(r))continue;
      let arq=r.file;
      if(!arq&&r.doc){try{const b=await (await fetch("/_blob/"+r.doc.assetId)).blob();arq=new File([b],r.doc.nome,{type:r.doc.type})}catch(e){}}
      const leu=r.leu||(semIA||!arq?{erro:"sem leitura automática"}:await xdcLe(i,arq))||{erro:"sem resposta"};delete r.leu;
      if(leu.semIA)semIA=true;
      if(!XDC.rows.includes(r))continue;
      if(leu.erro){r.estado="erro";r.msg=leu.erro}
      else{
        r.estado="ok";r.tipo=leu.tipo;r.lado=leu.lado||r.lado;r.paginas=leu.paginas||0;r.validade=leu.validade;
        const t=xdcTitular(i,leu);
        if(t.troca&&leu.dados){const d=leu.dados={...leu.dados};delete d.nomeCompleto;["mae","pai"].forEach(k=>{if(d[k]&&xdcMesmoNome(d[k],xdcNomeC(i)))delete d[k]})}
        r.quem=t.quem;r.pessoa=t.pessoa;r.parent=t.parent;r.props=xdcPropostas(S.integrantes[i.id]||i,leu.dados||{});r.dados=leu.dados||{};
        if(!leu.legivel){r.estado="erro";r.msg="imagem difícil de ler"}
      }
      xdcRecompoe(i,r);
      const row=list.querySelector(`[data-xr="${r.id}"]`);
      if(row){row.outerHTML=xdcLinha(i,r);rebind(list.querySelector(`[data-xr="${r.id}"]`))}
      cont();
    }
  };
  const salvar=async(auto)=>{
    const bt=ov.querySelector("#xdcsave");if(!bt||bt.disabled)return;bt.disabled=true;
    const pr=ov.querySelector("#xdcprog");pr.textContent="Salvando…";
    const usados=new Set(docsOf(i.id).map(d=>d.nome));
    const rows=XDC.rows.filter(r=>auto?r.estado==="ok":r.estado!=="lendo");
    const jc=ov.querySelector("#xdcjunta"),juntar=(!jc||jc.checked)&&typeof PDFLib!=="undefined";
    const grupos=new Map(),absorvidos=new Set(),extras=new Map();
    if(juntar)rows.forEach(r=>{if((r.lado==="frente"||r.lado==="verso")){const k=[r.tipo,r.quem,xdcNorm(r.pessoa),r.outro].join("|");if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(r)}});
    grupos.forEach(g=>{const fr=g.find(r=>r.lado==="frente"),ve=g.find(r=>r.lado==="verso");
      if(fr&&ve&&g.length===2){absorvidos.add(ve);extras.set(fr,[fr,ve]);fr.lado="ambos";if(!fr.nomeEd)fr.nome=xdcNomeFinal(i,fr)}});
    const res={salvos:[],semPdf:0,campos:[],conflitos:[],feitos:new Set(),avisos:[]};
    const getSrc=async x=>{if(x.file)return x.file;try{const bl=await(await fetch("/_blob/"+x.doc.assetId)).blob();return new File([bl],x.doc.nome,{type:x.doc.type})}catch(e){return null}};
    {const vis=new Map();rows.forEach(r=>{if(absorvidos.has(r)||(r.lado!=="frente"&&r.lado!=="verso"))return;const k=[r.tipo,r.quem,xdcNorm(r.pessoa),r.outro,r.lado].join("|");vis.set(k,(vis.get(k)||[]).concat(r))});
      vis.forEach(g=>{if(g.length>1)res.avisos.push(`${g.length} arquivos de ${g[0].tipo==="Outro"?(g[0].outro||"Outro"):g[0].tipo} só mostram a ${xdcLadoNome[g[0].lado].toLowerCase()}: pode ser o mesmo lado enviado duas vezes, ou falta o outro lado.`)});}
    for(const r of rows){
      if(absorvidos.has(r)){
        res.feitos.add(r);continue}
      const meta={tipoDoc:r.tipo==="Outro"?(r.outro||"Outro"):r.tipo,titular:r.quem==="familiar"?"familiar":"colaborador",...(r.quem==="familiar"?{pessoa:r.pessoa||"",parentesco:r.parent}:{}),...(r.validade?{validade:r.validade}:{}),...(r.lado?{lado:r.lado}:{})};
      const base0=xdcSemExt(r.nome.trim()||r.orig);
      const nomeLivre=ext=>{let nome=base0+ext,n=2;while(usados.has(nome))nome=`${base0} (${n++})${ext}`;usados.add(nome);return nome};
      try{
        let arq=null,srcFile=await getSrc(r);const juntou=extras.has(r);
        const tipoArq=srcFile?(srcFile.type||guessType(srcFile)):"";
        if(juntou){
          const fs=(await Promise.all(extras.get(r).map(getSrc))).filter(Boolean);
          arq=fs.length===2?await xdcParaPdf(fs,base0):null;
          if(!arq){
            res.semPdf++;meta.lado="frente";
            for(const x of extras.get(r)){if(x===r)continue;const f2=await getSrc(x);if(!f2)continue;
              if(x.file){const id2=await uploadDoc(i.id,f2,x.cat);put("docs",id2,{...strip(S.docs[id2]),nome:nomeLivre(xdcExt(f2.name)||".bin"),...meta,lado:"verso"});res.salvos.push(S.docs[id2].nome)}
              else{const o2={...strip(x.doc),cat:x.cat,...meta,lado:"verso",nome:nomeLivre(xdcExt(x.doc.nome)||".bin")};delete o2.pendente;put("docs",x.doc.id,o2);res.salvos.push(o2.nome)}}
          }else for(const x of extras.get(r)){if(x!==r&&!x.file&&x.doc){try{await RT.assets.delete(x.doc.assetId)}catch(e){}try{del("docs",x.doc.id)}catch(e){}}}
        }else if(srcFile&&/^image\//.test(tipoArq)){
          arq=await xdcParaPdf([srcFile],base0);
          if(!arq)res.semPdf++;
        }else if(srcFile&&tipoArq==="application/pdf")arq=new File([srcFile],base0+".pdf",{type:"application/pdf"});
        if(r.file||!r.doc){
          const f=arq||new File([r.file],base0+xdcExt(r.file.name),{type:r.file.type||guessType(r.file)});
          const nome=nomeLivre(xdcExt(f.name)||".pdf");
          const id=await uploadDoc(i.id,f,r.cat);
          put("docs",id,{...strip(S.docs[id]),nome,...meta});res.salvos.push(nome);
        }else{
          const o={...strip(r.doc),cat:r.cat,...meta};delete o.pendente;
          if(arq&&arq.type==="application/pdf"&&(juntou||r.doc.type!=="application/pdf")&&RT.assets){
            const up=await RT.assets.upload(arq,{type:"application/pdf"});
            try{await RT.assets.delete(r.doc.assetId)}catch(e){}
            o.assetId=up.id;o.size=up.sizeBytes;o.type=up.contentType||"application/pdf";
          }
          o.nome=nomeLivre(o.type==="application/pdf"?".pdf":xdcExt(r.doc.nome));
          put("docs",r.doc.id,o);res.salvos.push(o.nome);
        }
        res.feitos.add(r);
      }catch(e){toast(e.message,true)}
    }
    // dados para o cadastro: o que está marcado entra; o resto vira "para conferir"
    const patch={};
    if(podePii())for(const r of rows){
      if(r.quem!=="colab"||!res.feitos.has(r))continue;
      for(const p of(r.props||[])){
        const v=String(p.valor||"").trim();if(!v)continue;
        const f=xdcFmt[p.k](v);
        if(p.on&&f&&patch[p.k]===undefined){patch[p.k]=f;res.campos.push(p.l)}
        else if(p.on&&f&&String(patch[p.k]).toLowerCase()!==f.toLowerCase()&&(/\d/.test(f)?String(patch[p.k]).replace(/\D/g,"")!==f.replace(/\D/g,""):xdcNorm(patch[p.k])!==xdcNorm(f)))res.conflitos.push({k:p.k,l:p.l+" (outro documento)",valor:f,atual:patch[p.k],invalido:p.invalido});
        else if(!p.on&&!p.igual&&f)res.conflitos.push({k:p.k,l:p.l,valor:f,atual:p.atual,invalido:p.invalido});
      }
    }
    if(res.campos.length){const atual=S.integrantes[i.id]||i,velho=nomeInteg(atual);put("integrantes",i.id,{...strip(atual),...patch});
      const novo=nomeInteg(S.integrantes[i.id]||{...atual,...patch});
      if(patch.nomeCompleto&&novo!==velho){const suf=" - "+velho;res.salvos=res.salvos.map(n=>{const d=Object.values(S.docs).find(x=>x.uid===i.id&&x.nome===n);if(!d)return n;const ext=xdcExt(n),b=xdcSemExt(n);if(!b.endsWith(suf))return n;const nn=b.slice(0,-suf.length)+" - "+novo+ext;put("docs",d.id,{...strip(d),nome:nn});return nn})}try{audit("Cadastro preenchido por documento",nomeInteg(i)+": "+res.campos.join(", "))}catch(e){}}
    if(podePii()){const deps=xdcDepsDe(rows.filter(r=>res.feitos.has(r)));if(deps.length){const atual=S.integrantes[i.id]||i,r2=xdcJuntaDeps(atual.dependentes||[],deps);if(r2.mudou){put("integrantes",i.id,{...strip(atual),dependentes:r2.lista});res.deps=r2.nomes}}}
    try{audit("Documentos enviados",res.salvos.length+" arquivo(s) de "+nomeInteg(i))}catch(e){}
    res.feitos.forEach(r=>{r.url&&URL.revokeObjectURL(r.url);const el=list.querySelector(`[data-xr="${r.id}"]`);if(el)el.remove()});
    XDC.rows=XDC.rows.filter(r=>!res.feitos.has(r));
    bt.disabled=false;cont();
    if(XDC.rows.length&&auto){toast(`${res.salvos.length} documento(s) salvo(s). ${XDC.rows.length} precisam da sua ajuda: escolha o tipo e toque em Salvar.`)}
    else{XDC.rows.forEach(r=>r.url&&URL.revokeObjectURL(r.url));XDC.rows=[];ov.remove();xdcResumo(i,res)}
    go("pront",true);
  };
  ov.querySelector("#xdcsave").onclick=()=>salvar(false);
  Promise.all([trab(),trab(),trab()]).then(()=>{
    XDC.rows.forEach(r=>{if(r.estado==="lendo")r.estado="erro"});cont();
    const au=ov.querySelector("#xdcauto");
    if(au&&au.checked&&XDC.rows.some(r=>r.estado==="ok"))salvar(true);
  });
}
function xdcResumo(i,res){
  const ov=openModal(`<h3>Documentos de ${esc(nomeInteg(i))} organizados</h3>
   <p class="sub">${res.salvos.length} arquivo(s) salvo(s) em PDF com o nome do documento${res.campos.length?`; ${res.campos.length} dado(s) preenchido(s) no cadastro (${esc(res.campos.join(", "))})`:""}.${res.semPdf?` ${res.semPdf} foto(s) não puderam virar PDF e foram guardadas como estavam.`:""}${(res.deps||[]).length?` Dependentes atualizados: ${esc(res.deps.join(", "))}.`:""} Para trocar um nome, use o botão de renomear na lista.</p>
   ${!res.campos.length&&!res.conflitos.length&&!(res.deps||[]).length&&podePii()?`<div class="callout sand" style="margin:8px 0">Nenhum dado de cadastro foi lido destes arquivos. Se eles têm CPF, RG ou outros números, abra a aba <b>Dados</b> e toque em <b>Ler dados dos documentos</b>, ou preencha à mão.</div>`:""}
   <div class="xdcres">${res.salvos.map(n=>`<div>${esc(n)}</div>`).join("")}</div>
   ${(res.avisos||[]).length?`<div class="callout sand" style="margin-top:10px"><b>Atenção</b>${res.avisos.map(a=>`<div class="xdcconf1">${esc(a)}</div>`).join("")}</div>`:""}
   ${res.conflitos.length?`<div class="callout sand" style="margin-top:10px"><b>Dados para você conferir</b> (não foram aplicados):${res.conflitos.map((c,n)=>`<div class="xdcconf1">${esc(c.l)}: lido <b>${esc(c.valor)}</b>${c.atual?`, cadastro tem <b>${esc(c.atual)}</b>`:""}${c.invalido?` <em>(dígito verificador não confere)</em>`:""} <button class="b sec sm" data-xap="${n}">Usar o lido</button></div>`).join("")}</div>`:""}
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b" id="xdcrok">Pronto</button></div>`);
  ov.querySelector("#xdcrok").onclick=()=>ov.remove();
  ov.querySelectorAll("[data-xap]").forEach(b=>b.onclick=()=>{
    const c=res.conflitos[+b.dataset.xap],atual=S.integrantes[i.id]||i;
    put("integrantes",i.id,{...strip(atual),[c.k]:c.valor});try{audit("Cadastro preenchido por documento",nomeInteg(i)+": "+c.l)}catch(e){}
    b.textContent="Aplicado";b.disabled=true;
  });
}
sendFiles=async function(i,files){if(files&&files.length)xdcAbre(i,[...files].map(f=>({file:f})))};

/* ---------- link de envio ---------- */
const xdcB64u=u8=>btoa(String.fromCharCode(...u8)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function xdcHash(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const xdcLinksDe=id=>Object.values(S.links||{}).filter(l=>l.uid===id).sort((a,b)=>String(b.criado).localeCompare(String(a.criado)));
const xdcVivo=l=>l.ativo!==false&&(!l.exp||Date.parse(l.exp)>Date.now());
function xdcAddDias(n){const d=new Date();d.setDate(d.getDate()+n);d.setHours(23,59,0,0);return d.toISOString()}
function xdcModalLink(i){
  if(!podeEd("pront"))return toast("Você só pode consultar esta tela.",true);
  if(!RT.envio){const o=openModal(`<h3>Link de envio</h3><p>O link para o integrante enviar documentos precisa do servidor da Casa Hiro e funciona na versão hospedada (hiro360.com.br). Nesta versão, arraste os arquivos para a área de envio.</p><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b" id="xdcok">Entendi</button></div>`);o.querySelector("#xdcok").onclick=()=>o.remove();return}
  const ov=openModal(`<h3>Link para ${esc(nomeInteg(i))} enviar documentos</h3>
   <p class="sub">Marque o que você precisa. O integrante abre o link no celular, sem senha, e envia fotos ou PDFs. Tudo chega aqui para você conferir antes de entrar na pasta.</p>
   <div class="xdcped">${XDC_PEDIDOS.map((p,n)=>`<label class="xdcck"><input type="checkbox" data-pd="${n}" ${n<9?"checked":""}> ${esc(p)}</label>`).join("")}</div>
   <label>Outro documento (opcional)<input id="xdcextra" placeholder="ex.: Carteirinha do COREN"></label>
   <label>O link vale por<select id="xdcdias"><option value="3">3 dias</option><option value="7" selected>7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option></select></label>
   <div id="xdcres"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap"><button class="b sec" id="xdcfecha">Fechar</button><button class="b" id="xdcgera">Gerar link</button></div>`);
  ov.querySelector("#xdcfecha").onclick=()=>ov.remove();
  ov.querySelector("#xdcgera").onclick=async()=>{
    const ped=[...ov.querySelectorAll("[data-pd]:checked")].map(c=>XDC_PEDIDOS[+c.dataset.pd]);
    const ex=ov.querySelector("#xdcextra").value.trim();if(ex)ped.push(ex);
    if(!ped.length)return toast("Marque pelo menos um documento.",true);
    const dias=+ov.querySelector("#xdcdias").value;
    const tok=xdcB64u(crypto.getRandomValues(new Uint8Array(32))),h=await xdcHash(tok);
    put("links",h,{uid:i.id,nome:xdcPrimeiro(nomeInteg(i)),pedidos:ped,criado:new Date().toISOString(),exp:xdcAddDias(dias),ativo:true,max:60,recebidos:0,enviados:[],por:(typeof f4Quem==="function"&&f4Quem())||""});
    try{audit("Link de documentos criado",nomeInteg(i))}catch(e){}
    const url=location.origin+"/envio/"+tok,vale=new Date(xdcAddDias(dias)).toLocaleDateString("pt-BR");
    const tel=String(i.telefone||"").replace(/\D/g,""),wa=tel.length>=10?"https://wa.me/"+(tel.length<=11?"55":"")+tel+"?text=":"https://wa.me/?text=";
    const txt=`Olá, ${xdcPrimeiro(nomeInteg(i))}! A Casa Hiro precisa dos seus documentos para o cadastro. Envie pelo celular neste link (vale até ${vale}): ${url}`;
    ov.querySelector("#xdcres").innerHTML=`<div class="callout blue" style="margin-top:10px"><b>Link criado.</b> Copie agora: por segurança ele não fica guardado no sistema. Se perder, gere outro.
      <input id="xdcurl" readonly value="${esc(url)}" style="margin-top:6px;width:100%">
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="b sm" id="xdccopia">Copiar link</button><a class="b sec sm" style="text-decoration:none" target="_blank" rel="noopener" href="${esc(wa+encodeURIComponent(txt))}">Abrir no WhatsApp</a></div></div>`;
    ov.querySelector("#xdccopia").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("Link copiado.")}catch(e){const f=ov.querySelector("#xdcurl");f.select();toast("Selecione e copie o link.")}};
    ov.querySelector("#xdcgera").hidden=true;
  };
}

/* ---------- parte de cima da aba Documentos ---------- */
function xdcTopo(i){
  const pend=Object.values(S.docs).filter(d=>d.uid===i.id&&d.pendente).sort((a,b)=>String(a.em).localeCompare(String(b.em)));
  const lk=xdcLinksDe(i.id).slice(0,5);
  let h=`<div class="row" style="margin-bottom:10px;gap:8px;flex-wrap:wrap"><button class="b sec" id="xdclink" style="flex:none">Link para o integrante enviar documentos</button></div>`;
  if(lk.length)h+=`<div class="sub" style="margin:0 0 10px">Links: ${lk.map(l=>{const v=xdcVivo(l);return `<span class="xdclk">${v?"ativo":(l.ativo===false?"desativado":"vencido")} · criado em ${esc(brDate((l.criado||"").slice(0,10)))} · ${+l.recebidos||0} arquivo(s)${v?` · <a href="#" data-xl="${esc(l.id)}">desativar</a>`:""}</span>`}).join(" ")}</div>`;
  if(pend.length)h+=`<div class="callout sand" style="margin-bottom:12px"><b>${pend.length} arquivo(s) recebido(s) pelo link, aguardando conferência.</b>
    <div style="margin-top:6px">${pend.map(d=>`<div class="xdcpen">${/^image\//.test(d.type||"")?`<img src="/_blob/${d.assetId}" alt="">`:`<span class="xdcpdf">PDF</span>`}<span>${esc(d.rotulo||"Sem indicação")} <span class="sub">· ${esc(d.nome)}</span></span><button class="b sec sm" data-xpx="${d.id}" title="Recusar e excluir">${ic("trash")}</button></div>`).join("")}</div>
    <button class="b" id="xdcconf" style="margin-top:8px">Conferir e dar nome (${pend.length})</button></div>`;
  return h;
}
const xdcFDocs0=fDocs;
fDocs=function(i){
  let h=xdcFDocs0.apply(this,arguments);
  h=h.replace(/<div style="flex:0 0 220px"><label>Categoria do envio<\/label><select id="ucat">[\s\S]*?<\/select><\/div>/,"");
  h=h.replace(/(<input type="checkbox" data-ds="([^"]+)"[\s\S]*?<div class="nm"[^>]*>[^<]*)(<\/div>)/g,(m,pre,id,fim)=>{const l=S.docs[id]&&S.docs[id].lado;return l?pre+`<span class="xdclado${l==="ambos"?"":" u"}">${xdcLadoNome[l]}</span>`+fim:m});
  h=h.replace(/(<button class="b sec sm" data-dx="([^"]+)")/g,'<button class="b sec sm" data-xrn="$2" title="Renomear">Renomear</button>$1');
  h=h.replace("Clique ou solte arquivos aqui (vários de uma vez)","Solte aqui todos os documentos de uma vez. O sistema lê cada um e sugere o nome");
  return xdcTopo(i)+h;
};
const xdcBindPront0=bindPront;
bindPront=function(){
  xdcBindPront0.apply(this,arguments);
  const pn=document.getElementById("pnew");if(pn)pn.onclick=xdcNovo;
  const i=PR.sel&&S.integrantes[PR.sel];if(!i||PR.tab!=="docs")return;
  document.querySelectorAll("[data-xrn]").forEach(b=>b.onclick=()=>xdcRenomeia(S.docs[b.dataset.xrn]));
  const b=document.getElementById("xdclink");if(b)b.onclick=()=>xdcModalLink(i);
  const c=document.getElementById("xdcconf");
  if(c)c.onclick=()=>xdcAbre(i,Object.values(S.docs).filter(d=>d.uid===i.id&&d.pendente).sort((a,b)=>String(a.em).localeCompare(String(b.em))).map(d=>({doc:d})));
  document.querySelectorAll("[data-xpx]").forEach(x=>x.onclick=async()=>{const d=S.docs[x.dataset.xpx];if(d&&await askConfirm(`Recusar e excluir "${d.nome}"?`,"Excluir")){await removeDoc(d);go("pront",true)}});
  document.querySelectorAll("[data-xl]").forEach(a=>a.onclick=async e=>{e.preventDefault();const l=S.links[a.dataset.xl];if(l&&await askConfirm("Desativar este link? Quem o tiver não conseguirá mais enviar.","Desativar")){put("links",l.id,{...strip(l),ativo:false});go("pront",true)}});
};
(function(){const st=document.createElement("style");st.textContent=`
.xdclist{display:flex;flex-direction:column;gap:10px;max-height:62vh;overflow:auto;padding-right:2px}
.xdcrow{display:grid;grid-template-columns:72px 1fr auto;gap:10px;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--card)}
.xdcth img,.xdcpdf{width:72px;height:72px;object-fit:cover;border-radius:8px;background:var(--areia,#f5efe0)}
.xdcpdf{display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--mute)}
.xdcor{font-size:12.5px;color:var(--mute);word-break:break-word;margin-bottom:6px}
.xdcst.ok{color:var(--verde-medio)}.xdcst.err{color:var(--urgente,#c0392b)}
.xdcg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.xdcg label,.xdcnm{font-size:12px;display:block}.xdcg input,.xdcg select,.xdcnm input{width:100%;margin-top:2px}
.xdcnm{margin-top:8px;font-weight:600}
.xdcg [hidden]{display:none!important}.xdcx{align-self:start;height:36px}
.xdcck{display:block;margin:3px 0}
.xdcpen{display:flex;align-items:center;gap:8px;margin:4px 0}.xdcpen img,.xdcpen .xdcpdf{width:36px;height:36px;object-fit:cover;border-radius:6px}.xdcpen>span:nth-child(2){flex:1;min-width:0;word-break:break-word}
.xdclk{display:inline-block;margin-right:12px}
.xdcopc{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;margin:6px 0}.xdcres{max-height:34vh;overflow:auto;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:6px 10px}.xdcres div{padding:2px 0;word-break:break-word}
.xdcconf1{margin:6px 0;font-size:13px}
.xdcbadge{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}.xdcb{font-size:12.5px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--areia,#f5efe0);color:var(--verde,#1E5C2A);border:1px solid var(--line)}
.xdcb.tipo{background:var(--verde,#1E5C2A);color:#fff;border-color:var(--verde,#1E5C2A)}.xdcb.lado.ambos{background:#e3f1e5;border-color:#7bb386}.xdcb.lado.frente,.xdcb.lado.verso{background:#fff4d6;border-color:#e2bf55;color:#6a4b00}.xdcb.wait{font-weight:600;color:var(--mute)}.xdcb.pg{font-weight:600}
.xdclado{display:inline-block;font-size:11.5px;font-weight:700;border-radius:999px;padding:1px 8px;margin-left:6px;background:#e3f1e5;color:#1E5C2A;vertical-align:middle}.xdclado.u{background:#fff4d6;color:#6a4b00}
.xdcdados{margin-top:8px;border-top:1px dashed var(--line);padding-top:6px}.xdcdt{font-size:12px;color:var(--mute);margin-bottom:4px}
.xdcdd{display:grid;grid-template-columns:auto 84px minmax(120px,1fr);gap:6px;align-items:center;font-size:13px;margin:3px 0}.xdcdd em{grid-column:3;font-size:11.5px;color:var(--mute);font-style:normal}
.xdcdd.bad em{color:var(--urgente,#c0392b)}.xdcdd input[type=text],.xdcdd input:not([type]){width:100%}
@media(max-width:560px){.xdcrow{grid-template-columns:1fr auto}.xdcth{display:none}}
`;document.head.appendChild(st)})();

/* ---------- renomear um documento ---------- */
function xdcRenomeia(d){
  if(!d)return;if(!podeEd("pront"))return toast("Você só pode consultar esta tela.",true);
  const ext=xdcExt(d.nome),ov=openModal(`<h3>Renomear documento</h3><label>Nome<input id="xrnn" value="${esc(xdcSemExt(d.nome))}"></label><p class="sub">A extensão (${esc(ext||"sem extensão")}) é mantida.</p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xrnc">Cancelar</button><button class="b" id="xrns">Salvar</button></div>`);
  ov.querySelector("#xrnc").onclick=()=>ov.remove();
  ov.querySelector("#xrns").onclick=()=>{const v=ov.querySelector("#xrnn").value.trim().replace(/[\\/:*?"<>|]/g,"-");if(!v)return toast("Informe o nome.",true);put("docs",d.id,{...strip(d),nome:v+ext});ov.remove();go("pront",true)};
}
/* ---------- novo integrante já com os documentos ---------- */
/* nome do titular a partir dos documentos lidos: o nome que mais se repete nos documentos pessoais
   (RG, CPF e CNH valem mais). Certidão de nascimento, comprovante de residência e vacinação ficam de fora,
   porque costumam ser de filhos ou de outra pessoa da casa. */
const XDC_TIPO_PESO={"RG":3,"CNH":3,"CPF":3,"CTPS":2,"PIS/NIS":2,"Cartão do Cidadão (NIS)":2,"Título de eleitor":2,"Reservista":2,"Registro profissional (conselho)":1,"Diploma ou certificado":1,"ASO":1,"Contrato":1,"Comprovante bancário":1};
function xdcNomeDosDocs(leituras){
  const grupos=[];
  leituras.forEach(l=>{
    if(!l||l.erro||!l.nome)return;const p=XDC_TIPO_PESO[l.tipo];if(!p)return;
    const nm=xdcFmt.nomeCompleto(l.nome);if(!nm||xdcToks(nm).length<2)return;
    // a leitura pegou a mãe/pai como titular (o nome lido está na filiação do próprio documento): não serve
    const d=l.dados||{};if([...(l.filiacao||[]),d.mae,d.pai].some(x=>x&&xdcMesmoNome(x,nm)))return;
    let g=grupos.find(g=>xdcMesmoNome(g.nomes[0],nm));if(!g)grupos.push(g={nomes:[],pts:0,tipos:[]});
    g.nomes.push(nm);g.pts+=p;g.tipos.push(l.tipo);
  });
  if(!grupos.length)return null;
  grupos.sort((a,b)=>b.pts-a.pts);
  const g=grupos[0],nome=g.nomes.slice().sort((a,b)=>xdcToks(b).length-xdcToks(a).length||b.length-a.length)[0];
  return{nome,tipos:[...new Set(g.tipos)],outros:grupos.length>1};
}
function xdcNovo(){
  if(!podeEd("pront"))return toast("Você só pode consultar esta tela.",true);
  let fs=[],leus=null,lendo=false,existe=null;
  const ov=openModal(`<h3>Novo integrante</h3>
   <label>Nome completo<input id="xnnome" autocomplete="off" placeholder="ex.: Ana Paula Souza (ou deixe em branco e envie os documentos)"></label>
   <div class="drop" id="xndrop" style="padding:14px;margin-top:10px">${ic("up")}<div>Solte aqui todos os documentos de uma vez</div><div class="sub">O sistema lê, preenche o cadastro, converte para PDF e dá o nome de cada um. Se você não souber o nome, deixe o campo acima em branco: o sistema lê o nome no RG, CPF ou CNH.</div></div>
   <input type="file" id="xnfile" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif">
   <div class="sub" id="xnl" style="margin-top:6px"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xnc">Cancelar</button><button class="b" id="xnok">Criar integrante</button></div>`);
  const inNome=ov.querySelector("#xnnome"),info=ov.querySelector("#xnl"),ok=ov.querySelector("#xnok");
  const ativos=()=>Object.values(S.integrantes).filter(x=>(x.situacao||"Ativo")!=="Desligado");
  const add=l=>{fs=fs.concat([...l].filter(f=>guessType(f)&&/^(image\/|application\/pdf)/.test(guessType(f))));leus=null;info.textContent=fs.length?fs.length+" arquivo(s) para ler"+(inNome.value.trim()?" depois de criar.":". Se o nome ficar em branco, ele será lido nos documentos."):""};
  const dz=ov.querySelector("#xndrop"),inp=ov.querySelector("#xnfile");
  dz.onclick=()=>inp.click();dz.ondragover=e=>{e.preventDefault();dz.classList.add("on")};dz.ondragleave=()=>dz.classList.remove("on");
  dz.ondrop=e=>{e.preventDefault();dz.classList.remove("on");add(e.dataTransfer.files)};inp.onchange=()=>{add(inp.files);inp.value=""};
  ov.querySelector("#xnc").onclick=()=>{lendo=false;ov.remove()};
  inNome.oninput=()=>{if(existe){existe=null;ok.textContent="Criar integrante"}};
  inNome.focus();
  const abre=(id)=>{PR.sel=id;PR.tab=fs.length?"docs":"dados";PR.aba="ativos";ov.remove();go("pront",true);
    if(fs.length){const it=fs.map((f,k)=>({file:f,...(leus&&leus[k]?{leu:leus[k]}:{})}));setTimeout(()=>xdcAbre(S.integrantes[id],it),250)}};
  // lê os documentos (3 de cada vez) só para descobrir o nome; a leitura é reaproveitada na conferência
  const leTodos=async()=>{
    lendo=true;ok.disabled=true;const res=new Array(fs.length),fila=fs.map((f,k)=>k);let feitos=0;
    info.textContent=`Lendo os documentos para descobrir o nome… 0 de ${fs.length}`;
    const trab=async()=>{while(fila.length&&lendo){const k=fila.shift();res[k]=await xdcLe({},fs[k]).catch(e=>({erro:String(e&&e.message||e)}));feitos++;if(lendo)info.textContent=`Lendo os documentos para descobrir o nome… ${feitos} de ${fs.length}`}};
    await Promise.all([trab(),trab(),trab()]);ok.disabled=false;
    if(!lendo)return null;lendo=false;leus=res;return res;
  };
  ok.onclick=async()=>{
    if(lendo)return;
    if(existe)return abre(existe.id);
    let nome=inNome.value.trim().replace(/\s+/g," ");
    if(!nome){
      if(!fs.length)return toast("Informe o nome completo ou envie os documentos para o sistema ler o nome.",true);
      const res=leus||await leTodos();if(!res)return;
      const achou=xdcNomeDosDocs(res);
      if(!achou){info.textContent="Não consegui ler o nome nos documentos. Digite o nome completo e clique em Criar integrante.";inNome.focus();return}
      inNome.value=achou.nome;
      const igual=ativos().find(x=>xdcMesmoNome(xdcNomeC(x),achou.nome));
      if(igual){existe=igual;ok.textContent="Enviar para "+xdcPrimeiro(nomeInteg(igual));
        info.innerHTML=`Nome lido: <b>${esc(achou.nome)}</b>. Já existe <b>${esc(nomeInteg(igual))}</b> no cadastro. Clique em "Enviar para ${esc(xdcPrimeiro(nomeInteg(igual)))}" para guardar os documentos na pasta dela(e), ou corrija o nome para criar outra pessoa.`;return}
      info.innerHTML=`Nome lido em ${esc(achou.tipos.join(", "))}: <b>${esc(achou.nome)}</b>.${achou.outros?" Há documentos de outras pessoas também (filhos ou familiares); eles vão para a pasta como documentos de familiar.":""} Confira e clique em Criar integrante.`;
      ok.textContent="Criar integrante";return;
    }
    if(nome.length<3)return toast("Informe o nome completo.",true);
    if(ativos().some(x=>xdcNorm(xdcNomeC(x))===xdcNorm(nome)))return toast("Já existe um integrante ativo com esse nome.",true);
    const id=uid8();put("integrantes",id,{nome:"",nomeCompleto:nome,depto:"Outro",turno:"",dias:[0,1,2,3,4],situacao:"Ativo"});
    try{if(leus)audit("Integrante criado pelos documentos",nome)}catch(e){}
    abre(id);
  };
}

