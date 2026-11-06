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
const OC={atestado:"Atestado médico",falta_justificada:"Falta justificada",esquecimento:"Esquecimento de ponto",outro:"Outro registro"};
const STL={ok:"OK",falta:"Falta",pendencia:"Pendência",atestado:"Atestado",justificada:"Justificada",esquecido:"Ponto esquecido",sem_escala:"Sem escala",feriado:"Feriado"};
const FLAG_LABEL={tolerancia_art58:"tolerância art. 58",trabalhou_feriado:"trabalhou no feriado",multiplos_periodos:"múltiplos períodos",intervalo_preassinalado:"intervalo descontado",justificar:"a justificar",falta_saida:"falta marcação de saída",falta_entrada:"falta marcação de entrada",falta_pontual:"marcação pontual ausente",escala_lancada:"escala lançada manualmente"};

