/* ===== Financeiro 4: contas, caixinha, cheques, cartões, histórico, fechamento, aprovação ===== */
const F4={_t:0,cmp:"",ctaAno:null};
const F4_PRINC="principal";
const f4cfg=()=>xcfg("fin4");
const f4save=p=>xcfgSave("fin4",p);
const f4Gestor=()=>!RT.db||!!ACC.gestor;
const f4Quem=()=>(ACC.me&&ACC.me.name)||"";
const f4pad=n=>String(n).padStart(2,"0");
function finPode(a){if(f4Gestor())return true;const p=perfilAtual();return !!p&&p["fin"+a]!==0}
function f4Nega(msg){
  F4._neg=Date.now();
  try{audit("negado",msg)}catch(e){}
  if(Date.now()-F4._t>2500){F4._t=Date.now();toast("Não é possível "+msg+".",true)}
  return false;
}
const f4Fech=()=>f4cfg().fechadoAte||"";
const f4Trava=e=>{const F=f4Fech();return !!F&&((e.pago&&e.pago<=F)||e.venc<=F)};
const f4Limite=()=>+(f4cfg().aprovLimite)||0;
const f4PrecisaAprov=e=>e.tipo==="pagar"&&!e.pago&&!e.cancelada&&f4Limite()>0&&(+e.valor||0)>=f4Limite()&&!e.aprov;

/* ---------- histórico por lançamento, fechamento de mês, permissões e aprovação (tudo passa por aqui) ---------- */
const F4_CAMPOS={desc:"descrição",valor:"valor",venc:"vencimento",contra:"fornecedor/cliente",cat:"categoria",area:"área",forma:"forma",obs:"observação",comp:"competência",doc:"documento",residente:"residente",conta:"conta",rateio:"rateio",ret:"retenções",barras:"boleto",tipo:"tipo"};
function f4Hist(o,e){
  let a="";
  if(!o.pago&&e.pago)a=e.cancelada?"cancelou a conta":`deu baixa de ${fmtBRL(finNum(e))} em ${brDate(e.pago)}`;
  else if(o.pago&&!e.pago)a=o.cancelada?"desfez o cancelamento":"estornou a baixa";
  else{
    const d=Object.keys(F4_CAMPOS).filter(k=>JSON.stringify(o[k]??null)!==JSON.stringify(e[k]??null)).map(k=>F4_CAMPOS[k]);
    if(d.length)a="alterou "+d.join(", ");
    else if(JSON.stringify(o.anexos||[])!==JSON.stringify(e.anexos||[]))a="mudou os comprovantes";
    else if(!o.aprov&&e.aprov)a="aprovou o pagamento";
    else if((o.aprovStatus||"")!==(e.aprovStatus||""))a=e.aprovStatus==="pendente"?"pediu aprovação do pagamento":"recusou a aprovação";
    else return e;
  }
  return{...e,hist:[...(e.hist||o.hist||[]),{t:new Date().toISOString().slice(0,16),u:f4Quem(),a}].slice(-12)};
}
function f4Log(rem){
  try{f4save({log:[...(f4cfg().log||[]),...rem.map(o=>({t:new Date().toISOString().slice(0,16),u:f4Quem(),desc:o.desc,valor:o.valor,venc:o.venc,tipo:o.tipo,contra:o.contra||""}))].slice(-200)})}catch(e){console.error(e)}
}
const F4_LIVRES=["pago","valorPago","anexos","conc","hist","nfarq","conta","cheque","parcial","cancelada","aprov","aprovStatus","fornId","barras","obs","retGuias","repassado"];
function f4Filtro(orig,depois){
  const m0=new Map(orig.map(e=>[e.id,e])),gest=f4Gestor(),F=f4Fech(),bl=[],out=[],ids=new Set(),hoje=hojeIso();
  for(const e of depois){
    ids.add(e.id);const o=m0.get(e.id);
    if(!o){
      if(F&&e.venc<=F&&!gest)bl.push(`criar lançamento com vencimento em ${brDate(e.venc)} (mês fechado até ${brDate(F)})`);
      out.push(e.criadoEm?e:{...e,criadoPor:f4Quem(),criadoEm:hoje});continue;
    }
    if(o===e){out.push(e);continue}
    if(JSON.stringify(o)===JSON.stringify(e)){out.push(o);continue}
    const dif=Object.keys({...o,...e}).filter(k=>JSON.stringify(o[k]??null)!==JSON.stringify(e[k]??null));
    if(F&&!gest&&f4Trava(o)){
      if(dif.some(k=>!F4_LIVRES.includes(k))||(e.pago&&e.pago<=F&&e.pago!==o.pago)||(o.pago&&o.pago<=F&&!e.pago))bl.push(`alterar "${o.desc}" (mês fechado até ${brDate(F)})`);
    }
    if(!o.pago!==!e.pago&&!finPode("baixa"))bl.push("dar baixa ou estornar (o seu perfil não permite)");
    if(!o.pago&&e.pago&&!e.cancelada&&e.tipo==="pagar"&&!gest&&f4Limite()>0&&(+e.valor||0)>=f4Limite()&&!e.aprov)bl.push(`pagar "${e.desc}" sem a aprovação do gestor`);
    out.push(f4Hist(o,e));
  }
  const rem=orig.filter(o=>!ids.has(o.id));
  if(rem.length){
    if(!finPode("excluir"))bl.push("excluir lançamentos (o seu perfil não permite)");
    if(F&&!gest&&rem.some(f4Trava))bl.push(`excluir lançamento de mês fechado (até ${brDate(F)})`);
    if(!bl.length)f4Log(rem);
  }
  if(bl.length){f4Nega(bl[0]);return orig}
  return out;
}
const _finMutate4=finMutate;
finMutate=function(fn){
  return _finMutate4(antes=>{
    const orig=antes.slice(),depois=fn(antes);
    if(!Array.isArray(depois))return depois;
    try{return f4Filtro(orig,depois)}catch(err){console.error(err);return depois}
  });
};
function f4DataFechada(d){const F=f4Fech();return !!F&&!!d&&d<=F&&!f4Gestor()}
const _openFinDel4=openFinDel;
openFinDel=function(id){
  if(!finPode("excluir"))return f4Nega("excluir lançamentos (o seu perfil não permite)");
  const e=finAll().find(x=>x.id===id);
  if(e&&!f4Gestor()&&f4Trava(e))return f4Nega(`excluir lançamento de mês fechado (até ${brDate(f4Fech())}); peça ao gestor para reabrir o mês`);
  return _openFinDel4(id);
};
const _openFinLanc4=openFinLanc;
openFinLanc=function(id,tp,preset){
  const e=id?finAll().find(x=>x.id===id):null;
  if(e&&!f4Gestor()&&f4Trava(e))return f4Nega(`editar lançamento de mês fechado (até ${brDate(f4Fech())}); peça ao gestor para reabrir o mês — só dá para anexar comprovantes`);
  return _openFinLanc4(id,tp,preset);
};
const _openFinBaixa4=openFinBaixa;
openFinBaixa=function(id){
  const e=finAll().find(x=>x.id===id);if(!e)return;
  if(!finPode("baixa"))return f4Nega("dar baixa (o seu perfil não permite)");
  if(f4PrecisaAprov(e)&&!f4Gestor()){
    if(e.aprovStatus==="pendente")return toast("Este pagamento está aguardando a aprovação do gestor.",true);
    return askConfirm(`Pagamentos a partir de ${fmtBRL(f4Limite())} precisam da aprovação do gestor. Pedir aprovação de "${e.desc}" (${fmtBRL(e.valor)})?`,"Pedir aprovação").then(ok=>{if(ok){finMutate(all=>all.map(x=>x.id===id?{...x,aprovStatus:"pendente"}:x));toast("Pedido enviado ao gestor.");go("fin",true)}});
  }
  return _openFinBaixa4(id);
};
const _openFinBaixaLote4=openFinBaixaLote;
openFinBaixaLote=function(ids){
  if(!finPode("baixa"))return f4Nega("dar baixa (o seu perfil não permite)");
  if(!f4Gestor()){const bloq=finAll().filter(e=>ids.includes(e.id)&&f4PrecisaAprov(e));if(bloq.length)return toast(`${bloq.length} conta(s) marcada(s) precisam da aprovação do gestor antes de pagar. Desmarque-as ou peça a aprovação.`,true)}
  return _openFinBaixaLote4(ids);
};

