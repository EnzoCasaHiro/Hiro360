#!/usr/bin/env node
'use strict';
/* Puxa uma cópia dos dados e dos arquivos do servidor para uma pasta FORA da Hostinger
   (o computador da Casa Hiro, um HD externo, uma pasta sincronizada do Drive).
   Uso:  node tools/puxar-backup.js https://seu-dominio.com.br  "C:\Backups\CasaHiro"  TOKEN
   (o TOKEN é o BACKUP_TOKEN do .env do servidor; também pode vir da variável BACKUP_TOKEN)
   Guarda: dados-AAAA-MM-DD.json (um por dia, mantém os últimos 30) e a pasta arquivos/ (só baixa o que ainda não tem). */
const fs = require('fs'), path = require('path');
(async () => {
  const [url0, destino, token0] = process.argv.slice(2); const token = token0 || process.env.BACKUP_TOKEN;
  if (!url0 || !destino || !token) { console.log('Uso: node tools/puxar-backup.js https://dominio pasta TOKEN'); process.exit(1); }
  const url = url0.replace(/\/+$/, ''); const h = { 'x-backup-token': token };
  fs.mkdirSync(path.join(destino, 'arquivos'), { recursive: true });
  const r = await fetch(url + '/api/backup', { headers: h }); if (!r.ok) throw new Error('Servidor respondeu ' + r.status + ' ao pedir o backup.');
  const txt = await r.text(); const j = JSON.parse(txt);
  const hoje = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(destino, `dados-${hoje}.json`), txt);
  let novos = 0, falhas = 0;
  for (const a of j.arquivos || []) {
    const f = path.join(destino, 'arquivos', a.id); if (fs.existsSync(f) && fs.statSync(f).size === a.size) continue;
    const x = await fetch(url + '/api/backup/arquivo?id=' + encodeURIComponent(a.id), { headers: h });
    if (!x.ok) { falhas++; continue; } fs.writeFileSync(f + '.tmp', Buffer.from(await x.arrayBuffer())); fs.renameSync(f + '.tmp', f); novos++;
  }
  fs.writeFileSync(path.join(destino, 'arquivos.json'), JSON.stringify(Object.fromEntries((j.arquivos || []).map(a => [a.id, { nome: a.name, type: a.type }]))));
  fs.readdirSync(destino).filter(n => /^dados-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().slice(0, -30).forEach(n => fs.unlinkSync(path.join(destino, n)));
  const docs = Object.values(j.colecoes || {}).reduce((s, c) => s + Object.keys(c).length, 0);
  console.log(`Backup ok: ${docs} registros, ${(j.arquivos || []).length} arquivos (${novos} novos, ${falhas} falhas).`);
  if (falhas) process.exit(3);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
