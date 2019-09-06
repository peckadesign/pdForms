<?php declare(strict_types = 1);

namespace PdTests\Unit\Forms;

require __DIR__ . '/../../bootstrap.php';

/**
 * @testCase
 */
final class RuleOptionsFactoryTest extends \Tester\TestCase
{
	/**
	 * @var \Pd\Forms\RuleOptionsFactory
	 */
	private $ruleOptionsFactory;


	public function testCreateOptions(): void
	{
		$optional = $this->ruleOptionsFactory->createOptional();

		\Tester\Assert::true($optional->isOptional());

		$required = $this->ruleOptionsFactory->createRequired();

		\Tester\Assert::false($required->isOptional());
	}


	protected function setUp(): void
	{
		parent::setUp();

		$translator = new class() implements \Nette\Localization\ITranslator {
			public function translate($message, $count = NULL)
			{
			}
		};

		$this->ruleOptionsFactory = new \Pd\Forms\RuleOptionsFactory($translator);
	}

}

(new \PdTests\Unit\Forms\RuleOptionsFactoryTest())->run();
