const words = text => (text.toLowerCase().replace(/[‘’]/g, "'").replace(/'/g, "").match(/[a-z0-9]+/g) || []);
function scoreDictation(reference, answer) {
  const expected = words(reference); const actual = words(answer);
  if (actual.length > 1000) throw new Error("Answer is too long.");
  const grid = Array.from({ length: expected.length + 1 }, () => Array(actual.length + 1).fill(0));
  for (let i = 0; i <= expected.length; i++) grid[i][0] = i;
  for (let j = 0; j <= actual.length; j++) grid[0][j] = j;
  for (let i = 1; i <= expected.length; i++) for (let j = 1; j <= actual.length; j++) grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + (expected[i - 1] === actual[j - 1] ? 0 : 1));
  let i = expected.length; let j = actual.length; const changes = [];
  while (i || j) {
    if (i && j && expected[i - 1] === actual[j - 1] && grid[i][j] === grid[i - 1][j - 1]) { i--; j--; }
    else if (i && j && grid[i][j] === grid[i - 1][j - 1] + 1) { changes.push({ type: "changed", expected: expected[--i], actual: actual[--j] }); }
    else if (i && grid[i][j] === grid[i - 1][j] + 1) { changes.push({ type: "missing", expected: expected[--i] }); }
    else { changes.push({ type: "extra", actual: actual[--j] }); }
  }
  const errors = grid[expected.length][actual.length];
  const accuracy = expected.length ? Math.max(0, 1 - errors / expected.length) : 0;
  return { points: Math.round(accuracy * 250) / 10, accuracy: Math.round(accuracy * 100), errors, wordCount: expected.length, changes: changes.reverse() };
}
function speakingScore(scores) {
  const values = scores.flatMap(row => Object.values(row));
  if (scores.length !== 3 || scores.some(row => Object.keys(row).length !== 5) || values.some(v => !Number.isInteger(v) || v < 0 || v > 5)) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / 75 * 500) / 10;
}

module.exports = { scoreDictation, speakingScore };
