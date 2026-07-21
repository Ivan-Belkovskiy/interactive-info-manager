import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const hasSession = request.cookies.has("user_session");

    if (pathname === "/") {
        if (!hasSession) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    if (pathname.startsWith("/login") && hasSession) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/:path*"],
};