/* ================= arquivos: envio, download, zip, pdf ================= */
const OKTYPE=/^(application\/pdf|image\/(png|jpeg|webp|gif)|text\/(plain|csv))$/;
function guessType(f){
  if(OKTYPE.test(f.type))return f.type;
  const e=(f.name.split(".").pop()||"").toLowerCase();
  return({pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",txt:"text/plain",csv:"text/csv"})[e]||"";
}
async function uploadDoc(igId,file,cat){
  if(!RT.assets)throw new Error("O envio de arquivos não está disponível nesta visualização.");
  let type=guessType(file);
  if(!type)throw new Error(`"${file.name}": formato não aceito. Envie PDF, imagem (PNG/JPG/WebP/GIF), TXT ou CSV. Word e Excel: salve como PDF antes.`);
  if(file.size>20*1048576)throw new Error(`"${file.name}" passa de 20 MB.`);
  file=(await comprimir(file)).file;type=file.type||type;
  const r=await RT.assets.upload(file,{type}).catch(e=>{throw new Error(`Falha ao enviar "${file.name}": ${e.message||e.code}`)});
  const id=uid8();put("docs",id,{uid:igId,nome:file.name,cat,assetId:r.id,size:r.sizeBytes,type:r.contentType,em:new Date().toISOString()});
  return id;
}
async function sendFiles(i,files){
  if(!files.length)return;const cat=$("ucat").value;let ok=0;
  for(const f of files){try{await uploadDoc(i.id,f,cat);ok++}catch(e){toast(e.message,true)}}
  if(ok)toast(`${ok} arquivo(s) enviado(s).`);go("pront",true);
}
async function removeDoc(d,silent){
  if(RT.assets){try{await RT.assets.delete(d.assetId)}catch(e){if(!silent)toast("O arquivo saiu do prontuário, mas pode ter ficado no armazenamento.",true)}}
  del("docs",d.id);PR.docSel.delete(d.id);
}
async function bytesOf(d){
  const r=await fetch("/_blob/"+d.assetId);if(!r.ok)throw new Error(`"${d.nome}" não foi encontrado no armazenamento.`);return r.arrayBuffer();
}
/* CSV seguro: uma célula que começa com = + @ (ou - seguido de letra) vira fórmula ao abrir no Excel.
   Um nome digitado como =HYPERLINK(...) poderia virar um link malicioso; essas células ganham um ' na frente. */
const csvPerigo=s=>/^[=+@\t\r]/.test(s)||/^-[^\d\s.,]/.test(s);
const csvCel=v=>{const s=String(v??"");return csvPerigo(s)?"'"+s:s};
function csvSeguro(txt){
  const bom=txt.startsWith("﻿")?"﻿":"",t=bom?txt.slice(1):txt;
  const l0=t.split(/\r?\n/,1)[0],sep=(l0.split(";").length>=l0.split(",").length)?";":",";
  const L=[];let row=[],cel="",q=false,perigo=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){cel+='"';i++}else q=false}else cel+=c;continue}
    if(c==='"'&&cel==="")q=true;else if(c===sep){row.push(cel);cel=""}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(cel);L.push(row);row=[];cel=""}else cel+=c}
  if(cel!==""||row.length){row.push(cel);L.push(row)}
  L.forEach(r=>r.forEach(s=>{if(csvPerigo(s))perigo=true}));
  if(!perigo)return txt;
  const out=s=>{s=csvCel(s);return /["\r\n]/.test(s)||s.includes(sep)?'"'+s.replace(/"/g,'""')+'"':s};
  return bom+L.map(r=>r.map(out).join(sep)).join("\r\n");
}
async function saveFile(filename,data){
  if(!RT.dl){toast("O download não está disponível nesta visualização.",true);return false}
  if(/\.csv$/i.test(filename)){try{const txt=typeof data==="string"?data:data instanceof Blob?await data.text():null;if(txt!==null){const s=csvSeguro(txt);if(s!==txt)data=new Blob([s],{type:"text/csv;charset=utf-8"})}}catch(e){}}
  try{await RT.dl.save({filename,data});return true}catch(e){if(e.code!=="declined")toast("Não foi possível baixar: "+(e.message||e.code),true);return false}
}
// mostra o arquivo numa janela do próprio sistema: PDF página por página, imagem e texto; nada é baixado para o computador
async function verArquivo(nome,type,carrega,baixar){
  const ov=openModal(`<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><h3 style="margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(nome)}">${esc(nome)}</h3>
    ${baixar?`<button class="b sec sm" id="vdbx" style="flex:none">${ic("down")} Baixar</button>`:""}<button class="b sec sm" id="vdfx" style="flex:none">Fechar</button></div>
   <div id="vdcorpo" style="background:var(--areia,#f5efe0);border-radius:10px;padding:10px;min-height:200px;text-align:center"><p class="sub">Abrindo…</p></div>`);
  ov.querySelector(".modal").classList.add("largo");
  ov.querySelector("#vdfx").onclick=()=>ov.remove();
  if(baixar)ov.querySelector("#vdbx").onclick=baixar;
  const corpo=ov.querySelector("#vdcorpo"),urls=[];
  const fecha=new MutationObserver(()=>{if(!document.body.contains(ov)){urls.forEach(u=>URL.revokeObjectURL(u));fecha.disconnect()}});fecha.observe(document.body,{childList:true});
  try{
    const bytes=new Uint8Array(await carrega());
    if(/pdf/i.test(type)||/\.pdf$/i.test(nome)){
      const pdfjs=await pdfjsCarrega(),pdf=await pdfjs.getDocument({data:bytes}).promise;
      corpo.innerHTML=`<p class="sub" style="margin:0 0 8px">${pdf.numPages} página(s)</p>`;
      const larg=Math.min(900,corpo.clientWidth-20)||700;
      for(let p=1;p<=pdf.numPages;p++){
        if(!document.body.contains(ov))return;
        const pg=await pdf.getPage(p),v0=pg.getViewport({scale:1}),esc_=larg/v0.width,v=pg.getViewport({scale:esc_*(window.devicePixelRatio||1)});
        const cv=document.createElement("canvas");cv.width=v.width;cv.height=v.height;cv.style.cssText=`width:${Math.round(v0.width*esc_)}px;max-width:100%;height:auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.15);margin:0 auto 10px;display:block`;
        corpo.appendChild(cv);await pg.render({canvasContext:cv.getContext("2d"),viewport:v}).promise;
      }
    }else if(/^image\//i.test(type)){
      const u=URL.createObjectURL(new Blob([bytes],{type}));urls.push(u);
      corpo.innerHTML=`<img src="${u}" alt="" style="max-width:100%;height:auto;background:#fff">`;
    }else if(/^text\//i.test(type)||/\.(txt|csv)$/i.test(nome)){
      corpo.innerHTML=`<pre style="text-align:left;white-space:pre-wrap;margin:0;font-size:12px">${esc(new TextDecoder().decode(bytes).slice(0,200000))}</pre>`;
    }else corpo.innerHTML=`<p class="sub">Este tipo de arquivo não pode ser mostrado aqui. Use Baixar.</p>`;
  }catch(e){console.error(e);corpo.innerHTML=`<p class="sub">Não consegui mostrar o arquivo: ${esc(e.message||String(e))}</p>`}
}
function verDoc(d){if(!d)return;verArquivo(d.nome,d.type||guessType({type:"",name:d.nome}),()=>bytesOf(d),()=>downloadDoc(d))}
async function downloadDoc(d){if(!d)return;try{await saveFile(safe(d.nome),await bytesOf(d))}catch(e){toast(e.message,true)}}
/* @@anexos-armazenamento-inicio */
const ANEXO_ACCEPT=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv";
const ANEXO_NOTA="Aceita PDF, imagem (PNG, JPG, WebP, GIF), TXT e CSV, até 20 MB cada. Word e Excel: salve como PDF antes.";
async function anexoEnviar(file){
  if(!RT.assets)throw new Error("O envio de arquivos não está disponível nesta visualização.");
  let type=guessType(file);
  if(!type)throw new Error(`"${file.name}": formato não aceito. Envie PDF, imagem (PNG, JPG, WebP, GIF), TXT ou CSV. Word e Excel: salve como PDF antes.`);
  if(file.size>20*1048576)throw new Error(`"${file.name}" passa de 20 MB.`);
  file=(await comprimir(file)).file;type=file.type||type;
  const r=await RT.assets.upload(file,{type}).catch(e=>{throw new Error(`Falha ao enviar "${file.name}": ${e.message||e.code}`)});
  return{id:r.id,nome:file.name,type:r.contentType||type,size:r.sizeBytes||file.size,em:new Date().toISOString()};
}
const anexoUrl=a=>"/_blob/"+a.id;
async function anexoBytes(a){const r=await fetch(anexoUrl(a));if(!r.ok)throw new Error(`"${a.nome}" não foi encontrado no armazenamento.`);return r.arrayBuffer()}
async function anexoApagar(a){if(RT.assets){try{await RT.assets.delete(a.id)}catch(e){}}}
/* @@anexos-armazenamento-fim */
async function zipDocs(list){
  if(!list.length)return toast("Nenhum documento para baixar.",true);
  if(typeof JSZip==="undefined")return toast("Biblioteca de ZIP não carregou. Recarregue a página.",true);
  toast(`Preparando ${list.length} arquivo(s)…`);
  const zip=new JSZip(),used=new Set(),fail=[];
  for(const d of list){
    try{
      const ig=S.integrantes[d.uid],folder=safe(ig?nomeInteg(ig):"Sem integrante")+"/"+safe(d.cat);
      let nm=folder+"/"+safe(d.nome),n=1;while(used.has(nm)){nm=folder+"/"+(n++)+"_"+safe(d.nome)}used.add(nm);
      zip.file(nm,await bytesOf(d));
    }catch(e){fail.push(d.nome)}
  }
  const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
  if(await saveFile("documentos-casa-hiro.zip",blob)&&fail.length)toast("Não entraram no ZIP: "+fail.join(", "),true);
}
async function toPngBytes(buf,type){
  const bmp=await createImageBitmap(new Blob([buf],{type}));
  const c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0);
  return new Uint8Array(await(await new Promise(r=>c.toBlob(r,"image/png"))).arrayBuffer());
}
async function mergeDocs(list){
  if(!list.length)return toast("Nenhum documento para juntar.",true);
  if(typeof PDFLib==="undefined")return toast("Biblioteca de PDF não carregou. Recarregue a página.",true);
  toast(`Juntando ${list.length} arquivo(s) em um PDF…`);
  const{PDFDocument,StandardFonts,rgb}=PDFLib,out=await PDFDocument.create(),font=await out.embedFont(StandardFonts.Helvetica),bold=await out.embedFont(StandardFonts.HelveticaBold);
  const L=s=>String(s).replace(/[^\x09\x0A\x0D\x20-\xFF]/g,"?"),fail=[];
  const groups=new Map();list.forEach(d=>{if(!groups.has(d.uid))groups.set(d.uid,[]);groups.get(d.uid).push(d)});
  for(const[uid,ds]of groups){
    const ig=S.integrantes[uid];
    const cp=out.addPage([595,842]);cp.drawText(L("Casa Hiro"),{x:56,y:760,size:12,font:bold,color:rgb(.12,.36,.16)});
    cp.drawText(L(ig?nomeInteg(ig):"Integrante"),{x:56,y:720,size:22,font:bold,color:rgb(.27,.27,.27)});
    let y=690;ds.forEach(d=>{if(y>60){cp.drawText(L(`${d.cat} · ${d.nome}`.slice(0,90)),{x:56,y,size:10,font,color:rgb(.4,.4,.4)});y-=16}});
    for(const d of ds){
      try{
        const buf=await bytesOf(d);
        if(d.type==="application/pdf"){const src=await PDFDocument.load(buf,{ignoreEncryption:true});(await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p))}
        else if(/^image\//.test(d.type)){
          const img=d.type==="image/png"?await out.embedPng(buf):d.type==="image/jpeg"?await out.embedJpg(buf):await out.embedPng(await toPngBytes(buf,d.type));
          const land=img.width>img.height,[W,H]=land?[842,595]:[595,842],m=28,sc=Math.min((W-2*m)/img.width,(H-2*m)/img.height,1);
          const p=out.addPage([W,H]);p.drawImage(img,{x:(W-img.width*sc)/2,y:(H-img.height*sc)/2,width:img.width*sc,height:img.height*sc});
        }else{
          const txt=L(new TextDecoder("utf-8").decode(buf)).replace(/\t/g,"  "),size=10,maxW=595-100,lines=[];
          for(const raw of txt.split(/\r?\n/)){let cur="";for(const w of raw.split(" ")){const t=cur?cur+" "+w:w;if(font.widthOfTextAtSize(t,size)>maxW&&cur){lines.push(cur);cur=w}else cur=t}lines.push(cur)}
          for(let k=0;k<lines.length;k+=58){const p=out.addPage([595,842]);lines.slice(k,k+58).forEach((ln,n)=>p.drawText(ln,{x:50,y:790-n*13.5,size,font}))}
        }
      }catch(e){fail.push(d.nome)}
    }
  }
  const nm=groups.size===1?"prontuario-"+safe(nomeInteg(S.integrantes[[...groups.keys()][0]]||{nome:"integrante"})):"documentos-integrantes";
  if(await saveFile(nm+".pdf",await out.save())&&fail.length)toast("Não entraram no PDF: "+fail.join(", "),true);
}

