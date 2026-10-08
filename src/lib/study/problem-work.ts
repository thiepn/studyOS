/** Serialize a mathematically useful typed attempt into the existing response_text.
 * The answer is locked and persisted as one record; there is no parallel notes database. */
export function composeProblemWork(steps: string, conclusion: string): string {
  const working=steps.trim();
  const result=conclusion.trim();
  if(!working) return result;
  if(!result) return working;
  return `Working / justification:\n${working}\n\nFinal answer / claim:\n${result}`;
}

export function hasProblemWork(steps: string, conclusion: string): boolean {
  return Boolean(steps.trim() || conclusion.trim());
}
