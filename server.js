'use strict';
/* Casa Hiro - servidor (sem dependências obrigatórias). Node 22.5+ recomendado. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { carregaEnv } = require('./lib/env');
const dbmod = require('./lib/db');
const seg = require('./lib/seguranca');
const ia = require('./lib/ia');
const perm = require('./lib/permissoes');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8','.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const TIPOS_ARQ = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain', 'text/csv', 'application/json', 'application/zip', 'application/xml', 'text/xml']);
const INLINE = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const TIPOS_LINK = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const SESSAO_OCIOSA = 12 * 3600 * 1000, SESSAO_MAX = 7 * 24 * 3600 * 1000;

async function criaApp(opts = {}) {
  const env = opts.env || carregaEnv();
  const raiz = opts.raiz || __dirname;
  // "~/pasta" = dentro da pasta da conta (na Hostinger, fora do app, então as atualizações não apagam)
  const dataDir = env.DATA_DIR ? path.resolve(String(env.DATA_DIR).replace(/^~(?=$|[\/\\])/, require('os').homedir())) : path.join(raiz, 'data');
  if (!opts.env) console.log('[casa-hiro] pasta de dados:', dataDir);
  const filesDir = path.join(dataDir, 'arquivos');
  fs.mkdirSync(filesDir, { recursive: true, mode: 0o700 });
  // banco e arquivos legíveis só pelo usuário do app (servidor compartilhado)
  for (const d of [dataDir, filesDir]) { try { fs.chmodSync(d, 0o700); } catch (e) {} }
  const db = opts.db || await dbmod.abre({ ...env, DATA_DIR: dataDir });
  const MAX_ARQ = (+env.MAX_UPLOAD_MB || 25) * 1048576;
  const MAX_JSON = 8 * 1048576;
  const publico = path.join(raiz, 'public');
  const limUser = seg.criaLimitador(), limIp = seg.criaLimitador({ max: 30 }), limConta = seg.criaLimitador({ max: 40 });
  const limEnvio = seg.criaLimitador({ max: 300 }), limEnvioRuim = seg.criaLimitador({ max: 15 });
  const usoIa = new Map(); // uid -> [timestamps]
  const iaPorMin = +env.IA_POR_MINUTO || 20, iaPorDia = +env.IA_POR_DIA || 1500, iaPessoaDia = +env.IA_POR_PESSOA_DIA || 400;
  const iaPessoa = new Map(); // uid -> { d, n }
  let iaDia = { d: '', n: 0 };
  const fetchIa = opts.fetchIa || null;

  /* cria o primeiro administrador a partir do .env (uma vez) */
  if (await db.userConta() === 0 && env.ADMIN_USER && env.ADMIN_PASSWORD) {
    const u = String(env.ADMIN_USER).toLowerCase().trim();
    const fraca = seg.senhaFraca(env.ADMIN_PASSWORD, u);
    if (/troque-por/i.test(env.ADMIN_PASSWORD)) console.error('[casa-hiro] ADMIN_PASSWORD ainda é o texto de exemplo: troque no .env. Nenhuma conta foi criada.');
    else if (!seg.usuarioOk(u) || fraca) console.error('[casa-hiro] ADMIN_USER/ADMIN_PASSWORD inválidos:', fraca || 'usuário (3-40, letras minúsculas, números . _ -)');
    else { await db.userCria({ id: seg.novoId('u'), username: u, name: env.ADMIN_NAME || 'Direção', hash: seg.hashSenha(env.ADMIN_PASSWORD), admin: true }); console.log('[casa-hiro] administrador inicial criado:', u); }
  } else if (env.ADMIN_RESET === '1' && env.ADMIN_USER && env.ADMIN_PASSWORD) {
    /* esqueceu a senha sem ter SSH: ADMIN_RESET=1 no painel troca a senha (ou cria a conta) e reativa como administrador */
    const u = String(env.ADMIN_USER).toLowerCase().trim(), fraca = seg.senhaFraca(env.ADMIN_PASSWORD, u);
    if (!seg.usuarioOk(u) || fraca) console.error('[casa-hiro] ADMIN_RESET: ADMIN_USER/ADMIN_PASSWORD inválidos:', fraca || 'usuário (3-40, letras minúsculas, números . _ -)');
    else {
      const ex = await db.userPorNome(u);
      if (ex) { await db.userAtualiza(ex.id, { hash: seg.hashSenha(env.ADMIN_PASSWORD), active: 1, admin: 1 }); await db.sessApagaUser(ex.id); }
      else await db.userCria({ id: seg.novoId('u'), username: u, name: env.ADMIN_NAME || 'Direção', hash: seg.hashSenha(env.ADMIN_PASSWORD), admin: true });
      console.warn('[casa-hiro] ADMIN_RESET: senha de', u, 'redefinida. Entre, depois APAGUE ADMIN_RESET e ADMIN_PASSWORD do painel e reimplante.');
    }
  } else if (env.ADMIN_PASSWORD && !opts.env) console.warn('[casa-hiro] aviso: ADMIN_PASSWORD continua configurada, mas o administrador já existe. Apague-a no painel.');
  if (!opts.env) {
    if (!env.DATA_DIR) console.warn('[casa-hiro] aviso: DATA_DIR não definido; o banco está dentro da pasta do app e pode ser apagado numa atualização.');
    if (env.BACKUP_TOKEN && String(env.BACKUP_TOKEN).length < 20) console.warn('[casa-hiro] aviso: BACKUP_TOKEN curto demais (mínimo 20, ideal 24+); o backup externo está desligado.');
  }

  // o proxy da Hostinger acrescenta o IP real no fim do X-Forwarded-For; o começo pode ser forjado pelo visitante
  const ipDe = req => { const x = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean); return x.length ? x[x.length - 1] : String(req.socket.remoteAddress || ''); };
  const https_ = req => req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
  const cookieDe = req => { const m = String(req.headers.cookie || '').match(/(?:^|;\s*)hiro_sid=([^;]+)/); return m ? m[1] : null; };
  const cookieSessao = (req, tk) => `hiro_sid=${tk}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSAO_MAX / 1000}${https_(req) ? '; Secure' : ''}`;
  const resp = (res, code, obj, extra = {}) => {
    const b = Buffer.from(JSON.stringify(obj));
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': b.length, ...extra }); res.end(b);
  };
  const erro = (res, code, msg, c) => resp(res, code, { erro: msg, codigo: c || null });
  const lerCorpo = (req, max) => new Promise((ok, no) => {
    const b = []; let n = 0, estourou = false;
    req.on('data', d => { n += d.length; if (estourou) return; if (n > max) { estourou = true; b.length = 0; return; } b.push(d); });
    req.on('end', () => estourou ? no(Object.assign(new Error('Conteúdo grande demais.'), { http: 413 })) : ok(Buffer.concat(b))); req.on('error', no);
  });
  const lerJson = async (req, max = MAX_JSON) => { const b = await lerCorpo(req, max); try { return JSON.parse(b.toString('utf8') || 'null'); } catch (e) { throw Object.assign(new Error('JSON inválido.'), { http: 400 }); } };

  async function sessao(req) {
    const t = cookieDe(req); if (!t) return null;
    const th = seg.hashToken(t), s = await db.sessGet(th); if (!s) return null;
    const agora = Date.now();
    if (agora - s.last > SESSAO_OCIOSA || agora - s.created > SESSAO_MAX) { await db.sessApaga(th); return null; }
    const u = await db.userPorId(s.uid); if (!u || !u.active) { await db.sessApaga(th); return null; }
    if (agora - s.last > 60000) await db.sessToca(th, agora);
    return { th, user: u };
  }
  async function abreSessao(req, res, u, extra = {}) {
    const tk = seg.novoToken(); await db.sessCria(seg.hashToken(tk), u.id, Date.now());
    await db.userAtualiza(u.id, { last_login: new Date().toISOString() });
    console.log('[casa-hiro] login:', u.username, 'ip', ipDe(req)); trilha(req, u, 'entrou', u.username, { ua: String(req.headers['user-agent'] || '').slice(0, 160), ...(extra.trilha || {}) });
    return resp(res, 200, { user: pub(u) }, { 'set-cookie': cookieSessao(req, tk) });
  }
  const pub = u => ({ id: u.id, username: u.username, name: u.name, admin: !!u.admin, active: !!u.active, last_login: u.last_login || null });

  /* conteúdo real do arquivo confere com o tipo declarado (não basta o nome ou o Content-Type) */
  const ASSINATURA = { 'application/pdf': b => b.slice(0, 1024).includes('%PDF-'), 'image/png': b => b.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, 'image/gif': b => /^GIF8[79]a/.test(b.slice(0, 6).toString('latin1')),
    'image/webp': b => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP',
    'application/zip': b => b[0] === 0x50 && b[1] === 0x4b };
  const conteudoOk = (tipo, buf) => !ASSINATURA[tipo] || ASSINATURA[tipo](buf);

  /* trilha do servidor: quem gravou/apagou o quê, num arquivo por mês fora do alcance da tela (ninguém apaga pelo sistema) */
  const dirTrilha = path.join(dataDir, 'trilha'); fs.mkdirSync(dirTrilha, { recursive: true, mode: 0o700 });
  const trilha = (req, U, acao, alvo, extra) => {
    const r = { t: new Date().toISOString(), u: U.id, n: U.username || '', ip: ipDe(req), acao, alvo: String(alvo).slice(0, 250), ...(extra || {}) };
    fs.appendFile(path.join(dirTrilha, r.t.slice(0, 7) + '.jsonl'), JSON.stringify(r) + '\n', { mode: 0o600 }, () => {});
  };

  /* versão anterior guardada na trilha (para provar O QUE mudou, não só quem mexeu); documentos grandes ficam só com a impressão digital */
  const antesTrilha = d => { if (d == null) return { antes: null }; const t = JSON.stringify(d); return t.length <= 32768 ? { antes: t } : { antesHash: crypto.createHash('sha256').update(t).digest('hex').slice(0, 32), antesBytes: t.length }; };

  /* mês do ponto fechado (config/fech_AAAAMM): só a administração altera batidas e previsto desses dias */
  const mesFechado = async dia => { const m = /^(\d{4})-(\d{2})/.exec(String(dia || '')); if (!m) return false; const f = await db.get('config/fech_' + m[1] + m[2]); return !!(f && f.fechado); };
  async function tocaMesFechado(dp, novo, antigo) {
    if (dp.startsWith('marcacoes/')) { for (const x of [novo, antigo]) if (x && await mesFechado(x.ts)) return String(x.ts).slice(0, 7); return null; }
    if (dp.startsWith('config/prevm_')) {
      const a = (antigo && antigo.dias) || {}, b = (novo && novo.dias) || {};
      for (const dia of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[dia] !== b[dia] && await mesFechado(dia)) return dia.slice(0, 7);
    }
    return null;
  }

  /* arquivo guardado -> documento que aponta para ele (para conferir a permissão de quem abre ou apaga) */
  let idxArq = null, idxArqT = 0;
  async function donoDoArquivo(id) {
    if (!idxArq || Date.now() - idxArqT > 15000) {
      const m = new Map();
      for (const d of await db.list('docs')) if (d.data && d.data.assetId) m.set(d.data.assetId, { path: 'docs/' + d.id, data: d.data });
      for (const d of await db.list('nfarq')) if (d.data && d.data.asset) m.set(d.data.asset, { path: 'nfarq/' + d.id, data: d.data });
      idxArq = m; idxArqT = Date.now();
    }
    return idxArq.get(id) || null;
  }

  const caminhoOk = p => typeof p === 'string' && /^[^\u0000-\u001f\\]{1,250}$/.test(p) && !p.startsWith('/') && !p.endsWith('/') && !p.includes('//') && !p.includes('..');

  async function rota(req, res) {
    const url = new URL(req.url, 'http://x'); const p = url.pathname; const m = req.method;
    // cabeçalhos de segurança
    res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('x-frame-options', 'DENY'); res.setHeader('referrer-policy', 'same-origin');
    res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('cross-origin-opener-policy', 'same-origin'); res.setHeader('cross-origin-resource-policy', 'same-origin');
    res.setHeader('x-permitted-cross-domain-policies', 'none'); res.setHeader('x-robots-tag', 'noindex, nofollow');
    if (https_(req)) res.setHeader('strict-transport-security', 'max-age=31536000');

    if (p === '/healthz') return resp(res, 200, { ok: true });
    if (p === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('User-agent: *\nDisallow: /\n'); }
    // atrás do proxy, quem chegou por http:// é mandado para https:// (senha nunca trafega aberta)
    if (env.FORCAR_HTTPS !== '0' && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'http') {
      const host = String(req.headers.host || '');
      if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host) || /^(localhost|127\.)/.test(host)) return erro(res, 400, 'Use https.');
      if (m !== 'GET' && m !== 'HEAD') return erro(res, 403, 'Use https.');
      res.writeHead(301, { location: 'https://' + host + req.url }); return res.end();
    }
    if (m === 'POST' || m === 'PUT' || m === 'DELETE' || m === 'PATCH') {
      if (req.headers['x-hiro'] !== '1') return erro(res, 403, 'Requisição não autorizada.');
    }

    /* ---- login ---- */
    if (p === '/api/login' && m === 'POST') {
      const ip = ipDe(req);
      const b = await lerJson(req, 10000); const un = String((b && b.username) || '').toLowerCase().trim(); const pw = String((b && b.password) || '');
      const bl = Math.max(limUser.bloqueado('u:' + un + '|' + ip), limIp.bloqueado('i:' + ip), limConta.bloqueado('u:' + un));
      if (bl) return erro(res, 429, `Muitas tentativas erradas. Aguarde ${bl} minuto(s) e tente de novo.`, 'bloqueado');
      const u = un ? await db.userPorNome(un) : null;
      // gasta o mesmo tempo mesmo se o usuário não existir
      const okSenha = seg.confereSenha(pw, u ? u.hash : 'scrypt$16384$00$00');
      if (!u || !okSenha || !u.active) {
        limUser.falha('u:' + un + '|' + ip); limIp.falha('i:' + ip); limConta.falha('u:' + un);
        if (u) trilha(req, u, 'login recusado', un, { ua: String(req.headers['user-agent'] || '').slice(0, 160) });
        console.warn('[casa-hiro] login recusado:', JSON.stringify(un.slice(0, 40)), 'ip', ip);
        return erro(res, u && okSenha && !u.active ? 403 : 401, u && okSenha && !u.active ? 'Seu acesso está suspenso. Fale com a direção.' : 'Usuário ou senha incorretos.', 'credencial');
      }
      limUser.ok('u:' + un + '|' + ip);
      return abreSessao(req, res, u);
    }
    if (p === '/api/logout' && m === 'POST') {
      const s = await sessao(req); if (s) await db.sessApaga(s.th);
      return resp(res, 200, { ok: true }, { 'set-cookie': 'hiro_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }

    /* ---- backup por token (para puxar para fora da Hostinger) ---- */
    if (p.startsWith('/api/backup') && env.BACKUP_TOKEN && String(env.BACKUP_TOKEN).length >= 20) {
      const t = String(req.headers['x-backup-token'] || '');
      const a = Buffer.from(t), b2 = Buffer.from(env.BACKUP_TOKEN);
      if (a.length === b2.length && crypto.timingSafeEqual(a, b2)) req.backupOk = true;
    }


    /* ---- envio de documentos pelo integrante (link com validade, sem login) ---- */
    if (m === 'GET' && /^\/envio\/[A-Za-z0-9_-]{20,80}$/.test(p)) {
      try {
        const f = path.join(publico, 'envio.html'); const buf = await fs.promises.readFile(f);
        res.writeHead(200, { 'content-type': MIME['.html'], 'content-length': buf.length, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow',
          'content-security-policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
        return m === 'HEAD' ? res.end() : res.end(buf);
      } catch (e) { return erro(res, 404, 'Página não encontrada.'); }
    }
    const mEnvio = p.match(/^\/api\/envio\/([A-Za-z0-9_-]{20,80})(\/arquivo)?$/);
    if (mEnvio) {
      res.setHeader('referrer-policy', 'no-referrer'); res.setHeader('x-robots-tag', 'noindex, nofollow');
      const ip = ipDe(req);
      if (limEnvioRuim.bloqueado('i:' + ip)) return erro(res, 429, 'Muitas tentativas com link inválido. Aguarde alguns minutos.', 'bloqueado');
      const hash = seg.hashToken(mEnvio[1]); const l = await db.get('links/' + hash);
      const vivo = l && l.ativo !== false && l.uid && (!l.exp || Date.parse(l.exp) > Date.now());
      if (!vivo) { limEnvioRuim.falha('i:' + ip); return erro(res, 404, 'Este link não existe mais ou já venceu. Peça um novo à Casa Hiro.', 'link_invalido'); }
      const max = +l.max || 60, usados = +l.recebidos || 0;
      if (m === 'GET' && !mEnvio[2]) {
        return resp(res, 200, { nome: String(l.nome || '').slice(0, 60), pedidos: Array.isArray(l.pedidos) ? l.pedidos.slice(0, 40) : [], exp: l.exp || null, restante: Math.max(0, max - usados), enviados: Array.isArray(l.enviados) ? l.enviados.slice(-80) : [] });
      }
      if (m === 'POST' && mEnvio[2]) {
        if (limEnvio.bloqueado('i:' + ip)) return erro(res, 429, 'Muitos envios seguidos. Aguarde alguns minutos.', 'bloqueado');
        if (usados >= max) return erro(res, 409, 'Este link já recebeu o número máximo de arquivos. Peça um novo à Casa Hiro.', 'link_cheio');
        const tipo = String(req.headers['x-type'] || '').split(';')[0].trim().toLowerCase();
        if (!TIPOS_LINK.has(tipo)) return erro(res, 415, 'Envie PDF ou foto (JPG, PNG ou WebP).');
        const limite = Math.min(MAX_ARQ, 15 * 1048576); const len = +req.headers['content-length'];
        if (len > limite) return erro(res, 413, `O arquivo passa de ${Math.floor(limite / 1048576)} MB.`);
        const buf = await lerCorpo(req, limite); if (!buf.length) return erro(res, 400, 'Arquivo vazio.');
        if (!conteudoOk(tipo, buf)) return erro(res, 415, 'Este arquivo não parece ser um PDF ou uma foto válida.');
        limEnvio.falha('i:' + ip);
        let nome = '', rotulo = ''; try { nome = decodeURIComponent(String(req.headers['x-name'] || '')).slice(0, 200); rotulo = decodeURIComponent(String(req.headers['x-rotulo'] || '')).slice(0, 80); } catch (e) {}
        nome = nome.replace(/[\u0000-\u001f\\/]/g, '_') || 'documento'; rotulo = rotulo.replace(/[\u0000-\u001f]/g, ' ').trim();
        const id = crypto.randomBytes(16).toString('hex');
        await fs.promises.writeFile(path.join(filesDir, id), buf);
        await db.blobPut({ id, name: nome, type: tipo, size: buf.length, uid: 'link:' + hash.slice(0, 8) });
        const docId = seg.novoId('d'); const agoraIso = new Date().toISOString();
        idxArq = null; await db.set('docs/' + docId, { uid: l.uid, nome, cat: 'Documentos pessoais', assetId: id, size: buf.length, type: tipo, em: agoraIso, pendente: true, origem: 'link', rotulo });
        const atual = (await db.get('links/' + hash)) || l;
        const env_ = Array.isArray(atual.enviados) ? atual.enviados.slice(-200) : [];
        if (rotulo) env_.push(rotulo);
        await db.set('links/' + hash, { ...atual, recebidos: (+atual.recebidos || 0) + 1, enviados: env_, ultimo: agoraIso });
        return resp(res, 200, { ok: true, restante: Math.max(0, max - (+atual.recebidos || 0) - 1) });
      }
      return erro(res, 405, 'Método não permitido.');
    }

    const S = await sessao(req);
    if (p === '/api/me' && m === 'GET') { return S ? resp(res, 200, { user: pub(S.user), ia: !!env.ANTHROPIC_API_KEY, maxUploadMb: MAX_ARQ / 1048576 }) : erro(res, 401, 'Entre com seu usuário e senha.', 'sem_sessao'); }
    const livreBackup = req.backupOk && p.startsWith('/api/backup');
    if (p.startsWith('/api/') || p.startsWith('/_blob/')) { if (!S && !livreBackup) return erro(res, 401, 'Entre com seu usuário e senha.', 'sem_sessao'); }
    const U = S ? S.user : { id: 'backup', admin: 1 };
    const adm = !!U.admin;

    /* ---- documentos ---- */
    if (p === '/api/doc') {
      const dp = url.searchParams.get('p'); if (!caminhoOk(dp)) return erro(res, 400, 'Caminho inválido.');
      const C = await perm.contexto(db, U);
      if (m === 'GET') { const d = await db.get(dp); if (!perm.podeLer(C, dp, d)) return erro(res, 403, 'Sem permissão.', 'negado'); return resp(res, 200, { exists: d !== null, data: perm.filtra(C, dp, d) }); }
      if (m === 'PUT') {
        if (!perm.podeGravar(C, dp)) return erro(res, 403, 'Sem permissão para gravar aqui.', 'negado');
        let d = await lerJson(req); if (!d || typeof d !== 'object' || Array.isArray(d)) return erro(res, 400, 'O documento precisa ser um objeto.');
        const antigo = await db.get(dp);
        if (dp.startsWith('hist/') && !adm) {
          // histórico: ninguém reescreve um registro nem registra mudança em algo que não pode alterar; autor é sempre quem está logado
          if (!perm.podeGravarHist(C, d, antigo)) return erro(res, 403, 'Sem permissão para este registro do histórico.', 'negado');
          d = { ...d, u: U.id, n: U.name };
        }
        if (!adm) { const fm = await tocaMesFechado(dp, d, antigo); if (fm) return erro(res, 403, `O ponto de ${fm.slice(5)}/${fm.slice(0, 4)} está fechado. Peça à direção para reabrir o mês antes de alterar.`, 'mes_fechado'); }
        d = perm.preserva(C, dp, d, antigo);
        const seq = await db.set(dp, d); if (/^(docs|nfarq)\//.test(dp)) idxArq = null;
        trilha(req, U, 'gravou', dp, antesTrilha(antigo)); return resp(res, 200, { seq });
      }
      if (m === 'DELETE') {
        if (!perm.podeGravar(C, dp, true)) return erro(res, 403, 'Sem permissão para excluir aqui.', 'negado');
        const antigo = await db.get(dp);
        if (!adm) { const fm = await tocaMesFechado(dp, null, antigo); if (fm) return erro(res, 403, `O ponto de ${fm.slice(5)}/${fm.slice(0, 4)} está fechado. Peça à direção para reabrir o mês antes de alterar.`, 'mes_fechado'); }
        const seq = await db.del(dp); if (/^(docs|nfarq)\//.test(dp)) idxArq = null;
        trilha(req, U, 'apagou', dp, antesTrilha(antigo)); return resp(res, 200, { seq });
      }
    }
    if (p === '/api/col' && m === 'GET') {
      const c = url.searchParams.get('c'); if (!caminhoOk(c)) return erro(res, 400, 'Coleção inválida.');
      const C = await perm.contexto(db, U);
      const seq = await db.seq(); const docs = (await db.list(c)).filter(d => perm.podeLer(C, c + '/' + d.id, d.data)).map(d => ({ id: d.id, data: perm.filtra(C, c + '/' + d.id, d.data) }));
      return resp(res, 200, { seq, docs });
    }
    if (p === '/api/changes' && m === 'GET') {
      const since = +url.searchParams.get('since') || 0, cols = (url.searchParams.get('cols') || '').split(',').filter(Boolean);
      const C = await perm.contexto(db, U);
      const items = (await db.changes(since, cols.length ? cols : null)).filter(i => perm.podeLer(C, i.path, i.data)).map(i => i.data ? { ...i, data: perm.filtra(C, i.path, i.data) } : i);
      const seq = await db.seq(); return resp(res, 200, { seq, items });
    }

    /* ---- arquivos ---- */
    const precisaPerfil = p === '/api/blob' || p.startsWith('/api/blob/') || p.startsWith('/_blob/') || p === '/api/ia';
    const CP = precisaPerfil ? await perm.contexto(db, U) : null;
    if (CP && !perm.temPerfil(CP)) return erro(res, 403, 'Seu acesso ainda não foi liberado pela direção.', 'negado');
    if (p === '/api/blob' && m === 'POST') {
      const tipo = String(req.headers['x-type'] || req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!TIPOS_ARQ.has(tipo)) return erro(res, 415, 'Formato de arquivo não aceito.');
      const len = +req.headers['content-length']; if (len > MAX_ARQ) return erro(res, 413, `O arquivo passa de ${MAX_ARQ / 1048576} MB.`);
      const buf = await lerCorpo(req, MAX_ARQ); if (!buf.length) return erro(res, 400, 'Arquivo vazio.');
      if (!conteudoOk(tipo, buf)) return erro(res, 415, 'O conteúdo do arquivo não corresponde ao formato informado.');
      const id = crypto.randomBytes(16).toString('hex');
      let nome = ''; try { nome = decodeURIComponent(String(req.headers['x-name'] || '')).slice(0, 250); } catch (e) {}
      await fs.promises.writeFile(path.join(filesDir, id), buf);
      await db.blobPut({ id, name: nome, type: tipo, size: buf.length, uid: U.id }); trilha(req, U, 'enviou arquivo', id, { tipo, bytes: buf.length });
      return resp(res, 200, { id, url: '/_blob/' + id, sizeBytes: buf.length, contentType: tipo });
    }
    if (p.startsWith('/_blob/') && m === 'GET') {
      const id = p.slice(7); if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return erro(res, 404, 'Arquivo não encontrado.');
      const meta = await db.blobGet(id); if (!meta) return erro(res, 404, 'Arquivo não encontrado.');
      // arquivo de um documento (ex.: RG do integrante): só abre quem pode ler aquele documento
      if (!adm) { const dono = await donoDoArquivo(id); if (dono && !perm.podeLer(CP, dono.path, dono.data)) return erro(res, 403, 'Sem permissão para abrir este arquivo.', 'negado'); }
      let st; try { st = await fs.promises.stat(path.join(filesDir, id)); } catch (e) { return erro(res, 404, 'Arquivo não encontrado.'); }
      const inline = INLINE.has(meta.type);
      res.writeHead(200, { 'content-type': meta.type, 'content-length': st.size, 'cache-control': 'private, no-store',
        'content-disposition': (inline ? 'inline' : 'attachment') + `; filename*=UTF-8''${encodeURIComponent(meta.name || id)}`, 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
      return fs.createReadStream(path.join(filesDir, id)).pipe(res);
    }
    if (p.startsWith('/api/blob/') && m === 'DELETE') {
      const id = p.slice(10); if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return erro(res, 404, 'Arquivo não encontrado.');
      const meta = await db.blobGet(id);
      // arquivo de um documento: só apaga quem pode alterar aquele documento; arquivo solto: quem enviou ou quem edita alguma tela
      const dono = adm ? null : await donoDoArquivo(id);
      if (dono ? !perm.podeGravar(CP, dono.path) : (meta && meta.uid !== U.id && !perm.podeEditarAlgo(CP))) return erro(res, 403, 'Sem permissão para excluir este arquivo.', 'negado');
      await db.blobDel(id); idxArq = null; trilha(req, U, 'apagou arquivo', id); try { await fs.promises.unlink(path.join(filesDir, id)); } catch (e) {}
      return resp(res, 200, { ok: true });
    }
    if (p === '/api/blobs' && m === 'GET') {
      const uso = await db.blobUso(); return resp(res, 200, { assets: [], usage: { bytes: uso.bytes, maxBytes: (+env.MAX_STORAGE_GB || 30) * 1073741824, files: uso.files } });
    }

    /* ---- usuários ---- */
    if (p === '/api/users/profiles' && m === 'GET') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 200); const out = {};
      for (const id of ids) { const u = await db.userPorId(id); if (u) out[id] = { name: u.name }; }
      return resp(res, 200, out);
    }
    if (p === '/api/me/senha' && m === 'POST') {
      const b = (await lerJson(req, 5000)) || {}; if (!seg.confereSenha(String(b.atual || ''), U.hash)) return erro(res, 400, 'A senha atual não confere.');
      const f = seg.senhaFraca(b.nova, U.username); if (f) return erro(res, 400, f);
      await db.userAtualiza(U.id, { hash: seg.hashSenha(b.nova) });
      // derruba as outras sessões (ex.: um aparelho esquecido logado) e mantém só esta, com token novo
      await db.sessApagaUser(U.id); const tk = seg.novoToken(); await db.sessCria(seg.hashToken(tk), U.id, Date.now());
      return resp(res, 200, { ok: true }, { 'set-cookie': cookieSessao(req, tk) });
    }
    if (p.startsWith('/api/users')) {
      if (!adm) return erro(res, 403, 'Só a administração gerencia contas.', 'negado');
      if (p === '/api/users' && m === 'GET') {
        const q = (url.searchParams.get('q') || '').toLowerCase(); let l = (await db.userLista()).map(u => ({ id: u.id, username: u.username, name: u.name, admin: !!u.admin, active: !!u.active, last_login: u.last_login || null }));
        if (q) l = l.filter(u => (u.name + ' ' + u.username).toLowerCase().includes(q)); return resp(res, 200, { users: l });
      }
      if (p === '/api/users' && m === 'POST') {
        const b = await lerJson(req, 5000); const un = String(b.username || '').toLowerCase().trim(); const nome = String(b.name || '').trim().slice(0, 120);
        if (!seg.usuarioOk(un)) return erro(res, 400, 'Usuário: 3 a 40 caracteres, só letras minúsculas, números, ponto, hífen ou _.');
        if (!nome) return erro(res, 400, 'Informe o nome da pessoa.');
        const f = seg.senhaFraca(b.password, un); if (f) return erro(res, 400, f);
        if (await db.userPorNome(un)) return erro(res, 409, 'Esse usuário já existe.');
        const id = seg.novoId('u'); await db.userCria({ id, username: un, name: nome, hash: seg.hashSenha(b.password), admin: !!b.admin }); trilha(req, U, 'criou conta', un, { admin: !!b.admin });
        return resp(res, 200, { user: pub(await db.userPorId(id)) });
      }
      const mm = p.match(/^\/api\/users\/([A-Za-z0-9_]+)$/);
      if (mm && m === 'PATCH') {
        const alvo = await db.userPorId(mm[1]); if (!alvo) return erro(res, 404, 'Conta não encontrada.');
        const b = await lerJson(req, 5000); const c = {};
        if (b.name !== undefined) { const n = String(b.name).trim().slice(0, 120); if (!n) return erro(res, 400, 'Nome vazio.'); c.name = n; }
        if (b.password !== undefined) { const f = seg.senhaFraca(b.password, alvo.username); if (f) return erro(res, 400, f); c.hash = seg.hashSenha(b.password); }
        if (b.active !== undefined) c.active = b.active ? 1 : 0;
        if (b.admin !== undefined) c.admin = b.admin ? 1 : 0;
        if ((c.active === 0 || c.admin === 0) && alvo.admin && alvo.active && (await db.adminsAtivos()) <= 1) return erro(res, 400, 'Precisa existir pelo menos um administrador ativo.');
        await db.userAtualiza(alvo.id, c); trilha(req, U, 'alterou conta', alvo.username, { campos: Object.keys(c).map(k => k === 'hash' ? 'senha' : k) }); if (c.hash || c.active === 0) await db.sessApagaUser(alvo.id);
        return resp(res, 200, { user: pub(await db.userPorId(alvo.id)) });
      }
    }

    /* ---- IA ---- */
    if (p === '/api/ia/limits' && m === 'GET') return resp(res, 200, { images: true, enabled: !!env.ANTHROPIC_API_KEY });
    if (p === '/api/ia' && m === 'POST') {
      if (!env.ANTHROPIC_API_KEY && !fetchIa) return erro(res, 503, 'A leitura por IA não está configurada no servidor.', 'ia_off');
      const agora = Date.now(), hoje = new Date().toISOString().slice(0, 10);
      if (iaDia.d !== hoje) iaDia = { d: hoje, n: 0 };
      const lst = (usoIa.get(U.id) || []).filter(t => agora - t < 60000);
      if (lst.length >= iaPorMin) return erro(res, 429, 'Muitas leituras seguidas. Aguarde um minuto.', 'rate_limited');
      if (iaDia.n >= iaPorDia) return erro(res, 429, 'Limite diário de leituras por IA atingido.', 'rate_limited');
      const ip_ = iaPessoa.get(U.id); const pd = ip_ && ip_.d === hoje ? ip_ : { d: hoje, n: 0 };
      if (pd.n >= iaPessoaDia) return erro(res, 429, 'Você atingiu o limite de leituras por IA de hoje. Amanhã libera de novo.', 'rate_limited');
      lst.push(agora); usoIa.set(U.id, lst); iaDia.n++; pd.n++; iaPessoa.set(U.id, pd);
      const b = await lerJson(req, 20 * 1048576);
      if (!b || typeof b.prompt !== 'string' || !b.prompt || b.prompt.length > 200000) return erro(res, 400, 'Pedido inválido.');
      const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 4).filter(i => i && /^image\/(jpeg|png|webp|gif)$/.test(i.type) && typeof i.data === 'string' && i.data.length < 14 * 1048576);
      try {
        const r = await ia.lerJson(env, { prompt: b.prompt, images: imgs, tier: ['quick', 'default', 'complex'].includes(b.tier) ? b.tier : 'default' }, { fetchImpl: fetchIa });
        return resp(res, 200, { json: r.json, modelo: r.modelo });
      } catch (e) { return erro(res, e.code === 'rate_limited' ? 429 : e.code === 'ia_off' ? 503 : 502, e.message, e.code || 'ia_erro'); }
    }

    /* ---- trilha do servidor (só administração, só leitura) ---- */
    if (p === '/api/trilha' && m === 'GET') {
      if (!S || !adm) return erro(res, 403, 'Só a administração.', 'negado');
      const mes = url.searchParams.get('mes') || new Date().toISOString().slice(0, 7); if (!/^\d{4}-\d{2}$/.test(mes)) return erro(res, 400, 'Mês inválido.');
      let txt = ''; try { txt = await fs.promises.readFile(path.join(dirTrilha, mes + '.jsonl'), 'utf8'); } catch (e) {}
      // mês completo (com as versões anteriores de cada dado) só como arquivo; a tela recebe a lista leve
      if (url.searchParams.get('completo') === '1') { const b = Buffer.from(txt); res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'content-length': b.length, 'cache-control': 'no-store', 'content-disposition': `attachment; filename="trilha-${mes}.jsonl"` }); return res.end(b); }
      const itens = txt.split('\n').filter(Boolean).map(l => { try { const x = JSON.parse(l); const tem = x.antes != null || !!x.antesHash; delete x.antes; delete x.antesHash; delete x.antesBytes; if (tem) x.temAntes = true; return x; } catch (e) { return null; } }).filter(Boolean).reverse().slice(0, 5000);
      return resp(res, 200, { mes, itens });
    }

    /* ---- backup completo ---- */
    if (p === '/api/backup' && m === 'GET') {
      if (!adm && !req.backupOk) return erro(res, 403, 'Só a administração.', 'negado');
      const todos = await db.todos(); const colecoes = {};
      todos.forEach(d => { (colecoes[d.col] = colecoes[d.col] || {})[d.id] = d.data; });
      const b = Buffer.from(JSON.stringify({ sistema: 'Casa Hiro', versao: 3, origem: 'servidor', gerado: new Date().toISOString(), colecoes, arquivos: (await db.blobLista()).map(a => ({ id: a.id, name: a.name, type: a.type, size: a.size })) }));
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': b.length, 'content-disposition': `attachment; filename="casa-hiro-servidor-${new Date().toISOString().slice(0, 10)}.json"` }); return res.end(b);
    }
    if (p === '/api/backup/arquivo' && m === 'GET') {
      if (!adm && !req.backupOk) return erro(res, 403, 'Só a administração.', 'negado');
      const id = url.searchParams.get('id') || ''; if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return erro(res, 404, 'Arquivo não encontrado.');
      try { const st = await fs.promises.stat(path.join(filesDir, id)); res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': st.size }); return fs.createReadStream(path.join(filesDir, id)).pipe(res); }
      catch (e) { return erro(res, 404, 'Arquivo não encontrado.'); }
    }

    if (p.startsWith('/api/')) return erro(res, 404, 'Não encontrado.');

    /* ---- site (arquivos estáticos) ---- */
    if (m !== 'GET' && m !== 'HEAD') return erro(res, 405, 'Método não permitido.');
    let rel = p === '/' ? '/index.html' : p; rel = path.normalize(decodeURIComponent(rel)).replace(/^([/\\])+/, '');
    const f = path.join(publico, rel); if (!f.startsWith(publico + path.sep)) return erro(res, 403, 'Negado.');
    try {
      const st = await fs.promises.stat(f); if (!st.isFile()) throw 0;
      const ext = path.extname(f).toLowerCase();
      const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      /* arquivos com ?v= mudam de endereço quando mudam de conteúdo: o navegador guarda por 1 ano.
         A página (html) é sempre conferida, mas só é baixada de novo se mudou (etag). */
      const etag = 'W/"' + st.size.toString(36) + '-' + Math.floor(st.mtimeMs).toString(36) + '"';
      const cache = ext === '.html' ? 'no-cache' : (rel.startsWith('vendor') || url.searchParams.has('v')) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, { etag, 'cache-control': cache }); return res.end(); }
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'content-length': st.size, 'cache-control': cache, etag, 'content-security-policy': csp });
      return m === 'HEAD' ? res.end() : fs.createReadStream(f).pipe(res);
    } catch (e) { return erro(res, 404, 'Página não encontrada.'); }
  }

  const server = http.createServer((req, res) => {
    rota(req, res).catch(e => {
      if (e && e.http) return erro(res, e.http, e.message);
      console.error('[casa-hiro] erro:', e && e.stack || e);
      if (!res.headersSent) erro(res, 500, 'Erro interno no servidor.'); else res.end();
    });
  });
  server.requestTimeout = 300000;
  server.headersTimeout = 30000; // conexões que enrolam para mandar o cabeçalho (slowloris) caem logo
  server.maxHeadersCount = 100;

  /* limpeza e backup local diário */
  const timers = [];
  const manutencao = async () => {
    try {
      await db.sessLimpa(Date.now() - SESSAO_OCIOSA, Date.now() - SESSAO_MAX);
      const s = await db.seq(); await db.limpaTumulos(Math.max(0, s - 100000));
      const dirB = path.join(dataDir, 'backups'); fs.mkdirSync(dirB, { recursive: true });
      const hoje = new Date().toISOString().slice(0, 10); const alvo = path.join(dirB, `casahiro-${hoje}.sqlite`);
      if (db.motor === 'sqlite' && !fs.existsSync(alvo)) await db.copiaPara(alvo);
      const manter = +env.BACKUP_DIAS || 14;
      fs.readdirSync(dirB).filter(n => /^casahiro-\d{4}-\d{2}-\d{2}\.sqlite$/.test(n)).sort().slice(0, -manter).forEach(n => fs.unlinkSync(path.join(dirB, n)));
    } catch (e) { console.error('[casa-hiro] manutenção:', e.message); }
  };
  if (!opts.semManutencao) { timers.push(setInterval(manutencao, 6 * 3600 * 1000)); setTimeout(manutencao, 15000).unref(); timers.forEach(t => t.unref()); }
  return { server, db, env, manutencao, fecha: async () => { timers.forEach(clearInterval); await new Promise(r => server.close(r)); await db.fecha(); } };
}

/* Inicia sozinho, a não ser quando importado pelos testes. A Hostinger (lsnode/Passenger) carrega este arquivo com
   require() a partir do próprio carregador, então "require.main === module" é falso lá e não pode ser a condição. */
const porTeste = !!(require.main && require.main !== module && /[\\/]test[\\/]/.test(require.main.filename || ''));
if (!porTeste && !process.env.CASA_HIRO_NAO_INICIAR) {
  criaApp().then(({ server }) => {
    const pe = process.env.PORT; const porta = pe && isNaN(+pe) ? pe : (+pe || 3000); // alguns painéis passam um socket em vez de número
    server.listen(porta, () => console.log('[casa-hiro] no ar na porta', porta));
  }).catch(e => {
    console.error('[casa-hiro] não iniciou:', e.message);
    // o log do painel nem sempre aparece: deixa o motivo num arquivo visível no Gerenciador de Arquivos
    try { fs.appendFileSync(path.join(__dirname, 'casa-hiro-erro.log'), `${new Date().toISOString()} não iniciou: ${e.stack || e.message}\n`); } catch (e2) {}
    process.exit(1);
  });
}
module.exports = { criaApp };
