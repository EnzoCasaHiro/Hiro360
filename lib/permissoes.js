'use strict';
/* Permissões no servidor: o mesmo que a tela faz, mas aqui ninguém consegue pular.
   - Administrador (conta com "admin") vê e altera tudo.
   - Quem não tem perfil liberado em "Usuários e permissões" (ou está suspenso) não lê nem grava dados:
     só pode pedir acesso.
   - Com perfil: cada tela tem Sem acesso (0) / Consulta (1) / Edição (2). Ler um dado exige Consulta
     numa das telas donas daquele dado; gravar exige Edição.
   - Dados pessoais dos integrantes (CPF, RG, filiação...) e salário só saem do servidor para quem
     tem essa permissão no perfil; quem não tem e salva a ficha não apaga esses campos.
   IMPORTANTE: as tabelas abaixo espelham a tela (src/app/008-login-e-permissoes.js e XCOLS em
   src/app/028-dp-folhas-de-ponto-por.js). Ao criar uma tela ou coleção nova, atualize os dois lados. */

const MODS = ['home', 'agenda', 'pend', 'pront', 'ponto', 'turnos', 'contador', 'gp', 'res', 'pres', 'cuid', 'admres',
  'estoque', 'fin', 'nf', 'prest', 'contab', 'fin2', 'docs', 'infra', 'rel', 'ind'];
const mk = o => { const m = {}; MODS.forEach(k => { m[k] = o[k] || 0; }); return m; };
const PERFIS_PADRAO = {
  direcao: { mods: mk(Object.fromEntries(MODS.map(k => [k, 2]))), salario: 1, pii: 1 },
  dp: { mods: mk({ home: 1, agenda: 2, pend: 1, pront: 2, ponto: 2, turnos: 2, contador: 2, gp: 2, docs: 2, infra: 1, rel: 1, ind: 1 }), salario: 1, pii: 1 },
  enf: { mods: mk({ home: 1, agenda: 2, pend: 1, turnos: 1, res: 2, pres: 2, cuid: 2, admres: 1, estoque: 1, docs: 1, infra: 2, rel: 1 }), salario: 0, pii: 0 },
  fin: { mods: mk({ home: 1, agenda: 2, pend: 1, contador: 1, estoque: 1, fin: 2, nf: 2, prest: 2, contab: 2, fin2: 2, docs: 1, rel: 1, ind: 1 }), salario: 1, pii: 0 },
  est: { mods: mk({ home: 1, agenda: 2, pend: 1, estoque: 2, nf: 1, infra: 1 }), salario: 0, pii: 0 },
  leitura: { mods: mk({ home: 1, agenda: 1, pend: 1, turnos: 1, docs: 1 }), salario: 0, pii: 0 },
};

/* qual tela é dona de cada coleção (igual a GRAVA_COL + XCOLS da tela) */
const COL = {
  integrantes: ['pront', 'turnos', 'ponto'], ocorr: ['ponto', 'pront', 'turnos'], marcacoes: ['ponto'], docs: ['docs', 'pront'], nfarq: ['nf', 'fin'],
  ferias: ['gp'], bh: ['gp'], movgp: ['gp'], trein: ['gp'], epi: ['gp'], benef: ['gp'],
  medreg: ['cuid'], ocor2: ['cuid'], cardapio: ['cuid'], ativ: ['cuid'], visita: ['cuid'], aval: ['cuid'], agres: ['cuid'], comun: ['cuid'],
  espera: ['admres'], cres: ['admres'],
  manut: ['infra'], ativos: ['infra'], chk: ['infra'], chkreg: ['infra'], ouv: ['infra'], assin: ['infra', 'gp', 'admres', 'docs'],
  orc: ['fin2'], extrato: ['fin2'], pessoas: ['gp', 'fin', 'prest', 'res', 'admres'],
  links: ['pront'],
};
/* documentos dentro de "config" (igual a GRAVA_CFG da tela) */
const CFG = [[/^nf(_p\d+)?$/, ['nf']], [/^fin_cfg$/, ['fin', 'contab']], [/^fin_\d+$/, ['fin', 'nf', 'prest', 'estoque', 'fin2']], [/^recorrencias$/, ['fin', 'prest']],
  [/^(estoque|mov_\d+)$/, ['estoque', 'nf', 'res', 'fin2']], [/^(prestadores|contratos)$/, ['prest']], [/^contab$/, ['contab', 'fin']], [/^docs_val$/, ['docs']],
  [/^(residentes|evo_\d+)$/, ['res', 'pres', 'cuid', 'admres']], [/^tar_\d+$/, ['agenda', 'cuid', 'infra']], [/^(esc_\d+|escalaEx|escala_cfg)$/, ['turnos', 'ponto']], [/^prevm_/, ['ponto']],
  [/^(x_gp|fech_\d+)$/, ['gp']], [/^x_cuid$/, ['cuid']], [/^x_infra$/, ['infra']], [/^x_ind$/, ['ind']], [/^x_fin2$/, ['fin2']], [/^x_fin(4|6|7|8|9|10|11)$/, ['fin']], [/^x_admres$/, ['admres']],
  [/^armazenamento$/, ['docs', 'fin', 'nf', 'pront', 'res', 'pres', 'turnos', 'ponto']], [/^geral$/, ['pront', 'turnos', 'ponto', 'contador', 'docs', 'fin', 'prest']]];

