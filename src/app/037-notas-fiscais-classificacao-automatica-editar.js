/* ============ Notas fiscais: classificação automática, editar e excluir ============ */
const NFN=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
// [expressão sobre o nome do item (sem acento), categoria, subcategoria, centro de custo]
const NFX_REGRAS=[
 // equipamentos e ajudas técnicas
 [/cadeira de rodas|cadeira de banho|andador|muleta|bengala|elevador de transfer|cinto de transfer|tripe|triplo apoio|banco de banho|assento sanitario elevado/,"Equipamentos e mobiliário","Mobilidade e ajudas técnicas","Fisioterapia"],
 [/cama hospitalar|colchao piramidal|colchao caixa de ovo|colchao pneumatico|colchao hospitalar|almofada anti ?escara|roda de espuma|grade de cama/,"Equipamentos e mobiliário","Camas e superfícies de apoio","Enfermagem"],
 [/oximetro|nebulizador|inalador|aspirador de secrecao|esfigmoman|tensiometro|aparelho de pressao|estetoscopio|balanca|concentrador de oxigenio|cilindro de oxigenio|glicosimetro|bomba de infusao|desfibrilador|otoscopio|monitor multiparametro/,"Equipamentos e mobiliário","Equipamentos de saúde","Enfermagem"],
 [/geladeira|refrigerador|freezer|fogao|forno|microondas|micro ondas|liquidificador|batedeira|processador|fritadeira|panela de pressao|cafeteira|ventilador|ar condicionado|climatizador|televisao|\btv\b|maquina de lavar|lavadora|secadora|aspirador de po|bebedouro|purificador|chuveiro eletrico|ferro de passar/,"Equipamentos e mobiliário","Eletrodomésticos e eletrônicos","Almoxarifado"],
 [/armario|mesa|poltrona|sofa|estante|cadeira|\bbanco\b|escrivaninha|gaveteiro|arquivo|rack|guarda roupa|comoda|criado mudo|balcao|prateleira|cabideiro|biombo|longarina/,"Equipamentos e mobiliário","Mobiliário","Almoxarifado"],
 // enfermagem
 [/fralda|absorvente geriatrico|protetor de cama|traversa|tira de incontinencia|\bpant\b|lenco umedecido|bolsa de colostomia|bolsa coletora|urinol|comadre|papagaio/,"Material de enfermagem","Fraldas e incontinência","Enfermagem"],
 [/luva|mascara|touca|propé|prope|avental descart|seringa|agulha|gaze|compressa|atadura|esparadrapo|micropore|algodao|cotonete|campo cirurgico|lenco de papel|lencol descart/,"Material de enfermagem","Descartáveis e material médico-hospitalar","Enfermagem"],
 [/curativo|hidrocoloide|alginato|bandagem|faixa|ligadura|filme transparente|colar cervical|tala|ortese|joelheira|munhequeira|meia de compressao|meia elastica/,"Material de enfermagem","Curativos e ortopedia","Enfermagem"],
 [/sonda|cateter|equipo|scalp|abocath|jelco|coletor|dreno|extensor|torneirinha|nutricao enteral frasco|bureta/,"Material de enfermagem","Sondas, cateteres e infusão","Enfermagem"],
 [/termometro|tira de glicemia|fita de glicemia|lanceta|lancetas|teste rapido/,"Material de enfermagem","Medição e monitoramento","Enfermagem"],
 // medicamentos
 [/dipirona|paracetamol|ibuprofeno|tramadol|codeina|morfina|diclofenaco|naproxeno|cetoprofeno|buscopan|escopolamina|analgesic|antitermic/,"Medicamentos","Analgésicos e antitérmicos","Enfermagem"],
 [/losartana|enalapril|captopril|anlodipino|atenolol|metoprolol|carvedilol|furosemida|hidroclorotiazida|espironolactona|sinvastatina|atorvastatina|rosuvastatina|varfarina|clopidogrel|aas\b|acido acetilsalicilico|digoxina|isossorbida/,"Medicamentos","Cardiovasculares","Enfermagem"],
 [/insulina|metformina|glibenclamida|gliclazida|levotiroxina|puran|prednisona|prednisolona|dexametasona|hidrocortisona/,"Medicamentos","Endócrinos e corticoides","Enfermagem"],
 [/omeprazol|pantoprazol|ranitidina|domperidona|metoclopramida|ondansetrona|lactulona|lactulose|simeticona|bisacodil|loperamida|sais de reidrat/,"Medicamentos","Gastrointestinais","Enfermagem"],
 [/quetiapina|risperidona|haloperidol|clonazepam|diazepam|alprazolam|sertralina|fluoxetina|escitalopram|amitriptilina|donepezila|memantina|rivastigmina|carbamazepina|fenitoina|fenobarbital|acido valproico|levodopa|pramipexol|biperideno|zolpidem|mirtazapina|trazodona|melatonina/,"Medicamentos","Neurológicos e psiquiátricos","Enfermagem"],
 [/amoxicilina|azitromicina|ciprofloxacino|cefalexina|ceftriaxona|metronidazol|sulfametoxazol|claritromicina|levofloxacino|nitrofurantoina|antibiot|fluconazol|nistatina/,"Medicamentos","Antibióticos e antifúngicos","Enfermagem"],
 [/vitamina|calcio|vitamina d|colecalciferol|omega|suplemento vitaminico|complexo b|\bferro\b|acido folico|sulfato ferroso|polivitaminico|zinco|magnesio/,"Medicamentos","Vitaminas e suplementos","Enfermagem"],
 [/alcool|clorexidina|iodopovidona|povidine|peroxido|agua oxigenada|antisseptic|alcool gel|alcool 70/,"Medicamentos","Antissépticos","Enfermagem"],
 [/pomada|creme dermatologico|\bgel\b|colirio|spray nasal|xarope|gotas|oleo mineral|hipoglos|dersani|oleo de girassol|nebacetin|bepantol|sabonete medicinal|lubrificante ocular/,"Medicamentos","Tópicos, colírios e xaropes","Enfermagem"],
 [/soro|ampola|frasco ampola|agua para injecao|solucao fisiologica|ringer|glicose|cloreto de sodio|heparina|enoxaparina|ketorolaco|dimenidrinato/,"Medicamentos","Soros e injetáveis","Enfermagem"],
 [/comprimid|capsula|medicament|generico|\bmg\b|\bmcg\b/,"Medicamentos","Outros medicamentos","Enfermagem"],
 // alimentação
 [/suplemento alimentar|espessante|thicken|dieta enteral|nutren|ensure|sustagen|fresubin|nutrison|nutridrink|fortifit|proteina em po|whey|modulo de|leite especial|dieta hospitalar|nutricao enteral/,"Alimentação","Dietas e suplementos nutricionais","Cozinha"],
 [/alface|tomate|cebola|batata|cenoura|abobora|chuchu|beterraba|repolho|couve|brocolis|pepino|pimentao|\balho\b|banana|\bmaca\b|laranja|mamao|melancia|manga|abacaxi|\buvas?\b|limao|\bpera\b|morango|abacate|fruta|verdura|legume|hortifruti|mandioca|inhame|vagem|abobrinha|berinjela|cheiro verde|salsa|coentro|cebolinha/,"Alimentação","Hortifrúti","Cozinha"],
 [/carne|frango|peito de|coxa|file|patinho|acem|musculo|alcatra|picanha|linguica|salsicha|presunto|mortadela|bacon|peixe|tilapia|sardinha|atum|bacalhau|camarao|hamburguer|carne moida|bife|costela|fígado|figado|moela|\bovos?\b/,"Alimentação","Carnes, peixes e ovos","Cozinha"],
 [/leite|queijo|iogurte|manteiga|margarina|requeijao|creme de leite|leite condensado|coalhada|ricota|mussarela|muçarela|danoninho|nata|cream cheese/,"Alimentação","Laticínios","Cozinha"],
 [/arroz|feijao|macarrao|farinha|fuba|aveia|tapioca|cuscuz|lentilha|grao de bico|ervilha|milho|oleo de soja|azeite|\bsal\b|acucar|cafe|achocolatado|biscoito|bolacha|cereal|molho de tomate|extrato de tomate|vinagre|tempero|maionese|ketchup|gelatina|pudim|fermento|amido|maizena|goiabada|doce de|geleia|bolo|torrada|granola|farofa|\bsopa\b|caldo/,"Alimentação","Mercearia","Cozinha"],
 [/pao|paes|baguete|pao de forma|rosca|croissant|broa/,"Alimentação","Padaria","Cozinha"],
 [/suco|refrigerante|agua mineral|agua com gas|\bcha\b|cha mate|bebida|galao de agua|agua potavel|garrafao/,"Alimentação","Bebidas","Cozinha"],
 // limpeza
 [/detergente|desinfetante|multiuso|limpa vidro|limpador|desengordurante|cloro|agua sanitaria|alvejante|sapolio|lysoform|\bveja\b|pinho|lustra|cera|limpa piso|bactericida|sanitizante|odorizador|aromatizador/,"Limpeza e higiene","Detergentes e desinfetantes","Aux de Limpeza"],
 [/sabao em po|amaciante|sabao liquido|sabao em barra|lava roupa|tira manchas|vanish|alvejante para roupa|\bariel\b/,"Limpeza e higiene","Lavanderia","Aux de Limpeza"],
 [/papel higienico|papel toalha|guardanapo|saco de lixo|saco plastico|toalha de papel|lenco de papel|papel absorvente|saco para lixo|sacolas/,"Limpeza e higiene","Papéis e sacos","Aux de Limpeza"],
 [/vassoura|rodo|esponja|pano de chao|pano de prato|flanela|balde|escova de lavar|luva de limpeza|pa de lixo|mop|esfregao|bucha|lixeira|cesto|dispenser|saboneteira/,"Limpeza e higiene","Utensílios de limpeza","Aux de Limpeza"],
 // higiene pessoal
 [/shampoo|condicionador|sabonete|creme dental|pasta de dente|escova de dente|fio dental|enxaguante|desodorante|hidratante|talco|barbeador|lamina de barbear|espuma de barbear|cotonete|lenco umedecido|absorvente|fralda infantil|colonia|perfume|cortador de unha|alicate de unha|pente|escova de cabelo|protetor solar|locao|oleo corporal|dentadura|fixador de dentadura|polident/,"Higiene pessoal e conforto","Higiene e cuidados pessoais","Enfermagem"],
 // enxoval
 [/lencol|fronha|toalha de banho|toalha de rosto|cobertor|manta|edredom|colcha|travesseiro|cortina|tapete|jogo de cama|roupao|pijama|camisola|uniforme|jaleco|avental|calca|camisa|blusa|\bmeias?\b|cueca|calcinha|chinelo|sapato|tenis|bermuda|bata|camiseta/,"Enxoval e uniformes","Roupa de cama, banho e vestuário","Aux de Limpeza"],
 // cozinha utensílios
 [/copo descart|prato descart|talher descart|marmita|marmitex|embalagem|filme pvc|papel aluminio|papel manteiga|pote|tupperware|saco de vacuo|bandeja|guardanapo|palito|canudo|pegador|luva de cozinha/,"Utensílios e descartáveis","Descartáveis e embalagens","Cozinha"],
 [/panela|frigideira|prato|copo|talher|garfo|faca|colher|xicara|jarra|travessa|assadeira|forma|tabua|peneira|concha|escumadeira|ralador|abridor|garrafa termica|termica|caneca|tigela|bowl|espatula|descascador|marmitex/,"Utensílios e descartáveis","Utensílios de cozinha e mesa","Cozinha"],
 // escritório e TI
 [/papel a4|sulfite|caneta|lapis|borracha|grampeador|grampo|clips|\bpasta\b|arquivo morto|envelope|etiqueta|fita adesiva|\bcola\b|tesoura|post it|bloco de notas|caderno|agenda|livro ata|toner|cartucho|tinta para impressora|carimbo|prancheta|fichario|perfurador|calculadora/,"Material de escritório","Papelaria e suprimentos","Administrativo"],
 [/computador|notebook|monitor|mouse|teclado|impressora|roteador|switch|cabo hdmi|cabo de rede|pen drive|hd externo|ssd|nobreak|estabilizador|celular|smartphone|tablet|webcam|headset|camera de seguranca|dvr|antivirus|licenca|software|toner/,"Tecnologia","Equipamentos e suprimentos de TI","Administrativo"],
 // manutenção
 [/lampada|tomada|interruptor|disjuntor|fio eletrico|cabo flexivel|fita isolante|reator|luminaria|extensao|benjamim|pilha|bateria|plug|chuveiro|resistencia|rele|fusivel|spot|refletor|led/,"Manutenção e reparos","Elétrica e iluminação","Manutenção"],
 [/torneira|registro|cano|tubo pvc|joelho|luva pvc|sifao|valvula|caixa dagua|boia|vaso sanitario|assento sanitario|mangueira|flexivel|veda rosca|cola pvc|ralo|descarga|engate|conexao|fita veda/,"Manutenção e reparos","Hidráulica","Manutenção"],
 [/tinta|rolo de pintura|pincel|massa corrida|selador|verniz|thinner|solvente|lixa|cimento|areia|argamassa|tijolo|reboco|gesso|rejunte|piso|azulejo|ceramica|porta|janela|fechadura|dobradica|parafuso|prego|bucha|furadeira|martelo|chave de fenda|alicate|serra|trena|escada|ferramenta|cadeado|silicone|massa epoxi|barra de apoio|corrimao|antiderrapante|fita antiderrapante/,"Manutenção e reparos","Construção, pintura e ferramentas","Manutenção"],
 [/dedetiz|desentup|jardin|poda|grama|adubo|\bterra\b|vaso|semente|muda|fertiliz|inseticida|raticida|veneno|repelente/,"Manutenção e reparos","Jardinagem e controle de pragas","Manutenção"],
 // segurança
 [/extintor|sinalizacao|placa de|detector de fumaca|lanterna|capacete|bota de seguranca|oculos de protecao|protetor auricular|cinto de seguranca|epi\b|colete|mascara pff|respirador/,"Segurança e EPI","Segurança e proteção","Manutenção"],
 // lazer
 [/jogo|quebra cabeca|domino|baralho|bingo|damas|xadrez|\bbola\b|massinha|tinta guache|papel colorido|cartolina|\beva\b|tecido para|\bla\b|croche|agulha de croche|bordado|violao|instrumento|caixa de som|karaoke|dvd|livro|revista|jornal|palavras cruzadas|giz de cera|aquarela|pintura em tela/,"Atividades e lazer","Terapia ocupacional e recreação","Recepção"],
 // transporte
 [/gasolina|etanol|diesel|combustivel|oleo do motor|oleo de motor|pneu|filtro de oleo|filtro de ar|pastilha|bateria automotiva|lavagem|estacionamento|pedagio|alinhamento|balanceamento|revisao|licenciamento|ipva|seguro auto/,"Veículos e transporte","Combustível e manutenção de veículos","Administrativo"],
 // serviços
 [/servico|mao de obra|frete|entrega|\btaxa\b|honorario|consulta|exame|laudo|assistencia tecnica|conserto|reparo|instalacao|locacao|aluguel|mensalidade|assinatura|internet|telefone|energia|agua e esgoto|\bgas\b|botijao|glp|monitoramento|vigilancia|lavanderia terceir|coleta de lixo|residuos/,"Serviços e contas","Serviços contratados e contas de consumo","Administrativo"]
];
const NFX_CC={"Equipamentos e mobiliário":"Almoxarifado","Material de enfermagem":"Enfermagem","Medicamentos":"Enfermagem","Alimentação":"Cozinha","Limpeza e higiene":"Aux de Limpeza","Higiene pessoal e conforto":"Enfermagem","Enxoval e uniformes":"Aux de Limpeza","Utensílios e descartáveis":"Cozinha","Material de escritório":"Administrativo","Tecnologia":"Administrativo","Manutenção e reparos":"Manutenção","Segurança e EPI":"Manutenção","Atividades e lazer":"Recepção","Veículos e transporte":"Administrativo","Serviços e contas":"Administrativo"};
// o que já foi lançado ensina o sistema: mesmo item = mesma categoria
function nfAprendido(nome,store){
  const n=NFN(nome);if(!n)return null;const rows=((store||S.config.nf||{}).rows||[]);
  const cont={};
  rows.forEach(r=>{if(!r.categoria||r.categoria==="A classificar"||!r.subcategoria||r.subcategoria==="A classificar"||r.subcategoria==="Sem subcategoria"||r.categoria==="Outros")return;const m=NFN(r.item);
    if(m===n||(n.length>=6&&m.length>=6&&(m.includes(n)||n.includes(m)))){const k=r.categoria+"|"+r.subcategoria+"|"+(r.cc||"");cont[k]=(cont[k]||0)+(m===n?3:1)}});
  const top=Object.keys(cont).sort((a,b)=>cont[b]-cont[a])[0];if(!top)return null;const[cat,sub,cc]=top.split("|");return{cat,sub,cc:cc||NFX_CC[cat]||"",via:"aprendido"};
}
function nfClassificaX(r,store){
  const nome=r.item||"";
  const ap=nfAprendido(nome,store);if(ap)return ap;
  const n=NFN(nome);
  for(const g of NFX_REGRAS)if(g[0].test(n))return{cat:g[1],sub:g[2],cc:g[3],via:"regra"};
  const b=(typeof nfClassificaBase==="function")?nfClassificaBase(r):null;
  return b?{...b,via:"regra"}:null;
}
// quando nenhuma regra reconhece, o Claude (capacidade "sample") identifica o produto
async function nfClassificaIA(nomes){
  if(!RT.sample||!nomes.length)return {};
  const store=S.config.nf||{rows:[]};
  const conhecidas={};(store.rows||[]).forEach(r=>{if(r.categoria&&r.categoria!=="A classificar"){(conhecidas[r.categoria]=conhecidas[r.categoria]||new Set()).add(r.subcategoria)}});
  NFX_REGRAS.forEach(g=>{(conhecidas[g[1]]=conhecidas[g[1]]||new Set()).add(g[2])});
  const lista=Object.keys(conhecidas).map(c=>c+": "+[...conhecidas[c]].filter(s=>s&&s!=="A classificar").slice(0,12).join(" / ")).join("\n");
  const lim=nomes.slice(0,60);
  const prompt=`Você classifica itens de notas fiscais de uma casa de repouso para idosos (Casa Hiro).\nPara cada item da lista, identifique o que é o produto e devolva categoria e subcategoria. Prefira usar uma categoria e subcategoria que já existam abaixo; só crie nova se nenhuma servir. Responda APENAS um JSON no formato [{"i":0,"cat":"...","sub":"..."}], sem comentários. Se não souber, use cat "Outros" e sub "Diversos".\n\nCategorias existentes:\n${lista}\n\nItens:\n${lim.map((n,i)=>i+": "+n).join("\n")}`;
  try{
    const j=await RT.sample.json(prompt,{modelTier:"quick"});
    const out={};(Array.isArray(j)?j:[]).forEach(x=>{const nm=lim[+x.i];if(nm&&x.cat)out[nm]={cat:String(x.cat).slice(0,60),sub:String(x.sub||"Diversos").slice(0,80),cc:NFX_CC[x.cat]||"",via:"ia"}});
    return out;
  }catch(e){return {}}
}
// preenche (na tela de conferência) o que as regras não reconheceram
async function nfIAPreenche(ov,novas){
  const falta=[];novas.forEach((n,i)=>n.rows.forEach((r,j)=>{if(r._cat==="A classificar")falta.push({i,j,nome:r.item})}));
  if(!falta.length||!RT.sample)return;
  const aviso=document.createElement("div");aviso.className="sub";aviso.style.margin="6px 0";aviso.textContent="Identificando "+falta.length+" item(ns) que as regras não reconheceram…";
  const alvo=ov.querySelector("#nfcats");if(alvo)alvo.parentNode.insertBefore(aviso,alvo.nextSibling);
  const res=await nfClassificaIA([...new Set(falta.map(f=>f.nome))]);
  let n=0;
  falta.forEach(f=>{const k=res[f.nome];if(!k)return;const box=ov.querySelector(`details[data-nota="${f.i}"]`),tr=box&&box.querySelector(`tr[data-item="${f.j}"]`);if(!tr)return;
    const c=tr.querySelector('[data-r="cat"]'),s=tr.querySelector('[data-r="sub"]');if(c&&s&&(c.value==="A classificar"||!c.value)){c.value=k.cat;s.value=k.sub;novas[f.i].rows[f.j]._cc=k.cc;n++}});
  aviso.textContent=n?n+" item(ns) identificado(s) automaticamente — confira antes de lançar.":"Não consegui identificar alguns itens: preencha a categoria deles.";
}
// ---- reclassificar o que já está lançado como "A classificar"
async function nfReclassifica(){
  const st=S.config.nf;if(!st||!st.rows)return;
  const pend=st.rows.filter(r=>!r.categoria||r.categoria==="A classificar"||!r.subcategoria||r.subcategoria==="A classificar"||r.subcategoria==="Sem subcategoria"||r.categoria==="Outros");
  if(!pend.length)return toast("Todos os itens já estão classificados.");
  toast("Classificando "+pend.length+" item(ns)…");
  const ia=await nfClassificaIA([...new Set(pend.map(r=>r.item))].filter(n=>!nfClassificaX({item:n},{rows:[]})));
  let n=0;
  const rows=st.rows.map(r=>{
    if(!(!r.categoria||r.categoria==="A classificar"||!r.subcategoria||r.subcategoria==="A classificar"||r.subcategoria==="Sem subcategoria"||r.categoria==="Outros"))return r;
    const k=nfClassificaX(r,st)||ia[r.item];if(!k)return r;n++;return{...r,categoria:k.cat,subcategoria:k.sub,...(k.cc&&!r.cc?{cc:k.cc}:{})};
  });
  if(n&&nfSave(rows,st.fileName)){toast(n+" item(ns) classificado(s) automaticamente.");go("nf",true)}else toast("Não reconheci nenhum dos itens pendentes.",true);
}
// ---- notas lançadas: editar e excluir
const NFE={ver:30};
function nfGrupos(rows){
  const m=new Map();
  rows.forEach((r,idx)=>{const k=nfKey(r);let g=m.get(k);if(!g){g={k,nota:r.nota,notaForn:r.notaForn,arq:null,local:r.local||"",date:r.date||"",idx:[],total:0};m.set(k,g)}g.idx.push(idx);g.total+=(+r.total||0);if(r.arq&&!g.arq)g.arq=r.arq});
  return [...m.values()].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||String(b.nota).localeCompare(String(a.nota)));
}
function nfNotasCard(){
  const st=S.config.nf;if(!st||!st.rows||!st.rows.length)return "";
  const gs=nfGrupos(st.rows),q=(NFUI&&NFUI.q)||"";
  const l=gs.filter(g=>!q||(String(g.nota)+" "+g.local+" "+st.rows.filter((r,i)=>g.idx.includes(i)).map(r=>r.item).join(" ")).toLowerCase().includes(q));
  const pend=st.rows.filter(r=>!r.categoria||r.categoria==="A classificar"||!r.subcategoria||r.subcategoria==="A classificar"||r.subcategoria==="Sem subcategoria"||r.categoria==="Outros").length;
  return `<div class="card"><h2>Notas lançadas</h2><p class="sub" style="margin:0 0 10px">Para corrigir um item, trocar um valor ou tirar uma nota lançada por engano, use Editar ou Excluir. A próxima nota recebe o <b>Nº ${esc(nfProximoNumero())}</b>, na sequência da sua planilha.</p>
   <div style="margin-bottom:10px"><button class="b sm" id="nfxlsx">${ic("sheet")} Baixar planilha de notas (.xlsx)</button></div>
   ${pend?`<div class="callout sand" style="margin-bottom:10px">${pend} item(ns) sem categoria/subcategoria. <button class="b sm" id="nfreclas" style="margin-left:6px">Classificar automaticamente</button></div>`:""}
   ${l.slice(0,NFE.ver).map(g=>`<div class="doc"><div class="grow"><div class="nm">Nº ${esc(g.nota==null?"s/n":String(g.nota))} — ${esc(g.local||"sem fornecedor")}</div><div class="sub">${brDate(g.date)||"sem data"} · ${g.idx.length} item(ns) · ${fmtBRL(g.total)}${g.notaForn&&g.notaForn!==g.nota?` · nota do fornecedor ${esc(g.notaForn)}`:""}</div></div>
     ${g.arq&&S.nfarq[g.arq]?`<button class="b sec sm" data-nfarq="${g.arq}" title="Baixar a nota fiscal anexada">${ic("receipt")}</button> `:""}<button class="b sec sm" data-nfed="${esc(g.k)}">${ic("edit")} Editar</button> <button class="b sec sm" data-nfdl="${esc(g.k)}" title="Excluir a nota">${ic("trash")}</button></div>`).join("")||`<div class="empty">Nenhuma nota encontrada.</div>`}
   ${l.length>NFE.ver?`<button class="b sec sm" id="nfmais" style="margin-top:8px">Mostrar mais (${l.length-NFE.ver})</button>`:""}</div>`;
}
function nfNotasBind(){
  const b=$("nfreclas");if(b)b.onclick=nfReclassifica;
  const xl=$("nfxlsx");if(xl)xl.onclick=nfExportaPlanilha;
  const m=$("nfmais");if(m)m.onclick=()=>{NFE.ver+=30;go("nf",true)};
  document.querySelectorAll("[data-nfed]").forEach(x=>x.onclick=()=>nfEditaNota(x.dataset.nfed));
  document.querySelectorAll("[data-nfdl]").forEach(x=>x.onclick=()=>nfExcluiNota(x.dataset.nfdl));
}
async function nfExcluiNota(k){
  const st=S.config.nf;if(!st)return;const g=nfGrupos(st.rows).find(x=>x.k===k);if(!g)return;
  const ligadas=finAll().filter(e=>e.nf&&(e.nf===k||e.nf===g.nota||e.nf===g.notaForn)&&!e.pago);
  const movs=movAll().filter(m=>m.nf===k&&m.tipo==="entrada");
  if(!await askConfirm(`Excluir a NF ${g.nota==null?"s/n":g.nota} — ${g.local||"sem fornecedor"} (${g.idx.length} item(ns), ${fmtBRL(g.total)})? Dá para desfazer logo em seguida.`,"Excluir nota"))return;
  let tirarFin=false;
  if(ligadas.length)tirarFin=await askConfirm(`Esta nota tem ${ligadas.length} vencimento(s) em aberto em Contas a pagar. Remover também?`,"Remover vencimentos");
  const rows=st.rows.filter((r,i)=>!g.idx.includes(i));
  if(!nfSave(rows,st.fileName))return;
  if(tirarFin){const ids=new Set(ligadas.map(e=>e.id));finMutate(all=>all.filter(e=>!ids.has(e.id)))}
  toast("Nota excluída."+(movs.length?` A entrada no estoque (${movs.length} movimento(s)) não é desfeita sozinha: ajuste o estoque se precisar.`:""));
  go("nf",true);
}
function nfEditaNota(k){
  const st=S.config.nf;if(!st)return;const g=nfGrupos(st.rows).find(x=>x.k===k);if(!g)return;
  const itens=g.idx.map(i=>({...st.rows[i]}));
  const cats=[...new Set(st.rows.map(r=>r.categoria).filter(Boolean).concat(Object.keys(NFX_CC)))],subs=[...new Set(st.rows.map(r=>r.subcategoria).filter(Boolean).concat(NFX_REGRAS.map(x=>x[2])))];
  const lin=(r,j)=>`<tr data-j="${j}"><td><input data-f="item" value="${esc(r.item||"")}" style="min-width:170px"></td><td><input data-f="qtd" inputmode="decimal" value="${r.qtd??""}" style="width:64px"></td><td><input data-f="valor" inputmode="decimal" value="${r.valor??""}" style="width:80px"></td><td><input data-f="total" inputmode="decimal" value="${r.total??""}" style="width:90px"></td>
    <td><input data-f="categoria" list="nfecats" value="${esc(r.categoria||"")}" style="min-width:140px"></td><td><input data-f="subcategoria" list="nfesubs" value="${esc(r.subcategoria||"")}" style="min-width:140px"></td><td><button type="button" class="b sec sm" data-rm title="Remover este item">${ic("trash")}</button></td></tr>`;
  const ov=openModal(`<h3>Editar nota fiscal</h3>
   <div class="grid g2"><div><label>Fornecedor</label><input id="nef" value="${esc(g.local)}"></div><div><label>Nº no sistema (sequência da planilha)</label><input id="nen" value="${esc(g.nota==null?"":g.nota)}"></div><div><label>Emissão</label><input type="date" id="ned" value="${esc(g.date||"")}"></div></div>
   <datalist id="nfecats">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist><datalist id="nfesubs">${subs.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
   <div class="wrap" style="margin-top:10px"><table><thead><tr><th>Item</th><th class="n">Qtd</th><th class="n">Valor un.</th><th class="n">Total</th><th>Categoria</th><th>Subcategoria</th><th></th></tr></thead><tbody id="nebody">${itens.map(lin).join("")}</tbody></table></div>
   <button type="button" class="b sec sm" id="neadd" style="margin-top:8px">${ic("plus")} Item</button>
   <div class="sub" style="margin-top:8px">Se deixar a categoria vazia, o sistema identifica sozinho pelo nome do item. Para tirar um item errado, use a lixeira da linha.</div>
   <div class="err" id="neerr"></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="necx">Cancelar</button><button class="b" id="nesv">Salvar</button></div>`);
  ov.querySelector(".modal").classList.add("largo");
  const body=ov.querySelector("#nebody"),bindRm=()=>body.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>b.closest("tr").remove());bindRm();
  ov.querySelector("#neadd").onclick=()=>{body.insertAdjacentHTML("beforeend",lin({},itens.length+body.children.length+100));bindRm()};
  ov.querySelector("#necx").onclick=()=>ov.remove();
  let gravado=false;
  ov.querySelector("#nesv").onclick=()=>{
    if(gravado)return;const er=m=>ov.querySelector("#neerr").textContent=m,pn=v=>{const x=+String(v).trim().replace(",",".");return isFinite(x)?x:NaN};
    const forn=ov.querySelector("#nef").value.trim(),nota=ov.querySelector("#nen").value.trim(),date=ov.querySelector("#ned").value;
    if(!forn)return er("Informe o fornecedor.");
    if(nota!==""&&st.rows.some((r,i)=>!g.idx.includes(i)&&String(r.nota)===nota))return er("O número "+nota+" já está em uso por outra nota.");
    if(date&&!(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>="1990-01-01"&&date<="2100-12-31"))return er("Confira a data de emissão (ano inválido).");
    const novos=[];
    for(const tr of body.querySelectorAll("tr")){
      const f=n=>tr.querySelector(`[data-f="${n}"]`).value.trim(),j=+tr.dataset.j,base=itens[j]||{};
      const item=f("item");if(!item)continue;
      const qtd=f("qtd")===""?1:pn(f("qtd")),valor=f("valor")===""?0:pn(f("valor"));let total=f("total")===""?NaN:pn(f("total"));
      if(!(qtd>0)||qtd>1e7)return er(`Quantidade inválida em "${item}".`);
      if(!(valor>=0)||valor>1e9)return er(`Valor inválido em "${item}".`);
      if(isNaN(total))total=+(qtd*valor).toFixed(2);
      if(!(total>=0)||total>1e9)return er(`Total inválido em "${item}".`);
      let cat=f("categoria"),sub=f("subcategoria");
      if(!cat||!sub||cat==="A classificar"){const c=nfClassificaX({item,ncm:base.ncm},{rows:st.rows.filter((r,i)=>!g.idx.includes(i))});if(c){if(!cat||cat==="A classificar")cat=c.cat;if(!sub||sub==="A classificar")sub=c.sub}}
      const o={...base,item,qtd,valor,total,categoria:cat||"A classificar",subcategoria:sub||"A classificar",local:forn,date:date||"",nota:nota===""?base.nota:(/^\d+$/.test(nota)?nota:nota)};
      if(!date)delete o.date;
      novos.push(o);
    }
    if(!novos.length)return er("A nota ficou sem itens. Para tirar a nota inteira, use Excluir.");
    gravado=true;
    const rows=[];let pos=false;
    st.rows.forEach((r,i)=>{if(g.idx.includes(i)){if(!pos){rows.push(...novos);pos=true}}else rows.push(r)});
    if(!nfSave(rows,st.fileName)){gravado=false;return}
    ov.remove();toast("Nota atualizada.");go("nf",true);
  };
}

