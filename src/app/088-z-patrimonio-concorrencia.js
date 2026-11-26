/* ================= PATRIMÔNIO PARA CONCORRÊNCIA PÚBLICA =================
   Uma lista só com os bens da casa (fogão, sofá, armários, camas…), juntando:
   - o cadastro de Patrimônio (Estrutura e qualidade) e os bens do Financeiro (Patrimônio e depreciação), sem os baixados;
   - os itens das notas fiscais que são móveis, eletrodomésticos e equipamentos (pela categoria ou pelo nome do item);
   - compras sem nota lançadas no Financeiro e bens lançados direto no Estoque.
   Cada linha pode ser tirada ou incluída à mão; a escolha fica em config/x_infra (patConc).
   Tudo fica em dois grupos (Bens e equipamentos · Obra e reforma) e 23 categorias: a categoria é automática pelo nome do item,
   mas pode ser trocada à mão em cada linha ou importada de uma planilha (config/x_infra, patConcCat). */
const PCONC={q:"",cat:"",grupo:"",ver:"lista",imp:null}; // ver: "lista" = só o patrimônio | "todos" = tudo que foi comprado, para incluir o que faltou
const PCONC_MAX=300;
/* >>> regra */
// nome do item (já sem acento, em minúsculas) que indica bem durável
const PCONC_NOME=/\b(fogao|cooktop|forno|coifa|depurador|exaustor|geladeira|refrigerador|freezer|frigobar|micro ?ondas|lava ?loucas|maquina de lavar|lavadora|tanquinho|centrifuga|secadora|ar condicionado|climatizador|ventilador|televis\w*|tv|bebedouro|purificador|cama|beliche|colchao|berco|cabeceira|sofa|poltrona|cadeira|mesa|armario|guarda ?roupa|roupeiro|comoda|criado mudo|estante|rack|gaveteiro|escrivaninha|balcao|longarina|andador|computador|notebook|impressora|nobreak|tablet|celular|smartphone|extintor|camera de seguranca|dvr|concentrador de oxigenio|aparador|buffet|cristaleira|cabideiro|biombo|torradeira|grill|mixer|enceradeira|maquina de costura|umidificador|desumidificador|projetor|home theater)\b/;
// peças, acessórios e roupa de cama: não são o bem
const PCONC_NAO=/\b(jogo de cama|roupa de cama|lencol|fronha|protetor|capa|forro|toalha|pano|refil|filtros?|pecas?|reparo|resistencia|botao|puxador|dobradica|parafusos?|rodizios?|mangueira|registro|acendedor|tampa|grelha|queimador|vela|suporte|controle remoto|cabo|limpador|limpa|tintas?|cartuchos?|toner)\b/;
// categoria de consumo escolhida na nota: não é bem, mesmo que o nome pareça
const PCONC_CONSUMO=/^(medicamentos|alimentacao|material de enfermagem|limpeza e higiene|higiene pessoal e conforto|enxoval e uniformes)$/;
// frete, montagem, gás e outros serviços ligados a um bem: são despesa, nunca o bem (vale até com categoria de mobiliário)
// (pedreiro, empreiteiro, eletricista… também: a mão de obra da obra é lançada à mão na aba, para não contar em dobro)
const PCONC_DESPESA=/\b(fretes?|entrega|montagem|instalacao|mao de obra|servicos?|carga|recarga|gas|butano|glp|botijao|taxas?|conserto|manutencao|pedreiros?|empreiteir\w*|eletricista|encanador|pintor|servente|diarias?)\b/;
// material da obra (construção, acabamento, elétrica, hidráulica): entra como obra
const PCONC_OBRA=new RegExp("\\b("+[
  // construção e acabamento
  "pisos?","piso tatil","porcelanatos?","ceramicas?","revestimentos?","azulejos?","pastilhas? (de vidro|ceramicas?)","rejunte","argamassa","nivelador(es)? de piso","espacador(es)?",
  "cimento","concreto","areia","brita","pedra (britada|\\d)","cal (hidratada|virgem)","chapisco","reboco","aditivo","tijolos?","blocos? (de )?(concreto|ceramicos?|estrutural)",
  "telhas?","cumeeira","rufos?","calhas?","laje","vergalh\\w*","ferro (de construcao|\\d)","arame recozido","vigas?","caibros?","sarrafos?","ripas?","compensado","madeirite",
  "gesso","drywall","placas? de gesso","forro (de )?(gesso|pvc)","divisorias?","rodapes?","soleiras?","peitoril","granito","marmore","quartzo","bancadas?",
  "portas?","portao","batentes?","guarnic\\w*","fechaduras?","macanetas?","dobradicas?","janelas?","vitro","basculante","esquadrias?","vidros?","box","espelhos?",
  "tintas?","massa corrida","massa acrilica","selador","textura","grafiato","verniz","impermeabiliz\\w*","manta asfaltica",
  "corrimao","barras? de apoio","rampa","antiderrapante","grades?","alambrado","toldos?","policarbonato","pergolado","cobertura",
  "material (de construcao|eletrico|hidraulico)",
  // elétrica e iluminação
  "luminarias?","plafon","spots?","arandelas?","pendentes?","refletor(es)?","lampadas?","reator(es)?","(fita|painel|perfil|barra|tubular|bulbo) (de )?led",
  "disjuntor(es)?","dps","idr","interruptor diferencial","quadros? de (distribuicao|energia|luz|comando|medicao)","padrao de energia","contator(es)?",
  "rele fotoeletrico","fotocelula","sensor(es)? de presenca","campainha","tomadas?","interruptor(es)?","plugues?","conector(es)?","terminais",
  "caixas? (de luz|de passagem|octogonal|de embutir|de sobrepor|4 ?x ?[24])","espelhos? (de tomada|cego)","eletrodutos?","conduites?","canaletas?","eletrocalhas?","perfilados?",
  "fios?","cabos? (pp|flexive(l|is)|eletricos?|de cobre|\\d)","fita isolante","haste de aterramento","aterramento",
  // hidráulica e louças
  "pias?","cubas?","tanques?","vaso sanitario","bacia sanitaria","caixa acoplada","assento sanitario","torneiras?","chuveiros?","ducha( higienica)?","misturador",
  "caixa d ?agua","caixas? (sifonada|de gordura|de inspecao)","registros? (de )?(gaveta|pressao|esfera|base)","valvulas? (de )?(descarga|escoamento|retencao|pe|americana)",
  "descarga","sifao","ralos?","engates?","flexivel","boia","joelhos?","luvas? (pvc|soldave(l|is)|roscave(l|is)|de correr|de reducao)","te (pvc|soldavel|\\d)",
  "adaptador(es)? soldave(l|is)","tubos?","canos?","conexo(es)?","cola pvc","veda rosca","aquecedor solar","pressurizador","bomba d ?agua"
].join("|")+")\\b");
// parecem obra mas são acessório, consumo ou outra coisa
const PCONC_OBRA_NAO=/\b(porta ?(toalhas?|papel|retratos?|copos?|sabonete|trecos?|escovas?|chaves?|lapis|joias|temperos?|controle|guardanapos?|comprimidos?)|tintas? (para |de )?(impressora|carimbo|cabelo|tecido)|tinta guache|cartuchos?|toner|tapete|cortina|protetor|pilhas?|baterias?|cabos? (usb|hdmi|de rede|de vassoura|de rodo|de carregador|de celular)|carregador|luvas? (de )?(procedimento|latex|nitril\w*|descartave(l|is)|limpeza|cozinha)|espelho de (mao|bolsa)|tubos? (de ensaio|de cola|de silicone|de pomada|de coleta|endotraqueal|de oxigenio)|sonda|seringa|fio (dental|de sutura|cirurgico)|pendente de (pagamento|nota))\b/;
// subcategorias das notas que são obra (Manutenção e reparos > elétrica, hidráulica, construção, materiais)
const PCONC_SUBOBRA=/^(eletrica|hidraulica|construc|materiais de manutencao)/;
const pconcEhObra=n=>PCONC_OBRA.test(n)&&!PCONC_OBRA_NAO.test(n)&&!PCONC_NOME.test(n);
const pconcSubObra=(cat,sub)=>NFN(cat)==="manutencao e reparos"&&PCONC_SUBOBRA.test(NFN(sub));
// decoração: quadros, espelhos decorativos, cortinas, tapetes, abajur, vasos e objetos decorativos (bem durável da casa)
const PCONC_DECOR=/\b(quadros?(?! (de (distribuicao|energia|luz|comando|medicao|avisos|cortica|chaves)|branco|magnetico|eletrico))|telas? decorativ\w*|molduras?|porta ?retratos?|espelhos? (decorativ\w*|redondos?|com moldura|de parede|bisotado)|cortinas?|persianas?|blackout|varao de cortina|tapetes?(?! (higienico|sanitario))|passadeira|abajur(es)?|luminarias? de (mesa|chao|piso|cabeceira)|relogios? de parede|vasos? (decorativ\w*|de flores|de planta|de ceramica|de vidro)|cachepos?|plantas? artificia\w*|flores? artificia\w*|arranjos?|almofadas? decorativ\w*|mantas? decorativ\w*|enfeites?|esculturas?|estatuetas?|objetos? decorativ\w*|adesivos? de parede|papel de parede|painel decorativo|decoracao|decorativ\w*)\b/;
function pconcAuto(nome,cat,sub){
  if(PCONC_DESPESA.test(NFN(nome)))return false;
  if(PCONC_DECOR.test(NFN(nome)))return true; // cortina e tapete vêm como "enxoval" na nota, mas são decoração
  const c=NFN(cat);if(c==="equipamentos e mobiliario")return true;
  if(PCONC_CONSUMO.test(c))return false;
  const n=NFN(nome);
  if(PCONC_NOME.test(n)&&!PCONC_NAO.test(n))return true;
  if(pconcSubObra(cat,sub)&&!PCONC_OBRA_NAO.test(n))return true;
  return pconcEhObra(n);
}
// categoria do Financeiro que é obra (não "Manutenção e reformas", que é despesa do dia a dia)
const PCONC_CATOBRA=/\bobras?\b|construc|benfeitor|^reformas?\b/;
/* Categorias do patrimônio: dois grupos, 23 categorias (lista única; a tela, o PDF, o Excel e a importação usam esta lista). */
const PCONC_GB="Bens e equipamentos",PCONC_GO="Obra e reforma",PCONC_MO="Mão de obra";
const PC={mov:"Móveis",dor:"Dormitórios (camas, colchões e cabeceiras)",ele:"Eletrodomésticos",sau:"Saúde, mobilidade e acessibilidade",dec:"Decoração",
  ext:"Área externa e jardim",seg:"Segurança e controle de acesso",coz:"Cozinha e utensílios",enx:"Enxoval, uniformes e EPI",esc:"Escritório, eletrônicos e avisos",
  pec:"Peças e consertos de equipamentos",mo:PCONC_MO,pin:"Pintura e impermeabilização",hid:"Hidráulica (tubos, conexões e registros)",por:"Portas, ferragens e fechaduras",
  alv:"Alvenaria e material básico",pis:"Pisos, revestimentos e antiderrapantes",lou:"Louças, metais e cubas",ilu:"Iluminação",elt:"Elétrica",cob:"Cobertura e sombreamento",
  ges:"Gesso, drywall e forro",fer:"Ferramentas e consumíveis da obra"};
const PCONC_GRUPOS=[
  {g:PCONC_GB,desc:"Móveis, eletrodomésticos e tudo o que pode ser retirado da casa",cor:"#2E7D33",claro:"#DCEBD5",cats:["mov","dor","ele","sau","dec","ext","seg","coz","enx","esc","pec"].map(k=>PC[k])},
  {g:PCONC_GO,desc:"Material e mão de obra que ficaram incorporados ao imóvel (benfeitorias)",cor:"#9A5B2E",claro:"#F3E3D3",cats:["mo","pin","hid","por","alv","pis","lou","ilu","elt","cob","ges","fer"].map(k=>PC[k])}
];
const PCONC_GRUPO_DE={};PCONC_GRUPOS.forEach(G=>G.cats.forEach(c=>{PCONC_GRUPO_DE[c]=G.g}));
const PCONC_ORDEM=PCONC_GRUPOS.flatMap(G=>G.cats);
const pconcOrdCat=c=>{const i=PCONC_ORDEM.indexOf(c);return i<0?999:i};
/* Classificação automática pelo nome do item. Cada regra procura palavras específicas; vence a palavra que aparece PRIMEIRO
   no nome (o produto vem antes do detalhe: "Torneira de mesa" é torneira, "Mesa com tampo de vidro" é mesa, "Xícara de vidro" é
   xícara, "Armário roupeiro 8 portas" é armário, "Sapato antiderrapante" é sapato). Empate na mesma posição: vence o trecho mais
   longo ("cadeira de rodas" ganha de "cadeira"); persistindo, a regra que vem antes na lista. */
