<?php declare(strict_types = 1);

namespace Pd\Forms;

final class RuleOptionsFactory
{
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
}
