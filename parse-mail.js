// Extrait d'un mail (collé en texte) les infos utiles à une fiche de reprise :
// matière, dernière séance, échéance (type, date, durée), notions et supports.
// Heuristiques simples pour des mails d'enseignants en français ; l'utilisateur
// relit et corrige toujours le résultat avant d'enregistrer.

const MOIS = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11,
  décembre: 12, decembre: 12,
};

const iso = (a, m, j) =>
  `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;

// Trouve toutes les dates du texte, avec leur position.
export function trouverDates(texte) {
  const dates = [];
  const num = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g;
  for (const m of texte.matchAll(num)) {
    const annee = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 1 && Number(m[1]) <= 31) {
      dates.push({ pos: m.index, iso: iso(annee, Number(m[2]), Number(m[1])) });
    }
  }
  const noms = Object.keys(MOIS).join('|');
  const lettres = new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${noms})\\s+(\\d{4})\\b`, 'gi');
  for (const m of texte.matchAll(lettres)) {
    dates.push({ pos: m.index, iso: iso(Number(m[3]), MOIS[m[2].toLowerCase()], Number(m[1])) });
  }
  return dates.sort((a, b) => a.pos - b.pos);
}

const DERNIERE = /derni[eè]re\s+s[eé]ance|s[eé]ance\s+du|abord[ée]e?s?\s+lors|vu(?:e|es|s)?\s+le/i;
const SUPPORT = /support|polycopi|\bpoly\b|livre|\bpdf\b|slides?|diapo|document/i;

function nettoyer(ligne) {
  return ligne
    .replace(/^[\s•\-*–·▪◦]+/, '')
    .replace(/[\s;.,]+$/, '')
    .trim();
}

export function parseMail(texte, aujourdhui = new Date()) {
  const t = String(texte || '').replace(/\r/g, '');
  const out = {
    matiere: '',
    derniereSeance: '',
    notions: [],
    supports: [],
    echeance: { type: 'Autre', date: '', dureeMin: '', description: '' },
  };

  // Type d'échéance
  if (/\bQCM\b/i.test(t)) out.echeance.type = 'QCM';
  else if (/examen|partiel|contr[oô]le|\bDS\b/i.test(t)) out.echeance.type = 'Examen';
  else if (/\brendu\b|à rendre|remettre|devoir/i.test(t)) out.echeance.type = 'Rendu';

  // Dates : « dernière séance » d'un côté, le reste = échéance
  const debutJour = new Date(aujourdhui); debutJour.setHours(0, 0, 0, 0);
  const aVenir = [];
  for (const d of trouverDates(t)) {
    const avant = t.slice(Math.max(0, d.pos - 60), d.pos);
    if (DERNIERE.test(avant) && !out.derniereSeance) out.derniereSeance = d.iso;
    else aVenir.push(d.iso);
  }
  out.echeance.date =
    aVenir.find((i) => new Date(i + 'T00:00:00') >= debutJour) || aVenir[0] || '';

  // Durée
  const h = t.match(/\b(\d{1,2})\s*h\s*(\d{2})?\b(?!\s*\d)/i);
  const min = t.match(/\b(\d{1,3})\s*min(?:ute)?s?\b/i);
  if (min) out.echeance.dureeMin = Number(min[1]);
  else if (h && /dur[ée]e/i.test(t)) out.echeance.dureeMin = Number(h[1]) * 60 + Number(h[2] || 0);

  const questions = t.match(/\b(\d{1,3})\s+questions?\b/i);
  if (questions) out.echeance.description = `${questions[1]} questions`;

  // Matière : « séance de « … » » ou « Matière : … »
  const guillemets = t.match(/s[eé]ance\s+de\s*[«"“]\s*([^»"”\n]+?)\s*[»"”]/i);
  const etiquette = t.match(/mati[eè]re\s*:\s*(.+)/i);
  const brut = (guillemets && guillemets[1]) || (etiquette && etiquette[1]) || '';
  out.matiere = brut ? brut.trim().replace(/^./, (c) => c.toUpperCase()) : '';

  // Puces → notions / supports
  for (const ligne of t.split('\n')) {
    if (!/^\s*[•\-*–·▪◦]\s+\S/.test(ligne)) continue;
    const texteLigne = nettoyer(ligne);
    const titre = texteLigne.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/);
    if (SUPPORT.test(texteLigne)) out.supports.push(titre ? titre[1].trim() : texteLigne);
    else out.notions.push(texteLigne);
  }

  return out;
}
