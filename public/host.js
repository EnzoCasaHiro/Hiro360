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
    if (r.status === 403 && j && j.codigo === "mfa_config" && !o.semLogin) { await (H._liga || (H._liga = H.liga2fa(true).finally(function () { H._liga = null; }))); return api(url, o); }
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
          if (j.mfa) return pedeCodigo(j.desafio);
          H.me = j.user; ov.remove(); loginP = null; ok(j.user);
        } catch (er) { e.textContent = er.message; b.disabled = false; ov.querySelector("#hl-p").value = ""; ov.querySelector("#hl-p").focus(); }
      };
      // segunda etapa: código de 6 números do aplicativo (ou um código de emergência)
      function pedeCodigo(desafio) {
        const card = ov.querySelector(".gate-card");
        card.querySelector("#hl-av").textContent = "Abra o aplicativo autenticador no celular e digite o código de 6 números do Hiro360.";
        f.innerHTML = '<label>Código</label><input id="hl-c" inputmode="numeric" autocomplete="one-time-code" maxlength="12" required style="font-size:22px;letter-spacing:4px;text-align:center">' +
          '<label style="display:flex;gap:8px;align-items:center;font-weight:400;margin-top:10px"><input type="checkbox" id="hl-l" checked> Lembrar este aparelho por 30 dias</label>' +
          '<div id="hl-e" class="sub" style="color:var(--urgente,#C0392B);min-height:18px;margin-top:8px"></div><button class="b" id="hl-b" style="width:100%;margin-top:6px" type="submit">Confirmar</button>' +
          '<p class="sub" style="margin:12px 0 0;font-size:11.5px">Perdeu o celular? Digite um dos <b>códigos de emergência</b> no lugar do código. Sem eles, peça à direção para refazer a sua verificação.</p>';
        const c = f.querySelector("#hl-c"), e2 = f.querySelector("#hl-e"); c.focus();
        f.onsubmit = async function (ev) {
          ev.preventDefault(); e2.textContent = ""; const b = f.querySelector("#hl-b"); b.disabled = true;
          try {
            const j = await api("/api/login/2fa", { method: "POST", json: { desafio: desafio, codigo: c.value, lembrar: f.querySelector("#hl-l").checked }, semLogin: true });
            H.me = j.user; ov.remove(); loginP = null; ok(j.user);
          } catch (er) {
            if (er.code === "mfa_expirou") { ov.remove(); loginP = null; H.login(er.message).then(ok); return; }
            e2.textContent = er.message; b.disabled = false; c.value = ""; c.focus();
          }
        };
      }
    });
    return loginP;
  };

  /* ---------- verificação em duas etapas: configurar ---------- */
  let qrP = null;
  const carregaQr = function () {
    return qrP || (qrP = new Promise(function (ok, no) { const s = document.createElement("script"); s.src = "/vendor/qrcode-generator-1.4.4/qrcode.js"; s.onload = function () { ok(window.qrcode); }; s.onerror = function () { qrP = null; no(new Error("não carregou")); }; document.head.appendChild(s); }));
  };
  const escH = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function janela(html, travada) {
    const ov = document.createElement("div"); ov.className = "hostmfa";
    ov.style.cssText = "position:fixed;inset:0;z-index:10001;background:" + (travada ? "var(--bg,#F5EFE0)" : "rgba(0,0,0,.45)") + ";display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
    ov.innerHTML = '<div class="gate-card" style="max-width:440px;text-align:left">' + html + '</div>'; document.body.appendChild(ov); return ov;
  }
  // mostra os códigos de emergência uma única vez, com botão para baixar
  function mostraCodigos(codigos, fim) {
    const ov = janela('<h1 style="font-size:20px">Códigos de emergência</h1><p class="sub">Use um destes códigos se perder o celular. Cada um vale <b>uma vez</b>. Guarde num lugar seguro (impresso ou no seu e-mail pessoal). Eles <b>não aparecem de novo</b>.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font:16px/1.6 ui-monospace,Consolas,monospace;background:#fff;border:1px solid var(--line,#ddd);border-radius:8px;padding:10px;margin:10px 0">' + codigos.map(function (c) { return "<div>" + escH(c) + "</div>"; }).join("") + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="b sec" id="mf-bx" type="button">Baixar os códigos</button><span style="flex:1"></span><button class="b" id="mf-ok" type="button">Já guardei</button></div>', true);
    ov.querySelector("#mf-bx").onclick = function () {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["Hiro360 - códigos de emergência de " + ((H.me && H.me.username) || "") + "\r\nCada código vale uma vez.\r\n\r\n" + codigos.join("\r\n") + "\r\n"], { type: "text/plain" }));
      a.download = "hiro360-codigos-de-emergencia.txt"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    };
    ov.querySelector("#mf-ok").onclick = function () { ov.remove(); if (fim) fim(); };
  }
  // passo a passo para ligar; "obrigatorio" = a pessoa não consegue usar o sistema antes de terminar
  H.liga2fa = function (obrigatorio) {
    return new Promise(function (fim) {
      const ov = janela('<h1 style="font-size:20px">Verificação em duas etapas</h1>' +
        (obrigatorio ? '<p class="sub">Para proteger os dados da Casa Hiro, o seu perfil precisa de um código do celular além da senha. Leva 2 minutos e é feito <b>uma vez só</b>.</p>' : '<p class="sub">Além da senha, o Hiro360 vai pedir um código do seu celular. No computador de sempre, só a cada 30 dias.</p>') +
        '<div id="mf-p1"><p style="margin:8px 0"><b>1.</b> Instale no celular um aplicativo grátis: <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b>.</p>' +
        '<p style="margin:8px 0"><b>2.</b> Para começar, confirme a sua senha do Hiro360:</p><input id="mf-s" type="password" autocomplete="current-password">' +
        '<div id="mf-e" class="sub" style="color:var(--urgente,#C0392B);min-height:18px;margin-top:6px"></div><div style="display:flex;gap:8px;justify-content:flex-end">' + (obrigatorio ? '<button class="b sec" id="mf-sair" type="button">Sair</button>' : '<button class="b sec" id="mf-cx" type="button">Cancelar</button>') + '<button class="b" id="mf-av" type="button">Continuar</button></div></div>', obrigatorio);
      const $ = function (s) { return ov.querySelector(s); }, err = function (t) { const e = ov.querySelector("#mf-e"); if (e) e.textContent = t; };
      if ($("#mf-cx")) $("#mf-cx").onclick = function () { ov.remove(); fim(false); };
      if ($("#mf-sair")) $("#mf-sair").onclick = function () { H.sair(); };
      $("#mf-s").focus();
      $("#mf-av").onclick = async function () {
        let j; try { j = await api("/api/me/2fa/inicia", { method: "POST", json: { senha: $("#mf-s").value } }); } catch (e) { return err(e.message); }
        let qr = ""; try { const Q = await carregaQr(); const q = Q(0, "M"); q.addData(j.uri); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch (e) { qr = ""; }
        $("#mf-p1").innerHTML = '<p style="margin:8px 0"><b>3.</b> No aplicativo, toque em <b>+</b> e depois em <b>Ler código QR</b>. Aponte o celular para este quadrado:</p>' +
          (qr ? '<div style="width:210px;height:210px;margin:6px auto;background:#fff;padding:4px;border-radius:8px">' + qr + '</div>' : "") +
          '<details style="margin:6px 0"><summary class="sub" style="cursor:pointer">Não consegue ler? Digite esta chave no aplicativo</summary><div style="font:15px ui-monospace,Consolas,monospace;word-break:break-all;background:#fff;padding:8px;border-radius:6px;margin-top:6px">' + escH(j.segredo.replace(/(.{4})/g, "$1 ").trim()) + '</div></details>' +
          '<p style="margin:8px 0"><b>4.</b> Digite o código de 6 números que apareceu no aplicativo:</p><input id="mf-c" inputmode="numeric" autocomplete="one-time-code" maxlength="7" style="font-size:22px;letter-spacing:4px;text-align:center">' +
          '<div id="mf-e" class="sub" style="color:var(--urgente,#C0392B);min-height:18px;margin-top:6px"></div><div style="display:flex;gap:8px;justify-content:flex-end">' + (obrigatorio ? '<button class="b sec" id="mf-sair" type="button">Sair</button>' : '<button class="b sec" id="mf-cx" type="button">Cancelar</button>') + '<button class="b" id="mf-cf" type="button">Ligar</button></div>';
        const svg = ov.querySelector("svg"); if (svg) { svg.style.width = "100%"; svg.style.height = "100%"; }
        if ($("#mf-cx")) $("#mf-cx").onclick = function () { ov.remove(); fim(false); };
        if ($("#mf-sair")) $("#mf-sair").onclick = function () { H.sair(); };
        $("#mf-c").focus();
        $("#mf-cf").onclick = async function () {
          let r; try { r = await api("/api/me/2fa/confirma", { method: "POST", json: { codigo: $("#mf-c").value } }); } catch (e) { return err(e.message); }
          ov.remove(); mostraCodigos(r.codigos, function () { fim(true); });
        };
        $("#mf-c").onkeydown = function (ev) { if (ev.key === "Enter") $("#mf-cf").click(); };
      };
      $("#mf-s").onkeydown = function (ev) { if (ev.key === "Enter") $("#mf-av").click(); };
    });
  };
  // "Minha verificação": ligar, gerar novos códigos, esquecer aparelhos, desligar (se o perfil permitir)
  H.minha2fa = async function () {
    let me; try { me = await api("/api/me"); } catch (e) { return; }
    const mf = me.mfa || {};
    if (!mf.on) { if (await H.liga2fa(false) && window.toast) window.toast("Verificação em duas etapas ligada."); return; }
    const ov = janela('<h1 style="font-size:20px">Verificação em duas etapas</h1><p class="sub">Ligada. Restam <b>' + (mf.emergencia || 0) + '</b> código(s) de emergência. Aparelhos lembrados por 30 dias: <b>' + (mf.aparelhos || 0) + '</b>.</p>' +
      '<label>Código do aplicativo (para gerar novos códigos ou desligar)</label><input id="mf-c" inputmode="numeric" maxlength="7">' + (mf.obrigatorio ? "" : '<label style="margin-top:8px;display:block">Senha (só para desligar)</label><input id="mf-s" type="password" autocomplete="current-password">') +
      '<div id="mf-e" class="sub" style="color:var(--urgente,#C0392B);min-height:18px;margin-top:6px"></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="b sec sm" id="mf-nc" type="button">Novos códigos de emergência</button><button class="b sec sm" id="mf-ap" type="button">Esquecer aparelhos lembrados</button>' + (mf.obrigatorio ? "" : '<button class="b sec sm" id="mf-dl" type="button">Desligar</button>') + '<span style="flex:1"></span><button class="b sm" id="mf-cx" type="button">Fechar</button></div>' +
      (mf.obrigatorio ? '<p class="sub" style="margin:10px 0 0">Para o seu perfil a verificação é obrigatória.</p>' : ""), false);
    const $ = function (s) { return ov.querySelector(s); }, err = function (t) { $("#mf-e").textContent = t; };
    $("#mf-cx").onclick = function () { ov.remove(); };
    $("#mf-ap").onclick = async function () { try { await api("/api/me/2fa/esquecer-aparelhos", { method: "POST", json: {} }); ov.remove(); if (window.toast) window.toast("Pronto: todos os aparelhos vão pedir o código no próximo login."); } catch (e) { err(e.message); } };
    $("#mf-nc").onclick = async function () { try { const r = await api("/api/me/2fa/novos-codigos", { method: "POST", json: { codigo: $("#mf-c").value } }); ov.remove(); mostraCodigos(r.codigos); } catch (e) { err(e.message); } };
    if ($("#mf-dl")) $("#mf-dl").onclick = async function () { try { await api("/api/me/2fa/desliga", { method: "POST", json: { codigo: $("#mf-c").value, senha: $("#mf-s").value } }); ov.remove(); if (window.toast) window.toast("Verificação em duas etapas desligada."); } catch (e) { err(e.message); } };
  };
  H.sair = async function () {
    // rascunhos de formulários podem ter dados pessoais: não ficam no computador depois de sair
    try { Object.keys(localStorage).filter(function (k) { return k.indexOf("hiro_rasc|") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    try { await api("/api/logout", { method: "POST", json: {}, semLogin: true }); } catch (e) {} location.reload(); };

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
    if (me && me.user) { H.me = me.user; H.iaOn = !!me.ia; } else { await H.login(); try { me = await api("/api/me"); H.iaOn = !!me.ia; } catch (e) {} }
    // perfil que exige verificação em duas etapas e ainda não configurou: configura antes de abrir o sistema
    if (me && me.mfa && me.mfa.pendente) await H.liga2fa(true);
    RT.db = criaDb(); RT.assets = criaAssets(); RT.dl = criaDl(); RT.user = criaUser();
    RT.sample = H.iaOn ? criaSample() : null; RT.envio = true;
  };
})();
