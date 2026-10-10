import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("course directory uses summaries without constructing a practice queue",()=>{
 const page=read("../src/app/courses/page.tsx");
 assert.match(page,/getCourseSummaries\(\)/);
 assert.doesNotMatch(page,/getTodayData|study_questions|buildQueue/);
});

test("mobile Progress belongs to More and still displays its current location",()=>{
 const shell=read("../src/components/workspace-shell.tsx");
 assert.match(shell,/current\?\.href===\"\/progress\"\?\"\/more\"/);
 assert.match(shell,/aria-current=\{mobileCurrent===item.href/);
});

test("advanced course reads are selected explicitly by URL-backed tabs",()=>{
 const page=read("../src/app/courses/[id]/page.tsx");
 assert.match(page,/tab===\"exams\"\?await getCourseExamIntelligence/);
 assert.match(page,/includeMasterMap:tab===\"progress\"/);
 const tabs=read("../src/components/course-tabs.tsx");
 for(const hash of ["#course-weeks","#course-master-map","#course-exam-intelligence","#course-settings"])assert.ok(tabs.includes(hash));
 assert.match(tabs,/router\.replace/);
});

test("private evidence deduplication is request scoped and never truncates history",()=>{
 const evidence=read("../src/lib/study/workspace-evidence.ts");
 assert.match(evidence,/import \{ cache \} from \"react\"/);
 assert.doesNotMatch(evidence,/unstable_cache|use cache|\.limit\(|\.range\(/);
 assert.match(read("../src/lib/supabase/server.ts"),/createClient = cache/);
});

test("isolated browser provider cannot be imported into application authentication",()=>{
 const config=read("../next.config.ts");
 assert.doesNotMatch(config,/isolated-study-provider|synthetic.*auth|skip.*auth/i);
 const journey=read("../scripts/application-journey.mjs");
 assert.match(journey,/OPENAI_API_KEY:''/);
 assert.match(journey,/route\.abort\('internetdisconnected'\)/);
 assert.match(journey,/Queued for signed-in account sync/);
 assert.match(journey,/mockedAiApp\?\.kill\(\)/);
});
