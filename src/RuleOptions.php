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

	/**
	 * @var array
	 */
	private $contextStorage = [];


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
		?\Pd\Forms\Validation\ValidationServiceInterface $validationService = NULL
	): self
	{
		$this->checkValidationState($validationService);

		$this->ajaxValidationTarget = $validationLocation;
		$this->validationService = $validationService;

		return $this;
	}


	public function addValidationMessage(string $key, string $message): self
	{
		$this->validationMessages[$key] = $message;

		return $this;
	}


	public function getValidationMessage(string $key): ?string
	{
		return $this->validationMessages[$key] ?? NULL;
	}


	/**
	 * @throws \Pd\Forms\Exceptions\InvalidKeyException
	 */
	public function addDependentInput(string $name, \Nette\Forms\Controls\BaseControl $input): self
	{
		if (\array_key_exists($name, $this->dependentInputCollection)) {
			throw new \Pd\Forms\Exceptions\InvalidKeyException(\sprintf("Dependent input with name '%s' already registered", $name));
		}

		try {
			$input->getForm();
		} catch (\Nette\InvalidStateException $e) {
			throw new \RuntimeException(
				\sprintf("Dependent input '%s' is not attached to form, attach it first", $name)
			);
		}

		$this->dependentInputCollection[$name] = $input;

		return $this;
	}


	/**
	 * @param string $name
	 * @param mixed $context
	 * @throws \Pd\Forms\Exceptions\InvalidKeyException
	 */
	public function addContext(string $name, $context): self
	{
		if (\array_key_exists($name, $this->contextStorage)) {
			throw new \Pd\Forms\Exceptions\InvalidKeyException(\sprintf("Context with name '%s' already registered", $name));
		}

		if ( ! \is_scalar($context) && ! \is_array($context) && ! ($context instanceof \JsonSerializable)) {
			throw new \InvalidArgumentException(
				\sprintf("Only scalar, array or JsonSerializable implementor are allowed as context value, %s provided", \gettype($context))
			);
		}

		$this->contextStorage[$name] = $context;

		return $this;
	}


	/**
	 * @return mixed|null
	 * @throws \Pd\Forms\Exceptions\InvalidKeyException
	 */
	public function getContext(string $name)
	{
		if ( ! \array_key_exists($name, $this->contextStorage)) {
			throw new \Pd\Forms\Exceptions\InvalidKeyException(\sprintf("Context '%s' not found in storage", $name));
		}

		return $this->contextStorage[$name] ?? NULL;
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


	public function jsonSerialize()
	{
		$serialized = [
			'optional' => $this->optional,
		];

		$messages = \array_filter($this->validationMessages);

		if ($this->ajaxValidationTarget) {
			$serialized['ajaxUrl'] = $this->ajaxValidationTarget;
		} else {
			unset($messages[self::STATUS_TIMEOUT]);
		}

		if (\count($messages)) {
			$serialized['msg'] = \array_map(function (string $message): string {
				return $this->translator->translate($message);
			}, $messages);
		}

		if (\count($this->dependentInputCollection)) {
			$serialized['dependentInputs'] =
				\array_map(static function (\Nette\Forms\Controls\BaseControl $input): string {
					return $input->getHtmlId();
				}, $this->dependentInputCollection)
			;
		}

		if (\count($this->contextStorage)) {
			$serialized['context'] = $this->contextStorage;
		}

		return $serialized;
	}


	private function checkValidationState(?\Pd\Forms\Validation\ValidationServiceInterface $validationService = NULL): void
	{
		if ( ! $this->optional && $validationService === NULL) {
			throw new \RuntimeException('Validation service must be defined for required rule');
		}
	}
}
