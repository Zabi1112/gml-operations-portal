
CREATE TABLE "InterviewAssessment" (
 "id" SERIAL PRIMARY KEY,
 "branchId" INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "token" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'SUBMITTED', 'REVIEWED')),
 "questions" JSONB NOT NULL,
 "responses" JSONB,
 "result" JSONB,
 "createdBy" INTEGER NOT NULL,
 "reviewedBy" INTEGER,
 "submittedAt" TIMESTAMP(3),
 "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "InterviewAssessment_token_key" ON "InterviewAssessment"("token");
CREATE INDEX "InterviewAssessment_branchId_createdAt_idx" ON "InterviewAssessment"("branchId", "createdAt");
CREATE TABLE "InterviewRecording" (
 "id" SERIAL PRIMARY KEY,
 "assessmentId" INTEGER NOT NULL REFERENCES "InterviewAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "position" INTEGER NOT NULL CHECK ("position" BETWEEN 0 AND 2),
 "mimeType" TEXT NOT NULL,
 "duration" INTEGER NOT NULL CHECK ("duration" BETWEEN 1 AND 95),
 "data" BYTEA NOT NULL CHECK (octet_length("data") <= 786432)
);
CREATE UNIQUE INDEX "InterviewRecording_assessmentId_position_key" ON "InterviewRecording"("assessmentId", "position");
ALTER TABLE "InterviewAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewRecording" ENABLE ROW LEVEL SECURITY;
