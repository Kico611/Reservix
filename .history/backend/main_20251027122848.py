from fastapi import FastAPI, Request, Response
from datetime import datetime, timedelta ,date
from time import time
from firebase_admin import credentials, firestore, initialize_app
from dotenv import load_dotenv
import json
import http.client
import os
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()
app = FastAPI()

# Dodaj ovo za CORS
origins = [
    "http://localhost:3000",  # frontend URL
    "http://127.0.0.1:3000",  # alternativni lokalni URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # možeš staviti ["*"] za sve, ali nije preporučljivo u produkciji
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------- FIREBASE INIT --------------------- #
cred = credentials.Certificate("serviceAccountKey.json")
initialize_app(cred)
db = firestore.client()

user_state = {}
WHAPI_TOKEN = os.getenv("WHAPI_TOKEN")
USER_TIMEOUT = 1200  # 20 minuta

# --------------------- POMOĆNE FUNKCIJE --------------------- #

def posalji_tekst_poruku(broj, poruka):
    try:
        broj_ispravan = ''.join(c for c in broj if c.isdigit() or c == '-')
        if not broj_ispravan: return False
        broj_ispravan += "@s.whatsapp.net"
        payload_dict = {"to": broj_ispravan, "body": poruka}
        payload = json.dumps(payload_dict, ensure_ascii=False)
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {WHAPI_TOKEN}"
        }
        conn = http.client.HTTPSConnection("gate.whapi.cloud")
        conn.request("POST", "/messages/text", payload.encode('utf-8'), headers)
        res = conn.getresponse()
        data = res.read()
        return True
    except Exception as e:
        print(f"[ERROR] posalji_tekst_poruku: {e}")
        return False
    
def posalji_tekst_poruku_get_id(broj, poruka):
    """Pošalji poruku i vrati dict sa message_id"""
    try:
        broj_ispravan = ''.join(c for c in broj if c.isdigit() or c == '-')
        if not broj_ispravan:
            return None
        broj_ispravan += "@s.whatsapp.net"
        payload_dict = {"to": broj_ispravan, "body": poruka}
        payload = json.dumps(payload_dict, ensure_ascii=False)
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {WHAPI_TOKEN}"
        }
        conn = http.client.HTTPSConnection("gate.whapi.cloud")
        conn.request("POST", "/messages/text", payload.encode("utf-8"), headers)
        res = conn.getresponse()
        data = json.loads(res.read())
        # Vrati message_id ako je poslano
        if data.get("sent") and "message" in data and "id" in data["message"]:
            return data["message"]["id"]
        return None
    except Exception as e:
        print(f"[ERROR] posalji_tekst_poruku_get_id: {e}")
        return None


def broj_u_emoji(broj):
    emoji_map = {'0':'0️⃣','1':'1️⃣','2':'2️⃣','3':'3️⃣','4':'4️⃣','5':'5️⃣','6':'6️⃣','7':'7️⃣','8':'8️⃣','9':'9️⃣'}
    return ''.join(emoji_map[c] for c in str(broj))

def formatiraj_datum(datum_str):
    dt = datetime.strptime(datum_str, "%Y-%m-%d")
    dani_hr = {"Monday":"Ponedjeljak","Tuesday":"Utorak","Wednesday":"Srijeda","Thursday":"Četvrtak",
               "Friday":"Petak","Saturday":"Subota","Sunday":"Nedjelja"}
    mjeseci_hr = {1:"siječnja",2:"veljače",3:"ožujka",4:"travnja",5:"svibnja",6:"lipnja",
                  7:"srpnja",8:"kolovoza",9:"rujna",10:"listopada",11:"studenoga",12:"prosinca"}
    dan_hr = dani_hr.get(dt.strftime("%A"), dt.strftime("%A"))
    mjesec_hr = mjeseci_hr[dt.month]
    return f"📌{dan_hr}, {dt.day}.{mjesec_hr}"

