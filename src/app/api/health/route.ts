import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date().toISOString();

  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "flow",
        timestamp: now,
        dependencies: {
          database: "up",
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "flow",
        timestamp: now,
        dependencies: {
          database: "down",
        },
      },
      { status: 503 },
    );
  }
}
