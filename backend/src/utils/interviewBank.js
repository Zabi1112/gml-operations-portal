
const { randomInt } = require("node:crypto");
const bank = require("../../data/interviewBank.json");
const beginner = require("../../data/interviewBeginnerBank.json");
const rubric = [
 ["clarity", "Clarity", "Judge intelligibility, not accent."],
 ["fluency", "Fluency", "Can the candidate maintain a clear flow of ideas?"],
 ["understanding", "Task completion", "Does the answer address the requested situation?"],
 ["language", "Language", "Are vocabulary and grammar sufficient to communicate?"],
 ["professionalism", "Professional communication", "Is the response polite, organized, and appropriate?"]
];
const counts = { english: bank.english.length, trucking: bank.trucking.length, listening: bank.listening.length };
function selectQuestions(previous, testType = "DISPATCHER") {
  const excluded = new Set([...(previous?.listening || []), ...(previous?.speaking || [])].map(q => q.id));
  function pick(pool, count) {
    const choices = pool.filter(q => !excluded.has(q.id));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = randomInt(i + 1); [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices.slice(0, count);
  }
  if (testType === "BEGINNER") return { version: "ewl-beginner-1", testType, listening: pick(beginner.listening, 3), speaking: pick(beginner.speaking, 4) };
  return { version: bank.version, testType, listening: pick(bank.listening, 2), speaking: [...pick(bank.english, 1), ...pick(bank.trucking, 2)] };
}
module.exports = { bank, beginner, counts, rubric, selectQuestions };
