# API Spotify : limites et contournements

État au 2 octobre 2026. L'API a été fortement restreinte entre novembre 2024 et 2026.

## Cadre

- **Mode développement uniquement** : l'« Extended Quota » est réservé depuis mai 2025 aux entreprises avec au moins 250 000 utilisateurs actifs par mois.
- **5 utilisateurs maximum** par app, à ajouter à la main dans le dashboard Spotify.
- **Premium obligatoire** pour le propriétaire de l'app ; si l'abonnement s'arrête, l'app ne marche plus.
- **Quota partagé** entre toutes les apps d'un même compte développeur ; au-delà, l'API répond `429` (`QUOTA_EXCEEDED`).
- **Plus d'appels groupés** (`GET /tracks?ids=…`, `/albums`, `/artists`) : une requête par élément, d'où la nécessité d'un cache.
- **Recherche** limitée à 10 résultats par appel.

## Ce qui marche encore

- Profil (`/me`), avec moins de champs : plus d'email, de pays ni d'abonnés
- Tops titres et artistes (`/me/top/{type}`) sur 3 périodes : `short_term` (~4 semaines), `medium_term` (~6 mois), `long_term` (~1 an)
- Les 50 derniers titres écoutés (`/me/player/recently-played`)
- Titres likés, playlists de l'utilisateur, création de playlists (`POST /me/playlists`), ajout et retrait de titres (`/playlists/{id}/items`)
- Ajout et suppression de likes via `/me/library`, qui remplace `/me/tracks`
- Lecture des titres likés via `GET /me/tracks` : annoncé supprimé en mode développement par le guide de migration de février 2026, mais répond encore (testé le 3 octobre 2026). Peut disparaître sans prévenir.
- ISRC des titres (`external_ids`), rétabli en mars 2026
- Web Playback SDK (lecture complète, Premium)

## Ce qui a disparu

- Recommandations, artistes similaires
- Audio features et audio analysis (tempo, énergie…)
- Extraits de 30 s (`preview_url`)
- Popularité, abonnés, labels
- Top titres d'un artiste, nouveautés, catégories
- Contenu des playlists dont l'utilisateur n'est ni propriétaire ni collaborateur, ce qui exclut les playlists Spotify et les Wrapped

## Contournements retenus

| Besoin | Solution |
|---|---|
| Titres likés jamais écoutés ou souvent passés | **Historique d'écoute étendu** (export RGPD sur spotify.com/account/privacy, livré sous 30 jours) importé dans l'app. Chaque écoute y figure avec sa durée, `skipped` et `reason_end`. Complété par une relève horaire des 50 derniers titres écoutés. |
| Mix des tops annuels (Wrapped) | Recalcul du top de chaque année à partir de l'historique étendu. Sinon, l'utilisateur copie sa playlist Wrapped dans une playlist à lui. |
| Titres proches | **Last.fm** (`track.getSimilar`, `artist.getSimilar`) ou **Deezer** (artistes liés, radio d'artiste), puis on retrouve le titre sur Spotify par `isrc:XXXX` |
| Extrait au survol | **API Deezer** : `GET https://api.deezer.com/track/isrc:{isrc}` renvoie un MP3 de 30 s (`preview`). Sinon, recherche simple « artiste titre » (`GET /search?q=…`) avec titre et artiste identiques. Passe par le backend, car Deezer ne gère pas CORS. |

Le navigateur bloque l'audio tant que l'utilisateur n'a pas interagi avec la page : il faut un premier clic avant que les extraits au survol puissent jouer.

À savoir sur Deezer :

- L'URL d'extrait **expire au bout d'environ 15 min** (`hdnea=exp=…`) : on garde en cache la correspondance ISRC → id Deezer, pas l'URL.
- Deezer répond `200` même en erreur, avec `{"error": {"code": …}}` ; le code `800` veut dire « introuvable ».
- Un même titre a souvent un ISRC par sortie (single, album) : celui de Spotify peut manquer chez Deezer, d'où la recherche simple en secours.
- La recherche avancée (`artist:"…" track:"…"`) ne renvoie plus rien, la recherche simple marche.
- Pas de secours iTunes : son API Search ne cherche pas par ISRC.

## Scopes demandés

Définis dans `api/src/Spotify/SpotifyScopes.php` :

- `user-top-read`, `user-read-recently-played`
- `user-library-read`, `user-library-modify`
- `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-private`, `playlist-modify-public`

## Sources

- [Guide de migration, février 2026](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Changelog, juillet 2026](https://developer.spotify.com/documentation/web-api/references/changes/july-2026)
- [Modes de quota](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [Restrictions de novembre 2024 (Digital Music News)](https://www.digitalmusicnews.com/2024/12/01/spotify-tightens-api-access-removes-several-data-points/)
