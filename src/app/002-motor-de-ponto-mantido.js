/* ================= motor de ponto (mantido) ================= */
function minutesBetween(a,b){return Math.round((b.getTime()-a.getTime())/60000)}
function fmtHHMM(m){const s=m<0?"-":"";m=Math.abs(m);return s+String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function isoDate(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function addDaysIso(iso,n){const[y,m,d]=iso.split("-").map(Number);return isoDate(new Date(y,m-1,d+n))}
function combine(iso,hm){const[y,mo,d]=iso.split("-").map(Number);const[h,mi]=hm.split(":").map(Number);return new Date(y,mo-1,d,h,mi,0,0)}
function addMinutes(dt,min){return new Date(dt.getTime()+min*60000)}
function truncateToMinute(dt){return new Date(dt.getFullYear(),dt.getMonth(),dt.getDate(),dt.getHours(),dt.getMinutes(),0,0)}
function pyWeekday(iso){const[y,m,d]=iso.split("-").map(Number);return(new Date(y,m-1,d).getDay()+6)%7}
function daysBetweenIso(a,b){const[y1,m1,d1]=a.split("-").map(Number),[y2,m2,d2]=b.split("-").map(Number);return Math.round((Date.UTC(y2,m2-1,d2)-Date.UTC(y1,m1-1,d1))/86400000)}
function localIso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0")}
function parseLocalIso(s){const[dp,tp]=s.split("T");const[y,mo,d]=dp.split("-").map(Number);const[h,mi,se]=(tp||"00:00:00").split(":").map(Number);return new Date(y,mo-1,d,h,mi,se||0)}
function scheduledOn(ig,iso){
  const modo=ig.escalaModo||"semana";
  if(modo==="par")return+iso.slice(8,10)%2===0;
  if(modo==="impar")return+iso.slice(8,10)%2===1;
  if(modo==="ciclo"){
    const ini=ig.cicloInicio||iso,trab=Math.max(1,+ig.cicloTrab||1),folga=Math.max(0,+ig.cicloFolga||0),ciclo=trab+folga;
    if(ciclo<=0)return false;
    const pos=((daysBetweenIso(ini,iso)%ciclo)+ciclo)%ciclo;return pos<trab;
  }
  return new Set(ig.dias||[0,1,2,3,4]).has(pyWeekday(iso));
}
const WD=["Se","Te","Qa","Qi","Sx","Sa","Do"];
