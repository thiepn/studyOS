/** Production HTTPS is mandatory. Localhost is only valid for development
 * and cannot accidentally qualify a missing production APP_ORIGIN. */
export function isQualifiedAppOrigin(value:string,environment:string):boolean {
  try {
    const url=new URL(value);
    const local=["localhost","127.0.0.1"].includes(url.hostname);
    const clean=!url.username&&!url.password&&!url.search&&!url.hash
      &&url.pathname==="/"&&!url.hostname.includes("..");
    if(!clean)return false;
    if(environment==="production"||environment==="preview") {
      return url.protocol==="https:"&&!local;
    }
    return url.protocol==="https:"||(url.protocol==="http:"&&local);
  } catch {return false;}
}
