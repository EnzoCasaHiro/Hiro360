/* ================= persistência (db + assets) ================= */
const RT={db:null,assets:null,dl:null,user:null,sample:null,ready:false};
const S={integrantes:{},docs:{},ocorr:{},config:{},marcacoes:{},acessos:{},perfis:{},pedidos:{},nfarq:{},links:{}};
const DEF_TURNOS=[{no:1,nome:"Manhã e tarde com intervalo",texto:"08:00-12:00, 13:30-17:30"},{no:2,nome:"Diurno corrido",texto:"08:00-17:00"},{no:3,nome:"Noturno 12x36",texto:"19:00-07:00"}];
const DEF_EMP={razao:"Casa Hiro Residencial Sênior e Serviços de Saúde",cnpj:"",endereco:"R. Santos Dumont, 140 - Centro, Caraguatatuba - SP",telefone:"(12) 2122-5927",email:"contato@casahiro.com.br",site:"https://casahiro.com.br/"};
const cfgG=()=>S.config.geral||{};
const turnosList=()=>cfgG().turnos||DEF_TURNOS;
const empresa=()=>({...DEF_EMP,...(cfgG().empresa||{})});
let refreshT=null;
function refresh(){clearTimeout(refreshT);refreshT=setTimeout(()=>{const a=document.activeElement;if(a&&$("view").contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;go(ROUTE,true)},120)}
function put(col,id,obj){
  if(!dadosCarregados()){toast("Aguarde o sistema terminar de carregar os dados antes de salvar.",true);return}
  if(!escritaOk(col,id)){negado("alterar "+col);return}
  {const _b=XGUARD.map(f=>f(col,id,obj,S[col]&&S[col][id])).find(Boolean);if(_b){toast(_b,true);return}}
  S[col]=S[col]||{};
  if(!HIST.off.has(col))obj={...obj,_t:new Date().toISOString(),_u:ACC.uid||""};
  histRegistra(col,id,S[col][id],obj);
  S[col][id]={...obj,id};
  if(RT.db)RT.db.collection(col).doc(id).set(obj).catch(e=>toast("Não foi possível salvar: "+(e.message||e.code),true));
}
function del(col,id){
  if(!dadosCarregados()){toast("Aguarde o sistema terminar de carregar os dados antes de excluir.",true);return}
  if(!escritaOk(col,id)){negado("excluir em "+col);return}
  {const _b=XGUARD.map(f=>f(col,id,null,S[col]&&S[col][id])).find(Boolean);if(_b){toast(_b,true);return}}
  histRegistra(col,id,S[col][id],null);
  delete S[col][id];
  if(RT.db)RT.db.collection(col).doc(id).delete().catch(e=>toast("Não foi possível excluir: "+(e.message||e.code),true));
}
const CARREGADOS=new Set();
function dadosCarregados(){return !RT.db||CARREGADOS.size>=COLS_LEITURA().length}
function COLS_LEITURA(){return["integrantes","docs","ocorr","config","marcacoes","acessos","perfis","pedidos","nfarq",...Object.keys(XCOLS)]}
function strip(o){const c={...o};delete c.id;return c}
function saveCfg(patch){const c={...strip(cfgG()),...patch};put("config","geral",c)}
async function initRuntime(){
  try{
    if(window.HOST){await HOST.init(RT)}else{
    if(!window.claude||!claude.use)throw 0;
    RT.db=await claude.use("db");RT.assets=await claude.use("assets");RT.dl=await claude.use("downloads");try{RT.user=await claude.use("user")}catch(e){}try{RT.sample=await claude.use("sample")}catch(e){}}
  }catch(e){}
  await identificar();
  if(RT.db){
    for(const col of COLS_LEITURA()){
      RT.db.collection(col).onSnapshot(q=>{CARREGADOS.add(col);const _old=S[col];S[col]={};q.docs.forEach(d=>{const _n=S[col][d.id]={...d.data(),id:d.id};if(_old&&_old[d.id]&&_n._t&&_n._t!==_old[d.id]._t){nomesCache([_n._u]);avisaConflito(col,d.id,_n,_old[d.id])}});if(col==="config"){RT.cfgOk=true;nfJunta()}if(col==="acessos")RT.acOk=true;registrarEntrada();refresh()},e=>toast("Erro ao ler "+col+": "+(e.message||e.code),true));
    }
  }
  RT.ready=true;refresh();
}

