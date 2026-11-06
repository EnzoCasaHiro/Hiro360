'use strict';
/* Monta o site a partir de src/:
   - src/app/*.js (em ordem pelo número) viram public/app.js
   - src/index.html vira public/index.html, com a versão dos arquivos no endereço (o navegador
     guarda app.js e app.css e só baixa de novo quando o conteúdo muda)
   Uso: node tools/montar.js           (monta)
        node tools/montar.js --checar  (só confere se public/ está igual ao src/; usado no npm test) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const raiz = path.join(__dirname, '..');
const dir = path.join(raiz, 'src', 'app');
const ver = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 10);

const partes = fs.readdirSync(dir).filter(f => /^\d{3}-.+\.js$/.test(f)).sort();
const js = partes.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
const css = fs.readFileSync(path.join(raiz, 'public', 'app.css'));
const html = fs.readFileSync(path.join(raiz, 'src', 'index.html'), 'utf8')
  .replace('__JS__', ver(js)).replace('__CSS__', ver(css))
  .replace('__HOST__', ver(fs.readFileSync(path.join(raiz, 'public', 'host.js'))));

const saidas = [['public/app.js', js], ['public/index.html', html]];
if (process.argv.includes('--checar')) {
  const dif = saidas.filter(([f, c]) => { try { return fs.readFileSync(path.join(raiz, f), 'utf8') !== c; } catch (e) { return true; } }).map(s => s[0]);
  if (dif.length) { console.error('Desatualizado: rode "npm run montar". Arquivos:', dif.join(', ')); process.exit(1); }
  console.log('public/ está em dia com src/ (' + partes.length + ' partes).');
} else {
  for (const [f, c] of saidas) fs.writeFileSync(path.join(raiz, f), c);
  console.log('Montado: ' + partes.length + ' partes, app.js ' + Math.round(js.length / 1024) + ' KB.');
}