const PCONC_REGRAS=[
  [/\b(mao de obra|pedreiros?|empreiteir\w*|empreitada|eletricista|encanador|pintor|servente|diarias? de)\b/,"mo"],
  // exceções conhecidas: calçado e EPI não são piso; torneira não é móvel; louça de mesa não é vidraçaria
  [/\b(sapatos?|calcados?|tenis|botas?|botinas?|crocs|sandalias?|chinelos?|tamancos?|babuches?|uniformes?|jalecos?|aventais?|toucas?|pijamas?|camisetas?|camisas?|calcas|bermudas?|scrubs?|oculos de (protecao|seguranca)|protetor(es)? auricular(es)?|abafador(es)?|capacetes?|coletes?|epis?|luvas? (de )?(raspa|vaqueta|nitrilica|latex|procedimento|seguranca|protecao)|mascaras?|jogos? de cama|roupas? de cama|lencois|lencol|fronhas?|edredons?|edredom|cobertor(es)?|mantas?(?! (asfaltica|termica|liquida|decorativ))|travesseiros?|toalhas?(?! de papel)|roupoes|roupao|cortinas? de box|tapetes? de banheiro|enxoval|panos? de prato|capas? de colchao|protetor(es)? de colchao)\b/,"enx"],
  [/\b(torneiras?)\b/,"lou"],
  [/\b(panelas? eletricas?|panela de arroz|air ?fryer|fritadeiras?)\b/,"ele"],
  // trechos específicos que decidem antes das palavras soltas
  [/\b(criados? mudos?|mesas? (de )?cabeceira|mesinhas? (de )?cabeceira)\b/,"dor"],
  [/\b(seladoras?|palitos?|espetos?|pisos? plasticos?|estrados?|paletes?|tampas? de silicone|torneiras? (de |para )?filtro|velas? (para |de )?filtro|filtros? de barro|porta ?(guard\w*|esponj\w*|detergente|utensilios|condimentos))\b/,"coz"],
  [/\b(microfones?|expositor(es)?|displays?|porta ?folhas?|relogios? digita(l|is)|quadros? de avisos?)\b/,"esc"],
  [/\b(porta ?chaves?|claviculario|controles? (de |para )?portao)\b/,"seg"],
  [/\b(mecanismos?|controles? eletronicos?|conserta)\b/,"pec"],
  [/\b(acabamentos? (de |para )?registro|parafusos? (de |para )?(lavatorio|cuba|pia|vaso))\b/,"lou"],
  [/\b(ralinhos?|bracos? (de |para )?chuveiro|torneiras? (de )?boia|porta ?grelhas?)\b/,"hid"],
  [/\b(grelhas? porta)\b/,"por"],
  [/\b(varal de luz\w*|cordao de luz\w*)\b/,"ilu"],
  [/\b(condulete\w*|caixinhas?( de luz)?|[24] ?x ?[24]|grampos? (fixa|para|de) (fios?|cabos?)|espelhos? pvc|\d teclas?)\b/,"elt"],
  [/\b(fundos? (gesso|preparador|selador)|aditivos? impermeabilizantes?|misturador(es)? (de |para )?tintas?)\b/,"pin"],
  [/\b(argamassas? (p |para )?porc\w*|fitas?( \w+)? antiderrapantes?)\b/,"pis"],
  [/\b(tubos? (quadrados?|retangular(es)?|galvanizados?|metalon)|metalon)\b/,"alv"],
  [/\b(parafusos? (de |para )?drywall|parafusos? flang\w*)\b/,"ges"],
  [/\b(talhadeiras?|fim de obra|pisos? metalicos?|suportes? (p |para )?lixa|limpa \w+)\b/,"fer"],
  [/\b(xicaras?|pires|copos?|canecas?|tacas?|pratos?|travessas?|potes?|jarras?|garrafas?( termicas?)?|bules?|acucareiros?|leiteiras?|petisqueiras?|saladeiras?|bowls?|tigelas?|talheres?|garfos?|facas?|colheres?|conchas?|escumadeiras?|espatulas?|panelas?|caldeiroes|caldeirao|frigideiras?|assadeiras?|refratarios?|formas? (de|para) (bolo|pudim|gelo|pizza|assar)|cumbucas?|sopeiras?|bandejas?|tabuas?|porta ?(copos?|temperos?|guardanapos?|frios|talheres)|escorredor(es)?|ralador(es)?|peneiras?|abridor(es)?|saleiros?|galheteiros?|marmitas?|caixas? termicas?|dispenser de (agua|cafe)|utensilios?|faqueiro|lixeiras?|baldes?|cestos?|caixas? organizadoras?|cabides?)\b/,"coz"],
  // bens e equipamentos
  [PCONC_DECOR,"dec"],
  [/\b(porta ?retratos?|espelhos?|relogios?|numeros? (residencia(l|is)|para casa)|luminarias? de tomada|luz(es)? noturnas?|lampadas? de parede|luz de leitura|centros? de mesa|vasos? (de planta|para plantas?|autoirrigave(l|is)))\b/,"dec"],
  [/\b(cadeiras? de (rodas|banho)|cadeiras? (higienicas?|sanitarias?|de transferencia)|andador(es)?|muletas?|bengalas?|tripes?|concentrador(es)? de oxigenio|cilindros? de oxigenio|aspirador(es)? de secrecao|oximetros?|esfigmo\w*|aparelhos? de pressao|glicosimetros?|nebulizador(es)?|inalador(es)?|macas?|guinchos?|elevador(es)? de transferencia|cintos? de transferencia|grades? de cama|barras? de apoio|barras? (de seguranca|para deficientes?)|corrimaos?|rampas?|assentos? sanitarios? elevados?|elevador(es)? de assento|colchao (piramidal|caixa de ovo|pneumatico|anti ?escaras?)|almofadas? anti ?escaras?|suportes? de soro|termometros?|balancas?|estetoscopios?|desfibrilador(es)?|bombas? de infusao|monitor(es)? multiparametro|(bancos?|banquetas?) de banho|hamper|alcas? de apoio)\b/,"sau"],
  [/\b(camas?|beliches?|bicamas?|colchao|colchoes|bercos?|cabeceiras?|box (de cama|bau|casal|solteiro|queen|king)|base box)\b/,"dor"],
  [/\b(extintor(es)?|alarmes?|sensor(es)? de alarme|central de alarme|cameras?|dvr|nvr|cftv|interfones?|video ?porteiro|porteiro eletronico|fechaduras? (digital|digitais|eletronicas?|biometricas?)|controles? de acesso|catracas?|cofres?|cadeados?|cerca eletrica|concertina|placas? de (sinalizacao de emergencia|saida de emergencia|rota de fuga)|luminarias? de emergencia|iluminacao de emergencia|detector(es)? de fumaca|sirenes?|botoes? de panico|mangueiras? de incendio)\b/,"seg"],
  [/\b(jardim|jardinagem|plantas?(?! artificia)|mudas?|grama|terra vegetal|adubos?|substrato|regador(es)?|mangueiras?|esguicho|espreguicadeiras?|cadeiras? de (praia|piscina|area externa)|ombrelones?|guarda ?sol|churrasqueiras?|varal|varais|piscina|redes? de (descanso|dormir)|balancos?|floreiras?|jardineiras?|cortador de grama|rocadeira|tesoura de poda|lixeiras? (externas?|de rua)|bancos? de jardim|mesas? de jardim)\b/,"ext"],
  [/\b(fogao|fogoes|cooktop|fornos?|coifas?|depurador(es)?|exaustor(es)?|geladeiras?|refrigerador(es)?|freezer|frigobar|micro ?ondas|lava ?loucas|maquinas? de lavar|lavadoras?|tanquinho|centrifugas?|secadoras?|bebedouros?|purificador(es)?|liquidificador(es)?|batedeiras?|processador(es)?|cafeteiras?|sanduicheiras?|chaleiras? eletricas?|ferros? de passar|aspirador(es)?( de po)?|torradeiras?|grill|mixer|enceradeiras?|maquinas? de costura|ventilador(es)?|ar condicionado|climatizador(es)?|aquecedor(es)?(?! solar)|umidificador(es)?|desumidificador(es)?|televis\w*|smart ?tv|tv|tvs)\b/,"ele"],
  [/\b(computador(es)?|notebooks?|monitor(es)?|impressoras?|multifuncional|nobreak|estabilizador(es)?|tablets?|celular(es)?|smartphones?|roteador(es)?|repetidor(es)?|modem|switch|hd externo|pen ?drive|mouse|teclados?|webcam|caixas? de som|telefones?|projetor(es)?|home theater|radios?|aparelhos? de som|cabos? (usb|hdmi|de rede|rj45|de video)|quadros? (branco|brancos|de avisos|magneticos?|de cortica|de chaves)|murais?|lousas?|placas? (de sinalizacao|indicativas?|de identificacao|de porta|de aviso)|placas?|sinalizacao|avisos?|calculadoras?|etiquetadora|plastificadora|fragmentadora|grampeador(es)?|perfurador(es)?|relogios? de ponto|porta ?(lapis|canetas?|documentos?|clips))\b/,"esc"],
  [/\b(sofas?|poltronas?|cadeiras?|mesas?|armarios?|guarda ?roupas?|roupeiros?|rouperiros?|comodas?|criados? mudos?|estantes?|racks?|gaveteiros?|escrivaninhas?|balcao|balcoes|longarinas?|bancos?|banquetas?|prateleiras?|sapateiras?|puffs?|pufes?|aparador(es)?|buffets?|cristaleiras?|nichos?|cabideiros?|biombos?|paineis? (de|para) tv|bau|baus|araras?|paneleiros?|carrinhos? (auxiliar|organizador|de servico)|organizador(es)?|suportes? (de |para )?(microondas|micro ondas|forno|tv|televisao|parede)|divas?|recamier|bancadas? de trabalho)\b/,"mov"],
  [/\b(pecas?|reparos?|kit reparo|refil|refis|resistencias?|filtros?(?! de linha)|controles? remotos?|rodizios?|rodinhas?|termostatos?|motor(es)?|compressor(es)?|borrachas? de (vedacao|geladeira|porta)|gaxetas?|placas? (eletronicas?|de controle|de potencia)|botoes|botao|puxador(es)? de (geladeira|fogao)|queimador(es)?|grelhas?|mangueiras? de (gas|maquina|lavadora)|engrenagens?|correias?|consertos?|manutencao de)\b/,"pec"],
  // obra e reforma
  [/\b(luminarias?|plafons?|spots?|arandelas?|pendentes?|refletor(es)?|lampadas?|reator(es)?|(fitas?|painel|paineis|perfil|barra|tubular|bulbo|placa|mangueira) (de )?led|led|lustres?|trilhos? (eletrificados?|de luz)|postes?|balizador(es)?|iluminacao)\b/,"ilu"],
  [/\b(pias?|cubas?|tanques?|vasos? sanitarios?|bacias? sanitarias?|caixas? acopladas?|assentos? sanitarios?|chuveiros?|duchas?|misturador(es)?|monocomando|lavatorios?|mictorios?|porta ?(toalhas?|papel|papel higienico|sabonete|shampoo|escovas?)|toalheiros?|papeleiras?|saboneteiras?|cabides? de (banheiro|parede)|kits? (de )?acessorios|acessorios (de|para) banheiro|dispenser(es)?|espelhos? (de|para) banheiro|nichos? (de|para) banheiro|metais (sanitarios|de banheiro))\b/,"lou"],
  [/\b(tubos?|canos?|conexoes|conexao|joelhos?|luvas? (pvc|soldave(l|is)|roscave(l|is)|de correr|de reducao|lr|sr|esgoto)|tes? (pvc|soldave(l|is)|de reducao|esgoto|\d+)|curvas? (pvc|\d+|de esgoto)|adaptador(es)? (soldave(l|is)|pvc|curto|com flange)|registros?|valvulas?|descargas?|sifao|sifoes|ralos?|grelhas? de ralo|engates?|flexive(l|is)|boias?|caixas? d ?agua|caixas? (sifonadas?|de gordura|de inspecao|de esgoto)|cola pvc|adesivo pvc|veda ?rosca|fita veda|aquecedor(es)? solar(es)?|pressurizador(es)?|bombas? d ?agua|bombas? (de agua|submersa|periferica)|hidrometro|tampoes|niples?|unioes|buchas? de reducao|plugs? pvc|esgoto|cpvc|ppr|material hidraulico|hidraulic\w*)\b/,"hid"],
  [/\b(disjuntor(es)?|dps|idr|interruptor(es)? diferencia(l|is)|quadros? (de )?(distribuicao|energia|luz|comando|medicao|disjuntores?)|centro de distribuicao|padrao de energia|contator(es)?|reles?|fotocelulas?|sensor(es)? de presenca|campainhas?|tomadas?|interruptor(es)?|plugues?|plugs?|conector(es)?|terminais|terminal|bornes?|caixas? (de luz|de passagem|octogonal|de embutir|de sobrepor|eletricas?|[24] ?x ?[24])|espelhos? (de )?(tomada|interruptor|cego|[24] ?x ?[24])|placas? ([24] ?x ?[24]|de tomada|cega)|eletrodutos?|conduites?|canaletas?|eletrocalhas?|perfilados?|fios?|cabos?|cabinhos?|fitas? isolantes?|haste de aterramento|aterramento|barramentos?|extensao|extensoes|filtros? de linha|reguas? de tomada|benjamins?|adaptador(es)? de tomada|abracadeiras? (de )?nylon|enforca gato|material eletrico|eletric\w*)\b/,"elt"],
  [/\b(tintas?|massas? (corrida|acrilica|niveladora|pva)|selador(es)?|texturas?|grafiato|verniz|vernizes|esmaltes?|fundo preparador|primer|zarcao|impermeabiliz\w*|manta asfaltica|mantas? liquidas?|vedacit|vedapren|denvercril|solvente|thinner|aguarras|rolos?|pinceis|pincel|trinchas?|bandejas? de pintura|lixas?|fitas? crepe|lonas? plasticas?|lonas?)\b/,"pin"],
  [/\b(pisos?|porcelanatos?|ceramicas?|revestimentos?|azulejos?|pastilhas?|rejuntes?|argamassas? (colante|ac ?i+|ac ?\d|de assentamento)|nivelador(es)?|espacador(es)?|cunhas?|rodapes?|soleiras?|peitoris|peitoril|granitos?|marmores?|quartzo|bancadas?|antiderrapantes?|vinilicos?|laminados?|deck|filetes?|cantoneiras?|perfis? de acabamento)\b/,"pis"],
  [/\b(portas?|portao|portoes|portinholas?|batentes?|guarnic\w*|fechaduras?|macanetas?|dobradicas?|janelas?|vitros?|basculantes?|esquadrias?|vidros?|vidracaria|box|puxador(es)?|trincos?|ferrolhos?|tarjetas?|fechos?|molas? aereas?|olho magico|trilhos?|roldanas?|grades?|alambrados?|telas? (mosquiteiro|mosquiteira|de protecao|de arame)|mosquiteiros?|ferragens?|miolos?|cilindros? de fechadura)\b/,"por"],
  [/\b(gesso|drywall|dry wall|placas? de gesso|forros?|divisorias?|montantes?|guias? (de )?drywall|perfis? (de )?drywall|sancas?|molduras? de gesso|tabicas?)\b/,"ges"],
  [/\b(telhas?|cumeeiras?|rufos?|calhas?|toldos?|policarbonatos?|pergolados?|coberturas?|sombrite|telas? (de )?sombreamento|mantas? termicas?|subcobertura|lonas? de cobertura)\b/,"cob"],
  [/\b(cimentos?|concreto|areias?|brita|pedras? (britada|\d|rachao|marroada)|pedriscos?|cal|chapisco|reboco|argamassas?|aditivos?|tijolos?|blocos?|vergalh\w*|ferros? (de construcao|ca|\d)|ca ?50|ca ?60|arame recozido|arames?|vigas?|caibros?|sarrafos?|ripas?|compensados?|madeirites?|tabuas? de (pinus|obra|madeira)|lajes?|lajotas?|trelicas?|colunas? (pronta|armada)|estribos?|telas? soldadas?|malhas? (pop|de aco)|graute|massa pronta|materia(l|is) de construcao|placas? cimenticias?|escoras?|pontaletes?)\b/,"alv"],
  [/\b(ferramentas?|furadeiras?|parafusadeiras?|serras?|serrote|esmerilhadeiras?|lixadeiras?|martelos?|marretas?|chaves? (de fenda|philips|allen|inglesa|de boca|combinada|estrela|torx)|jogos? de chaves|alicates?|trenas?|niveis|nivel|esquadros?|prumos?|escadas?|carrinhos? de mao|pas|enxadas?|picaretas?|cavadeiras?|brocas?|discos? (de corte|diamantados?|flap)|parafusos?|buchas?|pregos?|porcas?|arruelas?|rebites?|silicone|espuma expansiva|selante|colas?|abracadeiras?|sacos? de (entulho|rafia)|estopas?|colher(es)? de pedreiro|desempenadeiras?|masseiras?|baldes? de (pedreiro|obra|concreto)|desentupidor(es)?|grampos?|sargentos?|tesouras? de (chapa|funileiro)|estiletes?|epoxi|durepoxi|super ?bonder|lubrificantes?|fitas? (dupla face|silver tape|adesivas?|de demarcacao))\b/,"fer"]
];
// contexto: combinações que mudam o sentido do produto, olhadas antes de tudo (cadeira "de varanda" é área externa,
// "Piso ... 18L" é tinta de piso, disco de corte "de porcelanato" é do piso, placa "de extintor" é segurança)
const PCONC_CONTEXTO=[
  [/^(\w+ ){0,2}(nichos?|prateleiras?)\b.*\bdecora/,"dec"],
  [/^(\w+ )?prateleiras?\b.*\b(pia|panelas?)\b/,"coz"],
  [/\b(cadeiras?|poltronas?|mesas?|bancos?|sofas?)\b.*\b(area externa|varanda|piscina|jardim)\b/,"ext"],
  [/\bplacas?\b.*\b(extintor|emergencia|bombeiros?|rota de fuga|fotoluminescente)\b/,"seg"],
  [/\bjogos? american/,"coz"],
  [/\bpisos?\b.*\b\d+( \d+)? ?(l|lts?|litros?|gl)\b/,"pin"],
  [/\b(discos?|espatulas?|desempenadeiras?)\b.*\b(porcelanatos?|rejuntes?|ceramicas?)\b/,"pis"],
  [/\btrilhos?\b.*\bspots?\b/,"ilu"]
];
// pista pela categoria/subcategoria da nota quando o nome não diz o que é
const PCONC_DICA=[[/^utensilios/,"coz"],[/^(enxoval|seguranca e epi)/,"enx"],[/^(material de escritorio|tecnologia)/,"esc"],[/^mobiliario/,"mov"],[/^eletrodomesticos/,"ele"],[/^camas/,"dor"],
  [/^(equipamentos de saude|mobilidade)/,"sau"],[/^eletrica/,"elt"],[/^hidraulica/,"hid"],[/^construc/,"alv"],[/^jardinagem/,"ext"]];
