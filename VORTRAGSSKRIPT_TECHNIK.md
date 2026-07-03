# Vortragsskript — SephoBay Recommender (Technik-Deck)

*Wort-für-Wort-Skript zu `SephoBay_Praesentation_Technik.pptx` für die Präsentation am 16.07.
Zielzeit: **8:30–9:00 Minuten** für 9 Folien. Zeiten pro Folie in Klammern. `[...]` markiert
Regieanweisungen (Pause, Zeigen, Betonen) — nicht mitlesen.*

*Dieses Deck erklärt das System Stufe für Stufe; die Absicherung kommt bewusst nur kurz auf
Folie 8 vor. Für Rückfragen in der Tiefe (Formeln, Vorlesungsbezug) siehe
[PRAESENTATION_SKRIPT.md](PRAESENTATION_SKRIPT.md).*

---

## Folie 1 — Titel (0:20)

> Guten Tag zusammen. Wir sind Gruppe SephoBay — und heute schauen wir gemeinsam unter die
> Haube unseres Recommender Systems: wie aus knapp 25.000 Bewertungen eine Sterne-Vorhersage
> wird, Stufe für Stufe.
>
> [Auf die Zahl zeigen] Das Ergebnis vorab: **0,265 mittlerer absoluter Fehler** auf dem
> Testdatensatz. Der Weg dorthin besteht aus vier Stufen — die gehen wir jetzt durch.

---

## Folie 2 — Aufgabe & Daten (1:00)

> Zuerst die Spielregeln. [Auf den Formelblock zeigen] Bewertet wird der mittlere absolute
> Fehler — aber auf **gerundete** ganze Sterne. Das heißt: Gerundet wird, bevor der Fehler
> berechnet wird. Und weil wir selbst runden, gehört uns dieser Schritt — das wird später
> Stufe 4, unser größter Hebel.
>
> Die Datenbasis: 798 Nutzerinnen und Nutzer, 622 Produkte, knapp 25.000 Bewertungen — nur
> fünf Prozent der Bewertungsmatrix sind überhaupt gefüllt.
>
> [Auf die 75 % zeigen] Und die eine Eigenschaft, die alles bestimmt: **75 Prozent aller
> Bewertungen sind 5 Sterne.** Wer stumpf immer 5 tippt, liegt im Schnitt nur 0,37 daneben.
> Damit ist das keine klassische Regressionsaufgabe mehr, sondern ein Entscheidungsproblem:
> **"5 — oder nicht 5?"**

---

## Folie 3 — Architektur (0:50)

> So sieht das Gesamtsystem aus. [Am Diagramm entlang zeigen] Zwei Eingaben: die Bewertungen
> und die Produktprofile.
>
> **Stufe 1** ist ein Bias-Modell — das Rückgrat. **Stufe 2** korrigiert dessen Fehler mit
> Collaborative Filtering und Content-Ähnlichkeit. **Stufe 3** bündelt alle diese Signale in
> einem Modell, das nicht einen Schätzwert liefert, sondern die volle Wahrscheinlichkeits-
> verteilung über die Sterne 1 bis 5. Und **Stufe 4** trifft daraus die Entscheidung: der
> Stern mit dem kleinsten erwarteten Fehler.
>
> Kurz gesagt: Stufen 1 und 2 erzeugen die Signale, Stufe 3 macht daraus Wahrscheinlichkeiten,
> Stufe 4 macht daraus die metrik-optimale Wahl. Jetzt öffnen wir die Stufen einzeln.

---

## Folie 4 — Stufe 1: Bias-Backbone (1:10)

> Stufe 1, das Rückgrat. [Auf die Formel zeigen] Die Vorhersage ist der globale Durchschnitt —
> 4,61 — plus zwei gelernte Tendenzen: **b-u**, die Nutzer-Tendenz — wer generell streng
> bewertet, bekommt einen Abschlag — und **b-i**, die Produkt-Tendenz — beliebte Produkte
> liegen über dem Schnitt.
>
> Wichtig ist der Nenner: **n plus Lambda.** Das ist die Regularisierung. Bei einem Nutzer mit
> nur drei Bewertungen wird die Tendenz Richtung null gedämpft — eine einzelne
> Ausreißer-Bewertung kann das Profil nicht kippen. Und für unbekannte Nutzer oder Produkte
> ist die Tendenz schlicht null: Die Vorhersage fällt automatisch auf den Durchschnitt
> zurück. Das ist unser eingebauter Kaltstart-Fallback.
>
> Dieses bewusst einfache Modell schafft allein schon **0,325** — deutlich unter der
> Immer-5-Baseline von 0,371.

