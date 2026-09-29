ALTER TABLE "InterviewRecording" DROP CONSTRAINT "InterviewRecording_position_check";
ALTER TABLE "InterviewRecording" ADD CONSTRAINT "InterviewRecording_position_check" CHECK ("position" BETWEEN 0 AND 3);
