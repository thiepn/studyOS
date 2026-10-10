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

test("long course names wrap within narrow headers regardless of system font",()=>{
 const css=read("../src/app/globals.css");
 assert.match(css,/\.course-header-identity>div\{min-width:0\}/);
 assert.match(css,/\.course-header h1\{[^}]*overflow-wrap:anywhere/);
 assert.match(read("../src/app/academic-system.css"),/h1,h2,h3 \{[^}]*overflow-wrap:anywhere/);
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

test("document workspace replaces the daily timeline and keeps planning deep links",()=>{
 const page=read("../src/app/page.tsx");
 assert.match(page,/today-workspace-grid/);
 assert.match(page,/<ContextDetails id="today-planning"/);
 const daily=read("../src/components/daily-plan.tsx");
 assert.doesNotMatch(daily,/now-rail|sequence-marker/);
 assert.match(read("../src/app/daily-actions.css"),/\.study-budget small\{display:inline\}/);
 assert.doesNotMatch(read("../src/app/globals.css"),/\.now-rail\s*\{/);
});

test("course overview keeps solution filtering while separating files and next action",()=>{
 const page=read("../src/app/courses/[id]/page.tsx");
 assert.match(page,/course-overview-grid/);
 assert.match(page,/overview\.canOpenSolutions/);
 assert.match(read("../src/app/ux-workspace.css"),/\.academic-route-context\{[^}]*width:auto/);
});
