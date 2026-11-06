/* ===== Bloco P: infraestrutura, backup e integrações (itens 456–480) ===== */
const xpbC=()=>xmcfg("acesso");
const xpbL=k=>xpbC()[k]||[];
const xpbHoje=()=>hojeIso();
const XPB_VERSAO="V41";
/* --- erros do sistema e indicador de gravação (464, 467, 468) --- */
const XPB={errGrav:0,ultErro:null,ultOk:null};
function xpbErros(){try{return JSON.parse(localStorage.getItem("hiro_err")||"[]")}catch(e){return[]}}
function xpbRegErro(msg,stack){try{const L=xpbErros();L.push({t:new Date().toISOString(),msg:String(msg).slice(0,300),stack:String(stack||"").split("\n").slice(0,3).join(" | ").slice(0,300),rota:typeof ROUTE!=="undefined"?ROUTE:"",v:XPB_VERSAO});localStorage.setItem("hiro_err",JSON.stringify(L.slice(-50)))}catch(e){}}
if(typeof window!=="undefined"&&!window.__xpbErr){window.__xpbErr=1;
  window.addEventListener("error",e=>{if(/ResizeObserver/.test(e.message||""))return;xpbRegErro(e.message,e.error&&e.error.stack);XPB.ultErro=Date.now();xpbPilula()});
  window.addEventListener("unhandledrejection",e=>{xpbRegErro((e.reason&&e.reason.message)||e.reason,e.reason&&e.reason.stack);XPB.ultErro=Date.now();xpbPilula()});
  window.addEventListener("online",()=>xpbPilula());window.addEventListener("offline",()=>xpbPilula())}
