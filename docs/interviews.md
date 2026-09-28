# Interviews

Admin and Manager users open **Interviews** in the portal sidebar after selecting a branch. Create a named invitation, copy the private link, and send it to the candidate. Candidates need no account. Each link accepts one submission and shows only a receipt afterward. Create a new invitation for a retest.

The original question bank in backend/data/interviewBank.json contains 100 general English prompts with reference answers, 50 trucking communication prompts with reference answers, and 30 listening passages. Each invitation snapshots two listening passages, one English speaking prompt, and two trucking speaking prompts. Selection uses server-side randomness, excludes the immediately preceding invitation's questions in the branch, and remains fixed on refresh. Future invitations can reuse older questions.

Listening uses prerecorded local WAV files and word comparison (25 points each). Speaking uses staff scoring across five criteria (50 points total). Reference answers are examples, not required wording. This is an internal communication assessment, not an official IELTS test. No paid AI service is involved.

Scores, typed responses, feedback, and question snapshots have no expiry. Audio is stored privately with a 768 KB per-recording limit and is deleted atomically when staff finalize the review. Explicit assessment deletion removes remaining recordings and invalidates the invitation. Archived branches remain read-only. Recordings and scores require Admin/Manager authentication.

## Database setup

Run from backend: node scripts/add-interviews.js (preflight), then node scripts/add-interviews.js --apply. This adds InterviewAssessment and InterviewRecording with RLS enabled, following the repository's standalone migration workflow. Generate the Prisma client after schema changes. Do not reset or replace existing tables.

## Checks

From the repository root: node --test backend/test/interviews.test.js frontend/test/interviewScoring.test.js. Frontend production build: npm run build in frontend. The bank tests verify every paragraph has a non-silent audio asset.

Audio assets were generated locally with the installed Windows Microsoft Zira voice at a slower speaking rate, 16 kHz mono PCM. Re-record the matching asset if you change a listening paragraph; keep previously assigned snapshots consistent. Candidate links use the portal origin, so links copied from localhost are for local testing only.
