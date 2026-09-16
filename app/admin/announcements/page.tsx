import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminAnnouncements } from "@/components/admin-announcements";
import { isAuthenticatedAdmin } from "@/lib/server/security";

export const dynamic = "force-dynamic";
export default async function Page(){if(!(await isAuthenticatedAdmin()))redirect("/login?returnTo=/admin/announcements");return <><SiteHeader/><AdminAnnouncements/></>;}
