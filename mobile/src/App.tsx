import {Component,Suspense,lazy,useEffect,useState,type ComponentType,type ReactNode} from "react";
import {useLocation,navigate} from "./compat/navigation";
import {SiteHeader} from "@/components/site-header";
const routes:Record<string,ReturnType<typeof lazy<ComponentType>>>={
 "/":lazy(()=>import("./pages/map")),"/map":lazy(()=>import("./pages/map")),
 "/products":lazy(()=>import("@/app/products/page")),"/login":lazy(()=>import("@/app/login/page")),
 "/forgot-password":lazy(()=>import("@/app/forgot-password/page")),"/reset-password":lazy(()=>import("@/app/reset-password/page")),
 "/profile":lazy(()=>import("@/app/profile/page")),"/profile/settings":lazy(()=>import("@/app/profile/settings/page")),"/profile/settings/delete":lazy(()=>import("@/app/profile/settings/delete/page")),
 "/profile/favorites/products":lazy(()=>import("@/app/profile/favorites/products/page")),"/profile/favorites/stores":lazy(()=>import("@/app/profile/favorites/stores/page")),
 "/profile/history/products":lazy(()=>import("@/app/profile/history/products/page")),"/profile/history/stores":lazy(()=>import("@/app/profile/history/stores/page")),"/profile/history/reports":lazy(()=>import("@/app/profile/history/reports/page")),
 "/requests/product":lazy(()=>import("@/app/requests/product/page")),"/requests/store":lazy(()=>import("@/app/requests/store/page")),
 "/report":lazy(()=>import("@/components/report-form").then(m=>({default:m.ReportForm}))),
 "/admin":lazy(()=>import("./pages/admin")),"/admin/announcements":lazy(()=>import("./pages/admin-announcements")),
};
const PublicPage=lazy(()=>import("./pages/public"));
function State({children}:{children:ReactNode}){return <><SiteHeader/><main className="center-page" role="status">{children}</main></>;}
class ScreenBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<State>画面を開けませんでした。<button onClick={()=>location.reload()}>再読み込み</button></State>:this.props.children;}}
function Protected({children,admin=false}:{children:ReactNode;admin?:boolean}){const [state,setState]=useState("loading");useEffect(()=>{let active=true;fetch("/api/auth/session").then(r=>r.json()).then(data=>{if(!active)return;if(!data.authenticated)navigate("/login?returnTo="+encodeURIComponent(location.pathname),true);else setState(admin&&!data.isAdmin?"denied":"ready");}).catch(()=>{if(active)setState("error")});return()=>{active=false}},[admin]);return state==="ready"?<>{children}</>:<State>{state==="denied"?"管理者権限が必要です":state==="error"?"通信できませんでした。再読み込みしてください。":"読み込み中…"}</State>;}
export function App(){const url=useLocation();const pathname=url.pathname;useEffect(()=>{if(pathname==="/profile/favorites")navigate("/profile/favorites/products",true);if(pathname==="/admin/login")navigate("/login?returnTo=/admin",true)},[pathname]);const Page=routes[pathname];let content:ReactNode=Page?<Page/>:<PublicPage/>;if(pathname.startsWith("/admin")||pathname==="/report")content=<Protected admin={pathname.startsWith("/admin")}>{content}</Protected>;return <ScreenBoundary key={url.pathname+url.search}><Suspense fallback={<State>読み込み中…</State>}>{content}</Suspense></ScreenBoundary>;}
