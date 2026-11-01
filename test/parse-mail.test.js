import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMail, trouverDates } from '../parse-mail.js';

const MAIL_QCM = `Bonjour à toutes et à tous,

Je vous informe qu’un QCM de 20 questions sera organisé lors de la prochaine séance de
« programmation pour l’embarqué », le 04/11/2026. La durée de l’évaluation sera de 10
minutes.
Le contenu du QCM portera exclusivement sur les notions abordées lors de la dernière
séance, le 21/10/2026, à savoir :
  • la mission DIGIT de TP ;
  • le support pédagogique « C embarqué par l’exemple » ;
  • les codes C étudiés et commentés en cours.
Je vous invite donc à relire attentivement ces différents supports.`;

test('extrait le QCM du 04/11 depuis le mail de l\'enseignant', () => {
  const r = parseMail(MAIL_QCM, new Date('2026-11-01T10:00:00'));
  assert.equal(r.matiere, 'Programmation pour l’embarqué');
  assert.equal(r.echeance.type, 'QCM');
  assert.equal(r.echeance.date, '2026-11-04');
  assert.equal(r.echeance.dureeMin, 10);
  assert.equal(r.echeance.description, '20 questions');
  assert.equal(r.derniereSeance, '2026-10-21');
  assert.deepEqual(r.supports, ['C embarqué par l’exemple']);
  assert.deepEqual(r.notions, ['la mission DIGIT de TP', 'les codes C étudiés et commentés en cours']);
});

test('reconnaît les dates écrites en lettres', () => {
  const d = trouverDates('Rendu le 4 novembre 2026 et le 1er décembre 2026.');
  assert.deepEqual(d.map((x) => x.iso), ['2026-11-04', '2026-12-01']);
});

test('texte vide ou sans infos : ne plante pas', () => {
  const r = parseMail('');
  assert.equal(r.matiere, '');
  assert.equal(r.echeance.date, '');
  assert.deepEqual(parseMail('Bonjour, rien de spécial.').notions, []);
});
