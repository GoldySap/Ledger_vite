# Ledger

## Prosjektbeskrivelse – IT-utviklingsprosjekt (2IMI)
###  Ledger – Webbasert økonomi side

------------------------------------------------------------------------

### Deltakere
- Individuelt prosjekt

------------------------------------------------------------------------

### Beskrivelse
**Beskrivelse:**
Ledger er en fullstack webapplikasjon for økonomistyring og investeringer. Systemet lar brukere registrere konto, logge inn sikkert, administrere bankkontoer, følge investeringer og få oversikt over økonomiske data gjennom et personlig dashboard. Prosjektet fokuserer på sikkerhet, databasehåndtering, API-integrasjon og moderne webutvikling med Flask og React.

- **Hva er prosjektet?**
Målet med prosjektet er å utvikle en moderne og sikker webapplikasjon hvor brukere kan simulere invisteringer og holde oversikt over (fiktiv) økonomisk informasjon på ett sted. Systemet kombinerer kontohåndtering, investeringsovervåkning og abonnementstilgang i én løsning.

Prosjektet demonstrerer:

Fullstack webutvikling
Databasehåndtering med SQLAlchemy
Autentisering og sikkerhet
Rollebasert tilgangskontroll
API-basert datavisualisering

- **Hvilket problem løser det?**
Mange mangler en enkel og strukturert måte å samle økonomisk informasjon og abonnementstilgang på ett sted. Prosjektet viser også hvordan slike systemer bygges teknisk. 

- **Hvorfor er løsningen nyttig?**
Løsningen gir brukeren oversikt, samtidig som den demonstrerer praktisk bruk av database, backend og frontend i ett samlet system.

### Målgruppe
**Hvem er løsningen laget for?:**
- Privatpersoner som ønsker oversikt over økonomi
- Administratorer som administrerer brukere
- Prosjektet er også laget for læring og demonstrasjon av IT-utvikling

---
### 2. Funksjonelle krav

Systemet skal minst ha følgende funksjoner:

1. Bruker kan registrere konto og logge inn  
2. Brukerdata lagres sikkert i en database (Enten lokalt(mariadb) eller på en leverandør(postgres))
3. Bruker får tilgang til dashboard etter innlogging  
4. Abonnementbasert tilgang til beskyttede sider  
5. Rollebasert tilgang (bruker / admin)
6. Admin kan se og administrere brukere
7. Økonomiske data vises som diagrammer via API
8. Bruker kan logge ut og håndtere kontoinnstillinger

------------------------------------------------------------------------

### 3. Teknologivalg
**Programmeringsspråk**
- HTML / CSS / JavaScript / Python

**Rammeverk / Plattform**
- React (frontend rammeverk) / Flask (backend) / Vercel (Frontend hosting / Platform), Render (Backend hosting / Platform)

**Database**
- MariaDB (Rasberry pi / wsl) / Supabase (PostgreSQL)

**Verktøy**
- GitHub
- GitHub Projects (Kanban)
- Waitress
- Raspberry Pi (server)

**Viktige Packer**
- SQLAlchemy (Python)
- Flask Migration (Python)
- Flask Cors (Python)
- React Router Dom (Javascript Node)

------------------------------------------------------------------------

### 4. Datamodell

**Oversikt over tabeller**

**Tabell 1:**
- Navn: subscriptions
- Beskrivelse: Lagrer forskjellige abonnementstyper brukere kan ha

| Tabell        | Felt  | Datatype                       | Beskrivelse                           |
| ------------- | ----- | ------------------------------ | ------------------------------------- |
| subscriptions | id    | INT AUTO_INCREMENT PRIMARY KEY | Primærnøkkel                          |
| subscriptions | label | VARCHAR(255)                   | Navn på abonnement (f.eks. free, pro) |
| subscriptions | price | DECIMAL(10, 2)                 | Månedlig pris for abonnement          |


**Tabell 2:**
- Navn: users
- Beskrivelse: Lagrer brukerinformasjon: som rolle, brukernavn, e-post, osv.

