# Vortragsskript — SephoBay Recommender

*Wort-für-Wort-Skript zum lauten Vorlesen während der Präsentation am 16.07. Zielzeit: **8:30–9:00
Minuten** für 8 Folien, damit noch Puffer für Fragen bleibt. Zeiten pro Folie stehen jeweils in
Klammern. `[...]` markiert Regieanweisungen (Pause, Zeigen, Betonen) — nicht mitlesen.*

*Für die inhaltliche Tiefe hinter jeder Aussage (Formeln, Quellen aus der Vorlesung) siehe
[PRAESENTATION_SKRIPT.md](PRAESENTATION_SKRIPT.md) — das hier ist bewusst schlank und
sprechfertig, nicht erklärend.*

---

## Folie 1 — Titel (0:20)

> Guten Tag zusammen. Wir sind Gruppe SephoBay, und wir stellen Ihnen heute unser Recommender
> System für den Drogerie-Onlinehändler SephoBay vor.
>
> [Pause, auf die Zahl zeigen] Vorab die eine Zahl, um die sich die nächsten neun Minuten drehen
> werden: **0,275 mittlerer absoluter Fehler** auf dem Testdatensatz. Wie wir dahin gekommen sind,
> zeigen wir Ihnen jetzt.

---

## Folie 2 — Ausgangssituation & Ziel (1:00)

> SephoBay hat ein Problem, das jeder Online-Shop mit großem Sortiment kennt: Kund:innen finden
> in der Masse an Produkten kaum noch das, was zu ihnen passt. Die Folge ist sinkende Zufriedenheit
> und Kundenbindung.
>
> Bisher werden im Wesentlichen nur Bestseller angezeigt — keine wirklich persönlichen
> Empfehlungen. Unser Auftrag war deshalb: ein Recommender System zu entwickeln, das vorhersagt,
> wie eine Nutzerin oder ein Nutzer ein bestimmtes Produkt bewerten würde.
>
> [Auf "ZIEL" zeigen] Das Ziel ist konkret messbar: die bestmögliche Empfehlungsgüte, gemessen am
> mittleren absoluten Fehler in Sternen — und zwar **nachdem** unsere Vorhersage auf ganze Sterne
> gerundet wurde.

---

## Folie 3 — Die Daten (1:10)

> Schauen wir kurz auf die Datenbasis: 798 Nutzer:innen, 622 Produkte, knapp 25.000 Bewertungen
> auf einer Skala von 0 bis 5 Sternen.
>
> [Auf die Verteilungsgrafik zeigen] Und hier kommt die Erkenntnis, die unseren gesamten Ansatz
> bestimmt hat: **75 Prozent aller Bewertungen sind 5 Sterne.** Das bedeutet: Wer einfach immer
> "5 Sterne" tippt, liegt im Schnitt nur 0,37 Sterne daneben — das ist unsere triviale Baseline.
>
> Die Konsequenz daraus ist entscheidend: Das eigentliche Problem ist **keine** klassische
> Regressionsaufgabe mit vielen Abstufungen. Es ist im Kern eine einzige, immer wiederkehrende
> Entscheidung: **"5 Sterne — oder nicht?"** Jede Design-Entscheidung, die Sie gleich sehen,
> folgt aus genau dieser Einsicht.

---

## Folie 4 — Unser Ansatz (1:30)

