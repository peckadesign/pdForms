<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

abstract class AbstractValidationController extends \Nette\Application\UI\Presenter implements \Pd\Forms\Validation\ValidationControllerInterface
{
	public function actionDefault($inputValue = NULL, array $dependentInputs = []): void
	{
		if ( ! $inputValue) {
			return;
		}

		$validationResult = $this->getValidationService()->validateInput($inputValue, $dependentInputs);

		$this->sendJson($validationResult);
	}
}
