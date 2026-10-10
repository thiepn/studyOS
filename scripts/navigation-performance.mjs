// Production runtime measurements. Local provider results and live anonymous
// results are reported separately; skeletons are never the completion marker.
import {startProvider,sessionFor,courseId} from './isolated-study-provider.mjs';
import {spawn} from 'node:child_process';
import {mkdir,open,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const cwd=resolve(process.env.UX_PERF_CWD??process.cwd());const baseline=Boolean(process.env.UX_PERF_CWD);
const output=resolve(process.env.UX_EVIDENCE_DIR??'evidence/navigation-performance');await mkdir(output,{recursive:true});
const label=baseline?'baseline-85f01f9':'redesign';
const log=await open(resolve(output,label+'-server.log'),'w');
const env={...process.env,STUDYOS_TEST_DIST:'.next-ux-test',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3199',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'isolated-publishable-key',APP_ORIGIN:'http://127.0.0.1:3111',STUDYOS_AI_ENABLED:'false',OPENAI_API_KEY:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''};
const run=args=>spawn(process.execPath,[resolve(cwd,'node_modules/next/dist/bin/next'),...args],{cwd,env,stdio:['ignore',log.fd,log.fd],windowsHide:true});
let app,browser;const provider=await startProvider();const results=[];
try{
 if(baseline){const build=run(['build','--webpack']);if(await new Promise(r=>build.on('exit',r))!==0)throw Error('Baseline build failed');}
 app=run(['start','--hostname','127.0.0.1','--port','3111']);
 for(let n=0;n<150;n++){try{if((await fetch('http://127.0.0.1:3111/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 const module=process.env.PLAYWRIGHT_MODULE??'playwright';const {chromium}=await import(module.startsWith('C:')?pathToFileURL(module).href:module);browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(sessionFor())).toString('base64url'),domain:'127.0.0.1',path:'/'}]);const page=await context.newPage();
 // Measure document loading independently from optional background prefetch.
 const isolateDocument=route=>route.request().headers()['next-router-prefetch']==='1'?route.abort():route.continue();await context.route('**/*',isolateDocument);
 for(let sample=0;sample<5;sample++)for(const [path,title] of [['/','Today'],['/courses','Courses'],['/courses/'+courseId,'Differentialgleichungen'],['/assistant','Study Assistant'],['/progress','Progress']]){
  provider.state.requests.length=0;const start=performance.now();await page.goto('http://127.0.0.1:3111'+path);await page.getByRole('heading',{name:title,level:1,exact:true}).waitFor();await page.locator('.shell[aria-busy=true]').waitFor({state:'hidden'});const useful=performance.now()-start;const nav=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfb:n.responseStart-n.requestStart,render:n.domContentLoadedEventEnd-n.responseStart};});results.push({kind:'document-navigation',path,sample,usefulMs:Math.round(useful),...nav,providerReads:provider.state.requests.filter(r=>r.method==='GET').length});
 }
 await context.unroute('**/*',isolateDocument);await page.reload();await page.getByRole('heading',{name:'Progress',level:1,exact:true}).waitFor();
 for(let sample=0;sample<5;sample++)for(const [path,title,label] of [['/','Today','Today'],['/courses','Courses','Courses'],['/assistant','Study Assistant',baseline?'Study Assistant ↗':'Assistant'],['/progress','Progress','Progress']]){
  const link=page.locator('.workspace-sidebar').getByRole('link',{name:label,exact:true});await link.hover();await page.waitForLoadState('networkidle');provider.state.requests.length=0;const start=performance.now();await link.click();await page.getByRole('heading',{name:title,level:1,exact:true}).waitFor();results.push({kind:'warm-prefetched-navigation',path,sample,usefulMs:Math.round(performance.now()-start),providerReads:provider.state.requests.filter(r=>r.method==='GET').length});
 }
 const live=await browser.newPage();for(let sample=0;sample<3;sample++){const start=performance.now();await live.goto('https://study.thiepn.dev/login');await live.locator('h1').waitFor();results.push({kind:'live-anonymous-login',sample,usefulMs:Math.round(performance.now()-start)});}await live.close();
}finally{await writeFile(resolve(output,label+'-timings.json'),JSON.stringify({label,results,limitations:['Loopback provider has no real provider/network latency','Document navigation uses a warm server process; first sample includes initial server work','Live results cover anonymous login only; no authenticated owner session available']},null,2));await browser?.close();app?.kill();await provider.close();await log.close();}
console.log(JSON.stringify({label,samples:results.length}));
