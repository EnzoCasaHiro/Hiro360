# Sistema Casa Hiro — versão para a Hostinger

Este pacote é o mesmo sistema que você usa no Claude, mas rodando no **seu próprio site**, com login por usuário e senha, banco de dados e arquivos guardados no seu plano da Hostinger, e a **leitura de notas por IA** (foto e PDF) mantida.

> **Importante:** a versão do Claude e a da Hostinger têm **bancos separados**. O que você cadastra em uma não aparece na outra. Use as duas em paralelo só para testar; no dia de mudar de vez, faça o passo 6 (levar os dados) e passe a usar só a da Hostinger.

## Resumo para fazer hoje (≈ 30 minutos)
1. No hPanel, crie o site Node.js e envie o arquivo `casa-hiro-hostinger.zip` (passo 2).
2. Cadastre as variáveis de ambiente (passo 3) — principalmente `ADMIN_USER`, `ADMIN_PASSWORD` e, para a IA, `ANTHROPIC_API_KEY`.
3. Inicie o app, abra o endereço e entre com o usuário/senha que você definiu.
4. Crie as contas da equipe (menu **Usuários e permissões**).
5. Confira o cadeado (HTTPS) no navegador.
6. Quando quiser trocar de vez: leve os dados (passo 6).

## 1. O que você precisa
- Plano da Hostinger com **aplicativos Node.js** (o atendimento confirmou Node.js; os nomes dos menus no hPanel podem variar um pouco do que está escrito aqui).
- **Node.js 22 ou 24** escolhido no painel (precisa ser 22.5 ou mais novo; o banco SQLite já vem dentro dele — não precisa criar banco).
- Um domínio ou subdomínio com HTTPS (o SSL é grátis no hPanel). Não use o sistema sem o cadeado.
- Para a leitura por IA: uma chave da API da Anthropic (console.anthropic.com → API keys). A IA é cobrada por uso, na sua conta Anthropic, separada do plano do Claude.

> Se o seu plano **não** mostrar a opção de aplicativo Node.js, pare e me avise: eu faço uma versão em PHP + MySQL. O código do sistema (a tela) é o mesmo; só o servidor muda.

## 2. Enviar para a Hostinger
1. hPanel → **Sites / Websites** → **Adicionar site** → **Aplicativo Node.js** (ou "Node.js Apps").
2. Envie o `casa-hiro-hostinger.zip` (ou importe do GitHub, se você já tiver o repositório).
3. Configurações do app:
   - **Arquivo de entrada / Startup file:** `server.js`
   - **Versão do Node:** 22 ou 24
   - **Comando de build:** deixe vazio (não há o que compilar). Se o painel exigir `npm install`, pode rodar: não há dependências obrigatórias.
4. Clique em **Deploy / Reiniciar**.

## 3. Variáveis de ambiente (painel → Environment variables)
| Variável | Valor |
|---|---|
| `ADMIN_USER` | o usuário do primeiro administrador, ex.: `direcao` (minúsculas) |
| `ADMIN_PASSWORD` | senha forte (8+ caracteres, não só números). **Só é usada se ainda não existir nenhuma conta.** Depois do primeiro login, apague esta variável. |
| `ADMIN_NAME` | seu nome, ex.: `Enzo` |
| `ANTHROPIC_API_KEY` | a chave da IA (começa com `sk-ant-`). Sem ela o sistema funciona, só não lê foto/PDF de nota. XML continua funcionando. |
| `BACKUP_TOKEN` | texto aleatório de 24+ caracteres (para o backup automático fora da Hostinger, passo 7) |
| `DATA_DIR` | *(recomendado)* uma pasta **fora** da pasta pública do site, para que atualizar o app nunca apague os dados. Se o painel não permitir, deixe vazio e **sempre** faça backup antes de reenviar o zip. |

Nunca coloque essas informações no GitHub. O arquivo `.env.example` mostra todas as opções.

## 4. Primeiro acesso
1. Abra o endereço do site. Aparece a tela de entrada da Casa Hiro.
2. Entre com `ADMIN_USER` / `ADMIN_PASSWORD`. Apague `ADMIN_PASSWORD` do painel e reinicie.
3. **Usuários e permissões → Pessoas → Criar conta:** nome, usuário (ex.: `maria.souza`), senha provisória e perfil (Direção, RH, Enfermagem, Financeiro, Cozinha/estoque, Consulta). Passe usuário e senha pessoalmente. Cada pessoa troca a própria senha em **Minha senha** (menu lateral).
4. **Segurança já incluída:** 5 senhas erradas bloqueiam o acesso por 15 minutos; senhas guardadas com hash (scrypt); sessão expira após 12 h sem uso; cabeçalhos de segurança; arquivos só abrem para quem está logado; conta suspensa perde a sessão na hora.

