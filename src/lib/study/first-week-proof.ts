/** P38 proof: a first-week claim must come from a real approved course
 * source, a question linked to that source, and a recorded independent attempt
 * on the linked question. Mere activity in the course is insufficient. */
export type FirstWeekProof = {
  courseId:string;
  verifiedResources:number;
  sourceLinkedQuestions:number;
  independentAttempts:number;
};
export type ProofWeek = {id:string;course_id:string;week_no:number};
export type ProofResource = {id:string;course_id:string;teaching_week_id:string|null;processing_status:string;active:boolean;resource_type:string};
export type ProofLink = {question_id:string;resource_id:string};
export type ProofQuestion = {id:string;course_id:string;active:boolean};
export type ProofAttempt = {id:string;question_id:string;course_id:string;independence:string};

export function buildFirstWeekProof(
  courseIds:readonly string[],
  weeks:readonly ProofWeek[],
  resources:readonly ProofResource[],
  links:readonly ProofLink[],
  questions:readonly ProofQuestion[],
  attempts:readonly ProofAttempt[],
):FirstWeekProof[]{
  const uniqueCourses=[...new Set(courseIds)];
  const courseSet=new Set(uniqueCourses);
  const weekToCourse=new Map(weeks.filter(w=>w.week_no===1&&courseSet.has(w.course_id))
    .map(w=>[w.id,w.course_id]));
  const sourceToCourse=new Map(resources.filter(r=>
    r.active&&r.processing_status==="verified"
    &&["lecture","exercise"].includes(r.resource_type)
    &&weekToCourse.get(r.teaching_week_id??"")===r.course_id)
    .map(r=>[r.id,r.course_id]));
  const questionsById=new Map(questions.filter(q=>q.active&&courseSet.has(q.course_id))
    .map(q=>[q.id,q.course_id]));
  const confirmedByCourse=new Map(uniqueCourses.map(id=>[id,new Set<string>()]));
  for(const link of links){
    const sourceCourse=sourceToCourse.get(link.resource_id);
    if(sourceCourse && sourceCourse===questionsById.get(link.question_id)){
      confirmedByCourse.get(sourceCourse)?.add(link.question_id);
    }
  }
  const attemptsByCourse=new Map(uniqueCourses.map(id=>[id,new Set<string>()]));
  for(const attempt of attempts){
    if(attempt.independence!=="independent")continue;
    if(!confirmedByCourse.get(attempt.course_id)?.has(attempt.question_id))continue;
    attemptsByCourse.get(attempt.course_id)?.add(attempt.id);
  }
  return uniqueCourses.map(courseId=>({
    courseId,
    verifiedResources:[...sourceToCourse.values()].filter(id=>id===courseId).length,
    sourceLinkedQuestions:confirmedByCourse.get(courseId)?.size??0,
    independentAttempts:attemptsByCourse.get(courseId)?.size??0,
  }));
}
export function proofCertifiedForAllMajors(proofs:readonly FirstWeekProof[],majorIds:readonly string[]):boolean {
  const unique=[...new Set(majorIds)];
  if(!unique.length)return false;
  const keyed=new Map(proofs.map(proof=>[proof.courseId,proof]));
  return unique.every(id=>{
    const proof=keyed.get(id);
    return Boolean(proof&&proof.verifiedResources>0&&proof.sourceLinkedQuestions>0&&proof.independentAttempts>0);
  });
}
