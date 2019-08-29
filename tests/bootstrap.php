<?php declare(strict_types = 1);

return \call_user_func(static function (): void {
	if (\is_dir(__DIR__ . '/../vendor/')) {
		require_once __DIR__ . '/../vendor/autoload.php';

	}

	if ( ! \class_exists(\Tester\Assert::class)) {
		echo 'Install Nette Tester using `composer install`';
		exit(1);
	}

	\Tester\Environment::setup();

	\date_default_timezone_set('Europe/Prague');
});
