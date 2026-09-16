import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/server/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  for (const name of ["sb-access-token", "sb-refresh-token"]) {
    response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", maxAge: 0, path: "/" });
  }
  return response;
}
