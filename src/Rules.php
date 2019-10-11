<?php declare(strict_types = 1);

namespace Pd\Forms;

final class Rules
{
	public const AJAX = self::class . '::ajax';
	public const NETTE_RULE_PROXY = self::class . '::netteRuleProxy';

	public const PHONE = self::class . '::phone';
	public const CONTAINS_NUMBER = self::class . '::containsNumber';
	public const NO_EXTERNAL_SOURCES = self::class . '::noExternalSources';
	public const CZECH_COMPANY_IDENTIFIER = self::class . '::czechCompanyIdentifier';


	private function __construct()
	{
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
			return TRUE;
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


	/**
	 * Rule is never validated on backend, used for proxying nette rules as optional only
	 */
	public static function netteRuleProxy(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		return TRUE;
	}


	public static function phone(\Nette\Forms\IControl $control, ?\Pd\Forms\RuleOptions $options): bool
	{
		if ($options !== NULL && $options->isOptional()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::isPhone($control->getValue());
	}


	public static function containsNumber(\Nette\Forms\IControl $control, ?\Pd\Forms\RuleOptions $options): bool
	{
		if ($options !== NULL && $options->isOptional()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::containsNumber($control->getValue());
	}


	public static function noExternalSources(\Nette\Forms\IControl $control, ?\Pd\Forms\RuleOptions $options): bool
	{
		if ($options !== NULL && ($options->isOptional() || ! $control->getValue())) {
			return TRUE;
		}

		return \Pd\Utils\Validators::notContainsExternalSources($control->getValue());
	}


	public static function czechCompanyIdentifier(\Nette\Forms\IControl $control, ?\Pd\Forms\RuleOptions $options): bool
	{
		if ($options !== NULL && $options->isOptional()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::isCzechCompanyIdentifier($control->getValue());
	}
}
