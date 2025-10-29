import React from "react";

export default function WeekNavigator({ label, onPrev, onNext }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pretpostavljamo da label sadrži datum početka tjedna u formatu YYYY-MM-DD
  const mondayParts = label.split(" - ")[0].split("."); // ako label formatiraš "dd.mm.yyyy - dd.mm.yyyy"
  const mondayDate = new Date(+mondayParts[2], +mondayParts[1] - 1, +mondayParts[0]);
  mondayDate.setHours(0, 0, 0, 0);

  const prevDisabled = mondayDate <= today;

  return (
    <div className="week-nav">
      <button onClick={onPrev} disabled={prevDisabled}>&lt;</button>
      <span>{label}</span>
      <button onClick={onNext}>&gt;</button>
    </div>
  );
}
