// Builder für SephoBay_Praesentation_Technik.pptx — technisch fokussierte Variante:
// wie das System funktioniert (4 Stufen), Absicherung nur kurz auf der Ergebnis-Folie.
const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
p.author = "Gruppe SephoBay";
p.title = "SephoBay Recommender — Technik";

const W = 13.33, H = 7.5;
const NAVY = "1E2761", NAVY2 = "2A3575", NAVY3 = "141B45";
const ICE = "CADCFC", PALE = "EEF3FC", STEEL = "6B7A99";
const INK = "1B1F2E", GOLD = "C9A227", WHITE = "FFFFFF";
const HEAD = "Arial", BODY = "Calibri", MONO = "Courier New";
const sh = () => ({ type: "outer", color: "0A0E22", blur: 8, offset: 3, angle: 90, opacity: 0.18 });

function pageNum(s, n) {
  s.addText(`${n}`, { x: W - 0.9, y: H - 0.55, w: 0.5, h: 0.35, fontFace: BODY, fontSize: 11, color: STEEL, align: "right" });
  s.addText("SephoBay Recommender — Technik", { x: 0.5, y: H - 0.55, w: 5, h: 0.35, fontFace: BODY, fontSize: 10, color: STEEL });
}
function header(s, kicker, title) {
  s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.42, w: 11, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: GOLD, charSpacing: 3 });
  s.addText(title, { x: 0.6, y: 0.70, w: 12.1, h: 0.8, fontFace: HEAD, fontSize: 28, bold: true, color: NAVY });
}
// dunkler Formel-/Codeblock — das visuelle Leitmotiv des Decks
function formulaBlock(s, x, y, w, h, lines, fs = 15) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.09, fill: { color: NAVY3 }, shadow: sh() });
  const rich = lines.map((t, i) => ({ text: t, options: { breakLine: i < lines.length - 1 } }));
  s.addText(rich, { x: x + 0.3, y, w: w - 0.6, h, fontFace: MONO, fontSize: fs, color: ICE, valign: "middle", lineSpacingMultiple: 1.25 });
}
function stagePill(s, label, x, y, w = 1.35) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.38, rectRadius: 0.19, fill: { color: NAVY } });
  s.addText(label, { x, y, w, h: 0.38, fontFace: HEAD, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
}

// =================================================================== FOLIE 1 — Titel
let s = p.addSlide();
s.background = { color: NAVY };
s.addShape(p.shapes.RECTANGLE, { x: 0, y: H - 1.9, w: W, h: 1.9, fill: { color: NAVY3 } });
s.addText("P(1) P(2) P(3) P(4) P(5)  →  stars = argmin_k Σ P(j)·|k−j|",
  { x: 0.9, y: H - 1.32, w: 8.2, h: 0.4, fontFace: MONO, fontSize: 14, color: "5D6BA8" });
s.addText("Gruppe SephoBay  ·  16.07.2026", { x: 9.2, y: H - 1.32, w: 3.2, h: 0.4,
  fontFace: BODY, fontSize: 13, color: ICE, align: "right" });
s.addText("BIG DATA ANALYTICS · GRUPPENPROJEKT · UNIVERSITÄT ULM", { x: 0.9, y: 1.0,
  w: 11, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: ICE, charSpacing: 2 });
s.addText("SephoBay Recommender:\nunter der Haube", { x: 0.85, y: 1.6, w: 11.5, h: 2.0,
  fontFace: HEAD, fontSize: 44, bold: true, color: WHITE, lineSpacingMultiple: 1.0 });
s.addText("Von 24.892 Bewertungen zur MAE-optimalen Sterne-Entscheidung — in vier Stufen.",
  { x: 0.9, y: 3.75, w: 10.5, h: 0.5, fontFace: BODY, fontSize: 17, italic: true, color: ICE });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 4.45, w: 3.3, h: 1.5, rectRadius: 0.12, fill: { color: WHITE }, shadow: sh() });
