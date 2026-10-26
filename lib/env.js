'use strict';
/* Lê o arquivo .env (se existir) sem precisar de pacote. Variáveis do painel da Hostinger têm prioridade. */
const fs = require('fs');
const path = require('path');
function carregaEnv(arquivo) {
  const f = arquivo || path.join(__dirname, '..', '.env');
  const out = {};
  try {
    fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach(l => {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || l.trim().startsWith('#')) return;
      let v = m[2]; if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
      out[m[1]] = v;
    });
  } catch (e) {}
  return { ...out, ...process.env };
}
module.exports = { carregaEnv };
