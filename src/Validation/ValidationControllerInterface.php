<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

interface ValidationControllerInterface
{
	public function actionDefault($inputValue = NULL, array $dependentInputs = []): void;

	public function getValidationService(): \Pd\Forms\Validation\ValidationServiceInterface;
}