s.addText("0,275", { x: 0.9, y: 4.55, w: 3.3, h: 0.85, fontFace: HEAD, fontSize: 42, bold: true, color: NAVY, align: "center" });
s.addText("Test-MAE (gerundete Sterne)", { x: 0.9, y: 5.42, w: 3.3, h: 0.4, fontFace: BODY, fontSize: 12, color: STEEL, align: "center" });
s.addNotes("Begrüßung. Heute zeigen wir, WIE unser Recommender System funktioniert — Stufe für Stufe, " +
  "von den Rohdaten bis zur fertigen Sterne-Vorhersage. Das Ergebnis vorab: 0,275 mittlerer absoluter " +
  "Fehler auf dem Testdatensatz. Der Weg dorthin besteht aus vier Stufen, die wir jetzt einzeln öffnen.");

// =================================================================== FOLIE 2 — Aufgabe & Daten
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Aufgabe & Daten", "Gerundete Sterne, schiefe Verteilung");
// links: Metrik + Datenchips
formulaBlock(s, 0.6, 1.75, 6.0, 1.05, ["MAE = 1/N · Σ |r − round(pred)|"], 15);
s.addText([
  { text: "Wir liefern ganze Sterne (0–5). ", options: { bold: true } },
  { text: "Gerundet wird vor der Fehlerrechnung — die Rundung gehört also uns. Das wird Stufe 4.", options: {} },
], { x: 0.65, y: 2.95, w: 5.9, h: 0.75, fontFace: BODY, fontSize: 14, color: INK });
const chips = [["798", "Nutzer:innen"], ["622", "Produkte"], ["24.892", "Bewertungen"], ["5,0 %", "Matrix-Dichte"]];
chips.forEach((c, i) => {
  const x = 0.6 + (i % 2) * 3.05, y = 3.9 + Math.floor(i / 2) * 1.3;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.85, h: 1.1, rectRadius: 0.1, fill: { color: PALE } });
  s.addText(c[0], { x, y: y + 0.1, w: 2.85, h: 0.6, fontFace: HEAD, fontSize: 24, bold: true, color: NAVY, align: "center" });
  s.addText(c[1], { x, y: y + 0.7, w: 2.85, h: 0.32, fontFace: BODY, fontSize: 12, color: STEEL, align: "center" });
});
// rechts: die 75%-Einsicht
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 7.1, y: 1.75, w: 5.6, h: 4.7, rectRadius: 0.12, fill: { color: NAVY }, shadow: sh() });
s.addText("75 %", { x: 7.45, y: 1.95, w: 4.9, h: 0.9, fontFace: HEAD, fontSize: 50, bold: true, color: WHITE });
s.addText("aller Bewertungen sind 5 Sterne.", { x: 7.45, y: 2.9, w: 4.9, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: ICE });
s.addChart(p.charts.BAR, [{ name: "Anteil", labels: ["1", "2", "3", "4", "5"], values: [1.8, 2.1, 4.5, 16.6, 74.9] }], {
  x: 7.4, y: 3.4, w: 5.0, h: 1.7, barDir: "col", chartColors: ["8FA6D9", "8FA6D9", "8FA6D9", "8FA6D9", "C9A227"],
  showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "FFFFFF", dataLabelFontSize: 9, dataLabelFormatCode: '0.0"%"',
  catAxisLabelColor: ICE, valAxisHidden: true, valGridLine: { style: "none" }, showLegend: false,
  chartArea: { fill: { color: NAVY } }, plotArea: { fill: { color: NAVY } }, barGapWidthPct: 40,
});
s.addText([
  { text: "Folge: ", options: { bold: true, color: GOLD } },
  { text: "kein Regressions-, sondern ein Entscheidungsproblem — „5 oder nicht 5?“  Immer-5-Baseline: MAE 0,37.", options: {} },
], { x: 7.45, y: 5.25, w: 4.9, h: 1.0, fontFace: BODY, fontSize: 13.5, color: ICE });
pageNum(s, 2);
s.addNotes("Kurz die Aufgabe: Für jedes Nutzer-Produkt-Paar sagen wir ganze Sterne vorher; bewertet wird der " +
  "mittlere absolute Fehler NACH Rundung. 798 Nutzer, 622 Produkte, knapp 25.000 Bewertungen — nur 5 % der " +
  "Matrix ist gefüllt. Und die zentrale Eigenschaft der Daten: 75 % aller Bewertungen sind 5 Sterne. Immer-5 " +
  "liegt schon bei 0,37. Das macht die Aufgabe zum Entscheidungsproblem: Wann weichen wir von der 5 ab?");