/* ---------- contas bancárias, caixa e cartões ---------- */
const F4_TIPOS={banco:"Conta bancária",caixa:"Caixa (dinheiro)",cartao:"Cartão de crédito"};
function f4Contas(){const l=f4cfg().contas;return l&&l.length?l:[{id:F4_PRINC,nome:"Conta principal",tipo:"banco",saldo0:0,data0:""}]}
const f4Conta=id=>f4Contas().find(c=>c.id===id);
const f4ContasPag=()=>f4Contas().filter(c=>c.tipo!=="cartao");
const f4NomeConta=id=>(f4Conta(id||F4_PRINC)||{nome:"Conta principal"}).nome;
function f4SaldoConta(c,ate){
  const d0=c.data0||"",lim=ate||"9999-12-31";
  if(ate&&d0&&ate<d0)return 0;
  let s=+c.saldo0||0;
  finAll().forEach(e=>{if(!e.pago||e.cancelada||e.forma==="Compensação"||(e.conta||F4_PRINC)!==c.id||(d0&&e.pago<d0)||e.pago>lim)return;s+=(e.tipo==="receber"?1:-1)*finNum(e)});
  (f4cfg().transf||[]).forEach(t=>{if((d0&&t.data<d0)||t.data>lim)return;if(t.de===c.id)s-=+t.valor;if(t.para===c.id)s+=+t.valor});
  return arred2(s);
}
const f4ChequesAbertos=cid=>finAll().filter(e=>e.cheque&&!e.cheque.comp&&!e.cheque.st&&e.tipo==="pagar"&&e.pago&&!e.cancelada&&(e.conta||F4_PRINC)===cid);
function f4SelConta(id,sel,extra){
  return `<select id="${id}" ${extra||""}>${f4ContasPag().map(c=>`<option value="${c.id}" ${(sel||F4_PRINC)===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select>`;
}
function f4BaixaCampos(e){
  const cs=f4ContasPag(),cheque=e.forma==="Cheque";
  return `${cs.length>1?`<div class="row"><div><label>${e.tipo==="pagar"?"Pago com (conta)":"Recebido em (conta)"}</label>${f4SelConta("fbconta",e.conta)}</div>`:`<div class="row"><div style="display:none"></div>`}${cheque?`<div><label>Nº do cheque</label><input id="fbcheque" maxlength="20" value="${esc((e.cheque&&e.cheque.num)||"")}"></div>`:""}</div>`;
}
function f4BaixaExtra(ov,e){
  const c=ov.querySelector("#fbconta"),k=ov.querySelector("#fbcheque"),o={};
  o.conta=c?c.value:(e.conta||F4_PRINC);
  if(k)o.cheque={num:k.value.trim(),comp:(e.cheque&&e.cheque.comp)||null};
  return o;
}
/* campos extras do formulário de lançamento: conta, cheque, retenções e rateio */
function finLancCampos(ed,pre,tipo){
  const areas=estData().areas,rt=(ed&&ed.rateio)||[],ret=(ed&&ed.ret)||{},cs=f4ContasPag();
  const rl=(i)=>{const r=rt[i]||{};return `<div class="row" style="margin-bottom:4px"><div><select data-f4ra="${i}"><option value="">—</option>${areas.map(a=>`<option ${r.area===a?"selected":""}>${esc(a)}</option>`).join("")}</select></div><div style="max-width:110px"><input type="number" min="0" max="100" step="0.01" data-f4rp="${i}" value="${r.pct??""}" placeholder="%"></div></div>`};
  return `<div class="row">${cs.length>1?`<div><label>Conta (de onde saiu / onde entrou)</label>${f4SelConta("f4conta",ed&&ed.conta)}</div>`:""}<div><label>Nº do cheque (se a forma for Cheque)</label><input id="f4cheque" maxlength="20" value="${esc((ed&&ed.cheque&&ed.cheque.num)||"")}"></div></div>
   <details ${rt.length?"open":""} style="margin:8px 0"><summary style="cursor:pointer;font-weight:700">Ratear entre áreas${rt.length?` (${rt.length})`:""}</summary><div class="sub" style="margin:6px 0">Divida a conta entre áreas (ex.: luz 60% cozinha, 40% enfermaria). A soma precisa dar 100%. Sem rateio, vale a “Área” escolhida acima.</div>${[0,1,2,3,4].map(rl).join("")}</details>
   <details ${ret.inss||ret.iss||ret.irrf||ret.outros?"open":""} style="margin:8px 0"><summary style="cursor:pointer;font-weight:700">Retenções na fonte</summary><div class="sub" style="margin:6px 0">Se você reteve impostos deste prestador, informe aqui (o valor acima é o que será pago ao fornecedor). Depois dá para gerar as guias.</div>
    <div class="row"><div><label>INSS (R$)</label><input type="number" min="0" step="0.01" id="f4rinss" value="${ret.inss||""}"></div><div><label>ISS (R$)</label><input type="number" min="0" step="0.01" id="f4riss" value="${ret.iss||""}"></div><div><label>IRRF (R$)</label><input type="number" min="0" step="0.01" id="f4rirrf" value="${ret.irrf||""}"></div><div><label>Outras (R$)</label><input type="number" min="0" step="0.01" id="f4routros" value="${ret.outros||""}"></div></div></details>`;
}
function finLancExtra(g,t){
  const campos={},areas=[];
  const ra=[...document.querySelectorAll("[data-f4ra]")].map(s=>({area:s.value,pct:+(document.querySelector(`[data-f4rp="${s.dataset.f4ra}"]`)||{}).value||0})).filter(r=>r.area&&r.pct>0);
  if(ra.length){
    const tot=ra.reduce((s,r)=>s+r.pct,0);
    if(Math.abs(tot-100)>0.01)return{erro:`O rateio soma ${tot.toFixed(2).replace(".",",")}%: precisa dar 100%.`};
    if(new Set(ra.map(r=>r.area)).size!==ra.length)return{erro:"O rateio repete a mesma área."};
    campos.rateio=ra;
  }else campos.rateio=null;
  const v=id=>Math.max(0,+(g(id)||{}).value||0),ret={inss:v("#f4rinss"),iss:v("#f4riss"),irrf:v("#f4rirrf"),outros:v("#f4routros")};
  campos.ret=(ret.inss||ret.iss||ret.irrf||ret.outros)?ret:null;
  const c=g("#f4conta");campos.conta=c?c.value:undefined;if(campos.conta===undefined)delete campos.conta;
  const k=g("#f4cheque");if(k&&k.value.trim())campos.cheque={num:k.value.trim(),comp:null};else if(k)campos.cheque=null;
  return{campos};
}
const F4_RET_ROT={inss:"INSS",iss:"ISS",irrf:"IRRF",outros:"retenções"};
const f4RetTotal=e=>e.ret?Object.values(e.ret).reduce((s,v)=>s+(+v||0),0):0;

function f4ContaModal(id){
  const c=id?f4Conta(id):null,novo=!c;
  const ov=openModal(`<h3>${novo?"Nova conta":"Editar conta"}</h3>
   <label>Nome</label><input id="f4cn" value="${esc(c?c.nome:"")}" placeholder="Ex.: Banco do Brasil, Caixa da recepção, Cartão corporativo">
   <label>Tipo</label><select id="f4ct" ${novo?"":"disabled"}>${Object.entries(F4_TIPOS).map(([k,l])=>`<option value="${k}" ${c&&c.tipo===k?"selected":""}>${l}</option>`).join("")}</select>
   <div id="f4csal" class="row"><div><label>Saldo inicial (R$)</label><input type="number" step="0.01" id="f4cs" value="${c?c.saldo0||"":""}"></div><div><label>Saldo válido a partir de</label><input type="date" id="f4cd" value="${c&&c.data0?c.data0:""}"></div></div>
   <div class="sub" id="f4csalh">Os pagamentos e recebimentos dados antes dessa data não entram no saldo. Em branco: conta tudo.</div>
   <div id="f4ccar" style="display:none"><div class="row"><div><label>Dia do fechamento da fatura</label><input type="number" min="1" max="31" id="f4cf" value="${c?c.diaFech||"":""}"></div><div><label>Dia do vencimento</label><input type="number" min="1" max="31" id="f4cv" value="${c?c.diaVenc||"":""}"></div></div>
    <label>Fatura paga com a conta</label>${f4SelConta("f4cp",c&&c.pagaCom)}<label>Limite do cartão (R$, opcional)</label><input type="number" min="0" step="0.01" id="f4cl" value="${c&&c.limite?c.limite:""}"></div>
   <div class="err" id="f4cerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">${!novo&&c.id!==F4_PRINC?`<button class="b sec" id="f4cdel" style="margin-right:auto">Excluir</button>`:""}<button class="b sec" id="f4ccx">Cancelar</button><button class="b" id="f4cok">Salvar</button></div>`);
  const g=s=>ov.querySelector(s),ver=()=>{const car=g("#f4ct").value==="cartao";g("#f4ccar").style.display=car?"block":"none";g("#f4csal").style.display=car?"none":"flex";g("#f4csalh").style.display=car?"none":"block"};
  g("#f4ct").onchange=ver;ver();g("#f4ccx").onclick=()=>ov.remove();
  const d=g("#f4cdel");if(d)d.onclick=async()=>{
    const usado=finAll().some(e=>(e.conta||F4_PRINC)===id&&e.pago)||finAll().some(e=>e.cartao===id)||(f4cfg().transf||[]).some(t=>t.de===id||t.para===id);
    if(usado)return g("#f4cerr").textContent="Esta conta já tem movimentos. Não dá para excluir; renomeie ou deixe de usar.";
    if(!await askConfirm(`Excluir a conta "${c.nome}"?`,"Excluir"))return;
    f4save({contas:f4Contas().filter(x=>x.id!==id)});ov.remove();go("fin",true);
  };
  g("#f4cok").onclick=()=>{
    const nome=g("#f4cn").value.trim(),tipo=g("#f4ct").value,er=m=>g("#f4cerr").textContent=m;
    if(!nome)return er("Informe o nome da conta.");
    if(f4Contas().some(x=>x.id!==id&&x.nome.toLowerCase()===nome.toLowerCase()))return er("Já existe uma conta com esse nome.");
    const o=tipo==="cartao"?{id:id||uid8(),nome,tipo,diaFech:+g("#f4cf").value,diaVenc:+g("#f4cv").value,pagaCom:g("#f4cp").value,limite:Math.max(0,+g("#f4cl").value||0)}:{id:id||uid8(),nome,tipo,saldo0:+g("#f4cs").value||0,data0:g("#f4cd").value||""};
    if(tipo==="cartao"&&!(o.diaFech>=1&&o.diaFech<=31&&o.diaVenc>=1&&o.diaVenc<=31))return er("Informe os dias de fechamento e de vencimento da fatura (1 a 31).");
    if(o.data0&&!finDataOk(o.data0))return er("Confira a data: ano inválido.");
    const l=f4Contas();f4save({contas:id?l.map(x=>x.id===id?o:x):[...l,o]});ov.remove();toast("Conta salva.");go("fin",true);
  };
}
function f4TransfModal(preset){
  const cs=f4ContasPag();
  if(cs.length<2)return toast("Cadastre ao menos duas contas (ex.: banco e caixa) para fazer transferências.",true);
  const ov=openModal(`<h3>Transferência entre contas</h3><div class="sub" style="margin-bottom:8px">Move dinheiro de uma conta para outra (ex.: saque para o caixa, reposição da caixinha). Não é despesa nem receita: não aparece na DRE.</div>
   <div class="row"><div><label>Sai da conta</label>${f4SelConta("f4td",preset&&preset.de)}</div><div><label>Entra na conta</label>${f4SelConta("f4tp",preset&&preset.para)}</div></div>
   <div class="row"><div><label>Valor (R$)</label><input type="number" min="0" step="0.01" id="f4tv"></div><div><label>Data</label><input type="date" id="f4tdt" value="${hojeIso()}"></div></div>
   <label>Observação</label><input id="f4to" placeholder="Ex.: reposição da caixinha"><div class="err" id="f4terr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4tcx">Cancelar</button><button class="b" id="f4tok">Transferir</button></div>`);
  const g=s=>ov.querySelector(s),er=m=>g("#f4terr").textContent=m;
  if(!preset||!preset.para){const o=[...g("#f4tp").options].find(x=>x.value!==g("#f4td").value);if(o)g("#f4tp").value=o.value}
  g("#f4tcx").onclick=()=>ov.remove();
  g("#f4tok").onclick=()=>{
    const de=g("#f4td").value,para=g("#f4tp").value,valor=arred2(g("#f4tv").value),data=g("#f4tdt").value;
    if(de===para)return er("Escolha contas diferentes.");if(!(valor>0))return er("Informe o valor.");if(!finDataOk(data))return er("Confira a data: ano inválido.");
    if(f4DataFechada(data))return er(`O mês dessa data está fechado (até ${brDate(f4Fech())}).`);
    f4save({transf:[...(f4cfg().transf||[]),{id:uid8(),data,de,para,valor,obs:g("#f4to").value.trim(),u:f4Quem()}].slice(-600)});
    ov.remove();toast("Transferência registrada.");go("fin",true);
  };
}
function f4MovModal(cid){
  const c=f4Conta(cid);if(!c)return;
  const L=[];
  finAll().forEach(e=>{if(!e.pago||e.cancelada||(e.conta||F4_PRINC)!==cid||(c.data0&&e.pago<c.data0))return;L.push({d:e.pago,t:e.desc+(e.contra?" · "+e.contra:""),v:(e.tipo==="receber"?1:-1)*finNum(e),ch:e.cheque&&!e.cheque.comp?"cheque "+(e.cheque.num||"")+" a compensar":""})});
  (f4cfg().transf||[]).forEach(t=>{if(c.data0&&t.data<c.data0)return;if(t.de===cid)L.push({d:t.data,t:"Transferência para "+f4NomeConta(t.para)+(t.obs?" · "+t.obs:""),v:-t.valor});if(t.para===cid)L.push({d:t.data,t:"Transferência de "+f4NomeConta(t.de)+(t.obs?" · "+t.obs:""),v:+t.valor})});
  L.sort((a,b)=>b.d.localeCompare(a.d));
  const ov=openModal(`<h3>Movimentos — ${esc(c.nome)}</h3><div class="sub" style="margin-bottom:8px">Saldo inicial ${fmtBRL(c.saldo0||0)}${c.data0?" em "+brDate(c.data0):""} · saldo atual <b>${fmtBRL(f4SaldoConta(c))}</b></div>
   <div style="max-height:55vh;overflow:auto">${L.slice(0,120).map(x=>`<div class="doc"><div style="flex:0 0 78px"><b>${brDate(x.d).slice(0,5)}</b></div><div class="grow"><div class="nm">${esc(x.t)}</div>${x.ch?`<div class="sub">${esc(x.ch)}</div>`:""}</div><b style="color:${x.v<0?"var(--urgente)":"inherit"}">${x.v<0?"−":"+"} ${fmtBRL(Math.abs(x.v))}</b></div>`).join("")||`<div class="empty">Nenhum movimento.</div>`}${L.length>120?`<div class="sub">… e mais ${L.length-120} movimento(s) mais antigos.</div>`:""}</div>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b" id="f4mcx">Fechar</button></div>`);
  ov.querySelector("#f4mcx").onclick=()=>ov.remove();
}
/* cartão de crédito: a compra vence na fatura, não no dia da compra */
function f4FaturaKey(c,d){
  const F=+c.diaFech||1,y=+d.slice(0,4),m=+d.slice(5,7),dia=+d.slice(8,10),base=`${y}-${f4pad(m)}-01`;
  return (dia>F?addMesesIso(base,1):base).slice(0,7);
}
function f4FaturaVenc(c,key){
  const F=+c.diaFech||1,V=+c.diaVenc||10,b=V>F?key+"-01":addMesesIso(key+"-01",1),y=+b.slice(0,4),m=+b.slice(5,7);
  return `${b.slice(0,7)}-${f4pad(Math.min(V,new Date(y,m,0).getDate()))}`;
}
function f4Faturas(cid){
  const m={};
  finAll().filter(e=>e.cartao===cid&&!e.cancelada).forEach(e=>{const k=e.fatura||e.venc.slice(0,7),o=m[k]=m[k]||{key:k,itens:[],total:0,pagos:0};o.itens.push(e);o.total+=+e.valor||0;if(e.pago)o.pagos++});
  return Object.values(m).sort((a,b)=>b.key.localeCompare(a.key));
}
function f4CompraModal(cid){
  const cart=f4Contas().filter(c=>c.tipo==="cartao");
  if(!cart.length)return toast("Cadastre um cartão de crédito primeiro (botão Nova conta).",true);
  const cats=[...new Set(finAll().map(e=>e.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt")),areas=estData().areas;
  const ov=openModal(`<h3>Compra no cartão de crédito</h3><div class="sub" style="margin-bottom:8px">Cada parcela vira uma conta a pagar com o vencimento da fatura do cartão. Quando você pagar a fatura, todas são baixadas juntas.</div>
   <div class="row"><div><label>Cartão</label><select id="f4kc">${cart.map(c=>`<option value="${c.id}" ${c.id===cid?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div><div><label>Data da compra</label><input type="date" id="f4kd" value="${hojeIso()}"></div></div>
   <label>Descrição</label><input id="f4kdesc"><div class="row"><div><label>Estabelecimento / fornecedor</label><input id="f4kf"></div><div><label>Categoria</label><input id="f4kcat" list="f4kcats"><datalist id="f4kcats">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div></div>
   <div class="row"><div><label>Área</label><select id="f4ka"><option value="">—</option>${areas.map(a=>`<option>${esc(a)}</option>`).join("")}</select></div><div><label>Valor total (R$)</label><input type="number" min="0" step="0.01" id="f4kv"></div><div><label>Parcelas</label><input type="number" min="1" max="24" id="f4kn" value="1"></div></div>
   <div class="sub" id="f4kprev"></div><div class="err" id="f4kerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f4kcx">Cancelar</button><button class="b" id="f4kok">Lançar</button></div>`);
  const g=s=>ov.querySelector(s),er=m=>g("#f4kerr").textContent=m;
  const prev=()=>{const c=f4Conta(g("#f4kc").value),d=g("#f4kd").value,n=Math.max(1,Math.min(24,+g("#f4kn").value||1));if(!c||!finDataOk(d)){g("#f4kprev").textContent="";return}const k=f4FaturaKey(c,d);g("#f4kprev").textContent=`Primeira parcela na fatura de ${MESES_PT[+k.slice(5)-1]}/${k.slice(0,4)}, vencendo em ${brDate(f4FaturaVenc(c,k))}${n>1?` · última em ${brDate(f4FaturaVenc(c,addMesesIso(k+"-01",n-1).slice(0,7)))}`:""}.`};
  ["#f4kc","#f4kd","#f4kn"].forEach(s=>{g(s).oninput=prev;g(s).onchange=prev});prev();
  g("#f4kcx").onclick=()=>ov.remove();
  g("#f4kok").onclick=async()=>{
    const c=f4Conta(g("#f4kc").value),d=g("#f4kd").value,desc=g("#f4kdesc").value.trim(),contra=g("#f4kf").value.trim(),valor=arred2(g("#f4kv").value),n=Math.max(1,Math.min(24,Math.round(+g("#f4kn").value||1)));
    const lc=f4LimiteCartao(c);
    if(!desc)return er("Informe a descrição.");if(!contra)return er("Informe o estabelecimento ou fornecedor.");if(!(valor>0))return er("Informe o valor.");if(!finDataOk(d))return er("Confira a data: ano inválido.");
    const k0=f4FaturaKey(c,d),grupo=n>1?uid8():null,cent=Math.round(valor*100),b=Math.floor(cent/n),cat=g("#f4kcat").value.trim()||"A classificar",area=g("#f4ka").value;
    const novos=Array.from({length:n},(_,i)=>{const k=addMesesIso(k0+"-01",i).slice(0,7),v=(i===n-1?cent-b*(n-1):b)/100;
      return{id:uid8(),tipo:"pagar",desc,contra,fornId:finFornId(contra,null),cat,area,forma:"Cartão",valor:v,venc:f4FaturaVenc(c,k),pago:null,valorPago:null,comp:k,cartao:c.id,fatura:k,grupo,parcela:n>1?`${i+1}/${n}`:null,obs:`compra de ${brDate(d)} no cartão ${c.nome}`}});
    if(f4DataFechada(novos[0].venc))return er(`A fatura vence em mês fechado (até ${brDate(f4Fech())}).`);
    if(lc.limite>0&&lc.usado+valor>lc.limite&&!await askConfirm(`Esta compra passa do limite do cartão: usado ${fmtBRL(lc.usado)} + ${fmtBRL(valor)} > limite ${fmtBRL(lc.limite)}. Lançar mesmo assim?`,"Lançar"))return;
    finMutate(all=>[...all,...novos]);ov.remove();toast(`${n} parcela(s) lançada(s) na fatura.`);go("fin",true);
  };
}
function f4LimiteCartao(c){
  const usado=arred2(soma(finAll().filter(e=>e.cartao===c.id&&!e.pago&&!e.cancelada),e=>+e.valor||0));
  return{limite:+c.limite||0,usado,livre:(+c.limite||0)-usado};
}
function f4ProxFecha(c){
  const h=hojeIso(),y=+h.slice(0,4),m=+h.slice(5,7)-1,F=Math.max(1,Math.min(31,+c.diaFech||1));
  let d=isoDate(new Date(y,m,Math.min(F,new Date(y,m+1,0).getDate())));
  if(d<h)d=isoDate(new Date(y,m+1,Math.min(F,new Date(y,m+2,0).getDate())));
  return{d,dias:daysBetweenIso(h,d)};
}
function f4FaturaModal(cid,key){
  const c=f4Conta(cid),f=f4Faturas(cid).find(x=>x.key===key);if(!c||!f)return;
  const ab=f.itens.filter(e=>!e.pago),tot=arred2(soma(ab,e=>+e.valor));
  const ov=openModal(`<h3>Fatura ${MESES_PT[+key.slice(5)-1]}/${key.slice(0,4)} — ${esc(c.nome)}</h3><div class="sub" style="margin-bottom:8px">Vencimento ${brDate(f4FaturaVenc(c,key))} · total ${fmtBRL(f.total)} · ${ab.length?`em aberto ${fmtBRL(tot)}`:"<b>paga</b>"}</div>
   <div style="max-height:36vh;overflow:auto">${f.itens.sort((a,b)=>a.desc.localeCompare(b.desc)).map(e=>`<div class="doc"><div class="grow"><div class="nm">${esc(e.desc)}${e.parcela?" ("+esc(e.parcela)+")":""}</div><div class="sub">${esc(e.contra||"")}${e.pago?" · paga em "+brDate(e.pago):""}</div></div><b>${fmtBRL(e.valor)}</b></div>`).join("")}</div>
   ${ab.length?`<div class="row" style="margin-top:10px"><div><label>Pagar com a conta</label>${f4SelConta("f4fc",c.pagaCom)}</div><div><label>Data do pagamento</label><input type="date" id="f4fd" value="${hojeIso()}"></div><div><label>Valor pago (R$)</label><input type="number" min="0" step="0.01" id="f4fv" value="${tot}"></div></div><div class="sub">Se pagar valor diferente (juros, desconto), a diferença é dividida entre as compras.</div>`:""}
   <div class="err" id="f4ferr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="f4fcx">Fechar</button>${ab.length?`<button class="b" id="f4fok">Pagar fatura</button>`:""}</div>`);
  ov.querySelector("#f4fcx").onclick=()=>ov.remove();
  const ok=ov.querySelector("#f4fok");if(ok)ok.onclick=()=>{
    const d=ov.querySelector("#f4fd").value,pago=arred2(ov.querySelector("#f4fv").value),conta=ov.querySelector("#f4fc").value,er=m=>ov.querySelector("#f4ferr").textContent=m;
    if(!finPode("baixa"))return er("O seu perfil não permite dar baixa.");
    if(!finDataOk(d))return er("Confira a data: ano inválido.");if(!(pago>0))return er("Informe o valor pago.");if(f4DataFechada(d))return er(`O mês dessa data está fechado (até ${brDate(f4Fech())}).`);
    if(!f4Gestor()&&ab.some(f4PrecisaAprov))return er("Há compras que precisam da aprovação do gestor.");
    const ids=new Set(ab.map(e=>e.id));let resto=Math.round(pago*100);const q=ab.length;let i=0;
    finMutate(all=>all.map(x=>{if(!ids.has(x.id))return x;i++;const cent=i===q?resto:Math.round(pago*100*(+x.valor)/tot);resto-=cent;return{...x,pago:d,valorPago:cent/100,conta}}));
    ov.remove();toast("Fatura paga.");go("fin",true);
  };
}
function finContasHtml(){
  const cs=f4Contas(),bancos=cs.filter(c=>c.tipo!=="cartao"),cartoes=cs.filter(c=>c.tipo==="cartao"),pode=podeEd("fin");
  const sd=bancos.map(c=>({c,s:f4SaldoConta(c),ch:soma(f4ChequesAbertos(c.id),e=>finNum(e))}));
  const total=soma(sd,x=>x.s),cheques=finAll().filter(e=>e.cheque&&!e.cancelada&&(e.cheque.st||e.pago||e.tipo==="receber")).sort((a,b)=>(b.pago||b.venc).localeCompare(a.pago||a.venc)),chAb=cheques.filter(e=>e.tipo==="pagar"&&e.pago&&!e.cheque.comp&&!e.cheque.st);
  const transf=(f4cfg().transf||[]).slice().sort((a,b)=>b.data.localeCompare(a.data)).slice(0,15);
  return `<div class="stats"><div class="stat ${total<0?"bad":""}"><b>${fmtBRL(total)}</b><span>saldo em contas e caixa</span></div><div class="stat"><b>${bancos.length}</b><span>conta(s) e caixa(s)</span></div><div class="stat ${chAb.length?"warn":""}"><b>${chAb.length}</b><span>cheque(s) emitido(s) a compensar</span></div></div>
   <div class="card"><h2>Contas e caixa</h2><p class="sub" style="margin:0 0 10px">Cadastre cada conta de banco e o caixa em dinheiro. Ao dar baixa, escolha de qual conta saiu o dinheiro; o saldo de cada uma é calculado sozinho. Pagamentos antigos, sem conta escolhida, contam na “Conta principal”.</p>
    ${pode?`<div class="row" style="margin-bottom:12px"><button class="b" id="f4cnova" style="flex:none">${ic("plus")} Nova conta</button><button class="b sec" id="f4ctransf" style="flex:none">Transferir entre contas</button><button class="b sec" id="f4ccompra" style="flex:none">Compra no cartão</button></div>`:""}
    ${sd.map(({c,s,ch})=>`<div class="doc"><div class="grow"><div class="nm">${esc(c.nome)}${c.id===F4_PRINC?"":""} <span class="sub">· ${F4_TIPOS[c.tipo]}</span></div><div class="sub">${c.saldo0?`Saldo inicial ${fmtBRL(c.saldo0)}${c.data0?" em "+brDate(c.data0):""}`:"Sem saldo inicial informado"}${ch?` · cheques a compensar ${fmtBRL(ch)} (saldo no banco ${fmtBRL(s+ch)})`:""}</div></div><b style="color:${s<0?"var(--urgente)":"inherit"}">${fmtBRL(s)}</b><button class="b sec sm" data-f4mov="${c.id}">Movimentos</button>${pode?`<button class="b sec sm" data-f4cedit="${c.id}" title="Editar">${ic("edit")}</button>${c.tipo==="caixa"?`<button class="b sec sm" data-f4repor="${c.id}">Repor caixa</button>`:""}`:""}</div>`).join("")}</div>
   ${cartoes.length?`<div class="card"><h2>Cartões de crédito</h2>${cartoes.map(c=>{const fs=f4Faturas(c.id).filter(f=>f.pagos<f.itens.length||f.key>=addMesesIso(hojeIso().slice(0,7)+"-01",-2).slice(0,7)).slice(0,6);
     return `<div style="margin-bottom:12px"><div class="row" style="align-items:center"><div class="grow"><b>${esc(c.nome)}</b> <span class="sub">· fecha dia ${c.diaFech} (${f4ProxFecha(c).dias===0?"fecha hoje":"fecha em "+f4ProxFecha(c).dias+" dia(s)"}), vence dia ${c.diaVenc}, paga com ${esc(f4NomeConta(c.pagaCom))}${c.limite?` · limite ${fmtBRL(c.limite)}, usado ${fmtBRL(f4LimiteCartao(c).usado)}, <b>disponível ${fmtBRL(f4LimiteCartao(c).livre)}</b>`:""}</span></div>${pode?`<button class="b sec sm" data-f4cedit="${c.id}">${ic("edit")}</button><button class="b sm" data-f4compra="${c.id}">Nova compra</button>`:""}</div>
      ${fs.length?fs.map(f=>{const ab=f.itens.filter(e=>!e.pago);return `<div class="doc"><div class="grow"><div class="nm">Fatura ${MESES_PT[+f.key.slice(5)-1]}/${f.key.slice(0,4)}</div><div class="sub">vence ${brDate(f4FaturaVenc(c,f.key))} · ${f.itens.length} compra(s)</div></div><b>${fmtBRL(f.total)}</b><span class="pill ${ab.length?(f4FaturaVenc(c,f.key)<hojeIso()?"s-falta":"s-pendencia"):"s-ok"}">${ab.length?"em aberto":"paga"}</span><button class="b sec sm" data-f4fat="${c.id}|${f.key}">${ab.length&&pode?"Ver / pagar":"Ver"}</button></div>`}).join(""):`<div class="empty">Nenhuma compra neste cartão ainda.</div>`}</div>`}).join("")}</div>`:""}
   <div class="card"><h2>Cheques</h2><p class="sub" style="margin:0 0 10px">Para registrar um cheque, escolha a forma “Cheque” e informe o número ao lançar ou dar baixa. Aqui você marca quando ele for compensado pelo banco.</p>
    ${cheques.length?`<div class="wrap"><table><thead><tr><th>Data</th><th>Nº</th><th>Descrição</th><th>Conta</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${cheques.slice(0,60).map(e=>{const k=e.cheque,rec=e.tipo==="receber",st=k.st?`<span class="pill s-falta">${k.st==="sustado"?"sustado":"devolvido"}</span>`:k.comp?`<span class="pill s-ok">compensado ${brDate(k.comp)}</span>`:rec&&!e.pago?`<span class="pill s-pendencia">a depositar</span>`:`<span class="pill s-pendencia">a compensar</span>`;
     const bt=!pode?"":k.st?`<button class="b sec sm" data-f4chq="${e.id}|limpa">Limpar</button>`:k.comp?`<button class="b sec sm" data-f4chq="${e.id}|desf">Desfazer</button>`:rec&&!e.pago?`<button class="b sm" data-f4chq="${e.id}|rec">Receber</button> <button class="b sec sm" data-f4chq="${e.id}|dev">Devolvido</button>`:`<button class="b sm" data-f4chq="${e.id}|comp">Compensar</button> <button class="b sec sm" data-f4chq="${e.id}|dev">Devolvido</button> <button class="b sec sm" data-f4chq="${e.id}|sus">Sustado</button>`;
     return `<tr><td>${brDate(e.pago||e.venc)}</td><td>${esc(k.num||"—")}</td><td>${rec?"↑ ":"↓ "}${esc(e.desc)}<div class="sub">${esc(e.contra||"")}</div></td><td>${esc(f4NomeConta(e.conta))}</td><td class="n">${fmtBRL(e.pago?finNum(e):e.valor)}</td><td>${st}</td><td style="white-space:nowrap">${bt}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty">Nenhum cheque registrado.</div>`}</div>
   ${transf.length?`<div class="card"><h2>Últimas transferências</h2>${transf.map(t=>`<div class="doc"><div style="flex:0 0 78px"><b>${brDate(t.data).slice(0,5)}</b></div><div class="grow"><div class="nm">${esc(f4NomeConta(t.de))} → ${esc(f4NomeConta(t.para))}</div><div class="sub">${esc(t.obs||"")}</div></div><b>${fmtBRL(t.valor)}</b>${pode?`<button class="b sec sm" data-f4tdel="${t.id}" title="Excluir">${ic("trash")}</button>`:""}</div>`).join("")}</div>`:""}`;
}
function bindContas(){
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  on("f4cnova",()=>f4ContaModal());on("f4ctransf",()=>f4TransfModal());on("f4ccompra",()=>f4CompraModal());
  document.querySelectorAll("[data-f4cedit]").forEach(b=>b.onclick=()=>f4ContaModal(b.dataset.f4cedit));
  document.querySelectorAll("[data-f4mov]").forEach(b=>b.onclick=()=>f4MovModal(b.dataset.f4mov));
  document.querySelectorAll("[data-f4repor]").forEach(b=>b.onclick=()=>{const o=f4ContasPag().find(c=>c.tipo==="banco");f4TransfModal({de:o?o.id:undefined,para:b.dataset.f4repor})});
  document.querySelectorAll("[data-f4compra]").forEach(b=>b.onclick=()=>f4CompraModal(b.dataset.f4compra));
  document.querySelectorAll("[data-f4fat]").forEach(b=>b.onclick=()=>{const[c,k]=b.dataset.f4fat.split("|");f4FaturaModal(c,k)});
  document.querySelectorAll("[data-f4chq]").forEach(b=>b.onclick=async()=>{
    const[id,ac]=b.dataset.f4chq.split("|"),e=finAll().find(x=>x.id===id);if(!e)return;
    if(ac==="rec")return openFinBaixa(id);
    if(ac==="dev"||ac==="sus"){
      const rec=e.tipo==="receber";
      if(!await askConfirm(`${ac==="dev"?"Cheque devolvido":"Cheque sustado"}: ${e.pago?`a conta “${e.desc}” volta para em aberto (${rec?"cobrar de novo":"refazer o pagamento"}) e o saldo da conta é corrigido`:`“${e.desc}” fica marcado e continua em aberto`}. Continuar?`,"Continuar"))return;
      finMutate(all=>all.map(x=>x.id===id?{...x,pago:null,valorPago:null,cheque:{...x.cheque,st:ac==="dev"?"devolvido":"sustado",comp:null}}:x));
    }else finMutate(all=>all.map(x=>{if(x.id!==id)return x;const k={...x.cheque};if(ac==="comp")k.comp=hojeIso();else{k.comp=null;delete k.st}return{...x,cheque:k}}));
    go("fin",true);
  });
  document.querySelectorAll("[data-f4tdel]").forEach(b=>b.onclick=async()=>{
    const t=(f4cfg().transf||[]).find(x=>x.id===b.dataset.f4tdel);if(!t)return;
    if(f4DataFechada(t.data))return f4Nega(`excluir transferência de mês fechado (até ${brDate(f4Fech())})`);
    if(!await askConfirm(`Excluir a transferência de ${fmtBRL(t.valor)} de ${f4NomeConta(t.de)} para ${f4NomeConta(t.para)}?`,"Excluir"))return;
    f4save({transf:(f4cfg().transf||[]).filter(x=>x.id!==t.id)});go("fin",true);
  });
}


/* >>> x_fin4b.js */
