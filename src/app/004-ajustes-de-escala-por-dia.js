/* ======================== ajustes de escala por dia (folga / escala lançada) ======================== */
const escalaEx=()=>[...((S.config.escalaEx&&S.config.escalaEx.itens)||[]),...Object.keys(S.config).filter(k=>/^esc_\d{4}$/.test(k)).flatMap(k=>S.config[k].itens||[])].sort((a,b)=>(a.em||"").localeCompare(b.em||""));
// ajustes antigos ficavam em um único documento; ao alterar, passam para um documento por ano
function escMigra(){
  const leg=(S.config.escalaEx&&S.config.escalaEx.itens)||[];if(!leg.length)return;
  const por={};leg.forEach(e=>{const y=e.de.slice(0,4);(por[y]=por[y]||[]).push(e)});
  Object.entries(por).forEach(([y,l])=>{const at=(S.config["esc_"+y]&&S.config["esc_"+y].itens)||[];put("config","esc_"+y,{itens:[...at,...l]})});
  put("config","escalaEx",{itens:[]});
}
function escMutate(fn){escMigra();mutaAno("esc_","de",escalaEx(),fn)}
function ajusteDe(igId,iso){
  const l=escalaEx();for(let k=l.length-1;k>=0;k--){const a=l[k];if(a.uid===igId&&a.de<=iso&&iso<=a.ate)return a}
  return null;
}
// diz se o integrante trabalha em `iso` e com qual turno, considerando admissão e ajustes lançados à mão
function escalaDia(ig,iso){
  const aj=ig.id?ajusteDe(ig.id,iso):null;
  if(aj){
    if(aj.tipo==="folga")return{on:false,turno:null,ajuste:aj};
    const t=+(aj.turno||igNaData(ig,iso).turno)||null;
    return{on:!!t,turno:t,ajuste:aj};
  }
  if(ig.admissao&&iso<ig.admissao)return{on:false,turno:null,ajuste:null,antes:true};
  if(ig.desligamento&&iso>ig.desligamento)return{on:false,turno:null,ajuste:null,depois:true};
  const g=igNaData(ig,iso);
  return{on:!!g.turno&&scheduledOn(g,iso),turno:g.turno?+g.turno:null,ajuste:null};
}
// escala que valia antes de uma mudança (ex.: 44h semanais até 22/10, depois 12x36): ig.escalaHist=[{ate,turno,escalaModo,dias,cicloTrab,cicloFolga,cicloInicio}]
const ESC_CAMPOS=["turno","escalaModo","dias","cicloTrab","cicloFolga","cicloInicio"];
function igNaData(ig,iso){
  const h=(ig&&ig.escalaHist)||[];if(!h.length)return ig;
  const v=h.filter(x=>x.ate&&iso<=x.ate).sort((a,b)=>a.ate.localeCompare(b.ate))[0];
  if(!v)return ig;const o={...ig};ESC_CAMPOS.forEach(k=>o[k]=v[k]);return o;
}
function escalaNome(g){
  if(!g||!g.turno)return"Sem escala";
  if(eh1236(g))return"12x36";
  if(g.escalaModo==="ciclo")return`Ciclo ${g.cicloTrab||1}x${g.cicloFolga??1}`;
  const t=turnosList().find(x=>String(x.no)===String(g.turno)),dias=(g.dias||[0,1,2,3,4]).slice().sort();
  const min=t?dias.reduce((s,w)=>{const r=shiftSummary((t.dias&&t.dias[w])||t.texto);return s+(r?r.min:0)},0):0;
  return(min?String(Math.round(min/6)/10).replace(".",",")+"h semanais":"Semanal")+" ("+dias.map(w=>WD_FULL[w].slice(0,3)).join(", ")+")";
}
// trechos do período com a mesma escala, para a folha de ponto mostrar as duas quando houve mudança
function escalasPeriodo(ig,de,ate){
  const out=[];if(!ig||!de||!ate)return out;
  for(let d=de;d<=ate;d=addDaysIso(d,1)){const n=escalaNome(igNaData(ig,d)),u=out[out.length-1];if(u&&u.nome===n)u.ate=d;else out.push({nome:n,de:d,ate:d})}
  return out;
}
function escalasTexto(ig,de,ate){
  const l=escalasPeriodo(ig,de,ate);
  return l.length<=1?(l[0]?l[0].nome:"—"):l.map(x=>`${x.nome} de ${brDate(x.de).slice(0,5)} a ${brDate(x.ate).slice(0,5)}`).join(" · ");
}
const ROW_RE=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*?)\s+(\d+)\s+(\d{4})[/-](\d{2})[/-](\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/;
function parseRawlog(text){
  const punches=[],divergences=[];
  for(const line of text.split(/\r\n|\r|\n/)){
    if(!line.trim())continue;
    const t=line.trimStart();
    if(t.toUpperCase().startsWith("UDISKLOG"))continue;
    if(t.startsWith("No")&&line.includes("UserId"))continue;
    const m=ROW_RE.exec(line);
    if(!m){divergences.push({kind:"linha_invalida",detail:line.slice(0,120)});continue}
    const[,seq,dev,uid,uname,verify,y,mo,d,hh,mi,ss]=m;
    const ts=new Date(+y,+mo-1,+d,+hh,+mi,+ss);
    if(isNaN(ts.getTime())){divergences.push({kind:"data_invalida",detail:line.slice(0,120)});continue}
    punches.push({seq:+seq,devId:+dev,userId:+uid,uname:uname.trim(),verify:+verify,ts});
  }
  const seen=new Set(),last=new Map();
  for(const p of punches){
    const k=p.devId+":"+p.seq;if(seen.has(k))divergences.push({kind:"seq_duplicado",detail:k});seen.add(k);
    const pv=last.get(p.devId);if(pv!==undefined&&p.seq>pv&&p.seq!==pv+1)divergences.push({kind:"lacuna_sequencial",detail:`${pv} -> ${p.seq}`});
    last.set(p.devId,Math.max(pv||0,p.seq));
  }
  return{punches,divergences};
}
function decodeFile(buf){
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buf)}
  catch(e){try{return new TextDecoder("windows-1252").decode(buf)}catch(e2){return new TextDecoder("iso-8859-1").decode(buf)}}
}
const OK="ok",FALTA="falta",PENDENCIA="pendencia",SEM_ESCALA="sem_escala",FERIADO="feriado";
const periodsFor=(sh,iso)=>sh.porDia[pyWeekday(iso)];
function shiftCrossesMidnight(sh,iso){return periodsFor(sh,iso).some(p=>p.end<=p.start)}
function expectedPeriods(iso,sh){
  const out=[];let prevEnd=null;
  for(const p of periodsFor(sh,iso)){
    let s=combine(iso,p.start),e=combine(iso,p.end);
    if(prevEnd!==null&&s<prevEnd){s=addMinutes(s,1440);e=addMinutes(e,1440)}
    if(e<=s)e=addMinutes(e,1440);
    out.push([s,e]);prevEnd=e;
  }
  return out;
}
function dedupe(punches,cfg){
  const sorted=[...punches].sort((a,b)=>a.ts-b.ts||String(a.rawId).localeCompare(String(b.rawId)));const kept=[],absorbed=[];
  for(const p of sorted){
    if(kept.length&&minutesBetween(kept[kept.length-1].ts,p.ts)<cfg.dupWindowMin){
      const head=kept[kept.length-1];
      if(cfg.dupKeep==="last"){absorbed.push({...head,dupOf:p.rawId});kept[kept.length-1]=p}
      else absorbed.push({...p,dupOf:head.rawId});
    }else kept.push(p);
  }
  return[kept,absorbed];
}
function distance(ts,s,e){if(s<=ts&&ts<=e)return 0;return Math.min(Math.abs(minutesBetween(ts,s)),Math.abs(minutesBetween(ts,e)))}
function sequentialPairs(ps){const pairs=[];for(let i=0;i+1<ps.length;i+=2)pairs.push([ps[i],ps[i+1]]);return[pairs,ps.length%2?ps[ps.length-1]:null]}
function slotTimes(per){const t=[];for(const[a,b] of per){t.push(a.getTime());t.push(b.getTime())}return t}
function bestSkipFit(punchMs,slotMs){
  // punchMs e slotMs já vêm em ordem cronológica; para cada hipótese de slot ausente,
  // mede o desvio total entre as marcações reais e os horários esperados restantes.
  let best=null;
  for(let skip=0;skip<slotMs.length;skip++){
    let dev=0,pi=0;
    for(let si=0;si<slotMs.length;si++){
      if(si===skip)continue;
      dev+=Math.abs(punchMs[pi]-slotMs[si]);pi++;
    }
    if(best===null||dev<best.dev)best={skip,dev};
  }
  return best?best.skip:null;
}
function slotLabel(idx,M){
  const k=Math.floor(idx/2),isStart=idx%2===0;
  if(M===1)return isStart?"a entrada":"a saída";
  if(k===0)return isStart?"a entrada":"a saída para o intervalo";
  if(k===M-1)return isStart?"a volta do intervalo":"a saída";
  return isStart?`a volta do intervalo ${k}`:`a saída para o intervalo ${k+1}`;
}
// tenta montar os pares assumindo que falta exatamente UMA marcação entre as esperadas do turno
// (ex.: esqueceu de bater a volta do almoço, mas bateu certinho a entrada, a saída do almoço e a saída final)
function fitWithOneMissing(ps,per){
  const M=per.length,slotMs=slotTimes(per),punchMs=ps.map(p=>p.ts.getTime());
  if(punchMs.length!==slotMs.length-1)return null;
  const skip=bestSkipFit(punchMs,slotMs);
  if(skip===null)return null;
  const assigned=new Array(slotMs.length).fill(null);
  let pi=0;for(let si=0;si<slotMs.length;si++){if(si===skip)continue;assigned[si]=ps[pi++]}
  const pairs=[];for(let k=0;k<M;k++){const a=assigned[2*k],b=assigned[2*k+1];if(a&&b)pairs.push([a,b])}
  return{pairs,missingLabel:slotLabel(skip,M),missingTime:new Date(slotMs[skip])};
}
function applyDeviations(j,expS,expE,fin,lout,cfg){
  const inD=minutesBetween(expS,fin),outD=minutesBetween(expE,lout);
  const within=Math.abs(inD)<=cfg.tolPerPunchMin&&Math.abs(outD)<=cfg.tolPerPunchMin&&Math.abs(inD)+Math.abs(outD)<=cfg.tolDailyMin;
  // dentro da tolerância: esses minutos não contam nem como atraso nem como extra (nem no banco de horas)
  if(within){if(inD||outD){j.flags.push("tolerancia_art58");j.tolMin=outD-inD}return}
  j.lateMin=Math.max(0,inD);j.earlyLeaveMin=Math.max(0,-outD);j.extraMin=Math.max(0,-inD)+Math.max(0,outD);
}
// saldo do dia para o banco de horas: trabalhado − previsto, tirando os minutos dentro da tolerância (CLT art. 58 §1º).
// Dia com marcação faltando (pendência) fica fora até ser resolvido: a conta com metade das batidas não vale.
function saldoDia(r){
  if(r.status===PENDENCIA)return 0;
  const d=(r.workedMin||0)-(r.expectedMin||0);
  if(r.flags&&r.flags.includes("previsto_manual"))return Math.abs(d)<=10?0:d;
  return r.status===OK?d-(r.tolMin||0):d;
}
// 60 min reais de trabalho noturno valem 68,57 min "computados" (hora de 52min30s). Em turno noturno (12x36 19h-7h, por exemplo)
// o que passa das 5h continua noturno — prorrogação (Súmula 60, II, do TST). Estimativa gerencial; o contador confirma.
function nightMinutes(intervals,prorrog){
  let real=0,pror=0;
  for(const[a,b]of intervals){
    if(!(b>a))continue;
    for(let k=0;k<=2;k++){
      const ws=new Date(a.getFullYear(),a.getMonth(),a.getDate()-1+k,22,0,0),we=new Date(a.getFullYear(),a.getMonth(),a.getDate()+k,5,0,0);
      const ini=Math.max(a,ws),fim=Math.min(b,we);
      if(fim>ini)real+=(fim-ini)/60000;
      if(prorrog&&a<we&&b>we&&b>ws)pror+=(Math.min(b,new Date(a.getFullYear(),a.getMonth(),a.getDate()+k,22,0,0))-we)/60000;
    }
  }
  real=Math.round(real);pror=Math.max(0,Math.round(pror));
  return{real:real+pror,pror,ficta:Math.round((real+pror)*60/52.5)};
}
function newJourney(day,status,shiftNo,extra){
  return Object.assign({day,status,shiftNo,intervals:[],workedMin:0,expectedMin:0,lateMin:0,earlyLeaveMin:0,extraMin:0,tolMin:0,feriadoMin:0,turnoNoturno:false,endsOn:null,rawIds:[],dupIds:[],flags:[]},extra||{});
}
const hm=t=>String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0");
function pairPunches(punches,schedule,cfg,holidays,until){
  const before=cfg.windowBeforeMin,after=cfg.windowAfterMin;
  const[kept,absorbed]=dedupe(punches.map(p=>({...p,ts:truncateToMinute(p.ts)})),cfg);
  const exp=new Map();for(const[d,sh]of schedule)if(sh)exp.set(d,expectedPeriods(d,sh));
  const buckets=new Map(),loose=[];
  for(const p of kept){
    const pIso=isoDate(p.ts);let best=null;
    for(const d of[addDaysIso(pIso,-1),pIso,addDaysIso(pIso,1)]){
      const per=exp.get(d);if(!per)continue;
      const s=per[0][0],e=per[per.length-1][1];
      if(addMinutes(s,-before)<=p.ts&&p.ts<=addMinutes(e,after)){
        const key=[distance(p.ts,s,e),s.getTime()];
        if(best===null||key[0]<best.key[0]||(key[0]===best.key[0]&&key[1]<best.key[1]))best={key,d};
      }
    }
    if(best){if(!buckets.has(best.d))buckets.set(best.d,[]);buckets.get(best.d).push(p)}else loose.push(p);
  }
  const journeys=[],pend=[];
  const absBy=new Map();for(const a of absorbed){if(!absBy.has(a.dupOf))absBy.set(a.dupOf,[]);absBy.get(a.dupOf).push(a.rawId)}
  for(const d of[...schedule.keys()].sort()){
    const sh=schedule.get(d);if(!sh||(until&&d>until))continue;
    const per=exp.get(d);
    const expectedMin=per.reduce((s,[a,b])=>s+minutesBetween(a,b),0);
    const noturno=shiftCrossesMidnight(sh,d)||isoDate(per[per.length-1][1])!==d;
    const endsOn=noturno?isoDate(per[per.length-1][1]):d;
    const ps=(buckets.get(d)||[]).sort((a,b)=>a.ts-b.ts);
    if(!ps.length){
      if(holidays.has(d))journeys.push(newJourney(d,FERIADO,sh.no,{expectedMin:0}));
      else{journeys.push(newJourney(d,FALTA,sh.no,{expectedMin,turnoNoturno:noturno,endsOn,flags:["justificar"]}));pend.push({day:d,kind:"falta",detail:"sem marcações em dia escalado"})}
      continue;
    }
    let pairs,orphan=null,missingLabel=null,strayPunch=null,missingTime=null;
    if(ps.length%2===1&&ps.length===2*per.length-1){
      const fit=fitWithOneMissing(ps,per);
      if(fit){pairs=fit.pairs;missingLabel=fit.missingLabel;missingTime=fit.missingTime;
        const paired=new Set(pairs.flat());strayPunch=ps.find(p=>!paired.has(p))||null;}
    }
    if(!pairs)[pairs,orphan]=sequentialPairs(ps);
    const j=newJourney(d,OK,sh.no,{expectedMin,turnoNoturno:noturno,endsOn,rawIds:ps.map(p=>p.rawId)});
    j.dupIds=ps.flatMap(p=>absBy.get(p.rawId)||[]);
    j.intervals=pairs.map(([a,b])=>[a.ts,b.ts]);
    j.workedMin=j.intervals.reduce((s,[a,b])=>s+minutesBetween(a,b),0);
    if(j.intervals.some(([a,b])=>isoDate(a)!==isoDate(b))){
      j.turnoNoturno=true;
      j.endsOn=j.intervals.reduce((mx,[,b])=>(isoDate(b)>mx?isoDate(b):mx),isoDate(j.intervals[0][1]));
    }
    if(!missingLabel&&(ps.length>4||pairs.length>per.length))j.flags.push("multiplos_periodos");
    if(!missingLabel&&cfg.deductPresetBreak&&pairs.length===1&&per.length>=2){
      const[a,b]=j.intervals[0];const[gs,ge]=[per[0][1],per[1][0]];
      if(a<=gs&&b>=ge){j.workedMin-=minutesBetween(gs,ge);j.flags.push("intervalo_preassinalado")}
    }
    if(holidays.has(d)&&j.workedMin>0){j.flags.push("trabalhou_feriado");j.feriadoMin=j.workedMin}
    if(missingLabel){
      j.status=PENDENCIA;j.flags.push("falta_pontual");
      const extra=strayPunch?` (bateu ${hm(strayPunch.ts)})`:"";
      pend.push({day:d,kind:"falta_pontual",detail:`esqueceu de bater ${missingLabel}${extra}`,sugereHora:hm(missingTime)});
    }else if(orphan){
      const nearStart=Math.abs(minutesBetween(orphan.ts,per[0][0]))<=Math.abs(minutesBetween(orphan.ts,per[per.length-1][1]));
      const kind=(pairs.length||nearStart)?"falta_saida":"falta_entrada";
      j.status=PENDENCIA;j.flags.push(kind);
      pend.push({day:d,kind,detail:`marcação ${hm(orphan.ts)} sem par`});
    }else if(pairs.length)applyDeviations(j,per[0][0],per[per.length-1][1],pairs[0][0].ts,pairs[pairs.length-1][1].ts,cfg);
    journeys.push(j);
  }
  const byDay=new Map();for(const p of loose){const d=isoDate(p.ts);if(!byDay.has(d))byDay.set(d,[]);byDay.get(d).push(p)}
  for(const d of[...byDay.keys()].sort()){
    if(until&&d>until)continue;
    const ps=byDay.get(d).sort((a,b)=>a.ts-b.ts);const[pairs,orphan]=sequentialPairs(ps);
    const ivs=pairs.map(([a,b])=>[a.ts,b.ts]);const w=ivs.reduce((s,[a,b])=>s+minutesBetween(a,b),0);
    const j=newJourney(d,SEM_ESCALA,null,{intervals:ivs,workedMin:w,extraMin:w,rawIds:ps.map(p=>p.rawId),endsOn:d});
    journeys.push(j);pend.push({day:d,kind:"marcacao_sem_escala",detail:`${ps.length} marcação(ões) sem escala`});
    if(orphan){j.flags.push("falta_saida");pend.push({day:d,kind:"falta_saida",detail:`marcação ${hm(orphan.ts)} sem par`})}
  }
  journeys.sort((a,b)=>a.day<b.day?-1:a.day>b.day?1:0);
  return{journeys,pendencies:pend,absorbed};
}