// =================================================================== FOLIE 3 — Architektur
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Architektur", "Vier Stufen von den Rohdaten zum Stern");
// Eingaben links
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.6, w: 1.75, h: 0.75, rectRadius: 0.08, fill: { color: PALE } });
s.addText("Ratings.csv", { x: 0.6, y: 2.6, w: 1.75, h: 0.75, fontFace: MONO, fontSize: 11, color: INK, align: "center", valign: "middle", margin: 0 });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 3.55, w: 1.75, h: 0.75, rectRadius: 0.08, fill: { color: PALE } });
s.addText("Itemprofile.csv", { x: 0.6, y: 3.55, w: 1.75, h: 0.75, fontFace: MONO, fontSize: 11, color: INK, align: "center", valign: "middle", margin: 0 });
// Stufen-Kacheln
const stages = [
  ["STUFE 1", "Bias-Backbone", "pred = μ + b_u + b_i", "Nutzer- & Produkt-Tendenz, regularisiert"],
  ["STUFE 2", "Residual-Korrekturen", "res = r − pred", "Item-CF + Content-Ähnlichkeit korrigieren personalisiert"],
  ["STUFE 3", "Verteilungsmodell", "P(1) … P(5)", "Gradient Boosting auf 13 Out-of-fold-Merkmalen"],
  ["STUFE 4", "Entscheidung", "argmin_k Σ P(j)·|k−j|", "Stern mit kleinstem erwarteten Fehler — pro Paar"],
];
const sw = 2.42, sx0 = 2.75, sy = 2.15, sgap = 0.16;
stages.forEach((st, i) => {
  const x = sx0 + i * (sw + sgap);
  const last = i === 3;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: sy, w: sw, h: 2.85, rectRadius: 0.1, fill: { color: last ? NAVY : PALE }, shadow: sh() });
  s.addText(st[0], { x: x + 0.2, y: sy + 0.18, w: sw - 0.4, h: 0.3, fontFace: BODY, fontSize: 10.5, bold: true, color: last ? GOLD : STEEL, charSpacing: 2 });
  s.addText(st[1], { x: x + 0.2, y: sy + 0.48, w: sw - 0.4, h: 0.65, fontFace: HEAD, fontSize: 14.5, bold: true, color: last ? WHITE : NAVY });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 0.2, y: sy + 1.15, w: sw - 0.4, h: 0.5, rectRadius: 0.06, fill: { color: last ? NAVY3 : "DDE7F8" } });
  s.addText(st[2], { x: x + 0.2, y: sy + 1.15, w: sw - 0.4, h: 0.5, fontFace: MONO, fontSize: 10, color: last ? ICE : NAVY, align: "center", valign: "middle", margin: 0 });
  s.addText(st[3], { x: x + 0.2, y: sy + 1.78, w: sw - 0.4, h: 0.95, fontFace: BODY, fontSize: 11.5, color: last ? ICE : INK });
  if (i < 3) s.addText("→", { x: x + sw - 0.03, y: sy + 1.15, w: 0.24, h: 0.55, fontFace: HEAD, fontSize: 20, bold: true, color: GOLD, align: "center" });
});
s.addText("→", { x: 2.38, y: 2.85, w: 0.35, h: 0.5, fontFace: HEAD, fontSize: 20, bold: true, color: GOLD, align: "center" });
// Ausgabe
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 4.4, y: 5.45, w: 4.5, h: 0.65, rectRadius: 0.32, fill: { color: GOLD } });
s.addText("Ausgabe: ganzzahlige Sterne 0–5, eine Zeile pro Testpaar", { x: 4.4, y: 5.45, w: 4.5, h: 0.65, fontFace: BODY, fontSize: 12.5, bold: true, color: NAVY3, align: "center", valign: "middle", margin: 0 });
s.addText("Stufen 1–2 erzeugen die Signale, Stufe 3 bündelt sie zur Wahrscheinlichkeitsverteilung, Stufe 4 macht daraus die metrik-optimale Wahl.",
  { x: 0.6, y: 6.35, w: 12.1, h: 0.45, fontFace: BODY, fontSize: 13, italic: true, color: STEEL });
