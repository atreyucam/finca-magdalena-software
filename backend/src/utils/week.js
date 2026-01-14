// backend/src/utils/week.js
function getISOWeek(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  // Jueves semana ISO
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    d.getFullYear() +
    "-W" +
    String(
      1 +
        Math.round(
          ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
        )
    ).padStart(2, "0")
  );
}

function getRangeFromISO(iso) {
  const [year, w] = iso.split("-W");
  const week = parseInt(w, 10);

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();

  // lunes
  const ISOweekStart = new Date(simple);
  ISOweekStart.setUTCDate(simple.getUTCDate() - (dow <= 0 ? 6 : dow - 1));

  const start = ISOweekStart;
  const end = new Date(ISOweekStart);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

module.exports = { getISOWeek, getRangeFromISO };
