import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin, withAuth, ok, validationError, err } from "@/lib/api";

// GET /api/settings — public read (used by the app shell)
export const GET = withAuth(async () => {
  const settings = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return ok(map);
});

const updateSchema = z.record(z.string(), z.unknown());

// PATCH /api/settings — admin only
export const PATCH = withAdmin(async (request, _context, { user }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const updates = Object.entries(parsed.data);

  await Promise.all(
    updates.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as never, updatedBy: user.sub },
        create: { key, value: value as never, updatedBy: user.sub },
      })
    )
  );

  return ok({ updated: updates.length });
});
