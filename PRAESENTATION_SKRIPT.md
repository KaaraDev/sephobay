# Präsentations-Skript — SephoBay Recommender

*Begleittext zu `SephoBay_Praesentation.pptx`. Für jedes im Projekt verwendete Konzept wird erklärt,
**woher es aus Kapitel 2 (Recommender Systeme) kommt**, **wie es in der Vorlesung definiert ist**
und **wie/wo wir es in `SephoBay_Recommender_v5.ipynb` (finales Modell) einsetzen**. Reihenfolge
folgt den Foliennummern der Präsentation.*

---

## 0. Die zwei Grundbegriffe (Vorlesung, Folie 12)

Bevor irgendetwas anderes erklärt wird, steht die Definition aus der Vorlesung:

> **Nutzer:innen** geben **Bewertungen** für **Items** ab. Die **Bewertungsmatrix** enthält Zeilen
> für Nutzer:innen, Spalten für Items, und Zellen mit der (mind. ordinalen) Bewertung — oder
> „fehlend", wenn nicht bewertet. Ziel eines Recommender Systems: die fehlenden Zellen so gut wie
> möglich vorhersagen.

Bei SephoBay: 798 Nutzer:innen × 622 Produkte, Skala 0–5 Sterne, ~24.900 tatsächlich vergebene
Bewertungen — die Matrix ist also **sehr dünn besetzt** (Dichte ≈ 5%). Genau dieses
Dünnbesetzt-Sein ist der Grund, warum die Vorlesung überhaupt zwei unterschiedliche
Lösungsfamilien einführt (Collaborative Filtering und Content-Based Filtering) — und warum wir
beide kombinieren.

---

## 1. Collaborative Filtering (Vorlesung Folie 16–63)

### 1.1 Definition und Grundidee

> **Collaborative Filtering** nutzt die Bewertungen „ähnlicher" Nutzer:innen oder Items, um
> automatisiert Prognosen für die Interessen einzelner Nutzer:innen abzuleiten.

Zwei Spielarten (Folie 16):

- **Nutzerbasiert**: Das Profil von Nutzer X wird aus den Bewertungen „ähnlicher" Nutzer:innen
  abgeleitet (Nutzer-Communities).
- **Itembasiert**: Fehlende Bewertungen von Item i werden aus den Bewertungen „ähnlicher" Items
  abgeleitet (vgl. Warenkorbanalyse).

Die Vorgehensweise ist bei beiden identisch aufgebaut (Folie 18/43):

1. Finde die Menge an Nutzer:innen/Items, die vergleichbar bewertet wurden.
2. Berechne die **Ähnlichkeit** zwischen X und den Kandidat:innen.
3. Wähle die **k ähnlichsten** (→ **k-Nearest-Neighbour, kNN**, Folie 19).
4. **Aggregiere** deren Bewertungen zu einer Prognose.
5. Empfehle die Items mit der höchsten prognostizierten Bewertung.

**Wo im Projekt:** Genau dieses kNN-Schema (Schritte 1–4) ist der Kern unserer
`ResidualEngine` (§6 im Notebook) — sowohl für `item_resid` als auch `user_resid`. Wir wenden es
nur nicht auf die rohen Bewertungen an, sondern auf die **Residuen** nach dem Bias-Modell (dazu
mehr in Abschnitt 3).

### 1.2 Ähnlichkeitsmaße (Folie 20–31)

Die Vorlesung vergleicht vier Maße am selben Beispiel (Peter/Boris/Daniel) und kommt zu einem
klaren Ranking:

| Maß | Formel | Kernproblem |
|---|---|---|
| **Jaccard** | `J(A,B) = \|A∩B\| / \|A∪B\|` (Menge bewerteter Items) | ignoriert Bewertungshöhe → liefert oft für alle Kandidat:innen denselben Wert, kein sinnvolles Ranking |
| **Euklidisch** | `E(A,B) = 1 / (1 + Σ(Aᵢ−Bᵢ)²)`, fehlende Werte = 0 | das Ersetzen fehlender Werte durch 0 suggeriert eine schlechte Bewertung; Quotient/Wurzel verzerren |
| **Cosine** | `C(A,B) = ΣAᵢBᵢ / (√ΣAᵢ² · √ΣBᵢ²)` | ebenfalls 0-Ersetzung, aber deutlich robuster |
| **Pearson** | Cosine auf **mittelwert-normalisierten** Vektoren: `P(A,B) = Σ(Aᵢ−E(A))(Bᵢ−E(B)) / (√Σ(Aᵢ−E(A))² · √Σ(Bᵢ−E(B))²)` | löst das 0-Ersetzungsproblem, da E(A) via Durchschnitt geschätzt wird |

