/* ===== Financeiro 10: Bloco E — contas a receber e mensalidades ===== */
const f10cfg=()=>xcfg("fin10");
const f10save=p=>xcfgSave("fin10",p);
const F10={sim:{}};
const f10Ativos=()=>resAll().filter(resAtivo).sort((a,b)=>resNome(a).localeCompare(resNome(b),"pt"));
const f10ResOpts=()=>f10Ativos().map(r=>[r.id,resNome(r)]);
const f10Abertos=()=>finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada);
const f10Novo=(r,o)=>({id:uid8(),tipo:"receber",contra:(r&&r.resp&&typeof r.resp==="object"&&r.resp.nome)||(r?resNome(r):""),residente:r?r.id:undefined,area:"",forma:"Boleto",pago:null,valorPago:null,...o});
function f10Lanca(ents,msg){
  finMutate(all=>[...all,...ents]);
  if(!ents.every(n=>finAll().some(e=>e.id===n.id)))return"Não foi possível lançar (permissão ou mês fechado).";
  if(msg)toast(msg);return null;
}
const f10Mes=iso=>iso.slice(0,7);
const f10DiasMes=iso=>new Date(+iso.slice(0,4),+iso.slice(5,7),0).getDate();
/* ---------- 1. serviços extras ---------- */
function f10ExtrasHtml(){
  const C=f10cfg().extras||[];
  return f6Card("Serviços extras e planos","Cadastre o que é cobrado além da mensalidade (fralda, fisioterapia, acompanhante, lavanderia…). Depois lance para o residente no mês certo.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f10xn">Novo serviço</button><button class="b" id="f10xl" ${C.length?"":"disabled"}>Lançar para um residente</button></div>`+
   (C.length?f6Tbl(["Serviço","Valor unitário","Unidade",""],[C.map(x=>`<tr><td>${f6Esc(x.nome)}</td><td class="n">${f6Money(x.valor)}</td><td class="n">${f6Esc(x.un||"")}</td><td><button class="b sec sm" data-f10xe="${x.id}">Editar</button> <button class="b sec sm" data-f10xd="${x.id}">Excluir</button></td></tr>`).join("")]):`<div class="empty">Nenhum serviço cadastrado.</div>`));
}
function f10ExtraEdit(id){
  const x=(f10cfg().extras||[]).find(a=>a.id===id)||{};
  f6Form(id?"Editar serviço":"Novo serviço",[{k:"nome",l:"Nome",v:x.nome||""},{k:"valor",l:"Valor unitário (R$)",t:"number",v:x.valor||""},{k:"un",l:"Unidade (mês, dia, sessão, pacote…)",v:x.un||""}],v=>{
    if(!v.nome.trim()||!(v.valor>=0))return"Informe nome e valor.";const reg={id:x.id||uid8(),nome:v.nome.trim(),valor:arred2(v.valor||0),un:v.un.trim()},L=f10cfg().extras||[];
    f10save({extras:id?L.map(a=>a.id===id?reg:a):[...L,reg]});f6Go()});
}
function f10ExtraLanca(){
  const C=f10cfg().extras||[];
  f6Form("Lançar serviço extra",[{k:"r",l:"Residente",t:"select",opts:f10ResOpts()},{k:"s",l:"Serviço",t:"select",opts:C.map(x=>[x.id,`${x.nome} — ${fmtBRL(x.valor)}`])},{k:"q",l:"Quantidade",t:"number",v:1},{k:"venc",l:"Vencimento",t:"date",v:hojeIso()},{k:"comp",l:"Competência (AAAA-MM)",v:f10Mes(hojeIso())}],v=>{
    const r=resAll().find(a=>a.id===v.r),s=C.find(a=>a.id===v.s);if(!r||!s||!(v.q>0))return"Preencha tudo.";if(!finDataOk(v.venc))return"Data inválida.";
    return f10Lanca([f10Novo(r,{desc:`${s.nome}${v.q!==1?" ×"+v.q:""} — ${resNome(r)}`,cat:"Serviços extras",valor:arred2(s.valor*v.q),venc:v.venc,comp:v.comp})],"Serviço extra lançado.")||(f6Go(),null)});
}
f6Reg("extras","Contas a receber","Serviços extras",f10ExtrasHtml,()=>{const n=$("f10xn");if(n)n.onclick=()=>f10ExtraEdit();const l=$("f10xl");if(l)l.onclick=f10ExtraLanca;
  document.querySelectorAll("[data-f10xe]").forEach(b=>b.onclick=()=>f10ExtraEdit(b.dataset.f10xe));
  document.querySelectorAll("[data-f10xd]").forEach(b=>b.onclick=()=>{f10save({extras:(f10cfg().extras||[]).filter(a=>a.id!==b.dataset.f10xd)});f6Go()})});
/* ---------- 2. pro rata ---------- */
function f10ProRata(mens,dataIso,tipo,regra){
  const dm=regra==="30"?30:f10DiasMes(dataIso),dia=+dataIso.slice(8,10);
  const dias=tipo==="entrada"?Math.min(dm,dm-dia+1):Math.min(dm,dia);
  return{dias,dm,valor:arred2(mens*dias/dm)};
}
function f10ProHtml(){
  const regra=f10cfg().regraPro||"mes";
  return f6Card("Mensalidade proporcional (pro rata)","Para quem entra ou sai no meio do mês. Entrada: cobra do dia da entrada até o fim do mês. Saída: cobra do dia 1º até o dia da saída.",
   `<div class="row" style="align-items:flex-end;margin-bottom:10px"><div><label>Como contar os dias</label><select id="f10regra"><option value="mes" ${regra==="mes"?"selected":""}>Dias reais do mês</option><option value="30" ${regra==="30"?"selected":""}>Mês comercial de 30 dias</option></select></div><button class="b sec sm" id="f10regrasv">Salvar regra</button></div>
    <div class="row"><button class="b" id="f10pro">Calcular e lançar</button></div>`);
}
function f10ProForm(){
  const regra=f10cfg().regraPro||"mes";
  const ov=f6Form("Mensalidade proporcional",[{k:"r",l:"Residente",t:"select",opts:f10ResOpts()},{k:"tipo",l:"Situação",t:"select",opts:[["entrada","Entrada no meio do mês"],["saida","Saída no meio do mês"]]},{k:"data",l:"Data da entrada / saída",t:"date",v:hojeIso()},{k:"mens",l:"Mensalidade cheia (R$)",t:"number"},{k:"venc",l:"Vencimento da cobrança",t:"date",v:hojeIso()},{t:"note",l:"O valor calculado aparece ao salvar; confira antes de confirmar."}],async v=>{
    const r=resAll().find(a=>a.id===v.r);if(!r||!(v.mens>0)||!finDataOk(v.data)||!finDataOk(v.venc))return"Preencha residente, valor e datas.";
    const c=f10ProRata(v.mens,v.data,v.tipo,regra);
    if(!await askConfirm(`${c.dias} de ${c.dm} dias: ${fmtBRL(c.valor)}. Lançar?`,"Lançar"))return"Cancelado.";
    return f10Lanca([f10Novo(r,{desc:`Mensalidade proporcional (${c.dias}/${c.dm} dias) — ${resNome(r)}`,cat:"Mensalidades",valor:c.valor,venc:v.venc,comp:f10Mes(v.data),prorata:true})],"Mensalidade proporcional lançada.")||(f6Go(),null)},{ok:"Calcular e lançar"});
  const sel=ov.querySelector("#f6f_r"),m=ov.querySelector("#f6f_mens"),fill=()=>{const r=resAll().find(a=>a.id===sel.value);if(r&&+r.mensalidade)m.value=r.mensalidade};sel.onchange=fill;fill();
}
f6Reg("pro","Contas a receber","Pro rata",f10ProHtml,()=>{$("f10regrasv").onclick=()=>{f10save({regraPro:$("f10regra").value});toast("Regra salva.")};$("f10pro").onclick=f10ProForm});
/* ---------- 3. adesão, reserva e caução ---------- */
const F10_TAXAS={adesao:{n:"Taxa de adesão",cat:"Taxas de adesão",sr:false},reserva:{n:"Reserva de vaga",cat:"Reserva de vaga",sr:false},caucao:{n:"Caução (depósito)",cat:"Cauções",sr:true}};
function f10TaxasHtml(){
  const E=finAll().filter(e=>e.caucao&&e.tipo==="receber"&&!e.cancelada);
  return f6Card("Taxa de adesão, reserva de vaga e caução","Adesão e reserva são receita. Caução é dinheiro do residente que será devolvido: não entra no resultado da casa.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f10tn">Lançar taxa ou caução</button></div>`)
  +f6Card("Cauções","",E.length?f6Tbl(["Residente","Valor","Recebida","Situação",""],[E.map(e=>{const dev=finAll().find(x=>x.caucaoDev===e.id&&!x.cancelada);return `<tr><td>${f6Esc(e.contra||e.desc)}<div class="sub">${f6Esc(e.desc)}</div></td><td class="n">${f6Money(e.valor)}</td><td class="n">${e.pago?brDate(e.pago):"a receber"}</td><td class="n">${dev?"devolvida em "+brDate(dev.pago||dev.venc):e.pago?"em custódia":"—"}</td><td>${e.pago&&!dev?`<button class="b sec sm" data-f10cd="${e.id}">Devolver</button>`:""}</td></tr>`}).join("")]):`<div class="empty">Nenhuma caução.</div>`);
}
function f10TaxaNova(){
  f6Form("Taxa ou caução",[{k:"r",l:"Residente",t:"select",opts:f10ResOpts()},{k:"t",l:"Tipo",t:"select",opts:Object.entries(F10_TAXAS).map(([k,x])=>[k,x.n])},{k:"valor",l:"Valor (R$)",t:"number"},{k:"venc",l:"Vencimento",t:"date",v:hojeIso()}],v=>{
    const r=resAll().find(a=>a.id===v.r),t=F10_TAXAS[v.t];if(!r||!(v.valor>0)||!finDataOk(v.venc))return"Preencha tudo.";
    const e=f10Novo(r,{desc:`${t.n} — ${resNome(r)}`,cat:t.cat,valor:arred2(v.valor),venc:v.venc,comp:f10Mes(v.venc)});if(t.sr){e.semResultado=true;e.caucao=true}
    return f10Lanca([e],t.n+" lançada.")||(f6Go(),null)});
}
f6Reg("taxas","Contas a receber","Adesão e caução",f10TaxasHtml,()=>{const n=$("f10tn");if(n)n.onclick=f10TaxaNova;
  document.querySelectorAll("[data-f10cd]").forEach(b=>b.onclick=()=>{const c=finAll().find(e=>e.id===b.dataset.f10cd);
    f6Form("Devolver caução",[{t:"note",l:`${c.contra||c.desc}: caução de ${fmtBRL(c.valor)}.`},{k:"v",l:"Valor a devolver (R$)",t:"number",v:c.valor},{k:"data",l:"Data",t:"date",v:hojeIso()},{k:"conta",l:"Sai de",t:"select",opts:f4ContasPag().map(a=>[a.id,a.nome])}],v=>{
      if(!(v.v>0)||v.v>c.valor+0.001)return"Valor inválido.";const e={id:uid8(),tipo:"pagar",desc:"Devolução de caução — "+(c.contra||""),contra:c.contra,fornId:finFornId(c.contra,null),cat:"Cauções",area:"",forma:"Transferência",valor:arred2(v.v),venc:v.data,pago:v.data,valorPago:arred2(v.v),conta:v.conta,semResultado:true,caucaoDev:c.id};
      return f10Lanca([e],"Devolução registrada.")||(f6Go(),null)})})});
