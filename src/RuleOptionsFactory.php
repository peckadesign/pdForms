<?php declare(strict_types = 1);

namespace Pd\Forms;

final class RuleOptionsFactory
{
	private const NETTE_RULE = 'netteRule';
	private const NETTE_RULE_ARGS = 'netteRuleArgs';

	/**
	 * @var \Nette\Localization\ITranslator
	 */
	private $translator;


	public function __construct(
		\Nette\Localization\ITranslator $translator
	) {
		$this->translator = $translator;
	}


	public function createOptional(): \Pd\Forms\RuleOptions
	{
		return new \Pd\Forms\RuleOptions($this->translator, TRUE);
	}


	public function createRequired(): \Pd\Forms\RuleOptions
	{
		return new \Pd\Forms\RuleOptions($this->translator, FALSE);
	}


	/**
	 * @param string $netteRule
	 * @param mixed|null $ruleArguments
	 */
	public function createNetteOptional(string $netteRule, $ruleArguments = NULL): \Pd\Forms\RuleOptions
	{
		$options = new \Pd\Forms\RuleOptions($this->translator, TRUE);

		$options->addContext(self::NETTE_RULE, $netteRule);

		if ($ruleArguments !== NULL) {
			if ( ! \is_scalar($ruleArguments) && ! \is_array($ruleArguments)) {
				throw new \InvalidArgumentException(
					\sprintf('Arguments for optional Nette rule must be scalar or array, %s given', \gettype($ruleArguments))
				);
			}

			$options->addContext(self::NETTE_RULE_ARGS, $ruleArguments);
		}

		return $options;
	}
}
