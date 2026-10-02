.PHONY: cs-ci phpstan-ci phpunit-ci

## ---- Rapports CI GitLab ----

cs-ci: ## PHP-CS-Fixer rapport GitLab
	@echo "Running PHP CS Fixer…"
	$(EXEC_PHP) bash -o pipefail -c 'mkdir -p $(REPORTS_DIR)/php-cs-fixer && php vendor/bin/php-cs-fixer check --diff --format=gitlab --using-cache=yes | tee $(REPORTS_DIR)/php-cs-fixer/gl-code-quality-report.json'

phpstan-ci: ## PHPStan rapport GitLab
	@echo "Running PHPStan…"
	$(EXEC_PHP) bash -o pipefail -c 'mkdir -p $(REPORTS_DIR)/phpstan && php vendor/bin/phpstan analyse --error-format=gitlab --memory-limit=2G | tee $(REPORTS_DIR)/phpstan/gl-code-quality-report.json'

phpunit-ci: ## PHPUnit rapport JUnit
	@echo "Running PHPUnit tests (CI)…"
	$(PHP) vendor/bin/phpunit --fail-on-empty-test-suite --log-junit $(REPORTS_DIR)/phpunit/junit.xml