const _toastP=toast;
toast=function(msg,err){try{if(err&&/Não foi possível (salvar|excluir)/.test(String(msg))){XPB.errGrav++;XPB.ultErro=Date.now();xpbRegErro(String(msg));xpbPilula()}}catch(e){}return _toastP.apply(this,arguments)};
function xpbPilula(){
  let p=document.getElementById("xpbpil");if(!p){p=document.createElement("div");p.id="xpbpil";p.style.cssText="position:fixed;left:8px;bottom:8px;z-index:900;font-size:12px;padding:3px 9px;border-radius:12px;background:#fff;border:1px solid #ccc;cursor:pointer;opacity:.9";p.onclick=()=>{if(ACC.gestor){XM.sec.acesso="saude";go("acesso")}};document.body.appendChild(p)}
  const off=typeof navigator!=="undefined"&&navigator.onLine===false,erro=XPB.errGrav>0;
  p.style.color=erro?"#c62828":off?"#b26a00":"#2e7d32";p.textContent=erro?"● Erro ao salvar — toque para ver":off?"● Sem conexão":"● Conectado";p.title=erro?`${XPB.errGrav} erro(s) de gravação nesta sessão`:"Os dados são gravados na hora, quando há conexão.";
}
setTimeout(xpbPilula,1500);
/* --- saúde do sistema (480) --- */
function xpbContagem(){const d=bkpDados();return Object.entries(d.colecoes).map(([c,o])=>[c,Object.keys(o).length,JSON.stringify(o).length]).filter(x=>x[1])}
xmReg("acesso","saude","Sistema","Saúde do sistema",()=>{
  const C=xpbContagem(),tam=C.reduce((s,x)=>s+x[2],0),b=(cfgG().backup)||{},dias=b.ultimo?-xDias(b.ultimo.slice(0,10)):null,E=xpbErros();
  const mb=n=>(n/1048576).toFixed(2).replace(".",",")+" MB",situ=(ok,t)=>`<span class="pill ${ok?"s-ok":"s-urgente"}">${t}</span>`;
  return f6Card("Situação agora","",f6Tbl(["Item","Situação"],[
   `<tr><td>Armazenamento de dados</td><td>${situ(!!RT.db,RT.db?"conectado":"sem armazenamento (nada é salvo)")}</td></tr>`+
   `<tr><td>Conexão com a internet</td><td>${situ(navigator.onLine!==false,navigator.onLine!==false?"online":"offline")}</td></tr>`+
   `<tr><td>Erros ao gravar nesta sessão</td><td>${situ(!XPB.errGrav,String(XPB.errGrav))}</td></tr>`+
   `<tr><td>Último backup</td><td>${situ(dias!=null&&dias<=7,b.ultimo?brDate(b.ultimo.slice(0,10))+" ("+dias+" dia(s))":"nunca")}</td></tr>`+
   `<tr><td>Erros do sistema registrados (últimos 50)</td><td>${situ(!E.length,String(E.length))}</td></tr>`+
   `<tr><td>Volume de dados</td><td>${C.reduce((s,x)=>s+x[1],0)} registros · ${mb(tam)}</td></tr>`+
   `<tr><td>Versão</td><td>${XPB_VERSAO}</td></tr>`],"txt"))+
   f6Card("Registros por coleção","",f6Tbl(["Coleção","Registros","Tamanho"],[C.sort((a,b)=>b[2]-a[2]).map(x=>`<tr><td>${f6Esc(x[0])}</td><td class="n">${x[1]}</td><td class="n">${mb(x[2])}</td></tr>`).join("")],"txt")+`<p class="sub">O armazenamento de arquivos (fotos e PDFs) aparece na aba “Armazenamento”.</p>`);
},()=>{});
xmUrg(()=>{if(!ACC.gestor)return[];const b=(cfgG().backup)||{},dias=b.ultimo?-xDias(b.ultimo.slice(0,10)):999,lim=+(xpbC().backupDias||7);return dias>lim?[{nivel:dias>30?3:2,tipo:"Backup",titulo:b.ultimo?`Faz ${dias} dias que não há backup`:"Nenhum backup foi feito ainda",detalhe:"Usuários e permissões → Backup",quando:null,rota:"acesso"}]:[]});
xmReg("acesso","erros","Sistema","Erros do sistema",()=>{const E=xpbErros().slice().reverse();return f6Card("Registro de erros","Erros técnicos capturados neste navegador. Se algo falhou, copie o relatório e envie a quem presta suporte. O envio não é automático.",(E.length?f6Tbl(["Quando","Tela","Erro"],[E.map(e=>`<tr><td class="n">${new Date(e.t).toLocaleString("pt-BR")}</td><td>${f6Esc(e.rota)}</td><td>${f6Esc(e.msg)}<div class="sub">${f6Esc(e.stack)}</div></td></tr>`).join("")],"txt"):'<div class="empty">Nenhum erro registrado.</div>')+`<div class="row" style="margin-top:8px"><button class="b sm" id="xpbec">Copiar relatório para o suporte</button><button class="b sec sm" id="xpbel">Limpar registro</button></div>`)},()=>{
  const c=$("xpbec");if(c)c.onclick=async()=>{const t=`Casa Hiro ${XPB_VERSAO} — relatório de erros (${new Date().toLocaleString("pt-BR")})\nNavegador: ${navigator.userAgent}\n\n`+xpbErros().map(e=>`${e.t} [${e.rota}] ${e.msg} :: ${e.stack}`).join("\n");try{await navigator.clipboard.writeText(t);toast("Relatório copiado.")}catch(e){await saveFile("erros-casa-hiro.txt",new Blob([t],{type:"text/plain"}))}};
  const l=$("xpbel");if(l)l.onclick=()=>{try{localStorage.removeItem("hiro_err")}catch(e){}XPB.errGrav=0;xpbPilula();xmGo()}});
