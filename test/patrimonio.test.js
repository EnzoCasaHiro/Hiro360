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
  for (const n of ['PORTA TOALHA INOX', 'PORTA PAPEL HIGIENICO', 'TINTA PARA IMPRESSORA', 'LAMPADA LED 9W', 'PUXADOR PARA PORTA',
    'DOBRADICA PORTA 3"', 'FIO DENTAL 50M', 'Pedreiro — semana 3', 'Diária eletricista', 'FRETE PORCELANATO', 'INSTALACAO DE LUMINARIAS'])
    assert.strictEqual(auto(n, ''), false, n);
  assert.strictEqual(auto('LUMINARIA LED', 'Limpeza e higiene'), false); // categoria de consumo escolhida na nota vale
});
