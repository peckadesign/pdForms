<?php declare(strict_types = 1);

namespace Pd\Forms;

final class Rules
{
	public const PHONE = self::class . '::phone';
	public const CONTAINS_NUMBER = self::class . '::containsNumber';
	public const NO_EXTERNAL_SOURCES = self::class . '::noExternalSources';
	public const AJAX = self::class . '::ajax';


	private function __construct()
	{
	}


	public static function phone(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		if ($options->isOptional()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::isPhone($control->getValue());
	}


	public static function containsNumber(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		if ($options->isOptional()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::containsNumber($control->getValue());
	}


	public static function noExternalSources(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		if ($options->isOptional() || ! $control->getValue()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::notContainsExternalSources($control->getValue());
	}


	/**
	 * @param \Nette\Forms\Controls\BaseControl $control
	 */
	public static function ajax(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		if ($options->isOptional()) {
			return TRUE;
		}
		/** @var \Pd\Forms\Validation\ValidationServiceInterface $validationService */
		$validationService = $options->getValidationService();
		$validationResult = $validationService
			->validateInput($control->getValue(), $options->getNormalizedDependentInputs());

		if ($validationResult->getStatus() === \Pd\Forms\RuleOptions::STATUS_TIMEOUT) {
			return TRUE; // externí služba není dostupná, formulář musí projít
		}

		if ( ! $validationResult->isValid()) {
			$status = $validationResult->getStatus() ?: \Pd\Forms\RuleOptions::STATUS_INVALID;
			$message = $options->getValidationMessage($status);

			if ($message) {
				$control->addError($message);
			}

			return FALSE;
		}

		return TRUE;
	}
}
