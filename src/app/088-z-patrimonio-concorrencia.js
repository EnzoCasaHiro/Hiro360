/* ================= PATRIMÔNIO PARA CONCORRÊNCIA PÚBLICA =================
   Uma lista só com os bens da casa (fogão, sofá, armários, camas…), juntando:
   - o cadastro de Patrimônio (Estrutura e qualidade) e os bens do Financeiro (Patrimônio e depreciação), sem os baixados;
   - os itens das notas fiscais que são móveis, eletrodomésticos e equipamentos (pela categoria ou pelo nome do item);
   - compras sem nota lançadas no Financeiro e bens lançados direto no Estoque.
   Cada linha pode ser tirada ou incluída à mão; a escolha fica em config/x_infra (patConc). */
const PCONC={q:"",cat:"",ver:"lista"}; // ver: "lista" = só o patrimônio | "todos" = tudo que foi comprado, para incluir o que faltou
const PCONC_MAX=300;
/* >>> regra */
// nome do item (já sem acento, em minúsculas) que indica bem durável
const PCONC_NOME=/\b(fogao|cooktop|forno|coifa|depurador|exaustor|geladeira|refrigerador|freezer|frigobar|micro ?ondas|lava ?loucas|maquina de lavar|lavadora|tanquinho|centrifuga|secadora|ar condicionado|climatizador|ventilador|televis\w*|tv|bebedouro|purificador|cama|beliche|colchao|berco|cabeceira|sofa|poltrona|cadeira|mesa|armario|guarda ?roupa|roupeiro|comoda|criado mudo|estante|rack|gaveteiro|escrivaninha|balcao|longarina|andador|computador|notebook|impressora|nobreak|tablet|celular|smartphone|extintor|camera de seguranca|dvr|concentrador de oxigenio)\b/;
// peças, acessórios e roupa de cama: não são o bem
const PCONC_NAO=/\b(jogo de cama|roupa de cama|lencol|fronha|protetor|capa|forro|toalha|pano|refil|filtros?|pecas?|reparo|resistencia|botao|puxador|dobradica|parafusos?|rodizios?|mangueira|registro|acendedor|tampa|grelha|queimador|vela|suporte|controle remoto|cabo|limpador|limpa|tintas?|cartuchos?|toner)\b/;
// categoria de consumo escolhida na nota: não é bem, mesmo que o nome pareça
const PCONC_CONSUMO=/^(medicamentos|alimentacao|material de enfermagem|limpeza e higiene|higiene pessoal e conforto|enxoval e uniformes)$/;
// frete, montagem, gás e outros serviços ligados a um bem: são despesa, nunca o bem (vale até com categoria de mobiliário)
// (pedreiro, empreiteiro, eletricista… também: a mão de obra da obra é lançada à mão na aba, para não contar em dobro)
const PCONC_DESPESA=/\b(fretes?|entrega|montagem|instalacao|mao de obra|servicos?|carga|recarga|gas|butano|glp|botijao|taxas?|conserto|manutencao|pedreiros?|empreiteir\w*|eletricista|encanador|pintor|servente|diarias?)\b/;
// material da obra (piso, luminária, porta, janela, louças, tinta, elétrica, hidráulica): entra como obra
const PCONC_OBRA=/\b(pisos?|porcelanatos?|ceramicas?|revestimentos?|azulejos?|rejunte|argamassa|cimento|concreto|areia|brita|tijolos?|blocos? de concreto|telhas?|vergalh\w*|gesso|drywall|forro de (gesso|pvc)|rodapes?|soleiras?|peitoril|luminarias?|plafon|spots?|arandelas?|pendentes?|refletor(es)?|portas?|portao|batentes?|janelas?|vitro|esquadrias?|vidros?|box|espelhos?|pias?|cubas?|bancadas?|vaso sanitario|bacia sanitaria|torneiras?|chuveiros?|misturador|caixa d ?agua|tintas?|massa corrida|selador|impermeabiliz\w*|disjuntor(es)?|quadro de distribuicao|fios? (eletricos?|flexive(l|is)|rigidos?)|cabos? flexive(l|is)|eletrodutos?|tomadas?|interruptor(es)?|tubos? (de )?pvc|canos?|conexo(es)? (de )?pvc|material (de construcao|eletrico|hidraulico)|corrimao|barras? de apoio|grades?|toldos?|calhas?)\b/;
// parecem obra mas são acessório, consumo ou outra coisa
const PCONC_OBRA_NAO=/\b(porta ?(toalhas?|papel|retratos?|copos?|sabonete|trecos?|escovas?|chaves?|lapis|joias|temperos?|controle|guardanapos?|comprimidos?)|tintas? (para |de )?(impressora|carimbo|cabelo)|cartucho|toner|puxador|dobradica|parafusos?|buchas?|pregos?|trinco|lampadas?|tapete|cortina|protetor)\b/;
const pconcEhObra=n=>PCONC_OBRA.test(n)&&!PCONC_OBRA_NAO.test(n)&&!PCONC_NOME.test(n);
function pconcAuto(nome,cat){
  if(PCONC_DESPESA.test(NFN(nome)))return false;
  const c=NFN(cat);if(c==="equipamentos e mobiliario")return true;
  if(PCONC_CONSUMO.test(c))return false;
  const n=NFN(nome);return (PCONC_NOME.test(n)&&!PCONC_NAO.test(n))||pconcEhObra(n);
}
/* <<< regra */
const PCONC_CATFIN=/imobiliz|equipament|moveis|movel|mobili|eletrodom/;
// categoria do Financeiro que é obra (não "Manutenção e reformas", que é despesa do dia a dia)
const PCONC_CATOBRA=/obras?|construc|benfeitor|^reformas?/;
const PCONC_MAT="Obras e benfeitorias — material";
const pconcCatObra=(nome,cat,auto)=>auto&&pconcEhObra(NFN(nome))?PCONC_MAT:cat;
const pconcMarcas=()=>xcfg("infra").patConc||{};
function pconcNfCat(r){
  const c=r.categoria;
  if(c&&!/^(sem categoria|a classificar|outros)$/i.test(c))return{cat:c,sub:r.subcategoria||""};
  const k=typeof nfClassificaX==="function"?nfClassificaX(r):null;
  return k?{cat:k.cat,sub:k.sub}:{cat:c||"",sub:""};
}
// obras, mão de obra de pedreiros e outros gastos lançados à mão nesta aba (config/x_infra, patConcObras)
const PCONC_TIPOS=["Obras e benfeitorias — mão de obra","Obras e benfeitorias — material","Outro bem"];
const pconcObras=()=>xcfg("infra").patConcObras||[];
// aceita 120000 · 120.000 · 120.000,00 · 120000,50
function pconcValor(s){
  s=String(s||"").replace(/[R$\s]/g,"");if(!s)return NaN;
  if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");
  const n=Number(s);return isFinite(n)?n:NaN;
}
// a obra vira também uma conta paga no Financeiro (aparece no caixa, no fluxo e na DRE em "Manutenção e reformas")
const PCONC_FINCAT={"Outro bem":"Móveis e equipamentos"};
const pconcObraFin=o=>o.finId&&typeof finAll==="function"?finAll().find(e=>e.id===o.finId)||null:null;
function pconcFinNovo(o,conta){
  return{id:uid8(),tipo:"pagar",desc:o.desc,contra:o.contra||"",fornId:o.contra?finFornId(o.contra,null):"",cat:PCONC_FINCAT[o.cat]||o.cat||PCONC_TIPOS[0],area:"",forma:"",
    obs:"lançado pela aba Patrimônio p/ concorrência"+(o.obs?" — "+o.obs:""),valor:+o.valor,venc:o.data,pago:o.data,valorPago:+o.valor,...(conta?{conta}:{}),pconcObra:o.id};
}
function pconcTodos(){
  const L=[],nomesNf=new Set();
  pconcObras().forEach(o=>L.push({k:"m:"+o.id,nome:o.desc,cat:o.cat||PCONC_TIPOS[0],qtd:1,unit:+o.valor||0,total:+o.valor||0,data:o.data||"",
    onde:[o.contra?"Pago a: "+o.contra:"",o.obs].filter(Boolean).join(" · "),origem:pconcObraFin(o)?"Lançado nesta aba · pago no Financeiro":"Lançado nesta aba",auto:true,manual:true}));
  xs("ativos").filter(a=>a.estado!=="baixado").forEach(a=>L.push({k:"a:"+a.id,nome:a.nome,cat:(a.cat||"").split(" (")[0]||"Outro",qtd:1,unit:+a.valor||0,total:+a.valor||0,data:a.compra||"",
    onde:[a.local,a.serie].filter(Boolean).join(" · "),origem:"Cadastro de patrimônio",auto:true}));
  if(typeof f11Bens==="function")f11Bens().filter(b=>!b.baixa).forEach(b=>L.push({k:"b:"+b.id,nome:b.nome,cat:b.cat||"",qtd:1,unit:+b.valor||0,total:+b.valor||0,data:b.data||"",
    onde:[b.local,b.serie?"série "+b.serie:""].filter(Boolean).join(" · "),origem:"Financeiro (bens)",auto:true}));
  ((S.config.nf&&S.config.nf.rows)||[]).forEach(r=>{
    const c=pconcNfCat(r),auto=pconcAuto(r.item,c.cat);nomesNf.add(NFN(r.item));
    L.push({k:"n:"+nfKey(r)+"|"+NFN(r.item),nome:r.item,cat:pconcCatObra(r.item,(c.cat==="Equipamentos e mobiliário"?c.sub:c.cat)||"Sem categoria",auto),qtd:+r.qtd||1,unit:+r.valor||0,total:+r.total||0,data:r.date||"",
      onde:r.local?"Local na nota: "+r.local:"",origem:"Nota fiscal"+(r.nota?" nº "+r.nota:""),auto,catRegra:c.cat});
  });
  // compras sem nota lançadas no Financeiro (as que vieram de nota têm "nf" e já estão acima)
  if(podeVer("fin")&&typeof finAll==="function")finAll().filter(e=>e.tipo==="pagar"&&!e.nf&&!e.pconcObra).forEach(e=>{ // pagamento de obra lançada nesta aba já está acima
    const v=+(e.valorPago||e.valor)||0,auto=!PCONC_DESPESA.test(NFN(e.desc))&&(PCONC_CATFIN.test(NFN(e.cat))||PCONC_CATOBRA.test(NFN(e.cat))||pconcAuto(e.desc,""));
    L.push({k:"f:"+e.id,nome:e.desc||"(sem descrição)",cat:pconcCatObra(e.desc,e.cat||"Sem categoria",auto),qtd:1,unit:v,total:v,data:(typeof e.pago==="string"&&e.pago)||e.venc||"",
      onde:e.contra?"Fornecedor: "+e.contra:"",origem:"Financeiro (compra sem nota)",auto});
  });
  // bens lançados direto no Estoque (os que vieram de nota já estão acima)
  estData().itens.filter(i=>+i.qtd>0&&!nomesNf.has(NFN(i.nome))).forEach(i=>L.push({k:"e:"+i.id,nome:i.nome,cat:pconcCatObra(i.nome,i.area||"Estoque",pconcAuto(i.nome,"")),qtd:+i.qtd||1,unit:+i.custo||0,total:(+i.qtd||0)*(+i.custo||0),
    data:(i.ultCompra&&i.ultCompra.data)||"",onde:i.area?"Área: "+i.area:"",origem:"Estoque",auto:pconcAuto(i.nome,"")}));
  const M=pconcMarcas();L.forEach(x=>{x.inc=M[x.k]!==undefined?!!M[x.k]:x.auto;if(!x.inc)x.motivo=M[x.k]===false?"Desmarcado à mão":pconcMotivo(x.nome,x.catRegra||"")});
  return L;
}
// por que uma compra ficou fora do patrimônio (mesma ordem da regra pconcAuto)
function pconcMotivo(nome,cat){
  const n=NFN(nome),c=NFN(cat);
  if(PCONC_DESPESA.test(n))return"Despesa: frete, gás, montagem, serviço ou mão de obra (lance a mão de obra em Obras e mão de obra)";
  if(PCONC_CONSUMO.test(c))return"Categoria de consumo na nota: "+cat;
  if(PCONC_NOME.test(n)&&PCONC_NAO.test(n))return"Peça, acessório ou roupa de cama";
  return"O nome não indica móvel, eletrodoméstico ou equipamento";
}
const pconcDeCompra=x=>/^[nfe]:/.test(x.k);
function pconcBase(T){
  return PCONC.ver==="todos"?T.filter(pconcDeCompra):PCONC.ver==="fora"?T.filter(x=>!x.inc):T.filter(x=>x.inc);
}
function pconcVisiveis(T){
  const q=estNorm(PCONC.q),base=pconcBase(T);
  return base.filter(x=>(!PCONC.cat||x.cat===PCONC.cat)&&(!q||estNorm(x.nome+" "+x.onde+" "+x.origem+" "+x.cat).includes(q)))
    .sort((a,b)=>a.cat.localeCompare(b.cat,"pt")||a.nome.localeCompare(b.nome,"pt"));
}
function pconcHtml(){
  const T=pconcTodos(),ed=podeEd("infra"),inc=T.filter(x=>x.inc),todos=PCONC.ver==="todos",fora=PCONC.ver==="fora",nFora=T.length-inc.length;
  const base=pconcBase(T),cats=[...new Set(base.map(x=>x.cat))].sort((a,b)=>a.localeCompare(b,"pt"));
  if(PCONC.cat&&!cats.includes(PCONC.cat))PCONC.cat="";
  const vis=pconcVisiveis(T),mostra=vis.slice(0,PCONC_MAX),falta=[!podeVer("nf")?"as notas fiscais":"",!podeVer("fin")?"o Financeiro":"",!podeVer("estoque")?"o Estoque":""].filter(Boolean);
  const chip=(v,t)=>`<button type="button" class="daypill ${PCONC.cat===v?"on":""}" data-pccat="${esc(v)}" style="width:auto;padding:0 10px">${esc(t)}</button>`;
  return `<div class="card"><h2>Patrimônio para concorrência pública</h2>
   <p class="sub" style="margin:0 0 10px">Junta numa lista só os bens da casa — móveis, eletrodomésticos, camas e equipamentos — vindos do cadastro de Patrimônio, das notas fiscais de compra, das compras sem nota lançadas no Financeiro e do Estoque. Os materiais da obra (piso, porcelanato, luminária, porta, janela, louças, tinta, material elétrico e hidráulico) entram como “Obras e benfeitorias — material”. Comida, fralda, remédio, peças, frete, gás e itens de consumo ficam de fora. A mão de obra (ex.: pedreiros) você lança logo abaixo. Se algo entrou errado, desmarque; se faltou, escolha “Procurar em tudo que foi comprado”, busque pelo nome e marque.</p>
   ${falta.length?`<div class="callout sand" style="margin-bottom:10px">Seu perfil não enxerga ${falta.join(", ")}: a lista mostra só o que você pode ver.</div>`:""}
   <div class="stats"><div class="stat"><b>${inc.length}</b><span>linhas no patrimônio</span></div><div class="stat"><b>${NUMF(soma(inc,x=>x.qtd),0)}</b><span>unidades</span></div><div class="stat"><b>${fmtBRL(soma(inc,x=>x.total))}</b><span>valor de compra</span></div><div class="stat"><b>${nFora}</b><span>compras que ficaram de fora</span></div></div>
   ${ed||pconcObras().length?pconcObrasHtml(ed):""}
   <div class="row" style="margin:12px 0 8px;align-items:flex-end">
    <div style="flex:0 0 300px"><label>Mostrar</label><select id="pcver"><option value="lista" ${todos||fora?"":"selected"}>Só o que é patrimônio</option><option value="fora" ${fora?"selected":""}>O que ficou de fora do patrimônio (${nFora})</option><option value="todos" ${todos?"selected":""}>Procurar em tudo que foi comprado (notas, Financeiro e Estoque)</option></select></div>
    <div style="flex:1 1 220px"><label>Buscar</label><input id="pcq" placeholder="Ex.: cama, fogão, armário" value="${esc(PCONC.q)}"></div>
    <div style="flex:none"><button class="b sec" id="pcxls" ${vis.length?"":"disabled"}>${ic("down")} Excel</button></div>
    <div style="flex:none"><button class="b sec" id="pcpdf" ${vis.length?"":"disabled"}>${ic("down")} PDF</button></div></div>
   <div class="daypicker" style="flex-wrap:wrap;margin-bottom:10px">${chip("","Todas as categorias")}${cats.map(c=>chip(c,c)).join("")}</div>
   ${todos?`<p class="sub" style="margin:0 0 8px">Marcado = entra no patrimônio. O download leva só as linhas marcadas desta busca.</p>`:""}
   ${fora?`<p class="sub" style="margin:0 0 8px">Compras que não entraram no patrimônio, com o motivo. Se alguma for um bem, marque a caixa para incluir. O download leva esta lista de fora.</p>`:""}
   ${vis.length?`<div class="wrap"><table><thead><tr>${ed?"<th>Patrimônio?</th>":""}<th>Bem</th><th>Categoria</th><th>Qtd</th><th>Valor</th><th>Aquisição</th><th>Origem</th></tr></thead><tbody>${mostra.map(x=>`<tr style="${x.inc||fora?"":"opacity:.6"}">${ed?`<td><input type="checkbox" data-pck="${esc(x.k)}" data-auto="${x.auto?1:0}" ${x.inc?"checked":""}></td>`:""}<td><b>${esc(x.nome)}</b>${x.onde?`<div class="sub">${esc(x.onde)}</div>`:""}${!x.inc&&x.motivo?`<div class="sub">Fora: ${esc(x.motivo)}</div>`:""}</td><td>${esc(x.cat)}</td><td class="n">${NUMF(x.qtd,0)}</td><td class="n">${fmtBRL(x.total)}</td><td class="n">${x.data?brDate(x.data):"—"}</td><td>${esc(x.origem)}${x.auto!==x.inc?` <span class="sub">(marcado à mão)</span>`:""}</td></tr>`).join("")}</tbody></table></div>
     ${vis.length>PCONC_MAX?`<p class="sub" style="margin:8px 0 0">Mostrando ${PCONC_MAX} de ${vis.length} linhas. Use a busca ou a categoria para achar as outras (o download leva todas).</p>`:""}`:`<div class="empty">${fora?"Nenhuma compra ficou de fora"+(PCONC.q?" com esse nome":"")+".":todos&&PCONC.q?"Nada com esse nome nas notas, no Financeiro nem no Estoque. Se o bem não foi lançado em lugar nenhum, cadastre na aba Patrimônio.":"Nada encontrado."}</div>`}</div>`;
}
function pconcObrasHtml(ed){
  const O=pconcObras().slice().sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  const finEd=podeEd("fin")&&typeof finMutate==="function",contas=typeof f4ContasPag==="function"?f4ContasPag().length:0;
  return `<details class="card" style="margin:12px 0 0;padding:10px 12px" ${O.length?"":"open"}><summary style="cursor:pointer"><b>Obras e mão de obra</b> <span class="sub">— reforma, pedreiros e outros gastos que não vieram de nota, Financeiro ou Estoque${O.length?` · ${O.length} lançamento(s), ${fmtBRL(soma(O,o=>+o.valor||0))}`:""}</span></summary>
   ${ed?`<div class="row" style="margin:10px 0 6px;align-items:flex-end">
    <div style="flex:2 1 260px"><label>Descrição</label><input id="pcodesc" placeholder="Ex.: Mão de obra dos pedreiros — reforma"></div>
    <div style="flex:1 1 220px"><label>Tipo</label><select id="pcocat">${PCONC_TIPOS.map(t=>`<option>${esc(t)}</option>`).join("")}</select></div>
    <div style="flex:0 0 150px"><label>Valor (R$)</label><input id="pcoval" inputmode="decimal" placeholder="120.000,00"></div>
    <div style="flex:0 0 160px"><label>Data</label><input id="pcodata" type="date" value="${hojeIso()}"></div>
    <div style="flex:1 1 200px"><label>Pago a (pedreiro, empreiteiro)</label><input id="pcocontra" placeholder="Ex.: João da Silva"></div>
    <div style="flex:1 1 200px"><label>Detalhe (opcional)</label><input id="pcoobs" placeholder="Ex.: ampliação dos quartos"></div></div>
   <div class="row" style="margin:0 0 6px;align-items:flex-end">
    ${finEd?`<div style="flex:none"><label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:22px"><input type="checkbox" id="pcofin" checked> Lançar também no Financeiro como conta paga</label></div>
    ${contas>1?`<div style="flex:0 0 220px"><label>Pago com</label>${f4SelConta("pcoconta")}</div>`:""}`:`<div style="flex:1 1 300px" class="sub">Seu perfil não lança no Financeiro: o gasto fica só no patrimônio. Quem cuida do Financeiro pode usar o botão “Lançar no Financeiro” depois.</div>`}
    <div style="flex:none;margin-left:auto"><button class="b" id="pcoadd">Lançar</button></div></div>`:""}
   ${O.length?`<div class="wrap"><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Data</th><th>Financeiro</th>${ed?"<th></th>":""}</tr></thead><tbody>${O.map(o=>{const f=pconcObraFin(o);
     const fin=f?`Conta paga em ${brDate(f.pago||f.venc)}${+f.valorPago!==+o.valor&&f.valorPago!=null?` <span class="sub">(no Financeiro: ${fmtBRL(+f.valorPago)})</span>`:""}`:o.finId?`<span class="sub">Excluído no Financeiro</span>`:`<span class="sub">Não lançado</span>`;
     return`<tr><td><b>${esc(o.desc)}</b>${o.contra||o.obs?`<div class="sub">${esc([o.contra?"Pago a: "+o.contra:"",o.obs].filter(Boolean).join(" · "))}</div>`:""}</td><td>${esc(o.cat||"")}</td><td class="n">${fmtBRL(+o.valor||0)}</td><td class="n">${o.data?brDate(o.data):"—"}</td><td>${fin}${!f&&finEd&&ed?` <button class="b sec" data-pcofin="${esc(o.id)}">Lançar no Financeiro</button>`:""}</td>${ed?`<td><button class="b sec" data-pcodel="${esc(o.id)}">Excluir</button></td>`:""}</tr>`}).join("")}</tbody></table></div>`:""}</details>`;
}
function pconcBaixar(fmt){
  const filtro=[PCONC.cat,PCONC.q?"busca: "+PCONC.q:""].filter(Boolean).join(" · ");
  if(PCONC.ver==="fora"){
    const F=pconcVisiveis(pconcTodos());if(!F.length)return toast("Nada nesta lista.",true);
    const sp={titulo:"Compras fora do patrimônio — Casa Hiro",sub:`Conferência · posição em ${brDate(hojeIso())}${filtro?" · "+filtro:""}`,sensivel:false,
      cols:[{h:"Item",w:36},{h:"Categoria",w:22},{h:"Qtd",t:"num",w:7},{h:"Valor total",t:"money",w:13},{h:"Aquisição",t:"date",w:11},{h:"Origem",w:22},{h:"Por que ficou de fora",w:34}],
      rows:F.map(x=>[x.nome,x.cat,x.qtd,x.total,x.data,x.origem,x.motivo||""]),tot:[null,null,"sum","sum",null,null,null]};
    (async()=>{try{
      const blob=fmt==="pdf"?await relPdf([sp],{}):await relXlsx([sp]);
      await saveFile(`patrimonio-fora_${hojeIso()}.${fmt}`,blob);
    }catch(e){console.error(e);toast("Não foi possível gerar o arquivo: "+(e&&e.message?e.message:e),true)}})();
    return;
  }
  const L=pconcVisiveis(pconcTodos()).filter(x=>x.inc);if(!L.length)return toast("Nenhum bem marcado nesta lista.",true);
  const spec={titulo:"Patrimônio da Casa Hiro",sub:`Bens, equipamentos e obras · posição em ${brDate(hojeIso())}${filtro?" · "+filtro:""}`,sensivel:false,
    cols:[{h:"Bem",w:36},{h:"Categoria",w:24},{h:"Qtd",t:"num",w:7},{h:"Valor unitário",t:"money",w:13},{h:"Valor total",t:"money",w:13},{h:"Aquisição",t:"date",w:11},{h:"Onde fica / detalhe",w:28},{h:"Origem",w:22}],
    rows:L.map(x=>[x.nome,x.cat,x.qtd,x.unit,x.total,x.data,x.onde,x.origem]),tot:[null,null,"sum",null,"sum",null,null,null]};
  (async()=>{try{
    const blob=fmt==="pdf"?await relPdf([spec],{}):await relXlsx([spec]);
    await saveFile(`patrimonio-casa-hiro_${hojeIso()}.${fmt}`,blob);
  }catch(e){console.error(e);toast("Não foi possível gerar o arquivo: "+(e&&e.message?e.message:e),true)}})();
}
function pconcBind(){
  const re=()=>go("infra",true);
  const v=$("pcver");if(v)v.onchange=()=>{PCONC.ver=v.value;PCONC.cat="";re()};
  const q=$("pcq");if(q)q.oninput=()=>{PCONC.q=q.value;re();const n=$("pcq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  document.querySelectorAll("[data-pccat]").forEach(b=>b.onclick=()=>{PCONC.cat=b.dataset.pccat;re()});
  document.querySelectorAll("[data-pck]").forEach(c=>c.onchange=()=>{
    if(!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const M={...pconcMarcas()},k=c.dataset.pck;
    if(c.checked===(c.dataset.auto==="1"))delete M[k];else M[k]=c.checked; // só guarda o que foi mudado à mão
    xcfgSave("infra",{patConc:M});re()});
  const add=$("pcoadd");if(add)add.onclick=()=>{
    if(!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const desc=$("pcodesc").value.trim(),valor=pconcValor($("pcoval").value),data=$("pcodata").value;
    if(!desc)return toast("Escreva a descrição (ex.: mão de obra dos pedreiros).",true);
    if(!(valor>0))return toast("Informe o valor (ex.: 120.000,00).",true);
    if(!data)return toast("Informe a data.",true);
    const o={id:uid8(),desc,cat:$("pcocat").value,valor:Math.round(valor*100)/100,data,contra:$("pcocontra").value.trim(),obs:$("pcoobs").value.trim()};
    const fb=$("pcofin"),noFin=!!(fb&&fb.checked&&podeEd("fin"));
    if(noFin){const cs=$("pcoconta"),e=pconcFinNovo(o,cs?cs.value:"");finMutate(l=>[...l,e]);o.finId=e.id}
    xcfgSave("infra",{patConcObras:[...pconcObras(),o]});
    toast(`Lançado: ${desc} — ${fmtBRL(o.valor)}${noFin?" (também no Financeiro, como conta paga)":""}`);re()};
  document.querySelectorAll("[data-pcofin]").forEach(b=>b.onclick=async()=>{
    if(!podeEd("fin")||!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const o=pconcObras().find(x=>x.id===b.dataset.pcofin);if(!o||pconcObraFin(o))return;
    if(!o.data)return toast("Este lançamento está sem data.",true);
    if(!await askConfirm(`Lançar "${o.desc}" (${fmtBRL(+o.valor||0)}) no Financeiro como conta paga em ${brDate(o.data)}? Se esse pagamento já estiver no Financeiro, ele vai aparecer em dobro.`,"Lançar"))return;
    const e=pconcFinNovo(o,"");finMutate(l=>[...l,e]);
    xcfgSave("infra",{patConcObras:pconcObras().map(x=>x.id===o.id?{...x,finId:e.id}:x)});
    toast("Lançado no Financeiro como conta paga.");re()});
  document.querySelectorAll("[data-pcodel]").forEach(b=>b.onclick=async()=>{
    if(!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const id=b.dataset.pcodel,o=pconcObras().find(x=>x.id===id);if(!o)return;
    if(!await askConfirm(`Excluir "${o.desc}" (${fmtBRL(+o.valor||0)}) do patrimônio?`,"Excluir"))return;
    const f=pconcObraFin(o);
    if(f&&podeEd("fin")&&await askConfirm(`Excluir também o pagamento de ${fmtBRL(+f.valorPago||+f.valor||0)} no Financeiro (${brDate(f.pago||f.venc)})?`,"Excluir do Financeiro"))finMutate(l=>l.filter(e=>e.id!==f.id));
    const M={...pconcMarcas()};delete M["m:"+id];
    xcfgSave("infra",{patConcObras:pconcObras().filter(x=>x.id!==id),patConc:M});re()});
  const x=$("pcxls");if(x)x.onclick=()=>pconcBaixar("xlsx");
  const p=$("pcpdf");if(p)p.onclick=()=>pconcBaixar("pdf");
}
{const t=PGX.infra.tabs,i=t.findIndex(x=>x.k==="ativos");t.splice(i+1,0,{k:"conc",l:"Patrimônio p/ concorrência",html:pconcHtml,bind:pconcBind})}
