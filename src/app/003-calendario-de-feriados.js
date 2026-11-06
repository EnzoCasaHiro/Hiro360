/* ======================== calendário de feriados ======================== */
function pascoaMD(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),
    g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,
    l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),
    day=((h+l-7*m+114)%31)+1;
  return{month,day};
}
function nationalHolidays(year){
  const E=pascoaMD(year),easter=new Date(year,E.month-1,E.day);
  const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const I=d=>isoDate(d);
  return[
    [I(new Date(year,0,1)),"Confraternização Universal"],
    [I(add(easter,-47)),"Carnaval (segunda-feira)"],
    [I(add(easter,-46)),"Carnaval"],
    [I(add(easter,-2)),"Sexta-feira Santa"],
    [I(new Date(year,3,21)),"Tiradentes"],
    [I(new Date(year,4,1)),"Dia do Trabalho"],
    [I(add(easter,60)),"Corpus Christi"],
    [I(new Date(year,8,7)),"Independência do Brasil"],
    [I(new Date(year,9,12)),"Nossa Senhora Aparecida"],
    [I(new Date(year,10,2)),"Finados"],
    [I(new Date(year,10,15)),"Proclamação da República"],
    [I(new Date(year,10,20)),"Consciência Negra"],
    [I(new Date(year,11,25)),"Natal"],
  ];
}
const feriadosOff=()=>new Set(cfgG().feriadosOff||[]);
const feriadosExtra=()=>cfgG().feriadosExtra||[];
function holidaySet(fromIso,toIso){
  const anos=[...new Set([+fromIso.slice(0,4),+toIso.slice(0,4)])];
  const off=feriadosOff(),out=new Set();
  anos.forEach(y=>nationalHolidays(y).forEach(([d])=>{if(d>=fromIso&&d<=toIso&&!off.has(d))out.add(d)}));
  feriadosExtra().forEach(x=>{if(x.dia>=fromIso&&x.dia<=toIso)out.add(x.dia)});
  return out;
}
