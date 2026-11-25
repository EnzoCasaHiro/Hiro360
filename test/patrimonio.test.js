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
