// src/context/SalonContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, onSnapshot } from "firebase/firestore";

const SalonContext = createContext();

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeUserDoc = () => {};
    let unsubscribeSalonDoc = () => {};
    let unsubscribeRasporedCol = () => {};
    let unsubscribeUslugeCol = () => {};

    unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const salonID = userData.salonID;

            const salonDocRef = doc(db, "saloni", salonID);
            unsubscribeSalonDoc = onSnapshot(salonDocRef, (salonSnap) => {
              if (salonSnap.exists()) {
                const salonData = salonSnap.data();

                const rasporedColRef = collection(
                  db,
                  "saloni",
                  salonID,
                  "raspored"
                );
                unsubscribeRasporedCol = onSnapshot(
                  rasporedColRef,
                  (querySnap) => {
                    const rasporedData = {};
                    querySnap.forEach((d) => {
                      rasporedData[d.id] = d.data();
                    });

                    const uslugeColRef = collection(
                      db,
                      "saloni",
                      salonID,
                      "usluge"
                    );
                    unsubscribeUslugeCol = onSnapshot(
                      uslugeColRef,
                      (uslugeSnap) => {
                        const uslugeData = [];
                        uslugeSnap.forEach((d) => {
                          uslugeData.push({ id: d.id, ...d.data() });
                        });

                        setSalon({
                          id: salonSnap.id,
                          ...salonData,
                          raspored: rasporedData,
                          usluge: uslugeData,
                        });
                        setLoading(false);
                      }
                    );
                  }
                );
              }
            });
          }
        });
      } else {
        setSalon(null);
        setLoading(false);
      }
    });

    // Cleanup funkcija koja uklanja sve subskripcije
    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc();
      unsubscribeSalonDoc();
      unsubscribeRasporedCol();
      unsubscribeUslugeCol();
    };
  }, []);

  return (
    <SalonContext.Provider value={{ user, salon, setSalon, loading }}>
      {children}
    </SalonContext.Provider>
  );
};