/* leitura um pouco mais aberta que a gravação: telas que só consultam dados de outras
   (a folha lê o ponto, a agenda lê as escalas...). "*" = qualquer pessoa com perfil. */
const LER_COL = { integrantes: '*', marcacoes: ['contador', 'gp', 'pront'], ocorr: ['contador', 'gp'] };
const LER_CFG = [[/^(esc_\d+|escalaEx|escala_cfg|geral|tar_\d+|x_m_(acesso|home|agenda))$/, '*'],
  [/^(x_m_ponto|prevm_.+)$/, ['contador', 'gp', 'pront']]]; // a folha do contador usa o ponto e o previsto digitado
/* leitura mais fechada que a gravação: o ano do financeiro é gravado também pelo estoque e pelas notas
   (compras viram contas a pagar), mas só as telas financeiras consultam. Quem pode gravar sempre pode ler,
   senão a tela gravaria o ano inteiro só com o que enxerga e apagaria o resto. */
const LER_SO_CFG = [[/^fin_\d+$/, ['fin', 'prest', 'fin2', 'contab']]]; // notas fiscais só em consulta (ex.: estoque) não vê o financeiro

/* campos da ficha do integrante que exigem "dados pessoais" ou "salário" */
const PII = ['cpf', 'rg', 'rgEmissao', 'rgOrgao', 'pis', 'ctps', 'cnh', 'titulo', 'tituloZona', 'tituloSecao', 'mae', 'pai', 'nascimento', 'naturalidade', 'dependentes',
  'endereco', 'cep', 'cidade', 'telefone', 'email', 'emergNome', 'emergTel', 'estadoCivil'];
const SAL = ['salario'];

/* configurações das telas novas (config/x_m_<tela>): dona é a própria tela, junto com as que dividem os mesmos
   dados. "home" (preferências, sugestões e votos de cada pessoa) continua aberta a quem edita qualquer tela;
   tela desconhecida = só a administração. Fotos dos residentes: telas dos residentes. */
const RES = ['res', 'pres', 'cuid', 'admres'];
const XM = { ponto: ['ponto'], turnos: ['turnos', 'ponto'], pres: RES, res: RES, cuid: RES, estoque: ['estoque', 'nf', 'res', 'fin2'],
  nf: ['nf', 'fin'], contab: ['contab', 'fin'], contador: ['contador', 'gp'], acesso: [], home: null };
/* telas donas de um caminho "col/id" (null = vale qualquer tela; [] = só a administração) */
function donos(col, id) {
  if (COL[col]) return COL[col];
  if (col === 'config') {
    const xm = /^x_m_([a-z0-9]+)$/.exec(id || '');
    if (xm) return xm[1] in XM ? XM[xm[1]] : MODS.includes(xm[1]) ? [xm[1]] : [];
    if (/^x_foto_/.test(id || '')) return RES;
    const g = CFG.find(([re]) => re.test(id || '')); return g ? g[1] : null;
  }
  return null;
}
function donosLer(col, id) {
  const so = col === 'config' && LER_SO_CFG.find(([re]) => re.test(id || ''));
  if (so) return so[1];
  const extra = col === 'config' ? ((LER_CFG.find(([re]) => re.test(id || '')) || [])[1]) : LER_COL[col];
  if (extra === '*') return null;
  const d = donos(col, id);
  return d && extra ? [...d, ...extra] : d;
}
const parte = p => { const i = p.indexOf('/'); return i < 0 ? [p, ''] : [p.slice(0, i), p.slice(i + 1)]; };

/* contexto da pessoa: { admin, uid, perfil } (perfil null = sem acesso aos dados) */
async function contexto(db, u) {
  if (u.admin) return { admin: true, uid: u.id, perfil: PERFIS_PADRAO.direcao };
  const ac = await db.get('acessos/' + u.id);
  if (!ac || ac.ativo === false || !ac.perfil) return { admin: false, uid: u.id, perfil: null };
  const mat = await db.get('perfis/matriz');
  const custom = (mat && mat.custom) || {};
  const p = custom[ac.perfil] || PERFIS_PADRAO[ac.perfil] || null;
  return { admin: false, uid: u.id, perfil: p && p.mods ? p : null };
}
const nivel = (c, mods) => !c.perfil ? 0 : Math.max(0, ...(mods || MODS).map(m => +(c.perfil.mods || {})[m] || 0));