// nome do item, categoria que ele tinha na origem e (para notas) a categoria e subcategoria da nota → {cat, regra}
// regra=false: nenhuma palavra do nome bateu e a categoria saiu da pista da nota ou do grupo (aparece "confira" na tela)
function pconcClassifica(nome,catOrig,catNf,subNf){
  const n=NFN(nome),co=NFN(catOrig);let b=null;
  if(/^obras e benfeitorias mao de obra/.test(co))return{cat:PCONC_MO,regra:true};
  const ctx=PCONC_CONTEXTO.find(([re])=>re.test(n));if(ctx)return{cat:PC[ctx[1]],regra:true};
  PCONC_REGRAS.forEach(([re,k])=>{const m=re.exec(n);if(m&&(!b||m.index<b.i||(m.index===b.i&&m[0].length>b.len)))b={i:m.index,len:m[0].length,k}});
  if(b)return{cat:PC[b.k],regra:true};
  const obra=pconcEhObra(n)||pconcSubObra(catNf||"",subNf||"")||/^obras e benfeitorias/.test(co)||PCONC_CATOBRA.test(co);
  for(const s of[NFN(subNf),NFN(catNf),co]){const d=PCONC_DICA.find(([re])=>re.test(s));if(d&&(PCONC_GRUPO_DE[PC[d[1]]]===PCONC_GO)===obra)return{cat:PC[d[1]],regra:false}}
  return{cat:obra?PC.alv:PC.mov,regra:false};
}
const pconcCatPadrao=(nome,catOrig,catNf,subNf)=>pconcClassifica(nome,catOrig,catNf,subNf).cat;
// nome de categoria escrito de outro jeito (planilha, versão antiga) → nome oficial; "" se não existe
const PCONC_CAT_N=new Map();PCONC_ORDEM.forEach(c=>{PCONC_CAT_N.set(NFN(c),c);PCONC_CAT_N.set(NFN(c.split(" (")[0]),c)});
const pconcCatCanon=s=>PCONC_CAT_N.get(NFN(String(s||"").replace(/^\s*obras e benfeitorias\s*[—–-]\s*/i,"")))||"";
// aceita 120000 · 120.000 · 120.000,00 · 120000,50 · R$ 1.174,96 · 1174.96
function pconcValor(s){
  s=String(s||"").replace(/[R$\s]/g,"");if(!s)return NaN;
  if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");
  const n=Number(s);return isFinite(n)?n:NaN;
}
// nome em CAIXA ALTA vira "Título" (siglas e unidades continuam em maiúsculas)
const PCONC_SIGLAS=new Set(["TV","LED","PVC","CPVC","PPR","MDF","MDP","USB","HDMI","DPS","IDR","PP","AC","CP","II","III","IV","VI","PQS","ABC","CO2","EPI","EVA","PET","ABS","PU","PVA","GLP","DVR","NVR","CFTV","HD","SSD","RGB","UV","NR","XL","GG","XG","XXG"]);
const PCONC_PEQ=new Set(["de","da","do","das","dos","e","com","para","em","a","o","as","os","no","na","nos","nas","por","sem","ou"]);
function pconcTitulo(s){
  s=String(s||"").trim();if(!/[A-ZÀ-Þ]/.test(s)||s!==s.toUpperCase())return s;
  let primeira=true;
  return s.split(/(\s+)/).map(w=>{if(!w||/^\s+$/.test(w))return w;const ini=primeira;primeira=false;
    const nu=w.replace(/[^0-9A-ZÀ-Þ]/g,"");if(PCONC_SIGLAS.has(nu))return w;
    const l=w.toLocaleLowerCase("pt-BR");
    if(/\d/.test(w))return l.replace(/(\d)(v|w|a|l)\b/g,(m,d,u)=>d+u.toUpperCase());
    if(!ini&&PCONC_PEQ.has(l))return l;
    return l.replace(/^([^\p{L}]*)(\p{L})/u,(m,a,c)=>a+c.toLocaleUpperCase("pt-BR"));
  }).join("");
}
const pconcFornLimpo=s=>String(s||"").replace(/^\s*(local na nota|fornecedor|pago a)\s*:\s*/i,"").trim();
// número da nota sem texto e sem zeros à esquerda ("Nota fiscal nº 000452" → "452")
const pconcNfNum=s=>(String(s||"").match(/\d+/g)||[]).map(x=>x.replace(/^0+(?=\d)/,"")).join(",");
/* Itens iguais (mesmo nome, mesmo fornecedor) numa linha só: soma quantidade e valor, junta as notas e o período das compras.
   Valor unitário null = preços diferentes entre as compras ("vários"). Do maior para o menor valor. */
