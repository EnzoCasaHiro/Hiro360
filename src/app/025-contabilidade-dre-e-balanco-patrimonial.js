/* ================= CONTABILIDADE: DRE e BALANÇO PATRIMONIAL GERENCIAIS ================= */
const GRUPOS={
 receita:{r:"Receita de serviços",b:"rec"},deducao:{r:"Deduções da receita (impostos sobre serviços)",b:"ded"},
 csp_alim:{r:"Alimentação",b:"csp"},csp_assist:{r:"Insumos assistenciais e de saúde",b:"csp"},csp_limp:{r:"Limpeza e higiene",b:"csp"},csp_pessoal:{r:"Pessoal assistencial",b:"csp"},
 dop_pessoal:{r:"Pessoal administrativo",b:"dop"},dop_ocup:{r:"Ocupação (aluguel, água, luz, internet)",b:"dop"},dop_manut:{r:"Manutenção e reformas",b:"dop"},dop_terc:{r:"Serviços de terceiros e prestadores",b:"dop"},
 dop_adm:{r:"Administrativas e gerais",b:"dop"},dop_mkt:{r:"Marketing e comunicação",b:"dop"},dop_trib:{r:"Tributárias e taxas",b:"dop"},
 fin_rec:{r:"Receitas financeiras",b:"fin"},fin_desp:{r:"Despesas financeiras",b:"fin"},
 imob:{r:"Aquisição de imobilizado → vai para o balanço",b:"imob"},emprestimo:{r:"Empréstimos e financiamentos → vai para o balanço",b:"emp"},socios:{r:"Aportes e retiradas dos sócios → vai para o balanço",b:"socios"}};
