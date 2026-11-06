/* ===== Bloco S (V38) · RH: folha, pessoas, recrutamento e treinamento ===== */
const xyP=()=>xmcfg("pront"),xyPL=k=>xyP()[k]||[],xyF=()=>xmcfg("contador"),xyFL=k=>xyF()[k]||[];
const xyHoje=()=>hojeIso(),xyQuem=()=>(typeof f4Quem==="function"&&f4Quem())||"";
const xyAtivos=()=>integList().filter(i=>(i.situacao||"Ativo")!=="Desligado");
const xyCOL={k:"col",l:"Integrante",t:"select",opts:xmColOpts};
const xyN=s=>estNorm(String(s||""));
const xyAddM=(iso,n)=>{const[y,m,d]=iso.split("-").map(Number);return isoDate(new Date(y,m-1+n,d))};
const xyMoney=v=>fmtBRL(+v||0);
const xySal=i=>+i.salario||0;
function xyReg(mod,key,grupo,label,o,pos){
  const f=xmRegistro({mod,key,titulo:o.titulo||label,sub:o.sub,novo:o.novo,campos:o.campos,ok:o.ok,cols:o.cols,extra:o.extra,acoes:o.acoes,filtro:o.filtro,rodape:o.rodape,topo:o.topo,anon:o.anon});
  const wrap=o.gestor?(h=>f4Gestor()?h:f6Card("Área restrita","",'<div class="empty">Somente o gestor vê esta área.</div>')):(h=>h);
  xmReg(mod,key,grupo,label,()=>wrap(f()+(pos?pos():"")),o.bind||(()=>{}));return f;
}
