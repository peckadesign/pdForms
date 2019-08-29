<?php declare(strict_types = 1);

namespace Pd\Forms;

final class RuleOptionsFactory
{
	/**
	 * @var \Nette\Localization\ITranslator
	 */
	private $translator;

	/**
	 * @var \Nette\Application\LinkGenerator
	 */
	private $linkGenerator;


	public function __construct(
		\Nette\Localization\ITranslator $translator,
		\Nette\Application\LinkGenerator $linkGenerator
	) {
		$this->translator = $translator;
		$this->linkGenerator = $linkGenerator;
	}


	public function createOptional(): \Pd\Forms\RuleOptions
	{
		return new \Pd\Forms\RuleOptions($this->translator, $this->linkGenerator, TRUE);
	}


	public function createRequired(): \Pd\Forms\RuleOptions
	{
		return new \Pd\Forms\RuleOptions($this->translator, $this->linkGenerator, FALSE);
	}
}
