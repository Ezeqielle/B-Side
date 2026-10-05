# B-Side

> 100% vibe codé avec Claude Code / Opus 5.5 `<high>`

Application web perso branchée sur un compte Spotify : stats d'écoute, playlists générées à partir de ces stats, nettoyage des titres likés, exploration de titres proches, extrait audio au survol des pochettes.

## Stack

- **Backend** : Symfony 8.1 / PHP 8.5, API JSON sous `/api`
- **Front** : Angular 22, Tailwind v4, [spartan/ui](https://spartan.ng) (équivalent Angular de shadcn/ui)
- **Base** : PostgreSQL 18
- **Docker** : [symfony-docker](https://github.com/dunglas/symfony-docker) (FrankenPHP + Caddy)
- **Auth** : OAuth Spotify via `knpuniversity/oauth2-client-bundle`, session en cookie (les tokens Spotify restent côté serveur)

Une seule URL : Caddy envoie `/api` à Symfony et tout le reste au front.

## Prérequis

- Docker
- Un compte Spotify **Premium** (obligatoire pour une app en mode développement)

## Installation

1. Créer une app sur le [dashboard Spotify](https://developer.spotify.com/dashboard) :
   - Redirect URI : `https://127.0.0.1/api/auth/callback`
   - API : Web API
2. Créer `api/.env.local` :

   ```dotenv
   SPOTIFY_CLIENT_ID=xxx
   SPOTIFY_CLIENT_SECRET=xxx
   ```

3. Démarrer :

   ```bash
   make start
   ```

4. Ouvrir <https://127.0.0.1> et accepter le certificat local.

Utiliser `127.0.0.1` et non `localhost` : Spotify refuse `localhost` comme redirect URI.

Pour ne plus avoir l'alerte de certificat (macOS) :

```bash
docker compose cp php:/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt && sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/caddy-root.crt
```

## Commandes

`make help` liste tout. Les principales :

- `make start` / `make up` / `make down` : cycle de vie Docker
- `make logs`, `make front-logs`, `make worker-logs` : logs
- `make shell` : shell dans le conteneur PHP
- `make sf c="debug:router"` : console Symfony
- `make migration` puis `make migrate` : migrations Doctrine
- `make ng c="g component features/stats"` : Angular CLI

## Qualité

- `make rector-fix` puis `make cs-fix` : corrections automatiques (dans cet ordre)
- `make phpstan-check` : analyse statique (niveau 8)
- `make db-test` (une fois) puis `make phpunit` : tests backend
- `make front-test` : tests front (Vitest)
- `make ci` : tout enchaîner

## Structure

- `api/` : Symfony, `Dockerfile` et config FrankenPHP (`api/frankenphp/`)
- `front/` : Angular, composants spartan copiés dans `front/libs/ui/`
- `compose*.yaml` : services `php`, `worker`, `database`, `front` (dev)
- `make/` : cibles du Makefile
- `docs/` : décisions et contraintes

## Documentation

- [API Spotify : limites et contournements](docs/spotify-api.md)
- [Architecture](docs/architecture.md)
- [Feuille de route](docs/roadmap.md)