/* --- backup: lembrete, locais, teste de restauração, pontos de restauração (456–459) --- */
const xpbLoc=xmRegistro({mod:"acesso",key:"bkplocais",titulo:"Onde guardei os backups",sub:"Guarde cópias em mais de um lugar (computador, pen-drive, nuvem, outra pessoa de confiança). Registre aqui cada cópia feita.",novo:"Registrar cópia",campos:[{k:"data",l:"Data do backup",t:"date",d:xpbHoje},{k:"local",l:"Onde foi guardado",list:["Computador da administração","Pen-drive","Nuvem (Drive/OneDrive)","HD externo","Com a direção"]},{k:"obs",l:"Observações"}],ok:v=>v.local.trim()?null:"Informe onde foi guardado.",cols:[[x=>brDate(x.data),"Data","n"],[x=>f6Esc(x.local),"Local"],[x=>f6Esc(x.obs||""),"Obs."]]});
const xpbTst=xmRegistro({mod:"acesso",key:"bkptestes",titulo:"Testes de restauração",sub:"Um backup só vale se der para restaurar. A cada 90 dias, abra um backup na área de verificação acima e registre o resultado.",novo:"Registrar teste",campos:[{k:"data",l:"Data do teste",t:"date",d:xpbHoje},{k:"res",l:"Resultado",t:"select",opts:["Deu certo","Deu problema"]},{k:"obs",l:"Observações"}],ok:v=>v.data?null:"Informe a data.",cols:[[x=>brDate(x.data),"Data","n"],[x=>x.res==="Deu certo"?'<span class="pill s-ok">deu certo</span>':'<span class="pill s-urgente">problema</span>',"Resultado"],[x=>f6Esc(x.obs||""),"Obs."]]});
xmUrg(()=>{if(!ACC.gestor)return[];const t=xpbL("bkptestes").filter(x=>x.res==="Deu certo").map(x=>x.data).sort().pop();return(!t||daysBetweenIso(t,xpbHoje())>100)&&Object.keys(S.integrantes).length?[{nivel:1,tipo:"Backup",titulo:"Faça um teste de restauração do backup",detalhe:t?"Último teste em "+brDate(t):"Nunca testado",quando:null,rota:"acesso"}]:[]});
/* pontos de restauração locais (IndexedDB) */
const xpbIdb=()=>new Promise((ok,er)=>{try{const r=indexedDB.open("hiro_pontos",1);r.onupgradeneeded=()=>r.result.createObjectStore("p",{keyPath:"id"});r.onsuccess=()=>ok(r.result);r.onerror=()=>er(r.error)}catch(e){er(e)}});
const xpbTx=async(modo,fn)=>{const db=await xpbIdb();return new Promise((ok,er)=>{const t=db.transaction("p",modo),s=t.objectStore("p"),q=fn(s);t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>er(t.error)})};
async function xpbSnap(rotulo){
  const json=JSON.stringify(bkpDados());let dado=json,gz=false;
  try{if(typeof CompressionStream!=="undefined"){dado=await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).blob();gz=true}}catch(e){dado=json}
  await xpbTx("readwrite",s=>s.put({id:new Date().toISOString(),rotulo:rotulo||"manual",gz,dado,n:Object.values(bkpDados().colecoes).reduce((a,o)=>a+Object.keys(o).length,0),dia:xpbHoje()}));
  const L=await xpbPontos();for(const p of L.slice(14))await xpbTx("readwrite",s=>s.delete(p.id));
}
async function xpbPontos(){const L=await xpbTx("readonly",s=>s.getAll());return(L||[]).sort((a,b)=>b.id.localeCompare(a.id))}
async function xpbTexto(p){return p.gz?await new Response(p.dado.stream().pipeThrough(new DecompressionStream("gzip"))).text():p.dado}
async function xpbAuto(){try{if(!ACC.gestor||!RT.db||estadoAcesso()!=="ok"||typeof indexedDB==="undefined")return;const L=await xpbPontos();if(L[0]&&L[0].dia===xpbHoje())return;await xpbSnap("automático")}catch(e){}}
const _regP=registrarEntrada;
registrarEntrada=function(){const a=_entrou;_regP.apply(this,arguments);if(!a&&_entrou)setTimeout(xpbAuto,8000)};
xmReg("acesso","backup2","Sistema","Backups, pontos de restauração e testes",()=>f6Card("Frequência do lembrete",`O aviso de backup aparece nas urgências quando passam mais dias que o limite. Backup totalmente automático para fora do navegador não é possível sem servidor.`,`<div class="row" style="align-items:flex-end"><div><label>Avisar após quantos dias sem backup</label><input type="number" id="xpbbd" value="${+(xpbC().backupDias||7)}" min="1" style="width:90px"></div><button class="b sec sm" id="xpbbs">Salvar</button></div>`)+
  f6Card("Verificar um arquivo de backup","Abre o arquivo e confere se está íntegro, comparando com os dados de hoje. Não restaura nada.",`<input type="file" id="xpbvf" accept=".json,.zip"><div id="xpbvr" class="sub" style="margin-top:8px"></div>`)+
  f6Card("Pontos de restauração neste aparelho","O sistema guarda uma cópia por dia (até 14) no próprio navegador, quando o gestor abre o sistema. Servem para voltar no tempo depois de um erro. <b>Ficam só neste aparelho/navegador</b>: não substituem o backup guardado fora.",`<div class="row"><button class="b sm" id="xpbsn">Criar ponto agora</button></div><div id="xpbpl" class="sub" style="margin-top:8px">Carregando…</div>`)+xpbLoc()+xpbTst(),async()=>{
  const s=$("xpbbs");if(s)s.onclick=()=>{xmsave("acesso",{backupDias:Math.max(1,+$("xpbbd").value||7)});toast("Salvo.")};
  $("xpbvf").onchange=async()=>{const f=$("xpbvf").files[0],o=$("xpbvr");if(!f)return;try{let d;if(/\.zip$/i.test(f.name)){const z=await JSZip.loadAsync(await f.arrayBuffer());d=JSON.parse(await z.file("dados.json").async("string"))}else d=JSON.parse(await f.text());if(d.sistema!=="Casa Hiro"||!d.colecoes)throw new Error("não é um backup da Casa Hiro");
    const hoje=bkpDados().colecoes,L=Object.entries(d.colecoes).map(([c,r])=>[c,Object.keys(r).length,Object.keys(hoje[c]||{}).length]).filter(x=>x[1]||x[2]);
    o.innerHTML=`<b style="color:#2e7d32">Arquivo íntegro.</b> Gerado em ${d.gerado?brDate(d.gerado.slice(0,10)):"?"}.`+f6Tbl(["Coleção","No backup","Hoje"],[L.map(x=>`<tr><td>${f6Esc(x[0])}</td><td class="n">${x[1]}</td><td class="n">${x[2]}</td></tr>`).join("")],"txt")}catch(e){o.innerHTML=`<b style="color:#c62828">Arquivo com problema:</b> ${f6Esc(e.message)}`}};
  const lista=async()=>{const box=$("xpbpl");if(!box)return;try{const L=await xpbPontos();box.innerHTML=L.length?f6Tbl(["Quando","Tipo","Registros",""],[L.map(p=>`<tr><td>${new Date(p.id).toLocaleString("pt-BR")}</td><td>${f6Esc(p.rotulo)}</td><td class="n">${p.n}</td><td><button class="b sec sm" data-xpbrs="${f6Esc(p.id)}">Restaurar</button></td></tr>`).join("")],"txt"):"Nenhum ponto ainda.";
    box.querySelectorAll("[data-xpbrs]").forEach(b=>b.onclick=async()=>{const p=(await xpbPontos()).find(x=>x.id===b.dataset.xpbrs);if(p)await bkpRestaurar(new File([await xpbTexto(p)],"ponto.json"))})}catch(e){box.textContent="O navegador não permite guardar pontos de restauração aqui."}};
  $("xpbsn").onclick=async()=>{try{await xpbSnap("manual");toast("Ponto criado.");lista()}catch(e){toast("Não foi possível criar o ponto: "+e.message,true)}};
  lista()});
