<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

interface ValidationServiceInterface
{
	public function validateInput($value, bool $optional, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult;
}
