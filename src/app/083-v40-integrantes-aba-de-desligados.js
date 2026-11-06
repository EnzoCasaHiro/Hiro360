/* ===== V40 · Integrantes: aba de Desligados (prefixo xdz) =====
   "Excluir" apagava de vez, mas o relógio recriava a pessoa ao importar de novo. Agora o caminho normal é
   Desligar: a pessoa sai das listas, da escala e do ponto e fica na aba Desligados, de onde pode voltar. */
function xdzPedeData(i){return new Promise(res=>{
  const ov=openModal(`<h3>Desligar ${esc(nomeInteg(i))}</h3><p class="sub">A pessoa sai das escalas e do ponto depois dessa data e passa para a aba <b>Desligados</b>. Os documentos e o histórico ficam guardados.</p>
   <label>Data do desligamento</label><input type="date" id="xdzd" value="${i.desligamento||hojeIso()}">
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="xdzn">Cancelar</button><button class="b" id="xdzs">Desligar</button></div>`);
  ov.querySelector("#xdzn").onclick=()=>{ov.remove();res(null)};
  ov.querySelector("#xdzs").onclick=()=>{const v=ov.querySelector("#xdzd").value;if(!v){toast("Informe a data.",true);return}ov.remove();res(v)};
})}
const xdzFDados0=fDados;
fDados=function(i){
  let h=xdzFDados0.apply(this,arguments);
  const deslig=(i.situacao||"Ativo")==="Desligado";
  const novo=deslig
    ?`<button class="b" id="xdzreat" style="flex:none">Reativar integrante</button><button class="b sec" id="ddel" style="flex:none">${ic("trash")} Excluir definitivamente</button>`
    :`<button class="b sec" id="xdzdes" style="flex:none">Desligar integrante</button>`;
  const re=/<button class="b sec" id="ddel"[^>]*>[\s\S]*?<\/button>/;
  return re.test(h)?h.replace(re,novo):h;
};
const xdzBindPront0=bindPront;
bindPront=function(){
  xdzBindPront0.apply(this,arguments);
  document.querySelectorAll("[data-pab]").forEach(b=>b.onclick=()=>{PR.aba=b.dataset.pab;PR.sel=null;go("pront",true)});
  const i=PR.sel&&S.integrantes[PR.sel];if(!i)return;
  const des=document.getElementById("xdzdes"),rea=document.getElementById("xdzreat");
  if(des)des.onclick=async()=>{
    if(!podeEd("pront"))return toast("Você só pode consultar esta tela.",true);
    const d=await xdzPedeData(i);if(!d)return;
    put("integrantes",i.id,{...strip(i),situacao:"Desligado",desligamento:d});
    try{audit("Integrante desligado",nomeInteg(i)+" em "+d)}catch(e){}
    toast(nomeInteg(i)+" foi para a aba Desligados.");PR.sel=null;go("pront",true);
  };
  if(rea)rea.onclick=async()=>{
    if(!podeEd("pront"))return toast("Você só pode consultar esta tela.",true);
    if(!(await askConfirm("Reativar "+nomeInteg(i)+"? Ela volta para a lista de ativos e para as escalas.","Reativar")))return;
    const o={...strip(i),situacao:"Ativo"};delete o.desligamento;put("integrantes",i.id,o);
    try{audit("Integrante reativado",nomeInteg(i))}catch(e){}
    toast("Reativado.");PR.aba="ativos";PR.sel=i.id;go("pront",true);
  };
};


/* >>> x_m27.js */