## 5. Leitura de notas por IA
Funciona igual ao Claude: **Notas fiscais → enviar PDF ou foto**. O navegador prepara a imagem, o servidor chama a IA com a sua chave e devolve os itens para você conferir. A chave **nunca** chega ao navegador.
- Limites (ajustáveis): 20 leituras/minuto por pessoa e 1.500/dia no total (`IA_POR_MINUTO`, `IA_POR_DIA`).
- Modelos padrão: `claude-sonnet-5-5` para ler notas e `claude-haiku-5-5` para classificar itens. Para trocar: `ANTHROPIC_MODEL_DEFAULT`, `ANTHROPIC_MODEL_QUICK`.
- Teste: envie uma foto de nota. Se aparecer "leitura por IA não está ativada", falta a `ANTHROPIC_API_KEY`; "chave recusada" = chave errada ou sem crédito na conta Anthropic.

## 5b. Documentos em lote e link de envio do colaborador
- **Em lote:** em *Colaboradores → Documentos*, solte vários arquivos de uma vez. Cada um é lido pela IA (usa a mesma chave da seção 5; modelo rápido, `ANTHROPIC_MODEL_QUICK`), recebe o tipo, o titular (colaborador ou familiar) e é **renomeado e salvo sozinho** no padrão `NOME DO DOCUMENTO - NOME DO INTEGRANTE` (ex.: "RG - Ana Paula Souza", "RG de Pedro (filho(a)) - Ana Paula Souza"). As fotos viram **PDF** (bem menores; frente e verso do mesmo documento viram um PDF só) e os dados lidos (CPF, RG, nascimento etc.) preenchem o cadastro, com conferência quando há divergência. A tela de conferência mostra, para cada arquivo, qual documento é e se é **frente, verso ou frente e verso** (lê até 4 páginas de cada PDF e recorta a folha em branco para ler melhor); frente e verso em arquivos separados são juntados em um PDF só, e o sistema avisa se dois arquivos mostram o mesmo lado. Reconhece também o Cartão do Cidadão (NIS). Os dados lidos vão para a aba **Dados** (CPF, RG com órgão e expedição, nascimento, naturalidade, mãe e pai, estado civil, PIS/NIT, CTPS, título com zona e seção, CNH, endereço, CEP, cidade; nome incompleto é completado pelo do documento) e os documentos dos filhos criam a lista de **dependentes**. Na aba Dados, o botão *Ler dados dos documentos* relê o que já foi enviado e mostra tudo para confirmar, avisando quando dois documentos discordam (ex.: datas de nascimento diferentes). A leitura de documentos usa o modelo padrão (`ANTHROPIC_MODEL`), mais preciso em fotos tortas e letra à mão. O botão *Novo colaborador* aceita o nome e todos os documentos de uma vez. Documentos que a leitura não identificou ficam na tela para você escolher o tipo; dá para desligar o salvamento automático. Sem chave da IA, o sistema ainda deixa escolher o tipo à mão. As imagens vão à API da Anthropic só para identificar o documento; avise a equipe (LGPD).
- **Link de envio:** o botão *Link para o colaborador enviar documentos* cria um endereço com validade (3 a 30 dias, até 60 arquivos), sem senha, para abrir no celular. Só PDF e foto (até 15 MB). O link não fica guardado no sistema (só o código de verificação): copie na hora ou gere outro. Os arquivos chegam como **pendentes** e só entram na pasta depois da sua conferência. Dá para desativar o link a qualquer momento.
- Quem tem o link consegue enviar arquivos até ele vencer, ser desativado ou lotar. Não consegue ver nada. Há bloqueio por excesso de tentativas com link inválido.

## 6. Levar os dados do Claude para a Hostinger (migração)
1. **No sistema do Claude:** Usuários e permissões → aba **Backup e restauração** → **Dados + arquivos enviados (.zip)**. Guarde o arquivo.
2. **No sistema da Hostinger**, entre como administrador e vá na mesma aba → escolha o `.zip` → **Restaurar**. Ele envia os arquivos (PDFs, fotos, notas) para o servidor, troca os endereços internos e restaura os dados. Pode levar vários minutos; não feche a página.
3. Quando perguntar *"Restaurar as permissões também?"*, responda **Não**. As permissões antigas estão ligadas às contas do claude.ai; na Hostinger as pessoas têm contas novas (criadas no passo 4).
4. Confira por amostragem: colaboradores, residentes, estoque, notas fiscais (abra um PDF antigo), financeiro.
5. Escolha o dia da virada e **avise a equipe para parar de lançar no Claude**. Dados lançados lá depois do backup não vão para cá.

