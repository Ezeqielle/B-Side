.PHONY: front-build front-test ng

## ---- Front (Angular) ----

ng: ## Commande Angular CLI : make ng c="g component features/stats"
	$(EXEC_FRONT) npx ng $(c)

front-build: ## Build de prod Angular
	$(EXEC_FRONT) npx ng build

front-test: ## Tests unitaires Angular (Vitest)
	$(EXEC_FRONT) npx ng test --watch=false
