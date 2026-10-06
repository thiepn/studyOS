export type ActivationSnapshot={
  course_count:number;major_course_count:number;retake_course_count:number;
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

export function evaluateActivation(platform:PlatformActivation,snapshot:ActivationSnapshot):ActivationEvaluation{
  const platformChecks=[
    [platform.hasSupabaseSecret,"Supabase server secret is not configured."],
    [platform.secureOrigin,"Production origin is not HTTPS."],
    [platform.googleDriveConfigured,"Study Drive OAuth is not configured on the deployment."],
    [platform.googleCalendarConfigured,"Study Calendar OAuth is not configured on the deployment."],
  ] as const;
  const platformBlockers=platformChecks.filter(([ok])=>!ok).map(([,message])=>message);

  const activationChecks=[
    [snapshot.course_count>0,"Add the real courses for the active semester."],
    [snapshot.drive_connected,"Connect the intended Study Drive Google account."],
    [snapshot.drive_tree_ready,"Provision the active-semester Drive folder, inbox, and course folders."],
    [snapshot.calendar_connected,"Connect the intended Study Calendar Google account."],
    [snapshot.calendar_synced,"Sync the Study Calendar successfully."],
    [snapshot.major_course_count===0||snapshot.majors_with_timetable>=snapshot.major_course_count,"Map at least one real timetable event to every major course."],
    [snapshot.retake_course_count===0||snapshot.retake_baselines_completed>=snapshot.retake_course_count,"Complete a fresh baseline diagnostic for every retake course."],
  ] as const;
  const activationBlockers=activationChecks.filter(([ok])=>!ok).map(([,message])=>message);

  const firstWeekChecks=[
    [snapshot.major_course_count===0||snapshot.majors_with_week1_material>=snapshot.major_course_count,"Process at least one verified Week-1 source for every major course."],
    [snapshot.major_course_count===0||snapshot.majors_with_study_map>=snapshot.major_course_count,"Produce at least one active skill and review question for every major course."],
    [snapshot.major_course_count===0||snapshot.majors_with_attempts>=snapshot.major_course_count,"Record at least one real retrieval/practice attempt in every major course."],
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