function pconcConsolida(L){
  const m=new Map();
  L.forEach(x=>{const f=pconcFornLimpo(x.forn),k=NFN(x.nome)+"|"+NFN(f);let a=m.get(k);
    if(!a){a={nome:x.nome,forn:f,qtd:0,total:0,units:new Set(),nfs:[],datas:[],n:0};m.set(k,a)}
    a.n++;a.qtd+=+x.qtd||0;a.total+=+x.total||0;a.units.add(Math.round((+x.unit||0)*100));
    const nf=pconcNfNum(x.nf);if(nf&&!a.nfs.includes(nf))a.nfs.push(nf);if(x.data)a.datas.push(x.data)});
  return[...m.values()].map(a=>{const d=a.datas.sort();return{nome:a.nome,forn:a.forn,qtd:Math.round(a.qtd*1000)/1000,total:Math.round(a.total*100)/100,
    unit:a.units.size===1?[...a.units][0]/100:null,nfs:a.nfs.sort((p,q)=>(+p.split(",")[0]||0)-(+q.split(",")[0]||0)),ini:d[0]||"",fim:d[d.length-1]||"",n:a.n}})
    .sort((a,b)=>b.total-a.total||a.nome.localeCompare(b.nome,"pt"));
}
/* Mapa de categorias em CSV (separado por ";"): item; nota_fiscal; valor_total; categoria_antiga; grupo_novo; categoria_nova */
function pconcCsvLer(txt){
  txt=String(txt||"").replace(/^﻿/,"");const linhas=[];let campo="",lin=[],q=false;
  for(let i=0;i<txt.length;i++){const ch=txt[i];
    if(q){if(ch==='"'){if(txt[i+1]==='"'){campo+='"';i++}else q=false}else campo+=ch;continue}
    if(ch==='"')q=true;else if(ch===";"){lin.push(campo);campo=""}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&txt[i+1]==="\n")i++;lin.push(campo);campo="";if(lin.some(c=>c.trim()))linhas.push(lin);lin=[]}
    else campo+=ch}
  lin.push(campo);if(lin.some(c=>c.trim()))linhas.push(lin);
  if(!linhas.length)return{erro:"O arquivo está vazio."};
  const cab=linhas[0].map(c=>NFN(c).trim().replace(/ +/g,"_")),col=n=>cab.indexOf(n);
  const falta=["item","nota_fiscal","valor_total","categoria_nova"].filter(n=>col(n)<0);
  if(falta.length)return{erro:"Faltam as colunas: "+falta.join(", ")+". O arquivo precisa ter cabeçalho e ser separado por ponto e vírgula (;)."};
  const v=(l,n)=>col(n)>=0?String(l[col(n)]||"").trim():"";
  return{rows:linhas.slice(1).map((l,i)=>({linha:i+2,item:v(l,"item"),nf:v(l,"nota_fiscal"),valor:pconcValor(v(l,"valor_total")),catAnt:v(l,"categoria_antiga"),grupo:v(l,"grupo_novo"),catTxt:v(l,"categoria_nova"),cat:pconcCatCanon(v(l,"categoria_nova"))}))};
}
/* Casa cada linha do CSV com um item da lista, sem chutar:
   1º nome + NF + valor total (até 1 centavo de diferença); 2º nome + valor, só quando um dos lados não tem NF.
   Cada item casa uma vez só (nomes repetidos com NF diferente ficam cada um com a sua). Primeiro procura no patrimônio;
   o que só casar com uma compra que hoje está fora volta em "fora". */
