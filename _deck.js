const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";          // 13.33 x 7.5
p.author = "Gruppe SephoBay";
p.title = "SephoBay Recommender System";

const W = 13.33, H = 7.5;
const BERRY = "6D2E46", ROSE = "A26769", CREAM = "ECE2D0", TINT = "F6EFE9";
const INK = "2E2A2B", MUT = "8A7E80", WHITE = "FFFFFF";
const HEAD = "Cambria", BODY = "Calibri";
const sh = () => ({ type: "outer", color: "000000", blur: 7, offset: 3, angle: 90, opacity: 0.14 });

// ---- helpers ----
function pageNum(s, n) {
  s.addText(`${n}`, { x: W - 0.9, y: H - 0.55, w: 0.5, h: 0.35, fontFace: BODY,
    fontSize: 11, color: MUT, align: "right" });
  s.addText("SephoBay Recommender", { x: 0.5, y: H - 0.55, w: 5, h: 0.35,
    fontFace: BODY, fontSize: 10, color: MUT, align: "left" });
}
function header(s, kicker, title) {
  s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.45, w: 11, h: 0.3, fontFace: BODY,
    fontSize: 12, bold: true, color: ROSE, charSpacing: 3 });
  s.addText(title, { x: 0.6, y: 0.72, w: 12.1, h: 0.85, fontFace: HEAD,
    fontSize: 30, bold: true, color: BERRY });
}
function circleNum(s, n, x, y, d = 0.5, col = BERRY) {
  s.addShape(p.shapes.OVAL, { x, y, w: d, h: d, fill: { color: col } });
  s.addText(String(n), { x, y, w: d, h: d, fontFace: HEAD, fontSize: 18, bold: true,
    color: WHITE, align: "center", valign: "middle" });
}

// =================================================================== SLIDE 1
let s = p.addSlide();
s.background = { color: BERRY };
s.addShape(p.shapes.OVAL, { x: 9.7, y: -2.2, w: 6.2, h: 6.2, fill: { color: "7E3A53" } });
s.addShape(p.shapes.OVAL, { x: 11.3, y: 3.9, w: 4.6, h: 4.6, fill: { color: "5E2740" } });
s.addText("BIG DATA ANALYTICS · GRUPPENPROJEKT · UNIVERSITÄT ULM", { x: 0.9, y: 1.25,
  w: 11, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: CREAM, charSpacing: 2 });
s.addText("SephoBay\nRecommender System", { x: 0.85, y: 1.85, w: 10.5, h: 2.0,
  fontFace: HEAD, fontSize: 50, bold: true, color: WHITE, lineSpacingMultiple: 0.95 });
s.addText("Personalisierte Bewertungsvorhersage mit minimalem MAE", { x: 0.9, y: 3.95,
  w: 10, h: 0.5, fontFace: BODY, fontSize: 18, italic: true, color: CREAM });
// stat teaser card
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 4.9, w: 3.5, h: 1.6, rectRadius: 0.12,
  fill: { color: "FFFFFF" }, shadow: sh() });
s.addText("0,29", { x: 0.9, y: 5.0, w: 3.5, h: 0.95, fontFace: HEAD, fontSize: 46,
  bold: true, color: BERRY, align: "center" });
s.addText("Test-MAE (gerundete Sterne)", { x: 0.9, y: 5.95, w: 3.5, h: 0.4, fontFace: BODY,
  fontSize: 12, color: MUT, align: "center" });
s.addText("Gruppe SephoBay   ·   15.06.2026", { x: 5.0, y: 6.05, w: 7, h: 0.4,
  fontFace: BODY, fontSize: 13, color: CREAM });
s.addNotes("Begrüßung. Wir präsentieren unser Recommender System für SephoBay. " +
  "Ziel war die bestmögliche Bewertungsvorhersage, gemessen am MAE in Sternen. " +
  "Unser Ergebnis: 0,29 Test-MAE — wir zeigen heute, wie wir dahin kamen und warum das nahe am Optimum liegt.");

