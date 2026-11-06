'use strict';
/* Testes das permissões do servidor (rode com: npm test) */
const test = require('node:test');
const assert = require('node:assert');
const perm = require('../lib/permissoes');

const dbFalso = dados => ({ get: async p => dados[p] ?? null });
const ctx = async (dados, u) => perm.contexto(dbFalso(dados), u);
const ana = { id: 'u_ana', admin: 0 }, adm = { id: 'u_adm', admin: 1 };

test('sem perfil liberado não lê nem grava dados', async () => {
  const c = await ctx({}, ana);
  assert.equal(perm.podeLer(c, 'integrantes/x', {}), false);
  assert.equal(perm.podeLer(c, 'config/fin_2026', {}), false);
  assert.equal(perm.podeGravar(c, 'config/geral'), false);
  assert.equal(perm.podeGravar(c, 'pedidos/u_ana'), true);
  assert.equal(perm.podeGravar(c, 'pedidos/u_outro'), false);
  assert.equal(perm.temPerfil(c), false);
});

test('suspenso é igual a sem perfil', async () => {
  const c = await ctx({ 'acessos/u_ana': { perfil: 'direcao', ativo: false } }, ana);
  assert.equal(perm.podeLer(c, 'integrantes/x', {}), false);
});

test('ninguém além da administração muda permissões', async () => {
  const c = await ctx({ 'acessos/u_ana': { perfil: 'direcao', ativo: true } }, ana);
  assert.equal(perm.podeGravar(c, 'acessos/u_ana'), false);
  assert.equal(perm.podeGravar(c, 'perfis/matriz'), false);
  assert.equal(perm.podeLer(c, 'acessos/u_outro', {}), false);
});

test('enfermagem: sem financeiro, sem CPF e sem salário', async () => {
  const c = await ctx({ 'acessos/u_ana': { perfil: 'enf', ativo: true } }, ana);
  assert.equal(perm.podeLer(c, 'config/fin_2026', {}), false);
  assert.equal(perm.podeLer(c, 'config/residentes', {}), true);
  assert.equal(perm.podeGravar(c, 'config/residentes'), true);
  assert.equal(perm.podeGravar(c, 'integrantes/x'), false);
  const f = perm.filtra(c, 'integrantes/x', { nome: 'A', cpf: '1', salario: 9, dependentes: [{ cpf: '2' }] });
  assert.deepEqual(f, { nome: 'A' });
  assert.equal(perm.filtra(c, 'hist/h', { col: 'integrantes', antes: '{"cpf":"1"}' }).antes, '');
  assert.equal(perm.podeLer(c, 'hist/h', { col: 'config', rid: 'fin_2026' }), false);
});

test('quem grava a ficha sem ver dados pessoais não apaga esses campos', async () => {
  const c = await ctx({ 'acessos/u_ana': { perfil: 'rh2', ativo: true }, 'perfis/matriz': { custom: { rh2: { mods: { pront: 2 }, pii: 0, salario: 0 } } } }, ana);
  const novo = perm.preserva(c, 'integrantes/x', { nome: 'B', cpf: 'forjado' }, { nome: 'A', cpf: '123', salario: 5 });
  assert.deepEqual(novo, { nome: 'B', cpf: '123', salario: 5 });
});

test('quem grava um dado também consegue lê-lo (para não sobrescrever o ano inteiro)', async () => {
  const c = await ctx({ 'acessos/u_ana': { perfil: 'est', ativo: true } }, ana);
  assert.equal(perm.podeGravar(c, 'config/fin_2026'), true);
  assert.equal(perm.podeLer(c, 'config/fin_2026', {}), true);
});

test('histórico e registro de auditoria não podem ser apagados por quem não é administração', async () => {
  const c = await ctx({ 'acessos/u_ana': { perfil: 'direcao', ativo: true } }, ana);
  assert.equal(perm.podeGravar(c, 'hist/h1', true), false);
  assert.equal(perm.podeGravar(c, 'auditoria/u_ana/m/202611', true), false);
  assert.equal(perm.podeGravar(c, 'auditoria/u_ana/m/202611'), true);
});

test('administração vê tudo', async () => {
  const c = await ctx({}, adm);
  assert.equal(perm.podeLer(c, 'config/fin_2026', {}), true);
  assert.equal(perm.filtra(c, 'integrantes/x', { cpf: '1' }).cpf, '1');
});