/* ---------- 4. acerto de saída ---------- */
function f10Acerto(rid,dataIso,regra){
  const r=resAll().find(a=>a.id===rid),ab=finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada&&e.residente===rid&&!e.caucao).sort((a,b)=>a.venc.localeCompare(b.venc));
  const pagoMes=finAll().some(e=>e.tipo==="receber"&&e.residente===rid&&!e.cancelada&&e.cat==="Mensalidades"&&(e.comp||e.venc.slice(0,7))===f10Mes(dataIso)&&e.pago);
  const aberMes=ab.find(e=>e.cat==="Mensalidades"&&(e.comp||e.venc.slice(0,7))===f10Mes(dataIso));
  const mens=+(aberMes?aberMes.valor:r&&r.mensalidade)||0,c=f10ProRata(mens,dataIso,"saida",regra);
  const devolver=pagoMes?arred2(mens-c.valor):0;
  const cau=finAll().filter(e=>e.caucao&&e.residente===rid&&e.pago&&!e.cancelada&&!finAll().some(x=>x.caucaoDev===e.id&&!x.cancelada));
  const enc=f4Encargos(ab.filter(e=>e.venc<hojeIso()));
  return{r,ab,mens,c,pagoMes,aberMes,devolver,cau,cauTot:soma(cau,e=>+e.valor),totAb:arred2(soma(ab,e=>+e.valor)),enc,
    saldo:arred2(soma(ab,e=>+e.valor)-(aberMes?+aberMes.valor-c.valor:0)+enc-soma(cau,e=>+e.valor)-devolver)};
}
function f10AcertoSpec(a,dataIso){
  const L=[];a.ab.forEach(e=>L.push([e.desc,e.venc,"A receber",+e.valor]));
  if(a.aberMes)L.push([`Ajuste proporcional (${a.c.dias}/${a.c.dm} dias)`,dataIso,"Crédito",-(+a.aberMes.valor-a.c.valor)]);
  if(a.devolver>0)L.push(["Mensalidade paga a maior (devolução)",dataIso,"Crédito",-a.devolver]);
  if(a.enc>0)L.push(["Multa e juros estimados",dataIso,"A receber",a.enc]);
  a.cau.forEach(e=>L.push(["Caução a devolver",e.pago,"Crédito",-(+e.valor)]));
  return[{titulo:"Acerto de saída",sub:`${resNome(a.r)} · saída em ${brDate(dataIso)} · ${a.saldo>=0?"saldo a receber":"saldo a devolver"}: ${fmtBRL(Math.abs(a.saldo))}`,cols:[{h:"Item",w:48},{h:"Data",t:"date",w:14},{h:"Natureza",w:14},{h:"Valor",t:"money",w:16}],rows:L,tot:[null,null,null,"sum"]}];
}
function f10AcertoHtml(){
  const s=F10.sim,a=s.r&&s.d?f10Acerto(s.r,s.d,f10cfg().regraPro||"mes"):null;
  return f6Card("Acerto de contas na saída do residente","Junta o que está em aberto, o proporcional do mês, a mensalidade paga a maior e a caução.",
   `<div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="f10ar"><option value="">—</option>${resAll().map(r=>`<option value="${r.id}" ${s.r===r.id?"selected":""}>${f6Esc(resNome(r))}</option>`).join("")}</select></div><div><label>Data da saída</label><input type="date" id="f10ad" value="${s.d||hojeIso()}"></div><button class="b" id="f10ago">Calcular</button></div>`+
   (a?`<div style="margin-top:12px">${f6Tbl(["Item","Valor"],[...a.ab.map(e=>`<tr><td>${f6Esc(e.desc)} <span class="sub">(venc. ${brDate(e.venc)})</span></td><td class="n">${f6Money(e.valor)}</td></tr>`),a.aberMes?`<tr><td>Ajuste proporcional da mensalidade do mês (${a.c.dias}/${a.c.dm} dias)</td><td class="n">−${f6Money(+a.aberMes.valor-a.c.valor)}</td></tr>`:"",a.devolver>0?`<tr><td>Mensalidade do mês já paga: devolver a diferença</td><td class="n">−${f6Money(a.devolver)}</td></tr>`:"",a.enc>0?`<tr><td>Multa e juros estimados</td><td class="n">${f6Money(a.enc)}</td></tr>`:"",...a.cau.map(e=>`<tr><td>Caução em custódia</td><td class="n">−${f6Money(e.valor)}</td></tr>`),`<tr style="font-weight:700"><td>${a.saldo>=0?"Saldo a receber da família":"Saldo a devolver à família"}</td><td class="n">${f6Money(Math.abs(a.saldo))}</td></tr>`])}<div class="row" style="margin-top:8px"><button class="b" id="f10apdf">Gerar PDF do acerto</button></div></div>`:""));
}
f6Reg("acerto","Contas a receber","Acerto de saída",f10AcertoHtml,()=>{$("f10ago").onclick=()=>{F10.sim.r=$("f10ar").value;F10.sim.d=$("f10ad").value;f6Go()};const p=$("f10apdf");if(p)p.onclick=()=>f5Pdf(`acerto-${safe(resNome(resAll().find(r=>r.id===F10.sim.r))).slice(0,25)}.pdf`,f10AcertoSpec(f10Acerto(F10.sim.r,F10.sim.d,f10cfg().regraPro||"mes"),F10.sim.d))});
/* ---------- 5. desconto por pontualidade ---------- */
function f10Desc(e){const c=f10cfg().pont;if(!c||!(c.pct>0))return 0;if(!/mensalidade/i.test(e.cat||""))return 0;return hojeIso()<=addDaysIso(e.venc,-(+c.dias||0))?arred2(+e.valor*c.pct/100):0}
function f10PontHtml(){
  const c=f10cfg().pont||{},L=f10Abertos().filter(e=>/mensalidade/i.test(e.cat||"")).sort((a,b)=>a.venc.localeCompare(b.venc)).slice(0,40),tj=f10cfg().juros||{};
  return f6Card("Desconto por pontualidade ou pagamento antecipado","Defina o desconto concedido a quem paga até um certo número de dias antes do vencimento (0 = até o próprio vencimento).",
   `<div class="row" style="align-items:flex-end"><div><label>Desconto (%)</label><input type="number" step="0.1" id="f10dp" value="${c.pct||""}" style="width:90px"></div><div><label>Pagando até X dias antes</label><input type="number" id="f10dd" value="${c.dias||0}" style="width:90px"></div><button class="b" id="f10dsv">Salvar</button></div>`)
   +f6Card("Mensalidades em aberto",c.pct>0?"Quem paga hoje tem o desconto abaixo.":"Configure o desconto acima para ver os valores.",L.length?f6Tbl(["Cobrança","Vence","Valor","Desconto hoje","Pagando hoje",""],[L.map(e=>{const d=f10Desc(e);return `<tr><td>${f6Esc(e.desc)}</td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td><td class="n">${d?f6Money(d):"—"}</td><td class="n">${f6Money(+e.valor-d)}</td><td>${d?`<button class="b sec sm" data-f10dr="${e.id}">Receber com desconto</button>`:""}</td></tr>`}).join("")]):`<div class="empty">Nenhuma mensalidade em aberto.</div>`);
}
f6Reg("pont","Contas a receber","Desconto por pontualidade",f10PontHtml,()=>{$("f10dsv").onclick=()=>{f10save({pont:{pct:Math.max(0,f6Num($("f10dp").value)),dias:Math.max(0,Math.round(f6Num($("f10dd").value)))}});f6Go()};
  document.querySelectorAll("[data-f10dr]").forEach(b=>b.onclick=async()=>{const e=finAll().find(x=>x.id===b.dataset.f10dr),d=f10Desc(e);if(!d)return;
    if(!await askConfirm(`Receber ${fmtBRL(+e.valor-d)} (desconto de ${fmtBRL(d)})?`,"Receber"))return;
    finMutate(all=>all.map(x=>x.id===e.id?{...x,pago:hojeIso(),valorPago:arred2(+x.valor-d),desconto:d,obs:(x.obs?x.obs+" · ":"")+`desconto de pontualidade ${fmtBRL(d)}`}:x));
    if(finAll().find(x=>x.id===e.id).pago){toast("Recebido com desconto.");f6Go()}})});