// =================================================================== SLIDE 2
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Ausgangssituation & Ziel", "Mehr Kundenbindung durch passende Empfehlungen");
const ctx = [
  ["Problem", "In einem großen Produktportfolio finden Kund:innen relevante Produkte kaum noch — sinkende Zufriedenheit und Kundenbindung."],
  ["Bisher", "Es werden meist nur Bestseller gefunden, keine persönlichen Empfehlungen."],
  ["Auftrag", "Ein Recommender System, das vorhersagt, wie ein:e Nutzer:in ein Produkt bewerten würde."],
];
let yy = 1.85;
ctx.forEach((c, i) => {
  circleNum(s, i + 1, 0.6, yy, 0.5, ROSE);
  s.addText(c[0], { x: 1.25, y: yy - 0.05, w: 5.6, h: 0.35, fontFace: HEAD, fontSize: 16, bold: true, color: BERRY });
  s.addText(c[1], { x: 1.25, y: yy + 0.32, w: 5.7, h: 0.9, fontFace: BODY, fontSize: 14, color: INK });
  yy += 1.45;
});
// goal card
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 7.5, y: 1.95, w: 5.2, h: 4.3, rectRadius: 0.12,
  fill: { color: BERRY }, shadow: sh() });
s.addText("ZIEL", { x: 7.8, y: 2.25, w: 4.6, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: ROSE, charSpacing: 3 });
s.addText("Bestmögliche\nEmpfehlungsgüte", { x: 7.8, y: 2.65, w: 4.6, h: 1.1, fontFace: HEAD,
  fontSize: 26, bold: true, color: WHITE, lineSpacingMultiple: 0.98 });
s.addText([
  { text: "Minimaler ", options: {} },
  { text: "MAE in Sternen", options: { bold: true } },
  { text: " auf dem Testdatensatz —", options: {} },
], { x: 7.8, y: 3.95, w: 4.6, h: 0.7, fontFace: BODY, fontSize: 15, color: CREAM });
s.addText("die Vorhersage wird vor der MAE-Berechnung auf ganze Sterne gerundet (0–5).",
  { x: 7.8, y: 4.6, w: 4.6, h: 0.8, fontFace: BODY, fontSize: 14, color: CREAM });
s.addText("Bewertet im direkten Vergleich mit den anderen Gruppen.", { x: 7.8, y: 5.5,
  w: 4.6, h: 0.6, fontFace: BODY, fontSize: 13, italic: true, color: ROSE });
pageNum(s, 2);
s.addNotes("Die Geschäftslage: Kundenbindung leidet, weil Nutzer relevante Produkte nicht finden. " +
  "Der Auftrag ist ein Recommender. Entscheidend für den Wettbewerb: die Zielgröße ist der MAE in " +
  "Sternen, und zwar GERUNDET auf ganze Sterne. Diese Rundung ist später unser wichtigster Hebel.");