const BLOCOS_ROT={rec:"Receita",ded:"Deduções",csp:"Custos dos serviços prestados",dop:"Despesas operacionais",fin:"Resultado financeiro",imob:"Balanço",emp:"Balanço",socios:"Balanço"};
function grupoPadrao(cat,sinal){
  const c=estNorm(cat);
  if(/emprestimo|financiamento/.test(c))return"emprestimo";
  if(/socio|aporte|retirada|pro labore|distribuicao de lucro/.test(c))return"socios";
  if(/imobilizado|equipamento|movel|moveis|veiculo|investimento|aquisicao/.test(c))return"imob";
  if(/juros|rendimento|tarifa|iof|multa|bancari/.test(c))return sinal>0?"fin_rec":"fin_desp";
  if(sinal>0)return/deduc|abatimento|devolucao/.test(c)?"deducao":"receita";
  if(/imposto|\bdas\b|\biss\b|tributo|alvara|taxa/.test(c))return"dop_trib";
  if(/folha|salario|encargo|fgts|inss|ferias|decimo|plantao|cuidador/.test(c))return"csp_pessoal";
  if(/enfermagem|medic|farmac|\bepi\b|luva|fralda|curativo|assistenc|fisio|saude/.test(c))return"csp_assist";
  if(/aliment|cozinha|mercado|hortifruti|padaria|refeic|cesta/.test(c))return"csp_alim";
  if(/limpeza|higiene|lavanderia|descartav/.test(c))return"csp_limp";
  if(/aluguel|energia|\bluz\b|agua|internet|telefone|condominio|iptu|ocupacao/.test(c))return"dop_ocup";
  if(/manutencao|reforma|conserto|\bobra|construcao|reparo/.test(c))return"dop_manut";
  if(/prestador|terceir|autonomo|\brpa\b|consultoria/.test(c))return"dop_terc";
  if(/marketing|propaganda|publicidade|anuncio|comunicacao/.test(c))return"dop_mkt";
  if(/escritorio|papelaria|administrativ|contabil|software|sistema/.test(c))return"dop_adm";
  return null;
}
const contabCfg=()=>f5ContabCfg({inicio:"",caixa0:0,imob0:0,deprec0:0,emp0:0,taxaDeprec:10,ativosOutros:[],passivosOutros:[],mapa:{},regime:"competencia",...(S.config.contab||{})});
function grupoDe(cat,sinal){
  const m=(contabCfg().mapa||{})[estNorm(cat)];
  if(m&&GRUPOS[m])return{g:m,auto:false};
  const p=grupoPadrao(cat,sinal);
  return p?{g:p,auto:true}:{g:sinal>0?"receita":"dop_adm",auto:true,sem:true};
}
function contabInicio(){
  const c=contabCfg();if(c.inicio)return c.inicio;
  const ds=[...finAll().map(e=>e.venc),...(((S.config.nf&&S.config.nf.rows)||[]).map(r=>r.date))].filter(Boolean).sort();
  return ds.length?ds[0].slice(0,4)+"-01-01":`${new Date().getFullYear()}-01-01`;
}
// uma lista única de fatos econômicos: contas a pagar/receber e notas fiscais que ainda não viraram conta a pagar
function contabEventos(){
  const ini=contabInicio(),out=[];
  finAll().forEach(e=>{
    const sinal=e.tipo==="receber"?1:-1,val=e.pago?finNum(e):+e.valor,comp=(e.comp&&/^\d{4}-\d{2}$/.test(e.comp))?e.comp+"-01":(e.pago&&e.pago<e.venc?e.pago:e.venc);
    if(comp<ini||!(val>0))return;
    const cat=e.cat||"Sem categoria",gr=grupoDe(cat,sinal);
    out.push({comp,pago:e.pago||null,sinal,val,cat,grupo:gr.g,sem:!!gr.sem,origem:"fin",desc:e.desc});
  });
  (((S.config.nf&&S.config.nf.rows)||[])).forEach(r=>{
    if(r.viaFin||!r.date||r.date<ini||!(r.total>0))return;
    const cat=r.categoria||"Sem categoria",gr=grupoDe(cat,-1);
    out.push({comp:r.date,pago:r.date,sinal:-1,val:r.total,cat,grupo:gr.g,sem:!!gr.sem,origem:"nf",desc:r.item});
  });
  return out;
}
function estoqueEm(D){
  const movs=movAll();
  return soma(estData().itens,it=>{
    const depois=soma(movs.filter(m=>m.item===it.id&&m.data>D),m=>+m.delta||0);
    return Math.max(0,(+it.qtd||0)-depois)*(+it.custo||0);
  });
}
function deprecMeses(ate,ev){
  const c=contabCfg(),ini=contabInicio(),imob=(ev||contabEventos()).filter(e=>GRUPOS[e.grupo].b==="imob"),out=[];
  let acum=+c.deprec0||0,y=+ini.slice(0,4),m=+ini.slice(5,7)-1;
  for(let k=0;k<1200;k++){
    const fim=isoDate(new Date(y,m+1,0));if(fim>ate)break;
    const custo=(+c.imob0||0)+soma(imob.filter(e=>e.comp<=fim),e=>-e.sinal*e.val);
    const v=Math.max(0,Math.min(custo*(+c.taxaDeprec||0)/1200,custo-acum));acum+=v;out.push({fim,valor:v,acum});
    m++;if(m>11){m=0;y++}
  }
  return out;
}
// ----- DRE -----
function dreLinhas(ini,fim,regime){
  const ev=contabEventos(),s={};Object.keys(GRUPOS).forEach(k=>s[k]=0);
  ev.forEach(e=>{const d=regime==="caixa"?e.pago:e.comp;if(!d||d<ini||d>fim)return;s[e.grupo]+=e.sinal*e.val});
  const comp=regime!=="caixa",dep=comp?soma(deprecMeses(fim,ev).filter(x=>x.fim>=ini),x=>x.valor):0;
  const dEst=comp?estoqueEm(fim)-estoqueEm(addDaysIso(ini,-1)):0;
  const L=[],lin=(k,r,v,est,n)=>L.push({k,r,v,est:est||"",n:n||0});
  const bloco=b=>Object.keys(GRUPOS).filter(k=>GRUPOS[k].b===b);
  const rec=s.receita;lin("rec","Receita bruta de serviços",rec,"h");
  lin("ded","(−) Deduções da receita",s.deducao,"");
  const liq=rec+s.deducao;lin("liq","(=) Receita líquida",liq,"t");
  bloco("csp").forEach(k=>lin(k,"(−) "+GRUPOS[k].r,s[k],"",1));
  if(comp)lin("dest","(+/−) Variação de estoques (compras não consumidas)",dEst,"",1);
  const custos=soma(bloco("csp"),k=>s[k])+dEst;lin("csp","(=) Total dos custos dos serviços",custos,"t");
  const bruto=liq+custos;lin("bruto","(=) Lucro bruto",bruto,"t");
  bloco("dop").forEach(k=>lin(k,"(−) "+GRUPOS[k].r,s[k],"",1));
  if(comp)lin("dep","(−) Depreciação",-dep,"",1);
  const desp=soma(bloco("dop"),k=>s[k])-dep;lin("dop","(=) Total das despesas operacionais",desp,"t");
  const op=bruto+desp;lin("op","(=) Resultado operacional",op,"t");
  lin("fin_rec","(+) "+GRUPOS.fin_rec.r,s.fin_rec,"",1);lin("fin_desp","(−) "+GRUPOS.fin_desp.r,s.fin_desp,"",1);
  const res=op+s.fin_rec+s.fin_desp;lin("res","(=) Resultado do período, antes de IR e CSLL",res,"g");
  return{linhas:L,res,rec,liq,dep,dEst};
}
function periodoContab(ano,mes){
  if(mes<0)return{ini:`${ano}-01-01`,fim:`${ano}-12-31`,pIni:`${ano-1}-01-01`,pFim:`${ano-1}-12-31`,rot:`Ano de ${ano}`,pRot:`Ano de ${ano-1}`};
  const pm=mes?mes-1:11,py=mes?ano:ano-1;
  return{ini:isoDate(new Date(ano,mes,1)),fim:isoDate(new Date(ano,mes+1,0)),pIni:isoDate(new Date(py,pm,1)),pFim:isoDate(new Date(py,pm+1,0)),rot:`${MESES_PT[mes]} de ${ano}`,pRot:`${MESES_PT[pm]} de ${py}`};
}
function dreComparada(ano,mes,regime){
  const p=periodoContab(ano,mes),a=dreLinhas(p.ini,p.fim,regime),b=dreLinhas(p.pIni,p.pFim,regime),mb=Object.fromEntries(b.linhas.map(l=>[l.k,l.v]));
  const linhas=a.linhas.map(l=>({...l,prev:mb[l.k]||0})).filter(l=>l.est||l.n===0||Math.abs(l.v)>0.004||Math.abs(l.prev)>0.004);
  return{p,linhas,res:a.res,resPrev:b.res};
}
// ----- Balanço -----
function bpCalc(D){
  const c=contabCfg(),ini=contabInicio(),ev=contabEventos();
  let caixa=+c.caixa0||0,ar=0,ap=0,socios=0,res=0,emp=+c.emp0||0,custoImob=+c.imob0||0;
  ev.forEach(e=>{
    if(e.comp>D)return;
    const v=e.sinal*e.val;
    if(e.pago&&e.pago<=D)caixa+=v;else if(e.sinal>0)ar+=e.val;else ap+=e.val;
    const b=GRUPOS[e.grupo].b;
    if(b==="imob")custoImob-=v;else if(b==="emp")emp+=v;else if(b==="socios")socios+=v;else res+=v;
  });
  const estAb=estoqueEm(addDaysIso(ini,-1)),estD=estoqueEm(D),dm=deprecMeses(D,ev),acum=dm.length?dm[dm.length-1].acum:(+c.deprec0||0),depPer=acum-(+c.deprec0||0);
  res+=(estD-estAb)-depPer;
  const aO=c.ativosOutros||[],pO=c.passivosOutros||[],s=(l,f)=>soma(l.filter(f),x=>+x.valor||0);
  const pl0=(+c.caixa0||0)+estAb+(+c.imob0||0)-(+c.deprec0||0)+soma(aO,x=>+x.valor||0)-soma(pO,x=>+x.valor||0)-(+c.emp0||0);
  const aC=s(aO,x=>x.circ),aN=s(aO,x=>!x.circ),pC=s(pO,x=>x.circ),pN=s(pO,x=>!x.circ);
  const circ=caixa+ar+estD+aC,naoCirc=custoImob-acum+aN,ativo=circ+naoCirc;
  const pcirc=ap+pC,pnc=emp+pN,pl=pl0+res+socios,passivo=pcirc+pnc+pl;
  const L=[],lin=(r,v,est,n)=>L.push({r,v,est:est||"",n:n||0});
  lin("ATIVO",null,"h");lin("Circulante",null,"s");
  lin("Caixa e bancos",caixa,"",1);lin("Contas a receber",ar,"",1);lin("Estoques (valorizados pelo último custo)",estD,"",1);if(aC)lin("Outros ativos circulantes",aC,"",1);
  lin("Total do ativo circulante",circ,"t");lin("Não circulante",null,"s");
  lin("Imobilizado (custo)",custoImob,"",1);lin("(−) Depreciação acumulada",-acum,"",1);if(aN)lin("Outros ativos não circulantes",aN,"",1);
  lin("Total do ativo não circulante",naoCirc,"t");lin("TOTAL DO ATIVO",ativo,"g");
  lin("PASSIVO E PATRIMÔNIO LÍQUIDO",null,"h");lin("Passivo circulante",null,"s");
  lin("Fornecedores e contas a pagar",ap,"",1);if(pC)lin("Outros passivos circulantes",pC,"",1);lin("Total do passivo circulante",pcirc,"t");
  lin("Passivo não circulante",null,"s");lin("Empréstimos e financiamentos",emp,"",1);if(pN)lin("Outros passivos não circulantes",pN,"",1);lin("Total do passivo não circulante",pnc,"t");
  lin("Patrimônio líquido",null,"s");lin("Patrimônio de abertura (saldos iniciais)",pl0,"",1);lin("Aportes e retiradas dos sócios",socios,"",1);lin("Resultado acumulado desde o início",res,"",1);
  lin("Total do patrimônio líquido",pl,"t");lin("TOTAL DO PASSIVO + PATRIMÔNIO LÍQUIDO",passivo,"g");
  return{linhas:L,ativo,passivo,pl,dif:ativo-passivo,res,caixa};
}
function contabAvisos(){
  const c=contabCfg(),ev=contabEventos(),av=[];
  if(!ev.length)av.push("Ainda não há contas a pagar, contas a receber nem notas fiscais no período — a DRE e o balanço ficam vazios até haver lançamentos.");
  if(!(+c.caixa0)&&!c.inicio)av.push("O saldo de caixa de abertura não foi informado (aba Saldos de abertura). Sem ele, “Caixa e bancos” mostra só o que se movimentou nos lançamentos.");
  const sem=ev.filter(e=>e.sem);if(sem.length)av.push(`${new Set(sem.map(e=>estNorm(e.cat))).size} categoria(s) sem classificação (${fmtBRL(soma(sem,e=>e.val))}) estão em “Administrativas e gerais” — classifique no Plano de contas.`);
  const semCusto=estData().itens.filter(i=>+i.qtd>0&&!(+i.custo>0)).length;if(semCusto)av.push(`${semCusto} item(ns) do estoque estão sem custo e entram valendo R$ 0,00 — dê entrada pela nota fiscal ou informe o valor.`);
  if(!ev.some(e=>GRUPOS[e.grupo].b==="csp"&&/pessoal/.test(e.grupo)||e.grupo==="dop_pessoal"))av.push("Não há folha de pagamento nem encargos lançados. Lance a folha em Contas a pagar (categoria “Folha de pagamento”) para o custo de pessoal aparecer.");
  return av;
}
function contabCategorias(){
  const m={};
  contabEventos().forEach(e=>{const k=estNorm(e.cat),o=m[k]=m[k]||{cat:e.cat,n:0,total:0,orig:new Set(),sinal:0};o.n++;o.total+=e.val;o.orig.add(e.origem==="nf"?"notas fiscais":"financeiro");o.sinal+=e.sinal});
  return Object.entries(m).map(([k,o])=>{const gr=grupoDe(o.cat,o.sinal>=0?1:-1);return{k,...o,orig:[...o.orig].join(" + "),g:gr.g,auto:gr.auto,sem:!!gr.sem}}).sort((a,b)=>b.total-a.total);
}
/* ---------- tela ---------- */
const CTB={tab:"dre",ano:new Date().getFullYear(),mes:new Date().getMonth(),cmp:true};
const CTB_TABS=[["dre","DRE"],["bp","Balanço patrimonial"],["ct","Contratos e compromissos"],["plano","Plano de contas"],["abertura","Saldos de abertura"]];
function ctbPeriodoHtml(){
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-4,CTB.ano);y<=Math.max(y0+2,CTB.ano);y++)anos.push(y);
  return `<div class="row" style="align-items:flex-end;margin-bottom:10px"><button type="button" class="b sec sm" id="cbprev" style="flex:none">◀</button>
   <div><label>Período</label><select id="cbmes"><option value="-1" ${CTB.mes<0?"selected":""}>Ano inteiro</option>${MESES_PT.map((m,k)=>`<option value="${k}" ${CTB.mes===k?"selected":""}>${m}</option>`).join("")}</select></div>
   <div><label>Ano</label><select id="cbano">${anos.map(y=>`<option ${y===CTB.ano?"selected":""}>${y}</option>`).join("")}</select></div>
   <button type="button" class="b sec sm" id="cbnext" style="flex:none">▶</button></div>`;
}
const AVISO_GERENCIAL=`<div class="callout sand" style="margin-bottom:14px"><b>Demonstração gerencial.</b> Calculada automaticamente a partir das notas fiscais, das contas a pagar e a receber e do estoque. Ajuda a decidir, mas <b>não substitui a contabilidade oficial</b> — o contador confere antes de qualquer uso fiscal.</div>`;
function linhaTab(l,cols){
  const g=l.est==="g",st=l.est==="h"?"font-weight:700;background:var(--verde-palido)":l.est==="s"?"font-weight:700;background:var(--areia-esc)":l.est==="t"?"font-weight:700;background:var(--bege)":g?"font-weight:700;background:var(--verde-esc);color:#fff":"";
  const cel=c=>c==null?"":typeof c==="object"?(g?`<span style="color:#fff">${fmtBRL(c.n)}</span>`:c.mute?`<span class="sub">${fmtBRL(c.n)}</span>`:finMoney(c.n)):`<span${g?' style="color:#fff"':""}>${c}</span>`;
  return `<tr style="${st}"><td style="${l.n?`padding-left:${12+l.n*14}px`:""}">${esc(l.r)}</td>${cols.map(c=>`<td class="n">${cel(c)}</td>`).join("")}</tr>`;
}
function pgContab(){
  const reg=contabCfg().regime;let corpo="";
  if(CTB.tab==="dre"){
    const d=dreComparada(CTB.ano,CTB.mes,reg),pc=(v,p)=>p?`${(((v-p)/Math.abs(p))*100).toFixed(1).replace(".",",")}%`:"—";
    corpo=AVISO_GERENCIAL+`<div class="card"><h2>DRE — Demonstração do Resultado</h2>${ctbPeriodoHtml()}
     <div class="row" style="margin-bottom:10px"><div style="flex:0 0 260px"><label>Regime</label><select id="cbreg"><option value="competencia" ${reg!=="caixa"?"selected":""}>Competência (vencimento)</option><option value="caixa" ${reg==="caixa"?"selected":""}>Caixa (data do pagamento)</option></select></div></div>
     <div class="wrap"><table><thead><tr><th>Descrição</th><th class="n">${d.p.rot}</th><th class="n">${d.p.pRot}</th><th class="n">Variação</th></tr></thead><tbody>
     ${d.linhas.map(l=>linhaTab(l,[{n:l.v},{n:l.prev,mute:true},pc(l.v,l.prev)])).join("")}</tbody></table></div>
     <p class="sub" style="margin:10px 0 0">${reg==="caixa"?"No regime de caixa só entram os valores já pagos ou recebidos no período; depreciação e variação de estoque não se aplicam.":"Receitas e despesas entram pelo vencimento (ou pelo pagamento, se antecipado). Compras de itens que ficaram no estoque não pesam no resultado: a “variação de estoques” ajusta isso."}</p></div>`;
  }else if(CTB.tab==="bp"){
    const p=periodoContab(CTB.ano,CTB.mes),b=bpCalc(p.fim);
    corpo=AVISO_GERENCIAL+`<div class="card"><h2>Balanço patrimonial em ${brDate(p.fim)}</h2>${ctbPeriodoHtml()}
     <div class="wrap"><table><thead><tr><th>Conta</th><th class="n">Valor</th></tr></thead><tbody>${b.linhas.map(l=>linhaTab(l,[l.v==null?null:{n:l.v}])).join("")}</tbody></table></div>
     <p class="sub" style="margin:10px 0 0">${Math.abs(b.dif)<0.01?"Conferência: ativo e passivo + patrimônio líquido fecham.":`<b>Atenção:</b> há diferença de ${fmtBRL(b.dif)} entre ativo e passivo + patrimônio líquido. Avise o suporte — isso não deveria acontecer.`}</p></div>`;
  }else if(CTB.tab==="ct"){corpo=ctListaHtml()}
  else if(CTB.tab==="plano"){
    const cs=contabCategorias(),OPTG=[["Receita",["receita"]],["Deduções da receita",["deducao"]],["Custos dos serviços prestados",Object.keys(GRUPOS).filter(k=>GRUPOS[k].b==="csp")],["Despesas operacionais",Object.keys(GRUPOS).filter(k=>GRUPOS[k].b==="dop")],["Resultado financeiro",["fin_rec","fin_desp"]],["Vai para o balanço (não é despesa)",["imob","emprestimo","socios"]]];
    const opt=sel=>OPTG.map(([t,ks])=>`<optgroup label="${t}">${ks.map(k=>`<option value="${k}" ${k===sel?"selected":""}>${esc(GRUPOS[k].r)}</option>`).join("")}</optgroup>`).join("");
    corpo=`<div class="card"><h2>Plano de contas simplificado</h2><p class="sub" style="margin:0 0 10px">Cada categoria usada nas notas fiscais e no Financeiro vai para uma linha da DRE ou do balanço. O sistema sugere pelo nome; <b>você pode trocar</b>, e a escolha vale para tudo.</p>
     ${cs.length?`<div class="wrap"><table><thead><tr><th>Categoria</th><th>Origem</th><th class="n">Lançamentos</th><th class="n">Total</th><th>Vai para</th><th></th></tr></thead><tbody>
     ${cs.map(c=>`<tr><td><b>${esc(c.cat)}</b></td><td class="sub">${esc(c.orig)}</td><td class="n">${c.n}</td><td class="n">${fmtBRL(c.total)}</td>
      <td><select data-cbmap="${esc(c.k)}">${opt(c.g)}</select>${c.sem?` <span class="pill s-pendencia">sem classificação</span>`:c.auto?` <span class="pill s-ok">sugerido</span>`:` <span class="pill s-atestado">definido por você</span>`}</td>
      <td>${c.auto?"":`<button class="b sec sm" data-cbauto="${esc(c.k)}" title="Voltar ao sugerido">${ic("undo")}</button>`}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Ainda não há lançamentos para classificar.</div>`}</div>`;
  }else{
    const c=contabCfg(),pl0=(+c.caixa0||0)+estoqueEm(addDaysIso(contabInicio(),-1))+(+c.imob0||0)-(+c.deprec0||0)+soma(c.ativosOutros,x=>+x.valor||0)-soma(c.passivosOutros,x=>+x.valor||0)-(+c.emp0||0);
    const lista=(arr,k,tit)=>`<h2 style="margin-top:16px">${tit}</h2>${arr.length?arr.map(x=>`<div class="doc"><div class="grow"><div class="nm">${esc(x.nome)}</div><div class="sub">${x.circ?"circulante":"não circulante"}</div></div><b>${fmtBRL(x.valor)}</b><button class="b sec sm" data-cbrm="${k}|${x.id}">${ic("trash")}</button></div>`).join(""):`<div class="sub">Nenhum.</div>`}
      <div class="row" style="margin-top:8px;align-items:flex-end"><input id="cbn_${k}" placeholder="Nome (ex.: adiantamento, salários a pagar)"><input type="number" min="0" id="cbv_${k}" placeholder="Valor (R$)" class="has-step"><select id="cbc_${k}" style="flex:0 0 160px"><option value="1">Circulante</option><option value="0">Não circulante</option></select><button class="b sec sm" data-cbadd="${k}" style="flex:none">${ic("plus")} Adicionar</button></div>`;
    corpo=`<div class="card"><h2>Saldos de abertura</h2><p class="sub" style="margin:0 0 10px">Como estava a casa no início da contabilidade. O patrimônio de abertura é calculado a partir destes saldos: <b>${fmtBRL(pl0)}</b>.</p>
     <div class="row"><div><label>Início da contabilidade</label><input type="date" id="cbini" value="${c.inicio||contabInicio()}"></div><div><label>Caixa e bancos (R$)</label><input type="number" id="cbcaixa" value="${c.caixa0||""}" placeholder="0"></div>
      <div><label>Empréstimos e financiamentos (R$)</label><input type="number" id="cbemp" value="${c.emp0||""}" placeholder="0"></div></div>
     <div class="row" style="margin-top:8px"><div><label>Imobilizado — custo (R$)</label><input type="number" id="cbimob" value="${c.imob0||""}" placeholder="0"></div><div><label>Depreciação acumulada (R$)</label><input type="number" id="cbdep" value="${c.deprec0||""}" placeholder="0"></div>
      <div><label>Depreciação por ano (%)</label><input type="number" id="cbtaxa" min="0" max="100" value="${c.taxaDeprec}"></div></div>
     ${lista(c.ativosOutros,"a","Outros ativos")}${lista(c.passivosOutros,"p","Outros passivos")}</div>`;
  }
  return banner("","Contabilidade","DRE e balanço patrimonial gerados sozinhos, com contratos e compromissos de gasto.","chart")+noStore()+`<div class="tabs">${CTB_TABS.map(([k,l])=>`<button data-cbtab="${k}" class="${CTB.tab===k?"on":""}">${l}</button>`).join("")}</div>`+corpo+(CTB.tab==="dre"||CTB.tab==="bp"?(()=>{const av=contabAvisos();return av.length?`<div class="card"><h2>O que melhoraria este resultado</h2>${av.map(a=>`<div class="doc atn"><div class="grow"><div class="sub" style="color:var(--ink)">${esc(a)}</div></div></div>`).join("")}</div>`:""})():"");
}
function bindContab(){
  const re=()=>go("contab",true),later=()=>setTimeout(re,0),salva=patch=>put("config","contab",{...strip(contabCfg()),...patch});
  document.querySelectorAll("[data-cbtab]").forEach(b=>b.onclick=()=>{CTB.tab=b.dataset.cbtab;re()});
  const m=$("cbmes");if(m){
    m.onchange=()=>{CTB.mes=+m.value;re()};$("cbano").onchange=e=>{CTB.ano=+e.target.value;re()};
    $("cbprev").onclick=()=>{if(CTB.mes<0)CTB.ano--;else{CTB.mes--;if(CTB.mes<0){CTB.mes=11;CTB.ano--}}re()};
    $("cbnext").onclick=()=>{if(CTB.mes<0)CTB.ano++;else{CTB.mes++;if(CTB.mes>11){CTB.mes=0;CTB.ano++}}re()};
  }
  const rg=$("cbreg");if(rg)rg.onchange=()=>{salva({regime:rg.value});re()};
  document.querySelectorAll("[data-cbmap]").forEach(s=>s.onchange=()=>{salva({mapa:{...(contabCfg().mapa||{}),[s.dataset.cbmap]:s.value}});toast("Classificação salva.");re()});
  document.querySelectorAll("[data-cbauto]").forEach(b=>b.onclick=()=>{const mp={...(contabCfg().mapa||{})};delete mp[b.dataset.cbauto];salva({mapa:mp});re()});
  [["cbini","inicio",v=>v],["cbcaixa","caixa0",v=>+v||0],["cbemp","emp0",v=>+v||0],["cbimob","imob0",v=>+v||0],["cbdep","deprec0",v=>+v||0],["cbtaxa","taxaDeprec",v=>Math.max(0,Math.min(100,+v||0))]].forEach(([id,k,f])=>{
    const el=$(id);if(el)el.onchange=()=>{salva({[k]:f(el.value)});toast("Saldo salvo.");later()};
  });
  document.querySelectorAll("[data-cbadd]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.cbadd,nome=$("cbn_"+k).value.trim(),valor=+$("cbv_"+k).value;
    if(!nome||!(valor>0))return toast("Informe o nome e um valor maior que zero.",true);
    const campo=k==="a"?"ativosOutros":"passivosOutros";salva({[campo]:[...contabCfg()[campo],{id:uid8(),nome,valor,circ:$("cbc_"+k).value==="1"}]});re();
  });
  document.querySelectorAll("[data-cbrm]").forEach(b=>b.onclick=()=>{const[k,id]=b.dataset.cbrm.split("|"),campo=k==="a"?"ativosOutros":"passivosOutros";salva({[campo]:contabCfg()[campo].filter(x=>x.id!==id)});re()});
  bindCt();
}
/* ---------- relatórios de contabilidade e de prestadores ---------- */
function specDre(c){
  const reg=contabCfg().regime,d=dreComparada(c.ano,c.mes,reg),pc=(v,p)=>p?((v-p)/Math.abs(p))*100:null;
  return{titulo:"DRE",sub:`${d.p.rot} (${reg==="caixa"?"regime de caixa":"regime de competência"}) · demonstração gerencial — não substitui a contabilidade oficial · ${relSub({},false)}`,sensivel:false,
   cols:[{h:"Descrição",w:56},{h:d.p.rot,t:"money",w:18},{h:d.p.pRot,t:"money",w:18},{h:"Variação",t:"pct",w:12}],rows:d.linhas.map(l=>[l.r,l.v,l.prev,pc(l.v,l.prev)]),estilo:d.linhas.map(l=>l.est)};
}
function specBp(c){
  const p=periodoContab(c.ano,c.mes),b=bpCalc(p.fim);
  return{titulo:"Balanço patrimonial",sub:`Posição em ${brDate(p.fim)} · demonstração gerencial — não substitui a contabilidade oficial · ${relSub({},false)}`,sensivel:false,
   cols:[{h:"Conta",w:60},{h:"Valor",t:"money",w:20}],rows:b.linhas.map(l=>[l.r,l.v]),estilo:b.linhas.map(l=>l.est)};
}
function specContratos(){
  const l=ctAll().map(c=>({c,i:ctInfo(c)})).sort((a,b)=>(a.i.encerrado-b.i.encerrado)||((a.c.fim||"9999").localeCompare(b.c.fim||"9999")));
  return{titulo:"Contratos e compromissos",sub:relSub({},false),sensivel:false,
   cols:[{h:"Contraparte",w:28},{h:"Objeto",w:34},{h:"Tipo",w:20},{h:"Pagamento",w:16},{h:"Valor",t:"money",w:14},{h:"Início",t:"date",w:12},{h:"Fim",t:"date",w:12},{h:"Situação",w:18},{h:"Comprometido",t:"money",w:15},{h:"Já pago",t:"money",w:14},{h:"Ainda a gastar",t:"money",w:15}],
   rows:l.map(({c,i})=>[ctNome(c),c.objeto,c.tipo||"",CT_FORMAS[c.forma],+c.valor||0,c.inicio,c.fim||"",i.sit,i.comprometido,i.pago,i.restante]),tot:[null,null,null,null,null,null,null,null,"sum","sum","sum"]};
}
function specPrestadores(){
  const l=prestAll().slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  return{titulo:"Prestadores de serviço",sub:relSub({},false),sensivel:true,
   cols:[{h:"Prestador",w:30},{h:"CPF/CNPJ",w:18},{h:"Tipo de contrato",w:18},{h:"Serviço",w:26},{h:"Situação",w:11},{h:"Contratos vigentes",t:"num",w:11},{h:"Pagamentos feitos",t:"num",w:11},{h:"Total pago",t:"money",w:14},{h:"Último pagamento",t:"date",w:13},{h:"Em aberto",t:"money",w:14},{h:"Notas fiscais",t:"num",w:10}],
   rows:l.map(p=>{const i=prestInfo(p);return[p.nome,p.doc||"",p.vinculo||"",p.servico||"",p.sit||"Ativo",i.vig.length,i.nPag,i.total,i.ultimo||"",i.aberto,i.nNotas]}),tot:[null,null,null,null,null,"sum","sum","sum",null,"sum","sum"]};
}
REPORTS.push(
 {id:"cb_dre",g:"Contabilidade",t:"DRE — Demonstração do Resultado",d:"Receitas, custos e despesas do período, comparado ao período anterior.",per:true,b:specDre},
 {id:"cb_bp",g:"Contabilidade",t:"Balanço patrimonial",d:"Ativo, passivo e patrimônio líquido ao fim do período.",per:true,b:specBp},
 {id:"cb_contratos",g:"Contabilidade",t:"Contratos e compromissos",d:"Quanto cada contrato compromete e quanto ainda falta gastar.",b:()=>specContratos()},
 {id:"cb_prest",g:"Contabilidade",t:"Prestadores de serviço e pagamentos",d:"Tipo de contrato, quantos pagamentos foram feitos e quanto foi pago.",pii:true,b:()=>specPrestadores()});