> Unser Modell besteht aus vier Bausteinen, die aufeinander aufbauen — am Ende steckt alles in
> einer einzigen Funktion, die für jedes Nutzer-Produkt-Paar eine Vorhersage liefert.
>
> Erstens, das **Backbone**: ein regularisiertes Bias-Modell. Es kombiniert den globalen
> Durchschnitt mit der individuellen Tendenz jedes Nutzers und jedes Produkts — wer generell
> streng bewertet, bekommt einen Abschlag; ein beliebtes Produkt einen Aufschlag. "Regularisiert"
> heißt: Bei wenigen Bewertungen wird dieser Effekt gedämpft, damit eine einzelne Ausreißer-Bewertung
> nicht das ganze Modell verzerrt.
>
> Zweitens, die **Content-Korrektur**: Wir schauen uns ähnliche Produkte an — nach Kategorie,
> Marke, Preis, Inhaltsstoffen und sogar dem Produktnamen selbst — und passen die Vorhersage
> personalisiert an.
>
> Drittens, die **Sterne-Verteilung**: Ein Modell lernt aus all diesen Signalen nicht nur einen
> einzelnen Schätzwert, sondern die volle Wahrscheinlichkeitsverteilung — wie wahrscheinlich sind
> 1, 2, 3, 4 oder 5 Sterne für genau dieses Kunde-Produkt-Paar?
>
> Und viertens, die **Entscheidung**: Aus dieser Verteilung wählen wir pro Paar den ganzen Stern
> mit dem kleinsten erwarteten Fehler — dazu gleich mehr, das ist tatsächlich unser größter
> einzelner Hebel.

---

## Folie 5 — Zwei kreative Ideen (1:30)

> Zwei Stellen im Modell sind uns besonders wichtig, weil sie genau die kreativen Lücken der
> Aufgabenstellung schließen.
>
> [Punkt 1] Content-Based Filtering liefert klassischerweise **keine** Sternebewertung, sondern
> nur eine Ähnlichkeit. Unsere Lösung: Wir nutzen die Produktähnlichkeit als **Gewicht** in einem
> gewichteten Mittel über die eigenen bisherigen Bewertungen der Nutzerin oder des Nutzers. Damit
> wird aus reiner Ähnlichkeit eine konkrete, MAE-fähige Sternenprognose — genau die kreative Idee,
> die im Briefing gefordert war.
>
> [Punkt 2] Und weil, wie gesagt, 75 Prozent aller Bewertungen 5 Sterne sind, ist starres Runden
> bei 4,5 schlicht falsch — die Kosten in dieser Metrik sind asymmetrisch. Unser erster Schritt
> war deshalb ein optimierter Schwellenwert: zur 5 runden schon ab 4,3. Dann haben wir die Idee
> konsequent zu Ende gedacht: Statt **eines** festen Schwellenwerts für alle sagen wir die volle
> Sterne-Verteilung vorher und wählen für **jedes** Kunde-Produkt-Paar einzeln den Stern mit dem
> kleinsten erwarteten Fehler. Eine strenge Kundin bei einem schwachen Produkt bekommt so eine
> andere Entscheidungsgrenze als ein treuer Fünf-Sterne-Fan. [Pause] Dieser Schritt ist unser
> größter Hebel: Er bringt den Test-MAE von 0,305 auf 0,275.

---

## Folie 6 — Ergebnisse (0:50)

> Damit zu den Ergebnissen auf dem Testdatensatz. [Auf die große Zahl zeigen] **0,275 Test-MAE.**
>
> Zur Einordnung: Wer immer 5 Sterne tippt, liegt bei 0,37. Beschränken wir uns auf die reinen,
> im Kurs vorgestellten Methoden, kommen wir auf 0,31. [Auf die Treppe zeigen] Die Treppe zeigt
> jeden Schritt: das Bias-Backbone bringt den größten Sprung, Content und Blend verfeinern, der
> optimierte Schwellenwert bringt 0,29 — und die optimale Entscheidung pro Paar 0,275.
>
> Wichtig ist uns: Dieser Vorsprung ist kein Zufallstreffer. Wir haben ihn mit einem
> Bootstrap-Konfidenzintervall und mit Holdout-Simulationen abgesichert, die den Testdatensatz
> gar nicht berühren — er sollte also auch auf Ihrem geheimen Evaluationsdatensatz halten.

---

## Folie 7 — Gründlichkeit (1:15)

