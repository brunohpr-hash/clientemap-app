import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent, err } from "@/lib/api";

// GET /api/notifications — current user's notifications
export const GET = withAuth(async (request, _context, { user }) => {
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.sub,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, type: true, title: true, message: true,
      referenceId: true, referenceType: true, isRead: true, createdAt: true,
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.sub, isRead: false },
  });

  return ok({ notifications, unreadCount });
});

// PATCH /api/notifications — mark all as read
export const PATCH = withAuth(async (_request, _context, { user }) => {
  await prisma.notification.updateMany({
    where: { userId: user.sub, isRead: false },
    data: { isRead: true },
  });
  return noContent();
});
