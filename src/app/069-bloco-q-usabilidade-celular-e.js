/* ===== Bloco Q: usabilidade, celular e acessibilidade (itens 481–500) ===== */
const xqaC=()=>xmcfg("home");
const xqaPref=()=>{try{return JSON.parse(localStorage.getItem("hiro_pref")||"{}")}catch(e){return{}}};
const xqaSavePref=p=>{try{localStorage.setItem("hiro_pref",JSON.stringify({...xqaPref(),...p}))}catch(e){}xqaAplica()};
const XQA_CSS=`
html.xq-dark{--bg:#171a15;--card:#20241d;--ink:#e9e3d4;--mute:#a39b89;--line:#333227;--verde-palido:#233225;--azul-palido:#1c2733;--bege:#2a2620;--areia-esc:#2a281f;--verde-medio:#6cbf6f;--bad:#d69a80;--urgente:#EF8A80;--ok-tx:#9bd69e;--pend-tx:#d9c3a3;--azul-mar:#8fbbe3;--madeira:#d0a877}
html.xq-dark h3,html.xq-dark .stat b,html.xq-dark .namebtn{color:var(--verde-claro)}
html.xq-light{--bg:#F5EFE0;--card:#FFFCF5;--ink:#444444;--mute:#6F6A5C;--line:#e4ddcf;--verde-palido:#D6EDD8;--azul-palido:#D6EAF8;--bege:#F0E6D3;--areia-esc:#E8DFCC;--verde-medio:#2E7D32;--bad:#6B3A2A;--urgente:#9C4A1F;--ok-tx:#1E5C2A;--pend-tx:#6B4A2E;--azul-mar:#1B4F72;--madeira:#7D5A3C}
html.xq-light h3,html.xq-light .stat b,html.xq-light .namebtn{color:var(--ok-tx)}
html.xq-hc{--ink:#000;--mute:#1a1a1a;--line:#555}
html.xq-hc.xq-dark{--ink:#fff;--mute:#f0f0f0;--line:#bbb}
html.xq-hc a{text-decoration:underline}html.xq-hc .sub{color:var(--ink)}
@media(max-width:700px){table.mx{display:block;max-width:100%;overflow-x:auto}}
html.xq-toque .b,html.xq-toque button,html.xq-toque select,html.xq-toque input:not([type=checkbox]):not([type=radio]){min-height:48px;font-size:16px}
html.xq-toque input[type=checkbox],html.xq-toque input[type=radio]{width:22px;height:22px}
*:focus-visible{outline:3px solid #1B4F72!important;outline-offset:2px}
#xqskip{position:absolute;left:-999px;top:0;background:#fff;color:#000;padding:8px 12px;z-index:10000}#xqskip:focus{left:8px;top:8px}
#xqajuda{position:fixed;right:12px;bottom:12px;z-index:900;width:42px;height:42px;border-radius:50%;border:0;background:#1E5C2A;color:#fff;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px #0004}
@media print{#xqajuda,#xqskip,#xpbpil{display:none!important}}`;
function xqaAplica(){
  const p=xqaPref(),h=document.documentElement;let st=document.getElementById("xqastyle");if(!st){st=document.createElement("style");st.id="xqastyle";st.textContent=XQA_CSS;document.head.appendChild(st)}
  h.classList.toggle("xq-dark",p.tema==="escuro");h.classList.toggle("xq-light",p.tema==="claro");h.classList.toggle("xq-hc",!!p.contraste);h.classList.toggle("xq-toque",!!p.toque||!!p.posto);
  document.body.style.zoom=p.fonte&&p.fonte!==100?String(p.fonte/100):"";
  const m=xqaC().marca||{};
  if(m.cor){h.style.setProperty("--verde-esc",m.cor);h.style.setProperty("--verde-mata",m.cor)}else{h.style.removeProperty("--verde-esc");h.style.removeProperty("--verde-mata")}
  const lg=document.querySelector("aside .logo");if(lg){if(!lg.dataset.orig)lg.dataset.orig=lg.src;if(m.logo){lg.src=m.logo;lg.style.filter="none";lg.style.background="#fff";lg.style.borderRadius="8px";lg.style.padding="4px"}else if(lg.dataset.orig){lg.src=lg.dataset.orig;lg.style.filter="";lg.style.background="";lg.style.padding=""}}
  if(m.nome)document.title=m.nome;
  const tag=document.getElementById("toast");if(tag){tag.setAttribute("role","status");tag.setAttribute("aria-live","polite")}
  const nav=document.getElementById("nav");if(nav)nav.setAttribute("role","navigation");
  document.querySelectorAll("button:not([aria-label])").forEach(b=>{if(!b.textContent.trim()&&b.title)b.setAttribute("aria-label",b.title)});
  const v=document.getElementById("view");if(v&&!v.hasAttribute("tabindex")){v.setAttribute("tabindex","-1");v.setAttribute("role","main")}
  if(!document.getElementById("xqskip")){const a=document.createElement("a");a.id="xqskip";a.href="#view";a.textContent="Pular para o conteúdo";a.onclick=e=>{e.preventDefault();v&&v.focus()};document.body.prepend(a)}
}
/* reaplica após cada tela */
const _goQ=go;
go=function(r,keep){const out=_goQ.apply(this,arguments);try{xqaAplica();xqAjudaBtn()}catch(e){}return out};
/* --- ajuda contextual e tutorial (481, 482, 483) --- */
const XQA_AJUDA={home:["Visão geral","Mostra o que é urgente, o resumo do dia e atalhos. Toque num cartão para resolver a pendência. Em “Mais recursos desta tela” ficam notificações, sugestões e personalização."],agenda:["Agenda e tarefas","Crie tarefas com prazo, responsável e prioridade. Use o quadro kanban, o calendário e as rotinas prontas (caixa d'água, extintores)."],pront:["Integrantes","Cadastro da equipe, documentos, férias, treinamentos, advertências e avaliações."],ponto:["Ponto eletrônico","Importe as marcações do relógio, confira inconsistências, aprove ajustes e feche o mês."],turnos:["Escalas e turnos","Monte a escala por modelo (12x36, 6x1…), troque plantões, cubra faltas e publique."],contador:["Fechamento da folha","Gera as planilhas e PDFs do mês para a contabilidade."],res:["Residentes","Cadastro, família, contrato, visitas, saídas e mensalidades."],pres:["Prontuário","Evoluções, sinais vitais, medicação, escalas clínicas e passagem de plantão."],estoque:["Estoque","Entradas, saídas, inventário, validade e sugestão de compra."],fin:["Contas e fluxo de caixa","Contas a pagar e receber, conciliação e fluxo de caixa."],nf:["Notas fiscais","Importe XML, classifique itens e acompanhe gastos por fornecedor."],prest:["Prestadores","Contratos, visitas, documentos e pagamentos de prestadores."],contab:["Contabilidade","Plano de contas, DRE, balanço, checklist de fechamento e entrega ao contador."],docs:["Documentos e compliance","Biblioteca de arquivos, vencimentos, modelos, POPs e pasta de fiscalização."],rel:["Central de relatórios","Baixe relatórios em Excel/PDF, veja o painel do gestor e monte relatórios próprios."],acesso:["Usuários e permissões","Quem acessa, perfis, LGPD, backups e saúde do sistema."]};
function xqAjudaBtn(){
  let b=document.getElementById("xqajuda");if(!b){b=document.createElement("button");b.id="xqajuda";b.textContent="?";b.title="Ajuda desta tela";b.setAttribute("aria-label","Ajuda desta tela");b.onclick=()=>xqAjuda();document.body.appendChild(b)}
  b.style.display=document.body.classList.contains("gated")?"none":"block";
}
function xqAjuda(){
  const r=ROUTE,A=XQA_AJUDA[r]||["Ajuda","Use o menu à esquerda para navegar."],S_=(typeof XMSECS!=="undefined"&&XMSECS[r])||[];
  openModal(`<h3>${f6Esc(A[0])}</h3><p>${f6Esc(A[1])}</p>${S_.length?`<p class="sub">Nesta tela há <b>${S_.length}</b> recursos extras em “Mais recursos desta tela”, no fim da página.</p>`:""}<h4 style="margin:10px 0 4px">Atalhos de teclado</h4>${xqAtalhosHtml()}<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="b sec" id="xqtut">Rever o tutorial</button><button class="b" id="xqhx">Fechar</button></div>`);
  document.querySelector("#xqhx").onclick=()=>document.querySelector(".ov:last-of-type").remove();document.querySelector("#xqtut").onclick=()=>{document.querySelectorAll(".ov").forEach(x=>x.remove());xqTutorial(true)};
}
function xqTutorial(forca){
  const pid=(()=>{try{return(S.acessos[ACC.uid]||{}).perfil||(ACC.gestor?"gestor":"")}catch(e){return""}})();let vis="";try{vis=localStorage.getItem("hiro_tut")||""}catch(e){}
  if(!forca&&vis===(pid||"_"))return;if(document.querySelector(".ov")&&!forca){setTimeout(()=>xqTutorial(false),6000);return}
  const L=PAGES.filter(p=>podeVer(p[0])&&XQA_AJUDA[p[0]]);
  const ov=openModal(`<h3>Bem-vindo(a) à Casa Hiro</h3><p class="sub">Estas são as telas que o seu perfil acessa:</p><ul style="margin:6px 0 6px 18px">${L.map(p=>`<li style="margin:4px 0"><b>${f6Esc(XQA_AJUDA[p[0]][0])}</b> — ${f6Esc(XQA_AJUDA[p[0]][1])}</li>`).join("")}</ul><p class="sub">Dicas: <b>Ctrl+K</b> busca em tudo; <b>Ctrl+Z</b> desfaz; o botão <b>?</b> no canto explica a tela em que você está.</p><div style="text-align:right"><button class="b" id="xqtx">Começar</button></div>`);
  ov.querySelector("#xqtx").onclick=()=>{try{localStorage.setItem("hiro_tut",pid||"_")}catch(e){}ov.remove()};
}
const _regQ=registrarEntrada;
registrarEntrada=function(){const a=_entrou;_regQ.apply(this,arguments);if(!a&&_entrou)setTimeout(()=>xqTutorial(false),5000)};
/* --- atalhos de teclado (499) --- */
const XQA_AT={h:["home","Visão geral"],a:["agenda","Agenda e tarefas"],r:["res","Residentes"],p:["pres","Prontuário"],e:["estoque","Estoque"],f:["fin","Contas e fluxo de caixa"],d:["docs","Documentos"],t:["ponto","Ponto eletrônico"],c:["contab","Contabilidade"],l:["rel","Relatórios"]};
function xqAtalhosHtml(){return`<ul style="margin:4px 0 0 18px"><li><b>Ctrl+K</b> — busca em todo o sistema</li><li><b>Ctrl+Z</b> — desfaz a última alteração</li><li><b>?</b> — mostra esta ajuda</li>${Object.entries(XQA_AT).map(([k,v])=>`<li><b>Alt+${k.toUpperCase()}</b> — ${v[1]}</li>`).join("")}<li><b>Alt+N</b> — nova tarefa</li></ul>`}
document.addEventListener("keydown",e=>{
  if(typeof estadoAcesso==="function"&&estadoAcesso()!=="ok")return;const tag=(document.activeElement||{}).tagName||"";
  if(e.altKey&&!e.ctrlKey&&!e.metaKey){const k=e.key.toLowerCase();if(k==="n"&&podeEd("agenda")){e.preventDefault();openTarefa(null,hojeIso());return}const a=XQA_AT[k];if(a&&podeVer(a[0])){e.preventDefault();go(a[0])}return}
  if(e.key==="?"&&!/INPUT|TEXTAREA|SELECT/.test(tag)&&!document.querySelector(".ov")){e.preventDefault();xqAjuda()}
});
/* --- mensagens de erro em linguagem simples (495) --- */
const XQA_ERR=[[/failed to fetch|networkerror|network request failed/i,"Sem conexão com a internet. Confira o sinal e tente de novo."],[/permission|insufficient|not.?granted|not.?writer/i,"Você não tem permissão para esta ação. Fale com a direção."],[/quota|exceed|too large|payload/i,"O limite de espaço ou de tamanho foi atingido. Reduza o arquivo ou libere espaço."],[/unavailable|timeout|timed out|deadline/i,"O serviço demorou a responder. Aguarde um instante e tente de novo."],[/conflict/i,"Outra pessoa alterou isto ao mesmo tempo. Recarregue a tela e refaça."]];
const _toastQ=toast;
toast=function(msg,bad){let m=String(msg);if(bad){const h=XQA_ERR.find(x=>x[0].test(m));if(h)m=h[1]+(/Não foi possível/.test(m)?"":"")}return _toastQ.call(this,m,bad)};
/* --- máscaras e busca de CEP (496, 497) --- */
function xqLabel(x){const p=x.previousElementSibling;if(p&&p.tagName==="LABEL")return p.textContent;if(x.id){const l=document.querySelector('label[for="'+x.id+'"]');if(l)return l.textContent}const pa=x.parentElement;if(pa&&pa.querySelectorAll("input,select,textarea").length===1){const l=pa.querySelector("label");if(l)return l.textContent}return""}
function xqKind(inp){
  if(inp.tagName!=="INPUT"||/^(number|date|time|month|password|file|checkbox|radio|range|email|url|search)$/.test(inp.type))return null;
  const lt=xqLabel(inp);
  const s=(inp.id+" "+(inp.name||"")+" "+(inp.placeholder||"")+" "+lt+" "+(inp.dataset.k||"")).toLowerCase();
  if(/documento|cpf.*cnpj|cnpj.*cpf|cpf ou/.test(s))return null;
  if(/cnpj/.test(s))return"cnpj";if(/\bcpf\b|cpf_|_cpf|cpf\)|cpf /.test(s)||/^cpf/.test(s))return"cpf";if(/\bcep\b/.test(s))return"cep";
  if(/telefone|celular|whats|\bfone\b|\btel\b|tel_|_tel/.test(s))return"tel";return null;
}
function xqMasc(k,v){const d=v.replace(/\D/g,"");
  if(k==="cpf")return d.slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
  if(k==="cnpj")return d.slice(0,14).replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2");
  if(k==="cep")return d.slice(0,8).replace(/(\d{5})(\d)/,"$1-$2");
  if(k==="tel"){const t=d.slice(0,11);return t.length>10?t.replace(/(\d{2})(\d{5})(\d{1,4})/,"($1) $2-$3"):t.length>6?t.replace(/(\d{2})(\d{4})(\d{1,4})/,"($1) $2-$3"):t.length>2?t.replace(/(\d{2})(\d+)/,"($1) $2"):t}return v}
