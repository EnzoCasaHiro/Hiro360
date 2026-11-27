'use strict';
/* Lançamentos do ponto "Abateu no banco de horas" e "Dobrou horário", e plantão que vira a noite (rode com: npm test)
   - abateu no banco: a falta deixa de ser falta e sai das pendências, mas as horas do dia saem do banco
   - dobrou horário: o dia trabalhado fora da escala sai das pendências e as horas continuam indo para o banco */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');

const ler = f => fs.readFileSync(path.join(__dirname, '../src/app', f), 'utf8').replace(/\r\n/g, '\n'); // alguns arquivos têm quebra de linha do Windows
const trecho = (f, ini, fim) => { const s = ler(f), a = s.indexOf(ini), b = s.indexOf(fim, a); assert.ok(a >= 0 && b > a, 'trecho não encontrado em ' + f); return s.slice(a, b); };
const linha = (f, re) => { const m = ler(f).match(re); assert.ok(m, 'trecho não encontrado em ' + f); return m[0]; };

// cálculo do ponto (010) com o motor (002, 003, 004), os tipos de ocorrência (005) e os turnos (009); dados inventados
function calcula(S, ini, fim) {
  const ctx = { S, console, hojeIso: () => '2026-12-31', go() {} };
  vm.createContext(ctx);
  vm.runInContext([
    ler('002-motor-de-ponto-mantido.js'),
    ler('003-calendario-de-feriados.js'),
    ler('004-ajustes-de-escala-por-dia.js'),
    linha('005-utilidades.js', /const OC=.*\n/),
    linha('005-utilidades.js', /const OC_FALTA=.*\n/),
    trecho('009-turnos-integrantes.js', 'const WD_FULL', 'function shiftSummary'),
    ler('009-turnos-integrantes.js').slice(ler('009-turnos-integrantes.js').indexOf('const integList')),
    linha('013-prontuario.js', /const cadRelogio=.*\n/),
    'const cfgG=()=>S.config.geral||{};const turnosList=()=>cfgG().turnos;',
    linha('087-planilha-do-ponto-edicao-em.js', /function prevManual.*\n/),
    linha('010-ponto.js', /const POINT=.*\n/),
    linha('010-ponto.js', /const foraDoContrato=.*\n/),
    trecho('010-ponto.js', 'function calcular(', '\nconst CLR'),
    `POINT.start=${JSON.stringify(ini)};POINT.end=${JSON.stringify(fim)};calcular(false);this.R=POINT.result;this.err=POINT.err;`
  ].join('\n'), ctx);
  assert.ok(ctx.R, 'cálculo falhou: ' + ctx.err);
  return ctx.R.users[0];
}
const turno = { no: 1, nome: 'Manhã', texto: '08:00-12:00' };
const ana = { id: 'ana', uid: 7, nome: 'Ana', nomeCompleto: 'Ana Teste', turno: '1', escalaModo: 'semana', dias: [0, 1, 2, 3, 4], admissao: '2026-01-05', situacao: 'Ativo' };
const marca = (id, ts) => ({ id, uid: 7, ts });
// uma batida antiga qualquer: sem nenhuma batida o cálculo pede o arquivo do relógio
const antiga = { m0: marca('m0', '2026-10-01T08:00:00') };
const base = (marcacoes, ocorr) => ({ integrantes: { ana }, marcacoes: { ...antiga, ...marcacoes }, ocorr, config: { geral: { turnos: [turno] } } });

test('falta sem lançamento: conta como falta, fica pendente e tira 4h do banco', () => {
  const u = calcula(base({}, {}), '2026-11-09', '2026-11-09'); // segunda, sem batida
  assert.strictEqual(u.t.faltas, 1);
  assert.strictEqual(u.pendencies.length, 1);
  assert.strictEqual(u.t.saldo, -240);
});

test('abateu no banco de horas: deixa de ser falta e de ser pendência, mas as 4h saem do banco', () => {
  const ocorr = { o1: { id: 'o1', uid: 'ana', tipo: 'banco_horas', de: '2026-11-09', ate: '2026-11-09', texto: '' } };
  const u = calcula(base({}, ocorr), '2026-11-09', '2026-11-09');
  assert.strictEqual(u.t.faltas, 0);
  assert.strictEqual(u.pendencies.length, 0);
  assert.strictEqual(u.t.saldo, -240);
  assert.strictEqual(u.rows[0].oc.tipo, 'banco_horas');
  assert.strictEqual(u.rows[0].status, 'compensada'); // não vira "justificada": a falta foi paga com o banco
  assert.strictEqual(u.t.justificadas, 0);
});

test('dobrou horário em dia de folga: sai das pendências e as 5h entram no banco', () => {
  const m = { m1: marca('m1', '2026-11-07T07:00:00'), m2: marca('m2', '2026-11-07T12:00:00') }; // sábado, folga
  const sem = calcula(base(m, {}), '2026-11-07', '2026-11-07');
  assert.strictEqual(sem.pendencies.map(p => p.kind).join(), 'marcacao_sem_escala');
  const ocorr = { o2: { id: 'o2', uid: 'ana', tipo: 'dobra', de: '2026-11-07', ate: '2026-11-07', texto: 'cobriu plantão' } };
  const u = calcula(base(m, ocorr), '2026-11-07', '2026-11-07');
  assert.strictEqual(u.pendencies.length, 0);
  assert.strictEqual(u.t.saldo, 300);
});

