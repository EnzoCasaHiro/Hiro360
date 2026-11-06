/* ===== Financeiro 9: Bloco D — contas a pagar (fornecedores, prioridade, duplicados, NF-e XML, contratos, acordos, créditos, pedidos, reembolsos) ===== */
const f9cfg=()=>xcfg("fin9");
const f9save=p=>xcfgSave("fin9",p);
const F9={sim:{}};
const f9Key=e=>e.fornId||(e.contra?"n:"+estNorm(e.contra):"");
const f9Abertos=()=>finAll().filter(e=>e.tipo==="pagar"&&!e.pago&&!e.cancelada);
function f9CnpjOk(s){
  const d=String(s||"").replace(/\D/g,"");if(d.length!==14||/^(\d)\1+$/.test(d))return false;
  const dv=n=>{let p=n-7,s=0;for(let i=0;i<n;i++){s+=+d[i]*p--;if(p<2)p=9}const r=s%11;return r<2?0:11-r};
  return dv(12)===+d[12]&&dv(13)===+d[13];
}
const f9CnpjFmt=s=>{const d=String(s||"").replace(/\D/g,"");return d.length===14?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`:s||""};
/* ---------- 1. cadastro de fornecedores ---------- */
function f9Fornecedores(){
  const m={};
  finAll().filter(e=>e.tipo==="pagar"&&!e.cancelada&&f9Key(e)).forEach(e=>{const k=f9Key(e),o=m[k]=m[k]||{k,nome:e.contra||"",pago:0,aberto:0,n:0,ult:""};o.n++;if(e.pago)o.pago+=finNum(e);else o.aberto+=+e.valor;if(e.venc>o.ult)o.ult=e.venc;if(!o.nome)o.nome=e.contra});
  const C=f9cfg().forn||{};Object.keys(C).forEach(k=>{if(!m[k])m[k]={k,nome:C[k].nome||"",pago:0,aberto:0,n:0,ult:""}});
  return Object.values(m).map(o=>({...o,c:C[o.k]||{}})).sort((a,b)=>b.pago+b.aberto-a.pago-a.aberto);
}
function f9FornHtml(){
  const q=f7Norm(F9.sim.fq||""),L=f9Fornecedores().filter(o=>!q||f7Norm(o.nome+" "+(o.c.cnpj||"")).includes(q));
  const sem=L.filter(o=>!o.c.cnpj).length,inv=L.filter(o=>o.c.cnpj&&!f9CnpjOk(o.c.cnpj)).length;
  return f6Card("Fornecedores",`${L.length} fornecedor(es)${sem?` · ${sem} sem CNPJ`:""}${inv?` · <b style="color:#c62828">${inv} com CNPJ inválido</b>`:""}. Guarde os dados de pagamento para usar no borderô e nos acordos.`,
   `<div class="row" style="margin-bottom:8px"><input id="f9fq" placeholder="Buscar por nome ou CNPJ" value="${f6Esc(F9.sim.fq||"")}" style="flex:1;min-width:200px"><button class="b sec sm" id="f9fqb">Buscar</button><button class="b sm" id="f9fnew">Novo fornecedor</button></div>`+
   (L.length?f6Tbl(["Fornecedor","CNPJ","Pagamento","Contas","Pago","Em aberto",""],[L.slice(0,80).map(o=>`<tr><td><b>${f6Esc(o.nome)}</b><div class="sub">${f6Esc(o.c.contato||"")} ${f6Esc(o.c.tel||"")}</div></td><td class="n">${o.c.cnpj?(f9CnpjOk(o.c.cnpj)?f9CnpjFmt(o.c.cnpj):`<span style="color:#c62828">${f6Esc(o.c.cnpj)} (inválido)</span>`):'<span class="sub">—</span>'}</td><td class="n">${f6Esc(o.c.pix?"PIX "+o.c.pix:o.c.banco?o.c.banco+" "+(o.c.ag||"")+"/"+(o.c.conta||""):"—")}</td><td class="n">${o.n}</td><td class="n">${f6Money(o.pago)}</td><td class="n">${f6Money(o.aberto)}</td><td><button class="b sec sm" data-f9fe="${f6Esc(o.k)}">Editar</button></td></tr>`).join("")]):`<div class="empty">Nenhum fornecedor.</div>`));
}
function f9FornEdit(k,nomeNovo){
  const c=(f9cfg().forn||{})[k]||{},nome=c.nome||nomeNovo||(f9Fornecedores().find(o=>o.k===k)||{}).nome||"";
  const campos=[{k:"nome",l:"Nome",v:nome},{k:"cnpj",l:"CNPJ ou CPF",v:c.cnpj||""},{k:"contato",l:"Contato",v:c.contato||""},{k:"tel",l:"Telefone",v:c.tel||""},{k:"email",l:"E-mail",v:c.email||""},{k:"pix",l:"Chave PIX",v:c.pix||""},{k:"banco",l:"Banco",v:c.banco||""},{k:"ag",l:"Agência",v:c.ag||""},{k:"conta",l:"Conta",v:c.conta||""},{k:"prazo",l:"Prazo habitual de pagamento (dias)",t:"number",v:c.prazo||""},{k:"cat",l:"Categoria habitual",v:c.cat||"",list:f6Cats()},{k:"obs",l:"Observações",t:"textarea",v:c.obs||""}];
  const ov=f6Form(k?"Editar fornecedor":"Novo fornecedor",campos,v=>{
    if(!v.nome.trim())return"Informe o nome.";const dig=v.cnpj.replace(/\D/g,"");if(dig.length===14&&!f9CnpjOk(v.cnpj))return"CNPJ inválido (confira os dígitos).";
    const key=k||finFornId(v.nome.trim(),null);f9save({forn:{...(f9cfg().forn||{}),[key]:{...v,nome:v.nome.trim(),cnpj:v.cnpj.trim()}}});f6Go()});
  const btn=document.createElement("button");btn.className="b sec sm";btn.textContent="Buscar CNPJ na Receita";btn.type="button";btn.style.marginTop="6px";
  btn.onclick=async()=>{const d=ov.querySelector("#f6f_cnpj").value.replace(/\D/g,"");if(d.length!==14)return ov.querySelector("#f6err").textContent="Digite os 14 números do CNPJ.";
    ov.querySelector("#f6err").textContent="Consultando…";
    try{const r=await fetch("https://brasilapi.com.br/api/cnpj/v1/"+d);if(!r.ok)throw new Error("não encontrado");const j=await r.json();
      if(!ov.querySelector("#f6f_nome").value.trim())ov.querySelector("#f6f_nome").value=j.nome_fantasia||j.razao_social||"";
      if(!ov.querySelector("#f6f_tel").value&&j.ddd_telefone_1)ov.querySelector("#f6f_tel").value=j.ddd_telefone_1;if(!ov.querySelector("#f6f_email").value&&j.email)ov.querySelector("#f6f_email").value=String(j.email).toLowerCase();
      ov.querySelector("#f6err").textContent=`Situação na Receita: ${j.descricao_situacao_cadastral||"?"} — ${j.razao_social||""}`}
    catch(e){ov.querySelector("#f6err").textContent="Não foi possível consultar agora ("+e.message+"). Preencha à mão."}};
  ov.querySelector("#f6f_cnpj").after(btn);
}
function f9FornBind(){
  const go1=()=>{F9.sim.fq=$("f9fq").value;f6Go()};const b=$("f9fqb");if(b)b.onclick=go1;const q=$("f9fq");if(q)q.onkeydown=e=>{if(e.key==="Enter")go1()};
  const n=$("f9fnew");if(n)n.onclick=()=>f9FornEdit();
  document.querySelectorAll("[data-f9fe]").forEach(x=>x.onclick=()=>f9FornEdit(x.dataset.f9fe));
}
f6Reg("forn","Contas a pagar","Fornecedores",f9FornHtml,f9FornBind);
/* ---------- 2. preços por item (notas fiscais) ---------- */
function f9PrecoHtml(){
  const q=F9.sim.pq||"",rows=((S.config.nf&&S.config.nf.rows)||[]).filter(r=>q.length>=2&&f7Norm(r.item).includes(f7Norm(q))&&+r.valor>0);
  const g={};rows.forEach(r=>{const k=f7Norm(r.local||"?");const o=g[k]=g[k]||{nome:r.local||"?",v:[],ult:null};o.v.push({d:r.date,v:+r.valor});if(!o.ult||r.date>o.ult.d)o.ult={d:r.date,v:+r.valor}});
  const L=Object.values(g).map(o=>({nome:o.nome,n:o.v.length,ult:o.ult,med:soma(o.v,x=>x.v)/o.v.length,min:Math.min(...o.v.map(x=>x.v)),max:Math.max(...o.v.map(x=>x.v))})).sort((a,b)=>a.ult.v-b.ult.v);
  return f6Card("Histórico de preço por item e fornecedor","Vem das notas fiscais importadas. Digite o nome do produto (ex.: arroz, fralda, detergente).",
   `<div class="row"><input id="f9pq" value="${f6Esc(q)}" placeholder="Produto" style="flex:1;min-width:200px"><button class="b" id="f9pb">Buscar</button></div>`+
   (q.length>=2?(L.length?`<p class="sub">${rows.length} compra(s) em ${L.length} fornecedor(es). O mais barato na última compra está no topo.</p>`+f6Tbl(["Fornecedor","Compras","Último preço","Em","Média","Menor","Maior"],[L.map((o,i)=>`<tr${i===0?' style="font-weight:700"':""}><td>${f6Esc(o.nome)}</td><td class="n">${o.n}</td><td class="n">${f6Money(o.ult.v)}</td><td class="n">${brDate(o.ult.d)}</td><td class="n">${f6Money(o.med)}</td><td class="n">${f6Money(o.min)}</td><td class="n">${f6Money(o.max)}</td></tr>`).join("")]):`<div class="empty">Nada encontrado nas notas fiscais.</div>`):""));
}
f6Reg("preco","Contas a pagar","Preços por item",f9PrecoHtml,()=>{const g=()=>{F9.sim.pq=$("f9pq").value;f6Go()};$("f9pb").onclick=g;$("f9pq").onkeydown=e=>{if(e.key==="Enter")g()}});
/* ---------- 3. duplicados e anomalias ---------- */
function f9Dups(){
  const l=finAll().filter(e=>e.tipo==="pagar"&&!e.cancelada),out=[],vis=new Set();
  for(let i=0;i<l.length;i++)for(let j=i+1;j<l.length;j++){
    const a=l[i],b=l[j];if(a.grupo&&a.grupo===b.grupo)continue;if(a.recorrencia&&a.recorrencia===b.recorrencia)continue;if(a.emprestimo&&a.emprestimo===b.emprestimo)continue;
    const mesmaBarra=a.barras&&a.barras===b.barras;
    const mesmo=f9Key(a)&&f9Key(a)===f9Key(b)&&Math.abs(+a.valor-+b.valor)<0.01&&Math.abs(daysBetweenIso(a.venc,b.venc))<=3&&estNorm(a.desc).slice(0,12)===estNorm(b.desc).slice(0,12);
    if((mesmaBarra||mesmo)&&!vis.has(a.id+b.id)){vis.add(a.id+b.id);out.push([a,b,mesmaBarra?"mesmo código de barras":"mesmo fornecedor, valor e datas próximas"])}
  }
  return out;
}
function f9Consumo(){
  const pct=+(f9cfg().consumoPct||20),re=/energia|luz|[aá]gua|g[aá]s|internet|telefone/i,por={};
  finAll().filter(e=>e.tipo==="pagar"&&!e.cancelada&&re.test(e.cat||"")&&f9Key(e)&&!e.estimado).forEach(e=>(por[f9Key(e)]=por[f9Key(e)]||[]).push(e));
  const out=[];Object.values(por).forEach(l=>{l.sort((a,b)=>a.venc.localeCompare(b.venc));if(l.length<4)return;const u=l[l.length-1],ant=l.slice(-7,-1),m=soma(ant,e=>+e.valor)/ant.length,p=(+u.valor/m-1)*100;if(p>=pct)out.push({e:u,m,p})});
  return out.sort((a,b)=>b.p-a.p);
}
function f9DupHtml(){
  const D=f9Dups(),C=f9Consumo(),pct=+(f9cfg().consumoPct||20);
  return f6Card("Possíveis contas em duplicidade","Mesma conta lançada duas vezes (mesmo código de barras, ou mesmo fornecedor, valor e vencimento próximo).",
    D.length?f6Tbl(["Conta","Outra conta","Motivo",""],[D.slice(0,30).map(([a,b,m])=>`<tr><td>${f6Esc(a.desc)}<div class="sub">${brDate(a.venc)} · ${fmtBRL(a.valor)} · ${finStatusLabel(a)}</div></td><td>${f6Esc(b.desc)}<div class="sub">${brDate(b.venc)} · ${fmtBRL(b.valor)} · ${finStatusLabel(b)}</div></td><td>${m}</td><td><button class="b sec sm" data-f7abre="${a.id}">Ver 1ª</button> <button class="b sec sm" data-f7abre="${b.id}">Ver 2ª</button></td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma duplicidade encontrada.</div>`)
   +f6Card("Contas de consumo acima do normal",`Última conta de energia, água, gás, internet ou telefone que passou ${pct}% da média das seis anteriores. <button class="b sec sm" id="f9cpct" style="margin-left:6px">Mudar o percentual</button>`,
    C.length?f6Tbl(["Conta","Vencimento","Valor","Média","Acima"],[C.map(x=>`<tr><td>${f6Esc(x.e.desc)}<div class="sub">${f6Esc(x.e.contra||"")}</div></td><td class="n">${brDate(x.e.venc)}</td><td class="n">${fmtBRL(x.e.valor)}</td><td class="n">${f6Money(x.m)}</td><td class="n" style="color:#c62828">+${Math.round(x.p)}%</td></tr>`).join("")],"txt"):`<div class="empty">Nenhuma conta de consumo fora do padrão.</div>`);
}
f6Reg("dup","Contas a pagar","Duplicados e consumo",f9DupHtml,()=>{f7BindAbre();const b=$("f9cpct");if(b)b.onclick=()=>f6Form("Alerta de consumo",[{k:"p",l:"Avisar quando passar da média em (%)",t:"number",v:f9cfg().consumoPct||20}],v=>{if(!(v.p>0))return"Informe um valor.";f9save({consumoPct:v.p});f6Go()})});
/* avisos ao lançar: duplicidade e preço fora do padrão */
const _finMutate9=finMutate;
finMutate=function(fn){
  const antes=new Set(finAll().map(e=>e.id));
  const r=_finMutate9.apply(this,arguments);
  try{
    const novos=finAll().filter(e=>!antes.has(e.id)&&e.tipo==="pagar"&&!e.importado&&!e.recorrencia&&!e.emprestimo&&!e.estimado&&!e.grupo&&!e.cancelada);
    if(novos.length&&novos.length<=3){
      const todos=finAll().filter(e=>e.tipo==="pagar"&&!e.cancelada);
      novos.forEach(n=>{
        const d=todos.find(e=>e.id!==n.id&&((n.barras&&e.barras===n.barras)||(f9Key(n)&&f9Key(e)===f9Key(n)&&Math.abs(+e.valor-+n.valor)<0.01&&Math.abs(daysBetweenIso(e.venc,n.venc))<=3)));
        if(d){toast(`Atenção: já existe uma conta parecida (“${d.desc}”, ${brDate(d.venc)}, ${fmtBRL(d.valor)}). Confira se não é duplicada.`,true);return}
        const hist=todos.filter(e=>e.id!==n.id&&f9Key(e)&&f9Key(e)===f9Key(n)).map(e=>+e.valor).sort((a,b)=>a-b);
        if(hist.length>=3){const med=hist[Math.floor(hist.length/2)];if(+n.valor>med*1.5||+n.valor<med*0.5)toast(`Atenção: ${fmtBRL(n.valor)} está bem diferente do habitual para ${n.contra} (costuma ser ${fmtBRL(med)}).`,true)}
      });
    }
  }catch(e){console.error(e)}
  return r;
};
/* ---------- 4. NF-e em XML ---------- */
function f9LerXml(txt){
  const d=new DOMParser().parseFromString(txt,"text/xml");if(d.querySelector("parsererror"))return null;
  const t=(el,n)=>{const x=el&&el.getElementsByTagName(n)[0];return x?x.textContent.trim():""};
  const inf=d.getElementsByTagName("infNFe")[0];if(!inf)return null;
  const em=inf.getElementsByTagName("emit")[0],ide=inf.getElementsByTagName("ide")[0],tot=inf.getElementsByTagName("ICMSTot")[0];
  const dup=[...inf.getElementsByTagName("dup")].map(x=>({n:t(x,"nDup"),venc:t(x,"dVenc"),v:parseFloat(t(x,"vDup"))}));
  const emi=(t(ide,"dhEmi")||t(ide,"dEmi")).slice(0,10);
  return{nome:t(em,"xFant")||t(em,"xNome"),razao:t(em,"xNome"),cnpj:t(em,"CNPJ")||t(em,"CPF"),nf:t(ide,"nNF"),serie:t(ide,"serie"),emissao:emi,valor:parseFloat(t(tot,"vNF")),chave:(inf.getAttribute("Id")||"").replace(/^NFe/,""),dup};
}
function f9XmlHtml(){
  const P=F9.xml||[];
  return f6Card("Importar NF-e (arquivo XML)","Escolha um ou vários XML de notas de compra: o sistema cria a conta a pagar (uma por duplicata/parcela, ou uma só) e guarda o CNPJ do fornecedor.",
   `<label class="b" style="cursor:pointer">Escolher XML<input type="file" id="f9xf" accept=".xml,text/xml" multiple hidden></label>`+
   (P.length?f6Tbl(["Arquivo","Fornecedor","NF","Emissão","Valor","Contas a gerar","Situação"],[P.map(x=>`<tr><td>${f6Esc(x.arq)}</td><td>${f6Esc(x.n?x.n.nome:"")}</td><td class="n">${f6Esc(x.n?x.n.nf:"")}</td><td class="n">${x.n&&x.n.emissao?brDate(x.n.emissao):""}</td><td class="n">${x.n?fmtBRL(x.n.valor):""}</td><td class="n">${x.ents.length}</td><td class="n">${x.erro?`<span style="color:#c62828">${f6Esc(x.erro)}</span>`:x.dup?"já importada":"ok"}</td></tr>`).join("")])+`<div class="row" style="margin-top:8px"><button class="b" id="f9xok">Importar ${P.filter(x=>!x.erro&&!x.dup).length} nota(s)</button><button class="b sec" id="f9xcx">Cancelar</button></div>`:""));
}
function f9XmlEnts(n){
  const forn=(f9cfg().forn||{})[finFornId(n.nome,null)]||{},prazo=+forn.prazo||30,base={tipo:"pagar",contra:n.nome,fornId:finFornId(n.nome,null),cat:forn.cat||"A classificar",area:"",forma:"Boleto",nfnum:n.nf,importado:true,obs:`NF-e ${n.nf}${n.serie?"/"+n.serie:""} de ${n.razao}${n.chave?" · chave "+n.chave:""}`.slice(0,300)};
  if(n.dup.length)return n.dup.map((d,i)=>({...base,id:uid8(),desc:`NF ${n.nf} — ${n.nome}${n.dup.length>1?` (parc. ${i+1}/${n.dup.length})`:""}`,valor:arred2(d.v),venc:d.venc||addDaysIso(n.emissao,prazo*(i+1)),pago:null,valorPago:null,parcela:n.dup.length>1?`${i+1}/${n.dup.length}`:null,grupo:n.dup.length>1?"nf"+n.nf+n.chave.slice(-6):undefined}));
  return[{...base,id:uid8(),desc:`NF ${n.nf} — ${n.nome}`,valor:arred2(n.valor),venc:addDaysIso(n.emissao,prazo),pago:null,valorPago:null}];
}
function f9XmlBind(){
  const f=$("f9xf");if(f)f.onchange=async()=>{const out=[];
    for(const a of f.files){const n=f9LerXml(await a.text());if(!n){out.push({arq:a.name,erro:"não é uma NF-e válida",ents:[]});continue}
      if(!(n.valor>0)||!n.emissao||!finDataOk(n.emissao)){out.push({arq:a.name,n,erro:"valor ou data de emissão ausente",ents:[]});continue}
      const dup=finAll().some(e=>e.nfnum===n.nf&&f9Key(e)===finFornId(n.nome,null)&&Math.abs(finAll().filter(x=>x.nfnum===n.nf&&f9Key(x)===f9Key(e)).reduce((s,x)=>s+(+x.valor),0)-n.valor)<0.05);
      out.push({arq:a.name,n,dup,ents:f9XmlEnts(n)})}
    F9.xml=out;f6Go()};
  const ok=$("f9xok");if(ok)ok.onclick=()=>{const L=F9.xml.filter(x=>!x.erro&&!x.dup),ents=L.flatMap(x=>x.ents);
    finMutate(all=>[...all,...ents]);
    const C={...(f9cfg().forn||{})};L.forEach(x=>{const k=finFornId(x.n.nome,null);if(!C[k])C[k]={nome:x.n.nome,cnpj:f9CnpjFmt(x.n.cnpj)};else if(!C[k].cnpj)C[k]={...C[k],cnpj:f9CnpjFmt(x.n.cnpj)}});f9save({forn:C});
    f7LogSimples("importou NF-e",`${L.length} nota(s), ${ents.length} conta(s)`);F9.xml=null;toast(`${L.length} nota(s) importada(s): ${ents.length} conta(s) a pagar criada(s).`);f6Go()};
  const cx=$("f9xcx");if(cx)cx.onclick=()=>{F9.xml=null;f6Go()};
}
f6Reg("xml","Contas a pagar","Importar NF-e (XML)",f9XmlHtml,f9XmlBind);
/* ---------- 5. prioridade, simulação e borderô ---------- */
const F9_PRIO_ALTA=/folha|sal[aá]rio|fgts|inss|imposto|darf|\bdas\b|iss|aluguel|empr[eé]stimo|financiamento|energia|[aá]gua|medic|farm[aá]cia/i;
function f9Prio(e){const P=f9cfg().prio||{},p=P[e.cat||""]||P["f:"+f9Key(e)];return p||(F9_PRIO_ALTA.test((e.cat||"")+" "+(e.desc||""))?"alta":"media")}
const F9_PN={alta:0,media:1,baixa:2};
function f9Ordem(){
  const h=hojeIso();return f9Abertos().filter(e=>e.venc<=addDaysIso(h,+(F9.sim.hor||15))).sort((a,b)=>{const va=a.venc<h?0:1,vb=b.venc<h?0:1;return va-vb||F9_PN[f9Prio(a)]-F9_PN[f9Prio(b)]||a.venc.localeCompare(b.venc)});
}
function f9PrioHtml(){
  const L=f9Ordem(),disp=f8Disponivel(),reserva=+(f9cfg().reserva||0),h=hojeIso();let acum=0;
  const sel=new Set(F9.sim.sel||[]),selV=soma(L.filter(e=>sel.has(e.id)),e=>+e.valor);
  const serie=f8Serie(30,F8_CEN.realista).serie,ate=new Set(L.filter(e=>sel.has(e.id)).map(e=>e.id));
  const minAntes=Math.min(...serie.map(x=>x.s));
  // mover para hoje as marcadas: subtrai de hoje em diante e devolve a partir do vencimento original
  const sim=serie.map(x=>x.s-soma(L.filter(e=>ate.has(e.id)&&(e.venc<h?h:e.venc)>x.d||false),e=>0));
  let minDepois=minAntes;{const m={};L.filter(e=>ate.has(e.id)).forEach(e=>{const d=e.venc<h?h:e.venc;m[d]=(m[d]||0)+(+e.valor)});let cum=0,min=Infinity;serie.forEach(x=>{cum+=0;const antecipado=soma(Object.entries(m),([d,v])=>d>x.d?v:0);const v=x.s-antecipado;if(v<min)min=v});minDepois=min}
  return f6Card("Quem pagar primeiro",`Ordem: vencidas, depois prioridade (alta, média, baixa), depois data. Dinheiro disponível hoje: <b>${f6Money(disp)}</b>${reserva?` (reserva de segurança ${f6Money(reserva)})`:""}. Marque as contas que pretende pagar para simular o efeito no caixa.`,
   `<div class="row" style="margin-bottom:8px"><div><label>Mostrar vencimentos até</label><select id="f9hor">${[7,15,30,60].map(d=>`<option value="${d}" ${d===(+F9.sim.hor||15)?"selected":""}>${d} dias</option>`).join("")}</select></div><div><label>Reserva de segurança (R$)</label><input type="number" id="f9res" value="${reserva||""}" style="width:130px"></div><button class="b sec sm" id="f9ressv" style="align-self:flex-end">Salvar</button><button class="b sec sm" id="f9auto" style="align-self:flex-end">Marcar o que o caixa paga</button></div>`+
   (L.length?f6Tbl(["","Conta","Fornecedor","Vence","Prioridade","Valor","Acumulado","Caixa"],[L.map(e=>{acum+=+e.valor;const cabe=disp-reserva>=acum;return `<tr><td><input type="checkbox" data-f9sel="${e.id}" ${sel.has(e.id)?"checked":""}></td><td>${f6Esc(e.desc)}</td><td>${f6Esc(e.contra||"")}</td><td class="n" style="color:${e.venc<h?"#c62828":"inherit"}">${brDate(e.venc)}</td><td class="n"><select data-f9pr="${f6Esc(e.cat||"")}|${e.id}">${["alta","media","baixa"].map(p=>`<option value="${p}" ${f9Prio(e)===p?"selected":""}>${p==="media"?"média":p}</option>`).join("")}</select></td><td class="n">${fmtBRL(e.valor)}</td><td class="n">${f6Money(acum)}</td><td class="n">${cabe?f6Dot("#2e7d32")+"cabe":f6Dot("#c62828")+"falta"}</td></tr>`}).join("")])+
    `<div class="callout" style="margin-top:10px">Marcadas: <b>${f6Money(selV)}</b> (${sel.size}). Se pagar hoje, sobram <b style="color:${disp-selV<0?"#c62828":"inherit"}">${f6Money(disp-selV)}</b> e o menor saldo projetado nos próximos 30 dias passa de ${f6Money(minAntes)} para <b style="color:${minDepois<0?"#c62828":"inherit"}">${f6Money(minDepois)}</b>.</div>
    <div class="row" style="margin-top:8px"><button class="b" id="f9pagar" ${sel.size?"":"disabled"}>Dar baixa nas marcadas</button><button class="b sec" id="f9bx" ${sel.size?"":"disabled"}>Borderô (Excel)</button><button class="b sec" id="f9bp" ${sel.size?"":"disabled"}>Borderô (PDF)</button></div>`:`<div class="empty">Nenhuma conta a pagar neste período.</div>`));
}
function f9Bordero(){
  const L=f9Ordem().filter(e=>(F9.sim.sel||[]).includes(e.id)),C=f9cfg().forn||{};
  return[{titulo:"Borderô de pagamentos",sub:`Preparado em ${brDate(hojeIso())} · ${L.length} conta(s)`,sensivel:false,cols:[{h:"Vencimento",t:"date",w:13},{h:"Fornecedor",w:28},{h:"Descrição",w:30},{h:"Pagar por",w:34},{h:"Linha digitável / dados",w:48},{h:"Valor",t:"money",w:14}],
    rows:L.map(e=>{const c=C[f9Key(e)]||{};return[e.venc,e.contra||"",e.desc,c.pix?"PIX":e.barras?"Boleto":c.banco?"Transferência":"—",e.barras?finBarrasFmt(e.barras):c.pix?c.pix:c.banco?`${c.banco} ag ${c.ag||""} cc ${c.conta||""}`:"",+e.valor]}),tot:[null,null,null,null,null,"sum"]}];
}
function f9PrioBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  const h=$("f9hor");if(h)h.onchange=()=>{F9.sim.hor=+h.value;f6Go()};
  g("f9ressv",()=>{f9save({reserva:Math.max(0,f6Num($("f9res").value))});f6Go()});
  g("f9auto",()=>{const disp=f8Disponivel()-(+(f9cfg().reserva)||0);let a=0;F9.sim.sel=f9Ordem().filter(e=>{if(a+ +e.valor<=disp){a+=+e.valor;return true}return false}).map(e=>e.id);f6Go()});
  document.querySelectorAll("[data-f9sel]").forEach(c=>c.onchange=()=>{const s=new Set(F9.sim.sel||[]);c.checked?s.add(c.dataset.f9sel):s.delete(c.dataset.f9sel);F9.sim.sel=[...s];f6Go()});
  document.querySelectorAll("[data-f9pr]").forEach(s=>s.onchange=()=>{const[cat,id]=s.dataset.f9pr.split("|"),P={...(f9cfg().prio||{})};if(cat)P[cat]=s.value;else{const e=finAll().find(x=>x.id===id);P["f:"+f9Key(e)]=s.value}f9save({prio:P});f6Go()});
  g("f9pagar",()=>openFinBaixaLote(F9.sim.sel));g("f9bx",()=>f5Xlsx(`bordero-${hojeIso()}.xlsx`,f9Bordero()));g("f9bp",()=>f5Pdf(`bordero-${hojeIso()}.pdf`,f9Bordero()));
}
f6Reg("prio","Contas a pagar","Prioridade e borderô",f9PrioHtml,f9PrioBind);
/* ---------- 6. pagar antecipado com desconto ---------- */
function f9AntecHtml(){
  const L=f9Abertos().filter(e=>e.venc>hojeIso()).sort((a,b)=>a.venc.localeCompare(b.venc)).slice(0,40);
  return f6Card("Pagar antes do vencimento com desconto","Informe o desconto que o fornecedor oferece. O sistema mostra quanto isso rende ao mês comparado a deixar o dinheiro aplicado.",
   L.length?f6Tbl(["Conta","Vence","Valor","Desconto (%)","Você economiza","Rende ao mês",""],[L.map(e=>`<tr><td>${f6Esc(e.desc)}<div class="sub">${f6Esc(e.contra||"")}</div></td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td><td class="n"><input type="number" step="0.1" data-f9dc="${e.id}" style="width:80px"></td><td class="n" id="f9ec_${e.id}">—</td><td class="n" id="f9rm_${e.id}">—</td><td><button class="b sec sm" data-f9dp="${e.id}">Pagar hoje com desconto</button></td></tr>`).join("")]):`<div class="empty">Nenhuma conta a vencer.</div>`);
}
function f9AntecBind(){
  document.querySelectorAll("[data-f9dc]").forEach(i=>i.oninput=()=>{const e=finAll().find(x=>x.id===i.dataset.f9dc),p=f6Num(i.value),eco=arred2(+e.valor*p/100),dias=Math.max(1,daysBetweenIso(hojeIso(),e.venc)),rm=(+e.valor-eco)>0?(eco/(+e.valor-eco))/(dias/30)*100:0;
    $("f9ec_"+e.id).textContent=f6Money(eco);$("f9rm_"+e.id).innerHTML=`<b>${rm.toFixed(2).replace(".",",")}%</b>`});
  document.querySelectorAll("[data-f9dp]").forEach(b=>b.onclick=async()=>{const id=b.dataset.f9dp,e=finAll().find(x=>x.id===id),p=f6Num(document.querySelector(`[data-f9dc="${id}"]`).value);if(!(p>0&&p<100))return toast("Informe o desconto em %.",true);
    const v=arred2(+e.valor*(1-p/100));if(!await askConfirm(`Pagar “${e.desc}” hoje por ${fmtBRL(v)} (desconto de ${p}%)?`,"Pagar"))return;
    finMutate(all=>all.map(x=>x.id===id?{...x,pago:hojeIso(),valorPago:v,obs:(x.obs?x.obs+" · ":"")+`pago antecipado com desconto de ${p}%`}:x));
    if(finAll().find(x=>x.id===id).pago){toast("Pago com desconto.");f6Go()}});
}
f6Reg("antec","Contas a pagar","Pagar antecipado",f9AntecHtml,f9AntecBind);
/* ---------- 7. contratos de fornecedor e reajuste ---------- */
const f9Contratos=()=>f9cfg().contratos||[];
function f9ContrStatus(c){const h=hojeIso();if(!c.fim)return{t:"sem prazo",cor:"#2e7d32"};const d=daysBetweenIso(h,c.fim);return d<0?{t:"vencido há "+(-d)+" dias",cor:"#c62828"}:d<=(+c.aviso||60)?{t:"vence em "+d+" dias",cor:"#e0a100"}:{t:"vigente ("+d+" dias)",cor:"#2e7d32"}}
function f9ContrHtml(){
  const L=f9Contratos();
  return f6Card("Contratos de fornecedores","Controle de vigência e reajuste anual. O sistema avisa na tela inicial antes do vencimento.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f9cnew">Novo contrato</button></div>`+
   (L.length?f6Tbl(["Fornecedor / objeto","Valor mensal","Vigência","Situação","Reajuste",""],[L.map(c=>{const s=f9ContrStatus(c);return `<tr><td><b>${f6Esc(c.forn)}</b><div class="sub">${f6Esc(c.objeto||"")}</div></td><td class="n">${f6Money(c.valor||0)}</td><td class="n">${c.inicio?brDate(c.inicio):"—"} a ${c.fim?brDate(c.fim):"indeterminado"}</td><td class="n">${f6Dot(s.cor)}${s.t}</td><td class="n">${c.reajMes?`todo mês ${c.reajMes} (${c.reajPct||0}%)`:"—"}${(c.hist||[]).length?`<div class="sub">último: ${brDate(c.hist[c.hist.length-1].em)} +${c.hist[c.hist.length-1].pct}%</div>`:""}</td><td><button class="b sec sm" data-f9crj="${c.id}">Aplicar reajuste</button> <button class="b sec sm" data-f9ce="${c.id}">Editar</button> <button class="b sec sm" data-f9cd="${c.id}">Excluir</button></td></tr>`}).join("")]):`<div class="empty">Nenhum contrato cadastrado.</div>`));
}
function f9ContrEdit(id){
  const c=f9Contratos().find(x=>x.id===id)||{aviso:60},recs=recAll().filter(r=>r.tipo==="pagar"&&r.ativa!==false);
  f6Form(id?"Editar contrato":"Novo contrato",[{k:"forn",l:"Fornecedor",v:c.forn||"",list:f9Fornecedores().map(o=>o.nome)},{k:"objeto",l:"Objeto (o que é contratado)",v:c.objeto||""},{k:"valor",l:"Valor mensal (R$)",t:"number",v:c.valor||""},{k:"inicio",l:"Início",t:"date",v:c.inicio||""},{k:"fim",l:"Fim da vigência (vazio = indeterminado)",t:"date",v:c.fim||""},{k:"aviso",l:"Avisar quantos dias antes do fim",t:"number",v:c.aviso||60},{k:"reajMes",l:"Mês do reajuste anual (1 a 12; vazio = sem)",t:"number",v:c.reajMes||""},{k:"reajPct",l:"Percentual de reajuste previsto (%)",t:"number",v:c.reajPct||""},{k:"recId",l:"Conta recorrente ligada (recebe o reajuste)",t:"select",opts:[["","(nenhuma)"],...recs.map(r=>[r.id,`${r.desc} — ${fmtBRL(r.valor)}`])],v:c.recId||""}],v=>{
    if(!v.forn.trim())return"Informe o fornecedor.";if(v.fim&&v.inicio&&v.fim<v.inicio)return"O fim não pode ser antes do início.";
    const reg={...c,id:c.id||uid8(),forn:v.forn.trim(),objeto:v.objeto.trim(),valor:v.valor||0,inicio:v.inicio,fim:v.fim,aviso:v.aviso||60,reajMes:v.reajMes?Math.min(12,Math.max(1,Math.round(v.reajMes))):0,reajPct:v.reajPct||0,recId:v.recId};
    f9save({contratos:id?f9Contratos().map(x=>x.id===id?reg:x):[...f9Contratos(),reg]});f6Go()});
}
function f9ContrReajuste(id){
  const c=f9Contratos().find(x=>x.id===id);
  f6Form("Aplicar reajuste",[{t:"note",l:`${c.forn}: valor atual ${fmtBRL(c.valor)}.`},{k:"pct",l:"Percentual (%)",t:"number",v:c.reajPct||""},{k:"desde",l:"Vale a partir de",t:"date",v:hojeIso()}],v=>{
    if(!(v.pct>0))return"Informe o percentual.";if(!v.desde||!finDataOk(v.desde))return"Data inválida.";
    const novo=arred2((+c.valor)*(1+v.pct/100));
    if(c.recId){const r=recAll().find(x=>x.id===c.recId);if(r){recSave(recAll().map(x=>x.id===c.recId?{...x,reaj:[...(x.reaj||[]).filter(a=>a.desde!==v.desde),{desde:v.desde,valor:novo}]}:x));finMutate(all=>all.map(e=>e.recorrencia===c.recId&&!e.pago&&!e.cancelada&&e.venc>=v.desde?{...e,valor:novo}:e))}}
    f9save({contratos:f9Contratos().map(x=>x.id===id?{...x,valor:novo,hist:[...(x.hist||[]),{em:v.desde,pct:v.pct,de:c.valor,para:novo}]}:x)});toast(`Reajuste de ${v.pct}% aplicado: ${fmtBRL(c.valor)} → ${fmtBRL(novo)}.`);f6Go()});
}
function f9ContrBind(){
  const n=$("f9cnew");if(n)n.onclick=()=>f9ContrEdit();
  document.querySelectorAll("[data-f9ce]").forEach(b=>b.onclick=()=>f9ContrEdit(b.dataset.f9ce));
  document.querySelectorAll("[data-f9crj]").forEach(b=>b.onclick=()=>f9ContrReajuste(b.dataset.f9crj));
  document.querySelectorAll("[data-f9cd]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir este contrato?","Excluir")){f9save({contratos:f9Contratos().filter(c=>c.id!==b.dataset.f9cd)});f6Go()}});
}
f6Reg("contr","Contas a pagar","Contratos",f9ContrHtml,f9ContrBind);
/* ---------- 8. acordo de dívida e compensação ---------- */
function f9AcordoHtml(){
  const ab=f9Abertos(),porF={};ab.forEach(e=>{const k=f9Key(e);if(k)(porF[k]=porF[k]||[]).push(e)});
  const rec=finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada),parc={};
  ab.forEach(e=>{const k=estNorm(e.contra||"");if(k)(parc[k]=parc[k]||{p:[],r:[],nome:e.contra}).p.push(e)});
  rec.forEach(e=>{const k=estNorm(e.contra||"");if(k&&parc[k])parc[k].r.push(e)});
  const comp=Object.values(parc).filter(x=>x.p.length&&x.r.length);
  return f6Card("Acordo de dívida com fornecedor","Junte contas em aberto de um fornecedor e parcele com entrada e juros. As contas antigas ficam canceladas (“renegociado”).",
   Object.keys(porF).length?f6Tbl(["Fornecedor","Contas em aberto","Total","Vencidas",""],[Object.entries(porF).sort((a,b)=>soma(b[1],e=>+e.valor)-soma(a[1],e=>+e.valor)).slice(0,30).map(([k,l])=>`<tr><td>${f6Esc(l[0].contra)}</td><td class="n">${l.length}</td><td class="n">${f6Money(soma(l,e=>+e.valor))}</td><td class="n">${l.filter(e=>e.venc<hojeIso()).length}</td><td><button class="b sec sm" data-f9ac="${f6Esc(k)}">Fazer acordo</button></td></tr>`).join("")]):`<div class="empty">Nenhuma conta em aberto.</div>`)
   +f6Card("Compensar o que devo com o que tenho a receber","Quando o mesmo nome aparece como fornecedor e como cliente. Nenhum dinheiro se mexe: as duas contas são baixadas como “Compensação”.",
    comp.length?f6Tbl(["Parceiro","Devo","Tenho a receber","Pode compensar",""],[comp.map(x=>{const dp=soma(x.p,e=>+e.valor),dr=soma(x.r,e=>+e.valor);return `<tr><td>${f6Esc(x.nome)}</td><td class="n">${f6Money(dp)}</td><td class="n">${f6Money(dr)}</td><td class="n"><b>${f6Money(Math.min(dp,dr))}</b></td><td><button class="b sec sm" data-f9cp="${f6Esc(estNorm(x.nome))}">Compensar</button></td></tr>`}).join("")]):`<div class="empty">Nenhum parceiro com contas dos dois lados.</div>`);
}
function f9Acordo(k){
  const L=f9Abertos().filter(e=>f9Key(e)===k).sort((a,b)=>a.venc.localeCompare(b.venc));
  const ov=f6Form(`Acordo com ${L[0].contra}`,[{t:"note",l:"Marque as contas que entram no acordo:"},...L.map(e=>({k:"c_"+e.id,l:`${e.desc} — vence ${brDate(e.venc)} — ${fmtBRL(e.valor)}`,t:"check",v:true})),{k:"ent",l:"Entrada (R$) — paga hoje",t:"number",v:0},{k:"n",l:"Número de parcelas",t:"number",v:3},{k:"juros",l:"Juros do parcelamento (% ao mês)",t:"number",v:0},{k:"prim",l:"Vencimento da 1ª parcela",t:"date",v:addMesesIso(hojeIso(),1)}],v=>{
    const sel=L.filter(e=>v["c_"+e.id]);if(!sel.length)return"Marque ao menos uma conta.";const total=arred2(soma(sel,e=>+e.valor)),ent=v.ent||0;
    if(ent<0||ent>=total)return"A entrada deve ser menor que o total.";if(!(v.n>=1))return"Informe as parcelas.";if(!v.prim||!finDataOk(v.prim))return"Data inválida.";
    const p=arred2(total-ent),tab=f8Tabela({sistema:v.juros>0?"price":"fixo",valor:p,parcelas:Math.round(v.n),taxa:v.juros||0,parcela:p/Math.round(v.n)}),h=hojeIso(),ids=new Set(sel.map(e=>e.id)),gid="ac"+uid8(),base={tipo:"pagar",contra:L[0].contra,fornId:L[0].fornId||f9Key(L[0]),cat:sel[0].cat||"",area:sel[0].area||"",forma:"Boleto",acordo:gid};
    const novos=[...(ent>0?[{...base,id:uid8(),desc:`Acordo — entrada (${L[0].contra})`,valor:ent,venc:h,pago:null,valorPago:null}]:[]),...tab.map(t=>({...base,id:uid8(),desc:`Acordo — parcela ${t.k}/${tab.length} (${L[0].contra})`,valor:arred2(t.pm),venc:addMesesIso(v.prim,t.k-1),pago:null,valorPago:null,parcela:`${t.k}/${tab.length}`,obs:`acordo sobre ${sel.length} conta(s) de ${fmtBRL(total)}`}))];
    finMutate(all=>[...all.map(x=>ids.has(x.id)?{...x,pago:h,valorPago:0,cancelada:true,obs:(x.obs?x.obs+" · ":"")+"renegociado em "+brDate(h)}:x),...novos]);
    if(!novos.every(n=>finAll().some(e=>e.id===n.id)))return"Não foi possível salvar o acordo (permissão ou mês fechado).";
    toast(`Acordo feito: ${novos.length} conta(s) nova(s), total ${fmtBRL(soma(novos,e=>+e.valor))}.`);f6Go()},{ok:"Fazer o acordo"});
}
function f9Compensar(k){
  const P=f9Abertos().filter(e=>estNorm(e.contra||"")===k).sort((a,b)=>a.venc.localeCompare(b.venc)),R=finAll().filter(e=>e.tipo==="receber"&&!e.pago&&!e.cancelada&&estNorm(e.contra||"")===k).sort((a,b)=>a.venc.localeCompare(b.venc));
  const max=Math.min(soma(P,e=>+e.valor),soma(R,e=>+e.valor));
  f6Form("Compensar",[{k:"v",l:`Valor a compensar (até ${fmtBRL(max)})`,t:"number",v:max}],v=>{
    if(!(v.v>0)||v.v>max+0.001)return"Valor inválido.";const h=hojeIso(),novos=[],ed=new Map();
    const aloca=L=>{let r=arred2(v.v);for(const e of L){if(r<=0)break;if(+e.valor<=r+0.001){ed.set(e.id,{...e,pago:h,valorPago:+e.valor,forma:"Compensação",obs:(e.obs?e.obs+" · ":"")+"compensação"});r=arred2(r-e.valor)}else{ed.set(e.id,{...e,valor:arred2(e.valor-r)});novos.push({...e,id:uid8(),valor:r,pago:h,valorPago:r,forma:"Compensação",obs:"compensação parcial",parcela:null,grupo:undefined,recorrencia:undefined});r=0}}};
    aloca(P);aloca(R);finMutate(all=>[...all.map(e=>ed.get(e.id)||e),...novos]);toast(`Compensação de ${fmtBRL(v.v)} registrada.`);f6Go()});
}
f6Reg("acordo","Contas a pagar","Acordos e compensação",f9AcordoHtml,()=>{document.querySelectorAll("[data-f9ac]").forEach(b=>b.onclick=()=>f9Acordo(b.dataset.f9ac));document.querySelectorAll("[data-f9cp]").forEach(b=>b.onclick=()=>f9Compensar(b.dataset.f9cp))});
/* ---------- 9. adiantamentos e créditos de fornecedor ---------- */
const f9Creds=()=>f9cfg().creditos||[];
const f9CredSaldo=c=>arred2((+c.valor||0)-soma(c.usado||[],u=>+u.v));
function f9CredHtml(){
  const L=f9Creds();
  return f6Card("Adiantamentos e créditos de fornecedor","Adiantamento é dinheiro que você já mandou; crédito é devolução ou nota de crédito. Depois você abate o saldo de uma conta do mesmo fornecedor.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f9crnew">Registrar adiantamento / crédito</button></div>`+
   (L.length?f6Tbl(["Fornecedor","Origem","Data","Valor","Saldo",""],[L.map(c=>`<tr><td>${f6Esc(c.forn)}<div class="sub">${f6Esc(c.obs||"")}</div></td><td class="n">${f6Esc(c.origem)}</td><td class="n">${brDate(c.data)}</td><td class="n">${f6Money(c.valor)}</td><td class="n"><b>${f6Money(f9CredSaldo(c))}</b></td><td>${f9CredSaldo(c)>0?`<button class="b sec sm" data-f9cu="${c.id}">Abater em uma conta</button>`:""}</td></tr>`).join("")]):`<div class="empty">Nenhum crédito registrado.</div>`));
}
function f9CredNovo(){
  f6Form("Adiantamento / crédito",[{k:"forn",l:"Fornecedor",list:f9Fornecedores().map(o=>o.nome)},{k:"origem",l:"Tipo",t:"select",opts:[["adiantamento","Adiantamento (dinheiro que saiu agora)"],["devolução","Devolução (dinheiro já recebido de volta ou a compensar)"],["nota de crédito","Nota de crédito (sem dinheiro)"]]},{k:"valor",l:"Valor (R$)",t:"number"},{k:"data",l:"Data",t:"date",v:hojeIso()},{k:"conta",l:"Conta de onde saiu (só para adiantamento)",t:"select",opts:f4ContasPag().map(c=>[c.id,c.nome])},{k:"obs",l:"Observação"}],v=>{
    if(!v.forn.trim()||!(v.valor>0))return"Informe fornecedor e valor.";const id=uid8();
    if(v.origem==="adiantamento"){const e={id:"ad_"+id,tipo:"pagar",desc:"Adiantamento — "+v.forn.trim(),contra:v.forn.trim(),fornId:finFornId(v.forn.trim(),null),cat:"Adiantamentos a fornecedores",area:"",forma:"Transferência",valor:arred2(v.valor),venc:v.data,pago:v.data,valorPago:arred2(v.valor),conta:v.conta,obs:"adiantamento a abater"};finMutate(all=>[...all,e]);if(!finAll().some(x=>x.id===e.id))return"Não foi possível lançar a saída (permissão ou mês fechado)."}
    f9save({creditos:[...f9Creds(),{id,forn:v.forn.trim(),origem:v.origem,valor:arred2(v.valor),data:v.data,obs:v.obs,usado:[]}]});f6Go()});
}
function f9CredUsar(id){
  const c=f9Creds().find(x=>x.id===id),contas=f9Abertos().filter(e=>f9Key(e)===finFornId(c.forn,null)||estNorm(e.contra||"")===estNorm(c.forn)).sort((a,b)=>a.venc.localeCompare(b.venc));
  if(!contas.length)return toast("Não há conta em aberto deste fornecedor.",true);
  f6Form("Abater crédito",[{t:"note",l:`Saldo do crédito: ${fmtBRL(f9CredSaldo(c))}`},{k:"e",l:"Conta",t:"select",opts:contas.map(e=>[e.id,`${e.desc} — ${brDate(e.venc)} — ${fmtBRL(e.valor)}`])},{k:"v",l:"Valor a abater (R$)",t:"number",v:Math.min(f9CredSaldo(c),+contas[0].valor)}],v=>{
    const e=contas.find(x=>x.id===v.e),max=Math.min(f9CredSaldo(c),+e.valor);if(!(v.v>0)||v.v>max+0.001)return`Valor inválido (máximo ${fmtBRL(max)}).`;
    const ab=arred2(v.v),h=hojeIso();
    if(Math.abs(ab-+e.valor)<0.005)finMutate(all=>all.map(x=>x.id===e.id?{...x,pago:h,valorPago:0,forma:"Compensação",abatido:ab,obs:(x.obs?x.obs+" · ":"")+`quitada com crédito do fornecedor`}:x));
    else finMutate(all=>all.map(x=>x.id===e.id?{...x,valor:arred2(x.valor-ab),abatido:(+x.abatido||0)+ab,obs:(x.obs?x.obs+" · ":"")+`abatido ${fmtBRL(ab)} de crédito`}:x));
    f9save({creditos:f9Creds().map(x=>x.id===id?{...x,usado:[...(x.usado||[]),{e:e.id,v:ab,em:h}]}:x)});toast(`Crédito abatido: ${fmtBRL(ab)}.`);f6Go()});
}
f6Reg("cred","Contas a pagar","Adiantamentos e créditos",f9CredHtml,()=>{const n=$("f9crnew");if(n)n.onclick=f9CredNovo;document.querySelectorAll("[data-f9cu]").forEach(b=>b.onclick=()=>f9CredUsar(b.dataset.f9cu))});
/* ---------- 10. pedidos de compra e cotações ---------- */
const f9Peds=()=>f9cfg().pedidos||[];
const F9_PST={rascunho:"Rascunho",aprovado:"Aprovado",recebido:"Recebido",faturado:"Conta lançada",cancelado:"Cancelado"};
function f9PedTotal(p){return arred2(soma(p.itens||[],i=>(+i.q||0)*(+i.vu||0)))}
function f9PedHtml(){
  const L=f9Peds().slice().reverse();
  return f6Card("Pedidos de compra","Pedido, cotação, aprovação, recebimento e conta a pagar no mesmo lugar, comparando o valor aprovado com o da nota.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f9pnew">Novo pedido</button></div>`+
   (L.length?f6Tbl(["Pedido","Fornecedor","Situação","Orçado","Valor da nota","Diferença",""],[L.map(p=>{const dif=p.nota!=null?arred2(p.nota-(p.orc||f9PedTotal(p))):null;return `<tr><td><b>#${p.num}</b> ${f6Esc(p.desc)}<div class="sub">${brDate(p.data)}${(p.cot||[]).length?` · ${p.cot.length} cotação(ões)`:""}</div></td><td>${f6Esc(p.forn||"—")}</td><td class="n">${F9_PST[p.status]}</td><td class="n">${f6Money(p.orc||f9PedTotal(p))}</td><td class="n">${p.nota!=null?f6Money(p.nota):"—"}</td><td class="n" style="color:${dif>0.01?"#c62828":"inherit"}">${dif==null?"—":f6Money(dif)}</td><td>${f9PedAcoes(p)}</td></tr>`}).join("")]):`<div class="empty">Nenhum pedido.</div>`));
}
function f9PedAcoes(p){
  let h="";
  if(p.status==="rascunho"){h+=`<button class="b sec sm" data-f9pc="${p.id}">Cotações</button> `;if(f4Gestor())h+=`<button class="b sm" data-f9pa="${p.id}">Aprovar</button> `;h+=`<button class="b sec sm" data-f9px="${p.id}">Cancelar</button>`}
  else if(p.status==="aprovado")h+=`<button class="b sm" data-f9pr="${p.id}">Registrar recebimento</button> <button class="b sec sm" data-f9px="${p.id}">Cancelar</button>`;
  else if(p.status==="recebido")h+=`<button class="b sm" data-f9pf="${p.id}">Lançar conta a pagar</button>`;
  return h;
}
function f9PedNovo(){
  f6Form("Novo pedido de compra",[{k:"desc",l:"O que está sendo comprado",ph:"ex.: Material de limpeza do mês"},{k:"forn",l:"Fornecedor (se já souber)",list:f9Fornecedores().map(o=>o.nome)},{t:"sep",l:"Itens (até 5)"},...[0,1,2,3,4].flatMap(i=>[{k:"d"+i,l:`Item ${i+1}`},{k:"q"+i,l:"Quantidade",t:"number"},{k:"v"+i,l:"Valor unitário (R$)",t:"number"}]),{k:"orc",l:"Valor total orçado (R$) — vazio = soma dos itens",t:"number"}],v=>{
    if(!v.desc.trim())return"Descreva o pedido.";const itens=[0,1,2,3,4].filter(i=>v["d"+i].trim()&&v["q"+i]>0&&v["v"+i]>=0).map(i=>({d:v["d"+i].trim(),q:v["q"+i],vu:v["v"+i]}));if(!itens.length&&!v.orc)return"Informe ao menos um item ou o valor orçado.";
    const num=1+Math.max(0,...f9Peds().map(p=>p.num||0));f9save({pedidos:[...f9Peds(),{id:uid8(),num,desc:v.desc.trim(),forn:v.forn.trim(),itens,orc:v.orc||0,status:"rascunho",data:hojeIso(),cot:[],por:f4Quem()}]});f6Go()});
}
function f9PedCot(id){
  const p=f9Peds().find(x=>x.id===id),cot=p.cot||[];
  const ov=openModal(`<h3>Cotações — pedido #${p.num}</h3>${cot.length?f6Tbl(["Fornecedor","Valor","Prazo (dias)","Condições",""],[cot.map((c,i)=>`<tr${c.venc?' style="font-weight:700"':""}><td>${f6Esc(c.forn)}</td><td class="n">${f6Money(c.valor)}</td><td class="n">${c.prazo||"—"}</td><td class="n">${f6Esc(c.cond||"")}</td><td><button class="b sm" data-f9cv="${i}">${c.venc?"✔ escolhida":"Escolher"}</button> <button class="b sec sm" data-f9cx="${i}">✕</button></td></tr>`).join("")]):`<div class="empty">Nenhuma cotação ainda.</div>`}
   <h4 style="margin-top:12px">Nova cotação</h4><div class="row"><input id="f9cf" placeholder="Fornecedor"><input id="f9cv" type="number" step="any" placeholder="Valor"><input id="f9cp" type="number" placeholder="Prazo (dias)"><input id="f9cc" placeholder="Condições"></div><div class="err" id="f9ce2"></div><div class="row" style="margin-top:8px"><button class="b" id="f9cadd">Adicionar</button><button class="b sec" id="f9cfecha">Fechar</button></div>`);
  const sv=l=>{f9save({pedidos:f9Peds().map(x=>x.id===id?{...x,cot:l}:x)});ov.remove();f6Go()};
  ov.querySelector("#f9cfecha").onclick=()=>ov.remove();
  ov.querySelector("#f9cadd").onclick=()=>{const f=ov.querySelector("#f9cf").value.trim(),v=f6Num(ov.querySelector("#f9cv").value);if(!f||!(v>0))return ov.querySelector("#f9ce2").textContent="Informe fornecedor e valor.";sv([...cot,{forn:f,valor:v,prazo:f6Num(ov.querySelector("#f9cp").value),cond:ov.querySelector("#f9cc").value.trim()}])};
  ov.querySelectorAll("[data-f9cx]").forEach(b=>b.onclick=()=>sv(cot.filter((_,i)=>i!==+b.dataset.f9cx)));
  ov.querySelectorAll("[data-f9cv]").forEach(b=>b.onclick=()=>{const i=+b.dataset.f9cv;f9save({pedidos:f9Peds().map(x=>x.id===id?{...x,cot:cot.map((c,k)=>({...c,venc:k===i})),forn:cot[i].forn,orc:cot[i].valor}:x)});ov.remove();f6Go()});
}
function f9PedBind(){
  const n=$("f9pnew");if(n)n.onclick=f9PedNovo;
  const mut=(id,fn)=>{f9save({pedidos:f9Peds().map(p=>p.id===id?fn(p):p)});f6Go()};
  document.querySelectorAll("[data-f9pc]").forEach(b=>b.onclick=()=>f9PedCot(b.dataset.f9pc));
  document.querySelectorAll("[data-f9pa]").forEach(b=>b.onclick=()=>mut(b.dataset.f9pa,p=>({...p,status:"aprovado",aprov:{por:f4Quem(),em:hojeIso()}})));
  document.querySelectorAll("[data-f9px]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Cancelar este pedido?","Cancelar"))mut(b.dataset.f9px,p=>({...p,status:"cancelado"}))});
  document.querySelectorAll("[data-f9pr]").forEach(b=>b.onclick=()=>{const p=f9Peds().find(x=>x.id===b.dataset.f9pr);f6Form("Registrar recebimento",[{k:"nota",l:"Valor da nota fiscal (R$)",t:"number",v:p.orc||f9PedTotal(p)},{k:"nf",l:"Número da nota"},{k:"forn",l:"Fornecedor",v:p.forn||""},{k:"dt",l:"Recebido em",t:"date",v:hojeIso()}],v=>{if(!(v.nota>0))return"Informe o valor da nota.";if(!v.forn.trim())return"Informe o fornecedor.";mut(p.id,x=>({...x,status:"recebido",nota:arred2(v.nota),nf:v.nf,forn:v.forn.trim(),recebido:v.dt}))})});
  document.querySelectorAll("[data-f9pf]").forEach(b=>b.onclick=()=>{const p=f9Peds().find(x=>x.id===b.dataset.f9pf),prazo=+(((f9cfg().forn||{})[finFornId(p.forn,null)]||{}).prazo)||30;f6Form("Lançar conta a pagar",[{k:"venc",l:"Vencimento",t:"date",v:addDaysIso(hojeIso(),prazo)},{k:"cat",l:"Categoria",list:f6Cats(),v:((f9cfg().forn||{})[finFornId(p.forn,null)]||{}).cat||""}],v=>{
    if(!v.venc||!finDataOk(v.venc))return"Data inválida.";const id=uid8(),e={id,tipo:"pagar",desc:`Pedido #${p.num} — ${p.desc}`,contra:p.forn,fornId:finFornId(p.forn,null),cat:v.cat.trim()||"A classificar",area:"",forma:"Boleto",valor:p.nota,venc:v.venc,pago:null,valorPago:null,pedido:p.id,nfnum:p.nf||undefined};
    finMutate(all=>[...all,e]);if(!finAll().some(x=>x.id===id))return"Não foi possível lançar (permissão ou mês fechado).";mut(p.id,x=>({...x,status:"faturado",entry:id}))})});
}
f6Reg("ped","Contas a pagar","Pedidos e cotações",f9PedHtml,f9PedBind);
/* ---------- 11. reembolsos e adiantamentos de integrantes ---------- */
const f9Reembs=()=>f9cfg().reembolsos||[],f9Adiants=()=>f9cfg().adiantFunc||[];
function f9ReembHtml(){
  const R=f9Reembs().slice().reverse(),A=f9Adiants().slice().reverse();
  return f6Card("Reembolso de despesas de integrantes","A pessoa informa o que gastou; o gestor aprova e vira conta a pagar.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f9rnew">Pedir reembolso</button></div>`+
   (R.length?f6Tbl(["Pessoa","Descrição","Data","Valor","Situação",""],[R.map(r=>`<tr><td>${f6Esc(r.pessoa)}</td><td>${f6Esc(r.desc)}</td><td class="n">${brDate(r.data)}</td><td class="n">${fmtBRL(r.valor)}</td><td class="n">${r.status==="pendente"?"aguardando":r.status==="aprovado"?"aprovado (conta lançada)":"recusado"}</td><td>${r.status==="pendente"&&f4Gestor()?`<button class="b sm" data-f9ra="${r.id}">Aprovar</button> <button class="b sec sm" data-f9rn="${r.id}">Recusar</button>`:""}</td></tr>`).join("")]):`<div class="empty">Nenhum pedido.</div>`))
  +f6Card("Adiantamento ao integrante e prestação de contas","Dinheiro entregue para uma compra. Depois a pessoa presta contas das despesas e devolve (ou recebe) a diferença. Só as despesas comprovadas entram no resultado.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f9anew">Entregar adiantamento</button></div>`+
   (A.length?A.map(a=>{const gasto=soma(a.despesas||[],d=>+d.v),dif=arred2(a.valor-gasto);return `<div class="doc"><div class="grow"><div class="nm">${f6Esc(a.pessoa)} — ${f6Money(a.valor)} <span class="sub">em ${brDate(a.data)}${a.obs?" · "+f6Esc(a.obs):""}</span></div><div class="sub">Comprovado: ${f6Money(gasto)} · ${a.status==="encerrado"?"encerrado":dif>=0?`falta devolver ${f6Money(dif)}`:`a empresa deve ${f6Money(-dif)}`}</div></div>${a.status==="encerrado"?"":`<button class="b sec sm" data-f9ad="${a.id}">Lançar despesa</button><button class="b sm" data-f9ae="${a.id}">Encerrar</button>`}</div>`}).join(""):`<div class="empty">Nenhum adiantamento.</div>`));
}
function f9ReembBind(){
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f9rnew",()=>f6Form("Pedir reembolso",[{k:"pessoa",l:"Quem gastou"},{k:"desc",l:"O que foi comprado"},{k:"valor",l:"Valor (R$)",t:"number"},{k:"data",l:"Data da despesa",t:"date",v:hojeIso()},{k:"cat",l:"Categoria",list:f6Cats()}],v=>{if(!v.pessoa.trim()||!v.desc.trim()||!(v.valor>0))return"Preencha pessoa, descrição e valor.";f9save({reembolsos:[...f9Reembs(),{id:uid8(),pessoa:v.pessoa.trim(),desc:v.desc.trim(),valor:arred2(v.valor),data:v.data,cat:v.cat.trim(),status:"pendente"}]});f6Go()}));
  document.querySelectorAll("[data-f9ra]").forEach(b=>b.onclick=()=>{const r=f9Reembs().find(x=>x.id===b.dataset.f9ra),id=uid8();
    finMutate(all=>[...all,{id,tipo:"pagar",desc:`Reembolso — ${r.desc}`,contra:r.pessoa,fornId:finFornId(r.pessoa,null),cat:r.cat||"Reembolsos",area:"",forma:"Transferência",valor:r.valor,venc:hojeIso(),pago:null,valorPago:null,reembolso:r.id}]);
    if(!finAll().some(e=>e.id===id))return;f9save({reembolsos:f9Reembs().map(x=>x.id===r.id?{...x,status:"aprovado",entry:id}:x)});toast("Reembolso aprovado: conta lançada em Contas a pagar.");f6Go()});
  document.querySelectorAll("[data-f9rn]").forEach(b=>b.onclick=()=>{f9save({reembolsos:f9Reembs().map(x=>x.id===b.dataset.f9rn?{...x,status:"recusado"}:x)});f6Go()});
  g("f9anew",()=>f6Form("Entregar adiantamento",[{k:"pessoa",l:"Quem recebeu"},{k:"valor",l:"Valor (R$)",t:"number"},{k:"data",l:"Data",t:"date",v:hojeIso()},{k:"conta",l:"Saiu de",t:"select",opts:f4ContasPag().map(c=>[c.id,c.nome])},{k:"obs",l:"Para quê"}],v=>{
    if(!v.pessoa.trim()||!(v.valor>0))return"Informe pessoa e valor.";const aid=uid8(),e={id:"af_"+aid,tipo:"pagar",desc:"Adiantamento — "+v.pessoa.trim(),contra:v.pessoa.trim(),fornId:finFornId(v.pessoa.trim(),null),cat:"Adiantamentos a funcionários",area:"",forma:"Dinheiro",valor:arred2(v.valor),venc:v.data,pago:v.data,valorPago:arred2(v.valor),conta:v.conta,semResultado:true,adiantFunc:aid};
    finMutate(all=>[...all,e]);if(!finAll().some(x=>x.id===e.id))return"Não foi possível lançar (permissão ou mês fechado).";f9save({adiantFunc:[...f9Adiants(),{id:aid,pessoa:v.pessoa.trim(),valor:arred2(v.valor),data:v.data,obs:v.obs,conta:v.conta,despesas:[],status:"aberto"}]});f6Go()}));
  document.querySelectorAll("[data-f9ad]").forEach(b=>b.onclick=()=>{const a=f9Adiants().find(x=>x.id===b.dataset.f9ad);f6Form("Lançar despesa comprovada",[{k:"desc",l:"Descrição"},{k:"valor",l:"Valor (R$)",t:"number"},{k:"cat",l:"Categoria",list:f6Cats()},{k:"data",l:"Data",t:"date",v:hojeIso()}],v=>{
    if(!v.desc.trim()||!(v.valor>0))return"Informe descrição e valor.";const id=uid8();finMutate(all=>[...all,{id,tipo:"pagar",desc:v.desc.trim(),contra:a.pessoa,fornId:finFornId(a.pessoa,null),cat:v.cat.trim()||"A classificar",area:"",forma:"Compensação",valor:arred2(v.valor),venc:v.data,pago:v.data,valorPago:arred2(v.valor),conta:a.conta,obs:`pago com adiantamento de ${a.pessoa}`,adiantFunc:a.id}]);if(!finAll().some(e=>e.id===id))return"Não foi possível lançar.";
    f9save({adiantFunc:f9Adiants().map(x=>x.id===a.id?{...x,despesas:[...x.despesas,{d:v.desc.trim(),v:arred2(v.valor),id}]}:x)});f6Go()})});
  document.querySelectorAll("[data-f9ae]").forEach(b=>b.onclick=async()=>{const a=f9Adiants().find(x=>x.id===b.dataset.f9ae),gasto=soma(a.despesas,d=>+d.v),dif=arred2(a.valor-gasto);
    if(!await askConfirm(Math.abs(dif)<0.01?"Encerrar a prestação de contas?":dif>0?`A pessoa devolve ${fmtBRL(dif)}. Registrar a devolução e encerrar?`:`A empresa paga ${fmtBRL(-dif)} à pessoa. Registrar e encerrar?`,"Encerrar"))return;
    if(Math.abs(dif)>=0.01){const e={id:uid8(),tipo:dif>0?"receber":"pagar",desc:dif>0?`Devolução de adiantamento — ${a.pessoa}`:`Complemento de adiantamento — ${a.pessoa}`,contra:a.pessoa,cat:"Adiantamentos a funcionários",area:"",forma:"Dinheiro",valor:Math.abs(dif),venc:hojeIso(),pago:hojeIso(),valorPago:Math.abs(dif),conta:a.conta,semResultado:true,adiantFunc:a.id};if(e.tipo==="pagar")e.fornId=finFornId(a.pessoa,null);finMutate(all=>[...all,e])}
    f9save({adiantFunc:f9Adiants().map(x=>x.id===a.id?{...x,status:"encerrado"}:x)});f6Go()});
}
f6Reg("reemb","Contas a pagar","Reembolsos e adiantamentos",f9ReembHtml,f9ReembBind);
/* ---------- 12. contas de consumo estimadas ---------- */
function f9Estimativas(){
  const re=/energia|luz|[aá]gua|g[aá]s|internet|telefone/i,h=hojeIso(),por={};
  finAll().filter(e=>e.tipo==="pagar"&&!e.cancelada&&re.test(e.cat||"")&&f9Key(e)&&!e.estimado).forEach(e=>(por[f9Key(e)]=por[f9Key(e)]||[]).push(e));
  const out=[];Object.values(por).forEach(l=>{l.sort((a,b)=>a.venc.localeCompare(b.venc));const meses=new Set(l.map(e=>e.venc.slice(0,7)));if(meses.size<3)return;const u3=l.slice(-3),m=arred2(soma(u3,e=>+e.valor)/u3.length),ult=l[l.length-1],dia=ult.venc.slice(8,10);
    for(let k=1;k<=3;k++){const base=addMesesIso(ult.venc.slice(0,7)+"-01",k),mes=base.slice(0,7);if(mes<h.slice(0,7)||finAll().some(e=>f9Key(e)===f9Key(ult)&&e.venc.slice(0,7)===mes&&!e.cancelada))continue;const ud=Math.min(+dia,new Date(+mes.slice(0,4),+mes.slice(5,7),0).getDate());out.push({id:uid8(),tipo:"pagar",desc:`${ult.desc.replace(/\s*\(estimad[ao]\)/,"")} (estimado)`,contra:ult.contra,fornId:ult.fornId||f9Key(ult),cat:ult.cat,area:ult.area||"",forma:ult.forma||"Boleto",valor:m,venc:`${mes}-${String(ud).padStart(2,"0")}`,pago:null,valorPago:null,estimado:true})}});
  return out.sort((a,b)=>a.venc.localeCompare(b.venc));
}
function f9EstimHtml(){
  const P=f9Estimativas(),E=finAll().filter(e=>e.estimado&&!e.pago&&!e.cancelada).sort((a,b)=>a.venc.localeCompare(b.venc));
  return f6Card("Estimativa das contas de consumo","Para luz, água, gás, internet e telefone o valor muda todo mês. O sistema usa a média das três últimas contas para prever os próximos meses e você troca pelo valor real quando o boleto chegar.",
   (P.length?f6Tbl(["Conta","Mês","Valor estimado"],[P.map(e=>`<tr><td>${f6Esc(e.desc)}</td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td></tr>`).join("")])+`<div class="row" style="margin-top:8px"><button class="b" id="f9eok">Lançar ${P.length} estimativa(s)</button></div>`:`<div class="empty">Nada a estimar (é preciso ter ao menos 3 meses de histórico de cada conta).</div>`))
  +f6Card("Estimativas aguardando o valor real","",E.length?f6Tbl(["Conta","Vence","Estimado",""],[E.map(e=>`<tr><td>${f6Esc(e.desc)}</td><td class="n">${brDate(e.venc)}</td><td class="n">${fmtBRL(e.valor)}</td><td><button class="b sec sm" data-f9ev="${e.id}">Informar valor real</button></td></tr>`).join("")]):`<div class="empty">Nenhuma.</div>`);
}
function f9EstimBind(){
  const o=$("f9eok");if(o)o.onclick=()=>{const P=f9Estimativas();finMutate(all=>[...all,...P]);toast(`${P.length} estimativa(s) lançada(s).`);f6Go()};
  document.querySelectorAll("[data-f9ev]").forEach(b=>b.onclick=()=>{const e=finAll().find(x=>x.id===b.dataset.f9ev);f6Form("Valor real da conta",[{t:"note",l:`${e.desc} — estimado em ${fmtBRL(e.valor)}`},{k:"v",l:"Valor do boleto (R$)",t:"number"},{k:"venc",l:"Vencimento",t:"date",v:e.venc}],v=>{if(!(v.v>0))return"Informe o valor.";finMutate(all=>all.map(x=>{if(x.id!==e.id)return x;const {estimado,...r}=x;return{...r,valor:arred2(v.v),venc:v.venc||x.venc,desc:x.desc.replace(/\s*\(estimad[ao]\)/,"")}}));f6Go()})});
}
f6Reg("estim","Contas a pagar","Consumo estimado",f9EstimHtml,f9EstimBind);
/* ---------- 13. regras de aprovação (2 níveis, anexo obrigatório) ---------- */
function f9AprHtml(){
  const c=f9cfg(),lim=f4Limite();
  return f6Card("Regras de aprovação de pagamentos",`Hoje pagamentos a partir de ${lim?f6Money(lim):"(sem limite definido — configure em Ajustes)"} precisam de aprovação do gestor.`,
   `<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;margin:8px 0"><input type="checkbox" id="f9ax" ${c.exigeAnexo?"checked":""}><span><b>Exigir boleto ou comprovante anexado</b><div class="sub">O gestor só consegue aprovar uma conta que tenha anexo ou nota fiscal vinculada.</div></span></label>
    <div class="row" style="align-items:flex-end"><div><label>Segunda aprovação a partir de (R$, 0 = não usar)</label><input type="number" id="f9a2" value="${c.nivel2||0}"></div><div class="sub" style="flex:1;min-width:220px">Acima desse valor são necessárias duas aprovações, de duas pessoas diferentes.</div></div>
    <div class="row" style="margin-top:10px"><button class="b" id="f9asv">Salvar</button></div>`);
}
f6Reg("apr","Contas a pagar","Regras de aprovação",f9AprHtml,()=>{$("f9asv").onclick=()=>{f9save({exigeAnexo:$("f9ax").checked,nivel2:Math.max(0,f6Num($("f9a2").value))});toast("Regras salvas.");f6Go()}});
const _f4Apr9=f4Aprovacao;
f4Aprovacao=function(id,acao){
  if(acao==="apr"){
    const e=finAll().find(x=>x.id===id),c=f9cfg();
    if(e&&c.exigeAnexo&&!(e.anexos&&e.anexos.length)&&!e.nfarq)return f4Nega("aprovar sem boleto ou comprovante anexado (regra ativa)");
    if(e&&c.nivel2>0&&+e.valor>=c.nivel2&&f4Gestor()){
      if(!e.aprov1){finMutate(all=>all.map(x=>x.id===id?{...x,aprov1:{por:f4Quem(),em:hojeIso()}}:x));toast("1ª aprovação registrada. Falta a 2ª, de outra pessoa.");return go("fin",true)}
      if(e.aprov1.por&&e.aprov1.por===f4Quem())return f4Nega("dar a 2ª aprovação: precisa ser outra pessoa");
    }
  }
  return _f4Apr9.apply(this,arguments);
};
const _finAcoes9=finAcoes3;
finAcoes3=function(e){let h=_finAcoes9(e);if(e.aprov1&&!e.aprov&&!e.pago)h=`<span class="pill s-pendencia" title="Falta a segunda aprovação">1ª aprovação: ${esc(e.aprov1.por||"")}</span> `+h;return h};
/* contratos a vencer na tela inicial + consumo fora do padrão */
const _urg9=urgencias;
urgencias=function(per){const L=_urg9(per);try{if(podeVer("fin")){const h=hojeIso();
  f9Contratos().forEach(c=>{if(!c.fim)return;const d=daysBetweenIso(h,c.fim);if(d<=(+c.aviso||60))L.push({nivel:d<0?3:d<=15?2:1,tipo:"Financeiro",titulo:`Contrato com ${c.forn} ${d<0?"venceu":"vence em "+d+" dia(s)"}`,detalhe:`${c.objeto||"contrato"} · fim em ${brDate(c.fim)}`,quando:c.fim,rota:"fin"})});
  f9Consumo().slice(0,3).forEach(x=>L.push({nivel:1,tipo:"Financeiro",titulo:`Conta de ${x.e.contra||x.e.cat} ${Math.round(x.p)}% acima da média`,detalhe:`${fmtBRL(x.e.valor)} contra média de ${fmtBRL(x.m)}`,quando:x.e.venc,rota:"fin"}))}}catch(e){console.error(e)}return L};


/* >>> x_fin10.js */
