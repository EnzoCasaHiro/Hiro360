/* ================= ESTOQUE ================= */
const ESTUI={q:"",area:"",cobMes:""};
function estDefault(){return{areas:["Cozinha","Enfermagem","Fisioterapia","Aux de Limpeza","Administrativo","Recepção","Manutenção","Almoxarifado"],itens:[]}}
function estData(){return S.config.estoque||estDefault()}
function saveEst(patch){put("config","estoque",{...estData(),...patch})}
const MOV_MOTIVOS={entrada:["Compra","Doação","Devolução","Transferência","Outro"],saida:["Consumo","Perda ou validade","Doação","Transferência","Outro"]};
const movKeys=()=>Object.keys(S.config).filter(k=>/^mov_\d{4}$/.test(k));
const movAll=()=>movKeys().flatMap(k=>S.config[k].itens||[]);
const movMutate=fn=>mutaAno("mov_","data",movAll(),fn);
const estNorm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const nfKey=r=>r.chave||("n"+(r.nota||"s/n")+"|"+(r.local||"")+"|"+(r.date||""));
const estValor=()=>soma(estData().itens,i=>(+i.qtd||0)*(+i.custo||0));
const estRepor=it=>Math.max(1,Math.ceil(2*(+it.minimo||0)-(+it.qtd||0)));
const TIPO_MOV={entrada:"Entrada",saida:"Saída",ajuste:"Ajuste"};
function nfNotas(){
  const rows=(S.config.nf&&S.config.nf.rows)||[],m={};
  rows.forEach(r=>{const k=nfKey(r);(m[k]=m[k]||{k,nota:r.nota,local:r.local,date:r.date,itens:[]}).itens.push(r)});
  return Object.values(m).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
}
// aplica as linhas sobre uma cópia do estoque; se qualquer linha der erro, nada é gravado
function estAplica(linhas,meta){
  const est=estData(),itens=est.itens.map(i=>({...i,lotes:(i.lotes||[]).map(l=>({...l}))})),movs=[],h=hojeIso(),ent=meta.tipo==="entrada";
  for(const l of linhas){
    let it=l.itemId?itens.find(x=>x.id===l.itemId):itens.find(x=>estNorm(x.nome)===estNorm(l.nome));
    if(!it){
      if(!ent)throw new Error(`"${l.nome}" não está cadastrado no estoque.`);
      it={id:uid8(),nome:l.nome.trim(),area:l.area||est.areas[0]||"",unidade:l.unidade||"un.",qtd:0,minimo:0,obs:"",lotes:[]};
      if(l.rastreavel!==undefined)it.rastreavel=l.rastreavel;
      itens.push(it);
    }
    const q=+l.qtd;if(!(q>0))throw new Error(`Informe uma quantidade maior que zero para "${it.nome}".`);
    const delta=ent?q:-q;
    if(+it.qtd+delta<0)throw new Error(`Saldo insuficiente de "${it.nome}": há ${it.qtd} ${it.unidade||"un."} e a saída é de ${q}.`);
    let usados=[];const loteN=(l.lote||"").trim();
    if(ent){
      if(l.val&&!/^\d{4}-\d{2}-\d{2}$/.test(l.val))throw new Error(`Validade inválida em "${it.nome}".`);
      const semV=!!l.semVal&&!l.val;
      if(semV&&!it.lotes.length)it.rastreavel=false;
      if(!semV&&(estRastr(it)||l.rastreavel)&&!l.val)throw new Error(`Informe a validade de "${it.nome}" ou marque "Sem validade" — item com controle de lote e validade.`);
      if(l.val){
        if(it.rastreavel===undefined)it.rastreavel=true;
        const lt=it.lotes.find(x=>(x.lote||"")===loteN&&(x.val||"")===l.val);
        if(lt)lt.qtd=+(+lt.qtd+q).toFixed(3);else it.lotes.push({id:uid8(),lote:loteN,val:l.val,qtd:q});
        usados=[{lote:loteN,val:l.val,qtd:q}];
      }
    }else{
      // saída: sai primeiro o lote que vence antes (PEPS/FEFO); lote vencido só sai como "Perda ou validade"
      const ls=it.lotes.filter(x=>+x.qtd>0).sort((a,b)=>(a.val||"9999").localeCompare(b.val||"9999"));
      const semLote=+(+it.qtd-ls.reduce((t,x)=>t+(+x.qtd),0)).toFixed(3),perda=/validade/i.test(meta.motivo||"");
      const pool=l.loteId?ls.filter(x=>x.id===l.loteId):perda?ls:ls.filter(x=>!x.val||x.val>=h);
      let falta=q;
      for(const lt of pool){if(falta<=0)break;const t=Math.min(+lt.qtd,falta);lt.qtd=+(lt.qtd-t).toFixed(3);falta=+(falta-t).toFixed(3);usados.push({lote:lt.lote,val:lt.val,qtd:t})}
      if(falta>0&&(l.loteId||falta>semLote)){
        const venc=ls.filter(x=>x.val&&x.val<h).reduce((t,x)=>t+(+x.qtd),0);
        if(l.loteId)throw new Error(`O lote escolhido de "${it.nome}" não tem saldo suficiente.`);
        throw new Error(venc>0&&!perda?`Só há ${+(+it.qtd-venc).toFixed(3)} ${it.unidade||"un."} de "${it.nome}" dentro da validade; ${venc} estão vencidos. Dê baixa dos vencidos como "Perda ou validade".`:`Saldo insuficiente de "${it.nome}".`);
      }
    }
    it.qtd=+(+it.qtd+delta).toFixed(3);it.lotes=it.lotes.filter(x=>+x.qtd>0);
    const nfRef=l.nf||meta.nf||"",forn=l.forn||meta.forn||"";
    if(ent&&+l.custo>0){it.custo=+l.custo;it.ultCompra={data:meta.data,forn,nf:nfRef}}
    movs.push({id:uid8(),item:it.id,nome:it.nome,tipo:meta.tipo,qtd:q,delta,data:meta.data,motivo:meta.motivo||"",nf:nfRef,custo:+l.custo>0?+l.custo:null,area:it.area,obs:meta.obs||"",em:new Date().toISOString(),
      ...(usados.length?{lotes:usados}:{}),...(!ent?{vUn:+it.custo||0,uso:meta.uso||"interno",...(meta.uso==="residente"&&meta.residente?{residente:meta.residente}:{})}:{})});
  }
  return{itens,movs};
}
function estCommit(res){saveEst({itens:res.itens});if(res.movs.length)movMutate(l=>[...l,...res.movs])}
const estAchar=n=>estData().itens.find(i=>estNorm(i.nome)===estNorm(n));
// lote e validade: medicamentos e material de enfermagem/fisioterapia por padrão; qualquer item pode ser marcado
const estRastr=it=>it.rastreavel!==undefined?!!it.rastreavel:/enferm|fisio/i.test(it.area||"");
const estBaixo=it=>+it.minimo>0&&+it.qtd<=+it.minimo;
const estLotesDe=it=>(it.lotes||[]).filter(l=>+l.qtd>0);
const estValDias=v=>v?daysBetweenIso(hojeIso(),v):null;
function estProxVal(it){return estLotesDe(it).filter(x=>x.val).sort((a,b)=>a.val.localeCompare(b.val))[0]||null}
function estAlertasVal(lim){const o=[];estData().itens.forEach(it=>estLotesDe(it).forEach(l=>{if(!l.val)return;const d=estValDias(l.val);if(d<=(lim===undefined?30:lim))o.push({it,l,dias:d})}));return o.sort((a,b)=>a.dias-b.dias)}
// quando o saldo cai por ajuste/contagem, os lotes encolhem a partir do que vence primeiro
function estAjustaLotes(it,novoQtd){
  const ls=(it.lotes||[]).map(l=>({...l})).sort((a,b)=>(a.val||"9999").localeCompare(b.val||"9999"));
  let sobra=+(ls.reduce((t,l)=>t+(+l.qtd),0)-novoQtd).toFixed(3);
  for(const l of ls){if(sobra<=0)break;const t=Math.min(+l.qtd,sobra);l.qtd=+(l.qtd-t).toFixed(3);sobra=+(sobra-t).toFixed(3)}
  return ls.filter(l=>+l.qtd>0);
}
const estValPill=it=>{const l=estProxVal(it);if(!l)return"";const d=estValDias(l.val);
  return `<span class="pill ${d<0?"s-urgente":d<=30?"s-pendencia":"s-ok"}" title="Lote ${esc(l.lote||"sem número")}">${d<0?"vencido ":""}${brDate(l.val)}</span>`+(estLotesDe(it).length>1?` <span class="sub">+${estLotesDe(it).length-1} lote(s)</span>`:"")};

