import { parseMail } from './parse-mail.js';

const CLE = 'reprise.v1';
const $ = (s) => document.querySelector(s);

// ---------- Stockage (localStorage, protégé : peut être indisponible) ----------
function charger() {
  try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch { return []; }
}
function sauver(fiches) {
  try { localStorage.setItem(CLE, JSON.stringify(fiches)); } catch { alert('Impossible de sauvegarder sur cet appareil.'); }
}
let fiches = charger();

// ---------- Dates ----------
const jour = (iso) => new Date(iso + 'T00:00:00');
const aujourdhui = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const joursRestants = (iso) => Math.round((jour(iso) - aujourdhui()) / 86400000);
const fmt = (iso) => jour(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });

function compte(f) {
  const iso = f.echeance?.date;
  if (!iso) return null;
  const n = joursRestants(iso);
  const texte = n === 0 ? "Aujourd'hui" : n === 1 ? 'Demain' : n > 1 ? `Dans ${n} jours` : `Passé depuis ${-n} j`;
  return { n, texte };
}

// ---------- Affichage (tout via textContent : pas d'injection HTML) ----------
function el(tag, props = {}, ...enfants) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of enfants) if (c != null) e.append(c);
  return e;
}

function carte(f) {
  const c = compte(f);
  const classes = ['fiche'];
  if (f.revise) classes.push('revise');
  else if (c && c.n >= 0 && c.n <= 3) classes.push('urgent');
  else if (c && c.n >= 0 && c.n <= 7) classes.push('bientot');

  const e = f.echeance || {};
  const detail = [e.type !== 'Autre' || e.date ? e.type : '', e.description, e.dureeMin ? `${e.dureeMin} min` : '']
    .filter(Boolean).join(' · ');

  const tete = el('div', { className: 'fiche-tete' },
    el('div', {}, el('h2', { textContent: f.matiere }),
      f.derniereSeance ? el('p', { textContent: `Dernière séance : ${fmt(f.derniereSeance)}` }) : null),
    c ? el('div', { className: 'compte' }, c.texte, el('small', { textContent: fmt(e.date) })) : null);

  const bloc = el('article', { className: classes.join(' ') }, tete);
  if (detail) bloc.append(el('p', { textContent: detail }));
  if (f.notions?.length) bloc.append(el('h3', { textContent: 'Vu en cours' }), el('ul', {}, ...f.notions.map((n) => el('li', { textContent: n }))));
  if (f.supports?.length) bloc.append(el('h3', { textContent: 'À relire' }), el('ul', {}, ...f.supports.map((n) => el('li', { textContent: n }))));

  const actions = el('div', { className: 'fiche-actions' });
  if (f.lien) actions.append(el('a', { href: f.lien, target: '_blank', rel: 'noopener noreferrer', textContent: 'Ouvrir sur Moodle' }));
  const fait = el('button', { type: 'button', textContent: f.revise ? 'Remettre à réviser' : 'Marquer révisé' });
  fait.onclick = () => { f.revise = !f.revise; sauver(fiches); rendre(); };
  const modif = el('button', { type: 'button', textContent: 'Modifier' });
  modif.onclick = () => ouvrirFiche(f);
  actions.append(fait, modif);
  bloc.append(actions);
  return bloc;
}

function rendre() {
  // Échéances à venir d'abord (les plus proches), puis sans date, puis passées ; les révisées en bas.
  const rang = (f) => {
    if (f.revise) return 3;
    const c = compte(f);
    return !c ? 1 : c.n >= 0 ? 0 : 2;
  };
  const triees = [...fiches].sort((a, b) =>
    rang(a) - rang(b) || (a.echeance?.date || '').localeCompare(b.echeance?.date || ''));
  $('#liste').replaceChildren(...triees.map(carte));
  $('#vide').hidden = fiches.length > 0;

  const aVenir = fiches.filter((f) => !f.revise && compte(f)?.n >= 0);
  const prochaine = aVenir.sort((a, b) => a.echeance.date.localeCompare(b.echeance.date))[0];
  $('#resume').textContent = prochaine
    ? `Prochaine échéance : ${prochaine.matiere} — ${compte(prochaine).texte.toLowerCase()}.`
    : "Là où tu t'étais arrêtée.";
}

