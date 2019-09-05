<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

interface ValidationServiceInterface
{
	public function validateInput($value, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult;
}
