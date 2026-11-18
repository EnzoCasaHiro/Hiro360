# Hiro360 — regras de trabalho

Sistema interno da Casa Hiro (RH, ponto, banco de horas, documentos de integrantes, financeiro). Quem pede e aprova é o Enzo, que não é programador: explique em português simples, sem jargão.

<!-- Regras gerais adaptadas de rules/common e rules/typescript do ECC (github.com/affaan-m/ecc, MIT). -->

## Como o projeto é montado
- Servidor: `server.js` (Node 22+, `node:http`, sem framework) e `lib/`. Dados reais ficam em `data/` (fora do git) — **nunca leia, apague ou mova nada em `data/`**.
- Front-end: edite só `src/app/NNN-*.js`. `public/app.js` e `public/index.html` são gerados por `npm run montar`; nunca edite `public/` à mão (exceto `public/host.js` e `public/vendor/`).
- `089-inicio.js` precisa continuar sendo a última parte (chama `go("home")`).
- Antes de dizer que terminou: `npm run montar` e `npm test`. Para mudança visível, abra a tela no navegador (servidor de teste com `DATA_DIR` temporário) e olhe.

## Ponto: período de referência
- O ponto da Casa Hiro vai **do dia 26 do mês anterior ao dia 25 do mês** (nunca do dia 1 ao fim do mês). "Referência 2026-11" = 26/10/2026 a 25/11/2026.
- Use sempre `refIni(ym)`, `refFim(ym)`, `refYm(data)`, `refPadrao()` e `pontoRef()` (em `src/app/005-utilidades.js`); no servidor, `lib/periodo.js`. Teste em `test/periodo.test.js`.
- Banco de horas, fechamento do mês (`fech_AAAAMM`), folha de ponto, pendências e painel do DP usam esse período.

## Estilo do código (siga o que já existe)
- JavaScript puro, sem TypeScript, sem build além do `montar`, sem dependências novas sem o Enzo pedir.
- Acompanhe o estilo do arquivo que estiver editando (nomes em português, funções curtas com prefixo do módulo: `xdc…`, `bh…`, `dp…`). Não reformate nem reorganize código que não faz parte da tarefa.
- Mudança mínima que resolve o problema. Nada de refatorar "de brinde", criar abstrações para o futuro ou dividir arquivos sem pedido.
- Erros: mensagem clara ao usuário (toast) e detalhe no console/log do servidor; não engula erro em silêncio em caminho que salva dados.

## Segurança (sempre)
- Toda permissão é conferida **no servidor** (`lib/permissoes.js`), não só na tela. Dados pessoais (documentos, CPF, saúde) exigem `pii`.
- Todo dado que vai para HTML passa por `esc()`. Nada de `innerHTML` com texto vindo de usuário, arquivo ou IA sem escapar.
- Entrada validada no servidor: tamanho, tipo, ids por regex, caminhos sem `..`.
- Segredos só no `.env` / variáveis do hPanel. Nunca no código, README, `public/` ou commit. Nunca imprima o valor de um segredo.
- Depois de mexer em login, sessão, permissões, rotas `/api`, upload/download de arquivos, dados pessoais ou IA: rode o agente **security-reviewer** antes de dizer que terminou.
- Não reative 2FA sem o Enzo pedir.

## Testes
- Bug ou regra de cálculo (ponto, banco de horas, CLT, folha, leitura de documentos, permissões, validações): use a skill **tdd** — teste que falha primeiro, depois a correção.
- Testes usam `node:test` e dados inventados, nunca dados reais.
- Relate o resultado real do `npm test` (quantos passaram/falharam). Se algo não foi testado, diga.

## Git
- Commit e push **só quando o Enzo pedir**. Mensagem de commit em português, descrevendo o que mudou para quem usa o sistema.
- Depois do push, lembre que o app precisa ser reiniciado no hPanel da Hostinger.
- Comandos destrutivos (apagar arquivos, `git reset --hard`, push forçado, DROP/DELETE no banco) pedem confirmação pelo hook `.claude/hooks/confirma-destrutivo.js`. Não tente contornar o hook.
- Folha arrumada e enviada por integrante: config/pfolha_AAAA-MM (aba Pendências, src/app/081-x-ponto-pendencias.js); grava quem edita o ponto (lib/permissoes.js e 008).