// =================================================================== SLIDE 3
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Die Daten", "Eine Erkenntnis bestimmt alles");
// left: stat row
const stats = [["798", "Nutzer:innen"], ["622", "Produkte"], ["24.892", "Bewertungen"], ["0–5", "Sterne-Skala"]];
stats.forEach((st, i) => {
  const x = 0.6 + (i % 2) * 2.85, y = 1.9 + Math.floor(i / 2) * 1.35;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.65, h: 1.15, rectRadius: 0.1, fill: { color: TINT } });
  s.addText(st[0], { x, y: y + 0.12, w: 2.65, h: 0.6, fontFace: HEAD, fontSize: 26, bold: true, color: BERRY, align: "center" });
  s.addText(st[1], { x, y: y + 0.72, w: 2.65, h: 0.35, fontFace: BODY, fontSize: 12, color: MUT, align: "center" });
});
// distribution chart
s.addText("Verteilung der Bewertungen", { x: 0.6, y: 4.75, w: 5.5, h: 0.35, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
s.addChart(p.charts.BAR, [{ name: "Anteil", labels: ["1", "2", "3", "4", "5"], values: [1.8, 2.1, 4.5, 16.6, 74.9] }], {
  x: 0.5, y: 5.05, w: 5.8, h: 2.0, barDir: "col", chartColors: [ROSE, ROSE, ROSE, ROSE, BERRY],
  showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontSize: 10, dataLabelFormatCode: '0.0"%"',
  catAxisLabelColor: MUT, valAxisHidden: true, valGridLine: { style: "none" }, showLegend: false,
  chartArea: { fill: { color: "FFFFFF" } }, barGapWidthPct: 40,
});
// right: insight
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 7.0, y: 1.9, w: 5.7, h: 4.55, rectRadius: 0.12, fill: { color: CREAM }, shadow: sh() });
s.addText("75 %", { x: 7.3, y: 2.15, w: 5.1, h: 1.0, fontFace: HEAD, fontSize: 56, bold: true, color: BERRY });
s.addText("aller Bewertungen sind 5 Sterne.", { x: 7.3, y: 3.2, w: 5.1, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: INK });
s.addText([
  { text: "Folge: ", options: { bold: true } },
  { text: "Das Problem ist keine Regression, sondern eine Entscheidung — ", options: {} },
  { text: "„5 oder nicht 5?“", options: { bold: true, italic: true } },
], { x: 7.3, y: 3.75, w: 5.1, h: 1.0, fontFace: BODY, fontSize: 15, color: INK });
s.addText([
  { text: "Trivial-Baseline „immer 5 raten“  ", options: {} },
  { text: "= MAE 0,37", options: { bold: true, color: BERRY } },
], { x: 7.3, y: 5.55, w: 5.1, h: 0.6, fontFace: BODY, fontSize: 15, color: INK });
pageNum(s, 3);
s.addNotes("798 Nutzer, 622 Produkte, knapp 25.000 Bewertungen, Skala 0 bis 5. " +
  "Die wichtigste Beobachtung: 75% aller Bewertungen sind 5 Sterne. Dadurch ist 'immer 5 raten' schon bei MAE 0,37. " +
  "Nach dem Runden zählt nicht Feinheit, sondern die Entscheidung 5-oder-nicht. Daran richtet sich unser ganzer Ansatz aus.");

// =================================================================== SLIDE 4
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Unser Ansatz", "Starke Basis, gezielte Korrektur, kluge Rundung");
const steps = [
  ["Backbone", "Regularisiertes Bias-Modell: globaler Schnitt + Nutzer- & Produkt-Tendenz."],
  ["Content-Korrektur", "Ähnliche Produkte (Kategorie, Marke, Preis, Inhaltsstoffe, TF-IDF Name) korrigieren personalisiert."],
  ["Lean Blend", "Gewichtete Kombination — nur Komponenten, die auf Validierung wirklich helfen."],
  ["Schwellenwert", "Metrik-optimierte Rundung in Sterne — der größte Einzel-Hebel."],
];
const bw = 2.92, bx0 = 0.55, by = 2.3, gap = 0.18;
steps.forEach((st, i) => {
  const x = bx0 + i * (bw + gap);
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: by, w: bw, h: 3.1, rectRadius: 0.1,
    fill: { color: i === 3 ? BERRY : TINT }, shadow: sh() });
  circleNum(s, i + 1, x + 0.25, by + 0.28, 0.55, i === 3 ? ROSE : BERRY);
  s.addText(st[0], { x: x + 0.25, y: by + 0.95, w: bw - 0.45, h: 0.75, fontFace: HEAD, fontSize: 16,
    bold: true, color: i === 3 ? WHITE : BERRY, valign: "top" });
  s.addText(st[1], { x: x + 0.25, y: by + 1.7, w: bw - 0.45, h: 1.3, fontFace: BODY, fontSize: 12.5,
    color: i === 3 ? CREAM : INK });
  if (i < 3) s.addText("→", { x: x + bw - 0.02, y: by + 1.2, w: 0.22, h: 0.6, fontFace: HEAD,
    fontSize: 22, bold: true, color: ROSE, align: "center" });
});
s.addText("Eine einzige Vorhersagefunktion  predict(user, item)  durchläuft alle vier Schritte.",
  { x: 0.55, y: 5.7, w: 12, h: 0.5, fontFace: BODY, fontSize: 14, italic: true, color: MUT });