/* ---- numeração própria da planilha e exportação no mesmo padrão ---- */
function nfProximoNumero(extra){
  const rows=((S.config.nf||{}).rows||[]);
  const lista=rows.filter(r=>!((r.xml||r.lida)&&!r.notaForn)).map(r=>r.nota).filter(v=>v!=null&&v!=="");
  if(extra!=null&&extra!=="")lista.push(extra);
  const itens=lista.map(v=>String(v).trim()).map(s=>{const m=s.match(/^(.*?)(\d+)$/);return m?{p:m[1],n:+m[2],raw:m[2]}:null}).filter(Boolean);
  if(!itens.length)return "1";
  const pf={};itens.forEach(i=>pf[i.p]=(pf[i.p]||0)+1);
  const p=Object.keys(pf).sort((a,b)=>pf[b]-pf[a])[0];
  const mx=itens.filter(i=>i.p===p).reduce((a,i)=>i.n>a.n?i:a);
  const prox=String(mx.n+1),pad=/^0\d/.test(mx.raw)?mx.raw.length:0;
  return p+prox.padStart(pad,"0");
}
const NFROLE=l=>{const L=nfNorm(l);return L==="n"?"num":L==="data"?"data":L==="item"?"item":L==="local"?"local":L==="valor"?"valor":L==="quantidade"?"qtd":L.startsWith("desconto")?"desconto":L==="total"?"total":L==="categoria"?"categoria":L==="subcategoria"?"subcategoria":""};
// guarda o desenho da planilha enviada (aba, linhas acima do cabeçalho, ordem e nomes das colunas, formatos)
function nfCapturaFmt(wb){
  try{
    const sn=wb.SheetNames.includes("Página1")?"Página1":wb.SheetNames[0],sh=wb.Sheets[sn];
    const aoa=XLSX.utils.sheet_to_json(sh,{header:1,raw:true,defval:null});
    let hr=-1;
    for(let r=0;r<Math.min(aoa.length,15);r++){const row=aoa[r];if(!row)continue;const ro=row.map(NFROLE);if(ro.includes("item")&&ro.includes("categoria")&&ro.includes("subcategoria")){hr=r;break}}
    if(hr<0)return null;
    const ref=XLSX.utils.decode_range(sh["!ref"]||"A1"),r0=ref.s.r,c0=ref.s.c;
    const head=aoa[hr].map(c=>c==null?"":String(c)),roles=head.map(NFROLE);
    const fmt={sheet:sn,head,roles,pre:aoa.slice(0,hr).map(r=>(r||[]).map(c=>c==null?null:c instanceof Date?c.toISOString().slice(0,10):c)),z:{},wch:[]};
    roles.forEach((ro,c)=>{
      const col=(sh["!cols"]||[])[c0+c];if(col&&(col.wch||col.wpx))fmt.wch[c]=col.wch||Math.round(col.wpx/7);
      if(!ro)return;
      for(let i=hr+1;i<Math.min(aoa.length,hr+40);i++){const cell=sh[XLSX.utils.encode_cell({r:r0+i,c:c0+c})];if(cell&&cell.z&&cell.v!=null){fmt.z[ro]=cell.z;break}}
    });
    return fmt;
  }catch(e){return null}
}
const NF_FMT_PADRAO={sheet:"Página1",head:["Nº","Data","Item","Local","Valor","Quantidade","Desconto","Total","Categoria","Subcategoria"],roles:["num","data","item","local","valor","qtd","desconto","total","categoria","subcategoria"],pre:[],z:{data:"dd/mm/yyyy",valor:'#,##0.00',desconto:'#,##0.00',total:'#,##0.00'},wch:[8,12,38,24,12,12,12,12,22,26]};
async function nfExportaPlanilha(){
  const st=S.config.nf||{},linhas=st.rows||[];
  if(typeof ExcelJS==="undefined")return toast("Biblioteca de planilha não carregou. Recarregue a página.",true);
  try{
    const fmt=st.fmt&&st.fmt.head&&st.fmt.roles?st.fmt:NF_FMT_PADRAO,roles=fmt.roles,nC=roles.length,L=colLetter(nC),HR=7,R0=HR+1,EM_BRANCO=100;
    const VERDE="FF1E5C2A",VMED="FF2E7D32",AREIA="FFF5EFE0",LINHA="FFE8DFCC",TXT="FF444444",BRANCO="FFFFFFFF",MUTE="FF8A8577",DIN='"R$" #,##0.00';
    const F=a=>({type:"pattern",pattern:"solid",fgColor:{argb:a}});
    const wb=new ExcelJS.Workbook();wb.creator="Casa Hiro";wb.created=new Date();
    const ws=wb.addWorksheet("Notas fiscais");
    pageBox(ws,"landscape");
    ws.columns=fmt.head.map((h,c)=>({width:fmt.wch&&fmt.wch[c]||NF_FMT_PADRAO.wch[NF_FMT_PADRAO.roles.indexOf(roles[c])]||Math.max(10,Math.min(40,String(h).length+4))}));
    for(let r=1;r<=4;r++)for(let c=1;c<=nC;c++)ws.getCell(r,c).fill=F(r===4?VMED:VERDE);
    [20,20,17,21,30,20].forEach((h,i)=>ws.getRow(i+1).height=h);
    ws.mergeCells(`A1:${L}2`);const a1=ws.getCell("A1");a1.value="CASA HIRO";a1.font={name:"Georgia",bold:true,size:22,color:{argb:BRANCO}};a1.alignment={vertical:"middle",horizontal:"left",indent:6};
    ws.mergeCells(`A3:${L}3`);const a3=ws.getCell("A3");a3.value="A ciência do cuidado com o acolhimento de casa.";a3.font={name:"Georgia",italic:true,size:10,color:{argb:"FFD6EDD8"}};a3.alignment={vertical:"middle",horizontal:"left",indent:6};
    ws.mergeCells(`A4:${L}4`);const a4=ws.getCell("A4");a4.value="Notas fiscais";a4.font={name:"Georgia",bold:true,size:13,color:{argb:BRANCO}};a4.alignment={vertical:"middle",horizontal:"center"};
    ws.mergeCells(`A5:${L}5`);const a5=ws.getCell("A5");
    a5.value="Para lançar: preencha as linhas em branco no fim da lista e envie este arquivo em Notas fiscais > Dar entrada em nota fiscal. Itens da mesma nota usam o mesmo Nº. As notas que já estão no sistema não são alteradas.";
    a5.font={name:"Calibri",italic:true,size:9.5,color:{argb:MUTE}};a5.alignment={vertical:"middle",horizontal:"left",wrapText:true};
    try{const lg=await logosMarca(),img=wb.addImage({base64:lg.branco,extension:"png"});ws.addImage(img,{tl:{col:.2,row:.15},ext:{width:32,height:44}})}catch(e){console.warn("logotipo fora da planilha",e)}
    roles.forEach((ro,c)=>{const h=ws.getCell(HR,c+1);h.value=fmt.head[c];h.font={name:"Calibri",bold:true,size:10,color:{argb:BRANCO}};h.fill=F(VMED);h.alignment={horizontal:"center",vertical:"middle",wrapText:true};h.border=thinBorder(LINHA)});
    ws.getRow(HR).height=28;
    const num=v=>v!=null&&v!==""&&/^-?\d+$/.test(String(v).trim())&&String(v).trim().length<16&&!/^0\d/.test(String(v).trim())?+String(v).trim():v;
    const valor=(r,ro,c)=>{switch(ro){
      case"num":return r.nota==null?null:num(r.nota);case"data":return xlDateOnly(r.date);
      case"item":return r.item||null;case"local":return r.local||null;
      case"valor":return +r.valor||0;case"qtd":return +r.qtd||0;case"desconto":return +r.desconto||0;case"total":return +r.total||0;
      case"categoria":return r.categoria||null;case"subcategoria":return r.subcategoria||null;
      default:return r.ex&&r.ex[c]!==undefined?r.ex[c]:null}};
    const direita=new Set(["valor","qtd","desconto","total"]),moeda=new Set(["valor","desconto","total"]);
    const estilo=(cell,ro,i)=>{
      cell.font={name:"Calibri",size:10,color:{argb:TXT}};cell.fill=F(i%2?AREIA:BRANCO);cell.border=thinBorder(LINHA);
      cell.alignment={vertical:"middle",horizontal:direita.has(ro)?"right":(ro==="data"||ro==="num")?"center":"left"};
      if(ro==="data")cell.numFmt="dd/mm/yyyy";else if(moeda.has(ro))cell.numFmt=DIN;
    };
    linhas.forEach((r,i)=>{ws.getRow(R0+i).height=17;roles.forEach((ro,c)=>{const cell=ws.getCell(R0+i,c+1),v=valor(r,ro,c);if(v!=null)cell.value=v;estilo(cell,ro,i)})});
    const ultima=R0+linhas.length+EM_BRANCO-1;
    for(let i=linhas.length;i<linhas.length+EM_BRANCO;i++){ws.getRow(R0+i).height=17;roles.forEach((ro,c)=>estilo(ws.getCell(R0+i,c+1),ro,i))}
    // total no topo: as linhas novas entram no fim da lista
    const iT=roles.indexOf("total");
    if(iT>=0){
      const col=colLetter(iT+1),tot=linhas.reduce((a,r)=>a+(+r.total||0),0),cT=ws.getCell(6,iT+1);
      cT.value={formula:`SUBTOTAL(9,${col}${R0}:${col}${ultima})`,result:+tot.toFixed(2)};cT.numFmt=DIN;cT.font={name:"Calibri",bold:true,size:10,color:{argb:VERDE}};cT.alignment={horizontal:"right",vertical:"middle"};
      if(iT>0){const l=ws.getCell(6,iT);l.value="Total";l.font={name:"Calibri",bold:true,size:10,color:{argb:VERDE}};l.alignment={horizontal:"right",vertical:"middle"}}
    }
    // listas de categorias para as linhas em branco (dá para digitar outra)
    const lista=(a,col)=>[...new Set(a.filter(Boolean))].sort((x,y)=>x.localeCompare(y,"pt")).map((v,i)=>{wsL.getCell(i+1,col).value=v;return v}).length;
    const wsL=wb.addWorksheet("Listas",{state:"hidden"});
    const nCat=lista([...linhas.map(r=>r.categoria),...Object.keys(NFX_CC)].filter(c=>c!=="A classificar"),1),nSub=lista([...linhas.map(r=>r.subcategoria),...NFX_REGRAS.map(x=>x[2])].filter(c=>c!=="A classificar"),2);
    const valida=(ro,colL,n)=>{const c=roles.indexOf(ro);if(c<0||!n)return;for(let r=R0+linhas.length;r<=ultima;r++)ws.getCell(r,c+1).dataValidation={type:"list",allowBlank:true,showErrorMessage:false,formulae:[`Listas!$${colL}$1:$${colL}$${n}`]}};
    valida("categoria","A",nCat);valida("subcategoria","B",nSub);
    ws.views=[{state:"frozen",ySplit:HR,showGridLines:false}];
    ws.autoFilter={from:{row:HR,column:1},to:{row:ultima,column:nC}};
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const nomeBase=String(st.fileName||"Notas fiscais").replace(/\.(xlsx?|csv)$/i,"").replace(/ - atualizada.*$/i,"");
    if(await saveFile(`${nomeBase} - atualizada ${hojeIso()}.xlsx`,blob))toast("Planilha de notas baixada. Preencha as linhas em branco e envie o arquivo para lançar.");
  }catch(e){console.error(e);toast("Não foi possível gerar a planilha: "+(e&&e.message?e.message:e),true)}
}

