import { useMemo } from "react";
import { days, getWeekRange } from "../utils/dateUtils";
import { generateIntervalsForWeek } from "../utils/timeUtils";

export function useWeekSchedule(salon, weekStart) {
  const { monday, sunday, label } = getWeekRange(weekStart);

  const { weekSchedule, dayTimes, intervals } = useMemo(() => {
    const schedule = {};
    const times = {};

    if (!salon?.raspored) {
      console.log("⚠️ Nema rasporeda za salon ili raspored nije učitan.");
      return { weekSchedule: schedule, dayTimes: times, intervals: [] };
    }

    Object.entries(salon.raspored).forEach(([datum, data]) => {
      // ✅ Parsiranje datuma u lokalnoj vremenskoj zoni
      let date;
      if (datum.includes("T")) {
        // Ako je već ISO format, napravi običan Date
        date = new Date(datum);
      } else {
        // Inače parsiraj kao lokalni datum (bez UTC pomaka)
        const [y, m, d] = datum.split("-");
        date = new Date(y, m - 1, d);
      }
      date.setHours(0, 0, 0, 0); // reset vremena

      // Logiraj sve datume da vidiš jesu li točni
      console.log(
        "📅 Datum iz baze:",
        datum,
        "→ Parsed lokalno:",
        date,
        "| ISO:",
        date.toISOString(),
        "| Monday:",
        monday.toDateString(),
        "| Sunday:",
        sunday.toDateString()
      );

      if (!isNaN(date) && date >= monday && date <= sunday) {
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        console.log("✅ Dodajem raspored za dan:", dayName);

        schedule[dayName] = (data.zauzeti_termini || []).map((t) => ({
          ...t,
          datum,
        }));

        if (data.pocetak_rada && data.kraj_rada) {
          times[dayName] = {
            start: data.pocetak_rada,
            end: data.kraj_rada,
          };
          console.log("🕓 Radno vrijeme za", dayName, ":", times[dayName]);
        }
      } else {
        console.log("🚫 Datum nije u tekućem tjednu ili je nevažeći:", datum);
      }
    });

    // Generiranje intervala za tjedan
    const weekIntervals = generateIntervalsForWeek(times).map((interval) => {
      const dayName = interval.day;
      const date = new Date(monday);
      const dayIndex = days.indexOf(dayName);
      date.setDate(monday.getDate() + dayIndex);
      date.setHours(0, 0, 0, 0);

      return { ...interval, datum: date };
    });

    console.log("🧩 Generirani intervali:", weekIntervals);

    return { weekSchedule: schedule, dayTimes: times, intervals: weekIntervals };
  }, [salon, monday, sunday]);

  return { weekSchedule, dayTimes, intervals, label, monday, sunday };
}