/* ---------- 6. carnê e segunda via ---------- */
function f10CarneSpec(rid,desde){
  const r=resAll().find(a=>a.id===rid),emp=empresa(),L=f10Abertos().filter(e=>e.residente===rid&&e.venc>=desde).sort((a,b)=>a.venc.localeCompare(b.venc));
  return[{titulo:`Carnê de pagamento — ${resNome(r)}`,sub:`${emp.razao}${emp.cnpj?" · CNPJ "+emp.cnpj:""}${f4cfg().pix?" · PIX: "+f4cfg().pix:""} · ${L.length} parcela(s) · total ${fmtBRL(soma(L,e=>+e.valor))}`,cols:[{h:"Parcela",w:30},{h:"Vencimento",t:"date",w:14},{h:"Valor",t:"money",w:14},{h:"Linha digitável / PIX",w:46}],rows:L.map(e=>[e.desc,e.venc,+e.valor,e.barras?finBarrasFmt(e.barras):(f4cfg().pix?"PIX "+f4cfg().pix:"")]),tot:[null,null,"sum",null]}];
}
function f10ViaSpec(e){
  const emp=empresa();return[{titulo:e.pago?"Recibo — segunda via":"Cobrança — segunda via",sub:`${emp.razao}${emp.cnpj?" · CNPJ "+emp.cnpj:""}`,cols:[{h:"Campo",w:30},{h:"Informação",w:70}],rows:[["Referente a",e.desc],["Pagador",e.contra||""],["Vencimento",brDate(e.venc)],["Valor",fmtBRL(e.valor)],...(e.pago?[["Recebido em",brDate(e.pago)],["Valor recebido",fmtBRL(finNum(e))],["Forma",e.forma||""]]:[["Linha digitável",e.barras?finBarrasFmt(e.barras):"—"],["PIX",f4cfg().pix||"—"]]),["Emitido em",brDate(hojeIso())]]}];
}
function f10CarneHtml(){
  const s=F10.sim,L=s.cq?finAll().filter(e=>e.tipo==="receber"&&!e.cancelada&&f7Norm(e.desc+" "+(e.contra||"")).includes(f7Norm(s.cq))).sort((a,b)=>b.venc.localeCompare(a.venc)).slice(0,15):[];
  return f6Card("Carnê de pagamento","Lista as parcelas ainda não pagas de um residente a partir de uma data, num PDF para entregar à família.",
   `<div class="row" style="align-items:flex-end"><div><label>Residente</label><select id="f10cr">${f10ResOpts().map(([i,n])=>`<option value="${i}">${f6Esc(n)}</option>`).join("")}</select></div><div><label>A partir de</label><input type="date" id="f10cd" value="${hojeIso()}"></div><button class="b" id="f10cgo">Gerar carnê (PDF)</button></div>`)
   +f6Card("Segunda via de cobrança ou recibo","Procure pelo nome ou descrição.",
   `<div class="row"><input id="f10cq" value="${f6Esc(s.cq||"")}" placeholder="Nome ou descrição" style="flex:1;min-width:200px"><button class="b" id="f10cb">Buscar</button></div>`+(L.length?f6Tbl(["Cobrança","Vencimento","Valor","Situação",""],[L.map(e=>`<tr><td>${f6Esc(e.desc)}<div class="sub">${f6Esc(e.contra||"")}</div></td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td><td class="n">${finStatusLabel(e)}</td><td><button class="b sec sm" data-f10via="${e.id}">${e.pago?"Recibo (PDF)":"Cobrança (PDF)"}</button></td></tr>`).join("")]):""));
}
f6Reg("carne","Contas a receber","Carnê e segunda via",f10CarneHtml,()=>{
  $("f10cgo").onclick=()=>{const rid=$("f10cr").value;if(!rid)return;const sp=f10CarneSpec(rid,$("f10cd").value||hojeIso());if(!sp[0].rows.length)return toast("Nenhuma parcela em aberto a partir desta data.",true);f5Pdf(`carne-${safe(resNome(resAll().find(r=>r.id===rid))).slice(0,25)}.pdf`,sp)};
  const g=()=>{F10.sim.cq=$("f10cq").value;f6Go()};$("f10cb").onclick=g;$("f10cq").onkeydown=e=>{if(e.key==="Enter")g()};
  document.querySelectorAll("[data-f10via]").forEach(b=>b.onclick=()=>f5Pdf(`via-${b.dataset.f10via}.pdf`,f10ViaSpec(finAll().find(e=>e.id===b.dataset.f10via))))});
