# Architecture

## Une seule URL

Caddy (intégré à FrankenPHP, conteneur `php`) reçoit toutes les requêtes sur `https://127.0.0.1` :

- `/api/*`, `/_profiler*`, `/_wdt*`, `/bundles/*` : Symfony
- tout le reste : Angular
  - en dev : proxy vers le conteneur `front` (`ng serve`, rechargement à chaud)
  - en prod : fichiers statiques compilés dans l'image, dans `/app/front`

Le choix se fait avec la variable `FRONT_MODE` (`dev` ou `prod` par défaut) dans `api/frankenphp/Caddyfile`.

Avantages : pas de configuration CORS, session en cookie HttpOnly, le callback OAuth arrive directement sur Symfony.

## Connexion Spotify

1. Le front redirige vers `/api/auth/login`, et Symfony renvoie vers Spotify avec les scopes.
2. Spotify revient sur `/api/auth/callback`. `App\Security\SpotifyAuthenticator` récupère les tokens, crée ou met à jour l'utilisateur, ouvre la session, puis redirige vers `/`.
3. Le front appelle `/api/me` pour savoir si l'utilisateur est connecté (guards Angular).
4. Les appels à Spotify passent par `App\Spotify\SpotifyApi`. Le token est rafraîchi automatiquement s'il expire dans moins d'une minute (`SpotifyTokenRefresher`).
5. Déconnexion : `/api/auth/logout`, géré par le firewall.

Les tokens Spotify sont stockés en base (`user`) et ne sont jamais envoyés au front.

## Services Docker

- `php` : FrankenPHP (Symfony en mode worker + Caddy). Au démarrage, il lance `composer install` si besoin et joue les migrations.
- `worker` : même image, `messenger:consume async`, pour les tâches longues comme l'import de l'historique. À redémarrer (`make worker-restart`) après une modification d'un handler.
- `database` : PostgreSQL 18
- `front` : dev uniquement, Node 24 + `ng serve`. Ses `node_modules` sont dans un volume Docker.

## Build de prod

```bash
APP_SECRET=… SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… \
  docker compose -f compose.yaml -f compose.prod.yaml build
```

L'étape `front_builder` du `api/Dockerfile` compile Angular à partir du contexte de build nommé `front` (`additional_contexts` dans `compose.prod.yaml`), puis le résultat est copié dans l'image FrankenPHP finale.

## Choix

- **Angular + spartan/ui** plutôt que React + shadcn : même principe (composants copiés dans le projet et modifiables, Tailwind), spartan est stable depuis la 1.0 de juin 2026.
- **symfony-docker** repris presque tel quel : Mercure et Vulcain retirés, PostgreSQL ajouté, routage front et API dans le Caddyfile.
- **Node 24 dans Docker** : Angular 22 ne supporte pas Node 25.
- **Messenger** dès le départ pour l'import de l'historique étendu ; Scheduler à ajouter pour la relève horaire des derniers titres écoutés.