/* caminhos que existem para o sistema funcionar mesmo sem perfil (pedir acesso, ver o próprio acesso) */
function proprio(c, col, id) {
  if (col === 'acessos' || col === 'pedidos') return id === c.uid;
  if (col === 'auditoria') return id.startsWith(c.uid + '/');
  return false;
}

/* ler: path = "col/id"; dado = o conteúdo (para o histórico, que guarda cópias de outras coleções) */
function podeLer(c, path, dado) {
  if (c.admin) return true;
  const [col, id] = parte(path);
  if (proprio(c, col, id)) return true;
  if (col === 'perfis') return true; // a matriz de perfis (sem dados pessoais) a tela precisa para montar o menu
  if (!c.perfil || col === 'acessos' || col === 'pedidos' || col === 'auditoria') return false;
  if (col === 'hist') { if (!dado) return nivel(c) >= 1; if (dado.col === 'docs' && !c.perfil.pii) return false; return nivel(c, donosLer(dado.col, dado.rid)) >= 1; }
  if (col === 'docs' && !c.perfil.pii) return false; // RG, CPF, CTPS, atestados escaneados: só com permissão de dados pessoais
  return nivel(c, donosLer(col, id)) >= 1 || podeGravar(c, path);
}
/* gravar ou apagar */
function podeGravar(c, path, apagar) {
  if (c.admin) return true;
  const [col, id] = parte(path);
  if (col === 'acessos' || col === 'perfis') return false;
  if (col === 'pedidos') return id === c.uid && !apagar;
  if (col === 'auditoria') return id.startsWith(c.uid + '/') && !apagar; // o próprio registro, sem apagar
  if (!c.perfil) return false;
  if (col === 'hist') return !apagar && nivel(c) >= 2; // histórico: só acrescenta (o servidor confere o resto)
  if (col === 'docs' && !c.perfil.pii) return false;
  if (col !== 'config' && !COL[col]) return false; // coleção desconhecida: só a administração cria
  return nivel(c, donos(col, id)) >= 2;
}
/* registro do histórico: só cria (nunca reescreve um que já existe) e só de algo que a pessoa pode alterar */
function podeGravarHist(c, novo, existente) {
  if (c.admin) return true;
  if (existente || !novo || typeof novo.col !== 'string' || typeof novo.rid !== 'string') return false;
  if (novo.col === 'hist' || novo.col.includes('/') || novo.rid.includes('/')) return false;
  return podeGravar(c, novo.col + '/' + novo.rid, novo.op === 'del');
}
/* tira da resposta o que o perfil não pode ver */
function filtra(c, path, dado) {
  if (c.admin || !dado || typeof dado !== 'object') return dado;
  const [col] = parte(path);
  if (col === 'integrantes') {
    const o = { ...dado };
    if (!c.perfil.pii) PII.forEach(k => delete o[k]);
    if (!c.perfil.salario) SAL.forEach(k => delete o[k]);
    return o;
  }
  if (col === 'hist' && dado.col === 'integrantes' && !(c.perfil.pii && c.perfil.salario)) return { ...dado, antes: '' };
  // termo de confidencialidade assinado guarda o CPF do integrante
  if (!c.perfil.pii && path === 'config/x_m_acesso' && Array.isArray(dado.confid)) return { ...dado, confid: dado.confid.map(x => { const o = { ...x }; delete o.doc; return o; }) };
  if (!c.perfil.pii && col === 'hist' && dado.col === 'config' && dado.rid === 'x_m_acesso') return { ...dado, antes: '' };
  return dado;
}
/* ao gravar a ficha sem permissão de dados pessoais, mantém o que já estava guardado nesses campos */
function preserva(c, path, novo, antigo) {
  if (c.admin || !antigo || parte(path)[0] !== 'integrantes') return novo;
  const o = { ...novo };
  const ocultos = [...(c.perfil.pii ? [] : PII), ...(c.perfil.salario ? [] : SAL)];
  ocultos.forEach(k => { if (antigo[k] !== undefined) o[k] = antigo[k]; else delete o[k]; });
  return o;
}
const temPerfil = c => c.admin || !!c.perfil;
const podeEditarAlgo = c => c.admin || nivel(c) >= 2;

module.exports = { donos, podeGravarHist, contexto, podeLer, podeGravar, filtra, preserva, temPerfil, podeEditarAlgo, PERFIS_PADRAO, MODS, COL, CFG, PII };