/* ---------- 7. régua de cobrança ---------- */
const F10_REGUA=[{d:-3,t:"Lembrete antes do vencimento"},{d:1,t:"Aviso de atraso (1 dia)"},{d:7,t:"Segundo aviso (7 dias)"},{d:15,t:"Cobrança firme (15 dias)"},{d:30,t:"Último aviso antes de medidas (30 dias)"}];
function f10Regua(){
  const h=hojeIso(),feito=f10cfg().reguaFeito||{},out=[];
  f10Abertos().forEach(e=>{const at=daysBetweenIso(e.venc,h);F10_REGUA.forEach(p=>{if(at===p.d||(p.d>0&&at>p.d&&at<p.d+3))out.push({e,p,k:e.id+"|"+p.d,feito:!!feito[e.id+"|"+p.d]})})});
  return out.sort((a,b)=>b.p.d-a.p.d);
}
function f10ReguaHtml(){
  const L=f10Regua(),pend=L.filter(x=>!x.feito).length;
  return f6Card("Régua de cobrança de hoje",`O sistema não envia mensagens sozinho. Ele mostra quem deve receber qual aviso hoje; você abre o WhatsApp com o texto pronto e marca como feito. Etapas: ${F10_REGUA.map(p=>p.t).join("; ")}. <b>${pend} pendente(s).</b>`,
   L.length?f6Tbl(["Conta","Etapa","Responsável","",""],[L.map(x=>{const d={res:x.e.residente||"",nome:x.e.contra||x.e.desc,contra:x.e.contra||"",itens:[x.e],total:+x.e.valor},rp=f4Resp(d),msg=f4MsgCobranca(d,x.p.d<0?"aviso":"cobranca");return `<tr style="${x.feito?"opacity:.55":""}"><td>${f6Esc(x.e.desc)}<div class="sub">${brDate(x.e.venc)} · ${fmtBRL(x.e.valor)}</div></td><td class="n">${f6Esc(x.p.t)}</td><td class="n">${f6Esc(rp.nome)}<div class="sub">${rp.tel||"sem telefone"}</div></td><td>${rp.tel?`<a class="b sm" target="_blank" rel="noopener" href="https://wa.me/55${rp.tel.replace(/^55/,"")}?text=${encodeURIComponent(msg)}">WhatsApp</a>`:`<button class="b sec sm" data-f10cp="${f6Esc(msg)}">Copiar texto</button>`}</td><td>${x.feito?"✔ feito":`<button class="b sec sm" data-f10rf="${f6Esc(x.k)}">Marcar como feito</button>`}</td></tr>`}).join("")]):`<div class="empty">Nenhum aviso a fazer hoje.</div>`);
}
f6Reg("regua","Contas a receber","Régua de cobrança",f10ReguaHtml,()=>{
  document.querySelectorAll("[data-f10rf]").forEach(b=>b.onclick=()=>{f10save({reguaFeito:{...(f10cfg().reguaFeito||{}),[b.dataset.f10rf]:hojeIso()}});f6Go()});
  document.querySelectorAll("[data-f10cp]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.f10cp);toast("Texto copiado.")}catch(e){toast("Não foi possível copiar.",true)}})});
/* ---------- 8. risco, provisão e indicadores ---------- */
const F10_PDD=[[0,30,2],[31,60,5],[61,90,15],[91,180,30],[181,99999,60]];
function f10Pdd(){
  const P=f10cfg().pdd||F10_PDD.map(x=>x[2]),h=hojeIso(),f=F10_PDD.map(([a,b],i)=>({a,b,pct:P[i],tot:0,n:0}));
  f10Abertos().filter(e=>e.venc<h).forEach(e=>{const d=daysBetweenIso(e.venc,h),k=f.find(x=>d>=x.a&&d<=x.b)||f[f.length-1];k.tot+=+e.valor;k.n++});
  f.forEach(k=>{k.tot=arred2(k.tot);k.prov=arred2(k.tot*k.pct/100)});return f;
}
function f10Score(){
  const h=hojeIso(),m={};
  finAll().filter(e=>e.tipo==="receber"&&!e.cancelada&&e.venc<=h&&e.venc>=addMesesIso(h,-12)).forEach(e=>{const k=e.residente?"r:"+e.residente:"c:"+estNorm(e.contra||e.desc);const o=m[k]=m[k]||{nome:e.residente?resNomeDe(e.residente):(e.contra||e.desc),n:0,atr:0,dias:0,aberto:0};o.n++;const at=e.pago?Math.max(0,daysBetweenIso(e.venc,e.pago)):Math.max(0,daysBetweenIso(e.venc,h));if(at>0){o.atr++;o.dias+=at}if(!e.pago)o.aberto+=+e.valor});
  return Object.values(m).filter(o=>o.n>=3).map(o=>{const pct=o.atr/o.n,med=o.atr?o.dias/o.atr:0,sc=Math.min(100,Math.round(pct*60+Math.min(med,60)/60*40));return{...o,pct,med,sc,nv:sc>=60?"alto":sc>=30?"médio":"baixo"}}).sort((a,b)=>b.sc-a.sc);
}
function f10Indic(){
  const h=hojeIso(),d12=addMesesIso(h,-12),L=finAll().filter(e=>e.tipo==="receber"&&!e.cancelada&&!e.semResultado&&e.venc>=d12&&e.venc<=h),fat=soma(L,e=>+e.valor),venc=soma(L.filter(e=>!e.pago),e=>+e.valor);
  const pg=L.filter(e=>e.pago),prazo=pg.length?soma(pg,e=>daysBetweenIso(e.venc,e.pago))/pg.length:0,noPrazo=pg.length?pg.filter(e=>e.pago<=e.venc).length/pg.length*100:0;
  return{fat,venc,taxa:fat?venc/fat*100:0,prazo,noPrazo,n:L.length};
}
function f10RiscoHtml(){
  const f=f10Pdd(),prov=soma(f,x=>x.prov),S=f10Score(),I=f10Indic();
  return `<div class="stats"><div class="stat"><b>${I.taxa.toFixed(1).replace(".",",")}%</b><span>inadimplência (12 meses)</span></div><div class="stat"><b>${I.noPrazo.toFixed(0)}%</b><span>pagos em dia</span></div><div class="stat"><b>${I.prazo>0?"+":""}${I.prazo.toFixed(1).replace(".",",")} dias</b><span>prazo médio vs. vencimento</span></div><div class="stat"><b>${f6Money(prov)}</b><span>provisão sugerida</span></div></div>`
   +f6Card("Provisão para devedores duvidosos","Reserva contábil para perdas esperadas, por tempo de atraso. Ajuste os percentuais à realidade da casa.",
     f6Tbl(["Faixa de atraso","Contas","Em aberto","% provisão","Provisão"],[f.map((k,i)=>`<tr><td>${k.b>9999?`mais de ${k.a-1} dias`:`${k.a} a ${k.b} dias`}</td><td class="n">${k.n}</td><td class="n">${f6Money(k.tot)}</td><td class="n"><input type="number" data-f10pp="${i}" value="${k.pct}" style="width:70px"></td><td class="n">${f6Money(k.prov)}</td></tr>`).join("")])+`<div class="row" style="margin-top:8px"><button class="b sec sm" id="f10ppsv">Salvar percentuais</button></div>`)
   +f6Card("Risco de cada pagador","Pelos últimos 12 meses (pelo menos 3 cobranças): quantas vezes atrasou e por quantos dias, em nota de 0 a 100.",
     S.length?f6Tbl(["Pagador","Cobranças","Atrasos","Atraso médio","Em aberto","Risco"],[S.slice(0,40).map(o=>`<tr><td>${f6Esc(o.nome)}</td><td class="n">${o.n}</td><td class="n">${o.atr}</td><td class="n">${Math.round(o.med)} dias</td><td class="n">${f6Money(o.aberto)}</td><td class="n"><b style="color:${o.nv==="alto"?"#c62828":o.nv==="médio"?"#e0a100":"#2e7d32"}">${o.sc} (${o.nv})</b></td></tr>`).join("")]):`<div class="empty">Ainda não há histórico suficiente.</div>`);
}
f6Reg("risco","Contas a receber","Inadimplência e risco",f10RiscoHtml,()=>{$("f10ppsv").onclick=()=>{f10save({pdd:[...document.querySelectorAll("[data-f10pp]")].map(i=>Math.min(100,Math.max(0,f6Num(i.value))))});toast("Percentuais salvos.");f6Go()}});
/* ---------- 9. vagas e receita potencial ---------- */
function f10VagasHtml(){
  const c=f10cfg().vagas||{},at=f10Ativos(),n=at.length,V=+c.total||0,tab=+c.tabela||0,real=soma(at,r=>+r.mensalidade||0),pot=V*tab,oc=V?n/V*100:0,desc=tab?soma(at,r=>Math.max(0,tab-(+r.mensalidade||0))):0;
  return f6Card("Vagas e receita potencial","Informe quantas vagas a casa tem e o preço de tabela para comparar com o que de fato é cobrado.",
   `<div class="row" style="align-items:flex-end"><div><label>Total de vagas</label><input type="number" id="f10vt" value="${c.total||""}" style="width:100px"></div><div><label>Preço de tabela (R$/mês)</label><input type="number" id="f10vp" value="${c.tabela||""}" style="width:130px"></div><button class="b" id="f10vsv">Salvar</button></div>`)
   +(V?`<div class="stats"><div class="stat"><b>${n} de ${V}</b><span>vagas ocupadas · ${oc.toFixed(0)}%</span></div><div class="stat"><b>${V-n}</b><span>vagas livres</span></div><div class="stat"><b>${f6Money(real)}</b><span>mensalidades contratadas</span></div>${tab?`<div class="stat"><b>${f6Money(pot)}</b><span>receita potencial (100% a tabela)</span></div><div class="stat"><b>${f6Money(pot-real)}</b><span>diferença: vagas livres + descontos</span></div><div class="stat"><b>${f6Money(Math.max(0,(V-n)*tab))}</b><span>perdido com vagas livres</span></div><div class="stat"><b>${f6Money(desc)}</b><span>descontos concedidos</span></div>`:""}<div class="stat"><b>${n?f6Money(real/n):"—"}</b><span>ticket médio</span></div></div>`:"")
   +(n?f6Card("Mensalidade por residente","",f6Tbl(["Residente","Mensalidade",tab?"Desconto sobre a tabela":"—"],[at.map(r=>`<tr><td>${f6Esc(resNome(r))}</td><td class="n">${f6Money(+r.mensalidade||0)}</td><td class="n">${tab&&+r.mensalidade?(((tab-r.mensalidade)/tab*100).toFixed(1).replace(".",",")+"%"):"—"}</td></tr>`).join("")])):"");
}
f6Reg("vagas","Contas a receber","Vagas e receita potencial",f10VagasHtml,()=>{$("f10vsv").onclick=()=>{f10save({vagas:{total:Math.max(0,Math.round(f6Num($("f10vt").value))),tabela:Math.max(0,f6Num($("f10vp").value))}});f6Go()}});
/* ---------- 10. indicação, convênios, benefícios, jurídico ---------- */
const f10List=k=>f10cfg()[k]||[];
function f10Registro(k,titulo,sub,cols,campos,extra){
  const L=f10List(k).slice().reverse();
  return f6Card(titulo,sub,`<div class="row" style="margin-bottom:8px"><button class="b sm" data-f10rn="${k}">Novo registro</button></div>`+(L.length?f6Tbl([...cols.map(c=>c[1]),""],[L.map(x=>`<tr>${cols.map(c=>`<td class="${c[2]||""}">${c[0](x)}</td>`).join("")}<td><button class="b sec sm" data-f10re="${k}|${x.id}">Editar</button> <button class="b sec sm" data-f10rd="${k}|${x.id}">Excluir</button>${extra?extra(x):""}</td></tr>`).join("")],"txt"):`<div class="empty">Nada registrado.</div>`));
}
const F10_REG={
  indic:{t:"Programa de indicação",s:"Quem indicou quem, e qual benefício foi combinado.",cols:[[x=>f6Esc(x.quem),"Quem indicou"],[x=>f6Esc(x.novo),"Indicado"],[x=>brDate(x.data),"Data"],[x=>f6Money(x.valor||0),"Benefício","n"],[x=>x.status==="concedido"?"concedido":"pendente","Situação"]],
    campos:x=>[{k:"quem",l:"Quem indicou",v:x.quem||""},{k:"novo",l:"Quem foi indicado",v:x.novo||""},{k:"data",l:"Data",t:"date",v:x.data||hojeIso()},{k:"valor",l:"Valor do benefício (R$)",t:"number",v:x.valor||""},{k:"status",l:"Situação",t:"select",opts:[["pendente","Pendente (aguarda o indicado entrar/pagar)"],["concedido","Benefício concedido"]],v:x.status||"pendente"}],ok:v=>(v.quem.trim()&&v.novo.trim())?null:"Informe quem indicou e o indicado."},
  conv:{t:"Convênios e glosas",s:"Valores faturados a convênios ou órgãos, o que foi glosado (negado) e o que foi recebido.",cols:[[x=>f6Esc(x.conv),"Convênio / órgão"],[x=>f6Esc(x.comp),"Competência"],[x=>f6Money(x.fat||0),"Faturado","n"],[x=>f6Money(x.glosa||0),"Glosa","n"],[x=>f6Money((x.fat||0)-(x.glosa||0)),"A receber","n"],[x=>f6Esc(x.status==="recebido"?"recebido":x.status==="recurso"?"em recurso":"faturado"),"Situação"]],
    campos:x=>[{k:"conv",l:"Convênio ou órgão",v:x.conv||""},{k:"comp",l:"Competência (AAAA-MM)",v:x.comp||f10Mes(hojeIso())},{k:"fat",l:"Valor faturado (R$)",t:"number",v:x.fat||""},{k:"glosa",l:"Valor glosado (R$)",t:"number",v:x.glosa||0},{k:"motivo",l:"Motivo da glosa",v:x.motivo||""},{k:"status",l:"Situação",t:"select",opts:[["faturado","Faturado"],["recurso","Glosa em recurso"],["recebido","Recebido"]],v:x.status||"faturado"}],ok:v=>(v.conv.trim()&&v.fat>0)?null:"Informe convênio e valor.",
    extra:x=>x.status!=="recebido"&&!x.entry?` <button class="b sm" data-f10cv="${x.id}">Lançar a receber</button>`:""},
  benef:{t:"Benefício previdenciário e procuração",s:"De onde vem o dinheiro da mensalidade e quem pode movimentar. O sistema avisa quando a procuração está perto de vencer.",cols:[[x=>f6Esc(x.res),"Residente"],[x=>f6Esc(x.fonte),"Fonte de renda"],[x=>x.dia?"dia "+x.dia:"—","Crédito"],[x=>f6Money(x.valor||0),"Valor","n"],[x=>f6Esc(x.proc||"—"),"Procurador"],[x=>x.procVal?brDate(x.procVal):"—","Procuração até"]],
    campos:x=>[{k:"res",l:"Residente",v:x.res||"",list:resAll().map(resNome)},{k:"fonte",l:"Fonte (INSS, pensão, aposentadoria, família…)",v:x.fonte||""},{k:"valor",l:"Valor mensal (R$)",t:"number",v:x.valor||""},{k:"dia",l:"Dia do crédito",t:"number",v:x.dia||""},{k:"proc",l:"Procurador / curador",v:x.proc||""},{k:"procVal",l:"Validade da procuração",t:"date",v:x.procVal||""}],ok:v=>v.res.trim()?null:"Informe o residente."},
  jur:{t:"Negativação, protesto e cobrança judicial",s:"Registro de em que ponto está a cobrança de cada dívida grave. O sistema não envia nada a cartório ou bureau: você registra aqui o que fez fora.",cols:[[x=>f6Esc(x.devedor),"Devedor"],[x=>f6Money(x.valor||0),"Valor","n"],[x=>f6Esc({neg:"Negativado",prot:"Protestado",jud:"Cobrança judicial",acordo:"Em acordo",perda:"Baixado como perda"}[x.fase]||x.fase),"Fase"],[x=>brDate(x.data),"Desde"],[x=>f6Esc(x.obs||""),"Observações"]],
    campos:x=>[{k:"devedor",l:"Devedor",v:x.devedor||"",list:f4Devedores().map(d=>d.nome)},{k:"valor",l:"Valor (R$)",t:"number",v:x.valor||""},{k:"fase",l:"Fase",t:"select",opts:[["neg","Negativado (SPC/Serasa)"],["prot","Protestado em cartório"],["jud","Cobrança judicial"],["acordo","Em acordo"],["perda","Baixado como perda"]],v:x.fase||"neg"},{k:"data",l:"Desde",t:"date",v:x.data||hojeIso()},{k:"obs",l:"Observações (nº do processo, advogado…)",t:"textarea",v:x.obs||""}],ok:v=>(v.devedor.trim()&&v.valor>0)?null:"Informe devedor e valor."}
};
function f10RegEdit(k,id){
  const R=F10_REG[k],x=f10List(k).find(a=>a.id===id)||{};
  f6Form(id?"Editar":"Novo registro",R.campos(x),v=>{const er=R.ok(v);if(er)return er;const reg={...x,...v,id:x.id||uid8()};f10save({[k]:id?f10List(k).map(a=>a.id===id?reg:a):[...f10List(k),reg]});f6Go()});
}
function f10RegBind(){
  document.querySelectorAll("[data-f10rn]").forEach(b=>b.onclick=()=>f10RegEdit(b.dataset.f10rn));
  document.querySelectorAll("[data-f10re]").forEach(b=>b.onclick=()=>{const[k,id]=b.dataset.f10re.split("|");f10RegEdit(k,id)});
  document.querySelectorAll("[data-f10rd]").forEach(b=>b.onclick=async()=>{const[k,id]=b.dataset.f10rd.split("|");if(await askConfirm("Excluir este registro?","Excluir")){f10save({[k]:f10List(k).filter(a=>a.id!==id)});f6Go()}});
  document.querySelectorAll("[data-f10cv]").forEach(b=>b.onclick=()=>{const x=f10List("conv").find(a=>a.id===b.dataset.f10cv),liq=arred2((x.fat||0)-(x.glosa||0));
    f6Form("Lançar a receber",[{t:"note",l:`${x.conv} — valor líquido ${fmtBRL(liq)}.`},{k:"venc",l:"Previsão de recebimento",t:"date",v:addDaysIso(hojeIso(),30)}],v=>{if(!finDataOk(v.venc))return"Data inválida.";const e=f10Novo(null,{desc:`Convênio ${x.conv} — ${x.comp}`,contra:x.conv,cat:"Convênios",valor:liq,venc:v.venc,comp:x.comp,forma:"Transferência"});
      const er=f10Lanca([e],"Conta a receber lançada.");if(er)return er;f10save({conv:f10List("conv").map(a=>a.id===x.id?{...a,entry:e.id}:a)});f6Go()})});
}
Object.entries(F10_REG).forEach(([k,R])=>f6Reg(k,"Contas a receber",R.t,()=>f10Registro(k,R.t,R.s,R.cols,R.campos,R.extra),f10RegBind));
/* ---------- 11. recibos em lote e doações ---------- */
function f10RecibosSpec(mes){
  const emp=empresa(),L=finAll().filter(e=>e.tipo==="receber"&&e.pago&&!e.cancelada&&e.pago.slice(0,7)===mes&&finNum(e)>0&&!e.caucao).sort((a,b)=>a.pago.localeCompare(b.pago));
  return[{titulo:`Recibos de ${mes.slice(5)}/${mes.slice(0,4)}`,sub:`${emp.razao}${emp.cnpj?" · CNPJ "+emp.cnpj:""} · ${L.length} recibo(s) · total ${fmtBRL(soma(L,e=>finNum(e)))}`,cols:[{h:"Nº",w:8},{h:"Recebido de",w:28},{h:"Referente a",w:36},{h:"Data",t:"date",w:12},{h:"Valor",t:"money",w:14}],rows:L.map((e,i)=>[String(i+1).padStart(3,"0"),e.contra||"",e.desc,e.pago,finNum(e)]),tot:[null,null,null,null,"sum"]}];
}
function f10DoaHtml(){
  const D=f10List("doacoes").slice().reverse(),ed=f10List("editais").slice().reverse(),mes=F10.sim.rm||f10Mes(hojeIso());
  return f6Card("Recibos do mês em lote","Um PDF com todos os recebimentos do mês, para arquivo ou conferência (cauções ficam de fora).",
   `<div class="row" style="align-items:flex-end"><div><label>Mês</label><input type="month" id="f10rm" value="${mes}"></div><button class="b" id="f10rb">Gerar PDF</button></div>`)
   +f6Card("Doações recebidas","Cada doação vira receita (categoria Doações) e pode gerar recibo ao doador.",`<div class="row" style="margin-bottom:8px"><button class="b sm" id="f10dn">Registrar doação</button></div>`+(D.length?f6Tbl(["Doador","Data","Valor","Destino",""],[D.map(x=>`<tr><td>${f6Esc(x.doador)}</td><td class="n">${brDate(x.data)}</td><td class="n">${f6Money(x.valor)}</td><td class="n">${f6Esc(x.destino||"")}</td><td><button class="b sec sm" data-f10dr2="${x.id}">Recibo (PDF)</button></td></tr>`).join("")]):`<div class="empty">Nenhuma doação.</div>`))
   +f6Card("Projetos, editais e convênios públicos","Acompanhe valor aprovado, quanto já foi usado e o prazo da prestação de contas.",`<div class="row" style="margin-bottom:8px"><button class="b sm" id="f10en">Novo projeto / edital</button></div>`+(ed.length?f6Tbl(["Projeto","Órgão","Aprovado","Usado","Prestar contas até","Situação",""],[ed.map(x=>{const d=x.prazo?daysBetweenIso(hojeIso(),x.prazo):null;return `<tr><td>${f6Esc(x.nome)}</td><td class="n">${f6Esc(x.orgao||"")}</td><td class="n">${f6Money(x.valor||0)}</td><td class="n">${f6Money(x.usado||0)}</td><td class="n">${x.prazo?brDate(x.prazo):"—"}</td><td class="n">${x.fechado?"encerrado":d!=null&&d<0?f6Dot("#c62828")+"atrasado":d!=null&&d<=30?f6Dot("#e0a100")+"vence em "+d+" d":f6Dot("#2e7d32")+"em andamento"}</td><td><button class="b sec sm" data-f10ee="${x.id}">Editar</button> <button class="b sec sm" data-f10ed="${x.id}">Excluir</button></td></tr>`}).join("")]):`<div class="empty">Nenhum projeto.</div>`));
}
function f10DoaNova(){
  f6Form("Registrar doação",[{k:"doador",l:"Doador"},{k:"doc",l:"CPF ou CNPJ do doador"},{k:"valor",l:"Valor (R$)",t:"number"},{k:"data",l:"Data",t:"date",v:hojeIso()},{k:"conta",l:"Entrou em",t:"select",opts:f4ContasPag().map(c=>[c.id,c.nome])},{k:"destino",l:"Destino / finalidade"}],v=>{
    if(!v.doador.trim()||!(v.valor>0)||!finDataOk(v.data))return"Preencha doador, valor e data.";const id=uid8(),e={id,tipo:"receber",desc:"Doação — "+v.doador.trim(),contra:v.doador.trim(),cat:"Doações",area:"",forma:"Transferência",valor:arred2(v.valor),venc:v.data,pago:v.data,valorPago:arred2(v.valor),conta:v.conta,doacao:true};
    const er=f10Lanca([e],"Doação registrada.");if(er)return er;f10save({doacoes:[...f10List("doacoes"),{id,doador:v.doador.trim(),doc:v.doc.trim(),valor:arred2(v.valor),data:v.data,destino:v.destino.trim()}]});f6Go()});
}
function f10EditalEdit(id){
  const x=f10List("editais").find(a=>a.id===id)||{};
  f6Form(id?"Editar projeto":"Novo projeto / edital",[{k:"nome",l:"Nome",v:x.nome||""},{k:"orgao",l:"Órgão financiador",v:x.orgao||""},{k:"valor",l:"Valor aprovado (R$)",t:"number",v:x.valor||""},{k:"usado",l:"Valor já utilizado (R$)",t:"number",v:x.usado||""},{k:"prazo",l:"Prazo da prestação de contas",t:"date",v:x.prazo||""},{k:"fechado",l:"Encerrado",t:"check",v:!!x.fechado}],v=>{
    if(!v.nome.trim())return"Informe o nome.";const reg={...x,...v,id:x.id||uid8()};f10save({editais:id?f10List("editais").map(a=>a.id===id?reg:a):[...f10List("editais"),reg]});f6Go()});
}
f6Reg("doa","Contas a receber","Doações, recibos e projetos",f10DoaHtml,()=>{
  $("f10rb").onclick=()=>{F10.sim.rm=$("f10rm").value;const sp=f10RecibosSpec(F10.sim.rm);if(!sp[0].rows.length)return toast("Nenhum recebimento neste mês.",true);f5Pdf(`recibos-${F10.sim.rm}.pdf`,sp)};
  $("f10dn").onclick=f10DoaNova;$("f10en").onclick=()=>f10EditalEdit();
  document.querySelectorAll("[data-f10ee]").forEach(b=>b.onclick=()=>f10EditalEdit(b.dataset.f10ee));
  document.querySelectorAll("[data-f10ed]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir este projeto?","Excluir")){f10save({editais:f10List("editais").filter(a=>a.id!==b.dataset.f10ed)});f6Go()}});
  document.querySelectorAll("[data-f10dr2]").forEach(b=>b.onclick=()=>{const x=f10List("doacoes").find(a=>a.id===b.dataset.f10dr2),emp=empresa();
    f5Pdf(`recibo-doacao-${x.id}.pdf`,[{titulo:"Recibo de doação",sub:`${emp.razao}${emp.cnpj?" · CNPJ "+emp.cnpj:""}`,cols:[{h:"Campo",w:30},{h:"Informação",w:70}],rows:[["Doador",x.doador],["CPF/CNPJ",x.doc||"—"],["Valor",fmtBRL(x.valor)],["Data",brDate(x.data)],["Destinação",x.destino||"—"],["Declaração","Recebemos a doação acima descrita. Agradecemos a generosidade."]]}])})});