def posalji_listu_termina_tekstom(broj, termini, salon_naziv=""):
    broj_ispravan = ''.join(c for c in broj if c.isdigit() or c == '-')
    if not broj_ispravan: return False
    broj_ispravan += "@s.whatsapp.net"
    poruka = f"🗓️ Slobodni termini u salonu *{salon_naziv}*\n\n"
    brojac = 1
    termin_map = {}

    for dan in sorted(termini, key=lambda d: d["datum"]):
        datum = dan["datum"]
        termini_dana = sorted(dan["termini"], key=lambda t: t["vrijeme"])
        jutro, popodne = [], []

        for termin in termini_dana:
            sati = int(termin.get("vrijeme","00:00").split(":")[0])
            if sati < 12: jutro.append((brojac, termin))
            else: popodne.append((brojac, termin))
            termin_map[brojac] = (datum, termin["vrijeme"], termin["do"])
            brojac += 1

        poruka += f"*{formatiraj_datum(datum)}*\n"

        def ispisi_termini(lista):
            redovi = []
            for i in range(0, len(lista), 3):
                chunk = lista[i:i+3]
                redovi.append(', '.join(f'{broj_u_emoji(n)} {t["vrijeme"]}' for n,t in chunk))
            return '\n'.join(redovi) + '\n'

        if jutro: poruka += "☀️ Jutro:\n" + ispisi_termini(jutro)
        if popodne: poruka += "🌙 Popodne:\n" + ispisi_termini(popodne)
        poruka += "\n"

    poruka += "➡️ Pošalji *broj termina* kojeg želiš rezervirati\nℹ️ Ako želite otkazati termin, pošaljite *otkazi* ili *otkaži*."
    return poruka, termin_map

# --------------------- FIRESTORE FUNKCIJE --------------------- #

def get_salon_services(salon_id):
    try:
        services_ref = db.collection("saloni").document(salon_id).collection("usluge")
        return [{"id": doc.id, **doc.to_dict()} for doc in services_ref.stream()]
    except Exception as e:
        print(f"[ERROR] get_salon_services: {e}")
        return []

def termin_u_pauzi(poc, trajanje_min, pauze):
    kraj = poc + timedelta(minutes=trajanje_min)
    for p in pauze:
        p_od = datetime.strptime(p["od"], "%H:%M")
        p_do = datetime.strptime(p["do"], "%H:%M")
        # provjeri preklapanje
        if poc < p_do and kraj > p_od:
            return True
    return False

def generiraj_slobodne_termini(pocetak, kraj, zauzeti, trajanje, pauze=None, datum=None):
    """
    Generira slobodne termine između pocetka i kraja, uz poštivanje zauzetih termina i pauza.
    Ako je datum današnji, preskače termine koji su bliže od 1h od sada.
    """
    from datetime import datetime, timedelta

    slobodni = []
    sada = datetime.now()
    if datum is None:
        datum = sada.date()

    poc = datetime.strptime(pocetak, "%H:%M")
    kraj_dt = datetime.strptime(kraj, "%H:%M")
    zauzeti_sort = sorted(zauzeti, key=lambda z: datetime.strptime(z["od"], "%H:%M"))
    i = 0

    while poc + timedelta(minutes=trajanje) <= kraj_dt:

        termin_dt = datetime.combine(datum, poc.time())

        # --- NOVO: preskakanje termina koji su preblizu sada samo za današnji dan ---
        if datum == sada.date() and termin_dt < sada + timedelta(hours=1):
            poc += timedelta(minutes=trajanje)
            continue

        # preskakanje zauzetih termina
        while i < len(zauzeti_sort):
            z_od = datetime.strptime(zauzeti_sort[i]["od"], "%H:%M")
            z_do = datetime.strptime(zauzeti_sort[i]["do"], "%H:%M")
            if poc + timedelta(minutes=trajanje) <= z_od:
                break
            elif poc < z_do:
                poc = z_do
                i += 1
            else:
                i += 1

        # preskakanje pauza
        if pauze and termin_u_pauzi(poc, trajanje, pauze):
            for p in pauze:
                p_od = datetime.strptime(p["od"], "%H:%M")
                p_do = datetime.strptime(p["do"], "%H:%M")
                if poc < p_do and poc + timedelta(minutes=trajanje) > p_od:
                    poc = p_do
                    break
            continue

        # dodavanje termina
        if poc + timedelta(minutes=trajanje) <= kraj_dt:
            slobodni.append({
                "vrijeme": poc.strftime("%H:%M"),
                "do": (poc + timedelta(minutes=trajanje)).strftime("%H:%M")
            })
            poc += timedelta(minutes=trajanje)
        else:
            break

    return slobodni

