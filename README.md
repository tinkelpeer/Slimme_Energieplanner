## Slimme Energieplanner Webapplicatie

De **Slimme Energieplanner** is een webapplicatie (React + TypeScript frontend, NestJS + TypeScript backend) waarmee je het laden en ontladen van een thuisbatterij kunt simuleren op basis van:

* **Day-ahead stroomprijzen** (CSV upload)
* **Optioneel PV-productieprofiel** (CSV upload)
* **Geplande verbruiksacties** (starttijd, duur, vermogen)

### Functionaliteit

* **Invoer** van batterij- en huisparameters:

  * Batterijcapaciteit (kWh)
  * Startlading (SoC in % of kWh)
  * Maximaal laad-/ontlaadvermogen (kW)
  * Netaansluitwaarde (kW)
* **CSV-upload**:

  * Day-ahead csv met kolommen `tijdstip` (of `time`) en `prijs` (of `price`)
  * PV-productie csv met kolommen `tijdstip` (of `time`) en `productie` (of `production`)
  * Tijdnotatie `HH:MM` of ISO-achtige strings (bijv. `2025-05-24T14:00`)
  * Consistente timesteps (Elke tijdsinterval kan, zolang consistent)
  * Bij gecombineerde upload (day-ahead + PV) gebruikt de simulator de kleinste tijdsinterval voor een uniforme 24 uurs grid, elke combinatie van tijdsinterval is mogelijk.

* **Visualisatie**:

  * Grafieken: prijs, laad-/ontlaadmomenten, SoC, huishoudelijk vs gepland
  * Tabel: intervaldata met kosten/opbrengsten en netverbruik

### Geleverde voorbeelddata 📂

In de map vind je CSV-bestanden die representatief zijn voor een gemiddeld Nederlands huishouden in 2025:

* `Day-ahead stroomprijzen - 60min.csv`
* `Day-ahead stroomprijzen - 15min.csv`
* `PV-productieprofiel - 60min.csv`
* `PV-productieprofiel - 15min.csv`

Daarnaast bevat de folder een `screenshot.jpg` waarin je de interface van de applicatie kunt bekijken. 

## Voorwaarden

* Node.js (versie ≥ 18)
* npm of yarn
* Docker & Docker Compose (voor de Docker-methode)

---

## Lokaal uitvoeren

1. **Clone de repository**

   ```bash
   git clone <je-repo-url>
   cd Slimme_Energieplanner
   ```

2. **Backend instellen**

   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

   De NestJS API is nu beschikbaar op `http://localhost:3000`.

3. **Frontend instellen**

   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

   De React-app draait op `http://localhost:5173` (of een andere vrije poort).

4. **Toegang**
   Open je browser op `http://localhost:5173` en de frontend maakt automatisch verbinding met de backend.

---

## Uitvoeren met Docker

In de root van het project staat een `docker-compose.yml`. Hiermee worden zowel frontend als backend in containers gestart.

1. **Maak lokale .env-bestanden**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Start de containers**

   ```bash
   docker-compose up --build
   ```

3. **Toegang**

   * Frontend: `http://localhost`
   * Backend (API): `http://localhost:3000`

Om de containers op de achtergrond te draaien, voeg je de `-d` vlag toe:

```bash
docker-compose up -d --build
```

Stop en verwijder de containers met:

```bash
docker-compose down
```

---

## Environment Variables

* **Backend**: zie `backend/.env.example`
* **Frontend**: zie `frontend/.env.example`

Zorg dat je in beide mappen een `.env` hebt aangemaakt, gebaseerd op de voorbeelden.

