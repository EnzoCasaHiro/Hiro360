'use strict';
/* Antes da admissão (e depois do desligamento) ninguém tem escala: não pode virar falta nem hora negativa (rode com: npm test) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');

const ler = f => fs.readFileSync(path.join(__dirname, '../src/app', f), 'utf8');
const linha = (f, re) => { const m = ler(f).match(re); assert.ok(m, 'trecho não encontrado em ' + f); return m[0]; };

// motor da escala (002 e 004) e a busca do integrante pelo número do relógio (009 e 013), com dados inventados
function tela(S) {
  const ctx = { S, console };
  vm.createContext(ctx);
  vm.runInContext([
    ler('002-motor-de-ponto-mantido.js'),
    ler('004-ajustes-de-escala-por-dia.js'),
    linha('013-prontuario.js', /const cadRelogio=.*\n/),
    linha('009-turnos-integrantes.js', /const integByUid=.*\n/),
    'this.f={escalaDia,integByUid};'
  ].join('\n'), ctx);
  return ctx.f;
}
const ana = { id: 'ana', uid: 7, nome: 'Ana', nomeCompleto: 'Ana Teste', turno: '1', escalaModo: 'semana', dias: [0, 1, 2, 3, 4], admissao: '2026-11-10', situacao: 'Ativo' };

test('sem escala antes da admissão', () => {
  const f = tela({ integrantes: { ana }, config: {} });
  assert.strictEqual(f.escalaDia(ana, '2026-11-05').on, false); // quinta, antes de admitida
  assert.strictEqual(f.escalaDia(ana, '2026-11-10').on, true);  // terça, dia da admissão
});

test('dia de trabalho lançado à mão antes da admissão não vale', () => {
  const config = { esc_2026: { itens: [{ id: 'a1', uid: 'ana', tipo: 'trabalho', de: '2026-11-01', ate: '2026-11-12', turno: '1' }] } };
  const f = tela({ integrantes: { ana }, config });
  assert.strictEqual(f.escalaDia(ana, '2026-11-08').on, false);
  assert.strictEqual(f.escalaDia(ana, '2026-11-11').on, true);
});

test('dia de trabalho lançado à mão depois do desligamento não vale', () => {
  const bia = { ...ana, id: 'bia', admissao: '2026-01-05', desligamento: '2026-11-03' };
  const config = { esc_2026: { itens: [{ id: 'a2', uid: 'bia', tipo: 'trabalho', de: '2026-11-04', ate: '2026-11-04', turno: '1' }] } };
  const f = tela({ integrantes: { bia }, config });
  assert.strictEqual(f.escalaDia(bia, '2026-11-04').on, false);
});

test('número do relógio repetido: vale o cadastro de verdade, não o criado pelo relógio', () => {
  // o relógio criou "u7" (sem nome completo, sem admissão, segunda a sexta) antes de a ficha da Ana ganhar o nº 7
  const u7 = { id: 'u7', uid: 7, nome: 'ANA', nomeCompleto: '', turno: '', escalaModo: 'semana', dias: [0, 1, 2, 3, 4], situacao: 'Ativo' };
  const f = tela({ integrantes: { u7, ana }, config: {} });
  assert.strictEqual(f.integByUid(7).id, 'ana');
});
