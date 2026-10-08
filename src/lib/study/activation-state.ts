import { type FirstWeekProof, proofCertifiedForAllMajors } from "./first-week-proof";
export type ActivationSnapshot={
  course_count:number;major_course_count:number;retake_course_count:number;bootstrap_certified:boolean;
  drive_connected:boolean;drive_tree_ready:boolean;calendar_connected:boolean;calendar_synced:boolean;
  majors_with_timetable:number;retake_baselines_completed:number;majors_with_week1_material:number;
  majors_with_study_map:number;majors_with_attempts:number;
};
export type PlatformActivation={
  secureOrigin:boolean;hasSupabaseSecret:boolean;googleDriveConfigured:boolean;googleCalendarConfigured:boolean;
};
export type ActivationEvaluation={
  platformReady:boolean;preSemesterReady:boolean;firstWeekCertified:boolean;
  platformBlockers:string[];activationBlockers:string[];firstWeekBlockers:string[];
  platformPercent:number;activationPercent:number;firstWeekPercent:number;
};

function pct(done:number,total:number){return Math.round((done/Math.max(1,total))*100);}

export function evaluateActivation(platform:PlatformActivation,snapshot:ActivationSnapshot,
  majorCourseIds:readonly string[]=[],proofs:readonly FirstWeekProof[]=[]):ActivationEvaluation{
  const platformChecks=[
    [platform.hasSupabaseSecret,"Supabase server secret is not configured."],
    [platform.secureOrigin,"Production origin is not HTTPS."],
    [platform.googleDriveConfigured,"Study Drive OAuth is not configured on the deployment."],
    [platform.googleCalendarConfigured,"Study Calendar OAuth is not configured on the deployment."],
  ] as const;
  const platformBlockers=platformChecks.filter(([ok])=>!ok).map(([,message])=>message);

  const activationChecks=[
    [snapshot.bootstrap_certified,"Complete and confirm semester setup."],
    [snapshot.course_count>0,"Add the real courses for the active semester."],
    [snapshot.drive_connected,"Connect the intended Study Drive Google account."],
    [snapshot.drive_tree_ready,"Provision the active-semester Drive folder, inbox, and course folders."],
    [snapshot.calendar_connected,"Connect the intended Study Calendar Google account."],
    [snapshot.calendar_synced,"Sync the Study Calendar successfully."],
    [snapshot.major_course_count===0||snapshot.majors_with_timetable>=snapshot.major_course_count,"Map at least one real timetable event to every major course."],
    [snapshot.retake_course_count===0||snapshot.retake_baselines_completed>=snapshot.retake_course_count,"Complete a fresh baseline diagnostic for every retake course."],
  ] as const;
  const activationBlockers=activationChecks.filter(([ok])=>!ok).map(([,message])=>message);

  const rosterVerified=snapshot.major_course_count>0 && majorCourseIds.length===snapshot.major_course_count;
  const byId=new Map(proofs.map(proof=>[proof.courseId,proof]));
  const everyMajor=(predicate:(p:FirstWeekProof)=>boolean)=>rosterVerified
    &&majorCourseIds.every(id=>{
      const proof=byId.get(id);
      return Boolean(proof&&predicate(proof));
    });
  const firstWeekChecks=[
    [snapshot.major_course_count>0,"Add at least one real major course before certifying a first-week learning loop."],
    [everyMajor(p=>p.verifiedResources>0),"Process at least one verified Week-1 lecture or exercise for every major course."],
    [everyMajor(p=>p.sourceLinkedQuestions>0),"Approve at least one active question linked to verified Week-1 material for every major course."],
    [rosterVerified && proofCertifiedForAllMajors(proofs,majorCourseIds),"Record a fully independent attempt on a source-linked Week-1 question in every major course."],
  ] as const;
  const firstWeekBlockers=firstWeekChecks.filter(([ok])=>!ok).map(([,message])=>message);

  const platformReady=platformBlockers.length===0;
  const preSemesterReady=platformReady&&activationBlockers.length===0;
  const firstWeekCertified=preSemesterReady&&firstWeekBlockers.length===0;
  return {
    platformReady,preSemesterReady,firstWeekCertified,
    platformBlockers,activationBlockers,firstWeekBlockers,
    platformPercent:pct(platformChecks.length-platformBlockers.length,platformChecks.length),
    activationPercent:pct(activationChecks.length-activationBlockers.length,activationChecks.length),
    firstWeekPercent:pct(firstWeekChecks.length-firstWeekBlockers.length,firstWeekChecks.length),
  };
}