/* ---- nota que já está na planilha: só anexa o arquivo ---- */
const NF_SEMPALAVRA=new Set(["ltda","me","epp","eireli","sa","s","a","de","da","do","dos","das","e","comercio","com","cia","industria","ind","comercial"]);
const nfTokens=s=>NFN(s).split(" ").filter(t=>t.length>=3&&!NF_SEMPALAVRA.has(t));
function nfFornParecido(a,b){
  const A=NFN(a),B=NFN(b);if(!A||!B)return false;if(A===B||(A.length>=5&&B.includes(A))||(B.length>=5&&A.includes(B)))return true;
  const ta=nfTokens(a),tb=nfTokens(b);if(!ta.length||!tb.length)return false;
  const comum=ta.filter(t=>tb.some(u=>u===t||(t.length>=5&&(u.startsWith(t)||t.startsWith(u))))).length;
  return comum/Math.min(ta.length,tb.length)>=0.5;
}
function nfAcha(n){
  const st=S.config.nf;if(!st||!st.rows||!st.rows.length)return null;
  const itN=n.rows.map(r=>NFN(r.item)).filter(Boolean),totN=+n.rows.reduce((s,r)=>s+(+r.total||0),0).toFixed(2),vNF=+n.vNF||totN;
  const dias=(a,b)=>(a&&b)?Math.abs((new Date(a+"T12:00")-new Date(b+"T12:00"))/864e5):99;
  let melhor=null;
  for(const g of nfGrupos(st.rows)){
    const rows=g.idx.map(i=>st.rows[i]);
    if(n.chave&&rows.some(r=>r.chave===n.chave))return{g,rows,motivo:"chave"};
    if(n.chave&&rows.some(r=>r.chave)&&!rows.some(r=>r.chave===n.chave))continue;
    if(n.nota&&rows.some(r=>r.notaForn!=null)&&!rows.some(r=>String(r.notaForn)===String(n.nota)))continue;
    const fp=nfFornParecido(n.forn,g.local);
    if(n.nota&&fp&&rows.some(r=>r.notaForn!=null&&String(r.notaForn)===String(n.nota)))return{g,rows,motivo:"número"};
    const totG=+rows.reduce((s,r)=>s+(+r.total||0),0).toFixed(2),tot=Math.abs(totG-totN)<=0.05||Math.abs(totG-vNF)<=0.05;
    const its=itN.length?itN.filter(i=>rows.some(r=>{const x=NFN(r.item);return x===i||(i.length>=6&&x.length>=6&&(x.includes(i)||i.includes(x)))})).length/itN.length:0;
    const d=dias(n.date,g.date);
    let pts=0;if(d===0)pts+=2;else if(d<=7)pts+=1;if(fp)pts+=2;if(its>=0.5)pts+=2;
    const ok=(tot&&pts>=3)||(its>=0.8&&fp&&d<=7);
    if(ok&&(!melhor||pts>melhor.pts))melhor={g,rows,motivo:"dados",pts};
  }
  return melhor;
}
async function nfSeparaExistentes(notas){
  const resto=[],msgs=[];
  for(const n of notas){
    const m=nfAcha(n);if(!m){resto.push(n);continue}
    if(n.fonte==="planilha"){n.av.unshift(`Parece com a nota Nº ${m.g.nota==null?"s/n":m.g.nota} já lançada. Confira antes de lançar.`);resto.push(n);continue}
    const rot=`NF ${n.nota||"s/n"} — ${n.forn} (Nº ${m.g.nota==null?"s/n":m.g.nota} da planilha)`;
    if(m.rows.some(r=>r.arq&&S.nfarq[r.arq])){msgs.push(`${rot}: essa nota já está no sistema, com o arquivo anexado.`);continue}
    let id=null;try{id=await nfArquivar(n.arq,n.arqTipo,n,null)}catch(e){msgs.push(e.message);continue}
    if(!id){msgs.push(`${rot}: não consegui guardar o arquivo.`);continue}
    const st=S.config.nf,idx=new Set(m.g.idx);
    const rows=st.rows.map((r,i)=>idx.has(i)?{...r,arq:id,...(n.chave&&!r.chave?{chave:n.chave}:{}),...(n.nota&&r.notaForn==null?{notaForn:n.nota}:{})}:r);
    if(nfSave(rows,st.fileName))msgs.push(`${rot} já estava na planilha — só anexei o arquivo.`);
  }
  if(msgs.length>3){const anex=msgs.filter(m=>/só anexei/.test(m)).length;toast(`${anex} nota(s) já estavam na planilha — só anexei o arquivo. ${msgs.length-anex} outra(s) já estavam completas ou deram erro.`)}else msgs.forEach(t=>toast(t));
  if(msgs.length)go("nf",true);
  return resto;
}