def get_appointments(salon_id, service_id=None):
    """Dohvat slobodnih termina salona od danas nadalje, uz poštivanje pauza."""
    appointments = []
    try:
        raspored_ref = db.collection("saloni").document(salon_id).collection("raspored")
        usluge = {u['id']: u for u in get_salon_services(salon_id)}

        today = date.today()

        for datum_doc in raspored_ref.stream():
            datum_str = datum_doc.id  # očekuje se 'YYYY-MM-DD'
            try:
                datum_obj = datetime.strptime(datum_str, "%Y-%m-%d").date()
            except ValueError:
                # Ako datum nije u ispravnom formatu, preskoči
                continue

            # Preskoči dane u prošlosti
            if datum_obj < today:
                continue

            data = datum_doc.to_dict()
            pocetak = data.get("pocetak_rada", "09:00")
            kraj = data.get("kraj_rada", "17:00")
            zauzeti = data.get("zauzeti_termini", [])
            pauze = data.get("pauze", [])
            trajanje = usluge.get(service_id, {}).get("trajanje", 30)

            slobodni = generiraj_slobodne_termini(pocetak, kraj, zauzeti, trajanje, pauze=pauze,datum=datum_obj )
            if slobodni:
                appointments.append({"datum": datum_str, "termini": slobodni})

    except Exception as e:
        print(f"[ERROR] get_appointments: {e}")

    return appointments

def book_appointment_in_firestore(salon_id, date_str, od, do, user_phone, usluga_id):
    db_ref = db.collection("saloni").document(salon_id)
    raspored_ref = db_ref.collection("raspored").document(date_str)
    rezerv_ref = db_ref.collection("rezervacije")

    @firestore.transactional
    def transaction_func(transaction):
        doc = raspored_ref.get(transaction=transaction)
        if not doc.exists:
            return False

        data = doc.to_dict()
        zauzeti = data.get("zauzeti_termini", [])

        od_dt = datetime.strptime(od, "%H:%M").time()
        do_dt = datetime.strptime(do, "%H:%M").time()

        for z in zauzeti:
            z_od = datetime.strptime(z["od"], "%H:%M").time()
            z_do = datetime.strptime(z["do"], "%H:%M").time()
            if not (do_dt <= z_od or od_dt >= z_do):
                return False

        novi_termin = {
            "od": od,
            "do": do,
            "rezervirao": user_phone,
            "usluga_id": usluga_id,
        }
        transaction.update(raspored_ref, {
            "zauzeti_termini": firestore.ArrayUnion([novi_termin])
        })

        termin_broj = str(int(time() * 1000000))
        rezerv_data = {
            "datum": date_str,
            "od": od,
            "do": do,
            "rezervirao": user_phone,
            "usluga_id": usluga_id,
            "termin_broj": termin_broj,
            "vrijeme_rezervacije": datetime.utcnow().isoformat()
        }
        rezerv_doc_ref = rezerv_ref.document(termin_broj)
        transaction.set(rezerv_doc_ref, rezerv_data)
        return True

    try:
        transaction = db.transaction()
        return transaction_func(transaction)
    except Exception as e:
        print(f"[ERROR] book_appointment_in_firestore (transaction): {e}")
        return False
    
