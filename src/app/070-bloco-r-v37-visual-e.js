/* ===== Bloco R (V37): visual e organização — menu do celular, Início, recursos por tela ===== */
const XZ_FIX=["home","agenda","res","pres"],XZ_CURTO={home:"Início",agenda:"Agenda",res:"Residentes",pres:"Prontuário",ponto:"Ponto",turnos:"Escalas",pront:"Equipe",estoque:"Estoque",fin:"Contas",nf:"Notas",docs:"Documentos",rel:"Relatórios",contab:"Contábil",prest:"Prestação",contador:"Folha",acesso:"Acesso"};
(function(){
  const st=document.createElement("style");st.id="xzcss";
  st.textContent=`
  #xzbar{display:none}
  nav#nav{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 26px),transparent);padding-bottom:18px}
  .qav[src=""],.qav.xzoff{display:none}
  p,.callout,.empty{font-family:var(--serif);font-size:15px}
  .xmp details{border:1px solid var(--line);border-radius:12px;background:var(--card);margin:7px 0;overflow:hidden}
  .xmp summary{cursor:pointer;padding:12px 14px;font-weight:700;color:var(--verde-esc);list-style:none;display:flex;align-items:center;gap:8px}
  .xmp summary::-webkit-details-marker{display:none}
  .xmp summary .sub{margin-left:auto;background:var(--areia-esc);border-radius:99px;padding:1px 9px;font-size:12px}
  .xmp summary::after{content:"›";font-size:20px;line-height:1;transform:rotate(90deg);transition:transform .15s;color:var(--madeira)}
  .xmp details[open] summary::after{transform:rotate(-90deg)}
  .xmp details[open]{border-color:var(--verde-medio)}
  .xmp .chips{padding:2px 10px 10px;display:flex;flex-wrap:wrap;gap:6px}
  .xmp .chips .b{margin:0!important;border-radius:99px}
  .xmp h2{margin-bottom:2px}
  #xqajuda{bottom:14px!important;right:14px!important}
  #xfab{right:14px!important;bottom:68px!important}
  #xpbpil{left:262px!important;bottom:10px!important;background:var(--card)}
  .xzs{position:fixed;inset:0;z-index:60;background:var(--bg);overflow-y:auto;padding:0 0 calc(24px + env(safe-area-inset-bottom,0px))}
  .xzs .xzh{position:sticky;top:0;background:#1E5C2A;color:#fff;padding:calc(12px + env(safe-area-inset-top,0px)) 16px 12px;display:flex;align-items:center;gap:10px;z-index:1}
  .xzs .xzh div{flex:1;min-width:0}.xzs .xzh b{display:block;font:700 17px var(--serif)}.xzs .xzh small{color:#cfe3c8}
  .xzs .xzh button{border:1px solid rgba(255,255,255,.4);background:none;color:#fff;border-radius:99px;padding:8px 14px;font:600 13px var(--ui)}
  .xzs .xzc{padding:12px 14px}
  .xzs h4{font:700 11px var(--ui);letter-spacing:.14em;text-transform:uppercase;color:var(--madeira);margin:16px 2px 8px}
  .xzs .xzg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .xzs .xzt{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--line);background:var(--card);color:var(--verde-esc);border-radius:12px;padding:14px 12px;font:600 14px var(--ui);min-height:56px}
  .xzs .xzt.on{border-color:var(--verde-medio);background:var(--verde-palido)}
  .xzs .xzt svg{width:22px;height:22px;color:var(--verde-medio)}
  .xzs .xzt.sec{color:var(--ink)}
  @media(max-width:860px){
    aside{display:none!important}
    #xzbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:30;background:#123f1b;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));gap:2px;box-shadow:0 -2px 12px rgba(0,0,0,.25)}
    #xzbar button{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:none;color:#cfe3c8;font:600 11px var(--ui);padding:8px 2px;border-radius:10px;cursor:pointer}
    #xzbar button.on{background:rgba(245,239,224,.16);color:#fff;box-shadow:inset 0 3px 0 var(--madeira-clara)}
    #xzbar svg{width:22px;height:22px}
    .doc>div:first-child,.doc .grow{flex:1 1 100%!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
    .doc *{text-overflow:clip}
    main{padding:14px 14px calc(96px + env(safe-area-inset-bottom,0px))!important}
    #xqajuda{display:none!important}
    #xfab{bottom:calc(78px + env(safe-area-inset-bottom,0px))!important;width:52px;height:52px}
    #xpbpil{left:8px!important;bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}
    .banner{padding:14px 16px!important}.banner p{font-size:12.5px}
    .stats{gap:8px}
    .card{padding:14px!important}
  }
  @media print{#xzbar,#xzsheet{display:none!important}}`;
  document.head.appendChild(st);
})();
const xzIco=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
function xzBar(){
  let d=document.getElementById("xzbar");if(!d){d=document.createElement("div");d.id="xzbar";d.setAttribute("role","navigation");d.setAttribute("aria-label","Menu principal");document.body.appendChild(d)}
  let vis=[];try{vis=PAGES.filter(p=>podeVer(p[0]))}catch(e){}
  const ks=vis.map(p=>p[0]);let fix=XZ_FIX.filter(k=>ks.includes(k));
  for(const p of vis){if(fix.length>=4)break;if(!fix.includes(p[0]))fix.push(p[0])}
  d.innerHTML=fix.map(k=>{const p=PAGES.find(x=>x[0]===k);return`<button data-xzr="${k}" class="${k===ROUTE?"on":""}">${xzIco(p[2])}<span>${XZ_CURTO[k]||p[1]}</span></button>`}).join("")+`<button data-xzmais class="${fix.includes(ROUTE)?"":"on"}" aria-label="Mais telas"><svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Mais</span></button>`;
  d.querySelectorAll("[data-xzr]").forEach(b=>b.onclick=()=>go(b.dataset.xzr));
  d.querySelector("[data-xzmais]").onclick=xzMais;
}
function xzMais(){
  const old=document.getElementById("xzsheet");if(old){old.remove();return}
  let h="",sec="",grp="";
  PAGES.forEach(([k,l,i,sc])=>{if(sc)sec=sc;if(!podeVer(k))return;if(sec){if(grp)h+=`</div>`;h+=`<h4>${f6Esc(sec)}</h4><div class="xzg">`;grp=sec;sec=""}h+=`<button class="xzt ${k===ROUTE?"on":""}" data-xzr="${k}">${xzIco(i)}<span>${f6Esc(l)}</span></button>`});
  if(grp)h+=`</div>`;
  const me=(typeof ACC!=="undefined"&&ACC.me)||{},p=(()=>{try{return perfilAtual()}catch(e){return null}})();
  const d=document.createElement("div");d.id="xzsheet";d.className="xzs";d.setAttribute("role","dialog");d.setAttribute("aria-label","Todas as telas");
  d.innerHTML=`<div class="xzh"><div><b></b><small></small></div><button id="xzx">Fechar</button></div><div class="xzc"><div class="xzg"><button class="xzt sec" id="xzbusca">${xzIco("search")}<span>Buscar</span></button><button class="xzt sec" id="xzajuda"><b style="font-size:18px;width:22px;text-align:center">?</b><span>Ajuda desta tela</span></button></div>${h}<h4>Sessão</h4><div class="xzg"><button class="xzt sec" id="xzlock">${xzIco("lock")}<span>Bloquear a tela</span></button></div></div>`;
  d.querySelector(".xzh b").textContent=me.name||"Casa Hiro";d.querySelector(".xzh small").textContent=ACC.gestor?"Administração":((p&&p.nome)||"");
  d.querySelector("#xzx").onclick=()=>d.remove();
  d.querySelectorAll("[data-xzr]").forEach(b=>b.onclick=()=>go(b.dataset.xzr));
  d.querySelector("#xzbusca").onclick=()=>{d.remove();abreBusca()};
  d.querySelector("#xzajuda").onclick=()=>{d.remove();xqAjuda()};
  d.querySelector("#xzlock").onclick=()=>{d.remove();bloquear()};
  document.body.appendChild(d);
}
const _goZ=go;
go=function(){const r=_goZ.apply(this,arguments);try{const s=document.getElementById("xzsheet");if(s)s.remove();xzBar()}catch(e){}return r};
/* ícones que o menu usa e talvez não existam */
(function(){const sv=document.querySelector("svg defs");if(!sv)return;const add=(id,d)=>{if(!document.getElementById("i-"+id))sv.insertAdjacentHTML("beforeend",`<symbol id="i-${id}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`)};
  add("search","M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4");add("lock","M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3")})();
