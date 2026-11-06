/* ===== Financeiro 4 (parte 3): calendário, relatórios comparativos, ajustes ===== */
/* ---------- calendário de vencimentos ---------- */
const F4CAL={ano:0,mes:0};
function f4CalIni(){if(!F4CAL.ano){const h=hojeIso();F4CAL.ano=+h.slice(0,4);F4CAL.mes=+h.slice(5,7)-1}}
const f4Guias=()=>f4cfg().guias||[];
function finCalHtml(){
  f4CalIni();
  const{ano,mes}=F4CAL,h=hojeIso(),ult=new Date(ano,mes+1,0).getDate(),ini=new Date(ano,mes,1).getDay(),pref=`${ano}-${f4pad(mes+1)}-`;
  const por={};finAll().filter(e=>e.venc.startsWith(pref)&&!e.cancelada).forEach(e=>{(por[e.venc]=por[e.venc]||[]).push(e)});
  const ab=l=>l.filter(e=>!e.pago),sP=l=>soma(ab(l).filter(e=>e.tipo==="pagar"),e=>+e.valor),sR=l=>soma(ab(l).filter(e=>e.tipo==="receber"),e=>+e.valor);
  const todos=Object.values(por).flat(),guias=f4Guias();
  const cel=[];for(let i=0;i<ini;i++)cel.push(`<div class="f4c0"></div>`);
  for(let d=1;d<=ult;d++){
    const iso=pref+f4pad(d),l=por[iso]||[],p=sP(l),r=sR(l),pg=l.filter(e=>e.pago).length,g=guias.filter(x=>+x.dia===d),fer=feriadoNome(iso);
    const venc=iso<h&&(p>0||r>0);
    cel.push(`<button type="button" class="f4day${iso===h?" hoje":""}${venc?" venc":""}${fer?" fer":""}" data-f4dia="${iso}" title="${esc(fer)}"><span class="f4dn">${d}</span>${p?`<span class="f4p">−${NUMF(p,0)}</span>`:""}${r?`<span class="f4r">+${NUMF(r,0)}</span>`:""}${pg?`<span class="f4k">✓ ${pg}</span>`:""}${g.length?`<span class="f4g">${g.length>1?g.length+" guias":esc(g[0].nome)}</span>`:""}</button>`);
  }
  return `<div class="card"><div class="row" style="align-items:flex-end;margin-bottom:10px"><button type="button" class="b sec sm" id="f4calp" style="flex:none">◀</button><div class="grow"><h2 style="margin:0">${MESES_PT[mes]} de ${ano}</h2></div><button type="button" class="b sec sm" id="f4calh" style="flex:none">Hoje</button><button type="button" class="b sec sm" id="f4caln" style="flex:none">▶</button></div>
   <div class="stats"><div class="stat warn"><b>${fmtBRL(sP(todos))}</b><span>a pagar em aberto no mês</span></div><div class="stat blue"><b>${fmtBRL(sR(todos))}</b><span>a receber em aberto no mês</span></div><div class="stat"><b>${todos.filter(e=>e.pago).length} / ${todos.length}</b><span>contas já pagas ou recebidas</span></div></div>
   <div class="f4cal"><div class="f4h">Dom</div><div class="f4h">Seg</div><div class="f4h">Ter</div><div class="f4h">Qua</div><div class="f4h">Qui</div><div class="f4h">Sex</div><div class="f4h">Sáb</div>${cel.join("")}</div>
   <p class="sub" style="margin:8px 0 0">Vermelho: a pagar em aberto · verde: a receber em aberto · ✓ já resolvidas. Toque no dia para ver as contas e dar baixa.${guias.length?" Lembretes de guias aparecem em amarelo.":" Cadastre lembretes de guias (FGTS, INSS…) na aba Ajustes."}</p></div>`;
}
function f4DiaModal(iso){
  const l=finAll().filter(e=>e.venc===iso&&!e.cancelada).sort((a,b)=>a.tipo.localeCompare(b.tipo)||a.desc.localeCompare(b.desc)),d=+iso.slice(8),g=f4Guias().filter(x=>+x.dia===d),pode=podeEd("fin");
  const ov=openModal(`<h3>${brDate(iso)} ${feriadoNome(iso)?`<span class="sub">· ${esc(feriadoNome(iso))}</span>`:""}</h3>
   <div style="max-height:50vh;overflow:auto">${g.map(x=>`<div class="doc"><div class="grow"><div class="nm">📌 Guia: ${esc(x.nome)}</div><div class="sub">lembrete mensal — confirme valor e vencimento com o contador</div></div>${pode?`<button class="b sm" data-f4gl="${esc(x.id)}">Lançar</button>`:""}</div>`).join("")}
   ${l.map(e=>`<div class="doc"><div class="grow"><div class="nm">${e.tipo==="pagar"?"↓ Pagar":"↑ Receber"}: ${esc(e.desc)}${e.parcela?" ("+esc(e.parcela)+")":""}</div><div class="sub">${esc(e.contra||"")}${e.cat?" · "+esc(e.cat):""}</div></div><b>${fmtBRL(finNum(e))}</b>${finPill(e)}${pode&&!e.pago?`<button class="b sm" data-f4db="${e.id}">${ic("check")}</button>`:""}${pode?`<button class="b sec sm" data-f4de="${e.id}">${ic("edit")}</button>`:""}</div>`).join("")||(g.length?"":`<div class="empty">Nada vence neste dia.</div>`)}</div>
   ${pode?`<div class="row" style="margin-top:10px"><button class="b" id="f4dp" style="flex:none">${ic("plus")} Conta a pagar neste dia</button><button class="b sec" id="f4dr" style="flex:none">${ic("plus")} Conta a receber neste dia</button></div>`:""}
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="b sec" id="f4dx">Fechar</button></div>`);
  const novo=(tipo,pre)=>{ov.remove();openFinLanc(null,tipo,pre);const v=document.getElementById("flvenc");if(v){v.value=iso;v.dispatchEvent(new Event("input"))}};
  ov.querySelector("#f4dx").onclick=()=>ov.remove();
  const bp=ov.querySelector("#f4dp");if(bp){bp.onclick=()=>novo("pagar");ov.querySelector("#f4dr").onclick=()=>novo("receber")}
  ov.querySelectorAll("[data-f4db]").forEach(b=>b.onclick=()=>{ov.remove();openFinBaixa(b.dataset.f4db)});
  ov.querySelectorAll("[data-f4de]").forEach(b=>b.onclick=()=>{ov.remove();openFinLanc(b.dataset.f4de)});
  ov.querySelectorAll("[data-f4gl]").forEach(b=>b.onclick=()=>{const x=f4Guias().find(y=>y.id===b.dataset.f4gl);novo("pagar",{desc:x?"Guia "+x.nome:"Guia",cat:"Impostos e taxas"})});
}
function bindCal(){
  f4CalIni();const re=()=>go("fin",true);
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  on("f4calp",()=>{F4CAL.mes--;if(F4CAL.mes<0){F4CAL.mes=11;F4CAL.ano--}re()});
  on("f4caln",()=>{F4CAL.mes++;if(F4CAL.mes>11){F4CAL.mes=0;F4CAL.ano++}re()});
  on("f4calh",()=>{F4CAL.ano=0;re()});
  document.querySelectorAll("[data-f4dia]").forEach(b=>b.onclick=()=>f4DiaModal(b.dataset.f4dia));
}
/* ---------- relatórios gerenciais: comparação com o período anterior, curva ABC e PDF ---------- */
function f4RelAnt(){
  if(!F4.cmp)return null;
  if(FIN.mes<0)return{ano:FIN.ano-1,mes:-1,rot:`ano ${FIN.ano-1}`};
  if(F4.cmp==="ano")return{ano:FIN.ano-1,mes:FIN.mes,rot:`${MESES_PT[FIN.mes]}/${FIN.ano-1}`};
  const m=FIN.mes-1;return m<0?{ano:FIN.ano-1,mes:11,rot:`Dezembro/${FIN.ano-1}`}:{ano:FIN.ano,mes:m,rot:`${MESES_PT[m]}/${FIN.ano}`};
}
function f4RelDados(){
  const cur=finRelData(),ant=f4RelAnt(),pa=ant?finRelData(ant):null;
  const mk=(titulo,col,m,pm,limite,abc)=>{
    const ord=abc?(a,b)=>m[b].s-m[a].s:(a,b)=>(m[b].s+m[b].e)-(m[a].s+m[a].e);
    const ks=Object.keys(m).sort(ord),topo=ks.slice(0,limite||999),ou=ks.slice(topo.length),res=k=>m[k].e-m[k].s,ra=k=>pm&&pm[k]?pm[k].e-pm[k].s:0;
    const totS=soma(ks,k=>m[k].s);let ac=0;
    const lin=topo.map(k=>{const o={k,e:m[k].e,s:m[k].s,r:res(k),a:pm?ra(k):null};if(abc){const antes=totS?ac/totS*100:0;ac+=m[k].s;o.pa=totS?ac/totS*100:0;o.cl=m[k].s<=0?"":antes<80?"A":antes<95?"B":"C"}return o});
    const demais=ou.length?{k:`Demais (${ou.length})`,e:soma(ou,k=>m[k].e),s:soma(ou,k=>m[k].s),r:soma(ou,res),a:pm?soma(ou,ra):null}:null;
    const tot={k:"Total",e:soma(ks,k=>m[k].e),s:soma(ks,k=>m[k].s),r:soma(ks,res),a:pm?soma(Object.keys(pm),k=>pm[k].e-pm[k].s):null};
    return{titulo,col,lin,demais,tot,abc};
  };
  return{ant,tabs:[mk("Resultado por categoria","Categoria",cur.porCat,pa&&pa.porCat),mk("Resultado por área (centro de custo)","Área",cur.porArea,pa&&pa.porArea),mk("Resultado por fornecedor / cliente","Fornecedor / cliente",cur.porContra,pa&&pa.porContra,15,true)]};
}
const f4Var=(r,a)=>{const d=r-a;if(Math.abs(d)<0.005)return"—";const p=Math.abs(a)>0.005?` (${d>=0?"+":""}${(d/Math.abs(a)*100).toFixed(0)}%)`:"";return`${d>=0?"+":"−"}${fmtBRL(Math.abs(d))}${p}`};
function finRelHtml(){
  const D=f4RelDados(),A=!!D.ant;
  const head=t=>`<tr><th>${t.col}</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Resultado</th>${A?`<th class="n">${esc(D.ant.rot)}</th><th class="n">Variação</th>`:""}${t.abc?`<th class="n">% acum.</th><th>ABC</th>`:""}</tr>`;
  const lin=(t,l,neg)=>`<tr${neg?` style="font-weight:700"`:""}><td${l.k.startsWith("Demais")?` class="sub"`:""}>${esc(l.k)}</td><td class="n">${fmtBRL(l.e)}</td><td class="n">${fmtBRL(l.s)}</td><td class="n">${finMoney(l.r)}</td>${A?`<td class="n">${finMoney(l.a)}</td><td class="n">${f4Var(l.r,l.a)}</td>`:""}${t.abc?`<td class="n">${l.pa!=null?l.pa.toFixed(0)+"%":""}</td><td>${l.cl?`<span class="pill ${l.cl==="A"?"s-falta":l.cl==="B"?"s-pendencia":"s-ok"}">${l.cl}</span>`:""}</td>`:""}</tr>`;
  const tab=t=>`<div class="card"><h2>${t.titulo}</h2>${t.lin.length?`<div class="wrap"><table><thead>${head(t)}</thead><tbody>${t.lin.map(l=>lin(t,l)).join("")}${t.demais?lin(t,t.demais):""}${lin(t,t.tot,1)}</tbody></table></div>${t.abc?`<p class="sub" style="margin:6px 0 0">Curva ABC pelas saídas: <b>A</b> = fornecedores que somam os primeiros 80% do gasto, <b>B</b> = até 95%, <b>C</b> = o restante.</p>`:""}`:`<div class="empty">Sem lançamentos no período.</div>`}</div>`;
  return `<div class="card"><h2>Relatórios gerenciais</h2><p class="sub" style="margin:0 0 10px">Pelo vencimento, somando o que já foi pago/recebido e o que está em aberto. ${FIN.incNF?"Inclui as notas fiscais da planilha.":""}</p>${finPeriodoHtml()}
    <div class="row" style="align-items:flex-end"><div style="max-width:260px"><label>Comparar com</label><select id="frelcmp"><option value="" ${F4.cmp?"":"selected"}>Sem comparação</option><option value="ant" ${F4.cmp==="ant"?"selected":""}>Período anterior (mês anterior)</option><option value="ano" ${F4.cmp==="ano"?"selected":""}>Mesmo período do ano anterior</option></select></div>
    <button class="b sec" id="frelcsv" style="flex:none">${ic("down")} Baixar CSV</button><button class="b sec" id="frelpdf" style="flex:none">${ic("down")} Baixar PDF</button></div></div>${D.tabs.map(tab).join("")}`;
}
async function f4RelPdf(){
  const D=f4RelDados(),A=!!D.ant,per=FIN.mes<0?`${FIN.ano}`:`${MESES_PT[FIN.mes]} de ${FIN.ano}`;
  const specs=D.tabs.filter(t=>t.lin.length).map(t=>{
    const cols=[{h:t.col,w:A?26:34},{h:"Entradas",t:"money",w:14},{h:"Saídas",t:"money",w:14},{h:"Resultado",t:"money",w:14}];
    if(A){cols.push({h:D.ant.rot,t:"money",w:14},{h:"Variação",w:16})}
    if(t.abc){cols.push({h:"% acum.",w:9},{h:"ABC",w:6})}
    const row=l=>{const r=[l.k,l.e,l.s,l.r];if(A){r.push(l.a,f4Var(l.r,l.a))}if(t.abc)r.push(l.pa!=null?l.pa.toFixed(0)+"%":"",l.cl||"");return r};
    return{titulo:t.titulo,sub:`${per}${A?" · comparado com "+D.ant.rot:""} · ${relSub({},false)}`,sensivel:false,cols,rows:[...t.lin.map(row),...(t.demais?[row(t.demais)]:[]),row(t.tot)]};
  });
  if(!specs.length)return toast("Sem lançamentos no período para gerar o PDF.",true);
  try{await saveFile(`relatorios-financeiros-${FIN.ano}${FIN.mes<0?"":"-"+f4pad(FIN.mes+1)}.pdf`,await relPdf(specs))}
  catch(e){toast("Não foi possível gerar o PDF: "+(e.message||e),true)}
}
/* ---------- ajustes: fechamento de mês, aprovação, guias, provisões ---------- */
const F4_GUIAS_SUG=[["FGTS",20],["INSS (GPS)",20],["IRRF",20],["ISS",10],["DAS (Simples Nacional)",20]];
function f4Provisao(ano){
  const meses=Array.from({length:12},(_,m)=>({m,base:0}));
  finAll().filter(e=>e.tipo==="pagar"&&!e.cancelada&&e.venc.slice(0,4)===String(ano)).forEach(e=>{const c=estNorm(e.cat||"");if(/folha|salario/.test(c)&&!/13|decimo|ferias/.test(c))meses[+e.venc.slice(5,7)-1].base+=finNum(e)});
  let ac=0;return meses.map(x=>{x.prov=arred2(x.base*(1/12+(1/12)*(4/3)));ac+=x.prov;x.ac=arred2(ac);return x});
}
function finAjustesHtml(){
  const g=f4Gestor(),F=f4Fech(),lim=f4Limite(),pend=finAll().filter(e=>e.tipo==="pagar"&&!e.pago&&!e.cancelada&&e.aprovStatus==="pendente"&&!e.aprov);
  const gu=f4Guias(),prov=f4Provisao(FIN.ano),pt=soma(prov,x=>x.prov),log=(f4cfg().log||[]).slice(-15).reverse(),pode=podeEd("fin");
  const p=perfilAtual()||{},cf=f4cfg(),ag=resAll().filter(r=>r.reajAg);
  return `<div class="card"><h2>Fechamento de mês</h2><p class="sub" style="margin:0 0 10px">Depois que o contador recebe os números de um mês, feche-o: ninguém (exceto o gestor) consegue criar, alterar ou excluir lançamentos até a data fechada. Dar baixa em contas antigas ainda em aberto continua liberado, com data posterior ao fechamento.</p>
    <div class="row" style="align-items:flex-end"><div style="max-width:200px"><label>Fechado até (inclusive)</label><input type="date" id="f4fech" value="${F}" ${g?"":"disabled"}></div>${g?`<button class="b" id="f4fsv" style="flex:none">Salvar</button><button class="b sec" id="f4fmes" style="flex:none">Fechar até o fim do mês passado</button><button class="b sec" id="f4fre" style="flex:none">Reabrir tudo</button>`:`<div class="sub">Só o gestor altera o fechamento.</div>`}</div>
    <p class="sub" style="margin:8px 0 0">${F?`<b>Fechado até ${brDate(F)}.</b>`:"Nenhum mês fechado."}</p></div>
   <div class="card"><h2>Aprovação de pagamentos</h2><p class="sub" style="margin:0 0 10px">Contas a pagar a partir de um valor só podem ser pagas depois que o gestor aprova. Deixe em branco ou zero para desligar.</p>
    <div class="row" style="align-items:flex-end"><div style="max-width:220px"><label>Exigir aprovação a partir de (R$)</label><input type="number" min="0" step="0.01" id="f4lim" value="${lim||""}" ${g?"":"disabled"}></div>${g?`<button class="b" id="f4limsv" style="flex:none">Salvar</button>`:""}</div>
    ${pend.length?`<h4 style="margin:14px 0 6px">Aguardando aprovação (${pend.length})</h4>${pend.map(e=>`<div class="doc"><div class="grow"><div class="nm">${esc(e.desc)}</div><div class="sub">${esc(e.contra||"")} · vence ${brDate(e.venc)}</div></div><b>${fmtBRL(e.valor)}</b>${g?`<button class="b sm" data-f4apr="${e.id}">Aprovar</button><button class="b sec sm" data-f4nao="${e.id}">Recusar</button>`:""}</div>`).join("")}`:(lim?`<div class="sub" style="margin-top:10px">Nenhum pedido pendente.</div>`:"")}</div>
   <div class="card"><h2>Quem pode o quê</h2><p class="sub" style="margin:0 0 6px">Em <b>Acesso → Perfis</b> há duas permissões para o Financeiro: <b>dar baixa, estornar e cancelar</b> e <b>excluir lançamentos</b>. Perfis antigos continuam podendo, até você desmarcar. O gestor sempre pode.</p>
    <div class="sub">Seu perfil agora: baixa ${finPode("baixa")?"<b>sim</b>":"<b>não</b>"} · exclusão ${finPode("excluir")?"<b>sim</b>":"<b>não</b>"}${p.nome?` (${esc(p.nome)})`:""}.</div></div>
   <div class="card"><h2>Dados para cobrança e informe</h2><p class="sub" style="margin:0 0 10px">A chave PIX entra nas mensagens de cobrança e lembrete. O percentual de saúde (opcional) aparece no informe anual de Imposto de Renda como a parcela que a casa indica como despesa de saúde — <b>defina com o seu contador</b>.</p>
    <div class="row" style="align-items:flex-end"><div><label>Chave PIX da casa</label><input id="f4pix" value="${esc(cf.pix||"")}" placeholder="CNPJ, e-mail, telefone ou chave aleatória"></div><div><label>Nome do beneficiário</label><input id="f4pixn" value="${esc(cf.pixNome||"")}"></div></div>
    <div class="row" style="align-items:flex-end"><div style="max-width:200px"><label>Lembrar quantos dias antes</label><input type="number" min="1" max="30" id="f4dav" value="${cf.diasAviso||5}"></div><div style="max-width:220px"><label>% de saúde no informe (opcional)</label><input type="number" min="0" max="100" step="0.01" id="f4ipct" value="${cf.infPct||""}"></div>${pode?`<button class="b" id="f4cfsv" style="flex:none">Salvar</button>`:""}</div></div>
   ${ag.length?`<div class="card"><h2>Reajustes agendados</h2>${ag.map(r=>`<div class="doc"><div class="grow"><div class="nm">${esc(resNome(r))}</div><div class="sub">de ${fmtBRL(r.reajAg.de)} para <b>${fmtBRL(r.reajAg.valor)}</b> (${r.reajAg.pct>=0?"+":""}${r.reajAg.pct}%) a partir de ${brDate(r.reajAg.desde)} — aplicado sozinho nesse dia</div></div>${pode?`<button class="b sec sm" data-f4ragx="${r.id}">Cancelar</button>`:""}</div>`).join("")}</div>`:""}
   <div class="card"><h2>Lembretes de guias de impostos</h2><p class="sub" style="margin:0 0 10px">Aparecem no Calendário todo mês, no dia combinado, com um botão para lançar a conta. <b>Os dias sugeridos são os usuais; confirme com o seu contador</b> (variam por imposto, regime e município).</p>
    ${gu.length?gu.map(x=>`<div class="doc"><div class="grow"><div class="nm">${esc(x.nome)}</div><div class="sub">todo dia ${x.dia}</div></div>${pode?`<button class="b sec sm" data-f4gdel="${esc(x.id)}">${ic("trash")}</button>`:""}</div>`).join(""):`<div class="empty">Nenhum lembrete cadastrado.</div>`}
    ${pode?`<div class="row" style="align-items:flex-end;margin-top:10px"><div><label>Nome da guia</label><input id="f4gnome" placeholder="Ex.: FGTS"></div><div style="max-width:100px"><label>Dia</label><input type="number" min="1" max="31" id="f4gdia" value="20"></div><button class="b" id="f4gadd" style="flex:none">Adicionar</button><button class="b sec" id="f4gsug" style="flex:none">Adicionar modelos sugeridos</button></div>`:""}</div>
   <div class="card"><h2>Provisão de 13º e férias (estimativa)</h2><p class="sub" style="margin:0 0 10px">Calculada sobre a folha lançada em Contas a pagar (categoria com “folha” ou “salário”): 1/12 de 13º + 1/12 de férias com 1/3 = <b>19,44%</b> da folha. É só informativa e <b>não entra na DRE</b>, para não duplicar quando o 13º e as férias forem pagos de verdade. Não inclui FGTS/INSS sobre a provisão.</p>
    ${finPeriodoHtml()}${pt>0?`<div class="wrap"><table><thead><tr><th>Mês</th><th class="n">Folha lançada</th><th class="n">Provisão do mês</th><th class="n">Acumulada</th></tr></thead><tbody>${prov.map(x=>`<tr><td>${MESES_PT[x.m]}</td><td class="n">${fmtBRL(x.base)}</td><td class="n">${fmtBRL(x.prov)}</td><td class="n">${fmtBRL(x.ac)}</td></tr>`).join("")}<tr style="font-weight:700"><td>Total ${FIN.ano}</td><td class="n">${fmtBRL(soma(prov,x=>x.base))}</td><td class="n">${fmtBRL(pt)}</td><td></td></tr></tbody></table></div>`:`<div class="empty">Nenhuma folha lançada em ${FIN.ano}. Lance a folha em Contas a pagar com categoria “Folha de pagamento”.</div>`}</div>
   ${log.length?`<div class="card"><h2>Lançamentos excluídos (últimos 15)</h2>${log.map(x=>`<div class="doc"><div style="flex:0 0 112px" class="sub">${esc(x.t.replace("T"," ").replace(/^(\d{4})-(\d\d)-(\d\d)/,"$3/$2/$1"))}</div><div class="grow"><div class="nm">${esc(x.desc)}</div><div class="sub">${esc(x.u||"alguém")} excluiu · ${x.tipo==="receber"?"a receber":"a pagar"} · venc. ${brDate(x.venc)}${x.contra?" · "+esc(x.contra):""}</div></div><b>${fmtBRL(x.valor)}</b></div>`).join("")}</div>`:""}`;
}
function bindAjus(){
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn},re=()=>go("fin",true);
  on("f4fsv",()=>{const v=$("f4fech").value;if(v&&!finDataOk(v))return toast("Confira a data: ano inválido.",true);if(!v||(f4Fech()&&v<f4Fech()))return f7ReabrirMes(v);f7FechaMes(v)});
  on("f4fmes",()=>{const h=hojeIso(),d=addDaysIso(h.slice(0,8)+"01",-1);f7FechaMes(d)});
  on("f4fre",()=>f7ReabrirMes(""));
  on("f4limsv",()=>{f4save({aprovLimite:Math.max(0,+$("f4lim").value||0)});toast("Salvo.");re()});
  on("f4gadd",()=>{const n=$("f4gnome").value.trim(),d=Math.round(+$("f4gdia").value);if(!n||!(d>=1&&d<=31))return toast("Informe o nome e o dia (1 a 31).",true);f4save({guias:[...f4Guias(),{id:uid8(),nome:n,dia:d}]});re()});
  on("f4gsug",()=>{const tem=new Set(f4Guias().map(x=>x.nome));f4save({guias:[...f4Guias(),...F4_GUIAS_SUG.filter(([n])=>!tem.has(n)).map(([nome,dia])=>({id:uid8(),nome,dia}))]});re()});
  on("f4cfsv",()=>{f4save({pix:$("f4pix").value.trim(),pixNome:$("f4pixn").value.trim(),diasAviso:Math.max(1,Math.min(30,Math.round(+$("f4dav").value||5))),infPct:Math.max(0,Math.min(100,+$("f4ipct").value||0))});toast("Salvo.");re()});
  document.querySelectorAll("[data-f4ragx]").forEach(b=>b.onclick=()=>{resSave(resAll().map(r=>{if(r.id!==b.dataset.f4ragx)return r;const n={...r};delete n.reajAg;return n}));toast("Reajuste agendado cancelado.");re()});
  document.querySelectorAll("[data-f4gdel]").forEach(b=>b.onclick=()=>{f4save({guias:f4Guias().filter(x=>x.id!==b.dataset.f4gdel)});re()});
}
/* ---------- ligações ---------- */
const _bindFin4=bindFin;
bindFin=function(){
  _bindFin4();
  bindAprov();bindContas();bindCob();bindCal();bindAjus();
  const c=$("frelcmp");if(c)c.onchange=()=>{F4.cmp=c.value;go("fin",true)};
  const pf=$("frelpdf");if(pf)pf.onclick=f4RelPdf;
  if(!window._f4guard){
    window._f4guard=1;
    document.addEventListener("click",ev=>{
      const b=ev.target.closest&&ev.target.closest("[data-festorno],[data-fcancel]");if(!b)return;
      const e=finAll().find(x=>x.id===(b.dataset.festorno||b.dataset.fcancel));
      if(b.dataset.festorno&&e&&e.cancelada&&/renegociado/.test(e.obs||"")&&!F4._ok){
        ev.stopImmediatePropagation();ev.preventDefault();
        askConfirm(`“${e.desc}” foi cancelada por renegociação. Se você desfazer, a dívida volta em duplicidade com as parcelas do acordo. Desfazer mesmo assim?`,"Desfazer mesmo assim").then(ok=>{if(ok){F4._ok=true;try{b.click()}finally{F4._ok=false}}});
        return;
      }
      let msg="";
      if(!finPode("baixa"))msg="dar baixa, estornar ou cancelar (o seu perfil não permite)";
      else if(e&&e.pago&&!f4Gestor()&&f4Fech()&&e.pago<=f4Fech())msg=`estornar pagamento de mês fechado (até ${brDate(f4Fech())})`;
      if(msg){ev.stopImmediatePropagation();ev.preventDefault();f4Nega(msg)}
    },true);
  }
};


/* >>> x_fin5.js */
