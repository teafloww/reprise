# Reprise

Pense-bête perso pour reprendre là où on s'était arrêtée après les vacances.
Une fiche par matière : dernière séance, ce qu'on a vu, supports à relire, prochaine
échéance (QCM, examen, rendu) avec compte à rebours.

- **Coller un mail** : la date, la durée, la matière et les supports sont repérés automatiquement.
- **Données privées** : tout reste dans le navigateur de l'appareil (aucun serveur, aucun compte).
  Utilise « Sauvegarder (.json) » pour garder une copie.
- **Installable** sur téléphone (PWA), fonctionne hors connexion.

## Lancer

```bash
npm start      # http://localhost:8080
npm test       # tests de l'import de mail
```

## À venir
Import du calendrier de l'école (.ics), récupération des supports Moodle, quiz d'entraînement.
> Ne jamais committer de lien de calendrier ni de clé Moodle : ils donnent accès à tes données.