// ---------- Formulaire ----------
const dlgFiche = $('#dlg-fiche');
const form = $('#form-fiche');
let enEdition = null;

function remplir(f = {}) {
  const e = f.echeance || {};
  form.matiere.value = f.matiere || '';
  form.derniereSeance.value = f.derniereSeance || '';
  form.notions.value = (f.notions || []).join('\n');
  form.supports.value = (f.supports || []).join('\n');
  form.type.value = e.type || 'Autre';
  form.date.value = e.date || '';
  form.dureeMin.value = e.dureeMin || '';
  form.description.value = e.description || '';
  form.lien.value = f.lien || '';
  form.revise.checked = !!f.revise;
}

function ouvrirFiche(f) {
  enEdition = f && f.id ? f : null;
  $('#titre-fiche').textContent = enEdition ? 'Modifier la fiche' : 'Nouvelle fiche';
  $('#btn-suppr').hidden = !enEdition;
  remplir(f || {});
  dlgFiche.showModal();
}

const lignes = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);

form.onsubmit = (ev) => {
  ev.preventDefault();
  const data = {
    matiere: form.matiere.value.trim(),
    derniereSeance: form.derniereSeance.value,
    notions: lignes(form.notions.value),
    supports: lignes(form.supports.value),
    echeance: {
      type: form.type.value,
      date: form.date.value,
      dureeMin: form.dureeMin.value ? Number(form.dureeMin.value) : '',
      description: form.description.value.trim(),
    },
    lien: form.lien.value.trim(),
    revise: form.revise.checked,
  };
  if (enEdition) Object.assign(enEdition, data);
  else fiches.push({ id: crypto.randomUUID(), ...data });
  sauver(fiches);
  dlgFiche.close();
  rendre();
};

$('#btn-fermer').onclick = () => dlgFiche.close();
$('#btn-suppr').onclick = () => {
  if (!enEdition || !confirm(`Supprimer « ${enEdition.matiere} » ?`)) return;
  fiches = fiches.filter((f) => f !== enEdition);
  sauver(fiches);
  dlgFiche.close();
  rendre();
};
$('#btn-nouveau').onclick = () => ouvrirFiche(null);

// ---------- Import d'un mail collé ----------
const dlgMail = $('#dlg-mail');
$('#btn-mail').onclick = () => { $('#texte-mail').value = ''; dlgMail.showModal(); };
$('#form-mail').onsubmit = (ev) => {
  const ok = ev.submitter && ev.submitter.value === 'ok';
  if (!ok) return;
  ev.preventDefault();
  const texte = $('#texte-mail').value.trim();
  if (!texte) return;
  dlgMail.close();
  ouvrirFiche(parseMail(texte));
};

// ---------- Sauvegarde / restauration ----------
$('#btn-export').onclick = () => {
  const blob = new Blob([JSON.stringify(fiches, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `reprise-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
};
$('#fichier-import').onchange = async (ev) => {
  const fichier = ev.target.files[0];
  if (!fichier) return;
  try {
    const data = JSON.parse(await fichier.text());
    if (!Array.isArray(data) || data.some((f) => typeof f?.matiere !== 'string')) throw new Error('format');
    if (!confirm(`Remplacer tes ${fiches.length} fiches par les ${data.length} du fichier ?`)) return;
    fiches = data.map((f) => ({ id: crypto.randomUUID(), notions: [], supports: [], echeance: {}, ...f }));
    sauver(fiches);
    rendre();
  } catch {
    alert("Ce fichier n'est pas une sauvegarde Reprise valide.");
  } finally {
    ev.target.value = '';
  }
};

rendre();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
