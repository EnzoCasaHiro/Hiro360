'use strict';
/* Patrimônio para concorrência: o que é bem (fogão, cama, armário) e o que é consumo ou peça (rode com: npm test) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');

const ler = f => fs.readFileSync(path.join(__dirname, '../src/app', f), 'utf8').replace(/\r\n/g, '\n');
const trecho = (f, ini, fim) => { const s = ler(f), a = s.indexOf(ini), b = s.indexOf(fim, a); assert.ok(a >= 0 && b > a, 'trecho não encontrado em ' + f); return s.slice(a, b); };

// regras de classificação das notas (037) e a regra do patrimônio (088-z), com nomes inventados
function regra() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext([
    trecho('037-notas-fiscais-classificacao-automatica-editar.js', 'const NFN=', '\nconst NFX_CC'),
    trecho('088-z-patrimonio-concorrencia.js', '/* >>> regra */', '/* <<< regra */'),
    'this.f={pconcAuto};'
  ].join('\n'), ctx);
  return ctx.f.pconcAuto;
}

test('fogão, cama e armário são patrimônio mesmo com outra categoria na nota', () => {
  const auto = regra();
  assert.strictEqual(auto('FOGAO 4 BOCAS ATLAS', 'Utensílios e descartáveis'), true);
  assert.strictEqual(auto('Fogão industrial 6 bocas', 'Cozinha'), true);
  assert.strictEqual(auto('CAMA BOX SOLTEIRO', 'Outros'), true);
  assert.strictEqual(auto('COLCHAO D33 SOLTEIRO', 'A classificar'), true);
  assert.strictEqual(auto('GUARDA-ROUPA 6 PORTAS', ''), true);
  assert.strictEqual(auto('COOKTOP 5 BOCAS', 'Sem categoria'), true);
  assert.strictEqual(auto('Smart TV 50"', 'Tecnologia'), true);
});

test('categoria "Equipamentos e mobiliário" sempre entra', () => {
  assert.strictEqual(regra()('ITEM 123', 'Equipamentos e mobiliário'), true);
});

test('peças, roupa de cama e consumo não são patrimônio', () => {
  const auto = regra();
  assert.strictEqual(auto('MANGUEIRA PARA FOGAO 1,20M', 'Manutenção e reparos'), false);
  assert.strictEqual(auto('JOGO DE CAMA SOLTEIRO', 'Enxoval e uniformes'), false);
  assert.strictEqual(auto('LENCOL DE CAMA HOSPITALAR', 'Enxoval e uniformes'), false);
  assert.strictEqual(auto('TOALHA DE MESA', ''), false);
  assert.strictEqual(auto('FRALDA GERIATRICA G', 'Material de enfermagem'), false);
  assert.strictEqual(auto('ARROZ 5KG', 'Alimentação'), false);
  assert.strictEqual(auto('MESA', 'Alimentação'), false); // categoria de consumo escolhida à mão vale
});

test('frete, carga de gás e serviços ligados a um bem são despesa', () => {
  const auto = regra();
  assert.strictEqual(auto('Frete de Cama de Solteiro Madeida Maciça (Lançamento 140)', ''), false);
  assert.strictEqual(auto('Carga de Gas Butano Fogão 227G Nautika', ''), false);
  assert.strictEqual(auto('Carga de Gás Butano Fogão 227G Nautika', 'Equipamentos e mobiliário'), false);
  assert.strictEqual(auto('MONTAGEM GUARDA-ROUPA', ''), false);
  assert.strictEqual(auto('INSTALACAO AR CONDICIONADO', ''), false);
  assert.strictEqual(auto('CAMA DE SOLTEIRO MADEIRA MACICA', ''), true);
});

