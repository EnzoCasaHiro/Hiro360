/* ================= PLANEJAMENTO FINANCEIRO ================= */
HIST.off.add("extrato");
const centavos=v=>Math.round((+v||0)*100);
const parseValorBR=s=>{s=String(s||"").trim().replace(/[R$\s]/g,"");if(!s)return NaN;const neg=/^\(.*\)$/.test(s)||s.startsWith("-");s=s.replace(/[()\-+]/g,"");
  if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(/,/g,"");const n=parseFloat(s);return isNaN(n)?NaN:(neg?-n:n)};
const parseDataBR=s=>{s=String(s||"").trim();let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?!\d)/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?!\d)/);if(m)return m[0];m=s.match(/^(\d{4})(\d{2})(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;return""};
function lerExtrato(texto,nome){
  const L=[];
  if(/<STMTTRN>/i.test(texto)||/\.ofx$/i.test(nome||"")){
    const blocos=texto.split(/<STMTTRN>/i).slice(1);
    blocos.forEach(b=>{const g=t=>{const m=b.match(new RegExp("<"+t+">([^<\\r\\n]*)","i"));return m?m[1].trim():""};
      const tv=g("TRNAMT"),v=/,\d{1,2}$/.test(tv)?parseValorBR(tv):parseFloat(tv.replace(",","."));const d=parseDataBR(g("DTPOSTED"));if(isNaN(v)||!d||!finDataOk(d))return;
      L.push({data:d,desc:(g("MEMO")||g("NAME")||"Lançamento").replace(/\s+/g," "),valor:v,fitid:g("FITID")})});
    return L;
  }
  const linhas=texto.split(/\r?\n/).filter(l=>l.trim());if(!linhas.length)return L;
  const sep=(linhas[0].match(/;/g)||[]).length>=(linhas[0].match(/,/g)||[]).length?";":",";
  const cels=l=>{const o=[];let c="",q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===sep&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o.map(x=>x.trim())};
  let cab=cels(linhas[0]).map(estNorm),temCab=cab.some(x=>/data|descri|historico|valor/.test(x));
  let iD=temCab?cab.findIndex(x=>/^data/.test(x)):0,iH=temCab?cab.findIndex(x=>/descri|historico|lancamento|memo/.test(x)):1,iV=temCab?cab.findIndex(x=>/^valor|montante/.test(x)):2;
  const iC=temCab?cab.findIndex(x=>/^credito/.test(x)):-1,iDb=temCab?cab.findIndex(x=>/^debito/.test(x)):-1;
  linhas.slice(temCab?1:0).forEach(l=>{const c=cels(l),d=parseDataBR(c[iD]);if(!d||!finDataOk(d))return;
    let v=iV>=0?parseValorBR(c[iV]):NaN;if(isNaN(v)&&(iC>=0||iDb>=0)){const cr=parseValorBR(c[iC]),db=parseValorBR(c[iDb]);v=(isNaN(cr)?0:Math.abs(cr))-(isNaN(db)?0:Math.abs(db))}
    if(isNaN(v)||v===0)return;L.push({data:d,desc:(c[iH]||"Lançamento").replace(/\s+/g," "),valor:v,fitid:""})});
  return L;
}
const hashStr=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return(h>>>0).toString(36)};
function extratoImportar(L){
  let novos=0;
  L.forEach(x=>{const id="x"+hashStr(x.fitid||`${x.data}|${x.valor}|${x.desc}`)+(x.fitid?"":""),dup=S.extrato&&S.extrato[id];
    if(dup){return}put("extrato",id,{data:x.data,desc:x.desc,valor:x.valor,fitid:x.fitid||"",conc:"",...(XF.conta?{conta:XF.conta}:{}),em:new Date().toISOString()});novos++});
  extratoAutoConcilia();
  return novos;
}
const sinalTipo=v=>v<0?"pagar":"receber";
// contas em aberto de valor parecido (até 10% de diferença): pagamento com juros ou desconto
function candidatosAprox(ln){
  const alvo=Math.abs(ln.valor),exato=new Set(candidatos(ln,true).map(e=>e.id));
  return finAll().filter(e=>e.tipo===sinalTipo(ln.valor)&&!e.pago&&!exato.has(e.id)&&Math.abs(daysBetweenIso(e.venc,ln.data))<=15&&Math.abs((+e.valor||0)-alvo)>=0.01&&Math.abs((+e.valor||0)-alvo)<=Math.max(1,0.1*alvo))
    .filter(e=>!xs("extrato").some(o=>o.conc===e.id)).sort((a,b)=>Math.abs(a.valor-alvo)-Math.abs(b.valor-alvo));
}
const EXT_TARIFA=/tarifa|iof|juros|taxa|cesta|manuten|anuidade|encargo/i;
function candidatos(ln,aberto){
  return finAll().filter(e=>e.tipo===sinalTipo(ln.valor)&&centavos(aberto?e.valor:finNum(e))===centavos(Math.abs(ln.valor))&&(aberto?(!e.pago&&Math.abs(daysBetweenIso(e.venc,ln.data))<=12):(e.pago&&Math.abs(daysBetweenIso(e.pago,ln.data))<=4)))
    .filter(e=>!xs("extrato").some(o=>o.conc===e.id));
}
function extratoAutoConcilia(){
  let n=0;
  xs("extrato").filter(l=>!l.conc).forEach(l=>{const c=candidatos(l,false);if(c.length===1&&!xs("extrato").some(o=>o.conc===c[0].id)){put("extrato",l.id,{...strip(l),conc:c[0].id});n++}});
  return n;
}
const XF={tab:"conc",saldo:"",dest:""};
function concHtml(){
  const E=xs("extrato"),pend=E.filter(l=>!l.conc).sort((a,b)=>b.data.localeCompare(a.data)),ok_=E.filter(l=>l.conc&&l.conc!=="ignorado").length,pode=podeEd("fin2");
  return `<div class="card"><h2>Conciliação bancária</h2><p class="sub" style="margin:0 0 10px">Importe o extrato do banco (arquivo OFX, ou CSV com data, descrição e valor). O sistema liga cada linha à conta paga ou recebida correspondente e mostra o que ficou sem par. Nada é enviado para fora: a leitura é feita neste navegador.</p>
   ${pode&&f4ContasPag().length>1?`<div class="row"><div style="max-width:320px"><label>Este extrato é de qual conta?</label>${f4SelConta("extconta",XF.conta)}</div></div>`:""}${pode?`<div class="row"><label class="b" style="flex:none;cursor:pointer">${ic("up")} Importar extrato<input type="file" id="extarq" accept=".ofx,.csv,.txt" style="display:none"></label></div>`:""}
   <div class="stats" style="margin-top:12px"><div class="stat"><b>${E.length}</b><span>linhas importadas</span></div><div class="stat"><b>${ok_}</b><span>conciliadas</span></div><div class="stat ${pend.length?"warn":""}"><b>${pend.length}</b><span>sem par</span></div></div></div>
   ${pend.length?`<div class="card"><h2>Linhas sem par</h2>${pend.slice(0,60).map(l=>{const ab=candidatos(l,true),pg=candidatos(l,false);
     return `<div class="doc" style="align-items:flex-start;flex-wrap:wrap"><div style="flex:0 0 78px"><b>${brDate(l.data).slice(0,5)}</b></div><div class="grow"><div class="nm">${esc(l.desc)}</div><div class="sub" style="color:${l.valor<0?"var(--urgente)":"inherit"}">${l.valor<0?"saiu":"entrou"} R$ ${NUMF(Math.abs(l.valor))}</div>
      ${ab.slice(0,3).map(e=>`<div class="sub">Pode ser: <b>${esc(e.desc)}</b> (vence ${brDate(e.venc)}) ${pode?`<button class="b sm" data-fcm="${l.id}|${e.id}|pay">Marcar como ${e.tipo==="receber"?"recebido":"pago"} em ${brDate(l.data).slice(0,5)}</button>`:""}</div>`).join("")}
      ${candidatosAprox(l).slice(0,2).map(e=>`<div class="sub">Valor parecido: <b>${esc(e.desc)}</b> (vence ${brDate(e.venc)}, previsto R$ ${NUMF(e.valor)}) ${pode?`<button class="b sec sm" data-fcm="${l.id}|${e.id}|pay">Marcar como ${e.tipo==="receber"?"recebido":"pago"} com R$ ${NUMF(Math.abs(l.valor))}</button>`:""}</div>`).join("")}
      ${pg.slice(0,2).map(e=>`<div class="sub">Já ${e.tipo==="receber"?"recebido":"pago"}: <b>${esc(e.desc)}</b> ${pode?`<button class="b sec sm" data-fcm="${l.id}|${e.id}|link">Ligar</button>`:""}</div>`).join("")}</div>
      ${pode?`<div style="white-space:nowrap"><button class="b sec sm" data-fcn="${l.id}">Criar lançamento</button> <button class="b sec sm" data-fcl="${l.id}">Várias contas / fatura</button> <button class="b sec sm" data-fct="${l.id}">Transferência</button> <button class="b sec sm" data-fci="${l.id}">Ignorar</button></div>`:""}</div>`}).join("")}${pend.length>60?`<p class="sub">Mostrando 60 de ${pend.length}.</p>`:""}</div>`:E.length?`<div class="card"><div class="empty">Tudo conciliado.</div></div>`:""}`;
}
function bindConc(){
  const f=$("extarq");if(f)f.onchange=async()=>{const a=f.files[0];if(!a)return;const ec=$("extconta");if(ec)XF.conta=ec.value;try{const L=lerExtrato(await a.text(),a.name);if(!L.length)return toast("Não encontrei lançamentos nesse arquivo. Confira o formato.",true);const n=extratoImportar(L);toast(`${n} linha(s) nova(s) importada(s).`);go("fin2",true)}catch(e){toast("Não consegui ler o arquivo.",true)}};
  document.querySelectorAll("[data-fcm]").forEach(b=>b.onclick=()=>{const[lid,fid,ac]=b.dataset.fcm.split("|"),l=S.extrato[lid];
    if(ac==="pay")finMutate(all=>all.map(e=>e.id===fid?{...e,pago:l.data,valorPago:Math.abs(l.valor),...(l.conta?{conta:l.conta}:{})}:e));
    put("extrato",lid,{...strip(l),conc:fid});go("fin2",true)});
  document.querySelectorAll("[data-fcl]").forEach(b=>b.onclick=()=>f5ConcLote(b.dataset.fcl));
  document.querySelectorAll("[data-fct]").forEach(b=>b.onclick=()=>f5ConcTransf(b.dataset.fct));
  document.querySelectorAll("[data-fcn]").forEach(b=>b.onclick=()=>{const l=S.extrato[b.dataset.fcn],tipo=sinalTipo(l.valor),tarifa=EXT_TARIFA.test(l.desc);
    const cats=[...new Set(finAll().map(e=>e.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
    const ov=openModal(`<h3>Criar lançamento a partir do extrato</h3><p class="sub">${esc(brDate(l.data))} · ${esc(l.desc)} · ${l.valor<0?"saiu":"entrou"} R$ ${NUMF(Math.abs(l.valor))}</p>
     <label>${tipo==="pagar"?"Fornecedor":"Cliente / fonte"}</label><input id="fcnc" value="${tarifa?"Banco":(typeof f8Apr==="function"?esc(f8Apr(l).contra):"")}" placeholder="${tipo==="pagar"?"quem recebeu o pagamento":"quem pagou"}">
     <label>Categoria</label><input id="fcnk" list="fcnkl" value="${tarifa?"Tarifas bancárias":(typeof f8Apr==="function"?esc(f8Apr(l).cat):"")}" placeholder="ex.: Energia, Mensalidades"><datalist id="fcnkl">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
     <div class="err" id="fcne"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="fcncx">Cancelar</button><button class="b" id="fcnok">Criar</button></div>`);
    ov.querySelector("#fcncx").onclick=()=>ov.remove();
    ov.querySelector("#fcnok").onclick=()=>{const contra=ov.querySelector("#fcnc").value.trim(),cat=ov.querySelector("#fcnk").value.trim();
      if(!contra)return ov.querySelector("#fcne").textContent=tipo==="pagar"?"Informe o fornecedor.":"Informe quem pagou.";
      const id=uid8();if(typeof f8Aprende==="function")f8Aprende(l,contra,cat);
      finMutate(all=>[...all,{id,tipo,desc:l.desc,contra,...(tipo==="pagar"?{fornId:finFornId(contra,null)}:{}),cat:cat||"A classificar",area:"",forma:"Transferência",obs:"criado pela conciliação bancária",valor:Math.abs(l.valor),venc:l.data,pago:l.data,valorPago:Math.abs(l.valor),...(l.conta?{conta:l.conta}:{})}]);
      put("extrato",l.id,{...strip(l),conc:id});ov.remove();toast("Lançamento criado.");go("fin2",true)};
  });
  document.querySelectorAll("[data-fci]").forEach(b=>b.onclick=()=>{const l=S.extrato[b.dataset.fci];put("extrato",l.id,{...strip(l),conc:"ignorado"});go("fin2",true)});
}
/* ---------- previsão de caixa ---------- */
function previsao(){
  const cfg=xcfg("fin2"),h=hojeIso(),sem=[];let saldo=cfg.saldo===""||cfg.saldo==null?null:+cfg.saldo;
  const ab=finAll().filter(e=>!e.pago&&e.venc<=addDaysIso(h,91));
  for(let k=0;k<13;k++){
    const ini=addDaysIso(h,k*7),fim=addDaysIso(h,k*7+6),isto=e=>k===0?e.venc<=fim:(e.venc>=ini&&e.venc<=fim);
    const ent=ab.filter(e=>e.tipo==="receber"&&isto(e)),sai=ab.filter(e=>e.tipo==="pagar"&&isto(e));
    const E=soma(ent,e=>+e.valor||0),Sd=soma(sai,e=>+e.valor||0);
    if(saldo!=null)saldo=+(saldo+E-Sd).toFixed(2);
    sem.push({ini,fim,E,S:Sd,saldo,nE:ent.length,nS:sai.length});
  }
  return sem;
}
function prevHtml(){
  const cfg=xcfg("fin2"),P=previsao(),mx=Math.max(1,...P.map(x=>Math.max(x.E,x.S))),pode=podeEd("fin2");
  return `<div class="card"><h2>Previsão de caixa — próximos 90 dias</h2><p class="sub" style="margin:0 0 10px">Usa as contas a pagar e a receber em aberto (inclui as recorrências já geradas e as parcelas de notas). Informe o saldo de hoje no banco para ver o saldo projetado semana a semana. A primeira semana inclui o que já está vencido.</p>
   <div class="row" style="align-items:flex-end"><div style="flex:0 0 240px"><label>Saldo hoje no banco (R$)</label><input type="number" step="0.01" id="pvsal" value="${cfg.saldo??""}" ${pode?"":"disabled"}></div>${pode?`<button class="b sec" id="pvsv" style="flex:none">Salvar saldo</button>`:""}</div>
   <div class="wrap" style="margin-top:12px"><table><thead><tr><th>Semana</th><th class="n">Entradas</th><th class="n">Saídas</th><th></th><th class="n">Saldo projetado</th></tr></thead><tbody>${P.map(x=>`<tr><td>${brDate(x.ini).slice(0,5)} a ${brDate(x.fim).slice(0,5)}</td><td class="n">${x.E?"R$ "+NUMF(x.E):"—"}</td><td class="n">${x.S?"R$ "+NUMF(x.S):"—"}</td>
     <td style="min-width:120px"><div style="height:8px;background:var(--verde,#4a7c59);width:${Math.round(100*x.E/mx)}%;opacity:.8;border-radius:3px"></div><div style="height:8px;background:var(--madeira,#a0734a);width:${Math.round(100*x.S/mx)}%;margin-top:2px;border-radius:3px"></div></td>
     <td class="n">${x.saldo==null?'<span class="sub">informe o saldo</span>':`<b style="color:${x.saldo<0?"var(--urgente)":"inherit"}">R$ ${NUMF(x.saldo)}</b>`}</td></tr>`).join("")}</tbody></table></div>
   <p class="sub" style="margin:8px 0 0">Barra verde: entradas · barra marrom: saídas. Projeção simples: não inclui contas que ainda não foram lançadas.</p></div>`;
}
function bindPrev(){const b=$("pvsv");if(b)b.onclick=()=>{const v=$("pvsal").value;xcfgSave("fin2",{saldo:v===""?"":+v,saldoEm:hojeIso()});toast("Saldo salvo.");go("fin2",true)}}
/* ---------- orçamento por área ---------- */
const OR={ym:hojeIso().slice(0,7)};
const areasFin=()=>[...new Set([...(estData().areas||[]),...finAll().map(e=>e.area).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"pt"));
const orcDe=(area,ym)=>{const L=xs("orc").filter(o=>o.area===area&&(!o.ate||o.ate>=ym)&&(!o.de||o.de<=ym)).sort((a,b)=>(b.de||"").localeCompare(a.de||""));return L[0]};
const realizadoArea=(area,ym)=>soma(finAll().filter(e=>e.tipo==="pagar"&&finTemArea(e,area)&&e.venc.slice(0,7)===ym),e=>finValArea(e,area));
const orcCrud={id:"orc",col:"orc",mod:"fin2",novoLabel:"Definir orçamento de uma área",novoTit:"Orçamento mensal",
  campos:[{k:"area",l:"Área",t:"sel",opts:()=>areasFin(),req:true},{k:"valor",l:"Valor por mês (R$)",t:"money",req:true},{k:"de",l:"A partir de (mês)",t:"sel",opts:()=>Array.from({length:18},(_,i)=>addMesesIso(hojeIso().slice(0,8)+"01",i-6).slice(0,7)),vazio:true,help:"Em branco: vale desde sempre"},{k:"obs",l:"Observação"}],
  cols:[{h:"Área",k:"area"},{h:"Por mês",v:r=>"R$ "+NUMF(r.valor)},{h:"A partir de",v:r=>r.de||"sempre"},{h:"Obs.",k:"obs"}],ordem:(a,b)=>a.area.localeCompare(b.area,"pt"),vazio:"Nenhum orçamento definido."};
function orcHtml(){
  const ym=OR.ym,A=areasFin().map(a=>({a,o:orcDe(a,ym),r:realizadoArea(a,ym)})).filter(x=>x.o||x.r>0);
  const tOrc=soma(A,x=>x.o?+x.o.valor:0),tReal=soma(A,x=>x.r);
  return `<div class="card"><div class="row" style="align-items:flex-end"><div style="flex:0 0 190px"><label>Mês</label><input type="month" id="orym" value="${ym}"></div><div class="sub" style="flex:3;align-self:flex-end">Realizado = contas a pagar com vencimento no mês (pagas ou não), por área.</div></div>
   ${A.length?`<div class="wrap" style="margin-top:12px"><table><thead><tr><th>Área</th><th class="n">Orçado</th><th class="n">Realizado</th><th class="n">Diferença</th><th style="min-width:140px">Uso</th></tr></thead><tbody>${A.map(x=>{const o=x.o?+x.o.valor:0,p=o?x.r/o:0;return `<tr><td><b>${esc(x.a)}</b></td><td class="n">${o?"R$ "+NUMF(o):"—"}</td><td class="n">R$ ${NUMF(x.r)}</td><td class="n" style="color:${o&&x.r>o?"var(--urgente)":"inherit"}">${o?(x.r>o?"+":"")+"R$ "+NUMF(x.r-o):"—"}</td>
      <td>${o?`<div style="background:var(--linha,#e6e0d4);border-radius:4px;height:10px"><div style="height:10px;border-radius:4px;width:${Math.min(100,Math.round(p*100))}%;background:${p>1?"var(--urgente)":p>=.9?"#c9892b":"var(--verde,#4a7c59)"}"></div></div><div class="sub">${Math.round(p*100)}%</div>`:'<span class="sub">sem orçamento</span>'}</td></tr>`}).join("")}</tbody><tfoot><tr><td><b>Total</b></td><td class="n"><b>R$ ${NUMF(tOrc)}</b></td><td class="n"><b>R$ ${NUMF(tReal)}</b></td><td class="n"><b>${tOrc?(tReal>tOrc?"+":"")+"R$ "+NUMF(tReal-tOrc):"—"}</b></td><td></td></tr></tfoot></table></div>`:`<div class="empty" style="margin-top:12px">Sem despesas nem orçamento neste mês.</div>`}</div>${xcrud(orcCrud)}`;
}
function bindOrc(){const m=$("orym");if(m)m.onchange=()=>{if(m.value){OR.ym=m.value;go("fin2",true)}}}
/* ---------- lote e duplicar ---------- */
const LOTE={txt:""};
function loteLer(txt){
  const jaTem=new Set(finAll().filter(e=>e.tipo==="pagar").map(e=>estNorm(e.desc)+"|"+centavos(e.valor)+"|"+e.venc)),vistos=new Set(),areas=areasFin().map(estNorm);
  return txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map((l,i)=>{const c=l.split(";").map(x=>x.trim()),v=parseValorBR(c[2]),d=parseDataBR(c[3]);
    let erro=!c[0]?"sem descrição":isNaN(v)||v<=0?"valor inválido":!d||!finDataOk(d)?"vencimento inválido":(c[4]&&!areas.includes(estNorm(c[4])))?"área desconhecida":"";
    let dup="";if(!erro){const k=estNorm(c[0])+"|"+centavos(v)+"|"+d;dup=jaTem.has(k)?"já existe":vistos.has(k)?"repetida na lista":"";vistos.add(k)}
    return{i,desc:c[0],forn:c[1]||"",valor:v,venc:d,area:c[4]||"",cat:c[5]||"",erro,dup}});
}
function loteHtml(){
  const L=LOTE.txt?loteLer(LOTE.txt):[],pode=podeEd("fin2"),rec=finAll().filter(e=>e.tipo==="pagar").sort((a,b)=>b.venc.localeCompare(a.venc)).slice(0,30);
  return `<div class="card"><h2>Lançar várias contas de uma vez</h2><p class="sub" style="margin:0 0 8px">Uma conta por linha, separando por ponto e vírgula: <b>descrição ; fornecedor ; valor ; vencimento ; área ; categoria</b> (área e categoria são opcionais). Dá para colar direto de uma planilha. Exemplo: <i>Conta de luz ; Elektro ; 1.250,40 ; 10/11/2026 ; Administrativo ; Energia</i>. Contas iguais às que já existem (mesma descrição, valor e vencimento) são avisadas.</p>
   <textarea id="lotetxt" style="min-height:130px" placeholder="Conta de luz ; Elektro ; 1.250,40 ; 10/11/2026 ; Administrativo">${esc(LOTE.txt)}</textarea>
   ${L.length?`<div class="wrap" style="margin-top:10px"><table><thead><tr><th>Descrição</th><th>Fornecedor</th><th class="n">Valor</th><th>Vencimento</th><th>Área</th><th>Categoria</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td>${esc(x.desc)}</td><td>${esc(x.forn)}</td><td class="n">${isNaN(x.valor)?"—":"R$ "+NUMF(x.valor)}</td><td>${x.venc?brDate(x.venc):"—"}</td><td>${esc(x.area)}</td><td>${esc(x.cat||"A classificar")}</td><td>${x.erro?xPill(3,x.erro):x.dup?xPill(2,"possível duplicada: "+x.dup):xPill(0,"ok")}</td></tr>`).join("")}</tbody></table></div>${L.some(x=>x.dup&&!x.erro)?`<label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:8px"><input type="checkbox" id="loteforca" ${LOTE.forca?"checked":""}> Lançar também as possíveis duplicadas</label>`:""}`:""}
   <div class="row" style="margin-top:10px"><button class="b sec" id="lotever" style="flex:none">Conferir</button>${pode&&L.length&&!L.some(x=>x.erro)&&L.filter(x=>LOTE.forca||!x.dup).length?`<button class="b" id="loteok" style="flex:none">Lançar ${L.filter(x=>LOTE.forca||!x.dup).length} conta(s)</button>`:""}</div></div>
   <div class="card"><h2>Duplicar uma conta</h2><p class="sub" style="margin:0 0 8px">Copia uma conta recente (aluguel, serviço, assinatura) para uma nova data, sem digitar tudo de novo. Para contas que se repetem todo mês, prefira Recorrências no Financeiro.</p>
   ${rec.map(e=>`<div class="doc"><div class="grow"><div class="nm">${esc(e.desc)}</div><div class="sub">${esc(e.contra||"")} · vence ${brDate(e.venc)} · R$ ${NUMF(e.valor)}</div></div>${pode?`<button class="b sec sm" data-fdup="${e.id}">Duplicar</button>`:""}</div>`).join("")||`<div class="empty">Nenhuma conta a pagar ainda.</div>`}</div>`;
}
function bindLote(){
  const t=$("lotetxt");if(t)t.oninput=()=>{LOTE.txt=t.value};
  const v=$("lotever");if(v)v.onclick=()=>{LOTE.txt=$("lotetxt").value;go("fin2",true)};
  const ok_=$("loteok");if(ok_)ok_.onclick=()=>{const L=loteLer(LOTE.txt).filter(x=>!x.erro&&(LOTE.forca||!x.dup));
    finMutate(all=>[...all,...L.map(x=>({id:uid8(),tipo:"pagar",desc:x.desc,contra:x.forn,fornId:x.forn?"n:"+estNorm(x.forn):"",cat:x.cat||"A classificar",area:x.area,forma:"",obs:"lançado em lote",valor:x.valor,venc:x.venc,pago:null,valorPago:null}))]);
    LOTE.txt="";LOTE.forca=false;toast(L.length+" conta(s) lançada(s).");go("fin2",true)};
  {const fz=$("loteforca");if(fz)fz.onchange=()=>{LOTE.forca=fz.checked;go("fin2",true)}}
  document.querySelectorAll("[data-fdup]").forEach(b=>b.onclick=()=>{const e=finAll().find(x=>x.id===b.dataset.fdup);if(!e)return;
    const ov=openModal(`<h3>Duplicar conta</h3><p class="sub">${esc(e.desc)} — ${esc(e.contra||"")}</p><div class="row"><div><label>Novo vencimento</label><input type="date" id="fdv" value="${addMesesIso(e.venc,1)}"></div><div><label>Valor (R$)</label><input type="number" step="0.01" id="fdval" value="${e.valor}"></div></div>
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="fdcx">Cancelar</button><button class="b" id="fdok">Duplicar</button></div>`);
    ov.querySelector("#fdcx").onclick=()=>ov.remove();
    ov.querySelector("#fdok").onclick=()=>{const venc=ov.querySelector("#fdv").value,val=+ov.querySelector("#fdval").value;if(!venc||!finDataOk(venc)||!(val>0))return toast("Confira data e valor.",true);
      const c={...e,id:uid8(),venc,valor:val,pago:null,valorPago:null,recorrencia:undefined,folha:undefined,manut:undefined,obs:(e.obs?e.obs+" · ":"")+"duplicada"};["recorrencia","folha","manut","anexo","anexos","nf","nfarq","conc","grupo","parcela","rep","contrato","cancelada","parcial","barras"].forEach(k=>delete c[k]);
      finMutate(all=>[...all,c]);ov.remove();toast("Conta duplicada.");go("fin2",true)};
  });
}
/* ---------- estoque: reposição e código de barras ---------- */
function reposicao(){return estData().itens.filter(i=>+i.minimo>0&&+i.qtd<=+i.minimo).map(i=>({i,q:estRepor(i),custo:(+i.custo||0)*estRepor(i)}))}
function estqHtml(){
  const R=reposicao(),tot=soma(R,x=>x.custo),pode=podeEd("fin2")||podeEd("estoque");
  return `<div class="card"><h2>Reposição sugerida</h2><p class="sub" style="margin:0 0 8px">Itens no mínimo ou abaixo dele. A quantidade sugerida leva o estoque ao dobro do mínimo.</p>
   ${R.length?`<div class="wrap"><table><thead><tr><th>Item</th><th>Área</th><th class="n">Estoque</th><th class="n">Mínimo</th><th class="n">Comprar</th><th class="n">Custo estimado</th></tr></thead><tbody>${R.map(x=>`<tr><td><b>${esc(x.i.nome)}</b></td><td>${esc(x.i.area||"")}</td><td class="n">${NUMF(x.i.qtd,0)} ${esc(x.i.unidade||"")}</td><td class="n">${NUMF(x.i.minimo,0)}</td><td class="n"><b>${x.q}</b></td><td class="n">${x.custo?"R$ "+NUMF(x.custo):"—"}</td></tr>`).join("")}</tbody></table></div>
     <div class="row" style="margin-top:10px"><button class="b sec" id="repcp" style="flex:none">Copiar lista</button>${podeEd("fin")?`<button class="b" id="repfin" style="flex:none">Criar conta prevista (R$ ${NUMF(tot)})</button>`:""}${podeEd("agenda")?`<button class="b sec" id="reptar" style="flex:none">Criar tarefa de compra</button>`:""}</div>`:`<div class="empty">Nenhum item abaixo do mínimo.</div>`}</div>
   <div class="card"><h2>Código de barras</h2><p class="sub" style="margin:0 0 8px">Leia o código com um leitor USB (ele “digita” o número) ou use a câmera, se o seu navegador permitir. Na primeira leitura de um código novo, você escolhe o item; depois é só ler.</p>
   <div class="row" style="align-items:flex-end"><div><label>Código</label><input id="cbcod" inputmode="numeric" autocomplete="off" placeholder="Passe o leitor aqui e dê Enter"></div>${"BarcodeDetector" in window?`<button class="b sec" id="cbcam" style="flex:none">Usar a câmera</button>`:""}</div><div id="cbres" style="margin-top:10px"></div></div>`;
}
function cbMostra(cod){
  const it=estData().itens.find(i=>String(i.cod||"")===cod),box=$("cbres");if(!box)return;
  if(it){box.innerHTML=`<div class="callout"><b>${esc(it.nome)}</b> — ${NUMF(it.qtd,0)} ${esc(it.unidade||"")} em estoque (mínimo ${NUMF(it.minimo||0,0)}).</div>${podeEd("estoque")?`<div class="row" style="margin-top:8px;align-items:flex-end"><div style="flex:0 0 110px"><label>Quantidade</label><input type="number" min="1" value="1" id="cbq"></div>${estRastr(it)?`<div style="flex:0 0 130px"><label>Lote</label><input id="cblote"></div><div style="flex:0 0 160px"><label>Validade (entrada)</label><input type="date" id="cbval"></div>`:""}<button class="b" data-cbm="entrada" style="flex:none">Dar entrada</button><button class="b sec" data-cbm="saida" style="flex:none">Dar baixa</button></div>`:""}`;
    box.querySelectorAll("[data-cbm]").forEach(b=>b.onclick=()=>{try{const q=+$("cbq").value;const r=estAplica([{itemId:it.id,nome:it.nome,qtd:q,...(b.dataset.cbm==="entrada"&&$("cbval")?{lote:$("cblote").value,val:$("cbval").value}:{})}],{tipo:b.dataset.cbm,data:hojeIso(),motivo:b.dataset.cbm==="entrada"?"Compra":"Consumo",obs:"código de barras"});estCommit(r);toast("Estoque atualizado.");cbMostra(cod)}catch(e){toast(e.message,true)}});
  }else{
    box.innerHTML=`<div class="callout sand">Código novo: <b>${esc(cod)}</b>. Qual item é esse?</div><div class="row" style="margin-top:8px;align-items:flex-end"><div><label>Item do estoque</label><select id="cbit"><option value=""></option>${estData().itens.slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt")).map(i=>`<option value="${i.id}">${esc(i.nome)}</option>`).join("")}</select></div><button class="b" id="cbsv" style="flex:none">Associar</button></div>`;
    $("cbsv").onclick=()=>{const id=$("cbit").value;if(!id)return toast("Escolha o item.",true);saveEst({itens:estData().itens.map(i=>i.id===id?{...i,cod}:i)});toast("Código associado.");cbMostra(cod)};
  }
}
function bindEstq(){
  const R=reposicao(),txt=R.map(x=>`${x.i.nome}: comprar ${x.q} ${x.i.unidade||""}`).join("\n");
  const c=$("repcp");if(c)c.onclick=()=>{try{navigator.clipboard.writeText(txt);toast("Lista copiada.")}catch(e){toast("Não foi possível copiar.",true)}};
  const f=$("repfin");if(f)f.onclick=()=>{finMutate(all=>[...all,{id:uid8(),tipo:"pagar",desc:"Reposição de estoque ("+R.length+" itens)",contra:"",cat:"Estoque",area:"Almoxarifado",forma:"",obs:txt,valor:Math.round(soma(R,x=>x.custo)*100)/100,venc:addDaysIso(hojeIso(),7),pago:null,valorPago:null,previsto:true}]);toast("Conta prevista criada. Informe o fornecedor quando comprar.");go("fin2",true)};
  const t=$("reptar");if(t)t.onclick=()=>{tarMutate(l=>[...l,{id:uid8(),titulo:"Comprar reposição de estoque",data:hojeIso(),hora:"",prio:"normal",resp:"",area:"",desc:txt,status:"aberta",feitaEm:null,grupo:null}]);toast("Tarefa criada na agenda.")};
  const cod=$("cbcod");if(cod){cod.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const v=cod.value.trim();if(v)cbMostra(v);cod.value=""}};}
  const cam=$("cbcam");if(cam)cam.onclick=async()=>{
    try{const det=new BarcodeDetector(),st=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      const ov=openModal(`<h3>Aponte para o código de barras</h3><video id="cbvid" playsinline muted style="width:100%;border-radius:8px"></video><div style="text-align:right;margin-top:10px"><button class="b sec" id="cbfim">Fechar</button></div>`);
      const v=ov.querySelector("#cbvid");v.srcObject=st;await v.play();let vivo=true;const parar=()=>{vivo=false;st.getTracks().forEach(t=>t.stop());ov.remove()};ov.querySelector("#cbfim").onclick=parar;
      const lo=async()=>{if(!vivo)return;try{const r=await det.detect(v);if(r.length){const val=r[0].rawValue;parar();cbMostra(val);return}}catch(e){}setTimeout(lo,350)};lo();
    }catch(e){toast("Não consegui abrir a câmera.",true)}};
}
/* ---------- avisos extras ao conferir notas fiscais ---------- */
function nfAvisosExtra(n){
  const av=[],hist=(S.config.nf&&S.config.nf.rows)||[];
  (n.rows||[]).forEach(r=>{const k=estNorm(r.item);if(!k||!(+r.valor>0))return;const ant=hist.filter(h=>estNorm(h.item)===k&&+h.valor>0&&h.date&&h.date<(n.date||"9999"));if(ant.length<2)return;
    const med=ant.slice(-5).reduce((s,x)=>s+(+x.valor),0)/Math.min(5,ant.length);if(+r.valor>med*1.2)av.push(`Preço de “${r.item}” (${fmtBRL(r.valor)}) está ${Math.round((r.valor/med-1)*100)}% acima da média das últimas compras (${fmtBRL(med)}).`)});
  const nomeF=estNorm(n.forn);
  if(n.vNF>0&&finAll().some(e=>e.tipo==="pagar"&&centavos(e.valor)===centavos(n.vNF)&&estNorm(e.contra||"")===nomeF&&!e.nf&&Math.abs(daysBetweenIso(e.venc,n.date||hojeIso()))<=20))av.push(`Já existe uma conta a pagar de ${fmtBRL(n.vNF)} para ${n.forn} perto desta data. Confira se não é a mesma compra para não pagar duas vezes.`);
  return av;
}
/* ---------- página e pendências ---------- */
xpage("fin2","Planejamento financeiro","Conciliação do extrato, previsão de caixa, orçamento por área, lançamento em lote e reposição de estoque.","chart",[
  {k:"conc",l:"Conciliação bancária",html:concHtml,bind:bindConc},
  {k:"prev",l:"Previsão de caixa",html:prevHtml,bind:bindPrev},
  {k:"orc",l:"Orçamento por área",html:orcHtml,bind:bindOrc},
  {k:"lote",l:"Lote e duplicar",html:loteHtml,bind:bindLote},
  {k:"estq",l:"Reposição e código de barras",html:estqHtml,bind:bindEstq}
]);
XURG.push((L,h)=>{
  if(!podeVer("fin2"))return;
  const cfg=xcfg("fin2");
  if(cfg.saldo!==""&&cfg.saldo!=null){const neg=previsao().find((x,i)=>i<5&&x.saldo!=null&&x.saldo<0);if(neg)L.push({nivel:3,tipo:"Caixa",titulo:`Saldo projetado negativo na semana de ${brDate(neg.ini).slice(0,5)}`,detalhe:`R$ ${NUMF(neg.saldo)} — antecipe recebimentos ou renegocie vencimentos`,quando:neg.ini,rota:"fin2",res:{k:"f2prev"},resLabel:"Ver previsão"})}
  const ym=h.slice(0,7);areasFin().forEach(a=>{const o=orcDe(a,ym);if(!o)return;const r=realizadoArea(a,ym);if(r>+o.valor)L.push({nivel:2,tipo:"Orçamento",titulo:`${a}: gasto passou do orçamento do mês`,detalhe:`R$ ${NUMF(r)} de R$ ${NUMF(o.valor)}`,quando:null,rota:"fin2",res:{k:"f2orc"},resLabel:"Ver orçamento"});else if(r>=.9*(+o.valor))L.push({nivel:1,tipo:"Orçamento",titulo:`${a}: já usou ${Math.round(100*r/o.valor)}% do orçamento do mês`,detalhe:`R$ ${NUMF(r)} de R$ ${NUMF(o.valor)}`,quando:null,rota:"fin2",res:{k:"f2orc"},resLabel:"Ver orçamento"})});
  const sp=xs("extrato").filter(l=>!l.conc).length;if(sp>=5)L.push({nivel:1,tipo:"Conciliação",titulo:`${sp} linha(s) do extrato sem conta correspondente`,detalhe:"concilie para não perder pagamentos",quando:null,rota:"fin2",res:{k:"f2conc"},resLabel:"Conciliar"});
  const rp=reposicao().length;if(rp)L.push({nivel:1,tipo:"Estoque",titulo:`${rp} item(ns) para repor`,detalhe:"abaixo do mínimo definido",quando:null,rota:"fin2",res:{k:"f2estq"},resLabel:"Ver reposição"});
});
const irF2=t=>()=>{PGX.fin2.st.tab=t;go("fin2")};
XRES.f2prev=irF2("prev");XRES.f2orc=irF2("orc");XRES.f2conc=irF2("conc");XRES.f2estq=irF2("estq");
REPORTS.push(
 {id:"f2_prev",g:"Financeiro",t:"Previsão de caixa (13 semanas)",d:"Entradas, saídas e saldo projetado por semana.",pii:false,b:()=>({titulo:"Previsão de caixa",sub:relSub({},false),sensivel:false,cols:[{h:"Semana de",t:"date",w:14},{h:"Entradas",t:"money",w:14},{h:"Saídas",t:"money",w:14},{h:"Saldo projetado",t:"money",w:16}],rows:previsao().map(x=>[x.ini,x.E,x.S,x.saldo==null?"":x.saldo])})},
 {id:"f2_orc",g:"Financeiro",t:"Orçado x realizado por área",d:"Orçamento mensal e gasto por área no mês escolhido na aba Orçamento.",pii:false,b:()=>({titulo:"Orçado x realizado — "+OR.ym,sub:relSub({},false),sensivel:false,cols:[{h:"Área",w:26},{h:"Orçado",t:"money",w:14},{h:"Realizado",t:"money",w:14},{h:"Diferença",t:"money",w:14}],rows:areasFin().map(a=>{const o=orcDe(a,OR.ym),r=realizadoArea(a,OR.ym);return[a,o?+o.valor:0,r,o?r-(+o.valor):r]}).filter(x=>x[1]||x[2])})},
 {id:"f2_repos",g:"Estoque",t:"Reposição sugerida",d:"Itens abaixo do mínimo, quantidade sugerida e custo estimado.",pii:false,b:()=>({titulo:"Reposição sugerida",sub:relSub({},false),sensivel:false,cols:[{h:"Item",w:34},{h:"Área",w:18},{h:"Estoque",t:"num",w:10},{h:"Mínimo",t:"num",w:10},{h:"Comprar",t:"num",w:10},{h:"Custo estimado",t:"money",w:14}],rows:reposicao().map(x=>[x.i.nome,x.i.area||"",+x.i.qtd,+x.i.minimo,x.q,x.custo])})}
);


/* >>> x_ind.js */