| Tabell | Felt            | Datatype                                     | Beskrivelse                              |
| ------ | --------------- | -------------------------------------------- | ---------------------------------------- |
| users  | id              | INT AUTO_INCREMENT PRIMARY KEY               | Primærnøkkel                             |
| users  | username        | VARCHAR(255) NOT NULL                        | Brukerens brukernavn                     |
| users  | email           | VARCHAR(100) UNIQUE NOT NULL                 | Brukerens e-postadresse                  |
| users  | password_hash   | VARCHAR(255) NOT NULL                        | Hashet passord                           |
| users  | phonenumber     | VARCHAR(20) NOT NULL                         | Brukerens telefonnummer                  |
| users  | role            | ENUM('user','admin') NOT NULL DEFAULT 'user' | Brukerrolle i systemet                   |
| users  | subscription_id | INT NOT NULL DEFAULT 1                       | Fremmednøkkel til subscriptions-tabellen |
| users  | active          | BOOLEAN DEFAULT 1                            | Angir om bruker er aktiv                 |
| users  | created_at      | TIMESTAMP DEFAULT CURRENT_TIMESTAMP          | Tidspunkt for opprettelse av bruker      |


**Tabell 3:**
- Navn: verification
- Beskrivelse: Lagrer sikkerhets- og verifikasjonsinformasjon for brukeren

| Tabell       | Felt              | Datatype            | Beskrivelse                                  |
| ------------ | ----------------- | ------------------- | -------------------------------------------- |
| verification | user_id           | INT UNIQUE NOT NULL | Fremmednøkkel til users.id (1:1-relasjon)    |
| verification | verified          | BOOLEAN DEFAULT 0   | Angir om bruker har bekreftet e-post         |
| verification | email_2fa_enabled | BOOLEAN DEFAULT 0   | Aktiverer 2FA via e-post                     |
| verification | sms_2fa_enabled   | BOOLEAN DEFAULT 0   | Aktiverer 2FA via SMS                        |
| verification | totp_secret       | VARCHAR(32) NULL    | Hemmelig nøkkel for TOTP (Authenticator-app) |
| verification | totp_enabled      | BOOLEAN DEFAULT 0   | Angir om TOTP er aktivert                    |

**Tabell 4:**
- Navn: backup_codes
- Beskrivelse: Lagrer backup-koder for tofaktorautentisering

| Tabell       | Felt      | Datatype                       | Beskrivelse                |
| ------------ | --------- | ------------------------------ | -------------------------- |
| backup_codes | id        | INT AUTO_INCREMENT PRIMARY KEY | Primærnøkkel               |
| backup_codes | user_id   | INT NOT NULL                   | Fremmednøkkel til users.id |
| backup_codes | code_hash | VARCHAR(255) NOT NULL          | Hashet backup-kode         |
| backup_codes | used      | BOOLEAN DEFAULT 0              | Angir om koden er brukt    |


