'use strict';
/* XLSX do contador e folha de ponto em PDF (rode com: npm test) — dados inventados
   - toda aba individual sai com as mesmas colunas de batidas (no mínimo Entrada 1/Saída 1/Entrada 2/Saída 2)
   - o PDF usa exatamente os números da aba do integrante no XLSX */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');

const raiz = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(raiz, 'src/app', f), 'utf8').replace(/\r\n/g, '\n');
const trecho = (f, ini, fim) => { const s = ler(f), a = s.indexOf(ini), b = s.indexOf(fim, a); assert.ok(a >= 0 && b > a, 'trecho não encontrado em ' + f); return s.slice(a, b); };
const linha = (f, re) => { const m = ler(f).match(re); assert.ok(m, 'trecho não encontrado em ' + f); return m[0]; };
const ExcelJS = require(path.join(raiz, 'public/vendor/exceljs-4.4.0/exceljs.min.js'));

const d = (dia, hm) => new Date(`${dia}T${hm}:00`);
// um dia de jornada como o cálculo do ponto devolve
function dia(day, pares, prev, extra) {
  const raw = pares.map(([a, b]) => [d(day, a), d(day, b)]);
  const worked = raw.reduce((s, [a, b]) => s + (b - a) / 60000, 0);
  return { day, status: pares.length ? 'ok' : (prev ? 'falta' : 'feriado'), intervals: pares.map(([a, b]) => a + '–' + b), rawIntervals: raw, marcas: raw.flat(),
    workedMin: worked, expectedMin: prev, saldo: pares.length || prev ? worked - prev : 0, flags: [], oc: null, feriadoMin: 0, nightReal: 0, ...(extra || {}) };
}
const tot = rows => ({ worked: rows.reduce((s, r) => s + r.workedMin, 0), expected: rows.reduce((s, r) => s + r.expectedMin, 0), saldo: rows.reduce((s, r) => s + r.saldo, 0),
  mais: rows.reduce((s, r) => s + Math.max(0, r.saldo), 0), menos: rows.reduce((s, r) => s + Math.min(0, r.saldo), 0), faltas: rows.filter(r => r.status === 'falta').length, atestados: 0, nightReal: 0, nightFicta: 0 });

const ana = { id: 'a', uid: 1, nome: 'Ana', nomeCompleto: 'Ana Teste', cpf: '111.111.111-11', cargo: 'Cuidadora', depto: 'Cuidado', admissao: '2026-01-05' };
const rosa = { id: 'r', uid: 2, nome: 'Rosa', nomeCompleto: 'Rosa Exemplo', cpf: '222.222.222-22', cargo: 'Cozinheira', depto: 'Cozinha', admissao: '2026-02-01' };
const bia = { id: 'b', uid: 3, nome: 'Bia', nomeCompleto: 'Bia Recém Chegada', cpf: '333.333.333-33', cargo: 'Cuidadora', depto: 'Cuidado', admissao: '2026-11-20' };
function resultado() {
  const ra = [dia('2026-11-02', [['07:30', '12:00'], ['13:00', '17:40']], 540), dia('2026-11-03', [], 540), dia('2026-11-07', [['08:00', '12:00']], 240)];
  const rr = [dia('2026-11-02', [['07:00', '15:20']], 480), dia('2026-11-03', [['07:00', '14:50']], 480)];
  const rb = [dia('2026-11-24', [], 0, { status: 'sem_escala', marcas: null, rawIntervals: [] })];
  return { start: '2026-10-26', end: '2026-11-25', users: [
    { uid: 1, ig: ana, nome: 'Ana Teste', rows: ra, t: tot(ra) }, { uid: 2, ig: rosa, nome: 'Rosa Exemplo', rows: rr, t: tot(rr) }, { uid: 3, ig: bia, nome: 'Bia Recém Chegada', rows: rb, t: tot(rb) }] };
}

function contexto() {
  const ctx = { ExcelJS, console, Date, POINT: { result: resultado() }, PENDENCIA: 'pendencia', FALTA: 'falta',
    empresa: () => ({ razao: 'Casa Teste Ltda', cnpj: '12345678000199' }), integList: () => [ana, rosa, bia], semPonto: () => false, ativoEm: () => true,
    nomeInteg: i => i.nomeCompleto || i.nome || '', escalasTexto: () => '44h semanais', flagsVisiveis: r => r.flags || [], FLAG_LABEL: {},
    folhaBanco: u => ({ mm: '11/2026', ant: 100, lanc: -60, saldo: u.t.saldo, fim: 100 + u.t.saldo - 60, notas: ['Nota de teste.'], linhas: [] }) };
  vm.createContext(ctx);
  vm.runInContext([
    linha('002-motor-de-ponto-mantido.js', /function fmtHHMM.*\n/), linha('002-motor-de-ponto-mantido.js', /function pyWeekday.*\n/), linha('002-motor-de-ponto-mantido.js', /function minutesBetween.*\n/),
    linha('005-utilidades.js', /const brDate=.*\n/), linha('005-utilidades.js', /const OC=.*\n/), linha('005-utilidades.js', /const OC_FALTA=.*\n/),
    'const refYm=x=>"2026-11",refIni=()=>"2026-10-26",refFim=()=>"2026-11-25";',
    ler('016-contador-xlsx-pdf-com-a.js'),
    trecho('088-zz-folha-ponto-pdf.js', '/* >>> folha pdf */', '/* <<< folha pdf */'),
    'this.f={buildWorkbook,folhaDados,folhaTemMarcacao,fpdfPagina,fpdfNomeArq,fpdfAlturaLinha,fpdfHm};'
  ].join('\n'), ctx);
  return ctx;
}
const cabecalho = ws => { for (let r = 1; r <= 30; r++) { const v = ws.getRow(r).values; if (v && v.includes('Data') && v.includes('Trabalhado')) return v.filter(Boolean); } return null; };

