# B-Side

> 100% vibe coded with Claude Code / Opus 5.5 `<high>`

Personal web app connected to a Spotify account: listening stats, playlists generated from those stats, liked tracks cleanup, similar tracks exploration, audio preview on cover hover.

## Stack

- **Backend**: Symfony 8.1 / PHP 8.5, JSON API under `/api`
- **Front**: Angular 22, Tailwind v4, [spartan/ui](https://spartan.ng) (Angular equivalent of shadcn/ui)
- **Database**: PostgreSQL 18
- **Docker**: [symfony-docker](https://github.com/dunglas/symfony-docker) (FrankenPHP + Caddy)
- **Auth**: Spotify OAuth via `knpuniversity/oauth2-client-bundle`, cookie session (Spotify tokens stay server-side)

Single URL: Caddy routes `/api` to Symfony and everything else to the front.

## Requirements

- Docker
- A Spotify **Premium** account (required for an app in development mode)

## Installation

1. Create an app on the [Spotify dashboard](https://developer.spotify.com/dashboard):
   - Redirect URI: `https://127.0.0.1/api/auth/callback`
   - API: Web API
2. Create `api/.env.local`:

   ```dotenv
   SPOTIFY_CLIENT_ID=xxx
   SPOTIFY_CLIENT_SECRET=xxx
   ```

3. Start:

   ```bash
   make start
   ```

4. Open <https://127.0.0.1> and accept the local certificate.

Use `127.0.0.1`, not `localhost`: Spotify rejects `localhost` as a redirect URI.

To get rid of the certificate warning (macOS):

```bash
docker compose cp php:/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt && sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/caddy-root.crt
```

## Commands

`make help` lists everything. The main ones:

- `make start` / `make up` / `make down`: Docker lifecycle
- `make logs`, `make front-logs`, `make worker-logs`: logs
- `make shell`: shell in the PHP container
- `make sf c="debug:router"`: Symfony console
- `make migration` then `make migrate`: Doctrine migrations
- `make ng c="g component features/stats"`: Angular CLI

## Quality

- `make rector-fix` then `make cs-fix`: automatic fixes (in that order)
- `make phpstan-check`: static analysis (level 8)
- `make db-test` (once) then `make phpunit`: backend tests
- `make front-test`: front tests (Vitest)
- `make ci`: run everything

## Structure

- `api/`: Symfony, `Dockerfile` and FrankenPHP config (`api/frankenphp/`)
- `front/`: Angular, spartan components copied into `front/libs/ui/`
- `compose*.yaml`: `php`, `worker`, `database`, `front` (dev) services
- `make/`: Makefile targets
- `docs/`: decisions and constraints

## Documentation

In French:

- [Spotify API: limits and workarounds](docs/spotify-api.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
