import test from "node:test";
import assert from "node:assert/strict";
import { StudyServiceError } from "../src/lib/study/errors.ts";
import { studyAttemptFailure } from "../src/lib/study/attempt-error.ts";

test("invalid attempt preserves actionable validation message", () => {
  assert.deepEqual(studyAttemptFailure(new StudyServiceError("Missing duration", "invalid_attempt")), {status:400,message:"Missing duration"});
});

test("unauthenticated attempt preserves auth response", () => {
  assert.deepEqual(studyAttemptFailure(new StudyServiceError("Sign in", "not_authenticated")), {status:401,message:"Sign in"});
});

test("database exceptions never expose secrets", () => {
  assert.deepEqual(studyAttemptFailure(new Error("database password=secret")), {status:500,message:"Could not save study attempt."});
});

test("owner policy rejection is sanitized and never treated as a transient offline save", () => {
  const result=studyAttemptFailure(new StudyServiceError("private policy details", "42501"));
  assert.equal(result.status,403);
  assert.match(result.message,/not been recorded/);
  assert.doesNotMatch(result.message,/private policy/);
});

test("unrecognized service errors are sanitized", () => {
  assert.deepEqual(studyAttemptFailure(new StudyServiceError("internal SQL", "database_error")), {status:500,message:"Could not save study attempt."});
  assert.deepEqual(studyAttemptFailure(null), {status:500,message:"Could not save study attempt."});
});
