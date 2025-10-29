// DANI TJEDNA
export const days = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

/**
 * Formatira datum u oblik dd.mm
 * @param {Date} date
 * @returns string
 */
export const formatDate = (date) =>
  `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;

/**
 * Vraća objekt s početkom i krajem tjedna te labelom
 * @param {Date} date
 * @returns { monday: Date, sunday: Date, label: string }
 */
export const getWeekRange = (date) => {
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    monday,
    sunday,
    label: `${formatDate(monday)} - ${formatDate(sunday)}`,
  };
};
