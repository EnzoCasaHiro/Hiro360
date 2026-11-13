/* ================= painel do departamento pessoal: gráficos e ponto explicado ================= */
const DPP={ym:hojeIso().slice(0,7)};
// cores dos gráficos (validadas para daltonismo e contraste, claro e escuro): 1 verde, 2 azul, 3 âmbar.
// "a mais" = azul, "a menos" = âmbar (par divergente); séries únicas = verde.
const DPC={c1:[63,143,69],c2:[47,116,181],c3:[201,137,46]};
(function(){
  const st=document.createElement("style");
  st.textContent=`:root{--dv1:#3F8F45;--dv2:#2F74B5;--dv3:#C9892E}
@media (prefers-color-scheme:dark){:root{--dv1:#4E9F52;--dv2:#4F94D4;--dv3:#B98135}}
.dpch{position:relative}.dpch svg{display:block;width:100%;height:auto}
.dpch text{fill:var(--mute);font-size:12px;font-family:var(--ui)}.dpch text.lb{fill:var(--ink)}
.dpch .eixo{stroke:var(--line);stroke-width:1}.dpch .zero{stroke:var(--mute);stroke-width:1}
.dpch .hit{fill:transparent}.dpch .hit:hover{fill:var(--line);fill-opacity:.45}
.dpleg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink);margin:2px 0 8px}
.dpleg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.dptip{position:absolute;pointer-events:none;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:12px;color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.18);display:none;z-index:5;white-space:pre}
.dpexp summary{cursor:pointer;padding:8px 0;border-bottom:1px solid var(--line)}.dpexp[open] summary{border-bottom:0}
.dpexp p{margin:6px 0 10px;line-height:1.5}`;
  document.head.appendChild(st);
})();
const dpRot=ym=>ym.slice(5)+"/"+ym.slice(2,4);
const dpH=m=>hhmmS(m||0); // com sinal, sem o "−" tipográfico (o PDF não tem esse caractere)
const dpHabs=m=>hhmm(Math.abs(m||0));

/* ---------- dados ---------- */
function dpDados(ym){
  const ini=ym+"-01",f=fimCalc(ym);
  if(f<ini)return{erro:"Este mês ainda não começou: escolha um mês que já teve dias trabalhados."};
  const r=calcSilencioso(ini,f);
  if(!r||r.erro)return{erro:(r&&r.erro)||"Importe o arquivo do relógio na aba Ponto."};
  const bh=bhSaldos(ym).por;
  const L=r.users.filter(u=>u.ig&&u.ig.id).map(u=>{
    const b=bh.get(u.ig.id),t=u.t;
    return{u,ig:u.ig,nome:nomeInteg(u.ig),t,ant:b?b.ant:0,lanc:b?b.lanc:0,fim:b?b.acum:t.saldo,
      atraso:(t.late||0)+(t.early||0),assid:t.escalados?(t.escalados-t.faltas)/t.escalados:null};
  }).sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  const soma=k=>L.reduce((s,x)=>s+(typeof k==="function"?k(x):x.t[k]||0),0);
  const tot={prev:soma("expected"),trab:soma("worked"),mais:soma("mais"),menos:soma("menos"),faltas:soma("faltas"),atest:soma("atestados"),
    bhPos:soma(x=>Math.max(0,x.fim)),bhNeg:soma(x=>Math.min(0,x.fim))};
  return{L,tot,ini,fim:f,parcial:f<mesFimIso(ym)};
}
function dpSerie(ym,n){
  return mesesEntre(addMesesIso(ym+"-01",-(n-1)).slice(0,7),ym).map(m=>{
    const f=fimCalc(m),o={m,mais:0,menos:0,banco:null};
    if(f<m+"-01")return o;
    const r=calcSilencioso(m+"-01",f);if(!r||r.erro)return o;
    r.users.forEach(u=>{if(u.ig&&u.ig.id){o.mais+=u.t.mais||0;o.menos+=u.t.menos||0}});
    let b=0;bhSaldos(m).por.forEach(x=>b+=x.acum);o.banco=b;
    return o;
  });
}
function dpQuadro(ym){
  const ref=mesFimIso(ym)<hojeIso()?mesFimIso(ym):hojeIso(),todos=integList();
  const ativos=todos.filter(i=>anivEmAtividade(i,ref)),porCargo={};
  ativos.forEach(i=>{const c=(i.cargo||"").trim()||"Sem cargo";porCargo[c]=(porCargo[c]||0)+1});
  let cargos=Object.entries(porCargo).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt"));
  if(cargos.length>9){const resto=cargos.slice(8).reduce((s,c)=>s+c[1],0);cargos=[...cargos.slice(0,8),["Outros cargos",resto]]}
  const mov=mesesEntre(addMesesIso(ym+"-01",-11).slice(0,7),ym).map(m=>({m,adm:todos.filter(i=>String(i.admissao||"").slice(0,7)===m).length,des:todos.filter(i=>String(i.desligamento||"").slice(0,7)===m).length}));
  return{ref,ativos:ativos.length,cargos,mov};
}