def get_user_reservations(sender, salon_id):
    rezervacije = []
    try:
        rezerv_ref = db.collection("saloni").document(salon_id).collection("rezervacije")
        for doc in rezerv_ref.stream():
            data = doc.to_dict()
            if data.get("rezervirao") == sender:
                # Provjeri je li datum u budućnosti ili je danas a termin još nije prošao
                datum_obj = datetime.strptime(data["datum"], "%Y-%m-%d").date()
                od_time = datetime.strptime(data["od"], "%H:%M").time()
                sada = datetime.now()
                if datum_obj > sada.date() or (datum_obj == sada.date() and od_time > sada.time()):
                    rezervacije.append(data)
    except Exception as e:
        print(f"[ERROR] get_user_reservations_by_number: {e}")
    return rezervacije

def mark_reservation_cancelled(salon_id, rezervirao, od, do, datum):
    try:
        rezerv_ref = db.collection("saloni").document(salon_id).collection("raspored").document(datum)
        rasp_doc = rezerv_ref.get()
        if not rasp_doc.exists:
            return {"cancelled": False, "whatsapp_sent": False, "error": "Raspored ne postoji"}

        zauzeti_termini = rasp_doc.to_dict().get("zauzeti_termini", [])
        target_term = next((t for t in zauzeti_termini if t.get("rezervirao")==rezervirao and t.get("od")==od and t.get("do")==do), None)
        if not target_term:
            return {"cancelled": False, "whatsapp_sent": False, "error": "Rezervacija ne postoji"}

        target_term["status"] = "otkazan"
        rezerv_ref.update({"zauzeti_termini": zauzeti_termini})

        # --- slanje WhatsApp poruke ---
        user_phone = target_term.get("rezervirao")
        whatsapp_sent = False
        whatsapp_error = None

        if user_phone:
            # Provjera da li je broj valjan
            broj_ispravan = ''.join(c for c in user_phone if c.isdigit() or c == '-')
            if not broj_ispravan or len(broj_ispravan) < 9:  # minimalno 9 znamenki
                whatsapp_error = f"Neispravan broj: {user_phone}"
                whatsapp_sent = False
            else:
                poruka = f"⚠️ Termin otkazan: {datum}, {od}-{do}"
                message_id = posalji_tekst_poruku_get_id(user_phone, poruka)

                if message_id:
                    try:
                        conn = http.client.HTTPSConnection("gate.whapi.cloud")
                        headers = {"authorization": f"Bearer {WHAPI_TOKEN}"}
                        max_wait = 30  # maksimalno čekanje u sekundama
                        waited = 0
                        while waited < max_wait:
                            conn.request("GET", f"/messages/{message_id}", headers=headers)
                            res = conn.getresponse()
                            data = json.loads(res.read())
                            status = data.get("status", "").lower()
                            if status == "delivered":
                                whatsapp_sent = True
                                break
                            time.sleep(2)
                            waited += 2
                    except Exception as e:
                        whatsapp_error = str(e)
                        whatsapp_sent = False

        target_term["whatsapp_sent"] = whatsapp_sent
        rezerv_ref.update({"zauzeti_termini": zauzeti_termini})

        return {"cancelled": True, "whatsapp_sent": whatsapp_sent, "error": whatsapp_error}

    except Exception as e:
        return {"cancelled": False, "whatsapp_sent": False, "error": str(e)}

