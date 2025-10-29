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
      date.setHours(0, 0, 0, 0); // ignoriramo vrijeme

      if (!isNaN(date) && date >= monday && date <= sunday) {
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];

        // Dodaj termine i pauze
        schedule[dayName] = {
          termini: (data.zauzeti_termini || []).map((t) => ({
            ...t,
            datum
          })),
          pauze: (data.pauze || []).map((p) => ({
            ...p,
            datum
          }))
        };

        if (data.pocetak_rada && data.kraj_rada) {
          times[dayName] = {
            start: data.pocetak_rada,
            end: data.kraj_rada
          };
        }
      }
    });

    // Generiraj intervale za tjedan
    const weekIntervals = generateIntervalsForWeek(times).map((interval) => {
      const dayName = interval.day;
      const date = new Date(monday);
      const dayIndex = days.indexOf(dayName);
      date.setDate(monday.getDate() + dayIndex);
      date.setHours(0, 0, 0, 0);
      return { ...interval, datum: date };
    });

    return { weekSchedule: schedule, dayTimes: times, intervals: weekIntervals };
  }, [salon, monday, sunday]);

  return { weekSchedule, dayTimes, intervals, label, monday, sunday };
}
