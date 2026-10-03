import {navigate} from "../compat/navigation";
import {apiOrigin} from "./config";
import {internalRedirect} from "./redirect";
export function installNavigation(){
 document.addEventListener("click",event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const a=(event.target as Element).closest?.("a[href]") as HTMLAnchorElement|null;if(!a||a.download||a.target==="_blank")return;
 const url=new URL(a.href);if(url.origin!==location.origin||url.pathname.startsWith("/api/"))return;
 event.preventDefault();navigate(url.pathname+url.search+url.hash,a.dataset.mobileReplace==="true",a.dataset.mobileScroll!=="false");
 });
 document.addEventListener("submit",event=>{
 if(event.defaultPrevented)return;const form=event.target as HTMLFormElement;const target=new URL(form.action);
 if(target.origin!==location.origin||!target.pathname.startsWith("/api/"))return;
 event.preventDefault();if(form.dataset.submitting)return;form.dataset.submitting="true";
 const buttons=Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"],button:not([type])'));buttons.forEach(button=>button.disabled=true);
 const status=document.createElement("p");status.className="form-error";status.setAttribute("role","alert");
 void fetch(target.pathname,{method:form.method.toUpperCase(),body:new URLSearchParams(Array.from(new FormData(form)).map(([k,v])=>[k,String(v)]))}).then(async response=>{
 const redirect=response.headers.get("Location");
 if(redirect){navigate(internalRedirect(redirect,apiOrigin),true);window.dispatchEvent(new Event("cosfind-profile-updated"));return;}
 // The Vite proxy follows redirects; only its same-origin final URL is accepted.
 if(response.redirected){const next=new URL(response.url);if(next.origin!==location.origin)throw new Error("不正な移動先です");navigate(next.pathname+next.search+next.hash,true);return;}
 const result=await response.json().catch(()=>null);throw new Error(result?.error||"処理を完了できませんでした。再度お試しください。");
 }).catch(error=>{status.textContent=error instanceof Error?error.message:"通信できませんでした";form.querySelector('[role="alert"]')?.remove();form.append(status);}).finally(()=>{delete form.dataset.submitting;buttons.forEach(button=>button.disabled=false);});
 });
}
