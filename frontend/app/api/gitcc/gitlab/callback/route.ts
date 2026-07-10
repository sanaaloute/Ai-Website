import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy GitHub OAuth callback to the backend.
 *
 * In production, nginx routes /api/* directly to the backend, so this file is
 * not reached. In local development, the frontend (port 3000) and backend
 * (port 4000) run separately and the GitHub OAuth redirect URI points at the
 * frontend, so we forward the request here.
 */
export async function GET(request: NextRequest) {
  // Server-side proxy: prefer the internal Docker hostname so the container can
  // reach the backend even when NEXT_PUBLIC_BACKEND_URL points at localhost.
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL?.replace(/\/$/u, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/u, "") ||
    "http://localhost:4000";
  const targetUrl = `${backendUrl}/api/gitcc/gitlab/callback?${request.nextUrl.searchParams.toString()}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      redirect: "manual",
    });

    const response = new NextResponse(upstream.body ?? undefined, {
      status: upstream.status,
      statusText: upstream.statusText,
    });

    upstream.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[GitHub callback proxy] upstream error:', message);
    return NextResponse.json(
      { success: false, error: `GitHub callback proxy failed: ${message}` },
      { status: 502 }
    );
  }
}
