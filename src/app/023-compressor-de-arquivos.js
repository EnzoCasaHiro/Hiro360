/* ================= COMPRESSOR DE ARQUIVOS =================
   Toda imagem enviada (documentos, comprovantes, notas fiscais) é redimensionada e recomprimida antes de ir para o armazenamento.
   Só vale quando o resultado fica menor que o original. PDFs têm as imagens internas recomprimidas; texto e fontes ficam intactos. */
const COMP_NIVEIS={
  equilibrada:{nome:"Equilibrada",lado:1800,ladoPdf:2200,psnr:38,desc:"Quase sem perda visível: o sistema testa a compressão de cada imagem e usa a mais forte que ainda fica fiel ao original. Uma foto de 4 MB costuma virar 200 a 500 KB; PDF escaneado, 70% a 90% menor."},
  maxima:{nome:"Máxima economia",lado:1300,ladoPdf:1600,psnr:34,desc:"Tamanho mínimo, com perda leve. Lê bem na tela, mas amplia pior."},
  original:{nome:"Sem compressão",lado:0,ladoPdf:0,psnr:99,desc:"Guarda os arquivos exatamente como vieram."}};
const compNivel=()=>COMP_NIVEIS[cfgG().compressao]||COMP_NIVEIS.equilibrada;
const COMP_TIPOS=/^image\/(jpeg|png|webp|bmp)$/;
const comprimivel=t=>COMP_TIPOS.test(t||"")||t==="application/pdf";
const COMP_MIN=60000;
let _webp=null;
async function webpOk(){if(_webp===null){const c=document.createElement("canvas");c.width=c.height=2;_webp=(await blobDe(c,"image/webp",.8))?.type==="image/webp"}return _webp}
function psnrLuma(a,b){
  const x=a.data,y=b.data;let se=0,n=0;
  for(let i=0;i<x.length;i+=12){const d=(x[i]-y[i])*.299+(x[i+1]-y[i+1])*.587+(x[i+2]-y[i+2])*.114;se+=d*d;n++}
  const mse=se/Math.max(1,n);return mse<=0?99:10*Math.log10(65025/mse);
}
/* acha, por busca binária, a menor qualidade que ainda atinge a fidelidade-alvo (PSNR); usa WebP quando ele for bem menor */
async function codificaBom(cv,nivel,webp){
  const w=cv.width,h=cv.height,ref=cv.getContext("2d").getImageData(0,0,w,h);
  const tipos=webp&&await webpOk()?["image/webp","image/jpeg"]:["image/jpeg"],res={};
  for(const t of tipos){
    let lo=.3,hi=.95,bom=null;
    for(let i=0;i<6;i++){
      const q=(lo+hi)/2,bl=await blobDe(cv,t,q);if(!bl||bl.type!==t)break;
      const bm=await createImageBitmap(bl),c2=document.createElement("canvas");c2.width=w;c2.height=h;const x2=c2.getContext("2d");x2.drawImage(bm,0,0);
      if(psnrLuma(ref,x2.getImageData(0,0,w,h))>=nivel.psnr){bom=bl;hi=q}else lo=q;
    }
    if(!bom){const bl=await blobDe(cv,t,.95);if(bl&&bl.type===t)bom=bl}
    if(bom)res[t]=bom;
  }
  const j=res["image/jpeg"],wp=res["image/webp"];
  return wp&&(!j||wp.size<j.size*.85)?wp:(j||wp||null);
}
let _econ=null,_econT=null;
function registrarEconomia(antes,depois){
  if(!RT.db)return;
  const cur=S.config.armazenamento||{};
  _econ=_econ||{antes:+cur.antes||0,depois:+cur.depois||0,n:+cur.n||0,desde:cur.desde||new Date().toISOString().slice(0,10)};
  _econ.antes+=antes;_econ.depois+=depois;_econ.n++;
  clearTimeout(_econT);_econT=setTimeout(()=>{if(_econ){put("config","armazenamento",_econ);_econ=null}},1500);
}
async function comprimir(file,silencioso){
  const nv=compNivel(),tipo=file.type||guessType(file),orig={file,antes:file.size,depois:file.size,comprimido:false};
  if(!nv.lado)return orig;
  try{
    if(tipo==="application/pdf"){
      if(file.size<100000)return orig;
      const r=await pdfOtimiza(new Uint8Array(await file.arrayBuffer()),nv);
      if(!r||r.bytes.length>=file.size*.95)return orig;
      if(!silencioso)registrarEconomia(file.size,r.bytes.length);
      return{file:new File([r.bytes],file.name,{type:"application/pdf"}),antes:file.size,depois:r.bytes.length,comprimido:true,imagens:r.imagens};
    }
    if(!COMP_TIPOS.test(tipo)||file.size<COMP_MIN)return orig;
    const bmp=await createImageBitmap(file),k=Math.min(1,nv.lado/Math.max(bmp.width,bmp.height)),cv=document.createElement("canvas");
    cv.width=Math.max(1,Math.round(bmp.width*k));cv.height=Math.max(1,Math.round(bmp.height*k));
    const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(bmp,0,0,cv.width,cv.height);
    const out=await codificaBom(cv,nv,true);
    if(!out||out.size>=file.size*.95)return orig;
    const ext=out.type==="image/webp"?".webp":".jpg",novo=new File([out],file.name.replace(/\.[a-z0-9]+$/i,"")+ext,{type:out.type});
    if(!silencioso)registrarEconomia(file.size,out.size);
    return{file:novo,antes:file.size,depois:out.size,comprimido:true};
  }catch(e){return orig}
}
/* ---------- compressor de PDF, sem bibliotecas ----------
   Lê a estrutura do PDF (tabela ou fluxo de referências, objetos compactados), recomprime só as imagens embutidas
   (JPEG e Flate sem transparência) e regrava o arquivo. O texto, as fontes e o desenho continuam idênticos.
   Se algo não for reconhecido, o arquivo original é mantido. */
