import { redirect } from "next/navigation";

export default function AdminLogin() {
  redirect("/login?returnTo=/admin");
}
