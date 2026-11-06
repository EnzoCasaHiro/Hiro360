/* ===== Módulos gerais: framework de "Mais recursos" por tela + registros genéricos ===== */
const XM={sec:{},sim:{}};
const XMSECS={};
const XMREG={};
const XMURG=[];
const xmcfg=m=>xcfg("m_"+m);
const xmsave=(m,p)=>xcfgSave("m_"+m,p);
function xmReg(route,k,g,l,html,bind){
  const L=XMSECS[route]=XMSECS[route]||[],o={k,g,l,html,bind:bind||(()=>{})},i=L.findIndex(s=>s.k===k);
  if(i>=0)L[i]=o;else L.push(o);
}
const xmUrg=fn=>XMURG.push(fn);
(function(){
  const st=document.createElement("style");
  st.textContent=`.xmp summary{cursor:pointer;font-weight:700;padding:4px 0}.xmp .chips{margin:2px 0 6px}
  .xmprint{background:#fff;color:#000;padding:16px;border:1px solid #ccc;border-radius:8px;margin:8px 0}
  .xmprint .cartao{display:inline-block;width:8.6cm;min-height:5.4cm;border:1px solid #333;border-radius:8px;padding:8px;margin:6px;vertical-align:top;font-size:12px}
  .xmprint .pulseira{display:block;width:20cm;max-width:100%;border:1px dashed #333;padding:4px 8px;margin:4px 0;font-size:13px}
  @media print{body.xmprinting>*:not(#xmprintroot){display:none!important}body.xmprinting #xmprintroot{display:block!important;position:static}.xmnoprint{display:none!important}}`;
  document.head.appendChild(st);
})();
function xmPrint(titulo,html){
  const ov=openModal(`<h3>${titulo}</h3><div class="xmprint" id="xmprintroot">${html}</div><div class="xmnoprint" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="xmpx">Fechar</button><button class="b" id="xmpp">Imprimir</button></div>`);
  ov.querySelector("#xmpx").onclick=()=>ov.remove();
  ov.querySelector("#xmpp").onclick=()=>{document.body.classList.add("xmprinting");try{window.print()}catch(e){toast("A impressão não está disponível aqui.",true)}setTimeout(()=>document.body.classList.remove("xmprinting"),500)};
  return ov;
}
function xmPanel(route){
  const L=XMSECS[route];if(!L||!L.length)return"";
  const cur=L.find(s=>s.k===XM.sec[route]),grupos=[...new Set(L.map(s=>s.g))];
  const nav=grupos.map(g=>`<details ${cur&&cur.g===g?"open":""}><summary>${g} <span class="sub" style="font-weight:400">(${L.filter(s=>s.g===g).length})</span></summary><div class="chips">${L.filter(s=>s.g===g).map(s=>`<button class="b ${cur&&cur.k===s.k?"":"sec"} sm" style="margin:2px" data-xmsec="${s.k}">${s.l}</button>`).join("")}</div></details>`).join("");
  let body="";if(cur){try{body=cur.html()}catch(e){console.error(e);body=`<div class="card"><div class="empty">Erro ao montar esta seção: ${f6Esc(e.message)}</div></div>`}}
  return `<div class="card xmp" id="xmpanel" style="margin-top:14px"><h2>Mais recursos desta tela</h2><p class="sub" style="margin:0 0 8px">Ferramentas extras. Escolha uma para abrir.</p>${nav}</div>${body}`;
}
function xmGo(){go(ROUTE,true)}
function xmBind(route){
  const L=XMSECS[route];if(!L)return;
  document.querySelectorAll("[data-xmsec]").forEach(b=>b.onclick=()=>{XM.sec[route]=XM.sec[route]===b.dataset.xmsec?"":b.dataset.xmsec;xmGo()});
  const cur=L.find(s=>s.k===XM.sec[route]);if(cur)try{cur.bind()}catch(e){console.error(e)}
  xmRegBind();
}
function xmWrap(route,pg,bd){
  const P=window[pg],B=window[bd];if(!P||!B)return;
  window[pg]=function(){return P.apply(this,arguments)+xmPanel(route)};
  window[bd]=function(){B.apply(this,arguments);xmBind(route)};
}
/* ---------- registros genéricos (lista + formulário + excluir) ---------- */
const xmResOpts=()=>resAll().filter(r=>r.sit!=="Óbito").sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt")).map(r=>[r.id,resNome(r)+((r.alergias||"").trim()?" ⚠ alergia":"")]);
const xmResNome=id=>resNomeDe(id)||"";
const xmColOpts=()=>[["","—"],...integList().map(i=>[i.id,nomeInteg(i)])];
const xmColNome=id=>{const i=S.integrantes[id];return i?nomeInteg(i):(id?"(removido)":"")};
function xmRegistro(o){
  XMREG[o.mod+"|"+o.key]=o;
  const get=()=>xmcfg(o.mod)[o.key]||[];o.get=get;
  const campos=x=>[...(o.res?[{k:"res",l:"Residente",t:"select",opts:[["","—"],...xmResOpts()],v:x.res||XM.sim["f_"+o.mod+o.key]||(o.mod==="pres"?PRES.sel:"")||""}]:[]),...o.campos.map(c=>({...c,opts:typeof c.opts==="function"?c.opts():c.opts,list:typeof c.list==="function"?c.list():c.list,v:x[c.k]!=null?x[c.k]:(c.d!=null?(typeof c.d==="function"?c.d():c.d):c.v)}))];
  o.formCampos=campos;
  const html=()=>{
    const ed=podeEd(o.mod),F=XM.sim["f_"+o.mod+o.key]!==undefined?XM.sim["f_"+o.mod+o.key]:(o.mod==="pres"?PRES.sel||"":""),q=f7Norm(XM.sim["q_"+o.mod+o.key]||"");
    let L=get().slice().reverse();
    if(F)L=L.filter(x=>x.res===F);
    if(q)L=L.filter(x=>f7Norm(JSON.stringify(x)+" "+xmResNome(x.res)).includes(q));
    if(o.filtro)L=L.filter(o.filtro);
    return f6Card(o.titulo,o.sub||"",
     `<div class="row" style="margin-bottom:8px;align-items:flex-end">${ed?`<button class="b sm" data-xmn="${o.mod}|${o.key}">${o.novo||"Novo registro"}</button>`:""}${o.res?`<div><label>Residente</label><select data-xmf="${o.mod}|${o.key}"><option value="">Todos</option>${xmResOpts().map(([i,n])=>`<option value="${i}" ${F===i?"selected":""}>${f6Esc(n)}</option>`).join("")}</select></div>`:""}<div style="flex:1;min-width:140px"><label>Buscar</label><input data-xmq="${o.mod}|${o.key}" value="${f6Esc(XM.sim["q_"+o.mod+o.key]||"")}" placeholder="Digite para filtrar"></div>${o.topo?o.topo():""}</div>`+
     (L.length?f6Tbl([...(o.res?["Residente"]:[]),...o.cols.map(c=>c[1]),""],[L.slice(0,+XM.sim["lim_"+o.mod+o.key]||200).map(x=>`<tr>${o.res?`<td>${f6Esc(xmResNome(x.res)||"—")}</td>`:""}${o.cols.map(c=>`<td class="${c[2]||""}">${c[0](x)}</td>`).join("")}<td style="white-space:nowrap">${o.extra?o.extra(x):""}${ed?` <button class="b sec sm" data-xme="${o.mod}|${o.key}|${x.id}">Editar</button> <button class="b sec sm" data-xmd="${o.mod}|${o.key}|${x.id}">Excluir</button>`:""}</td></tr>`).join("")],"txt"):`<div class="empty">Nada registrado${F||q?" com esse filtro":""}.</div>`)+(o.rodape?o.rodape(get()):""));
  };
  return ()=>{const h=html(),lim=+XM.sim["lim_"+o.mod+o.key]||200,n=get().length;return h+(n>lim?`<div class="row" style="margin:-6px 0 12px"><button class="b sec sm" data-xmmais="${o.mod}|${o.key}">Mostrar mais (${n-lim} restantes, até ${lim} mostrados)</button></div>`:"")};
}
function xmRegEdit(mod,key,id){
  const o=XMREG[mod+"|"+key],x=o.get().find(a=>a.id===id)||{};
  f6Form(id?"Editar":(o.novo||"Novo registro"),o.formCampos(x),async v=>{
    if(o.res&&o.resObrig!==false&&!v.res)return"Escolha o residente.";
    const er=o.ok?o.ok(v,x):null;if(er)return er;
    const reg={...x,...v,id:x.id||uid8()};if(!x.id){reg.em=hojeIso();reg.por=(typeof f4Quem==="function"?f4Quem():"")||"";if(o.anon)delete reg.por}
    const L=o.get();xmsave(mod,{[key]:id?L.map(a=>a.id===id?reg:a):[...L,reg]});
    if(o.depois)o.depois(reg,!id);
    xmGo();
  });
}
function xmRegBind(){
  xmAnexoBind();
  document.querySelectorAll("[data-xmn]").forEach(b=>b.onclick=()=>{const[m,k]=b.dataset.xmn.split("|");const R=XMREG[m+"|"+k];if(R&&R.custom)return R.custom();xmRegEdit(m,k)});
  document.querySelectorAll("[data-xme]").forEach(b=>b.onclick=()=>{const[m,k,i]=b.dataset.xme.split("|");xmRegEdit(m,k,i)});
  document.querySelectorAll("[data-xmd]").forEach(b=>b.onclick=async()=>{const[m,k,i]=b.dataset.xmd.split("|"),o=XMREG[m+"|"+k];if(!await askConfirm("Excluir este registro?","Excluir"))return;xmsave(m,{[k]:o.get().filter(a=>a.id!==i)});xmGo()});
  document.querySelectorAll("[data-xma]").forEach(b=>b.onclick=async()=>{const[m,k,i,ac]=b.dataset.xma.split("|"),o=XMREG[m+"|"+k],x=o.get().find(a=>a.id===i);if(!x||!o.acoes||!o.acoes[ac])return;const p=await o.acoes[ac](x);if(p){xmRegPatch(m,k,i,p);xmGo()}});
  document.querySelectorAll("[data-xmf]").forEach(s=>s.onchange=()=>{XM.sim["f_"+s.dataset.xmf.replace("|","")]=s.value;xmGo()});
  document.querySelectorAll("[data-xmq]").forEach(i=>i.onchange=()=>{XM.sim["q_"+i.dataset.xmq.replace("|","")]=i.value;xmGo()});
}
/* atualiza um registro sem abrir formulário */
function xmRegPatch(mod,key,id,patch){const o=XMREG[mod+"|"+key];xmsave(mod,{[key]:o.get().map(a=>a.id===id?{...a,...(typeof patch==="function"?patch(a):patch)}:a)})}
/* registro que só existe uma vez por residente (ficha de perfil, preferências etc.) */
function xmFicha(o){
  XMREG[o.mod+"|"+o.key]={...o,get:()=>[]};
  const get=()=>xmcfg(o.mod)[o.key]||{};
  return{html:()=>{
    const ed=podeEd(o.mod);
    const sel=XM.sim["fs_"+o.key]||"",r=sel?resAll().find(x=>x.id===sel):null,d=r?get()[sel]||{}:{};
    return f6Card(o.titulo,o.sub||"",`<div class="row" style="align-items:flex-end"><div><label>Residente</label><select data-xmfs="${o.key}"><option value="">Escolha…</option>${xmResOpts().map(([i,n])=>`<option value="${i}" ${sel===i?"selected":""}>${f6Esc(n)}</option>`).join("")}</select></div>${r&&ed?`<button class="b sm" data-xmfe="${o.mod}|${o.key}">Editar</button>`:""}${r&&o.pdf?`<button class="b sec sm" data-xmfp="${o.mod}|${o.key}">PDF</button>`:""}</div>`+(r?f6Tbl(["Campo","Informação"],[o.campos.filter(c=>c.t!=="sep"&&c.t!=="note").map(c=>`<tr><td>${f6Esc(c.l)}</td><td>${c.t==="check"?(d[c.k]?"sim":"não"):c.t==="select"&&c.opts?f6Esc((c.opts.map(a=>Array.isArray(a)?a:[a,a]).find(a=>String(a[0])===String(d[c.k]))||["",d[c.k]||""])[1]):f6Esc(d[c.k]==null||d[c.k]===""?"—":d[c.k])}</td></tr>`).join("")],"txt"):`<div class="empty">Escolha um residente.</div>`));
  },bind:()=>{
    document.querySelectorAll("[data-xmfs]").forEach(s=>s.onchange=()=>{XM.sim["fs_"+s.dataset.xmfs]=s.value;xmGo()});
    document.querySelectorAll("[data-xmfe]").forEach(b=>b.onclick=()=>{const sel=XM.sim["fs_"+o.key],d=get()[sel]||{};f6Form("Editar — "+xmResNome(sel),o.campos.map(c=>({...c,v:d[c.k]!=null?d[c.k]:c.v})),v=>{const er=o.ok?o.ok(v):null;if(er)return er;xmsave(o.mod,{[o.key]:{...get(),[sel]:{...d,...v,atualizadoEm:hojeIso()}}});xmGo()})});
    document.querySelectorAll("[data-xmfp]").forEach(b=>b.onclick=()=>{const sel=XM.sim["fs_"+o.key];f5Pdf(`${o.key}-${safe(xmResNome(sel)).slice(0,25)}.pdf`,o.pdf(sel,get()[sel]||{}))});
  },get};
}
/* avisos agregados na tela inicial */
const _urgM0=urgencias;
urgencias=function(per){const L=_urgM0(per);XMURG.forEach(fn=>{try{(fn()||[]).forEach(x=>L.push(x))}catch(e){console.error(e)}});return L};
/* utilidades */
const xmDias=d=>d?daysBetweenIso(hojeIso(),d):null;
const xmVenc=(d,aviso)=>{if(!d)return"—";const n=xmDias(d);return `${brDate(d)} ${n<0?f6Dot("#c62828")+"vencido":n<=(aviso||30)?f6Dot("#e0a100")+"em "+n+" d":f6Dot("#2e7d32")+"em dia"}`};
const xmSim=(k,v)=>{if(v!==undefined)XM.sim[k]=v;return XM.sim[k]};
[["res","pgRes","bindRes"],["pres","pgPres","bindPres"],["pront","pgPront","bindPront"],["ponto","pgPonto","bindPonto"],["turnos","pgTurnos","bindTurnos"],["contador","pgContador","bindContador"],["estoque","pgEstoque","bindEstoque"],["nf","pgNF","bindNF"],["prest","pgPrest","bindPrest"],["contab","pgContab","bindContab"],["docs","pgDocs","bindDocs"],["rel","pgRel","bindRel"],["home","pgHome","bindHome"],["agenda","pgAgenda","bindAgenda"],["acesso","pgAcesso","bindAcesso"]].forEach(a=>xmWrap(...a));

