# Ledger

## Prosjektbeskrivelse

###  Prosjekttittel
**Tittel på prosjektet**

---

### Deltakere
- Navn 1 – rolle/ansvar
- Navn 2 – rolle/ansvar  
- Navn 3 – rolle/ansvar 
*(individuelt prosjekt: skriv "Individuelt prosjekt")*

---

### 1. Prosjektidé og problemstilling

#### Beskrivelse
Beskriv kort hva dere skal lage.

- Hva er prosjektet?
- Hvilket problem løser det?
- Hvorfor er løsningen nyttig?

#### Målgruppe
Hvem er løsningen laget for?

---

### 2. Funksjonelle krav

Systemet skal minst ha følgende funksjoner:

1. Funksjon 1  
2. Funksjon 2  
3. Funksjon 3  
4. Funksjon 4  
5. Funksjon 5  

*(Legg til flere hvis nødvendig)*

---

### 3. Teknologivalg

#### Programmeringsspråk
- Eksempel: Python / JavaScript / C#

#### Rammeverk / Plattform / Spillmotor
- Eksempel: Flask / Unity / Godot / .NET

#### Database
- MariaDB

#### Verktøy
- GitHub
- GitHub Projects (Kanban)
- Eventuelle andre verktøy

---

### 4. Datamodell

#### Oversikt over tabeller

**Tabell 1:**
- Navn:
- Beskrivelse:

**Tabell 2:**
- Navn:
- Beskrivelse:

*(Minst 2–4 tabeller)*

#### Eksempel på tabellstruktur
```sql
User(
  id INT PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100),
  password VARCHAR(255)
)
```

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
