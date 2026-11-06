/* ================= GESTÃO DE PESSOAS ================= */
const gpAtivos=()=>integList().filter(i=>(i.situacao||"Ativo")!=="Desligado");
function addAnosIso(iso,n){const[y,m,d]=iso.split("-").map(Number),t=new Date(y+n,m-1,d);return isoDate(t.getMonth()!==m-1?new Date(y+n,m,0):t)}
const diasDe=(a,b)=>daysBetweenIso(a,b)+1;

/* ---------- férias ---------- */
function feriasQuadro(i){
  if(!i.admissao)return null;
  const h=hojeIso(),reg=xs("ferias").filter(f=>f.integ===i.id&&f.status!=="cancelada").sort((a,b)=>a.ini.localeCompare(b.ini));
  let pool=reg.reduce((s,f)=>s+diasDe(f.ini,f.fim)+(+f.abono||0),0);
  const periodos=[];
  for(let n=0;n<45;n++){
    const ini=addAnosIso(i.admissao,n),fimAq=addDaysIso(addAnosIso(i.admissao,n+1),-1);
    if(fimAq>=h)break;
    const limite=addDaysIso(addAnosIso(i.admissao,n+2),-1),usa=Math.min(30,pool);pool-=usa;
    periodos.push({ini,fimAq,limite,usado:usa,saldo:30-usa});
  }
  const pend=periodos.find(p=>p.saldo>0)||null;
  return{periodos,pend,proximo:addDaysIso(addAnosIso(i.admissao,periodos.length+1),-1)};
}
function feriasNivel(p){if(!p)return 0;const d=xDias(p.limite);return d<=30?3:d<=90?2:d<=150?1:0}
function feriasHtml(){
  const linhas=gpAtivos().filter(i=>i.admissao).map(i=>{const q=feriasQuadro(i);return{i,q}}).filter(x=>x.q);
  linhas.sort((a,b)=>(a.q.pend?a.q.pend.limite:"9999").localeCompare(b.q.pend?b.q.pend.limite:"9999"));
  return `<div class="card"><h2>Quadro de férias</h2><p class="sub" style="margin:0 0 10px">Cada período aquisitivo tem 12 meses e as férias devem ser concedidas nos 12 meses seguintes; fora desse prazo a CLT manda pagar em dobro. O sistema soma os dias já programados e gozados.</p>
   ${linhas.length?`<div class="wrap"><table><thead><tr><th>Integrante</th><th>Admissão</th><th>Período com saldo</th><th>Saldo</th><th>Prazo para conceder</th><th>Situação</th><th></th></tr></thead><tbody>${linhas.map(({i,q})=>{
     const p=q.pend,n=feriasNivel(p),sit=!p?[0,"em dia"]:xSitData(p.limite,150,"");
     return `<tr><td><b>${esc(nomeInteg(i))}</b><div class="sub">${esc(i.cargo||"")}</div></td><td>${brDate(i.admissao)}</td><td>${p?brDate(p.ini)+" a "+brDate(p.fimAq):`próximo em ${brDate(q.proximo)}`}</td><td>${p?p.saldo+" dia(s)":"—"}</td><td>${p?brDate(p.limite):"—"}</td><td>${xPill(p?Math.max(n,sit[0]):0,p?sit[1]:"em dia")}</td>
     <td>${podeEd("gp")?`<button class="b sec sm" data-fnova="${i.id}">Programar</button>`:""}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty">Cadastre a data de admissão dos integrantes para o sistema controlar as férias.</div>`}</div>`;
}
const feriasCrud={id:"ferias",col:"ferias",mod:"gp",novoLabel:"Programar férias",novoTit:"Programar férias",editTit:"Editar férias",
  campos:[{k:"integ",l:"Integrante",t:"integ",req:true},{k:"status",l:"Situação",t:"sel",opts:["programada","gozada","cancelada"],req:true,def:"programada"},
    {k:"ini",l:"Início",t:"date",req:true},{k:"fim",l:"Fim",t:"date",req:true},{k:"abono",l:"Dias vendidos (abono, até 10)",t:"num",min:0,max:10,def:0},{k:"obs",l:"Observação",full:true}],
  padrao:()=>({status:"programada",abono:0}),
  valida:(o)=>{
    if(o.fim<o.ini)return"A data final precisa ser depois da inicial.";
    const dias=diasDe(o.ini,o.fim);if(dias<5)return"Cada período de férias tem no mínimo 5 dias corridos.";
    if(dias+(+o.abono||0)>30)return"Férias e abono juntos passam de 30 dias.";
    const sob=xs("ferias").find(f=>f.id!==o.id&&f.integ===o.integ&&f.status!=="cancelada"&&f.ini<=o.fim&&f.fim>=o.ini);
    if(sob)return`Já existem férias deste integrante de ${brDate(sob.ini)} a ${brDate(sob.fim)}.`;
  },
  cols:[{h:"Integrante",v:r=>xNomeInteg(r.integ)},{h:"Período",v:r=>`${brDate(r.ini)} a ${brDate(r.fim)}`},{h:"Dias",v:r=>diasDe(r.ini,r.fim)+(+r.abono?` + ${r.abono} vendidos`:"")},{h:"Situação",html:r=>xPill(r.status==="gozada"?0:r.status==="cancelada"?2:1,r.status)}],
  ordem:(a,b)=>b.ini.localeCompare(a.ini),vazio:"Nenhuma férias programada ainda.",
  rodape:"A CLT permite dividir as férias em até 3 períodos, sendo um de pelo menos 14 dias e os outros com pelo menos 5. O aviso ao integrante deve ser feito com 30 dias de antecedência.",
  busca:r=>xNomeInteg(r.integ)};

/* ---------- banco de horas ---------- */
const BHCACHE=new Map();
function calcSilencioso(ini,fim){
  const key=ini+"|"+fim+"|"+Object.keys(S.marcacoes).length+"|"+Object.keys(S.ocorr).length+"|"+Object.keys(S.integrantes).length+"|"+Object.keys(S.config).length+"|"+(Date.now()/60000|0);
  if(BHCACHE.has(key))return BHCACHE.get(key);
  const P=POINT,sv={s:P.start,e:P.end,r:P.result,er:P.err};
  let r=null;
  try{P.start=ini;P.end=fim;calcular(false);r=P.result?{users:P.result.users}:{erro:P.err}}catch(e){r={erro:e.message}}
  P.start=sv.s;P.end=sv.e;P.result=sv.r;P.err=sv.er;
  BHCACHE.set(key,r);if(BHCACHE.size>40)BHCACHE.delete(BHCACHE.keys().next().value);
  return r;
}
const mesFimIso=ym=>isoDate(new Date(+ym.slice(0,4),+ym.slice(5,7),0));
// só conta até ontem: dias que ainda não aconteceram não são falta
const fimCalc=ym=>{const f=mesFimIso(ym),o=addDaysIso(hojeIso(),-1);return f<o?f:o};
function mesesEntre(a,b){const out=[];let y=+a.slice(0,4),m=+a.slice(5,7);while(`${y}-${String(m).padStart(2,"0")}`<=b){out.push(`${y}-${String(m).padStart(2,"0")}`);m++;if(m>12){m=1;y++}}return out}
const primeiraMarca=()=>{const l=Object.values(S.marcacoes).filter(m=>!m.removida).map(m=>m.ts.slice(0,7)).sort();return l[0]||hojeIso().slice(0,7)};
const bhCfg=()=>({limiteH:40,inicio:primeiraMarca(),...(xcfg("gp").bh||{})});
function bhSaldos(ym){
  const c=bhCfg(),meses=mesesEntre(c.inicio<=ym?c.inicio:ym,ym),por=new Map(),erros=[];
  meses.forEach(m=>{
    if(fimCalc(m)<m+"-01")return;
    const r=calcSilencioso(m+"-01",fimCalc(m));
    if(!r||r.erro){erros.push(r&&r.erro);return}
    r.users.forEach(u=>{if(!u.ig||!u.ig.id)return;const x=por.get(u.ig.id)||{ig:u.ig,mes:0,trab:0,esp:0,acum:0};
      const s=u.t.worked-u.t.expected;x.acum+=s;if(m===ym){x.mes=s;x.trab=u.t.worked;x.esp=u.t.expected}por.set(u.ig.id,x)});
  });
  xs("bh").forEach(l=>{if(l.data&&typeof l.data==="string"&&l.data.slice(0,7)<=ym&&l.data.slice(0,7)>=c.inicio){const x=por.get(l.integ);if(x)x.acum+=Math.round((+l.h||0)*60)}});
  return{por,erros};
}
const hhmm=min=>{const s=min<0?"−":"",a=Math.abs(Math.round(min));return s+Math.floor(a/60)+"h"+String(a%60).padStart(2,"0")};
const BHST={ym:hojeIso().slice(0,7)};
function bhHtml(){
  const c=bhCfg(),{por,erros}=bhSaldos(BHST.ym),L=[...por.values()].sort((a,b)=>nomeInteg(a.ig).localeCompare(nomeInteg(b.ig),"pt"));
  const meses=mesesEntre(addMesesIso(hojeIso(),-11).slice(0,7),hojeIso().slice(0,7)).reverse();
  return `<div class="card"><h2>Saldo do banco de horas</h2><p class="sub" style="margin:0 0 10px">Saldo = horas trabalhadas − horas esperadas pela escala (atestados e justificativas contam como cumpridos), somado desde o início do controle, mais as compensações e pagamentos lançados abaixo.</p>
   <div class="row" style="align-items:flex-end"><div style="flex:0 0 180px"><label>Mês</label><select id="bhmes">${meses.map(m=>`<option value="${m}" ${m===BHST.ym?"selected":""}>${m.slice(5)}/${m.slice(0,4)}</option>`).join("")}</select></div>
    <div style="flex:0 0 190px"><label>Início do controle</label><input type="month" id="bhini" value="${c.inicio}" ${podeEd("gp")?"":"disabled"}></div><div style="flex:0 0 190px"><label>Alerta acima de (horas)</label><input type="number" id="bhlim" value="${c.limiteH}" min="1" ${podeEd("gp")?"":"disabled"}></div></div>
   ${erros.length&&!L.length?`<div class="callout sand" style="margin-top:12px">Não foi possível calcular: ${esc(erros[0]||"importe o arquivo do relógio na aba Ponto")}.</div>`:""}
   ${L.length?`<div class="wrap" style="margin-top:12px"><table><thead><tr><th>Integrante</th><th>Trabalhado</th><th>Esperado</th><th>Saldo do mês</th><th>Saldo acumulado</th><th></th></tr></thead><tbody>${L.map(x=>{const al=Math.abs(x.acum)>c.limiteH*60;return `<tr><td><b>${esc(nomeInteg(x.ig))}</b></td><td>${hhmm(x.trab)}</td><td>${hhmm(x.esp)}</td><td>${hhmm(x.mes)}</td><td><b>${hhmm(x.acum)}</b></td><td>${al?xPill(x.acum>0?2:1,x.acum>0?"saldo alto: programar folga":"saldo negativo"):""}</td></tr>`}).join("")}</tbody></table></div>`:""}</div>`;
}
const bhCrud={id:"bh",col:"bh",mod:"gp",novoLabel:"Lançar compensação ou pagamento",novoTit:"Lançamento no banco de horas",
  campos:[{k:"integ",l:"Integrante",t:"integ",req:true},{k:"data",l:"Data",t:"date",req:true,def:()=>hojeIso()},{k:"tipo",l:"Tipo",t:"sel",opts:["Compensação (folga)","Pagamento em folha","Ajuste"],req:true},{k:"h",l:"Horas (positivo = usadas ou pagas; no ajuste, − tira do saldo)",t:"num",neg:true,step:0.25,req:true},{k:"obs",l:"Observação",full:true}],
  padrao:()=>({data:hojeIso()}),
  antes:o=>{o.h=Math.abs(+o.h||0);if(o.tipo!=="Ajuste")o.h=-o.h;else o.h=+o.h},
  aviso:"Compensação e pagamento reduzem o saldo; no ajuste, use o sinal do número.",
  cols:[{h:"Data",v:r=>brDate(r.data)},{h:"Integrante",v:r=>xNomeInteg(r.integ)},{h:"Tipo",k:"tipo"},{h:"Horas no saldo",v:r=>(r.h>0?"+":"")+NUMF(r.h)},{h:"Obs.",k:"obs"}],ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhum lançamento.",busca:r=>xNomeInteg(r.integ)};

/* ---------- fechamento do ponto ---------- */
const fechDoc=ym=>S.config["fech_"+ym.replace("-","")];
const mesFechado=iso=>{const d=iso&&fechDoc(String(iso).slice(0,7));return d&&d.fechado};
XGUARD.push((col,id,obj,antes)=>{
  const msg=m=>`${m} está fechado para o contador. Reabra o mês na aba Fechamento do ponto (Gestão de pessoas) para ajustar.`;
  if(col==="marcacoes"){const d=(obj||antes||{}).ts;if(d&&mesFechado(d))return msg("O mês de "+brDate(d.slice(0,10)).slice(3))}
  if(col==="ocorr"){const o=obj||antes||{};for(const d of[o.de,o.ate])if(d&&mesFechado(d))return msg("O mês de "+brDate(d).slice(3))}
  if(col==="config"&&/^esc_\d{4}$/.test(id)){
    const A=new Map(((antes&&antes.itens)||[]).map(x=>[x.id,sTxt(x)])),B=new Map(((obj&&obj.itens)||[]).map(x=>[x.id,x]));
    const mudou=[...B.values()].filter(x=>A.get(x.id)!==sTxt(x)),sumiu=[...A.keys()].filter(k=>!B.has(k)).map(k=>JSON.parse(A.get(k)));
    for(const x of[...mudou,...sumiu])for(const d of[x.de,x.ate])if(d&&mesFechado(d))return msg("O mês de "+brDate(d).slice(3));
  }
});
function fechHtml(){
  const meses=mesesEntre(addMesesIso(hojeIso(),-11).slice(0,7),hojeIso().slice(0,7)).reverse();
  return `<div class="card"><h2>Fechamento do ponto por mês</h2><p class="sub" style="margin:0 0 10px">Depois de fechado, o mês não aceita novas marcações, ocorrências nem mudanças de escala: o que foi para o contador não muda sem você saber. Só o gestor reabre, e fica registrado.</p>
   <div class="wrap"><table><thead><tr><th>Mês</th><th>Situação</th><th>Pendências</th><th></th></tr></thead><tbody>${meses.map(m=>{
     const f=fechDoc(m),r=f&&f.fechado||fimCalc(m)<m+"-01"?null:calcSilencioso(m+"-01",fimCalc(m)),pend=r&&r.users?r.users.reduce((s,u)=>s+u.pendencies.length,0):null;
     return `<tr><td><b>${m.slice(5)}/${m.slice(0,4)}</b></td><td>${f&&f.fechado?xPill(0,"fechado em "+brDate(f.em.slice(0,10)))+` <span class="sub">${esc(f.nome||"")}</span>`:xPill(1,"aberto")}</td><td>${f&&f.fechado?(f.pend?f.pend+" no fechamento":"nenhuma"):(pend==null?"—":pend?`<b>${pend}</b> a resolver`:"nenhuma")}</td>
     <td style="white-space:nowrap">${f&&f.fechado?(ACC.gestor||!RT.db?`<button class="b sec sm" data-freab="${m}">Reabrir</button>`:""):(podeEd("gp")?`<button class="b sm" data-ffecha="${m}" data-fp="${pend||0}">Fechar o mês</button>`:"")}</td></tr>`}).join("")}</tbody></table></div></div>`;
}
function bindFech(){
  document.querySelectorAll("[data-ffecha]").forEach(b=>b.onclick=async()=>{
    const m=b.dataset.ffecha,p=+b.dataset.fp;
    if(!await askConfirm(p?`Ainda há ${p} pendência(s) de ponto em ${m.slice(5)}/${m.slice(0,4)}. Fechar mesmo assim?`:`Fechar o ponto de ${m.slice(5)}/${m.slice(0,4)}?`,"Fechar o mês"))return;
    put("config","fech_"+m.replace("-",""),{fechado:true,em:new Date().toISOString(),por:ACC.uid||"",nome:(ACC.me&&ACC.me.name)||"",pend:p,hist:[...((fechDoc(m)||{}).hist||[]),{acao:"fechou",em:new Date().toISOString(),por:ACC.uid||""}]});
    audit("fecha","fechou ponto "+m);toast("Mês fechado.");go("gp",true);
  });
  document.querySelectorAll("[data-freab]").forEach(b=>b.onclick=()=>{
    const m=b.dataset.freab;
    const ov=openModal(`<h3>Reabrir ${m.slice(5)}/${m.slice(0,4)}</h3><p class="sub">Diga o motivo. Fica registrado no histórico.</p><label>Motivo *</label><input id="frmot"><div class="err" id="frerr"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="frcx">Cancelar</button><button class="b" id="frok">Reabrir</button></div>`);
    ov.querySelector("#frcx").onclick=()=>ov.remove();
    ov.querySelector("#frok").onclick=()=>{const mot=ov.querySelector("#frmot").value.trim();if(!mot)return ov.querySelector("#frerr").textContent="Informe o motivo.";
      const f=fechDoc(m)||{};put("config","fech_"+m.replace("-",""),{...strip(f),fechado:false,hist:[...(f.hist||[]),{acao:"reabriu",motivo:mot,em:new Date().toISOString(),por:ACC.uid||""}]});
      audit("fecha","reabriu ponto "+m);ov.remove();toast("Mês reaberto.");go("gp",true)};
  });
}

/* ---------- admissão e desligamento ---------- */
const ADM_ITENS=["Documentos pessoais (RG, CPF, comprovante de residência, título de eleitor)","Exame admissional (ASO) com parecer apto","Contrato de trabalho assinado","Evento de admissão no eSocial (S-2200) enviado antes do início","Ficha de EPI e uniforme entregue e assinada","Termo de ciência da LGPD e de uso de imagem assinado","Opção de vale-transporte registrada","Dados bancários para pagamento","Integração e treinamento inicial feitos","Cadastro no relógio de ponto e escala definida"];
const DES_ITENS=["Carta de dispensa ou pedido de demissão assinado","Aviso prévio definido (trabalhado, indenizado ou dispensado)","Exame demissional (ASO)","Devolução de uniforme, crachá, chaves e EPI","Cálculo da rescisão conferido com o contador","Pagamento das verbas em até 10 dias após o término do contrato","Evento de desligamento no eSocial (S-2299) enviado","Guias do FGTS e multa, e documentos do seguro-desemprego (se couber)","Acesso ao relógio e ao sistema desativado","Documentos entregues ao integrante"];
const movItens=m=>m.tipo==="desligamento"?DES_ITENS:ADM_ITENS;
function mesesCompletos(ini,fim){let n=(+fim.slice(0,4)-+ini.slice(0,4))*12+(+fim.slice(5,7)-+ini.slice(5,7));if(+fim.slice(8)<+ini.slice(8))n--;return Math.max(0,n)}
function rescisaoEstimativa(i,dataFim,o){
  const sal=+i.salario||0;if(!sal||!i.admissao)return null;
  const dia=+dataFim.slice(8);
  const anos=Math.floor(mesesCompletos(i.admissao,dataFim)/12),L=[];
  L.push(["Saldo de salário",sal/30*Math.min(dia,30)]);
  if(o.aviso==="indenizado"&&o.semJusta){const d=Math.min(90,30+3*anos);L.push([`Aviso prévio indenizado (${d} dias)`,sal/30*d])}
  if(o.motivo!=="justa"){
    const iniAno=dataFim.slice(0,4)+"-01-01",base=i.admissao>iniAno?i.admissao:iniAno;
    const m13r=Math.min(12,Math.max(0,mesesCompletos(base,dataFim)+(dia>=15?1:0)));
    L.push([`13º proporcional (${m13r}/12)`,sal/12*m13r]);
  }
  const q=feriasQuadro({...i}),venc=q?q.periodos.filter(p=>p.saldo>0).reduce((s,p)=>s+p.saldo,0):0;
  if(venc>0)L.push([`Férias vencidas (${venc} dias) + 1/3`,sal/30*venc*4/3]);
  if(o.motivo!=="justa"){
    const ult=addAnosIso(i.admissao,Math.floor(mesesCompletos(i.admissao,dataFim)/12)),mp=mesesCompletos(ult,dataFim)+(+dataFim.slice(8)>=+ult.slice(8)+14?1:0);
    const mpp=Math.min(12,Math.max(0,mp));
    if(mpp>0)L.push([`Férias proporcionais (${mpp}/12) + 1/3`,sal/12*mpp*4/3]);
  }
  if(o.semJusta){const fg=sal*0.08*Math.max(1,mesesCompletos(i.admissao,dataFim));L.push(["Multa de 40% do FGTS (sobre saldo estimado)",fg*0.4])}
  return{linhas:L,total:L.reduce((s,[,v])=>s+v,0)};
}
function openMov(id){
  const m=S.movgp[id];if(!m)return;
  const i=S.integrantes[m.integ]||{},itens=movItens(m),done=m.feitos||{},pode=podeEd("gp");
  const ov=openModal(`<h3>${m.tipo==="desligamento"?"Desligamento":"Admissão"} — ${esc(nomeInteg(i))}</h3><p class="sub">${m.tipo==="desligamento"?"Último dia":"Início"}: ${brDate(m.data)}</p>
   <div id="mvl">${itens.map((t,k)=>`<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;color:var(--ink);margin:6px 0"><input type="checkbox" data-mk="${k}" ${done[k]?"checked":""} ${pode?"":"disabled"}><span>${esc(t)}</span></label>`).join("")}</div>
   <div class="xbar" style="margin:10px 0"><i id="mvbar" style="width:${Math.round(100*Object.values(done).filter(Boolean).length/itens.length)}%"></i></div>
   ${m.tipo==="desligamento"&&podeSal()?`<h2 style="margin-top:14px">Estimativa da rescisão</h2><div id="mvresc"></div>`:""}
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b" id="mvok">Fechar</button></div>`);
  const g=s=>ov.querySelector(s);
  const upd=()=>{const f={};ov.querySelectorAll("[data-mk]").forEach(c=>{f[c.dataset.mk]=c.checked});const n=Object.values(f).filter(Boolean).length;
    put("movgp",id,{...strip(S.movgp[id]),feitos:f,status:n===itens.length?"concluído":"em andamento"});g("#mvbar").style.width=Math.round(100*n/itens.length)+"%"};
  ov.querySelectorAll("[data-mk]").forEach(c=>c.onchange=upd);
  g("#mvok").onclick=()=>{ov.remove();go("gp",true)};
  if(g("#mvresc")){
    const r=rescisaoEstimativa(i,m.data,{aviso:m.aviso||"trabalhado",semJusta:m.motivo==="sem_justa",motivo:m.motivo});
    g("#mvresc").innerHTML=r?`<div class="wrap"><table><tbody>${r.linhas.map(([t,v])=>`<tr><td>${esc(t)}</td><td style="text-align:right">${fmtBRL(v)}</td></tr>`).join("")}<tr><td><b>Total estimado</b></td><td style="text-align:right"><b>${fmtBRL(r.total)}</b></td></tr></tbody></table></div><p class="sub" style="margin:6px 0 0">Estimativa para planejamento. Não inclui horas extras, adicionais, descontos nem médias de variáveis. O cálculo oficial é do contador.</p>`:`<div class="sub">Preencha salário e admissão no cadastro para estimar.</div>`;
  }
}
const movCrud={id:"movgp",col:"movgp",mod:"gp",novoLabel:"Iniciar admissão ou desligamento",novoTit:"Admissão ou desligamento",
  campos:[{k:"integ",l:"Integrante",t:"integ",req:true},{k:"tipo",l:"Processo",t:"sel",opts:[["admissao","Admissão"],["desligamento","Desligamento"]],req:true},{k:"data",l:"Data (início ou último dia)",t:"date",req:true},
    {k:"motivo",l:"Motivo (desligamento)",t:"sel",opts:[["sem_justa","Dispensa sem justa causa"],["pedido","Pedido de demissão"],["justa","Justa causa"],["acordo","Acordo (art. 484-A)"]]},
    {k:"aviso",l:"Aviso prévio",t:"sel",opts:[["trabalhado","Trabalhado"],["indenizado","Indenizado"],["dispensado","Dispensado"]]},{k:"obs",l:"Observação",full:true}],
  padrao:()=>({tipo:"admissao",data:hojeIso()}),
  depois:(o)=>{const i=S.integrantes[o.integ];if(!i)return;
    if(o.tipo==="admissao"&&!i.admissao)put("integrantes",i.id,{...strip(i),admissao:o.data});
    if(o.tipo==="desligamento"&&confirmaDesl)put("integrantes",i.id,{...strip(i),desligamento:o.data,situacao:"Desligado"})},
  cols:[{h:"Integrante",v:r=>xNomeInteg(r.integ)},{h:"Processo",v:r=>r.tipo==="desligamento"?"Desligamento":"Admissão"},{h:"Data",v:r=>brDate(r.data)},
    {h:"Checklist",html:r=>{const n=Object.values(r.feitos||{}).filter(Boolean).length,t=movItens(r).length;return xPill(n===t?0:1,`${n}/${t}`)}}],
  linhaBtn:[{l:"Checklist",fn:r=>openMov(r.id)}],ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhum processo registrado.",busca:r=>xNomeInteg(r.integ),
  rodape:"Ao registrar uma admissão, a data de admissão do cadastro é preenchida se estiver vazia. No desligamento, o integrante passa para “Desligado” (some das escalas) quando o processo é salvo."};
const confirmaDesl=true;

/* ---------- treinamentos ---------- */
const TREIN_PAD=[{curso:"Prevenção de quedas e mobilização segura",meses:12,deptos:["Cuidadores(a)","Enfermagem","Fisioterapia"]},{curso:"Primeiros socorros e urgências",meses:12,deptos:[]},
  {curso:"Higiene, controle de infecção e precauções",meses:12,deptos:[]},{curso:"Cuidado com pessoas com demência e comunicação com o idoso",meses:12,deptos:["Cuidadores(a)","Enfermagem","Fisioterapia","Recepção"]},
  {curso:"Prevenção e combate a incêndio (brigada)",meses:12,deptos:[]},{curso:"Manipulação segura de alimentos",meses:12,deptos:["Cozinheiras(o)"]}];
const treinObrig=()=>xcfg("gp").treinObrig||TREIN_PAD;
function treinSit(i,t){
  const regs=xs("trein").filter(x=>x.integ===i.id&&estNorm(x.curso)===estNorm(t.curso)).sort((a,b)=>b.data.localeCompare(a.data)),u=regs[0];
  if(!u)return{n:3,txt:"nunca feito",u:null};
  const val=u.validade||addMesesIso(u.data,t.meses||12),s=xSitData(val,45,`em dia até ${brDate(val)}`);return{n:s[0],txt:s[1],u,val};
}
function treinMatriz(){
  const out=[];
  gpAtivos().filter(i=>!(i.ponto==="nao"&&!i.cargo)).forEach(i=>treinObrig().forEach(t=>{if(!t.deptos||!t.deptos.length||t.deptos.includes(i.depto)){const s=treinSit(i,t);out.push({i,t,s})}}));
  return out;
}
function treinHtml(){
  const M=treinMatriz(),ruins=M.filter(x=>x.s.n>=2);
  return `<div class="card"><h2>Treinamentos obrigatórios</h2><p class="sub" style="margin:0 0 10px">Capacitação periódica da equipe é exigida na fiscalização de ILPI. Edite a lista conforme o plano da casa. Cada curso vale pelos meses informados.</p>
   <div class="stats"><div class="stat"><b>${M.length-ruins.length}</b><span>em dia</span></div><div class="stat ${ruins.length?"warn":""}"><b>${ruins.length}</b><span>vencidos, vencendo ou nunca feitos</span></div></div>
   <div class="row" style="margin:10px 0">${podeEd("gp")?`<button class="b sec" id="tvlist" style="flex:none">Editar lista de cursos obrigatórios</button>`:""}</div>
   ${ruins.length?`<div class="wrap"><table><thead><tr><th>Integrante</th><th>Curso</th><th>Situação</th><th></th></tr></thead><tbody>${ruins.sort((a,b)=>b.s.n-a.s.n).slice(0,60).map(x=>`<tr><td>${esc(nomeInteg(x.i))}</td><td>${esc(x.t.curso)}</td><td>${xPill(x.s.n,x.s.txt)}</td><td>${podeEd("gp")?`<button class="b sec sm" data-tvreg="${x.i.id}|${esc(x.t.curso)}">Registrar</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Todos os treinamentos obrigatórios estão em dia.</div>`}</div>`;
}
const treinCrud={id:"trein",col:"trein",mod:"gp",novoLabel:"Registrar treinamento",novoTit:"Registrar treinamento",
  campos:[{k:"integ",l:"Integrante",t:"integ",req:true},{k:"curso",l:"Curso",req:true,ph:"Escolha ou digite"},{k:"data",l:"Data de realização",t:"date",req:true},{k:"validade",l:"Vale até (vazio = pelo prazo da lista)",t:"date"},{k:"horas",l:"Carga horária (h)",t:"num",step:0.5},{k:"instrutor",l:"Instrutor / entidade"},{k:"obs",l:"Observação",full:true}],
  padrao:()=>({data:hojeIso()}),
  aoAbrir:(g)=>{const i=g("#xf_curso");if(i){i.setAttribute("list","xdl_cursos");if(!document.getElementById("xdl_cursos")){const d=document.createElement("datalist");d.id="xdl_cursos";d.innerHTML=treinObrig().map(t=>`<option value="${esc(t.curso)}">`).join("");document.body.appendChild(d)}}},
  antes:o=>{if(!o.validade){const t=treinObrig().find(x=>estNorm(x.curso)===estNorm(o.curso));o.validade=addMesesIso(o.data,t?t.meses:12)}},
  cols:[{h:"Data",v:r=>brDate(r.data)},{h:"Integrante",v:r=>xNomeInteg(r.integ)},{h:"Curso",k:"curso"},{h:"Carga",v:r=>r.horas?r.horas+" h":""},{h:"Válido até",v:r=>r.validade?brDate(r.validade):""}],
  ordem:(a,b)=>b.data.localeCompare(a.data),vazio:"Nenhum treinamento registrado.",busca:r=>xNomeInteg(r.integ)};
function bindTrein(){
  document.querySelectorAll("[data-tvreg]").forEach(b=>b.onclick=()=>{const[id,curso]=b.dataset.tvreg.split("|");xForm(treinCrud,{integ:id,curso,data:hojeIso()},f=>xcrudSalvar(treinCrud,f,null))});
  const l=$("tvlist");if(l)l.onclick=()=>{
    const ov=openModal(`<h3>Cursos obrigatórios</h3><p class="sub">Uma linha por curso: <b>Nome ; validade em meses ; departamentos (opcional, separados por vírgula)</b>. Sem departamento = todos.</p>
     <textarea id="tvt" style="min-height:200px">${esc(treinObrig().map(t=>`${t.curso} ; ${t.meses} ; ${(t.deptos||[]).join(", ")}`).join("\n"))}</textarea><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="tvcx">Cancelar</button><button class="b" id="tvsv">Salvar</button></div>`);
    ov.querySelector("#tvcx").onclick=()=>ov.remove();
    ov.querySelector("#tvsv").onclick=()=>{const L=ov.querySelector("#tvt").value.split("\n").map(s=>s.trim()).filter(Boolean).map(s=>{const[c,m,d]=s.split(";").map(x=>x.trim());return{curso:c,meses:+m||12,deptos:d?d.split(",").map(x=>x.trim()).filter(Boolean):[]}});xcfgSave("gp",{treinObrig:L});ov.remove();go("gp",true)};
  };
}

/* ---------- EPI e uniformes ---------- */
const epiCrud={id:"epi",col:"epi",mod:"gp",novoLabel:"Registrar entrega",novoTit:"Entrega de EPI ou uniforme",
  campos:[{k:"integ",l:"Integrante",t:"integ",req:true},{k:"item",l:"Item",req:true,ph:"Ex.: luva nitrílica, uniforme, sapato de segurança"},{k:"qtd",l:"Quantidade",t:"num",min:1,def:1},{k:"entrega",l:"Data da entrega",t:"date",req:true},
    {k:"troca",l:"Troca prevista",t:"date"},{k:"ca",l:"CA (Certificado de Aprovação)"},{k:"obs",l:"Observação",full:true}],
  padrao:()=>({entrega:hojeIso(),qtd:1}),
  cols:[{h:"Entrega",v:r=>brDate(r.entrega)},{h:"Integrante",v:r=>xNomeInteg(r.integ)},{h:"Item",v:r=>r.item+(r.qtd>1?` (×${r.qtd})`:"")},{h:"Troca",html:r=>r.troca?xPill(...xSitData(r.troca,30,"em dia").slice(0,2)):""},{h:"Assinatura",html:r=>assinChip(r.assin||"")}],
  linhaBtn:[{l:"Colher assinatura",se:r=>!r.assin&&podeEd("gp"),fn:r=>openAssinar({titulo:"Recebimento de EPI/uniforme",tipo:"epi",ref:r.id,nome:xNomeInteg(r.integ),texto:`Declaro ter recebido de Casa Hiro o item "${r.item}" (quantidade ${r.qtd||1}) em ${brDate(r.entrega)}${r.ca?", CA "+r.ca:""}, e estar ciente de que devo usá-lo corretamente, conservá-lo e comunicar qualquer dano ou perda.`},id=>{put("epi",r.id,{...strip(r),assin:id});go("gp",true)})}],
  ordem:(a,b)=>b.entrega.localeCompare(a.entrega),vazio:"Nenhuma entrega registrada.",busca:r=>xNomeInteg(r.integ)};

/* ---------- benefícios, encargos e folha no financeiro ---------- */
const bfCfg=()=>({vtDia:0,vtDescPct:6,vrDia:0,fgtsPct:8,patronalPct:0,diaPag:5,...(xcfg("gp").benef||{})});
const BFST={ym:hojeIso().slice(0,7),detalhar:false};
function bfLinhas(ym){
  const c=bfCfg(),r=fimCalc(ym)<ym+"-01"?null:calcSilencioso(ym+"-01",fimCalc(ym)),us=new Map(((r&&r.users)||[]).filter(u=>u.ig&&u.ig.id).map(u=>[u.ig.id,u]));
  return gpAtivos().filter(i=>+i.salario>0).map(i=>{
    const sal=+i.salario,u=us.get(i.id),dias=u?u.t.trab:0,ov=S.benef[i.id]||{};
    const vtD=ov.vtDia!==undefined&&ov.vtDia!==""?+ov.vtDia:c.vtDia,vrD=ov.vrDia!==undefined&&ov.vrDia!==""?+ov.vrDia:c.vrDia,optaVT=ov.vtOpta!==false;
    const vtBruto=optaVT?dias*vtD:0,vtDesc=optaVT?Math.min(vtBruto,sal*c.vtDescPct/100):0;
    return{i,sal,dias,vtBruto,vtEmp:vtBruto-vtDesc,vrEmp:dias*vrD,fgts:sal*c.fgtsPct/100,pat:sal*c.patronalPct/100,p13:sal/12,pfer:sal/12*4/3,semDias:!u};
  });
}
function benefHtml(){
  const c=bfCfg(),L=bfLinhas(BFST.ym),T=k=>L.reduce((s,x)=>s+x[k],0),meses=mesesEntre(addMesesIso(hojeIso(),-5).slice(0,7),addMesesIso(hojeIso(),1).slice(0,7)).reverse();
  return `<div class="card"><h2>Custo da folha e benefícios</h2><p class="sub" style="margin:0 0 10px">Estimativa mensal por integrante a partir do salário base e dos dias trabalhados no ponto. Os percentuais abaixo são editáveis; confirme o INSS patronal e demais encargos com o contador (dependem do regime tributário).</p>
   <div class="row" style="align-items:flex-end"><div style="flex:0 0 160px"><label>Mês</label><select id="bfmes">${meses.map(m=>`<option value="${m}" ${m===BFST.ym?"selected":""}>${m.slice(5)}/${m.slice(0,4)}</option>`).join("")}</select></div>
    <div><label>VT por dia (R$)</label><input type="number" step="0.01" id="bfvt" value="${c.vtDia}"></div><div><label>Desconto VT (% do salário)</label><input type="number" step="0.5" id="bfvtd" value="${c.vtDescPct}"></div>
    <div><label>VR por dia (R$)</label><input type="number" step="0.01" id="bfvr" value="${c.vrDia}"></div><div><label>FGTS (%)</label><input type="number" step="0.5" id="bffg" value="${c.fgtsPct}"></div>
    <div><label>INSS patronal e outros (%)</label><input type="number" step="0.5" id="bfpat" value="${c.patronalPct}"></div><div><label>Dia do pagamento</label><input type="number" min="1" max="28" id="bfdia" value="${c.diaPag}"></div></div>
   <div class="row" style="margin-top:8px">${podeEd("gp")?`<button class="b sec" id="bfsalva" style="flex:none">Salvar percentuais</button>`:""}</div>
   ${L.length?`<div class="stats" style="margin-top:12px"><div class="stat"><b>${fmtBRL(T("sal"))}</b><span>salários</span></div><div class="stat"><b>${fmtBRL(T("fgts"))}</b><span>FGTS</span></div><div class="stat"><b>${fmtBRL(T("vtEmp")+T("vrEmp"))}</b><span>VT (parte da casa) + VR</span></div><div class="stat"><b>${fmtBRL(T("sal")+T("fgts")+T("vtEmp")+T("vrEmp")+T("pat")+T("p13")+T("pfer"))}</b><span>custo total com provisões</span></div></div>
    <div class="wrap"><table><thead><tr><th>Integrante</th><th>Salário</th><th>Dias</th><th>VT casa</th><th>VR</th><th>FGTS</th><th>13º + férias (prov.)</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td>${esc(nomeInteg(x.i))}</td><td>${fmtBRL(x.sal)}</td><td>${x.dias}${x.semDias?' <span class="sub">(sem ponto)</span>':""}</td><td>${fmtBRL(x.vtEmp)}</td><td>${fmtBRL(x.vrEmp)}</td><td>${fmtBRL(x.fgts)}</td><td>${fmtBRL(x.p13+x.pfer)}</td><td>${podeEd("gp")?`<button class="b sec sm" data-bfov="${x.i.id}">Ajustar</button>`:""}</td></tr>`).join("")}</tbody></table></div>
    ${podeEd("fin")&&podeEd("gp")?`<div class="callout" style="margin-top:12px"><b>Lançar no financeiro:</b> cria as contas a pagar de ${BFST.ym.slice(5)}/${BFST.ym.slice(0,4)} (salários, FGTS, VT e VR). Se você lançar de novo, as que ainda não foram pagas são substituídas.
     <div class="row" style="margin-top:8px;align-items:center"><label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink);flex:none"><input type="checkbox" id="bfdet" ${BFST.detalhar?"checked":""}> um lançamento por pessoa</label><button class="b" id="bflanca" style="flex:none">Lançar folha no financeiro</button></div></div>`:""}`:`<div class="empty" style="margin-top:12px">Preencha o salário base no cadastro dos integrantes.</div>`}</div>`;
}
function folhaParaFinanceiro(ym,detalhar){
  const L=bfLinhas(ym),c=bfCfg(),[y,m]=[+ym.slice(0,4),+ym.slice(5,7)],pagto=isoDate(new Date(y,m,Math.min(28,c.diaPag))),fgtsDia=isoDate(new Date(y,m,20)),vtDia=isoDate(new Date(y,m-1,5));
  const mk=(desc,valor,venc,cat,tag)=>({id:uid8(),tipo:"pagar",desc,contra:tag.pessoa||"Integrantes (folha de pagamento)",cat,area:"Administrativo",forma:"",obs:`Gerado pela folha de ${ym.slice(5)}/${ym.slice(0,4)}`,valor:Math.round(valor*100)/100,venc,pago:null,fornId:tag.fornId||"n:folha-pagamento",folha:ym,folhaTipo:tag.t,...(tag.pessoaId?{folhaPessoa:tag.pessoaId}:{})});
  const novas=[],tot=k=>L.reduce((s,x)=>s+x[k],0);
  if(detalhar)L.forEach(x=>novas.push(mk(`Salário ${ym.slice(5)}/${ym.slice(0,4)} — ${nomeInteg(x.i)}`,x.sal,pagto,"Folha de pagamento",{t:"salario",pessoa:nomeInteg(x.i),pessoaId:x.i.id,fornId:"n:"+estNorm(nomeInteg(x.i))})));
  else novas.push(mk(`Salários ${ym.slice(5)}/${ym.slice(0,4)}`,tot("sal"),pagto,"Folha de pagamento",{t:"salario"}));
  if(tot("fgts")>0)novas.push(mk(`FGTS ${ym.slice(5)}/${ym.slice(0,4)}`,tot("fgts"),fgtsDia,"Encargos trabalhistas",{t:"fgts",pessoa:"Caixa Econômica Federal (FGTS)",fornId:"n:fgts"}));
  if(tot("pat")>0)novas.push(mk(`INSS patronal e outros ${ym.slice(5)}/${ym.slice(0,4)}`,tot("pat"),fgtsDia,"Encargos trabalhistas",{t:"patronal",pessoa:"Receita Federal (encargos)",fornId:"n:encargos"}));
  if(tot("vtEmp")>0)novas.push(mk(`Vale-transporte ${ym.slice(5)}/${ym.slice(0,4)}`,tot("vtEmp"),vtDia,"Benefícios",{t:"vt",pessoa:"Vale-transporte",fornId:"n:vale-transporte"}));
  if(tot("vrEmp")>0)novas.push(mk(`Vale-refeição ${ym.slice(5)}/${ym.slice(0,4)}`,tot("vrEmp"),vtDia,"Benefícios",{t:"vr",pessoa:"Vale-refeição",fornId:"n:vale-refeicao"}));
  let subst=0,pagas=0;
  finMutate(all=>{
    const outras=all.filter(e=>{if(e.folha!==ym)return true;if(e.pago){pagas++;return true}subst++;return false});
    const tem=new Set(outras.filter(e=>e.folha===ym).map(e=>e.folhaTipo+"|"+(e.folhaPessoa||"")));
    return[...outras,...novas.filter(n=>!tem.has(n.folhaTipo+"|"+(n.folhaPessoa||"")))];
  });
  return{criadas:novas.length,substituidas:subst,pagas};
}
function bindBenef(){
  const sel=$("bfmes");if(sel)sel.onchange=()=>{BFST.ym=sel.value;go("gp",true)};
  const sv=$("bfsalva");if(sv)sv.onclick=()=>{xcfgSave("gp",{benef:{vtDia:+$("bfvt").value||0,vtDescPct:+$("bfvtd").value||0,vrDia:+$("bfvr").value||0,fgtsPct:+$("bffg").value||0,patronalPct:+$("bfpat").value||0,diaPag:+$("bfdia").value||5}});toast("Percentuais salvos.");go("gp",true)};
  const det=$("bfdet");if(det)det.onchange=()=>{BFST.detalhar=det.checked};
  const lc=$("bflanca");if(lc)lc.onclick=async()=>{
    if(!await askConfirm(`Lançar a folha de ${BFST.ym.slice(5)}/${BFST.ym.slice(0,4)} no financeiro?`,"Lançar"))return;
    const r=folhaParaFinanceiro(BFST.ym,BFST.detalhar);toast(`${r.criadas} conta(s) a pagar lançada(s)${r.substituidas?`, ${r.substituidas} anterior(es) substituída(s)`:""}${r.pagas?`; ${r.pagas} já paga(s) foram mantidas`:""}.`);
  };
  document.querySelectorAll("[data-bfov]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.bfov,o=S.benef[id]||{};
    const ov=openModal(`<h3>Benefícios — ${esc(xNomeInteg(id))}</h3><p class="sub">Deixe em branco para usar o valor padrão da casa.</p><div class="row"><div><label>VT por dia (R$)</label><input type="number" step="0.01" id="bov1" value="${o.vtDia??""}"></div><div><label>VR por dia (R$)</label><input type="number" step="0.01" id="bov2" value="${o.vrDia??""}"></div></div>
     <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:10px"><input type="checkbox" id="bov3" ${o.vtOpta===false?"":"checked"}> Optou por receber vale-transporte</label>
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="b sec" id="bovcx">Cancelar</button><button class="b" id="bovsv">Salvar</button></div>`);
    ov.querySelector("#bovcx").onclick=()=>ov.remove();
    ov.querySelector("#bovsv").onclick=()=>{const v1=ov.querySelector("#bov1").value,v2=ov.querySelector("#bov2").value;put("benef",id,{integ:id,vtDia:v1===""?"":+v1,vrDia:v2===""?"":+v2,vtOpta:ov.querySelector("#bov3").checked});ov.remove();go("gp",true)};
  });
}

/* ---------- pessoas e empresas (cadastro único) ---------- */
const pessoasCrud={id:"pessoas",col:"pessoas",mod:"gp",novoLabel:"Cadastrar pessoa ou empresa",novoTit:"Pessoa ou empresa",
  campos:[{k:"nome",l:"Nome ou razão social",req:true,full:true},{k:"tipo",l:"Tipo",t:"sel",opts:["Fornecedor","Prestador","Cliente","Responsável de residente","Familiar","Outro"],req:true},{k:"doc",l:"CNPJ ou CPF"},{k:"tel",l:"Telefone"},{k:"email",l:"E-mail"},{k:"obs",l:"Observação",full:true}],
  cols:[{h:"Nome",k:"nome"},{h:"Tipo",k:"tipo"},{h:"Documento",k:"doc"},{h:"Telefone",k:"tel"},{h:"E-mail",k:"email"}],ordem:(a,b)=>a.nome.localeCompare(b.nome,"pt"),vazio:"Nenhuma pessoa ou empresa cadastrada à parte.",busca:r=>r.obs||"",
  valida:(o)=>{const n=estNorm(o.nome),dup=xs("pessoas").find(p=>p.id!==o.id&&estNorm(p.nome)===n);if(dup)return"Já existe um cadastro com esse nome."}};
function pessoasHtml(){
  const todas=pessoasTodas(),dup=pessoasDuplicadas();
  return `<div class="card"><h2>Visão única</h2><p class="sub" style="margin:0 0 10px">Reúne fornecedores (do financeiro), prestadores, responsáveis dos residentes e os cadastros feitos aqui. Em qualquer campo de nome o sistema sugere esta lista, para ninguém digitar a mesma empresa de dois jeitos.</p>
   <div class="stats"><div class="stat"><b>${todas.length}</b><span>nomes diferentes no sistema</span></div><div class="stat ${dup.length?"warn":""}"><b>${dup.length}</b><span>possíveis duplicados</span></div></div>
   ${dup.length?`<h2 style="margin-top:12px">Possíveis duplicados</h2>${dup.slice(0,8).map(([a,b])=>`<div class="doc"><div class="grow"><div class="nm">${esc(a.nome)}</div><div class="sub">parece o mesmo que “${esc(b.nome)}”</div></div></div>`).join("")}`:""}
   <details style="margin-top:10px"><summary class="sub" style="cursor:pointer">Ver todos (${todas.length})</summary><div class="wrap"><table><thead><tr><th>Nome</th><th>Aparece como</th><th>Documento</th><th>Contato</th></tr></thead><tbody>${todas.slice(0,300).map(p=>`<tr><td>${esc(p.nome)}</td><td>${[...p.tipos].map(esc).join(", ")}</td><td>${esc(p.doc||"")}</td><td>${esc([p.tel,p.email].filter(Boolean).join(" · "))}</td></tr>`).join("")}</tbody></table></div></details></div>`;
}

/* ---------- página ---------- */
xpage("gp","Gestão de pessoas","Férias, banco de horas, fechamento do ponto, admissão e desligamento, treinamentos, EPI e custo da folha.","users",[
  {k:"ferias",l:"Férias",html:()=>feriasHtml()+xcrud(feriasCrud),bind:()=>{document.querySelectorAll("[data-fnova]").forEach(b=>b.onclick=()=>xForm(feriasCrud,{integ:b.dataset.fnova,status:"programada",abono:0},f=>xcrudSalvar(feriasCrud,f,null)))}},
  {k:"bh",l:"Banco de horas",html:()=>bhHtml()+xcrud(bhCrud),bind:()=>{
    const m=$("bhmes");if(m)m.onchange=()=>{BHST.ym=m.value;go("gp",true)};
    const sv=()=>{xcfgSave("gp",{bh:{inicio:$("bhini").value||bhCfg().inicio,limiteH:+$("bhlim").value||40}});go("gp",true)};
    if($("bhini"))$("bhini").onchange=sv;if($("bhlim"))$("bhlim").onchange=sv}},
  {k:"fech",l:"Fechamento do ponto",html:fechHtml,bind:bindFech},
  {k:"mov",l:"Admissão e desligamento",html:()=>xcrud(movCrud)},
  {k:"trein",l:"Treinamentos",html:()=>treinHtml()+xcrud(treinCrud),bind:bindTrein},
  {k:"epi",l:"EPI e uniformes",html:()=>xcrud(epiCrud)},
  {k:"benef",l:"Benefícios e custo da folha",html:benefHtml,bind:bindBenef},
  {k:"pessoas",l:"Pessoas e empresas",html:()=>pessoasHtml()+xcrud(pessoasCrud)}
]);

/* ---------- pendências, calendário e relatórios do módulo ---------- */
XURG.push((L,h,fim)=>{
  if(!podeVer("gp"))return;
  gpAtivos().forEach(i=>{const q=feriasQuadro(i);if(q&&q.pend){const n=feriasNivel(q.pend);if(n)L.push({nivel:n,tipo:"Férias",titulo:`Férias de ${nomeInteg(i)}: ${q.pend.saldo} dia(s) a conceder`,detalhe:xDias(q.pend.limite)<0?`prazo venceu em ${brDate(q.pend.limite)} (pagamento em dobro)`:`conceder até ${brDate(q.pend.limite)}`,quando:q.pend.limite,rota:"gp",res:{k:"gpferias",id:i.id},resLabel:"Programar"})}});
  const M=treinMatriz().filter(x=>x.s.n>=2);
  if(M.length)L.push({nivel:M.some(x=>x.s.n===3)?2:1,tipo:"Treinamentos",titulo:`${M.length} treinamento(s) obrigatório(s) vencido(s), vencendo ou nunca feitos`,detalhe:M.slice(0,2).map(x=>`${nomeInteg(x.i)} — ${x.t.curso}`).join("; "),quando:null,rota:"gp",res:{k:"gptrein"},resLabel:"Ver treinamentos"});
  xs("epi").filter(e=>e.troca&&e.troca<=addDaysIso(h,15)).forEach(e=>L.push({nivel:e.troca<h?2:1,tipo:"EPI",titulo:`Trocar ${e.item} — ${xNomeInteg(e.integ)}`,detalhe:`troca prevista para ${brDate(e.troca)}`,quando:e.troca,rota:"gp",res:{k:"gpepi"},resLabel:"Abrir EPI"}));
  xs("movgp").filter(m=>m.status!=="concluído"&&daysBetweenIso(m.data,h)>=7).forEach(m=>L.push({nivel:1,tipo:m.tipo==="desligamento"?"Desligamento":"Admissão",titulo:`Checklist incompleto — ${xNomeInteg(m.integ)}`,detalhe:`${m.tipo==="desligamento"?"último dia":"início"} em ${brDate(m.data)}`,quando:m.data,rota:"gp",res:{k:"gpmov",id:m.id},resLabel:"Abrir checklist"}));
  const ant=addMesesIso(h,-1).slice(0,7);
  if(+h.slice(8)>=6&&gpAtivos().some(i=>i.uid!=null&&!semPonto(i))&&!mesFechado(ant+"-01"))L.push({nivel:1,tipo:"Ponto",titulo:`O ponto de ${ant.slice(5)}/${ant.slice(0,4)} ainda não foi fechado`,detalhe:"Feche o mês para travar as marcações antes de enviar ao contador",quando:null,rota:"gp",res:{k:"gpfech"},resLabel:"Fechar o mês"});
});
XRES.gpferias=(id)=>{PGX.gp.st.tab="ferias";go("gp");setTimeout(()=>xForm(feriasCrud,{integ:id,status:"programada",abono:0},f=>xcrudSalvar(feriasCrud,f,null)),60)};
XRES.gptrein=()=>{PGX.gp.st.tab="trein";go("gp")};XRES.gpepi=()=>{PGX.gp.st.tab="epi";go("gp")};XRES.gpfech=()=>{PGX.gp.st.tab="fech";go("gp")};
XRES.gpmov=id=>{PGX.gp.st.tab="mov";go("gp");setTimeout(()=>openMov(id),60)};
XEVENTOS.push(pre=>{
  const o=[];
  xs("ferias").filter(f=>f.status!=="cancelada"&&f.ini.startsWith(pre)).forEach(f=>o.push({id:f.id,nome:"Férias: "+xNomeInteg(f.integ),validade:f.ini,aviso:1,vinc:"casa"}));
  xs("trein").filter(t=>t.validade&&t.validade.startsWith(pre)).forEach(t=>o.push({id:t.id,nome:`Treinamento vence: ${t.curso} (${xNomeInteg(t.integ)})`,validade:t.validade,aviso:30,vinc:"casa"}));
  xs("epi").filter(e=>e.troca&&e.troca.startsWith(pre)).forEach(e=>o.push({id:e.id,nome:`Trocar ${e.item} (${xNomeInteg(e.integ)})`,validade:e.troca,aviso:15,vinc:"casa"}));
  return o;
});
REPORTS.push(
 {id:"gp_ferias",g:"Departamento pessoal",t:"Quadro de férias",d:"Período com saldo, prazo para conceder e situação por integrante.",pii:false,b:()=>({titulo:"Quadro de férias",sub:relSub({},false),
   cols:[{h:"Integrante",w:30},{h:"Cargo",w:22},{h:"Admissão",t:"date",w:12},{h:"Período com saldo",w:26},{h:"Saldo (dias)",t:"num",w:12},{h:"Conceder até",t:"date",w:14}],
   rows:gpAtivos().filter(i=>i.admissao).map(i=>{const q=feriasQuadro(i),p=q&&q.pend;return[nomeInteg(i),i.cargo||"",i.admissao,p?brDate(p.ini)+" a "+brDate(p.fimAq):"sem saldo vencido",p?p.saldo:0,p?p.limite:""]})})},
 {id:"gp_trein",g:"Departamento pessoal",t:"Treinamentos obrigatórios",d:"Situação de cada integrante em cada curso obrigatório.",pii:false,b:()=>({titulo:"Treinamentos obrigatórios",sub:relSub({},false),
   cols:[{h:"Integrante",w:28},{h:"Curso",w:44},{h:"Situação",w:22},{h:"Último registro",t:"date",w:14}],rows:treinMatriz().map(x=>[nomeInteg(x.i),x.t.curso,x.s.txt,x.s.u?x.s.u.data:""])})},
 {id:"gp_epi",g:"Departamento pessoal",t:"Entregas de EPI e uniformes",d:"Quem recebeu o quê, CA, troca prevista e assinatura.",pii:false,b:()=>({titulo:"Entregas de EPI e uniformes",sub:relSub({},false),
   cols:[{h:"Integrante",w:28},{h:"Item",w:28},{h:"Qtd",t:"num",w:7},{h:"Entrega",t:"date",w:12},{h:"Troca prevista",t:"date",w:14},{h:"CA",w:12},{h:"Assinado",w:10,c:true}],
   rows:xs("epi").sort((a,b)=>b.entrega.localeCompare(a.entrega)).map(e=>[xNomeInteg(e.integ),e.item,+e.qtd||1,e.entrega,e.troca||"",e.ca||"",e.assin?"Sim":"Não"])})},
 {id:"gp_banco",g:"Departamento pessoal",t:"Banco de horas (mês selecionado)",d:"Trabalhado, esperado e saldo acumulado por integrante.",pii:false,b:()=>({titulo:"Banco de horas — "+BHST.ym.slice(5)+"/"+BHST.ym.slice(0,4),sub:relSub({},false),
   cols:[{h:"Integrante",w:30},{h:"Trabalhado (h)",t:"num",w:14},{h:"Esperado (h)",t:"num",w:14},{h:"Saldo do mês (h)",t:"num",w:16},{h:"Saldo acumulado (h)",t:"num",w:18}],
   rows:[...bhSaldos(BHST.ym).por.values()].map(x=>[nomeInteg(x.ig),+(x.trab/60).toFixed(2),+(x.esp/60).toFixed(2),+(x.mes/60).toFixed(2),+(x.acum/60).toFixed(2)])})},
 {id:"gp_folha",g:"Departamento pessoal",t:"Custo da folha e benefícios",d:"Salários, FGTS, VT, VR e provisões por integrante no mês escolhido na aba Benefícios.",pii:true,b:()=>({titulo:"Custo da folha — "+BFST.ym.slice(5)+"/"+BFST.ym.slice(0,4),sub:relSub({},false),sensivel:true,
   cols:[{h:"Integrante",w:28},{h:"Salário",t:"money",w:14},{h:"Dias",t:"num",w:7},{h:"VT casa",t:"money",w:12},{h:"VR",t:"money",w:12},{h:"FGTS",t:"money",w:12},{h:"13º + férias (prov.)",t:"money",w:18}],
   rows:bfLinhas(BFST.ym).map(x=>[nomeInteg(x.i),x.sal,x.dias,x.vtEmp,x.vrEmp,x.fgts,x.p13+x.pfer]),tot:[null,"sum",null,"sum","sum","sum","sum"]})}
);


/* >>> x_cuid.js */