pageNum(s, 3);
s.addNotes("Die Architektur auf einen Blick. Zwei Eingaben: die Bewertungen und die Produktprofile. " +
  "Stufe 1 ist ein Bias-Modell als Rückgrat. Stufe 2 korrigiert dessen Residuen mit Collaborative Filtering " +
  "und Content-Ähnlichkeit. Stufe 3 bündelt alle Signale in einem Modell, das die volle Sterne-Verteilung " +
  "lernt. Und Stufe 4 wählt daraus pro Paar den Stern mit dem kleinsten erwarteten Fehler. Jede Stufe " +
  "schauen wir uns jetzt kurz an.");

// =================================================================== FOLIE 4 — Stufe 1
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Stufe 1 · Bias-Backbone", "Wer bewertet wie — was wird wie bewertet");
stagePill(s, "STUFE 1 / 4", 11.35, 0.48);
formulaBlock(s, 0.6, 1.85, 6.1, 2.5, [
  "pred(u,i) = μ + b_u + b_i",
  "",
  "b_u = Σ (r_ui − μ)        / (n_u + λ)",
  "b_i = Σ (r_ui − μ − b_u)  / (n_i + λ)",
], 14);
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 4.6, w: 6.1, h: 1.05, rectRadius: 0.1, fill: { color: PALE } });
s.addText([
  { text: "Allein schon stark:  ", options: { bold: true } },
  { text: "Test-MAE 0,325", options: { bold: true, color: NAVY } },
  { text: "  (Baseline „immer 5“: 0,371)", options: { color: STEEL } },
], { x: 0.85, y: 4.6, w: 5.7, h: 1.05, fontFace: BODY, fontSize: 14.5, color: INK, valign: "middle" });
const expl = [
  ["μ = 4,61", "Globaler Durchschnitt — der Startpunkt jeder Vorhersage."],
  ["b_u — Nutzer-Tendenz", "Wer streng bewertet, bekommt einen Abschlag; großzügige Rater einen Aufschlag."],
  ["b_i — Produkt-Tendenz", "Beliebte Produkte liegen über dem Schnitt, schwache darunter."],
  ["λ = 20 — Regularisierung", "Wenige Bewertungen → Tendenz wird Richtung 0 gedämpft. Unbekannt → 0: automatischer Kaltstart-Fallback auf μ."],
];
let ey = 1.85;
expl.forEach((e) => {
  s.addText(e[0], { x: 7.1, y: ey, w: 5.6, h: 0.32, fontFace: MONO, fontSize: 13, bold: true, color: NAVY });
  s.addText(e[1], { x: 7.1, y: ey + 0.32, w: 5.6, h: 0.62, fontFace: BODY, fontSize: 12.5, color: INK });
  ey += 1.0;
});
pageNum(s, 4);
s.addNotes("Stufe 1, das Rückgrat: globaler Durchschnitt 4,61 plus zwei gelernte Tendenzen — wie streng " +
  "bewertet dieser Nutzer, wie gut kommt dieses Produkt an. Der Nenner n+λ ist die Regularisierung: bei " +
  "wenigen Bewertungen wird die Tendenz Richtung 0 gedämpft, eine einzelne Ausreißer-Bewertung kippt " +
  "nichts. Unbekannte Nutzer oder Produkte fallen automatisch auf den Durchschnitt zurück — das löst den " +
  "Kaltstart. Dieses einfache Modell allein schafft schon 0,325.");