pageNum(s, 4);
s.addNotes("Vier Bausteine: 1) Bias-Modell als robuste Basis. 2) Content-Korrektur für Personalisierung. " +
  "3) Ein schlanker Blend, der nur hilfreiche Teile behält. 4) Der metrik-optimierte Schwellenwert. " +
  "Alles steckt in einer Funktion predict(user, item), die wir für jede Testzeile aufrufen.");

// =================================================================== SLIDE 5
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Zwei kreative Ideen", "Hier liegen die Punkte");
const ideas = [
  ["Content-based als Sternevorhersage",
   "Content-Filtering liefert keine Sterne direkt. Unsere Lösung: Produktähnlichkeit als Gewicht in einem gewichteten Mittel über die eigenen Bewertungen der Nutzer:in — so wird Content MAE-fähig.",
   "Genau die im Briefing geforderte kreative Idee."],
  ["Metrik-optimierter Schwellenwert",
   "Da 75% Fünfer sind, ist normales Runden (bei 4,5) falsch. Wir runden zur 5 schon ab einem Score von 4,3. Das spiegelt die asymmetrischen Kosten der Metrik wider.",
   "Größter Hebel: Test-MAE 0,305 → 0,29."],
];
ideas.forEach((it, i) => {
  const x = 0.6 + i * 6.25;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.95, w: 5.9, h: 4.45, rectRadius: 0.12, fill: { color: WHITE }, line: { color: CREAM, width: 1.5 }, shadow: sh() });
  circleNum(s, i + 1, x + 0.35, 2.3, 0.6, BERRY);
  s.addText(it[0], { x: x + 1.15, y: 2.32, w: 4.5, h: 0.85, fontFace: HEAD, fontSize: 18, bold: true, color: BERRY, valign: "middle" });
  s.addText(it[1], { x: x + 0.4, y: 3.35, w: 5.1, h: 2.0, fontFace: BODY, fontSize: 14.5, color: INK });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 0.4, y: 5.55, w: 5.1, h: 0.65, rectRadius: 0.08, fill: { color: TINT } });
  s.addText(it[2], { x: x + 0.55, y: 5.55, w: 4.8, h: 0.65, fontFace: BODY, fontSize: 13, bold: true, italic: true, color: BERRY, valign: "middle" });
});
pageNum(s, 5);
s.addNotes("Zwei kreative Schritte. Erstens: Content-Filtering gibt keine Sterne aus — wir nutzen die " +
  "Produktähnlichkeit als Gewicht über die eigenen Bewertungen der Nutzerin. Das ist die im Briefing " +
  "ausdrücklich gewünschte kreative Idee. Zweitens, und das ist der größte Hebel: der Rundungs-Schwellenwert. " +
  "Weil 75% Fünfer sind, runden wir schon ab 4,3 zur 5 statt erst bei 4,5 — das senkt den Test-MAE von 0,305 auf 0,29.");

