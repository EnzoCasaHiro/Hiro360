/* ================= CENTRAL DE RELATÓRIOS: CSV, PDF e XLSX no padrão Casa Hiro ================= */
let _logos=null;
// versão negativa do logotipo (branca) para fundos verdes — a verde some em fundo verde, e a marca proíbe fundo sem contraste
async function logosMarca(){
  if(_logos)return _logos;
  const verde="data:image/png;base64,"+LOGO_B64;let branco=verde;
  try{
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=verde});
    const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;
    const x=c.getContext("2d");x.drawImage(img,0,0);x.globalCompositeOperation="source-in";x.fillStyle="#FFFFFF";x.fillRect(0,0,c.width,c.height);
    branco=c.toDataURL("image/png");
  }catch(e){console.warn("logotipo negativo indisponível",e)}
  return _logos={verde,branco};
}
const REL={ano:new Date().getFullYear(),mes:new Date().getMonth(),sel:new Set(),fmt:new Set(["csv","pdf","xlsx"]),unico:false};
const relNoPer=(d,c)=>!!d&&String(d).slice(0,4)===String(c.ano)&&(c.mes<0||+String(d).slice(5,7)-1===c.mes);
const relPerRot=c=>c.mes<0?`Ano de ${c.ano}`:`${MESES_PT[c.mes]} de ${c.ano}`;
const relSub=(c,per)=>`${per?relPerRot(c)+" · ":""}gerado em ${new Date().toLocaleDateString("pt-BR")}`;
const semDados=(titulo,msg)=>({titulo,sub:relSub({},false),sensivel:false,cols:[{h:"Aviso",w:70}],rows:[[msg]],tot:null});
function relTxt(c,v,modo){
  if(v==null||v==="")return"";
  switch(c.t){
    case"date":return brDate(v);
    case"money":return modo==="csv"?(+v).toFixed(2).replace(".",","):fmtBRL(v);
    case"num":return modo==="csv"?String(+(+v).toFixed(3)).replace(".",","):(+v).toLocaleString("pt-BR",{maximumFractionDigits:3});
    case"hm":return fmtHHMM(+v);
    case"pct":return(+v).toFixed(1).replace(".",",")+"%";
    default:{const s=String(v);return modo==="csv"&&/^[=+\-@]/.test(s)?"'"+s:s}
  }
}
/* ---------- definição dos relatórios (cada um devolve colunas + linhas tipadas) ---------- */
function specIntegrantes(sel){
  const S_=sel?new Set([...sel].map(String)):null;
  return{titulo:"Integrantes",sub:relSub({},false),sensivel:true,
   cols:[{h:"ID relógio",w:10},{h:"Nome completo",w:34},{h:"CPF",w:16},{h:"RG",w:14},{h:"PIS/NIT",w:16},{h:"Cargo",w:24},{h:"Departamento",w:18},{h:"Turno",w:8},{h:"Admissão",t:"date",w:12},{h:"Desligamento",t:"date",w:13},{h:"Situação",w:11},{h:"Telefone",w:15},{h:"E-mail",w:28}],
   rows:integList().filter(i=>!S_||S_.has(String(i.uid))||S_.has(String(i.id))).map(i=>[String(i.uid??""),nomeInteg(i),i.cpf||"",i.rg||"",i.pis||"",i.cargo||"",i.depto||"",i.turno||"",i.admissao||"",i.desligamento||"",i.situacao||"Ativo",i.telefone||"",i.email||""])};
}
function specEscala(c){
  const mes=c.mes<0?new Date().getMonth():c.mes,n=new Date(c.ano,mes+1,0).getDate();
  const dias=Array.from({length:n},(_,i)=>isoDate(new Date(c.ano,mes,i+1)));
  const rows=integList().filter(i=>!semPonto(i)&&(i.turno||escalaEx().some(a=>a.uid===i.id))).map(ig=>{
    let tr=0;const cel=dias.map(d=>{const e=escalaDia(ig,d);if(e.antes||e.depois)return"—";if(e.on){tr++;return"T"}return"F"});
    return[nomeInteg(ig),cargoDe(ig),...cel,tr];
  });
  return{titulo:"Escala do mês",sub:`${MESES_PT[mes]} de ${c.ano} · T = trabalha · F = folga · — = fora do vínculo`,sensivel:false,
   cols:[{h:"Integrante",w:30},{h:"Cargo",w:22},...dias.map(d=>({h:d.slice(8),w:4.5,c:true})),{h:"Dias",t:"num",w:7}],rows};
}
function specJornadas(sel){
  const R0=POINT.result;if(!R0)return semDados("Jornadas diárias","Calcule o ponto na aba Ponto para gerar este relatório.");
  const S_=sel?new Set([...sel].map(String)):null,R={...R0,users:R0.users.filter(u=>!S_||S_.has(String(u.uid)))};
  const maxP=Math.max(1,...R.users.flatMap(u=>u.rows.map(r=>r.intervals.length)));
  const cols=[{h:"Integrante",w:30},{h:"Data",t:"date",w:12},{h:"Dia",w:6,c:true},{h:"Situação",w:14}];
  for(let k=1;k<=maxP;k++)cols.push({h:"Entrada "+k,w:9,c:true},{h:"Saída "+k,w:11,c:true});
  cols.push({h:"Trabalhado",t:"hm",w:11},{h:"Previsto",t:"hm",w:10},{h:"Atraso (min)",t:"num",w:11},{h:"Extra (min)",t:"num",w:10},{h:"Noturno real",t:"hm",w:11},{h:"Noturno reduzido",t:"hm",w:12},{h:"Observação",w:38});
  const rows=[];
  R.users.forEach(u=>u.rows.forEach(r=>{
    const row=[u.nome,r.day,r.wd,STL[r.status]];
    for(let k=0;k<maxP;k++){const iv=r.intervals[k],m=iv&&iv.match(/^(\d{2}:\d{2})–(\d{2}:\d{2})(\s\(\+1\))?$/);row.push(m?m[1]:"",m?m[2]+(m[3]?" (+1)":""):"")}
    row.push(r.workedMin,r.expectedMin,r.late||0,r.extra||0,r.nightReal||0,r.nightFicta||0,obsText(r));rows.push(row);
  }));
  const nC=cols.length,tot=new Array(nC).fill(null);[nC-7,nC-6,nC-5,nC-4,nC-3,nC-2].forEach(i=>tot[i]="sum");
  const tint={col:3,map:{[STL.ok]:[214,237,216],[STL.falta]:[232,223,204],[STL.pendencia]:[240,230,211],[STL.atestado]:[214,234,248],[STL.justificada]:[214,237,216],[STL.esquecido]:[197,168,130]}};
  return{titulo:"Jornadas diárias",sub:`${brDate(R.start)} a ${brDate(R.end)} · ${relSub({},false)}`,sensivel:true,cols,rows,tot,tint};
}
function specResumoPonto(sel){
  const R0=POINT.result;if(!R0)return semDados("Resumo do ponto","Calcule o ponto na aba Ponto para gerar este relatório.");
  const S_=sel?new Set([...sel].map(String)):null,R={...R0,users:R0.users.filter(u=>!S_||S_.has(String(u.uid)))};
  const rows=R.users.map(u=>{const d=u.t.worked-u.t.expected;return[u.nome,(u.ig&&u.ig.cargo)||"",u.t.escalados,u.t.trab,u.t.faltas,u.t.atestados,u.t.justificadas,u.t.esquecidos,u.t.expected,u.t.worked,(d>=0?"+":"−")+fmtHHMM(Math.abs(d)),u.t.late]});
  return{titulo:"Resumo do ponto",sub:`${brDate(R.start)} a ${brDate(R.end)} · ${relSub({},false)}`,sensivel:true,
   cols:[{h:"Integrante",w:30},{h:"Cargo",w:22},{h:"Dias escalados",t:"num",w:10},{h:"Dias trabalhados",t:"num",w:11},{h:"Faltas",t:"num",w:8},{h:"Atestados",t:"num",w:10},{h:"Justificadas",t:"num",w:11},{h:"Esquecimentos",t:"num",w:13},{h:"Previsto",t:"hm",w:10},{h:"Trabalhado",t:"hm",w:11},{h:"Saldo",w:10,c:true},{h:"Atraso (min)",t:"num",w:11}],
   rows,tot:[null,null,"sum","sum","sum","sum","sum","sum","sum","sum",null,"sum"]};
}
function specDocsVal(){
  const rows=dvAll().slice().sort((a,b)=>a.validade.localeCompare(b.validade)).map(d=>{const i=dvInfo(d);return[d.nome,d.cat||"",dvVinc(d),d.emissao||"",d.validade,i.dias,i.label]});
  return{titulo:"Documentos com validade",sub:relSub({},false),sensivel:false,cols:[{h:"Documento",w:34},{h:"Tipo",w:26},{h:"Vinculado a",w:26},{h:"Emissão",t:"date",w:12},{h:"Validade",t:"date",w:12},{h:"Dias restantes",t:"num",w:12},{h:"Situação",w:22}],rows};
}
function specOcorr(c){
  const R=POINT.result,ini=c.todas?(R?R.start:"0000-01-01"):`${c.ano}-${String((c.mes<0?0:c.mes)+1).padStart(2,"0")}-01`;
  const fim=c.todas?(R?R.end:"9999-12-31"):(c.mes<0?`${c.ano}-12-31`:isoDate(new Date(c.ano,c.mes+1,0)));
  const rows=Object.values(S.ocorr).filter(o=>o.ate>=ini&&o.de<=fim&&S.integrantes[o.uid]&&(!c.sel||c.sel.has(String(S.integrantes[o.uid].uid))||c.sel.has(String(o.uid)))).sort((a,b)=>a.de.localeCompare(b.de)).map(o=>[nomeInteg(S.integrantes[o.uid]),OC[o.tipo]||o.tipo,o.de,o.ate,o.texto||""]);
  return{titulo:"Ocorrências",sub:c.todas?relSub({},false):relSub(c,true),sensivel:true,cols:[{h:"Integrante",w:30},{h:"Tipo",w:22},{h:"De",t:"date",w:12},{h:"Até",t:"date",w:12},{h:"Observação",w:44}],rows};
}
function specAlertas(c){
  const mes=c.mes<0?new Date().getMonth():c.mes,de=isoDate(new Date(c.ano,mes,1)),ate=isoDate(new Date(c.ano,mes+1,0));
  let l=[];try{l=conflitosEscala(de,ate)}catch(e){}
  return{titulo:"Alertas de escala",sub:`${MESES_PT[mes]} de ${c.ano} · ${relSub({},false)}`,sensivel:false,cols:[{h:"Nível",w:11},{h:"Data",t:"date",w:12},{h:"Alerta",w:90}],rows:l.map(x=>[x.nivel===3?"Urgente":"Atenção",x.dia,x.txt])};
}
function specFinLista(tipo,c){
  const pagar=tipo==="pagar",l=finAll().filter(e=>e.tipo===tipo&&relNoPer(e.venc,c)).sort((a,b)=>a.venc.localeCompare(b.venc)||a.desc.localeCompare(b.desc));
  return{titulo:pagar?"Contas a pagar":"Contas a receber",sub:relSub(c,true),sensivel:false,
   cols:[{h:"Vencimento",t:"date",w:12},{h:"Descrição",w:34},{h:pagar?"Fornecedor":"Cliente / fonte",w:24},{h:"Categoria",w:18},{h:"Área",w:16},{h:"Forma",w:14},{h:"Parcela",w:8,c:true},{h:"Valor",t:"money",w:14},{h:"Situação",w:12},{h:pagar?"Pago em":"Recebido em",t:"date",w:12},{h:"Valor efetivo",t:"money",w:14},{h:"Comprovantes",t:"num",w:12}],
   rows:l.map(e=>[e.venc,e.desc,e.contra||"",e.cat||"",e.area||"",e.forma||"",e.parcela||"",+e.valor,finStatusLabel(e),e.pago||"",e.pago?finNum(e):null,(e.anexos||[]).length]),
   tot:[null,null,null,null,null,null,null,"sum",null,null,"sum",null]};
}
function specFluxo(c){
  const fl=fluxoMeses(c.ano,FIN.incNF,FIN.projetar),ini=+((finCfg().saldoIni||{})[c.ano])||0;let ac=ini;
  const rows=fl.meses.map(x=>{const res=x.ent-x.sai;ac+=res;return[MESES_PT[x.m],x.eR,x.eP,x.estE,x.sR,x.sP,x.estS,res,ac]});
  return{titulo:"Fluxo de caixa",sub:`Exercício ${c.ano} · saldo inicial ${fmtBRL(ini)} · ${relSub({},false)}`,sensivel:false,
   cols:[{h:"Mês",w:14},{h:"Entradas realizadas",t:"money",w:16},{h:"Entradas previstas",t:"money",w:16},{h:"Entradas estimadas",t:"money",w:16},{h:"Saídas realizadas",t:"money",w:16},{h:"Saídas previstas",t:"money",w:16},{h:"Saídas estimadas",t:"money",w:16},{h:"Resultado",t:"money",w:15},{h:"Saldo acumulado",t:"money",w:16}],
   rows,tot:[null,"sum","sum","sum","sum","sum","sum","sum",null]};
}
function specFinGrupo(c,qual){
  const d=finRelData(c),m=qual==="cat"?d.porCat:qual==="area"?d.porArea:d.porContra,ks=Object.keys(m).sort((a,b)=>(m[b].s+m[b].e)-(m[a].s+m[a].e));
  const nome=qual==="cat"?"categoria":qual==="area"?"área (centro de custo)":"fornecedor / cliente";
  return{titulo:"Resultado por "+nome.split(" (")[0],sub:relSub(c,true),sensivel:false,cols:[{h:nome[0].toUpperCase()+nome.slice(1),w:36},{h:"Entradas",t:"money",w:16},{h:"Saídas",t:"money",w:16},{h:"Resultado",t:"money",w:16}],
   rows:ks.map(k=>[k,m[k].e,m[k].s,m[k].e-m[k].s]),tot:[null,"sum","sum","sum"]};
}
function specConc(c){
  const l=finAll().filter(e=>e.pago&&relNoPer(e.pago,c)).sort((a,b)=>a.pago.localeCompare(b.pago));
  return{titulo:"Conciliação bancária",sub:relSub(c,true),sensivel:false,cols:[{h:"Data",t:"date",w:12},{h:"Descrição",w:36},{h:"Tipo",w:10},{h:"Valor",t:"money",w:15},{h:"Conferido",w:11,c:true}],
   rows:l.map(e=>[e.pago,e.desc,e.tipo==="receber"?"Entrada":"Saída",finSinal(e),e.conc?"Sim":"Não"]),tot:[null,null,null,"sum",null]};
}
const nfRowsPer=c=>((S.config.nf&&S.config.nf.rows)||[]).filter(r=>relNoPer(r.date,c));
function specNfItens(c){
  const l=nfRowsPer(c).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  return{titulo:"Notas fiscais — itens",sub:relSub(c,true),sensivel:false,cols:[{h:"Data",t:"date",w:12},{h:"Nota",w:10},{h:"Fornecedor",w:26},{h:"Item",w:34},{h:"Categoria",w:16},{h:"Subcategoria",w:18},{h:"Qtd.",t:"num",w:8},{h:"Valor un.",t:"money",w:13},{h:"Desconto",t:"money",w:12},{h:"Total",t:"money",w:14}],
   rows:l.map(r=>[r.date||"",r.nota||"",r.local||"",r.item,r.categoria||"",r.subcategoria||"",r.qtd||0,r.valor||0,r.desconto||0,r.total||0]),tot:[null,null,null,null,null,null,null,null,"sum","sum"]};
}
function specNfCat(c){
  const l=nfRowsPer(c),m={};l.forEach(r=>{const k=r.categoria||"Sem categoria";(m[k]=m[k]||{n:0,t:0});m[k].n++;m[k].t+=r.total||0});
  const tt=soma(Object.values(m),x=>x.t)||1,ks=Object.keys(m).sort((a,b)=>m[b].t-m[a].t);
  return{titulo:"Gastos por categoria",sub:relSub(c,true),sensivel:false,cols:[{h:"Categoria",w:30},{h:"Itens",t:"num",w:9},{h:"Total",t:"money",w:16},{h:"% do total",t:"pct",w:11}],rows:ks.map(k=>[k,m[k].n,m[k].t,100*m[k].t/tt]),tot:[null,"sum","sum","sum"]};
}
function specEstPosicao(){
  const sit=i=>+i.qtd<=0?"Acabou":estBaixo(i)?"No mínimo ou abaixo":"Em dia";
  const rows=estData().itens.slice().sort((a,b)=>a.area.localeCompare(b.area,"pt")||a.nome.localeCompare(b.nome,"pt")).map(i=>[i.nome,i.area,+i.qtd,i.unidade||"un.",+i.minimo||0,sit(i),+i.custo||0,(+i.qtd||0)*(+i.custo||0),i.ultCompra?`${brDate(i.ultCompra.data)} · ${i.ultCompra.forn||"—"}`:""]);
  return{titulo:"Posição do estoque",sub:relSub({},false),sensivel:false,cols:[{h:"Item",w:32},{h:"Área",w:18},{h:"Quantidade",t:"num",w:11},{h:"Un.",w:7,c:true},{h:"Mínimo",t:"num",w:9},{h:"Situação",w:17},{h:"Último custo",t:"money",w:13},{h:"Valor em estoque",t:"money",w:15},{h:"Última compra",w:30}],rows,tot:[null,null,null,null,null,null,null,"sum",null]};
}
function specEstMov(c){
  const l=movAll().filter(m=>relNoPer(m.data,c)).sort((a,b)=>a.data.localeCompare(b.data)||(a.em||"").localeCompare(b.em||""));
  return{titulo:"Movimentações do estoque",sub:relSub(c,true),sensivel:false,cols:[{h:"Data",t:"date",w:12},{h:"Tipo",w:10},{h:"Item",w:30},{h:"Área",w:16},{h:"Quantidade",t:"num",w:11},{h:"Motivo",w:20},{h:"Nota fiscal",w:16},{h:"Valor un.",t:"money",w:12},{h:"Observação",w:26}],
   rows:l.map(m=>[m.data,TIPO_MOV[m.tipo]||m.tipo,m.nome,m.area||"",m.delta,m.motivo||"",m.nf?(m.nf.length>16?"NF importada":m.nf):"",m.custo||null,m.obs||""])};
}
function specEstValidade(){
  const sit=d=>d<0?"Vencido":d<=15?"Vence em até 15 dias":d<=30?"Vence em até 30 dias":"Em dia";
  const rows=[];estData().itens.forEach(it=>estLotesDe(it).forEach(l=>rows.push([it.nome,it.area,l.lote||"sem número",l.val||"",+l.qtd,it.unidade||"un.",l.val?sit(estValDias(l.val)):"Sem validade"])));
  rows.sort((a,b)=>(a[3]||"9999").localeCompare(b[3]||"9999"));
  return{titulo:"Lotes e validade",sub:relSub({},false),sensivel:false,cols:[{h:"Item",w:32},{h:"Área",w:18},{h:"Lote",w:16},{h:"Validade",t:"date",w:13},{h:"Saldo",t:"num",w:10},{h:"Un.",w:7,c:true},{h:"Situação",w:24}],rows};
}
function specEstCobraveis(c){
  const itens=estData().itens,l=movAll().filter(m=>m.tipo==="saida"&&m.uso==="residente"&&relNoPer(m.data,c)).sort((a,b)=>a.data.localeCompare(b.data));
  const val=m=>m.vUn||((itens.find(x=>x.id===m.item)||{}).custo)||0;
  return{titulo:"Itens cobráveis por residente",sub:relSub(c,true),sensivel:true,cols:[{h:"Data",t:"date",w:12},{h:"Residente",w:28},{h:"Item",w:30},{h:"Quantidade",t:"num",w:11},{h:"Valor un.",t:"money",w:12},{h:"Total",t:"money",w:13}],
   rows:l.map(m=>[m.data,resNomeDe(m.residente)||"",m.nome,m.qtd,val(m),m.qtd*val(m)]),tot:[null,null,null,null,null,"sum"]};
}
function specEstCompras(){
  const l=estData().itens.filter(estBaixo).sort((a,b)=>a.area.localeCompare(b.area,"pt")||a.nome.localeCompare(b.nome,"pt"));
  return{titulo:"Lista de compras",sub:`Itens no mínimo ou abaixo, repondo até o dobro do mínimo · ${relSub({},false)}`,sensivel:false,
   cols:[{h:"Item",w:32},{h:"Área",w:18},{h:"Tem",t:"num",w:9},{h:"Mínimo",t:"num",w:9},{h:"Repor",t:"num",w:9},{h:"Un.",w:7,c:true},{h:"Último fornecedor",w:26},{h:"Último custo",t:"money",w:13},{h:"Custo estimado",t:"money",w:14}],
   rows:l.map(i=>{const n=estRepor(i);return[i.nome,i.area,+i.qtd,+i.minimo||0,n,i.unidade||"un.",i.ultCompra?i.ultCompra.forn||"":"",+i.custo||0,n*(+i.custo||0)]}),tot:[null,null,null,null,null,null,null,null,"sum"]};
}
function specEstConsumo(c){
  const itens=estData().itens,custo=id=>{const it=itens.find(x=>x.id===id);return it?+it.custo||0:0};
  const m={};movAll().filter(x=>x.tipo==="saida"&&relNoPer(x.data,c)).forEach(x=>{const k=x.area||"Sem área",o=m[k]=m[k]||{its:new Set(),q:0,v:0};o.its.add(x.item);o.q+=x.qtd;o.v+=x.qtd*(x.custo||custo(x.item))});
  const ks=Object.keys(m).sort((a,b)=>m[b].v-m[a].v);
  return{titulo:"Consumo por área",sub:relSub(c,true),sensivel:false,cols:[{h:"Área",w:26},{h:"Itens diferentes",t:"num",w:14},{h:"Quantidade retirada",t:"num",w:16},{h:"Valor estimado",t:"money",w:16}],rows:ks.map(k=>[k,m[k].its.size,m[k].q,m[k].v]),tot:[null,null,"sum","sum"]};
}
function specTarefas(c){
  const l=tarAll().filter(t=>relNoPer(t.data,c)).sort((a,b)=>a.data.localeCompare(b.data)||(a.hora||"").localeCompare(b.hora||""));
  return{titulo:"Tarefas",sub:relSub(c,true),sensivel:false,cols:[{h:"Data",t:"date",w:12},{h:"Hora",w:7,c:true},{h:"Tarefa",w:40},{h:"Responsável",w:24},{h:"Área",w:16},{h:"Prioridade",w:11},{h:"Situação",w:12}],
   rows:l.map(t=>[t.data,t.hora||"",t.titulo,nomeDe(t.resp),t.area||"",PRIO[t.prio]||"Normal",t.status==="feita"?"Feita":tarAtrasada(t)?"Atrasada":"Em aberto"])};
}
const REPORTS=[
 {id:"dp_integrantes",g:"Departamento Pessoal",t:"Integrantes (cadastro)",d:"Dados cadastrais, cargo, turno e situação.",pii:true,b:()=>specIntegrantes()},
 {id:"dp_escala",g:"Departamento Pessoal",t:"Escala do mês",d:"Quem trabalha e quem folga em cada dia.",per:true,b:specEscala},
 {id:"dp_alertas",g:"Departamento Pessoal",t:"Alertas de escala e conformidade",d:"Conflitos de jornada, descanso e cobertura.",per:true,b:specAlertas},
 {id:"dp_jornadas",g:"Departamento Pessoal",t:"Jornadas diárias",d:"Marcações, horas trabalhadas, atrasos e extras (precisa do ponto calculado).",pii:true,b:()=>specJornadas()},
 {id:"dp_resumo",g:"Departamento Pessoal",t:"Resumo do ponto",d:"Faltas, atestados, saldo de horas por integrante.",pii:true,b:()=>specResumoPonto()},
 {id:"dp_ocorr",g:"Departamento Pessoal",t:"Ocorrências",d:"Atestados, faltas justificadas e esquecimentos.",per:true,pii:true,b:specOcorr},
 {id:"dp_contador",g:"Departamento Pessoal",t:"Folha de ponto para o contador",d:"Capa, integrantes, jornadas e uma aba por pessoa (XLSX e PDF no modelo do contador; o CSV traz as jornadas).",pii:true,b:()=>specJornadas(),custom:{xlsx:()=>gerarXlsxContador(),pdf:()=>gerarPdfContador()}},
 {id:"dp_docs",g:"Documentos",t:"Documentos com validade",d:"Alvarás, licenças, ASO e certificados com os dias que faltam.",b:()=>specDocsVal()},
 {id:"fin_pagar",g:"Financeiro",t:"Contas a pagar",d:"Lançamentos do período, com situação e baixa.",per:true,b:c=>specFinLista("pagar",c)},
 {id:"fin_receber",g:"Financeiro",t:"Contas a receber",d:"Lançamentos do período, com situação e baixa.",per:true,b:c=>specFinLista("receber",c)},
 {id:"fin_fluxo",g:"Financeiro",t:"Fluxo de caixa do exercício",d:"Mês a mês: realizado, previsto e estimado, com saldo acumulado.",per:true,b:specFluxo},
 {id:"fin_cat",g:"Financeiro",t:"Resultado por categoria",d:"Entradas, saídas e resultado de cada categoria.",per:true,b:c=>specFinGrupo(c,"cat")},
 {id:"fin_area",g:"Financeiro",t:"Resultado por área (centro de custo)",d:"Quanto cada área da casa consumiu.",per:true,b:c=>specFinGrupo(c,"area")},
 {id:"fin_contra",g:"Financeiro",t:"Resultado por fornecedor ou cliente",d:"Quem mais recebeu e quem mais pagou.",per:true,b:c=>specFinGrupo(c,"contra")},
 {id:"fin_conc",g:"Financeiro",t:"Conciliação bancária",d:"Pagamentos e recebimentos do período e o que já foi conferido.",per:true,b:specConc},
 {id:"nf_itens",g:"Notas fiscais",t:"Notas fiscais — itens",d:"Todos os itens comprados no período.",per:true,b:specNfItens},
 {id:"nf_cat",g:"Notas fiscais",t:"Gastos por categoria",d:"Quanto foi gasto em cada categoria e a participação no total.",per:true,b:specNfCat},
 {id:"est_posicao",g:"Estoque",t:"Posição do estoque",d:"O que tem, o que acabou e quanto vale.",b:()=>specEstPosicao()},
 {id:"est_compras",g:"Estoque",t:"Lista de compras",d:"Itens abaixo do mínimo, com quantidade a repor e custo estimado.",b:()=>specEstCompras()},
 {id:"est_validade",g:"Estoque",t:"Lotes e validade",d:"Cada lote com a validade, o saldo e a situação (vencido, vence em até 30 dias).",b:()=>specEstValidade()},
 {id:"est_cobraveis",g:"Estoque",t:"Itens cobráveis por residente",d:"Saídas do estoque para residentes, com valor, para lançar a cobrança.",per:true,b:specEstCobraveis},
 {id:"rpa_ret",g:"Prestadores",t:"Retenções de autônomos (RPA)",d:"INSS, IRRF e ISS retidos de cada autônomo no período, com o líquido pago.",per:true,b:specRpa},
 {id:"est_mov",g:"Estoque",t:"Movimentações do estoque",d:"Entradas, saídas e ajustes de contagem.",per:true,b:specEstMov},
 {id:"est_consumo",g:"Estoque",t:"Consumo por área",d:"O que cada área retirou do estoque e quanto custou.",per:true,b:specEstConsumo},
 {id:"ag_tarefas",g:"Agenda",t:"Tarefas",d:"Tarefas do período, quem é responsável e como estão.",per:true,b:specTarefas}];