// =================================================================== FOLIE 5 — Stufe 2
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Stufe 2 · Residual-Korrekturen", "CF und Content korrigieren, was das Backbone übrig lässt");
stagePill(s, "STUFE 2 / 4", 11.35, 0.48);
formulaBlock(s, 0.6, 1.8, 12.1, 0.75, ["res(u,i) = r(u,i) − pred(u,i)     →  Korrekturen lernen nur den Rest, nicht die Sterne selbst"], 13);
const cards = [
  ["Item-CF auf Residuen",
   "Cosine-Ähnlichkeit zweier Produkte über gemeinsam bewertende Nutzer:innen (Überlappung ≥ 3, nur positive Ähnlichkeiten). Korrektur = gewichtetes Mittel der Residuen des Nutzers auf den k = 10 ähnlichsten Produkten."],
  ["Content-Ähnlichkeit als Sterne-Korrektur",
   "Produktprofil aus Kategorie, Marke, log-Preis, 634 Inhaltsstoff-Flags + TF-IDF des Produktnamens (Mix 0,7 / 0,3). Für (u,i): die k = 5 content-ähnlichsten Produkte, die u schon bewertet hat — deren Residuen, ähnlichkeitsgewichtet, ergeben die Korrektur."],
];
cards.forEach((c, i) => {
  const x = 0.6 + i * 6.25;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.8, w: 5.9, h: 2.6, rectRadius: 0.12, fill: { color: PALE }, shadow: sh() });
  s.addText(c[0], { x: x + 0.3, y: 3.0, w: 5.3, h: 0.4, fontFace: HEAD, fontSize: 15.5, bold: true, color: NAVY });
  s.addText(c[1], { x: x + 0.3, y: 3.45, w: 5.3, h: 1.85, fontFace: BODY, fontSize: 12.5, color: INK });
});
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 5.65, w: 8.6, h: 0.85, rectRadius: 0.1, fill: { color: NAVY } });
s.addText([
  { text: "Kreativ-Baustein aus dem Briefing:  ", options: { bold: true, color: GOLD } },
  { text: "Ähnlichkeit wird zum Gewicht — so kann Content-Filtering Sterne vorhersagen.", options: { color: WHITE } },
], { x: 0.9, y: 5.65, w: 8.1, h: 0.85, fontFace: BODY, fontSize: 13.5, valign: "middle" });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 9.45, y: 5.65, w: 3.25, h: 0.85, rectRadius: 0.1, fill: { color: PALE } });
s.addText([
  { text: "Beitrag: ", options: { bold: true } },
  { text: "0,325 → 0,305", options: { bold: true, color: NAVY } },
], { x: 9.6, y: 5.65, w: 3.0, h: 0.85, fontFace: BODY, fontSize: 13.5, color: INK, valign: "middle" });
pageNum(s, 5);
s.addNotes("Stufe 2 arbeitet auf den Residuen — also nur auf dem, was das Backbone noch nicht erklärt. " +
  "Links das klassische Item-CF: Ähnlichkeit über gemeinsame Bewertungen, mit Mindest-Überlappung 3. " +
  "Rechts der Kreativ-Baustein: Content-Filtering liefert eigentlich keine Sterne — wir machen die " +
  "Produktähnlichkeit zum GEWICHT über die eigenen früheren Residuen des Nutzers. Ins Profil fließen " +
  "Kategorie, Marke, Preis, 634 Inhaltsstoffe und der TF-IDF-Vektor des Produktnamens. Zusammen bringt " +
  "das den MAE von 0,325 auf 0,305 — vor allem dort, wo CF wegen der dünnen Matrix keine Nachbarn findet.");

