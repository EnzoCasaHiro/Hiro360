/* ===== Financeiro 7: Bloco B — controles, auditoria, lixeira, desfazer, lote, importação, regras, busca, pacote do contador ===== */
const f7cfg=()=>xcfg("fin7");
const f7save=p=>xcfgSave("fin7",p);
const F7={undo:[],emUndo:false,_rg:false};
const f7Ts=()=>new Date().toISOString().slice(0,16);
const f7Norm=s=>estNorm(String(s||""));
/* ---------- guardas extras (só para quem não é gestor) ---------- */
function f7Perfil(){try{return perfilAtual()||{}}catch(e){return{}}}
function f7Guarda(orig,dep){
  if(f4Gestor())return"";
  const c=f7cfg(),me=f4Quem(),m0=new Map(orig.map(e=>[e.id,e])),hoje=hojeIso();
  if(f7Perfil().finro===1){return"alterar o financeiro (o seu perfil é somente leitura)"}
  let novoPagoHoje=0;
  for(const e of dep){
    const o=m0.get(e.id);if(!o||o===e)continue;
    if(!o.pago&&e.pago){
      if(c.segregacao&&me&&o.criadoPor&&o.criadoPor===me&&!o.cancelada)return"dar baixa em uma conta que você mesmo lançou (separação de funções ativa)";
      novoPagoHoje+=e.tipo==="pagar"?finNum(e):0;
    }
    if(c.travaPago&&o.pago&&!e.cancelada&&["valor","venc","desc","contra","cat","area"].some(k=>JSON.stringify(o[k]??null)!==JSON.stringify(e[k]??null)))return"alterar uma conta já paga (peça ao gestor; regra ativa em Segurança)";
    if(c.segregacao&&me&&!o.aprov&&e.aprov&&o.criadoPor===me)return"aprovar um pagamento que você mesmo lançou";
  }
  if(+c.limiteDia>0&&novoPagoHoje>0){
    const ja=soma(orig.filter(e=>e.tipo==="pagar"&&e.pago===hoje&&e.baixaPor===me),e=>finNum(e));
    if(ja+novoPagoHoje>+c.limiteDia)return`pagar mais de ${fmtBRL(c.limiteDia)} em um dia (limite diário definido pelo gestor)`;
  }
  return"";
}
/* ---------- regras de categorização ---------- */
function f7AplicaRegras(e){
  const R=(f7cfg().regras||[]).filter(r=>r.ativa!==false&&r.txt);if(!R.length)return e;
  const tx=f7Norm((e.desc||"")+" "+(e.contra||""));let o=e;
  for(const r of R){if(r.tipo&&r.tipo!==e.tipo)continue;if(!tx.includes(f7Norm(r.txt)))continue;
    const p={};if(r.cat&&!o.cat)p.cat=r.cat;if(r.area&&!o.area)p.area=r.area;if(r.forma&&!o.forma)p.forma=r.forma;if(r.projeto&&!o.projeto)p.projeto=r.projeto;
    if(Object.keys(p).length)o={...o,...p}}
  return o;
}
/* ---------- finMutate: guardas, regras, auditoria, lixeira e desfazer ---------- */
const _finMutate7=finMutate;
finMutate=function(fn){
  const antes=finAll(),m0=new Map(antes.map(e=>[e.id,e]));
  const r=_finMutate7(all=>{
    const orig=all.slice(),dep=fn(all);
    if(!Array.isArray(dep))return dep;
    try{
      const g=f7Guarda(orig,dep);if(g){f4Nega(g);return orig}
      const ids0=new Set(orig.map(e=>e.id)),me=f4Quem(),hoje=hojeIso();
      return dep.map(e=>{
        if(e===m0.get(e.id))return e;
        let x=e;
        if(!ids0.has(e.id)&&!F7._rg)x=f7AplicaRegras(x);
        const o=m0.get(e.id);
        if(o&&!o.pago&&x.pago&&!x.baixaPor)x={...x,baixaPor:me||"",baixaEm:hoje};
        return x;
      });
    }catch(err){console.error(err);return dep}
  });
  try{f7Registra(m0,finAll())}catch(err){console.error(err)}
  return r;
};
function f7Registra(m0,depois){
  const m1=new Map(depois.map(e=>[e.id,e])),add=[],del=[],mud=[];
  depois.forEach(e=>{const o=m0.get(e.id);if(!o)add.push(e);else if(o!==e)mud.push([o,e])});
  m0.forEach((o,id)=>{if(!m1.has(id))del.push(o)});
  if(!add.length&&!del.length&&!mud.length)return;
  if(!F7.emUndo)F7.undo.push({add:add.map(e=>e.id),del,mud:mud.map(([o])=>o),desc:del.length?`exclusão de ${del.length} conta(s)`:mud.length?(mud.length===1?`alteração em "${mud[0][1].desc}"`:`alteração em ${mud.length} contas`):(add.length===1?`criação de "${add[0].desc}"`:`criação de ${add.length} contas`)});
  if(F7.undo.length>20)F7.undo.shift();
  const qd=(l,p)=>l.length===1?`${p} "${(l[0].desc||"").slice(0,40)}"`:`${p} ${l.length} conta(s)`;
  const partes=[];if(add.length)partes.push({ac:"criou",d:qd(add,"")});if(mud.length)partes.push({ac:"alterou",d:qd(mud.map(x=>x[1]),"")});if(del.length)partes.push({ac:"excluiu",d:qd(del,"")});
  const hist=(f7cfg().audit||[]).slice();
  partes.forEach(p=>hist.push({t:f7Ts(),u:f4Quem()||"(sistema)",ac:p.ac,d:p.d.trim()}));
  const upd={audit:hist.slice(-400)};
  if(del.length&&!F7.emUndo){upd.lixeira=[...(f7cfg().lixeira||[]),...del.map(o=>({...o,delEm:f7Ts(),delPor:f4Quem()||""}))].slice(-120)}
  f7save(upd);
}
const _f4Nega7=f4Nega;
f4Nega=function(msg){try{f7LogSimples("negado",msg)}catch(e){}return _f4Nega7.apply(this,arguments)};
function f7LogSimples(ac,d){f7save({audit:[...(f7cfg().audit||[]),{t:f7Ts(),u:f4Quem()||"(sistema)",ac,d:String(d).slice(0,160)}].slice(-400)})}
function f7Desfazer(){
  const u=F7.undo.pop();if(!u)return toast("Não há nada para desfazer nesta sessão.",true);
  F7.emUndo=true;
  try{
    const ant=new Map(u.mud.map(o=>[o.id,o])),dels=new Set(u.add);
    finMutate(all=>[...all.filter(e=>!dels.has(e.id)).map(e=>ant.get(e.id)||e),...u.del.filter(o=>!all.some(e=>e.id===o.id))]);
    f7LogSimples("desfez",u.desc);
  }finally{F7.emUndo=false}
  toast("Desfeito: "+u.desc+".");go("fin",true);
}
/* barra superior: desfazer + lançamento rápido */
const _pgFin7=pgFin;
pgFin=function(){
  const h=_pgFin7(),u=F7.undo[F7.undo.length-1];
  return h.replace('<div class="tabs">',`<div class="row" style="margin-bottom:8px;gap:8px"><button class="b sec sm" id="f7rapido" style="flex:none">⚡ Lançamento rápido</button>${u?`<button class="b sec sm" id="f7undo" style="flex:none" title="Volta ao que estava antes">↶ Desfazer: ${esc(u.desc)}</button>`:""}</div><div class="tabs">`);
};
/* ---------- fechamento assinado e reabertura com justificativa ---------- */
function f7Hash(ate){
  const l=finAll().filter(e=>e.venc<=ate).map(e=>[e.id,e.tipo,+e.valor,e.venc,e.cancelada?1:0].join("|")).sort().join("\n");
  let h=5381;for(let i=0;i<l.length;i++)h=((h<<5)+h+l.charCodeAt(i))|0;
  return {hash:(h>>>0).toString(16),n:l?l.split("\n").length:0};
}
function f7FechaMes(ate){
  const H=f7Hash(ate),fe=[...(f7cfg().fechamentos||[]),{ate,por:f4Quem()||"(gestor)",em:f7Ts(),hash:H.hash,n:H.n,ac:"fechou"}].slice(-60);
  f7save({fechamentos:fe});f4save({fechadoAte:ate});f7LogSimples("fechou o mês",`até ${brDate(ate)} (${H.n} contas, código ${H.hash})`);
  toast(`Fechado até ${brDate(ate)}. Assinatura ${H.hash} registrada.`);go("fin",true);
}
function f7ReabrirMes(novo){
  const ant=f4Fech();
  f6Form("Reabrir meses fechados",[{t:"note",l:`Hoje está fechado até ${ant?brDate(ant):"—"}. ${novo?"Vai passar a ficar fechado só até "+brDate(novo)+".":"Todos os meses ficam abertos."} Fica registrado quem reabriu e por quê.`},{k:"j",l:"Justificativa (obrigatória)",t:"textarea",ph:"ex.: corrigir lançamento duplicado de julho a pedido do contador"}],v=>{
    if(v.j.trim().length<8)return"Explique o motivo (pelo menos 8 letras).";
    f7save({fechamentos:[...(f7cfg().fechamentos||[]),{ate:novo||"",por:f4Quem()||"(gestor)",em:f7Ts(),ac:"reabriu",just:v.j.trim().slice(0,300)}].slice(-60)});
    f7LogSimples("reabriu o mês",`${ant?"de "+brDate(ant):""} para ${novo?brDate(novo):"tudo aberto"} — ${v.j.trim().slice(0,100)}`);
    f4save({fechadoAte:novo||""});toast(novo?`Fechado agora só até ${brDate(novo)}.`:"Meses reabertos.");go("fin",true)},{ok:"Reabrir"});
}
function f7Integridade(){
  const fe=(f7cfg().fechamentos||[]).filter(x=>x.ac==="fechou"&&x.hash),ult={};fe.forEach(x=>ult[x.ate]=x);
  return Object.values(ult).map(x=>{const H=f7Hash(x.ate);return{...x,ok:H.hash===x.hash,hoje:H}}).sort((a,b)=>b.ate.localeCompare(a.ate));
}
/* ---------- seções ---------- */
const f7Tx=(a,b)=>`<div class="sub">${a}</div><b>${b}</b>`;
/* Auditoria */
function f7AuditHtml(){
  const f=F6.sim.afil||"",L=(f7cfg().audit||[]).slice().reverse().filter(x=>!f||x.ac===f||x.u===f).slice(0,150),acs=[...new Set((f7cfg().audit||[]).map(x=>x.ac))];
  return f6Card("Histórico de tudo o que foi feito no financeiro",`Registra quem criou, alterou, excluiu, desfez, fechou ou reabriu e as ações negadas. Guardado dentro do sistema (últimas 400 ações). Para um registro que ninguém consiga apagar, é preciso o servidor.`,
    `<div class="row" style="margin-bottom:8px"><select id="f7afil"><option value="">Todas as ações</option>${acs.map(a=>`<option ${a===f?"selected":""}>${f6Esc(a)}</option>`).join("")}</select><button class="b sec sm" id="f7acsv">Baixar CSV</button></div>`+
    (L.length?f6Tbl(["Quando","Quem","Ação","Detalhe"],[L.map(x=>`<tr><td>${f6Esc(x.t.replace("T"," "))}</td><td>${f6Esc(x.u)}</td><td>${f6Esc(x.ac)}</td><td>${f6Esc(x.d)}</td></tr>`).join("")],"txt"):`<div class="empty">Nada registrado ainda.</div>`));
}
function f7AuditBind(){
  const s=$("f7afil");if(s)s.onchange=()=>{F6.sim.afil=s.value;f6Go()};
  const b=$("f7acsv");if(b)b.onclick=()=>{const L=f7cfg().audit||[];const csv=["quando;quem;acao;detalhe",...L.map(x=>[x.t,x.u,x.ac,x.d].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";"))].join("\r\n");saveFile("auditoria-financeiro.csv",new Blob(["﻿"+csv],{type:"text/csv"}))};
}
f6Reg("audit","Controles","Auditoria",f7AuditHtml,f7AuditBind);
/* Lixeira */
function f7LixHtml(){
  const L=(f7cfg().lixeira||[]).slice().reverse(),u=F7.undo[F7.undo.length-1];
  return f6Card("Desfazer a última ação",u?`Última ação desta sessão: ${f6Esc(u.desc)}.`:"Nada para desfazer nesta sessão.",u?`<button class="b" id="f7undo2">↶ Desfazer</button>`:"")+
   f6Card("Lixeira",`Contas excluídas ficam aqui (últimas 120) e podem ser restauradas.`,L.length?f6Tbl(["Excluída em","Por","Conta","Vencimento","Valor",""],[L.map(o=>`<tr><td>${f6Esc((o.delEm||"").replace("T"," "))}</td><td>${f6Esc(o.delPor||"")}</td><td>${f6Esc(o.desc)}<div class="sub">${f6Esc(o.contra||"")}</div></td><td class="n">${brDate(o.venc)}</td><td class="n">${fmtBRL(o.valor)}</td><td><button class="b sec sm" data-f7rest="${o.id}">Restaurar</button></td></tr>`).join("")],"txt"):`<div class="empty">A lixeira está vazia.</div>`);
}
function f7LixBind(){
  const u=$("f7undo2");if(u)u.onclick=f7Desfazer;
  document.querySelectorAll("[data-f7rest]").forEach(b=>b.onclick=()=>{
    const o=(f7cfg().lixeira||[]).find(x=>x.id===b.dataset.f7rest);if(!o)return;
    if(finAll().some(e=>e.id===o.id))return toast("Esta conta já existe.",true);
    const {delEm,delPor,...e}=o;
    finMutate(all=>[...all,e]);
    if(!finAll().some(x=>x.id===e.id))return;
    f7save({lixeira:(f7cfg().lixeira||[]).filter(x=>x.id!==o.id)});toast("Conta restaurada.");f6Go()});
}
f6Reg("lixeira","Controles","Lixeira e desfazer",f7LixHtml,f7LixBind);
/* Segurança */
function f7SegHtml(){
  const c=f7cfg(),fe=(c.fechamentos||[]).slice().reverse().slice(0,20),int=f7Integridade();
  const chk=(k,l,d)=>`<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;margin:8px 0"><input type="checkbox" data-f7seg="${k}" ${c[k]?"checked":""}><span><b>${l}</b><div class="sub">${d}</div></span></label>`;
  return f6Card("Regras de segurança do financeiro","Valem para quem não é gestor. O gestor sempre pode tudo.",
    chk("segregacao","Separação de funções","Quem lançou uma conta não pode dar baixa nem aprovar a mesma conta.")+
    chk("travaPago","Travar contas já pagas","Depois de paga, só o gestor altera valor, vencimento, descrição, fornecedor, categoria ou área.")+
    `<div class="row" style="align-items:flex-end"><div><label>Limite diário de pagamentos por pessoa (R$, 0 = sem limite)</label><input type="number" id="f7lim" value="${c.limiteDia||0}"></div><button class="b sec" id="f7limsv">Salvar limite</button></div>`+
    `<p class="sub" style="margin-top:10px">Perfil somente leitura: em Equipe e acessos → Perfis, marque “Financeiro: somente leitura”. 2º fator de autenticação e backup automático dependem do servidor.</p>`)
   +f6Card("Fechamentos assinados e conferência",`Cada fechamento guarda um código das contas até a data. Se algo for alterado depois, a conferência avisa.`,
     `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f7fecha">Fechar mês…</button><button class="b sec sm" id="f7reab">Reabrir com justificativa…</button></div>`+
     (int.length?f6Tbl(["Fechado até","Por","Contas","Conferência"],[int.map(x=>`<tr><td>${brDate(x.ate)}</td><td>${f6Esc(x.por)} · ${f6Esc(x.em.replace("T"," "))}</td><td class="n">${x.n}</td><td>${x.ok?f6Dot("#2e7d32")+"íntegro":f6Dot("#c62828")+`mudou: eram ${x.n}, hoje ${x.hoje.n}`}</td></tr>`).join("")],"txt"):`<div class="empty">Nenhum fechamento assinado ainda.</div>`)+
     (fe.length?`<h4 style="margin-top:12px">Histórico</h4>`+f6Tbl(["Quando","Quem","O quê","Motivo"],[fe.map(x=>`<tr><td>${f6Esc(x.em.replace("T"," "))}</td><td>${f6Esc(x.por)}</td><td>${x.ac==="fechou"?"fechou até "+brDate(x.ate):"reabriu"+(x.ate?" (fechado até "+brDate(x.ate)+")":"")}</td><td>${f6Esc(x.just||"")}</td></tr>`).join("")],"txt"):""));
}
function f7SegBind(){
  document.querySelectorAll("[data-f7seg]").forEach(i=>i.onchange=()=>{f7save({[i.dataset.f7seg]:i.checked});f7LogSimples("regra",`${i.dataset.f7seg} = ${i.checked?"ligada":"desligada"}`);toast("Regra salva.")});
  const l=$("f7limsv");if(l)l.onclick=()=>{f7save({limiteDia:Math.max(0,f6Num($("f7lim").value))});toast("Limite salvo.")};
  const f=$("f7fecha");if(f)f.onclick=()=>f6Form("Fechar mês",[{k:"d",l:"Fechar até (último dia do mês)",t:"date",v:addDaysIso(hojeIso().slice(0,8)+"01",-1)}],v=>{if(!v.d||!finDataOk(v.d))return"Informe uma data válida.";f7FechaMes(v.d)},{ok:"Fechar"});
  const r=$("f7reab");if(r)r.onclick=()=>{if(!f4Fech())return toast("Nenhum mês está fechado.",true);f6Form("Reabrir",[{k:"d",l:"Manter fechado até (deixe vazio para abrir tudo)",t:"date",v:""}],v=>{if(v.d&&!finDataOk(v.d))return"Data inválida.";f7ReabrirMes(v.d)},{ok:"Continuar"})};
}
f6Reg("seg","Controles","Segurança e fechamento",f7SegHtml,f7SegBind);
/* Conferências e suspeitos */
function f7Conferencias(){
  const l=finAll().filter(e=>!e.cancelada),h=hojeIso(),L=[],it=(g,e,m)=>L.push({g,e,m});
  l.filter(e=>e.tipo==="pagar"&&e.pago&&!(e.anexos&&e.anexos.length)&&!e.nfarq&&finNum(e)>=100).forEach(e=>it("Pago sem comprovante",e,"sem anexo"));
  l.filter(e=>e.tipo==="receber"&&e.pago&&!(e.conta||e.conc)&&e.pago<addDaysIso(h,-30)&&((f4cfg().contas||[]).length)).forEach(e=>it("Recebido sem conta bancária",e,"não diz em que conta entrou"));
  l.filter(e=>e.tipo==="pagar"&&e.pago&&!e.conc&&(f4cfg().contas||[]).length&&!e.conta).forEach(e=>it("Pago sem conta de saída",e,"sem conta"));
  l.filter(e=>e.pago&&e.pago<e.venc&&daysBetweenIso(e.pago,e.venc)>45).forEach(e=>it("Pago muito antes do vencimento",e,`${daysBetweenIso(e.pago,e.venc)} dias antes`));
  l.filter(e=>e.pago&&e.pago>h).forEach(e=>it("Baixa com data futura",e,brDate(e.pago)));
  l.filter(e=>e.tipo==="pagar"&&!e.pago&&e.venc<addDaysIso(h,-90)).forEach(e=>it("Conta a pagar vencida há mais de 90 dias",e,`${daysBetweenIso(e.venc,h)} dias`));
  l.filter(e=>!e.cat).forEach(e=>it("Sem categoria",e,"classifique para sair certo nos relatórios"));
  l.filter(e=>!(+e.valor>0)).forEach(e=>it("Valor zerado ou negativo",e,fmtBRL(e.valor)));
  l.filter(e=>e.tipo==="pagar"&&!e.pago&&e.aprovStatus==="pendente").forEach(e=>it("Aguardando aprovação",e,"pendente"));
  return L;
}
function f7Suspeitos(){
  const l=finAll().filter(e=>!e.cancelada&&e.tipo==="pagar"),L=[],it=(g,e,m)=>L.push({g,e,m});
  const porCat={};l.forEach(e=>{(porCat[e.cat||""]=porCat[e.cat||""]||[]).push(+e.valor)});
  const med=c=>{const v=(porCat[c]||[]).slice().sort((a,b)=>a-b);return v.length>=5?v[Math.floor(v.length/2)]:0};
  l.forEach(e=>{const m=med(e.cat||"");if(m&&+e.valor>m*4&&+e.valor>500)it("Valor muito acima do normal da categoria",e,`${fmtBRL(e.valor)} (típico: ${fmtBRL(m)})`)});
  l.filter(e=>e.pago).forEach(e=>{const d=new Date(e.pago+"T12:00:00").getDay();if((d===0||d===6)&&finNum(e)>=1000)it("Pagamento alto em fim de semana",e,`${brDate(e.pago)} · ${fmtBRL(finNum(e))}`)});
  const redondos={};l.filter(e=>+e.valor>=1000&&+e.valor%100===0).forEach(e=>{const k=estNorm(e.contra||"")+"|"+e.valor;(redondos[k]=redondos[k]||[]).push(e)});
  Object.values(redondos).filter(a=>a.length>=3&&!a.some(e=>e.recorrencia)).forEach(a=>a.forEach(e=>it("Valor redondo repetido",e,`${a.length} vezes ${fmtBRL(e.valor)} para o mesmo fornecedor`)));
  const prim={};l.forEach(e=>{const k=estNorm(e.contra||"");if(!k)return;if(!prim[k]||e.venc<prim[k].venc)prim[k]=e});
  Object.values(prim).filter(e=>+e.valor>=3000&&daysBetweenIso(e.venc,hojeIso())<60&&!e.recorrencia).forEach(e=>it("Fornecedor novo com valor alto",e,`${f6Esc(e.contra)} · ${fmtBRL(e.valor)}`));
  return L;
}
function f7ListaProb(L,vazio){
  const g={};L.forEach(x=>(g[x.g]=g[x.g]||[]).push(x));
  return Object.keys(g).length?Object.entries(g).map(([k,a])=>`<h4 style="margin:12px 0 4px">${f6Esc(k)} <span class="sub">(${a.length})</span></h4>`+f6Tbl(["Conta","Vencimento","Valor","Observação",""],[a.slice(0,15).map(x=>`<tr><td>${f6Esc(x.e.desc)}<div class="sub">${f6Esc(x.e.contra||"")}</div></td><td class="n">${brDate(x.e.venc)}</td><td class="n">${fmtBRL(x.e.valor)}</td><td class="n">${x.m}</td><td><button class="b sec sm" data-f7abre="${x.e.id}">Ver</button></td></tr>`).join("")+(a.length>15?`<tr><td colspan="5" class="sub">… e mais ${a.length-15}</td></tr>`:"")],"txt")).join(""):`<div class="empty">${vazio}</div>`;
}
function f7AbreConta(id){const e=finAll().find(x=>x.id===id);if(!e)return;FIN.tab=e.tipo==="pagar"?"pagar":"receber";FIN.ano=+e.venc.slice(0,4);FIN.mes=+e.venc.slice(5,7)-1;FIN.status="todos";FIN.cat="";FIN.q=e.desc.slice(0,30);go("fin",true)}
const f7BindAbre=()=>document.querySelectorAll("[data-f7abre]").forEach(b=>b.onclick=()=>f7AbreConta(b.dataset.f7abre));
f6Reg("conf","Controles","Conferências e suspeitas",()=>f6Card("Conferência cruzada","Contas com algo faltando ou estranho.",f7ListaProb(f7Conferencias(),"Nada de errado encontrado."))+f6Card("Lançamentos suspeitos","Sinais para olhar com atenção — não quer dizer que haja erro.",f7ListaProb(f7Suspeitos(),"Nenhum sinal de alerta.")),f7BindAbre);
/* Regras de categoria */
function f7RegrasHtml(){
  const R=f7cfg().regras||[];
  return f6Card("Regras automáticas de categorização","Quando uma conta nova tiver um texto na descrição ou no fornecedor, o sistema preenche categoria, área, forma ou projeto que estiverem vazios.",
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f7rnew">Nova regra</button><button class="b sec sm" id="f7rapl">Aplicar às contas sem categoria</button></div>`+
    (R.length?f6Tbl(["Se contém","Tipo","Categoria","Área","Forma","Ativa",""],[R.map((r,i)=>`<tr><td>${f6Esc(r.txt)}</td><td class="n">${r.tipo==="pagar"?"a pagar":r.tipo==="receber"?"a receber":"ambos"}</td><td class="n">${f6Esc(r.cat||"")}</td><td class="n">${f6Esc(r.area||"")}</td><td class="n">${f6Esc(r.forma||"")}</td><td class="n"><input type="checkbox" data-f7ra="${i}" ${r.ativa!==false?"checked":""}></td><td><button class="b sec sm" data-f7re="${i}">Editar</button> <button class="b sec sm" data-f7rd="${i}">Excluir</button></td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma regra. Ex.: “Elektro” → categoria Energia.</div>`));
}
function f7RegraEdit(i){
  const R=f7cfg().regras||[],r=R[i]||{ativa:true};
  f6Form(i==null?"Nova regra":"Editar regra",[{k:"txt",l:"Se a descrição ou o fornecedor contiver",v:r.txt||"",ph:"ex.: Sanepar"},{k:"tipo",l:"Vale para",t:"select",opts:[["","Contas a pagar e a receber"],["pagar","Só a pagar"],["receber","Só a receber"]],v:r.tipo||""},{k:"cat",l:"Categoria",v:r.cat||"",list:f6Cats()},{k:"area",l:"Área",v:r.area||"",list:f6Areas()},{k:"forma",l:"Forma de pagamento",v:r.forma||"",list:FIN_FORMAS}],v=>{
    if(!v.txt.trim())return"Informe o texto.";if(!v.cat&&!v.area&&!v.forma)return"Escolha ao menos uma coisa para preencher.";
    const n={...r,txt:v.txt.trim(),tipo:v.tipo,cat:v.cat.trim(),area:v.area.trim(),forma:v.forma.trim(),ativa:r.ativa!==false};f7save({regras:i==null?[...R,n]:R.map((x,k)=>k===i?n:x)});f6Go()});
}
function f7RegrasBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f7rnew",()=>f7RegraEdit());
  g("f7rapl",async()=>{const sem=finAll().filter(e=>!e.cancelada&&(!e.cat||!e.area)&&f7AplicaRegras(e)!==e);if(!sem.length)return toast("Nenhuma conta se encaixa nas regras.",true);
    if(!await askConfirm(`Aplicar as regras a ${sem.length} conta(s) com campos vazios?`,"Aplicar"))return;const ids=new Set(sem.map(e=>e.id));F7._rg=true;try{finMutate(all=>all.map(e=>ids.has(e.id)?f7AplicaRegras(e):e))}finally{F7._rg=false}toast(`${sem.length} conta(s) atualizada(s).`);f6Go()});
  document.querySelectorAll("[data-f7ra]").forEach(c=>c.onchange=()=>{const R=(f7cfg().regras||[]).map((r,i)=>i===+c.dataset.f7ra?{...r,ativa:c.checked}:r);f7save({regras:R})});
  document.querySelectorAll("[data-f7re]").forEach(b=>b.onclick=()=>f7RegraEdit(+b.dataset.f7re));
  document.querySelectorAll("[data-f7rd]").forEach(b=>b.onclick=()=>{f7save({regras:(f7cfg().regras||[]).filter((_,i)=>i!==+b.dataset.f7rd)});f6Go()});
}
f6Reg("regras","Controles","Regras de categoria",f7RegrasHtml,f7RegrasBind);
/* ---------- importação de planilha (CSV) ---------- */
function f7Csv(txt){
  txt=txt.replace(/^﻿/,"");const sep=((txt.split("\n")[0]||"").match(/;/g)||[]).length>=((txt.split("\n")[0]||"").match(/,/g)||[]).length?";":",";
  const rows=[];let cur=[],f="",q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===sep){cur.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&txt[i+1]==="\n")i++;cur.push(f);f="";if(cur.some(x=>x.trim()!==""))rows.push(cur);cur=[]}else f+=c}
  cur.push(f);if(cur.some(x=>x.trim()!==""))rows.push(cur);return rows;
}
function f7Data(s){s=String(s||"").trim();if(!s)return"";let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);if(!m)return null;let y=m[3].length===2?"20"+m[3]:m[3];return`${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}
function f7Valor(s){s=String(s||"").replace(/[R$\s]/g,"");if(!s)return NaN;if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(/,/g,"");return parseFloat(s)}
function f7ImportParse(rows){
  const H=rows[0].map(h=>f7Norm(h).replace(/[^a-z]/g,"")),ix=(...n)=>H.findIndex(h=>n.some(x=>h===x||h.startsWith(x)));
  const c={tipo:ix("tipo","natureza","operacao"),desc:ix("descricao","historico","descr"),contra:ix("fornecedor","cliente","favorecido","contra","pessoa"),cat:ix("categoria"),area:ix("area","centro"),valor:ix("valor","total"),venc:ix("vencimento","venc","data"),pago:ix("pagoem","datapagamento","pagamento","baixa","pago"),forma:ix("forma"),obs:ix("obs","observ")};
  if(c.valor<0||c.venc<0||c.desc<0)return{erro:"Não encontrei as colunas obrigatórias: descrição, valor e vencimento (veja o modelo)."};
  const ex=new Set(finAll().map(e=>[estNorm(e.desc),+e.valor,e.venc].join("|"))),out=[];
  rows.slice(1).forEach((r,k)=>{
    const g=i=>i>=0?String(r[i]||"").trim():"";
    const tp=f7Norm(g(c.tipo)),tipo=/rec|entr|rece/.test(tp)?"receber":/pag|sai|desp/.test(tp)?"pagar":(f7Valor(g(c.valor))<0?"pagar":"");
    const valor=Math.abs(f7Valor(g(c.valor))),venc=f7Data(g(c.venc)),pago=g(c.pago)?f7Data(g(c.pago)):"";const er=[];
    if(!tipo)er.push("tipo (pagar/receber)");if(!(valor>0))er.push("valor");if(!venc||!finDataOk(venc))er.push("vencimento");if(pago===null||(pago&&!finDataOk(pago)))er.push("data de pagamento");if(!g(c.desc))er.push("descrição");
    const e={id:uid8(),tipo,desc:g(c.desc),contra:g(c.contra),cat:g(c.cat),area:g(c.area),forma:g(c.forma),obs:g(c.obs).slice(0,300),valor:arred2(valor),venc,pago:pago||null,valorPago:pago?arred2(valor):null,importado:true};
    if(tipo==="pagar"&&e.contra)e.fornId=finFornId(e.contra,null);
    out.push({n:k+2,e,er,dup:!er.length&&ex.has([estNorm(e.desc),+e.valor,e.venc].join("|"))});
  });
  return{linhas:out};
}
function f7ImportHtml(){
  const P=F7.imp;
  let pre="";
  if(P){
    if(P.erro)pre=`<div class="callout err">${f6Esc(P.erro)}</div>`;
    else{const ok=P.linhas.filter(x=>!x.er.length&&!x.dup),er=P.linhas.filter(x=>x.er.length),dp=P.linhas.filter(x=>x.dup);
      pre=`<p><b>${ok.length}</b> conta(s) prontas · <b>${dp.length}</b> possíveis duplicadas (ignoradas) · <b style="color:#c62828">${er.length}</b> com erro (ignoradas)</p>`+
       f6Tbl(["Linha","Tipo","Descrição","Vencimento","Valor","Situação"],[P.linhas.slice(0,80).map(x=>`<tr><td>${x.n}</td><td class="n">${x.e.tipo||"?"}</td><td>${f6Esc(x.e.desc)}</td><td class="n">${x.e.venc?brDate(x.e.venc):"?"}</td><td class="n">${isFinite(x.e.valor)?fmtBRL(x.e.valor):"?"}</td><td class="n">${x.er.length?`<span style="color:#c62828">corrigir: ${x.er.join(", ")}</span>`:x.dup?"duplicada":"ok"}</td></tr>`).join("")],"txt")+
       (ok.length?`<div class="row" style="margin-top:10px"><button class="b" id="f7impok">Importar ${ok.length} conta(s)</button><button class="b sec" id="f7impcx">Cancelar</button></div>`:"")}
  }
  return f6Card("Importar contas de uma planilha (CSV)","Serve para trazer lançamentos de outro sistema ou histórico antigo. Salve a planilha do Excel como “CSV (separado por vírgulas ou ponto e vírgula)”. Colunas: tipo, descrição, fornecedor/cliente, categoria, área, valor, vencimento, pago em, forma, obs. Contas com “pago em” entram já pagas.",
    `<div class="row"><button class="b sec" id="f7impmod">Baixar modelo</button><label class="b" style="cursor:pointer">Escolher arquivo CSV<input type="file" id="f7impf" accept=".csv,.txt,text/csv" hidden></label></div>`+pre);
}
function f7ImportBind(){
  const m=$("f7impmod");if(m)m.onclick=()=>saveFile("modelo-importacao-financeiro.csv",new Blob(["﻿tipo;descricao;fornecedor ou cliente;categoria;area;valor;vencimento;pago em;forma;obs\r\npagar;Conta de luz;Elektro;Energia;Cozinha;850,40;10/10/2026;10/10/2026;Boleto;\r\nreceber;Mensalidade outubro;Paulo da Silva;Mensalidades;;3000,00;10/10/2026;;PIX;\r\n"],{type:"text/csv"}));
  const f=$("f7impf");if(f)f.onchange=async()=>{const a=f.files[0];if(!a)return;const rows=f7Csv(await a.text());F7.imp=rows.length<2?{erro:"O arquivo está vazio ou só tem o cabeçalho."}:f7ImportParse(rows);f6Go()};
  const ok=$("f7impok");if(ok)ok.onclick=()=>{const L=F7.imp.linhas.filter(x=>!x.er.length&&!x.dup).map(x=>x.e);finMutate(all=>[...all,...L]);f7LogSimples("importou",`${L.length} conta(s) de planilha`);F7.imp=null;toast(`${L.length} conta(s) importada(s).`);f6Go()};
  const cx=$("f7impcx");if(cx)cx.onclick=()=>{F7.imp=null;f6Go()};
}
f6Reg("imp","Ferramentas","Importar planilha",f7ImportHtml,f7ImportBind);
/* ---------- busca global e filtros salvos ---------- */
function f7Busca(q){
  q=String(q||"").trim();if(q.length<2)return[];
  const n=f7Norm(q),v=f7Valor(q),d=f7Data(q),dig=q.replace(/\D/g,"");
  return finAll().filter(e=>{
    if(f7Norm([e.desc,e.contra,e.cat,e.area,e.obs,e.forma,(e.cheque||{}).num].join(" ")).includes(n))return true;
    if(isFinite(v)&&v>0&&(Math.abs(+e.valor-v)<0.01||Math.abs(finNum(e)-v)<0.01))return true;
    if(d&&q.length>=8&&(e.venc===d||e.pago===d))return true;
    if(dig.length>=6&&((e.barras||"").includes(dig)||(e.nfnum||"").includes(dig)))return true;
    return false}).sort((a,b)=>b.venc.localeCompare(a.venc));
}
function f7BuscaHtml(){
  const q=F6.sim.busca||"",R=f7Busca(q),sv=f7cfg().filtros||[];
  return f6Card("Busca em todo o financeiro","Procure por nome, valor (ex.: 1500 ou 1.500,00), data (dd/mm/aaaa), categoria, número de cheque ou do boleto.",
    `<div class="row"><input id="f7q" value="${f6Esc(q)}" placeholder="Digite e aperte Buscar" style="flex:1;min-width:200px"><button class="b" id="f7qb" style="flex:none">Buscar</button></div>`+
    (q?(R.length?`<p class="sub">${R.length} resultado(s)${R.length>100?" (mostrando 100)":""}.</p>`+f6Tbl(["Conta","Tipo","Vencimento","Valor","Situação",""],[R.slice(0,100).map(e=>`<tr><td>${f6Esc(e.desc)}<div class="sub">${f6Esc(e.contra||"")} · ${f6Esc(e.cat||"")}</div></td><td class="n">${e.tipo==="pagar"?"pagar":"receber"}</td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td><td class="n">${finStatusLabel(e)}</td><td><button class="b sec sm" data-f7abre="${e.id}">Abrir</button></td></tr>`).join("")],"txt"):`<div class="empty">Nada encontrado.</div>`):""))
   +f6Card("Filtros salvos","Salve o filtro que está montado numa lista (aba Contas a pagar ou a receber) e volte a ele com um clique.",
     `<div class="row" style="margin-bottom:8px"><button class="b sec sm" id="f7fsv">Salvar o filtro atual da lista</button></div>`+(sv.length?sv.map((f,i)=>`<div class="doc"><div class="grow"><div class="nm">${f6Esc(f.nome)}</div><div class="sub">${f.tab==="pagar"?"A pagar":"A receber"} · ${f.mes<0?"ano "+f.ano:MESES_PT[f.mes]+"/"+f.ano} · situação ${f6Esc(f.status)}${f.cat?" · "+f6Esc(f.cat):""}${f.q?` · “${f6Esc(f.q)}”`:""}</div></div><button class="b sm" data-f7fa="${i}">Abrir</button><button class="b sec sm" data-f7fd="${i}">Excluir</button></div>`).join(""):`<div class="empty">Nenhum filtro salvo.</div>`));
}
function f7BuscaBind(){
  const go1=()=>{F6.sim.busca=$("f7q").value;f6Go()};
  $("f7qb").onclick=go1;$("f7q").onkeydown=e=>{if(e.key==="Enter")go1()};
  f7BindAbre();
  $("f7fsv").onclick=()=>f6Form("Salvar filtro",[{k:"n",l:"Nome do filtro",ph:"ex.: Vencidas de fornecedores"},{t:"note",l:`Vai salvar: aba ${FIN.tab==="receber"?"A receber":"A pagar"}, ${FIN.mes<0?"ano "+FIN.ano:MESES_PT[FIN.mes]+"/"+FIN.ano}, situação ${FIN.status}${FIN.cat?", categoria "+FIN.cat:""}${FIN.q?", busca “"+FIN.q+"”":""}.`}],v=>{if(!v.n.trim())return"Dê um nome.";f7save({filtros:[...(f7cfg().filtros||[]),{nome:v.n.trim(),tab:FIN.tab==="receber"?"receber":"pagar",mes:FIN.mes,ano:FIN.ano,status:FIN.status,cat:FIN.cat,q:FIN.q}]});f6Go()});
  document.querySelectorAll("[data-f7fa]").forEach(b=>b.onclick=()=>{const f=(f7cfg().filtros||[])[+b.dataset.f7fa];Object.assign(FIN,{tab:f.tab,mes:f.mes,ano:f.ano,status:f.status,cat:f.cat,q:f.q});go("fin",true)});
  document.querySelectorAll("[data-f7fd]").forEach(b=>b.onclick=()=>{f7save({filtros:(f7cfg().filtros||[]).filter((_,i)=>i!==+b.dataset.f7fd)});f6Go()});
}
f6Reg("busca","Ferramentas","Busca e filtros salvos",f7BuscaHtml,f7BuscaBind);
/* ---------- colunas das listas ---------- */
function f7ColsNomes(){try{const d=new DOMParser().parseFromString("<div>"+finListaHtml("pagar")+"</div>","text/html");return[...d.querySelectorAll("th")].map(t=>t.textContent.trim()).filter(Boolean)}catch(e){return[]}}
function f7ColsHtml(){
  const oc=f7cfg().colsOcultas||[],N=[...new Set(f7ColsNomes())];
  return f6Card("Colunas das listas","Esconda as colunas que você não usa nas abas Contas a pagar e a receber.",N.length?N.map(n=>`<label style="display:inline-flex;gap:6px;align-items:center;font-weight:400;margin:4px 14px 4px 0"><input type="checkbox" data-f7col="${f6Esc(n)}" ${oc.includes(n)?"":"checked"}> ${f6Esc(n)}</label>`).join(""):`<div class="empty">Abra a aba Contas a pagar uma vez.</div>`);
}
f6Reg("cols","Ferramentas","Colunas das listas",f7ColsHtml,()=>document.querySelectorAll("[data-f7col]").forEach(c=>c.onchange=()=>{const oc=new Set(f7cfg().colsOcultas||[]);if(c.checked)oc.delete(c.dataset.f7col);else oc.add(c.dataset.f7col);f7save({colsOcultas:[...oc]})}));
function f7AplicaColunas(){
  const oc=f7cfg().colsOcultas||[];if(!oc.length)return;
  document.querySelectorAll("#view table").forEach(t=>{const ths=[...t.querySelectorAll("thead th")];const idx=ths.map((h,i)=>oc.includes(h.textContent.trim())?i:-1).filter(i=>i>=0);
    if(!idx.length)return;t.querySelectorAll("tr").forEach(tr=>{[...tr.children].forEach((c,i)=>{if(idx.includes(i))c.style.display="none"})})});
}
/* ---------- edição em lote ---------- */
const _lista7=finListaHtml;
finListaHtml=function(t){return _lista7(t).replace('<button class="b" id="finbaixalote"',`<button class="b sec" id="f7lote" style="flex:none">Editar marcadas</button>\n   <button class="b" id="finbaixalote"`)};
function f7EditaLote(ids){
  if(!ids.length)return toast("Marque as contas na lista primeiro.",true);
  const P=f6Projetos();
  f6Form(`Editar ${ids.length} conta(s)`,[{t:"note",l:"Deixe em branco o que não quiser mudar."},{k:"cat",l:"Categoria",list:f6Cats()},{k:"area",l:"Área",list:f6Areas()},{k:"forma",l:"Forma de pagamento",list:FIN_FORMAS},{k:"conta",l:"Conta bancária (só para contas já pagas)",t:"select",opts:[["","(não mudar)"],...f4ContasPag().map(c=>[c.id,c.nome])]},...(P.length?[{k:"projeto",l:"Projeto",t:"select",opts:[["","(não mudar)"],...P.map(p=>[p.id,p.nome])]}]:[]),{k:"dias",l:"Mover vencimento (dias; negativo adia para trás)",t:"number"}],v=>{
    const S=new Set(ids),mud=e=>{if(!S.has(e.id))return e;const p={};if(v.cat.trim())p.cat=v.cat.trim();if(v.area.trim())p.area=v.area.trim();if(v.forma.trim())p.forma=v.forma.trim();if(v.conta&&e.pago)p.conta=v.conta;if(v.projeto)p.projeto=v.projeto;if(v.dias)p.venc=addDaysIso(e.venc,Math.round(v.dias));return Object.keys(p).length?{...e,...p}:e};
    if(!v.cat.trim()&&!v.area.trim()&&!v.forma.trim()&&!v.conta&&!v.projeto&&!v.dias)return"Preencha ao menos um campo.";
    const antes=finAll();finMutate(all=>all.map(mud));const dep=finAll(),m=dep.filter(e=>S.has(e.id)&&!antes.includes(e)).length;
    f7LogSimples("editou em lote",`${m} de ${ids.length} conta(s)`);toast(`${m} conta(s) alterada(s)${m<ids.length?" (as outras estão em mês fechado ou sem permissão)":""}.`);go("fin",true)},{ok:"Aplicar"});
}
/* ---------- lançamento rápido ---------- */
function f7Rapido(){
  const h=hojeIso();
  f6Form("⚡ Lançamento rápido",[{k:"tipo",l:"Tipo",t:"select",opts:[["pagar","Despesa (a pagar)"],["receber","Receita (a receber)"]]},{k:"valor",l:"Valor (R$)",t:"number"},{k:"desc",l:"Descrição",ph:"ex.: Material de limpeza"},{k:"contra",l:"Fornecedor / cliente"},{k:"cat",l:"Categoria",list:f6Cats()},{k:"venc",l:"Data",t:"date",v:h},{k:"pago",l:"Já foi pago/recebido hoje",t:"check",v:true},{k:"forma",l:"Forma",t:"select",opts:["","PIX","Dinheiro","Cartão de débito","Cartão de crédito","Boleto","Transferência"]},{k:"foto",l:"Anexar o comprovante (foto) logo depois de salvar",t:"check",v:true}],v=>{
    if(!(v.valor>0))return"Informe o valor.";if(!v.desc.trim())return"Informe a descrição.";if(!v.venc||!finDataOk(v.venc))return"Data inválida.";
    const id=uid8(),e={id,tipo:v.tipo,desc:v.desc.trim(),contra:v.contra.trim(),cat:v.cat.trim(),area:"",forma:v.forma,valor:arred2(v.valor),venc:v.venc,pago:v.pago?v.venc:null,valorPago:v.pago?arred2(v.valor):null};
    if(v.tipo==="pagar"&&e.contra)e.fornId=finFornId(e.contra,null);
    finMutate(all=>[...all,e]);if(!finAll().some(x=>x.id===id))return"Não foi possível salvar (permissão ou mês fechado).";
    toast("Lançamento salvo.");go("fin",true);if(v.foto)setTimeout(()=>openFinAnexos(id),150)},{ok:"Salvar"});
}
const _bindFin7=bindFin;
bindFin=function(){
  _bindFin7();
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f7rapido",f7Rapido);g("f7undo",f7Desfazer);
  g("f7lote",()=>f7EditaLote([...document.querySelectorAll("[data-fsel]:checked")].map(c=>c.dataset.fsel)));
  try{f7AplicaColunas()}catch(e){console.error(e)}
};
/* ---------- pacote do contador e relatórios institucionais ---------- */
function f7Linhas(ano,mes){return finAll().filter(e=>!e.cancelada&&e.venc.slice(0,4)===String(ano)&&(mes<0||+e.venc.slice(5,7)-1===mes)).sort((a,b)=>a.venc.localeCompare(b.venc))}
function f7PacoteSpecs(ano,mes){
  const L=f7Linhas(ano,mes),per=mes<0?`${ano}`:`${MESES_PT[mes]} de ${ano}`,r=f6Rel(ano,mes);
  const cols=[{h:"Vencimento",t:"date",w:13},{h:"Descrição",w:34},{h:"Fornecedor / cliente",w:26},{h:"Categoria",w:20},{h:"Área",w:16},{h:"Forma",w:14},{h:"Valor",t:"money",w:14},{h:"Pago em",t:"date",w:13},{h:"Valor pago",t:"money",w:14},{h:"Situação",w:12}];
  const row=e=>[e.venc,e.desc+(e.parcela?` (${e.parcela})`:""),e.contra||"",e.cat||"",e.area||"",e.forma||"",+e.valor,e.pago||"",e.pago?finNum(e):"",finStatusLabel(e)];
  const ret=L.filter(e=>e.ret&&Object.values(e.ret).some(v=>+v>0));
  return[{titulo:"Contas a pagar",sub:per,sensivel:false,cols,rows:L.filter(e=>e.tipo==="pagar").map(row),tot:[null,null,null,null,null,null,"sum",null,"sum",null]},
   {titulo:"Contas a receber",sub:per,sensivel:false,cols,rows:L.filter(e=>e.tipo==="receber").map(row),tot:[null,null,null,null,null,null,"sum",null,"sum",null]},
   {titulo:"Resumo por categoria",sub:per,sensivel:false,cols:[{h:"Categoria",w:34},{h:"Entradas",t:"money",w:16},{h:"Saídas",t:"money",w:16},{h:"Resultado",t:"money",w:16}],rows:Object.entries(r.porCat).sort((a,b)=>b[1].s+b[1].e-a[1].s-a[1].e).map(([c,x])=>[c,x.e,x.s,x.e-x.s]),tot:[null,"sum","sum","sum"]},
   ...(ret.length?[{titulo:"Retenções de impostos",sub:per,sensivel:false,cols:[{h:"Vencimento",t:"date",w:13},{h:"Descrição",w:34},{h:"Fornecedor",w:26},{h:"Valor bruto",t:"money",w:14},{h:"Retenções",w:40}],rows:ret.map(e=>[e.venc,e.desc,e.contra||"",+e.valor,Object.entries(e.ret).filter(([,v])=>+v>0).map(([k,v])=>`${k}: ${v}`).join("; ")])}]:[])];
}
function f7PrestacaoSpecs(ano,mes){
  const r=f6Rel(ano,mes),per=mes<0?`${ano}`:`${MESES_PT[mes]} de ${ano}`,t=f6Tot(r),emp=empresa();
  const rec=Object.entries(r.porCat).filter(([,x])=>x.e>0).sort((a,b)=>b[1].e-a[1].e),des=Object.entries(r.porCat).filter(([,x])=>x.s>0).sort((a,b)=>b[1].s-a[1].s);
  const inad=soma(finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada&&e.venc<hojeIso()&&e.venc.slice(0,4)===String(ano)&&(mes<0||+e.venc.slice(5,7)-1===mes)),e=>+e.valor);
  return[{titulo:"Prestação de contas — resumo",sub:`${emp.razao||"Casa Hiro"} · ${per}`,sensivel:false,cols:[{h:"Item",w:40},{h:"Valor",t:"money",w:18}],rows:[["Receitas do período",t.e],["Despesas do período",t.s],["Resultado",t.e-t.s],["Receitas vencidas e não recebidas",inad]]},
   {titulo:"Receitas por categoria",sub:per,sensivel:false,cols:[{h:"Categoria",w:40},{h:"Valor",t:"money",w:18},{h:"% do total",w:12}],rows:rec.map(([c,x])=>[c,x.e,t.e?Math.round(x.e/t.e*1000)/10+"%":""]),tot:[null,"sum",null]},
   {titulo:"Despesas por categoria",sub:per,sensivel:false,cols:[{h:"Categoria",w:40},{h:"Valor",t:"money",w:18},{h:"% do total",w:12}],rows:des.map(([c,x])=>[c,x.s,t.s?Math.round(x.s/t.s*1000)/10+"%":""]),tot:[null,"sum",null]}];
}
function f7ComprovacaoSpecs(ano,mes){
  const L=f7Linhas(ano,mes).filter(e=>e.tipo==="pagar"&&e.pago),per=mes<0?`${ano}`:`${MESES_PT[mes]} de ${ano}`,com=L.filter(e=>(e.anexos&&e.anexos.length)||e.nfarq).length;
  return[{titulo:"Comprovação de despesas pagas",sub:`${per} · ${com} de ${L.length} com comprovante anexado`,sensivel:false,cols:[{h:"Pago em",t:"date",w:13},{h:"Descrição",w:34},{h:"Fornecedor",w:26},{h:"Categoria",w:20},{h:"Forma",w:14},{h:"Valor pago",t:"money",w:14},{h:"Comprovante",w:13},{h:"Pago por",w:18}],
    rows:L.sort((a,b)=>a.pago.localeCompare(b.pago)).map(e=>[e.pago,e.desc,e.contra||"",e.cat||"",e.forma||"",finNum(e),(e.anexos&&e.anexos.length)||e.nfarq?"sim":"NÃO",e.baixaPor||""]),tot:[null,null,null,null,null,"sum",null,null]}];
}
function f7PacoteHtml(){
  return f6Periodo()+f6Card("Pacote do contador",`Tudo do período (${f6PerLabel()}) para entregar ao contador: contas a pagar, a receber, resumo por categoria e retenções.`,
    `<div class="row"><button class="b" id="f7pkx">Baixar Excel</button><button class="b sec" id="f7pkp">Baixar PDF</button></div>`)
   +f6Card("Relatórios para conselho, familiares e fiscalização",`Período ${f6PerLabel()}. Sem nomes de residentes.`,
    `<div class="row"><button class="b sec" id="f7prx">Prestação de contas (PDF)</button><button class="b sec" id="f7prxx">Prestação de contas (Excel)</button><button class="b sec" id="f7cmp">Comprovação de despesas (PDF)</button><button class="b sec" id="f7cmx">Comprovação de despesas (Excel)</button></div>`);
}
function f7PacoteBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn},ym=`${F6.ano}${F6.mes<0?"":"-"+f4pad(F6.mes+1)}`;
  g("f7pkx",()=>f5Xlsx(`pacote-contador-${ym}.xlsx`,f7PacoteSpecs(F6.ano,F6.mes)));g("f7pkp",()=>f5Pdf(`pacote-contador-${ym}.pdf`,f7PacoteSpecs(F6.ano,F6.mes)));
  g("f7prx",()=>f5Pdf(`prestacao-de-contas-${ym}.pdf`,f7PrestacaoSpecs(F6.ano,F6.mes)));g("f7prxx",()=>f5Xlsx(`prestacao-de-contas-${ym}.xlsx`,f7PrestacaoSpecs(F6.ano,F6.mes)));
  g("f7cmp",()=>f5Pdf(`comprovacao-despesas-${ym}.pdf`,f7ComprovacaoSpecs(F6.ano,F6.mes)));g("f7cmx",()=>f5Xlsx(`comprovacao-despesas-${ym}.xlsx`,f7ComprovacaoSpecs(F6.ano,F6.mes)));
}
f6Reg("pacote","Ferramentas","Contador e prestação de contas",f7PacoteHtml,f7PacoteBind);
/* ---------- modelos de mensagem e resumo semanal ---------- */
const F7_MSG_PADRAO={cobranca:"Olá, {nome}! Tudo bem? Aqui é da {casa}. Identificamos em aberto:\n{contas}\nTotal: {valor}.\n{pix}\nQualquer dúvida estamos à disposição. Obrigado!",aviso:"Olá, {nome}! Passando para lembrar que {contas}\nTotal: {valor}.\n{pix}\nObrigado!",agradecimento:"Olá, {nome}! Recebemos o pagamento de {valor}. Muito obrigado! — {casa}",reajuste:"Olá, {nome}! Informamos que, conforme o contrato, a mensalidade de {residente} será reajustada a partir de {data}, passando para {valor}. Estamos à disposição para esclarecer. — {casa}"};
function f7Preenche(modelo,v){return String(modelo).replace(/\{(\w+)\}/g,(_,k)=>v[k]!=null?v[k]:"")}
const _f4MsgCob7=f4MsgCobranca;
f4MsgCobranca=function(d,modo){
  const T=(f7cfg().msgs||{})[modo==="aviso"?"aviso":"cobranca"];
  const base=_f4MsgCob7(d,modo);if(!T)return base;
  const cf=f4cfg(),emp=empresa(),itens=d.itens.slice().sort((a,b)=>a.venc.localeCompare(b.venc)).map(e=>`• ${e.desc} — venc. ${brDate(e.venc)} — ${fmtBRL(e.valor)}${e.barras?`\n  Linha digitável: ${finBarrasFmt(e.barras)}`:""}`).join("\n");
  const r=f4Resp(d);
  return f7Preenche(T,{nome:(r.nome||d.nome||"").split(" ")[0],casa:emp.razao||"Casa Hiro",contas:itens,valor:fmtBRL(d.total),pix:cf.pix?`Pagamento por PIX: ${cf.pix}${cf.pixNome?" ("+cf.pixNome+")":""}`:"",residente:d.nome});
};
function f7MsgsHtml(){
  const M=f7cfg().msgs||{};
  const campo=(k,l)=>`<label style="margin-top:10px">${l}</label><textarea id="f7m_${k}" rows="5">${f6Esc(M[k]||F7_MSG_PADRAO[k])}</textarea>`;
  const res=resAtivos();
  return f6Card("Modelos de mensagem","Use {nome} {casa} {contas} {valor} {pix} {residente} {data}. A cobrança e o lembrete usam o modelo na aba Cobrança.",
    campo("cobranca","Cobrança de conta vencida")+campo("aviso","Lembrete antes do vencimento")+campo("agradecimento","Agradecimento pelo pagamento")+campo("reajuste","Aviso de reajuste")+
    `<div class="row" style="margin-top:10px"><button class="b" id="f7msv">Salvar modelos</button><button class="b sec" id="f7mrs">Voltar ao padrão</button></div>`)
   +f6Card("Gerar mensagem para um residente","Preenche o modelo e deixa pronto para copiar ou abrir no WhatsApp.",
    `<div class="row"><div><label>Residente</label><select id="f7gr">${res.map(r=>`<option value="${r.id}">${f6Esc(resNome(r))}</option>`).join("")}</select></div><div><label>Modelo</label><select id="f7gm"><option value="agradecimento">Agradecimento</option><option value="reajuste">Aviso de reajuste</option></select></div><div><label>Valor (R$)</label><input type="number" id="f7gv" step="any"></div><div><label>A partir de</label><input type="date" id="f7gd"></div><button class="b sec" id="f7gb" style="align-self:flex-end">Gerar</button></div><textarea id="f7gt" rows="5" style="margin-top:10px" readonly></textarea><div class="row"><button class="b sec sm" id="f7gc">Copiar</button><button class="b sec sm" id="f7gw">Abrir no WhatsApp</button></div>`);
}
function f7MsgsBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f7msv",()=>{const m={};Object.keys(F7_MSG_PADRAO).forEach(k=>{const v=$("f7m_"+k).value.trim();if(v&&v!==F7_MSG_PADRAO[k])m[k]=v});f7save({msgs:m});toast("Modelos salvos.")});
  g("f7mrs",()=>{f7save({msgs:{}});f6Go()});
  g("f7gb",()=>{const r=resAll().find(x=>x.id===$("f7gr").value);if(!r)return;const rp=r.resp&&typeof r.resp==="object"?r.resp:{};const T=(f7cfg().msgs||{})[$("f7gm").value]||F7_MSG_PADRAO[$("f7gm").value];
    const v=f6Num($("f7gv").value)||+r.mensalidade||0;$("f7gt").value=f7Preenche(T,{nome:(rp.nome||resNome(r)).split(" ")[0],casa:empresa().razao||"Casa Hiro",valor:fmtBRL(v),residente:resNome(r),data:$("f7gd").value?brDate($("f7gd").value):"",contas:"",pix:""});$("f7gt").dataset.tel=(rp.tel||"").replace(/\D/g,"")});
  g("f7gc",async()=>{const t=$("f7gt").value;if(!t)return;try{await navigator.clipboard.writeText(t);toast("Mensagem copiada.")}catch(e){$("f7gt").select();toast("Selecione e copie o texto.",true)}});
  g("f7gw",()=>{const t=$("f7gt").value;if(!t)return;const tel=$("f7gt").dataset.tel||"";window.open(`https://wa.me/${tel.length<=11&&tel?"55"+tel:tel}?text=${encodeURIComponent(t)}`,"_blank")});
}
f6Reg("msgs","Ferramentas","Modelos de mensagem",f7MsgsHtml,f7MsgsBind);
function f7Resumo(){
  const h=hojeIso(),h7=addDaysIso(h,7),l=finAll().filter(e=>!e.cancelada&&!e.pago),caixa=soma(f4ContasPag(),c=>f4SaldoConta(c));
  const p7=l.filter(e=>e.tipo==="pagar"&&e.venc>=h&&e.venc<=h7),r7=l.filter(e=>e.tipo==="receber"&&e.venc>=h&&e.venc<=h7),pv=l.filter(e=>e.tipo==="pagar"&&e.venc<h),rv=l.filter(e=>e.tipo==="receber"&&e.venc<h);
  return `Resumo financeiro — ${brDate(h)}\n\nCaixa hoje: ${fmtBRL(caixa)}\n\nPróximos 7 dias:\n• A pagar: ${fmtBRL(soma(p7,e=>+e.valor))} (${p7.length} conta(s))\n• A receber: ${fmtBRL(soma(r7,e=>+e.valor))} (${r7.length} conta(s))\n\nEm atraso:\n• A pagar vencido: ${fmtBRL(soma(pv,e=>+e.valor))} (${pv.length})\n• A receber vencido: ${fmtBRL(soma(rv,e=>+e.valor))} (${rv.length})`+((f6OrcAlertas().length)?`\n\nOrçamento no limite: ${f6OrcAlertas().map(x=>x.nome+" "+Math.round(x.p)+"%").join(", ")}`:"");
}
/* ---------- backup ---------- */
function f7BackupHtml(){
  return f6Card("Resumo semanal","Texto pronto para mandar ao gestor ou à diretoria (copie ou abra no WhatsApp).",`<textarea id="f7rs" rows="10" readonly>${f6Esc(f7Resumo())}</textarea><div class="row" style="margin-top:8px"><button class="b sec sm" id="f7rsc">Copiar</button><button class="b sec sm" id="f7rsw">Abrir no WhatsApp</button></div>`)
   +f6Card("Backup do financeiro","Baixe uma cópia de todos os lançamentos e configurações do financeiro e guarde em local seguro. Restaurar substitui os dados atuais do financeiro. Não é o backup automático do servidor.",
    `<div class="row"><button class="b" id="f7bk">Baixar backup</button><label class="b sec" style="cursor:pointer">Restaurar de um arquivo…<input type="file" id="f7bkr" accept=".json,application/json" hidden></label></div>`);
}
const F7_BK_RE=/^(fin_\d{4}|fin_cfg|x_fin\d?[a-z]?\d*)$/;
function f7BackupBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f7rsc",async()=>{try{await navigator.clipboard.writeText($("f7rs").value);toast("Resumo copiado.")}catch(e){$("f7rs").select()}});
  g("f7rsw",()=>window.open("https://wa.me/?text="+encodeURIComponent($("f7rs").value),"_blank"));
  g("f7bk",()=>{const docs={};Object.keys(S.config).filter(k=>F7_BK_RE.test(k)).forEach(k=>docs[k]=strip(S.config[k]));
    saveFile(`backup-financeiro-${hojeIso()}.json`,new Blob([JSON.stringify({tipo:"casa-hiro-financeiro",versao:1,em:new Date().toISOString(),docs})],{type:"application/json"}));f7LogSimples("backup","baixou backup do financeiro")});
  const f=$("f7bkr");if(f)f.onchange=async()=>{const a=f.files[0];if(!a)return;let j;try{j=JSON.parse(await a.text())}catch(e){return toast("Arquivo inválido.",true)}
    if(!j||j.tipo!=="casa-hiro-financeiro"||!j.docs)return toast("Este arquivo não é um backup do financeiro.",true);
    if(!f4Gestor())return toast("Só o gestor pode restaurar um backup.",true);
    const ks=Object.keys(j.docs).filter(k=>F7_BK_RE.test(k));
    if(!await askConfirm(`Restaurar o backup de ${j.em?new Date(j.em).toLocaleString("pt-BR"):"data desconhecida"}? Isso troca ${ks.length} documento(s) do financeiro pelos do arquivo.`,"Restaurar"))return;
    ks.forEach(k=>put("config",k,j.docs[k]));f7LogSimples("restaurou",`backup de ${j.em||"?"}`);toast("Backup restaurado.");go("fin",true)};
}
f6Reg("backup","Ferramentas","Resumo e backup",f7BackupHtml,f7BackupBind);


/* >>> x_fin8.js */
