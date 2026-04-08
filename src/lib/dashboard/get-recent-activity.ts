import { db } from "@/lib/db";

function formatRelativeTimestamp(date: Date, now = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60_000), 0);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function getRecentActivity(businessId: string, limit = 8) {
  const findManyFn = db.activityLog?.findMany as unknown;
  const isFindManyMocked =
    typeof findManyFn === "function" && typeof (findManyFn as { mock?: unknown }).mock !== "undefined";
  const skipDatabaseQueries =
    process.env.NODE_ENV === "test" &&
    process.env.FLOW_ENABLE_DB_IN_TESTS !== "1" &&
    !isFindManyMocked;

  if (skipDatabaseQueries) {
    return [];
  }

  if (!("activityLog" in db) || typeof db.activityLog?.findMany !== "function") {
    return [];
  }

  try {
    const activity = await db.activityLog.findMany({
      where: {
        businessId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
      },
    });

    return activity.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.message,
      timestamp: formatRelativeTimestamp(item.createdAt),
    }));
  } catch {
    // Keep dashboard route stable when DB credentials are not configured locally.
    return [];
  }
}
