.PHONY: build up start down logs worker-logs worker-restart front-logs shell

## ---- Docker ----

build: ## Build des images
	$(COMPOSE) build --pull

up: ## Démarre les conteneurs
	$(COMPOSE) up --wait

start: build up ## Build puis démarre les conteneurs

down: ## Arrête les conteneurs
	$(COMPOSE) down --remove-orphans

logs: ## Logs du conteneur php
	$(COMPOSE) logs -f php

worker-logs: ## Logs du worker Messenger
	$(COMPOSE) logs -f worker

worker-restart: ## Redémarre le worker Messenger (recharge le code)
	$(COMPOSE) restart worker

front-logs: ## Logs du serveur de dev Angular
	$(COMPOSE) logs -f front

shell: ## Shell dans le conteneur php
	$(COMPOSE) exec php bash