test('material da obra entra: piso, luminária, porta, janela, louças, tinta, elétrica', () => {
  const auto = regra();
  for (const n of ['PISO PORCELANATO 60X60 ACETINADO', 'Porcelanato polido 80x80', 'LUMINARIA LED SOBREPOR 40W', 'PLAFON LED 18W',
    'PORTA DE MADEIRA 80X210', 'Porta pivotante', 'JANELA DE CORRER ALUMINIO', 'VASO SANITARIO COM CAIXA ACOPLADA', 'CUBA DE APOIO',
    'TORNEIRA MONOCOMANDO', 'TINTA ACRILICA FOSCA 18L', 'ARGAMASSA AC3 20KG', 'CIMENTO CP II 50KG', 'DISJUNTOR BIPOLAR 40A',
    'FIO FLEXIVEL 2,5MM 100M', 'TUBO PVC 50MM', 'BARRA DE APOIO 80CM', 'Material de construção'])
    assert.strictEqual(auto(n, 'Manutenção e reparos'), true, n);
});

test('parece obra mas não é: acessório, consumo, mão de obra e frete', () => {
  const auto = regra();
  for (const n of ['PORTA TOALHA INOX', 'PORTA PAPEL HIGIENICO', 'TINTA PARA IMPRESSORA', 'PILHA AA ALCALINA', 'CABO USB TIPO C',
    'LUVA DE PROCEDIMENTO M', 'TUBO DE ENSAIO', 'FIO DENTAL 50M', 'Pedreiro — semana 3', 'Diária eletricista', 'FRETE PORCELANATO', 'INSTALACAO DE LUMINARIAS'])
    assert.strictEqual(auto(n, ''), false, n);
  assert.strictEqual(auto('LUMINARIA LED', 'Limpeza e higiene'), false); // categoria de consumo escolhida na nota vale
});

test('elétrica, hidráulica e acabamento da obra entram pelo nome', () => {
  const auto = regra();
  for (const n of ['LAMPADA LED 9W', 'FITA LED 5M', 'PAINEL LED 24W EMBUTIR', 'CABO PP 3X1,5', 'CABO FLEXIVEL 4MM', 'ELETRODUTO CORRUGADO 25MM',
    'CAIXA 4X2 AMARELA', 'QUADRO DE DISTRIBUICAO 12 DISJUNTORES', 'DPS 275V', 'CONDUITE 3/4', 'SENSOR DE PRESENCA TETO', 'FITA ISOLANTE 20M',
    'REGISTRO DE GAVETA 3/4', 'JOELHO 90 PVC 25MM', 'LUVA SOLDAVEL 25MM', 'CAIXA SIFONADA 150', 'VALVULA DE DESCARGA', 'ENGATE FLEXIVEL 40CM',
    'FECHADURA EXTERNA', 'DOBRADICA 3 POL', 'GRANITO PRETO SAO GABRIEL', 'RODAPE POLIESTIRENO', 'TELHA FIBROCIMENTO', 'VERNIZ MARITIMO'])
    assert.strictEqual(auto(n, ''), true, n);
});

test('item de elétrica, hidráulica ou construção na nota entra mesmo com nome desconhecido', () => {
  const auto = regra();
  assert.strictEqual(auto('XPTO 123 ABC', 'Manutenção e reparos', 'Elétrica e iluminação'), true);
  assert.strictEqual(auto('XPTO 123 ABC', 'Manutenção e reparos', 'Hidráulica'), true);
  assert.strictEqual(auto('XPTO 123 ABC', 'Manutenção e reparos', 'Construção, pintura e ferramentas'), true);
  assert.strictEqual(auto('XPTO 123 ABC', 'Manutenção e reparos', 'Jardinagem e controle de pragas'), false);
  assert.strictEqual(auto('PILHA AA', 'Manutenção e reparos', 'Elétrica e iluminação'), false);
  assert.strictEqual(auto('FRETE', 'Manutenção e reparos', 'Hidráulica'), false);
});

test('categoria de obra no Financeiro é reconhecida; manutenção do dia a dia não', () => {
  const linha = trecho('088-z-patrimonio-concorrencia.js', 'const PCONC_CATOBRA=', ';');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(linha + ';this.r=PCONC_CATOBRA;', ctx);
  for (const c of ['obras e benfeitorias mao de obra', 'obra', 'reforma', 'material de construcao', 'benfeitorias']) assert.ok(ctx.r.test(c), c);
  for (const c of ['manutencao e reformas', 'manobras', 'alimentacao']) assert.ok(!ctx.r.test(c), c);
});

