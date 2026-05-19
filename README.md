# Ledger – Webbasert økonomiapplikasjon

---

## 1. Prosjektidé og problemstilling

### Beskrivelse

Ledger er en fullstack webapplikasjon for personlig økonomistyring og investeringssimulering. Brukere kan opprette konto, logge inn sikkert, koble til bankkontoer, simulere kjøp og salg av aksjer, og få oversikt over sin økonomi gjennom et interaktivt dashboard.

### Hva er prosjektet?

Ledger lar brukere:

- Registrere og administrere sin konto med to-faktor-autentisering
- Koble til flere bankkontoer og flytte penger mellom dem
- Simulere aksjeinvesteringer med sanntidspriser fra Finnhub API
- Se detaljert økonomianalyse gjennom diagrammer og statistikk
- Administrere abonnement med ulike tilgangsnivåer (Free / Basic / Pro)

### Hva skal jeg gjøre på eksamensdagen?

1. Demonstrere innlogging med to-faktor-autentisering (e-post og TOTP)
2. Vise kontooversikt og pengeoverføring mellom kontoer
3. Vise sanntidsinvestering – søke opp en aksje, kjøpe og selge
4. Vise analysedashboard med grafer og diagrammer
5. Forklare sikkerhetstiltak (hashing, JWT, 2FA, rollebasert tilgang)
6. Forklare datamodellen og relasjonene i databasen

**Kanban-board:** https://github.com/GoldySap/Ledger_vite/projects

---

## 2. Systembeskrivelse

### Formål med applikasjonen

Målet var å utvikle et realistisk og sikkert system som demonstrerer fullstack webutvikling. Systemet kombinerer autentisering, databasehåndtering, ekstern API-integrasjon og rollebasert tilgangskontroll i én samlet løsning.

### Brukerflyt

```
1. Bruker besøker forsiden → klikker "Registrer"
2. Fyller inn e-post og passord → konto opprettes
3. Får tilsendt e-postkode → verifiserer kontoen
4. Logger inn → evt. 2FA-kode kreves
5. Lander på dashboard → kan se kontoer, transaksjoner, investeringer
6. Bruker kan aktivere TOTP i Innstillinger → skanner QR-kode
7. Admin kan logge inn og administrere alle brukere via adminpanel
```

### Teknologier brukt

| Lag | Teknologi | Begrunnelse |
|-----|-----------|-------------|
| Frontend | React + Vite | Komponentbasert, raskt og moderne |
| Backend | Flask (Python) | Lett og fleksibelt for REST API |
| Database | MariaDB / PostgreSQL (Supabase) | Relasjonsdatabase, god støtte for SQLAlchemy |
| ORM | SQLAlchemy | Abstraksjonslag over SQL, tryggere spørringer |
| Auth | Flask-JWT-Extended | Stateless autentisering med access/refresh-tokens |
| 2FA | pyotp | TOTP-standard (RFC 6238), kompatibel med Google Authenticator |
| Live priser | Finnhub API | Gratis sanntids aksjepriser |
| CAPTCHA | Cloudflare Turnstile | Beskytter innlogging og registrering mot roboter |
| Frontend-hosting | Vercel | Enkel deploy fra GitHub |
| Backend-hosting | Render / Raspberry Pi | Fleksibel serverhosting |

**Hvorfor Flask og ikke Django?**
Flask er et mikrorameverk – det gir full kontroll uten unødvendig overhead. For et prosjekt i denne størrelsen er Flask mer egnet enn Django som er tyngre og mer opinionated.

**Hvorfor MariaDB og ikke SQLite?**
SQLite er enkelt for testing, men MariaDB er bedre for produksjon og simulerer et reelt miljø. Prosjektet kan også bytte til PostgreSQL (Supabase) uten kodeendringer fordi SQLAlchemy abstraksjonerer databasen.

---

## 3. Server-, infrastruktur- og nettverksoppsett

### Servermiljø

- **Utvikling:** WSL2 (Ubuntu) på Windows, Flask dev-server
- **Produksjon:** Raspberry Pi med Waitress (WSGI-server), eller Render (cloud)
- **Frontend:** Vercel (automatisk deploy fra GitHub `main`-branch)

### Nettverksoppsett