**Fazit der Vorlesung (Folie 31):** *„Jaccard ist ungeeignet, Cosine und Pearson sind am besten
geeignet."* — Diese exakte Erkenntnis reproduzieren wir empirisch in `SephoBay_Recommender_v3.ipynb`
(§8, Vergleichsfolie): Jaccard liefert kein brauchbares Ranking, Euklidisch wird durch die dünne
Matrix verzerrt, Cosine gewinnt.

**Wo im Projekt:** Wir verwenden durchgängig **Cosine**, aber — wichtiger Unterschied zur
Vorlesung — **nicht** über 0-ersetzte Vektoren, sondern **nur über gemeinsam bewertete Einträge**
(„co-rated", mit Mindest-Überlappung `min_overlap=3`), plus Beschränkung auf **positive**
Ähnlichkeiten. Das ist eine direkte Antwort auf den in der Vorlesung selbst benannten Nachteil
(„0 suggeriert eine beliebige/schlechte Bewertung") — wir ersetzen fehlende Werte gar nicht erst.

### 1.3 Aggregation (Folie 33–37)

Zwei Methoden, um aus den Bewertungen der k Nachbar:innen eine Prognose zu machen:

- **Mittelwert**: `X̂ᵢ = (1/k) Σ_{N∈kNN(X)} N_i`
- **Gewichteter Mittelwert**: `X̂ᵢ = Σ_{N∈kNN(X)} sim(X,N)·N_i / Σ sim(X,N)`
  (Cosine/Pearson müssen dafür transformiert werden: `sim' = (sim+1)/2`, da sie negativ werden
  können — Folie 35.)

**Fazit der Vorlesung:** *„Wahl von Ähnlichkeitsmaß und Aggregationsmethode spielen eine wichtige
Rolle"* (Folie 37) — unterschiedliche Kombinationen liefern spürbar unterschiedliche Prognosen.

**Wo im Projekt:** `_weighted_resid()` in der `ResidualEngine` ist exakt der gewichtete Mittelwert
aus der Vorlesung, nur auf Residuen statt auf rohen Sternen angewendet:
`Δ(u,i) = Σ_{j∈kNN(i)} sim(i,j)·residual(u,j) / Σ sim(i,j)`.

### 1.4 Nutzerbasiert vs. Itembasiert — Fazit (Folie 62–63)

- **Nutzerbasiert:** stellt auf Nutzer-Communities / „Word-of-Mouth" ab.
- **Itembasiert:** sinnvoll, wenn Item-Eigenschaften dominieren (Beispiel Vorlesung: „Aldi").
- **Vorteile CF allgemein:** berücksichtigt echte Nutzer-Item-Beziehungen; braucht nur die
  Bewertungsmatrix, keine Zusatzinformationen.
- **Nachteile CF allgemein:** **Kalt-Start-Problem** bei neuen Nutzer:innen/Items; benötigt viele
  Bewertungen für zuverlässige Prognosen (→ „Big Data").

**Wo im Projekt:** Genau dieser Nachteil (viele Bewertungen nötig) ist der Grund, warum unsere
`item_resid`/`user_resid`-Korrektoren **allein nicht** den Backbone schlagen (§6, Notebook): Die
Matrix ist zu dünn besetzt für zuverlässige Residual-Nachbarschaften — user-basiert ist dabei
konsistent mit der Vorlesungsaussage sogar noch schwächer als item-basiert. Wir behalten beide
trotzdem als **Kandidaten** für die Blend-Gewichtung (Abschnitt 5).

---

## 2. Content-Based Filtering (Vorlesung Folie 65–89)

### 2.1 Definition und Grundidee

> **Content-Based Filtering** nutzt zusätzlich zu den Bewertungen die **Eigenschaften der Items**,
> um individuelle Empfehlungen zu ermitteln. These: Nutzer:innen bewerten Items anhand ihrer
> Eigenschaften.

Vorgehensweise (Folie 68):

1. Bestimme die Item-Eigenschaften und ihre Definitionsbereiche.
2. Leite pro Item ein **Itemprofil** ab.
3. Erstelle daraus ein **Nutzerprofil** (aggregiert über die vom Nutzer bewerteten Items).
4. Berechne die Ähnlichkeit zwischen Nutzerprofil und den Itemprofilen unbewerteter Items.
5. Empfehle die ähnlichsten Items.

### 2.2 Itemprofile als binäre Vektoren (Folie 70–72)

Kategoriale Eigenschaften (z. B. Ort ∈ {Blaustein, Neu-Ulm, Ulm}) werden **one-hot** kodiert:
1 = zutreffend, 0 = nicht zutreffend. Das Vorlesungsbeispiel nutzt Ort/Preiskategorie/Küche für
Restaurants.

**Wo im Projekt:** `_content_sim()` in der `ResidualEngine` baut das Itemprofil exakt so:
One-Hot auf `secondary_category`, `tertiary_category`, `brand_name`, binäre `Ingredient_*`-Spalten
— das ist 1:1 dieselbe Technik wie Ort/Küche in der Vorlesung, nur mit mehr Kategorien und für
Drogerieprodukte statt Restaurants. `price_usd` behandeln wir als **stetige** Eigenschaft
(`log1p`, standardisiert) statt als grobe Preiskategorie-Bins wie in der Vorlesung — eine kleine,
begründete Erweiterung, weil uns der exakte Preis vorliegt.

### 2.3 Nutzerprofil und Relevanzmaße (Folie 73–81)

Grundthese: Kategorien, die in den bewerteten Items **häufig** vorkommen, sind für den/die
Nutzer:in **relevant**.

- **Termfrequenz (tf):** `tf(K,A) = |Kategorie K = wahr| / Σ_K |Kategorie K = wahr|` — relativer
  Anteil einer Kategorie im Nutzerprofil.
- **Invertierte Termfrequenz (tf-idf):** `tfidf(K,A) = tf(K,A) · log(N / n_K)` — gewichtet
  Kategorien stärker, die **selten** über alle Nutzer:innen hinweg vorkommen (betont, was diesen
  Nutzer *von anderen unterscheidet*).
- **Gewichtung mit der Bewertung:** `g̃ᵢ,ₑ = gᵢ,ₑ · Xᵢ` — eine Kategorie wird relevanter, wenn sie
  in **gut bewerteten** Items vorkommt.
- **Verfeinerung `tf_avg`:** nutzt die *Durchschnittsbewertung* pro Kategorie statt der Summe, um
  zu verhindern, dass eine einzelne Extrembewertung eine Kategorie dominiert.

**Wo im Projekt:** Diese Formel-Familie (`tf`/`tfidf`) ist **exakt dasselbe Konzept**, das wir für
den **Produktnamen** verwenden — nur nicht auf Kategorien, sondern auf **freien Text** angewendet
(`TfidfVectorizer` aus scikit-learn, §7 im Notebook). Statt „wie relevant ist die Kategorie
‚Blaustein' für Peters Profil" fragen wir „wie relevant ist das Wort ‚Vanille' für den Produktnamen".
Das ist die klassische **TF-IDF-Gewichtung aus dem Text Mining** (im Vorlesungs-Skript als
weiterführendes Kapitel 3 angekündigt, hier aber schon die identische Formel wie beim
Content-Based-Filtering-Nutzerprofil). Damit gewinnen wir ein **Text-Ähnlichkeitsmaß** zwischen
Produkten, das wir mit dem strukturierten Kategorien-Profil blenden: `S = 0.7·S_struktur + 0.3·S_text`.

### 2.4 Ähnlichkeit und Empfehlung (Folie 83–85)

Nach Aufbau von Nutzer- und Itemprofil wird wieder ein **Ähnlichkeitsmaß** (i. d. R. Cosine)
verwendet, um die Items zu ranken, die dem Nutzerprofil am ähnlichsten sind.

**Der entscheidende Punkt für unser Projekt:** Content-Based Filtering liefert in der klassischen
Form **kein Sterne-Rating**, sondern nur eine Ähnlichkeit/ein Ranking (siehe auch Folie 91:
*„Herausforderung: Content-Based Filtering liefert keine Bewertungsprognose"* — die Vorlesung löst
das im Yelp-Beispiel, indem sie **nur Rankings vergleicht (RMSE der Ränge)**, nicht Sterne).

**Genau das ist die im Aufgabenblatt geforderte kreative Lücke** (Fußnote „Content-Based Filtering
kann also nicht direkt angewendet werden. Finden Sie eine kreative Möglichkeit..."). Unsere
Lösung (§7 im Notebook, Folie 5 der Präsentation, „Content-based als Sternevorhersage"):

> Wir übernehmen das **gewichtete-Mittelwert-Aggregationsschema aus dem itembasierten
> Collaborative Filtering** (Abschnitt 1.3) — aber statt Rating-Ähnlichkeit verwenden wir
> **Content-Ähnlichkeit** als Gewicht:
> `content_resid(u,i) = Σ_{j∈kNN_content(i)} sim_content(i,j)·residual(u,j) / Σ sim_content(i,j)`

Damit bekommt Content-Based Filtering — technisch über den „Umweg" durch die itembasierte
CF-Aggregation — doch eine konkrete Sternenprognose, ohne die Content-Logik zu verlassen. Das ist
die Brücke zwischen den beiden in der Vorlesung getrennt behandelten Verfahren.

### 2.5 Vor- und Nachteile (Folie 89)

| Vorteile | Nachteile |
|---|---|
| Wiederverwendbares, interpretierbares Nutzerprofil | Braucht viele Bewertungen pro Nutzer:in für zuverlässige Prognosen |
| Schnelle Bewertung neuer Items möglich | Risiko der **Überspezialisierung** (fehlender „Variety-Factor") |
| Keine Daten anderer Nutzer:innen nötig | Eigenschaften müssen intersubjektiv messbar sein |
| Reduziertes **Kalt-Start-Problem** bei neuen Items | |

**Wo im Projekt:** Der letzte Vorteil ist unser Hauptargument, warum der Content-Korrektor gerade
dort hilft, wo Collaborative Filtering (Abschnitt 1.4) versagt: *„Content similarity gives every
(u,i) a usable, personalized residual even when co-rating overlap is too thin for CF"* — die
Schwäche von CF (dünne Matrix) wird durch die Stärke von CBF (kein Overlap nötig) kompensiert.
Das ist der zentrale Grund, **beide** Verfahren zu kombinieren statt nur eines zu wählen.

---

## 3. Was über die Vorlesung hinausgeht: das Bias-Modell (Backbone)

Dieser Baustein ist **keine** in Kapitel 2 gelehrte Methode — er ist eine bewusste Erweiterung,
das sollte in der Präsentation auch so benannt werden. Die Grundidee ist aber eine natürliche
Verallgemeinerung eines Vorlesungskonzepts: der **Mittelwert als Prognose** (Folie 33/48), nur
für Nutzer *und* Item gleichzeitig, mit einer Regularisierung gegen Overfitting bei wenigen
Bewertungen:

```
prediction(u,i) = globaler_Durchschnitt + b_u + b_i
b_u = Σ(r_ui − μ) / (n_u + λ)     (Nutzer-Tendenz, geglättet)
b_i = Σ(r_ui − μ − b_u) / (n_i + λ)  (Produkt-Tendenz, geglättet)
```

- `λ` (Regularisierung) schrumpft die Tendenz eines Nutzers/Produkts mit **wenigen** Bewertungen
  Richtung 0 — eine einzelne 1-Stern-Bewertung soll nicht das ganze Profil kippen.
- Unbekannte Nutzer:innen/Items → `b_u`/`b_i` = 0 → Prognose fällt auf den globalen Durchschnitt
  zurück (das ist unsere Antwort auf das **Kalt-Start-Problem**, siehe 1.4/2.5).

Dieses Bias-Modell ist der **Backbone**, auf dem alle anderen Bausteine als *Korrektur* aufsetzen
(„Residual-Ansatz", Abschnitt 1.1 und 2.4 — CF und Content wirken nicht auf die rohen Sterne,
sondern auf das, was das Bias-Modell **übrig lässt**).

---

## 4. Evaluationsmethodik: MAE statt Ranking-RMSE

Die Vorlesung evaluiert Content-Based Filtering im Yelp-Beispiel über **Ranking-RMSE**
(Folie 90–93), weil sie dort keine direkte Sternenprognose aus CBF gewinnt (siehe 2.4). Unsere
Zielmetrik ist eine andere, vom Aufgabenblatt vorgegebene:

> **MAE (Mean Absolute Error) auf ganzzahlig gerundete Sterne:**
> `MAE = (1/N) Σ |wahre_Sterne − gerundete_Prognose|`

Wichtig für die Präsentation: **Wir runden selbst**, bevor der Fehler berechnet wird — das
eröffnet einen Freiheitsgrad, den die Vorlesung nicht behandelt (dort wird nie gerundet, weil nie
mit Sternenprognosen aus CBF gearbeitet wird). Das ist unsere **zweite kreative Idee** (Folie 5):

- 75 % aller Bewertungen sind 5 Sterne → die Kosten sind **asymmetrisch**. Eine echte 5 fälschlich
  auf 4 zu runden verliert häufiger Punkte, als eine echte 4 fälschlich auf 5 zu runden gewinnt.
- Standard-Rundung (Schwelle 4,5) ist deshalb **nicht MAE-optimal**. Erste Stufe der Idee: die
  Rundungsschwelle direkt durch Minimierung des MAE auf dem Validierungs-Split bestimmen →
  optimale Schwelle **≈ 4,3**, nicht 4,5 (bringt 0,305 → 0,29).
- Endstufe (finales Modell): die Idee konsequent zu Ende gedacht. Ein Multiclass-Modell
  (Gradient Boosting) lernt aus allen Bausteinen die **volle Verteilung P(1–5 Sterne)** je
  Kunde-Produkt-Paar; gewählt wird pro Paar der Stern mit dem **kleinsten erwarteten Fehler**
  `argmin_k Σ_j P(j)·|k−j|` — mathematisch der Median der Verteilung, die MAE-optimale
  Entscheidung. Das ist ein *adaptiver Schwellenwert pro Zeile* statt einer globalen Schwelle.
  Damit die Features des Modells „ehrlich" sind, werden die Bausteine per 5-fold CV
  **out-of-fold** für alle ~24.900 Trainings-Bewertungen berechnet (kein Rating sieht sein
  eigenes Modell).
- Beide Stufen zusammen bringen den größten Sprung: Test-MAE **0,305 → 0,265**.

---

## 5. Zusammenspiel aller Bausteine (unser `predict(u,i)`)

```
Features(u,i) = [backbone, item_cf, user_cf, content, Nutzer-/Item-Statistiken,
                 Nutzer×Kategorie/Marke-Affinität]                                (out-of-fold)
P(1..5 | u,i) = GradientBoosting-Klassifikator(Features)                          (5-Seed-Ensemble)
stars(u,i)    = argmin_k Σ_j P(j)·|k−j|                                           (MAE-optimal)
```

- **Backbone** (Abschnitt 3): immer aktiv, auch als Fallback für Kalt-Start.
- **item_cf / user_cf** (Abschnitt 1): klassisches itembasiertes/nutzerbasiertes Collaborative
  Filtering aus der Vorlesung, aber auf Residuen statt rohen Sternen.
- **content** (Abschnitt 2): Content-Based Filtering, per itembasierter CF-Aggregation in eine
  Sternenprognose übersetzt (die geforderte kreative Lösung).
- **Statistiken**: Nutzer-/Item-Mittelwert, Streuung, Anzahl, Anteil 5er, Anteil ≤3er — alles
  nur aus dem jeweiligen Trainings-Fold.
- **Affinität**: die Durchschnittsbewertung und Anzahl des Nutzers innerhalb der **Kategorie**
  und **Marke** des Zielprodukts — vier direkte Merkmale, die die Gruppen-Vorliebe abbilden, die
  der Content-Korrektor vorher nur indirekt über seine k=5-Nachbarn sah. Leak-frei aus dem
  jeweiligen Trainings-Fold; unbekannte (Nutzer, Kategorie) fallen auf den globalen Schnitt zurück.
- **Verteilung + Entscheidung**: das Multiclass-Modell und der Expected-Cost-Decode aus
  Abschnitt 4 (Endstufe). Fehlt ein Baustein, trägt er 0 bei → automatischer Rückfall auf die
  einfacheren Signale („Konfidenz-Leiter").

Ergebnis: **Test-MAE 0,265** — gegenüber 0,37 für die triviale Baseline „immer 5", 0,31 für die
Variante, die *ausschließlich* mit den in Kapitel 2 gelehrten Methoden arbeitet
(`SephoBay_Recommender_v3.ipynb`), und 0,29 für die Vorstufe mit globaler Rundungsschwelle.
Der Vorsprung ist abgesichert (Bootstrap-Konfidenzintervall, OOF-Replikation über mehrere
Datensplits — Details in `ANALYSIS.md` §9; Implementierung in `SephoBay_Recommender_v5.ipynb`).

---

## 6. Kurz-Glossar für die Präsentation

| Begriff | Bedeutung | Quelle |
|---|---|---|
| Bewertungsmatrix | Nutzer × Item-Matrix mit (fehlenden) Bewertungen | Vorlesung Folie 12 |
| kNN | die k ähnlichsten Nutzer:innen/Items zu X | Vorlesung Folie 19 |
| Cosine-Ähnlichkeit | Kosinus des Winkels zwischen Bewertungs-/Profilvektoren | Vorlesung Folie 24 |
| Gewichteter Mittelwert | Aggregation der Nachbar-Bewertungen, gewichtet mit Ähnlichkeit | Vorlesung Folie 35 |
| Itemprofil | binärer/numerischer Merkmalsvektor eines Items | Vorlesung Folie 70–72 |
| Nutzerprofil | aggregiertes Profil aus den vom Nutzer bewerteten Items | Vorlesung Folie 73 |
| Termfrequenz / tf-idf | Relevanzmaß für Kategorien bzw. (bei uns) Wörter im Produktnamen | Vorlesung Folie 76–77 |
| Kalt-Start-Problem | keine/kaum Daten für neue Nutzer:innen/Items | Vorlesung Folie 63/89 |
| Bias-Modell | Backbone: globaler Schnitt + Nutzer-/Item-Tendenz, regularisiert | Erweiterung, nicht aus Kap. 2 |
| Residual | Differenz zwischen echter Bewertung und Backbone-Prognose | Erweiterung |
| Schwellenwert-Tuning | MAE-optimale Rundungsschwelle statt Standard-Rundung bei 4,5 | Erweiterung, motiviert durch Aufgabenstellung |
| Nutzer×Kategorie/Marke-Affinität | Ø-Bewertung & Anzahl des Nutzers in Kategorie/Marke des Zielprodukts (4 direkte Merkmale) | Erweiterung (finales Modell) |
| Sterne-Verteilung | volle Wahrscheinlichkeitsverteilung P(1–5 Sterne) je Kunde-Produkt-Paar | Erweiterung (finales Modell) |
| Expected-Cost-Entscheidung | Stern mit kleinstem erwarteten Fehler Σ P(j)·\|k−j\| = Median der Verteilung | Erweiterung (finales Modell) |
| Out-of-fold (OOF) | Features je Rating von Modellen, die ohne dieses Rating gefittet wurden (5-fold CV) | Erweiterung (finales Modell) |
| MAE | mittlerer absoluter Fehler auf gerundete Sterne | Aufgabenstellung |

---

## 7. Slide-für-Slide Sprechhinweise

**Folie 1 (Titel):** kurz halten — Team, Titel, die Kernzahl (0,265) direkt vorab zeigen, macht
neugierig.

**Folie 2 (Ausgangssituation & Ziel):** Problem in eigenen Worten (nicht ablesen): großes
Produktportfolio, Nutzer:innen finden nichts Passendes. Ziel: MAE auf gerundete Sterne
minimieren, im Vergleich zu den anderen Gruppen.

**Folie 3 (Daten):** die 75 %-Erkenntnis ist der Dreh- und Angelpunkt der ganzen Präsentation —
hier nicht hetzen. Sie erklärt, warum jede spätere Designentscheidung so getroffen wurde.

**Folie 4 (Unser Ansatz):** die vier Bausteine in der Reihenfolge Backbone → Content-Korrektur →
Sterne-Verteilung → Entscheidung erklären; bei „Content-Korrektur" explizit sagen: *„Das ist die
Brücke zwischen Collaborative und Content-Based Filtering aus der Vorlesung."*

**Folie 5 (Zwei kreative Ideen):** das ist die Antwort auf die beiden Sternchen-Fußnoten der
Aufgabenstellung — das dem Publikum (Vorstand/Prüfer:in) explizit so benennen.

**Folie 6/7 (Ergebnisse/Gründlichkeit):** Zahlen sprechen lassen, aber die Kernaussage in Worten
wiederholen: *„Wir sind nahe am irreduziblen Rauschen — der letzte Sprung kam aus einer besseren
Entscheidung, nicht aus mehr Modellkomplexität; komplexere Modelle allein scheitern nachweislich."*

**Folie 8 (Fazit):** die Botschaft in einem Satz: *„Ein regularisiertes Bias-Modell trägt den
Großteil, die Gewinne kommen aus einem weichen Content-Signal, der Kategorie-/Marken-Affinität und
der MAE-optimalen Sterne-Entscheidung pro Kunde-Produkt-Paar — nicht aus mehr Modellkomplexität."*