def mark_reservation_cancelled(salon_id, rezervirao, od, do, datum):
    try:
        # Dohvati raspored iz Firestore
        rezerv_ref = db.collection("saloni").document(salon_id).collection("raspored").document(datum)
        rasp_doc = rezerv_ref.get()
        if not rasp_doc.exists:
            return {"cancelled": False, "whatsapp_sent": False, "error": "Raspored ne postoji"}

        zauzeti_termini = rasp_doc.to_dict().get("zauzeti_termini", [])
        target_term = None
        for t in zauzeti_termini:
            if t.get("rezervirao") == rezervirao and t.get("od") == od and t.get("do") == do:
                target_term = t
                break

        if not target_term:
            return {"cancelled": False, "whatsapp_sent": False, "error": "Rezervacija ne postoji"}

        # Otkazi termin
        target_term["status"] = "otkazan"

        # Slanje WhatsApp poruke
        user_phone = target_term.get("rezervirao")
        whatsapp_sent = False
        whatsapp_error = None

        if user_phone:
            poruka = f"⚠️ Termin otkazan: {datum}, {od}-{do}"
            try:
                whatsapp_sent = posalji_tekst_poruku_cancel(user_phone, poruka, timeout=30)
            except Exception as e:
                whatsapp_sent = False
                whatsapp_error = str(e)

        # Spremi stanje poruke
        target_term["whatsapp_sent"] = whatsapp_sent
        rezerv_ref.update({"zauzeti_termini": zauzeti_termini})

        return {
            "cancelled": True,
            "whatsapp_sent": whatsapp_sent,
            "error": whatsapp_error
        }

    except Exception as e:
        return {"cancelled": False, "whatsapp_sent": False, "error": str(e)}


def get_service_name(salon_id, service_id):
    usluge = get_salon_services(salon_id)
    for u in usluge:
        if u['id'] == service_id: return u['naziv']
    return "Usluga"

# ----------------- USER STATE ----------------- #

def ocisti_zastarjela_stanja():
    global user_state
    trenutno_vrijeme = time()
    user_state = {k:v for k,v in user_state.items() if trenutno_vrijeme - v.get("timestamp",0) <= USER_TIMEOUT}

# ----------------- HANDLE FUNCTIONS ----------------- #

def handle_select_salon(sender):
    salons = list(db.collection("saloni").stream())
    poruka = "🏢 Odaberite salon:\n\n"
    salon_map = {}
    for i, s in enumerate(salons, 1):
        data = s.to_dict()
        poruka += f"{broj_u_emoji(i)} {data.get('naziv', 'Salon')}\n"
        salon_map[i] = s.id
    user_state[sender]["step"] = 1
    user_state[sender]["salon_map"] = salon_map
    posalji_tekst_poruku(sender, poruka)

def handle_select_service(sender, salon_id):
    usluge = get_salon_services(salon_id)
    if not usluge:
        posalji_tekst_poruku(sender, "⚠️ Trenutno nema dostupnih usluga.")
        return

    # Ako postoji samo jedna usluga, preskoči odabir
    if len(usluge) == 1:
        user_state[sender]["service_id"] = usluge[0]['id']
        user_state[sender]["step"] = 3  # idemo direktno na step 1 (termini)
        handle_step_1(sender, salon_id)
        return

    # Inače šalji listu usluga
    poruka = "✂️ Odaberite uslugu:\n\n"
    service_map = {}
    for i, u in enumerate(usluge, 1):
        poruka += f"{broj_u_emoji(i)} {u['naziv']} ({u['cijena']} KM)\n"
        service_map[i] = u['id']

    user_state[sender]["step"] = 2.5
    user_state[sender]["service_map"] = service_map
    poruka += "\n↩️ Za povratak na prethodni korak pošaljite 0."
    posalji_tekst_poruku(sender, poruka)


def handle_step_1(sender, salon_id):
    try:
        service_id = user_state[sender]["service_id"]
        termini = get_appointments(salon_id, service_id)
        salon_doc = db.collection("saloni").document(salon_id).get()
        salon_naziv = salon_doc.to_dict().get("naziv", "Salon") if salon_doc.exists else ""
        poruka, termin_map = posalji_listu_termina_tekstom(sender, termini, salon_naziv)
        user_state[sender]["step"] = 2
        user_state[sender]["termin_map"] = termin_map
        poruka += "\n↩️ Za povratak na prethodni korak pošaljite 0."
        posalji_tekst_poruku(sender, poruka)
    except Exception as e:
        print(f"[ERROR] handle_step_1: {e}")
        posalji_tekst_poruku(sender, "⚠️ Došlo je do greške. Molimo pokušajte ponovno.")

