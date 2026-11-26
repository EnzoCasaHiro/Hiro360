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

// regra completa (classificação, consolidação, CSV) num contexto isolado
function tudo() {
  const ctx = { soma: (l, f) => l.reduce((s, x) => s + f(x), 0) }; vm.createContext(ctx);
  vm.runInContext([
    trecho('037-notas-fiscais-classificacao-automatica-editar.js', 'const NFN=', '\nconst NFX_CC'),
    trecho('088-z-patrimonio-concorrencia.js', '/* >>> regra */', '/* <<< regra */'),
    trecho('088-z-patrimonio-concorrencia.js', '// grandes grupos do patrimônio', '/* Gráfico'),
    'this.f={pconcCatPadrao,pconcClassifica,pconcAuto,pconcResumo,pconcConsolida,pconcCsvLer,pconcCasar,pconcTitulo,pconcFornLimpo,pconcNfNum,pconcCatCanon,pconcValor,PCONC_GRUPOS,PCONC_GRUPO_DE};'
  ].join('\n'), ctx);
  return ctx.f;
}
const BENS = 'Bens e equipamentos', OBRA = 'Obra e reforma';

test('23 categorias em dois grupos, sem "Outros", "Casa", "Climatização" nem prefixo "Obras e benfeitorias"', () => {
  const { PCONC_GRUPOS: G, PCONC_GRUPO_DE } = tudo();
  assert.strictEqual(JSON.stringify(G.map(g => g.g)), JSON.stringify([BENS, OBRA]));
  assert.strictEqual(G[0].cats.length, 11);
  assert.strictEqual(G[1].cats.length, 12);
  const todas = Object.keys(PCONC_GRUPO_DE);
  assert.strictEqual(todas.length, 23);
  assert.ok(!todas.some(c => /outros|^casa$|climatiza|obras e benfeitorias|construção e acabamento/i.test(c)), todas.join());
  assert.strictEqual(G[0].cor, '#2E7D33'); assert.strictEqual(G[0].claro, '#DCEBD5');
  assert.strictEqual(G[1].cor, '#9A5B2E'); assert.strictEqual(G[1].claro, '#F3E3D3');
});

test('categoria padronizada: o mesmo tipo de item fica sempre na mesma categoria, venha de onde vier', () => {
  const { pconcCatPadrao: p } = tudo();
  for (const [cat, catNf, sub] of [['Casa', '', ''], ['Mobiliário', 'Equipamentos e mobiliário', 'Mobiliário'], ['Quarto', '', ''], ['Camas e superfícies de apoio', 'Equipamentos e mobiliário', 'Camas e superfícies de apoio']])
    assert.strictEqual(p('CAMA DE SOLTEIRO MADEIRA MACICA', cat, catNf, sub), 'Dormitórios (camas, colchões e cabeceiras)', cat);
  const casos = {
    'COLCHAO D33': 'Dormitórios (camas, colchões e cabeceiras)', 'MESA DE CABECEIRA 2 GAVETAS': 'Dormitórios (camas, colchões e cabeceiras)',
    'GUARDA-ROUPA 6 PORTAS': 'Móveis', 'ARMARIO 2 PORTAS': 'Móveis', 'CADEIRA FIXA': 'Móveis', 'MESA DE JANTAR 4 LUGARES': 'Móveis',
    'FOGAO 6 BOCAS': 'Eletrodomésticos', 'AR CONDICIONADO 12000': 'Eletrodomésticos', 'VENTILADOR DE TETO': 'Eletrodomésticos',
    'CADEIRA DE RODAS': 'Saúde, mobilidade e acessibilidade', 'BARRA DE APOIO 80CM': 'Saúde, mobilidade e acessibilidade',
    'EXTINTOR PQS 4KG': 'Segurança e controle de acesso', 'NOTEBOOK 15': 'Escritório, eletrônicos e avisos', 'QUADRO DE AVISOS': 'Escritório, eletrônicos e avisos',
    'JOGO DE PANELAS': 'Cozinha e utensílios', 'CHURRASQUEIRA A CARVAO': 'Área externa e jardim',
    'Mão de obra dos pedreiros': 'Mão de obra', 'PISO PORCELANATO 60X60': 'Pisos, revestimentos e antiderrapantes',
    'LUMINARIA LED SOBREPOR': 'Iluminação', 'CABO PP 3X1,5': 'Elétrica', 'DISJUNTOR BIPOLAR 40A': 'Elétrica',
    'VASO SANITARIO': 'Louças, metais e cubas', 'TUBO PVC 50MM': 'Hidráulica (tubos, conexões e registros)', 'JOELHO 90 PVC 25MM': 'Hidráulica (tubos, conexões e registros)',
    'PORTA DE MADEIRA 80X210': 'Portas, ferragens e fechaduras', 'TINTA ACRILICA 18L': 'Pintura e impermeabilização', 'CIMENTO CP II': 'Alvenaria e material básico',
    'TELHA FIBROCIMENTO': 'Cobertura e sombreamento', 'PLACA DE GESSO DRYWALL': 'Gesso, drywall e forro', 'PARAFUSO SEXTAVADO 1/4': 'Ferramentas e consumíveis da obra'
  };
  for (const [n, c] of Object.entries(casos)) assert.strictEqual(p(n, 'Casa'), c, n);
  assert.strictEqual(p('CABO PP 3X1,5', 'Manutenção e reparos', 'Manutenção e reparos', 'Elétrica e iluminação'), 'Elétrica');
  assert.strictEqual(p('XPTO 123', 'Manutenção e reparos', 'Manutenção e reparos', 'Hidráulica'), 'Hidráulica (tubos, conexões e registros)');
  assert.strictEqual(p('Lançamento qualquer', 'Obras e benfeitorias — mão de obra'), 'Mão de obra');
});

