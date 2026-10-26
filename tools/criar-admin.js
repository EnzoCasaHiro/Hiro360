#!/usr/bin/env node
'use strict';
/* Cria um administrador, ou troca a senha de uma conta existente (precisa de acesso ao terminal/SSH).
   Uso:  node tools/criar-admin.js usuario "Nome da Pessoa" "SenhaForte#2026"
   Sem SSH: use ADMIN_USER / ADMIN_PASSWORD no .env (cria o primeiro administrador quando não existe nenhuma conta). */
const { carregaEnv } = require('../lib/env');
const dbmod = require('../lib/db');
const seg = require('../lib/seguranca');
(async () => {
  const [u0, nome, senha] = process.argv.slice(2);
  if (!u0 || !senha) { console.log('Uso: node tools/criar-admin.js usuario "Nome" "Senha"'); process.exit(1); }
  const u = u0.toLowerCase();
  if (!seg.usuarioOk(u)) { console.error('Usuário inválido (3-40: letras minúsculas, números, ponto, hífen, _).'); process.exit(1); }
  const f = seg.senhaFraca(senha, u); if (f) { console.error(f); process.exit(1); }
  const env = carregaEnv(); const db = await dbmod.abre(env);
  const ex = await db.userPorNome(u);
  if (ex) { await db.userAtualiza(ex.id, { hash: seg.hashSenha(senha), active: 1, admin: 1 }); await db.sessApagaUser(ex.id); console.log('Senha trocada e conta reativada como administrador:', u); }
  else { await db.userCria({ id: seg.novoId('u'), username: u, name: nome || u, hash: seg.hashSenha(senha), admin: true }); console.log('Administrador criado:', u); }
  await db.fecha();
})().catch(e => { console.error(e.message); process.exit(1); });