// =================================================================== FOLIE 6 — Stufe 3
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Stufe 3 · Verteilungsmodell", "Ein Modell lernt die volle Sterne-Verteilung");
stagePill(s, "STUFE 3 / 4", 11.35, 0.48);
// links: Merkmale -> GBM -> P(1..5)
s.addText("13 Merkmale je (Nutzer, Produkt)", { x: 0.6, y: 1.8, w: 6, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY });
const feats = [
  ["Signale der Stufen 1–2", "Backbone-Score · Item-CF- · User-CF- · Content-Korrektur"],
  ["Nutzer-Statistiken", "Ø, Streuung, Anzahl, Anteil 5er, Anteil ≤ 3er"],
  ["Produkt-Statistiken", "Ø, Anzahl, Anteil 5er, Anteil ≤ 3er"],
];
let fy2 = 2.25;
feats.forEach((f) => {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: fy2, w: 5.9, h: 0.78, rectRadius: 0.08, fill: { color: PALE } });
  s.addText(f[0], { x: 0.85, y: fy2 + 0.08, w: 5.4, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: NAVY });
  s.addText(f[1], { x: 0.85, y: fy2 + 0.38, w: 5.4, h: 0.32, fontFace: BODY, fontSize: 11.5, color: INK });
  fy2 += 0.93;
});
formulaBlock(s, 0.6, 5.15, 5.9, 1.15, [
  "GradientBoosting (5 Seeds, gemittelt)",
  "→ P(1), P(2), P(3), P(4), P(5)",
], 13);
// rechts: Out-of-fold
s.addText("Ehrliche Trainingsdaten: Out-of-fold", { x: 7.0, y: 1.8, w: 5.8, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY });
for (let i = 0; i < 5; i++) {
  const fx = 7.0 + i * 1.18;
  const hot = i === 2;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: fx, y: 2.35, w: 1.02, h: 0.85, rectRadius: 0.08, fill: { color: hot ? GOLD : NAVY } });
  s.addText(`Fold ${i + 1}`, { x: fx, y: 2.35, w: 1.02, h: 0.85, fontFace: BODY, fontSize: 11, bold: true, color: hot ? NAVY3 : WHITE, align: "center", valign: "middle", margin: 0 });
}
s.addText([
  { text: "Die Merkmale für Fold 3 berechnen Modelle, die ohne Fold 3 trainiert wurden ", options: {} },
  { text: "— kein Rating sieht sein eigenes Modell (kein Leakage).", options: { bold: true } },
], { x: 7.0, y: 3.45, w: 5.7, h: 0.95, fontFace: BODY, fontSize: 13, color: INK });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 7.0, y: 4.55, w: 5.7, h: 1.75, rectRadius: 0.12, fill: { color: NAVY }, shadow: sh() });
s.addText("24.892", { x: 7.3, y: 4.75, w: 5.1, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: WHITE });
s.addText("ehrliche Trainingszeilen für das Verteilungsmodell — statt eines einzelnen 3.700-Zeilen-Validierungssplits.",
  { x: 7.3, y: 5.45, w: 5.1, h: 0.75, fontFace: BODY, fontSize: 12.5, color: ICE });
pageNum(s, 6);
s.addNotes("Stufe 3 bündelt alles: 13 Merkmale pro Paar — die vier Signale aus den Stufen 1 und 2 plus " +
  "einfache Nutzer- und Produkt-Statistiken wie der Anteil an 5ern. Darauf trainieren wir einen " +
  "Gradient-Boosting-Klassifikator, der nicht einen Schätzwert, sondern die volle Verteilung über 1 bis 5 " +
  "Sterne ausgibt; fünf Seeds werden gemittelt. Entscheidend ist das Out-of-fold-Prinzip: Die Merkmale " +
  "jedes Ratings stammen aus Modellen, die dieses Rating nie gesehen haben. So können wir auf allen " +
  "24.892 Zeilen ehrlich trainieren — achtmal mehr als ein einzelner Validierungssplit.");

// =================================================================== FOLIE 7 — Stufe 4
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Stufe 4 · Entscheidung", "Erwarteter Fehler statt Rundung");
stagePill(s, "STUFE 4 / 4", 11.35, 0.48);
formulaBlock(s, 0.6, 1.8, 12.1, 0.85, ["stars(u,i) = argmin_k  Σ_j P(j) · |k − j|        (= Median der Verteilung — MAE-optimal)"], 14);
// zwei Beispielpaare mit Mini-Balken
const ex = [
  ["Treuer Fan × Lieblingsmarke", [1, 1, 3, 20, 75], 5],
  ["Strenge Kundin × schwaches Produkt", [5, 10, 20, 40, 25], 4],
];
ex.forEach((e, i) => {
  const x = 0.6 + i * 6.25;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.95, w: 5.9, h: 2.85, rectRadius: 0.12, fill: { color: PALE }, shadow: sh() });
  s.addText(e[0], { x: x + 0.3, y: 3.05, w: 3.4, h: 0.65, fontFace: HEAD, fontSize: 13, bold: true, color: NAVY, valign: "middle" });
  // Mini-Balken P(1..5)
  const base = 5.15, maxH = 1.35, bw2 = 0.62, gap2 = 0.28;
  e[1].forEach((v, j) => {
    const bx = x + 0.45 + j * (bw2 + gap2);
    const bh = Math.max(0.05, (v / 100) * maxH / 0.75);
    const win = (j + 1) === e[2];
    s.addShape(p.shapes.RECTANGLE, { x: bx, y: base - bh, w: bw2, h: bh, fill: { color: win ? GOLD : "8FA6D9" } });
    s.addText(`${v}%`, { x: bx - 0.12, y: base - bh - 0.3, w: bw2 + 0.24, h: 0.26, fontFace: BODY, fontSize: 9.5, color: STEEL, align: "center", margin: 0 });
    s.addText(`${j + 1}`, { x: bx, y: base + 0.04, w: bw2, h: 0.28, fontFace: BODY, fontSize: 10.5, bold: win, color: win ? NAVY : STEEL, align: "center", margin: 0 });
  });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 3.75, y: 3.05, w: 1.85, h: 0.5, rectRadius: 0.25, fill: { color: NAVY } });
  s.addText(`Entscheidung: ${e[2]}`, { x: x + 3.75, y: 3.05, w: 1.85, h: 0.5, fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
});
s.addText("Starre Rundung (Schwelle 4,5) und eine global getunte Schwelle (4,3) sind Spezialfälle — hier bekommt jedes Paar seine eigene Entscheidungsgrenze.",
  { x: 0.6, y: 6.05, w: 12.1, h: 0.45, fontFace: BODY, fontSize: 13, italic: true, color: STEEL });
