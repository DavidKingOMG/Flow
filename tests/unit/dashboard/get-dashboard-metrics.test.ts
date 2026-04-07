import { beforeEach, describe, expect, it, vi } from "vitest";

const metricsState = vi.hoisted(() => {
  const invoiceAggregate = vi.fn();
  const invoiceCount = vi.fn();

  return {
    invoiceAggregate,
    invoiceCount,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      aggregate: metricsState.invoiceAggregate,
      count: metricsState.invoiceCount,
    },
  },
}));

import { getDashboardMetrics } from "@/lib/dashboard/get-dashboard-metrics";

describe("getDashboardMetrics", () => {
  beforeEach(() => {
    metricsState.invoiceAggregate.mockReset();
    metricsState.invoiceCount.mockReset();

    metricsState.invoiceAggregate.mockResolvedValue({
      _sum: {
        paidAmount: 128400,
      },
    });
    metricsState.invoiceCount
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(24);
  });

  it("returns key finance and invoice summary cards", async () => {
    const result = await getDashboardMetrics("biz_123");

    expect(metricsState.invoiceAggregate).toHaveBeenCalledWith({
      where: {
        businessId: "biz_123",
        status: "PAID",
      },
      _sum: {
        paidAmount: true,
      },
    });

    expect(result.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "revenue" }),
        expect.objectContaining({ key: "overdue" }),
      ]),
    );
  });
});
