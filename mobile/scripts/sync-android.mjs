import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("..",import.meta.url));
const env={...process.env,VITE_API_ORIGIN:process.argv.includes("--local")?"http://10.0.2.2:3000":"https://cosfind.ty1227s.workers.dev"};
// Both modes bundle the UI. Local mode changes API traffic only.
delete env.CAPACITOR_DEV_SERVER_URL;
for(const [script,args] of [["typescript/bin/tsc",["-b"]],["vite/bin/vite.js",["build"]],["@capacitor/cli/bin/capacitor",["sync","android"]]]){
 const result=spawnSync(process.execPath,[resolve(root,"node_modules",script),...args],{cwd:root,env,stdio:"inherit"});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