/* avatar quebrado some */
const _dqZ=desenharQuem;
desenharQuem=function(){_dqZ.apply(this,arguments);try{const i=document.querySelector(".qav");if(i){if(!i.getAttribute("src"))i.classList.add("xzoff");i.onerror=()=>i.classList.add("xzoff")}}catch(e){}};
/* pílula de conexão: só aparece quando há problema */
const _pilZ=xpbPilula;
xpbPilula=function(){_pilZ.apply(this,arguments);try{const p=document.getElementById("xpbpil"),off=navigator.onLine===false,er=XPB.errGrav>0;if(p)p.style.display=(off||er)?"":"none"}catch(e){}};
/* Início: urgente e atenção logo abaixo do título */
const _bhZ=bindHome;
bindHome=function(){_bhZ.apply(this,arguments);try{const v=document.getElementById("view"),ban=v.querySelector(".banner");if(!ban)return;let ref=ban;[...v.children].forEach(c=>{const t=String(c.innerText||"").slice(0,30).toUpperCase();if(c.classList.contains("card")&&(t.startsWith("URGENTE")||t.startsWith("ATENÇÃO"))){ref.after(c);ref=c}})}catch(e){}};
/* recursos por tela: ao escolher, rola até o conteúdo */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-xmsec]");if(!b)return;setTimeout(()=>{const p=document.getElementById("xmpanel"),n=p&&p.nextElementSibling;if(n)n.scrollIntoView({behavior:"smooth",block:"start"})},80)});
try{xzBar();xpbPilula()}catch(e){}


/* >>> x_m20.js */