/* ---- base de notas em várias partes: cabe até NF_MAX_ITENS itens ---- */
const NF_PARTE_MAX=150000,NF_MAX_ITENS=8000;
function nfJunta(){
  const m=S.config&&S.config.nf;if(!m||!m.partes)return;
  const rows=[];for(let i=1;i<=m.partes;i++){const p=S.config["nf_p"+i];if(p&&p.rows)rows.push(...p.rows)}
  Object.defineProperty(m,"rows",{value:rows,enumerable:false,writable:true,configurable:true});
}
function nfSave(rows,fileName,fmt){
  if(rows.length>NF_MAX_ITENS){toast(`A base de notas fiscais chegou ao limite de ${NF_MAX_ITENS} itens. Baixe a planilha e arquive as notas mais antigas antes de importar mais.`,true);return false}
  const antigo=S.config.nf||{},fm=fmt||antigo.fmt;
  const partes=[];let atual=[],tam=0;
  rows.forEach(r=>{const t=JSON.stringify(r).length+1;if(atual.length&&tam+t>NF_PARTE_MAX){partes.push(atual);atual=[];tam=0}atual.push(r);tam+=t});
  if(atual.length||!partes.length)partes.push(atual);
  if(partes.length>60){toast("A base de notas fiscais chegou ao limite de armazenamento.",true);return false}
  partes.forEach((p,i)=>{const id="nf_p"+(i+1),ex=S.config[id];if(!ex||JSON.stringify(ex.rows)!==JSON.stringify(p))put("config",id,{rows:p})});
  for(let i=partes.length+1;S.config["nf_p"+i];i++)del("config","nf_p"+i);
  put("config","nf",{fileName,partes:partes.length,rows:[],...(fm?{fmt:fm}:{})});
  nfJunta();NFUI.years=null;return true;
}
function nfApaga(){
  for(let i=1;S.config["nf_p"+i];i++)del("config","nf_p"+i);
  put("config","nf",{fileName:null,rows:[]});
}

