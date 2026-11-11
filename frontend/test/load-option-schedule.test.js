import test from 'node:test';import assert from 'node:assert/strict';import {scheduleText} from '../src/loadOptions/schedule.js';
test('schedule modes produce usable message text and incomplete windows stay empty',()=>{
 const base={date:'2026-11-12',start:'08:00',end:'19:00'};
 assert.equal(scheduleText({...base,mode:'appointment'}),'11/12 Appointment @ 0800');
 assert.equal(scheduleText({...base,mode:'window'}),'11/12 0800-1900');
 assert.equal(scheduleText({...base,mode:'after'}),'11/12 After 0800');
 assert.equal(scheduleText({...base,mode:'before'}),'11/12 Before 0800');
 assert.equal(scheduleText({...base,mode:'any'}),'11/12 Anytime');
 assert.equal(scheduleText({...base,mode:'fcfs'}),'11/12 FCFS');
 assert.equal(scheduleText({...base,mode:'window',end:''}),'');
 assert.match(scheduleText({...base,mode:'window',start:'22:00',end:'04:00'}),/overnight/);
});
