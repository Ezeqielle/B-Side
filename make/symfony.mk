.PHONY: sf composer cc migration migrate db-test

## ---- Symfony ----

sf: ## Commande console : make sf c="debug:router"
	$(SYMFONY) $(c)

composer: ## Commande composer : make composer c="require symfony/lock"
	$(COMPOSER) $(c)

cc: ## Vide le cache
	$(SYMFONY) cache:clear

migration: ## Génère une migration à partir des entités
	$(SYMFONY) make:migration --no-interaction

migrate: ## Joue les migrations
	$(SYMFONY) doctrine:migrations:migrate --no-interaction --all-or-nothing

db-test: ## (Re)crée la base de test
	$(SYMFONY) doctrine:database:drop --env=test --force --if-exists
	$(SYMFONY) doctrine:database:create --env=test
	$(SYMFONY) doctrine:migrations:migrate --env=test --no-interaction