```
Nettleser (klient)
    │
    ▼
Vercel (React-app, HTTPS port 443)
    │  fetch()
    ▼
Render / Raspberry Pi (Flask + Gunicorn, port 5000)
    │  SQLAlchemy
    ▼
MariaDB / PostgreSQL (port 3306 / 5432)
    │
    ▼  (kun for investeringer)
Finnhub API (HTTPS, ekstern)
```

### Viktige porter

| Tjeneste | Port |
|----------|------|
| Flask (utvikling) | 5000 |
| Flask (produksjon, Waitress) | 5000 |
| MariaDB | 3306 |
| PostgreSQL (Supabase) | 5432 |

### Tjenestekonfigurasjon

**Miljøvariabler (`.env`)**
```
# Backend
SECRET_KEY=SECRET_KEY=...
JWT_SECRET_KEY=...
FLASK_ENV="production" #can be production or development
VITE_FRONTEND_URL=https:...
VITE_BACKEND_URL=https:...
FLASK_USE="external" #can be external or local
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=ledger
SUPABASE_SESSION_POOL_URL="postgres.fnjybvztcgbzbsudzojt:ledghugd26x@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
EMAIL_USER=...
EMAIL_APP_PASSWORD=...
FINNHUB_API_KEY=...
TURNSTILE_SECRET_KEY=...

# Frontend
VITE_SECRET_KEY=...
VITE_FLASK_ENV="development"
VITE_FLASK_USE="local" #can be external or local
VITE_BACKEND_URL=https:...
VITE_LOCAL_BACKEND=http://localhost:5000
VITE_FINNHUB_API_KEY=...
VITE_TURNSTILE_SITE_KEY=...

```

**Kjørekommando (produksjon)**
```bash
# For backend
gunicorn --bind 0.0.0.0:5000 app:app #for hoting localt på nettverket
#eller
flask run --host=localhost --port=5000 #for hosting localt på machinen

#Frontend
npm run dev #for local hosting bare tilgjenlig for på egen maskin
#eller
npm run dev -- --host #for hosting localt på nettverket
```

---

## 4. Prosjektstyring – GitHub Projects (Kanban)

Prosjektet ble styrt med GitHub Projects med følgende kolonner:

| Kolonne | Beskrivelse |
|---------|-------------|
| Backlog | Ideer og fremtidige oppgaver |
| To Do | Planlagte oppgaver for nåværende sprint |
| In Progress | Aktive oppgaver |
| In Review | Ferdig, venter på test |
| Done | Fullført |

**Eksempler på issues:**
- `#1` Sette opp Flask og SQLAlchemy
- `#2` Implementere JWT-autentisering
- `#3` Lage 2FA med TOTP og backup-koder
- `#4` Integrere Finnhub API for aksjepriser
- `#5` Bygge analysedashboard med grafer
- `#6` Implementere abonnementssystem

**Refleksjon:** Kanban-board hjalp meg å holde oversikt over hva som var ferdig og hva som gjenstod. Det var særlig nyttig når oppgaver ble mer komplekse enn antatt – da kunne jeg flytte dem tilbake til "In Progress" og dele dem opp i mindre deler.

---

## 5. Databasebeskrivelse

**Databasenavn:** `ledger`

### Tabelloversikt

| Tabell | Beskrivelse |
|--------|-------------|
| `users` | Brukerkontoer med e-post, passord-hash og rolle |
| `subscriptions` | Abonnementsplaner (Free, Basic, Pro) |
| `subscription_access` | Tilgangsnivåer per abonnement |
| `security_settings` | 2FA-innstillinger og TOTP-hemmeligheter |
| `verification_codes` | Engangskoder for e-post-verifisering og 2FA |
| `accounts` | Brukerens bankkontoer |
| `transactions` | Inn- og utbetalinger per konto |
| `investments` | Aksjeinformasjon (symbol, pris, sektor) |
| `holdings` | Brukerens aksjeposisjoner |
| `investment_transactions` | Kjøp og salg av aksjer |
| `price_history` | Historiske aksjekurser |
| `watchlist` | Aksjer brukeren følger |
| `price_alerts` | Varslingsregler for kursendringer |
| `audit_logs` | Logg over sikkerhetsrelevante hendelser |
| `faq_items` | FAQ-spørsmål og svar |

### Sentrale tabeller

**`users`**

| Felt | Datatype | Beskrivelse |
|------|----------|-------------|
| id | INT PK | Primærnøkkel |
| email | VARCHAR(200) UNIQUE | E-postadresse |
| password_hash | VARCHAR(255) | PBKDF2-SHA256-hashet passord |
| role | ENUM('user','admin') | Tilgangsrolle |
| subscription_id | INT FK | Fremmednøkkel til subscriptions |
| active | BOOLEAN | Om kontoen er aktiv |

