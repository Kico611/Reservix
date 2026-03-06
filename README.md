# Reservix 📅

> Fullstack sustav za upravljanje rezervacijama salona — korisnici rezerviraju termine putem **WhatsApp-a**, a vlasnici upravljaju rasporedom kroz **React dashboard**
---

## 🧩 O projektu

Reservix automatizira cijeli proces rezervacija za salone i slične uslužne djelatnosti. Korisnici šalju poruku na WhatsApp broj, bot ih provodi kroz odabir salona, usluge i termina, a sve se sprema u Firebase u realnom vremenu. Vlasnik pristupa dashboardu gdje pregleda tjedni raspored, oslobađa ili otkazuje termine i upravlja uslugama.

---

## ✨ Funkcionalnosti

### 📲 WhatsApp bot (backend)
- Vođenje korisnika kroz rezervaciju korak po korak: **salon → usluga → termin → potvrda**
- Automatsko generiranje slobodnih termina uz poštivanje radnog vremena, zauzetih termina i pauza
- Preskakanje termina koji su bliže od 1h od trenutnog vremena
- Otkazivanje rezervacije putem WhatsApp-a (`otkazi` / `otkaži`)
- Slanje potvrde rezervacije i obavijesti o otkazivanju korisniku
- Automatsko čišćenje isteklih rasporeda svakog ponedjeljka u 6:00 (APScheduler)
- Session management s automatskim istekom stanja nakon 20 minuta neaktivnosti

### 🖥️ React dashboard (frontend)
- **Tjedni pregled rasporeda** s prikazom svih zauzetih i slobodnih termina
- Navigacija po tjednima (prethodni / sljedeći tjedan)
- Zoom kontrole za prilagodbu prikaza
- **Oslobađanje termina** direktno iz dashboarda
- **Otkazivanje rezervacija** s automatskim slanjem WhatsApp obavijesti korisniku
- **Upravljanje uslugama** (dodavanje, uređivanje, brisanje — naziv, cijena, trajanje)
- Firebase autentifikacija s protected rutama
- Responzivan dizajn (mobilni i desktop)

---

## 🛠️ Tech stack

| Sloj | Tehnologija |
|---|---|
| **Backend** | Python 3, FastAPI |
| **WhatsApp API** | WHAPI (gate.whapi.cloud) |
| **Baza podataka** | Firebase Firestore |
| **Autentifikacija** | Firebase Auth |
| **Frontend** | React 18, React Router v6 |
| **UI komponente** | MUI (Material UI) |
| **Scheduler** | APScheduler |
| **Containerizacija** | Docker |
| **Hosting** | DigitalOcean |

---

## 📁 Struktura projekta

```
Reservix/
├── backend/
│   ├── main.py                  # FastAPI app — webhook, logika rezervacija, WhatsApp integracija
│   ├── serviceAccountKey.json   # Firebase service account (nije u repozitoriju)
│   └── .env                     # Environment varijable (nije u repozitoriju)
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx         # Tjedni pregled rasporeda
        │   ├── Calendar.jsx     # Kalendarski prikaz
        │   ├── Settings.jsx     # Upravljanje uslugama salona
        │   ├── Profile.jsx      # Profil korisnika
        │   └── Login.jsx        # Firebase prijava
        ├── components/
        │   ├── ScheduleTable.jsx    # Tablica rasporeda
        │   ├── WeekNavigator.jsx    # Navigacija po tjednima
        │   ├── ZoomControls.jsx     # Zoom kontrole
        │   ├── TermModal.jsx        # Modal za slobodne termine
        │   ├── CancelModal.jsx      # Modal za otkazivanje
        │   ├── FreeModal.jsx        # Modal za oslobađanje
        │   ├── ModalsContainer.jsx  # Kontejner za modale
        │   ├── BottomNav.jsx        # Navigacijska traka
        │   └── ProtectedRoute.jsx   # Zaštita ruta
        ├── hooks/
        │   ├── useReservations.js   # Hook za upravljanje rezervacijama
        │   └── useWeekSchedule.js   # Hook za tjedni raspored
        ├── context/
        │   └── SalonContext.js      # Globalni state salona
        └── utils/
            ├── dateUtils.js         # Pomoćne funkcije za datume
            └── timeUtils.js         # Pomoćne funkcije za vremena
```

---

## 🚀 Pokretanje lokalno

### Preduvjeti

- Python 3.10+
- Node.js 18+
- Firebase projekt s Firestore i Authentication
- WHAPI račun i token

### 1. Kloniraj repozitorij

```bash
git clone https://github.com/Kico611/Reservix.git
cd Reservix
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Kreiraj `.env` datoteku:

```env
WHAPI_TOKEN=tvoj_whapi_token
```

Postavi `serviceAccountKey.json` (preuzmi iz Firebase Console → Project Settings → Service Accounts).

Pokreni backend:

```bash
uvicorn main:app --reload
```

API dostupan na: `http://localhost:8000`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend dostupan na: `http://localhost:3000`

Konfiguriraj Firebase u `src/firebase.js` s postavkama svog projekta.

---

## 🔄 Kako radi WhatsApp bot

```
Korisnik pošalje poruku
        ↓
Bot prikazuje popis salona
        ↓
Korisnik odabere salon (šalje broj)
        ↓
Bot prikazuje dostupne usluge
        ↓
Korisnik odabere uslugu (šalje broj)
        ↓
Bot prikazuje slobodne termine (jutro / popodne)
        ↓
Korisnik odabere termin (šalje broj)
        ↓
✅ Potvrda rezervacije + WhatsApp poruka korisniku
```

Za otkazivanje korisnik šalje `otkazi` ili `otkaži` — bot prikazuje sve aktivne rezervacije i korisnik bira koju želi otkazati.

---

## 🔌 API endpointi

| Metoda | Ruta | Opis |
|---|---|---|
| `POST` | `/webhook/` | Prima WhatsApp poruke (WHAPI webhook) |
| `POST` | `/cancel_reservation/` | Otkazivanje rezervacije s frontenda |

---

## ⚙️ Firebase struktura podataka

```
saloni/
  {salon_id}/
    naziv: string
    usluge/
      {usluga_id}/
        naziv, cijena, trajanje
    raspored/
      {YYYY-MM-DD}/
        pocetak_rada, kraj_rada
        pauze: [{od, do}]
        zauzeti_termini: [{od, do, rezervirao, usluga_id, status?}]
    rezervacije/
      {termin_broj}/
        datum, od, do, rezervirao, usluga_id, vrijeme_rezervacije
```

---

## 🌐 Live demo

- **Frontend demo:** [Link](https://www.youtube.com/watch?v=X0nRnJ2sYx4)
- **WhatsApp demo:** [Video](https://www.instagram.com/reel/DRJ_tfRCKWH/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA%3D%3D)

---