---

## Folie 5 — Stufe 2: Residual-Korrekturen (1:20)

> Stufe 2 arbeitet nicht auf den rohen Sternen, sondern auf den **Residuen** — also nur auf
> dem, was das Backbone noch nicht erklärt. [Auf den Formelblock zeigen] Das hält die
> Korrekturen klein und fokussiert.
>
> [Linke Karte] Erstens klassisches **Item-CF**: Zwei Produkte sind sich ähnlich, wenn
> dieselben Leute sie ähnlich abweichend bewertet haben — Cosine-Ähnlichkeit, mindestens drei
> gemeinsame Bewertungen, nur positive Ähnlichkeiten. Die Korrektur ist das gewichtete Mittel
> der Residuen des Nutzers auf den zehn ähnlichsten Produkten.
>
> [Rechte Karte] Zweitens — und das ist der Kreativ-Baustein aus dem Briefing —
> **Content-Ähnlichkeit als Sterne-Korrektur**. Content-Filtering liefert eigentlich keine
> Sterne, nur Ähnlichkeiten. Unser Dreh: Die Ähnlichkeit wird zum **Gewicht**. Ins
> Produktprofil fließen Kategorie, Marke, der logarithmierte Preis, 634 Inhaltsstoff-Flags und
> der TF-IDF-Vektor des Produktnamens. Für ein Paar nehmen wir die fünf content-ähnlichsten
> Produkte, die der Nutzer schon bewertet hat, und mitteln deren Residuen — ähnlichkeits-
> gewichtet. Das personalisiert genau dort, wo die dünne Matrix für CF keine Nachbarn hergibt.
>
> Zusammen bringt Stufe 2 den Test-MAE von 0,325 auf **0,305**.

---

## Folie 6 — Stufe 3: Verteilungsmodell (1:20)

> Stufe 3 bündelt alles. [Linke Seite] Pro Nutzer-Produkt-Paar bauen wir **17 Merkmale**: die
> vier Signale aus den Stufen 1 und 2, dazu einfache Statistiken — Durchschnitt, Streuung,
> Anzahl, und vor allem der Anteil an 5ern und an niedrigen Bewertungen je Nutzer und Produkt —
> und die **Affinität** des Nutzers zur Kategorie und Marke des Zielprodukts: seine
> Durchschnittsbewertung und Anzahl genau dort. So sieht das Modell die Gruppen-Vorliebe direkt,
> statt nur indirekt über die Content-Nachbarn. Darauf trainieren wir einen
> **Gradient-Boosting-Klassifikator**, der die volle Verteilung ausgibt: P von 1 bis P von 5.
> Fünf Modelle mit unterschiedlichen Seeds werden gemittelt.
>
> [Rechte Seite] Entscheidend ist, **woher die Trainingsdaten kommen**: Wir teilen die
> Bewertungen in fünf Folds. Die Merkmale für Fold 3 berechnen ausschließlich Modelle, die
> ohne Fold 3 trainiert wurden — und so für jeden Fold. **Kein Rating sieht je sein eigenes
> Modell.** Das nennt sich Out-of-fold, und es verhindert Leakage.
>
> [Auf die große Zahl zeigen] Der Gewinn: Wir können auf allen **24.892** Zeilen ehrlich
> trainieren — statt auf einem einzelnen Validierungssplit von 3.700 Zeilen. Achtmal mehr
> Daten für das Modell, das die entscheidende Grenze lernen muss.

---

## Folie 7 — Stufe 4: Die Entscheidung (1:20)

> Und jetzt Stufe 4 — der größte Hebel. [Auf die Formel zeigen] Wir runden **nicht**. Für
> jeden Kandidaten-Stern k rechnen wir den **erwarteten Fehler** unter der Verteilung aus —
> Summe über alle j von P von j mal Abstand k minus j — und nehmen das Minimum. Mathematisch
> ist das der Median der Verteilung, und für den mittleren absoluten Fehler ist der Median
> beweisbar die optimale Wahl.
>
> Was das praktisch heißt, zeigen die zwei Beispiele. [Linke Karte] Ein treuer Fan bei seiner
> Lieblingsmarke: 75 Prozent der Masse liegt auf der 5 — die Entscheidung ist klar die **5**.
> [Rechte Karte] Eine strenge Kundin bei einem schwachen Produkt: Die 5 ist mit 25 Prozent
> immer noch gut möglich — aber der erwartete Fehler kippt zur **4**.
>
> [Pause] Der Punkt ist: Eine starre Rundungsschwelle — auch eine getunte wie 4,3 — gibt
> **allen** Paaren dieselbe Grenze. Hier bekommt **jedes Paar seine eigene**. Dieser Schritt
> bringt den Test-MAE von 0,305 auf **0,265**.

