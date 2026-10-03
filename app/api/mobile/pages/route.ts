import {NextResponse} from "next/server";
import {UUID_PATTERN} from "@/lib/server/validation";
import {loadPage as Announcements} from "@/lib/server/mobile-pages/announcements";
import {loadPage as Announcement} from "@/lib/server/mobile-pages/announcement";
import {loadPage as Brands} from "@/lib/server/mobile-pages/brands";
import {loadPage as Brand} from "@/lib/server/mobile-pages/brand";
import {loadPage as Product} from "@/lib/server/mobile-pages/product";
import {loadPage as NewProducts} from "@/lib/server/mobile-pages/new-products";
import {loadPage as Store} from "@/lib/server/mobile-pages/store";
import {loadPage as Areas} from "@/lib/server/mobile-pages/areas";
import {loadPage as Prefecture} from "@/lib/server/mobile-pages/prefecture";
import {loadPage as Municipality} from "@/lib/server/mobile-pages/municipality";
import {loadPage as Stations} from "@/lib/server/mobile-pages/stations";
import {loadPage as Station} from "@/lib/server/mobile-pages/station";
import {loadPage as Lines} from "@/lib/server/mobile-pages/lines";
import {loadPage as Line} from "@/lib/server/mobile-pages/line";
export const dynamic="force-dynamic";
// Fixed public page models only. Private actions continue using authenticated APIs.
export async function GET(request:Request){
 const q=new URL(request.url).searchParams,id=q.get("id")??"",kind=q.get("kind");
 if(["brand","product","store","announcement"].includes(kind??"")&&!UUID_PATTERN.test(id))return NextResponse.json({error:"見つかりませんでした"},{status:404});
 try{const params=Promise.resolve({id});let model;switch(kind){
 case "announcements":model=await Announcements({searchParams:Promise.resolve({page:q.get("page")??undefined})});break;
case "announcement":model=await Announcement({params});break;
case "brands":model=await Brands({requested:q.get("initial")??""});break;
case "brand":model=await Brand({params});break;
case "product":model=await Product({params});break;
case "new-products":model=await NewProducts({searchParams:Promise.resolve({date:q.get("date")??undefined})});break;
case "store":model=await Store({params});break;
case "areas":model=await Areas();break;
case "prefecture":model=await Prefecture({params:Promise.resolve({prefecture:q.get("prefecture")??""})});break;
case "municipality":model=await Municipality({params:Promise.resolve({prefecture:q.get("prefecture")??"",municipality:q.get("municipality")??""})});break;
case "stations":model=await Stations();break;
case "station":model=await Station({params:Promise.resolve({station:q.get("station")??""})});break;
case "lines":model=await Lines({searchParams:Promise.resolve({region:q.get("region")??undefined,company:q.get("company")??undefined})});break;
case "line":model=await Line({params:Promise.resolve({line:q.get("line")??""})});break;
 default:return NextResponse.json({error:"見つかりませんでした"},{status:404});}
 return NextResponse.json(model,{headers:{"Cache-Control":"no-store"}});
 }catch(error){const missing=typeof error==="object"&&error!==null&&"digest" in error&&String(error.digest).includes("404");return NextResponse.json({error:missing?"見つかりませんでした":"読み込めませんでした。再度お試しください。"},{status:missing?404:503});}
}
