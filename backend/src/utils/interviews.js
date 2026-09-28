
const { randomBytes } = require("node:crypto");
const { selectQuestions, rubric, counts } = require("./interviewBank");
const { scoreDictation, speakingScore } = require("./interviewScoring");
class InterviewError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new InterviewError(status, message); };
function id(value) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) fail(400, "A valid record or branch ID is required."); return n; }
function token(value) { if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail(404, "Candidate link not found."); return value; }
function validateSubmission(body) {
  if (body.consent !== true) fail(400, "Please consent to recording and assessment review before submitting.");
  if (!Array.isArray(body.answers) || body.answers.length !== 2 || body.answers.some(a => typeof a !== "string" || a.length > 4000 || a.trim().split(/\s+/).length > 1000)) fail(400, "Two valid listening responses are required.");
  if (!Array.isArray(body.recordings) || body.recordings.length !== 3) fail(400, "Three speaking responses are required.");
  const recordings = body.recordings.map((entry, position) => {
    if (entry === null) return null;
    if (!entry || typeof entry.data !== "string" || !entry.data.length || entry.data.length > 1048576 || !/^[A-Za-z0-9+/]+={0,2}$/.test(entry.data) ||
      typeof entry.mimeType !== "string" || !/^audio\/(webm|mp4|ogg)(;codecs=[a-z0-9,.-]+)?$/i.test(entry.mimeType) ||
      !Number.isInteger(entry.duration) || entry.duration < 1 || entry.duration > (position === 0 ? 60 : 90)) fail(400, "Invalid or oversized speaking recording.");
    const data = Buffer.from(entry.data, "base64");
    if (!data.length || data.length > 786432 || data.toString("base64") !== entry.data) fail(400, "A recording exceeds the 768 KB limit or is malformed.");
    // Only accept the browser recording containers advertised by the client.
    const valid = entry.mimeType.startsWith("audio/webm") ? data.subarray(0,4).toString("hex") === "1a45dfa3" :
      entry.mimeType.startsWith("audio/ogg") ? data.subarray(0,4).toString() === "OggS" : data.subarray(4,8).toString() === "ftyp";
    if (!valid) fail(400, "The recording format does not match its audio type.");
    return { position, mimeType: entry.mimeType, duration: entry.duration, data };
  }).filter(Boolean);
  return { answers: body.answers, recordings };
}
function validateReview(body) {
  const { scores, notes } = body;
  if (!Array.isArray(scores) || scores.length !== 3 || scores.some(s => !s || typeof s !== "object" || rubric.some(([key]) => !Object.hasOwn(s, key))) || speakingScore(scores) === null ||
    !Array.isArray(notes) || notes.length !== 3 || notes.some(n => typeof n !== "string" || n.length > 1500)) fail(400, "Complete all speaking scores from 0 to 5. Feedback allows up to 1500 characters.");
  return { scores, notes };
}
function publicView(row) {
  if (row.status !== "PENDING") return { name: row.name, status: "SUBMITTED" };
  return { name: row.name, status: row.status,
    listening: row.questions.listening.map(({ id, title, audioUrl }) => ({ id, title, audioUrl })),
    speaking: row.questions.speaking.map(({ id, title, prompt, tag, seconds, points }) => ({ id, title, prompt, tag, seconds, points })) };
}
function createInterviewService(db) {
  async function active(tx, branchId) {
    const branch = await tx.branch.findUnique({ where: { id: branchId }, select: { isActive: true } });
    if (!branch) fail(404, "Branch not found.");
    if (!branch.isActive) fail(409, "Historical branches are read-only.");
  }
  async function rowFor(tx, recordId, branchId) {
    const row = await tx.interviewAssessment.findFirst({ where: { id: id(recordId), branchId: id(branchId) } });
    if (!row) fail(404, "Assessment not found in this branch.");
    return row;
  }
  return {
    async create(body, userId) {
      const branchId = id(body.branchId);
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100 || /[\x00-\x1f]/.test(body.name)) fail(400, "Enter a candidate name up to 100 characters.");
      return db.$transaction(async tx => {
        await active(tx, branchId);
        // Serialize invitation selection per branch, including simultaneous staff requests.
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(48291500, $1::int)", branchId);
        const previous = await tx.interviewAssessment.findFirst({ where: { branchId }, orderBy: { id: "desc" }, select: { questions: true } });
        return tx.interviewAssessment.create({ data: { branchId, name: body.name.trim(), token: randomBytes(32).toString("hex"), questions: selectQuestions(previous?.questions), createdBy: userId }, select: { id: true, name: true, token: true, status: true } });
      });
    },
    async list(branchId, pageValue = 1) {
      branchId = id(branchId); const page = id(pageValue);
      const where = { branchId };
      const [items, total] = await Promise.all([
        db.interviewAssessment.findMany({ where, orderBy: { id: "desc" }, skip: (page - 1) * 50, take: 50, select: { id: true, name: true, token: true, status: true, createdAt: true, submittedAt: true, reviewedAt: true, result: true } }),
        db.interviewAssessment.count({ where })
      ]);
      return { items: items.map(({ result, ...row }) => ({ ...row, total: result?.total ?? null })), total, page, counts };
    },
    async publicGet(value) {
      const row = await db.interviewAssessment.findUnique({ where: { token: token(value) } });
      if (!row) fail(404, "This invitation was not found or has been deleted.");
      if (row.status === "PENDING") await active(db, row.branchId);
      return publicView(row);
    },
    async submit(value, body) {
      token(value);
      return db.$transaction(async tx => {
        const row = await tx.interviewAssessment.findUnique({ where: { token: value } });
        if (!row) fail(404, "This invitation was not found or has been deleted.");
        if (row.status !== "PENDING") return { status: "SUBMITTED" };
        await active(tx, row.branchId);
        const input = validateSubmission(body);
        const listening = row.questions.listening.map((q, i) => ({ ...scoreDictation(q.text, input.answers[i]), answer: input.answers[i] }));
        const responses = { listening, speaking: row.questions.speaking.map((q, i) => ({ hadRecording: input.recordings.some(a => a.position === i) })), consentAt: new Date().toISOString() };
        const changed = await tx.interviewAssessment.updateMany({ where: { id: row.id, status: "PENDING" }, data: { status: "SUBMITTED", submittedAt: new Date(), responses } });
        if (changed.count === 1 && input.recordings.length) await tx.interviewRecording.createMany({ data: input.recordings.map(a => ({ ...a, assessmentId: row.id })) });
        return { status: "SUBMITTED" };
      });
    },
    async detail(recordId, branchId) {
      const row = await rowFor(db, recordId, branchId);
      const audio = await db.interviewRecording.findMany({ where: { assessmentId: row.id }, select: { position: true, duration: true } });
      return { id: row.id, name: row.name, status: row.status, token: row.token, createdAt: row.createdAt, submittedAt: row.submittedAt, reviewedAt: row.reviewedAt, result: row.result,
        listening: row.questions.listening.map((q, i) => ({ ...q, ...row.responses?.listening[i] })),
        speaking: row.questions.speaking.map((q, i) => ({ ...q, hasAudio: audio.some(a => a.position === i), hadRecording: row.responses?.speaking[i]?.hadRecording || false, duration: audio.find(a => a.position === i)?.duration })) };
    },
    async audio(recordId, branchId, index) {
      const row = await rowFor(db, recordId, branchId);
      if (!/^[0-2]$/.test(String(index))) fail(404, "Recording not found.");
      const audio = await db.interviewRecording.findUnique({ where: { assessmentId_position: { assessmentId: row.id, position: Number(index) } } });
      if (!audio) fail(404, "Recording unavailable or deleted after review.");
      return audio;
    },
    async review(recordId, branchId, body, userId) {
      const input = validateReview(body);
      return db.$transaction(async tx => {
        const row = await rowFor(tx, recordId, branchId);
        await active(tx, row.branchId);
        if (row.status !== "SUBMITTED") fail(409, "Only a submitted assessment can be reviewed.");
        const listeningTotal = Math.round(row.responses.listening.reduce((sum, q) => sum + q.points, 0) * 10) / 10;
        const speakingTotal = speakingScore(input.scores);
        const result = { ...input, listeningTotal, speakingTotal, total: Math.round((listeningTotal + speakingTotal) * 10) / 10, recordingsDeleted: true };
        const changed = await tx.interviewAssessment.updateMany({ where: { id: row.id, status: "SUBMITTED" }, data: { status: "REVIEWED", result, reviewedBy: userId, reviewedAt: new Date() } });
        if (changed.count !== 1) fail(409, "This assessment has already been reviewed.");
        await tx.interviewRecording.deleteMany({ where: { assessmentId: row.id } });
        return result;
      });
    },
    async remove(recordId, branchId) {
      return db.$transaction(async tx => {
        const row = await rowFor(tx, recordId, branchId); await active(tx, row.branchId);
        await tx.interviewAssessment.delete({ where: { id: row.id } });
        return { deleted: true };
      });
    }
  };
}
module.exports = { createInterviewService, validateSubmission, validateReview, publicView };