pageNum(s, 7);
s.addNotes("Stufe 4 ist der größte Hebel. Statt zu runden, rechnen wir für jeden Kandidaten-Stern den " +
  "erwarteten Fehler unter der Verteilung aus und nehmen das Minimum — das ist mathematisch der Median " +
  "der Verteilung und für den MAE optimal. Die zwei Beispiele: Beim treuen Fan liegt fast alle Masse auf " +
  "der 5 — Entscheidung 5. Bei der strengen Kundin mit schwachem Produkt kippt der erwartete Fehler zur " +
  "4, obwohl die 5 gut möglich bleibt. Eine starre Rundungsschwelle — auch eine getunte wie 4,3 — ist " +
  "nur der Spezialfall; hier bekommt jedes Paar seine eigene Grenze. Beitrag: 0,305 auf 0,275.");

// =================================================================== FOLIE 8 — Ergebnis + kurze Absicherung
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Ergebnis", "0,275 Test-MAE — jede Stufe zahlt ein");
s.addChart(p.charts.BAR, [{
  name: "Test-MAE",
  labels: ["Immer 5", "Stufe 1: Backbone", "+ Stufe 2: Korrekturen", "globale Schwelle (v2)", "Stufen 3+4: Verteilung + Entscheidung"],
  values: [0.371, 0.325, 0.305, 0.2895, 0.275],
}], {
  x: 0.4, y: 1.95, w: 8.1, h: 4.4, barDir: "bar",
  chartColors: ["8FA6D9", "8FA6D9", "8FA6D9", "8FA6D9", "C9A227"],
  showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK,
  dataLabelFontSize: 12, dataLabelFontBold: true, dataLabelFormatCode: "0.000",
  catAxisLabelColor: INK, catAxisLabelFontSize: 12, valAxisHidden: true,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
  valAxisMaxVal: 0.4, valAxisMinVal: 0, barGapWidthPct: 50, chartArea: { fill: { color: "FFFFFF" } },
});
// kompakte Absicherungs-Box (die eine kurze Erwähnung)
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 8.8, y: 1.95, w: 3.95, h: 4.4, rectRadius: 0.12, fill: { color: PALE }, shadow: sh() });
s.addText("Kurz zur Absicherung", { x: 9.1, y: 2.15, w: 3.4, h: 0.4, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY });
s.addText([
  { text: "Bootstrap-95%-Intervall: Vorsprung auf v2 ist kein Zufall", options: { bullet: true, breakLine: true } },
  { text: "3 Holdout-Simulationen (Test unberührt): bestätigt", options: { bullet: true, breakLine: true } },
  { text: "9 alternative Modellfamilien (SVD, MLP, Clustering …): 0,30–0,35, keine besser", options: { bullet: true, breakLine: true } },
  { text: "Einordnung: Test-MAE streut um ± 0,02 (Stichprobe von ~3.000 Zeilen)", options: { bullet: true } },
], { x: 9.1, y: 2.65, w: 3.45, h: 3.5, fontFace: BODY, fontSize: 12, color: INK, lineSpacingMultiple: 1.15, paraSpaceAfter: 8 });
pageNum(s, 8);
s.addNotes("Das Ergebnis als Treppe: Immer-5 0,371, das Backbone 0,325, die Korrekturen 0,305, eine global " +
  "getunte Rundungsschwelle 0,29 — und die Verteilung mit optimaler Entscheidung 0,275. Zur Absicherung nur " +
  "kurz: Der Vorsprung hält einem Bootstrap-Konfidenzintervall und drei Holdout-Simulationen stand, die den " +
  "Testdatensatz gar nicht berühren; neun alternative Modellfamilien haben wir geprüft — keine war besser. " +
  "Und zur Einordnung: Auf 3.000 Testzeilen streut ein MAE um etwa ±0,02.");