const xmAcao=(o,id,ac,txt,cls)=>`<button class="b ${cls||"sec"} sm" data-xma="${o.mod}|${o.key}|${id}|${ac}">${txt}</button> `;
function xmCsv(txt){
  const sep=(txt.split("\n")[0].match(/;/g)||[]).length>=(txt.split("\n")[0].match(/,/g)||[]).length?";":",",rows=[];let cur=[],f="",q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===sep){cur.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&txt[i+1]==="\n")i++;cur.push(f);f="";if(cur.some(x=>x.trim()))rows.push(cur);cur=[]}else f+=c}
  cur.push(f);if(cur.some(x=>x.trim()))rows.push(cur);return rows;
}
function xmLev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
/* checklist por residente (ou geral): itens marcáveis com progresso */
function xmChecklist(o){
  const get=()=>xmcfg(o.mod)[o.key]||{},chave=()=>o.res===false?"_":(XM.sim["cl_"+o.key]||"");
  const html=()=>{
    const ed=podeEd(o.mod),k=chave(),d=get()[k]||{},n=o.itens.filter((_,i)=>d[i]).length,per=o.periodo?(XM.sim["cp_"+o.key]||hojeIso()):null,dd=per?(get()[k+"|"+per]||{}):d,nn=o.itens.filter((_,i)=>dd[i]).length;
    return f6Card(o.titulo,o.sub||"",
      `<div class="row" style="align-items:flex-end">${o.res===false?"":`<div><label>Residente</label><select data-xmcs="${o.key}"><option value="">Escolha…</option>${xmResOpts().map(([i,nm])=>`<option value="${i}" ${k===i?"selected":""}>${f6Esc(nm)}</option>`).join("")}</select></div>`}${per?`<div><label>Data</label><input type="date" data-xmcp="${o.key}" value="${per}"></div>`:""}</div>`+
      ((o.res===false||k)?`<p class="sub">${nn} de ${o.itens.length} concluído(s) · ${Math.round(nn/o.itens.length*100)}%</p>`+o.itens.map((t,i)=>`<label style="display:flex;gap:8px;font-weight:400;margin:4px 0"><input type="checkbox" data-xmck="${o.key}|${i}" ${dd[i]?"checked":""} ${ed?"":"disabled"}> ${f6Esc(t)}</label>`).join(""):`<div class="empty">Escolha um residente.</div>`));
  };
  const bind=()=>{
    document.querySelectorAll("[data-xmcs]").forEach(s=>s.onchange=()=>{XM.sim["cl_"+o.key]=s.value;xmGo()});
    document.querySelectorAll("[data-xmcp]").forEach(s=>s.onchange=()=>{XM.sim["cp_"+o.key]=s.value;xmGo()});
    document.querySelectorAll("[data-xmck]").forEach(c=>c.onchange=()=>{const i=+c.dataset.xmck.split("|")[1],k=chave()+(o.periodo?"|"+(XM.sim["cp_"+o.key]||hojeIso()):""),G=get(),d={...(G[k]||{}),[i]:c.checked};xmsave(o.mod,{[o.key]:{...G,[k]:d}});xmGo()});
  };
  o.progresso=rid=>{const d=get()[rid]||{};return o.itens.filter((_,i)=>d[i]).length/o.itens.length};
  return{html,bind};
}