/* ---------- geradores: CSV, PDF e XLSX ---------- */
function relCsv(spec){
  const q=v=>`"${csvCel(v).replace(/"/g,'""')}"`,L=[spec.cols.map(c=>q(c.h)).join(";")];
  spec.rows.forEach(r=>L.push(spec.cols.map((c,i)=>q(relTxt(c,r[i],"csv"))).join(";")));
  if(spec.tot&&spec.rows.length)L.push(spec.cols.map((c,i)=>q(i===0?"Total":spec.tot[i]==="sum"?relTxt(c,soma(spec.rows,r=>+r[i]||0),"csv"):"")).join(";"));
  return new Blob(["\ufeff"+L.join("\r\n")],{type:"text/csv;charset=utf-8"});
}
async function relPdf(specs,opts){
  if(typeof window.jspdf==="undefined")throw new Error("Biblioteca de PDF não carregou. Recarregue a página e tente de novo.");
  opts=opts||{};
  const{jsPDF}=window.jspdf,lg=await logosMarca();
  const VERDE=[30,92,42],VMED=[46,125,50],AREIA=[245,239,224],LINHA=[232,223,204],TXT=[68,68,68],MUTE=[138,133,119],PAL=[214,237,216],MAD=[125,90,60];
  const doc=new jsPDF({orientation:specs.some(s=>s.cols.length>6)||opts.capa?"landscape":"portrait",unit:"pt",format:"a4"});
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  const fundo=()=>{doc.setFillColor(...AREIA);doc.rect(0,0,W,H,"F")};
  const logo=(x,y,w,h)=>{try{doc.addImage(lg.branco,"PNG",x,y,w,h)}catch(e){}};
  const faixa=(t,sub)=>{
    doc.setFillColor(...VERDE);doc.rect(0,0,W,66,"F");logo(36,9,34,47);
    doc.setTextColor(255,255,255);doc.setFont("times","bold");doc.setFontSize(20);doc.text("CASA HIRO",82,33);
    doc.setFont("times","italic");doc.setFontSize(9);doc.setTextColor(...PAL);doc.text("A ciência do cuidado com o acolhimento de casa.",82,48);
    doc.setFont("times","bold");doc.setFontSize(13);doc.setTextColor(255,255,255);doc.text(String(t),W-36,32,{align:"right"});
    doc.setFont("times","normal");doc.setFontSize(8.5);doc.setTextColor(...PAL);doc.text(String(sub||""),W-36,48,{align:"right"});
  };
  const rodape=(n,lgpd)=>{
    doc.setFont("times","italic");doc.setFontSize(8);doc.setTextColor(...MUTE);
    doc.text("Casa Hiro™ · Caraguatatuba — Litoral Norte de SP",36,H-20);
    if(lgpd){doc.text("Contém dados pessoais (LGPD): compartilhe só com quem precisa.",W/2,H-20,{align:"center"});try{doc.saveGraphicsState();doc.setGState(new doc.GState({opacity:0.07}));doc.setFont("times","bold");doc.setFontSize(80);doc.setTextColor(120,120,120);doc.text("CONFIDENCIAL",W/2,H/2,{align:"center",angle:35});doc.restoreGraphicsState()}catch(e){}}
    doc.text("Página "+n,W-36,H-20,{align:"right"});
  };
  let livre=true;const nova=()=>{if(livre)livre=false;else doc.addPage();fundo()};
  if(opts.capa){
    nova();doc.setFillColor(...VERDE);doc.rect(0,0,W,190,"F");logo(48,38,60,83);
    doc.setTextColor(255,255,255);doc.setFont("times","bold");doc.setFontSize(30);doc.text("CASA HIRO",126,84);
    doc.setFont("times","italic");doc.setFontSize(12);doc.setTextColor(...PAL);doc.text("A ciência do cuidado com o acolhimento de casa.",126,106);
    doc.setFont("times","normal");doc.setFontSize(11);doc.setTextColor(255,255,255);doc.text(opts.capa.titulo,126,128);
    const L=opts.capa.linhas||[];doc.setFillColor(255,255,255);doc.setDrawColor(...LINHA);doc.roundedRect(48,214,W-96,26+L.length*17,5,5,"FD");
    doc.setFontSize(10.5);L.forEach(([k,v],i)=>{const y=238+i*17;doc.setFont("times","bold");doc.setTextColor(...VERDE);doc.text(k+":",64,y);doc.setFont("times","normal");doc.setTextColor(...TXT);doc.text(String(v),190,y)});
    doc.setFont("times","italic");doc.setFontSize(9.5);doc.setTextColor(...MAD);doc.text("Documento com dados pessoais de integrantes — protegido pela LGPD (Lei 13.709/2018).",48,H-40);
    rodape(1,false);
  }
  for(const spec of specs){
    nova();faixa(spec.titulo,spec.sub);
    const pag0=doc.internal.getCurrentPageInfo().pageNumber,nC=spec.cols.length,fs=nC>22?5:nC>14?6.3:nC>9?7.5:9;
    const body=spec.rows.length?spec.rows.map(r=>spec.cols.map((c,i)=>relTxt(c,r[i],"pdf"))):[[{content:"Nenhum registro neste período.",colSpan:nC,styles:{halign:"center",fontStyle:"italic"}}]];
    const foot=(spec.tot&&spec.rows.length)?[spec.cols.map((c,i)=>i===0?"Total":spec.tot[i]==="sum"?relTxt(c,soma(spec.rows,r=>+r[i]||0),"pdf"):"")]:undefined;
    const cs={};spec.cols.forEach((c,i)=>{cs[i]={halign:["money","num","hm","pct"].includes(c.t)?"right":(c.c||c.t==="date")?"center":"left"}});
    doc.autoTable({startY:82,margin:{top:82,left:36,right:36,bottom:40},head:[spec.cols.map(c=>c.h)],body,foot,showFoot:"lastPage",theme:"grid",
      styles:{font:"times",fontSize:fs,cellPadding:fs>7?4:2.2,lineColor:LINHA,lineWidth:.5,textColor:TXT,valign:"middle",overflow:"linebreak"},
      headStyles:{fillColor:VMED,textColor:255,fontStyle:"bold",halign:"center"},bodyStyles:{fillColor:[255,255,255]},alternateRowStyles:{fillColor:AREIA},
      footStyles:{fillColor:VERDE,textColor:255,fontStyle:"bold"},columnStyles:cs,
      didParseCell:d=>{
        if(spec.tint&&d.section==="body"&&d.column.index===spec.tint.col){const cor=spec.tint.map[d.cell.raw];if(cor)d.cell.styles.fillColor=cor}
        const es=spec.estilo&&d.section==="body"?spec.estilo[d.row.index]:"";
        if(es){d.cell.styles.fontStyle="bold";d.cell.styles.fillColor=es==="g"?VERDE:es==="h"?PAL:es==="t"?[240,230,211]:LINHA;if(es==="g")d.cell.styles.textColor=[255,255,255]}
      },
      willDrawPage:d=>{if(d.pageNumber>pag0){fundo();faixa(spec.titulo,spec.sub)}},
      didDrawPage:d=>rodape(d.pageNumber,spec.sensivel)});
    if(spec.assinatura){
      let y=doc.lastAutoTable.finalY+56;
      if(y>H-80){doc.addPage();fundo();faixa(spec.titulo,spec.sub);y=140}
      doc.setDrawColor(...MUTE);doc.line(48,y,W/2-24,y);doc.line(W/2+24,y,W-48,y);
      doc.setFont("times","normal");doc.setFontSize(9);doc.setTextColor(...TXT);
      doc.text(spec.assinatura.esq||"Integrante",48,y+12);doc.text(spec.assinatura.dir||"Casa Hiro — responsável",W/2+24,y+12);
    }
  }
  return new Blob([doc.output("arraybuffer")],{type:"application/pdf"});
}
async function relXlsx(specs){
  if(typeof ExcelJS==="undefined")throw new Error("Biblioteca de planilha não carregou. Recarregue a página e tente de novo.");
  const wb=new ExcelJS.Workbook();wb.creator="Casa Hiro";wb.created=new Date();
  const lg=await logosMarca();let img=null;try{img=wb.addImage({base64:lg.branco,extension:"png"})}catch(e){console.warn("logotipo fora da planilha",e)}
  const F=a=>({type:"pattern",pattern:"solid",fgColor:{argb:a}}),usados=new Set();
  const VERDE="FF1E5C2A",VMED="FF2E7D32",AREIA="FFF5EFE0",LINHA="FFE8DFCC",TXT="FF444444",BR="FFFFFFFF",MAD="FF7D5A3C",MUTE="FF8A8577";
  const FMT={date:"dd/mm/yyyy",money:'"R$" #,##0.00',hm:"[h]:mm",pct:"0.0%"};
  const val=(c,v)=>{
    if(v==null||v==="")return null;
    if(c.t==="date")return xlDateOnly(v);if(c.t==="money"||c.t==="num")return+v;
    if(c.t==="hm")return Math.max(0,Math.round(+v))/1440;if(c.t==="pct")return+v/100;return String(v);
  };
  specs.forEach(spec=>{
    let nome=String(spec.titulo).replace(/[\\\/?*\[\]:]/g," ").slice(0,31)||"Relatório",n=1;
    while(usados.has(nome.toLowerCase()))nome=(String(spec.titulo).slice(0,28)+" "+(++n)).slice(0,31);usados.add(nome.toLowerCase());
    const ws=wb.addWorksheet(nome),nC=spec.cols.length,nc=Math.max(nC,4),L=colLetter(nc),HR=7,R0=HR+1,NR=spec.rows.length;
    pageBox(ws,nC>6?"landscape":"portrait");
    ws.columns=Array.from({length:nc},(_,i)=>({width:spec.cols[i]?(spec.cols[i].w||Math.max(10,spec.cols[i].h.length+4)):12}));
    for(let r=1;r<=4;r++)for(let c=1;c<=nc;c++)ws.getCell(r,c).fill=F(r===4?VMED:VERDE);
    [20,20,17,21].forEach((h,i)=>ws.getRow(i+1).height=h);
    ws.mergeCells(`A1:${L}2`);const a1=ws.getCell("A1");a1.value="CASA HIRO";a1.font={name:"Georgia",bold:true,size:22,color:{argb:BR}};a1.alignment={vertical:"middle",horizontal:"left",indent:6};
    ws.mergeCells(`A3:${L}3`);const a3=ws.getCell("A3");a3.value="A ciência do cuidado com o acolhimento de casa.";a3.font={name:"Georgia",italic:true,size:10,color:{argb:"FFD6EDD8"}};a3.alignment={vertical:"middle",horizontal:"left",indent:6};
    ws.mergeCells(`A4:${L}4`);const a4=ws.getCell("A4");a4.value=spec.titulo;a4.font={name:"Georgia",bold:true,size:13,color:{argb:BR}};a4.alignment={vertical:"middle",horizontal:"center"};
    ws.mergeCells(`A5:${L}5`);const a5=ws.getCell("A5");a5.value=spec.sub||"";a5.font={name:"Calibri",italic:true,size:9,color:{argb:MUTE}};a5.alignment={vertical:"middle",horizontal:"left"};
    if(img!==null)try{ws.addImage(img,{tl:{col:.2,row:.15},ext:{width:32,height:44}})}catch(e){}
    spec.cols.forEach((c,i)=>{const h=ws.getCell(HR,i+1);h.value=c.h;h.font={name:"Calibri",bold:true,size:10,color:{argb:BR}};h.fill=F(VMED);h.alignment={horizontal:"center",vertical:"middle",wrapText:true};h.border=thinBorder(LINHA)});
    ws.getRow(HR).height=28;
    spec.rows.forEach((row,ri)=>{
      const r=R0+ri;ws.getRow(r).height=17;
      spec.cols.forEach((c,i)=>{
        const cell=ws.getCell(r,i+1),v=val(c,row[i]);if(v!==null)cell.value=v;
        if(FMT[c.t])cell.numFmt=FMT[c.t];
        const es=(spec.estilo||[])[ri];
        cell.font={name:"Calibri",size:10,color:{argb:es==="g"?BR:(c.t==="money"&&+row[i]<0)?MAD:TXT},bold:!!es||(c.t==="money"&&+row[i]<0)};
        cell.fill=F(es==="g"?VERDE:es==="h"?"FFD6EDD8":es==="t"?"FFF0E6D3":es==="s"?LINHA:(ri%2?AREIA:BR));cell.border=thinBorder(LINHA);
        cell.alignment={vertical:"middle",horizontal:["money","num","hm","pct"].includes(c.t)?"right":(c.c||c.t==="date")?"center":"left"};
      });
    });
    if(!NR){ws.mergeCells(`A${R0}:${L}${R0}`);const e=ws.getCell(`A${R0}`);e.value="Nenhum registro neste período.";e.font={name:"Calibri",italic:true,size:10,color:{argb:MUTE}};e.alignment={horizontal:"center"}}
    let fim=NR?R0+NR-1:R0;
    if(spec.tot&&NR){
      const tr=R0+NR;fim=tr;ws.getRow(tr).height=19;
      spec.cols.forEach((c,i)=>{
        const cell=ws.getCell(tr,i+1);cell.fill=F(VERDE);cell.border=thinBorder(LINHA);cell.font={name:"Calibri",bold:true,size:10,color:{argb:BR}};
        cell.alignment={vertical:"middle",horizontal:["money","num","hm","pct"].includes(c.t)?"right":"left"};
        if(i===0)cell.value="Total";
        else if(spec.tot[i]==="sum"){const col=colLetter(i+1),res=soma(spec.rows,x=>val(c,x[i])||0);cell.value={formula:`SUM(${col}${R0}:${col}${R0+NR-1})`,result:res};if(FMT[c.t])cell.numFmt=FMT[c.t]}
      });
    }
    const nota=(r,t)=>{ws.mergeCells(`A${r}:${L}${r}`);const c=ws.getCell(`A${r}`);c.value=t;c.font={name:"Georgia",italic:true,size:9,color:{argb:MUTE}};c.alignment={horizontal:"left",vertical:"middle"}};
    nota(fim+2,"Casa Hiro™ · Caraguatatuba — Litoral Norte de SP · A ciência do cuidado com o acolhimento de casa.");
    if(spec.sensivel)nota(fim+3,"Contém dados pessoais de integrantes (LGPD, Lei 13.709/2018). Compartilhe só com quem precisa e guarde com segurança.");
    ws.views=[{state:"frozen",ySplit:HR,showGridLines:false}];
    if(NR)ws.autoFilter={from:{row:HR,column:1},to:{row:HR,column:nC}};
  });
  return new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
async function gerarXlsxContador(){
  if(typeof ExcelJS==="undefined")throw new Error("Biblioteca de planilha não carregou. Recarregue a página e tente de novo.");
  const wb=buildWorkbook(),buf=await wb.xlsx.writeBuffer();
  return new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
async function gerarPdfContador(opt){
  opt=opt||{};
  const abas={capa:true,integrantes:true,jornadas:true,individual:false,...(opt.abas||{})},sel=opt.uids?new Set([...opt.uids].map(String)):null;
  const e=empresa(),R=POINT.result,specs=[];
  if(abas.integrantes)specs.push(specIntegrantes(sel));
  if(R&&abas.jornadas)specs.push(specResumoPonto(sel),specJornadas(sel));
  if(R&&abas.individual)R.users.filter(u=>!sel||sel.has(String(u.uid))).forEach(u=>specs.push(specFolhaIndividual(u,R)));
  if(abas.jornadas){const oc=specOcorr({todas:true,sel});if(oc.rows.length)specs.push(oc)}
  if(!specs.length&&!abas.capa)throw new Error("Com essas escolhas não há nada para gerar (jornadas e folha individual precisam do ponto calculado).");
  return relPdf(specs,{capa:abas.capa?{titulo:"Relatório de integrantes e apuração de ponto",linhas:[["Razão social",e.razao],["CNPJ",e.cnpj||"—"],["Endereço",e.endereco],["Telefone / E-mail",`${e.telefone}  ·  ${e.email}`],["Período apurado",R?`${brDate(R.start)} a ${brDate(R.end)}`:"Ponto ainda não calculado"],["Emitido em",new Date().toLocaleString("pt-BR")]]}:null});
}
async function exportXlsx(){
  try{
    const R=POINT.result,inc=integList().filter(i=>miss(i).length).length;
    const ok=await saveFile(`contador-casa-hiro${R?"-"+R.start.slice(0,7):""}.xlsx`,await gerarXlsxContador());
    if(ok&&inc)toast(`${inc} integrante(s) com dados incompletos na planilha.`,true);
  }catch(e){console.error(e);toast("Não foi possível gerar o XLSX: "+(e&&e.message?e.message:e),true)}
}
async function exportPdfContador(){
  try{
    const R=POINT.result,inc=integList().filter(i=>miss(i).length).length;
    const ok=await saveFile(`contador-casa-hiro${R?"-"+R.start.slice(0,7):""}.pdf`,await gerarPdfContador());
    if(ok&&inc)toast(`${inc} integrante(s) com dados incompletos no relatório.`,true);
  }catch(e){console.error(e);toast("Não foi possível gerar o PDF: "+(e&&e.message?e.message:e),true)}
}
/* ---------- baixar em lote ---------- */
async function relBaixar(ids,fmts){
  const lista=ids.map(id=>REPORTS.find(r=>r.id===id)).filter(Boolean).filter(repOk);
  if(lista.length)audit("relatorio",lista.map(r=>r.id).join(", ").slice(0,150)+" ("+fmts.join("/")+")");
  if(!lista.length)return toast("Marque ao menos um documento.",true);
  if(!fmts.length)return toast("Marque ao menos um formato.",true);
  const ctx={ano:REL.ano,mes:REL.mes},suf=ctx.mes<0?String(ctx.ano):`${ctx.ano}-${String(ctx.mes+1).padStart(2,"0")}`,unico=REL.unico&&fmts.includes("xlsx");
  toast("Gerando os arquivos…");
  try{
    const arq=[],specs=lista.map(r=>({r,spec:r.b(ctx)}));
    for(const{r,spec}of specs){
      if(fmts.includes("csv"))arq.push({nome:`casa-hiro_${r.id}_${suf}.csv`,blob:relCsv(spec)});
      if(fmts.includes("pdf"))arq.push({nome:`casa-hiro_${r.id}_${suf}.pdf`,blob:r.custom?await r.custom.pdf():await relPdf([spec])});
      if(fmts.includes("xlsx")&&(r.custom||!unico))arq.push({nome:`casa-hiro_${r.id}_${suf}.xlsx`,blob:r.custom?await r.custom.xlsx():await relXlsx([spec])});
    }
    if(unico){const gen=specs.filter(x=>!x.r.custom);if(gen.length)arq.push({nome:`casa-hiro_relatorios_${suf}.xlsx`,blob:await relXlsx(gen.map(x=>x.spec))})}
    if(arq.length===1){await saveFile(arq[0].nome,arq[0].blob);return}
    if(typeof JSZip==="undefined")throw new Error("Biblioteca de compactação não carregou. Recarregue a página e tente de novo.");
    const zip=new JSZip();arq.forEach(a=>zip.file(a.nome,a.blob));
    const ok=await saveFile(`casa-hiro_relatorios_${suf}.zip`,await zip.generateAsync({type:"blob"}));
    if(ok)toast(`${arq.length} arquivo(s) em um .zip.`);
  }catch(e){console.error(e);toast("Não foi possível gerar os arquivos: "+(e&&e.message?e.message:e),true)}
}
/* ---------- tela ---------- */
function pgRel(){
  const y0=new Date().getFullYear(),anos=[];for(let y=Math.min(y0-3,REL.ano);y<=Math.max(y0+3,REL.ano);y++)anos.push(y);
  const n=REL.sel.size,RL=REPORTS.filter(repOk),gr=[...new Set(RL.map(r=>r.g))],pode=n&&REL.fmt.size;
  return banner("","Central de relatórios","Escolha os documentos e os formatos e baixe tudo de uma vez — todos no padrão visual da Casa Hiro.","down")+noStore()+`
  <div class="card"><h2>Período e formatos</h2>
   <div class="row" style="align-items:flex-end">
    <button type="button" class="b sec sm" id="relprev" style="flex:none">◀</button>
    <div><label>Mês</label><select id="relmes"><option value="-1" ${REL.mes<0?"selected":""}>Ano inteiro</option>${MESES_PT.map((m,k)=>`<option value="${k}" ${REL.mes===k?"selected":""}>${m}</option>`).join("")}</select></div>
    <div><label>Ano</label><select id="relano">${anos.map(y=>`<option ${y===REL.ano?"selected":""}>${y}</option>`).join("")}</select></div>
    <button type="button" class="b sec sm" id="relnext" style="flex:none">▶</button></div>
   <div class="legend" style="margin:12px 0 4px">${[["csv","CSV (abre no Excel)"],["pdf","PDF"],["xlsx","XLSX (Excel)"]].map(([k,l])=>`<label style="display:inline-flex;gap:5px;align-items:center;font-weight:400;color:var(--ink);margin:0 14px 0 0"><input type="checkbox" data-relfmt="${k}" ${REL.fmt.has(k)?"checked":""}> ${l}</label>`).join("")}</div>
   <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="relunico" ${REL.unico?"checked":""}> No XLSX, juntar os relatórios em uma única planilha (uma aba por relatório)</label>
   <div class="row" style="margin-top:12px"><button class="b" id="relzip" style="flex:none" ${pode?"":"disabled"}>${ic("down")} Baixar selecionados (${n})</button><button class="b sec" id="relall" style="flex:none">Selecionar todos</button><button class="b sec" id="relnone" style="flex:none">Limpar seleção</button></div>
   <p class="sub" style="margin:8px 0 0">Mais de um arquivo vem compactado em um .zip. Os relatórios que dependem de período usam o mês e o ano acima.</p></div>
  ${gr.map(g=>`<div class="card"><h2>${g}</h2>${RL.filter(r=>r.g===g).map(r=>`<div class="doc"><input type="checkbox" data-relsel="${r.id}" ${REL.sel.has(r.id)?"checked":""}>
    <div class="grow"><div class="nm">${esc(r.t)}${r.pii?` <span class="chip">dados pessoais</span>`:""}</div><div class="sub">${esc(r.d)}${r.per?" · usa o período acima":""}</div></div>
    ${["csv","pdf","xlsx"].map(f=>`<button class="b sec sm" data-reldl="${r.id}|${f}">${f.toUpperCase()}</button>`).join("")}</div>`).join("")}</div>`).join("")}
  <div class="callout sand">Relatórios com “dados pessoais” seguem a LGPD (Lei 13.709/2018): compartilhe só com quem precisa — o contador, a direção — e nunca por conversa pessoal.</div>`;
}
function bindRel(){
  const re=()=>go("rel",true);
  $("relmes").onchange=e=>{REL.mes=+e.target.value;re()};$("relano").onchange=e=>{REL.ano=+e.target.value;re()};
  $("relprev").onclick=()=>{if(REL.mes<0)REL.ano--;else{REL.mes--;if(REL.mes<0){REL.mes=11;REL.ano--}}re()};
  $("relnext").onclick=()=>{if(REL.mes<0)REL.ano++;else{REL.mes++;if(REL.mes>11){REL.mes=0;REL.ano++}}re()};
  document.querySelectorAll("[data-relfmt]").forEach(c=>c.onchange=()=>{c.checked?REL.fmt.add(c.dataset.relfmt):REL.fmt.delete(c.dataset.relfmt);re()});
  $("relunico").onchange=e=>{REL.unico=e.target.checked};
  document.querySelectorAll("[data-relsel]").forEach(c=>c.onchange=()=>{c.checked?REL.sel.add(c.dataset.relsel):REL.sel.delete(c.dataset.relsel);re()});
  $("relall").onclick=()=>{REL.sel=new Set(REPORTS.filter(repOk).map(r=>r.id));re()};$("relnone").onclick=()=>{REL.sel=new Set();re()};
  $("relzip").onclick=()=>relBaixar([...REL.sel],[...REL.fmt]);
  document.querySelectorAll("[data-reldl]").forEach(b=>b.onclick=()=>{const[id,f]=b.dataset.reldl.split("|");relBaixar([id],[f])});
}