const L1=u=>{let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,Math.min(u.length,i+8192)));return s};
const B1=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u};
const PWS=/[\0\t\n\f\r ]/,PDL=/[()<>\[\]{}\/%]/;
function pSkip(s,p){for(;;){while(p<s.length&&PWS.test(s[p]))p++;if(s[p]==="%"){while(p<s.length&&s[p]!=="\n"&&s[p]!=="\r")p++}else return p}}
function pVal(s,p){
  p=pSkip(s,p);const c=s[p];
  if(c==="/"){let q=p+1;while(q<s.length&&!PWS.test(s[q])&&!PDL.test(s[q]))q++;return[s.slice(p,q),q]}
  if(c==="("){let d=1,q=p+1;while(q<s.length&&d>0){if(s[q]==="\\")q++;else if(s[q]==="(")d++;else if(s[q]===")")d--;q++}return[s.slice(p,q),q]}
  if(c==="<"&&s[p+1]==="<"){let d=0,q=p;while(q<s.length){if(s[q]==="<"&&s[q+1]==="<"){d++;q+=2}else if(s[q]===">"&&s[q+1]===">"){d--;q+=2;if(!d)break}else if(s[q]==="("){q=pVal(s,q)[1]}else q++}return[s.slice(p,q),q]}
  if(c==="<"){const q=s.indexOf(">",p);return[s.slice(p,q+1),q+1]}
  if(c==="["){let q=p+1;for(;;){q=pSkip(s,q);if(s[q]==="]"){q++;break}if(q>=s.length)break;q=pVal(s,q)[1]}return[s.slice(p,q),q]}
  let q=p;while(q<s.length&&!PWS.test(s[q])&&!PDL.test(s[q]))q++;
  const tok=s.slice(p,q);
  if(/^\d+$/.test(tok)){const m=/^[\0\t\n\f\r ]+(\d+)[\0\t\n\f\r ]+R(?![A-Za-z0-9])/.exec(s.slice(q,q+30));if(m)return[tok+" "+m[1]+" R",q+m[0].length]}
  return[tok,q];
}
function pDict(s){let p=2;const o=[];for(;;){p=pSkip(s,p);if(p>=s.length||(s[p]===">"&&s[p+1]===">"))break;const[k,q]=pVal(s,p),[v,r]=pVal(s,q);o.push([k,v]);p=r}return o}
const pDictStr=e=>"<<"+e.map(([k,v])=>k+" "+v).join(" ")+">>";
const pGet=(e,k)=>{const x=e.find(a=>a[0]===k);return x?x[1]:undefined};
const pSet=(e,k,v)=>{const i=e.findIndex(a=>a[0]===k);if(i>=0)e[i]=[k,v];else e.push([k,v])};
const pDel=(e,k)=>{const i=e.findIndex(a=>a[0]===k);if(i>=0)e.splice(i,1)};
async function pInflate(u){const d=new DecompressionStream("deflate"),w=d.writable.getWriter();w.write(u);w.close();return new Uint8Array(await new Response(d.readable).arrayBuffer())}
function pPredictor(data,pred,cols,colors,bpc){
  if(!pred||pred===1)return data;
  const bpp=Math.max(1,Math.ceil(colors*bpc/8)),row=Math.ceil(cols*colors*bpc/8);
  if(pred===2)return null;
  const n=Math.floor(data.length/(row+1)),out=new Uint8Array(n*row);
  for(let r=0;r<n;r++){
    const f=data[r*(row+1)],ini=r*(row+1)+1,o=r*row,po=o-row;
    for(let i=0;i<row;i++){
      const x=data[ini+i],a=i>=bpp?out[o+i-bpp]:0,b=r?out[po+i]:0,c=(r&&i>=bpp)?out[po+i-bpp]:0;let v;
      if(f===0)v=x;else if(f===1)v=x+a;else if(f===2)v=x+b;else if(f===3)v=x+((a+b)>>1);
      else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v=x+((pa<=pb&&pa<=pc)?a:(pb<=pc?b:c))}else return null;
      out[o+i]=v&255;
    }
  }
  return out;
}
function pLerObj(s,off){
  const re=/[\0\t\n\f\r ]*(\d+)[\0\t\n\f\r ]+(\d+)[\0\t\n\f\r ]+obj/y;re.lastIndex=off;
  const m=re.exec(s);if(!m)return null;
  const[val,q]=pVal(s,m.index+m[0].length);let ini=null;
  if(val.startsWith("<<")){const r=pSkip(s,q);if(s.startsWith("stream",r)){let b=r+6;if(s[b]==="\r"&&s[b+1]==="\n")b+=2;else if(s[b]==="\n"||s[b]==="\r")b++;ini=b}}
  return{num:+m[1],gen:+m[2],val,ini};
}
function pTamanho(s,o,tab){
  const d=pDict(o.val);let L=pGet(d,"/Length"),n=NaN;
  if(L!==undefined){if(/^\d+$/.test(L))n=+L;else{const m=/^(\d+) \d+ R$/.exec(L);const e=m&&tab.get(+m[1]);if(e&&e.tipo===1){const r=pLerObj(s,e.off);if(r&&/^\d+$/.test(r.val))n=+r.val}}}
  if(isFinite(n)&&n>=0){const f=pSkip(s,o.ini+n);if(s.startsWith("endstream",f))return n}
  const e=s.indexOf("endstream",o.ini);if(e<0)throw new Error("stream sem fim");
  let f=e;if(s[f-1]==="\n")f--;if(s[f-1]==="\r")f--;return f-o.ini;
}
async function pStreamBytes(u8,s,o,tab){
  const d=pDict(o.val),n=await pTamanho(s,o,tab);let dados=u8.subarray(o.ini,o.ini+n);
  const f=pGet(d,"/Filter");
  if(f===undefined)return dados;
  if(f==="/FlateDecode"||f==="/Fl"||/^\[\s*\/FlateDecode\s*\]$/.test(f)){
    let r=await pInflate(dados);const dp=pGet(d,"/DecodeParms");
    if(dp&&dp.startsWith("<<")){const e=pDict(dp),g=k=>+(pGet(e,k)||0);const pr=g("/Predictor");if(pr>1){r=pPredictor(r,pr,g("/Columns")||1,g("/Colors")||1,g("/BitsPerComponent")||8);if(!r)throw new Error("predictor")}}
    return r;
  }
  throw new Error("filtro não suportado");
}
async function pLerXrefs(u8,s){
  const k=s.lastIndexOf("startxref");if(k<0)throw new Error("sem startxref");
  let fila=[+/\d+/.exec(s.slice(k+9,k+40))[0]];const tab=new Map(),vistos=new Set();let trailer=null;
  while(fila.length){
    const off=fila.shift();if(vistos.has(off))continue;vistos.add(off);
    let p=pSkip(s,off),tr;
    if(s.startsWith("xref",p)){
      p+=4;
      for(;;){
        p=pSkip(s,p);if(s.startsWith("trailer",p)){p+=7;break}
        const m=/(\d+)[\0\t\n\f\r ]+(\d+)/y;m.lastIndex=p;const r=m.exec(s);if(!r)throw new Error("xref");
        let ini=+r[1];const cnt=+r[2];p=m.lastIndex;
        for(let i=0;i<cnt;i++){
          const e=/[\0\t\n\f\r ]*(\d{10})[\0\t\n\f\r ]+(\d{5})[\0\t\n\f\r ]+([nf])/y;e.lastIndex=p;const x=e.exec(s);if(!x)throw new Error("xref entrada");p=e.lastIndex;
          if(!tab.has(ini+i))tab.set(ini+i,x[3]==="n"?{tipo:1,off:+x[1],gen:+x[2]}:{tipo:0});
        }
      }
      tr=pDict(pVal(s,p)[0]);
      const xs=pGet(tr,"/XRefStm");if(xs)fila.unshift(+xs);
    }else{
      const o=pLerObj(s,off);if(!o||o.ini==null)throw new Error("xref stream");
      tr=pDict(o.val);const dados=await pStreamBytes(u8,s,o,tab);
      const W=pGet(tr,"/W").replace(/[\[\]]/g,"").trim().split(/\s+/).map(Number),size=+pGet(tr,"/Size"),idx=(pGet(tr,"/Index")||`[0 ${size}]`).replace(/[\[\]]/g,"").trim().split(/\s+/).map(Number);
      const rl=W[0]+W[1]+W[2];let q=0;
      const rd=n=>{let v=0;for(let i=0;i<n;i++)v=v*256+dados[q++];return v};
      for(let g=0;g<idx.length;g+=2)for(let i=0;i<idx[g+1];i++){
        const t=W[0]?rd(W[0]):1,a=rd(W[1]),b=rd(W[2]),num=idx[g]+i;
        if(!tab.has(num))tab.set(num,t===1?{tipo:1,off:a,gen:b}:t===2?{tipo:2,stm:a,idx:b}:{tipo:0});
      }
    }
    if(!trailer)trailer=tr;
    const pv=pGet(tr,"/Prev");if(pv&&/^\d+$/.test(pv))fila.push(+pv);
  }
  return{tab,trailer};
}
function pNComps(cs,objs){
  if(/^\/Device(RGB|Gray)$/.test(cs))return cs==="/DeviceRGB"?3:1;
  if(/^\/Cal(RGB|Gray)$/.test(cs))return cs==="/CalRGB"?3:1;
  const m=/^\[\s*\/ICCBased\s+(\d+) \d+ R\s*\]$/.exec(cs);
  if(m){const o=objs.get(+m[1]);if(o){const n=+pGet(pDict(o.val),"/N");if(n===1||n===3)return n}}
  return 0;
}
async function pImagem(u8,s,o,objs,tab,nivel){
  const d=pDict(o.val);
  if(pGet(d,"/Subtype")!=="/Image")return null;
  if(pGet(d,"/ImageMask")==="true"||pGet(d,"/SMask")!==undefined||pGet(d,"/Mask")!==undefined||pGet(d,"/Decode")!==undefined)return null;
  const w=+pGet(d,"/Width"),h=+pGet(d,"/Height"),cs=pGet(d,"/ColorSpace");if(!w||!h||!cs)return null;
  const n=pNComps(cs,objs);if(!n)return null;
  const tam=await pTamanho(s,o,tab);if(tam<30000)return null;
  const f=pGet(d,"/Filter");let cv=document.createElement("canvas"),bmp;
  const dct=f==="/DCTDecode"||/^\[\s*\/DCTDecode\s*\]$/.test(f||"");
  if(dct){bmp=await createImageBitmap(new Blob([u8.subarray(o.ini,o.ini+tam)],{type:"image/jpeg"}))}
  else if(f==="/FlateDecode"||/^\[\s*\/FlateDecode\s*\]$/.test(f||"")){
    if(+(pGet(d,"/BitsPerComponent")||8)!==8)return null;
    const raw=await pStreamBytes(u8,s,o,tab);if(!raw||raw.length!==w*h*n)return null;
    const id=new ImageData(w,h);for(let i=0,j=0;i<w*h;i++){if(n===3){id.data[j++]=raw[i*3];id.data[j++]=raw[i*3+1];id.data[j++]=raw[i*3+2]}else{id.data[j++]=raw[i];id.data[j++]=raw[i];id.data[j++]=raw[i]}id.data[j++]=255}
    bmp=await createImageBitmap(id);
  }else return null;
  const k=Math.min(1,nivel.ladoPdf/Math.max(bmp.width,bmp.height));
  cv.width=Math.max(1,Math.round(bmp.width*k));cv.height=Math.max(1,Math.round(bmp.height*k));
  const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(bmp,0,0,cv.width,cv.height);
  const out=await codificaBom(cv,nivel,false);
  if(!out||out.size>tam*.85)return null;
  const novo=new Uint8Array(await out.arrayBuffer());
  pSet(d,"/Width",String(cv.width));pSet(d,"/Height",String(cv.height));pSet(d,"/ColorSpace","/DeviceRGB");pSet(d,"/BitsPerComponent","8");pSet(d,"/Filter","/DCTDecode");pDel(d,"/DecodeParms");pSet(d,"/Length",String(novo.length));
  return{dict:pDictStr(d),bytes:novo,antes:tam};
}
async function pdfOtimiza(u8,nivel){
  try{
    const s=L1(u8),{tab,trailer}=await pLerXrefs(u8,s);
    if(pGet(trailer,"/Encrypt")!==undefined)return null;
    const objs=new Map();
    for(const[num,e] of tab)if(e.tipo===1){const o=pLerObj(s,e.off);if(o&&o.num===num)objs.set(num,{...o,gen:e.gen})}
    for(const[num,e] of tab)if(e.tipo===2){
      const stm=objs.get(e.stm);if(!stm||stm.ini==null)continue;
      if(!stm._itens){
        const d=pDict(stm.val),N=+pGet(d,"/N"),F=+pGet(d,"/First"),dados=await pStreamBytes(u8,s,stm,tab),t=L1(dados),nums=t.slice(0,F).trim().split(/\s+/).map(Number);
        stm._itens=[];for(let i=0;i<N;i++){const ini=F+nums[i*2+1],fim=i+1<N?F+nums[i*2+3]:t.length;stm._itens.push([nums[i*2],t.slice(ini,fim).trim()])}
        for(const[nn,txt] of stm._itens)if(!objs.has(nn)&&tab.get(nn)&&tab.get(nn).tipo===2)objs.set(nn,{num:nn,gen:0,val:txt,ini:null,deObjStm:true});
      }
    }
    const partes=[],offs=new Map();let pos=0,troca=0,poup=0;
    const add=u=>{partes.push(u);pos+=u.length};
    add(B1("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"));
    const ordem=[...objs.keys()].sort((a,b)=>a-b);
    for(const num of ordem){
      const o=objs.get(num),d=o.val.startsWith("<<")?pDict(o.val):null;
      if(d&&(pGet(d,"/Type")==="/ObjStm"||pGet(d,"/Type")==="/XRef"))continue;
      offs.set(num,{pos,gen:o.deObjStm?0:o.gen});
      if(o.ini==null){add(B1(`${num} ${o.deObjStm?0:o.gen} obj\n${o.val}\nendobj\n`));continue}
      let dictTxt=o.val,bytes;const tam=await pTamanho(s,o,tab);
      let rec=null;try{rec=await pImagem(u8,s,o,objs,tab,nivel)}catch(e){rec=null}
      if(rec){dictTxt=rec.dict;bytes=rec.bytes;troca++;poup+=rec.antes-rec.bytes.length}else bytes=u8.subarray(o.ini,o.ini+tam);
      add(B1(`${num} ${o.gen} obj\n${dictTxt}\nstream\n`));add(bytes);add(B1("\nendstream\nendobj\n"));
    }
    if(!troca)return null;
    const max=Math.max(...offs.keys()),xr=pos;let x=`xref\n0 ${max+1}\n`;
    for(let i=0;i<=max;i++){const e=offs.get(i);x+=e?`${String(e.pos).padStart(10,"0")} ${String(e.gen).padStart(5,"0")} n \n`:`0000000000 65535 f \n`}
    const tr=trailer.filter(([k])=>["/Root","/Info","/ID"].includes(k));tr.push(["/Size",String(max+1)]);
    add(B1(x+`trailer\n${pDictStr(tr)}\nstartxref\n${xr}\n%%EOF\n`));
    const out=new Uint8Array(pos);let q=0;for(const p of partes){out.set(p,q);q+=p.length}
    return{bytes:out,imagens:troca,poupado:poup};
  }catch(e){return null}
}
const fmtTam=b=>b>=1048576?(b/1048576).toFixed(1).replace(".",",")+" MB":Math.max(1,Math.round(b/1024))+" KB";
async function compactarExistentes(onProg){
  if(!RT.assets)throw new Error("Só quem é Editor do painel pode compactar os arquivos já enviados.");
  const img=comprimivel,itens=[],MIN=120000;
  Object.values(S.docs).forEach(d=>{if(d.assetId&&img(d.type)&&(d.size||0)>MIN)itens.push({id:d.assetId,nome:d.nome,type:d.type,
    set:(r,nome)=>put("docs",d.id,{...strip(d),assetId:r.id,size:r.sizeBytes,type:r.contentType,nome})})});
  Object.values(S.nfarq).forEach(d=>{if(d.asset&&img(d.type)&&(d.tam||0)>MIN)itens.push({id:d.asset,nome:d.nome,type:d.type,
    set:(r,nome)=>put("nfarq",d.id,{...strip(d),asset:r.id,tam:r.sizeBytes,type:r.contentType,nome})})});
  finAll().forEach(e=>(e.anexos||[]).forEach(a=>{if(img(a.type)&&(a.size||0)>MIN)itens.push({id:a.id,nome:a.nome,type:a.type,
    set:(r,nome)=>finMutate(all=>all.map(x=>x.id===e.id?{...x,anexos:(x.anexos||[]).map(y=>y.id===a.id?{...y,id:r.id,size:r.sizeBytes,type:r.contentType,nome}:y)}:x))})}));
  let feitos=0,poupado=0,falhas=0;
  for(const [k,it] of itens.entries()){
    if(onProg)onProg(k+1,itens.length);
    try{
      const r0=await fetch("/_blob/"+it.id);if(!r0.ok)throw 0;
      const f=new File([await r0.blob()],it.nome||"arquivo",{type:it.type}),c=await comprimir(f,true);
      if(!c.comprimido||c.depois>c.antes*.85)continue;
      const r=await RT.assets.upload(c.file,{type:c.file.type});
      it.set(r,c.file.name);
      await RT.assets.delete(it.id).catch(()=>{});
      feitos++;poupado+=c.antes-c.depois;
    }catch(e){falhas++}
  }
  if(poupado)registrarEconomia(poupado,0);
  return{total:itens.length,feitos,poupado,falhas};
}
function acArmazenamento(){
  const cur=cfgG().compressao||"equilibrada",ec=S.config.armazenamento||{},pc=ec.antes?Math.round(100*(1-ec.depois/ec.antes)):0;
  return `<div class="card"><h2>Compressão dos arquivos</h2><p class="sub" style="margin:0 0 10px">Toda foto, imagem e PDF enviado (documentos, comprovantes e notas fiscais) é reduzido antes de ser guardado. Para cada imagem o sistema procura a compressão mais forte que ainda fica fiel ao original. PDF só de texto já é leve e quase não muda; PDF escaneado costuma encolher de 70% a 90%.</p>
   ${Object.entries(COMP_NIVEIS).map(([k,n])=>`<label style="display:flex;gap:10px;align-items:flex-start;font-weight:400;color:var(--ink);margin:0 0 8px;padding:10px;border:1px solid var(--line);border-radius:10px"><input type="radio" name="compn" value="${k}" ${k===cur?"checked":""} style="margin-top:3px"><span><b>${n.nome}</b>${k==="equilibrada"?' <span class="chip">recomendado</span>':""}<br><span class="sub">${n.desc}</span></span></label>`).join("")}</div>
   <div class="card"><h2>Espaço economizado</h2><div class="stats">
    <div class="stat"><b>${ec.antes?fmtTam(Math.max(0,ec.antes-ec.depois)):"—"}</b><span>economizados${ec.desde?" desde "+brDate(ec.desde):""}</span></div>
    <div class="stat"><b>${ec.antes?pc+"%":"—"}</b><span>menor que os originais</span></div>
    <div class="stat"><b>${ec.n||0}</b><span>arquivos comprimidos</span></div></div>
   <div id="acuso" class="sub" style="margin-top:10px">${RT.assets?"Lendo o espaço usado…":"O espaço usado só aparece para Editores do painel."}</div></div>
   <div class="card"><h2>Compactar o que já foi enviado</h2><p class="sub" style="margin:0 0 10px">Refaz, com o nível escolhido acima, as imagens que já estão guardadas e são grandes (documentos dos integrantes, comprovantes e notas fiscais). Só troca o arquivo quando a economia passa de 15%. O nome fica igual, com a extensão .jpg.</p>
   <button class="b" id="acompact" style="flex:none" ${RT.assets?"":"disabled"}>Compactar imagens já enviadas</button><div id="acprog" class="sub" style="margin-top:8px">${RT.assets?"":"Só Editores do painel podem usar."}</div></div>`;
}
function bindArmaz(){
  document.querySelectorAll('input[name="compn"]').forEach(r=>r.onchange=()=>{saveCfg({compressao:r.value});audit("perm","nível de compressão: "+COMP_NIVEIS[r.value].nome);toast("Nível de compressão salvo.")});
  if(RT.assets)RT.assets.list().then(l=>{const b=$("acuso");if(!b)return;const u=l.usage;b.innerHTML=`Espaço usado pelos arquivos: <b>${fmtTam(u.bytes)}</b> de ${fmtTam(u.maxBytes)} (${u.files} arquivo(s)).<div class="bar" style="width:100%;margin-top:6px"><i style="width:${Math.min(100,100*u.bytes/u.maxBytes)}%"></i></div>`}).catch(()=>{});
  const b=$("acompact");if(b)b.onclick=async()=>{
    if(!await askConfirm("Compactar as imagens já enviadas? Cada arquivo é substituído por uma versão menor.","Compactar"))return;
    b.disabled=true;const p=$("acprog");
    try{
      const r=await compactarExistentes((i,n)=>{p.textContent=`Compactando ${i} de ${n}…`});
      p.textContent=r.total?`Pronto: ${r.feitos} de ${r.total} imagem(ns) compactada(s), ${fmtTam(r.poupado)} economizados${r.falhas?` · ${r.falhas} com erro`:""}.`:"Nenhuma imagem grande para compactar.";
      audit("perm",`compactou ${r.feitos} imagens (${fmtTam(r.poupado)})`);setTimeout(()=>go("acesso",true),2500);
    }catch(e){p.textContent=e.message;b.disabled=false}
  };
}

