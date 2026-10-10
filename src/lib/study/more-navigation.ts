/** User-facing operational index. Advanced routes stay addressable but are not top-level tabs. */
export const MORE_SECTIONS = [
  { title:"Plan", description:"Commit time, inspect trade-offs, close the week.", entries:[
    {href:"/week",label:"This week",description:"Execute your current weekly plan"},
    {href:"/scenarios",label:"Plan scenarios",description:"Compare feasible allocations"},
    {href:"/handoff",label:"Weekly review",description:"Close the week and prepare the next"},
  ]},
  { title:"Materials", description:"Source-grounded academic materials.", entries:[
    {href:"/resources",label:"Resource inbox",description:"Connect Drive, process, and approve sources"},
  ]},
  { title:"Exams", description:"From final preparation to official outcomes.", entries:[
    {href:"/exam-command",label:"Exam plan",description:"Prioritize exam runways"},
    {href:"/exam-day",label:"Exam day",description:"Boundaries, closure, and recovery"},
    {href:"/exam-results",label:"Results",description:"Record outcomes and retake decisions"},
  ]},
  { title:"Semester", description:"Manage the academic lifecycle.", entries:[
    {href:"/semester/bootstrap",label:"Semester setup",description:"Course roster and curriculum"},
    {href:"/semester",label:"Semester review",description:"Completion and academic outcomes"},
    {href:"/semesters",label:"History",description:"Browse completed semesters"},
    {href:"/semester/rollover",label:"Rollover",description:"Start the next semester"},
  ]},
  { title:"System", description:"Connections and readiness.", entries:[
    {href:"/setup",label:"Connections & setup",description:"Drive, calendar, and activation"},
    {href:"/account/recovery",label:"Account recovery",description:"Inspect local offline queues and safe owner-bound retries"},
  ]},
] as const;

export function isMorePath(path:string):boolean{
  if(path==="/more")return true;
  return MORE_SECTIONS.some(section=>section.entries.some(entry=>
    path===entry.href||path.startsWith(entry.href+"/")
  ))||path==="/strategy";
}
