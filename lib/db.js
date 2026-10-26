'use strict';
/* Camada de dados da Casa Hiro.
   Guarda "documentos" JSON (igual ao banco do claude.ai) + usuários, sessões e metadados de arquivos.
   Dois motores com a mesma interface:
     - sqlite (padrão): arquivo no disco, sem instalar nada (node:sqlite, Node 22.5+)
     - mysql: usa o MySQL da Hostinger (precisa de "npm install", pacote mysql2) */
const fs = require('fs');
const path = require('path');

const colDe = p => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); };
const idDe = p => p.slice(p.lastIndexOf('/') + 1);

/* ---------------- SQLite ---------------- */
async function abreSqlite(cfg) {
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); }
  catch (e) { throw new Error('Este Node.js (' + process.version + ') não tem SQLite embutido. No painel, escolha Node.js 22 ou 24 — ou use DB_DRIVER=mysql.'); }
  fs.mkdirSync(path.dirname(cfg.arquivo), { recursive: true });
  const db = new DatabaseSync(cfg.arquivo);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS docs(path TEXT PRIMARY KEY, col TEXT NOT NULL, id TEXT NOT NULL, json TEXT, seq INTEGER NOT NULL, del INTEGER NOT NULL DEFAULT 0);
  CREATE INDEX IF NOT EXISTS docs_col ON docs(col, del);
  CREATE INDEX IF NOT EXISTS docs_seq ON docs(seq);
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, hash TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created TEXT, last_login TEXT);
  CREATE TABLE IF NOT EXISTS sessions(th TEXT PRIMARY KEY, uid TEXT NOT NULL, created INTEGER NOT NULL, last INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS blobs(id TEXT PRIMARY KEY, name TEXT, type TEXT, size INTEGER, uid TEXT, created TEXT);
  INSERT OR IGNORE INTO meta(k,v) VALUES('seq','0');`);
  const q = (sql) => db.prepare(sql);
  const st = {
    nextSeq: null,
  };
  const prox = () => {
    db.prepare("UPDATE meta SET v=CAST(v AS INTEGER)+1 WHERE k='seq'").run();
    return Number(db.prepare("SELECT v FROM meta WHERE k='seq'").get().v);
  };
  return {
    motor: 'sqlite',
    async seq() { return Number(db.prepare("SELECT v FROM meta WHERE k='seq'").get().v); },
    async get(p) { const r = db.prepare('SELECT json FROM docs WHERE path=? AND del=0').get(p); return r ? JSON.parse(r.json) : null; },
    async set(p, obj) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const s = prox();
        db.prepare('INSERT INTO docs(path,col,id,json,seq,del) VALUES(?,?,?,?,?,0) ON CONFLICT(path) DO UPDATE SET json=excluded.json, seq=excluded.seq, del=0')
          .run(p, colDe(p), idDe(p), JSON.stringify(obj), s);
        db.exec('COMMIT'); return s;
      } catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
    },
    async del(p) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const s = prox();
        db.prepare("UPDATE docs SET json=NULL, del=1, seq=? WHERE path=?").run(s, p);
        db.exec('COMMIT'); return s;
      } catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
    },
    async list(col) { return db.prepare('SELECT id, json FROM docs WHERE col=? AND del=0').all(col).map(r => ({ id: r.id, data: JSON.parse(r.json) })); },
    async changes(since, cols) {
      const rows = db.prepare('SELECT path,col,id,json,del,seq FROM docs WHERE seq>? ORDER BY seq LIMIT 5000').all(since);
      return rows.filter(r => !cols || cols.includes(r.col)).map(r => ({ path: r.path, col: r.col, id: r.id, seq: r.seq, data: r.del ? null : JSON.parse(r.json) }));
    },
    async todos() { return db.prepare('SELECT path,col,id,json FROM docs WHERE del=0 ORDER BY path').all().map(r => ({ path: r.path, col: r.col, id: r.id, data: JSON.parse(r.json) })); },
    async limpaTumulos(antesSeq) { db.prepare('DELETE FROM docs WHERE del=1 AND seq<?').run(antesSeq); },
    // usuários
    async userPorNome(u) { return db.prepare('SELECT * FROM users WHERE username=?').get(u) || null; },
    async userPorId(id) { return db.prepare('SELECT * FROM users WHERE id=?').get(id) || null; },
    async userLista() { return db.prepare('SELECT id,username,name,admin,active,created,last_login FROM users ORDER BY name').all(); },
    async userCria(u) { db.prepare('INSERT INTO users(id,username,name,hash,admin,active,created) VALUES(?,?,?,?,?,1,?)').run(u.id, u.username, u.name, u.hash, u.admin ? 1 : 0, new Date().toISOString()); },
    async userAtualiza(id, campos) {
      const ks = Object.keys(campos); if (!ks.length) return;
      db.prepare(`UPDATE users SET ${ks.map(k => k + '=?').join(',')} WHERE id=?`).run(...ks.map(k => campos[k]), id);
    },
    async userConta() { return Number(db.prepare('SELECT COUNT(*) n FROM users').get().n); },
    async adminsAtivos() { return Number(db.prepare('SELECT COUNT(*) n FROM users WHERE admin=1 AND active=1').get().n); },
    // sessões
    async sessCria(th, uid, agora) { db.prepare('INSERT INTO sessions(th,uid,created,last) VALUES(?,?,?,?)').run(th, uid, agora, agora); },
    async sessGet(th) { return db.prepare('SELECT * FROM sessions WHERE th=?').get(th) || null; },
    async sessToca(th, agora) { db.prepare('UPDATE sessions SET last=? WHERE th=?').run(agora, th); },
    async sessApaga(th) { db.prepare('DELETE FROM sessions WHERE th=?').run(th); },
    async sessApagaUser(uid) { db.prepare('DELETE FROM sessions WHERE uid=?').run(uid); },
    async sessLimpa(minLast, minCreated) { db.prepare('DELETE FROM sessions WHERE last<? OR created<?').run(minLast, minCreated); },
    // arquivos (metadados)
    async blobPut(b) { db.prepare('INSERT OR REPLACE INTO blobs(id,name,type,size,uid,created) VALUES(?,?,?,?,?,?)').run(b.id, b.name, b.type, b.size, b.uid, new Date().toISOString()); },
    async blobGet(id) { return db.prepare('SELECT * FROM blobs WHERE id=?').get(id) || null; },
    async blobDel(id) { db.prepare('DELETE FROM blobs WHERE id=?').run(id); },
    async blobLista() { return db.prepare('SELECT * FROM blobs ORDER BY created').all(); },
    async blobUso() { const r = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(size),0) b FROM blobs').get(); return { files: Number(r.n), bytes: Number(r.b) }; },
    async copiaPara(destino) { db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`); },
    async fecha() { db.close(); },
  };
}

