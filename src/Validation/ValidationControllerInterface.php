<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

interface ValidationControllerInterface
{
	public function actionDefault($inputValue = NULL, array $dependentInputs = [], bool $optional = TRUE): void;

	public function getValidationService(): \Pd\Forms\Validation\ValidationServiceInterface;
}