/* --- exportação completa em formato aberto (460) --- */
xmReg("acesso","exporta","Sistema","Exportar tudo em planilhas abertas",()=>f6Card("Seus dados, sem depender deste sistema","Gera um ZIP com um arquivo CSV (abre em qualquer planilha) para cada tabela principal. Para uma cópia completa que o sistema consiga restaurar, use o backup em .json.",`<button class="b sm" id="xpbcsv">Baixar ZIP de planilhas (CSV)</button> <button class="b sec sm" id="xpbjs">Baixar tudo em JSON</button>`),()=>{
  $("xpbjs").onclick=()=>bkpBaixar(false);
  $("xpbcsv").onclick=async()=>{try{if(typeof JSZip==="undefined")throw new Error("biblioteca de ZIP não carregou");const z=new JSZip(),cel=v=>{v=v==null?"":(typeof v==="object"?JSON.stringify(v):String(v));return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    Object.entries(XQ_FONTES).forEach(([k,F])=>{const cols=Object.keys(F[2]),rows=F[1]().map(x=>cols.map(c=>F[2][c][1](x)));z.file(safe(F[0])+".csv","﻿"+[cols.map(c=>F[2][c][0]),...rows].map(r=>r.map(cel).join(";")).join("\r\n"))});
    z.file("LEIA-ME.txt","Exportação da Casa Hiro em "+xpbHoje()+". Cada CSV usa ponto e vírgula como separador e UTF-8.");
    await saveFile("casa-hiro-planilhas-"+xpbHoje()+".zip",await z.generateAsync({type:"blob",compression:"DEFLATE"}));toast("Arquivo gerado.")}catch(e){toast(e.message,true)}}});
/* --- modo treinamento com dados de demonstração (470, 471) --- */
const XT={on:false};
const _putT=put,_delT=del,_audT=audit;
put=function(col,id,obj){if(!XT.on)return _putT.apply(this,arguments);if(!escritaOk(col,id)){negado("alterar "+col);return}S[col][id]={...obj,id}};
del=function(col,id){if(!XT.on)return _delT.apply(this,arguments);if(!escritaOk(col,id)){negado("excluir em "+col);return}delete S[col][id]};
audit=function(){if(XT.on)return;return _audT.apply(this,arguments)};
function xpbBarraTreino(){let b=document.getElementById("xpbtrn");if(!XT.on){if(b)b.remove();return}if(!b){b=document.createElement("div");b.id="xpbtrn";b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9998;background:#1a4fa0;color:#fff;padding:6px 12px;text-align:center;font-size:14px";document.body.appendChild(b)}b.innerHTML=`MODO TREINAMENTO — nada do que você fizer é salvo. <button class="b sm" id="xpbtx" style="background:#fff;color:#1a4fa0">Sair e voltar aos dados reais</button>`;b.querySelector("#xpbtx").onclick=()=>location.reload()}
function xpbDemo(){
  const h=xpbHoje(),R=[["Maria Aparecida (demo)","1",1],["José Carlos (demo)","2",2],["Ana Lúcia (demo)","3",1],["Antônio Pereira (demo)","4",3],["Helena Souza (demo)","5",2],["Roberto Lima (demo)","6",2]];
  resSave([...resAll(),...R.map(([n,q,g],i)=>({id:"dm"+i,nome:n,quarto:q,grau:g,sit:"Ativo",entrada:addMesesIso(h,-3*(i+1)),nasc:(1935+i*2)+"-0"+(i+1)+"-1"+i,mensalidade:4500+i*300,diaVenc:10,resp:{nome:"Familiar de "+n.split(" ")[0],tel:"(11) 90000-000"+i},alergias:i===2?"dipirona":""}))]);
  ["Camila Torres","Bruno Alves","Paula Mendes","Lucas Rocha","Sônia Prado"].forEach((n,i)=>put("integrantes","dmc"+i,{id:"dmc"+i,nomeCompleto:n+" (demo)",cargo:["Técnica de enfermagem","Cuidadora","Cozinheira","Auxiliar de limpeza","Enfermeira"][i],admissao:addMesesIso(h,-8*(i+1)),nascimento:"199"+i+h.slice(4),situacao:"Ativo"}));
  tarMutate(a=>[...a,{id:"dmt1",titulo:"Reunião de equipe (demo)",data:h,hora:"14:00",prio:"normal",resp:"dmc4",area:"Administrativo",status:"aberta"},{id:"dmt2",titulo:"Conferir validade da farmácia (demo)",data:addDaysIso(h,-2),prio:"alta",resp:"dmc0",area:"Enfermagem",status:"aberta"}]);
  finMutate(a=>[...a,{id:"dmf1",tipo:"pagar",desc:"Mercado (demo)",contra:"Mercado Demo",cat:"Alimentação",valor:3200,venc:addDaysIso(h,3),pago:null},{id:"dmf2",tipo:"receber",desc:"Mensalidade — Maria Aparecida (demo)",contra:"Maria Aparecida (demo)",cat:"Mensalidades",valor:4500,venc:addDaysIso(h,-1),pago:null}]);
}
xmReg("acesso","treino","Sistema","Modo treinamento e dados de demonstração",()=>f6Card("Treine sem risco","No modo treinamento, tudo o que for digitado vale só até fechar ou recarregar a página: <b>nenhum dado real é alterado</b>. Dá para carregar dados de exemplo (nomes fictícios marcados como “demo”) para ensinar a equipe. Arquivos enviados (fotos/PDF) ainda seriam gravados de verdade: evite enviar arquivos no treinamento.",XT.on?`<button class="b sm" id="xpbdm">Carregar dados de demonstração</button>`:`<button class="b" id="xpbtr">Entrar no modo treinamento</button>`),()=>{
  const t=$("xpbtr");if(t)t.onclick=async()=>{if(!await askConfirm("Entrar no modo treinamento? Nada que você fizer será salvo até sair.","Entrar"))return;XT.on=true;xpbBarraTreino();go("acesso",true)};
  const d=$("xpbdm");if(d)d.onclick=()=>{xpbDemo();toast("Dados de demonstração carregados (só nesta sessão).")}});
/* --- novidades da versão (469) --- */
const XPB_NOVID=["Integrantes: crie o integrante com o nome e solte todos os documentos de uma vez. O sistema lê cada um, renomeia no padrão NOME DO DOCUMENTO - NOME DO INTEGRANTE (ex.: RG - Ana Paula Souza), transforma as fotos em PDF (frente e verso juntos, bem menores) preenche o cadastro com os dados lidos e mostra, assim que o arquivo entra, qual documento é e se é frente, verso ou frente e verso. Os dados lidos (CPF, RG, nascimento, mãe e pai, título, PIS, CTPS, endereço, estado civil) vão para a aba Dados, os filhos entram como dependentes, e o botão “Ler dados dos documentos” relê o que já foi enviado. Também há um link para o integrante enviar a própria documentação (na versão hospedada).","Escala no modelo da casa (D/N/F/FE, cobertura 24h, resumo do mês) com até 8 pessoas por folha, aviso de dias pares/ímpares e Teste de escala em tempo real.","Escalas: meta de folgas no mês por pessoa e filtros por período, cargo, escala e turno.","RH: importação do relógio com prévia e desfazer, painel do dia, folha prévia, benefícios, reajuste em lote, matriz de treinamento, recrutamento e comunicados com ciência.","Residentes: família, contatos, visitas, saídas, termos e ex-residentes.","Prontuário: modelos de evolução, sinais vitais, escalas clínicas, feridas, vacinas e passagem de plantão.","Medicação: mapa por turno, SOS, controlados, interações e estoque por residente.","Rotina: atividades, cardápio, mural, rondas, banho e ocorrências.","Ponto e escalas: conformidade CLT, ajustes com aprovação, trocas, pontes e grade de escala.","Integrantes, prestadores, estoque e notas fiscais com muitos recursos novos.","Agenda: visão do dia/semana, kanban, lembretes, reservas e arquivo para Google Agenda.","Documentos: biblioteca com versões, POPs com leitura confirmada e pasta de fiscalização.","Contabilidade: checklist mensal, DFC, DRE mês a mês, livro caixa e informe aos residentes.","Relatórios: painel do gestor com metas, construtor de relatórios e relatório da diretoria.","Início: resumo do dia, central de avisos, sugestões e atalhos.","Acessos: ações sensíveis por perfil, LGPD, simulação de perfil e modo treinamento."];
function xpbNovidades(forca){
  let vis="";try{vis=localStorage.getItem("hiro_ver")||""}catch(e){}
  if(!forca&&vis===XPB_VERSAO)return;if(!forca&&document.querySelector(".ov")){setTimeout(()=>xpbNovidades(false),8000);return}
  const ov=openModal(`<h3>Novidades da versão ${XPB_VERSAO}</h3><ul style="margin:8px 0 8px 18px">${XPB_NOVID.map(n=>`<li style="margin:3px 0">${f6Esc(n)}</li>`).join("")}</ul><p class="sub">Procure por “Mais recursos desta tela” no fim de cada tela.</p><div style="text-align:right"><button class="b" id="xpbnv">Entendi</button></div>`);
  ov.querySelector("#xpbnv").onclick=()=>{try{localStorage.setItem("hiro_ver",XPB_VERSAO)}catch(e){}ov.remove()};
}
const _regN=registrarEntrada;
registrarEntrada=function(){const a=_entrou;_regN.apply(this,arguments);if(!a&&_entrou)setTimeout(()=>xpbNovidades(false),2500)};
xmReg("home","novidades","Participação","Novidades desta versão",()=>f6Card("Novidades da versão "+XPB_VERSAO,"",`<ul style="margin-left:18px">${XPB_NOVID.map(n=>`<li style="margin:3px 0">${f6Esc(n)}</li>`).join("")}</ul>`),()=>{});
/* --- integrações: o que existe e o que não é possível (472–479) --- */
xmReg("acesso","integr","Sistema","Integrações: o que existe",()=>f6Card("Situação das integrações","Este sistema roda no navegador, sem servidor próprio. Por isso integrações que exigem servidor, chaves de acesso ou envio automático não são possíveis aqui. Veja o que já existe e o caminho alternativo.",f6Tbl(["Integração","Situação","Como fazer hoje"],[[
 ["E-mail","Parcial","Botões abrem o e-mail do seu aparelho com a mensagem pronta (mailto). Sem envio automático."],
 ["WhatsApp oficial (API)","Não é possível","Links wa.me abrem a conversa com o texto pronto; você toca em enviar."],
 ["Banco (extrato automático)","Não é possível","Importe o arquivo OFX/CSV do banco em Contas → Conciliação."],
 ["SEFAZ / notas fiscais","Não é possível","Cole a chave de acesso ou o link do QR Code para abrir a consulta; importe XML das notas."],
 ["Relógio de ponto em tempo real","Não é possível","Importe o arquivo AFD/CSV do relógio em Ponto eletrônico."],
 ["Folha / contador","Parcial","Pacote mensal e exportação de lançamentos em CSV (Contabilidade → Exportar lançamentos)."],
 ["Google Agenda","Parcial","Arquivo .ics (Agenda → Exportar para Google Agenda). Sem sincronização contínua."],
 ["API para outros sistemas","Não é possível","Exportação em JSON e CSV (Usuários e permissões → Exportar tudo)."]
].map(x=>`<tr><td>${x[0]}</td><td><span class="pill ${x[1]==="Parcial"?"s-pendencia":"s-urgente"}">${x[1]}</span></td><td>${x[2]}</td></tr>`).join("")],"txt")),()=>{});
xmReg("acesso","offline","Sistema","Funcionamento offline e conflitos",()=>f6Card("Sem internet e edições simultâneas","",`<p><b>Offline:</b> o sistema precisa de conexão para carregar e gravar. Se a conexão cair, o indicador no canto da tela avisa e a gravação que falhar aparece como erro: refaça quando voltar. Instalar como aplicativo e funcionar sem rede não é possível nesta hospedagem.</p><p><b>Edição simultânea:</b> quando duas pessoas alteram o mesmo registro, vale a última gravação; o sistema avisa quando alguém mexeu no mesmo item e o histórico de alterações permite desfazer (Ctrl+Z).</p>`),()=>{});


/* >>> x_m18.js */
