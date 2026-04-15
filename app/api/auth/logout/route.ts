import { clearAuthCookies } from "@/lib/auth";
import { writeAuditLog, getClientIp } from "@/lib/audit";

export async function POST(request: Request): Promise<Response> {
  const userId = request.headers.get("x-user-id") ?? undefined;

  await clearAuthCookies();

  await writeAuditLog({
    userId,
    action: "logout",
    entityType: "user",
    entityId: userId,
    ipAddress: getClientIp(request),
  });

  return Response.json({ success: true });
}
