import {Capacitor,CapacitorHttp} from "@capacitor/core";
import {apiOrigin} from "./config";
const webFetch=window.fetch.bind(window);
export async function apiFetch(input:RequestInfo|URL,init:RequestInit={}):Promise<Response>{
 const local=new URL(input instanceof Request?input.url:String(input),window.location.href);
 if(local.origin!==window.location.origin||!local.pathname.startsWith("/api/"))return webFetch(input,init);
 if(!Capacitor.isNativePlatform())return webFetch(input,init); // Vite dev server proxies /api without CORS changes.
 const url=new URL(local.pathname+local.search,apiOrigin).href;
 const headers=new Headers(input instanceof Request?input.headers:undefined);new Headers(init.headers).forEach((v,k)=>headers.set(k,v));
 // Native HTTP has no browser Origin; set the destination's origin for the existing CSRF check.
 headers.set("Origin",apiOrigin);
 let data:unknown=init.body;
 if(data===undefined&&input instanceof Request&&input.method!=="GET"&&input.method!=="HEAD")data=await input.clone().text();
 let dataType:"formData"|undefined;
 if(data instanceof FormData){
 const entries=[];for(const [key,value] of data){if(typeof value==="string")entries.push({key,value,type:"string"});else{const bytes=new Uint8Array(await value.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));entries.push({key,value:btoa(binary),type:"base64File",fileName:value.name,contentType:value.type});}}
 data=entries;dataType="formData";headers.set("Content-Type","multipart/form-data");
 }else if(data instanceof URLSearchParams){data=data.toString();headers.set("Content-Type","application/x-www-form-urlencoded");}
 if(typeof data==="string"&&headers.get("Content-Type")?.includes("application/json"))data=JSON.parse(data);
 const signal=init.signal??(input instanceof Request?input.signal:null);
 if(signal?.aborted)throw new DOMException("Aborted","AbortError");
 const result=await CapacitorHttp.request({url,method:init.method??(input instanceof Request?input.method:"GET"),headers:Object.fromEntries(headers),data,dataType,disableRedirects:true,connectTimeout:15000,readTimeout:45000,responseType:"text"});
 if(signal?.aborted)throw new DOMException("Aborted","AbortError");
 const responseHeaders=new Headers(result.headers);
 const body=result.status===204||result.status===304?null:typeof result.data==="string"?result.data:JSON.stringify(result.data);
 return new Response(body,{status:result.status,headers:responseHeaders});
}
export function installApiTransport(){window.fetch=apiFetch;}