// =================================================================== SLIDE 6
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Ergebnisse", "Empfehlungsgüte auf dem Testdatensatz");
// big stat
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.0, w: 3.5, h: 4.3, rectRadius: 0.12, fill: { color: BERRY }, shadow: sh() });
s.addText("0,29", { x: 0.6, y: 2.55, w: 3.5, h: 1.3, fontFace: HEAD, fontSize: 64, bold: true, color: WHITE, align: "center" });
s.addText("Test-MAE", { x: 0.6, y: 3.85, w: 3.5, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: CREAM, align: "center" });
s.addText("(gerundete Sterne)", { x: 0.6, y: 4.2, w: 3.5, h: 0.35, fontFace: BODY, fontSize: 12, color: ROSE, align: "center" });
s.addText([
  { text: "vs. „immer 5“  0,37", options: { breakLine: true } },
  { text: "vs. Kurs-Methoden (v3)  0,31", options: {} },
], { x: 0.85, y: 5.0, w: 3.0, h: 1.0, fontFace: BODY, fontSize: 14, color: CREAM, align: "center" });
// chart: model ladder
s.addText("Vom Baseline zum finalen Modell (Test-MAE, niedriger = besser)", { x: 4.5, y: 1.95, w: 8.3, h: 0.35, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
s.addChart(p.charts.BAR, [{
  name: "Test-MAE",
  labels: ["Immer 5", "Bias-Backbone", "+ Content + Blend", "Final (+ Schwelle)"],
  values: [0.371, 0.325, 0.305, 0.2895],
}], {
  x: 4.4, y: 2.35, w: 8.5, h: 4.0, barDir: "bar",
  chartColors: [ROSE], showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK,
  dataLabelFontSize: 13, dataLabelFontBold: true, dataLabelFormatCode: "0.000",
  catAxisLabelColor: INK, catAxisLabelFontSize: 13, valAxisHidden: true,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
  valAxisMaxVal: 0.4, valAxisMinVal: 0, barGapWidthPct: 55, chartArea: { fill: { color: "FFFFFF" } },
});
pageNum(s, 6);
s.addNotes("Das Kernergebnis: 0,29 Test-MAE. Zum Vergleich: 'immer 5' liegt bei 0,37, die reinen " +
  "Kurs-Methoden bei 0,31. Die Treppe zeigt den Beitrag jedes Schritts: Bias-Backbone bringt den " +
  "größten Sprung, Content und Blend verfeinern, der Schwellenwert holt das letzte heraus. " +
  "Validierung (0,30) und Test (0,29) stimmen überein — das Modell generalisiert.");

// =================================================================== SLIDE 7
s = p.addSlide(); s.background = { color: WHITE };
header(s, "Gründlichkeit", "Wir haben das Limit nachgewiesen");
s.addText("Neun Modellfamilien getestet — keine schlägt unseren Ansatz:", { x: 0.6, y: 1.8, w: 7, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: INK });
const rejected = [
  ["Matrix-Faktorisierung (SVD)", "0,32"], ["Gradient Boosting", "0,33"],
  ["Neuronale Netze (MLP)", "0,30"], ["Clustering / Co-Clustering", "0,33"],
  ["Zweistufiger Klassifikator", "0,32"], ["Unser Modell (v2)", "0,29"],
];
rejected.forEach((r, i) => {
  const x = 0.6 + (i % 2) * 3.4, y = 2.35 + Math.floor(i / 2) * 0.72;
  const win = r[1] === "0,29";
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.2, h: 0.6, rectRadius: 0.07, fill: { color: win ? BERRY : TINT } });
  s.addText(r[0], { x: x + 0.18, y, w: 2.45, h: 0.6, fontFace: BODY, fontSize: 11.5, bold: win, color: win ? WHITE : INK, valign: "middle" });
  s.addText(r[1], { x: x + 2.5, y, w: 0.6, h: 0.6, fontFace: HEAD, fontSize: 15, bold: true, color: win ? CREAM : ROSE, align: "right", valign: "middle" });
});
// right insight card
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 7.6, y: 1.95, w: 5.1, h: 4.5, rectRadius: 0.12, fill: { color: CREAM }, shadow: sh() });
s.addText("Warum nicht tiefer?", { x: 7.9, y: 2.2, w: 4.5, h: 0.5, fontFace: HEAD, fontSize: 19, bold: true, color: BERRY });
s.addText([
  { text: "60 %", options: { bold: true, color: BERRY } },
  { text: " des Restfehlers ist die 4-gegen-5-Grenze.", options: {} },
], { x: 7.9, y: 2.85, w: 4.5, h: 0.7, fontFace: BODY, fontSize: 14.5, color: INK });
s.addText("Diese Unterscheidung ist nur zu ~84% lernbar — wir erreichen bereits 83,5%.",
  { x: 7.9, y: 3.65, w: 4.5, h: 0.8, fontFace: BODY, fontSize: 14, color: INK });
s.addText([
  { text: "Der Rest ist ", options: {} },
  { text: "irreduzibles Rauschen", options: { bold: true } },
  { text: ". MAE um 0,20 würde >90% verlangen — physikalisch nicht in den Daten.", options: {} },
], { x: 7.9, y: 4.5, w: 4.5, h: 1.2, fontFace: BODY, fontSize: 14, color: INK });
s.addText("⚠  Gemeldete Werte ≤ 0,25 deuten auf Messfehler (z. B. ohne Rundung / Leakage) hin.",
  { x: 0.6, y: 5.9, w: 6.7, h: 0.7, fontFace: BODY, fontSize: 12.5, italic: true, color: MUT });
