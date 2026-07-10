import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export type TokenPayload = { userId: string; email: string; role: string };

export async function getPayload(
  request: NextRequest
): Promise<TokenPayload | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { userId: payload.userId, email: payload.email, role: payload.role };
}

export function isAdmin(payload: TokenPayload | null): boolean {
  return payload?.role === "admin";
}
