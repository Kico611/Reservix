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
      // Datum dolazi u formatu yyyy-mm-dd
      const date = new Date(datum);

      console.log("Parsing datum:", datum, "->", date, "is valid:", !isNaN(date));

      if (!isNaN(date) && date >= monday && date <= sunday) {
        // JavaScript getDay() vraća 0 za nedjelju, 1-6 za pon-sub
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        console.log("Adding schedule for day:", dayName);

        schedule[dayName] = (data.zauzeti_termini || []).map((t) => ({
          ...t,
          datum
        }));

        if (data.pocetak_rada && data.kraj_rada) {
          times[dayName] = {
            start: data.pocetak_rada,
            end: data.kraj_rada
          };
          console.log("Set working hours for", dayName, ":", times[dayName]);
        }
      } else {
        console.log("Datum not in current week or invalid:", datum);
      }
    });

    const weekIntervals = generateIntervalsForWeek(times);
    console.log("Generated intervals:", weekIntervals);

    return { weekSchedule: schedule, dayTimes: times, intervals: weekIntervals };
  }, [salon, monday, sunday]);

  return { weekSchedule, dayTimes, intervals, label, monday, sunday };
}