test('todas as abas individuais têm as mesmas colunas, com Entrada 2/Saída 2 mesmo vazias', () => {
  const ctx = contexto();
  const wb = ctx.f.buildWorkbook({ abas: { capa: false, integrantes: false, jornadas: false, individual: true } });
  const ana = cabecalho(wb.getWorksheet('Ana Teste')), rosa = cabecalho(wb.getWorksheet('Rosa Exemplo'));
  assert.ok(ana && rosa, 'cabeçalho da tabela não encontrado');
  assert.deepStrictEqual(rosa, ana);
  assert.ok(rosa.includes('Entrada 2') && rosa.includes('Saída 2'));
});

// valor (resultado gravado) de uma célula da aba, procurando o rótulo na coluna A
const valorDe = (ws, rotulo, col) => { let v; ws.eachRow((row, rn) => { const a = row.getCell(1).value; if (typeof a === 'string' && a.startsWith(rotulo)) { const c = row.getCell(col).value; v = c && c.formula !== undefined ? c.result : c; } }); return v; };
const colDe = (ws, nome) => { for (let r = 1; r <= 30; r++) { const v = ws.getRow(r).values; const i = v ? v.indexOf(nome) : -1; if (i > 0) return i; } return -1; };

test('o PDF mostra exatamente os números da aba do integrante no XLSX', () => {
  const ctx = contexto(), R = ctx.POINT.result;
  const wb = ctx.f.buildWorkbook({ abas: { capa: false, integrantes: false, jornadas: false, individual: true } });
  for (const u of R.users.filter(ctx.f.folhaTemMarcacao)) {
    const ws = wb.getWorksheet(u.nome), P = ctx.f.fpdfPagina(u, R, { razao: 'Casa Teste Ltda', cnpj: '12345678000199' });
    const cT = colDe(ws, 'Trabalhado'), cP = colDe(ws, 'Previsto'), cS = colDe(ws, 'Saldo (min)');
    assert.strictEqual(Math.round(valorDe(ws, 'TOTAIS', cT) * 1440), P.t.worked, u.nome + ': trabalhado');
    assert.strictEqual(Math.round(valorDe(ws, 'TOTAIS', cP) * 1440), P.t.expected, u.nome + ': previsto');
    assert.strictEqual(valorDe(ws, 'TOTAIS', cS), P.saldoMin, u.nome + ': saldo do período');
    assert.strictEqual(valorDe(ws, 'Banco de horas para o próximo período', cS), P.fimMin, u.nome + ': banco para o próximo período');
    assert.strictEqual(valorDe(ws, 'Banco de horas antes', cS), P.antMin, u.nome + ': banco anterior');
    assert.strictEqual(valorDe(ws, 'Dias apurados', cP), P.t.apurados);
    assert.strictEqual(P.linhas.length, u.rows.length);
  }
});

test('folha em PDF: texto com hífen comum, nome do arquivo sem acento e 31 dias numa página', () => {
  const ctx = contexto(), R = ctx.POINT.result, ana = R.users[0];
  const P = ctx.f.fpdfPagina(ana, R, { razao: 'Casa Teste Ltda', cnpj: '12345678000199' });
  assert.strictEqual(P.cnpj, '12.345.678/0001-99');
  assert.strictEqual(ctx.f.fpdfHm(-244, true), '-4:04');
  assert.strictEqual(ctx.f.fpdfHm(476, true), '+7:56');
  assert.strictEqual(ctx.f.fpdfHm(0, true), '0:00');
  assert.ok(!/[−⚠]/.test(JSON.stringify(P)), 'nenhum "−" tipográfico nem ⚠ no texto do PDF');
  const falta = P.linhas.find(l => l.data === '03/11');
  assert.strictEqual(falta.etq, 'Falta');
  assert.strictEqual(falta.saldo, '-9:00');
  assert.strictEqual(P.linhas.find(l => l.data === '07/11').fds, true); // sábado em bege
  assert.strictEqual(ctx.f.fpdfNomeArq('Bia Recém Chegada da Conceição', '2026-11'), 'folha-ponto_Bia-Recem-Chegada-da-Conceicao_2026-11.pdf');
  const h = ctx.f.fpdfAlturaLinha(31, 306);
  assert.ok(h >= 8 && 31 * h <= 306, 'as 31 linhas cabem no espaço da tabela');
});

test('quem não tem nenhuma marcação no período não gera folha', () => {
  const ctx = contexto(), R = ctx.POINT.result;
  assert.deepStrictEqual([...R.users.map(ctx.f.folhaTemMarcacao)], [true, true, false]);
});