test('resumo do PDF/Excel: total geral, total da obra e gasto por grupo, categoria e origem', () => {
  const ctx = { soma: (l, f) => l.reduce((s, x) => s + f(x), 0) }; vm.createContext(ctx);
  vm.runInContext([
    trecho('037-notas-fiscais-classificacao-automatica-editar.js', 'const NFN=', '\nconst NFX_CC'),
    trecho('088-z-patrimonio-concorrencia.js', '/* >>> regra */', '/* <<< regra */'),
    trecho('088-z-patrimonio-concorrencia.js', '// grandes grupos do patrimônio', 'function pconcBaixar'),
    'this.f={pconcResumo};'
  ].join('\n'), ctx);
  const L = [
    { nome: 'Mão de obra dos pedreiros', cat: 'Obras e benfeitorias — mão de obra', qtd: 1, total: 120000, origem: 'Lançado nesta aba' },
    { nome: 'PORCELANATO 60X60', cat: 'Obras e benfeitorias — pisos e revestimentos', qtd: 40, total: 6000, origem: 'Nota fiscal nº 10' },
    { nome: 'CABO PP 3X1,5', cat: 'Obras e benfeitorias — elétrica e iluminação', qtd: 2, total: 1000, origem: 'Nota fiscal nº 11' },
    { nome: 'FOGAO 6 BOCAS', cat: 'Cozinha', qtd: 1, total: 3000, origem: 'Financeiro (compra sem nota)' },
  ];
  const r = ctx.f.pconcResumo(L, 'teste'), linha = t => r.rows.find(x => x[0] === t);
  assert.strictEqual(JSON.stringify(linha('TOTAL GERAL DO PATRIMÔNIO').slice(1)), '[4,44,130000,100]');
  assert.strictEqual(linha('Subtotal — obra')[3], 127000);
  assert.strictEqual(linha('Subtotal — bens e equipamentos')[3], 3000);
  assert.strictEqual(linha('Obras e benfeitorias — pisos e revestimentos')[3], 6000);
  assert.ok(Math.abs(linha('Obras e benfeitorias — mão de obra')[4] - 100 * 120000 / 130000) < 1e-9);
  // bens primeiro, depois obra; dentro de cada um, do maior para o menor valor
  const cats = r.rows.map(x => x[0]);
  assert.ok(cats.indexOf('Bens e equipamentos') < cats.indexOf('Obra (material e mão de obra)'));
  assert.ok(cats.indexOf('Obras e benfeitorias — mão de obra') < cats.indexOf('Obras e benfeitorias — pisos e revestimentos'));
  assert.ok(!cats.some(c => /casa/i.test(c)));
  assert.strictEqual(r.rows.length, r.estilo.length);
});

