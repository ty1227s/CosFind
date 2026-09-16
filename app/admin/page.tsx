import {redirect} from "next/navigation";
import {SiteHeader} from "@/components/site-header";
import {AdminManager} from "@/components/admin-manager";
import {isAuthenticatedAdmin} from "@/lib/server/security";

export const dynamic="force-dynamic";
export default async function AdminPage(){
 if(!(await isAuthenticatedAdmin()))redirect("/login?returnTo=/admin");
 return <><SiteHeader/><AdminManager/></>;
}
