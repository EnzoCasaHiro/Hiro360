#!/usr/bin/env node
/*
 * Hook PreToolUse (Bash e PowerShell): antes de um comando que apaga ou reescreve
 * coisas sem volta, o Claude Code para e pede a confirmação do Enzo.
 * Não bloqueia de vez: só transforma o comando em "pergunte antes".
 * Ideia tirada do GateGuard do ECC (github.com/affaan-m/ecc), reescrita aqui, sem dependências.
 */
'use strict';

const REGRAS = [
  // apagar arquivos e pastas
  [/\brm\s+(?:-[a-z]*[rf][a-z]*\b|--recursive|--force)/i, 'apaga arquivos com rm -r/-f'],
  [/\b(?:Remove-Item|ri|rmdir|rd|del|erase)\b[^|;&\n]*\s-(?:Recurse|Force|r\b)/i, 'apaga arquivos/pastas (Remove-Item -Recurse/-Force)'],
  [/\b(?:rmdir|rd|del|erase)\s+\/[sq]/i, 'apaga pasta com /s'],
  [/\b(?:rm|mv|Remove-Item|Move-Item|Rename-Item|del|ri|mi)\b[^|;&\n]*["'\s\/\\]data[\/\\]/i, 'mexe na pasta data/ (dados reais)'],
  [/(?:^|[^>])>\s*["']?[^\s"']*\.env\b/i, 'sobrescreve o arquivo .env'],
  // git que perde trabalho ou reescreve histórico
  [/\bgit\s+reset\b[^|;&\n]*--hard/i, 'git reset --hard (descarta alterações)'],
  [/\bgit\s+clean\b[^|;&\n]*-[a-z]*f/i, 'git clean -f (apaga arquivos não versionados)'],
  [/\bgit\s+checkout\b[^|;&\n]*(?:\s--\s|\s\.(?:\s|$)|\s-f\b|--force)/i, 'git checkout que descarta alterações'],
  [/\bgit\s+restore\b(?![^|;&\n]*--staged(?![^|;&\n]*--worktree))/i, 'git restore (descarta alterações)'],
  [/\bgit\s+push\b[^|;&\n]*(?:\s-f\b|--force|--delete|\s:[\w\/.-]+)/i, 'git push forçado ou que apaga branch'],
  [/\bgit\s+branch\b[^|;&\n]*\s-D\b/, 'git branch -D (apaga branch)'],
  [/\bgit\s+stash\s+(?:drop|clear)\b/i, 'git stash drop/clear'],
  [/\bgit\s+(?:rebase|filter-branch|filter-repo)\b/i, 'reescreve o histórico do git'],
  [/\bgit\s+(?:reflog\s+expire|gc\b[^|;&\n]*--prune|update-ref\s+-d)/i, 'apaga histórico do git'],
  // banco de dados
  [/\bDROP\s+(?:TABLE|DATABASE|SCHEMA|USER)\b/i, 'DROP no banco de dados'],
  [/\bTRUNCATE\s+(?:TABLE\s+)?\w/i, 'TRUNCATE no banco de dados'],
  [/\bDELETE\s+FROM\s+[\w`."]+\s*(?:;|$|["'])/im, 'DELETE sem WHERE no banco de dados'],
  // disco
  [/\b(?:format\s+[a-z]:|mkfs\b|diskpart\b|Clear-Disk\b|Format-Volume\b)/i, 'formata disco'],
];

function avalia(cmd) {
  const achados = [];
  for (const [re, motivo] of REGRAS) if (re.test(cmd)) achados.push(motivo);
  return achados;
}

let entrada = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { entrada += d; });
process.stdin.on('end', () => {
  let cmd = '';
  try { const j = JSON.parse(entrada || '{}'); cmd = String((j.tool_input && j.tool_input.command) || ''); } catch (e) { return; }
  const achados = avalia(cmd);
  if (!achados.length) return; // comando comum: segue o fluxo normal de permissões
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: 'Comando destrutivo: ' + [...new Set(achados)].join('; ') + '. Confira antes de aprovar.',
    },
  }));
});

module.exports = { avalia };