function pconcCasar(csv,L){
  const cents=v=>Math.round((+v||0)*100),usado=new Set(),idx=new Map();
  L.forEach((x,i)=>{const k=NFN(x.nome);if(!idx.has(k))idx.set(k,[]);idx.get(k).push(i)});
  const acha=(r,ok)=>{for(const i of idx.get(NFN(r.item))||[])if(!usado.has(i)&&ok(L[i])){usado.add(i);return i}return-1};
  const pares=[],semPar=[],fora=[],porValor=(r,x)=>Math.abs(cents(x.total)-cents(r.valor))<=1;
  const passos=[(r,x)=>x.inc&&pconcNfNum(x.nf)===pconcNfNum(r.nf)&&porValor(r,x),(r,x)=>x.inc&&(!pconcNfNum(r.nf)||!pconcNfNum(x.nf))&&porValor(r,x),
    (r,x)=>!x.inc&&pconcNfNum(x.nf)===pconcNfNum(r.nf)&&porValor(r,x),(r,x)=>!x.inc&&(!pconcNfNum(r.nf)||!pconcNfNum(x.nf))&&porValor(r,x)];
  let pend=csv.filter(r=>r.item&&isFinite(r.valor));const ruins=csv.filter(r=>!r.item||!isFinite(r.valor));
  passos.forEach((ok,p)=>{pend=pend.filter(r=>{const i=acha(r,x=>ok(r,x));if(i<0)return true;(p<2?pares:fora).push({r,i});return false})});
  semPar.push(...ruins,...pend);
  return{pares,fora,semPar:semPar.sort((a,b)=>a.linha-b.linha),sobra:L.map((x,i)=>i).filter(i=>L[i].inc&&!usado.has(i))};
}
/* <<< regra */
const PCONC_CATFIN=/imobiliz|equipament|moveis|movel|mobili|eletrodom/;
const pconcMarcas=()=>xcfg("infra").patConc||{};
// categoria escolhida à mão (ou importada do mapa CSV) por item: config/x_infra, patConcCat {chave do item: categoria}
const pconcCatMarcas=()=>xcfg("infra").patConcCat||{};
function pconcNfCat(r){
  const c=r.categoria;
  if(c&&!/^(sem categoria|a classificar|outros)$/i.test(c))return{cat:c,sub:r.subcategoria||""};
  const k=typeof nfClassificaX==="function"?nfClassificaX(r):null;
  return k?{cat:k.cat,sub:k.sub}:{cat:c||"",sub:""};
}
// obras, mão de obra de pedreiros e outros gastos lançados à mão nesta aba (config/x_infra, patConcObras)
const pconcObras=()=>xcfg("infra").patConcObras||[];
// categoria de uma obra lançada à mão (aceita os tipos antigos "Obras e benfeitorias — mão de obra/material" e "Outro bem")
function pconcCatManual(o){
  if(PCONC_GRUPO_DE[o.cat])return{cat:o.cat,regra:true};
  const c=NFN(o.cat);if(/mao de obra/.test(c))return{cat:PCONC_MO,regra:true};
  const a=pconcClassifica(o.desc,"","","");
  if(/material/.test(c)&&PCONC_GRUPO_DE[a.cat]!==PCONC_GO)return{cat:PC.alv,regra:false};
  return a;
}
// a obra vira também uma conta paga no Financeiro (aparece no caixa, no fluxo e na DRE)
const pconcFinCat=o=>{const c=pconcCatManual(o).cat;return PCONC_GRUPO_DE[c]===PCONC_GO?(c===PCONC_MO?"Obras e benfeitorias — mão de obra":"Obras e benfeitorias — material"):"Móveis e equipamentos"};
const pconcObraFin=o=>o.finId&&typeof finAll==="function"?finAll().find(e=>e.id===o.finId)||null:null;
function pconcFinNovo(o,conta){
  return{id:uid8(),tipo:"pagar",desc:o.desc,contra:o.contra||"",fornId:o.contra?finFornId(o.contra,null):"",cat:pconcFinCat(o),area:"",forma:"",
    obs:"lançado pela aba Patrimônio p/ concorrência"+(o.obs?" — "+o.obs:""),valor:+o.valor,venc:o.data,pago:o.data,valorPago:+o.valor,...(conta?{conta}:{}),pconcObra:o.id};
}
function pconcTodos(){
  const L=[],nomesNf=new Set();
  pconcObras().forEach(o=>L.push({k:"m:"+o.id,nome:o.desc,cat:o.cat||PCONC_MO,obra:o,qtd:1,unit:+o.valor||0,total:+o.valor||0,data:o.data||"",forn:o.contra||"",nf:"",
    onde:[o.contra?"Pago a: "+o.contra:"",o.obs].filter(Boolean).join(" · "),origem:pconcObraFin(o)?"Lançado nesta aba · pago no Financeiro":"Lançado nesta aba",auto:true,manual:true}));
  xs("ativos").filter(a=>a.estado!=="baixado").forEach(a=>L.push({k:"a:"+a.id,nome:a.nome,cat:(a.cat||"").split(" (")[0]||"Outro",qtd:1,unit:+a.valor||0,total:+a.valor||0,data:a.compra||"",forn:"",nf:"",
    onde:[a.local,a.serie].filter(Boolean).join(" · "),origem:"Cadastro de patrimônio",auto:true}));
  if(typeof f11Bens==="function")f11Bens().filter(b=>!b.baixa).forEach(b=>L.push({k:"b:"+b.id,nome:b.nome,cat:b.cat||"",qtd:1,unit:+b.valor||0,total:+b.valor||0,data:b.data||"",forn:"",nf:"",
    onde:[b.local,b.serie?"série "+b.serie:""].filter(Boolean).join(" · "),origem:"Financeiro (bens)",auto:true}));
  ((S.config.nf&&S.config.nf.rows)||[]).forEach(r=>{
    const c=pconcNfCat(r),auto=pconcAuto(r.item,c.cat,c.sub);nomesNf.add(NFN(r.item));
    L.push({k:"n:"+nfKey(r)+"|"+NFN(r.item),nome:r.item,cat:(c.cat==="Equipamentos e mobiliário"?c.sub:c.cat)||"Sem categoria",subNf:c.sub,qtd:+r.qtd||1,unit:+r.valor||0,total:+r.total||0,data:r.date||"",
      forn:r.local||"",nf:r.nota||"",onde:r.local?"Local na nota: "+r.local:"",origem:"Nota fiscal"+(r.nota?" nº "+r.nota:""),auto,catRegra:c.cat});
  });
  // compras sem nota lançadas no Financeiro (as que vieram de nota têm "nf" e já estão acima)
  if(podeVer("fin")&&typeof finAll==="function")finAll().filter(e=>e.tipo==="pagar"&&!e.nf&&!e.pconcObra).forEach(e=>{ // pagamento de obra lançada nesta aba já está acima
    const v=+(e.valorPago||e.valor)||0,auto=!PCONC_DESPESA.test(NFN(e.desc))&&(PCONC_CATFIN.test(NFN(e.cat))||PCONC_CATOBRA.test(NFN(e.cat))||pconcAuto(e.desc,""));
    L.push({k:"f:"+e.id,nome:e.desc||"(sem descrição)",cat:e.cat||"Sem categoria",qtd:1,unit:v,total:v,data:(typeof e.pago==="string"&&e.pago)||e.venc||"",forn:e.contra||"",nf:"",
      onde:e.contra?"Fornecedor: "+e.contra:"",origem:"Financeiro (compra sem nota)",auto});
  });
  // bens lançados direto no Estoque (os que vieram de nota já estão acima)
  estData().itens.filter(i=>+i.qtd>0&&!nomesNf.has(NFN(i.nome))).forEach(i=>L.push({k:"e:"+i.id,nome:i.nome,cat:i.area||"Estoque",qtd:+i.qtd||1,unit:+i.custo||0,total:(+i.qtd||0)*(+i.custo||0),
    data:(i.ultCompra&&i.ultCompra.data)||"",forn:"",nf:"",onde:i.area?"Área: "+i.area:"",origem:"Estoque",auto:pconcAuto(i.nome,"")}));
  const M=pconcMarcas(),CM=pconcCatMarcas();
  L.forEach(x=>{x.inc=M[x.k]!==undefined?!!M[x.k]:x.auto;if(!x.inc)x.motivo=M[x.k]===false?"Desmarcado à mão":pconcMotivo(x.nome,x.catRegra||"")});
  // o que é patrimônio ganha a categoria nova: a escolhida à mão/importada, senão a automática (a da origem fica guardada em catOrig)
  L.forEach(x=>{x.catOrig=x.cat;if(!x.inc)return;
    const a=x.manual?pconcCatManual(x.obra):pconcClassifica(x.nome,x.cat,x.catRegra||"",x.subNf||"");
    x.catAuto=a.cat;x.semRegra=!a.regra;x.catFix=!!PCONC_GRUPO_DE[CM[x.k]];x.cat=x.catFix?CM[x.k]:a.cat;x.grupo=PCONC_GRUPO_DE[x.cat]});
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
  return base.filter(x=>(!PCONC.grupo||pconcGrupo(x)===PCONC.grupo)&&(!PCONC.cat||x.cat===PCONC.cat)&&(!q||estNorm(x.nome+" "+x.onde+" "+x.origem+" "+x.cat).includes(q)))
    .sort((a,b)=>pconcOrdCat(a.cat)-pconcOrdCat(b.cat)||a.cat.localeCompare(b.cat,"pt")||(+b.total||0)-(+a.total||0)||a.nome.localeCompare(b.nome,"pt"));
}
const pconcG=g=>PCONC_GRUPOS.find(G=>G.g===g)||PCONC_GRUPOS[0];
const pconcBola=cor=>`<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${cor};margin-right:6px;vertical-align:middle"></span>`;
function pconcCatSel(x){
  const og=PCONC_GRUPOS.map(G=>`<optgroup label="${esc(G.g)}">${G.cats.map(c=>`<option value="${esc(c)}" ${x.catFix&&x.cat===c?"selected":""}>${esc(c)}</option>`).join("")}</optgroup>`).join("");
  return `<select data-pccatk="${esc(x.k)}" style="min-width:210px;max-width:280px;border-left:4px solid ${pconcG(pconcGrupo(x)).cor}"><option value="">Automática: ${esc(x.catAuto||x.cat)}</option>${og}</select>`;
}
function pconcHtml(){
  const T=pconcTodos(),ed=podeEd("infra"),inc=T.filter(x=>x.inc),todos=PCONC.ver==="todos",fora=PCONC.ver==="fora",nFora=T.length-inc.length;
  const base=pconcBase(T).filter(x=>!PCONC.grupo||pconcGrupo(x)===PCONC.grupo),cats=[...new Set(base.map(x=>x.cat))].sort((a,b)=>pconcOrdCat(a)-pconcOrdCat(b)||a.localeCompare(b,"pt"));
  if(PCONC.cat&&!cats.includes(PCONC.cat))PCONC.cat="";
  const vis=pconcVisiveis(T),mostra=vis.slice(0,PCONC_MAX),falta=[!podeVer("nf")?"as notas fiscais":"",!podeVer("fin")?"o Financeiro":"",!podeVer("estoque")?"o Estoque":""].filter(Boolean);
  const vg=g=>soma(inc.filter(x=>x.grupo===g),x=>+x.total||0);
  const chipG=(v,t,cor)=>`<button type="button" class="daypill ${PCONC.grupo===v?"on":""}" data-pcgrupo="${esc(v)}" style="width:auto;padding:0 12px;${cor?`border:2px solid ${cor};${PCONC.grupo===v?`background:${cor};color:#fff`:""}`:""}">${esc(t)}</button>`;
  const chip=(v,t)=>{const on=PCONC.cat===v,cor=PCONC_GRUPO_DE[v]?pconcG(PCONC_GRUPO_DE[v]):null;
    return `<button type="button" class="daypill ${on?"on":""}" data-pccat="${esc(v)}" style="width:auto;padding:0 10px;${cor?`border-left:4px solid ${cor.cor};${on?`background:${cor.claro};color:#222`:""}`:""}">${esc(t)}</button>`};
  const catCel=x=>x.inc&&ed&&!fora?pconcCatSel(x)+(x.catFix?`<div class="sub">escolhida à mão ou importada</div>`:x.semRegra?`<div class="sub">automática pela nota — confira</div>`:""):
    `<span${x.catOrig&&x.catOrig!==x.cat?` title="Categoria no lançamento: ${esc(x.catOrig)}"`:""}>${x.inc?pconcBola(pconcG(pconcGrupo(x)).cor):""}${esc(x.cat)}</span>`;
  return `<div class="card"><h2>Patrimônio para concorrência pública</h2>
   <p class="sub" style="margin:0 0 10px">Junta numa lista só os bens da casa e os gastos da obra, vindos do cadastro de Patrimônio, das notas fiscais, das compras sem nota no Financeiro e do Estoque, separados em dois grupos: <b style="color:${PCONC_GRUPOS[0].cor}">${PCONC_GB}</b> (o que pode ser levado embora) e <b style="color:${PCONC_GRUPOS[1].cor}">${PCONC_GO}</b> (o que ficou incorporado ao imóvel). Comida, fralda, remédio, peças soltas, frete, gás e itens de consumo ficam de fora. A mão de obra (ex.: pedreiros) você lança logo abaixo. A categoria de cada item é automática pelo nome; se estiver errada, troque na própria linha. Se algo entrou errado, desmarque; se faltou, escolha “Procurar em tudo que foi comprado”, busque pelo nome e marque.</p>
   ${falta.length?`<div class="callout sand" style="margin-bottom:10px">Seu perfil não enxerga ${falta.join(", ")}: a lista mostra só o que você pode ver.</div>`:""}
   <div class="stats"><div class="stat"><b>${fmtBRL(soma(inc,x=>x.total))}</b><span>patrimônio total · ${inc.length} lançamentos</span></div><div class="stat"><b style="color:${PCONC_GRUPOS[0].cor}">${fmtBRL(vg(PCONC_GB))}</b><span>${PCONC_GB}</span></div><div class="stat"><b style="color:${PCONC_GRUPOS[1].cor}">${fmtBRL(vg(PCONC_GO))}</b><span>${PCONC_GO}</span></div><div class="stat"><b>${nFora}</b><span>compras que ficaram de fora</span></div></div>
   ${ed||pconcObras().length?pconcObrasHtml(ed):""}
   ${ed?pconcImpHtml():""}
   <div class="row" style="margin:12px 0 8px;align-items:flex-end">
    <div style="flex:0 0 300px"><label>Mostrar</label><select id="pcver"><option value="lista" ${todos||fora?"":"selected"}>Só o que é patrimônio</option><option value="fora" ${fora?"selected":""}>O que ficou de fora do patrimônio (${nFora})</option><option value="todos" ${todos?"selected":""}>Procurar em tudo que foi comprado (notas, Financeiro e Estoque)</option></select></div>
    <div style="flex:1 1 220px"><label>Buscar</label><input id="pcq" placeholder="Ex.: cama, fogão, armário" value="${esc(PCONC.q)}"></div>
    <div style="flex:none"><button class="b sec" id="pcxls" ${vis.length?"":"disabled"}>${ic("down")} Excel</button></div>
    <div style="flex:none"><button class="b sec" id="pcpdf" ${vis.length?"":"disabled"}>${ic("down")} PDF</button></div></div>
   <div class="daypicker" style="flex-wrap:wrap;margin-bottom:6px">${chipG("","Todos os grupos","")}${PCONC_GRUPOS.map(G=>chipG(G.g,G.g,G.cor)).join("")}</div>
   <div class="daypicker" style="flex-wrap:wrap;margin-bottom:10px">${chip("","Todas as categorias")}${cats.map(c=>chip(c,c)).join("")}</div>
   ${todos?`<p class="sub" style="margin:0 0 8px">Marcado = entra no patrimônio. O download leva só as linhas marcadas desta busca.</p>`:""}
   ${fora?`<p class="sub" style="margin:0 0 8px">Compras que não entraram no patrimônio, com o motivo. Se alguma for um bem, marque a caixa para incluir. O download leva esta lista de fora.</p>`:""}
   ${vis.length?`<div class="wrap"><table><thead><tr>${ed?"<th>Patrimônio?</th>":""}<th>Bem</th><th>Categoria</th><th>Qtd</th><th>Valor</th><th>Aquisição</th><th>Origem</th></tr></thead><tbody>${mostra.map(x=>`<tr style="${x.inc||fora?"":"opacity:.6"}">${ed?`<td><input type="checkbox" data-pck="${esc(x.k)}" data-auto="${x.auto?1:0}" ${x.inc?"checked":""}></td>`:""}<td><b>${esc(x.nome)}</b>${x.onde?`<div class="sub">${esc(x.onde)}</div>`:""}${!x.inc&&x.motivo?`<div class="sub">Fora: ${esc(x.motivo)}</div>`:""}</td><td>${catCel(x)}</td><td class="n">${NUMF(x.qtd,0)}</td><td class="n">${fmtBRL(x.total)}</td><td class="n">${x.data?brDate(x.data):"—"}</td><td>${esc(x.origem)}${x.auto!==x.inc?` <span class="sub">(marcado à mão)</span>`:""}</td></tr>`).join("")}</tbody></table></div>
     ${vis.length>PCONC_MAX?`<p class="sub" style="margin:8px 0 0">Mostrando ${PCONC_MAX} de ${vis.length} linhas. Use a busca, o grupo ou a categoria para achar as outras (o download leva todas).</p>`:""}`:`<div class="empty">${fora?"Nenhuma compra ficou de fora"+(PCONC.q?" com esse nome":"")+".":todos&&PCONC.q?"Nada com esse nome nas notas, no Financeiro nem no Estoque. Se o bem não foi lançado em lugar nenhum, cadastre na aba Patrimônio.":"Nada encontrado."}</div>`}</div>`;
}
function pconcObrasHtml(ed){
  const O=pconcObras().slice().sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  const finEd=podeEd("fin")&&typeof finMutate==="function",contas=typeof f4ContasPag==="function"?f4ContasPag().length:0;
  const opts=PCONC_GRUPOS.map(G=>`<optgroup label="${esc(G.g)}">${G.cats.map(c=>`<option ${c===PCONC_MO?"selected":""}>${esc(c)}</option>`).join("")}</optgroup>`).join("");
  return `<details class="card" style="margin:12px 0 0;padding:10px 12px" ${O.length?"":"open"}><summary style="cursor:pointer"><b>Obras e mão de obra</b> <span class="sub">— reforma, pedreiros e outros gastos que não vieram de nota, Financeiro ou Estoque${O.length?` · ${O.length} lançamento(s), ${fmtBRL(soma(O,o=>+o.valor||0))}`:""}</span></summary>
   ${ed?`<div class="row" style="margin:10px 0 6px;align-items:flex-end">
    <div style="flex:2 1 260px"><label>Descrição</label><input id="pcodesc" placeholder="Ex.: Mão de obra dos pedreiros — reforma"></div>
    <div style="flex:1 1 240px"><label>Categoria</label><select id="pcocat">${opts}</select></div>
    <div style="flex:0 0 150px"><label>Valor (R$)</label><input id="pcoval" inputmode="decimal" placeholder="120.000,00"></div>
    <div style="flex:0 0 160px"><label>Data</label><input id="pcodata" type="date" value="${hojeIso()}"></div>
    <div style="flex:1 1 200px"><label>Pago a (pedreiro, empreiteiro)</label><input id="pcocontra" placeholder="Ex.: João da Silva"></div>
    <div style="flex:1 1 200px"><label>Detalhe (opcional)</label><input id="pcoobs" placeholder="Ex.: ampliação dos quartos"></div></div>
   <div class="row" style="margin:0 0 6px;align-items:flex-end">
    ${finEd?`<div style="flex:none"><label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink);margin-top:22px"><input type="checkbox" id="pcofin" checked> Lançar também no Financeiro como conta paga</label></div>
    ${contas>1?`<div style="flex:0 0 220px"><label>Pago com</label>${f4SelConta("pcoconta")}</div>`:""}`:`<div style="flex:1 1 300px" class="sub">Seu perfil não lança no Financeiro: o gasto fica só no patrimônio. Quem cuida do Financeiro pode usar o botão “Lançar no Financeiro” depois.</div>`}
    <div style="flex:none;margin-left:auto"><button class="b" id="pcoadd">Lançar</button></div></div>`:""}
   ${O.length?`<div class="wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Data</th><th>Financeiro</th>${ed?"<th></th>":""}</tr></thead><tbody>${O.map(o=>{const f=pconcObraFin(o);
     const fin=f?`Conta paga em ${brDate(f.pago||f.venc)}${+f.valorPago!==+o.valor&&f.valorPago!=null?` <span class="sub">(no Financeiro: ${fmtBRL(+f.valorPago)})</span>`:""}`:o.finId?`<span class="sub">Excluído no Financeiro</span>`:`<span class="sub">Não lançado</span>`;
     return`<tr><td><b>${esc(o.desc)}</b>${o.contra||o.obs?`<div class="sub">${esc([o.contra?"Pago a: "+o.contra:"",o.obs].filter(Boolean).join(" · "))}</div>`:""}</td><td>${esc(pconcCatManual(o).cat)}</td><td class="n">${fmtBRL(+o.valor||0)}</td><td class="n">${o.data?brDate(o.data):"—"}</td><td>${fin}${!f&&finEd&&ed?` <button class="b sec" data-pcofin="${esc(o.id)}">Lançar no Financeiro</button>`:""}</td>${ed?`<td><button class="b sec" data-pcodel="${esc(o.id)}">Excluir</button></td>`:""}</tr>`}).join("")}</tbody></table></div>`:""}</details>`;
}
/* Importar o mapa de categorias (CSV). Nada é gravado até a pessoa conferir o relatório e confirmar; antes de gravar,
   baixa um backup (JSON) com as categorias de todos os itens e guarda o mapa anterior para desfazer.
   Só a categoria muda: valores, datas, fornecedores, notas e a inclusão no patrimônio ficam como estão. */