function estConsumoMes(ym){
  const itens=estData().itens,val=m=>m.qtd*(m.vUn||((itens.find(x=>x.id===m.item)||{}).custo)||0);
  const mv=movAll().filter(m=>m.tipo==="saida"&&(m.data||"").slice(0,7)===ym&&!/validade/i.test(m.motivo||""));
  const porRes={};
  mv.filter(m=>m.uso==="residente").forEach(m=>{const k=m.residente||"?",o=porRes[k]=porRes[k]||{id:m.residente,movs:[],total:0};o.movs.push(m);o.total+=val(m)});
  return{interno:soma(mv.filter(m=>m.uso!=="residente"),val),porRes,val};
}
function estLancaCobranca(resId,ym){
  const c=estConsumoMes(ym),o=c.porRes[resId];
  if(!o||!(o.total>0))return toast("Não há valor para cobrar — informe o custo dos itens na entrada.",true);
  const key=resId+"|"+ym;if(finAll().some(e=>e.cobEst===key))return toast("Essa cobrança já foi lançada.",true);
  const[y,m]=ym.split("-").map(Number),nome=resNomeDe(resId)||"Residente";
  const lista=o.movs.map(x=>`${x.nome} ×${x.qtd}`).join(", ");
  finMutate(all=>[...all,{id:uid8(),tipo:"receber",desc:`Itens cobráveis ${String(m).padStart(2,"0")}/${y} — ${nome}`,contra:nome,cat:"Itens cobráveis",area:"",forma:"Boleto",obs:`Itens do estoque usados pelo residente: ${lista}`.slice(0,300),valor:+o.total.toFixed(2),venc:isoDate(new Date(y,m,10)),pago:null,valorPago:null,grupo:null,parcela:null,residente:resId,cobEst:key}]);
  toast(`Cobrança de ${fmtBRL(o.total)} lançada em Contas a receber.`);go("estoque",true);
}
function estCobHtml(){
  const ym=ESTUI.cobMes||hojeIso().slice(0,7),c=estConsumoMes(ym),ids=Object.keys(c.porRes),totRes=soma(ids,k=>c.porRes[k].total);
  const lanc=k=>finAll().some(e=>e.cobEst===k);
  return `<div class="card"><h2>Consumo interno × itens cobráveis do residente</h2>
   <div class="row" style="align-items:flex-end"><div style="flex:0 1 200px"><label>Mês</label><input type="month" id="estcobmes" value="${ym}"></div>
    <div><div class="sub">Consumo interno (custo da casa)</div><b class="serif" style="font-size:20px">${fmtBRL(c.interno)}</b></div>
    <div><div class="sub">Cobrável dos residentes</div><b class="serif" style="font-size:20px">${fmtBRL(totRes)}</b></div></div>
   ${ids.length?`<div class="wrap" style="margin-top:10px"><table><thead><tr><th>Residente</th><th>Itens</th><th class="n">Valor</th><th></th></tr></thead><tbody>
    ${ids.map(k=>{const o=c.porRes[k],key=k+"|"+ym;return `<tr><td><b>${esc(resNomeDe(o.id)||"Residente removido")}</b></td><td class="sub">${esc(o.movs.map(x=>`${x.nome} ×${x.qtd}`).join(", "))}</td><td class="n">${fmtBRL(o.total)}</td>
     <td style="white-space:nowrap">${lanc(key)?`<span class="pill s-ok">lançada</span>`:`<button class="b sm" data-estcob="${k}">Lançar em Contas a receber</button>`}</td></tr>`}).join("")}</tbody></table></div>`
   :`<p class="sub" style="margin:10px 0 0">Nenhuma saída para residente neste mês. Na saída em lote, escolha “Residente (cobrar do residente)”.</p>`}</div>`;
}
function estValidadeHtml(){
  const l=estAlertasVal(30);
  if(!l.length)return"";
  return `<div class="card" style="border-color:var(--madeira)"><h2>Validade — vencidos e a vencer em 30 dias</h2>
   <div class="wrap"><table><thead><tr><th>Item</th><th>Lote</th><th>Validade</th><th class="n">Saldo</th><th></th></tr></thead><tbody>
   ${l.map(a=>`<tr><td><b>${esc(a.it.nome)}</b><div class="sub">${esc(a.it.area)}</div></td><td>${esc(a.l.lote||"sem número")}</td>
    <td><span class="pill ${a.dias<0?"s-urgente":a.dias<=15?"s-urgente":"s-pendencia"}">${a.dias<0?"venceu em ":a.dias===0?"vence hoje · ":""}${brDate(a.l.val)}</span> <span class="sub">${a.dias<0?"há "+(-a.dias)+" dia(s)":"em "+a.dias+" dia(s)"}</span></td>
    <td class="n">${a.l.qtd} ${esc(a.it.unidade||"un.")}</td>
    <td style="white-space:nowrap">${a.dias<0?`<button class="b sm" data-estvalbaixa="${a.it.id}|${a.l.id}">Dar baixa (perda por validade)</button>`:`<span class="sub">usar primeiro</span>`}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function pgEstoque(){
  const est=estData(),q=ESTUI.q,areaSel=ESTUI.area,its=est.itens;
  const itens=its.filter(it=>(!areaSel||it.area===areaSel)&&(!q||it.nome.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  const baixo=its.filter(estBaixo),zer=its.filter(it=>+it.qtd<=0);
  const repor=baixo.map(it=>({it,n:estRepor(it)}));
  const movs=[...movAll()].sort((a,b)=>(b.em||"").localeCompare(a.em||"")).slice(0,30);
  const ult=it=>it.ultCompra?`${brDate(it.ultCompra.data)} · ${esc(it.ultCompra.forn||"—")}${it.custo?" · "+fmtBRL(it.custo):""}`:"—";
  return banner("","Estoque","Entradas e saídas em lote, contagem do que acabou e entrada direto da nota fiscal.","box")+noStore()+`
  <div class="stats"><div class="stat"><b>${its.length}</b><span>itens cadastrados</span></div>
   <div class="stat ${baixo.length?"warn":""}"><b>${baixo.length}</b><span>abaixo do mínimo</span></div>
   <div class="stat ${zer.length?"bad":""}"><b>${zer.length}</b><span>zerados (acabaram)</span></div>
   <div class="stat blue"><b>${fmtBRL(estValor())}</b><span>valor estimado em estoque (último custo)</span></div>
   <div class="stat ${estAlertasVal(30).some(a=>a.dias<0)?"bad":estAlertasVal(30).length?"warn":""}"><b>${estAlertasVal(30).length}</b><span>lotes vencidos ou a vencer em 30 dias</span></div></div>
  ${estValidadeHtml()}
  <div class="card"><h2>Lançar movimentação</h2><div class="row">
   <button class="b" id="estlotein" style="flex:none">${ic("plus")} Entrada em lote</button>
   <button class="b" id="estlotesai" style="flex:none">${ic("trash")} Saída em lote</button>
   <button class="b sec" id="estcontagem" style="flex:none">${ic("check")} Contagem — o que acabou e o que ainda tem</button>
   <button class="b sec" id="estdenf" style="flex:none">${ic("receipt")} Entrada de nota fiscal</button></div>
   <p class="sub" style="margin:8px 0 0">Toda alteração fica registrada no histórico abaixo, com data, motivo e nota fiscal.</p></div>
  ${repor.length?`<div class="card" style="border-color:var(--madeira)"><h2>Lista de compras sugerida</h2><p class="sub" style="margin:0 0 10px">Itens abaixo do mínimo, com reposição até o dobro do mínimo.</p>
   <div class="wrap"><table><thead><tr><th>Item</th><th>Área</th><th class="n">Tem</th><th class="n">Mínimo</th><th class="n">Repor</th><th>Última compra</th></tr></thead><tbody>
   ${repor.map(({it,n})=>`<tr><td><b>${esc(it.nome)}</b></td><td>${esc(it.area)}</td><td class="n">${it.qtd} ${esc(it.unidade||"un.")}</td><td class="n">${it.minimo}</td><td class="n"><b>${n}</b></td><td>${ult(it)}</td></tr>`).join("")}</tbody></table></div>
   <div class="row" style="margin-top:10px"><button class="b" id="estcomprain" style="flex:none">${ic("plus")} Dar entrada com esta lista</button><button class="b sec" id="estcomprarel" style="flex:none">${ic("down")} Baixar a lista (CSV, PDF, XLSX)</button></div></div>`:""}
  <div class="card"><h2>Áreas</h2>
   <div class="daypicker" style="flex-wrap:wrap">${est.areas.map(a=>`<button type="button" class="daypill ${areaSel===a?"on":""}" data-estarea="${esc(a)}" style="width:auto;padding:0 10px">${esc(a)}${areaSel===a?` <span data-estareadel="${esc(a)}" title="Remover área" style="margin-left:4px">✕</span>`:""}</button>`).join("")}</div>
   <div class="row" style="margin-top:10px"><input id="estnova" placeholder="Nova área (ex.: Lavanderia)"><button class="b sec sm" id="estareaadd" style="flex:none">${ic("plus")} Adicionar área</button></div>
   <p class="sub" style="margin:8px 0 0">Clique numa área para filtrar os itens abaixo. Clique de novo para limpar o filtro.</p></div>
  <div class="card"><h2>Itens ${areaSel?`— ${esc(areaSel)}`:""}</h2>
   <div class="row" style="margin-bottom:10px"><input id="estq" placeholder="Buscar item" value="${esc(q)}"><button class="b sm" id="estitemnovo" style="flex:none">${ic("plus")} Novo item</button></div>
   ${itens.length?`<div class="wrap"><table><thead><tr><th>Item</th><th>Área</th><th class="n" style="width:110px">Quantidade</th><th class="n" style="width:90px">Mínimo</th><th>Un.</th><th>Validade</th><th>Última compra</th><th></th></tr></thead><tbody>
   ${itens.map(it=>`<tr><td><b>${esc(it.nome)}</b>${+it.qtd<=0?` <span class="pill s-falta">acabou</span>`:estBaixo(it)?` <span class="pill s-pendencia">repor</span>`:""}${estRastr(it)?` <span class="chip" title="Controla lote e validade">lote</span>`:""}${it.cobravel?` <span class="chip" title="Pode ser cobrado do residente">cobrável</span>`:""}${it.obs?`<div class="sub">${esc(it.obs)}</div>`:""}</td>
    <td><span class="depto ${deptoClass(it.area)}">${esc(it.area)}</span></td>
    <td class="n"><input type="number" data-estqtd="${it.id}" value="${it.qtd}" style="text-align:right;${estBaixo(it)?"color:var(--bad);font-weight:700":""}"></td>
    <td class="n"><input type="number" data-estmin="${it.id}" value="${it.minimo}" style="text-align:right"></td><td>${esc(it.unidade||"un.")}</td><td>${estValPill(it)||"—"}</td><td class="sub">${ult(it)}</td>
    <td style="white-space:nowrap"><button class="b sec sm" data-estedit="${it.id}" title="Editar item">${ic("edit")}</button> <button class="b sec sm" data-esthist="${it.id}" title="Histórico do item">${ic("clock")}</button> <button class="b sec sm" data-estdel="${it.id}" title="Remover">${ic("trash")}</button></td></tr>`).join("")}
   </tbody></table></div>`:`<div class="empty">Nenhum item cadastrado${areaSel?" nesta área":""}.</div>`}</div>
  ${estCobHtml()}
  <div class="card"><h2>Últimas movimentações</h2>${movs.length?`<div class="wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th class="n">Qtd.</th><th>Motivo</th><th>Nota fiscal</th></tr></thead><tbody>
   ${movs.map(m=>`<tr><td>${brDate(m.data)}</td><td><span class="pill ${m.tipo==="entrada"?"s-ok":m.tipo==="saida"?"s-pendencia":"s-atestado"}">${TIPO_MOV[m.tipo]}</span></td><td>${esc(m.nome)}</td><td class="n">${m.delta>0?"+":""}${m.delta}</td><td>${esc(m.motivo||"—")}${m.obs?`<div class="sub">${esc(m.obs)}</div>`:""}</td><td>${esc(m.nf?(m.nf.length>16?"NF importada":m.nf):"—")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhuma movimentação ainda. Os lançamentos em lote e as contagens aparecem aqui.</div>`}</div>`;
}
function bindEstoque(){
  document.querySelectorAll("[data-estarea]").forEach(b=>b.onclick=e=>{
    if(e.target.dataset.estareadel)return;
    const a=b.dataset.estarea;ESTUI.area=ESTUI.area===a?"":a;go("estoque",true);
  });
  document.querySelectorAll("[data-estareadel]").forEach(s=>s.onclick=async e=>{
    e.stopPropagation();const a=s.dataset.estareadel;
    if(estData().itens.some(it=>it.area===a))return toast("Essa área ainda tem itens cadastrados — mude-os de área antes de remover.",true);
    if(!await askConfirm(`Remover a área "${a}"?`,"Remover"))return;
    saveEst({areas:estData().areas.filter(x=>x!==a)});ESTUI.area="";go("estoque",true);
  });
  const q=$("estq");if(q)q.oninput=()=>{ESTUI.q=q.value;go("estoque",true);const n=$("estq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  const aa=$("estareaadd");if(aa)aa.onclick=()=>{
    const v=$("estnova").value.trim();if(!v)return;
    if(estData().areas.includes(v))return toast("Essa área já existe.",true);
    saveEst({areas:[...estData().areas,v]});toast("Área adicionada.");go("estoque",true);
  };
  document.querySelectorAll("[data-estqtd]").forEach(inp=>inp.onchange=()=>{
    const est=estData(),it=est.itens.find(x=>x.id===inp.dataset.estqtd);if(!it)return;
    const novo=Math.max(0,+inp.value||0),delta=+(novo-it.qtd).toFixed(3);if(!delta)return;
    const itens=est.itens.map(x=>x.id===it.id?{...x,qtd:novo,lotes:estAjustaLotes(x,novo)}:x);saveEst({itens});
    movMutate(l=>[...l,{id:uid8(),item:it.id,nome:it.nome,tipo:"ajuste",qtd:Math.abs(delta),delta,data:hojeIso(),motivo:"Ajuste manual",nf:"",custo:null,area:it.area,obs:"",em:new Date().toISOString()}]);
    toast("Quantidade atualizada.");setTimeout(()=>go("estoque",true),0);
  });
  document.querySelectorAll("[data-estmin]").forEach(inp=>inp.onchange=()=>{
    const est=estData();saveEst({itens:est.itens.map(x=>x.id===inp.dataset.estmin?{...x,minimo:Math.max(0,+inp.value||0)}:x)});toast("Mínimo atualizado.");setTimeout(()=>go("estoque",true),0);
  });
  document.querySelectorAll("[data-estdel]").forEach(b=>b.onclick=async()=>{
    if(!await askConfirm("Remover este item do estoque? O histórico de movimentações dele continua guardado.","Remover"))return;
    saveEst({itens:estData().itens.filter(x=>x.id!==b.dataset.estdel)});toast("Item removido.");go("estoque",true);
  });
  document.querySelectorAll("[data-esthist]").forEach(b=>b.onclick=()=>openEstHist(b.dataset.esthist));
  const cm=$("estcobmes");if(cm)cm.onchange=()=>{ESTUI.cobMes=cm.value;setTimeout(()=>go("estoque",true),0)};
  document.querySelectorAll("[data-estcob]").forEach(b=>b.onclick=()=>estLancaCobranca(b.dataset.estcob,ESTUI.cobMes||hojeIso().slice(0,7)));
  document.querySelectorAll("[data-estvalbaixa]").forEach(b=>b.onclick=async()=>{
    const[iid,lid]=b.dataset.estvalbaixa.split("|"),it=estData().itens.find(x=>x.id===iid),lt=it&&(it.lotes||[]).find(x=>x.id===lid);if(!lt)return;
    if(!await askConfirm(`Dar baixa de ${lt.qtd} ${it.unidade||"un."} de "${it.nome}" (lote ${lt.lote||"sem número"}, vencido em ${brDate(lt.val)}) como perda por validade?`,"Dar baixa"))return;
    try{estCommit(estAplica([{itemId:iid,nome:it.nome,qtd:lt.qtd,loteId:lid}],{tipo:"saida",data:hojeIso(),motivo:"Perda ou validade",uso:"interno"}));toast("Baixa registrada.");go("estoque",true)}catch(e){toast(e.message,true)}
  });
  const ni=$("estitemnovo");if(ni)ni.onclick=()=>openEstItem();
  document.querySelectorAll("[data-estedit]").forEach(b=>b.onclick=()=>openEstItem(b.dataset.estedit));
  const e1=$("estlotein");if(e1)e1.onclick=()=>openEstLote("entrada");
  const e2=$("estlotesai");if(e2)e2.onclick=()=>openEstLote("saida");
  const e3=$("estcontagem");if(e3)e3.onclick=()=>openEstContagem();
  const e4=$("estdenf");if(e4)e4.onclick=()=>openEstDeNF();
  const e5=$("estcomprain");if(e5)e5.onclick=()=>openEstLote("entrada",{rows:estData().itens.filter(estBaixo).map(i=>({nome:i.nome,qtd:estRepor(i),custo:i.custo||""}))});
  const e6=$("estcomprarel");if(e6)e6.onclick=()=>{REL.sel=new Set(["est_compras"]);go("rel")};
}
function openEstItem(id){
  const est=estData(),ed=id?est.itens.find(x=>x.id===id):null;
  const ov=openModal(`<h3>${ed?"Editar item":"Novo item de estoque"}</h3>
   <label>Nome</label><input id="einome" value="${esc(ed?ed.nome:"")}">
   <div class="row"><div><label>Área</label><select id="eiarea">${est.areas.map(a=>`<option ${a===(ed?ed.area:ESTUI.area)?"selected":""}>${esc(a)}</option>`).join("")}</select></div>
   <div><label>Unidade</label><input id="eiun" placeholder="un., kg, L, pct..." value="${esc(ed?ed.unidade||"un.":"un.")}"></div></div>
   <div class="row">${ed?"":`<div><label>Quantidade atual</label><input type="number" id="eiqtd" value="0"></div>`}<div><label>Quantidade mínima (alerta)</label><input type="number" id="eimin" value="${ed?ed.minimo:0}"></div></div>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="eirast" ${ed?(estRastr(ed)?"checked":""):""}> Controlar lote e validade (medicamentos e material de enfermagem)</label>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="eicob" ${ed&&ed.cobravel?"checked":""}> Item que pode ser cobrado do residente (fraldas, medicamento particular…)</label>
   <label>Observação (opcional)</label><input id="eiobs" value="${esc(ed?ed.obs||"":"")}">
   <div class="err" id="eierr"></div>
   <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="b sec" id="eicx">Cancelar</button><button class="b" id="eisv">Salvar</button></div>`);
  ov.querySelector("#eicx").onclick=()=>ov.remove();
  ov.querySelector("#eisv").onclick=()=>{
    const nome=ov.querySelector("#einome").value.trim();
    if(!nome)return ov.querySelector("#eierr").textContent="Informe o nome do item.";
    const igual=estAchar(nome);
    if(igual&&(!ed||igual.id!==ed.id))return ov.querySelector("#eierr").textContent="Já existe um item com esse nome. Use a entrada em lote para somar quantidade.";
    const campos={nome,area:ov.querySelector("#eiarea").value,unidade:ov.querySelector("#eiun").value.trim()||"un.",minimo:Math.max(0,+ov.querySelector("#eimin").value||0),
      rastreavel:ov.querySelector("#eirast").checked,cobravel:ov.querySelector("#eicob").checked,obs:ov.querySelector("#eiobs").value.trim()};
    if(ed){saveEst({itens:est.itens.map(x=>x.id===ed.id?{...x,...campos}:x)});ov.remove();toast("Item atualizado.");return go("estoque",true)}
    const qtd=Math.max(0,+ov.querySelector("#eiqtd").value||0);
    const novo={id:uid8(),...campos,qtd,lotes:[]};
    saveEst({itens:[...estData().itens,novo]});
    if(qtd>0)movMutate(l=>[...l,{id:uid8(),item:novo.id,nome,tipo:"entrada",qtd,delta:qtd,data:hojeIso(),motivo:"Saldo inicial",nf:"",custo:null,area:novo.area,obs:"",em:new Date().toISOString()}]);
    ov.remove();toast("Item adicionado.");go("estoque",true);
  };
}

/* ---------- entrada e saída em lote ---------- */
function openEstLote(tipo,preset){
  const ent=tipo==="entrada",pre=preset||{},est0=estData();
  const rows=(pre.rows&&pre.rows.length?pre.rows:[{}]).map(r=>({nome:r.nome||"",qtd:r.qtd??"",custo:r.custo??"",area:r.area||"",unidade:r.unidade||"",lote:r.lote||"",val:r.val||"",nf:r.nf||"",forn:r.forn||"",rastreavel:r.rastreavel}));
  const ov=openModal(`<h3>${ent?"Entrada de itens em lote":"Saída de itens em lote"}</h3>
   <div class="row"><div><label>Data</label><input type="date" id="elda" value="${pre.data||hojeIso()}"></div>
    <div><label>${ent?"Origem":"Motivo"}</label><select id="elmo">${MOV_MOTIVOS[tipo].map(m=>`<option ${m===pre.motivo?"selected":""}>${m}</option>`).join("")}</select></div>
    ${ent?`<div><label>Nota fiscal (opcional)</label><input id="elnf" value="${esc(pre.nfRot||"")}" placeholder="número ou fornecedor"></div>`:`<div><label>Observação</label><input id="elobs" placeholder="ex.: cozinha, enfermagem"></div>`}</div>
   ${ent?"":`<div class="row"><div><label>Quem consome</label><select id="eluso"><option value="interno">Consumo interno (custo da casa)</option><option value="residente">Residente (cobrar do residente)</option></select></div>
    <div id="elreswrap" style="display:none"><label>Residente</label><select id="elres"><option value="">Escolha…</option>${resAll().filter(resAtivo).map(r=>`<option value="${r.id}">${esc(resNome(r))}</option>`).join("")}</select></div></div>
    <p class="sub" style="margin:2px 0 0">A saída retira primeiro o lote que vence antes (PEPS/FEFO). Lote vencido só sai como “Perda ou validade”.</p>`}
   <datalist id="eldl">${est0.itens.map(i=>`<option value="${esc(i.nome)}">`).join("")}</datalist>
   <div id="elbody" class="wrap" style="margin-top:10px"></div>
   <div class="row" style="margin-top:8px;align-items:flex-end">
    <button class="b sec sm" id="eladd" style="flex:none">${ic("plus")} Adicionar linha</button>
    <div style="flex:0 1 220px"><label>Adicionar todos os itens de uma área</label><select id="elarea"><option value="">Escolha a área…</option>${est0.areas.map(a=>`<option>${esc(a)}</option>`).join("")}</select></div>
    ${ent?`<button class="b sec sm" id="elrep" style="flex:none">Preencher com a lista de compras</button>`:""}</div>
   <div class="err" id="elerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="elcx">Cancelar</button><button class="b" id="elsv">${ent?"Dar entrada":"Dar saída"}</button></div>`);
  ov.querySelector(".modal").classList.add("largo");
  const g=s=>ov.querySelector(s);
  const DURAVEL=/cadeira|andador|muleta|bengala|cama|colch[aã]o|poltrona|arm[aá]rio|mesa|estante|televis|\btv\b|geladeira|freezer|fog[aã]o|microondas|ventilador|ar condicionado|aparelho|equipamento|term[oô]metro|medidor|nebulizador|inalador|aspirador|oxim|balan[cç]a|carrinho|suporte|barra|grade|tapete antider|travesseiro|almofada|ferramenta|furadeira|escada|lixeira|utens|panela|talher|prato|copo|bandeja/i;
  const semVal=(r,a)=>r.sv!==undefined?!!r.sv:!r.val&&!r.lote&&(a?a.rastreavel===false:DURAVEL.test(r.nome||""));
  const paint=()=>{
    const est=estData();
    g("#elbody").innerHTML=`<table><thead><tr><th>Item</th><th class="n" style="width:110px">Quantidade</th>${ent?`<th class="n" style="width:100px">Valor un. (R$)</th><th>Área</th><th style="width:70px">Un.</th><th style="width:110px">Lote</th><th style="width:150px">Validade</th>`:""}<th>Saldo atual</th><th></th></tr></thead><tbody>
    ${rows.map((r,i)=>{const a=estAchar(r.nome);return `<tr><td><input list="eldl" data-i="${i}" data-f="nome" value="${esc(r.nome)}" placeholder="nome do item"></td>
     <td class="n"><input type="number" min="0" data-i="${i}" data-f="qtd" value="${esc(r.qtd)}" style="text-align:right"></td>
     ${ent?`<td class="n"><input type="number" min="0" class="has-step" data-i="${i}" data-f="custo" value="${esc(r.custo)}" style="text-align:right"></td>
      <td><select data-i="${i}" data-f="area" ${a?"disabled":""}>${est.areas.map(x=>`<option ${(a?a.area:r.area)===x?"selected":""}>${esc(x)}</option>`).join("")}</select></td>
      <td><input data-i="${i}" data-f="unidade" value="${esc(a?a.unidade||"un.":r.unidade)}" placeholder="un." ${a?"disabled":""}></td>
      <td><input data-i="${i}" data-f="lote" value="${esc(r.lote)}" placeholder="nº do lote"></td>
      <td><input type="date" data-i="${i}" data-f="val" value="${esc(r.val)}" ${semVal(r,a)?"disabled":""} ${a&&estRastr(a)&&!semVal(r,a)?'style="border-color:var(--madeira)"':""}><label class="sub" style="display:flex;gap:4px;align-items:center;margin:2px 0 0;font-weight:400"><input type="checkbox" data-sv="${i}" ${semVal(r,a)?"checked":""} style="width:auto;margin:0"> Sem validade</label></td>`:""}
     <td class="sub">${a?`${a.qtd} ${esc(a.unidade||"un.")}${ent&&estRastr(a)?" · exige validade":""}`:(ent&&r.nome.trim()?"item novo":"")}</td><td><button class="b sec sm" data-rm="${i}">${ic("trash")}</button></td></tr>`}).join("")}</tbody></table>`;
    mountSteppers(ov);
    ov.querySelectorAll("[data-f]").forEach(el=>el.onchange=()=>{rows[+el.dataset.i][el.dataset.f]=el.value;if(el.dataset.f==="nome")setTimeout(paint,0)});
    ov.querySelectorAll("[data-sv]").forEach(el=>el.onchange=()=>{const r=rows[+el.dataset.sv];r.sv=el.checked;if(el.checked)r.val="";paint()});
    ov.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.rm,1);if(!rows.length)rows.push({nome:"",qtd:"",custo:"",area:"",unidade:"",lote:"",val:"",nf:"",forn:""});paint()});
  };
  paint();
  const vazia=()=>({nome:"",qtd:"",custo:"",area:"",unidade:"",lote:"",val:"",nf:"",forn:""});
  g("#eladd").onclick=()=>{rows.push(vazia());paint()};
  g("#elarea").onchange=()=>{
    const a=g("#elarea").value;if(!a)return;
    estData().itens.filter(i=>i.area===a&&!rows.some(r=>estNorm(r.nome)===estNorm(i.nome))).forEach(i=>rows.push({...vazia(),nome:i.nome,custo:ent?(i.custo||""):""}));
    if(rows.length>1&&!rows[0].nome&&rows[0].qtd==="")rows.shift();paint();g("#elarea").value="";
  };
  const rp=g("#elrep");if(rp)rp.onclick=()=>{
    estData().itens.filter(i=>estBaixo(i)&&!rows.some(r=>estNorm(r.nome)===estNorm(i.nome))).forEach(i=>rows.push({...vazia(),nome:i.nome,qtd:estRepor(i),custo:i.custo||""}));
    if(rows.length>1&&!rows[0].nome&&rows[0].qtd==="")rows.shift();paint();
  };
  const us=g("#eluso");if(us)us.onchange=()=>{g("#elreswrap").style.display=us.value==="residente"?"block":"none"};
  g("#elcx").onclick=()=>ov.remove();
  g("#elsv").onclick=()=>{
    const er=m=>g("#elerr").textContent=m;
    const ativos=rows.filter(r=>r.nome.trim()||String(r.qtd)!=="");
    if(!ativos.length)return er("Adicione ao menos um item com quantidade.");
    if(ativos.some(r=>!r.nome.trim()))return er("Há uma linha com quantidade mas sem o nome do item.");
    const est=estData(),linhas=ativos.map(r=>{const a=estAchar(r.nome);return{itemId:a?a.id:null,nome:r.nome.trim(),qtd:r.qtd,custo:+r.custo||0,area:a?a.area:(r.area||est.areas[0]||""),unidade:a?a.unidade:(r.unidade.trim()||"un."),lote:r.lote,val:r.val,nf:r.nf,forn:r.forn,semVal:semVal(r,a),rastreavel:a?undefined:(semVal(r,a)?false:(r.rastreavel!==undefined?r.rastreavel:(/enferm|fisio/i.test(r.area||"")?true:undefined)))}});
    const uso=ent?"":g("#eluso").value,resId=ent?"":g("#elres").value;
    if(!ent&&uso==="residente"&&!resId)return er("Escolha o residente que será cobrado.");
    try{
      const res=estAplica(linhas,{tipo,data:g("#elda").value||hojeIso(),motivo:g("#elmo").value,nf:pre.nf||(ent?g("#elnf").value.trim():""),forn:pre.forn||"",obs:ent?"":g("#elobs").value.trim(),uso,residente:resId});
      estCommit(res);ov.remove();toast(`${res.movs.length} item(ns) — ${ent?"entrada":"saída"} registrada.`);go(ROUTE,true);
    }catch(e){er(e.message)}
  };
}

/* ---------- contagem: o que acabou e o que ainda tem ---------- */
function openEstContagem(){
  const est0=estData(),vals={},f={area:"",so:false};
  const ov=openModal(`<h3>Contagem do estoque</h3><div class="sub" style="margin-bottom:10px">Digite o que existe de verdade em cada item. Deixe em branco o que não mudou. “Acabou” zera o item. A diferença fica registrada como ajuste de contagem.</div>
   <div class="row" style="align-items:flex-end"><div><label>Área</label><select id="ctarea"><option value="">Todas</option>${est0.areas.map(a=>`<option>${esc(a)}</option>`).join("")}</select></div>
    <label style="display:flex;gap:6px;align-items:center;font-weight:400;color:var(--ink);margin:0 0 10px"><input type="checkbox" id="ctso"> só os abaixo do mínimo</label></div>
   <div id="ctbody" class="wrap"></div><div class="err" id="cterr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ctcx">Cancelar</button><button class="b" id="ctsv">Salvar contagem</button></div>`);
  ov.querySelector(".modal").classList.add("largo");
  const g=s=>ov.querySelector(s);
  const paint=()=>{
    const l=estData().itens.filter(i=>(!f.area||i.area===f.area)&&(!f.so||estBaixo(i))).sort((a,b)=>a.area.localeCompare(b.area,"pt")||a.nome.localeCompare(b.nome,"pt"));
    g("#ctbody").innerHTML=l.length?`<table><thead><tr><th>Item</th><th>Área</th><th class="n">Sistema</th><th class="n" style="width:120px">Contagem</th><th></th></tr></thead><tbody>
     ${l.map(i=>`<tr><td><b>${esc(i.nome)}</b></td><td>${esc(i.area)}</td><td class="n">${i.qtd} ${esc(i.unidade||"un.")}</td>
      <td class="n"><input type="number" min="0" data-ct="${i.id}" value="${vals[i.id]===undefined?"":vals[i.id]}" style="text-align:right"></td>
      <td><button class="b sec sm" data-ctz="${i.id}">Acabou</button></td></tr>`).join("")}</tbody></table>`:`<div class="empty">Nenhum item para mostrar.</div>`;
    mountSteppers(ov);
    ov.querySelectorAll("[data-ct]").forEach(el=>el.onchange=()=>{vals[el.dataset.ct]=el.value});
    ov.querySelectorAll("[data-ctz]").forEach(b=>b.onclick=()=>{vals[b.dataset.ctz]="0";paint()});
  };
  paint();
  g("#ctarea").onchange=e=>{f.area=e.target.value;paint()};g("#ctso").onchange=e=>{f.so=e.target.checked;paint()};
  g("#ctcx").onclick=()=>ov.remove();
  g("#ctsv").onclick=()=>{
    const est=estData(),movs=[];let n=0;
    const itens=est.itens.map(i=>{
      const v=vals[i.id];if(v===undefined||v==="")return i;
      const novo=Math.max(0,+v||0),delta=+(novo-i.qtd).toFixed(3);if(!delta)return i;
      n++;movs.push({id:uid8(),item:i.id,nome:i.nome,tipo:"ajuste",qtd:Math.abs(delta),delta,data:hojeIso(),motivo:novo===0?"Contagem — acabou":"Contagem",nf:"",custo:null,area:i.area,obs:"",em:new Date().toISOString()});
      return{...i,qtd:novo,lotes:estAjustaLotes(i,novo)};
    });
    if(!n){ov.remove();return toast("Nenhuma diferença encontrada — o estoque já confere.")}
    saveEst({itens});movMutate(l=>[...l,...movs]);ov.remove();toast(`${n} item(ns) ajustado(s) pela contagem.`);go(ROUTE,true);
  };
}

/* ---------- entrada a partir de uma nota fiscal ---------- */
function openEstDeNF(){
  const notas=nfNotas();
  if(!notas.length)return toast("Ainda não há notas fiscais. Envie a planilha ou o XML em Notas Fiscais.",true);
  const lancadas=new Set(movAll().filter(m=>m.nf).map(m=>m.nf)),f={q:""};
  const ov=openModal(`<h3>Entrada de nota fiscal no estoque</h3><div class="sub" style="margin-bottom:10px">Escolha a nota; os itens dela viram uma entrada em lote que você confere antes de confirmar. Itens novos são cadastrados na hora.</div>
   <label>Buscar por fornecedor ou número</label><input id="nfq" placeholder="ex.: Atacadão, 1234"><div id="nflista" style="margin-top:10px"></div>
   <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="b sec" id="nfcx">Fechar</button></div>`);
  const paint=()=>{
    const q=estNorm(f.q),l=notas.filter(n=>!q||estNorm(`${n.local} ${n.nota}`).includes(q)).slice(0,40);
    ov.querySelector("#nflista").innerHTML=l.length?l.map(n=>`<div class="doc"><div class="grow"><div class="nm">${esc(n.local||"Sem fornecedor")} — nota ${esc(n.nota||"s/n")}</div>
     <div class="sub">${brDate(n.date)} · ${n.itens.length} item(ns) · ${fmtBRL(soma(n.itens,r=>r.total))}</div></div>
     ${lancadas.has(n.k)?`<span class="pill s-ok">já no estoque</span>`:""}<button class="b sm" data-nfpick="${esc(n.k)}">Dar entrada</button></div>`).join(""):`<div class="empty">Nenhuma nota encontrada.</div>`;
    ov.querySelectorAll("[data-nfpick]").forEach(b=>b.onclick=()=>{
      const n=notas.find(x=>x.k===b.dataset.nfpick);if(!n)return;
      const est=estData();ov.remove();
      openEstLote("entrada",{nf:n.k,nfRot:`${n.local||""} ${n.nota||""}`.trim(),forn:n.local||"",data:n.date||hojeIso(),motivo:"Compra",
        rows:n.itens.filter(nfFisico).map(r=>({nome:r.item,qtd:r.qtd||1,custo:r.valor||(r.total&&r.qtd?+(r.total/r.qtd).toFixed(2):""),area:est.areas.find(a=>estNorm(a)===estNorm(r.cc||r.categoria))||"",unidade:nfUnEst(r.un),lote:r.lote||"",val:r.validade||"",nf:n.k,forn:n.local||""}))});
    });
  };
  paint();
  ov.querySelector("#nfq").oninput=e=>{f.q=e.target.value;paint()};
  ov.querySelector("#nfcx").onclick=()=>ov.remove();
}
function openEstHist(id){
  const it=estData().itens.find(x=>x.id===id);if(!it)return;
  const l=movAll().filter(m=>m.item===id).sort((a,b)=>(b.em||"").localeCompare(a.em||""));
  const ov=openModal(`<h3>${esc(it.nome)}</h3><div class="sub" style="margin-bottom:10px">Saldo atual: <b>${it.qtd} ${esc(it.unidade||"un.")}</b> · ${esc(it.area)}${estLotesDe(it).length?` · lotes: ${estLotesDe(it).map(x=>`${esc(x.lote||"s/ nº")} (${x.qtd}${x.val?", val. "+brDate(x.val):""})`).join("; ")}`:""}${it.ultCompra?` · última compra ${brDate(it.ultCompra.data)} (${esc(it.ultCompra.forn||"—")})`:""}</div>
   ${l.length?`<div class="wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th class="n">Qtd.</th><th>Motivo</th><th>Lote / destino</th><th class="n">Valor un.</th></tr></thead><tbody>${l.map(m=>`<tr><td>${brDate(m.data)}</td><td>${TIPO_MOV[m.tipo]}</td><td class="n">${m.delta>0?"+":""}${m.delta}</td><td>${esc(m.motivo||"—")}</td><td class="sub">${esc([(m.lotes||[]).map(x=>`lote ${x.lote||"s/ nº"}${x.val?" val. "+brDate(x.val):""}`).join("; "),m.uso==="residente"?"residente: "+(resNomeDe(m.residente)||"—"):""].filter(Boolean).join(" · ")||"—")}</td><td class="n">${m.custo?fmtBRL(m.custo):"—"}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Sem movimentações registradas para este item.</div>`}
   <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="b sec" id="ehcx">Fechar</button></div>`);
  ov.querySelector("#ehcx").onclick=()=>ov.remove();
}

