/* ===== Bloco M: relatórios e painéis (itens 376–400) ===== */
const xqC=()=>xmcfg("rel");
const xqL=k=>xqC()[k]||[];
const xqHoje=()=>hojeIso();
/* tabela com exportação para Excel / PDF / CSV (388, 389) */
const XQT={};
const xqFmt=(v,t)=>v==null||v===""?"":t==="money"?fmtBRL(+v):t==="date"?brDate(v):t==="pct"?pctF(+v):t==="num"?String(Math.round(v*100)/100).replace(".",","):f6Esc(v);
function xqTab(id,titulo,cols,rows,sub){
  cols=cols.map(c=>typeof c==="string"?{h:c}:c);XQT[id]={titulo,sub:sub||"",cols,rows};
  return f6Tbl(cols.map(c=>c.h),[rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${["money","num","pct","date"].includes(cols[i].t)?"n":""}">${xqFmt(v,cols[i].t)}</td>`).join("")}</tr>`).join("")],"txt")+
   `<div class="row" style="margin-top:6px"><button class="b sec sm" data-xqx="${id}|xlsx">Excel</button><button class="b sec sm" data-xqx="${id}|pdf">PDF</button><button class="b sec sm" data-xqx="${id}|csv">CSV</button><button class="b sec sm" data-xqx="${id}|print">Imprimir</button></div>`;
}
function xqBindExp(){
  document.querySelectorAll("[data-xqx]").forEach(b=>b.onclick=async()=>{
    const [id,f]=b.dataset.xqx.split("|"),T=XQT[id];if(!T)return;const nome=safe(T.titulo).slice(0,40)||"relatorio";
    const spec={titulo:T.titulo,sub:T.sub,cols:T.cols.map(c=>({h:c.h,t:c.t==="pct"||c.t==="num"?undefined:c.t,w:c.w})),rows:T.rows};
    if(f==="xlsx")return f5Xlsx(nome+".xlsx",[spec]);
    if(f==="pdf")return f5Pdf(nome+".pdf",[spec]);
    if(f==="csv"){const cel=s=>{s=String(s==null?"":s);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};const txt="﻿"+[T.cols.map(c=>c.h),...T.rows.map(r=>r.map((v,i)=>T.cols[i].t==="date"&&v?brDate(v):typeof v==="number"?String(v).replace(".",","):v))].map(r=>r.map(cel).join(";")).join("\r\n");try{await saveFile(nome+".csv",txt,"text/csv")}catch(e){toast(e.message,true)}return}
    xmPrint(T.titulo,`<h2>${f6Esc(T.titulo)}</h2><p>${f6Esc(T.sub)}</p>`+f6Tbl(T.cols.map(c=>c.h),[T.rows.map(r=>`<tr>${r.map((v,i)=>`<td>${xqFmt(v,T.cols[i].t)}</td>`).join("")}</tr>`).join("")],"txt"));
  });
}
/* --- metas com semáforo (384) --- */
const XQ_MET=[["ocup","Ocupação (%)","min",v=>v*100],["custoRD","Custo por residente-dia (R$)","max",v=>v],["inad","Inadimplência (%)","max",v=>v*100],["abs","Absenteísmo (%)","max",v=>v*100],["quedas","Quedas por 1.000 residentes-dia","max",v=>v]];
function xqSem(k,v){const m=(xqC().metas||{})[k];if(v==null||m==null||m==="")return{c:"#9e9e9e",t:"sem meta"};const d=XQ_MET.find(x=>x[0]===k)[2],meta=+m,ok=d==="min"?v>=meta:v<=meta,perto=d==="min"?v>=meta*.9:v<=meta*1.1;return ok?{c:"#2e7d32",t:"dentro da meta"}:perto?{c:"#e0a100",t:"perto da meta"}:{c:"#c62828",t:"fora da meta"}}
function xqKpis(ym){
  const m=indMes(ym),ab=(()=>{try{return absenteismo(ym)}catch(e){return null}})(),qd=xpL("incidentes").filter(i=>i.tipo==="Queda"&&String(i.data||"").startsWith(ym)).length+xs("ocor2").filter(o=>o.tipo==="Queda"&&String(o.data||"").startsWith(ym)).length;
  return{ocup:m.ocup,custoRD:m.custoRD,inad:m.inad,abs:ab,quedas:m.rd?qd/m.rd*1000:null,rd:m.rd,qd};
}
const xqNum=(k,v)=>v==null?"—":k==="custoRD"?fmtBRL(v):k==="quedas"?v.toFixed(2).replace(".",","):pctF(v);
xmReg("rel","painel","Painéis","Painel do gestor",()=>{
  const ym=XM.sim.xqm||xqHoje().slice(0,7),ant=(+ym.slice(0,4)-1)+ym.slice(4),K=xqKpis(ym),P=xqKpis(ant),M=xqC().metas||{},pode=podeEd("rel");
  const cards=XQ_MET.map(([k,l,d,cv])=>{const s=xqSem(k,K[k]==null?null:cv(K[k])),var_=K[k]!=null&&P[k]!=null&&P[k]?(K[k]-P[k])/Math.abs(P[k]):null;return`<div class="stat" style="border-left:5px solid ${s.c}"><b>${xqNum(k,K[k])}</b><span>${l}</span><div class="sub">${xqMesFmt(ant)}: ${xqNum(k,P[k])}${var_!=null?` · ${var_>0?"+":""}${Math.round(var_*100)}%`:""}</div><div class="sub" style="color:${s.c}">${s.t}${M[k]!==undefined&&M[k]!==""?` (meta ${d==="min"?"≥":"≤"} ${M[k]})`:""}</div></div>`}).join("");
  const atv=resAll().filter(resAtivo).length,tAt=tarAll().filter(t=>t.status!=="feita"&&tarAtrasada(t)).length,ur=urgencias().filter(u=>u.nivel>=2).length;
  return f6Card("Indicadores-chave da casa",`Comparados com o mesmo mês do ano anterior. Os semáforos usam as metas abaixo.`,`<div class="row" style="align-items:flex-end"><div><label>Mês</label><input type="month" id="xqm" value="${ym}"></div><button class="b sec sm" id="xqmb">Ver</button></div><div class="stats" style="margin-top:10px">${cards}<div class="stat"><b>${atv}</b><span>residentes ativos</span></div><div class="stat"><b>${tAt}</b><span>tarefas atrasadas</span></div><div class="stat"><b>${ur}</b><span>avisos importantes</span></div></div>`)+
  f6Card("Metas",pode?"Deixe em branco o indicador sem meta.":"Somente consulta.",`<div class="row">${XQ_MET.map(([k,l,d])=>`<div><label>${l} ${d==="min"?"mínimo":"máximo"}</label><input type="number" step="any" data-xqmeta="${k}" value="${M[k]===undefined?"":M[k]}" ${pode?"":"disabled"}></div>`).join("")}</div>${pode?'<button class="b sm" id="xqms" style="margin-top:8px">Salvar metas</button>':""}`);
},()=>{const b=$("xqmb");if(b)b.onclick=()=>{XM.sim.xqm=$("xqm").value;xmGo()};const s=$("xqms");if(s)s.onclick=()=>{const m={};document.querySelectorAll("[data-xqmeta]").forEach(i=>{if(i.value!=="")m[i.dataset.xqmeta]=+i.value});xmsave("rel",{metas:m});toast("Metas salvas.");setTimeout(xmGo,200)}});
const xqMesFmt=ym=>ym.slice(5)+"/"+ym.slice(0,4);
/* --- ocupação, permanência e saídas ao longo do tempo (377–379) --- */
xmReg("rel","ocup","Painéis","Ocupação, permanência e saídas",()=>{
  const cap=capacidadeCasa(),meses=mesesEntre(addMesesIso(xqHoje(),-23).slice(0,7),xqHoje().slice(0,7)),S_=meses.map(m=>indMes(m).ocup),pts=meses.map((m,i)=>({x:m+"-01",y:S_[i]==null?0:Math.round(S_[i]*1000)/10}));
  const sai=resAll().filter(r=>r.saida&&r.entrada&&r.saida>=r.entrada),perm=sai.map(r=>daysBetweenIso(r.entrada,r.saida)),med=perm.length?perm.reduce((a,b)=>a+b,0)/perm.length:null;
  const atuais=resAll().filter(r=>resAtivo(r)&&r.entrada).map(r=>daysBetweenIso(r.entrada,xqHoje())),medAt=atuais.length?atuais.reduce((a,b)=>a+b,0)/atuais.length:null;
  const mot={};resAll().filter(r=>r.sit==="Desligado"||r.sit==="Óbito").forEach(r=>{const m=((xmcfg("res").motivos||[]).filter(x=>x.res===r.id).slice(-1)[0]||{}).motivo||(r.sit==="Óbito"?"Óbito":"Não informado");mot[m]=(mot[m]||0)+1});
  const dd=d=>d==null?"—":d>=365?(d/365).toFixed(1).replace(".",",")+" anos":Math.round(d)+" dias";
  return f6Card("Ocupação nos últimos 24 meses",cap?`Capacidade cadastrada: ${cap} vagas. Valores em % de ocupação.`:"Cadastre a capacidade da casa (Indicadores) para calcular.",cap?xmGrafico(pts):'<div class="empty">Sem capacidade cadastrada.</div>')+
  f6Card("Tempo de permanência",`Média de quem já saiu: <b>${dd(med)}</b> (${perm.length} residente(s)). Média de quem está na casa hoje: <b>${dd(medAt)}</b>.`,"")+
  f6Card("Motivos de saída","Do cadastro de ex-residentes.",Object.keys(mot).length?xqTab("motsai","Motivos de saída",["Motivo",{h:"Residentes",t:"num"}],Object.entries(mot).sort((a,b)=>b[1]-a[1])):'<div class="empty">Nenhuma saída registrada.</div>');
},()=>xqBindExp());
/* --- custo completo por residente-dia (380) --- */
xmReg("rel","custo","Painéis","Custo por residente-dia completo",()=>{
  const ym=XM.sim.xqm||xqHoje().slice(0,7),m=indMes(ym),ev=contabEventos().filter(e=>e.sinal<0&&e.comp.startsWith(ym)),por={};
  ev.forEach(e=>{const g=(GRUPOS[e.grupo]||{r:"Outros"}).r;por[g]=(por[g]||0)+e.val});
  const tot=Object.values(por).reduce((a,b)=>a+b,0),rows=Object.entries(por).sort((a,b)=>b[1]-a[1]).map(([g,v])=>[g,v,m.rd?v/m.rd:null,tot?v/tot:0]);
  return f6Card("Custo por residente-dia — "+xqMesFmt(ym),`${m.rd} residentes-dia no mês. Despesas por competência (inclui notas lançadas direto), agrupadas como na contabilidade gerencial. Depreciação e estoque não entram.`,`<div class="row" style="align-items:flex-end"><div><label>Mês</label><input type="month" id="xqm" value="${ym}"></div><button class="b sec sm" id="xqmb">Ver</button></div>`+(rows.length?xqTab("custo","Custo por residente-dia "+xqMesFmt(ym),["Grupo",{h:"Total",t:"money"},{h:"Por residente-dia",t:"money"},{h:"% do total",t:"pct"}],[...rows,["Total",tot,m.rd?tot/m.rd:null,1]],`${m.rd} residentes-dia`):'<div class="empty">Sem despesas no mês.</div>'));
},()=>{const b=$("xqmb");if(b)b.onclick=()=>{XM.sim.xqm=$("xqm").value;xmGo()};xqBindExp()});
/* --- qualidade assistencial e RH (381, 382, 395) --- */
xmReg("rel","qualid","Painéis","Qualidade assistencial e equipe",()=>{
  const meses=mesesEntre(addMesesIso(xqHoje(),-11).slice(0,7),xqHoje().slice(0,7)),I=[...xpL("incidentes"),...xs("ocor2")],cnt=(ym,pred)=>I.filter(i=>String(i.data||"").startsWith(ym)&&pred(i.tipo||"")).length,
   tipos=[["Quedas",t=>t==="Queda"],["Lesões de pele/pressão",t=>/Lesão/.test(t)],["Infecções e surtos",t=>/Infec|Diarreia|Escabiose/.test(t)],["Erros de medicação",t=>/medica/i.test(t)]];
  const rows=tipos.map(([n,p])=>{const v=meses.map(m=>cnt(m,p));return[n,...v,v.reduce((a,b)=>a+b,0)]});
  const ym=XM.sim.xqm||xqHoje().slice(0,7);let rh="";
  try{const r=calcSilencioso(ym+"-01",fimCalc(ym));const U=(r&&r.users||[]).filter(u=>u.ig&&u.ig.id),h=x=>Math.round(x/60*10)/10;
   const R=U.map(u=>{const t=u.t,esc=t.escalados||0,pont=esc?Math.max(0,Math.round((1-(t.late?1:0)*1)*100)):null;return[nomeInteg(u.ig),h(t.worked),h(t.extra||0),h(t.late||0),t.faltas||0,t.atestados||0]});
   rh=xqTab("rhmes","Equipe em "+xqMesFmt(ym),["Integrante",{h:"Horas trabalhadas",t:"num"},{h:"Horas extras",t:"num"},{h:"Atraso (h)",t:"num"},{h:"Faltas",t:"num"},{h:"Atestados",t:"num"}],R.sort((a,b)=>b[3]-a[3]),"Pontualidade: ordenado por atraso acumulado");
  }catch(e){rh='<div class="empty">Sem dados de ponto para o mês.</div>'}
  return f6Card("Eventos assistenciais — últimos 12 meses","Registros de incidentes e ocorrências por mês.",xqTab("qual","Eventos assistenciais",["Evento",...meses.map(m=>({h:m.slice(5)+"/"+m.slice(2,4),t:"num"})),{h:"Total",t:"num"}],rows))+
  f6Card("Equipe, horas e pontualidade",`Mês: <input type="month" id="xqm" value="${ym}"> <button class="b sec sm" id="xqmb">Ver</button> · rotatividade nos últimos 12 meses: <b>${pctF(rotatividade().taxa)}</b>`,rh);
},()=>{const b=$("xqmb");if(b)b.onclick=()=>{XM.sim.xqm=$("xqm").value;xmGo()};xqBindExp()});
/* --- relatórios prontos (391–397) --- */
const XQ_REL={
 ocorr:["Ocorrências por tipo",(a,b)=>{const I=[...xpL("incidentes"),...xs("ocor2")].filter(i=>i.data>=a&&i.data<=b),p={};I.forEach(i=>{const t=i.tipo||"Outro";p[t]=(p[t]||0)+1});return{cols:["Tipo",{h:"Ocorrências",t:"num"}],rows:Object.entries(p).sort((x,y)=>y[1]-x[1])}}],
 visitas:["Visitas",(a,b)=>({cols:["Data","Residente","Visitante","Parentesco","Chegada","Saída"],rows:(xmcfg("res").visitas||[]).filter(v=>v.data>=a&&v.data<=b&&v.tipo!=="agendada").sort((x,y)=>x.data.localeCompare(y.data)).map(v=>[v.data,xmResNome(v.res),v.visitante,v.parent||"",v.hora||"",v.saida||""])})],
 vigil:["Indicadores para a vigilância sanitária",(a,b)=>{const m=a.slice(0,7),mi=indMes(m),rows=OCO_RDC.map(t=>[t,mi.evt[t],mi.rd?mi.evt[t]/mi.rd*1000:null]);return{cols:["Evento (RDC 502)",{h:"No mês",t:"num"},{h:"Por 1.000 residentes-dia",t:"num"}],rows,sub:`Mês de ${xqMesFmt(m)} · ${mi.rd} residentes-dia. Confirme na norma vigente os indicadores exigidos pela sua vigilância.`}}],
 pontual:["Pontualidade da equipe",(a,b)=>{const r=calcSilencioso(a,b),U=(r&&r.users||[]).filter(u=>u.ig&&u.ig.id);return{cols:["Integrante",{h:"Atraso (min)",t:"num"},{h:"Faltas",t:"num"},{h:"Esquecimentos",t:"num"}],rows:U.map(u=>[nomeInteg(u.ig),Math.round(u.t.late||0),u.t.faltas||0,u.t.esquecidos||0]).sort((x,y)=>y[1]-x[1])}}],
 anivers:["Aniversariantes e datas",(a,b)=>{const L=[];const add=(n,d,t)=>{if(!d)return;const m=d.slice(5,7);L.push([m,d.slice(8),n,t])};integList().forEach(i=>{add(nomeInteg(i),i.nascimento,"Integrante (aniversário)");add(nomeInteg(i),i.admissao,"Integrante (admissão)")});resAll().filter(resAtivo).forEach(r=>{add(resNome(r),r.nasc,"Residente (aniversário)");add(resNome(r),r.entrada,"Residente (entrada na casa)")});return{cols:["Mês","Dia","Nome","Data"],rows:L.sort((x,y)=>x[0].localeCompare(y[0])||x[1].localeCompare(y[1]))}}],
 docs:["Documentos vencidos e a vencer (60 dias)",(a,b)=>{const L=typeof xjVencimentos==="function"?xjVencimentos(addDaysIso(xqHoje(),60)):[];return{cols:[{h:"Vence",t:"date"},"Tipo","O que"],rows:L.map(x=>[x.d,x.tipo,x.t])}}]
};
xmReg("rel","prontos","Relatórios","Relatórios prontos",()=>{
  const k=XM.sim.xqr||"ocorr",a=XM.sim.xqa||addDaysIso(xqHoje(),-30),b=XM.sim.xqb||xqHoje();let out="";
  try{const R=XQ_REL[k][1](a,b);out=R.rows.length?xqTab("rp_"+k,XQ_REL[k][0],R.cols,R.rows,R.sub||`Período: ${brDate(a)} a ${brDate(b)}`):'<div class="empty">Nada encontrado no período.</div>'}catch(e){out=`<div class="empty">Não foi possível montar: ${f6Esc(e.message)}</div>`}
  return f6Card("Relatórios prontos","Escolha o relatório e o período. Todos podem ser baixados em Excel, PDF ou CSV.",`<div class="row" style="align-items:flex-end"><div><label>Relatório</label><select id="xqr">${Object.entries(XQ_REL).map(([i,r])=>`<option value="${i}" ${i===k?"selected":""}>${r[0]}</option>`).join("")}</select></div><div><label>De</label><input type="date" id="xqa" value="${a}"></div><div><label>Até</label><input type="date" id="xqb" value="${b}"></div><button class="b sec sm" id="xqrb">Ver</button></div><div style="margin-top:10px">${out}</div>`);
},()=>{const b=$("xqrb");if(b)b.onclick=()=>{XM.sim.xqr=$("xqr").value;XM.sim.xqa=$("xqa").value;XM.sim.xqb=$("xqb").value;xmGo()};xqBindExp()});
/* --- construtor de relatórios com filtros salvos (399, 387) --- */
const XQ_FONTES={
 res:["Residentes",()=>resAll(),{nome:["Nome",r=>resNome(r)],quarto:["Quarto",r=>r.quarto],grau:["Grau",r=>r.grau],sit:["Situação",r=>r.sit],entrada:["Entrada",r=>r.entrada,"date"],saida:["Saída",r=>r.saida,"date"],nasc:["Nascimento",r=>r.nasc,"date"],mensalidade:["Mensalidade",r=>+r.mensalidade||0,"money"],resp:["Responsável",r=>(r.resp||{}).nome]}],
 col:["Integrantes",()=>integList(),{nome:["Nome",i=>nomeInteg(i)],cargo:["Cargo",i=>i.cargo],admissao:["Admissão",i=>i.admissao,"date"],situacao:["Situação",i=>i.situacao||"Ativo"],nasc:["Nascimento",i=>i.nascimento,"date"]}],
 fin:["Lançamentos financeiros",()=>finAll(),{tipo:["Tipo",e=>e.tipo==="pagar"?"Pagar":"Receber"],desc:["Descrição",e=>e.desc],contra:["Favorecido/cliente",e=>e.contra],cat:["Categoria",e=>e.cat],venc:["Vencimento",e=>e.venc,"date"],pago:["Pago em",e=>e.pago,"date"],valor:["Valor",e=>+e.valor||0,"money"]}],
 est:["Estoque",()=>estData().itens,{nome:["Item",i=>i.nome],qtd:["Quantidade",i=>+i.qtd||0,"num"],un:["Unidade",i=>i.unidade],min:["Mínimo",i=>+i.minimo||0,"num"],custo:["Custo unitário",i=>+i.custo||0,"money"]}],
 tar:["Tarefas",()=>tarAll(),{titulo:["Tarefa",t=>t.titulo],data:["Data",t=>t.data,"date"],prio:["Prioridade",t=>t.prio],resp:["Responsável",t=>nomeDe(t.resp)],area:["Área",t=>t.area],status:["Situação",t=>t.status]}],
 nf:["Itens de notas fiscais",()=>(((S.config.nf||{}).rows)||[]),{date:["Data",r=>r.date,"date"],local:["Fornecedor",r=>r.local],item:["Item",r=>r.item],qtd:["Qtd",r=>+r.qtd||0,"num"],total:["Total",r=>+r.total||0,"money"],cat:["Categoria",r=>r.categoria]}]
};
function xqRoda(d){
  const F=XQ_FONTES[d.fonte];if(!F)return null;const cols=d.cols.filter(c=>F[2][c]);
  let L=F[1]();(d.filtros||[]).filter(f=>f.col&&F[2][f.col]&&f.val!=="").forEach(f=>{const g=F[2][f.col][1],v=String(f.val).toLowerCase(),n=parseFloat(String(f.val).replace(",","."));L=L.filter(x=>{const a=g(x),s=String(a==null?"":a).toLowerCase();return f.op==="="?s===v:f.op===">="?(!isNaN(n)&&!isNaN(+a)?+a>=n:s>=v):f.op==="<="?(!isNaN(n)&&!isNaN(+a)?+a<=n:s<=v):s.includes(v)})});
  return{titulo:d.nome||F[0],cols:cols.map(c=>({h:F[2][c][0],t:F[2][c][2]})),rows:L.map(x=>cols.map(c=>F[2][c][1](x)))};
}
xmReg("rel","constr","Relatórios","Construtor de relatórios",()=>{
  const fo=XM.sim.xqf||"res",F=XQ_FONTES[fo],st=XM.sim.xqd||{cols:Object.keys(F[2]),filtros:[{col:"",op:"contém",val:""}]},salvos=xqL("salvos");if(st.fonte!==fo){st.fonte=fo;if(!XM.sim.xqd||XM.sim.xqd.fonte!==fo)st.cols=Object.keys(F[2])}XM.sim.xqd=st;
  let res="";if(XM.sim.xqgo){const R=xqRoda(st);res=R&&R.rows.length?`<p class="sub">${R.rows.length} linha(s)</p>`+xqTab("constr",R.titulo,R.cols,R.rows,"Gerado em "+brDate(xqHoje())):'<div class="empty">Nenhum registro com esses filtros.</div>'}
  return f6Card("Montar um relatório","Escolha a fonte, as colunas e os filtros. Dá para salvar o modelo e rodar de novo depois.",`<div class="row" style="align-items:flex-end"><div><label>Fonte dos dados</label><select id="xqf">${Object.entries(XQ_FONTES).map(([k,v])=>`<option value="${k}" ${k===fo?"selected":""}>${v[0]}</option>`).join("")}</select></div><div><label>Salvos</label><select id="xqsv"><option value="">Abrir um salvo…</option>${salvos.map(s=>`<option value="${s.id}">${f6Esc(s.nome)}</option>`).join("")}</select></div></div><div style="margin:8px 0">${Object.entries(F[2]).map(([k,c])=>`<label style="display:inline-block;margin-right:12px;font-weight:400"><input type="checkbox" data-xqcol="${k}" ${st.cols.includes(k)?"checked":""}> ${c[0]}</label>`).join("")}</div><div class="row" style="align-items:flex-end"><div><label>Filtrar coluna</label><select id="xqfc"><option value="">—</option>${Object.entries(F[2]).map(([k,c])=>`<option value="${k}" ${st.filtros[0].col===k?"selected":""}>${c[0]}</option>`).join("")}</select></div><div><label>Condição</label><select id="xqfo">${["contém","=",">=","<="].map(o=>`<option ${st.filtros[0].op===o?"selected":""}>${o}</option>`).join("")}</select></div><div><label>Valor (datas: AAAA-MM-DD)</label><input id="xqfv" value="${f6Esc(st.filtros[0].val)}"></div><button class="b sm" id="xqgo">Gerar</button></div><div class="row" style="margin-top:8px;align-items:flex-end"><div><label>Nome para salvar</label><input id="xqnm" value="${f6Esc(st.nome||"")}"></div><button class="b sec sm" id="xqsave">Salvar este modelo</button></div>`)+(res?f6Card("Resultado","",res):"");
},()=>{
  const lê=()=>{const st=XM.sim.xqd;st.cols=[...document.querySelectorAll("[data-xqcol]:checked")].map(c=>c.dataset.xqcol);st.filtros=[{col:$("xqfc").value,op:$("xqfo").value,val:$("xqfv").value}];st.nome=$("xqnm").value.trim();return st};
  $("xqf").onchange=()=>{XM.sim.xqf=$("xqf").value;XM.sim.xqd=null;XM.sim.xqgo=false;xmGo()};
  $("xqgo").onclick=()=>{lê();XM.sim.xqgo=true;xmGo()};
  $("xqsave").onclick=()=>{const st=lê();if(!st.nome)return toast("Dê um nome ao modelo.",true);xmsave("rel",{salvos:[...xqL("salvos").filter(s=>s.nome!==st.nome),{id:uid8(),nome:st.nome,fonte:XM.sim.xqf||"res",cols:st.cols,filtros:st.filtros}]});toast("Modelo salvo.");setTimeout(xmGo,200)};
  $("xqsv").onchange=()=>{const s=xqL("salvos").find(x=>x.id===$("xqsv").value);if(!s)return;XM.sim.xqf=s.fonte;XM.sim.xqd={...s};XM.sim.xqgo=true;xmGo()};
  xqBindExp()});
/* --- relatório mensal da diretoria (385, 386) --- */
function xqDiretoria(ym){
  const K=xqKpis(ym),ant=(+ym.slice(0,4)-1)+ym.slice(4),P=xqKpis(ant),m=indMes(ym),ev=contabEventos(),rec=ev.filter(e=>e.sinal>0&&e.comp.startsWith(ym)).reduce((s,e)=>s+e.val,0),des=ev.filter(e=>e.sinal<0&&e.comp.startsWith(ym)).reduce((s,e)=>s+e.val,0);
  const inc=[...xpL("incidentes"),...xs("ocor2")].filter(i=>String(i.data||"").startsWith(ym)),urg=urgencias().filter(u=>u.nivel>=2).slice(0,15);
  return`<h2>${f6Esc(empresa().razao||"Casa Hiro")} — Relatório de ${xqMesFmt(ym)}</h2><h3>Indicadores</h3>`+f6Tbl(["Indicador","Mês",xqMesFmt(ant)],[XQ_MET.map(([k,l])=>`<tr><td>${l}</td><td>${xqNum(k,K[k])}</td><td>${xqNum(k,P[k])}</td></tr>`).join("")],"txt")+
  `<h3>Resultado financeiro (competência)</h3><p>Receitas: <b>${fmtBRL(rec)}</b> · Despesas: <b>${fmtBRL(des)}</b> · Resultado: <b>${fmtBRL(rec-des)}</b>. Inadimplência: ${pctF(m.inad)}.</p><h3>Eventos assistenciais</h3><p>${inc.length?inc.length+" registro(s): "+Object.entries(inc.reduce((p,i)=>(p[i.tipo||"Outro"]=(p[i.tipo||"Outro"]||0)+1,p),{})).map(([t,n])=>t+" ("+n+")").join(", "):"Nenhum evento registrado."}</p><h3>Pontos de atenção</h3>`+(urg.length?`<ul>${urg.map(u=>`<li>${f6Esc(u.titulo)}${u.detalhe?" — "+f6Esc(u.detalhe):""}</li>`).join("")}</ul>`:"<p>Nada importante pendente.</p>")+`<p class="sub">Gerado em ${brDate(xqHoje())}. Números gerenciais.</p>`;
}
xmReg("rel","diretoria","Relatórios","Relatório mensal para a diretoria",()=>{
  const ym=XM.sim.xqm||addMesesIso(xqHoje(),-1).slice(0,7);
  return f6Card("Relatório mensal","Resumo de indicadores, finanças, eventos e pontos de atenção em uma página para imprimir ou salvar em PDF.",`<div class="row" style="align-items:flex-end"><div><label>Mês</label><input type="month" id="xqm" value="${ym}"></div><button class="b sec sm" id="xqmb">Ver</button><button class="b sm" id="xqdp">Imprimir / PDF</button><button class="b sec sm" id="xqdl">Criar lembrete mensal</button></div><p class="sub">Envio automático por e-mail não é possível nesta versão: não existe servidor para disparar mensagens. O botão “Criar lembrete mensal” agenda uma tarefa em Agenda e tarefas, todo mês, para gerar e enviar o relatório.</p><div id="xqdv" style="margin-top:10px">${xqDiretoria(ym)}</div>`);
},()=>{const b=$("xqmb");if(b)b.onclick=()=>{XM.sim.xqm=$("xqm").value;xmGo()};const p=$("xqdp");if(p)p.onclick=()=>xmPrint("Relatório mensal",$("xqdv").innerHTML);
  const l=$("xqdl");if(l)l.onclick=()=>{if(!podeEd("agenda"))return toast("Sem permissão na agenda.");const g=uid8(),n=[];for(let k=0;k<12;k++)n.push({id:uid8(),titulo:"Gerar e enviar o relatório mensal da diretoria",desc:"Central de relatórios → Relatório mensal para a diretoria",prio:"normal",resp:"",area:"Administrativo",status:"aberta",feitaEm:null,data:addMesesIso(xqHoje().slice(0,8)+"05",k+1),grupo:g});tarMutate(a=>[...a,...n]);toast("12 lembretes criados na agenda (dia 5 de cada mês).")}});


/* >>> x_m14.js */