test('erros conhecidos do classificador antigo não voltam (exceções vêm antes da palavra solta)', () => {
  const { pconcCatPadrao: p } = tudo();
  assert.strictEqual(p('SAPATO ANTIDERRAPANTE BRANCO 38', ''), 'Enxoval, uniformes e EPI'); // não é piso
  assert.strictEqual(p('TORNEIRA DE MESA BICA ALTA', ''), 'Louças, metais e cubas'); // não é móvel
  assert.strictEqual(p('TORNEIRA PARA BANCADA', ''), 'Louças, metais e cubas');
  assert.strictEqual(p('XICARA DE VIDRO 200ML', ''), 'Cozinha e utensílios'); // não é porta/vidro
  assert.strictEqual(p('ARMARIO ROUPEIRO ACO 8 PORTAS', ''), 'Móveis'); // não é porta
  assert.strictEqual(p('ROUPEIRO DE ACO 4 PORTAS', ''), 'Móveis');
  assert.strictEqual(p('FITA ANTIDERRAPANTE 50MM', ''), 'Pisos, revestimentos e antiderrapantes');
  assert.strictEqual(p('PISO CINZA EPOXI 18L', ''), 'Pintura e impermeabilização'); // tinta de piso
  assert.strictEqual(p('ESPELHO OVAL DE PAREDE COM MOLDURA', ''), 'Decoração');
  assert.strictEqual(p('ESPELHO PVC 1 TECLA', ''), 'Elétrica');
  assert.strictEqual(p('CADEIRA DE FIBRA PARA AREA EXTERNA', ''), 'Área externa e jardim');
  assert.strictEqual(p('PORTA TOALHA INOX', ''), 'Louças, metais e cubas');
  assert.strictEqual(p('PORTA PRONTA 80X210', ''), 'Portas, ferragens e fechaduras');
  assert.strictEqual(p('DISCO DE CORTE PARA PORCELANATO', ''), 'Pisos, revestimentos e antiderrapantes');
  assert.strictEqual(p('QUADRO DE DISTRIBUICAO 12 DISJUNTORES', ''), 'Elétrica');
  assert.strictEqual(p('QUADRO DECORATIVO 60X90', ''), 'Decoração');
});

test('nome sem palavra conhecida: usa a pista da nota e avisa que é para conferir', () => {
  const { pconcClassifica: c } = tudo();
  const a = c('XPTO 123', 'Utensílios e descartáveis', 'Utensílios e descartáveis', '');
  assert.strictEqual(a.cat, 'Cozinha e utensílios'); assert.strictEqual(a.regra, false);
  assert.strictEqual(c('XPTO 123', '', '', '').cat, 'Móveis');
  assert.strictEqual(c('XPTO 123', 'Obras e reformas', '', '').cat, 'Alvenaria e material básico');
  assert.strictEqual(c('PORCELANATO 60X60', '', '', '').regra, true);
});

