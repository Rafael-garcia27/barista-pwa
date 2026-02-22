import type { BrewLog, Suggestion, TasteTag } from "./types";

function has(tags: TasteTag[], tag: TasteTag) {
  return tags.includes(tag);
}

export function makeSuggestion(brew: BrewLog): Suggestion {
  const tags = brew.tasteTags;

  if (brew.rating >= 4 && tags.length === 0) {
    return {
      diagnosis: "Sieht gut aus. Nur feinjustieren, wenn du willst.",
      nextChange: "Wenn du experimentieren willst: ändere nur 1 Variable. Zum Beispiel 5 Sekunden länger.",
      extraTips: ["Notiere eine kurze Geschmacksnote, damit du später schneller Muster erkennst."],
    };
  }

  let diagnosis = "Dein Ergebnis deutet auf eine kleine Stellschraube hin.";
  let nextChange = "Ändere als nächstes nur 1 Sache.";
  const extraTips: string[] = [];

  // Priorität 1: watery → Ratio
  if (has(tags, "watery")) {
    diagnosis = "Wirkt eher zu dünn. Das ist oft ein Ratio Thema.";
    nextChange = "Nächster Brew: +1 bis +2 g Kaffee. Oder 10 bis 20 g weniger Wasser.";
    extraTips.push("Halte Zeit konstant, damit du den Effekt klar siehst.");
    return { diagnosis, nextChange, extraTips };
  }

  // Priorität 2: sour vs bitter → Unter/Überextraktion
  if (has(tags, "sour") && !has(tags, "bitter")) {
    diagnosis = "Eher sauer. Das klingt nach Unterextraktion.";
    nextChange = "Nächster Brew: etwas feiner mahlen. Oder 10 bis 15 Sekunden länger.";
    extraTips.push("Mach nur eine Änderung. Erst feiner testen, dann Zeit.");
  } else if (has(tags, "bitter") && !has(tags, "sour")) {
    diagnosis = "Eher bitter. Das klingt nach Überextraktion.";
    nextChange = "Nächster Brew: etwas gröber mahlen. Oder 10 bis 15 Sekunden kürzer.";
    extraTips.push("Wenn du sehr heiß brühst: 1 bis 2 Grad kühler kann helfen.");
  } else if (has(tags, "sour") && has(tags, "bitter")) {
    diagnosis = "Sauer und bitter gleichzeitig. Das ist oft Unruhe im Prozess.";
    nextChange = "Nächster Brew: gleiche Ratio, aber mahle etwas gröber und verlängere die Zeit leicht.";
    extraTips.push("Ziel ist Stabilität. Erst dann feinjustieren.");
  }

  // Ergänzend
  if (has(tags, "harsh")) extraTips.push("Harsh wirkt oft wie zu heiß oder zu fein. Teste 1 bis 2 Grad kühler oder etwas gröber.");
  if (has(tags, "flat")) extraTips.push("Flat kann bedeuten: zu grob oder zu kalt. Teste etwas feiner oder minimal heißer.");

  if (brew.rating <= 2 && extraTips.length === 0) {
    extraTips.push("Wenn nichts passt: starte vom Basisrezept neu und ändere nur eine Variable pro Versuch.");
  }

  return { diagnosis, nextChange, extraTips };
}