---

## Folie 8 — Ergebnis (0:50)

> Damit zum Ergebnis. [Auf die Treppe zeigen] Immer-5 liegt bei 0,371. Das Backbone bringt
> 0,325, die Korrekturen 0,305. Eine global getunte Rundungsschwelle — die naive Alternative —
> schafft 0,29. Und die volle Verteilung mit optimaler Entscheidung: **0,265.**
>
> [Auf die Box rechts, zügig] Zur Absicherung nur ganz kurz: Der Vorsprung hält einem
> Bootstrap-Konfidenzintervall stand, er repliziert Out-of-fold über mehrere Datensplits ohne
> den Testdatensatz, und neun alternative Modellfamilien — von Matrix-Faktorisierung bis
> neuronale Netze — waren alle schlechter. Zur Einordnung: Auf 3.000 Testzeilen streut ein
> MAE um etwa plus/minus 0,02.

---

## Folie 9 — Fazit (0:40)

> Zusammengefasst in einem Satz: **Verteilung statt Punktschätzung.**
>
> Ein regularisiertes Bias-Modell erklärt den Großteil — einfach, robust, kaltstart-fest.
> Content-Ähnlichkeit personalisiert auch dort, wo die dünne Matrix kein Collaborative
> Filtering zulässt. Und der größte Hebel war nicht mehr Modellkomplexität, sondern die
> Entscheidungslogik: die volle Sterne-Verteilung vorhersagen und pro Paar den Stern mit dem
> kleinsten erwarteten Fehler wählen.
>
> Unsere Empfehlung: das System produktiv einsetzen — für relevantere Empfehlungen, mehr
> Zufriedenheit und mehr Kundenbindung.
>
> [Blick ins Publikum] Vielen Dank — wir freuen uns auf Ihre Fragen.

---

## Timing-Check

| Folie | Zeit | Kumuliert |
|---|---|---|
| 1 Titel | 0:20 | 0:20 |
| 2 Aufgabe & Daten | 1:00 | 1:20 |
| 3 Architektur | 0:50 | 2:10 |
| 4 Stufe 1: Bias-Backbone | 1:10 | 3:20 |
| 5 Stufe 2: Residual-Korrekturen | 1:20 | 4:40 |
| 6 Stufe 3: Verteilungsmodell | 1:20 | 6:00 |
| 7 Stufe 4: Entscheidung | 1:20 | 7:20 |
| 8 Ergebnis | 0:50 | 8:10 |
| 9 Fazit | 0:40 | 8:50 |

**Ziel: 8:50 Minuten Sprechzeit** — im 8–10-Minuten-Fenster, mit etwas Luft für Pausen an den
Grafiken.

## Vortrags-Tipps

- **Die Architektur-Folie (3) ist die Landkarte** — hier einmal sauber durchzeigen, dann weiß
  das Publikum bei jeder Stufen-Folie, wo es sich befindet.
- **Formeln zeigen, nicht vorrechnen** — auf den Block deuten, die Idee in einem Satz sagen
  („der Nenner dämpft seltene Nutzer"), nicht Symbol für Symbol vorlesen.
- **Folie 7 ist der Höhepunkt** — bei den zwei Beispielkarten Tempo rausnehmen; der Kontrast
  „gleiche Logik, unterschiedliche Entscheidung" ist die Kernbotschaft des ganzen Vortrags.
- **Folie 8 zügig** — die Absicherungs-Box bewusst nur streifen („haben wir geprüft, hält"),
  nicht verteidigend werden; die Treppe spricht für sich.
- Für Detailfragen („Warum Median?", „Was ist Out-of-fold genau?", „Warum kein neuronales
  Netz?") liefert [PRAESENTATION_SKRIPT.md](PRAESENTATION_SKRIPT.md) die ausführlichen
  Antworten; die Verifikation im Detail steht in `ANALYSIS.md` §9.