document.addEventListener("input",e=>{
  const i=e.target,k=xqKind(i);if(!k||e.inputType==="deleteContentBackward"||/[A-Za-zÀ-ú]/.test(i.value))return;
  const n=xqMasc(k,i.value);if(n!==i.value)i.value=n;
  if(k==="cep"&&i.value.replace(/\D/g,"").length===8)xqCep(i);
},true);
async function xqCep(inp){
  const cep=inp.value.replace(/\D/g,"");if(!navigator.onLine)return;
  try{const r=await fetch("https://brasilapi.com.br/api/cep/v1/"+cep);if(!r.ok)throw 0;const d=await r.json(),box=inp.closest(".modal")||inp.closest(".card")||document.getElementById("view");
    const par=(re,val)=>{if(!val)return;[...box.querySelectorAll("input")].forEach(x=>{if(x===inp||x.value)return;const s=(x.id+" "+(x.placeholder||"")+" "+xqLabel(x)).toLowerCase();if(re.test(s)){x.value=val;x.dispatchEvent(new Event("input",{bubbles:true}))}})};
    par(/logradouro|\brua\b|endere/,d.street);par(/bairro/,d.neighborhood);par(/cidade|munic/,d.city);par(/\buf\b|estado/,d.state);toast("Endereço preenchido pelo CEP.")}catch(e){}
}
/* --- rascunhos automáticos em formulários (498) --- */
const xqDraftKey=ov=>"hiro_rasc|"+(typeof ROUTE!=="undefined"?ROUTE:"")+"|"+(((ov.querySelector("h3")||{}).textContent)||"").slice(0,60);
new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(n=>{
  if(!(n instanceof HTMLElement)||!n.classList.contains("ov"))return;
  setTimeout(()=>{const ov=n;if(!ov.isConnected)return;const campos=[...ov.querySelectorAll("input,textarea,select")].filter(x=>x.id&&!/^(password|file|hidden)$/.test(x.type));if(campos.length<2)return;
    const key=xqDraftKey(ov);let dr=null;try{dr=JSON.parse(localStorage.getItem(key)||"null")}catch(e){}
    if(dr&&Date.now()-dr.t<864e5&&!campos.some(c=>c.value&&c.type!=="checkbox"&&c.type!=="date"&&c.type!=="time"&&c.type!=="number"&&c.tagName!=="SELECT")){
      campos.forEach(c=>{if(dr.v[c.id]!==undefined){if(c.type==="checkbox")c.checked=!!dr.v[c.id];else c.value=dr.v[c.id]}});
      const bar=document.createElement("div");bar.className="callout sand";bar.style.marginBottom="8px";bar.innerHTML=`Rascunho recuperado (${new Date(dr.t).toLocaleString("pt-BR")}). <a href="#">Descartar</a>`;ov.querySelector(".modal").prepend(bar);
      bar.querySelector("a").onclick=e=>{e.preventDefault();try{localStorage.removeItem(key)}catch(x){}campos.forEach(c=>{if(c.type==="checkbox")c.checked=false;else if(c.tagName!=="SELECT")c.value=""});bar.remove()}}
    const salva=()=>{const v={};campos.forEach(c=>v[c.id]=c.type==="checkbox"?c.checked:c.value);if(Object.values(v).some(x=>x&&x!==true))try{localStorage.setItem(key,JSON.stringify({t:Date.now(),v}))}catch(e){}};
    ov.addEventListener("input",salva);ov.addEventListener("change",salva);
    ov.addEventListener("click",e=>{const b=e.target.closest("button");if(b&&!b.classList.contains("sec")){setTimeout(()=>{if(!ov.isConnected)try{localStorage.removeItem(key)}catch(x){}},1500)}},true);
  },30)}))}).observe(document.body,{childList:true});
