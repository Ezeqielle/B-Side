# Feuille de route

## En place

- Docker (php, worker, database, front), Makefile, outils qualité (Rector, PHP-CS-Fixer, PHPStan niveau 8, PHPUnit, Vitest)
- Connexion Spotify, session, rafraîchissement du token
- Écran des tops titres (3 périodes)
- Import de l'historique étendu : upload des JSON, traitement par Messenger, tables `track` et `play`
- Stats sur l'historique : chiffres clés, écoutes par mois, tops titres et artistes, heures d'écoute, filtrables par année et artiste

## Étapes suivantes

1. **Extraits au survol** : endpoint `/api/preview/{isrc}` (Deezer, avec cache), directive Angular sur les pochettes et un seul lecteur audio partagé avec fondu
2. **Nettoyage des likes et des playlists** (jamais écoutés, souvent passés), suppression via `/me/library`
3. **Création de playlists** à partir d'un `PlayFilter` (`PlayStats::topTracks()`), mix
4. **Exploration de titres proches** via Last.fm

## Idées

- Couleur dominante de la pochette en fond (`fast-average-color`)
- Animations avec la librairie `motion` et les animations natives d'Angular
- Graphiques avec `ngx-echarts`
- Drag & drop de playlists avec `@angular/cdk/drag-drop`