## 7. Backups
- **Automático no servidor:** uma cópia do banco por dia em `data/backups/` (guarda 14). Isso protege de erro humano, **não** de perda do servidor.
- **Fora da Hostinger (faça!):** no computador da casa, instale o Node.js, copie a pasta `tools/` e use `tools/backup-diario.bat` (edite o endereço, a pasta e o `BACKUP_TOKEN`) agendado no *Agendador de Tarefas* do Windows. Ele baixa os dados e só os arquivos novos.
- **Manual:** no sistema, o botão de backup baixa um `.json` (ou `.zip` com arquivos). O administrador também pode abrir `/api/backup` logado.
- Teste a restauração uma vez (num site de teste) antes de confiar no backup.
- O contrato da Hostinger fala em backup semanal do plano; não conte com ele como única cópia.

## 8. LGPD e dados de saúde (leia)
Você (Casa Hiro) é a controladora dos dados dos residentes e colaboradores. Dados de saúde são dados pessoais sensíveis. A Hostinger declara no contrato que o serviço não é compatível com HIPAA (norma americana); no Brasil o que vale é a LGPD — vale conversar com um advogado/DPO sobre contrato de operador, base legal e política de privacidade. Boas práticas já no sistema: contas individuais, perfis, registro de acessos, backup, HTTPS. O que falta decidir com você: prazo de guarda, termo de uso e plano de resposta a incidentes.

## 9. Atualizar o sistema depois
- **Com Claude Code no VS Code:** abra esta pasta, peça a mudança, rode `npm test` e `npm run test:e2e`, `npm run build:app && npm run build:host`, depois `npm run empacotar`.
- **Subir:** (a) Git da Hostinger/GitHub, se o plano oferecer deploy por Git; ou (b) enviar o zip novamente. **Faça backup antes.** Se `DATA_DIR` não estiver fora da pasta do site, não substitua a pasta `data/`.
- Nunca faça commit de `.env`, `data/`, backups ou arquivos enviados (já estão no `.gitignore`).

## 10. Problemas comuns
| Sintoma | O que fazer |
|---|---|
| Página em branco ou "Application error" | Veja o log do app no painel. Confirme Node 22/24 e `server.js` como arquivo de entrada. |
| "Este Node.js não tem SQLite embutido" | Troque a versão do Node para 22 ou 24 no painel. |
| Não consigo entrar / esqueci a senha | Outro administrador usa **Nova senha** na tela de contas. Se for o único: defina `ADMIN_USER`/`ADMIN_PASSWORD` e rode `node tools/criar-admin.js usuario "Nome" "Senha"` (precisa de terminal/SSH). |
| "Muitas tentativas erradas" | Aguarde 15 minutos. |
| Notas por foto/PDF não leem | Ver passo 5. |
| Gráficos/planilhas/PDF não abrem | O sistema carrega bibliotecas do cdnjs.cloudflare.com; verifique se a rede da casa não bloqueia. |
| Perdi dados depois de atualizar | Os dados ficam em `data/` (ou `DATA_DIR`). Restaure o último backup. |

## 11. O que foi testado — e o que não foi
**Testado aqui (computador de desenvolvimento, sem a Hostinger):** 17 testes automáticos do servidor (login, bloqueio por tentativas, permissões, CSRF, arquivos, limites, IA simulada, backup, ferramentas) e um teste ponta a ponta com navegador real (login, gravar e recarregar, dois usuários com atualização ao vivo, burla de permissão negada, criação de contas, suspensão, upload/download, migração de .zip com arquivos, leitura de foto por IA, link de envio de documentos aberto em outro navegador sem login, conferência pelo RH, sair).
**Não testado — verifique no primeiro uso:**
- a instalação real no hPanel (nomes de menus, versão do Node, variáveis);
- a leitura real de documentos (RG, certidões, vacinação) pela IA: nos testes a resposta foi simulada, então a precisão do reconhecimento com fotos de verdade precisa ser conferida com alguns documentos de teste;
- o link de envio por celular de verdade (câmera do iPhone/Android, HEIC);
- a chamada real à API da Anthropic (foi simulada; chave e modelos precisam ser conferidos com uma nota de verdade);
- o motor MySQL (`DB_DRIVER=mysql`) — escrito, mas nunca rodado contra um MySQL;
- a importação/exportação de planilhas com as bibliotecas reais do cdnjs (testadas só com simulação);
- carga: dezenas de pessoas ao mesmo tempo; o limite de 700 notas de uma vez no servidor da Hostinger;
- permissões por tela (Consulta/Edição) são aplicadas no navegador; o servidor já bloqueia mexer em contas/perfis e em auditoria alheia, mas ainda não aplica toda a matriz por tela.
