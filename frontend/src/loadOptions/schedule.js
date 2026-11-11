export function scheduleText({mode,date,start,end}){
 const prefix=date?date.slice(5,7)+'/'+date.slice(8,10)+' ':'';
 const time=t=>(t||'').replace(':','');
 if(mode==='any')return prefix+'Anytime';
 if(mode==='fcfs')return prefix+'FCFS';
 if(!start)return '';
 if(mode==='window')return end?prefix+time(start)+'-'+time(end)+(end<start?' (overnight)':''):'';
 return prefix+(mode==='after'?'After ':mode==='before'?'Before ':'Appointment @ ')+time(start);
}
