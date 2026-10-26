/* Casa Hiro - adaptador para a hospedagem própria (Hostinger).
   Preenche RT.db / RT.assets / RT.dl / RT.user / RT.sample falando com o servidor (server.js),
   no lugar das capacidades do claude.ai. O sistema em si não muda. */
(function () {
  "use strict";
  const H = window.HOST = { ativo: true, me: null, iaOn: false };
  const hdr = { "X-Hiro": "1" };

  async function api(url, o) {
    o = o || {};
    const r = await fetch(url, { method: o.method || "GET", credentials: "same-origin", headers: Object.assign({}, hdr, o.json !== undefined ? { "Content-Type": "application/json" } : {}, o.headers || {}), body: o.json !== undefined ? JSON.stringify(o.json) : o.body });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (r.status === 401 && !o.semLogin) { await H.login("Sua sessão expirou. Entre de novo."); return api(url, o); }
    if (!r.ok) { const e = new Error((j && j.erro) || ("Erro " + r.status)); e.code = (j && j.codigo) || ("http_" + r.status); e.status = r.status; throw e; }
    return j;
  }
  H.api = api;

  /* ---------- tela de login ---------- */
  let loginP = null;
  H.login = function (aviso) {
    if (loginP) return loginP;
    loginP = new Promise(function (ok) {
      const ov = document.createElement("div"); ov.id = "hostlogin";
      ov.style.cssText = "position:fixed;inset:0;z-index:10000;background:var(--bg,#F5EFE0);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto";
      const logo = (document.querySelector("aside .logo") || {}).src || "";
      ov.innerHTML = '<div class="gate-card" style="max-width:380px"><img alt="Casa Hiro" style="' + (logo ? "" : "display:none") + '" src="' + logo + '"><h1>Casa Hiro</h1><p class="sub" id="hl-av">' + (aviso || "Entre com o seu usuário e senha.") + '</p>' +
        '<form id="hl-f" style="text-align:left"><label>Usuário</label><input id="hl-u" autocomplete="username" autocapitalize="none" spellcheck="false" required><label style="margin-top:10px;display:block">Senha</label><input id="hl-p" type="password" autocomplete="current-password" required>' +
        '<div id="hl-e" class="sub" style="color:var(--urgente,#C0392B);min-height:18px;margin-top:8px"></div><button class="b" id="hl-b" style="width:100%;margin-top:6px" type="submit">Entrar</button></form>' +
        '<p class="sub" style="margin:16px 0 0;font-size:11.5px">Acesso restrito à equipe. Esqueceu a senha? Peça para a direção redefinir.</p></div>';
      document.body.appendChild(ov);
      const f = ov.querySelector("#hl-f"), e = ov.querySelector("#hl-e");
      ov.querySelector("#hl-u").focus();
      f.onsubmit = async function (ev) {
        ev.preventDefault(); e.textContent = ""; const b = ov.querySelector("#hl-b"); b.disabled = true;
        try {
          const j = await api("/api/login", { method: "POST", json: { username: ov.querySelector("#hl-u").value.trim(), password: ov.querySelector("#hl-p").value }, semLogin: true });
          H.me = j.user; ov.remove(); loginP = null; ok(j.user);
        } catch (er) { e.textContent = er.message; b.disabled = false; ov.querySelector("#hl-p").value = ""; ov.querySelector("#hl-p").focus(); }
      };
    });
    return loginP;
  };
  H.sair = async function () { try { await api("/api/logout", { method: "POST", json: {}, semLogin: true }); } catch (e) {} location.reload(); };

  /* ---------- banco: coleções com atualização ao vivo (consulta a cada poucos segundos) ---------- */
  function criaDb() {
    const caches = {}, cbs = {}, pend = new Set(); let ultimo = null, timer = null, rodando = false;
    const agenda = function () { if (!timer) timer = setInterval(poll, 3500); };
    function avisa(col) { (cbs[col] || []).forEach(function (f) { f.cb(montaSnap(col)); }); }
    function montaSnap(col) { const c = caches[col] || new Map(); return { docs: Array.from(c, function (kv) { return { id: kv[0], data: function () { return kv[1]; } }; }) }; }
    async function carrega(col) {
      const j = await api("/api/col?c=" + encodeURIComponent(col));
      const m = new Map(); j.docs.forEach(function (d) { m.set(d.id, d.data); });
      caches[col] = m; ultimo = ultimo === null ? j.seq : Math.min(ultimo, j.seq); return j.seq;
    }
    async function poll() {
      if (rodando || document.hidden) return; rodando = true;
      try {
        const cols = Object.keys(cbs); if (!cols.length) return;
        const j = await api("/api/changes?since=" + (ultimo || 0) + "&cols=" + encodeURIComponent(cols.join(",")));
        const mudou = new Set();
        j.items.forEach(function (it) {
          if (pend.has(it.path)) return; const c = caches[it.col]; if (!c) return;
          if (it.data === null) { if (c.delete(it.id)) mudou.add(it.col); } else { const antes = JSON.stringify(c.get(it.id)), novo = JSON.stringify(it.data); if (antes !== novo) { c.set(it.id, it.data); mudou.add(it.col); } }
        });
        ultimo = j.items.length >= 5000 ? j.items[j.items.length - 1].seq : j.seq;
        mudou.forEach(avisa);
      } catch (e) { /* tenta de novo no próximo ciclo */ } finally { rodando = false; }
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
    function docRef(path) {
      const i = path.lastIndexOf("/"), col = path.slice(0, i), id = path.slice(i + 1);
      return {
        get: async function () { const j = await api("/api/doc?p=" + encodeURIComponent(path)); return { exists: !!j.exists, data: function () { return j.data; } }; },
        set: async function (obj) {
          pend.add(path); const c = caches[col]; if (c) { c.set(id, JSON.parse(JSON.stringify(obj))); }
          try { await api("/api/doc?p=" + encodeURIComponent(path), { method: "PUT", json: obj }); }
          catch (e) { if (c) { try { await carrega(col); avisa(col); } catch (_) {} } throw e; }
          finally { pend.delete(path); }
        },
        delete: async function () {
          pend.add(path); const c = caches[col]; if (c) c.delete(id);
          try { await api("/api/doc?p=" + encodeURIComponent(path), { method: "DELETE" }); }
          catch (e) { if (c) { try { await carrega(col); avisa(col); } catch (_) {} } throw e; }
          finally { pend.delete(path); }
        },
      };
    }
    return {
      doc: docRef,
      collection: function (col) {
        return {
          doc: function (id) { return docRef(col + "/" + id); },
          onSnapshot: function (cb, err) {
            (cbs[col] = cbs[col] || []).push({ cb: cb, err: err });
            carrega(col).then(function () { avisa(col); agenda(); }).catch(function (e) { if (err) err(e); });
            return function () { cbs[col] = (cbs[col] || []).filter(function (x) { return x.cb !== cb; }); };
          },
        };
      },
    };
  }

  /* ---------- arquivos ---------- */
  function criaAssets() {
    return {
      upload: async function (file, o) {
        const tipo = (o && o.type) || file.type || "application/octet-stream";
        return api("/api/blob", { method: "POST", body: file, headers: { "X-Type": tipo, "X-Name": encodeURIComponent(file.name || "arquivo"), "Content-Type": "application/octet-stream" } });
      },
      list: function () { return api("/api/blobs"); },
      delete: function (id) { return api("/api/blob/" + encodeURIComponent(id), { method: "DELETE" }); },
    };
  }
  /* ---------- download ---------- */
  function criaDl() {
    return {
      save: async function (o) {
        const blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename || "arquivo";
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      },
    };
  }
  /* ---------- pessoas ---------- */
  function criaUser() {
    return {
      me: async function () { const u = H.me; return { id: u.id, name: u.name, isOwner: !!u.admin, canEdit: !!u.admin }; },
      profiles: async function (ids) { if (!ids || !ids.length) return {}; return api("/api/users/profiles?ids=" + encodeURIComponent(ids.join(","))); },
      search: async function (q) { if (!H.me.admin) return []; const j = await api("/api/users?q=" + encodeURIComponent(q)); return j.users.map(function (u) { return { id: u.id, name: u.name }; }); },
    };
  }
  /* ---------- leitura por IA (servidor) ---------- */
  function b64(blob) { return new Promise(function (ok, no) { const r = new FileReader(); r.onload = function () { ok(String(r.result).split(",")[1]); }; r.onerror = no; r.readAsDataURL(blob); }); }
  function criaSample() {
    return {
      limits: async function () { return { images: true }; },
      json: async function (prompt, o) {
        o = o || {}; const imgs = [];
        for (const im of (o.images || [])) imgs.push({ type: im.type || "image/jpeg", data: await b64(im) });
        try {
          const j = await api("/api/ia", { method: "POST", json: { prompt: String(prompt), images: imgs, tier: o.modelTier || "default" } });
          return j.json;
        } catch (e) { throw { code: e.code === "ia_off" ? "not_granted" : e.code, message: e.message }; }
      },
    };
  }

  H.init = async function (RT) {
    let me = null;
    try { me = await api("/api/me", { semLogin: true }); } catch (e) { me = null; }
    if (me && me.user) { H.me = me.user; H.iaOn = !!me.ia; } else { await H.login(); try { const m2 = await api("/api/me"); H.iaOn = !!m2.ia; } catch (e) {} }
    RT.db = criaDb(); RT.assets = criaAssets(); RT.dl = criaDl(); RT.user = criaUser();
    RT.sample = criaSample(); RT.envio = true;
  };
})();
