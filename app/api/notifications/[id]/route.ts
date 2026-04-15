import { prisma } from "@/lib/prisma";
import { withAuth, ok, err } from "@/lib/api";

// PATCH /api/notifications/:id — mark single as read
export const PATCH = withAuth(async (_request, context, { user }) => {
  const { id } = await context.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.sub },
  });

  if (!notification) return err("Notificação não encontrada", 404);

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: { id: true, isRead: true },
  });

  return ok(updated);
});