/* --- impressão com cabeçalho e logo (400) --- */
const _xpQ=xmPrint;
xmPrint=function(titulo,html){const e=empresa(),m=xqaC().marca||{},lg=m.logo||(document.querySelector("aside .logo")&&document.querySelector("aside .logo").dataset.orig)||"";
  const cab=`<div class="xqcab" style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1E5C2A;padding-bottom:8px;margin-bottom:12px">${lg?`<img src="${lg}" style="height:48px;${m.logo?"":"filter:none;background:#1E5C2A;padding:4px;border-radius:6px"}">`:""}<div><b style="font-size:16px">${f6Esc(m.nome||e.razao||"Casa Hiro")}</b><div style="font-size:12px">${f6Esc([e.cnpj?"CNPJ "+e.cnpj:"",e.endereco,e.telefone].filter(Boolean).join(" · "))}</div></div></div>`;
  return _xpQ.call(this,titulo,cab+html)};
/* --- seções do painel inicial: aparência, ajuda, quiosque, marca --- */
xmReg("home","aparencia","Aparência e ajuda","Aparência e acessibilidade",()=>{
  const p=xqaPref();
  return f6Card("Aparência (só neste aparelho)","Estas escolhas ficam salvas neste navegador.",`<div class="row" style="align-items:flex-end"><div><label>Tema</label><select id="xqtema"><option value="" ${!p.tema?"selected":""}>Automático (do aparelho)</option><option value="claro" ${p.tema==="claro"?"selected":""}>Claro</option><option value="escuro" ${p.tema==="escuro"?"selected":""}>Escuro</option></select></div><div><label>Tamanho do texto</label><select id="xqfonte">${[100,115,130,150].map(n=>`<option value="${n}" ${(p.fonte||100)===n?"selected":""}>${n}%</option>`).join("")}</select></div></div><div style="margin:10px 0"><label style="display:block;font-weight:400"><input type="checkbox" id="xqhc" ${p.contraste?"checked":""}> Alto contraste</label><label style="display:block;font-weight:400"><input type="checkbox" id="xqtq" ${p.toque?"checked":""}> Botões grandes (celular, luvas, pressa)</label><label style="display:block;font-weight:400"><input type="checkbox" id="xqpo" ${p.posto?"checked":""}> Modo posto de enfermagem (tablet): botões grandes e toque fácil</label></div><button class="b sm" id="xqpv">Aplicar</button> <button class="b sec sm" id="xqpr">Voltar ao padrão</button>`);
},()=>{$("xqpv").onclick=()=>{xqaSavePref({tema:$("xqtema").value,fonte:+$("xqfonte").value,contraste:$("xqhc").checked,toque:$("xqtq").checked,posto:$("xqpo").checked});toast("Aparência atualizada.")};$("xqpr").onclick=()=>{try{localStorage.removeItem("hiro_pref")}catch(e){}xqaAplica();xmGo()}});
xmReg("home","ajuda","Aparência e ajuda","Ajuda, tutorial e atalhos",()=>f6Card("Como usar o sistema","",`<div class="row"><button class="b sm" id="xqah">Ajuda desta tela</button><button class="b sec sm" id="xqat">Rever o tutorial inicial</button><button class="b sec sm" id="xqan">Ver novidades</button></div><h4 style="margin:12px 0 4px">Atalhos de teclado</h4>${xqAtalhosHtml()}<h4 style="margin:12px 0 4px">Telas</h4>`+f6Tbl(["Tela","Para que serve"],[PAGES.filter(p=>podeVer(p[0])&&XQA_AJUDA[p[0]]).map(p=>`<tr><td>${f6Esc(XQA_AJUDA[p[0]][0])}</td><td>${f6Esc(XQA_AJUDA[p[0]][1])}</td></tr>`).join("")],"txt")+`<p class="sub">Vídeos de treinamento não estão incluídos nesta versão: o passo a passo está escrito nesta ajuda e no tutorial.</p>`),()=>{$("xqah").onclick=()=>xqAjuda();$("xqat").onclick=()=>xqTutorial(true);$("xqan").onclick=()=>xpbNovidades(true)});
const xqaSha=async t=>sha256Hex(t);
xmReg("home","quiosque","Aparência e ajuda","Quiosque do integrante",()=>{
  const sel=XM.sim.xqk||"",ok_=XM.sim.xqkok===sel&&sel,pins=xqaC().pins||{},C=integList().filter(i=>(i.situacao||"Ativo")!=="Desligado"&&!semPonto(i));let corpo="";
  if(ok_){const ig=S.integrantes[sel],h=hojeIso(),dias=Array.from({length:14},(_,i)=>addDaysIso(h,i));let r=null;try{r=calcSilencioso(h.slice(0,7)+"-01",h)}catch(e){}const u=r&&(r.users||[]).find(x=>x.ig&&x.ig.id===sel),hr=m=>Math.round((m||0)/60*10)/10;
    corpo=`<h3 style="margin-top:12px">Olá, ${f6Esc(nomeInteg(ig).split(" ")[0])}</h3>`+f6Tbl(["Dia","Escala"],[dias.map(d=>{let e={};try{e=escalaDia(ig,d)||{}}catch(x){}return`<tr><td>${brDate(d)} ${["seg","ter","qua","qui","sex","sáb","dom"][pyWeekday(d)]}${feriadoNome&&feriadoNome(d)?" · "+f6Esc(feriadoNome(d)):""}</td><td>${e.on?"Trabalha"+(e.turno?" — turno "+f6Esc(e.turno):""):"Folga"}</td></tr>`}).join("")],"txt")+(u?`<h4 style="margin:10px 0 4px">Seu ponto neste mês</h4><p>Horas trabalhadas: <b>${hr(u.t.worked)}</b> de ${hr(u.t.expected)} · atrasos: ${hr(u.t.late)} h · faltas: ${u.t.faltas||0}</p>`:"")+`<button class="b sec sm" id="xqksai">Sair</button>`}
  return f6Card("Consulta rápida para a equipe","Cada integrante vê só a própria escala dos próximos 14 dias e o resumo de horas do mês, sem salário. Se houver PIN cadastrado, ele é pedido. O PIN é uma proteção simples contra olhares curiosos, não uma autenticação forte.",`<div class="row" style="align-items:flex-end"><div><label>Integrante</label><select id="xqks"><option value="">Escolha…</option>${C.map(i=>`<option value="${i.id}" ${i.id===sel?"selected":""}>${f6Esc(nomeInteg(i))}</option>`).join("")}</select></div>${sel&&!ok_?`<div><label>PIN</label><input type="password" id="xqkp" inputmode="numeric" maxlength="6" style="width:100px"></div><button class="b sm" id="xqkgo">Entrar</button>`:""}</div>${corpo}`)+
  (podeEd("home")?f6Card("Definir PIN de um integrante","Quatro a seis números. Deixe em branco para remover.",`<div class="row" style="align-items:flex-end"><div><label>Integrante</label><select id="xqkc"><option value="">Escolha…</option>${C.map(i=>`<option value="${i.id}">${f6Esc(nomeInteg(i))}${pins[i.id]?" ✔":""}</option>`).join("")}</select></div><div><label>Novo PIN</label><input id="xqkn" inputmode="numeric" maxlength="6" style="width:100px"></div><button class="b sec sm" id="xqkset">Salvar PIN</button></div>`):"");
},()=>{
  const s=$("xqks");if(s)s.onchange=()=>{XM.sim.xqk=s.value;XM.sim.xqkok="";if(s.value&&!(xqaC().pins||{})[s.value])XM.sim.xqkok=s.value;xmGo()};
  const g=$("xqkgo");if(g)g.onclick=async()=>{const h=await xqaSha(XM.sim.xqk+"|"+$("xqkp").value);if(h===(xqaC().pins||{})[XM.sim.xqk]){XM.sim.xqkok=XM.sim.xqk;xmGo()}else toast("PIN incorreto.",true)};
  const x=$("xqksai");if(x)x.onclick=()=>{XM.sim.xqk="";XM.sim.xqkok="";xmGo()};
  const st=$("xqkset");if(st)st.onclick=async()=>{const c=$("xqkc").value,p=$("xqkn").value.trim();if(!c)return toast("Escolha o integrante.",true);if(p&&!/^\d{4,6}$/.test(p))return toast("O PIN deve ter de 4 a 6 números.",true);const pins={...(xqaC().pins||{})};if(p)pins[c]=await xqaSha(c+"|"+p);else delete pins[c];xmsave("home",{pins});toast("PIN salvo.");setTimeout(xmGo,250)}});
