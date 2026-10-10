// Isolated synthetic UI fixture. Never mounts production APIs or middleware.
import {resolve} from "node:path";
export default {turbopack:{root:resolve(process.cwd())},devIndicators:false,agentRules:false,
 env:{NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:3108",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"synthetic-preview-only-not-a-credential"}};