/* ---------- explicação do ponto de cada pessoa ---------- */
function dpMotivo(r){
  if(r.status==="falta")return"Falta sem justificativa";
  const m=[],semEsc=r.status==="sem_escala";
  if(semEsc&&r.workedMin)m.push("trabalhou em dia sem escala");
  if((r.flags||[]).includes("trabalhou_feriado"))m.push("trabalhou no feriado");
  if((r.flags||[]).includes("previsto_manual"))m.push("previsto alterado à mão na planilha do ponto");
  else{
    if(r.late)m.push(`chegou ${r.late} min atrasado`);
    if(r.early)m.push(`saiu ${r.early} min antes do horário`);
    if(r.extra&&!semEsc)m.push(`${r.extra} min além do horário (chegou antes ou saiu depois)`);
    const resto=r.saldo-((semEsc?r.workedMin:r.extra||0)-(r.late||0)-(r.early||0));
    if(Math.abs(resto)>=5)m.push(resto>0?`intervalo ${resto} min mais curto que o previsto`:`intervalo ${-resto} min mais longo que o previsto`);
  }
  const s=m.join("; ")||"diferença entre o trabalhado e o previsto";
  return s[0].toUpperCase()+s.slice(1);
}
function dpExplica(x){
  const t=x.t,rows=x.u.rows,mais=rows.filter(r=>r.saldo>0),menos=rows.filter(r=>r.saldo<0);
  const tol=rows.filter(r=>(r.flags||[]).includes("tolerancia_art58")).length,pend=rows.filter(r=>r.status==="pendencia").length;
  const maior=mais.slice().sort((a,b)=>b.saldo-a.saldo)[0];
  const F=[`Estava escalado(a) para ${dpHabs(t.expected)} em ${t.escalados} dia(s) e trabalhou ${dpHabs(t.worked)} em ${t.trab} dia(s).`];
  if(mais.length)F.push(`Ficou além do previsto em ${mais.length} dia(s), somando ${dpH(t.mais)}${maior?` (o maior foi em ${brDate(maior.day)}: ${dpH(maior.saldo)})`:""}.`);
  if(menos.length){const fl=rows.filter(r=>r.status==="falta");F.push(`Ficou abaixo do previsto em ${menos.length} dia(s), somando ${dpH(t.menos)}${fl.length?`, sendo ${fl.length} falta(s) sem justificativa (${fl.map(r=>brDate(r.day).slice(0,5)).join(", ")})`:""}.`)}
  if(!mais.length&&!menos.length)F.push("Cumpriu exatamente o previsto: nenhum dia mexeu no banco de horas.");
  const cred=(t.atestados||0)+(t.justificadas||0)+(t.esquecidos||0);
  if(cred)F.push(`${cred} dia(s) de atestado, justificativa ou ponto esquecido contaram como cumpridos.`);
  if(tol)F.push(`Em ${tol} dia(s) houve diferenças pequenas (até 5 min por marcação e 10 min no dia), que pela CLT não contam.`);
  if(pend)F.push(`${pend} dia(s) com marcação faltando ainda não entraram no banco: resolva na aba Ponto.`);
  F.push(`Banco de horas: começou o mês em ${dpH(x.ant)}, o mês somou ${dpH(t.saldo)}${x.lanc?`, folgas compensadas e horas pagas somaram ${dpH(x.lanc)}`:""} e terminou em ${dpH(x.fim)}.`);
  return{texto:F.join(" "),dias:rows.filter(r=>r.saldo).map(r=>({r,motivo:dpMotivo(r)}))};
}

