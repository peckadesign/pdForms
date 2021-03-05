<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

interface ValidationServiceInterface
{

	/**
	 * @param mixed $value
	 * @param array<string> $dependentInputs
	 */
	public function validateInput($value, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult;

}
