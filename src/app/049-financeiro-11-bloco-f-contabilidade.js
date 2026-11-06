/* ===== Financeiro 11: Bloco F — contabilidade gerencial, patrimônio, estoque, folha, obrigações, encerramento ===== */
const f11cfg=()=>xcfg("fin11");
const f11save=p=>xcfgSave("fin11",p);
const F11={sim:{}};
const f11Aviso=`<p class="sub" style="margin:0 0 10px;padding:8px;background:rgba(224,161,0,.12);border-radius:8px"><b>Atenção:</b> esta área é gerencial. Ela organiza os números para você e para o contador, mas não substitui a escrituração oficial nem o cálculo de impostos feito por um profissional.</p>`;
/* ---------- 1. plano de contas, diário, razão e balancete ---------- */
function f11Plano(){
  const P=f11cfg().plano||{},cr=new Set(),cp=new Set();
  finAll().filter(e=>!e.cancelada&&e.cat).forEach(e=>(e.tipo==="receber"?cr:cp).add(e.cat));
  const out={};[...cr].sort((a,b)=>a.localeCompare(b,"pt")).forEach((c,i)=>out["r|"+c]={cat:c,tipo:"receber",cod:`3.${String(i+1).padStart(2,"0")}`,nome:c,...(P["r|"+c]||{})});
  [...cp].sort((a,b)=>a.localeCompare(b,"pt")).forEach((c,i)=>out["p|"+c]={cat:c,tipo:"pagar",cod:`4.${String(i+1).padStart(2,"0")}`,nome:c,...(P["p|"+c]||{})});
  return out;
}
const F11_FIXAS={cx:["1.1","Caixa e bancos"],cr:["1.2","Clientes a receber"],adf:["1.9","Adiantamentos concedidos"],fp:["2.1","Fornecedores a pagar"],ter:["2.9","Valores de terceiros (cauções)"]};
function f11Diario(ano,mes,regime){
  const PL=f11Plano(),L=[],mm=mes===""||mes==null?null:+mes,no=d=>d&&d.slice(0,4)===String(ano)&&(mm==null||+d.slice(5,7)===mm+1);
  const cx=e=>["1.1-"+(e.conta||F4_PRINC),"Banco/Caixa: "+f4NomeConta(e.conta||F4_PRINC)];
  const cta=e=>e.semResultado?(e.caucao||e.caucaoDev?F11_FIXAS.ter:F11_FIXAS.adf):(PL[(e.tipo==="receber"?"r|":"p|")+e.cat]?[PL[(e.tipo==="receber"?"r|":"p|")+e.cat].cod,PL[(e.tipo==="receber"?"r|":"p|")+e.cat].nome]:[e.tipo==="receber"?"3.99":"4.99","Sem classificação"]);
  finAll().filter(e=>!e.cancelada).forEach(e=>{
    const rec=e.tipo==="receber",v=+e.valor,vp=finNum(e),c=cta(e);
    if(regime==="comp"&&!e.semResultado&&no(e.venc)){L.push({d:e.venc,h:e.desc,deb:rec?F11_FIXAS.cr:c,cre:rec?c:F11_FIXAS.fp,v,id:e.id})}
    if(e.pago&&no(e.pago)&&vp>0){
      if(regime==="comp"&&!e.semResultado)L.push({d:e.pago,h:(rec?"Recebimento: ":"Pagamento: ")+e.desc,deb:rec?cx(e):F11_FIXAS.fp,cre:rec?F11_FIXAS.cr:cx(e),v:vp,id:e.id});
      else L.push({d:e.pago,h:e.desc,deb:rec?cx(e):c,cre:rec?c:cx(e),v:vp,id:e.id});
    }
  });
  (f4cfg().transf||[]).filter(t=>no(t.data)).forEach(t=>L.push({d:t.data,h:"Transferência entre contas",deb:["1.1-"+t.para,"Banco/Caixa: "+f4NomeConta(t.para)],cre:["1.1-"+t.de,"Banco/Caixa: "+f4NomeConta(t.de)],v:+t.valor}));
  return L.sort((a,b)=>a.d.localeCompare(b.d));
}
function f11Balancete(L){
  const m={};L.forEach(l=>{[["deb","D"],["cre","C"]].forEach(([k,t])=>{const [cod,nome]=l[k],o=m[cod]=m[cod]||{cod,nome,D:0,C:0};o[t]+=l.v})});
  const r=Object.values(m).sort((a,b)=>a.cod.localeCompare(b.cod));r.forEach(o=>{o.D=arred2(o.D);o.C=arred2(o.C);o.saldo=arred2(o.D-o.C)});return r;
}
function f11ContabHtml(){
  const s=F11.sim,ano=s.ano||FIN.ano,mes=s.mes==null?"":s.mes,reg=s.reg||"caixa",L=f11Diario(ano,mes,reg),B=f11Balancete(L),tD=arred2(soma(B,o=>o.D)),tC=arred2(soma(B,o=>o.C));
  const anos=[];for(let y=new Date().getFullYear()-4;y<=new Date().getFullYear()+1;y++)anos.push(y);
  return f11Aviso+f6Card("Contabilidade gerencial","Cada recebimento e pagamento vira um lançamento de partida dobrada (débito e crédito). Regime de caixa: conta pelo dia em que o dinheiro entrou ou saiu. Regime de competência: conta também pelo vencimento, passando por Clientes e Fornecedores.",
   `<div class="row" style="align-items:flex-end"><div><label>Ano</label><select id="f11a">${anos.map(y=>`<option ${y===+ano?"selected":""}>${y}</option>`).join("")}</select></div><div><label>Mês</label><select id="f11m"><option value="">Ano todo</option>${MESES_PT.map((n,i)=>`<option value="${i}" ${String(mes)===String(i)?"selected":""}>${n}</option>`).join("")}</select></div><div><label>Regime</label><select id="f11r"><option value="caixa" ${reg==="caixa"?"selected":""}>Caixa</option><option value="comp" ${reg==="comp"?"selected":""}>Competência</option></select></div><button class="b" id="f11go">Atualizar</button></div>
    <div class="row" style="margin-top:8px"><button class="b sec" id="f11xd">Diário (Excel)</button><button class="b sec" id="f11xb">Balancete (Excel)</button><button class="b sec" id="f11pb">Balancete (PDF)</button></div>`)
   +f6Card(`Balancete — ${L.length} lançamento(s)`,`Total de débitos ${f6Money(tD)} e de créditos ${f6Money(tC)}: ${Math.abs(tD-tC)<0.01?f6Dot("#2e7d32")+"conferem":f6Dot("#c62828")+"não conferem"}.`,
    B.length?f6Tbl(["Conta","Nome","Débitos","Créditos","Saldo"],[B.map(o=>`<tr><td class="n" style="text-align:left">${f6Esc(o.cod.split("-")[0])}</td><td>${f6Esc(o.nome)}</td><td class="n">${f6Money(o.D)}</td><td class="n">${f6Money(o.C)}</td><td class="n">${f6Money(o.saldo)}</td></tr>`).join("")]):`<div class="empty">Sem lançamentos no período.</div>`)
   +f6Card("Plano de contas","Os códigos abaixo foram criados a partir das suas categorias. Ajuste para casar com o plano do seu contador.",f11PlanoHtml());
}
function f11PlanoHtml(){
  const P=f11Plano(),L=Object.entries(P);
  return L.length?f6Tbl(["Categoria","Tipo","Código","Nome da conta"],[L.map(([k,o])=>`<tr><td>${f6Esc(o.cat)}</td><td class="n">${o.tipo==="receber"?"Receita":"Despesa"}</td><td class="n"><input data-f11pc="${f6Esc(k)}" value="${f6Esc(o.cod)}" style="width:90px"></td><td><input data-f11pn="${f6Esc(k)}" value="${f6Esc(o.nome)}" style="width:100%"></td></tr>`).join("")])+`<div class="row" style="margin-top:8px"><button class="b sec sm" id="f11psv">Salvar plano</button></div>`:`<div class="empty">Sem categorias ainda.</div>`;
}
function f11Specs(kind){
  const s=F11.sim,ano=s.ano||FIN.ano,mes=s.mes==null?"":s.mes,reg=s.reg||"caixa",L=f11Diario(ano,mes,reg),per=`${mes===""?"ano":MESES_PT[+mes]} ${ano} · regime de ${reg==="caixa"?"caixa":"competência"}`;
  if(kind==="diario")return[{titulo:"Diário (partida dobrada)",sub:per,cols:[{h:"Data",t:"date",w:12},{h:"Histórico",w:36},{h:"Débito",w:26},{h:"Crédito",w:26},{h:"Valor",t:"money",w:14}],rows:L.map(l=>[l.d,l.h,l.deb[0].split("-")[0]+" "+l.deb[1],l.cre[0].split("-")[0]+" "+l.cre[1],l.v]),tot:[null,null,null,null,"sum"]}];
  const B=f11Balancete(L);return[{titulo:"Balancete de verificação",sub:per,cols:[{h:"Conta",w:10},{h:"Nome",w:44},{h:"Débitos",t:"money",w:16},{h:"Créditos",t:"money",w:16},{h:"Saldo",t:"money",w:16}],rows:B.map(o=>[o.cod.split("-")[0],o.nome,o.D,o.C,o.saldo]),tot:[null,null,"sum","sum",null]}];
}
f6Reg("contab","Contabilidade","Plano de contas e balancete",f11ContabHtml,()=>{
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f11go",()=>{F11.sim.ano=+$("f11a").value;F11.sim.mes=$("f11m").value;F11.sim.reg=$("f11r").value;f6Go()});
  g("f11xd",()=>f5Xlsx(`diario-${F11.sim.ano||FIN.ano}.xlsx`,f11Specs("diario")));g("f11xb",()=>f5Xlsx(`balancete-${F11.sim.ano||FIN.ano}.xlsx`,f11Specs("bal")));g("f11pb",()=>f5Pdf(`balancete-${F11.sim.ano||FIN.ano}.pdf`,f11Specs("bal")));
  g("f11psv",()=>{const P={};document.querySelectorAll("[data-f11pc]").forEach(i=>{const k=i.dataset.f11pc;P[k]={cod:i.value.trim()||f11Plano()[k].cod,nome:document.querySelector(`[data-f11pn="${k}"]`).value.trim()||f11Plano()[k].cat}});f11save({plano:P});toast("Plano de contas salvo.");f6Go()});
});
/* ---------- 2. patrimônio e depreciação ---------- */
const F11_VIDA={"Móveis e utensílios":10,"Equipamentos":10,"Equipamentos de informática":5,"Veículos":5,"Edificações e benfeitorias":25,"Instalações":10};
const f11Bens=()=>f11cfg().bens||[];
function f11Meses(a,b){return Math.max(0,(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7))-(+b.slice(8,10)<+a.slice(8,10)?1:0))}
function f11Dep(b,ate){
  ate=ate||hojeIso();const fim=b.baixa&&b.baixa<ate?b.baixa:ate,vida=(+b.vida||10)*12,base=(+b.valor||0)*(1-(+b.residual||0)/100),mes=base/vida,dec=Math.min(vida,f11Meses(b.data,fim)),ac=arred2(Math.min(base,mes*dec));
  return{mensal:b.baixa&&b.baixa<=ate?0:arred2(dec>=vida?0:mes),acum:ac,contab:arred2((+b.valor||0)-ac),completa:dec>=vida};
}
function f11BensHtml(){
  const L=f11Bens(),at=L.filter(b=>!b.baixa),tV=soma(at,b=>+b.valor),tA=soma(at,b=>f11Dep(b).acum),tM=soma(at,b=>f11Dep(b).mensal);
  return f11Aviso+`<div class="stats"><div class="stat"><b>${f6Money(tV)}</b><span>custo dos bens (${at.length})</span></div><div class="stat"><b>${f6Money(tA)}</b><span>depreciação acumulada</span></div><div class="stat"><b>${f6Money(tV-tA)}</b><span>valor contábil atual</span></div><div class="stat"><b>${f6Money(tM)}</b><span>depreciação por mês</span></div></div>`
   +f6Card("Bens e equipamentos","Cadastre móveis, equipamentos e veículos. O sistema calcula a depreciação linear (perda de valor por ano de vida útil) e avisa quando a garantia está acabando.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f11bn">Novo bem</button><button class="b sec" id="f11bx" ${L.length?"":"disabled"}>Relatório (Excel)</button></div>`+(L.length?f6Tbl(["Bem","Local","Compra","Custo","Vida útil","Acumulada","Valor atual","Garantia",""],[L.map(b=>{const d=f11Dep(b);return `<tr style="${b.baixa?"opacity:.55":""}"><td><b>${f6Esc(b.nome)}</b><div class="sub">${f6Esc(b.cat||"")}${b.serie?" · série "+f6Esc(b.serie):""}${b.baixa?" · baixado em "+brDate(b.baixa)+(b.motivo?" ("+f6Esc(b.motivo)+")":""):""}</div></td><td class="n">${f6Esc(b.local||"")}</td><td class="n">${brDate(b.data)}</td><td class="n">${f6Money(b.valor)}</td><td class="n">${b.vida} anos</td><td class="n">${f6Money(d.acum)}</td><td class="n">${f6Money(d.contab)}</td><td class="n">${b.garantia?brDate(b.garantia):"—"}</td><td><button class="b sec sm" data-f11be="${b.id}">Editar</button> ${b.baixa?"":`<button class="b sec sm" data-f11bb="${b.id}">Baixar</button>`}</td></tr>`}).join("")]):`<div class="empty">Nenhum bem cadastrado.</div>`));
}
function f11BemEdit(id){
  const b=f11Bens().find(x=>x.id===id)||{};
  const ov=f6Form(id?"Editar bem":"Novo bem",[{k:"nome",l:"Descrição do bem",v:b.nome||""},{k:"cat",l:"Tipo",t:"select",opts:Object.keys(F11_VIDA),v:b.cat||"Equipamentos"},{k:"data",l:"Data da compra",t:"date",v:b.data||hojeIso()},{k:"valor",l:"Valor pago (R$)",t:"number",v:b.valor||""},{k:"vida",l:"Vida útil (anos)",t:"number",v:b.vida||10},{k:"residual",l:"Valor residual esperado (% do custo)",t:"number",v:b.residual||0},{k:"local",l:"Onde fica",v:b.local||""},{k:"serie",l:"Nº de série / patrimônio",v:b.serie||""},{k:"garantia",l:"Garantia até",t:"date",v:b.garantia||""}],v=>{
    if(!v.nome.trim()||!(v.valor>0)||!(v.vida>0)||!finDataOk(v.data))return"Informe nome, valor, vida útil e data.";const reg={...b,...v,id:b.id||uid8(),nome:v.nome.trim()};
    f11save({bens:id?f11Bens().map(x=>x.id===id?reg:x):[...f11Bens(),reg]});f6Go()});
  if(!id){const t=ov.querySelector("#f6f_cat"),vi=ov.querySelector("#f6f_vida");t.onchange=()=>vi.value=F11_VIDA[t.value]||10}
}
f6Reg("bens","Contabilidade","Patrimônio e depreciação",f11BensHtml,()=>{const n=$("f11bn");if(n)n.onclick=()=>f11BemEdit();
  const x=$("f11bx");if(x)x.onclick=()=>f5Xlsx(`patrimonio-${hojeIso()}.xlsx`,[{titulo:"Patrimônio e depreciação",sub:"Posição em "+brDate(hojeIso()),cols:[{h:"Bem",w:34},{h:"Tipo",w:22},{h:"Compra",t:"date",w:12},{h:"Custo",t:"money",w:14},{h:"Vida (anos)",w:10},{h:"Depreciação acumulada",t:"money",w:16},{h:"Valor atual",t:"money",w:14},{h:"Situação",w:14}],rows:f11Bens().map(b=>{const d=f11Dep(b);return[b.nome,b.cat||"",b.data,+b.valor,+b.vida,d.acum,d.contab,b.baixa?"baixado":"ativo"]}),tot:[null,null,null,"sum",null,"sum","sum",null]}]);
  document.querySelectorAll("[data-f11be]").forEach(b=>b.onclick=()=>f11BemEdit(b.dataset.f11be));
  document.querySelectorAll("[data-f11bb]").forEach(b=>b.onclick=()=>f6Form("Baixar bem",[{k:"d",l:"Data da baixa",t:"date",v:hojeIso()},{k:"m",l:"Motivo",t:"select",opts:["Vendido","Quebrou / sem conserto","Doado","Perdido","Substituído"]}],v=>{f11save({bens:f11Bens().map(x=>x.id===b.dataset.f11bb?{...x,baixa:v.d,motivo:v.m}:x)});f6Go()}))});
/* ---------- 3. estoque valorizado ---------- */
function f11Estoque(){
  const E=estData().itens,h=hojeIso(),d90=addDaysIso(h,-90),M=movAll();
  const ult={},cons={};M.forEach(m=>{if(m.data>(ult[m.item]||""))ult[m.item]=m.data;if(m.tipo==="saida"&&m.data>=d90)cons[m.item]=(cons[m.item]||0)+(+m.qtd||0)});
  const L=E.map(i=>{const v=arred2((+i.qtd||0)*(+i.custo||0)),dia=(cons[i.id]||0)/90;return{i,v,ult:ult[i.id]||"",parado:(+i.qtd||0)>0&&(!ult[i.id]||ult[i.id]<d90),cob:dia>0?(+i.qtd||0)/dia:null}}).sort((a,b)=>b.v-a.v);
  const tot=soma(L,x=>x.v);let ac=0;L.forEach(x=>{const prev=ac;ac+=x.v;x.abc=!tot?"C":prev/tot<0.8?"A":prev/tot<0.95?"B":"C"});
  const area={};L.forEach(x=>{const k=x.i.area||"(sem área)";area[k]=(area[k]||0)+x.v});
  return{L,tot:arred2(tot),area:Object.entries(area).sort((a,b)=>b[1]-a[1]),parados:L.filter(x=>x.parado)};
}
function f11EstHtml(){
  const R=f11Estoque();
  return `<div class="stats"><div class="stat"><b>${f6Money(R.tot)}</b><span>valor do estoque</span></div><div class="stat"><b>${R.L.length}</b><span>itens cadastrados</span></div><div class="stat ${R.parados.length?"bad":""}"><b>${f6Money(soma(R.parados,x=>x.v))}</b><span>parado há mais de 90 dias (${R.parados.length} itens)</span></div></div>`
   +f6Card("Valor por área","",R.area.length?f6Tbl(["Área","Valor em estoque","%"],[R.area.map(([a,v])=>`<tr><td>${f6Esc(a)}</td><td class="n">${f6Money(v)}</td><td class="n">${R.tot?(v/R.tot*100).toFixed(1).replace(".",",")+"%":"—"}</td></tr>`).join("")]):`<div class="empty">Estoque vazio.</div>`)
   +f6Card("Curva ABC e cobertura","A = itens que somam 80% do valor; B = próximos 15%; C = o resto. Cobertura = quantos dias o estoque dura no ritmo de consumo dos últimos 90 dias.",R.L.length?f6Tbl(["Item","Classe","Qtd","Custo unit.","Valor","Última mov.","Cobertura"],[R.L.slice(0,60).map(x=>`<tr><td>${f6Esc(x.i.nome)}<div class="sub">${f6Esc(x.i.area||"")}</div></td><td class="n"><b>${x.abc}</b></td><td class="n">${fmtQtdBR(x.i.qtd)} ${f6Esc(x.i.unidade||"")}</td><td class="n">${x.i.custo?f6Money(x.i.custo):"—"}</td><td class="n">${f6Money(x.v)}</td><td class="n">${x.ult?brDate(x.ult):"—"}${x.parado?` ${f6Dot("#e0a100")}parado`:""}</td><td class="n">${x.cob==null?"—":Math.round(x.cob)+" dias"}</td></tr>`).join("")]):`<div class="empty">Sem itens.</div>`)
   +`<div class="row"><button class="b sec" id="f11ex" ${R.L.length?"":"disabled"}>Estoque valorizado (Excel)</button></div>`;
}
f6Reg("estq","Contabilidade","Estoque valorizado",f11EstHtml,()=>{const b=$("f11ex");if(b)b.onclick=()=>{const R=f11Estoque();f5Xlsx(`estoque-valorizado-${hojeIso()}.xlsx`,[{titulo:"Estoque valorizado",sub:"Posição em "+brDate(hojeIso()),cols:[{h:"Item",w:34},{h:"Área",w:18},{h:"Quantidade",w:12},{h:"Custo unitário",t:"money",w:14},{h:"Valor",t:"money",w:14},{h:"Classe",w:8}],rows:R.L.map(x=>[x.i.nome,x.i.area||"",+x.i.qtd||0,+x.i.custo||0,x.v,x.abc]),tot:[null,null,null,null,"sum",null]}])}});
/* ---------- 4. folha simples, provisões e rescisão ---------- */
const F11_TAB0={inss:[[1621.00,7.5],[2902.84,9],[4354.27,12],[8475.55,14]],irrf:[[2428.80,0,0],[2826.65,7.5,182.16],[3751.05,15,394.16],[4664.68,22.5,675.49],[1e9,27.5,908.73]],depDed:189.59,patronal:0,fgts:8};
const f11Tab=()=>({...F11_TAB0,...(f11cfg().tab||{})});
const f11Funcs=()=>f11cfg().func||[];
function f11Inss(sal,T){let ant=0,s=0;for(const [teto,al] of T.inss){if(sal>ant)s+=(Math.min(sal,teto)-ant)*al/100;ant=teto}return arred2(s)}
function f11Irrf(base,T){if(base<=0)return 0;const f=T.irrf.find(x=>base<=x[0])||T.irrf[T.irrf.length-1];return arred2(Math.max(0,base*f[1]/100-f[2]))}
function f11Calc(f){
  const T=f11Tab(),sal=+f.salario||0,inss=f11Inss(sal,T),irrf=f11Irrf(sal-inss-(+f.dep||0)*T.depDed,T),vt=(+f.vt||0)>0?arred2(Math.min(sal*0.06,+f.vt)):0,liq=arred2(sal-inss-irrf-vt-(+f.outrosDesc||0));
  const fgts=arred2(sal*T.fgts/100),pat=arred2(sal*T.patronal/100),prov13=arred2(sal/12),provFer=arred2(sal/12*4/3),provEnc=arred2((prov13+provFer)*(T.fgts+T.patronal)/100);
  return{sal,inss,irrf,vt,liq,fgts,pat,prov13,provFer,provEnc,prov:arred2(prov13+provFer+provEnc),custo:arred2(sal+fgts+pat+(+f.vt||0)-vt+(+f.vr||0)+prov13+provFer+provEnc)};
}
function f11FolhaHtml(){
  if(!f4Gestor())return f6Card("Folha de pagamento","","<div class=\"empty\">Somente o gestor vê esta área (contém salários).</div>");
  const L=f11Funcs().filter(f=>!f.desligado),C=L.map(f=>({f,c:f11Calc(f)})),T=f11Tab();
  return f11Aviso+`<div class="stats"><div class="stat"><b>${f6Money(soma(C,x=>x.c.sal))}</b><span>salários brutos (${C.length})</span></div><div class="stat"><b>${f6Money(soma(C,x=>x.c.custo))}</b><span>custo mensal total da equipe</span></div><div class="stat"><b>${f6Money(soma(C,x=>x.c.prov))}</b><span>provisão mensal (férias + 13º + encargos)</span></div></div>`
   +f6Card("Equipe e folha estimada","Cálculo simples de INSS, IRRF e vale-transporte pelas tabelas abaixo. É uma estimativa para planejamento; o holerite oficial sai da contabilidade.",
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f11fn">Novo integrante</button><button class="b sec" id="f11fl" ${C.length?"":"disabled"}>Lançar folha do mês a pagar</button><button class="b sec" id="f11fx" ${C.length?"":"disabled"}>Resumo (Excel)</button></div>`+(C.length?f6Tbl(["Integrante","Bruto","INSS","IRRF","VT","Líquido","FGTS","Custo total",""],[C.map(({f,c})=>`<tr><td><b>${f6Esc(f.nome)}</b><div class="sub">${f6Esc(f.cargo||"")}${f.admissao?" · desde "+brDate(f.admissao):""}</div></td><td class="n">${f6Money(c.sal)}</td><td class="n">${f6Money(c.inss)}</td><td class="n">${f6Money(c.irrf)}</td><td class="n">${f6Money(c.vt)}</td><td class="n"><b>${f6Money(c.liq)}</b></td><td class="n">${f6Money(c.fgts)}</td><td class="n">${f6Money(c.custo)}</td><td><button class="b sec sm" data-f11fe="${f.id}">Editar</button> <button class="b sec sm" data-f11fr="${f.id}">Rescisão</button></td></tr>`).join("")]):`<div class="empty">Nenhum integrante.</div>`))
   +f6Card("Tabelas de cálculo (confira todo ano)","Os valores iniciais são de referência e <b>podem estar desatualizados</b>. Confirme com o contador e ajuste. Formato: limite até; alíquota %; (IRRF) parcela a deduzir.",
    `<label>Faixas do INSS (limite; alíquota)</label><textarea id="f11ti" rows="4">${T.inss.map(x=>x.join("; ")).join("\n")}</textarea><label style="margin-top:6px">Faixas do IRRF (limite; alíquota; dedução). Use 1000000000 na última.</label><textarea id="f11tr" rows="5">${T.irrf.map(x=>x.join("; ")).join("\n")}</textarea><div class="row" style="margin-top:6px"><div><label>Dedução por dependente (R$)</label><input type="number" step="any" id="f11td" value="${T.depDed}" style="width:110px"></div><div><label>FGTS (%)</label><input type="number" step="any" id="f11tf" value="${T.fgts}" style="width:80px"></div><div><label>Encargos patronais (%)</label><input type="number" step="any" id="f11tp" value="${T.patronal}" style="width:80px"></div><button class="b" id="f11tsv" style="align-self:flex-end">Salvar tabelas</button></div>`);
}
function f11FuncEdit(id){
  const f=f11Funcs().find(x=>x.id===id)||{};
  f6Form(id?"Editar integrante":"Novo integrante",[{k:"nome",l:"Nome",v:f.nome||""},{k:"cargo",l:"Cargo",v:f.cargo||""},{k:"salario",l:"Salário bruto (R$)",t:"number",v:f.salario||""},{k:"admissao",l:"Admissão",t:"date",v:f.admissao||""},{k:"dep",l:"Dependentes para IRRF",t:"number",v:f.dep||0},{k:"vt",l:"Custo mensal do vale-transporte (R$)",t:"number",v:f.vt||0},{k:"vr",l:"Vale-refeição / alimentação pago (R$/mês)",t:"number",v:f.vr||0},{k:"outrosDesc",l:"Outros descontos fixos (R$)",t:"number",v:f.outrosDesc||0},{k:"desligado",l:"Desligado (sai dos cálculos)",t:"check",v:!!f.desligado}],v=>{
    if(!v.nome.trim()||!(v.salario>0))return"Informe nome e salário.";const reg={...f,...v,id:f.id||uid8(),nome:v.nome.trim()};f11save({func:id?f11Funcs().map(x=>x.id===id?reg:x):[...f11Funcs(),reg]});f6Go()});
}
function f11LancaFolha(){
  const mes=hojeIso().slice(0,7);
  f6Form("Lançar folha a pagar",[{k:"mes",l:"Competência (AAAA-MM)",v:mes},{k:"venc",l:"Vencimento dos salários",t:"date",v:`${mes}-05`},{k:"enc",l:"Vencimento das guias (FGTS)",t:"date",v:`${mes}-20`},{t:"note",l:"Cria uma conta a pagar por integrante (líquido) e uma de FGTS. Não duplica se já lançou esta competência."}],v=>{
    if(!/^\d{4}-\d{2}$/.test(v.mes)||!finDataOk(v.venc)||!finDataOk(v.enc))return"Confira competência e datas.";
    const L=f11Funcs().filter(f=>!f.desligado),ex=new Set(finAll().map(e=>e.folha11)),ents=[];
    L.forEach(f=>{const k=v.mes+"|"+f.id;if(ex.has(k))return;const c=f11Calc(f);ents.push({id:uid8(),tipo:"pagar",desc:`Salário ${v.mes.slice(5)}/${v.mes.slice(0,4)} — ${f.nome}`,contra:f.nome,fornId:finFornId(f.nome,null),cat:"Folha de pagamento",area:"",forma:"Transferência",valor:c.liq,venc:v.venc,pago:null,valorPago:null,comp:v.mes,folha11:k})});
    const kf=v.mes+"|fgts";if(!ex.has(kf)){const t=arred2(soma(L,f=>f11Calc(f).fgts+f11Calc(f).pat));if(t>0)ents.push({id:uid8(),tipo:"pagar",desc:`FGTS e encargos ${v.mes.slice(5)}/${v.mes.slice(0,4)}`,contra:"Governo / CAIXA",cat:"Encargos sociais",area:"",forma:"Boleto",valor:t,venc:v.enc,pago:null,valorPago:null,comp:v.mes,folha11:kf})}
    if(!ents.length)return"Esta competência já foi lançada.";finMutate(all=>[...all,...ents]);if(!ents.every(n=>finAll().some(e=>e.id===n.id)))return"Não foi possível lançar (permissão ou mês fechado).";toast(`${ents.length} conta(s) lançada(s).`);f6Go()});
}
function f11Rescisao(f,dem,tipo,aviso,fv){
  const T=f11Tab(),sal=+f.salario||0,adm=f.admissao||dem,anos=Math.floor(f11Meses(adm,dem)/12),dMes=new Date(+dem.slice(0,4),+dem.slice(5,7),0).getDate(),dia=+dem.slice(8,10);
  const saldo=arred2(sal/30*Math.min(dia,30));
  const avisoDias=tipo==="sem"&&aviso==="ind"?Math.min(90,30+3*anos):0,avisoV=arred2(sal/30*avisoDias);
  const ini=dem.slice(0,4)+"-01-01",mesesAno=Math.min(12,Math.max(0,f11Meses(adm>ini?adm:ini,dem)+(f11Meses(adm>ini?adm:ini,dem)>=0?1:0))),dias15=dia>=15;
  const av13=tipo==="justa"?0:Math.max(0,Math.min(12,(+dem.slice(5,7)-1)+(dia>=15?1:0)));
  const dec=arred2(sal/12*av13);
  const mFer=f11Meses(adm,dem)%12,avFer=tipo==="justa"?0:Math.min(12,mFer+(dia>=15&&true?0:0)),fer=arred2(sal/12*avFer),terco=arred2(fer/3),venc=arred2((fv||0)*(sal+sal/3));
  const fgtsSaldo=arred2(sal*T.fgts/100*Math.max(0,f11Meses(adm,dem)+1)),multa=tipo==="sem"?arred2(fgtsSaldo*0.4):0;
  const L=[["Saldo de salário ("+Math.min(dia,30)+" dias)",saldo],avisoDias?[`Aviso prévio indenizado (${avisoDias} dias)`,avisoV]:null,["13º proporcional ("+av13+"/12)",dec],["Férias proporcionais ("+avFer+"/12)",fer],["1/3 constitucional sobre férias proporcionais",terco],fv?[`Férias vencidas (${fv} período(s)) + 1/3`,venc]:null].filter(Boolean);
  const bruto=arred2(soma(L,x=>x[1])),inss=f11Inss(saldo+dec,T),liq=arred2(bruto-inss);
  return{L,bruto,inss,liq,multa,fgtsSaldo};
}
function f11RescForm(id){
  const f=f11Funcs().find(x=>x.id===id);
  f6Form("Estimar rescisão — "+f.nome,[{k:"dem",l:"Data do desligamento",t:"date",v:hojeIso()},{k:"tipo",l:"Tipo",t:"select",opts:[["sem","Demissão sem justa causa"],["pedido","Pedido de demissão"],["justa","Justa causa"]]},{k:"aviso",l:"Aviso prévio (só sem justa causa)",t:"select",opts:[["ind","Indenizado"],["trab","Trabalhado"]]},{k:"fv",l:"Períodos de férias vencidas não tiradas",t:"number",v:0},{t:"note",l:"Estimativa simplificada: não considera horas extras, adicionais, médias de comissão ou convenção coletiva. Confira com o contador."}],v=>{
    if(!finDataOk(v.dem))return"Data inválida.";const r=f11Rescisao(f,v.dem,v.tipo,v.aviso,v.fv||0);
    f5Pdf(`rescisao-estimada-${safe(f.nome).slice(0,20)}.pdf`,[{titulo:"Estimativa de rescisão",sub:`${f.nome} · desligamento em ${brDate(v.dem)} · salário ${fmtBRL(f.salario)} · valores estimados`,cols:[{h:"Verba",w:70},{h:"Valor",t:"money",w:16}],rows:[...r.L,["(−) INSS sobre salário e 13º",-r.inss],["Líquido estimado a pagar",r.liq],["Multa de 40% do FGTS (estimada, sobre depósito de "+fmtBRL(r.fgtsSaldo)+")",r.multa]]}]);});
}
f6Reg("folha","Contabilidade","Folha, provisões e rescisão",f11FolhaHtml,()=>{
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  g("f11fn",()=>f11FuncEdit());g("f11fl",f11LancaFolha);
  g("f11fx",()=>f5Xlsx(`folha-${hojeIso().slice(0,7)}.xlsx`,[{titulo:"Folha estimada",sub:"Estimativa para planejamento",cols:[{h:"Integrante",w:28},{h:"Bruto",t:"money",w:14},{h:"INSS",t:"money",w:12},{h:"IRRF",t:"money",w:12},{h:"VT",t:"money",w:12},{h:"Líquido",t:"money",w:14},{h:"FGTS",t:"money",w:12},{h:"Provisão mensal",t:"money",w:14},{h:"Custo total",t:"money",w:14}],rows:f11Funcs().filter(f=>!f.desligado).map(f=>{const c=f11Calc(f);return[f.nome,c.sal,c.inss,c.irrf,c.vt,c.liq,c.fgts,c.prov,c.custo]}),tot:[null,"sum","sum","sum","sum","sum","sum","sum","sum"]}]));
  document.querySelectorAll("[data-f11fe]").forEach(b=>b.onclick=()=>f11FuncEdit(b.dataset.f11fe));
  document.querySelectorAll("[data-f11fr]").forEach(b=>b.onclick=()=>f11RescForm(b.dataset.f11fr));
  g("f11tsv",()=>{const pr=t=>t.split("\n").map(l=>l.split(";").map(x=>f6Num(x.trim()))).filter(a=>a.length>=2&&a.every(isFinite));
    const inss=pr($("f11ti").value),irrf=pr($("f11tr").value);if(!inss.length||!irrf.length||irrf.some(a=>a.length<3))return toast("Confira as faixas (limite; alíquota; dedução).",true);
    f11save({tab:{inss,irrf,depDed:f6Num($("f11td").value),fgts:f6Num($("f11tf").value),patronal:f6Num($("f11tp").value)}});toast("Tabelas salvas.");f6Go()});
});
/* ---------- 5. obrigações fiscais e trabalhistas ---------- */
const F11_SUGESTOES=[{nome:"FGTS (guia mensal)",dia:20},{nome:"INSS / GPS e contribuições",dia:20},{nome:"Imposto do regime (DAS, ISS ou similar)",dia:20},{nome:"IRRF da folha (DARF)",dia:20},{nome:"Honorários do contador",dia:10}];
const f11Obrig=()=>f11cfg().obrig||[];
function f11ObrigProx(o){
  const h=hojeIso(),mes=h.slice(0,7),fe=f11cfg().obrigFeito||{},dia=Math.min(+o.dia,f10DiasMes(h));let d=`${mes}-${String(dia).padStart(2,"0")}`;
  if(fe[o.id+"|"+mes]){const n=addMesesIso(mes+"-01",1).slice(0,7);d=`${n}-${String(Math.min(+o.dia,f10DiasMes(n+"-01"))).padStart(2,"0")}`}
  return d;
}
function f11ObrigHtml(){
  const L=f11Obrig();
  return f11Aviso+f6Card("Calendário de obrigações","Cadastre o que vence todo mês com o dia combinado com o contador. O sistema avisa na tela inicial perto do vencimento e some o aviso quando você marca como feito.",
   `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f11on">Nova obrigação</button><button class="b sec" id="f11os">Carregar sugestões (confirme as datas)</button></div>`+(L.length?f6Tbl(["Obrigação","Dia","Próximo vencimento","Valor estimado",""],[L.map(o=>{const d=f11ObrigProx(o),n=daysBetweenIso(hojeIso(),d),fe=(f11cfg().obrigFeito||{})[o.id+"|"+hojeIso().slice(0,7)];return `<tr><td>${f6Esc(o.nome)}${fe?` <span class="sub">(${hojeIso().slice(5,7)}/${hojeIso().slice(0,4)} feito em ${brDate(fe)})</span>`:""}</td><td class="n">todo dia ${o.dia}</td><td class="n">${brDate(d)} ${n<0?f6Dot("#c62828")+"atrasada":n<=5?f6Dot("#e0a100")+"em "+n+" d":""}</td><td class="n">${o.valor?f6Money(o.valor):"—"}</td><td>${fe?"":`<button class="b sec sm" data-f11od="${o.id}">Marcar como feito</button> `}<button class="b sec sm" data-f11oe="${o.id}">Editar</button> <button class="b sec sm" data-f11ox="${o.id}">Excluir</button></td></tr>`}).join("")]):`<div class="empty">Nenhuma obrigação cadastrada.</div>`));
}
function f11ObrigEdit(id){
  const o=f11Obrig().find(x=>x.id===id)||{};
  f6Form(id?"Editar obrigação":"Nova obrigação",[{k:"nome",l:"Nome",v:o.nome||""},{k:"dia",l:"Dia do mês (1 a 31)",t:"number",v:o.dia||""},{k:"valor",l:"Valor estimado (R$, opcional)",t:"number",v:o.valor||""}],v=>{
    if(!v.nome.trim()||!(v.dia>=1&&v.dia<=31))return"Informe nome e dia entre 1 e 31.";const reg={...o,id:o.id||uid8(),nome:v.nome.trim(),dia:Math.round(v.dia),valor:v.valor||0};f11save({obrig:id?f11Obrig().map(x=>x.id===id?reg:x):[...f11Obrig(),reg]});f6Go()});
}
f6Reg("obrig","Contabilidade","Obrigações do mês",f11ObrigHtml,()=>{
  const g=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};g("f11on",()=>f11ObrigEdit());
  g("f11os",()=>{const ex=new Set(f11Obrig().map(o=>o.nome));f11save({obrig:[...f11Obrig(),...F11_SUGESTOES.filter(s=>!ex.has(s.nome)).map(s=>({...s,id:uid8()}))]});f6Go()});
  document.querySelectorAll("[data-f11oe]").forEach(b=>b.onclick=()=>f11ObrigEdit(b.dataset.f11oe));
  document.querySelectorAll("[data-f11ox]").forEach(b=>b.onclick=async()=>{if(await askConfirm("Excluir esta obrigação?","Excluir")){f11save({obrig:f11Obrig().filter(o=>o.id!==b.dataset.f11ox)});f6Go()}});
  document.querySelectorAll("[data-f11od]").forEach(b=>b.onclick=()=>{f11save({obrigFeito:{...(f11cfg().obrigFeito||{}),[b.dataset.f11od+"|"+hojeIso().slice(0,7)]:hojeIso()}});f6Go()});
});
/* ---------- 6. encerramento do exercício ---------- */
const F11_CHECK=["Todas as contas do ano foram lançadas e baixadas","Extratos bancários conciliados até 31/12","Contagem do caixa e do estoque feita em 31/12","Depreciação e provisões conferidas","Contas a receber vencidas analisadas (provisão ou baixa como perda)","Folha, 13º, férias e encargos do ano conferidos","Notas fiscais e comprovantes arquivados","Informes de rendimentos entregues às famílias","Pacote do contador exportado (diário e balancete)"];
function f11AnoResumo(ano){
  const y=String(ano),rec=finAll().filter(e=>e.tipo==="receber"&&e.pago&&!e.cancelada&&!e.semResultado&&e.pago.slice(0,4)===y),des=finAll().filter(e=>e.tipo==="pagar"&&e.pago&&!e.cancelada&&!e.semResultado&&e.pago.slice(0,4)===y);
  const r=soma(rec,finNum),d=soma(des,finNum),ate=`${y}-12-31`;
  return{r:arred2(r),d:arred2(d),res:arred2(r-d),contas:f4ContasPag().map(c=>({c,s:f4SaldoConta(c,ate)})),abRec:arred2(soma(f10Abertos().filter(e=>e.venc<=ate),e=>+e.valor)),abPag:arred2(soma(finAll().filter(e=>e.tipo==="pagar"&&!e.pago&&!e.cancelada&&e.venc<=ate),e=>+e.valor)),dep:arred2(soma(f11Bens().filter(b=>!b.baixa||b.baixa>ate),b=>f11Dep(b,ate).acum))};
}
function f11EncHtml(){
  const ano=F11.sim.enc||new Date().getFullYear()-(new Date().getMonth()<2?1:0),R=f11AnoResumo(ano),ck=(f11cfg().check||{})[ano]||{},fe=f4Fech(),fechado=fe>=`${ano}-12-31`;
  return f6Card(`Encerramento de ${ano}`,"Resumo do ano e lista de conferência antes de travar os lançamentos.",
   `<div class="row" style="align-items:flex-end"><div><label>Ano</label><select id="f11ea">${[0,1,2,3].map(i=>new Date().getFullYear()-i).map(y=>`<option ${y===+ano?"selected":""}>${y}</option>`).join("")}</select></div><button class="b sec" id="f11eg">Ver</button></div>
    <div class="stats" style="margin-top:10px"><div class="stat"><b>${f6Money(R.r)}</b><span>recebido no ano</span></div><div class="stat"><b>${f6Money(R.d)}</b><span>pago no ano</span></div><div class="stat ${R.res<0?"bad":""}"><b>${f6Money(R.res)}</b><span>resultado de caixa</span></div><div class="stat"><b>${f6Money(R.abRec)}</b><span>a receber em aberto (até 31/12)</span></div><div class="stat"><b>${f6Money(R.abPag)}</b><span>a pagar em aberto (até 31/12)</span></div><div class="stat"><b>${f6Money(R.dep)}</b><span>depreciação acumulada</span></div></div>
    <h4 style="margin:12px 0 4px">Saldos das contas em 31/12 (viram saldo inicial do ano seguinte)</h4>${f6Tbl(["Conta","Saldo"],[R.contas.map(x=>`<tr><td>${f6Esc(x.c.nome)}</td><td class="n">${f6Money(x.s)}</td></tr>`).join("")])}
    <h4 style="margin:12px 0 4px">Lista de conferência</h4>${F11_CHECK.map((t,i)=>`<label style="display:flex;gap:8px;font-weight:400;margin:4px 0"><input type="checkbox" data-f11ck="${i}" ${ck[i]?"checked":""}> ${t}</label>`).join("")}
    <div class="row" style="margin-top:12px">${fechado?`<span class="pill s-ok">Lançamentos travados até ${brDate(fe)}</span>`:`<button class="b" id="f11ef" ${f4Gestor()?"":"disabled"}>Travar o ano ${ano} (31/12)</button>`}<button class="b sec" id="f11ep">Resumo do ano (PDF)</button></div>`);
}
f6Reg("enc","Contabilidade","Encerramento do ano",f11EncHtml,()=>{
  const ano=()=>F11.sim.enc||new Date().getFullYear()-(new Date().getMonth()<2?1:0);
  $("f11eg").onclick=()=>{F11.sim.enc=+$("f11ea").value;f6Go()};
  document.querySelectorAll("[data-f11ck]").forEach(c=>c.onchange=()=>{const k=f11cfg().check||{};f11save({check:{...k,[ano()]:{...(k[ano()]||{}),[c.dataset.f11ck]:c.checked}}})});
  const f=$("f11ef");if(f)f.onclick=async()=>{const a=ano(),ck=(f11cfg().check||{})[a]||{},falta=F11_CHECK.filter((_,i)=>!ck[i]).length;
    if(!await askConfirm(falta?`Ainda há ${falta} item(ns) da lista sem marcar. Travar ${a} mesmo assim?`:`Travar todos os lançamentos até 31/12/${a}?`,"Travar"))return;f7FechaMes(`${a}-12-31`)};
  $("f11ep").onclick=()=>{const a=ano(),R=f11AnoResumo(a);f5Pdf(`resumo-${a}.pdf`,[{titulo:`Resumo do exercício de ${a}`,sub:empresa().razao,cols:[{h:"Item",w:60},{h:"Valor",t:"money",w:18}],rows:[["Recebido no ano",R.r],["Pago no ano",R.d],["Resultado de caixa",R.res],["A receber em aberto até 31/12",R.abRec],["A pagar em aberto até 31/12",R.abPag],["Depreciação acumulada",R.dep],...R.contas.map(x=>["Saldo em 31/12 — "+x.c.nome,x.s])]}])};
});
/* ---------- avisos ---------- */
const _urg11=urgencias;
urgencias=function(per){const L=_urg11(per);try{if(podeVer("fin")){const h=hojeIso();
  f11Obrig().forEach(o=>{const d=f11ObrigProx(o),n=daysBetweenIso(h,d);if(n<=5)L.push({nivel:n<0?3:n<=2?2:1,tipo:"Financeiro",titulo:`${o.nome} ${n<0?"venceu":n===0?"vence hoje":"vence em "+n+" dia(s)"}`,detalhe:o.valor?`Estimado ${fmtBRL(o.valor)}`:"",quando:d,rota:"fin"})});
  f11Bens().forEach(b=>{if(b.baixa||!b.garantia)return;const n=daysBetweenIso(h,b.garantia);if(n>=0&&n<=30)L.push({nivel:1,tipo:"Financeiro",titulo:`Garantia de ${b.nome} acaba em ${n} dia(s)`,detalhe:"Confira se há defeito a reclamar",quando:b.garantia,rota:"fin"})})}}catch(e){console.error(e)}return L};


/* >>> x_m0.js */
