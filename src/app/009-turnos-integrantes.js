/* ================= turnos / integrantes ================= */
const WD_FULL=["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
function parsePeriodsTexto(texto){
  return String(texto).split(",").map(c=>{
    const m=c.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if(!m)throw new Error(`período inválido '${c.trim()}'. Use 08:00-12:00, 13:30-17:30`);
    return{start:m[1].padStart(2,"0")+":"+m[2],end:m[3].padStart(2,"0")+":"+m[4]};
  });
}
function buildShifts(){
  const out=new Map();
  for(const t of turnosList()){
    const porDia={};
    for(let w=0;w<7;w++){
      const texto=(t.dias&&t.dias[w]!=null&&t.dias[w]!=="")?t.dias[w]:t.texto;
      try{porDia[w]=parsePeriodsTexto(texto)}
      catch(e){throw new Error(`Turno ${t.no} (${WD_FULL[w]}): ${e.message}`)}
    }
    out.set(+t.no,{no:+t.no,porDia,nome:t.nome,textoBase:t.texto});
  }
  return out;
}
function shiftSummary(texto){
  try{
    const periods=parsePeriodsTexto(texto);
    const sh={porDia:{0:periods,1:periods,2:periods,3:periods,4:periods,5:periods,6:periods}};
    const per=expectedPeriods("2026-01-05",sh);return{min:per.reduce((s,[a,b])=>s+minutesBetween(a,b),0),night:shiftCrossesMidnight(sh,"2026-01-05")};
  }catch(e){return null}
}
const integList=()=>Object.values(S.integrantes).sort((a,b)=>String(a.nomeCompleto||a.nome).localeCompare(String(b.nomeCompleto||b.nome),"pt"));
const semPonto=i=>!!i&&i.ponto==="nao";
const integByUid=u=>{const l=Object.values(S.integrantes).filter(i=>i.uid!=null&&+i.uid===+u);return l.find(i=>(i.situacao||"Ativo")!=="Desligado")||l[0]};
const nomeInteg=i=>i.nomeCompleto||i.nome||"(sem nome)";
const marcasOf=(uid,fromIso,toIso)=>Object.values(S.marcacoes).filter(m=>+m.uid===+uid&&!m.removida&&m.ts.slice(0,10)>=fromIso&&m.ts.slice(0,10)<=toIso).map(m=>({ts:parseLocalIso(m.ts),rawId:m.id}));
function importMarcas(punches){
  let novo=0;
  for(const p of punches){
    const id="r"+p.userId+"_"+localIso(p.ts).replace(/\D/g,"");
    if(!S.marcacoes[id]){put("marcacoes",id,{uid:p.userId,ts:localIso(p.ts),origem:"relogio",seq:p.seq,devId:p.devId,removida:false});novo++}
  }
  return novo;
}

