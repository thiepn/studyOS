/** URL-derived navigation hints, never an authorization boundary. */
export type StudyRouteContext={current:string;parent?:{label:string;href:string}};
const exact:Record<string,StudyRouteContext>={
  "/":{current:"Today"},
  "/practice":{current:"Study"},
  "/courses":{current:"Courses"},
  "/progress":{current:"Progress"},
  "/more":{current:"More"},
  "/account":{current:"Account"},
  "/account/connections":{current:"Account connections",parent:{label:"Account",href:"/account"}},
  "/resources":{current:"Resources",parent:{label:"More",href:"/more"}},
  "/week":{current:"This week",parent:{label:"More",href:"/more"}},
  "/handoff":{current:"Weekly review",parent:{label:"More",href:"/more"}},
  "/scenarios":{current:"Planning scenarios",parent:{label:"More",href:"/more"}},
  "/strategy":{current:"Study strategy",parent:{label:"More",href:"/more"}},
  "/exam-command":{current:"Exam plan",parent:{label:"More",href:"/more"}},
  "/exam-day":{current:"Exam day",parent:{label:"More",href:"/more"}},
  "/exam-results":{current:"Exam results",parent:{label:"More",href:"/more"}},
  "/setup":{current:"Connections & setup",parent:{label:"More",href:"/more"}},
  "/setup/platform":{current:"Platform status",parent:{label:"More",href:"/more"}},
  "/semesters":{current:"Semester history",parent:{label:"More",href:"/more"}},
  "/semester":{current:"Semester review",parent:{label:"More",href:"/more"}},
  "/semester/bootstrap":{current:"Semester setup",parent:{label:"More",href:"/more"}},
  "/semester/rollover":{current:"Semester rollover",parent:{label:"More",href:"/more"}},
  "/quality":{current:"Evidence quality",parent:{label:"Progress",href:"/progress"}},
  "/outlook":{current:"Semester outlook",parent:{label:"Progress",href:"/progress"}},
};
export function getStudyRouteContext(path:string,courseName?:string):StudyRouteContext {
  const clean=path.split(/[?#]/,1)[0].replace(/\/+$/,"")||"/";
  if(exact[clean])return exact[clean];
  if(/^\/courses\/[^/]+$/.test(clean))
    return {current:courseName?.trim()||"Course binder",parent:{label:"Courses",href:"/courses"}};
  if(/^\/diagnostics\/[^/]+$/.test(clean))
    return {current:"Course diagnostic",parent:{label:"Courses",href:"/courses"}};
  if(clean.startsWith("/account/"))
    return {current:"Account settings",parent:{label:"Account",href:"/account"}};
  if(clean.startsWith("/practice/"))
    return {current:"Study session",parent:{label:"Study",href:"/practice"}};
  if(clean.startsWith("/semester/archive/"))
    return {current:"Semester archive",parent:{label:"Semester history",href:"/semesters"}};
  if(clean.startsWith("/courses/"))return {current:"Course workspace",parent:{label:"Courses",href:"/courses"}};
  if(clean.startsWith("/semester/"))return {current:"Semester administration",parent:{label:"More",href:"/more"}};
  return {current:"Study workspace",parent:{label:"More",href:"/more"}};
}
