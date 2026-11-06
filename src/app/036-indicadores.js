/* ================= INDICADORES ================= */
const IND={ym:hojeIso().slice(0,7)};
const diasNoMes=ym=>+mesFimIso(ym).slice(8);
function residentesDia(ini,fim){
  let t=0;
  resAll().forEach(r=>{const a=(r.entrada&&r.entrada>ini)?r.entrada:ini,b=(r.saida&&r.saida<fim)?r.saida:fim;
    if(r.sit==="Ativo"||r.entrada||r.saida){if(!r.entrada&&r.sit!=="Ativo")return;if(b>=a)t+=daysBetweenIso(a,b)+1}});
  return t;
}
function indMes(ym){
  const ini=ym+"-01",fimMes=mesFimIso(ym),fim=fimMes>hojeIso()?hojeIso():fimMes,cap=capacidadeCasa();
  const rd=fim>=ini?residentesDia(ini,fim):0,dias=fim>=ini?daysBetweenIso(ini,fim)+1:0;
  const desp=soma(finAll().filter(e=>e.tipo==="pagar"&&e.venc.slice(0,7)===ym),e=>finNum(e));
  const rec=finAll().filter(e=>e.tipo==="receber"&&e.venc.slice(0,7)===ym),recTot=soma(rec,e=>+e.valor||0);
  const recVenc=soma(rec.filter(e=>!e.pago&&e.venc<hojeIso()),e=>+e.valor||0);
  const recPago=soma(rec.filter(e=>e.pago),e=>finNum(e));
  const evt={};OCO_RDC.forEach(t=>{evt[t]=xs("ocor2").filter(o=>o.tipo===t&&(String(o.data||"")).startsWith(ym)).length});
  const obitos=Math.max(evt["Óbito"],resAll().filter(r=>r.sit==="Óbito"&&(r.saida||"").startsWith(ym)).length);evt["Óbito"]=obitos;
  return{ym,rd,dias,ocup:cap&&dias?rd/(cap*dias):null,desp,custoRD:rd?desp/rd:null,recTot,recVenc,recPago,inad:recTot?recVenc/recTot:null,evt};
}
function absenteismo(ym){
  const f=fimCalc(ym);if(f<ym+"-01")return null;
  const r=calcSilencioso(ym+"-01",f);if(!r||r.erro)return null;
  let esp=0,falta=0;r.users.forEach(u=>{esp+=u.t.expected;falta+=Math.max(0,u.t.expected-u.t.worked)});
  return esp?falta/esp:null;
}
function rotatividade(){
  const h=hojeIso(),ini=addDaysIso(h,-365),L=integList().filter(i=>!(i.ponto==="nao"&&!i.cargo)),des=L.filter(i=>i.desligamento&&i.desligamento>=ini&&i.desligamento<=h).length,adm=L.filter(i=>i.admissao&&i.admissao>=ini&&i.admissao<=h).length;
  const at=L.filter(i=>(i.situacao||"Ativo")!=="Desligado").length,media=Math.max(1,(at+des+Math.max(0,at-adm))/2);
  return{des,adm,at,taxa:des/media};
}
const pctF=v=>v==null?"—":(v*100).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%";
function barras(vals,rot,fmt,cor){
  const mx=Math.max(1e-9,...vals.filter(v=>v!=null));
  return `<div style="display:flex;align-items:flex-end;gap:6px;height:110px;margin-top:6px">${vals.map((v,i)=>`<div style="flex:1;text-align:center;font-size:11px"><div style="height:${v==null?0:Math.max(2,Math.round(80*v/mx))}px;background:${cor||"var(--verde,#4a7c59)"};border-radius:3px 3px 0 0;margin:0 auto;width:70%"></div><div style="color:var(--mute,#777)">${v==null?"":fmt(v)}</div><div style="color:var(--mute,#777)">${rot[i]}</div></div>`).join("")}</div>`;
}
function indHtml(){
  const ym=IND.ym,m=indMes(ym),cap=capacidadeCasa(),ab=absenteismo(ym),rot=rotatividade(),pode=podeEd("ind");
  const meses=mesesEntre(addMesesIso(hojeIso(),-5).slice(0,7),hojeIso().slice(0,7)),ser=meses.map(x=>indMes(x));
  const atv=resAll().filter(resAtivo).length;
  const card=(t,v,sub,cls)=>`<div class="stat ${cls||""}"><b>${v}</b><span>${t}</span>${sub?`<div class="sub" style="margin-top:2px">${sub}</div>`:""}</div>`;
  return `<div class="card"><div class="row" style="align-items:flex-end"><div style="flex:0 0 190px"><label>Mês</label><input type="month" id="indym" value="${ym}"></div>
    <div style="flex:0 0 190px"><label>Capacidade da casa (vagas)</label><input type="number" min="0" id="indcap" value="${cap||""}" ${pode?"":"disabled"}></div>${pode?`<button class="b sec" id="indcapsv" style="flex:none">Salvar</button>`:""}</div>
   <div class="stats" style="margin-top:12px">
    ${card("ocupação no mês",cap?pctF(m.ocup):"—",cap?`${atv} de ${cap} vagas hoje`:"defina a capacidade")}
    ${card("residentes-dia",m.rd,`${m.dias} dia(s) no período`)}
    ${card("custo por residente-dia",m.custoRD==null?"—":"R$ "+NUMF(m.custoRD),"despesas do mês ÷ residentes-dia")}
    ${card("inadimplência do mês",pctF(m.inad),m.recVenc?"R$ "+NUMF(m.recVenc)+" vencido":"nada vencido",m.inad>0.1?"warn":"")}
    ${card("absenteísmo",pctF(ab),"horas não trabalhadas ÷ esperadas")}
    ${card("rotatividade (12 meses)",pctF(rot.taxa),`${rot.des} saída(s) · ${rot.adm} admissão(ões)`)}</div></div>
   <div class="card"><h2>Últimos 6 meses</h2><div class="grid g2"><div><b>Ocupação</b>${barras(ser.map(x=>x.ocup),meses.map(x=>x.slice(5)+"/"+x.slice(2,4)),pctF)}</div><div><b>Custo por residente-dia (R$)</b>${barras(ser.map(x=>x.custoRD),meses.map(x=>x.slice(5)+"/"+x.slice(2,4)),v=>NUMF(v,0),"var(--madeira,#a0734a)")}</div></div></div>
   <div class="card"><h2>Eventos acompanhados (RDC 502/2021)</h2><p class="sub" style="margin:0 0 8px">Contagem registrada em Cuidados e rotina → Ocorrências. A taxa é por 1.000 residentes-dia. Confirme na norma vigente quais eventos e prazos devem ser notificados à vigilância.</p>
    <div class="wrap"><table><thead><tr><th>Evento</th><th class="n">No mês</th><th class="n">Taxa / 1.000 res.-dia</th></tr></thead><tbody>${OCO_RDC.map(t=>`<tr><td>${esc(t)}</td><td class="n">${m.evt[t]}</td><td class="n">${m.rd?NUMF(1000*m.evt[t]/m.rd,1):"—"}</td></tr>`).join("")}</tbody></table></div></div>
   ${podeVer("contab")?dreBloco():""}
   <div class="card"><h2>Pacote mensal do contador</h2><p class="sub" style="margin:0 0 8px">Baixa, de uma vez e compactado, o que o contador costuma pedir de ${MESES_PT[+ym.slice(5)-1].toLowerCase()} de ${ym.slice(0,4)}: contas a pagar e a receber, fluxo, resultado por categoria e área, notas fiscais, DRE, balanço, folha e ponto. Só entram os relatórios que o seu perfil pode ver.</p>
    <button class="b" id="indpac" style="flex:none">${ic("down")} Baixar pacote do mês</button></div>`;
}
function dreBloco(){
  let d;try{d=dreComparada(+IND.ym.slice(0,4),+IND.ym.slice(5)-1,"competencia")}catch(e){return""}
  return `<div class="card"><h2>Resultado do mês (DRE) comparado ao mês anterior</h2><div class="wrap"><table><thead><tr><th></th><th class="n">${esc(d.p.rot)}</th><th class="n">${esc(d.p.pRot)}</th><th class="n">Variação</th></tr></thead><tbody>${d.linhas.map(l=>{const v=l.v,p=l.prev,dv=p?(v-p)/Math.abs(p):null;return `<tr ${l.est?'style="font-weight:600"':""}><td>${esc(l.r)}</td><td class="n">R$ ${NUMF(v)}</td><td class="n">R$ ${NUMF(p)}</td><td class="n">${dv==null?"—":(dv>0?"+":"")+pctF(dv)}</td></tr>`}).join("")}</tbody></table></div></div>`;
}
function bindInd(){
  const m=$("indym");if(m)m.onchange=()=>{if(m.value){IND.ym=m.value;go("ind",true)}};
  const c=$("indcapsv");if(c)c.onclick=()=>{xcfgSave("ind",{capacidade:+$("indcap").value||0});toast("Capacidade salva.");go("ind",true)};
  const p=$("indpac");if(p)p.onclick=()=>{REL.ano=+IND.ym.slice(0,4);REL.mes=+IND.ym.slice(5)-1;
    relBaixar(["fin_pagar","fin_receber","fin_fluxo","fin_cat","fin_area","nf_itens","nf_cat","cb_dre","cb_bp","gp_folha","dp_resumo","dp_contador"],["xlsx","pdf"])};
}
PGX.ind=xpage("ind","Indicadores","Ocupação, custo por residente-dia, inadimplência, absenteísmo, rotatividade e eventos acompanhados pela vigilância.","chart",[{k:"i",l:"Indicadores",html:indHtml,bind:bindInd}]);
XURG.push((L,h)=>{
  if(!podeVer("ind"))return;
  const m=indMes(h.slice(0,7));
  if(!capacidadeCasa()&&resAll().length)L.push({nivel:1,tipo:"Indicadores",titulo:"Informe a capacidade da casa",detalhe:"necessária para calcular a ocupação e as vagas livres",quando:null,rota:"ind",res:{k:"indcap"},resLabel:"Informar"});
  if(m.inad!=null&&m.inad>0.15&&m.recVenc>0)L.push({nivel:2,tipo:"Indicadores",titulo:`Inadimplência do mês em ${pctF(m.inad)}`,detalhe:`R$ ${NUMF(m.recVenc)} em mensalidades vencidas`,quando:null,rota:"ind",res:{k:"indcap"},resLabel:"Ver indicadores"});
});
XRES.indcap=()=>go("ind");
REPORTS.push({id:"ix_kpis",g:"Indicadores",t:"Indicadores do mês",d:"Ocupação, custo por residente-dia, inadimplência, absenteísmo e eventos do mês escolhido na tela Indicadores.",pii:false,b:()=>{const m=indMes(IND.ym),ab=absenteismo(IND.ym),rot=rotatividade();
 return{titulo:"Indicadores — "+IND.ym.slice(5)+"/"+IND.ym.slice(0,4),sub:relSub({},false),sensivel:false,cols:[{h:"Indicador",w:40},{h:"Valor",w:20},{h:"Observação",w:44}],
  rows:[["Ocupação média",pctF(m.ocup),"capacidade "+(capacidadeCasa()||"não informada")],["Residentes-dia",String(m.rd),""],["Despesas do mês","R$ "+NUMF(m.desp),"contas a pagar com vencimento no mês"],["Custo por residente-dia",m.custoRD==null?"—":"R$ "+NUMF(m.custoRD),""],["Inadimplência",pctF(m.inad),"R$ "+NUMF(m.recVenc)+" vencido"],["Absenteísmo",pctF(ab),"horas não trabalhadas ÷ esperadas"],["Rotatividade (12 meses)",pctF(rot.taxa),`${rot.des} saídas / ${rot.adm} admissões`],...OCO_RDC.map(t=>["Evento: "+t,String(m.evt[t]),m.rd?NUMF(1000*m.evt[t]/m.rd,1)+" por 1.000 res.-dia":""])]}}});


/* >>> x_nf.js */
