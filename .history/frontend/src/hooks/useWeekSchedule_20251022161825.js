import { useMemo } from "react";
import { days, getWeekRange } from "../utils/dateUtils";
import { generateIntervalsForWeek } from "../utils/timeUtils";

export function useWeekSchedule(salon, weekStart) {
  const { monday, sunday, label } = getWeekRange(weekStart);

  const { weekSchedule, dayTimes, intervals } = useMemo(() => {
    const schedule = {};
    const times = {};

    if (!salon?.raspored) return { weekSchedule: schedule, dayTimes: times, intervals: [] };

    Object.entries(salon.raspored).forEach(([datum, data]) => {
      const date = new Date(datum);
      if (date >= monday && date <= sunday) {
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];

        schedule[dayName] = (data.zauzeti_termini || []).map((t) => ({
          ...t,
          datum
        }));

        if (data.pocetak_rada && data.kraj_rada) {
          times[dayName] = {
            start: data.pocetak_rada,
            end: data.kraj_rada
          };
        }
      }
    });

    const weekIntervals = generateIntervalsForWeek(times);

    return { weekSchedule: schedule, dayTimes: times, intervals: weekIntervals };
  }, [salon, monday, sunday]);

  return { weekSchedule, dayTimes, intervals, label, monday, sunday };
}