function pconcImpPrepara(txt,arquivo){
  const p=pconcCsvLer(txt);if(p.erro)return{arquivo,erro:p.erro};
  const T=pconcTodos(),c=pconcCasar(p.rows,T),mapa={},catRuim=[],grupoDif=[];
  c.pares.concat(c.fora).forEach(({r,i})=>{if(!r.cat){catRuim.push(r);return}mapa[T[i].k]=r.cat;
    const g=NFN(r.grupo);if(g&&!(g.startsWith("bens")?PCONC_GRUPO_DE[r.cat]===PCONC_GB:g.startsWith("obra")?PCONC_GRUPO_DE[r.cat]===PCONC_GO:true))grupoDif.push(r)});
  const somaG=(l,g)=>Math.round(100*soma(l.filter(x=>x.g===g),x=>x.v))/100;
  const csvL=p.rows.filter(r=>isFinite(r.valor)).map(r=>({v:r.valor,g:PCONC_GRUPO_DE[r.cat]||(NFN(r.grupo).startsWith("obra")?PCONC_GO:PCONC_GB)}));
  const depL=T.filter(x=>x.inc).map(x=>({v:+x.total||0,g:PCONC_GRUPO_DE[mapa[x.k]||x.cat]||PCONC_GB}));
  const res=l=>({n:l.length,v:Math.round(100*soma(l,x=>x.v))/100,bens:somaG(l,PCONC_GB),obra:somaG(l,PCONC_GO)});
  const it=i=>({k:T[i].k,nome:T[i].nome,nf:T[i].nf,total:T[i].total,origem:T[i].origem});
  return{arquivo,nCsv:p.rows.length,nPares:c.pares.length,mapa,catRuim,grupoDif,semPar:c.semPar,fora:c.fora.map(({r,i})=>({r,x:it(i)})),sobra:c.sobra.map(it),csv:res(csvL),depois:res(depL)};
}
function pconcImpHtml(){
  const I=PCONC.imp,ant=xcfg("infra").patConcCatAnt,nFix=Object.keys(pconcCatMarcas()).length;
  const lin=(r)=>`<tr><td class="n">${r.linha}</td><td>${esc(r.item||"(sem nome)")}</td><td>${esc(r.nf||"—")}</td><td class="n">${isFinite(r.valor)?fmtBRL(r.valor):"valor inválido"}</td><td>${esc(r.catTxt||"")}</td></tr>`;
  const tab=(t,rows,cab)=>rows.length?`<p style="margin:10px 0 4px"><b>${t}</b></p><div class="wrap" style="max-height:260px;overflow:auto"><table><thead><tr>${cab}</tr></thead><tbody>${rows.slice(0,400).join("")}</tbody></table></div>${rows.length>400?`<p class="sub">Mostrando 400 de ${rows.length}.</p>`:""}`:"";
  const cabCsv="<th>Linha</th><th>Item</th><th>NF</th><th>Valor</th><th>Categoria no CSV</th>";
  const cmp=(t,a,b)=>{const ok=Math.abs(a-b)<0.005;return`<tr><td>${t}</td><td class="n">${fmtBRL(a)}</td><td class="n">${fmtBRL(b)}</td><td>${ok?"✓ igual":`<b style="color:#B3261E">diferença de ${fmtBRL(b-a)}</b>`}</td></tr>`};
  let rel="";
  if(I&&I.erro)rel=`<div class="callout sand" style="margin-top:8px">${esc(I.arquivo)}: ${esc(I.erro)}</div>`;
  else if(I){const nOk=Object.keys(I.mapa).length;
    rel=`<div class="callout" style="margin-top:8px"><b>${esc(I.arquivo)}</b> — ${I.nCsv} linhas no CSV: <b>${I.nPares}</b> casaram com itens do patrimônio${I.fora.length?`, <b>${I.fora.length}</b> casaram com compras que hoje estão fora`:""}, <b>${I.semPar.length}</b> não casaram${I.catRuim.length?`, <b>${I.catRuim.length}</b> com categoria desconhecida`:""}. ${nOk} item(ns) vão receber a categoria do CSV. Nada foi gravado ainda.</div>
     <div class="wrap" style="margin-top:8px"><table><thead><tr><th>Conferência</th><th>No CSV</th><th>No sistema depois de importar</th><th></th></tr></thead><tbody>
      <tr><td>Lançamentos</td><td class="n">${I.csv.n}</td><td class="n">${I.depois.n}</td><td>${I.csv.n===I.depois.n?"✓ igual":`<b style="color:#B3261E">diferença de ${I.depois.n-I.csv.n}</b>`}</td></tr>
      ${cmp("Patrimônio total",I.csv.v,I.depois.v)}${cmp(PCONC_GB,I.csv.bens,I.depois.bens)}${cmp(PCONC_GO,I.csv.obra,I.depois.obra)}</tbody></table></div>
     ${tab("Linhas do CSV que não casaram com nenhum item (não foram adivinhadas)",I.semPar.map(lin),cabCsv)}
     ${tab("Categoria do CSV que não existe na lista nova (estas linhas ficam sem mudança)",I.catRuim.map(lin),cabCsv)}
     ${tab("Grupo do CSV diferente do grupo da categoria (vale o grupo da categoria)",I.grupoDif.map(r=>lin(r).replace("</tr>",`<td>${esc(r.grupo)}</td></tr>`)),cabCsv+"<th>Grupo no CSV</th>")}
     ${tab("Estão no CSV, mas hoje estão fora do patrimônio (a categoria é gravada; para entrarem, marque-os na lista)",I.fora.map(({r})=>lin(r)),cabCsv)}
     ${tab("Estão no patrimônio, mas não estão no CSV (continuam com a categoria automática)",I.sobra.map(x=>`<tr><td>${esc(x.nome)}</td><td>${esc(x.nf||"—")}</td><td class="n">${fmtBRL(+x.total||0)}</td><td>${esc(x.origem)}</td></tr>`),"<th>Item</th><th>NF</th><th>Valor</th><th>Origem</th>")}
     <div class="row" style="margin-top:10px;gap:8px">${nOk?`<button class="b" id="pcimpok">Baixar backup e gravar as categorias</button>`:""}<button class="b sec" id="pcimpno">Cancelar</button></div>`}
  return `<details class="card" style="margin:12px 0 0;padding:10px 12px" ${I?"open":""}><summary style="cursor:pointer"><b>Importar mapa de categorias (CSV)</b> <span class="sub">— ${nFix?`${nFix} item(ns) com categoria escolhida à mão ou importada`:"nenhum item com categoria fixada"}</span></summary>
   <p class="sub" style="margin:8px 0">Planilha separada por ponto e vírgula com as colunas <b>item; nota_fiscal; valor_total; categoria_antiga; grupo_novo; categoria_nova</b>. Cada linha é casada com o item de mesmo nome, mesma nota e mesmo valor. Antes de gravar, você confere o relatório; ao gravar, o sistema baixa um backup com as categorias atuais. Só a categoria muda: valores, datas, fornecedores e notas não são tocados.</p>
   <div class="row" style="gap:8px;align-items:center"><input type="file" id="pcimpf" accept=".csv,text/csv" style="display:none"><button class="b sec" id="pcimp">Escolher arquivo CSV…</button>
    ${ant?`<button class="b sec" id="pcimpdesf">Desfazer a última importação (${esc(brDate(String(ant.em||"").slice(0,10)))})</button>`:""}</div>${rel}</details>`;
}
// grandes grupos do patrimônio, para o resumo do PDF/Excel
const pconcGrupo=x=>x.grupo||PCONC_GRUPO_DE[x.cat]||(PCONC_CATOBRA.test(NFN(x.cat))?PCONC_GO:PCONC_GB);
// soma por categoria, do maior para o menor valor, separada em bens e obra
function pconcPorCat(L){
  const m=new Map();L.forEach(x=>{const k=x.cat,a=m.get(k)||{cat:k,grupo:pconcGrupo(x),n:0,v:0,itens:[]};a.n++;a.v+=+x.total||0;a.itens.push(x);m.set(k,a)});
  return[...m.values()].sort((a,b)=>b.v-a.v||pconcOrdCat(a.cat)-pconcOrdCat(b.cat));
}
// resumo do Excel: cada categoria com valor, % do grupo e % do total, subtotal de cada grupo, total geral e o gráfico
function pconcResumo(L,sub,grafico){
  const tot=soma(L,x=>+x.total||0),C=pconcPorCat(L),rows=[],estilo=[],add=(r,e)=>{rows.push(r);estilo.push(e||"")};
  const pct=(v,t)=>t?100*v/t:0;
  PCONC_GRUPOS.forEach(G=>{
    const cs=C.filter(c=>c.grupo===G.g);if(!cs.length)return;const v=soma(cs,c=>c.v);
    add([G.g,null,null,null,null],"h");
    cs.forEach(c=>add([c.cat,c.n,c.v,pct(c.v,v),pct(c.v,tot)]));
    add(["Subtotal — "+G.g.toLowerCase(),soma(cs,c=>c.n),v,100,pct(v,tot)],"t");
  });
  add(["TOTAL GERAL DO PATRIMÔNIO",L.length,tot,null,100],"g");
  return{titulo:"Patrimônio — resumo por categoria",sub,sensivel:false,estilo,rows,...(grafico?{grafico}:{}),
    cols:[{h:"Categoria",w:46},{h:"Lançamentos",t:"num",w:12},{h:"Valor de compra",t:"money",w:17},{h:"% do grupo",t:"pct",w:11},{h:"% do total",t:"pct",w:11}]};
}
/* Gráfico "Para onde foi o dinheiro" (Excel): barras horizontais, uma por categoria, da maior para a menor, com % e valor ao lado.
   Verde = bens e equipamentos, marrom = obra e reforma (as cores do relatório; o nome do grupo vai na legenda e cada barra tem rótulo). */
