# CLAUDE.md

Monorepo : `api/` (Symfony 8.1, PHP 8.5) et `front/` (Angular 22, spartan/ui, Tailwind v4), orchestrés par Docker Compose à la racine.

- Conventions backend : `api/AGENTS.md`. Conventions front : `front/CLAUDE.md`.
- Tout tourne dans Docker : passer par `make` (`make help`), pas par php/node en local (Node local non supporté par Angular 22).
- Décisions et contraintes de l'API Spotify : `docs/`. À relire avant d'utiliser un endpoint Spotify : beaucoup ont été supprimés.
- Installer avec `composer require` / `npm install` / `ng g @spartan-ng/cli:ui <composant>`, jamais d'ajout de bundle à la main.
- Qualité backend : `make rector-fix`, `make cs-fix`, puis `make ci`.