def handle_step_2(sender, incoming_msg, salon_id):
    try:
        if user_state[sender].get("processing"): return
        user_state[sender]["processing"] = True
        izbor = int(incoming_msg)
        termin_map = user_state[sender].get("termin_map", {})
        if izbor not in termin_map:
            posalji_tekst_poruku(sender, "🔁 Niste poslali valjani broj termina. Molimo pokušajte ponovno.")
            user_state[sender]["processing"] = False
            return
        datum, od, do = termin_map[izbor]
        service_id = user_state[sender]["service_id"]
        uspjeh = book_appointment_in_firestore(salon_id, datum, od, do, sender, service_id)
        if uspjeh:
            usluga_naziv = get_service_name(salon_id, service_id)
            poruka = (
                 f"✅ *Rezervacija uspješna!*\n\n"
                 f"{formatiraj_datum(datum)}\n"
                 f"⏰ Vrijeme: {od} - {do}\n"
                 f"💇 Usluga: {usluga_naziv}\n"
                 f"↩️ Za novu rezervaciju, pošaljite *termin*."
            )
            posalji_tekst_poruku(sender, poruka)
        else:
            posalji_tekst_poruku(sender, "⚠️ Termin više nije slobodan. Pokušajte drugi termin.")
        user_state[sender]["step"] = 0
        user_state[sender]["processing"] = False
    except Exception as e:
        print(f"[ERROR] handle_step_2: {e}")
        user_state[sender]["processing"] = False
        posalji_tekst_poruku(sender, "🔁 Pogreška. Molimo pokušajte ponovno.")

# ----------------- CANCEL HANDLERS ----------------- #

def handle_cancel(sender):
    try:
        # prikupi sve rezervacije iz svih salona
        rezervacije = []
        saloni = list(db.collection("saloni").stream())

        for salon in saloni:
            salon_id = salon.id
            naziv_salona = salon.to_dict().get("naziv", "Salon")
            rez_salon = get_user_reservations(sender, salon_id)
            for r in rez_salon:
                rezervacije.append({
                    "salon_id": salon_id,
                    "salon_naziv": naziv_salona,
                    **r
                })

        if not rezervacije:
            posalji_tekst_poruku(sender, "ℹ️ Trenutno nemate aktivnih rezervacija za otkazivanje.")
            return

        # prikazi sve rezervacije odjednom
        poruka = "🛑 Pošaljite *broj termina* koji želite otkazati:\n\n"
        cancel_map = {}
        for idx, rez in enumerate(rezervacije, start=1):
            datum = formatiraj_datum(rez["datum"])
            poruka += (
                f"{broj_u_emoji(idx)} *{datum}*\n"
                f"   ⏰ Vrijeme: {rez['od']} - {rez['do']}\n"
                f"   💇 Usluga: {get_service_name(rez['salon_id'], rez['usluga_id'])}\n"
                f"   🏢 Salon: {rez['salon_naziv']}\n\n"
            )
            cancel_map[idx] = rez

        poruka += "↩️ Za povratak pošaljite 0."
        user_state[sender].update({"step": "cancel_select", "cancel_map": cancel_map})
        posalji_tekst_poruku(sender, poruka)

    except Exception as e:
        print(f"[ERROR] handle_cancel: {e}")
        posalji_tekst_poruku(sender, "⚠️ Došlo je do greške pri prikazu rezervacija. Molimo pokušajte ponovno.")