test('dobrou horário não esconde batida faltando no mesmo dia', () => {
  const m = { m1: marca('m1', '2026-11-07T07:00:00'), m2: marca('m2', '2026-11-07T12:00:00'), m3: marca('m3', '2026-11-07T13:00:00') };
  const ocorr = { o2: { id: 'o2', uid: 'ana', tipo: 'dobra', de: '2026-11-07', ate: '2026-11-07', texto: '' } };
  const u = calcula(base(m, ocorr), '2026-11-07', '2026-11-07');
  assert.strictEqual(u.pendencies.map(p => p.kind).join(), 'falta_saida');
});

/* plantão fora da escala que vira a noite com intervalo depois da meia-noite: tudo é um plantão só */
test('plantão em dia de folga que passa da meia-noite com intervalo na madrugada conta inteiro no dia em que começou', () => {
  // sábado 07/11 (folga): 07:05–12:09, 13:00–01:00 (+1), 02:00–05:35 (+1) = 5h04 + 12h00 + 3h35 = 20h39
  const m = { a: marca('a', '2026-11-07T07:05:00'), b: marca('b', '2026-11-07T12:09:00'), c: marca('c', '2026-11-07T13:00:00'),
    d: marca('d', '2026-11-08T01:00:00'), e: marca('e', '2026-11-08T02:00:00'), f: marca('f', '2026-11-08T05:35:00') };
  const u = calcula(base(m, {}), '2026-11-07', '2026-11-08');
  const sab = u.rows.find(r => r.day === '2026-11-07'), dom = u.rows.find(r => r.day === '2026-11-08');
  assert.strictEqual(sab.workedMin, 1239);
  assert.strictEqual(dom ? dom.workedMin : 0, 0); // a madrugada não vira outro dia trabalhado
  assert.strictEqual(u.t.saldo, 1239);
  assert.strictEqual(u.pendencies.map(p => p.day + ' ' + p.kind).join(), '2026-11-07 marcacao_sem_escala');
});

test('plantão noturno simples fora da escala continua igual (19:00–07:00)', () => {
  const m = { a: marca('a', '2026-11-07T19:00:00'), b: marca('b', '2026-11-08T07:00:00') };
  const u = calcula(base(m, {}), '2026-11-07', '2026-11-08');
  assert.strictEqual(u.rows.find(r => r.day === '2026-11-07').workedMin, 720);
  assert.strictEqual(u.rows.filter(r => r.day === '2026-11-08' && r.workedMin).length, 0);
});

test('batida de manhã no dia seguinte, longe do fim do plantão, não é puxada para a véspera', () => {
  // sábado 19:00–01:00 (+1); domingo 09:00–13:00 é outro trabalho (8h de diferença)
  const m = { a: marca('a', '2026-11-07T19:00:00'), b: marca('b', '2026-11-08T01:00:00'), c: marca('c', '2026-11-08T09:00:00'), d: marca('d', '2026-11-08T13:00:00') };
  const u = calcula(base(m, {}), '2026-11-07', '2026-11-08');
  assert.strictEqual(u.rows.find(r => r.day === '2026-11-07').workedMin, 360);
  assert.strictEqual(u.rows.find(r => r.day === '2026-11-08').workedMin, 240);
});

test('admissão gravada como dd/mm/aaaa também vale: dia antes da admissão não vira falta nem pendência', () => {
  const S = { integrantes: { ana: { ...ana, admissao: '10/11/2026' } }, marcacoes: { ...antiga }, ocorr: {}, config: { geral: { turnos: [turno] } } };
  const u = calcula(S, '2026-11-09', '2026-11-11'); // segunda a quarta, sem batida; admitida na terça
  assert.ok(u, 'a integrante precisa aparecer no período');
  assert.deepStrictEqual([...u.rows.map(r => r.day)], ['2026-11-10', '2026-11-11']);
  assert.ok(!u.pendencies.some(p => p.day === '2026-11-09'));
});

test('sem data de admissão: conta só a partir da primeira batida da pessoa (antes não há falta nem pendência)', () => {
  const semAdm = { ...ana, admissao: '' };
  const m = { x0: { id: 'x0', uid: 8, ts: '2026-10-01T08:00:00' }, a: marca('a', '2026-11-11T08:00:00'), b: marca('b', '2026-11-11T12:00:00') };
  const S = { integrantes: { ana: semAdm }, marcacoes: m, ocorr: {}, config: { geral: { turnos: [turno] } } };
  const u = calcula(S, '2026-11-09', '2026-11-11'); // primeira batida da Ana em 11/11
  assert.deepStrictEqual([...u.rows.map(r => r.day)], ['2026-11-11']);
  assert.strictEqual(u.t.faltas, 0);
  assert.strictEqual(u.pendencies.length, 0);
  assert.strictEqual(u.admInferida, '2026-11-11');
});

test('sem data de admissão e sem nenhuma batida: aparece, mas sem dias, falta nem pendência', () => {
  const S = { integrantes: { ana: { ...ana, admissao: '' } }, marcacoes: { x0: { id: 'x0', uid: 8, ts: '2026-10-01T08:00:00' } }, ocorr: {}, config: { geral: { turnos: [turno] } } };
  const u = calcula(S, '2026-11-09', '2026-11-11');
  assert.strictEqual(u.uid, 7);
  assert.strictEqual(u.rows.length, 0);
  assert.strictEqual(u.pendencies.length, 0);
  assert.strictEqual(u.t.saldo, 0);
});
