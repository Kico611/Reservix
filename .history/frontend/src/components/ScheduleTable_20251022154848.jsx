import React from "react";
import { days } from "../utils/dateUtils";

export default function ScheduleTable({
  weekSchedule,
  dayTimes,
  intervals,
  handleTermClick,
  formatPhoneNumber,
}) {
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const getTermCells = (dayShort) => {
    if (!dayTimes[dayShort]) {
      return [
        <td key="empty" className="empty-cell" colSpan={3}>
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
        const odMin = timeToMinutes(t.od);
        const doMin = timeToMinutes(t.do);
        return intStartMin >= odMin && intStartMin < doMin;
      });

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
        let handleClick = () =>
          handleTermClick(dayShort, intStart, term, term.datum);

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
                : formatPhoneNumber(term.rezervirao) || "Nepoznat"}
            </div>
          </td>
        );
        i += span;
      } else {
        cells.push(
          <td
            key={`free-${i}`}
            onClick={() =>
              handleTermClick(
                dayShort,
                intStart,
                null,
                weekSchedule[dayShort]?.[0]?.datum
              )
            }
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
