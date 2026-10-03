import {useEffect,useState,type ComponentProps} from "react";
import Link from "next/link";
import {useLocation} from "../compat/navigation";
import {SiteHeader} from "@/components/site-header";
import {AnnouncementsView} from "@/components/pages/announcements";
import {AnnouncementView} from "@/components/pages/announcement";
import {BrandsView} from "@/components/pages/brands";
import {BrandView} from "@/components/pages/brand";
import {ProductView} from "@/components/pages/product";
import {NewProductsView} from "@/components/pages/new-products";
import {StoreView} from "@/components/pages/store";
import {AreasView} from "@/components/pages/areas";
import {PrefectureView} from "@/components/pages/prefecture";
import {MunicipalityView} from "@/components/pages/municipality";
import {StationsView} from "@/components/pages/stations";
import {StationView} from "@/components/pages/station";
import {LinesView} from "@/components/pages/lines";
import {LineView} from "@/components/pages/line";
type Models={"announcements":ComponentProps<typeof AnnouncementsView>["model"];"announcement":ComponentProps<typeof AnnouncementView>["model"];"brands":ComponentProps<typeof BrandsView>["model"];"brand":ComponentProps<typeof BrandView>["model"];"product":ComponentProps<typeof ProductView>["model"];"new-products":ComponentProps<typeof NewProductsView>["model"];"store":ComponentProps<typeof StoreView>["model"];"areas":ComponentProps<typeof AreasView>["model"];"prefecture":ComponentProps<typeof PrefectureView>["model"];"municipality":ComponentProps<typeof MunicipalityView>["model"];"stations":ComponentProps<typeof StationsView>["model"];"station":ComponentProps<typeof StationView>["model"];"lines":ComponentProps<typeof LinesView>["model"];"line":ComponentProps<typeof LineView>["model"]};
export default function PublicPage(){
 const url=useLocation(),parts=url.pathname.split("/").filter(Boolean).map(x=>{try{return decodeURIComponent(x)}catch{return x}}),q=new URLSearchParams(url.search);let kind:keyof Models|undefined;
 if(parts[0]==="brands"){if(parts[1]==="detail"&&parts.length===3){kind="brand";q.set("id",parts[2]);}else if(parts.length<=2){kind="brands";q.set("initial",parts[1]==="other"?"その他":parts[1]??"");}}
 if(parts[0]==="products"&&parts.length===2){kind=parts[1]==="new"?"new-products":"product";q.set("id",parts[1]);}
 if(parts[0]==="stores"&&parts.length===2){kind="store";q.set("id",parts[1]);}
 if(parts[0]==="announcements"&&parts.length<=2){kind=parts.length===1?"announcements":"announcement";q.set("id",parts[1]??"");}
 if(parts[0]==="areas"&&parts.length<=3){kind=parts.length===1?"areas":parts.length===2?"prefecture":"municipality";q.set("prefecture",parts[1]??"");q.set("municipality",parts[2]??"");}
 if(parts[0]==="stations"&&parts.length<=2){kind=parts.length===1?"stations":"station";q.set("station",parts[1]??"");}
 if(parts[0]==="lines"&&parts.length<=2){kind=parts.length===1?"lines":"line";q.set("line",parts[1]??"");}
 if(kind)q.set("kind",kind);const query=q.toString();
 const [model,setModel]=useState<Models[keyof Models]|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!kind)return;const controller=new AbortController();fetch("/api/mobile/pages?"+query,{signal:controller.signal}).then(async response=>{if(!response.headers.get("content-type")?.includes("application/json"))throw new Error("サーバーのアプリ対応更新が必要です。");const data=await response.json();if(!response.ok)throw new Error(data.error||"読み込めませんでした");if(!controller.signal.aborted)setModel(data)}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"通信できませんでした")});return()=>controller.abort()},[kind,query,retry]);
 if(!kind)return <><SiteHeader/><main className="center-page">ページが見つかりませんでした。<Link href="/">トップへ戻る</Link></main></>;
 if(error||!model)return <><SiteHeader/><main className="center-page" role="status">{error||"読み込み中…"}{error&&<button onClick={()=>{setError("");setModel(null);setRetry(retry+1)}}>再試行</button>}</main></>;
 switch(kind){case "announcements":return <AnnouncementsView model={model as Models["announcements"]}/>;
case "announcement":return <AnnouncementView model={model as Models["announcement"]}/>;
case "brands":return <BrandsView model={model as Models["brands"]}/>;
case "brand":return <BrandView model={model as Models["brand"]}/>;
case "product":return <ProductView model={model as Models["product"]}/>;
case "new-products":return <NewProductsView model={model as Models["new-products"]}/>;
case "store":return <StoreView model={model as Models["store"]}/>;
case "areas":return <AreasView model={model as Models["areas"]}/>;
case "prefecture":return <PrefectureView model={model as Models["prefecture"]}/>;
case "municipality":return <MunicipalityView model={model as Models["municipality"]}/>;
case "stations":return <StationsView model={model as Models["stations"]}/>;
case "station":return <StationView model={model as Models["station"]}/>;
case "lines":return <LinesView model={model as Models["lines"]}/>;
case "line":return <LineView model={model as Models["line"]}/>;}
}
