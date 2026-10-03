import {useMemo,useSyncExternalStore} from "react";
const listeners=new Set<()=>void>();
let version=0;
function notify(){version++;listeners.forEach(fn=>fn());}
window.addEventListener("popstate",()=>{notify();});
export function navigate(href:string,replace=false,scroll=true){
 const url=new URL(href,window.location.href);
 if(url.origin!==window.location.origin){window.open(url.href,"_blank","noopener,noreferrer");return;}
 window.history[replace?"replaceState":"pushState"]({},"",url.pathname+url.search+url.hash);notify();if(scroll)window.scrollTo(0,0);
}
export function useLocation(){useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},()=>window.location.href+"|"+version);return new URL(window.location.href);}
export function usePathname(){return useLocation().pathname;}
export function useSearchParams(){const search=useLocation().search;return useMemo(()=>new URLSearchParams(search),[search]);}
const router={push:(url:string,options?:{scroll?:boolean})=>navigate(url,false,options?.scroll!==false),replace:(url:string,options?:{scroll?:boolean})=>navigate(url,true,options?.scroll!==false),back:()=>history.back(),forward:()=>history.forward(),refresh:()=>notify(),prefetch:(url:string)=>{void url}};
export function useRouter(){return router;}
export function redirect(href:string):never{navigate(href,true);throw new Error("Navigation redirected");}
export function notFound():never{throw new Error("ページが見つかりませんでした");}
