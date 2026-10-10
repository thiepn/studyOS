// Synthetic component checks, intentionally separate from locked visual goldens.
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
const runtime=process.env.PLAYWRIGHT_MODULE??"playwright";
const {chromium}=await import(runtime.startsWith("C:")?pathToFileURL(runtime).href:runtime);
const output=resolve(process.env.UX_EVIDENCE_DIR??"evidence/ux-candidates");
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
await page.addInitScript(()=>{
 const owner="99999999-9999-4999-8999-999999999999";const exp=Math.floor(Date.now()/1000)+3600;
 const token=btoa(JSON.stringify({alg:"HS256",typ:"JWT"}))+"."+btoa(JSON.stringify({sub:owner,exp,aud:"authenticated"}))+".synthetic-invalid-signature";
 const session=JSON.stringify({access_token:token,refresh_token:"synthetic-only",expires_at:exp,expires_in:3600,token_type:"bearer",user:{id:owner,aud:"authenticated",role:"authenticated",email:"synthetic@example.invalid",app_metadata:{},user_metadata:{},created_at:"2026-10-10T00:00:00Z"}});
 document.cookie="sb-127-auth-token=base64-"+btoa(session).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"")+"; path=/; SameSite=Lax";
});
const failures=[];const shots=[];const checks=[];
page.on("pageerror",error=>failures.push(error.message));
try{
 for(const width of [1280,320,375,390,430,768]){
  await page.setViewportSize({width,height:900});
  for(const [name,path] of [["today","/"],["courses","/courses"],["course-detail","/courses/11111111-1111-4111-8111-111111111111"],["materials","/resources"],["assistant","/assistant"],["more","/more"],["welcome","/welcome"]]){
   await page.goto("http://localhost:3108"+path);await page.getByRole("heading",{level:1}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),name+" overflows at "+width);
   if(width===1280||width===390){const nameWithWidth=name+"-"+width+".png";await page.screenshot({path:resolve(output,nameWithWidth),fullPage:true});shots.push(nameWithWidth);}
  }
 }
 checks.push("Seven synthetic surfaces have no horizontal overflow at 320, 375, 390, 430, 768 and 1280px");
 await page.goto("http://localhost:3108/courses");await page.getByRole("searchbox").fill("stoch");await page.getByRole("heading",{name:"Stochastik"}).waitFor();assert.equal(await page.getByRole("heading",{name:"Differentialgleichungen",exact:true}).count(),0);checks.push("Course search filters actual directory rows");
 await page.getByRole("searchbox").fill("");await page.getByRole("link",{name:"Week 1",exact:true}).first().click();await page.locator("#week-1").waitFor();
 assert.equal(await page.getByRole("link",{name:/Week 1.*Lecture/}).count(),1);assert.equal(await page.getByRole("link",{name:/Week 1.*Exercise/}).count(),1);assert.equal(await page.getByRole("link",{name:/Official solution/}).count(),0);checks.push("Actual week panel exposes lecture and exercise files while hiding solutions before independent work");
 await page.getByRole("link",{name:"Ask AI",exact:true}).click();assert.equal(await page.locator("#assistant-course").inputValue(),"11111111-1111-4111-8111-111111111111");assert.ok(await page.locator("#assistant-question").isDisabled());checks.push("Course context retained and spending-paused composer disabled");
 await page.goto("http://localhost:3108/assistant?course=11111111-1111-4111-8111-111111111111&mock=true");
 let requests=0;await page.route("**/api/study/assistant",route=>{requests++;return route.fulfill({json:{ok:true,answer:"A synthetic explanation: \\(x^2\\).\n```python\nx = 2\n```",context:{sources:[]}}});});
 await page.locator("#assistant-question").fill("Explain this concept");await page.getByRole("button",{name:"Ask assistant",exact:true}).click();await page.locator(".assistant-assistant").waitFor();assert.equal(requests,1);assert.equal(await page.locator(".assistant-assistant code").textContent(),"x = 2\n");checks.push("Mocked assistant response renders code and mathematical content without paid requests");
 await page.goto("http://localhost:3108/resources");await page.getByRole("searchbox").fill("exercise");assert.equal(await page.locator(".source-index-record").count(),1);await page.getByRole("button",{name:"Clear filters"}).click();assert.equal(await page.locator(".source-index-record").count(),2);checks.push("Material search and clear filters work");
 await page.goto("http://localhost:3108/more");assert.equal(await page.getByRole("link",{name:/Drive & Calendar connections/}).count(),1);checks.push("Connections discoverable through More");
 await page.route("**/api/study/session/**",route=>route.fulfill({json:{ok:true}}));
 let rejectAttempt=true;await page.route("**/api/study/attempt",route=>route.fulfill(rejectAttempt?{status:400,json:{ok:false,error:"Synthetic save rejection. Work has not been saved."}}:{json:{ok:true}}));
 await page.setViewportSize({width:430,height:900});
 await page.goto("http://localhost:3108/practice");await page.getByRole("button",{name:"Start review",exact:true}).click();await page.locator("#review-working").waitFor();
 await page.locator("#review-working").fill("By the power rule, the derivative is 2x.");
 await page.getByRole("button",{name:"Confidence 4 of 5",exact:true}).click();await page.getByRole("button",{name:/Lock answer/}).click();
 await page.getByRole("button",{name:"Correct",exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:resolve(output,"study-session-430.png"),fullPage:true});shots.push("study-session-430.png");
 await page.getByRole("button",{name:"Save & next",exact:true}).click();await page.getByRole("alert").filter({hasText:"Synthetic save rejection"}).waitFor();assert.equal(await page.locator(".review-complete").count(),0);checks.push("Rejected attempt save shows an error and does not claim completion");rejectAttempt=false;
 await page.getByRole("button",{name:"Save & next",exact:true}).click();await page.getByRole("heading",{name:"1 attempts completed"}).waitFor();assert.match(await page.locator(".practice-outcome-ledger").textContent(),/Recorded/);checks.push("Actual ReviewSession starts, locks work, grades and displays mock-confirmed Recorded status");
 assert.deepEqual(failures,[]);
}finally{await writeFile(resolve(output,"manifest.json"),JSON.stringify({kind:"synthetic-shared-components",shots,checks,failures,limitations:["No authenticated server pages, real persistence, semester creation or live providers qualified; session writes intercepted", "Actual progress server page not rendered"]},null,2));await browser.close();}
console.log(JSON.stringify({screenshots:shots.length,checks,failures},null,2));
