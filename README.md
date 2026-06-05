# 💰 Financiën Tracker

Een volledig functionele financiën tracker die direct via GitHub Pages bereikbaar is. Gebouwd met vanilla HTML, CSS en JavaScript — geen frameworks, geen buildtools, geen externe afhankelijkheden.

---

## 🚀 Snelstart via GitHub Pages

### 1. Fork de repository

1. Klik rechtsboven op de knop **Fork**.
2. Kies je eigen account als bestemming.
3. Klik op **Create fork**.

### 2. GitHub Pages inschakelen

1. Ga in je geforkte repository naar **Settings** (het tandwiel-icoontje).
2. Klik in het linkermenu op **Pages**.
3. Kies bij **Source** de optie **Deploy from a branch**.
4. Selecteer de branch **main** en de map **/ (root)**.
5. Klik op **Save**.
6. Na enkele seconden verschijnt bovenaan de link naar je app, bijvoorbeeld:
   `https://jouwgebruikersnaam.github.io/financien-tracker/`

---

## 📱 De app gebruiken

### Dashboard
Het dashboard geeft een overzicht van:
- **Totale inkomsten** – som van alle inkomstentransacties
- **Totale uitgaven** – som van alle uitgaventransacties
- **Netto saldo** – inkomsten minus uitgaven
- **Spaarpercentage** – netto saldo als percentage van inkomsten

Gebruik de **maand- en jaarfilter** om het dashboard te beperken tot een specifieke periode. Er zijn twee grafieken: een **staafgrafiek** met maandelijkse inkomsten en uitgaven, en een **donut-grafiek** met de verdeling van uitgaven per categorie.

### Transacties
Voeg inkomsten of uitgaven toe via de knop **+ Transactie toevoegen**. Elke transactie heeft:
- **Type** – inkomst of uitgave
- **Datum**
- **Omschrijving**
- **Bedrag** (in euro)
- **Categorie**

Bewerk een transactie via het potloodicoon (✏️) of verwijder via het prullenbak-icoon (🗑️).

### Categorieën
Beheer je categorieën via het tabblad **Categorieën**. Je kunt:
- Nieuwe categorieën aanmaken met een eigen naam en kleur
- Een **maandbudget** instellen voor uitgavencategorieën
- Bestaande categorieën hernoemen of verwijderen

Een **voortgangsbalk** toont hoeveel van het budget je al hebt opgemaakt. Bij 80% verschijnt een waarschuwing; bij overschrijding wordt de categorie rood gemarkeerd.

### Spaardoelen
Stel een spaardoel in via het tabblad **Spaardoelen**:
- Geef je doel een naam (bijv. "Vakantie" of "Noodfonds")
- Voer het doelbedrag in
- Een voortgangsbalk toont hoeveel je al hebt gespaard ten opzichte van je doel

Daarnaast zie je een **maandelijks sparoverzicht** met het netto saldo per maand.

### CSV exporteren
Klik op **⬇ Exporteer CSV** in de koptekst om alle transacties te downloaden als een CSV-bestand. Dit bestand kun je openen in Excel of Google Sheets.

### CSV importeren
Klik op **⬆ Importeer CSV** om transacties te importeren. Het CSV-bestand moet de volgende kolommen bevatten (hoofdletterongevoelig):

```
datum,type,omschrijving,bedrag,categorie
2024-01-15,uitgave,Boodschappen,45.50,Eten
2024-01-01,inkomst,Salaris,2500.00,Salaris
```

Bestaande categorieën uit het bestand worden automatisch aangemaakt als ze nog niet bestaan.

### Gegevens wissen
Klik op **↺ Reset** om alle gegevens te wissen en terug te keren naar een lege staat.

---

## 💾 Gegevensopslag

Alle gegevens worden opgeslagen in de **lokale opslag** van je browser (`localStorage`) onder de sleutel `financetracker_data`. De app werkt volledig **offline** — er worden geen gegevens naar een server verstuurd.

> ⚠️ Let op: als je de browsercache wist of een andere browser gebruikt, zijn je gegevens niet beschikbaar. Gebruik de CSV-export om regelmatig een back-up te maken.

---

## 🛠️ Lokaal draaien

Clone de repository en open `index.html` direct in je browser, of gebruik een eenvoudige lokale webserver:

```bash
# Met Python 3
python -m http.server 8000

# Of met Node.js (npx)
npx serve .
```

Ga daarna naar `http://localhost:8000` in je browser.

---

## 📁 Bestandsstructuur

```
financien-tracker/
├── index.html   # Hoofd-HTML met semantische structuur en ARIA-labels
├── style.css    # Stijlen met CSS-variabelen, responsief ontwerp
├── app.js       # Alle functionaliteit (geen externe afhankelijkheden)
└── README.md    # Deze handleiding
```

---

## ✨ Functies

- ✅ Inkomsten en uitgaven bijhouden
- ✅ Categorieën met eigen kleuren
- ✅ Maandbudgetten met voortgangsbalken en waarschuwingen
- ✅ Spaardoelen met voortgang
- ✅ Maandelijkse staafgrafiek (Canvas API)
- ✅ Donut-grafiek per categorie (Canvas API)
- ✅ Filter op maand en jaar
- ✅ CSV exporteren en importeren
- ✅ Alles opgeslagen in localStorage (werkt offline)
- ✅ Volledig Nederlandstalige interface
- ✅ Responsief ontwerp (mobiel en desktop)
- ✅ Donker thema met CSS-variabelen
- ✅ Vloeiende overgangen en hover-effecten
- ✅ Semantische HTML met ARIA-labels