/* ---------- avisos na tela inicial ---------- */
const _urg10=urgencias;
urgencias=function(per){const L=_urg10(per);try{if(podeVer("fin")){const h=hojeIso();
  f10List("benef").forEach(x=>{if(!x.procVal)return;const d=daysBetweenIso(h,x.procVal);if(d<=30)L.push({nivel:d<0?3:d<=10?2:1,tipo:"Financeiro",titulo:`Procuração de ${x.res} ${d<0?"venceu":"vence em "+d+" dia(s)"}`,detalhe:x.proc?`Procurador: ${x.proc}`:"",quando:x.procVal,rota:"fin"})});
  f10List("editais").forEach(x=>{if(x.fechado||!x.prazo)return;const d=daysBetweenIso(h,x.prazo);if(d<=30)L.push({nivel:d<0?3:d<=10?2:1,tipo:"Financeiro",titulo:`Prestação de contas: ${x.nome} ${d<0?"atrasada":"em "+d+" dia(s)"}`,detalhe:x.orgao||"",quando:x.prazo,rota:"fin"})});
  const r=f10Regua().filter(x=>!x.feito).length;if(r)L.push({nivel:1,tipo:"Financeiro",titulo:`${r} aviso(s) de cobrança para fazer hoje`,detalhe:"Veja a régua de cobrança em Mais ferramentas",quando:h,rota:"fin"})}}catch(e){console.error(e)}return L};


/* >>> x_fin11.js */