**`security_settings`**

| Felt | Datatype | Beskrivelse |
|------|----------|-------------|
| user_id | INT PK FK | Fremmednøkkel til users (1:1) |
| verified | BOOLEAN | E-post verifisert |
| email_2fa_enabled | BOOLEAN | E-post-basert 2FA |
| totp_secret | VARCHAR(32) | TOTP-hemmelighet (base32) |
| totp_enabled | BOOLEAN | Authenticator-app aktivert |
| backup_codes | JSON | Liste over backup-koder |

**`holdings`**

| Felt | Datatype | Beskrivelse |
|------|----------|-------------|
| id | INT PK | Primærnøkkel |
| user_id | INT FK | Eier |
| investment_id | INT FK | Hvilken aksje |
| quantity | FLOAT | Antall aksjer |
| avg_buy_price | FLOAT | Gjennomsnittlig kjøpspris |

### Nøkkelrelasjoner

```
users (1) ──── (1) security_settings
users (1) ──── (N) accounts
users (1) ──── (N) holdings
accounts (1) ── (N) transactions
holdings (1) ── (N) investment_transactions
investments (1) (N) price_history
```

### SQL-eksempel

```sql
-- Hent alle aktive brukerkontoer med abonnement
SELECT u.email, u.role, s.label AS subscription
FROM users u
JOIN subscriptions s ON u.subscription_id = s.id
WHERE u.active = TRUE;

-- Hent portefølje med gevinst/tap
SELECT i.symbol, h.quantity, h.avg_buy_price,
       i.current_price,
       (h.quantity * i.current_price) AS current_value,
       (h.quantity * (i.current_price - h.avg_buy_price)) AS gain_loss
FROM holdings h
JOIN investments i ON h.investment_id = i.id
WHERE h.user_id = 1;
```

---

## 6. Programstruktur

```
ledger/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/          # Login, Register
│   │   │   ├── Dashboard/     # Finances, Investments, Analytics, Settings
│   │   │   └── Nav/           # NavTop, NavSide
│   │   ├── API/
│   │   │   ├── api.jsx        # fetch-wrapper
│   │   │   └── useApi.jsx     # React hook
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── app.py                 # Flask-app, blueprint-registrering
│   ├── config.py              # DevelopmentConfig / ProductionConfig
│   ├── .env
│   └── logic/
│       ├── extensions.py      # db, jwt, limiter
│       ├── models/
│       │   └── data.py        # Alle SQLAlchemy-modeller
│       ├── routes/
│       │   ├── auth_routes.py
│       │   ├── security.py
│       │   ├── finance_routes.py
│       │   ├── investment_routes.py
│       │   ├── accounts_routes.py
│       │   ├── faq_routes.py
│       │   ├── admin_routes.py
│       │   ├── debug_routes.py
│       │   └── helpers.py
│       └── services/
│           └── finnhub.py
└── README.md
```

### Dataflyt

```
Nettleser → React-komponent → useApi() hook → fetch() til Flask
    → JWT-validering → Rute-funksjon → SQLAlchemy-spørring
    → MariaDB → Retur til Flask → JSON-respons → React-state
    → Rendrer UI
```

---

## 7. Kodeforklaring

### Autentisering (`auth_routes.py`)

**`POST /api/auth/register`**
Oppretter ny bruker. Sjekker at e-posten ikke finnes fra før, hasher passordet med `werkzeug.security.generate_password_hash`, lagrer brukeren og sender e-postverifiseringskode.

**`POST /api/auth/login`**
Validerer e-post og passord med `check_password_hash`. Sjekker om 2FA er aktivert – hvis ja, returneres en liste over aktive metoder og en midlertidig kode sendes. Hvis nei, utstedes JWT-tokens direkte via cookies.

**`POST /api/auth/login/verify`**
Validerer 2FA-koden (e-post, TOTP eller backup-kode) og utsteder tokens.

### Sikkerhet (`security.py`)

**`POST /api/security/totp/setup`**
Genererer en tilfeldig base32-hemmelighet med `pyotp.random_base32()`, lagrer den midlertidig som `totp_pending_secret` og returnerer en `otpauth://`-URI som vises som QR-kode i frontend.

