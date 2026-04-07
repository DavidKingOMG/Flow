export type RecurringFrequencyValue = "WEEKLY" | "MONTHLY";

type ScheduleAnchorInput = {
  frequency: RecurringFrequencyValue;
  startsAt: Date;
};

type NextRunInput = {
  frequency: RecurringFrequencyValue;
  intervalCount: number;
  scheduledFor: Date;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
};

function cloneAtLocalNoon(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function getScheduleAnchor({ frequency, startsAt }: ScheduleAnchorInput) {
  return {
    dayOfWeek: frequency === "WEEKLY" ? startsAt.getDay() : null,
    dayOfMonth: frequency === "MONTHLY" ? startsAt.getDate() : null,
    nextRunAt: cloneAtLocalNoon(startsAt),
  };
}

export function calculateNextRunAt({
  frequency,
  intervalCount,
  scheduledFor,
  dayOfWeek,
  dayOfMonth,
}: NextRunInput): Date {
  if (frequency === "WEEKLY") {
    const nextRun = cloneAtLocalNoon(scheduledFor);
    nextRun.setDate(nextRun.getDate() + intervalCount * 7);

    if (dayOfWeek !== null) {
      nextRun.setDate(nextRun.getDate() - nextRun.getDay() + dayOfWeek);
    }

    return nextRun;
  }

  const anchorDayOfMonth = dayOfMonth ?? scheduledFor.getDate();

  return new Date(
    scheduledFor.getFullYear(),
    scheduledFor.getMonth() + intervalCount,
    anchorDayOfMonth,
    scheduledFor.getHours(),
    scheduledFor.getMinutes(),
    scheduledFor.getSeconds(),
    scheduledFor.getMilliseconds(),
  );
}

export function calculateDueDate(issuedAt: Date, dueInDays: number): Date {
  const dueAt = cloneAtLocalNoon(issuedAt);
  dueAt.setDate(dueAt.getDate() + dueInDays);
  return dueAt;
}
