import { ZodError } from "zod";
import { verifyRequestToken, type JwtPayload } from "./auth";
import { writeAuditLog, getClientIp } from "./audit";

// ── Response helpers ──────────────────────────────────────────

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function created<T>(data: T): Response {
  return Response.json({ success: true, data }, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function err(message: string, status: number): Response {
  return Response.json({ success: false, error: message }, { status });
}

export function validationError(error: ZodError): Response {
  return Response.json(
    { success: false, error: "Validation error", details: error.flatten() },
    { status: 422 }
  );
}

// ── Auth guard ────────────────────────────────────────────────

export interface AuthContext {
  user: JwtPayload;
}

type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
  auth: AuthContext
) => Promise<Response>;

type AdminRouteHandler = RouteHandler;

export function withAuth(handler: RouteHandler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    try {
      const user = verifyRequestToken(request);
      return handler(request, context, { user });
    } catch {
      return err("Unauthorized", 401);
    }
  };
}

export function withAdmin(handler: AdminRouteHandler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    try {
      const user = verifyRequestToken(request);
      if (user.role !== "admin") return err("Forbidden", 403);
      return handler(request, context, { user });
    } catch {
      return err("Unauthorized", 401);
    }
  };
}

// ── Pagination helper ─────────────────────────────────────────

export function getPagination(url: string): { skip: number; take: number; page: number } {
  const { searchParams } = new URL(url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const take = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * take;
  return { skip, take, page };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  take: number
): Response {
  return Response.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
}

// ── Rate limiting (in-memory, per-process, for auth routes) ──

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  max = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