def handle_cancel_select(sender, incoming_msg):
    try:
        if incoming_msg == "0":
            user_state[sender]["step"] = 0
            handle_select_salon(sender)
            return

        if not incoming_msg.isdigit():
            posalji_tekst_poruku(sender, "🔁 Molimo pošaljite valjani broj rezervacije za otkazivanje.")
            return

        odabrani_broj = int(incoming_msg)
        cancel_map = user_state[sender].get("cancel_map", {})

        if odabrani_broj not in cancel_map:
            posalji_tekst_poruku(sender, "🔁 Niste poslali valjani broj rezervacije. Pokušajte ponovno.")
            return

        rez = cancel_map[odabrani_broj]
        salon_id = rez["salon_id"]
        uspjeh = cancel_reservation_by_number(salon_id, rez["termin_broj"])

        if uspjeh:
            poruka = (
                f"✅ *Uspješno otkazano!*\n\n"
                f"{formatiraj_datum(rez['datum'])}\n"
                f"⏰ Vrijeme: {rez['od']} - {rez['do']}\n"
                f"💇 Usluga: {get_service_name(salon_id, rez['usluga_id'])}\n"
                f"🏢 Salon: {rez['salon_naziv']}\n\n"
                f"🔁 Za otkazivanje još neke rezervacije pošaljite *'otkazi'*, "
                f"za novu rezervaciju pošaljite *termin*."
            )
            posalji_tekst_poruku(sender, poruka)
        else:
            posalji_tekst_poruku(sender, "⚠️ Došlo je do greške pri otkazivanju termina.")

        user_state[sender]["step"] = 0
        user_state[sender].pop("cancel_map", None)

    except Exception as e:
        print(f"[ERROR] handle_cancel_select: {e}")
        posalji_tekst_poruku(sender, "⚠️ Pogreška. Molimo pokušajte ponovno.")


# ----------------- WEBHOOK ----------------- #

@app.post("/webhook/")
async def webhook(request: Request):
    global user_state
    data = await request.json()
    ocisti_zastarjela_stanja()

    messages = data.get("messages", [])
    if messages:
        prva_poruka = messages[0]
        sender = prva_poruka.get("from", "").strip()
        incoming_msg = prva_poruka.get("text", {}).get("body", "")
    else:
        sender = (data.get("From") or data.get("from") or "").strip()
        incoming_msg = data.get("Body") or data.get("body") or ""

    if not sender: return Response(content="", media_type="application/xml")
    incoming_msg = incoming_msg.strip().lower() if incoming_msg else ""
    if sender not in user_state: user_state[sender] = {"step": 0, "timestamp": time()}
    else: user_state[sender]["timestamp"] = time()
    step = user_state[sender].get("step", 0)

    salons = list(db.collection("saloni").stream())
    if not salons:
        posalji_tekst_poruku(sender, "⚠️ Trenutno nema dostupnih salona.")
        return Response(content="", media_type="application/xml")

    # --- OTKAZIVANJE ---
    if incoming_msg in ["otkaži", "otkazi"]:
        salon_id = user_state[sender].get("salon_id", salons[0].id)
        handle_cancel(sender)
        return Response(content="", media_type="application/xml")

    if step == "cancel_select":
        handle_cancel_select(sender, incoming_msg)
        return Response(content="", media_type="application/xml")

    # --- ODABIR SALONA ---
    if step == 0:
        handle_select_salon(sender)
        return Response(content="", media_type="application/xml")

    if step == 1:
        if incoming_msg == "0":
            user_state[sender]["step"] = 0
            handle_select_salon(sender)
            return Response(content="", media_type="application/xml")
        if not incoming_msg.isdigit():
            posalji_tekst_poruku(sender, "🔁 Molimo unesite valjani broj salona.")
            return Response(content="", media_type="application/xml")
        odabrani_broj = int(incoming_msg)
        salon_map = user_state[sender].get("salon_map", {})
        if odabrani_broj not in salon_map:
            posalji_tekst_poruku(sender, "🔁 Niste poslali valjani broj. Molimo pokušajte ponovno.")
            return Response(content="", media_type="application/xml")
        salon_id = salon_map[odabrani_broj]
        user_state[sender]["salon_id"] = salon_id
        handle_select_service(sender, salon_id)
        return Response(content="", media_type="application/xml")

    # --- ODABIR USLUGE ---
    if step == 2.5:
        if incoming_msg == "0":
            user_state[sender]["step"] = 0
            handle_select_salon(sender)
            return Response(content="", media_type="application/xml")
        if not incoming_msg.isdigit():
            posalji_tekst_poruku(sender, "🔁 Molimo unesite valjani broj usluge.\n↩️ Za povratak na prethodni korak pošaljite 0.")
            return Response(content="", media_type="application/xml")
        odabrani_broj = int(incoming_msg)
        service_map = user_state[sender].get("service_map", {})
        if odabrani_broj not in service_map:
            posalji_tekst_poruku(sender, "🔁 Niste poslali valjani broj usluge. Molimo pokušajte ponovno.\n↩️ Za povratak na prethodni korak pošaljite 0.")
            return Response(content="", media_type="application/xml")
        service_id = service_map[odabrani_broj]
        user_state[sender]["service_id"] = service_id
        user_state[sender]["step"] = 3
        handle_step_1(sender, user_state[sender]["salon_id"])
        return Response(content="", media_type="application/xml")

    # --- ODABIR TERMINA ---
    # --- ODABIR TERMINA ---
    if step == 2:
        if incoming_msg == "0":
            # Provjeri koliko usluga ima u salonu
            salon_id = user_state[sender]["salon_id"]
            usluge = get_salon_services(salon_id)

            if len(usluge) == 1:
                # Samo jedna usluga → vraćamo na odabir salona
                user_state[sender]["step"] = 0
                handle_select_salon(sender)
            else:
                # Više usluga → vraćamo na odabir usluge
                user_state[sender]["step"] = 2.5
                handle_select_service(sender, salon_id)
            return Response(content="", media_type="application/xml")

        if not incoming_msg.isdigit():
         posalji_tekst_poruku(sender, "🔁 Molimo unesite valjani broj termina.\n↩️ Za povratak na prethodni korak pošaljite 0.")
         return Response(content="", media_type="application/xml")

        handle_step_2(sender, incoming_msg, user_state[sender]["salon_id"])
        return Response(content="", media_type="application/xml")


