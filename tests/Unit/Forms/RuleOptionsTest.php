<?php declare(strict_types = 1);

namespace PdTests\Unit\Forms;

require __DIR__ . '/../../bootstrap.php';

/**
 * @testCase
 */
final class RuleOptionsTest extends \Tester\TestCase
{
	/**
	 * @var \Pd\Forms\RuleOptionsFactory
	 */
	private $ruleOptionsFactory;

	/**
	 * @var \Pd\Forms\Validation\ValidationServiceInterface $validationService;
	 */
	private $validationService;

	public function testSerialization(): void
	{
		$optional = $this->ruleOptionsFactory->createOptional();

		\Tester\Assert::same(\Nette\Utils\Json::encode(['optional' => TRUE]), \Nette\Utils\Json::encode($optional));

		$required = $this->ruleOptionsFactory->createRequired()
			->enableAjax(
				'http://ajaxValidationTarget.pecka',
				[
					'first' => 'message',
					'second' => 'message 2',
				],
				$this->validationService
			)
		;

		\Tester\Assert::throws(static function () use ($required): void {
			$required->addDependentInput('some', new \Nette\Forms\Controls\TextInput());
		}, \RuntimeException::class);

		$inputMock = \Mockery::mock(\Nette\Forms\Controls\TextInput::class);
		$inputMock->shouldReceive('getHtmlId')->andReturn('frm-mocked');
		$inputMock->shouldReceive('getForm')->andReturn(NULL); // intentionally

		$required->addDependentInput('first', $inputMock);
		$required->addDependentInput('second', $inputMock);

		$required->addContext('gimme', 'fuel')
			->addContext('gimme 2', ['fuel', 'fire'])
		;

		$serialized = \Nette\Utils\Json::encode($required);
		$expected = \Nette\Utils\Json::encode([
			'optional' => FALSE,
			'ajaxUrl' => 'http://ajaxValidationTarget.pecka',
			'msg' => [
				'timeout' => '_form_validation_timeout',
				'first' => 'message',
				'second' => 'message 2',
			],
			'dependentInputs' => [
				'first' => 'frm-mocked',
				'second' => 'frm-mocked',
			],
			'context' => [
				'gimme' => 'fuel',
				'gimme 2' => [
					'fuel',
					'fire',
				],
			],
		]);

		\Tester\Assert::same($expected, $serialized);
	}


	public function testValidationState(): void
	{
		$required = $this->ruleOptionsFactory->createRequired();

		\Tester\Assert::throws(static function () use ($required): void {
			$required->enableAjax('http://ajaxValidationTarget.pecka');
		}, \RuntimeException::class);
	}


	public function testContextHandling(): void
	{
		$optional = $this->ruleOptionsFactory->createOptional();

		$optional->addContext('gimme', 'fuel');

		\Tester\Assert::same('fuel', $optional->getContext('gimme'));

		\Tester\Assert::throws(static function () use ($optional): void {
			$optional->addContext('gimme', ['fuel', 'fire']);
		}, \Exception::class);

		$optional->addContext('gimme 2', ['fuel', 'fire']);

		\Tester\Assert::same(['fuel', 'fire'], $optional->getContext('gimme 2'));

		\Tester\Assert::throws(static function () use ($optional): void {
			$optional->addContext('class', new class (){});
		}, \InvalidArgumentException::class);
	}


	protected function setUp(): void
	{
		parent::setUp();

		$translator = new class() implements \Nette\Localization\ITranslator {
			public function translate($message, $count = NULL)
			{
				return $message;
			}
		};

		$this->ruleOptionsFactory = new \Pd\Forms\RuleOptionsFactory($translator);

		$this->validationService = new class() implements \Pd\Forms\Validation\ValidationServiceInterface {
			public function validateInput($value, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult
			{
				return new \Pd\Forms\Validation\ValidationResult((bool) \strlen((string) $value));
			}
		};
	}


	public function tearDown(): void
	{
		parent::tearDown();

		\Mockery::close();
	}
}

(new \PdTests\Unit\Forms\RuleOptionsTest())->run();