/* ---- lote grande (dezenas ou centenas de arquivos) ---- */
function nfModoLote(n){
  return new Promise(ok=>{
    const ov=openModal(`<h3>${n} arquivos de notas</h3>
     <p class="sub">Como você quer lançar?</p>
     <div class="card" style="margin:8px 0"><b>Lançar direto as notas sem divergência (recomendado)</b><p class="sub" style="margin:4px 0 8px">O sistema lê tudo em etapas de 100, lança sozinho as notas em que todas as conferências batem (chave, CNPJ, somas, data) e deixa para você conferir só as que tiverem aviso. A entrada no estoque não é feita nesse modo: depois use "Dar entrada no estoque" na tela de Notas fiscais.</p><button class="b" id="mlauto">Ler e lançar direto</button></div>
     <div class="card" style="margin:8px 0"><b>Conferir todas antes de lançar</b><p class="sub" style="margin:4px 0 8px">Lê todos os arquivos e mostra a tela de conferência com todas as notas (inclusive estoque e vencimentos).</p><button class="b sec" id="mlconf">Conferir todas</button></div>
     <div style="display:flex;justify-content:flex-end"><button class="b sec" id="mlcx">Cancelar</button></div>`);
    const f=v=>()=>{ov.remove();ok(v)};
    ov.querySelector("#mlauto").onclick=f("auto");ov.querySelector("#mlconf").onclick=f("conferir");ov.querySelector("#mlcx").onclick=f(null);
  });
}
async function nfImportarLote(files){
  const modo=await nfModoLote(files.length);if(!modo)return;
  if(modo==="conferir")return nfImportar(files,{interno:true});
  const res={lancadas:0,erros:[],parou:false},rev=[],T=100,et=Math.ceil(files.length/T);
  for(let i=0;i<files.length&&!res.parou;i+=T)
    await nfImportar(files.slice(i,i+T),{interno:true,auto:true,rev,res,etapa:`Etapa ${i/T+1} de ${et}`});
  await new Promise(ok=>{
    const ov=openModal(`<h3>Resumo do lote</h3>
     <div class="stats"><div class="stat"><b>${res.lancadas}</b><span>notas lançadas direto</span></div><div class="stat ${rev.length?"warn":""}"><b>${rev.length}</b><span>para você conferir</span></div><div class="stat ${res.erros.length?"bad":""}"><b>${res.erros.length}</b><span>avisos/erros</span></div></div>
     ${res.parou?'<div class="callout sand" style="margin:8px 0">Você parou a leitura: os arquivos restantes não foram lidos.</div>':""}
     ${res.erros.length?`<div style="max-height:220px;overflow:auto;margin-top:8px" class="sub">${res.erros.map(e=>"• "+esc(e)).join("<br>")}</div>`:""}
     <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="b" id="rlok">${rev.length?"Conferir as "+rev.length+" restantes":"Concluir"}</button></div>`);
    ov.querySelector("#rlok").onclick=()=>{ov.remove();ok()};
  });
  go("nf",true);
  if(rev.length)await nfImportar([],{interno:true,prontas:rev});
}

