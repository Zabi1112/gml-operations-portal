import test from "node:test";
import assert from "node:assert/strict";
import { scoreDictation, speakingScore } from "../src/interviews/scoring.js";
test("dictation ignores case and punctuation", () => { assert.equal(scoreDictation("Driver, please wait!", "DRIVER please wait.").points, 25); });
test("dictation counts substitutions, omissions and extra words", () => {
  assert.equal(scoreDictation("the driver will wait", "the driver can wait").errors, 1);
  assert.equal(scoreDictation("the driver will wait", "driver will wait").points, 18.8);
  assert.equal(scoreDictation("the driver will wait", "the driver will wait here").errors, 1);
});
test("empty and repeated answers do not earn points", () => {
  assert.equal(scoreDictation("the driver will wait", "").points, 0);
  assert.equal(scoreDictation("the driver will wait", "the the the the the the the the").points, 0);
});
test("speaking remains pending until all three responses are fully scored", () => {
  assert.equal(speakingScore([{}, {}, {}]), null);
  const perfect = { clarity:5,fluency:5,understanding:5,language:5,professionalism:5 };
  assert.equal(speakingScore([perfect,perfect,perfect]), 50);
  assert.equal(speakingScore([perfect,perfect,{...perfect,clarity:6}]), null);
});

test("four beginner speaking responses share the same 50-point maximum",()=>{
 const scores=Array.from({length:4},()=>({clarity:5,fluency:5,understanding:5,language:5,professionalism:5}));
 assert.equal(speakingScore(scores,4),50);
 assert.equal(speakingScore(scores.slice(0,3),4),null);
});
