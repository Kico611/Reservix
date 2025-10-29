// ScheduleTable.jsx
import React from "react";
import { days } from "../utils/dateUtils";

export default function ScheduleTable({
  weekSchedule,
  dayTimes,
  intervals,
  handleTermClick,
  formatPhoneNumber,
  weekStart,
}) {
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const dayShortToOffset = {
    Pon: 0,
    Uto: 1,
    Sri: 2,
    Čet: 3,
    Pet: 4,
    Sub: 5,
    Ned: 6,
  };

  const getDateForDay = (dayShort) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + (dayShortToOffset[dayShort] ?? 0));
    return date;
  };

  const getTermCells = (dayShort) => {
    if (!dayTimes[dayShort]) {
      return [
        <td key="empty" className="empty-cell" colSpan={intervals.length}>
          Postavite radno vrijeme
        </td>,
      ];
    }

    const cells = [];
    const dayTerms = weekSchedule[dayShort] || [];
    const dayStart = dayTimes[dayShort].start;
    const dayEnd = dayTimes[dayShort].end;

    let i = 0;
    while (i < intervals.length) {
      const intStart = intervals[i].time;
      const intStartMin = timeToMinutes(intStart);

      if (intStart < dayStart || intStart >= dayEnd) {
        cells.push(<td key={`empty-${i}`}></td>);
        i++;
        continue;
      }

      const term = dayTerms.find((t) => {
        if (!t.od || !t.do) return false;
        const odMin = timeToMinutes(t.od);
        const doMin = timeToMinutes(t.do);
        return intStartMin >= odMin && intStartMin < doMin;
      });

      const termDatum = getDateForDay(dayShort); // TOČAN DATUM IZ TJEDNA

      if (term) {
        let span = 0;
        for (let j = i; j < intervals.length; j++) {
          const sMin = timeToMinutes(intervals[j].time);
          const odMin = timeToMinutes(term.od);
          const doMin = timeToMinutes(term.do);
          if (sMin >= odMin && sMin < doMin) span++;
          else break;
        }
        if (span <= 0) span = 1;

        let className = "booked";
        let handleClick = () => handleTermClick(dayShort, intStart, term, termDatum);

        if (term.status === "otkazan") {
          className += " cancelled";
          handleClick = null;
        }

        cells.push(
          <td
            key={`term-${i}-${term.rezervirao || Math.random()}`}
            className={className}
            colSpan={span}
            onClick={handleClick}
          >
            <div className="booked-label">
              {term.status === "otkazan"
                ? "Otkazan"
                : formatPhoneNumber?.(term.rezervirao) || "Nepoznat"}
            </div>
          </td>
        );
        i += span;
      } else {
        cells.push(
          <td
            key={`free-${i}`}
            onClick={() => handleTermClick(dayShort, intStart, null, termDatum)}
          ></td>
        );
        i++;
      }
    }

    return cells;
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th></th>
            {intervals.map((it) => (
              <th key={it.time} className="hour-cell">
                {it.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <td className="day-cell">{day}</td>
              {getTermCells(day)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
