/* ================= utilidades ================= */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ic=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
const brDate=iso=>iso&&typeof iso==="string"?iso.split("-").reverse().join("/"):"";
const initials=n=>{const p=String(n||"?").trim().split(/\s+/);return((p[0]?.[0]||"")+(p[1]?.[0]||"")).toUpperCase()};
const uid8=()=>Math.random().toString(36).slice(2,10);
const safe=s=>String(s).replace(/[\\/:*?"<>|]+/g,"_").trim().slice(0,90)||"arquivo";
function toast(msg,bad){const t=document.createElement("div");if(bad)t.className="err";t.textContent=msg;$("toast").appendChild(t);setTimeout(()=>t.remove(),bad?6000:3200)}
function openModal(html){
  const ov=document.createElement("div");ov.className="ov";ov.innerHTML=`<div class="modal" role="dialog">${html}</div>`;
  ov.addEventListener("mousedown",e=>{if(e.target===ov)ov.remove()});document.body.appendChild(ov);mountSteppers(ov);return ov;
}
function mountSteppers(root){
  (root||document).querySelectorAll('input[type="number"]:not(.has-step), input[type="date"]:not(.has-step)').forEach(inp=>{
    inp.classList.add("has-step");
    const wrap=document.createElement("span");wrap.className="stepwrap";
    inp.parentNode.insertBefore(wrap,inp);wrap.appendChild(inp);
    const box=document.createElement("span");box.className="stepbtns";
    const mk=(txt,dir)=>{const b=document.createElement("button");b.type="button";b.className="stepbtn";b.textContent=txt;b.tabIndex=-1;
      b.onclick=()=>{const sp=+inp.step||1,n=Math.max(1,Math.round((+inp.dataset.stepby||sp)/sp));try{dir>0?inp.stepUp(n):inp.stepDown(n)}catch(e){};inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}))};
      return b;};
    box.appendChild(mk("▲",1));box.appendChild(mk("▼",-1));wrap.appendChild(box);
  });
}
function askConfirm(msg,okLabel="Confirmar"){
  return new Promise(res=>{
    const ov=openModal(`<h3>Confirmar</h3><p>${esc(msg)}</p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="b sec" id="cn">Cancelar</button><button class="b wood" id="cy">${esc(okLabel)}</button></div>`);
    ov.querySelector("#cn").onclick=()=>{ov.remove();res(false)};ov.querySelector("#cy").onclick=()=>{ov.remove();res(true)};
  });
}
function validCPF(v){
  v=String(v||"").replace(/\D/g,"");if(v.length!==11||/^(\d)\1+$/.test(v))return false;
  for(let t=9;t<11;t++){let s=0;for(let i=0;i<t;i++)s+=+v[i]*(t+1-i);if((s*10%11)%10!==+v[t])return false}
  return true;
}
const fmtCPF=v=>{v=String(v||"").replace(/\D/g,"");return v.length===11?v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4"):v};
const DEPTOS=["Administrativo","Cuidadores(a)","Enfermagem","Fisioterapia","Cozinheiras(o)","Aux de Limpeza","Recepção","Outro"];
const deptoClass=d=>/limpeza/i.test(d)?"d-limpeza":/cozinh/i.test(d)?"d-cozinha":/admin/i.test(d)?"d-admin":/recep/i.test(d)?"d-recepcao":/enferm|fisio|cuidad/i.test(d)?"":"d-outro";
const CATS=["Documentos pessoais","Contrato e admissão","ASO e exames","Atestados","Certificados e treinamentos","Outros"];
const OC={atestado:"Atestado médico",falta_justificada:"Falta justificada",esquecimento:"Esquecimento de ponto",outro:"Outro registro",falta_confirmada:"Falta sem justificativa (confirmada)",falta_compensada:"Falta compensada em outro dia"};
const OC_FALTA=new Set(["falta_confirmada","falta_compensada"]);
const STL={ok:"OK",falta:"Falta",pendencia:"Pendência",atestado:"Atestado",justificada:"Justificada",esquecido:"Ponto esquecido",sem_escala:"Sem escala",feriado:"Feriado",compensada:"Falta compensada"};
const FLAG_LABEL={falta_confirmada:"falta confirmada",compensa_falta:"compensa falta",tolerancia_art58:"tolerância art. 58",trabalhou_feriado:"trabalhou no feriado",multiplos_periodos:"múltiplos períodos",intervalo_preassinalado:"intervalo descontado",justificar:"a justificar",falta_saida:"falta marcação de saída",falta_entrada:"falta marcação de entrada",falta_pontual:"marcação pontual ausente",escala_lancada:"escala lançada manualmente"};
// ajustes feitos à mão (previsto/escala do dia) não aparecem como aviso na folha nem na tela do ponto; o histórico continua guardando quem mudou
const FLAG_OCULTA=new Set(["escala_lancada","previsto_manual"]);
const flagsVisiveis=r=>((r&&r.flags)||[]).filter(f=>!FLAG_OCULTA.has(f));

/* >>> periodo-ref */
/* Período de referência do ponto: do dia 26 do mês anterior ao dia 25 do mês.
   "2026-11" = 26/10/2026 a 25/11/2026. O dia 26 em diante já pertence ao mês seguinte. */
const PONTO_CORTE=25;
const refYmAdd=(ym,n)=>{const d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+n,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
const refIni=ym=>refYmAdd(ym,-1)+"-"+String(PONTO_CORTE+1).padStart(2,"0");
const refFim=ym=>ym+"-"+String(PONTO_CORTE).padStart(2,"0");
const refYm=iso=>{const s=String(iso||"").slice(0,10);return +s.slice(8,10)>PONTO_CORTE?refYmAdd(s.slice(0,7),1):s.slice(0,7)};
const refRotulo=ym=>{const a=refIni(ym),b=refFim(ym);return a.slice(8)+"/"+a.slice(5,7)+" a "+b.slice(8)+"/"+b.slice(5,7)+"/"+b.slice(0,4)};
/* ao abrir a tela: o período que está correndo; nos 5 primeiros dias depois do corte, ainda o que acabou de fechar */
const refPadrao=()=>{const h=hojeIso(),ym=refYm(h),dias=Math.round((new Date(h+"T12:00:00")-new Date(refIni(ym)+"T12:00:00"))/864e5);return dias<5?refYmAdd(ym,-1):ym};
/* <<< periodo-ref */
/* período escolhido nas telas do ponto (Ponto, Pendências, Fechamento): o mesmo em todas */
const PREF={ym:null};
const pontoRef=()=>PREF.ym||(PREF.ym=refPadrao());
function pontoPeriodoSel(){
  const ym=pontoRef(),hj=refYm(hojeIso()),meses=[];for(let k=1;k>=-12;k--)meses.push(refYmAdd(hj,k));if(!meses.includes(ym))meses.push(ym);
  return `<div class="row" style="align-items:flex-end;gap:8px;flex-wrap:wrap">
   <button type="button" class="b sec sm" data-prefmv="-1" title="Período anterior" style="flex:none">◀</button>
   <div style="flex:0 1 340px"><label>Período de referência</label><select data-prefsel>${meses.map(m=>`<option value="${m}" ${m===ym?"selected":""}>${MESES_PT[+m.slice(5)-1]} de ${m.slice(0,4)} · ${refRotulo(m)}</option>`).join("")}</select></div>
   <button type="button" class="b sec sm" data-prefmv="1" title="Próximo período" style="flex:none">▶</button></div>`;
}
function bindPontoPeriodo(depois){
  const muda=ym=>{PREF.ym=ym;POINT.custom=false;POINT.result=null;BHCACHE.clear();if(depois)depois();else go(ROUTE,true)};
  document.querySelectorAll("[data-prefsel]").forEach(s=>s.onchange=()=>muda(s.value));
  document.querySelectorAll("[data-prefmv]").forEach(b=>b.onclick=()=>muda(refYmAdd(pontoRef(),+b.dataset.prefmv)));
}
