.PHONY: ci composer-validate lint-symfony doctrine-validate cache-warmup-prod cs-check cs-fix rector-check rector-fix phpstan-check security-audit phpunit

## ---- Validation ----

composer-validate: ## Valide composer.json/lock
	@echo "Validating composer.json…"
	$(COMPOSER) validate --strict --no-check-publish

## ---- Qualité ----

lint-symfony: ## Linters Symfony (YAML, Container)
	@echo "Running Symfony linters…"
	$(SYMFONY) lint:yaml config --parse-tags
	$(SYMFONY) lint:container --env=prod

doctrine-validate: ## Valide le mapping Doctrine
	@echo "Validating Doctrine schema…"
	$(SYMFONY) doctrine:schema:validate --skip-sync

cache-warmup-prod: ## Warmup du cache prod (erreurs DI/config)
	@echo "Warming up prod cache…"
	$(EXEC_PHP) env APP_DEBUG=0 APP_ENV=prod php bin/console cache:warmup

cs-check: ## PHP-CS-Fixer dry-run
	@echo "Dry run PHP CS Fixer…"
	$(PHP) vendor/bin/php-cs-fixer check --diff --verbose

cs-fix: ## PHP-CS-Fixer applique les corrections
	@echo "Running PHP CS Fixer…"
	$(PHP) vendor/bin/php-cs-fixer fix --verbose

rector-check: ## Rector dry-run
	@echo "Running Rector…"
	$(PHP) vendor/bin/rector process --dry-run

rector-fix: ## Rector applique les refactorings
	@echo "Running Rector…"
	$(PHP) vendor/bin/rector process

phpstan-check: ## Analyse PHPStan
	@echo "Running PHPStan…"
	$(SYMFONY) cache:warmup --env=dev -q
	$(PHP) vendor/bin/phpstan analyse --memory-limit=512M

security-audit: ## Audit de sécurité Composer
	@echo "Running Composer security audit…"
	$(COMPOSER) audit --locked --abandoned=report

## ---- Tests ----

phpunit: ## PHPUnit - tous les tests
	@echo "Running PHPUnit tests…"
	$(PHP) vendor/bin/phpunit --testdox

## ---- CI locale ----

ci: composer-validate security-audit lint-symfony doctrine-validate cache-warmup-prod cs-check rector-check phpstan-check phpunit front-build ## CI locale complète
