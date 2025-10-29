import React, { useState, useEffect } from "react";
import { useSalon } from "../context/SalonContext";
import "../styles/Home.css";
import WeekNavigator from "../components/WeekNavigator";
import ZoomControls from "../components/ZoomControls";
import { days, getWeekRange } from "../utils/dateUtils";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ScheduleTable from "../components/ScheduleTable";

export default function Home() {
  const [freeModalOpen, setFreeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [termToCancel, setTermToCancel] = useState(null);
  const { salon, setSalon, loading } = useSalon();
  const [weekStart, setWeekStart] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [notification, setNotification] = useState(null); // nova poruka

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const formatPhoneNumber = (broj) => {
    if (!broj) return "";

    // Ako broj počinje sa '+', ukloni prve 4 znamenke i formatiraj
    if (broj.startsWith("+")) {
      const sliced = broj.slice(4); // ukloni +387 ili slično
      // Formatiraj u oblik 63 161 783 (za 8 znamenki)
      if (sliced.length === 8) {
        return sliced.replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3");
      }
      // Ako nije 8 znamenki, samo vrati slice bez dodatnog formatiranja
      return sliced;
    }

    // Ako nije plus, vrati broj točno kako je unesen
    return broj;
  };

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  }

  const handleConfirmCancel = () => {
    cancelReservation(
      salon.id,
      termToCancel.rezervirao,
      termToCancel.od,
      termToCancel.do,
      termToCancel.datum
    ).then(() => {
      setCancelModalOpen(false);
      setTermToCancel(null);
      setSelectedTerm(null); // ovo sada radi sigurno jer cancelReservation završi
    });
  };
  const freeTerm = async (datum, term) => {
    const docRef = doc(db, "saloni", salon.id, "raspored", datum);

    try {
      // Dohvati trenutni dokument
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const updatedTerms = (data.zauzeti_termini || []).filter(
        (t) =>
          !(
            t.od === term.od &&
            t.do === term.do &&
            t.rezervirao === term.rezervirao
          )
      );

      // Update Firestore-a s filtriranim nizom
      await updateDoc(docRef, {
        zauzeti_termini: updatedTerms,
      });

      // Update lokalnog state-a
      setSalon((prev) => {
        const newRaspored = { ...prev.raspored };
        newRaspored[datum].zauzeti_termini = updatedTerms;
        return { ...prev, raspored: newRaspored };
      });

      setNotification({
        type: "success",
        message: `Termin ${term.od}-${term.do} je sada slobodan! ✅`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Došlo je do greške pri oslobađanju termina ❌",
      });
    }
  };

  const canBookInterval = (dayShort, startTime, duration) => {
    const dayTerms = weekSchedule[dayShort] || [];
    const dayStartMin = timeToMinutes(dayTimes[dayShort].start);
    const dayEndMin = timeToMinutes(dayTimes[dayShort].end);

    const startMin = timeToMinutes(startTime);
    const endMin = startMin + duration;

    // Provjeri da li termin izlazi izvan radnog vremena
    if (startMin < dayStartMin || endMin > dayEndMin) return false;

    // Provjeri da li se termin preklapa s postojećim terminima
    for (let term of dayTerms) {
      if (term.status === "otkazan") continue;
      const termStart = timeToMinutes(term.od);
      const termEnd = timeToMinutes(term.do);

      // Ako se preklapaju
      if (Math.max(startMin, termStart) < Math.min(endMin, termEnd)) {
        return false;
      }
    }

    return true;
  };

  const cancelReservation = async (
    salonId,
    rezervirao,
    odTime,
    doTime,
    datum
  ) => {
    try {
      const response = await fetch(
        "http://localhost:8000/cancel_reservation/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salonId,
            rezervirao,
            od: odTime,
            do: doTime,
            datum,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // update termina u tablici
        setSelectedTerm((prev) => ({
          ...prev,
          term: { ...prev.term, status: "otkazan" },
        }));

        // zatvori modal
        setSelectedTerm(null);

        setNotification({
          type: "success",
          message: `Termin od ${odTime} do ${doTime} je uspješno otkazan! ✅`,
        });
      } else {
        setNotification({
          type: "error",
          message: `Greška pri otkazivanju: ${
            data.error || "Nepoznata greška"
          } ❌`,
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `Došlo je do pogreške prilikom slanja zahtjeva ❌`,
      });
      console.error(err);
    }
  };

  const prevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(weekStart.getDate() - 7);
    setWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(weekStart.getDate() + 7);
    setWeekStart(newDate);
  };

  const confirmCancelReservation = (term) => {
    setTermToCancel(term);
    setCancelModalOpen(true);
  };

  const handleZoomIn = () => {
    if (zoom < 2) setZoom(+(zoom + 0.1).toFixed(1));
  };

  const handleZoomOut = () => {
    if (zoom > 0.5) setZoom(+(zoom - 0.1).toFixed(1));
  };

  if (loading) return <div>Loading...</div>;

  const { monday, sunday, label } = getWeekRange(weekStart);

  const weekSchedule = {};
  const dayTimes = {};
  if (salon?.raspored) {
    Object.entries(salon.raspored).forEach(([datum, data]) => {
      const date = new Date(datum);
      if (date >= monday && date <= sunday) {
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];

        weekSchedule[dayName] = (data.zauzeti_termini || []).map((t) => ({
          ...t,
          datum, // dodajemo datum dokumenta
        }));

        if (data.pocetak_rada && data.kraj_rada) {
          dayTimes[dayName] = {
            start: data.pocetak_rada,
            end: data.kraj_rada,
          };
        }
      }
    });
  }

  const formatIntervalLabel = (h, m) =>
    m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const generateIntervalsForWeek = (dayTimes) => {
    if (Object.keys(dayTimes).length === 0) return [];
    let earliest = "20:00";
    let latest = "07:00";

    Object.values(dayTimes).forEach(({ start, end }) => {
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    });

    const [startH, startM] = earliest.split(":").map(Number);
    const [endH, endM] = latest.split(":").map(Number);

    const result = [];
    let h = startH;
    let m = startM;

    while (h < endH || (h === endH && m < endM)) {
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}`;
      if (timeToMinutes(time) >= timeToMinutes(`${endH}:${endM}`)) break;
      result.push({ time, label: formatIntervalLabel(h, m) });
      m += 15;
      if (m >= 60) {
        m = 0;
        h += 1;
      }
    }

    return result;
  };

  const intervals = generateIntervalsForWeek(dayTimes);

  const handleTermClick = (dayShort, time, term, datum) => {
    if (!datum) return; // osiguraj da imamo pravi datum

    if (term) {
      setSelectedTerm({
        day: dayShort,
        datum, // koristi datum iz rasporeda
        time,
        term: { ...term, datum },
        isBooked: true,
      });
    } else {
      setSelectedTerm({
        day: dayShort,
        datum, // koristi datum iz rasporeda
        time,
        isBooked: false,
      });
    }
  };

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
          handleClick = null; // otkazani termini nisu klikabilni
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
    <div className="main-content">
      <WeekNavigator label={label} onPrev={prevWeek} onNext={nextWeek} />
      {windowWidth > 768 && (
        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}

      <ScheduleTable
  salon={salon}
  intervals={intervals}
  weekSchedule={weekSchedule}
  dayTimes={dayTimes}
  zoom={zoom}
  handleTermClick={handleTermClick}
  days={days}
/>

      {selectedTerm && (
        <div className="modal-backdrop" onClick={() => setSelectedTerm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {selectedTerm.isBooked ? (
              <div>
                <h3>Termin zauzet</h3>
                <p>
                  Broj telefona: {selectedTerm.term?.rezervirao || "Nepoznat"}
                </p>
                <p>
                  Vrijeme: {selectedTerm.term?.od} - {selectedTerm.term?.do}
                </p>
                <p>Datum: {formatDate(selectedTerm.term.datum)}</p>
                <p>
                  Usluga:{" "}
                  {salon?.usluge?.find(
                    (u) => u.id === selectedTerm.term?.usluga_id
                  )?.naziv || "Nepoznato"}
                </p>
                <button
                  className="cancel-reservation-btn"
                  onClick={() => {
                    if (selectedTerm?.term?.rezervirao) {
                      confirmCancelReservation(selectedTerm.term);
                    }
                  }}
                >
                  Otkaži termin
                </button>
                <button onClick={() => setFreeModalOpen(true)}>
                  Oslobodi termin
                </button>
                <button onClick={() => setSelectedTerm(null)}>Zatvori</button>
              </div>
            ) : (
              <div className="reservation-form">
                <h3>Rezerviraj termin</h3>

                <div className="form-group">
                  <label>Usluga:</label>
                  <select
                    required
                    value={selectedTerm.usluga_id || ""}
                    onChange={(e) =>
                      setSelectedTerm((prev) => ({
                        ...prev,
                        usluga_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- Odaberi uslugu --</option>
                    {salon?.usluge?.map((usluga) => (
                      <option key={usluga.id} value={usluga.id}>
                        {usluga.naziv} ({usluga.trajanje} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Vrijeme:</label>
                  <input type="text" value={selectedTerm.time} disabled />
                </div>
                <div className="form-group">
                  <label>Broj telefona ili ime(nije obavezno):</label>
                  <input
                    type="text"
                    placeholder="+387 63 123 456"
                    value={selectedTerm.broj || ""}
                    onChange={(e) =>
                      setSelectedTerm((prev) => ({
                        ...prev,
                        broj: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-actions">
                  <button
                    onClick={async () => {
                      if (!selectedTerm.usluga_id) {
                        setNotification({
                          type: "error",
                          message:
                            "Molimo odaberite uslugu prije rezervacije! ❌",
                        });
                        return;
                      }

                      const usluga = salon.usluge.find(
                        (u) => u.id === selectedTerm.usluga_id
                      );
                      if (!usluga) return;

                      const duration = usluga.trajanje;

                      if (
                        !canBookInterval(
                          selectedTerm.day,
                          selectedTerm.time,
                          duration
                        )
                      ) {
                        setNotification({
                          type: "error",
                          message: `Termin ne može biti rezerviran jer nema dovoljno slobodnog vremena za uslugu ${usluga.naziv}. ❌`,
                        });
                        return;
                      }

                      // Izračun kraja termina
                      const calculateEndTime = (start, duration) => {
                        const [hours, minutes] = start.split(":").map(Number);
                        const end = new Date(
                          0,
                          0,
                          0,
                          hours,
                          minutes + duration
                        );
                        const h = end.getHours().toString().padStart(2, "0");
                        const m = end.getMinutes().toString().padStart(2, "0");
                        return `${h}:${m}`;
                      };

                      const kraj = calculateEndTime(
                        selectedTerm.time,
                        duration
                      );

                      // Kreiranje objekta za Firestore
                      const term = {
                        od: selectedTerm.time,
                        do: kraj,
                        rezervirao: selectedTerm.broj || "", // ako korisnik ne unese broj, ostaje prazno
                        usluga_id: selectedTerm.usluga_id,
                        status: "rezerviran",
                      };

                      try {
                        const docRef = doc(
                          db,
                          "saloni",
                          salon.id,
                          "raspored",
                          selectedTerm.datum
                        );

                        await updateDoc(docRef, {
                          zauzeti_termini: arrayUnion(term),
                        });

                        // Update lokalnog state-a
                        setSalon((prev) => {
                          const newRaspored = { ...prev.raspored };
                          if (!newRaspored[selectedTerm.datum])
                            newRaspored[selectedTerm.datum] = {
                              zauzeti_termini: [],
                            };
                          newRaspored[selectedTerm.datum].zauzeti_termini.push(
                            term
                          );
                          return { ...prev, raspored: newRaspored };
                        });

                        setNotification({
                          type: "success",
                          message: `Termin u ${selectedTerm.time} uspješno rezerviran! ✅`,
                        });

                        setSelectedTerm(null);
                      } catch (error) {
                        console.error("Greška pri spremanju termina:", error);
                        setNotification({
                          type: "error",
                          message:
                            "Došlo je do greške prilikom spremanja termina. ❌",
                        });
                      }
                    }}
                  >
                    Rezerviraj
                  </button>

                  <button onClick={() => setSelectedTerm(null)}>Zatvori</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {cancelModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setCancelModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Potvrda otkazivanja</h3>
            <p>
              Jeste li sigurni da želite otkazati termin {termToCancel?.od} -{" "}
              {termToCancel?.do}?
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setCancelModalOpen(false)}
              >
                Odustani
              </button>
              <button
                className="modal-delete-btn"
                onClick={handleConfirmCancel}
              >
                Potvrdi otkazivanje
              </button>
            </div>
          </div>
        </div>
      )}

      {freeModalOpen && (
        <div className="modal-backdrop" onClick={() => setFreeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Potvrda oslobađanja termina</h3>
            <p>
              Jeste li sigurni da želite osloboditi termin{" "}
              {selectedTerm?.term?.od} - {selectedTerm?.term?.do}?
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setFreeModalOpen(false)}
              >
                Odustani
              </button>
              <button
                className="modal-delete-btn"
                onClick={async () => {
                  if (!selectedTerm) return;
                  await freeTerm(selectedTerm.datum, selectedTerm.term);
                  setFreeModalOpen(false);
                  setSelectedTerm(null); // zatvori modal nakon uspješnog oslobađanja
                }}
              >
                Potvrdi oslobađanje
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
