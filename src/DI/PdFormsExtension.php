<?php declare(strict_types = 1);

namespace Pd\Forms\DI;

final class PdFormsExtension extends \Nette\DI\CompilerExtension
{
	public function loadConfiguration(): void
	{
		$builder = $this->getContainerBuilder();

		$builder->addDefinition($this->prefix('ruleOptionsFactory'))
			->setFactory(\Pd\Forms\RuleOptionsFactory::class)
		;
	}
}