**`POST /api/security/totp/confirm`**
Verifiserer at brukeren har scannet QR-koden korrekt ved å validere en 6-sifret kode med `pyotp.TOTP.verify()`. Hvis gyldig, flyttes `totp_pending_secret` til `totp_secret` og det genereres 8 backup-koder.

### Investeringer (`investment_routes.py`)

**`GET /api/investment/market/live`**
Henter sanntidspriser fra Finnhub for alle aksjer i databasen. Oppdaterer `current_price` og logger en ny rad i `price_history` for hvert kall, slik at kursgrafer akkumulerer data over tid.

**`POST /api/investment/holdings/buy`**
Gjennomfører et aksjakjøp. Oppdaterer eksisterende posisjon (veiet gjennomsnittspris) eller oppretter ny. Lagrer en rad i `investment_transactions` for historikk.

### Hjelpefunksjoner (`helpers.py`)

- `admin_required` – decorator som sjekker at innlogget bruker har `role == "admin"`
- `subscription_access_required(feature)` – decorator som sjekker at brukerens abonnement har tilgang til en gitt funksjon
- `verify_2fa(user, code)` – prøver TOTP, deretter backup-koder, til slutt e-postkode

---

## 8. Sikkerhet og pålitelighet

### Sikkerhetstiltak

| Trussel | Konsekvens | Tiltak |
|---------|------------|--------|
| SQL-injeksjon | Datatap, uautorisert tilgang | SQLAlchemy ORM – parameteriserte spørringer |
| Svakt passord / passordlekkasje | Kontokapring | PBKDF2-SHA256 hashing (Werkzeug) |
| Uautorisert tilgang | Tilgang til andres data | JWT-tokens i HTTP-only cookies, `@jwt_required()` |
| Sesjonshijacking | Langvarig uautorisert tilgang | Short-lived access tokens (15 min) + refresh token |
| Brute force | Passordgjetting | Flask-Limiter (5 forsøk/minutt på login) |
| Bot-registrering | Spam-kontoer | Cloudflare Turnstile CAPTCHA |
| Phishing / MitM | Stjålet sesjon | HTTPS i produksjon, Secure cookie-flag |
| Uautorisert kontohandling | Endring av andres data | Alle endepunkter verifiserer `user_id` fra JWT |
| Svak 2FA | Kontokapring | TOTP (RFC 6238) + backup-koder |

### Passord-hashing

```python
# Lagring
user.password_hash = generate_password_hash(password)

# Validering
check_password_hash(user.password_hash, input_password)
```

PBKDF2-SHA256 legger til salt automatisk og er beregnet treg, noe som gjør brute force upraktisk.

### Rollebasert tilgangskontroll (RBAC)

```python
@admin_required          # kun admin
@jwt_required()          # alle innloggede
@subscription_access_required("has_investment_access")  # kun Pro
```

### Audit logging

Alle sikkerhetsrelevante handlinger (innlogging, 2FA-forsøk, e-postendring) logges i `audit_logs`-tabellen med bruker-ID, handling, status, IP-adresse og tidspunkt.

### Pålitelighet

- Alle API-ruter har feilhåndtering og returnerer meningsfulle HTTP-statuskoder (400, 401, 403, 404, 500)
- Databaseindekser på `investment_id + timestamp` i `price_history` for rask spørring
- Cascade delete sikrer at relaterte rader slettes når en bruker fjernes
- `USE_FINNHUB`-flagg i `investment_routes.py` gjør at systemet fungerer uten nettilgang

---

## 9. Feilsøking og testing

### Typiske feil og løsninger

| Problem | Årsak | Løsning |
|---------|-------|---------|
| `500 Internal Server Error` på `/api/subscription` | `user.subscription` var `None` | La til null-sjekk og fallback til `Subscription.query.get(1)` |
| `{"error": "Investment not found"}` ved kjøp | Aksje fantes ikke i databasen | Implementerte `_upsert_investment()` som oppretter ny rad fra Finnhub ved behov |
| `SyntaxError: Unexpected token '<'` i frontend | Backend returnerte HTML-feilside i stedet for JSON | La til feilhåndtering i `api.jsx` som logger `RAW RESPONSE` |
| 2FA-kode godtas ikke | Tidsdrift mellom server og klient | `pyotp.TOTP.verify()` bruker et tolerance-vindu på ±1 periode |
| FAQ-seeding virket ikke | `FaqItem` ikke importert før `db.create_all()` | Importert modellen øverst i `debug_routes.py` |
| CORS-feil i utvikling | Flask-CORS ikke konfigurert for localhost | La til `origins` i `CORS()`-konfigurasjonen |

