import { beforeEach, describe, expect, it, vi } from "vitest";

const healthState = vi.hoisted(() => {
  const queryRaw = vi.fn();

  return {
    queryRaw,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: healthState.queryRaw,
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    healthState.queryRaw.mockReset();
  });

  it("returns 200 when database dependency is healthy", async () => {
    healthState.queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      dependencies: { database: string };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dependencies.database).toBe("up");
  });

  it("returns 503 when database dependency is unavailable", async () => {
    healthState.queryRaw.mockRejectedValueOnce(new Error("connection failed"));

    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      dependencies: { database: string };
    };

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.dependencies.database).toBe("down");
  });
});
