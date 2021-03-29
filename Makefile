composer:
	composer validate
	composer update --no-interaction --prefer-dist

cs:
	vendor/bin/phpcs src/ tests/ --ignore="assets/*" --standard=vendor/pd/coding-standard/src/PeckaCodingStandard/ruleset.xml
	vendor/bin/phpcs src/ tests/ --ignore="assets/*" --standard=vendor/pd/coding-standard/src/PeckaCodingStandardStrict/ruleset.xml

phpstan:
	vendor/bin/phpstan analyse --level 8 src/ --no-progress --error-format github

run-tests:
	vendor/bin/tester -C tests/