### Testmetoder

**API-testing med nettleser / terminal:**
```bash
# Test at backend svarer
curl http://localhost:5000/api/health

# Test innlogging
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","captcha":"test"}'
```

**Manuell frontend-testing:**
- Testet alle skjemafelt med gyldige og ugyldige verdier
- Testet rollebasert tilgang (admin-sider utilgjengelig for vanlig bruker)
- Testet 2FA-flyten end-to-end med Google Authenticator
- Testet abonnementssperring (investeringssider blokkert for Free-plan)

**Nettverksinspeksjon (Chrome DevTools → Network):**
- Verifisert at JWT-cookies er satt riktig (`HttpOnly`, `SameSite`)
- Kontrollert at alle API-kall returnerer korrekt statuskode
- Sjekket at sensitive felter (passord, TOTP-hemmelighet) ikke eksponeres i responser

---

## 10. Konklusjon og refleksjon

### Hva lærte jeg?

- Hvordan bygge et fullstack system med klar separasjon mellom frontend og backend
- JWT-autentisering med access og refresh tokens, og hvorfor HTTP-only cookies er sikrere enn localStorage
- TOTP-standarden (RFC 6238) og hvordan tidsbaserte engangskoder fungerer matematisk
- Relasjonsdatabasedesign med fremmednøkler, kaskadesletting og indekser
- REST API-design med meningsfulle HTTP-statuskoder og feilmeldinger
- Deployment og miljøhåndtering (`.env`, ulike konfigurasjoner for dev/prod)

### Hva fungerte bra?

- **Abonnements- og tilgangssystemet** – `SubscriptionAccess`-modellen med dekoratorer gjør det enkelt å legge til nye funksjoner med tilgangskontroll
- **SQLAlchemy-relasjoner** – cascade delete og backref gjør databaseoperasjoner enkle og trygge
- **`USE_FINNHUB`-flagget** – gjør systemet testbart uten internettilgang
- **Modulær backend-struktur** – blueprints gjør det lett å finne og endre kode

### Hva var utfordrende?

- **Relasjoner mellom mange tabeller** – spesielt holdings → investment_transactions og cascade-regler tok tid å få riktig
- **2FA-flyten** – å håndtere tilstanden mellom "passord godkjent" og "2FA verifisert" krevde nøye planlegging
- **JWT og cookies på tvers av domener** – CORS og `SameSite`-innstillinger i produksjon var vanskelig å konfigurere riktig
- **Finnhub API** – rate-limiting og håndtering av at API ikke alltid er tilgjengelig

### Hva ville jeg gjort annerledes?

- Skrevet automatiserte tester (pytest) fra starten av, ikke bare manuell testing
- Planlagt datamodellen mer nøye i starten – noen tabeller måtte endres underveis
- Brukt TypeScript i frontend for bedre typesikkerhet
- Implementert WebSockets for sanntidsoppdatering av aksjepriser i stedet for polling hvert 15. sekund

### Videre utvikling

- **Ekte bankintegrasjon** via Open Banking API (f.eks. Tink)
- **Push-varsler** når prisalarmer utløses
- **Mobil-app** med React Native og delt forretningslogikk
- **HTTPS** med Let's Encrypt på Raspberry Pi-serveren

---

## 11. Kildeliste

- Flask Documentation – https://flask.palletsprojects.com/
- SQLAlchemy Documentation – https://www.sqlalchemy.org/
- React Documentation – https://react.dev/
- Flask-JWT-Extended – https://flask-jwt-extended.readthedocs.io/
- pyotp (TOTP) – https://pyauth.github.io/pyotp/
- Finnhub API – https://finnhub.io/docs/api
- Cloudflare Turnstile – https://developers.cloudflare.com/turnstile/
- Werkzeug Security – https://werkzeug.palletsprojects.com/en/latest/utils/#module-werkzeug.security
- RFC 6238 – TOTP Standard – https://datatracker.ietf.org/doc/html/rfc6238
- MDN Web Docs – https://developer.mozilla.org/
- Render Documentation – https://render.com/docs
- Vercel Documentation – https://vercel.com/docs
- OWASP Top 10 – https://owasp.org/www-project-top-ten/
- W3Schools – https://www.w3schools.com/
