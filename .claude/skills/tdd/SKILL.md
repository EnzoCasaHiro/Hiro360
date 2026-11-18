---
name: tdd
description: Desenvolvimento guiado por testes no Hiro360. Use ao corrigir um bug ou mudar uma regra de cálculo (ponto, banco de horas, tolerância da CLT, folha, leitura de documentos, permissões, validações de CPF/PIS/datas) e quando pedirem "escreva o teste primeiro". Escreve o teste que falha, confirma que falha, faz a menor correção, confirma que passa.
---

<!-- Adaptado da skill tdd-workflow do ECC (github.com/affaan-m/ecc, MIT) para o Hiro360. -->

# TDD no Hiro360

Objetivo: toda correção ou regra nova sai com um teste que **falhou antes** e **passa depois**. Isso protege as partes em que um erro custa caro (horas dos integrantes, banco de horas, dados pessoais).

## Quando usar
- Bug relatado pelo Enzo ("o banco de horas ficou errado", "lê o documento errado").
- Mudança de regra de cálculo ou de permissão.
- Função pura nova (formatação, validação, classificação).

Não é obrigatório para mudanças só de aparência (CSS, texto de tela, layout). Nesses casos, confira no navegador.

## Como o projeto testa
- `npm test` = `node tools/montar.js --checar` + `node --test` nos arquivos listados em `package.json` (`test/*.test.js`). Usa só `node:test` e `node:assert` — **não instale Jest, Vitest, Playwright ou outras dependências** sem o Enzo pedir.
- Arquivo de teste novo precisa ser **acrescentado ao script `test` do `package.json`**, senão não roda.
- Lógica do servidor: funções de `lib/` são `require`-adas direto (modelo: `test/permissoes.test.js`, com banco falso). Rotas `/api` são testadas subindo o servidor de verdade com `criaApp({ env: { DATA_DIR: <pasta temporária>, ... }, semManutencao: true })` em porta aleatória (modelo: `test/confirma-senha.test.js`). Nunca use a pasta `data/` real.
- O front-end não é módulo: as funções vivem em `src/app/NNN-*.js` e são concatenadas. Ainda não há teste de front; para criar o primeiro, leia o arquivo-fonte e carregue só o trecho necessário com `node:vm` (extrair o texto da função e das auxiliares de que ela depende e rodar num contexto isolado). Prefira testar funções puras (cálculo de saldo, formatação, validação, classificação de documento).
- Depois de mexer em `src/app/`, rode `npm run montar` antes de `npm test` (o teste confere se `public/` está atualizado).

## Ciclo
1. **Entender e escrever o caso**: descreva em uma frase o comportamento esperado, com números concretos. Ex.: "integrante com escala 08:00–17:00 que bateu 08:04 e 17:03 tem saldo 0 (tolerância do art. 58 §1º)".
2. **Teste primeiro (VERMELHO)**: escreva o teste com esses números e rode `npm test`. Ele **tem que falhar pelo motivo certo** (resultado errado), não por erro de sintaxe ou import. Mostre o trecho da falha.
3. **Menor correção (VERDE)**: altere só o necessário em `src/app/` / `server.js` / `lib/`, rode `npm run montar` e `npm test`. Todos os testes devem passar, não só o novo.
4. **Limpar**: melhore nomes ou duplicação sem mudar comportamento; rode os testes de novo.
5. **Casos de borda**: acrescente pelo menos os limites que fazem sentido (zero, negativo, virada de mês/dia, dia sem marcação, campo vazio, texto com acento, CPF inválido).
6. **Relatar ao Enzo** em português simples: o que estava errado, o teste que prova a correção (nome do arquivo e o caso), e o resultado do `npm test` (quantos passaram). Não diga que passou se não rodou.

## Regras
- Nada de commit a cada etapa: **commit e push só quando o Enzo pedir**.
- Não use dados reais de integrantes nos testes; invente nomes e números.
- Não enfraqueça nem apague teste existente para fazer o novo passar. Se um teste antigo estiver errado, explique ao Enzo antes de mudar.
- Cobertura não tem meta numérica; o que importa é cobrir as regras que movimentam horas, dinheiro e dados pessoais.
