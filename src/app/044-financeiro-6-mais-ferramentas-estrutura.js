/* ===== Financeiro 6: "Mais ferramentas" — estrutura + Bloco A (orçamento, metas, custos, indicadores, simuladores) ===== */
const f6cfg=()=>xcfg("fin6");
const f6save=p=>xcfgSave("fin6",p);
const F6={sec:"orc",ano:new Date().getFullYear(),mes:new Date().getMonth(),sim:{}};
const F6SECS=[];
function f6Reg(k,g,l,html,bind){const i=F6SECS.findIndex(s=>s.k===k);const o={k,g,l,html,bind:bind||(()=>{})};if(i>=0)F6SECS[i]=o;else F6SECS.push(o)}
const f6Num=v=>{const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:0};
const f6Money=v=>fmtBRL(arred2(v));
const f6Pct=(a,b)=>b?Math.round(a/b*1000)/10:0;
const f6Card=(t,sub,body)=>`<div class="card"><h2>${t}</h2>${sub?`<p class="sub" style="margin:0 0 10px">${sub}</p>`:""}${body}</div>`;
const f6Tbl=(heads,rows,cls)=>`<div class="wrap"><table><thead><tr>${heads.map((h,i)=>`<th${i&&cls!=="txt"?' class="n"':""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const f6Tr=(cells,b)=>`<tr${b?' style="font-weight:700"':""}>${cells.map((c,i)=>`<td${i?' class="n"':""}>${c}</td>`).join("")}</tr>`;
const f6Bar=(p,cor)=>`<div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;min-width:70px"><div style="height:100%;width:${Math.max(0,Math.min(100,p))}%;background:${cor||"var(--verde-medio)"}"></div></div>`;
const f6Sem=(ok,warn)=>ok?"#2e7d32":warn?"#e0a100":"#c62828";
const f6Dot=c=>`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:6px"></span>`;
const f6Dias=(ano,mes)=>mes<0?((ano%4===0&&ano%100!==0)||ano%400===0?366:365):new Date(ano,mes+1,0).getDate();
const f6MesesN=mes=>mes<0?12:1;
const f6PerLabel=()=>F6.mes<0?`${F6.ano}`:`${MESES_PT[F6.mes]} de ${F6.ano}`;
const f6Rel=(ano,mes)=>finRelData({ano,mes,incNF:FIN.incNF});
const f6Tot=r=>({e:soma(Object.values(r.porCat),x=>x.e),s:soma(Object.values(r.porCat),x=>x.s)});
function f6Esc(s){return esc(String(s==null?"":s))}
/* formulário genérico em modal */
function f6Form(titulo,campos,onOk,opts){
  opts=opts||{};
  const h=campos.map(c=>{
    if(c.t==="sep")return `<h4 style="margin:12px 0 4px">${c.l}</h4>`;
    if(c.t==="note")return `<div class="sub" style="margin:4px 0">${c.l}</div>`;
    const v=c.v==null?"":c.v;let inp;
    if(c.t==="select")inp=`<select id="f6f_${c.k}">${(c.opts||[]).map(o=>{const [ov,ol]=Array.isArray(o)?o:[o,o];return `<option value="${f6Esc(ov)}" ${String(ov)===String(v)?"selected":""}>${f6Esc(ol)}</option>`}).join("")}</select>`;
    else if(c.t==="textarea")inp=`<textarea id="f6f_${c.k}" rows="3" placeholder="${f6Esc(c.ph||"")}">${f6Esc(v)}</textarea>`;
    else if(c.t==="check")return `<label style="display:flex;gap:6px;align-items:center;font-weight:400;margin-top:8px"><input type="checkbox" id="f6f_${c.k}" ${v?"checked":""}> ${c.l}</label>`;
    else inp=`<input id="f6f_${c.k}" type="${c.t||"text"}" ${c.t==="number"?'step="any"':""} value="${f6Esc(v)}" placeholder="${f6Esc(c.ph||"")}" ${c.list?`list="f6dl_${c.k}"`:""}>${c.list?`<datalist id="f6dl_${c.k}">${c.list.map(o=>`<option value="${f6Esc(o)}">`).join("")}</datalist>`:""}`;
    return `<label style="margin-top:8px">${c.l}</label>${inp}`;
  }).join("");
  const ov=openModal(`<h3>${titulo}</h3>${h}<div class="err" id="f6err"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="f6cx">Cancelar</button><button class="b" id="f6ok">${opts.ok||"Salvar"}</button></div>`);
  ov.querySelector("#f6cx").onclick=()=>ov.remove();
  ov.querySelector("#f6ok").onclick=async()=>{
    const v={};campos.forEach(c=>{if(!c.k)return;const el=ov.querySelector("#f6f_"+c.k);v[c.k]=c.t==="check"?el.checked:c.t==="number"?(el.value===""?null:f6Num(el.value)):el.value});
    const er=await onOk(v,ov);
    if(er)ov.querySelector("#f6err").textContent=er;else ov.remove();
  };
  return ov;
}
const f6Go=()=>go("fin",true);
/* ---------- aba "Mais ferramentas" ---------- */
function f6Periodo(){
  const y0=new Date().getFullYear(),anos=[];for(let y=y0-4;y<=y0+3;y++)anos.push(y);
  return `<div class="row" style="align-items:flex-end;margin-bottom:10px"><div><label>Período</label><select id="f6mes"><option value="-1" ${F6.mes<0?"selected":""}>Ano inteiro</option>${MESES_PT.map((n,k)=>`<option value="${k}" ${F6.mes===k?"selected":""}>${n}</option>`).join("")}</select></div><div><label>Ano</label><select id="f6ano">${anos.map(y=>`<option ${y===F6.ano?"selected":""}>${y}</option>`).join("")}</select></div></div>`;
}
function finMaisHtml(){
  const grupos=[...new Set(F6SECS.map(s=>s.g))];
  if(!F6SECS.some(s=>s.k===F6.sec))F6.sec=F6SECS[0].k;
  const cur=F6SECS.find(s=>s.k===F6.sec);
  const nav=grupos.map(g=>`<details style="margin-bottom:4px" ${cur.g===g?"open":""}><summary style="cursor:pointer;font-weight:700;padding:4px 0">${g} <span class="sub" style="font-weight:400">(${F6SECS.filter(s=>s.g===g).length})</span></summary><div>${F6SECS.filter(s=>s.g===g).map(s=>`<button class="b ${F6.sec===s.k?"":"sec"} sm" style="margin:2px" data-f6sec="${s.k}">${s.l}</button>`).join("")}</div></details>`).join("");
  let body;try{body=cur.html()}catch(e){console.error(e);body=`<div class="card"><div class="empty">Erro ao montar esta seção: ${f6Esc(e.message)}</div></div>`}
  return `<div class="card">${nav}</div>${body}`;
}
const _bindFin6=bindFin;
bindFin=function(){
  _bindFin6();
  if(FIN.tab!=="mais")return;
  document.querySelectorAll("[data-f6sec]").forEach(b=>b.onclick=()=>{F6.sec=b.dataset.f6sec;f6Go()});
  const m=$("f6mes");if(m){m.onchange=()=>{F6.mes=+m.value;f6Go()};$("f6ano").onchange=e=>{F6.ano=+e.target.value;f6Go()}}
  const cur=F6SECS.find(s=>s.k===F6.sec);if(cur)try{cur.bind()}catch(e){console.error(e)}
};
/* ---------- A1. Orçamento ---------- */
function f6Cats(){
  const c=new Set();finAll().filter(e=>e.tipo==="pagar"&&e.cat).forEach(e=>c.add(e.cat));
  ((S.config.nf&&S.config.nf.rows)||[]).forEach(r=>{if(r.categoria)c.add(r.categoria)});
  Object.keys(f6cfg().orc||{}).filter(k=>k.startsWith("cat:")).forEach(k=>c.add(k.slice(4)));
  return [...c].sort((a,b)=>a.localeCompare(b,"pt"));
}
function f6Areas(){const a=new Set(estData().areas||[]);Object.keys(f6cfg().orc||{}).filter(k=>k.startsWith("area:")).forEach(k=>a.add(k.slice(5)));return [...a].sort((a,b)=>a.localeCompare(b,"pt"))}
const f6OrcKey=(k,ano)=>(((f6cfg().orc||{})[k])||{})[ano];
function f6OrcMes(k,ano,m){const o=f6OrcKey(k,ano);if(!o)return 0;return o.m&&o.m[m]!=null&&o.m[m]!==""?+o.m[m]:(+o.base||0)}
function f6OrcPer(k,ano,mes){return mes<0?soma([...Array(12).keys()],m=>f6OrcMes(k,ano,m)):f6OrcMes(k,ano,mes)}
function f6OrcLinhas(ano,mes){
  const r=f6Rel(ano,mes),out=[];
  f6Cats().forEach(c=>{const o=f6OrcPer("cat:"+c,ano,mes),re=(r.porCat[c]||{s:0}).s;if(o||re)out.push({k:"cat:"+c,nome:c,o,re})});
  f6Areas().forEach(a=>{const o=f6OrcPer("area:"+a,ano,mes),re=(r.porArea[a]||{s:0}).s;if(o)out.push({k:"area:"+a,nome:a,o,re})});
  return out;
}
function f6OrcAlertas(){
  const h=hojeIso(),ano=+h.slice(0,4),mes=+h.slice(5,7)-1,al=+(f6cfg().orcAlerta||90),L=[];
  f6OrcLinhas(ano,mes).filter(x=>x.k.startsWith("cat:")&&x.o>0).forEach(x=>{const p=x.re/x.o*100;if(p>=al)L.push({...x,p})});
  return L;
}
function f6OrcHtml(){
  const L=f6OrcLinhas(F6.ano,F6.mes),al=+(f6cfg().orcAlerta||90);
  const rows=L.map(x=>{const p=x.o?x.re/x.o*100:(x.re?999:0);const cor=f6Sem(p<al,p<100);
    return f6Tr([f6Esc(x.nome)+(x.k.startsWith("area:")?' <span class="sub">(área)</span>':""),f6Money(x.o),f6Money(x.re),`${f6Dot(cor)}${x.o?Math.round(p)+"%":"sem orçamento"}`,f6Bar(p,cor),f6Money(x.o-x.re),`<button class="b sec sm" data-f6orc="${f6Esc(x.k)}">Editar</button>`])}).join("");
  const t=soma(L.filter(x=>x.k.startsWith("cat:")),x=>x.o),tr=soma(L.filter(x=>x.k.startsWith("cat:")),x=>x.re);
  const tri=[0,1,2,3].map(q=>{const ms=[q*3,q*3+1,q*3+2],o=soma(f6Cats(),c=>soma(ms,m=>f6OrcMes("cat:"+c,F6.ano,m))),re=soma(ms,m=>f6Tot(f6Rel(F6.ano,m)).s);return f6Tr([`${q+1}º trimestre`,f6Money(o),f6Money(re),o?Math.round(re/o*100)+"%":"—",f6Bar(o?re/o*100:0),f6Money(o-re),""])}).join("");
  return f6Periodo()+f6Card("Orçamento por categoria e área",`Compara o que você planejou gastar com o que já foi lançado (pelo vencimento, com rateio e notas fiscais). Fica amarelo a partir de ${al}% e vermelho ao estourar. Período: ${f6PerLabel()}.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f6orcnew">Definir orçamento…</button><button class="b sec sm" id="f6orcsug">Sugerir pela média dos últimos 12 meses (base zero)</button><button class="b sec sm" id="f6orccfg">Nível de alerta</button><button class="b sec sm" id="f6orccop">Copiar do ano anterior</button></div>`+
    (L.length?f6Tbl(["Categoria / área","Orçado","Realizado","% usado","","Saldo",""],[...rows,f6Tr(["Total das categorias",f6Money(t),f6Money(tr),t?Math.round(tr/t*100)+"%":"—","",f6Money(t-tr),""],1)]):`<div class="empty">Nenhum orçamento definido ainda. Use “Definir orçamento” ou “Sugerir pela média”.</div>`))+
    f6Card("Revisão trimestral",`Orçado versus realizado em cada trimestre de ${F6.ano} (só categorias).`,f6Tbl(["Trimestre","Orçado","Realizado","%","","Saldo",""],[tri]));
}
function f6OrcEdit(key){
  const ano=F6.ano,nome=key.replace(/^(cat|area):/,""),o=f6OrcKey(key,ano)||{base:0,m:{}};
  const campos=[{k:"base",l:"Valor mensal padrão (R$)",t:"number",v:o.base||""},{t:"sep",l:"Ajustes por mês (deixe em branco para usar o padrão)"}];
  MESES_PT.forEach((n,i)=>campos.push({k:"m"+i,l:n,t:"number",v:o.m&&o.m[i]!=null?o.m[i]:""}));
  f6Form(`Orçamento de ${nome} em ${ano}`,campos,v=>{
    const m={};MESES_PT.forEach((_,i)=>{if(v["m"+i]!=null)m[i]=v["m"+i]});
    const orc=JSON.parse(JSON.stringify(f6cfg().orc||{}));orc[key]=orc[key]||{};orc[key][ano]={base:v.base||0,m};f6save({orc});f6Go()});
}
function f6OrcNovo(){
  const cats=f6Cats(),areas=f6Areas();
  f6Form("Definir orçamento",[{k:"tipo",l:"Tipo",t:"select",opts:[["cat","Categoria de despesa"],["area","Área (centro de custo)"]]},{k:"nome",l:"Nome",list:[...cats,...areas],ph:"ex.: Energia"},{k:"base",l:"Valor mensal (R$)",t:"number"}],v=>{
    if(!v.nome.trim())return"Informe a categoria ou área.";if(!(v.base>=0)||v.base===null)return"Informe o valor mensal.";
    const key=v.tipo+":"+v.nome.trim(),orc=JSON.parse(JSON.stringify(f6cfg().orc||{}));orc[key]=orc[key]||{};orc[key][F6.ano]={base:v.base,m:(orc[key][F6.ano]||{}).m||{}};f6save({orc});f6Go()});
}
function f6OrcSugerir(){
  const h=hojeIso(),ano=+h.slice(0,4),mes=+h.slice(5,7)-1,tot={};let n=0;
  for(let i=1;i<=12;i++){let m=mes-i,a=ano;while(m<0){m+=12;a--}const r=f6Rel(a,m);if(f6Tot(r).s>0)n++;Object.entries(r.porCat).forEach(([c,x])=>{if(c!=="Sem classificação")tot[c]=(tot[c]||0)+x.s})}
  if(!n)return toast("Ainda não há meses anteriores com despesa para calcular a média.",true);
  askConfirm(`Preencher o orçamento de ${F6.ano} com a média mensal dos últimos ${n} mês(es) com despesa? Categorias que já têm orçamento neste ano serão mantidas.`,"Sugerir").then(ok=>{
    if(!ok)return;const orc=JSON.parse(JSON.stringify(f6cfg().orc||{}));let c=0;
    Object.entries(tot).forEach(([cat,v])=>{const k="cat:"+cat;orc[k]=orc[k]||{};if(!orc[k][F6.ano]){orc[k][F6.ano]={base:Math.round(v/n),m:{}};c++}});
    f6save({orc});toast(`${c} categoria(s) preenchida(s). Revise os valores.`);f6Go()});
}
function f6OrcCopiar(){
  const orc=JSON.parse(JSON.stringify(f6cfg().orc||{}));let c=0;
  Object.keys(orc).forEach(k=>{if(orc[k][F6.ano-1]&&!orc[k][F6.ano]){orc[k][F6.ano]=JSON.parse(JSON.stringify(orc[k][F6.ano-1]));c++}});
  if(!c)return toast(`Nada para copiar de ${F6.ano-1}.`,true);f6save({orc});toast(`${c} orçamento(s) copiado(s) de ${F6.ano-1}.`);f6Go();
}
function f6OrcBind(){
  document.querySelectorAll("[data-f6orc]").forEach(b=>b.onclick=()=>f6OrcEdit(b.dataset.f6orc));
  const g=(i,fn)=>{const b=$(i);if(b)b.onclick=fn};
  g("f6orcnew",f6OrcNovo);g("f6orcsug",f6OrcSugerir);g("f6orccop",f6OrcCopiar);
  g("f6orccfg",()=>f6Form("Nível de alerta do orçamento",[{k:"p",l:"Avisar na tela inicial quando uma categoria usar (%) do orçamento do mês",t:"number",v:f6cfg().orcAlerta||90}],v=>{if(!(v.p>0&&v.p<=200))return"Informe entre 1 e 200.";f6save({orcAlerta:v.p});f6Go()}));
}
f6Reg("orc","Planejamento","Orçamento",f6OrcHtml,f6OrcBind);
/* ---------- A2. Metas ---------- */
function f6Ocupacao(){const ativos=resAtivos().length,v=+(f6cfg().vagas||0);return{ativos,vagas:v,pct:v?ativos/v*100:null}}
function f6MensalidadeMedia(){const a=resAtivos().filter(r=>+r.mensalidade>0);return a.length?soma(a,r=>+r.mensalidade)/a.length:0}
function f6MetasHtml(){
  const c=f6cfg(),m=c.metas||{},r=f6Rel(F6.ano,F6.mes),t=f6Tot(r),oc=f6Ocupacao(),mesesN=f6MesesN(F6.mes);
  const recReal=t.e,metaRec=(+m.receita||0)*mesesN,res=t.e-t.s,margem=t.e?res/t.e*100:0;
  const linha=(nome,meta,real,fmt,inv)=>{if(!meta)return f6Tr([nome,"—","—","definir meta",""]);const p=inv?(real?meta/real*100:0):real/meta*100;return f6Tr([nome,fmt(meta),fmt(real),`${f6Dot(f6Sem(p>=100,p>=80))}${Math.round(p)}% da meta`,f6Bar(p,f6Sem(p>=100,p>=80))])};
  return f6Periodo()+f6Card("Metas",`Acompanha receita, ocupação e margem de ${f6PerLabel()}.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f6metaedit">Definir metas e vagas</button></div>`+
    f6Tbl(["Indicador","Meta","Realizado","Situação",""],[
      linha("Receita (por vencimento)",metaRec,recReal,f6Money),
      linha("Ocupação (residentes ativos hoje)",+m.ocupacao||0,oc.pct||0,v=>Math.round(v)+"%"),
      linha("Margem (resultado ÷ receita)",+m.margem||0,margem,v=>(Math.round(v*10)/10)+"%"),
      linha("Despesa máxima (teto)",(+m.teto||0)*mesesN,t.s,f6Money,true)]))
    +(oc.vagas?"":`<div class="callout">Informe o total de vagas da casa em “Definir metas e vagas” para calcular a ocupação.</div>`);
}
function f6MetasBind(){
  const b=$("f6metaedit");if(b)b.onclick=()=>{const c=f6cfg(),m=c.metas||{};
    f6Form("Metas e capacidade",[{k:"vagas",l:"Total de vagas (leitos) da casa",t:"number",v:c.vagas||""},{k:"receita",l:"Meta de receita por mês (R$)",t:"number",v:m.receita||""},{k:"ocupacao",l:"Meta de ocupação (%)",t:"number",v:m.ocupacao||""},{k:"margem",l:"Meta de margem (%)",t:"number",v:m.margem||""},{k:"teto",l:"Teto de despesas por mês (R$)",t:"number",v:m.teto||""}],v=>{f6save({vagas:v.vagas||0,metas:{receita:v.receita||0,ocupacao:v.ocupacao||0,margem:v.margem||0,teto:v.teto||0}});f6Go()})};
}
f6Reg("metas","Planejamento","Metas",f6MetasHtml,f6MetasBind);
/* ---------- A3. Custos: por residente, fixo/variável, equilíbrio, rateio ---------- */
const F6_FIXO=/folha|sal[aá]rio|pr[oó].?labore|aluguel|energia|luz|[aá]gua|internet|telefone|seguro|contab|contador|vigil|software|sistema|imposto|taxa|financi|empr[eé]stimo|deprec/i;
function f6TipoCusto(cat){const t=(f6cfg().custoTipo||{})[cat];return t||(F6_FIXO.test(cat)?"fixo":"variavel")}
function f6Custos(ano,mes){
  const r=f6Rel(ano,mes),n=Math.max(1,resAtivos().length),dias=f6Dias(ano,mes),t=f6Tot(r);
  let fixo=0,vari=0;Object.entries(r.porCat).forEach(([c,x])=>{if(f6TipoCusto(c)==="fixo")fixo+=x.s;else vari+=x.s});
  const meses=f6MesesN(mes);
  return{r,n,dias,t,fixo,vari,fixoMes:fixo/meses,variMes:vari/meses,porResDia:t.s/(n*dias),recResDia:t.e/(n*dias)};
}
function f6CustosHtml(){
  const C=f6Custos(F6.ano,F6.mes),cfg=f6cfg(),vagas=+cfg.vagas||0;
  const recMed=f6MensalidadeMedia(),vResMes=C.variMes/C.n,margemUn=recMed-vResMes,pe=margemUn>0?C.fixoMes/margemUn:null;
  const porCat=Object.entries(C.r.porCat).filter(([,x])=>x.s>0).sort((a,b)=>b[1].s-a[1].s);
  const tipoRows=porCat.map(([c,x])=>f6Tr([f6Esc(c),f6Money(x.s),`<select data-f6tc="${f6Esc(c)}"><option value="fixo" ${f6TipoCusto(c)==="fixo"?"selected":""}>Fixo</option><option value="variavel" ${f6TipoCusto(c)==="variavel"?"selected":""}>Variável</option></select>`])).join("");
  const resRows=resAtivos().map(r=>{const rec=soma(finAll().filter(e=>e.tipo==="receber"&&e.residente===r.id&&!e.cancelada&&(F6.mes<0?e.venc.slice(0,4)===String(F6.ano):e.venc.slice(0,7)===`${F6.ano}-${f4pad(F6.mes+1)}`)),e=>finNum(e));
    const custo=C.t.s/C.n;return f6Tr([f6Esc(resNome(r)),f6Money(rec),f6Money(custo),`${f6Dot(f6Sem(rec-custo>=0,rec-custo>=-custo*0.1))}${f6Money(rec-custo)}`])}).join("");
  // rateio de indiretos
  const ind=cfg.areaIndireta||"Administrativo",areas=C.r.porArea,diretas=Object.entries(areas).filter(([a,x])=>a!==ind&&x.s>0),totDir=soma(diretas,([,x])=>x.s),indV=(areas[ind]||{s:0}).s;
  const ratRows=diretas.map(([a,x])=>f6Tr([f6Esc(a),f6Money(x.s),f6Money(totDir?indV*x.s/totDir:0),f6Money(x.s+(totDir?indV*x.s/totDir:0))])).join("");
  return f6Periodo()+f6Card("Custo por residente",`Período ${f6PerLabel()} · ${C.n} residente(s) ativo(s) hoje (usado como base).`,
    `<div class="grid3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
     <div class="callout"><div class="sub">Custo por residente/dia</div><b style="font-size:20px">${f6Money(C.porResDia)}</b></div>
     <div class="callout"><div class="sub">Receita por residente/dia</div><b style="font-size:20px">${f6Money(C.recResDia)}</b></div>
     <div class="callout"><div class="sub">Custo por residente/mês</div><b style="font-size:20px">${f6Money(C.t.s/C.n/f6MesesN(F6.mes))}</b></div>
     <div class="callout"><div class="sub">Margem por residente/dia</div><b style="font-size:20px">${f6Money(C.recResDia-C.porResDia)}</b></div></div>`)
   +f6Card("Ponto de equilíbrio","Quantos residentes pagando a mensalidade média cobrem os custos fixos do mês.",
     pe==null?`<div class="empty">Não foi possível calcular: a mensalidade média (${f6Money(recMed)}) não cobre o custo variável por residente (${f6Money(vResMes)}). Cadastre as mensalidades dos residentes ou revise a classificação fixo/variável abaixo.</div>`
     :`<p>Custos fixos/mês <b>${f6Money(C.fixoMes)}</b> ÷ (mensalidade média <b>${f6Money(recMed)}</b> − custo variável por residente <b>${f6Money(vResMes)}</b>) = <b>${Math.ceil(pe)} residente(s)</b>.</p><p class="sub">${C.n >= pe?`Hoje a casa tem ${C.n} ativos: ${f6Dot("#2e7d32")}acima do equilíbrio${vagas?` (${f6Pct(pe,vagas)}% das ${vagas} vagas)`:""}.`:`Hoje a casa tem ${C.n} ativos: ${f6Dot("#c62828")}faltam ${Math.ceil(pe-C.n)} para empatar.`}</p>`)
   +f6Card("Custo fixo × variável","Marque como cada categoria deve ser tratada (a sugestão inicial é por palavras-chave).",
     `<p>Fixo: <b>${f6Money(C.fixo)}</b> (${Math.round(f6Pct(C.fixo,C.fixo+C.vari))}%) · Variável: <b>${f6Money(C.vari)}</b></p>`+(tipoRows?f6Tbl(["Categoria","Gasto no período","Tratar como"],[tipoRows]):`<div class="empty">Sem despesas no período.</div>`))
   +f6Card("Margem por residente","Receita lançada para cada residente menos a fatia igual do custo total (custo rateado por cabeça).",resRows?f6Tbl(["Residente","Receita","Custo rateado","Margem"],[resRows]):`<div class="empty">Sem residentes ativos.</div>`)
   +f6Card("Rateio de custos indiretos",`O que foi gasto na área “${f6Esc(ind)}” é dividido entre as demais áreas na proporção do gasto direto de cada uma. <button class="b sec sm" id="f6indarea" style="margin-left:6px">Trocar a área indireta</button>`,ratRows?f6Tbl(["Área","Custo direto","Indireto rateado","Custo total"],[ratRows,f6Tr(["Indireto total a ratear","",f6Money(indV),""],1)]):`<div class="empty">Sem gastos diretos por área no período.</div>`);
}
function f6CustosBind(){
  document.querySelectorAll("[data-f6tc]").forEach(s=>s.onchange=()=>{const ct=JSON.parse(JSON.stringify(f6cfg().custoTipo||{}));ct[s.dataset.f6tc]=s.value;f6save({custoTipo:ct});f6Go()});
  const b=$("f6indarea");if(b)b.onclick=()=>f6Form("Área de custos indiretos",[{k:"a",l:"Nome da área",v:f6cfg().areaIndireta||"Administrativo",list:f6Areas()}],v=>{f6save({areaIndireta:v.a.trim()||"Administrativo"});f6Go()});
}
f6Reg("custos","Planejamento","Custos e equilíbrio",f6CustosHtml,f6CustosBind);
/* ---------- A4. Indicadores (KPIs) ---------- */
function f6Kpis(){
  const h=hojeIso(),l=finAll().filter(e=>!e.cancelada);
  const caixa=typeof f8Disponivel==="function"?f8Disponivel():soma(f4ContasPag(),c=>f4SaldoConta(c)),h30=addDaysIso(h,30);
  const pag30=soma(l.filter(e=>e.tipo==="pagar"&&!e.pago&&e.venc<=h30),e=>+e.valor),rec30=soma(l.filter(e=>e.tipo==="receber"&&!e.pago&&e.venc<=h30),e=>+e.valor);
  const r=f6Rel(F6.ano,F6.mes),t=f6Tot(r),res=t.e-t.s;
  const ebitdaAdd=soma(Object.entries(r.porCat).filter(([c])=>/deprec|juros|financ|iof|tarifa banc|empr[eé]stimo/i.test(c)),([,x])=>x.s);
  const d90=addDaysIso(h,-90),desp90=soma(l.filter(e=>e.tipo==="pagar"&&e.pago&&e.pago>=d90&&e.pago<=h),e=>finNum(e)),mediaDia=desp90/90;
  const venc=soma(l.filter(e=>e.tipo==="receber"&&!e.pago&&e.venc<h),e=>+e.valor),aberto=soma(l.filter(e=>e.tipo==="receber"&&(F6.mes<0?e.venc.slice(0,4)===String(F6.ano):e.venc.slice(0,7)===`${F6.ano}-${f4pad(F6.mes+1)}`)),e=>+e.valor);
  const divida=typeof f6DividaTotal==="function"?f6DividaTotal():0;
  const recAno=soma(l.filter(e=>e.tipo==="receber"&&e.venc.slice(0,4)===String(F6.ano)),e=>finNum(e));
  return{caixa,pag30,rec30,res,margem:t.e?res/t.e*100:0,ebitda:res+ebitdaAdd,diasCaixa:mediaDia?caixa/mediaDia:null,inad:aberto?venc/aberto*100:0,liqImed:pag30?caixa/pag30:null,liqCorr:pag30?(caixa+rec30)/pag30:null,divida,endiv:recAno?divida/recAno*100:0,t};
}
function f6KpiHtml(){
  const K=f6Kpis();
  const card=(nome,val,cor,dica)=>`<div class="callout" style="border-left:4px solid ${cor}"><div class="sub">${nome}</div><b style="font-size:20px">${val}</b><div class="sub">${dica}</div></div>`;
  const li=K.liqImed,lc=K.liqCorr,dc=K.diasCaixa;
  return f6Periodo()+f6Card("Painel de indicadores",`Semáforo: verde bom · amarelo atenção · vermelho crítico. Período ${f6PerLabel()} para resultado e margem; caixa e liquidez valem para hoje.`,
   `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">`+
   card("Caixa hoje",f6Money(K.caixa),f6Sem(K.caixa>0,K.caixa>=0),"soma dos saldos das contas")+
   card("Resultado do período",f6Money(K.res),f6Sem(K.res>0,K.res>=0),`receitas − despesas`)+
   card("Margem líquida",(Math.round(K.margem*10)/10)+"%",f6Sem(K.margem>=10,K.margem>=0),"resultado ÷ receita")+
   card("EBITDA aproximado",f6Money(K.ebitda),f6Sem(K.ebitda>0,K.ebitda>=0),"resultado + depreciação, juros e tarifas (por nome da categoria)")+
   card("Liquidez imediata",li==null?"—":(Math.round(li*100)/100).toString().replace(".",","),li==null?"#888":f6Sem(li>=1,li>=0.7),"caixa ÷ contas a pagar em 30 dias")+
   card("Liquidez corrente (30 dias)",lc==null?"—":(Math.round(lc*100)/100).toString().replace(".",","),lc==null?"#888":f6Sem(lc>=1.2,lc>=1),"(caixa + a receber) ÷ a pagar em 30 dias")+
   card("Dias de caixa",dc==null?"—":Math.floor(dc)+" dias",dc==null?"#888":f6Sem(dc>=60,dc>=30),"quantos dias o caixa cobre no ritmo de gasto dos últimos 90 dias")+
   card("Inadimplência",(Math.round(K.inad*10)/10)+"%",f6Sem(K.inad<=5,K.inad<=10),"vencido em aberto ÷ total a receber do período")+
   card("Endividamento",f6Money(K.divida),f6Sem(K.endiv<=30,K.endiv<=60),`${Math.round(K.endiv)}% da receita do ano (dívidas cadastradas em Empréstimos)`)+
   `</div>`);
}
f6Reg("kpi","Planejamento","Indicadores",f6KpiHtml);
/* ---------- A5. Gráficos e análises ---------- */
function f6Svg(series,cores,labels,fmt){
  const W=640,H=220,pl=46,pb=22,n=labels.length,mx=Math.max(1,...series.flat().map(Math.abs)),mn=Math.min(0,...series.flat());
  const sc=v=>H-pb-((v-mn)/((mx-mn)||1))*(H-pb-14),bw=(W-pl)/n,gw=bw*0.78/series.length;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto" role="img"><line x1="${pl}" y1="${sc(0)}" x2="${W}" y2="${sc(0)}" stroke="currentColor" opacity=".3"/>`;
  [0,0.5,1].forEach(f=>{const v=mn+(mx-mn)*f;s+=`<text x="${pl-4}" y="${sc(v)+4}" font-size="10" text-anchor="end" fill="currentColor" opacity=".7">${fmt(v)}</text>`});
  labels.forEach((lb,i)=>{const x0=pl+i*bw+bw*0.11;series.forEach((se,j)=>{const v=se[i],y=sc(Math.max(v,0)),y0=sc(0);s+=`<rect x="${x0+j*gw}" y="${Math.min(y,sc(Math.min(v,0)))}" width="${gw-1}" height="${Math.max(1,Math.abs(sc(v)-y0))}" fill="${cores[j]}" data-f6bm="${i}" data-f6bs="${j}" style="cursor:pointer"><title>${lb}: ${fmt(v)}</title></rect>`});s+=`<text x="${pl+i*bw+bw/2}" y="${H-6}" font-size="10" text-anchor="middle" fill="currentColor" opacity=".7">${lb}</text>`});
  return s+"</svg>";
}
const f6Abrev=v=>Math.abs(v)>=1e6?(v/1e6).toFixed(1)+"M":Math.abs(v)>=1e3?Math.round(v/1e3)+"k":Math.round(v)+"";
function f6AnaliseHtml(){
  const ano=F6.ano,m12=[...Array(12).keys()],met=F6.sim.graf||"res";
  const val=(a,m)=>{const t=f6Tot(f6Rel(a,m));return met==="rec"?t.e:met==="desp"?t.s:t.e-t.s};
  const s1=m12.map(m=>val(ano,m)),s0=m12.map(m=>val(ano-1,m));
  const graf=f6Card("Comparativo com o mesmo mês do ano anterior",`${ano} (verde) × ${ano-1} (cinza).`,`<div class="row" style="margin-bottom:6px"><select id="f6graf"><option value="res" ${met==="res"?"selected":""}>Resultado</option><option value="rec" ${met==="rec"?"selected":""}>Receitas</option><option value="desp" ${met==="desp"?"selected":""}>Despesas</option></select></div>`+f6Svg([s0,s1],["#9e9e9e","#2e7d32"],MESES_PT.map(x=>x.slice(0,3)),f6Abrev));
  // sazonalidade
  const anos=[...new Set(finAll().filter(e=>e.tipo==="pagar").map(e=>+e.venc.slice(0,4)))].filter(a=>a<=ano);
  const med=m12.map(m=>{const v=anos.map(a=>f6Tot(f6Rel(a,m)).s).filter(x=>x>0);return v.length?soma(v,x=>x)/v.length:0}),mm=soma(med,x=>x)/12||1;
  const saz=f6Card("Sazonalidade das despesas",`Média de cada mês nos anos com dados (${anos.join(", ")||"nenhum"}). Índice 100% = média do ano; acima de 110% é um mês pesado.`,
    f6Tbl(["Mês","Média","Índice",""],[m12.map(m=>f6Tr([MESES_PT[m],f6Money(med[m]),`${Math.round(med[m]/mm*100)}%`,f6Bar(med[m]/mm*50,med[m]/mm>1.1?"#c62828":"var(--verde-medio)")])).join("")]));
  // previsão
  const metodo=F6.sim.prev||"media3",h=hojeIso(),a0=+h.slice(0,4),m0=+h.slice(5,7)-1;
  const hist=[];for(let i=6;i>=1;i--){let m=m0-i,a=a0;while(m<0){m+=12;a--}hist.push(f6Rel(a,m))}
  const cats=[...new Set(hist.flatMap(r=>Object.keys(r.porCat)))],fut=[1,2,3,4,5,6].map(i=>{let m=m0+i,a=a0;while(m>11){m-=12;a++}return{a,m}});
  const proj=c=>{const y=hist.map(r=>(r.porCat[c]||{s:0}).s),n=y.length;if(metodo==="media3"){const u=y.slice(-3);return fut.map(()=>soma(u,x=>x)/3)}
    const mx=(n-1)/2,my=soma(y,x=>x)/n,sl=soma(y.map((v,i)=>(i-mx)*(v-my)),x=>x)/(soma(y.map((_,i)=>(i-mx)**2),x=>x)||1);return fut.map((_,k)=>Math.max(0,my+sl*(n+k-mx)))};
  const prow=cats.map(c=>({c,p:proj(c)})).filter(x=>soma(x.p,v=>v)>0).sort((a,b)=>soma(b.p,v=>v)-soma(a.p,v=>v));
  const totP=fut.map((_,k)=>soma(prow,x=>x.p[k])),lan=fut.map(f=>f6Tot(f6Rel(f.a,f.m)).s);
  const prev=f6Card("Previsão de despesas",`Projeção pelos últimos 6 meses fechados. “Já lançado” são as contas que você já cadastrou para cada mês futuro; vale o maior dos dois.`,
    `<div class="row" style="margin-bottom:6px"><select id="f6prev"><option value="media3" ${metodo==="media3"?"selected":""}>Média dos últimos 3 meses</option><option value="tend" ${metodo==="tend"?"selected":""}>Tendência (regressão linear)</option></select></div>`+
    (prow.length?f6Tbl(["Categoria",...fut.map(f=>MESES_PT[f.m].slice(0,3)+"/"+String(f.a).slice(2))],[...prow.slice(0,12).map(x=>f6Tr([f6Esc(x.c),...x.p.map(f6Money)])),f6Tr(["Total previsto",...totP.map(f6Money)],1),f6Tr(["Já lançado",...lan.map(f6Money)]),f6Tr(["Estimativa (maior)",...totP.map((v,k)=>f6Money(Math.max(v,lan[k])))],1)]):`<div class="empty">Sem histórico de despesas nos últimos 6 meses.</div>`));
  // variação
  let pa=F6.ano,pm=F6.mes-1;if(F6.mes<0){pa=F6.ano-1;pm=-1}else if(pm<0){pm=11;pa--}
  const cur=f6Rel(F6.ano,F6.mes),ant=f6Rel(pa,pm),tc=f6Tot(cur),ta=f6Tot(ant);
  const cs=[...new Set([...Object.keys(cur.porCat),...Object.keys(ant.porCat)])].map(c=>({c,d:(cur.porCat[c]||{s:0}).s-(ant.porCat[c]||{s:0}).s,r:(cur.porCat[c]||{e:0}).e-(ant.porCat[c]||{e:0}).e}));
  const altas=cs.filter(x=>x.d>0.5).sort((a,b)=>b.d-a.d).slice(0,5),quedas=cs.filter(x=>x.d<-0.5).sort((a,b)=>a.d-b.d).slice(0,5);
  const dRes=(tc.e-tc.s)-(ta.e-ta.s),rotAnt=pm<0?String(pa):`${MESES_PT[pm]}/${pa}`;
  const txt=`O resultado ${dRes>=0?"subiu":"caiu"} ${f6Money(Math.abs(dRes))} em relação a ${rotAnt}: receitas ${tc.e-ta.e>=0?"+":"−"}${f6Money(Math.abs(tc.e-ta.e))} e despesas ${tc.s-ta.s>=0?"+":"−"}${f6Money(Math.abs(tc.s-ta.s))}.${altas[0]?` Maior aumento de gasto: ${altas[0].c} (+${f6Money(altas[0].d)}).`:""}${quedas[0]?` Maior redução: ${quedas[0].c} (−${f6Money(-quedas[0].d)}).`:""}`;
  const vari=f6Periodo()+f6Card("Por que o resultado mudou",f6PerLabel()+" × "+rotAnt,`<p>${f6Esc(txt)}</p>`+
    `<div class="row"><div style="flex:1;min-width:240px"><h4>Despesas que mais subiram</h4>${altas.length?f6Tbl(["Categoria","Variação"],[altas.map(x=>f6Tr([f6Esc(x.c),"+"+f6Money(x.d)])).join("")]):'<div class="sub">Nenhuma alta relevante.</div>'}</div><div style="flex:1;min-width:240px"><h4>Despesas que mais caíram</h4>${quedas.length?f6Tbl(["Categoria","Variação"],[quedas.map(x=>f6Tr([f6Esc(x.c),"−"+f6Money(-x.d)])).join("")]):'<div class="sub">Nenhuma queda relevante.</div>'}</div></div>`);
  return vari+graf+saz+prev;
}
function f6BarraClique(b){
  const m=+b.dataset.f6bm,j=+b.dataset.f6bs,ano=j===0?F6.ano-1:F6.ano,met=F6.sim.graf||"res",pref=`${ano}-${f4pad(m+1)}-`;
  const es=finAll().filter(e=>!e.cancelada&&e.venc.startsWith(pref)&&(met==="rec"?e.tipo==="receber":met==="desp"?e.tipo==="pagar":true)).sort((a,b)=>a.venc.localeCompare(b.venc));
  const ov=openModal(`<h3>${MESES_PT[m]} de ${ano}</h3>${es.length?f6Tbl(["Vencimento","Conta","Valor","Situação"],[es.map(e=>`<tr><td>${brDate(e.venc)}</td><td>${f6Esc(e.desc)}</td><td class="n">${e.tipo==="pagar"?"−":"+"}${fmtBRL(e.pago?finNum(e):e.valor)}</td><td>${finStatusLabel(e)}</td></tr>`).join("")],"txt"):'<div class="empty">Nada neste mês.</div>'}<div style="text-align:right;margin-top:10px"><button class="b" id="f6bmx">Fechar</button></div>`);
  ov.querySelector("#f6bmx").onclick=()=>ov.remove();
}
function f6AnaliseBind(){
  document.querySelectorAll("[data-f6bm]").forEach(b=>b.onclick=()=>f6BarraClique(b));
  const g=$("f6graf");if(g)g.onchange=()=>{F6.sim.graf=g.value;f6Go()};
  const p=$("f6prev");if(p)p.onchange=()=>{F6.sim.prev=p.value;f6Go()};
}
f6Reg("analise","Planejamento","Análises e gráficos",f6AnaliseHtml,f6AnaliseBind);
/* ---------- A6. Simuladores ---------- */
function f6Tir(fluxo){let lo=-0.99,hi=10;const f=r=>fluxo.reduce((s,v,i)=>s+v/Math.pow(1+r,i),0);if(f(lo)*f(hi)>0)return null;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(f(lo)*f(m)<=0)hi=m;else lo=m}return(lo+hi)/2}
function f6SimHtml(){
  const S1=F6.sim.reaj||{pct:5,inad:3},S2=F6.sim.cen||{inv:0,custo:0,rec:0,car:0,meses:24},S3=F6.sim.inv||{inv:0,ret:0,vida:60,taxa:12};
  const at=resAtivos().filter(r=>+r.mensalidade>0),base=soma(at,r=>+r.mensalidade),novo=base*(1+S1.pct/100),dif=novo-base,difReal=dif*(1-S1.inad/100);
  const reaj=f6Card("Simulador de reajuste da mensalidade",`Considera as ${at.length} mensalidades cadastradas dos residentes ativos.`,
    `<div class="row"><div><label>Reajuste (%)</label><input type="number" step="0.1" id="f6s1p" value="${S1.pct}"></div><div><label>Inadimplência esperada (%)</label><input type="number" step="0.1" id="f6s1i" value="${S1.inad}"></div><button class="b sec" id="f6s1" style="align-self:flex-end">Simular</button></div>`+
    f6Tbl(["","Mensal","12 meses"],[f6Tr(["Receita de mensalidades hoje",f6Money(base),f6Money(base*12)]),f6Tr(["Com o reajuste",f6Money(novo),f6Money(novo*12)]),f6Tr(["Aumento bruto",f6Money(dif),f6Money(dif*12)],1),f6Tr(["Aumento no caixa (descontada a inadimplência)",f6Money(difReal),f6Money(difReal*12)],1)])+
    `<p class="sub">Mensalidade média: ${f6Money(base/(at.length||1))} → ${f6Money(novo/(at.length||1))}.</p>`);
  // cenário
  const flu=[];let ac=-(+S2.inv||0),min=ac,pb=null;for(let m=1;m<=S2.meses;m++){const f=-(+S2.custo)+(m>S2.car?+S2.rec:0);ac+=f;flu.push({m,f,ac});if(ac<min)min=ac;if(pb==null&&ac>=0)pb=m}
  const preset=`<div class="row" style="margin-bottom:6px"><button class="b sec sm" data-f6pre="vaga">Nova vaga</button><button class="b sec sm" data-f6pre="contrat">Contratação</button><button class="b sec sm" data-f6pre="obra">Reforma / obra</button></div>`;
  const cen=f6Card("Simulador de cenário (nova vaga, reforma, contratação)","Informe o investimento inicial e o efeito mensal para ver o caixa acumulado mês a mês.",preset+
    `<div class="row"><div><label>Investimento inicial (R$)</label><input type="number" step="any" id="f6s2i" value="${S2.inv}"></div><div><label>Custo novo por mês (R$)</label><input type="number" step="any" id="f6s2c" value="${S2.custo}"></div><div><label>Receita nova por mês (R$)</label><input type="number" step="any" id="f6s2r" value="${S2.rec}"></div><div><label>Meses até a receita começar</label><input type="number" id="f6s2k" value="${S2.car}"></div><div><label>Horizonte (meses)</label><input type="number" id="f6s2m" value="${S2.meses}"></div><button class="b sec" id="f6s2" style="align-self:flex-end">Simular</button></div>`+
    (S2.inv||S2.custo||S2.rec?`<p><b>${pb?`Se paga no mês ${pb}.`:"Não se paga dentro do horizonte."}</b> Pior ponto do caixa acumulado: ${f6Money(min)}. Resultado em ${S2.meses} meses: <b>${f6Money(ac)}</b>.</p>`+f6Tbl(["Mês","Fluxo do mês","Acumulado"],[flu.filter(x=>x.m<=12||x.m%6===0).map(x=>f6Tr([x.m,f6Money(x.f),`<span style="color:${x.ac<0?"#c62828":"#2e7d32"}">${f6Money(x.ac)}</span>`])).join("")]):""));
  // investimento
  const tx=Math.pow(1+S3.taxa/100,1/12)-1,fl=[-(+S3.inv)];for(let m=1;m<=S3.vida;m++)fl.push(+S3.ret);
  const vpl=fl.reduce((s,v,i)=>s+v/Math.pow(1+tx,i),0),tir=f6Tir(fl),pay=S3.ret>0?S3.inv/S3.ret:null;
  const inv=f6Card("Análise de investimento (retorno de equipamento, reforma)","Payback, valor presente líquido e taxa interna de retorno.",
    `<div class="row"><div><label>Investimento (R$)</label><input type="number" step="any" id="f6s3i" value="${S3.inv}"></div><div><label>Retorno líquido por mês (R$)</label><input type="number" step="any" id="f6s3r" value="${S3.ret}"></div><div><label>Vida útil (meses)</label><input type="number" id="f6s3v" value="${S3.vida}"></div><div><label>Taxa mínima de retorno (% ao ano)</label><input type="number" step="0.1" id="f6s3t" value="${S3.taxa}"></div><button class="b sec" id="f6s3" style="align-self:flex-end">Calcular</button></div>`+
    (S3.inv&&S3.ret?`<p>Payback: <b>${pay?Math.ceil(pay)+" meses":"—"}</b> · VPL: <b style="color:${vpl>=0?"#2e7d32":"#c62828"}">${f6Money(vpl)}</b> · TIR: <b>${tir==null?"—":(Math.round((Math.pow(1+tir,12)-1)*1000)/10)+"% ao ano"}</b></p><p class="sub">${vpl>=0?"O investimento rende mais que a taxa mínima informada.":"O investimento rende menos que a taxa mínima informada."}</p>`:""));
  return reaj+cen+inv;
}
function f6SimBind(){
  const g=(i,fn)=>{const b=$(i);if(b)b.onclick=fn};
  g("f6s1",()=>{F6.sim.reaj={pct:f6Num($("f6s1p").value),inad:f6Num($("f6s1i").value)};f6Go()});
  g("f6s2",()=>{F6.sim.cen={inv:f6Num($("f6s2i").value),custo:f6Num($("f6s2c").value),rec:f6Num($("f6s2r").value),car:Math.max(0,f6Num($("f6s2k").value)),meses:Math.min(120,Math.max(1,Math.round(f6Num($("f6s2m").value))||24))};f6Go()});
  g("f6s3",()=>{F6.sim.inv={inv:f6Num($("f6s3i").value),ret:f6Num($("f6s3r").value),vida:Math.min(600,Math.max(1,Math.round(f6Num($("f6s3v").value))||60)),taxa:f6Num($("f6s3t").value)};f6Go()});
  document.querySelectorAll("[data-f6pre]").forEach(b=>b.onclick=()=>{const C=f6Custos(F6.ano,F6.mes),k=b.dataset.f6pre,cur=F6.sim.cen||{inv:0,custo:0,rec:0,car:0,meses:24};
    if(k==="vaga")F6.sim.cen={...cur,custo:Math.round(C.variMes/C.n),rec:Math.round(f6MensalidadeMedia()),car:1};
    else if(k==="contrat")F6.sim.cen={...cur,custo:3000*1.8,rec:0,car:0};
    else F6.sim.cen={...cur,inv:50000,custo:0,rec:0,car:0};
    f6Go()});
}
f6Reg("sim","Planejamento","Simuladores",f6SimHtml,f6SimBind);
/* ---------- A7. Reserva ---------- */
function f6ReservaHtml(){
  const c=f6cfg(),R=c.reserva||{meses:3,guardado:0,aporte:0},h=hojeIso(),d90=addDaysIso(h,-90);
  const fixo90=soma(finAll().filter(e=>e.tipo==="pagar"&&e.pago&&e.pago>=d90&&e.pago<=h&&f6TipoCusto(e.cat||"")==="fixo"&&!e.cancelada),e=>finNum(e))/3;
  const meta=fixo90*R.meses,falta=Math.max(0,meta-R.guardado),p=meta?R.guardado/meta*100:0,quando=R.aporte>0&&falta>0?Math.ceil(falta/R.aporte):0;
  return f6Card("Fundo de reserva (emergência)",`Meta: ${R.meses} mês(es) de custo fixo — média dos últimos 3 meses: ${f6Money(fixo90)}/mês.`,
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f6resed">Configurar reserva</button></div><p>Meta <b>${f6Money(meta)}</b> · Guardado <b>${f6Money(R.guardado)}</b> · Falta <b>${f6Money(falta)}</b></p>${f6Bar(p,f6Sem(p>=100,p>=50))}<p class="sub">${p>=100?"Meta atingida.":quando?`Guardando ${f6Money(R.aporte)} por mês, a meta é atingida em ${quando} mês(es).`:"Informe um aporte mensal para estimar o prazo."}</p>`);
}
function f6ReservaBind(){
  const b=$("f6resed");if(b)b.onclick=()=>{const R=f6cfg().reserva||{meses:3,guardado:0,aporte:0};f6Form("Fundo de reserva",[{k:"meses",l:"Meses de custo fixo a reservar",t:"number",v:R.meses},{k:"guardado",l:"Valor já guardado (R$)",t:"number",v:R.guardado},{k:"aporte",l:"Aporte mensal planejado (R$)",t:"number",v:R.aporte}],v=>{f6save({reserva:{meses:v.meses||0,guardado:v.guardado||0,aporte:v.aporte||0}});f6Go()})};
}
f6Reg("reserva","Planejamento","Reserva",f6ReservaHtml,f6ReservaBind);
/* ---------- A8. Projetos / centros de custo temporários ---------- */
const f6Projetos=()=>f6cfg().projetos||[];
function f6ProjHtml(){
  const P=f6Projetos(),l=finAll().filter(e=>!e.cancelada);
  const rows=P.map(p=>{const es=l.filter(e=>e.projeto===p.id),gasto=soma(es.filter(e=>e.tipo==="pagar"),e=>e.pago?finNum(e):+e.valor),rec=soma(es.filter(e=>e.tipo==="receber"),e=>e.pago?finNum(e):+e.valor),pc=p.orc?gasto/p.orc*100:0;
    return f6Tr([`<b>${f6Esc(p.nome)}</b><div class="sub">${p.ini?brDate(p.ini):""}${p.fim?" a "+brDate(p.fim):""} · ${p.status==="fechado"?"encerrado":"em andamento"}</div>`,f6Money(p.orc||0),f6Money(gasto),f6Money(rec),`${f6Dot(f6Sem(pc<90,pc<=100))}${p.orc?Math.round(pc)+"%":"—"}`,f6Money((p.orc||0)-gasto),`<button class="b sec sm" data-f6pv="${p.id}">Lançamentos</button> <button class="b sec sm" data-f6pe="${p.id}">Editar</button>`])}).join("");
  return f6Card("Projetos e centros de custo temporários","Reforma, evento, obra: crie o projeto e, ao lançar uma conta, escolha o projeto no campo “Projeto”. Aqui você vê o gasto contra o orçamento do projeto.",
    `<div class="row" style="margin-bottom:8px"><button class="b sm" id="f6pnew">Novo projeto</button></div>`+(P.length?f6Tbl(["Projeto","Orçamento","Gasto","Receita","% do orçamento","Saldo",""],[rows]):`<div class="empty">Nenhum projeto ainda.</div>`));
}
function f6ProjEdit(id){
  const p=f6Projetos().find(x=>x.id===id)||{};
  f6Form(id?"Editar projeto":"Novo projeto",[{k:"nome",l:"Nome",v:p.nome||"",ph:"ex.: Reforma da cozinha"},{k:"orc",l:"Orçamento (R$)",t:"number",v:p.orc||""},{k:"ini",l:"Início",t:"date",v:p.ini||""},{k:"fim",l:"Previsão de término",t:"date",v:p.fim||""},{k:"status",l:"Situação",t:"select",opts:[["andamento","Em andamento"],["fechado","Encerrado"]],v:p.status||"andamento"}],v=>{
    if(!v.nome.trim())return"Informe o nome do projeto.";const reg={id:p.id||uid8(),nome:v.nome.trim(),orc:v.orc||0,ini:v.ini,fim:v.fim,status:v.status},L=f6Projetos();
    f6save({projetos:id?L.map(x=>x.id===id?reg:x):[...L,reg]});f6Go()});
}
function f6ProjBind(){
  const n=$("f6pnew");if(n)n.onclick=()=>f6ProjEdit();
  document.querySelectorAll("[data-f6pe]").forEach(b=>b.onclick=()=>f6ProjEdit(b.dataset.f6pe));
  document.querySelectorAll("[data-f6pv]").forEach(b=>b.onclick=()=>{const p=f6Projetos().find(x=>x.id===b.dataset.f6pv),es=finAll().filter(e=>e.projeto===p.id).sort((a,b)=>a.venc.localeCompare(b.venc));
    const ov=openModal(`<h3>${f6Esc(p.nome)}</h3>${es.length?f6Tbl(["Vencimento","Descrição","Valor","Situação"],[es.map(e=>`<tr><td>${brDate(e.venc)}</td><td>${f6Esc(e.desc)}</td><td class="n">${e.tipo==="pagar"?"−":"+"}${fmtBRL(e.pago?finNum(e):e.valor)}</td><td>${finStatusLabel(e)}</td></tr>`).join("")],"txt"):'<div class="empty">Nenhum lançamento neste projeto.</div>'}<div style="text-align:right;margin-top:10px"><button class="b" id="f6pvx">Fechar</button></div>`);ov.querySelector("#f6pvx").onclick=()=>ov.remove()});
}
f6Reg("proj","Planejamento","Projetos",f6ProjHtml,f6ProjBind);
/* campo "Projeto" no lançamento */
const _finLancCampos6=finLancCampos;
finLancCampos=function(ed,pre,tipo){
  const P=f6Projetos().filter(p=>p.status!=="fechado"||(ed&&ed.projeto===p.id)),h=_finLancCampos6(ed,pre,tipo);
  if(!P.length)return h;
  return h+`<div class="row"><div><label>Projeto (opcional)</label><select id="flprojeto"><option value="">—</option>${P.map(p=>`<option value="${p.id}" ${ed&&ed.projeto===p.id?"selected":""}>${f6Esc(p.nome)}</option>`).join("")}</select></div></div>`;
};
const _finLancExtra6=finLancExtra;
finLancExtra=function(g,t){const r=_finLancExtra6(g,t);if(r.erro)return r;const el=g("#flprojeto");if(el)r.campos.projeto=el.value||null;return r};
/* alertas do orçamento na tela inicial */
const _urg6=urgencias;
urgencias=function(per){const L=_urg6(per);try{if(podeVer("fin")){const h=hojeIso();f6OrcAlertas().forEach(x=>L.push({nivel:x.p>=100?2:1,tipo:"Financeiro",titulo:`Orçamento de ${x.nome}: ${Math.round(x.p)}% usado`,detalhe:`${fmtBRL(x.re)} de ${fmtBRL(x.o)} neste mês`,quando:h,rota:"fin"}))}}catch(e){console.error(e)}return L};


/* >>> x_fin7.js */
