import {defineConfig,loadEnv,type Plugin} from "vite";
import react from "@vitejs/plugin-react";
import {resolve} from "node:path";
import postcss,{type AcceptedPlugin} from "postcss";
import tailwindcss from "@tailwindcss/postcss";
const mobile=import.meta.dirname,root=resolve(mobile,"..");
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,root,""),...loadEnv(mode,mobile,"")};
 const apiOrigin=process.env.VITE_API_ORIGIN||env.VITE_API_ORIGIN||"https://cosfind.app";
 const sharedCss:Plugin={name:"cosfind-shared-css",enforce:"pre",async transform(code,id){if(id.replaceAll("\\","/")!==resolve(root,"app/globals.css").replaceAll("\\","/"))return null;return (await postcss([tailwindcss() as unknown as AcceptedPlugin]).process(code,{from:resolve(root,"app/globals.css")})).css;}};
 const forbidServer:Plugin={name:"cosfind-no-server-code",enforce:"pre",resolveId(id){if(id==="server-only"||id==="next/headers"||id==="next/server")throw new Error("Server-only module reached the Android bundle: "+id);return null;}};
 return {plugins:[forbidServer,sharedCss,react()],publicDir:resolve(root,"public"),resolve:{dedupe:["react","react-dom","maplibre-gl","@supabase/supabase-js"],alias:[
 {find:"next/link",replacement:resolve(mobile,"src/compat/link.tsx")},{find:"next/image",replacement:resolve(mobile,"src/compat/image.tsx")},{find:"next/navigation",replacement:resolve(mobile,"src/compat/navigation.ts")},
 {find:/^(?:.*\/|\.\/)pwa-install-manager$/,replacement:resolve(mobile,"src/compat/pwa.tsx")},
 {find:"@/lib/supabase/client",replacement:resolve(mobile,"src/compat/supabase.ts")},
 {find:"@",replacement:root}]},server:{host:"127.0.0.1",fs:{allow:[root]},proxy:{"/api":{target:apiOrigin,changeOrigin:true,cookieDomainRewrite:"",configure(proxy){proxy.on("proxyReq",req=>req.setHeader("Origin",new URL(apiOrigin).origin));proxy.on("proxyRes",res=>{if(res.headers.location?.startsWith(apiOrigin))res.headers.location=res.headers.location.slice(apiOrigin.length)||"/";if(res.headers["set-cookie"])res.headers["set-cookie"]=res.headers["set-cookie"].map(cookie=>cookie.replace(/;\s*Secure/gi,""));});}}}},define:{
 "process.env.NEXT_PUBLIC_SUPABASE_URL":JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL||""),
 "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||""),
 "process.env.NEXT_PUBLIC_MAP_TILE_URL":JSON.stringify(env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
 "import.meta.env.VITE_API_ORIGIN":JSON.stringify(apiOrigin)
 },build:{outDir:"dist",emptyOutDir:true,sourcemap:false}};
});