test('categoria padronizada: o mesmo tipo de item fica sempre na mesma categoria, venha de onde vier', () => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext([
    trecho('037-notas-fiscais-classificacao-automatica-editar.js', 'const NFN=', '\nconst NFX_CC'),
    trecho('088-z-patrimonio-concorrencia.js', '/* >>> regra */', '/* <<< regra */'),
    'this.f={pconcCatPadrao};'
  ].join('\n'), ctx);
  const p = ctx.f.pconcCatPadrao;
  // a mesma cama vinda de lugares com categorias diferentes
  for (const [cat, catNf, sub] of [['Casa', '', ''], ['Mobiliário', 'Equipamentos e mobiliário', 'Mobiliário'], ['Quarto', '', ''], ['Camas e superfícies de apoio', 'Equipamentos e mobiliário', 'Camas e superfícies de apoio'], ['Móveis e equipamentos', '', '']])
    assert.strictEqual(p('CAMA DE SOLTEIRO MADEIRA MACICA', cat, catNf, sub), 'Camas e colchões', cat);
  assert.strictEqual(p('COLCHAO D33', 'Casa'), 'Camas e colchões');
  assert.strictEqual(p('GUARDA-ROUPA 6 PORTAS', 'Casa'), 'Móveis');
  assert.strictEqual(p('ARMARIO 2 PORTAS', 'Cozinha'), 'Móveis');
  assert.strictEqual(p('FOGAO 6 BOCAS', 'Casa'), 'Eletrodomésticos');
  assert.strictEqual(p('CADEIRA DE RODAS', 'Casa'), 'Equipamentos de saúde e mobilidade');
  assert.strictEqual(p('CADEIRA FIXA', 'Casa'), 'Móveis');
  assert.strictEqual(p('SMART TV 50', 'Casa'), 'Eletrônicos e informática');
  assert.strictEqual(p('AR CONDICIONADO 12000', 'Casa'), 'Climatização');
  // obra: material separado pelo que é
  assert.strictEqual(p('PISO PORCELANATO 60X60', 'Casa'), 'Obras e benfeitorias — pisos e revestimentos');
  assert.strictEqual(p('LUMINARIA LED', 'Casa'), 'Obras e benfeitorias — elétrica e iluminação');
  assert.strictEqual(p('CABO PP 3X1,5', 'Manutenção e reparos', 'Manutenção e reparos', 'Elétrica e iluminação'), 'Obras e benfeitorias — elétrica e iluminação');
  assert.strictEqual(p('VASO SANITARIO', 'Casa'), 'Obras e benfeitorias — hidráulica e louças');
  assert.strictEqual(p('PORTA DE MADEIRA 80X210', 'Casa'), 'Obras e benfeitorias — portas, janelas e vidros');
  assert.strictEqual(p('TINTA ACRILICA 18L', 'Casa'), 'Obras e benfeitorias — pintura e impermeabilização');
  assert.strictEqual(p('CIMENTO CP II', 'Casa'), 'Obras e benfeitorias — construção e acabamento');
  assert.strictEqual(p('XPTO 123', 'Manutenção e reparos', 'Manutenção e reparos', 'Hidráulica'), 'Obras e benfeitorias — hidráulica e louças');
  assert.strictEqual(p('Pagamento loja de material', 'Obras e reformas'), 'Obras e benfeitorias — outros gastos da obra');
});

test('decoração entra no patrimônio e tem categoria própria', () => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext([
    trecho('037-notas-fiscais-classificacao-automatica-editar.js', 'const NFN=', '\nconst NFX_CC'),
    trecho('088-z-patrimonio-concorrencia.js', '/* >>> regra */', '/* <<< regra */'),
    'this.f={pconcCatPadrao,pconcAuto};'
  ].join('\n'), ctx);
  const { pconcCatPadrao: p, pconcAuto: auto } = ctx.f;
  for (const n of ['QUADRO DECORATIVO 60X90', 'Quadro abstrato', 'ESPELHO DECORATIVO REDONDO', 'CORTINA BLACKOUT 2,80M', 'TAPETE SALA 2X1,5',
    'ABAJUR DE MESA', 'LUMINARIA DE CHAO', 'RELOGIO DE PAREDE', 'VASO DECORATIVO', 'PLANTA ARTIFICIAL', 'PAPEL DE PAREDE']) {
    assert.strictEqual(auto(n, 'Enxoval e uniformes'), true, n);
    assert.strictEqual(p(n, 'Casa'), 'Decoração', n);
  }
  assert.strictEqual(p('QUADRO DE DISTRIBUICAO 12 DISJUNTORES', 'Casa'), 'Obras e benfeitorias — elétrica e iluminação');
  assert.strictEqual(auto('TAPETE HIGIENICO', ''), false);
  assert.strictEqual(p('APARADOR MADEIRA', 'Casa'), 'Móveis');
  assert.strictEqual(p('TORRADEIRA', 'Casa'), 'Eletrodomésticos');
});