xmReg("home","marca","Aparência e ajuda","Marca da casa (nome, logo e cor)",()=>{const m=xqaC().marca||{};return f6Card("Personalizar","O nome aparece na aba do navegador e no cabeçalho das impressões; a cor principal e o logo valem para todos os usuários.",`<div class="row" style="align-items:flex-end"><div><label>Nome da casa</label><input id="xqmn" value="${f6Esc(m.nome||"")}"></div><div><label>Cor principal</label><input type="color" id="xqmc" value="${m.cor||"#1E5C2A"}"></div><div><label>Logo (imagem)</label><input type="file" id="xqml" accept="image/*"></div></div><div class="row" style="margin-top:8px"><button class="b sm" id="xqms">Salvar</button><button class="b sec sm" id="xqmr">Voltar ao padrão</button></div>${m.logo?`<img src="${m.logo}" style="height:50px;margin-top:8px;background:#eee;padding:4px">`:""}`)},()=>{
  $("xqms").onclick=async()=>{if(!podeEd("home"))return toast("Sem permissão.",true);const m={...(xqaC().marca||{}),nome:$("xqmn").value.trim(),cor:$("xqmc").value==="#1e5c2a"?"":$("xqmc").value};const f=$("xqml").files[0];if(f){try{m.logo=await xrFotoRedimensiona(f,240)}catch(e){return toast("Não consegui ler a imagem.",true)}}xmsave("home",{marca:m});toast("Salvo.");setTimeout(()=>{xqaAplica();xmGo()},400)};
  $("xqmr").onclick=()=>{xmsave("home",{marca:{}});setTimeout(()=>{xqaAplica();xmGo()},400)}});
setTimeout(()=>{try{xqaAplica();xqAjudaBtn()}catch(e){}},300);


/* >>> x_m19.js */