@app.post("/cancel_reservation/")
async def cancel_reservation_frontend(payload: dict):
    """
    Endpoint za otkazivanje rezervacije preko frontenda.
    Frontend šalje: { salonId: str, rezervirao: str, od: str, do: str, datum: str }
    """
    salon_id = payload.get("salonId")
    rezervirao = payload.get("rezervirao")
    od = payload.get("od")
    do = payload.get("do")
    datum = payload.get("datum")  # očekuje format 'yyyy-mm-dd'

    if not all([salon_id, rezervirao, od, do, datum]):
        return {"success": False, "error": "Nedostaju podaci", "whatsappSent": False}

    result = mark_reservation_cancelled(salon_id, rezervirao, od, do, datum)

    # result = {"cancelled": bool, "whatsapp_sent": bool, "error": str or None}
    return {
        "success": result.get("cancelled", False),
        "whatsappSent": result.get("whatsapp_sent", False),
        "error": result.get("error")
    }

def ocisti_istekle_rasporede():
    try:
        saloni_ref = db.collection("saloni")
        danas = datetime.today().date()
        
        for salon_doc in saloni_ref.stream():
            salon_id = salon_doc.id
            raspored_ref = saloni_ref.document(salon_id).collection("raspored")
            
            for doc in raspored_ref.stream():
                datum_str = doc.id  # pretpostavljamo da je dokument nazvan datumom 'YYYY-MM-DD'
                try:
                    datum_doc = datetime.strptime(datum_str, "%Y-%m-%d").date()
                except ValueError:
                    continue
                
                if datum_doc < danas:
                    raspored_ref.document(doc.id).delete()
                    print(f"[INFO] Izbrisan dokument {doc.id} u salonu {salon_id}")
    except Exception as e:
        print(f"[ERROR] ocisti_istekle_rasporede: {e}")

# ----------------- APScheduler ----------------- #
scheduler = BackgroundScheduler()
# Cron: svakog ponedjeljka u 7:00 ujutro
# Cron: svake subote u 11:00
scheduler.add_job(
    ocisti_istekle_rasporede, 
    'cron', 
    day_of_week='mon',  # ponedjeljak
    hour=6,              # 6 sati ujutro
    minute=0             # 0 minuta
)
scheduler.start()