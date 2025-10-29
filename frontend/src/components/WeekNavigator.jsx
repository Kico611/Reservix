import React from "react";

export default function WeekNavigator({ label, onPrev, onNext, monday }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mondayCopy = new Date(monday);
  mondayCopy.setHours(0, 0, 0, 0);

  const prevDisabled = mondayCopy <= today;

  return (
    <div className="week-nav">
      <button onClick={onPrev} disabled={prevDisabled}>&lt;</button>
      <span>{label}</span>
      <button onClick={onNext}>&gt;</button>
    </div>
  );
}
