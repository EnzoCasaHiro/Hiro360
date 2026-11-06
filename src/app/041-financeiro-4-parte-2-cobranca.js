/* ===== Financeiro 4 (parte 2): cobrança, extras do residente, extrato/informe, aprovação, guias ===== */
/* ---------- rateio entre áreas ---------- */
function finRatear(e,v){
  v=v==null?finNum(e):v;
  if(!e.rateio||!e.rateio.length)return[{area:e.area||"",v}];
  let resto=Math.round(v*100);
  return e.rateio.map((r,i)=>{const c=i===e.rateio.length-1?resto:Math.round(v*100*r.pct/100);resto-=c;return{area:r.area,v:c/100}});
}
function finAccArea(l){
  const m={};
  l.forEach(e=>finRatear(e).forEach(p=>{const k=p.area||"Sem classificação";(m[k]=m[k]||{e:0,s:0})[e.tipo==="receber"?"e":"s"]+=p.v}));
  return m;
}
const finTemArea=(e,a)=>e.rateio&&e.rateio.length?e.rateio.some(r=>r.area===a):e.area===a;
const finValArea=(e,a)=>{const p=finRatear(e).filter(x=>x.area===a);return soma(p,x=>x.v)};

/* ---------- inadimplência e cobrança ---------- */
function f4EncDe(e){
  const m=((f4cfg().encargos||{})[e.residente])||{},g=finCfg();
  return{multa:m.multa!=null&&m.multa!==""?+m.multa:(g.multa??2),juros:m.juros!=null&&m.juros!==""?+m.juros:(g.juros??1),proprio:m.multa!=null&&m.multa!==""||m.juros!=null&&m.juros!==""};
}
function f4Encargos(itens){
  const h=hojeIso();
  return arred2(soma(itens,e=>{const d=Math.max(0,daysBetweenIso(e.venc,h)),v=+e.valor||0,en=f4EncDe(e);return v*en.multa/100+v*(en.juros/100)/30*d}));
}
function f4EncModal(rid){
  const m=(f4cfg().encargos||{})[rid]||{},g=finCfg();
  const ov=openModal(`<h3>Multa e juros — ${esc(resNomeDe(rid))}</h3><div class="sub" style="margin-bottom:8px">Em branco = usa o padrão da casa (multa ${g.multa??2}% e juros ${g.juros??1}% ao mês). Use quando o contrato deste residente prevê outros percentuais.</div>
   <div class="row"><div><label>Multa (%)</label><input type="number" min="0" step="0.01" id="f4em" value="${m.multa??""}"></div><div><label>Juros (% ao mês)</label><input type="number" min="0" step="0.01" id="f4ej" value="${m.juros??""}"></div></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4ecx2">Cancelar</button><button class="b" id="f4eok2">Salvar</button></div>`);
  ov.querySelector("#f4ecx2").onclick=()=>ov.remove();
  ov.querySelector("#f4eok2").onclick=()=>{
    const a=ov.querySelector("#f4em").value,b=ov.querySelector("#f4ej").value,l={...(f4cfg().encargos||{})};
    if(a===""&&b==="")delete l[rid];else l[rid]={multa:a===""?null:Math.max(0,+a),juros:b===""?null:Math.max(0,+b)};
    f4save({encargos:l});ov.remove();toast("Salvo.");go("fin",true);
  };
}
function f4Devedores(){
  const h=hojeIso(),m={};
  finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada&&e.venc<h).forEach(e=>{
    const k=e.residente?"r:"+e.residente:"c:"+estNorm(e.contra||e.desc);
    const o=m[k]=m[k]||{k,res:e.residente||"",nome:e.residente?(resNomeDe(e.residente)||e.contra||e.desc):(e.contra||e.desc),contra:e.contra||"",itens:[],total:0};
    o.itens.push(e);o.total+=+e.valor||0;
  });
  const cobr=f4cfg().cobr||{};
  return Object.values(m).map(o=>{o.total=arred2(o.total);o.atraso=Math.max(...o.itens.map(e=>daysBetweenIso(e.venc,h)));o.enc=f4Encargos(o.itens);o.contatos=cobr[o.k]||[];return o}).sort((a,b)=>b.atraso-a.atraso);
}
function f4Resp(d){
  const r=d.res?resAll().find(x=>x.id===d.res):null,rp=r&&r.resp&&typeof r.resp==="object"?r.resp:null;
  return{r,nome:(rp&&rp.nome)||d.contra||"",tel:((rp&&rp.tel)||"").replace(/\D/g,"")};
}
function f4MsgCobranca(d,modo){
  const emp=empresa(),{nome}=f4Resp(d),cfg=f4cfg(),aviso=modo==="aviso";
  const l=d.itens.slice().sort((a,b)=>a.venc.localeCompare(b.venc)).map(e=>`• ${e.desc} — venc. ${brDate(e.venc)} — ${fmtBRL(e.valor)}${e.barras?`\n  Linha digitável: ${finBarrasFmt(e.barras)}`:""}`);
  const pix=cfg.pix?`\nPagamento por PIX — chave: ${cfg.pix}${cfg.pixNome?" ("+cfg.pixNome+")":""}.`:"";
  const ini=`Olá${nome?", "+nome.split(" ")[0]:""}! Aqui é da ${emp.razao}.`;
  if(aviso)return `${ini} Passando para lembrar que ${d.itens.length>1?"estas cobranças vencem":"esta cobrança vence"} em breve${d.res?" referente a "+d.nome:""}:\n${l.join("\n")}\nTotal: ${fmtBRL(d.total)}.${pix}\nQualquer dúvida, estamos à disposição.`;
  return `${ini} Identificamos que ${d.itens.length>1?"estas cobranças estão":"esta cobrança está"} em aberto${d.res?" referente a "+d.nome:""}:\n${l.join("\n")}\nTotal: ${fmtBRL(d.total)}.${pix}\nSe já realizou o pagamento, por favor nos envie o comprovante. Qualquer dúvida, estamos à disposição.`;
}
function f4AVencer(){
  const h=hojeIso(),dias=Math.max(1,+(f4cfg().diasAviso)||5),lim=addDaysIso(h,dias),m={};
  finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada&&e.venc>=h&&e.venc<=lim).forEach(e=>{
    const k=e.residente?"r:"+e.residente:"c:"+estNorm(e.contra||e.desc);
    const o=m[k]=m[k]||{k,res:e.residente||"",nome:e.residente?(resNomeDe(e.residente)||e.contra||e.desc):(e.contra||e.desc),contra:e.contra||"",itens:[],total:0};
    o.itens.push(e);o.total+=+e.valor||0;
  });
  const cobr=f4cfg().cobr||{};
  return Object.values(m).map(o=>{o.total=arred2(o.total);o.prox=o.itens.map(e=>e.venc).sort()[0];o.contatos=cobr[o.k]||[];return o}).sort((a,b)=>a.prox.localeCompare(b.prox));
}
function f4CobrarModal(k,modo){
  const d=(modo==="aviso"?f4AVencer():f4Devedores()).find(x=>x.k===k);if(!d)return toast("Esta cobrança já foi regularizada.");
  const{tel}=f4Resp(d),fone=tel?(tel.length<=11?"55"+tel:tel):"";
  const ov=openModal(`<h3>${modo==="aviso"?"Lembrar":"Cobrar"} — ${esc(d.nome)}</h3><div class="sub" style="margin-bottom:8px">${modo==="aviso"?`${d.itens.length} conta(s) a vencer, ${fmtBRL(d.total)} · próximo vencimento em ${brDate(d.prox)}`:`${d.itens.length} conta(s) vencida(s), ${fmtBRL(d.total)} · atraso de até ${d.atraso} dia(s)`}</div>
   <label>Mensagem</label><textarea id="f4cm" rows="8" style="width:100%">${esc(f4MsgCobranca(d,modo))}</textarea>
   <div class="row" style="margin-top:8px"><a class="b" id="f4cwa" target="_blank" rel="noopener" style="flex:none;text-decoration:none;${fone?"":"opacity:.5;pointer-events:none"}">Abrir no WhatsApp</a><button class="b sec" id="f4ccp" style="flex:none">Copiar mensagem</button></div>
   ${fone?"":`<div class="sub">Sem telefone do responsável no cadastro do residente — copie a mensagem e envie pelo canal que preferir.</div>`}
   <h4 style="margin:14px 0 6px">Registrar contato</h4>
   <div class="row"><div><label>Como foi</label><select id="f4ct1"><option>WhatsApp</option><option>Ligação</option><option>E-mail</option><option>Pessoalmente</option></select></div><div><label>Promessa de pagamento (data)</label><input type="date" id="f4cpr"></div></div>
   <label>Observação</label><input id="f4cob" placeholder="Ex.: disse que paga na sexta"><div class="err" id="f4cerr2"></div>
   ${d.contatos.length?`<div style="margin-top:10px">${d.contatos.slice().reverse().slice(0,6).map(c=>`<div class="sub">${brDate(c.em)} · ${esc(c.tipo)}${c.u?" · "+esc(c.u):""}${c.prom?" · promessa "+brDate(c.prom):""}${c.txt?" · "+esc(c.txt):""}</div>`).join("")}</div>`:""}
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4cx">Fechar</button><button class="b" id="f4cok">Registrar contato</button></div>`);
  const g=s=>ov.querySelector(s),upd=()=>{g("#f4cwa").href="https://wa.me/"+fone+"?text="+encodeURIComponent(g("#f4cm").value)};
  upd();g("#f4cm").oninput=upd;
  g("#f4ccp").onclick=async()=>{try{await navigator.clipboard.writeText(g("#f4cm").value);toast("Mensagem copiada.")}catch(e){g("#f4cm").select()}};
  g("#f4cx").onclick=()=>ov.remove();
  g("#f4cok").onclick=()=>{
    const prom=g("#f4cpr").value;if(prom&&!finDataOk(prom))return g("#f4cerr2").textContent="Confira a data da promessa: ano inválido.";
    const cobr={...(f4cfg().cobr||{})};cobr[k]=[...(cobr[k]||[]),{em:hojeIso(),u:f4Quem(),tipo:g("#f4ct1").value+(modo==="aviso"?" (lembrete)":""),txt:g("#f4cob").value.trim().slice(0,120),prom:prom||""}].slice(-15);
    f4save({cobr});ov.remove();toast("Contato registrado.");go("fin",true);
  };
}
function f4RenegModal(k){
  const d=f4Devedores().find(x=>x.k===k);if(!d)return;
  const ov=openModal(`<h3>Renegociar — ${esc(d.nome)}</h3><div class="sub" style="margin-bottom:8px">${d.itens.length} conta(s) vencida(s) somam ${fmtBRL(d.total)}. Com multa e juros estimados: ${fmtBRL(d.total+d.enc)}. As contas antigas ficam como canceladas (“renegociado”) e nascem as parcelas do acordo.</div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="f4rj"> Cobrar multa e juros (${fmtBRL(d.enc)})</label>
   <div class="row"><div><label>Desconto (R$)</label><input type="number" min="0" step="0.01" id="f4rd" value="0"></div><div><label>Parcelas</label><input type="number" min="1" max="36" id="f4rn" value="1"></div><div><label>1ª parcela em</label><input type="date" id="f4rv" value="${addDaysIso(hojeIso(),7)}"></div></div>
   <div class="callout" id="f4rinfo" style="margin-top:8px"></div><div class="err" id="f4rerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4rcx">Cancelar</button><button class="b" id="f4rok">Fechar o acordo</button></div>`);
  const g=s=>ov.querySelector(s),tot=()=>arred2(Math.max(0,d.total+(g("#f4rj").checked?d.enc:0)-(+g("#f4rd").value||0)));
  const info=()=>{const n=Math.max(1,Math.min(36,Math.round(+g("#f4rn").value||1)));g("#f4rinfo").innerHTML=`Total do acordo: <b>${fmtBRL(tot())}</b> em ${n}x de cerca de <b>${fmtBRL(tot()/n)}</b>.`};
  ["#f4rj","#f4rd","#f4rn"].forEach(s=>{g(s).oninput=info;g(s).onchange=info});info();
  g("#f4rcx").onclick=()=>ov.remove();
  g("#f4rok").onclick=()=>{
    const n=Math.max(1,Math.min(36,Math.round(+g("#f4rn").value||1))),v1=g("#f4rv").value,total=tot(),er=m=>g("#f4rerr").textContent=m;
    if(!(total>0))return er("O total do acordo precisa ser maior que zero.");if(!finDataOk(v1))return er("Confira a data da 1ª parcela: ano inválido.");
    const cent=Math.round(total*100),b=Math.floor(cent/n),grupo=n>1?uid8():null,ids=new Set(d.itens.map(e=>e.id)),h=hojeIso(),prim=d.itens[0];
    const novos=Array.from({length:n},(_,i)=>({id:uid8(),tipo:"receber",desc:`Acordo — ${d.nome}`,contra:prim.contra||d.nome,cat:prim.cat||"Mensalidades",area:prim.area||"",forma:prim.forma||"Boleto",valor:(i===n-1?cent-b*(n-1):b)/100,venc:addMesesIso(v1,i),pago:null,valorPago:null,grupo,parcela:n>1?`${i+1}/${n}`:null,residente:d.res||"",acordo:true,obs:`renegociação de ${d.itens.length} conta(s) vencida(s) em ${brDate(h)}`}));
    finMutate(all=>[...all.map(x=>ids.has(x.id)?{...x,pago:h,valorPago:0,cancelada:true,obs:(x.obs?x.obs+" · ":"")+"renegociado em "+brDate(h)}:x),...novos]);
    ov.remove();toast(`Acordo fechado em ${n} parcela(s).`);go("fin",true);
  };
}
/* ---------- gastos pagos pela casa em nome do residente ---------- */
function f4ExtraModal(){
  const rs=resAll().filter(resAtivo).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt"));
  if(!rs.length)return toast("Nenhum residente ativo cadastrado.",true);
  const ov=openModal(`<h3>Gasto pago pela casa para o residente</h3><div class="sub" style="margin-bottom:8px">Ex.: farmácia, fralda, cabeleireiro, passeio. Fica registrado como despesa e entra na lista “a cobrar”, para somar na próxima mensalidade.</div>
   <div class="row"><div><label>Residente</label><select id="f4er">${rs.map(r=>`<option value="${r.id}">${esc(resNome(r))}</option>`).join("")}</select></div><div><label>Data do gasto</label><input type="date" id="f4ed" value="${hojeIso()}"></div></div>
   <label>Descrição</label><input id="f4edesc" placeholder="Ex.: fraldas geriátricas"><div class="row"><div><label>Onde comprou (fornecedor)</label><input id="f4ef"></div><div><label>Valor (R$)</label><input type="number" min="0" step="0.01" id="f4ev"></div></div>
   <div class="row">${f4ContasPag().length>1?`<div><label>Pago com</label>${f4SelConta("f4ec")}</div>`:""}<div><label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:22px"><input type="checkbox" id="f4ep" checked> Já foi pago</label></div></div>
   <div class="err" id="f4eerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4ecx">Cancelar</button><button class="b" id="f4eok">Lançar</button></div>`);
  const g=s=>ov.querySelector(s),er=m=>g("#f4eerr").textContent=m;
  g("#f4ecx").onclick=()=>ov.remove();
  g("#f4eok").onclick=()=>{
    const desc=g("#f4edesc").value.trim(),contra=g("#f4ef").value.trim(),valor=arred2(g("#f4ev").value),d=g("#f4ed").value;
    if(!desc)return er("Informe a descrição.");if(!contra)return er("Informe onde foi comprado.");if(!(valor>0))return er("Informe o valor.");if(!finDataOk(d))return er("Confira a data: ano inválido.");
    const pago=g("#f4ep").checked,c=g("#f4ec");
    finMutate(all=>[...all,{id:uid8(),tipo:"pagar",desc,contra,fornId:finFornId(contra,null),cat:"Despesas de residentes",area:"",forma:"Dinheiro",valor,venc:d,pago:pago?d:null,valorPago:pago?valor:null,...(c?{conta:c.value}:{}),residente:g("#f4er").value,repasse:true,repassado:null,obs:"pago pela casa para o residente"}]);
    ov.remove();toast("Gasto lançado. Está na lista “a cobrar”.");go("fin",true);
  };
}
function f4Repasses(){
  const m={};
  finAll().filter(e=>e.repasse&&!e.repassado&&!e.cancelada&&e.residente).forEach(e=>{(m[e.residente]=m[e.residente]||[]).push(e)});
  return m;
}
function f4CobrarExtras(rid){
  const L=f4Repasses()[rid]||[];if(!L.length)return;
  const r=resAll().find(x=>x.id===rid),dia=Math.max(1,Math.min(28,+(r&&r.diaVenc)||10)),h=hojeIso();
  let venc=`${h.slice(0,7)}-${f4pad(dia)}`;if(venc<=h)venc=addMesesIso(venc,1);
  const tot=arred2(soma(L,e=>+e.valor)),id=uid8(),ids=new Set(L.map(e=>e.id)),rp=r&&r.resp&&typeof r.resp==="object"?r.resp.nome:"";
  askConfirm(`Criar uma cobrança de ${fmtBRL(tot)} (${L.length} gasto(s)) para ${resNome(r)}, vencendo em ${brDate(venc)}?`,"Criar cobrança").then(ok=>{
    if(!ok)return;
    finMutate(all=>[...all.map(e=>ids.has(e.id)?{...e,repassado:id}:e),{id,tipo:"receber",desc:`Despesas pagas pela casa — ${resNome(r)}`,contra:rp||resNome(r),cat:"Reembolso de despesas",area:"",forma:"Boleto",valor:tot,venc,pago:null,valorPago:null,residente:rid,obs:L.map(e=>`${brDate(e.venc)} ${e.desc} ${fmtBRL(e.valor)}`).join("; ").slice(0,300)}]);
    toast("Cobrança criada em Contas a receber.");go("fin",true);
  });
}
/* ---------- extrato do residente e informe anual ---------- */
async function f4PdfResidente(rid,ano,modo){
  const r=resAll().find(x=>x.id===rid);if(!r)return;
  const emp=empresa(),rp=r.resp&&typeof r.resp==="object"?r.resp:{};let spec;
  if(modo==="informe"){
    const L=finAll().filter(e=>e.tipo==="receber"&&e.pago&&!e.cancelada&&e.residente===rid&&e.pago.slice(0,4)===String(ano)&&finNum(e)>0).sort((a,b)=>a.pago.localeCompare(b.pago));
    if(!L.length)return toast(`Nenhum pagamento recebido de ${resNome(r)} em ${ano}.`,true);
    spec={titulo:`Informe de pagamentos recebidos — ${ano}`,sub:`Residente: ${r.nome}${rp.nome?` · Responsável: ${rp.nome}${rp.cpf?" (CPF "+rp.cpf+")":""}`:""} · Recebido por: ${emp.razao}${emp.cnpj?" (CNPJ "+emp.cnpj+")":""} · Valores efetivamente recebidos de 01/01/${ano} a 31/12/${ano}. Para dedução no Imposto de Renda, confirme com o seu contador.${(+f4cfg().infPct>0)?` Parcela que a casa indica como despesa de saúde (${f4cfg().infPct}% do total recebido): ${fmtBRL(arred2(soma(L,finNum)*f4cfg().infPct/100))}.`:""}`,sensivel:false,
      cols:[{h:"Recebido em",t:"date",w:16},{h:"Descrição",w:46},{h:"Competência",w:16},{h:"Forma",w:14},{h:"Valor",t:"money",w:16}],
      rows:L.map(e=>[e.pago,e.desc,e.comp?e.comp.slice(5)+"/"+e.comp.slice(0,4):"",e.forma||"",finNum(e)]),tot:[null,null,null,null,"sum"]};
  }else{
    const L=finAll().filter(e=>!e.cancelada&&e.residente===rid&&e.venc.slice(0,4)===String(ano)).sort((a,b)=>a.venc.localeCompare(b.venc));
    if(!L.length)return toast(`Nada lançado para ${resNome(r)} em ${ano}.`,true);
    spec={titulo:`Extrato do residente — ${ano}`,sub:`${r.nome}${rp.nome?` · Responsável: ${rp.nome}`:""} · A receber: ${fmtBRL(soma(L.filter(e=>e.tipo==="receber"&&!e.pago),e=>+e.valor))} em aberto · Gastos pagos pela casa ainda não cobrados: ${fmtBRL(soma(L.filter(e=>e.repasse&&!e.repassado),e=>+e.valor))}`,sensivel:false,
      cols:[{h:"Vencimento",t:"date",w:13},{h:"Descrição",w:38},{h:"Tipo",w:14},{h:"Valor",t:"money",w:15},{h:"Situação",w:12},{h:"Pago em",t:"date",w:13}],
      rows:L.map(e=>[e.venc,e.desc+(e.parcela?` (${e.parcela})`:""),e.tipo==="receber"?"A receber":"Pago pela casa",finNum(e),finStatusLabel(e),e.pago||""])};
  }
  try{await saveFile(`${modo==="informe"?"informe":"extrato"}_${safe(resNome(r)).slice(0,30)}_${ano}.pdf`,await relPdf([spec]))}
  catch(e){toast("Não foi possível gerar o PDF: "+(e.message||e),true)}
}
function finCobHtml(){
  const dv=f4Devedores(),pode=podeEd("fin"),rep=f4Repasses(),h=hojeIso();
  const tot=soma(dv,x=>x.total),enc=soma(dv,x=>x.enc),rs=resAll().filter(resAtivo).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt"));
  const y0=new Date().getFullYear(),anos=[];for(let y=y0-4;y<=y0;y++)anos.push(y);
  const av=f4AVencer(),dAv=Math.max(1,+(f4cfg().diasAviso)||5);
  return `<div class="stats"><div class="stat ${dv.length?"bad":""}"><b>${fmtBRL(tot)}</b><span>vencido a receber · ${dv.length} devedor(es)</span></div><div class="stat"><b>${fmtBRL(enc)}</b><span>multa e juros estimados (${finCfg().multa??2}% + ${finCfg().juros??1}% ao mês)</span></div><div class="stat ${dv.some(x=>x.atraso>60)?"warn":""}"><b>${dv.length?Math.max(...dv.map(x=>x.atraso)):0}</b><span>maior atraso, em dias</span></div></div>
   <div class="card"><h2>Inadimplência — quem está devendo</h2>${dv.length?`<div class="wrap"><table><thead><tr><th>Devedor</th><th class="n">Contas</th><th class="n">Valor</th><th class="n">Com encargos</th><th class="n">Atraso</th><th>Último contato</th><th></th></tr></thead><tbody>
    ${dv.map(x=>{const u=x.contatos[x.contatos.length-1],pr=u&&u.prom?(u.prom>=h?`<span class="pill s-pendencia">promessa ${brDate(u.prom)}</span>`:`<span class="pill s-falta">promessa vencida ${brDate(u.prom)}</span>`):"";
      return `<tr><td><b>${esc(x.nome)}</b>${x.res&&x.contra&&x.contra!==x.nome?`<div class="sub">${esc(x.contra)}</div>`:""}</td><td class="n">${x.itens.length}</td><td class="n">${fmtBRL(x.total)}</td><td class="n">${fmtBRL(x.total+x.enc)}</td><td class="n">${x.atraso} d</td><td>${u?`${brDate(u.em)} · ${esc(u.tipo)}`:"<span class='sub'>nunca</span>"} ${pr}</td><td style="white-space:nowrap">${pode?`<button class="b sm" data-f4cob="${esc(x.k)}">Cobrar</button> <button class="b sec sm" data-f4reneg="${esc(x.k)}">Renegociar</button>${x.res?` <button class="b sec sm" data-f4enc="${x.res}" title="Multa e juros próprios deste residente">${f4EncDe(x.itens[0]).proprio?"Encargos ✓":"Encargos"}</button>`:""}`:""}</td></tr>`}).join("")}</tbody></table></div>
    <div class="row" style="margin-top:10px"><button class="b sec" id="f4cobpdf" style="flex:none">${ic("down")} Baixar PDF</button><button class="b sec" id="f4cobxls" style="flex:none">${ic("down")} Baixar Excel</button></div>`:`<div class="empty">Ninguém com mensalidade ou conta vencida. 🎉</div>`}</div>
   <div class="card"><h2>A vencer nos próximos ${dAv} dias</h2><p class="sub" style="margin:0 0 10px">Lembrete antes do vencimento ajuda a evitar atraso. Mude os dias na aba Ajustes.</p>${av.length?av.map(x=>{const u=x.contatos[x.contatos.length-1];return `<div class="doc"><div class="grow"><div class="nm">${esc(x.nome)}</div><div class="sub">${x.itens.length} conta(s) · vence ${brDate(x.prox)}${u&&u.em>=addDaysIso(hojeIso(),-dAv)?` · último contato ${brDate(u.em)}`:""}</div></div><b>${fmtBRL(x.total)}</b>${pode?`<button class="b sec sm" data-f4avi="${esc(x.k)}">Lembrar</button>`:""}</div>`}).join(""):`<div class="empty">Nada vence nos próximos ${dAv} dias.</div>`}</div>
   <div class="card"><h2>Gastos pagos pela casa para residentes</h2><p class="sub" style="margin:0 0 10px">Farmácia, fraldas, passeios… Registre aqui para não esquecer de cobrar. Depois vira uma cobrança única em Contas a receber.</p>
    ${pode?`<div class="row" style="margin-bottom:10px"><button class="b" id="f4extra" style="flex:none">${ic("plus")} Lançar gasto de residente</button></div>`:""}
    ${Object.keys(rep).length?Object.entries(rep).map(([rid,L])=>`<div class="doc"><div class="grow"><div class="nm">${esc(resNomeDe(rid))}</div><div class="sub">${L.length} gasto(s): ${esc(L.slice(0,3).map(e=>e.desc).join(", "))}${L.length>3?"…":""}</div></div><b>${fmtBRL(soma(L,e=>+e.valor))}</b>${pode?`<button class="b sm" data-f4rep="${rid}">Cobrar na mensalidade</button>`:""}</div>`).join(""):`<div class="empty">Nada a cobrar.</div>`}</div>
   <div class="card"><h2>Extrato e informe anual do residente</h2><p class="sub" style="margin:0 0 10px">O <b>informe</b> lista tudo o que a família pagou no ano — serve para o Imposto de Renda. O <b>extrato</b> mostra tudo o que foi lançado (pago e em aberto).</p>
    <div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="f4ir">${rs.map(r=>`<option value="${r.id}">${esc(resNome(r))}</option>`).join("")}</select></div><div style="max-width:110px"><label>Ano</label><select id="f4ia">${anos.map(y=>`<option ${y===(FIN.ano>y0?y0:FIN.ano)?"selected":""}>${y}</option>`).join("")}</select></div><button class="b" id="f4inf" style="flex:none">${ic("down")} Informe (PDF)</button><button class="b sec" id="f4ext" style="flex:none">${ic("down")} Extrato (PDF)</button></div></div>`;
}
function bindCob(){
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  document.querySelectorAll("[data-f4cob]").forEach(b=>b.onclick=()=>f4CobrarModal(b.dataset.f4cob));
  document.querySelectorAll("[data-f4reneg]").forEach(b=>b.onclick=()=>f4RenegModal(b.dataset.f4reneg));
  document.querySelectorAll("[data-f4enc]").forEach(b=>b.onclick=()=>f4EncModal(b.dataset.f4enc));
  document.querySelectorAll("[data-f4avi]").forEach(b=>b.onclick=()=>f4CobrarModal(b.dataset.f4avi,"aviso"));
  document.querySelectorAll("[data-f4rep]").forEach(b=>b.onclick=()=>f4CobrarExtras(b.dataset.f4rep));
  on("f4extra",f4ExtraModal);
  on("f4inf",()=>f4PdfResidente($("f4ir").value,$("f4ia").value,"informe"));
  on("f4ext",()=>f4PdfResidente($("f4ir").value,$("f4ia").value,"extrato"));
}
/* ---------- histórico do lançamento, aprovação e guias das retenções ---------- */
function f4HistModal(id){
  const e=finAll().find(x=>x.id===id);if(!e)return;
  const ov=openModal(`<h3>Histórico do lançamento</h3><div class="sub" style="margin-bottom:8px">${esc(e.desc)} · ${brDate(e.venc)} · ${fmtBRL(e.valor)}</div>
   <div style="max-height:50vh;overflow:auto">${[...(e.hist||[])].reverse().map(h=>`<div class="doc"><div style="flex:0 0 112px" class="sub">${esc(h.t.replace("T"," ").replace(/^(\d{4})-(\d\d)-(\d\d)/,"$3/$2/$1"))}</div><div class="grow"><div class="nm">${esc(h.u||"alguém")} ${esc(h.a)}</div></div></div>`).join("")||`<div class="empty">Nenhuma alteração registrada depois da criação.</div>`}
   ${e.criadoEm?`<div class="doc"><div style="flex:0 0 112px" class="sub">${brDate(e.criadoEm)}</div><div class="grow"><div class="nm">${esc(e.criadoPor||"alguém")} criou o lançamento</div></div></div>`:`<div class="sub" style="margin-top:8px">Criado antes do histórico por lançamento existir.</div>`}</div>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b" id="f4hx">Fechar</button></div>`);
  ov.querySelector("#f4hx").onclick=()=>ov.remove();
}
function f4GuiasModal(id){
  const e=finAll().find(x=>x.id===id);if(!e||!e.ret)return;
  const base=(e.comp||e.venc.slice(0,7))+"-01",prox=(dia)=>`${addMesesIso(base,1).slice(0,7)}-${f4pad(dia)}`;
  const ds={inss:["INSS retido","Receita Federal (INSS)",20],iss:["ISS retido","Prefeitura (ISS)",10],irrf:["IRRF retido","Receita Federal (IRRF)",20],outros:["Outras retenções","Órgão arrecadador",20]};
  const it=Object.keys(ds).filter(k=>+e.ret[k]>0);
  const ov=openModal(`<h3>Guias das retenções</h3><div class="sub" style="margin-bottom:8px">${esc(e.desc)} · ${esc(e.contra||"")}. Vão para Contas a pagar. <b>As datas abaixo são as usuais — confirme o vencimento correto com o seu contador ou com a prefeitura.</b></div>
   ${it.map(k=>`<div class="row" style="align-items:flex-end"><div><label>${ds[k][0]} — ${fmtBRL(e.ret[k])}</label><input data-f4gn="${k}" value="${esc(ds[k][1])}"></div><div style="max-width:160px"><label>Vence em</label><input type="date" data-f4gd="${k}" value="${prox(ds[k][2])}"></div></div>`).join("")}
   <div class="err" id="f4gerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4gcx">Cancelar</button><button class="b" id="f4gok">Criar guias</button></div>`);
  ov.querySelector("#f4gcx").onclick=()=>ov.remove();
  ov.querySelector("#f4gok").onclick=()=>{
    const novos=[];
    for(const k of it){const d=ov.querySelector(`[data-f4gd="${k}"]`).value,n=ov.querySelector(`[data-f4gn="${k}"]`).value.trim();
      if(!finDataOk(d)){ov.querySelector("#f4gerr").textContent="Confira as datas: ano inválido.";return}
      novos.push({id:uid8(),tipo:"pagar",desc:`${ds[k][0]} — ${e.desc}`,contra:n||ds[k][1],fornId:finFornId(n||ds[k][1],null),cat:"Impostos e taxas",area:e.area||"",forma:"Boleto",valor:arred2(e.ret[k]),venc:d,pago:null,valorPago:null,comp:e.comp||e.venc.slice(0,7),obs:"guia gerada das retenções do lançamento de "+brDate(e.venc)})}
    finMutate(all=>[...all.map(x=>x.id===id?{...x,retGuias:true}:x),...novos]);
    ov.remove();toast(`${novos.length} guia(s) criada(s) em Contas a pagar.`);go("fin",true);
  };
}
function f4Aprovacao(id,acao){
  if(!f4Gestor()&&acao!=="ped")return f4Nega("aprovar pagamentos (só o gestor)");
  finMutate(all=>all.map(e=>e.id!==id?e:acao==="apr"?{...e,aprov:{por:f4Quem(),em:hojeIso()},aprovStatus:"aprovado"}:acao==="nao"?{...e,aprovStatus:"recusado"}:{...e,aprovStatus:"pendente"}));
  toast(acao==="apr"?"Pagamento aprovado.":acao==="nao"?"Aprovação recusada.":"Pedido enviado ao gestor.");go("fin",true);
}
function finAcoes3(e){
  let h="";
  if(e.aprovStatus==="pendente"&&!e.aprov)h+=`<span class="pill s-pendencia" title="Pagamento acima do limite: precisa da aprovação do gestor">aguardando aprovação</span> `;
  else if(e.aprovStatus==="recusado"&&!e.pago)h+=`<span class="pill s-falta">aprovação recusada</span> `;
  else if(e.aprov&&!e.pago)h+=`<span class="pill s-ok" title="Aprovado por ${esc((e.aprov||{}).por||"")}">aprovado</span> `;
  if(f4PrecisaAprov(e)){
    if(f4Gestor())h+=`<button class="b sm" data-f4apr="${e.id}">Aprovar</button> ${e.aprovStatus==="pendente"?`<button class="b sec sm" data-f4nao="${e.id}">Recusar</button> `:""}`;
    else if(e.aprovStatus!=="pendente")h+=`<button class="b sec sm" data-f4ped="${e.id}">Pedir aprovação</button> `;
  }
  if(e.barras&&!e.pago)h+=`<button class="b sec sm" data-fcopia="${e.id}" title="Copiar a linha digitável do boleto">Copiar boleto</button> `;
  if(e.tipo==="receber"&&e.pago&&!e.cancelada)h+=`<button class="b sec sm" data-frecibo="${e.id}" title="Gerar recibo em PDF">${ic("receipt")} Recibo</button> `;
  if(e.tipo==="pagar"&&f4RetTotal(e)>0&&!e.retGuias)h+=`<button class="b sec sm" data-f4guia="${e.id}" title="Gerar as guias dos impostos retidos">Guias</button> `;
  if(!e.pago)h+=`<button class="b sec sm" data-fcancel="${e.id}" title="Cancelar a conta sem pagar (fica no histórico)">Cancelar</button> `;
  if((e.hist||[]).length||e.criadoEm)h+=`<button class="b sec sm" data-f4hist="${e.id}" title="Quem fez o quê neste lançamento">Histórico</button> `;
  return h;
}
function bindAprov(){
  document.querySelectorAll("[data-f4apr]").forEach(b=>b.onclick=()=>f4Aprovacao(b.dataset.f4apr,"apr"));
  document.querySelectorAll("[data-f4nao]").forEach(b=>b.onclick=()=>f4Aprovacao(b.dataset.f4nao,"nao"));
  document.querySelectorAll("[data-f4ped]").forEach(b=>b.onclick=()=>f4Aprovacao(b.dataset.f4ped,"ped"));
  document.querySelectorAll("[data-f4hist]").forEach(b=>b.onclick=()=>f4HistModal(b.dataset.f4hist));
  document.querySelectorAll("[data-f4guia]").forEach(b=>b.onclick=()=>f4GuiasModal(b.dataset.f4guia));
}


/* >>> x_fin4c.js */
