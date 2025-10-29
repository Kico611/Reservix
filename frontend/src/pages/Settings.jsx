// src/pages/Settings.jsx
import React, { useState } from "react";
import { useSalon } from "../context/SalonContext";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import "../styles/Settings.css";
import Notification from "../components/Notification";

export default function Settings() {
  const { salon, loading } = useSalon();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState({
    id: "",
    naziv: "",
    cijena: "",
    trajanje: "",
  });
  const [editing, setEditing] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  const [notification, setNotification] = useState(null);

  if (loading) return <div className="loading">Učitavanje...</div>;
  if (!salon) return <div className="loading">Salon nije pronađen.</div>;

  const openModal = (
    usluga = { id: "", naziv: "", cijena: "", trajanje: "" }
  ) => {
    setCurrentService(usluga);
    setEditing(!!usluga.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentService({ id: "", naziv: "", cijena: "", trajanje: "" });
    setEditing(false);
  };

  const handleChange = (field, value) => {
    setCurrentService((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveService = async () => {
    // Provjera da li su sva polja popunjena
    if (
      !currentService.naziv.trim() ||
      !currentService.cijena ||
      !currentService.trajanje
    ) {
      setNotification({
        type: "error",
        message: "Molimo popunite sva polja prije spremanja usluge. ❌",
      });
      return;
    }

    // Provjera da li su cijena i trajanje valjani brojevi
    const cijenaNum = Number(currentService.cijena);
    const trajanjeNum = Number(currentService.trajanje);

    if (isNaN(cijenaNum) || cijenaNum <= 0) {
      setNotification({ type: "error", message: "Cijena mora biti veća od 0. ❌" });
      return;
    }

    if (isNaN(trajanjeNum) || trajanjeNum <= 0) {
      setNotification({ type: "error", message: "Trajanje mora biti veće od 0. ❌" });
      return;
    }

    try {
      const uslugeRef = collection(db, "saloni", salon.id, "usluge");

      if (editing) {
        const docRef = doc(db, "saloni", salon.id, "usluge", currentService.id);
        await updateDoc(docRef, {
          naziv: currentService.naziv,
          cijena: cijenaNum,
          trajanje: trajanjeNum,
        });
        setNotification({ type: "success", message: `Usluga "${currentService.naziv}" uspješno uređena ✅` });
      } else {
        await addDoc(uslugeRef, {
          naziv: currentService.naziv,
          cijena: cijenaNum,
          trajanje: trajanjeNum,
        });
        setNotification({ type: "success", message: `Usluga "${currentService.naziv}" uspješno dodana ✅` });
      }

      closeModal();
    } catch (err) {
      console.error("Greška pri spremanju:", err);
      setNotification({ type: "error", message: "Došlo je do greške pri spremanju usluge. ❌" });
    }
  };

  // Otvara modal za potvrdu brisanja
  const confirmDeleteService = (usluga) => {
    setServiceToDelete(usluga);
    setDeleteModalOpen(true);
  };

  // Brisanje usluge
  const deleteService = async () => {
    if (!serviceToDelete) return;
    try {
      const docRef = doc(db, "saloni", salon.id, "usluge", serviceToDelete.id);
      await deleteDoc(docRef);
      setNotification({ type: "success", message: `Usluga "${serviceToDelete.naziv}" uspješno obrisana ✅` });
    } catch (err) {
      console.error("Greška pri brisanju:", err);
      setNotification({ type: "error", message: "Došlo je do greške pri brisanju usluge. ❌" });
    } finally {
      setDeleteModalOpen(false);
      setServiceToDelete(null);
    }
  };

  return (
    <div className="salon-services-container">
      {/* Notifikacija */}
      {notification && (
        <Notification notification={notification} setNotification={setNotification} />
      )}

      <h2>Usluge</h2>

      <section className="services-section">
        <div className="services-list">
          {salon.usluge?.length === 0 && (
            <p className="empty-row">Nema usluga za prikaz.</p>
          )}
          {salon.usluge?.map((usluga) => (
            <div key={usluga.id} className="service-card">
              <div className="service-info">
                <p><strong>{usluga.naziv}</strong></p>
                <p>Cijena: {usluga.cijena} KM</p>
                <p>Trajanje: {usluga.trajanje} min</p>
              </div>
              <div className="service-actions">
                <button className="edit-btn" onClick={() => openModal(usluga)}>
                  Uredi
                </button>
                <button
                  className="delete-btn"
                  onClick={() => confirmDeleteService(usluga)}
                >
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="add-btn" onClick={() => openModal()}>
          ➕ Dodaj novu uslugu
        </button>
      </section>

      {/* Modal za dodavanje / uređivanje usluge */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Uredi uslugu" : "Dodaj uslugu"}</h3>

            <div className="modal-field">
              <label>Naziv :</label>
              <input
                type="text"
                value={currentService.naziv}
                onChange={(e) => handleChange("naziv", e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>Cijena (KM):</label>
              <input
                type="text"
                value={currentService.cijena}
                onChange={(e) => handleChange("cijena", e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>Trajanje (min):</label>
              <input
                type="text"
                value={currentService.trajanje}
                onChange={(e) => handleChange("trajanje", e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button onClick={saveService}>Spremi</button>
              <button onClick={closeModal}>Odustani</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal za potvrdu brisanja */}
      {deleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Potvrda brisanja</h3>
            <p>Jeste li sigurni da želite obrisati uslugu "{serviceToDelete?.naziv}"?</p>
            <div className="modal-actions">
              <button className="modal-delete-btn" onClick={deleteService}>
                Potvrdi brisanje
              </button>
              <button className="cancel-btn" onClick={() => setDeleteModalOpen(false)}>
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
