export function displayDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';
 const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);
 if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d)return '';
 return d+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1];
}
export function displayTime(value){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||''))return '';
 const [h,m]=value.split(':');return String(Number(h)%12||12).padStart(2,'0')+':'+m+' '+(Number(h)<12?'AM':'PM');
}
export function departureText(value,now=new Date()){
 if(value==='Today'||value==='Tomorrow')return value;
 const key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
 if(value===key(now))return 'Today';if(value===key(tomorrow))return 'Tomorrow';return displayDate(value);
}
export function scheduleText({mode,date,start,end}){
 const prefix=date?displayDate(date)+' ':'';
 const time=displayTime;
 if(mode==='any')return prefix+'Anytime';
 if(mode==='fcfs')return prefix+'FCFS';
 if(!start)return '';
 if(mode==='window')return end?prefix+time(start)+' - '+time(end)+(end<start?' (overnight)':''):'';
 return prefix+(mode==='after'?'After ':mode==='before'?'Before ':'Appointment @ ')+time(start);
}