/* gráfico de linha simples (SVG). pts=[{x:'2026-10-01',y:70}], ref={min,max} opcional */
function xmGrafico(pts,o){
  o=o||{};if(pts.length<2)return`<div class="empty">São necessários ao menos 2 registros para o gráfico.</div>`;
  const W=640,H=180,pl=44,pb=22,ys=pts.map(p=>p.y),mn=Math.min(...ys,o.ref?o.ref.min:Infinity),mx=Math.max(...ys,o.ref?o.ref.max:-Infinity),sc=v=>H-pb-((v-mn)/((mx-mn)||1))*(H-pb-12),n=pts.length,X=i=>pl+(W-pl-8)*i/(n-1);
  const line=pts.map((p,i)=>`${X(i)},${sc(p.y)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto">${o.ref?`<rect x="${pl}" y="${sc(o.ref.max)}" width="${W-pl-8}" height="${Math.max(2,sc(o.ref.min)-sc(o.ref.max))}" fill="#2e7d32" opacity=".12"/>`:""}<polyline fill="none" stroke="#2e7d32" stroke-width="2" points="${line}"/>${pts.map((p,i)=>`<circle cx="${X(i)}" cy="${sc(p.y)}" r="3" fill="${o.ref&&(p.y<o.ref.min||p.y>o.ref.max)?"#c62828":"#2e7d32"}"><title>${brDate(p.x)}: ${String(p.y).replace(".",",")}</title></circle>`).join("")}${[mn,(mn+mx)/2,mx].map(v=>`<text x="${pl-4}" y="${sc(v)+4}" font-size="10" text-anchor="end" fill="currentColor">${(Math.round(v*10)/10).toString().replace(".",",")}</text>`).join("")}<text x="${pl}" y="${H-6}" font-size="10" fill="currentColor">${brDate(pts[0].x)}</text><text x="${W-8}" y="${H-6}" font-size="10" text-anchor="end" fill="currentColor">${brDate(pts[n-1].x)}</text></svg>`;
}
/* anexo (imagem reduzida ou arquivo pequeno) guardado em documento próprio */
async function xmLerAnexo(file){
  if(/^image\//.test(file.type))return{d:await xrFotoRedimensiona(file,900),nome:file.name,tipo:"image/jpeg"};
  if(file.size>180000)throw new Error("arquivo grande demais (máx. 180 KB; para imagens o sistema reduz sozinho)");
  const d=await new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>er(new Error("arquivo ilegível"));r.readAsDataURL(file)});
  return{d,nome:file.name,tipo:file.type};
}
const xmAnexo=id=>xcfg("anx_"+id);
function xmAnexoBtn(id){const a=xmAnexo(id);return `<label class="b sec sm" style="cursor:pointer">${a.d?"Trocar anexo":"Anexar"}<input type="file" hidden data-xmanx="${id}"></label>${a.d?` <button class="b sec sm" data-xmanv="${id}">Ver anexo</button>`:""} `}
function xmAnexoBind(){
  document.querySelectorAll("[data-xmanx]").forEach(i=>i.onchange=async()=>{try{xcfgSave("anx_"+i.dataset.xmanx,await xmLerAnexo(i.files[0]));toast("Anexo salvo.");xmGo()}catch(e){toast("Não foi possível anexar: "+e.message,true)}});
  document.querySelectorAll("[data-xmanv]").forEach(b=>b.onclick=()=>{const a=xmAnexo(b.dataset.xmanv);const ov=openModal(`<h3>${f6Esc(a.nome||"Anexo")}</h3>${/^image/.test(a.tipo||"")?`<img src="${a.d}" style="max-width:100%">`:`<iframe src="${a.d}" style="width:100%;height:60vh;border:0"></iframe>`}<div style="text-align:right;margin-top:10px"><button class="b" id="xmanx">Fechar</button></div>`);ov.querySelector("#xmanx").onclick=()=>ov.remove()});
}

document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-xmmais]");if(!b)return;const k=b.dataset.xmmais.replace("|","");XM.sim["lim_"+k]=(+XM.sim["lim_"+k]||200)+300;xmGo()});


/* >>> x_m1.js */
