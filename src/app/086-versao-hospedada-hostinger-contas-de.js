/* ============ Versão hospedada (Hostinger): contas de login, troca de senha e sair ============ */
if(window.HOST){
  const _acPessoas=acPessoas;
  acPessoas=function(){
    let h=_acPessoas();
    h=h.replace(/<div class="callout">[\s\S]*?<\/div>/,`<div class="callout">Cada pessoa entra com <b>usuário e senha</b> criados por você aqui. Crie a conta, escolha o perfil e passe a senha provisória pessoalmente. Quem é <b>administrador</b> vê tudo e gerencia as contas.</div>`);
    return `<div class="card" id="hostcontas"><h2>Contas de login</h2><div class="sub">Carregando…</div></div>`+h;
  };
  const _bindAcesso=bindAcesso;
  bindAcesso=function(){
    _bindAcesso();
    if(ACS.tab==="pessoas")hostContas();
  };
  async function hostContas(){
    let box=$("hostcontas");if(!box)return;
    let us=[];try{us=(await HOST.api("/api/users")).users}catch(e){box=$("hostcontas");if(box)box.innerHTML=`<h2>Contas de login</h2><div class="sub">${esc(e.message)}</div>`;return}
    box=$("hostcontas");if(!box)return;
    const perf=r=>{const a=S.acessos[r.id];return a?((perfis()[a.perfil]||{}).nome||a.perfil):(r.admin?"Administração":"sem perfil")};
    box.innerHTML=`<h2>Contas de login (${us.length})</h2>
     ${us.map(u=>`<div class="doc" ${u.active?"":'style="opacity:.6"'}><div class="grow"><div class="nm">${esc(u.name)} ${u.admin?'<span class="chip">administrador</span>':""} ${u.active?"":'<span class="chip">suspenso</span>'}</div>
       <div class="sub">usuário <b>${esc(u.username)}</b> · ${esc(perf(u))}${u.last_login?" · último acesso "+esc(new Date(u.last_login).toLocaleString("pt-BR")):" · nunca entrou"}</div></div>
       <button class="b sec sm" data-hsenha="${esc(u.id)}">Nova senha</button>
       <button class="b sec sm" data-hativo="${esc(u.id)}">${u.active?"Suspender":"Reativar"}</button>
       <button class="b sec sm" data-hadm="${esc(u.id)}">${u.admin?"Tirar admin":"Tornar admin"}</button></div>`).join("")}
     <div style="margin-top:12px"><button class="b" id="hnova">${ic("plus")||""} Criar conta</button></div>`;
    const por=id=>us.find(u=>u.id===id);
    const patch=async(id,corpo,ok)=>{try{await HOST.api("/api/users/"+id,{method:"PATCH",json:corpo});if(ok)toast(ok);hostContas()}catch(e){toast(e.message,true)}};
    box.querySelectorAll("[data-hsenha]").forEach(b=>b.onclick=()=>hostSenha(por(b.dataset.hsenha),()=>hostContas()));
    box.querySelectorAll("[data-hativo]").forEach(b=>b.onclick=()=>{const u=por(b.dataset.hativo);patch(u.id,{active:!u.active},u.active?"Conta suspensa.":"Conta reativada.")});
    box.querySelectorAll("[data-hadm]").forEach(b=>b.onclick=()=>{const u=por(b.dataset.hadm);patch(u.id,{admin:!u.admin},u.admin?"Deixou de ser administrador.":"Agora é administrador.")});
    box.querySelector("#hnova").onclick=()=>hostNova(()=>{hostContas();go("acesso",true)});
  }
  function hostSenha(u,depois){
    const ov=openModal(`<h3>Nova senha de ${esc(u.name)}</h3><label>Senha provisória (mínimo 8 caracteres)</label><input id="hsn" type="text" autocomplete="off"><div class="sub" id="hse" style="color:var(--urgente);min-height:18px"></div>
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="b sec" id="hsc">Cancelar</button><button class="b" id="hsok">Salvar</button></div>`);
    ov.querySelector("#hsc").onclick=()=>ov.remove();
    ov.querySelector("#hsok").onclick=async()=>{try{await HOST.api("/api/users/"+u.id,{method:"PATCH",json:{password:ov.querySelector("#hsn").value}});ov.remove();toast("Senha trocada. A pessoa precisa entrar de novo.");depois&&depois()}catch(e){ov.querySelector("#hse").textContent=e.message}};
  }
  function hostNova(depois){
    const ov=openModal(`<h3>Criar conta de login</h3>
     <div class="row"><div><label>Nome da pessoa</label><input id="hnn" maxlength="120"></div><div><label>Usuário (para entrar)</label><input id="hnu" maxlength="40" autocapitalize="none" placeholder="ex.: maria.souza"></div></div>
     <div class="row"><div><label>Senha provisória (mínimo 8)</label><input id="hnp" type="text" autocomplete="off"></div><div><label>Perfil</label><select id="hnf">${perfOpts("leitura")}</select></div></div>
     <label style="display:flex;gap:8px;align-items:center;font-weight:400;color:var(--ink)"><input type="checkbox" id="hna"> Administrador (vê tudo e gerencia contas)</label>
     <div class="sub" id="hne" style="color:var(--urgente);min-height:18px"></div>
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="b sec" id="hnc">Cancelar</button><button class="b" id="hnok">Criar</button></div>`);
    ov.querySelector("#hnc").onclick=()=>ov.remove();
    ov.querySelector("#hnok").onclick=async()=>{
      const g=s=>ov.querySelector(s),adm=g("#hna").checked;
      try{
        const j=await HOST.api("/api/users",{method:"POST",json:{name:g("#hnn").value,username:g("#hnu").value,password:g("#hnp").value,admin:adm}});
        put("acessos",j.user.id,{perfil:g("#hnf").value,ativo:true,obs:j.user.name,por:ACC.uid,em:new Date().toISOString()});
        audit("perm","criou a conta "+j.user.username);ov.remove();toast("Conta criada. Passe o usuário e a senha provisória à pessoa.");depois&&depois();
      }catch(e){g("#hne").textContent=e.message}
    };
  }
  function hostMinhaSenha(){
    const ov=openModal(`<h3>Trocar minha senha</h3><label>Senha atual</label><input id="ms0" type="password" autocomplete="current-password"><label style="margin-top:8px;display:block">Nova senha (mínimo 8)</label><input id="ms1" type="password" autocomplete="new-password"><div class="sub" id="mse" style="color:var(--urgente);min-height:18px"></div>
     <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="b sec" id="msc">Cancelar</button><button class="b" id="msok">Trocar</button></div>`);
    ov.querySelector("#msc").onclick=()=>ov.remove();
    ov.querySelector("#msok").onclick=async()=>{try{await HOST.api("/api/me/senha",{method:"POST",json:{atual:ov.querySelector("#ms0").value,nova:ov.querySelector("#ms1").value}});ov.remove();toast("Senha trocada.")}catch(e){ov.querySelector("#mse").textContent=e.message}};
  }
  const _quem=desenharQuem;
  desenharQuem=function(){
    _quem();const q=$("quem");if(!q||!RT.db||q.querySelector("#qsair"))return;
    q.insertAdjacentHTML("beforeend",`<div style="display:flex;gap:6px;margin-top:6px"><button class="b sec sm" id="qsenha" style="flex:1">Minha senha</button><button class="b sec sm" id="qsair" style="flex:1">Sair</button></div>`);
    $("qsenha").onclick=hostMinhaSenha;$("qsair").onclick=()=>HOST.sair();
  };

  /* Migração: backup .zip do claude.ai (dados + arquivos). Envia os arquivos ao servidor, troca os códigos antigos pelos novos e restaura. */
  const _bkpRest=bkpRestaurar;
  bkpRestaurar=async function(file){
    if(!/\.zip$/i.test(file.name)||typeof JSZip==="undefined")return _bkpRest(file);
    let z;try{z=await JSZip.loadAsync(await file.arrayBuffer())}catch(e){return _bkpRest(file)}
    const nomes=Object.keys(z.files).filter(n=>/^arquivos\/[^/]+$/.test(n)&&!z.files[n].dir);
    if(!nomes.length||!z.file("dados.json"))return _bkpRest(file);
    let dados,meta={};
    try{dados=JSON.parse(await z.file("dados.json").async("string"));if(z.file("arquivos.json"))meta=JSON.parse(await z.file("arquivos.json").async("string"))}catch(e){return toast("Backup inválido: "+(e.message||e),true)}
    if(!dados||dados.sistema!=="Casa Hiro"||!dados.colecoes)return toast("Este arquivo não é um backup da Casa Hiro.",true);
    if(!await askConfirm(`Este backup traz ${nomes.length} arquivo(s) (PDFs, fotos, notas). Eles serão enviados ao servidor e depois os dados são restaurados. Pode levar vários minutos; não feche a página.`,"Enviar e restaurar"))return;
    const sniff=u8=>u8[0]===0x25&&u8[1]===0x50?"application/pdf":u8[0]===0x89&&u8[1]===0x50?"image/png":u8[0]===0xFF&&u8[1]===0xD8?"image/jpeg":u8[0]===0x52&&u8[1]===0x49?"image/webp":u8[0]===0x47&&u8[1]===0x49?"image/gif":"text/plain";
    const mapa={},falhas=[];let k=0;
    for(const n of nomes){
      const velho=n.slice(9),m=meta[velho]||{};k++;toast(`Enviando arquivo ${k} de ${nomes.length}…`);
      try{
        const buf=await z.file(n).async("uint8array"),tipo=(m.type&&m.type.indexOf("/")>0)?m.type:sniff(buf);
        const r=await RT.assets.upload(new File([buf],m.nome||velho,{type:tipo}),{type:tipo});mapa[velho]=r.id;
      }catch(e){falhas.push(velho+": "+(e.message||e))}
    }
    const troca=v=>{if(typeof v==="string")return mapa[v]||v;if(Array.isArray(v))return v.map(troca);if(v&&typeof v==="object"){const o={};for(const[a,b]of Object.entries(v))o[a]=troca(b);return o}return v};
    dados.colecoes=troca(dados.colecoes);
    if(falhas.length)toast(`${falhas.length} arquivo(s) não puderam ser enviados e ficaram sem anexo.`,true);
    return _bkpRest(new File([JSON.stringify(dados)],"dados.json",{type:"application/json"}));
  };
}

