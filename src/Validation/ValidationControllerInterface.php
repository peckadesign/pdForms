<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

interface ValidationControllerInterface
{

	/**
	 * @param mixed $inputValue
	 * @param array<string, array<string, mixed>> $dependentInputs
	 */
	public function actionDefault($inputValue = NULL, array $dependentInputs = []): void;


	public function getValidationService(): \Pd\Forms\Validation\ValidationServiceInterface;

}