### Eksempel på tabellstruktur
```sql
-- Abonnement tabel
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  label VARCHAR(255), 
  price DECIMAL(10, 2)
)

-- Bruker tabel
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  username VARCHAR(255) NOT NULL, 
  email VARCHAR(100) UNIQUE NOT NULL, 
  password_hash VARCHAR(255) NOT NULL, 
  phonenumber VARCHAR(20) NOT NULL, 
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user', 
  subscription_id INT NOT NULL DEFAULT 1, 
  active BOOLEAN DEFAULT 1, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Verifikasjons tabel
CREATE TABLE verification (
  user_id INT UNIQUE NOT NULL, 
  verified BOOLEAN DEFAULT 0, 
  email_2fa_enabled BOOLEAN DEFAULT 0, 
  sms_2fa_enabled BOOLEAN DEFAULT 0, 
  totp_secret VARCHAR(32) NULL, 
  totp_enabled BOOLEAN DEFAULT 0, 
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

------------------------------------------------------------------------

### 5. Plan og arbeidsmetode
Arbeidsmetode

Prosjektet er delt opp i små, konkrete oppgaver

Arbeidet planlegges før koding starter

Kanban-board brukes aktivt gjennom hele prosjektet

Kanban-kolonner

Backlog

To do

In progress

In review

Done

Eksempler på oppgaver

Opprette MariaDB-database

Lage tabeller og relasjoner

Koble Flask til database

Lage innlogging og registrering

Implementere dashboard

Lage API for diagramdata

Dokumentere prosjektet

------------------------------------------------------------------------

### 6. Dokumentasjon og refleksjon (kort)

Prosjektet dokumenteres fortløpende i README.md.
Til slutt reflekteres det over:

hva som fungerte bra

hva som var utfordrende

hva som kunne vært gjort annerledes

Beskrivelse:

Prosjektet går ut på å utvikle en webapplikasjon der brukere kan opprette konto, logge inn og få tilgang til et personlig dashboard for økonomisk oversikt.

Hva er prosjektet?
Et fullstack websystem som lar brukere administrere konto, abonnement og økonomiske data gjennom et sikkert innloggingssystem.

Hvilket problem løser det?
Mange mangler en enkel og strukturert måte å samle økonomisk informasjon og abonnementstilgang på ett sted. Prosjektet viser også hvordan slike systemer bygges teknisk.

Hvorfor er løsningen nyttig?
Løsningen gir brukeren oversikt, samtidig som den demonstrerer praktisk bruk av database, backend og frontend i ett samlet system.

Målgruppe

Privatpersoner som ønsker oversikt over økonomi

Administratorer som administrerer brukere

Prosjektet er også laget for læring og demonstrasjon av IT-utvikling

## Prosjekt Dokumentasjon

### 1. Forside

**Prosjekttittel:**\
**Navn:**\
**Klasse:**\
**Dato:**

**Kort beskrivelse av prosjektet:**\
*Skriv 2--4 setninger om hva applikasjonen gjør og hvilket tema den
bygger på.*

------------------------------------------------------------------------

## 2. Systembeskrivelse

**Formål med applikasjonen:**\
*Forklar hva du ønsket å oppnå med prosjektet.*

**Brukerflyt:**\
*Beskriv hvordan brukeren bruker løsningen -- fra startside til lagring
av data.*

**Teknologier brukt:**

-   Python / Flask\
-   MariaDB\
-   HTML / CSS / JS\
-   (valgfritt) Docker / Nginx / Gunicorn / Waitress osv.

------------------------------------------------------------------------

### 3. Server-, infrastruktur- og nettverksoppsett

#### Servermiljø

*F.eks.: Ubuntu VM, Docker, fysisk server.*

#### Nettverksoppsett

-   Nettverksdiagram
-   IP-adresser\
-   Porter\
-   Brannmurregler

Eksempel:

    Klient → Waitress → MariaDB

#### Tjenestekonfigurasjon

-   systemctl / Supervisor\
-   Filrettigheter\
-   Miljøvariabler

------------------------------------------------------------------------

### 4. Prosjektstyring -- GitHub Projects (Kanban)

-   To Do / In Progress / Done\
-   Issues\
-   Skjermbilde (valgfritt)

Refleksjon: Hvordan hjalp Kanban arbeidet?

------------------------------------------------------------------------

### 5. Databasebeskrivelse

**Databasenavn:**

**Tabeller:**\
\| Tabell \| Felt \| Datatype \| Beskrivelse \|
\|--------\|-------\|-----------\|--------------\| \| customers \| id \|
INT \| Primærnøkkel \| \| customers \| name \| VARCHAR(255) \| Navn \|
\| customers \| address \| VARCHAR(255) \| Adresse \|

**SQL-eksempel:**

``` sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  address VARCHAR(255)
);
```

------------------------------------------------------------------------

### 6. Programstruktur

    projectnavn/
     ├── app.py
     ├── templates/
     ├── static/
     └── .env

Databasestrøm:

    HTML → Flask → MariaDB → Flask → HTML-tabell

------------------------------------------------------------------------

### 7. Kodeforklaring

Forklar ruter og funksjoner (kort).

------------------------------------------------------------------------

### 8. Sikkerhet og pålitelighet

-   .env\
-   Miljøvariabler\
-   Parameteriserte spørringer\
-   Validering\
-   Feilhåndtering

------------------------------------------------------------------------

### 9. Feilsøking og testing

-   Typiske feil\
-   Hvordan du løste dem\
-   Testmetoder

------------------------------------------------------------------------

### 10. Konklusjon og refleksjon

-   Hva lærte du?\
-   Hva fungerte bra?\
-   Hva ville du gjort annerledes?\
-   Hva var utfordrende?

------------------------------------------------------------------------

### 11. Kildeliste

-   w3schools\
-   flask.palletsprojects.com