> An dieser Stelle könnte man fragen: Geht da nicht noch mehr? Das haben wir systematisch
> geprüft. [Auf die Tabelle zeigen] Wir haben neun verschiedene Modellfamilien getestet — Matrix-
> Faktorisierung, Gradient Boosting, neuronale Netze, Clustering, einen zweistufigen Klassifikator
> und mehr. Als klassische "Regression plus Rundung" scheitern **alle** — sie landen zwischen
> 0,30 und 0,35.
>
> Der Durchbruch kam nicht durch ein noch komplexeres Modell, sondern durch eine bessere
> **Entscheidung**: Rund 60 Prozent des verbleibenden Fehlers stammt aus genau einer Grenze —
> 4 gegen 5 Sterne. Diese Unterscheidung ist nach unserer Analyse nur zu etwa 85 Prozent aus den
> Daten lernbar. Unser finales Modell erreicht genau dort 85,0 Prozent — vorher waren es 82,8.
> Der Rest ist irreduzibles Rauschen, das schlicht nicht in den Daten steckt.
>
> Eine Einordnung noch, ohne Anspruch auf das letzte Wort — wir haben unsere eigene Schätzung
> des Machbaren ja selbst einmal nach unten korrigiert: Der Test-MAE auf gut 3.000 Zeilen hat
> ein Zufallsrauschen von etwa plus/minus 0,02. Werte um 0,25 können also auch mit
> Stichprobenglück zustande kommen. Erst deutlich darunter würden wir die Messung methodisch
> hinterfragen — etwa fehlende Rundung oder ein Datenleck.

---

## Folie 8 — Fazit & Empfehlung (0:45)

> Zusammengefasst: Ein regularisiertes Bias-Modell liefert die robuste Basis. Die zusätzlichen
> Gewinne kommen aus einem weichen Content-Signal und aus der MAE-optimalen Sterne-Entscheidung
> pro Kunde-Produkt-Paar — nicht aus immer komplexeren Modellen, das haben wir nachweislich
> ausgeschlossen.
>
> Mit einem Test-MAE von 0,275 schlagen wir alle Baselines und die reinen Kurs-Methoden, und der
> Vorsprung ist statistisch abgesichert — per Bootstrap und Holdout-Simulationen. Wir sind
> nachweislich nahe am Optimum, das in diesen Daten überhaupt erreichbar ist. Unsere Empfehlung
> an den Vorstand: das System produktiv einsetzen, damit Ihre Kund:innen wieder finden, was zu
> ihnen passt — für mehr Zufriedenheit und Kundenbindung.
>
> [Lächeln, Blick ins Publikum] Vielen Dank für Ihre Aufmerksamkeit — wir freuen uns auf Ihre
> Fragen.

---

## Timing-Check

| Folie | Zeit | Kumuliert |
|---|---|---|
| 1 Titel | 0:20 | 0:20 |
| 2 Ausgangssituation & Ziel | 1:00 | 1:20 |
| 3 Die Daten | 1:10 | 2:30 |
| 4 Unser Ansatz | 1:30 | 4:00 |
| 5 Zwei kreative Ideen | 1:30 | 5:30 |
| 6 Ergebnisse | 0:50 | 6:20 |
| 7 Gründlichkeit | 1:15 | 7:35 |
| 8 Fazit & Empfehlung | 0:45 | 8:20 |

**Ziel: 8:20 Minuten Sprechzeit** — lässt bei einem 8–10-Minuten-Fenster noch Luft für natürliches
Sprechtempo und kurze Pausen an den Grafiken.

## Vortrags-Tipps

- **Nicht ablesen wie einen Aufsatz** — die Sätze sind bewusst kurz und sprechbar gehalten; wer
  eine Formulierung unnatürlich findet, sollte sie in eigene Worte fassen. Der Inhalt zählt, nicht
  der genaue Wortlaut.
- **Nach der 75%-Zahl (Folie 3) und der 0,275 (Folie 6) kurz pausieren** — das sind die zwei Zahlen,
  die im Kopf bleiben sollen.
- **Bei Folie 7 Tempo rausnehmen** — das ist der Beweis für Gründlichkeit, der überzeugt den
  Vorstand am meisten; nicht durchhetzen.
- **Blickkontakt bei Folie 8** — der letzte Satz ist die Kernbotschaft, nicht von der Folie ablesen.
- Für Rückfragen aus dem Publikum (z. B. "Warum kein neuronales Netz?", "Was ist Regularisierung
  genau?") liefert [PRAESENTATION_SKRIPT.md](PRAESENTATION_SKRIPT.md) die ausführliche Erklärung
  mit Formeln und Vorlesungsbezug.
