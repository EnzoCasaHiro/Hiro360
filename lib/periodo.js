'use strict';
/* Período de referência do ponto (igual ao da tela, src/app/005-utilidades.js):
   do dia 26 do mês anterior ao dia 25 do mês. Usado para saber de qual "mês fechado" é um dia. */
const PONTO_CORTE = 25;
function refYm(dia) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dia || '')); if (!m) return null;
  let y = +m[1], mo = +m[2];
  if (+m[3] > PONTO_CORTE) { mo++; if (mo > 12) { mo = 1; y++; } }
  return y + '-' + String(mo).padStart(2, '0');
}
module.exports = { PONTO_CORTE, refYm };