pageNum(s, 7);
s.addNotes("Wir wollten sicher sein, nichts zu verpassen. Deshalb haben wir neun Modellfamilien getestet — " +
  "von Matrix-Faktorisierung über Gradient Boosting und neuronale Netze bis Clustering und zweistufigen " +
  "Klassifikatoren. Alle landen zwischen 0,30 und 0,35; keine schlägt uns. Der Grund: 60% des Fehlers ist " +
  "die 4-gegen-5-Entscheidung, die nur zu ~84% lernbar ist — wir holen davon schon 83,5%. Der Rest ist " +
  "echtes Rauschen. Werte unter 0,25 wären ein Warnsignal für einen Messfehler.");

// =================================================================== SLIDE 8
s = p.addSlide(); s.background = { color: BERRY };
s.addShape(p.shapes.OVAL, { x: -2.0, y: 4.2, w: 5.5, h: 5.5, fill: { color: "5E2740" } });
s.addShape(p.shapes.OVAL, { x: 11.0, y: -2.0, w: 4.8, h: 4.8, fill: { color: "7E3A53" } });
s.addText("FAZIT & EMPFEHLUNG", { x: 0.9, y: 0.9, w: 11, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: ROSE, charSpacing: 3 });
s.addText("Nahe am Optimum — und beweisbar", { x: 0.85, y: 1.3, w: 11.5, h: 0.9, fontFace: HEAD, fontSize: 34, bold: true, color: WHITE });
const fz = [
  "Ein regularisiertes Bias-Modell liefert die robuste Basis.",
  "Die Gewinne kommen aus einem weichen Content-Signal und der metrik-gerechten Rundung — nicht aus komplexeren Modellen.",
  "Test-MAE 0,29 schlägt alle Baselines und die reinen Kurs-Methoden; das Modell generalisiert sauber.",
  "Nachweislich nahe am Rauschboden: neun Modellfamilien plateauen, die 4-vs-5-Grenze ist die Grenze.",
];
let fy = 2.5;
fz.forEach((t) => {
  s.addShape(p.shapes.OVAL, { x: 0.95, y: fy + 0.07, w: 0.16, h: 0.16, fill: { color: ROSE } });
  s.addText(t, { x: 1.35, y: fy - 0.05, w: 8.2, h: 0.7, fontFace: BODY, fontSize: 15.5, color: CREAM });
  fy += 0.82;
});
// final stat
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 10.0, y: 2.7, w: 2.7, h: 2.5, rectRadius: 0.12, fill: { color: WHITE }, shadow: sh() });
s.addText("0,29", { x: 10.0, y: 3.05, w: 2.7, h: 1.0, fontFace: HEAD, fontSize: 44, bold: true, color: BERRY, align: "center" });
s.addText("finaler\nTest-MAE", { x: 10.0, y: 4.05, w: 2.7, h: 0.9, fontFace: BODY, fontSize: 14, color: MUT, align: "center" });
s.addText("Vielen Dank — Fragen?", { x: 0.9, y: 6.4, w: 11, h: 0.5, fontFace: HEAD, fontSize: 18, italic: true, bold: true, color: WHITE });
s.addNotes("Zusammenfassung für den Vorstand: Das Bias-Modell trägt die Hauptlast, die Feinarbeit kommt " +
  "aus einem weichen Content-Signal und der metrik-gerechten Rundung — nicht aus teureren Modellen. " +
  "0,29 Test-MAE schlägt alle Baselines, generalisiert sauber, und wir können beweisen, dass es nahe am " +
  "theoretischen Limit liegt. Empfehlung: dieses Modell einsetzen. Danke — gerne Fragen.");

p.writeFile({ fileName: "SephoBay_Praesentation.pptx" }).then(f => console.log("wrote", f));