// =================================================================== FOLIE 9 — Fazit
s = p.addSlide(); s.background = { color: NAVY };
s.addShape(p.shapes.RECTANGLE, { x: 0, y: H - 1.7, w: W, h: 1.7, fill: { color: NAVY3 } });
s.addText("pred = μ + b_u + b_i   →   res   →   P(1..5)   →   argmin erwarteter Fehler",
  { x: 0.9, y: H - 1.2, w: 11.5, h: 0.4, fontFace: MONO, fontSize: 13, color: "5D6BA8" });
s.addText("FAZIT", { x: 0.9, y: 0.85, w: 11, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: GOLD, charSpacing: 3 });
s.addText("Verteilung statt Punktschätzung", { x: 0.85, y: 1.25, w: 11.5, h: 0.8, fontFace: HEAD, fontSize: 32, bold: true, color: WHITE });
const fz = [
  "Ein regularisiertes Bias-Modell erklärt den Großteil — einfach, robust, kaltstart-fest.",
  "Content-Ähnlichkeit personalisiert auch dort, wo die dünne Matrix kein CF zulässt.",
  "Der größte Hebel ist die Entscheidungslogik: volle Sterne-Verteilung + kleinster erwarteter Fehler pro Paar.",
  "Empfehlung: produktiv einsetzen — relevantere Empfehlungen, mehr Zufriedenheit und Kundenbindung.",
];
let fy3 = 2.45;
fz.forEach((t) => {
  s.addShape(p.shapes.OVAL, { x: 0.95, y: fy3 + 0.08, w: 0.14, h: 0.14, fill: { color: GOLD } });
  s.addText(t, { x: 1.3, y: fy3 - 0.05, w: 8.3, h: 0.7, fontFace: BODY, fontSize: 15, color: ICE });
  fy3 += 0.8;
});
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 10.1, y: 2.55, w: 2.6, h: 2.3, rectRadius: 0.12, fill: { color: WHITE }, shadow: sh() });
s.addText("0,275", { x: 10.1, y: 2.85, w: 2.6, h: 0.9, fontFace: HEAD, fontSize: 40, bold: true, color: NAVY, align: "center" });
s.addText("finaler\nTest-MAE", { x: 10.1, y: 3.8, w: 2.6, h: 0.85, fontFace: BODY, fontSize: 13, color: STEEL, align: "center" });
s.addText("Vielen Dank — Fragen?", { x: 0.9, y: 5.75, w: 11, h: 0.5, fontFace: HEAD, fontSize: 18, bold: true, italic: true, color: WHITE });
s.addNotes("Fazit: Das Bias-Modell trägt den Großteil, Content-Ähnlichkeit personalisiert trotz dünner " +
  "Matrix, und der letzte Sprung kam nicht aus mehr Modellkomplexität, sondern aus der Entscheidungslogik — " +
  "Verteilung statt Punktschätzung, kleinster erwarteter Fehler statt Rundung. 0,275 Test-MAE. Unsere " +
  "Empfehlung an den Vorstand: einsetzen. Vielen Dank — wir freuen uns auf Fragen.");

p.writeFile({ fileName: "SephoBay_Praesentation_Technik.pptx" }).then(f => console.log("wrote", f));