/* ---------- gráficos em SVG ---------- */
// barra com só a ponta de dados arredondada (a base fica reta): lado r, l, t ou b
function dpBarra(x,y,w,h,lado,cor){
  if(!(w>0&&h>0))return"";
  const hor=lado==="r"||lado==="l",r=Math.min(4,hor?w:h,(hor?h:w)/2);
  let d;
  if(lado==="r")d=`M${x},${y}h${w-r}a${r},${r} 0 0 1 ${r},${r}v${h-2*r}a${r},${r} 0 0 1 -${r},${r}h-${w-r}z`;
  else if(lado==="l")d=`M${x+w},${y}h-${w-r}a${r},${r} 0 0 0 -${r},${r}v${h-2*r}a${r},${r} 0 0 0 ${r},${r}h${w-r}z`;
  else if(lado==="t")d=`M${x},${y+h}v-${h-r}a${r},${r} 0 0 1 ${r},-${r}h${w-2*r}a${r},${r} 0 0 1 ${r},${r}v${h-r}z`;
  else d=`M${x},${y}v${h-r}a${r},${r} 0 0 0 ${r},${r}h${w-2*r}a${r},${r} 0 0 0 ${r},-${r}v-${h-r}z`;
  return`<path d="${d}" fill="${cor}"/>`;
}
const dpLeg=ser=>ser.length>1?`<div class="dpleg">${ser.map(s=>`<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join("")}</div>`:"";
const dpTrunc=(s,n)=>s.length>n?s.slice(0,n-1)+"…":s;
// barras horizontais: empilhadas (várias séries, só positivas) ou divergentes (uma série, cor pelo sinal)
function dpHBars(items,ser,o){
  o=o||{};
  if(!items.length)return`<div class="empty">${o.vazio||"Sem dados neste mês."}</div>`;
  const W=480,lw=128,rh=26,bh=14,H=items.length*rh+6,div=!!o.div;
  const tot=items.map(it=>it.vals.reduce((s,v)=>s+v,0));
  let x0,sc;
  if(div){const mn=Math.min(0,...tot),mx=Math.max(0,...tot),a=lw+(mn<0?56:6),b=W-(mx>0?56:6),span=(mx-mn)||1;sc=v=>(v/span)*(b-a);x0=a+(-mn/span)*(b-a)}
  else{const mx=Math.max(1,...tot),a=lw+6,b=W-56;sc=v=>(v/mx)*(b-a);x0=a}
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.titulo||"")}">`;
  items.forEach((it,i)=>{
    const y=i*rh+3,yb=y+(rh-bh)/2;
    s+=`<text class="lb" x="${lw}" y="${y+rh/2+4}" text-anchor="end">${esc(dpTrunc(it.rot,19))}</text>`;
    if(div){
      const v=tot[i],w=Math.abs(sc(v)),cor=v>=0?ser[0].cor:(ser[1]||ser[0]).cor;
      s+=v>=0?dpBarra(x0,yb,w,bh,"r",cor):dpBarra(x0-w,yb,w,bh,"l",cor);
      if(v)s+=`<text x="${v>=0?x0+w+5:x0-w-5}" y="${y+rh/2+4}" text-anchor="${v>=0?"start":"end"}">${esc(o.fmt(v))}</text>`;
    }else{
      let x=x0;const vis=it.vals.map((v,k)=>[v,k]).filter(([v])=>v>0);
      // segmentos do meio retos com 2px de folga; só o último tem a ponta arredondada
      vis.forEach(([v,k],j)=>{const w=sc(v),ult=j===vis.length-1;s+=ult?dpBarra(x,yb,w,bh,"r",ser[k].cor):`<rect x="${x}" y="${yb}" width="${Math.max(0,w-2)}" height="${bh}" fill="${ser[k].cor}"/>`;x+=w});
      if(tot[i])s+=`<text x="${x+5}" y="${y+rh/2+4}">${esc(o.fmt(tot[i]))}</text>`;
    }
    s+=`<rect class="hit" x="0" y="${y}" width="${W}" height="${rh}" data-tip="${esc(it.tip)}"/>`;
  });
  if(div)s+=`<line class="zero" x1="${x0}" x2="${x0}" y1="0" y2="${H}"/>`;
  return s+"</svg>";
}
// colunas agrupadas por mês; aceitam valores negativos (linha do zero)
function dpVCols(cats,ser,o){
  o=o||{};
  const W=480,H=200,pl=50,pr=6,pt=10,pb=24,all=ser.flatMap(s=>s.vals).filter(v=>v!=null);
  const mx=Math.max(0,...all),mn=Math.min(0,...all),span=(mx-mn)||1,ph=H-pt-pb,y=v=>pt+(mx-v)/span*ph,gw=(W-pl-pr)/cats.length;
  const bw=Math.min(24,(gw*0.72-2*(ser.length-1))/ser.length);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.titulo||"")}">`;
  const ticks=[...new Set([mx,0,mn])];
  ticks.forEach(t=>{s+=`<line class="${t===0?"zero":"eixo"}" x1="${pl}" x2="${W-pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl-6}" y="${y(t)+4}" text-anchor="end">${esc(o.fmt(t))}</text>`});
  cats.forEach((c,i)=>{
    const gx=pl+i*gw,bx0=gx+(gw-(bw*ser.length+2*(ser.length-1)))/2;
    ser.forEach((se,k)=>{const v=se.vals[i];if(!v)return;const x=bx0+k*(bw+2),h=Math.abs(y(v)-y(0));s+=v>0?dpBarra(x,y(v),bw,h,"t",se.cor):dpBarra(x,y(0),bw,h,"b",se.cor)});
    s+=`<text x="${gx+gw/2}" y="${H-6}" text-anchor="middle">${esc(c)}</text>`;
    s+=`<rect class="hit" x="${gx}" y="0" width="${gw}" height="${H-pb}" data-tip="${esc(c+"\n"+ser.map(se=>se.nome+": "+(se.vals[i]==null?"—":o.fmt(se.vals[i]))).join("\n"))}"/>`;
  });
  return s+"</svg>";
}
function dpCard(titulo,sub,corpo,ser,tab){
  return`<div class="card"><h2>${titulo}</h2>${sub?`<p class="sub" style="margin:0 0 6px">${sub}</p>`:""}${dpLeg(ser||[])}<div class="dpch">${corpo}<div class="dptip"></div></div>${tab?`<details style="margin-top:6px"><summary class="sub" style="cursor:pointer">Ver em tabela</summary><div class="wrap" style="margin-top:6px">${tab}</div></details>`:""}</div>`;
}
const dpTab=(head,rows)=>`<table><thead><tr>${head.map((h,i)=>`<th${i?' class="n"':""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i?' class="n"':""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

/* ---------- tela ---------- */
function dpHtml(){
  const ym=DPP.ym,D=dpDados(ym),Q=dpQuadro(ym),ser6=dpSerie(ym,6),mm=MESES_PT[+ym.slice(5)-1]+" de "+ym.slice(0,4);
  const meses=mesesEntre(addMesesIso(hojeIso(),-23).slice(0,7),hojeIso().slice(0,7)).reverse();
  const topo=`<div class="card"><div class="row" style="align-items:flex-end"><div style="flex:0 0 200px"><label>Mês</label><select id="dpmes">${meses.map(m=>`<option value="${m}" ${m===ym?"selected":""}>${MESES_PT[+m.slice(5)-1]} de ${m.slice(0,4)}</option>`).join("")}</select></div>
    <button class="b sec" id="dppdf" style="flex:none">${ic("down")} Baixar relatório em PDF</button></div>
    ${D.parcial&&!D.erro?`<p class="sub" style="margin:8px 0 0">Mês em andamento: os números vão até ${brDate(D.fim)} (ontem).</p>`:""}</div>`;
  const C1={nome:"Horas a mais",cor:"var(--dv2)"},C2={nome:"Horas a menos",cor:"var(--dv3)"};
  const quadro=dpCard("Integrantes em atividade por cargo",`${Q.ativos} integrante(s) em atividade em ${brDate(Q.ref)}.`,
      dpHBars(Q.cargos.map(([c,n])=>({rot:c,vals:[n],tip:`${c}: ${n} integrante(s)`})),[{nome:"Integrantes",cor:"var(--dv1)"}],{fmt:v=>String(v),vazio:"Nenhum integrante em atividade."}),null,
      dpTab(["Cargo","Integrantes"],Q.cargos.map(([c,n])=>[esc(c),n])))+
    dpCard("Admissões e desligamentos — últimos 12 meses","Pelas datas de admissão e desligamento do cadastro.",
      dpVCols(Q.mov.map(x=>dpRot(x.m)),[{nome:"Admissões",cor:"var(--dv2)",vals:Q.mov.map(x=>x.adm)},{nome:"Desligamentos",cor:"var(--dv3)",vals:Q.mov.map(x=>x.des)}],{fmt:v=>String(Math.round(v))}),
      [{nome:"Admissões",cor:"var(--dv2)"},{nome:"Desligamentos",cor:"var(--dv3)"}],dpTab(["Mês","Admissões","Desligamentos"],Q.mov.map(x=>[dpRot(x.m),x.adm,x.des])));
  if(D.erro)return topo+`<div class="callout sand">${esc(D.erro)}</div>`+quadro;
  const T=D.tot,ab=T.prev?Math.max(0,T.prev-T.trab)/T.prev:null;
  const card=(t,v,sub)=>`<div class="stat"><b>${v}</b><span>${t}</span>${sub?`<div class="sub" style="margin-top:2px">${sub}</div>`:""}</div>`;
  const kpis=`<div class="card"><h2>Resumo de ${mm}</h2><div class="stats" style="margin-top:8px">
    ${card("integrantes no ponto",D.L.length)}
    ${card("horas trabalhadas",dpHabs(T.trab),`de ${dpHabs(T.prev)} previstas${T.prev?` · ${Math.round(100*T.trab/T.prev)}%`:""}`)}
    ${card("horas a mais",dpH(T.mais),"além do previsto")}
    ${card("horas a menos",dpH(T.menos),"abaixo do previsto")}
    ${card("faltas sem justificativa",T.faltas,"dia(s)")}
    ${card("dias de atestado",T.atest)}
    ${card("absenteísmo",pctF(ab),"horas não trabalhadas ÷ previstas")}
    ${card("banco de horas da equipe",dpH(T.bhPos+T.bhNeg),`${dpH(T.bhPos)} a favor dos integrantes · ${dpH(T.bhNeg)} devendo`)}</div></div>`;
  const porSaldo=D.L.filter(x=>x.t.saldo).sort((a,b)=>b.t.saldo-a.t.saldo);
  const g1=dpCard("Saldo do mês por integrante","Horas a mais menos horas a menos no mês, já sem os minutos de tolerância da CLT. À direita, quem ficou além do previsto; à esquerda, quem ficou abaixo.",
    dpHBars(porSaldo.map(x=>({rot:x.nome,vals:[x.t.saldo],tip:`${x.nome}\nA mais: ${dpH(x.t.mais)}\nA menos: ${dpH(x.t.menos)}\nSaldo do mês: ${dpH(x.t.saldo)}`})),[C1,C2],{div:true,fmt:dpH,vazio:"Ninguém ficou acima ou abaixo do previsto neste mês."}),[C1,C2]);
  const g2=dpCard("Horas a mais e a menos da equipe — últimos 6 meses",null,
    dpVCols(ser6.map(x=>dpRot(x.m)),[{...C1,vals:ser6.map(x=>x.mais)},{...C2,vals:ser6.map(x=>x.menos)}],{fmt:dpH}),[C1,C2],
    dpTab(["Mês","A mais","A menos","Saldo"],ser6.map(x=>[dpRot(x.m),dpH(x.mais),dpH(x.menos),dpH(x.mais+x.menos)])));
  const g3=dpCard("Banco de horas da equipe no fim de cada mês","Soma do banco de todos os integrantes. Acima de zero, a Casa Hiro deve folgas ou horas; abaixo, os integrantes devem horas.",
    dpVCols(ser6.map(x=>dpRot(x.m)),[{nome:"Banco da equipe",cor:"var(--dv1)",vals:ser6.map(x=>x.banco)}],{fmt:dpH}),null,
    dpTab(["Mês","Banco da equipe"],ser6.map(x=>[dpRot(x.m),x.banco==null?"—":dpH(x.banco)])));
  const AUS=[{nome:"Faltas sem justificativa",cor:"var(--dv1)"},{nome:"Atestados",cor:"var(--dv2)"},{nome:"Justificadas e ponto esquecido",cor:"var(--dv3)"}];
  const aus=D.L.map(x=>({x,v:[x.t.faltas||0,x.t.atestados||0,(x.t.justificadas||0)+(x.t.esquecidos||0)]})).filter(a=>a.v.some(Boolean)).sort((a,b)=>b.v[0]-a.v[0]||(b.v[0]+b.v[1]+b.v[2])-(a.v[0]+a.v[1]+a.v[2]));
  const g4=dpCard("Ausências por integrante (dias)",null,
    dpHBars(aus.map(a=>({rot:a.x.nome,vals:a.v,tip:`${a.x.nome}\nFaltas: ${a.v[0]}\nAtestados: ${a.v[1]}\nJustificadas/esquecido: ${a.v[2]}`})),AUS,{fmt:v=>v+" dia(s)",vazio:"Nenhuma ausência neste mês."}),AUS);
  const resumo=`<div class="card"><h2>Ponto de cada integrante — ${mm}</h2><p class="sub" style="margin:0 0 8px">A mais e a menos já descontam a tolerância da CLT. Assiduidade = dias escalados sem falta ÷ dias escalados.</p>
    <div class="wrap"><table><thead><tr><th>Integrante</th><th class="n">Dias escalados</th><th class="n">Dias trabalhados</th><th class="n">Previsto</th><th class="n">Trabalhado</th><th class="n">A mais</th><th class="n">A menos</th><th class="n">Saldo do mês</th><th class="n">Faltas</th><th class="n">Atestados</th><th class="n">Atrasos e saídas antes</th><th class="n">Banco anterior</th><th class="n">Banco final</th><th class="n">Assiduidade</th></tr></thead><tbody>
    ${D.L.map(x=>`<tr><td style="white-space:nowrap"><b>${esc(x.nome)}</b></td><td class="n">${x.t.escalados}</td><td class="n">${x.t.trab}</td><td class="n">${dpHabs(x.t.expected)}</td><td class="n">${dpHabs(x.t.worked)}</td><td class="n">${dpH(x.t.mais)}</td><td class="n">${dpH(x.t.menos)}</td><td class="n"><b>${dpH(x.t.saldo)}</b></td><td class="n">${x.t.faltas}</td><td class="n">${x.t.atestados}</td><td class="n">${dpHabs(x.atraso)}</td><td class="n">${dpH(x.ant)}</td><td class="n"><b>${dpH(x.fim)}</b></td><td class="n">${pctF(x.assid)}</td></tr>`).join("")}</tbody></table></div></div>`;
  const expl=`<div class="card"><h2>Explicação do ponto, pessoa por pessoa</h2><p class="sub" style="margin:0 0 4px">Abra um nome para ver, em palavras, o que aconteceu no mês e cada dia que mexeu no banco de horas.</p>
    ${D.L.map(x=>{const e=dpExplica(x);return`<details class="dpexp"><summary><b>${esc(x.nome)}</b> <span class="sub">— saldo do mês ${dpH(x.t.saldo)} · banco final ${dpH(x.fim)}</span></summary><p>${esc(e.texto)}</p>
      ${e.dias.length?`<div class="wrap"><table><thead><tr><th>Data</th><th>Dia</th><th class="n">Previsto</th><th class="n">Trabalhado</th><th class="n">Diferença</th><th>O que aconteceu</th></tr></thead><tbody>${e.dias.map(({r,motivo})=>`<tr><td>${brDate(r.day)}</td><td>${esc(r.wd||"")}</td><td class="n">${dpHabs(r.expectedMin)}</td><td class="n">${dpHabs(r.workedMin)}</td><td class="n"><b>${dpH(r.saldo)}</b></td><td>${esc(motivo)}</td></tr>`).join("")}</tbody></table></div>`:""}</details>`}).join("")||`<div class="empty">Ninguém no ponto neste mês.</div>`}</div>`;
  return topo+kpis+`<div class="grid g2">${g1}${g4}</div><div class="grid g2">${g2}${g3}</div>`+resumo+expl+`<div class="grid g2">${quadro}</div>`;
}
function dpBindTips(){
  document.querySelectorAll(".dpch").forEach(c=>{
    const tip=c.querySelector(".dptip");if(!tip)return;
    c.onmousemove=e=>{const t=e.target.closest&&e.target.closest("[data-tip]");if(!t){tip.style.display="none";return}
      tip.textContent=t.dataset.tip;tip.style.display="block";const b=c.getBoundingClientRect();
      let x=e.clientX-b.left+14;if(x+tip.offsetWidth>b.width)x=Math.max(0,e.clientX-b.left-tip.offsetWidth-14);
      tip.style.left=x+"px";tip.style.top=(e.clientY-b.top+14)+"px"};
    c.onmouseleave=()=>{tip.style.display="none"};
  });
}
function bindDp(){
  const m=$("dpmes");if(m)m.onchange=()=>{DPP.ym=m.value;go("gp",true)};
  const p=$("dppdf");if(p)p.onclick=()=>dpPdf();
  dpBindTips();
}

/* ---------- relatório em PDF (padrão Casa Hiro) ---------- */
function dpPdfHBars(doc,x,y,w,h,items,cores,o){
  const n=items.length;if(!n){doc.setFont("times","italic");doc.setFontSize(9);doc.setTextColor(120,115,100);doc.text(o.vazio||"Sem dados.",x,y+12);return}
  const rh=Math.min(16,h/n),bh=Math.max(4,rh*0.62),lw=110,tot=items.map(it=>it.vals.reduce((s,v)=>s+v,0));
  let x0,sc;
  if(o.div){const mn=Math.min(0,...tot),mx=Math.max(0,...tot),a=x+lw+(mn<0?40:4),b=x+w-(mx>0?40:4),span=(mx-mn)||1;sc=v=>v/span*(b-a);x0=a+(-mn/span)*(b-a)}
  else{const mx=Math.max(1,...tot),a=x+lw+4,b=x+w-48;sc=v=>v/mx*(b-a);x0=a}
  doc.setFontSize(Math.min(8,rh*0.6));
  items.forEach((it,i)=>{
    const yy=y+i*rh,yb=yy+(rh-bh)/2,ty=yy+rh/2+2.5;
    doc.setFont("helvetica","normal");doc.setTextColor(68,68,68);doc.text(dpTrunc(it.rot,26),x+lw,ty,{align:"right"});
    if(o.div){const v=tot[i],ww=Math.abs(sc(v)),c=v>=0?cores[0]:cores[1];doc.setFillColor(...c);if(ww>0.5)doc.roundedRect(v>=0?x0:x0-ww,yb,ww,bh,1.5,1.5,"F");
      doc.setTextColor(110,105,92);if(v)doc.text(o.fmt(v),v>=0?x0+ww+3:x0-ww-3,ty,{align:v>=0?"left":"right"})}
    else{let xx=x0;it.vals.forEach((v,k)=>{if(v<=0)return;const ww=sc(v);doc.setFillColor(...cores[k]);doc.rect(xx,yb,Math.max(0.5,ww-1),bh,"F");xx+=ww});doc.setTextColor(110,105,92);if(tot[i])doc.text(o.fmt(tot[i]),xx+3,ty)}
  });
  if(o.div){doc.setDrawColor(140,133,119);doc.setLineWidth(0.5);doc.line(x0,y,x0,y+n*rh)}
}
function dpPdfVCols(doc,x,y,w,h,cats,ser,o){
  const all=ser.flatMap(s=>s.vals).filter(v=>v!=null),mx=Math.max(0,...all),mn=Math.min(0,...all),span=(mx-mn)||1,pl=44,pb=14,ph=h-pb,Y=v=>y+(mx-v)/span*ph,gw=(w-pl)/cats.length;
  const bw=Math.min(14,(gw*0.7-ser.length+1)/ser.length);
  doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setLineWidth(0.4);
  [...new Set([mx,0,mn])].forEach(t=>{doc.setDrawColor(...(t===0?[140,133,119]:[228,221,207]));doc.line(x+pl,Y(t),x+w,Y(t));doc.setTextColor(110,105,92);doc.text(o.fmt(t),x+pl-4,Y(t)+2.5,{align:"right"})});
  cats.forEach((c,i)=>{const gx=x+pl+i*gw,b0=gx+(gw-(bw*ser.length+(ser.length-1)))/2;
    ser.forEach((s,k)=>{const v=s.vals[i];if(!v)return;const hh=Math.abs(Y(v)-Y(0));doc.setFillColor(...s.cor);doc.rect(b0+k*(bw+1),v>0?Y(v):Y(0),bw,hh,"F")});
    doc.setTextColor(110,105,92);doc.text(c,gx+gw/2,y+h-2,{align:"center"})});
}
function dpPdfLeg(doc,x,y,ser){
  let xx=x;doc.setFont("helvetica","normal");doc.setFontSize(7.5);
  ser.forEach(s=>{doc.setFillColor(...s.cor);doc.rect(xx,y-6,7,7,"F");doc.setTextColor(68,68,68);doc.text(s.nome,xx+10,y);xx+=doc.getTextWidth(s.nome)+24});
}
function dpPdfCaixa(doc,x,y,w,h,titulo){
  doc.setFillColor(255,255,255);doc.setDrawColor(232,223,204);doc.setLineWidth(0.6);doc.roundedRect(x,y,w,h,5,5,"FD");
  doc.setFont("times","bold");doc.setFontSize(11);doc.setTextColor(30,92,42);doc.text(titulo,x+10,y+16);
}
async function dpPdf(){
  const ym=DPP.ym,D=dpDados(ym);
  if(D.erro){toast(D.erro,true);return}
  if(typeof window.jspdf==="undefined"||!window.jspdf.jsPDF){toast("A biblioteca de PDF não carregou. Recarregue a página e tente de novo.",true);return}
  try{
    toast("Gerando o relatório…");
    const lg=await logosMarca(),{jsPDF}=window.jspdf,doc=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"});
    const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=24,T=D.tot,Q=dpQuadro(ym),s6=dpSerie(ym,6);
    const mm=MESES_PT[+ym.slice(5)-1]+" de "+ym.slice(0,4),sub=`${brDate(D.ini)} a ${brDate(D.fim)} · emitido em ${new Date().toLocaleDateString("pt-BR")}`,tit="Ponto e pessoal — "+mm;
    const pag=()=>{anivPdfFaixa(doc,lg,tit,sub)};
    // página 1: números do mês e gráficos de horas
    pag();
    const K=[["Integrantes no ponto",String(D.L.length)],["Horas trabalhadas",dpHabs(T.trab)],["Horas previstas",dpHabs(T.prev)],["Horas a mais",dpH(T.mais)],["Horas a menos",dpH(T.menos)],["Faltas sem justif.",String(T.faltas)],["Dias de atestado",String(T.atest)],["Banco da equipe",dpH(T.bhPos+T.bhNeg)]];
    const kw=(W-2*M-7*6)/8;
    K.forEach(([k,v],i)=>{const x=M+i*(kw+6);doc.setFillColor(255,255,255);doc.setDrawColor(232,223,204);doc.roundedRect(x,68,kw,42,4,4,"FD");doc.setFillColor(46,125,50);doc.rect(x,68,3,42,"F");
      doc.setFont("times","bold");doc.setFontSize(14);doc.setTextColor(30,92,42);doc.text(v,x+10,88);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(110,105,92);doc.text(k,x+10,101)});
    const cw=(W-2*M-12)/2,y1=120,h1=H-y1-36;
    const porSaldo=D.L.filter(x=>x.t.saldo).sort((a,b)=>b.t.saldo-a.t.saldo);
    dpPdfCaixa(doc,M,y1,cw,h1,"Saldo do mês por integrante");dpPdfLeg(doc,M+10,y1+32,[{nome:"Horas a mais",cor:DPC.c2},{nome:"Horas a menos",cor:DPC.c3}]);
    dpPdfHBars(doc,M+6,y1+42,cw-16,h1-52,porSaldo.map(x=>({rot:x.nome,vals:[x.t.saldo]})),[DPC.c2,DPC.c3],{div:true,fmt:dpH,vazio:"Ninguém ficou acima ou abaixo do previsto."});
    const x2=M+cw+12,hh=(h1-10)/2;
    dpPdfCaixa(doc,x2,y1,cw,hh,"Horas a mais e a menos da equipe — 6 meses");dpPdfLeg(doc,x2+10,y1+32,[{nome:"Horas a mais",cor:DPC.c2},{nome:"Horas a menos",cor:DPC.c3}]);
    dpPdfVCols(doc,x2+8,y1+42,cw-20,hh-50,s6.map(x=>dpRot(x.m)),[{cor:DPC.c2,vals:s6.map(x=>x.mais)},{cor:DPC.c3,vals:s6.map(x=>x.menos)}],{fmt:dpH});
    dpPdfCaixa(doc,x2,y1+hh+10,cw,hh,"Banco de horas da equipe no fim de cada mês");
    dpPdfVCols(doc,x2+8,y1+hh+34,cw-20,hh-42,s6.map(x=>dpRot(x.m)),[{cor:DPC.c1,vals:s6.map(x=>x.banco)}],{fmt:dpH});
    // página 2: ausências e quadro de pessoal
    doc.addPage();pag();
    const aus=D.L.map(x=>({rot:x.nome,vals:[x.t.faltas||0,x.t.atestados||0,(x.t.justificadas||0)+(x.t.esquecidos||0)]})).filter(a=>a.vals.some(Boolean)).sort((a,b)=>b.vals[0]-a.vals[0]);
    const AUS=[{nome:"Faltas sem justificativa",cor:DPC.c1},{nome:"Atestados",cor:DPC.c2},{nome:"Justificadas / esquecido",cor:DPC.c3}],y2=68,h2=H-y2-36;
    dpPdfCaixa(doc,M,y2,cw,h2,"Ausências por integrante (dias)");dpPdfLeg(doc,M+10,y2+32,AUS);
    dpPdfHBars(doc,M+6,y2+42,cw-16,h2-52,aus,AUS.map(a=>a.cor),{fmt:v=>v+" dia(s)",vazio:"Nenhuma ausência neste mês."});
    const hq=(h2-10)/2;
    dpPdfCaixa(doc,x2,y2,cw,hq,`Integrantes em atividade por cargo (${Q.ativos})`);
    dpPdfHBars(doc,x2+6,y2+28,cw-16,hq-36,Q.cargos.map(([c,n])=>({rot:c,vals:[n]})),[DPC.c1],{fmt:v=>String(v),vazio:"Nenhum integrante em atividade."});
    dpPdfCaixa(doc,x2,y2+hq+10,cw,hq,"Admissões e desligamentos — 12 meses");dpPdfLeg(doc,x2+10,y2+hq+42,[{nome:"Admissões",cor:DPC.c2},{nome:"Desligamentos",cor:DPC.c3}]);
    dpPdfVCols(doc,x2+8,y2+hq+52,cw-20,hq-60,Q.mov.map(x=>dpRot(x.m)),[{cor:DPC.c2,vals:Q.mov.map(x=>x.adm)},{cor:DPC.c3,vals:Q.mov.map(x=>x.des)}],{fmt:v=>String(Math.round(v))});
    // página 3: tabela por integrante
    const base={theme:"grid",margin:{top:72,left:M,right:M,bottom:36},styles:{font:"helvetica",fontSize:7.5,cellPadding:3,lineColor:[232,223,204],lineWidth:.5,textColor:[68,68,68]},
      headStyles:{fillColor:[46,125,50],textColor:255,fontStyle:"bold",halign:"center"},bodyStyles:{fillColor:[255,255,255]},alternateRowStyles:{fillColor:[245,239,224]},
      willDrawPage:d=>{if(d.pageNumber>1)pag()}}; // só nas páginas novas que a tabela abrir: a faixa pinta o fundo e apagaria o texto já escrito
    doc.addPage();pag();
    doc.autoTable({...base,startY:72,head:[["Integrante","Dias escal.","Dias trab.","Previsto","Trabalhado","A mais","A menos","Saldo do mês","Faltas","Atestados","Atrasos/saídas antes","Banco anterior","Banco final","Assiduidade"]],
      body:D.L.map(x=>[x.nome,x.t.escalados,x.t.trab,dpHabs(x.t.expected),dpHabs(x.t.worked),dpH(x.t.mais),dpH(x.t.menos),dpH(x.t.saldo),x.t.faltas,x.t.atestados,dpHabs(x.atraso),dpH(x.ant),dpH(x.fim),pctF(x.assid)]),
      columnStyles:{0:{cellWidth:150},7:{fontStyle:"bold"},12:{fontStyle:"bold"}},didParseCell:d=>{if(d.section==="body"&&d.column.index>0)d.cell.styles.halign="right"}});
    // explicação pessoa por pessoa
    let y=doc.lastAutoTable.finalY+38;
    doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(110,105,92);
    doc.text("A mais e a menos já descontam a tolerância da CLT (até 5 min por marcação e 10 min no dia, art. 58 §1º). Assiduidade = dias escalados sem falta ÷ dias escalados.",M,y-22);
    for(const x of D.L){
      const e=dpExplica(x);doc.setFont("helvetica","normal");doc.setFontSize(8.5);
      const linhas=doc.splitTextToSize(e.texto,W-2*M);
      if(y+30+linhas.length*11>H-50){doc.addPage();pag();y=78}
      doc.setFont("times","bold");doc.setFontSize(12);doc.setTextColor(30,92,42);doc.text(x.nome,M,y);
      doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(68,68,68);doc.text(linhas,M,y+13);
      y+=13+linhas.length*11;
      if(e.dias.length){doc.autoTable({...base,startY:y,head:[["Data","Dia","Previsto","Trabalhado","Diferença","O que aconteceu"]],
        body:e.dias.map(({r,motivo})=>[brDate(r.day),r.wd||"",dpHabs(r.expectedMin),dpHabs(r.workedMin),dpH(r.saldo),motivo]),
        columnStyles:{0:{cellWidth:62},1:{cellWidth:34},2:{cellWidth:58,halign:"right"},3:{cellWidth:62,halign:"right"},4:{cellWidth:58,halign:"right",fontStyle:"bold"}}});
        y=doc.lastAutoTable.finalY+20}
      else y+=12;
    }
    const tp=doc.internal.getNumberOfPages();for(let i=1;i<=tp;i++){doc.setPage(i);anivPdfRodape(doc,i,tp)}
    if(await saveFile(`ponto-e-pessoal-${ym}.pdf`,new Uint8Array(doc.output("arraybuffer"))))toast("Relatório do ponto e pessoal baixado.");
  }catch(e){console.error(e);toast("Não consegui gerar o PDF: "+(e.message||e),true)}
}

/* ---------- aba "Painel" em Gestão de pessoas (primeira aba) ---------- */
if(PGX.gp){PGX.gp.tabs.unshift({k:"painel",l:"Painel e gráficos",html:dpHtml,bind:bindDp});PGX.gp.st.tab="painel"}
