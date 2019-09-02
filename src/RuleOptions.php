<?php declare(strict_types = 1);

namespace Pd\Forms;

final class RuleOptions implements \JsonSerializable
{
	public const STATUS_INVALID = 'invalid';
	public const STATUS_VALID = 'valid';
	public const STATUS_TIMEOUT = 'timeout';

	public const LANG_EMPTY_MESSAGE = '__no_message__';

	public const MESSAGE_ERROR = 'error';
	public const MESSAGE_INFO = 'info';
	public const MESSAGE_VALID = 'valid';

	/**
	 * @var array
	 */
	private $validationMessages = [
		self::STATUS_INVALID => NULL,
		self::STATUS_VALID => NULL,
		self::STATUS_TIMEOUT => '_form_validation_timeout',
	];

	/**
	 * @var \Nette\Localization\ITranslator
	 */
	private $translator;

	/**
	 * @var bool
	 */
	private $optional;

	/**
	 * @var string
	 */
	private $ajaxValidationTarget;

	/**
	 * @var \Pd\Forms\Validation\ValidationServiceInterface|null
	 */
	private $validationService;

	/**
	 * @var array
	 */
	private $dependentInputCollection = [];


	public function __construct(
		\Nette\Localization\ITranslator $translator,
		bool $optional
	) {
		$this->translator = $translator;
		$this->optional = $optional;
	}


	public function isOptional(): bool
	{
		return $this->optional;
	}


	public function enableAjax(
		string $validationLocation,
		array $messages = [],
		?\Pd\Forms\Validation\ValidationServiceInterface $validationService = NULL
	): self
	{
		$this->checkValidationState($validationService);

		$this->ajaxValidationTarget = $validationLocation;
		$this->validationMessages = \array_merge($this->validationMessages, $messages);
		$this->validationService = $validationService;

		return $this;
	}


	/**
	 * @throws \Exception
	 */
	public function addDependentInput(string $name, \Nette\Forms\Controls\BaseControl $input): self
	{
		if (\array_key_exists($name, $this->dependentInputCollection)) {
			throw new \Exception(\sprintf("Dependent input with name '%s' already registered", $name));
		}

		try {
			$input->getForm();
		} catch (\Nette\InvalidStateException $e) {
			throw new \Pd\Exception\InvalidStateException(
				\sprintf("Dependent input '%s' is not attached to form, attach it first", $name)
			);
		}

		$this->dependentInputCollection[$name] = $input;

		return $this;
	}


	public function getValidationService(): ?\Pd\Forms\Validation\ValidationServiceInterface
	{
		return $this->validationService;
	}


	public function getNormalizedDependentInputs(): array
	{
		return \array_map(static function (\Nette\Forms\Controls\BaseControl $control): array {
			return [
				'htmlId' => $control->getHtmlId(),
				'value' => $control->getValue(),
			];
		}, $this->dependentInputCollection);
	}


	public function getValidationMessage(string $key): ?string
	{
		return $this->validationMessages[$key] ?? NULL;
	}


	public function jsonSerialize()
	{
		$serialized = [
			'optional' => $this->optional,
		];

		if ($this->ajaxValidationTarget) {
			$serialized['ajaxUrl'] = $this->ajaxValidationTarget;
			$serialized['msg'] = \array_map(function (string $message): string {
				return $this->translator->translate($message);
			}, \array_filter($this->validationMessages));
		}

		if ($this->dependentInputCollection) {
			$serialized['dependentInputs'] =
				\array_map(static function (\Nette\Forms\Controls\BaseControl $input): string {
					return $input->getHtmlId();
				}, $this->dependentInputCollection)
			;
		}

		return $serialized;
	}


	private function checkValidationState(?\Pd\Forms\Validation\ValidationServiceInterface $validationService = NULL): void
	{
		if ( ! $this->optional && $validationService === NULL) {
			throw new \Pd\Exception\InvalidStateException('Validation service must be defined for required rule');
		}
	}
}