test('decoração entra no patrimônio e tem categoria própria', () => {
  const { pconcCatPadrao: p, pconcAuto: auto } = tudo();
  for (const n of ['QUADRO DECORATIVO 60X90', 'Quadro abstrato', 'ESPELHO DECORATIVO REDONDO', 'CORTINA BLACKOUT 2,80M', 'TAPETE SALA 2X1,5',
    'ABAJUR DE MESA', 'LUMINARIA DE CHAO', 'RELOGIO DE PAREDE', 'VASO DECORATIVO', 'PLANTA ARTIFICIAL', 'PAPEL DE PAREDE']) {
    assert.strictEqual(auto(n, 'Enxoval e uniformes'), true, n);
    assert.strictEqual(p(n, 'Casa'), 'Decoração', n);
  }
  assert.strictEqual(auto('TAPETE HIGIENICO', ''), false);
  assert.strictEqual(p('APARADOR MADEIRA', 'Casa'), 'Móveis');
  assert.strictEqual(p('TORRADEIRA', 'Casa'), 'Eletrodomésticos');
});

test('resumo do Excel: total geral, subtotal por grupo, % do grupo e % do total, sem "Unidades"', () => {
  const { pconcResumo } = tudo();
  const L = [
    { nome: 'Mão de obra dos pedreiros', cat: 'Mão de obra', qtd: 1, total: 120000 },
    { nome: 'PORCELANATO 60X60', cat: 'Pisos, revestimentos e antiderrapantes', qtd: 40, total: 6000 },
    { nome: 'CABO PP 3X1,5', cat: 'Elétrica', qtd: 2, total: 1000 },
    { nome: 'FOGAO 6 BOCAS', cat: 'Eletrodomésticos', qtd: 1, total: 3000 },
  ];
  const r = pconcResumo(L, 'teste'), linha = t => r.rows.find(x => x[0] === t);
  assert.ok(!r.cols.some(c => /unidade/i.test(c.h)));
  assert.strictEqual(JSON.stringify(linha('TOTAL GERAL DO PATRIMÔNIO').slice(1, 3)), '[4,130000]');
  assert.strictEqual(linha('Subtotal — obra e reforma')[2], 127000);
  assert.strictEqual(linha('Subtotal — bens e equipamentos')[2], 3000);
  assert.ok(Math.abs(linha('Mão de obra')[3] - 100 * 120000 / 127000) < 1e-9); // % do grupo
  assert.ok(Math.abs(linha('Mão de obra')[4] - 100 * 120000 / 130000) < 1e-9); // % do total
  const cats = r.rows.map(x => x[0]);
  assert.ok(cats.indexOf(BENS) < cats.indexOf(OBRA));
  assert.ok(cats.indexOf('Mão de obra') < cats.indexOf('Pisos, revestimentos e antiderrapantes'));
  assert.strictEqual(r.rows.length, r.estilo.length);
});

test('itens iguais do mesmo fornecedor viram uma linha: soma, todas as NFs, período e "vários"', () => {
  const { pconcConsolida } = tudo();
  const L = [
    { nome: 'CADEIRA PRETA KIT 4', forn: 'Local na nota: Loja Exemplo', qtd: 1, unit: 260, total: 250, nf: '459', data: '2026-08-04' },
    { nome: 'Cadeira Preta Kit 4', forn: 'Loja Exemplo', qtd: 1, unit: 270.24, total: 270.24, nf: '484', data: '2026-08-26' },
    { nome: 'CADEIRA PRETA KIT 4', forn: 'Outra Loja', qtd: 2, unit: 100, total: 200, nf: '12', data: '2026-07-01' },
    { nome: 'MESA', forn: '', qtd: 1, unit: 900, total: 900, nf: '', data: '2026-07-01' },
  ];
  const C = pconcConsolida(L);
  assert.strictEqual(C.length, 3);
  assert.strictEqual(C[0].nome, 'MESA'); // do maior para o menor
  const s = C.find(x => x.n === 2);
  assert.strictEqual(s.qtd, 2); assert.strictEqual(s.total, 520.24); assert.strictEqual(s.unit, null);
  assert.strictEqual(JSON.stringify(s.nfs), '["459","484"]'); assert.strictEqual(s.ini, '2026-08-04'); assert.strictEqual(s.fim, '2026-08-26');
  assert.strictEqual(s.forn, 'Loja Exemplo');
  assert.strictEqual(C.find(x => x.forn === 'Outra Loja').unit, 100);
});

