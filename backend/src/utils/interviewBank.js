
const { randomInt } = require("node:crypto");
const bank = require("../../data/interviewBank.json");
const rubric = [
 ["clarity", "Clarity", "Judge intelligibility, not accent."],
 ["fluency", "Fluency", "Can the candidate maintain a clear flow of ideas?"],
 ["understanding", "Task completion", "Does the answer address the requested situation?"],
 ["language", "Language", "Are vocabulary and grammar sufficient to communicate?"],
 ["professionalism", "Professional communication", "Is the response polite, organized, and appropriate?"]
];
const counts = { english: bank.english.length, trucking: bank.trucking.length, listening: bank.listening.length };
function selectQuestions(previous) {
  const excluded = new Set([...(previous?.listening || []), ...(previous?.speaking || [])].map(q => q.id));
  function pick(pool, count) {
    const choices = pool.filter(q => !excluded.has(q.id));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = randomInt(i + 1); [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices.slice(0, count);
  }
  return { version: bank.version, listening: pick(bank.listening, 2), speaking: [...pick(bank.english, 1), ...pick(bank.trucking, 2)] };
}
module.exports = { bank, counts, rubric, selectQuestions };
