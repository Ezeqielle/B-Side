# Feuille de route

## En place

- Docker (php, worker, database, front), Makefile, outils qualité (Rector, PHP-CS-Fixer, PHPStan niveau 8, PHPUnit, Vitest)
- Connexion Spotify, session, rafraîchissement du token
- Écran des tops titres (3 périodes)
- Import de l'historique étendu : upload des JSON, traitement par Messenger, tables `track` et `play`
- Stats sur l'historique : chiffres clés, écoutes par mois, tops titres et artistes, heures d'écoute, filtrables par année et artiste
- Synchro des playlists et stats croisées avec l'historique : jamais écoutés, souvent passés, dernière écoute, doublons, titres absents des playlists
- Extraits au survol : `/api/preview/track/{id}` (Deezer, avec cache), directive `appPreview` sur les pochettes, un seul lecteur audio partagé avec fondu, interrupteur dans l'en-tête

- Nettoyage des playlists et des likes par règles réglables, via une playlist corbeille, avec journal, remise en place et liste de titres à garder
- Doublons : versions d'un même morceau dans une playlist (single, album, edit…), à garder ou retirer
- Création d'une playlist depuis la page Top et le top titres des stats : titres affichés (période ou filtre choisi, pages chargées), nom modifiable

## Étapes suivantes

1. **Création de playlists** à partir d'un `PlayFilter` (`PlayStats::topTracks()`), mix
2. **Exploration de titres proches** via Last.fm

## Idées

- Couleur dominante de la pochette en fond (`fast-average-color`)
- Animations avec la librairie `motion` et les animations natives d'Angular
- Graphiques avec `ngx-echarts`
- Drag & drop de playlists avec `@angular/cdk/drag-drop`
