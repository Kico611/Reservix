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
  const cells = [];

  // Pravilno dohvaćanje termina i pauza iz strukture weekSchedule
  const dayData = weekSchedule[dayShort] || {};
  const dayTerms = (dayData.termini || []).sort((a, b) => timeToMinutes(a.od) - timeToMinutes(b.od));
  const breaks = (dayData.pauze || []).sort((a, b) => timeToMinutes(a.od) - timeToMinutes(b.od));

  // Ako nema postavljenog radnog vremena
  if (!dayTimes[dayShort]) {
    return [
      <td key="empty" className="empty-cell" colSpan={intervals.length}>
        Nema postavljenog radnog vremena
      </td>,
    ];
  }

  const dayStartMin = timeToMinutes(dayTimes[dayShort].start);
  const dayEndMin = timeToMinutes(dayTimes[dayShort].end);

  let i = 0;
  while (i < intervals.length) {
    const intStart = intervals[i].time;
    const intStartMin = timeToMinutes(intStart);

    // Izvan radnog vremena
    if (intStartMin < dayStartMin || intStartMin >= dayEndMin) {
      cells.push(<td key={`ooh-${i}`} className="out-of-hours"></td>);
      i++;
      continue;
    }

    // Provjera zauzetog termina
    const term = dayTerms.find(
      (t) => intStartMin >= timeToMinutes(t.od) && intStartMin < timeToMinutes(t.do)
    );

    if (term) {
      let span = 0;
      for (let j = i; j < intervals.length; j++) {
        const sMin = timeToMinutes(intervals[j].time);
        if (sMin >= timeToMinutes(term.od) && sMin < timeToMinutes(term.do)) span++;
        else break;
      }

      let className = "booked";
      let handleClick = () => handleTermClick(dayShort, intStart, term, term.datum);
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
            {term.status === "otkazan" ? "Otkazan" : formatPhoneNumber?.(term.rezervirao) || "Nepoznat"}
          </div>
        </td>
      );
      i += span;
      continue;
    }

    // Provjera pauze
    const pause = breaks.find(
      (p) => intStartMin >= timeToMinutes(p.od) && intStartMin < timeToMinutes(p.do)
    );

    if (pause) {
      let span = 0;
      for (let j = i; j < intervals.length; j++) {
        const sMin = timeToMinutes(intervals[j].time);
        if (sMin >= timeToMinutes(pause.od) && sMin < timeToMinutes(pause.do)) span++;
        else break;
      }

      cells.push(
        <td key={`pause-${i}`} className="break" colSpan={span}></td>
      );
      i += span;
      continue;
    }

    // Slobodan termin
    const freeDatum = getDateForDay(dayShort);
    cells.push(
      <td key={`free-${i}`} onClick={() => handleTermClick(dayShort, intStart, null, freeDatum)}></td>
    );
    i++;
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
