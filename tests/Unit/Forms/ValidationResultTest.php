<?php declare(strict_types = 1);

namespace PdTests\Unit\Forms;

require __DIR__ . '/../../bootstrap.php';

/**
 * @testCase
 */
final class ValidationResultTest extends \Tester\TestCase
{

	public function testSerialization(): void
	{
		$validationResult = new \Pd\Forms\Validation\ValidationResult(TRUE);

		$expected = [
			'valid' => TRUE,
		];

		\Tester\Assert::same(\Nette\Utils\Json::encode($expected), \Nette\Utils\Json::encode($validationResult));

		$validationResult = new \Pd\Forms\Validation\ValidationResult(FALSE, 'with status');

		$expected = [
			'valid' => FALSE,
			'status' => 'with status',
		];

		\Tester\Assert::same(\Nette\Utils\Json::encode($expected), \Nette\Utils\Json::encode($validationResult));

		$expected += ['messageType' => 'error'];
		$validationResult->setMessageType('error');

		\Tester\Assert::same(\Nette\Utils\Json::encode($expected), \Nette\Utils\Json::encode($validationResult));

		$dependentInputs = ['first' => 1, 'second' => 2];

		$expected += ['dependentInputs' => $dependentInputs];
		$validationResult->addDependentInput('first', 1);
		$validationResult->addDependentInput('second', 2);

		\Tester\Assert::same(\Nette\Utils\Json::encode($expected), \Nette\Utils\Json::encode($validationResult));

		$validationResultWithMessage = new \Pd\Forms\Validation\ValidationResult(TRUE);
		$validationResultWithMessage->setMessage('My message');

		$expected = [
			'valid' => TRUE,
			'message' => 'My message',
		];

		\Tester\Assert::same(\Nette\Utils\Json::encode($expected), \Nette\Utils\Json::encode($validationResultWithMessage));
	}


	public function testResultDynamicMessage(): void
	{
		$validation = new \Pd\Forms\Validation\ValidationResult(TRUE);
		\Tester\Assert::null($validation->getMessage());
		$validation->setMessage('Test');
		\Tester\Assert::equal('Test', $validation->getMessage());
	}

}

(new \PdTests\Unit\Forms\ValidationResultTest())->run();
