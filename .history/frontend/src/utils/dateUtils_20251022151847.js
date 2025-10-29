// DANI TJEDNA
export const days = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

/**
 * Formatira datum u oblik dd.mm
 * @param {Date} date
 * @returns string
 */
export const formatDate = (date) => {
  const localDate = new Date(date); // konvertiramo u lokalno vrijeme
  return `${String(localDate.getDate()).padStart(2, "0")}.${String(
    localDate.getMonth() + 1
  ).padStart(2, "0")}`;
};

/**
 * Vraća objekt s početkom i krajem tjedna te labelom
 * @param {Date} date
 * @returns { monday: Date, sunday: Date, label: string }
 */
export const getWeekRange = (date) => {
  // koristimo UTC
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayOfWeek = utcDate.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(utcDate);
  monday.setUTCDate(utcDate.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    monday,
    sunday,
    label: `${formatDate(monday)} - ${formatDate(sunday)}`,
  };
};
