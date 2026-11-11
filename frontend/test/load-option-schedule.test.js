import test from 'node:test';import assert from 'node:assert/strict';import {scheduleText,departureText,displayTime,displayDate} from '../src/loadOptions/schedule.js';
test('schedule modes produce usable message text and incomplete windows stay empty',()=>{
 const base={date:'2026-11-12',start:'08:00',end:'19:00'};
 assert.equal(scheduleText({...base,mode:'appointment'}),'12 Nov Appointment @ 08:00 AM');
 assert.equal(scheduleText({...base,mode:'window'}),'12 Nov 08:00 AM - 07:00 PM');
 assert.equal(scheduleText({...base,mode:'after'}),'12 Nov After 08:00 AM');
 assert.equal(scheduleText({...base,mode:'before'}),'12 Nov Before 08:00 AM');
 assert.equal(scheduleText({...base,mode:'any'}),'12 Nov Anytime');
 assert.equal(scheduleText({...base,mode:'fcfs'}),'12 Nov FCFS');
 assert.equal(scheduleText({...base,mode:'window',end:''}),'');
 assert.match(scheduleText({...base,mode:'window',start:'22:00',end:'04:00'}),/overnight/);
});

test('date labels and 12-hour times handle midnight, noon and year boundaries',()=>{
 assert.equal(displayTime('00:00'),'12:00 AM');assert.equal(displayTime('12:00'),'12:00 PM');assert.equal(displayTime('15:05'),'03:05 PM');
 assert.equal(displayDate('2026-11-11'),'11 Nov');assert.equal(displayDate('2026-02-30'),'');
 const now=new Date(2026,11,31,23,59);assert.equal(departureText('2026-12-31',now),'Today');assert.equal(departureText('2027-01-01',now),'Tomorrow');assert.equal(departureText('2027-01-02',now),'2 Jan');
});