test('nome em CAIXA ALTA vira título; siglas e medidas ficam certas', () => {
  const { pconcTitulo: t, pconcFornLimpo: f, pconcNfNum: nf } = tudo();
  assert.strictEqual(t('CABO PP 3X1,5'), 'Cabo PP 3x1,5');
  assert.strictEqual(t('TINTA ACRILICA FOSCA 18L'), 'Tinta Acrilica Fosca 18L');
  assert.strictEqual(t('PORTA DE MADEIRA 80X210'), 'Porta de Madeira 80x210');
  assert.strictEqual(t('GUARDA-ROUPA 6 PORTAS'), 'Guarda-roupa 6 Portas');
  assert.strictEqual(t('Mesa de Jantar Redonda'), 'Mesa de Jantar Redonda'); // já escrito normal: não mexe
  assert.strictEqual(f('Local na nota: Loja Exemplo'), 'Loja Exemplo');
  assert.strictEqual(nf('Nota fiscal nº 000452'), '452');
});

test('mapa de categorias em CSV: lê ";" com aspas, valor brasileiro e categoria sem acento', () => {
  const { pconcCsvLer } = tudo();
  const csv = '﻿item;nota_fiscal;valor_total;categoria_antiga;grupo_novo;categoria_nova\r\n' +
    '"Cadeira; dobrável";123;1.174,96;Móveis;Bens e equipamentos;Moveis\r\n' +
    'Cimento;45;R$ 30,00;Obras e benfeitorias — material;Obra e reforma;Obras e benfeitorias — Alvenaria e material básico\r\n' +
    'Coisa;;10.5;;Bens;Categoria inventada\r\n';
  const r = pconcCsvLer(csv);
  assert.ok(!r.erro, r.erro);
  assert.strictEqual(r.rows.length, 3);
  assert.strictEqual(r.rows[0].item, 'Cadeira; dobrável'); assert.strictEqual(r.rows[0].valor, 1174.96); assert.strictEqual(r.rows[0].cat, 'Móveis');
  assert.strictEqual(r.rows[1].valor, 30); assert.strictEqual(r.rows[1].cat, 'Alvenaria e material básico');
  assert.strictEqual(r.rows[2].valor, 10.5); assert.strictEqual(r.rows[2].cat, '');
  assert.ok(pconcCsvLer('a,b,c\n1,2,3').erro);
});

test('casamento do CSV: nome + NF + valor; repetidos com NF diferente casam cada um com o seu; não chuta', () => {
  const { pconcCasar } = tudo();
  const L = [
    { nome: 'CADEIRA PRETA', nf: '10', total: 100, inc: true },
    { nome: 'CADEIRA PRETA', nf: '20', total: 100, inc: true },
    { nome: 'Mão de obra dos pedreiros', nf: '', total: 120000, inc: true },
    { nome: 'CIMENTO', nf: '30', total: 50, inc: false },
    { nome: 'TINTA', nf: '40', total: 80, inc: true },
  ];
  const csv = [
    { linha: 2, item: 'Cadeira Preta', nf: '20', valor: 100 },
    { linha: 3, item: 'Cadeira Preta', nf: 'NF 10', valor: 100.01 },
    { linha: 4, item: 'Mão de obra dos pedreiros', nf: '—', valor: 120000 },
    { linha: 5, item: 'Cimento', nf: '30', valor: 50 },
    { linha: 6, item: 'Tinta', nf: '40', valor: 99 }, // valor diferente: não casa
    { linha: 7, item: 'Item que não existe', nf: '1', valor: 1 },
  ];
  const r = pconcCasar(csv, L);
  const par = l => r.pares.find(p => p.r.linha === l);
  assert.strictEqual(par(2).i, 1); assert.strictEqual(par(3).i, 0); assert.strictEqual(par(4).i, 2);
  assert.strictEqual(r.fora.length, 1); assert.strictEqual(r.fora[0].i, 3);
  assert.strictEqual(JSON.stringify(r.semPar.map(x => x.linha)), '[6,7]');
  assert.strictEqual(JSON.stringify(r.sobra), '[4]');
});