/* ---------------- MySQL ---------------- */
async function abreMysql(cfg) {
  let mysql;
  try { mysql = require('mysql2/promise'); }
  catch (e) { throw new Error('DB_DRIVER=mysql precisa do pacote mysql2. Rode "npm install" (o painel da Hostinger faz isso sozinho) ou use DB_DRIVER=sqlite.'); }
  const pool = mysql.createPool({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.senha, database: cfg.banco,
    waitForConnections: true, connectionLimit: 8, charset: 'utf8mb4', dateStrings: true });
  const x = async (sql, p) => (await pool.query(sql, p))[0];
  const ddl = [
    'CREATE TABLE IF NOT EXISTS meta(k VARCHAR(40) PRIMARY KEY, v VARCHAR(255)) CHARACTER SET utf8mb4',
    'CREATE TABLE IF NOT EXISTS docs(path VARCHAR(255) PRIMARY KEY, col VARCHAR(200) NOT NULL, id VARCHAR(120) NOT NULL, json LONGTEXT, seq BIGINT NOT NULL, del TINYINT NOT NULL DEFAULT 0, KEY docs_col(col, del), KEY docs_seq(seq)) CHARACTER SET utf8mb4',
    'CREATE TABLE IF NOT EXISTS users(id VARCHAR(40) PRIMARY KEY, username VARCHAR(60) UNIQUE NOT NULL, name VARCHAR(120) NOT NULL, hash VARCHAR(300) NOT NULL, admin TINYINT NOT NULL DEFAULT 0, active TINYINT NOT NULL DEFAULT 1, created VARCHAR(40), last_login VARCHAR(40)) CHARACTER SET utf8mb4',
    'CREATE TABLE IF NOT EXISTS sessions(th VARCHAR(80) PRIMARY KEY, uid VARCHAR(40) NOT NULL, created BIGINT NOT NULL, last BIGINT NOT NULL, KEY s_uid(uid)) CHARACTER SET utf8mb4',
    'CREATE TABLE IF NOT EXISTS blobs(id VARCHAR(80) PRIMARY KEY, name VARCHAR(300), type VARCHAR(100), size BIGINT, uid VARCHAR(40), created VARCHAR(40)) CHARACTER SET utf8mb4',
  ];
  for (const s of ddl) await x(s);
  await x("INSERT IGNORE INTO meta(k,v) VALUES('seq','0')");
  const prox = async () => { await x("UPDATE meta SET v=LAST_INSERT_ID(CAST(v AS UNSIGNED)+1) WHERE k='seq'"); return Number((await x('SELECT LAST_INSERT_ID() s'))[0].s); };
  // LAST_INSERT_ID é por conexão: pega uma conexão só para as duas instruções
  const proxConn = async (c) => { await c.query("UPDATE meta SET v=LAST_INSERT_ID(CAST(v AS UNSIGNED)+1) WHERE k='seq'"); return Number((await c.query('SELECT LAST_INSERT_ID() s'))[0][0].s); };
  const comSeq = async (fn) => { const c = await pool.getConnection(); try { const s = await proxConn(c); await fn(c, s); return s; } finally { c.release(); } };
  return {
    motor: 'mysql',
    async seq() { return Number((await x("SELECT v FROM meta WHERE k='seq'"))[0].v); },
    async get(p) { const r = await x('SELECT json FROM docs WHERE path=? AND del=0', [p]); return r[0] ? JSON.parse(r[0].json) : null; },
    async set(p, obj) {
      return comSeq((c, s) => c.query('INSERT INTO docs(path,col,id,json,seq,del) VALUES(?,?,?,?,?,0) ON DUPLICATE KEY UPDATE json=VALUES(json), seq=VALUES(seq), del=0', [p, colDe(p), idDe(p), JSON.stringify(obj), s]));
    },
    async del(p) { return comSeq((c, s) => c.query('UPDATE docs SET json=NULL, del=1, seq=? WHERE path=?', [s, p])); },
    async list(col) { return (await x('SELECT id, json FROM docs WHERE col=? AND del=0', [col])).map(r => ({ id: r.id, data: JSON.parse(r.json) })); },
    async changes(since, cols) {
      const rows = await x('SELECT path,col,id,json,del,seq FROM docs WHERE seq>? ORDER BY seq LIMIT 5000', [since]);
      return rows.filter(r => !cols || cols.includes(r.col)).map(r => ({ path: r.path, col: r.col, id: r.id, seq: Number(r.seq), data: r.del ? null : JSON.parse(r.json) }));
    },
    async todos() { return (await x('SELECT path,col,id,json FROM docs WHERE del=0 ORDER BY path')).map(r => ({ path: r.path, col: r.col, id: r.id, data: JSON.parse(r.json) })); },
    async limpaTumulos(antesSeq) { await x('DELETE FROM docs WHERE del=1 AND seq<?', [antesSeq]); },
    async userPorNome(u) { return (await x('SELECT * FROM users WHERE username=?', [u]))[0] || null; },
    async userPorId(id) { return (await x('SELECT * FROM users WHERE id=?', [id]))[0] || null; },
    async userLista() { return x('SELECT id,username,name,admin,active,created,last_login FROM users ORDER BY name'); },
    async userCria(u) { await x('INSERT INTO users(id,username,name,hash,admin,active,created) VALUES(?,?,?,?,?,1,?)', [u.id, u.username, u.name, u.hash, u.admin ? 1 : 0, new Date().toISOString()]); },
    async userAtualiza(id, campos) {
      const ks = Object.keys(campos); if (!ks.length) return;
      await x(`UPDATE users SET ${ks.map(k => '`' + k + '`=?').join(',')} WHERE id=?`, [...ks.map(k => campos[k]), id]);
    },
    async userConta() { return Number((await x('SELECT COUNT(*) n FROM users'))[0].n); },
    async adminsAtivos() { return Number((await x('SELECT COUNT(*) n FROM users WHERE admin=1 AND active=1'))[0].n); },
    async sessCria(th, uid, agora) { await x('INSERT INTO sessions(th,uid,created,last) VALUES(?,?,?,?)', [th, uid, agora, agora]); },
    async sessGet(th) { const r = (await x('SELECT * FROM sessions WHERE th=?', [th]))[0]; return r ? { ...r, created: Number(r.created), last: Number(r.last) } : null; },
    async sessToca(th, agora) { await x('UPDATE sessions SET last=? WHERE th=?', [agora, th]); },
    async sessApaga(th) { await x('DELETE FROM sessions WHERE th=?', [th]); },
    async sessApagaUser(uid) { await x('DELETE FROM sessions WHERE uid=?', [uid]); },
    async sessLimpa(a, b) { await x('DELETE FROM sessions WHERE last<? OR created<?', [a, b]); },
    async blobPut(b) { await x('REPLACE INTO blobs(id,name,type,size,uid,created) VALUES(?,?,?,?,?,?)', [b.id, b.name, b.type, b.size, b.uid, new Date().toISOString()]); },
    async blobGet(id) { return (await x('SELECT * FROM blobs WHERE id=?', [id]))[0] || null; },
    async blobDel(id) { await x('DELETE FROM blobs WHERE id=?', [id]); },
    async blobLista() { return x('SELECT * FROM blobs ORDER BY created'); },
    async blobUso() { const r = (await x('SELECT COUNT(*) n, COALESCE(SUM(size),0) b FROM blobs'))[0]; return { files: Number(r.n), bytes: Number(r.b) }; },
    async copiaPara() { throw new Error('No MySQL o backup do banco é feito pelo painel da Hostinger ou por /api/backup.'); },
    async fecha() { await pool.end(); },
  };
}

async function abre(env) {
  const motor = (env.DB_DRIVER || 'sqlite').toLowerCase();
  if (motor === 'mysql') return abreMysql({ host: env.MYSQL_HOST || 'localhost', port: +(env.MYSQL_PORT || 3306), user: env.MYSQL_USER, senha: env.MYSQL_PASSWORD, banco: env.MYSQL_DATABASE });
  return abreSqlite({ arquivo: env.SQLITE_FILE || path.join(env.DATA_DIR || path.join(__dirname, '..', 'data'), 'casahiro.sqlite') });
}
module.exports = { abre, colDe, idDe };
