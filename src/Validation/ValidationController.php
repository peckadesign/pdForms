<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

abstract class ValidationController extends \Nette\Application\UI\Presenter implements \Pd\Forms\Validation\ValidationControllerInterface
{
	public function actionDefault($inputValue = NULL, array $dependentInputs = [], bool $optional = TRUE): void
	{
		if ( ! $inputValue) {
			return;
		}

		$validationResult = $this->getValidationService()->validateInput($inputValue, $dependentInputs);

		if ( ! $validationResult->isValid() && ! $optional) {
			$validationResult->setMessageType(\Pd\Forms\RuleOptions::MESSAGE_ERROR);
		}

		$this->sendJson($validationResult);
	}
}