function pconcGrafico(L){
  const C=pconcPorCat(L),tot=soma(C,c=>c.v);if(!C.length||!(tot>0))return null;
  const W=1600,P=40,TOPO=176,LH=46,H=TOPO+C.length*LH+P,cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const g=cv.getContext("2d"),TXT="#444444",MUTE="#8A8577",LINHA="#E8DFCC";
  g.fillStyle="#FFFFFF";g.fillRect(0,0,W,H);
  g.fillStyle="#1F5C29";g.font="bold 32px Arial, sans-serif";g.textBaseline="alphabetic";g.fillText("Para onde foi o dinheiro",P,P+28);
  g.fillStyle=MUTE;g.font="20px Arial, sans-serif";g.fillText(`% do valor total do patrimônio (${fmtBRL(tot)}), por categoria`,P,P+60);
  let lx=P;PCONC_GRUPOS.filter(G=>C.some(c=>c.grupo===G.g)).forEach(G=>{
    g.fillStyle=G.cor;g.beginPath();g.roundRect(lx,P+80,20,20,4);g.fill();
    const v=soma(C.filter(c=>c.grupo===G.g),c=>c.v),t=`${G.g} — ${(100*v/tot).toFixed(1).replace(".",",")}% (${fmtBRL(v)})`;
    g.fillStyle=TXT;g.font="20px Arial, sans-serif";g.fillText(t,lx+30,P+97);lx+=g.measureText(t).width+70});
  const X0=560,MAXW=W-X0-330,max=Math.max(...C.map(c=>c.v)),corta=(t,w)=>{if(g.measureText(t).width<=w)return t;while(t.length>1&&g.measureText(t+"…").width>w)t=t.slice(0,-1);return t+"…"};
  g.strokeStyle=LINHA;g.lineWidth=2;g.beginPath();g.moveTo(X0,TOPO-8);g.lineTo(X0,TOPO+C.length*LH-8);g.stroke();
  C.forEach((c,i)=>{
    const y=TOPO+i*LH,bw=Math.max(3,MAXW*c.v/max),p=100*c.v/tot;
    g.fillStyle=TXT;g.font="20px Arial, sans-serif";g.textBaseline="middle";g.textAlign="right";
    g.fillText(corta(c.cat,X0-20),X0-14,y+12);
    g.fillStyle=pconcG(c.grupo).cor;g.beginPath();g.roundRect(X0+2,y,bw,24,[0,4,4,0]);g.fill();
    g.textAlign="left";g.fillStyle=TXT;g.font="bold 20px Arial, sans-serif";const pt=p<0.1?"<0,1%":p.toFixed(1).replace(".",",")+"%";g.fillText(pt,X0+bw+14,y+12);
    const wp=g.measureText(pt).width;g.font="20px Arial, sans-serif";g.fillStyle=MUTE;g.fillText("· "+fmtBRL(c.v),X0+bw+22+wp,y+12);
  });
  return{png:cv.toDataURL("image/png"),w:W,h:H};
}
/* PDF do patrimônio (A4 deitado), no modelo aprovado: página 1 com o resumo (cartões, barra bens/material/mão de obra e as
   categorias de cada grupo); depois uma faixa por grupo e cada categoria numerada com a tabela dos itens consolidados. */
const pconcRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const PCONC_MATCOR="#C98B55"; // material de obra, na barra da página 1 (tom claro do marrom da obra)
async function pconcPdf(L,o){
  if(typeof window.jspdf==="undefined")throw new Error("Biblioteca de PDF não carregou. Recarregue a página e tente de novo.");
  const{jsPDF}=window.jspdf,lg=await logosMarca(),doc=new jsPDF({orientation:"landscape",unit:"pt",format:"a4",compress:true});
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=40,CW=W-2*M,TOPO=74,BASE=H-46;
  const FUNDO=[250,247,239],VERDE=[31,92,41],TXT=[45,45,45],MUTE=[120,115,104],LINHA=[229,223,207],ZEBRA=[246,242,233],BR=[255,255,255];
  const pc=(v,t)=>(t?100*v/t:0).toFixed(1).replace(".",",")+"%",R0=v=>"R$ "+Math.round(v).toLocaleString("pt-BR"),pl=(n,s)=>`${n} ${s}${n===1?"":"s"}`;
  const corta=(t,w)=>{if(doc.getTextWidth(t)<=w)return t;while(t.length>1&&doc.getTextWidth(t+"…")>w)t=t.slice(0,-1);return t+"…"};
  const pintadas=new Set();
  const moldura=()=>{const n=doc.internal.getCurrentPageInfo().pageNumber;if(pintadas.has(n))return;pintadas.add(n);
    doc.setFillColor(...FUNDO);doc.rect(0,0,W,H,"F");
    doc.setFillColor(...VERDE);doc.rect(0,0,W,56,"F");try{doc.addImage(lg.branco,"PNG",M,6,31,43,"logoCH","FAST")}catch(e){} // mesmo apelido: a imagem entra uma vez só no arquivo
    doc.setTextColor(...BR);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("CASA HIRO",M+42,26);
    doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.text("A ciência do cuidado com o acolhimento de casa.",M+42,38);
    doc.setFont("helvetica","bold");doc.setFontSize(12.5);doc.text("Relatório de Patrimônio",W-M,26,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text(o.sub,W-M,38,{align:"right"});
    doc.setDrawColor(...LINHA);doc.setLineWidth(0.6);doc.line(M,H-34,W-M,H-34);
    doc.setFontSize(6.5);doc.setTextColor(...MUTE);doc.text("Casa Hiro · Caraguatatuba — Litoral Norte de SP",M,H-22);doc.text("Página "+n,W-M,H-22,{align:"right"})};
  const novaPag=()=>{doc.addPage();moldura();return TOPO};
  const tot=soma(L,x=>+x.total||0),mo=soma(L.filter(x=>x.cat===PCONC_MO),x=>+x.total||0);
  const Gs=PCONC_GRUPOS.map(G=>{const its=L.filter(x=>pconcGrupo(x)===G.g),cats=pconcPorCat(its);return{...G,cor:pconcRgb(G.cor),claro:pconcRgb(G.claro),n:its.length,v:soma(its,x=>+x.total||0),cats}});
  const [GB,GO]=Gs,nCats=GB.cats.length+GO.cats.length;
  // página 1: resumo
  moldura();let y=TOPO+18;
  doc.setTextColor(...VERDE);doc.setFont("helvetica","bold");doc.setFontSize(17);doc.text("Resumo do patrimônio",M,y);
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...MUTE);
  doc.text("Tudo o que foi comprado para a casa, separado em dois grandes grupos: o que é bem (pode ser levado embora) e o que é obra (ficou incorporado ao imóvel)."+(o.filtro?" Filtro aplicado: "+o.filtro+".":""),M,y+12,{maxWidth:CW});
  y+=26;
  const cw=(CW-36)/4,ch=68;
  const card=(i,rot,val,sub,cor,cheio)=>{const x=M+i*(cw+12);
    if(cheio){doc.setFillColor(...cor);doc.roundedRect(x,y,cw,ch,5,5,"F")}
    else{doc.setFillColor(...(cor||BR));doc.roundedRect(x,y,cw,ch,5,5,"F");doc.setFillColor(...BR);doc.roundedRect(x+(cor?5:0),y,cw-(cor?5:0),ch,5,5,"F");if(cor)doc.rect(x+5,y,6,ch,"F");doc.setDrawColor(...LINHA);doc.setLineWidth(0.6);doc.roundedRect(x,y,cw,ch,5,5,"S")}
    const tc=cheio?BR:TXT,mc=cheio?[214,233,206]:MUTE;
    doc.setFont("helvetica","bold");doc.setFontSize(6.8);doc.setTextColor(...mc);doc.text(rot.toUpperCase(),x+17,y+19);
    doc.setFontSize(15);doc.setTextColor(...tc);doc.text(val,x+17,y+39);
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...mc);doc.text(sub,x+17,y+55)};
  card(0,"Patrimônio total",fmtBRL(tot),`${pl(L.length,"lançamento")} · ${pl(nCats,"categoria")}`,VERDE,true);
  card(1,GB.g,fmtBRL(GB.v),pc(GB.v,tot)+" do total",GB.cor);
  card(2,GO.g,fmtBRL(GO.v),pc(GO.v,tot)+" do total",GO.cor);
  card(3,"Só mão de obra",fmtBRL(mo),pc(mo,GO.v)+" do valor da obra",null);
  y+=ch+18;
  const seg=[[GB.g,GB.v,GB.cor],["Material de obra",GO.v-mo,pconcRgb(PCONC_MATCOR)],["Mão de obra da obra",mo,GO.cor]].filter(s=>s[1]>0.004);
  let bx=M;seg.forEach(([,v,c],i)=>{const w=tot?CW*v/tot:0;doc.setFillColor(...c);doc.rect(bx,y,Math.max(0,w-(i<seg.length-1?2:0)),12,"F");bx+=w});
  y+=27;let lx=M;doc.setFontSize(7.5);
  seg.forEach(([t,v,c])=>{doc.setFillColor(...c);doc.circle(lx+3.5,y-2.6,3.5,"F");doc.setFont("helvetica","bold");doc.setTextColor(...TXT);doc.text(t,lx+11,y);
    const w=doc.getTextWidth(t),s=`   ${R0(v)}  (${pc(v,tot)})`;doc.setFont("helvetica","normal");doc.text(s,lx+11+w,y);lx+=11+w+doc.getTextWidth(s)+24});
  y+=16;
  const pw=(CW-12)/2,maxN=Math.max(1,...Gs.map(G=>G.cats.length)),rh=Math.min(20.5,(BASE-y-36)/maxN);
  Gs.forEach((G,gi)=>{const x=M+gi*(pw+12),h=24+Math.max(1,G.cats.length)*rh+6;
    doc.setFillColor(...BR);doc.setDrawColor(...LINHA);doc.setLineWidth(0.6);doc.roundedRect(x,y,pw,h,5,5,"FD");
    doc.setFillColor(...G.cor);doc.roundedRect(x,y,pw,22,5,5,"F");doc.rect(x,y+12,pw,10,"F");
    doc.setTextColor(...BR);doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text(G.g.toUpperCase(),x+12,y+14.5);doc.text(fmtBRL(G.v),x+pw-12,y+14.5,{align:"right"});
    if(!G.cats.length){doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(...MUTE);doc.text("Nenhum item neste grupo.",x+12,y+38);return}
    const max=Math.max(...G.cats.map(c=>c.v),0.01);
    G.cats.forEach((c,i)=>{const yy=y+25+i*rh;
      if(i){doc.setDrawColor(...LINHA);doc.setLineWidth(0.4);doc.line(x+10,yy,x+pw-10,yy)}
      doc.setFont("helvetica","bold");doc.setFontSize(7.6);doc.setTextColor(...TXT);doc.text(corta(c.cat,pw*0.53-12),x+12,yy+rh*0.45);
      doc.setFont("helvetica","normal");doc.setFontSize(5.8);doc.setTextColor(...MUTE);doc.text(pl(c.n,"lançamento"),x+12,yy+rh*0.45+7);
      const bx2=x+pw*0.55,bw=62,yb=yy+rh/2-3;doc.setFillColor(...G.claro);doc.roundedRect(bx2,yb,bw,6,3,3,"F");doc.setFillColor(...G.cor);doc.roundedRect(bx2,yb,Math.max(6,bw*c.v/max),6,3,3,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(7.6);doc.setTextColor(...TXT);doc.text(fmtBRL(c.v),x+pw-46,yy+rh/2+2.6,{align:"right"});
      doc.setFont("helvetica","normal");doc.setFontSize(6.3);doc.setTextColor(...MUTE);doc.text(pc(c.v,G.v),x+pw-12,yy+rh/2+2.3,{align:"right"})});
  });
  // uma faixa por grupo e cada categoria com a sua tabela
  let num=0;const somaCons={v:0};
  Gs.filter(G=>G.n).forEach(G=>{
    y=novaPag();
    doc.setFillColor(...G.cor);doc.roundedRect(M,y,CW,44,5,5,"F");
    doc.setTextColor(...BR);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text(G.g,M+16,y+20);doc.text(fmtBRL(G.v),W-M-16,y+20,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text(G.desc,M+16,y+33);
    doc.text(`${pl(G.cats.length,"categoria")} · ${pl(G.n,"lançamento")} · ${pc(G.v,tot)} do patrimônio`,W-M-16,y+33,{align:"right"});
    y+=56;
    G.cats.forEach(c=>{num++;
      if(y+24+18+2*17>BASE)y=novaPag(); // não deixa o título da categoria sozinho no pé da página
      doc.setFillColor(...G.claro);doc.roundedRect(M,y,CW,24,4,4,"F");
      doc.setFillColor(...G.cor);doc.circle(M+14,y+12,7.5,"F");doc.setTextColor(...BR);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(String(num),M+14,y+14.7,{align:"center"});
      doc.setTextColor(...TXT);doc.setFontSize(10.5);doc.text(c.cat,M+28,y+15.8);
      const vt=fmtBRL(c.v);doc.text(vt,W-M-12,y+15.8,{align:"right"});const vw=doc.getTextWidth(vt);
      doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...MUTE);doc.text(`${pl(c.n,"lançamento")}  ·  ${pc(c.v,G.v)} do grupo  ·  ${pc(c.v,tot)} do total`,W-M-12-vw-16,y+15.3,{align:"right"});
      y+=28;
      const C=pconcConsolida(c.itens);somaCons.v+=soma(C,r=>r.total);
      const extra=C.map(r=>r.n>1?`· ${r.n} compras somadas`:"");
      doc.autoTable({startY:y,margin:{left:M,right:M,top:TOPO,bottom:H-BASE},theme:"plain",showHead:"everyPage",rowPageBreak:"avoid",
        head:[["Item","Qtd","Valor unit.","Valor total","Compra","Fornecedor","NF"]],
        body:C.map((r,i)=>[pconcTitulo(r.nome)+(extra[i]?"\n"+extra[i]:""),NUMF(r.qtd,r.qtd%1?2:0),r.unit==null?"vários":fmtBRL(r.unit),fmtBRL(r.total),
          r.ini?(r.ini===r.fim?brDate(r.ini):brDate(r.ini)+" a "+brDate(r.fim)):"—",r.forn||"—",r.nfs.length?r.nfs.join(", "):"—"]),
        styles:{font:"helvetica",fontSize:7,textColor:TXT,cellPadding:{top:3,bottom:3,left:4,right:4},lineWidth:0,valign:"middle",overflow:"linebreak",fillColor:BR},
        headStyles:{fillColor:G.cor,textColor:BR,fontStyle:"bold",fontSize:6.6},alternateRowStyles:{fillColor:ZEBRA},
        columnStyles:{0:{cellWidth:318},1:{cellWidth:34,halign:"right"},2:{cellWidth:62,halign:"right"},3:{cellWidth:66,halign:"right",fontStyle:"bold"},4:{cellWidth:72,fontSize:6.5,textColor:MUTE},5:{cellWidth:150,fontSize:6.5,textColor:MUTE},6:{cellWidth:60,fontSize:6.5,textColor:MUTE}},
        willDrawPage:()=>moldura(),
        didParseCell:d=>{if(d.section==="head"&&d.column.index>=1&&d.column.index<=3)d.cell.styles.halign="right";
          if(d.section==="body"&&d.column.index===2&&d.cell.raw==="vários")d.cell.styles.textColor=MUTE},
        // "· N compras somadas" em cinza e menor, na linha de baixo do nome
        willDrawCell:d=>{if(d.section==="body"&&d.column.index===0&&extra[d.row.index]){d.cell._l=d.cell.text.slice();d.cell.text=[]}},
        didDrawCell:d=>{const l=d.cell._l;if(!l)return;const fs=d.cell.styles.fontSize,lh=fs*doc.getLineHeightFactor(),n=l.length,x=d.cell.x+d.cell.padding("left");
          l.forEach((t,i)=>{const ult=i===n-1,yy=d.cell.y+d.cell.height/2+(i-(n-1)/2)*lh;doc.setFont("helvetica",ult?"italic":"normal");doc.setFontSize(ult?6:fs);doc.setTextColor(...(ult?MUTE:TXT));doc.text(t,x,yy,{baseline:"middle"})})}
      });
      y=doc.lastAutoTable.finalY+14;
    });
  });
  // nota final: como foi organizado e conferência do total
  const somaCat=soma(Gs,G=>soma(G.cats,c=>c.v)),bate=Math.abs(somaCat-tot)<0.005&&Math.abs(somaCons.v-tot)<0.005;
  const nota=`Itens iguais comprados do mesmo fornecedor aparecem numa linha só, com a quantidade e o valor somados e todas as notas fiscais listadas (“vários” no valor unitário indica preços diferentes entre as compras). Dentro de cada categoria, os itens estão do maior para o menor valor. Os valores são de compra, sem depreciação. `+
    (bate?`Total conferido: a soma das categorias e a soma das linhas das tabelas dão ${fmtBRL(tot)} em ${pl(L.length,"lançamento")}.`:`Atenção: a soma das categorias (${fmtBRL(somaCat)}) ou das tabelas (${fmtBRL(somaCons.v)}) não bate com o total de ${fmtBRL(tot)}.`);
  doc.setFont("helvetica","normal");doc.setFontSize(7.8);const ls=doc.splitTextToSize(nota,CW-28),hn=30+ls.length*10.5;
  if(y+hn>BASE)y=novaPag();
  doc.setFillColor(...BR);doc.setDrawColor(...LINHA);doc.setLineWidth(0.6);doc.roundedRect(M,y,CW,hn,5,5,"FD");
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...VERDE);doc.text("Como este relatório foi organizado",M+14,y+17);
  doc.setFont("helvetica","normal");doc.setFontSize(7.8);doc.setTextColor(...TXT);doc.text(ls,M+14,y+31,{lineHeightFactor:1.35});
  return doc.output("blob");
}
function pconcBaixar(fmt){
  const filtro=[PCONC.grupo,PCONC.cat,PCONC.q?"busca: "+PCONC.q:""].filter(Boolean).join(" · ");
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
  const sub=`Posição em ${brDate(hojeIso())} · valores de compra (notas fiscais)`;
  (async()=>{try{
    let blob;
    if(fmt==="pdf")blob=await pconcPdf(L,{sub,filtro});
    else{
      // todos os lançamentos (sem juntar), por grupo, categoria e valor
      const ordem=[...L].sort((a,b)=>pconcOrdCat(a.cat)-pconcOrdCat(b.cat)||(+b.total||0)-(+a.total||0)||a.nome.localeCompare(b.nome,"pt"));
      const itens={titulo:"Patrimônio — todos os itens",sub:sub+(filtro?" · "+filtro:""),sensivel:false,
        cols:[{h:"Item",w:42},{h:"Grupo",w:18},{h:"Categoria",w:30},{h:"Qtd",t:"num",w:7},{h:"Valor unitário",t:"money",w:13},{h:"Valor total",t:"money",w:13},{h:"Compra",t:"date",w:11},{h:"Fornecedor",w:28},{h:"NF",w:10},{h:"Origem",w:22}],
        rows:ordem.map(x=>[pconcTitulo(x.nome),pconcGrupo(x),x.cat,x.qtd,x.unit,x.total,x.data,pconcFornLimpo(x.forn),pconcNfNum(x.nf),x.origem]),tot:[null,null,null,"sum",null,"sum",null,null,null,null]};
      let graf=null;try{graf=pconcGrafico(L)}catch(e){console.warn("gráfico do patrimônio",e)}
      blob=await relXlsx([pconcResumo(L,sub+(filtro?" · "+filtro:""),graf),itens]);
    }
    await saveFile(`patrimonio-casa-hiro_${hojeIso()}.${fmt}`,blob);
  }catch(e){console.error(e);toast("Não foi possível gerar o arquivo: "+(e&&e.message?e.message:e),true)}})();
}
// lê o CSV como UTF-8; se não for (Excel no Windows salva em ANSI), lê como Windows-1252
async function pconcLerArquivo(f){
  const buf=await f.arrayBuffer();
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch(e){return new TextDecoder("windows-1252").decode(buf)}
}
function pconcBind(){
  const re=()=>go("infra",true);
  const v=$("pcver");if(v)v.onchange=()=>{PCONC.ver=v.value;PCONC.cat="";re()};
  const q=$("pcq");if(q)q.oninput=()=>{PCONC.q=q.value;re();const n=$("pcq");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
  document.querySelectorAll("[data-pcgrupo]").forEach(b=>b.onclick=()=>{PCONC.grupo=b.dataset.pcgrupo;if(PCONC.cat&&PCONC.grupo&&PCONC_GRUPO_DE[PCONC.cat]!==PCONC.grupo)PCONC.cat="";re()});
  document.querySelectorAll("[data-pccat]").forEach(b=>b.onclick=()=>{PCONC.cat=b.dataset.pccat;re()});
  document.querySelectorAll("[data-pck]").forEach(c=>c.onchange=()=>{
    if(!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const M={...pconcMarcas()},k=c.dataset.pck;
    if(c.checked===(c.dataset.auto==="1"))delete M[k];else M[k]=c.checked; // só guarda o que foi mudado à mão
    xcfgSave("infra",{patConc:M});re()});
  document.querySelectorAll("[data-pccatk]").forEach(s=>s.onchange=()=>{
    if(!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const M={...pconcCatMarcas()},k=s.dataset.pccatk;
    if(s.value&&PCONC_GRUPO_DE[s.value])M[k]=s.value;else delete M[k];
    xcfgSave("infra",{patConcCat:M});toast(s.value?`Categoria: ${s.value}`:"Categoria automática de volta.");re()});
  const imp=$("pcimp"),impf=$("pcimpf");
  if(imp&&impf){imp.onclick=()=>impf.click();impf.onchange=async()=>{const f=impf.files&&impf.files[0];if(!f)return;
    try{PCONC.imp=pconcImpPrepara(await pconcLerArquivo(f),f.name)}catch(e){console.error(e);PCONC.imp={arquivo:f.name,erro:"Não foi possível ler o arquivo: "+(e&&e.message?e.message:e)}}re()}}
  const impno=$("pcimpno");if(impno)impno.onclick=()=>{PCONC.imp=null;re()};
  const impok=$("pcimpok");if(impok)impok.onclick=async()=>{
    const I=PCONC.imp;if(!I||!I.mapa||!podeEd("infra"))return toast("Seu perfil não permite.",true);
    const n=Object.keys(I.mapa).length;
    if(!await askConfirm(`Gravar a categoria de ${n} item(ns) a partir de "${I.arquivo}"? Antes, o sistema baixa um backup com as categorias atuais. Valores, datas, fornecedores e notas não mudam.`,"Baixar backup e gravar"))return;
    const ant=pconcCatMarcas(),T=pconcTodos();
    const backup={tipo:"backup das categorias do patrimônio",em:new Date().toISOString(),patConcCat:ant,patConc:pconcMarcas(),
      itens:T.filter(x=>x.inc).map(x=>({k:x.k,nome:x.nome,grupo:pconcGrupo(x),categoria:x.cat,automatica:x.catAuto,total:x.total,data:x.data,nf:x.nf,fornecedor:x.forn,origem:x.origem}))};
    let ok=false;try{ok=await saveFile(`patrimonio-categorias-backup_${hojeIso()}.json`,new Blob([JSON.stringify(backup,null,1)],{type:"application/json"}))}catch(e){console.error(e)}
    if(!ok)return toast("O backup não foi baixado; nada foi gravado.",true);
    xcfgSave("infra",{patConcCat:{...ant,...I.mapa},patConcCatAnt:{em:backup.em,arquivo:I.arquivo,mapa:ant}});
    PCONC.imp=null;toast(`Categorias gravadas em ${n} item(ns). O backup foi baixado.`);re()};
  const desf=$("pcimpdesf");if(desf)desf.onclick=async()=>{
    const a=xcfg("infra").patConcCatAnt;if(!a||!podeEd("infra"))return;
    if(!await askConfirm(`Voltar as categorias para como estavam antes da importação de "${a.arquivo||"CSV"}"? As trocas feitas à mão depois disso também voltam.`,"Desfazer"))return;
    xcfgSave("infra",{patConcCat:a.mapa||{},patConcCatAnt:null});toast("Importação desfeita.");re()};
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
    const M={...pconcMarcas()};delete M["m:"+id];const CM={...pconcCatMarcas()};delete CM["m:"+id];
    xcfgSave("infra",{patConcObras:pconcObras().filter(x=>x.id!==id),patConc:M,patConcCat:CM});re()});
  const x=$("pcxls");if(x)x.onclick=()=>pconcBaixar("xlsx");
  const p=$("pcpdf");if(p)p.onclick=()=>pconcBaixar("pdf");
}
{const t=PGX.infra.tabs,i=t.findIndex(x=>x.k==="ativos");t.splice(i+1,0,{k:"conc",l:"Patrimônio p/ concorrência",html:pconcHtml,bind:pconcBind})}
