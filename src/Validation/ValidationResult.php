<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

final class ValidationResult implements \JsonSerializable
{
	/**
	 * @var bool
	 */
	private $valid;

	/**
	 * @var string|null
	 */
	private $status;

	/**
	 * @var array
	 */
	private $dependentInputs;

	/**
	 * @var string
	 */
	private $messageType;


	public function __construct(bool $valid, ?string $status = NULL)
	{
		$this->valid = $valid;
		$this->status = $status;
	}


	public function isValid(): bool
	{
		return $this->valid;
	}


	public function getStatus(): ?string
	{
		return $this->status;
	}


	public function addDependentInput(string $name, $value): void
	{
		$this->dependentInputs[$name] = $value;
	}


	public function getMessageType(): string
	{
		return $this->messageType;
	}


	public function setMessageType(string $messageType): void
	{
		$this->messageType = $messageType;
	}


	public function jsonSerialize()
	{
		$valid = [
			'valid' => $this->valid,
		];

		$rest = [
			'status' => $this->status,
			'messageType' => $this->messageType,
			'dependentInputs' => $this->dependentInputs,
		];

		return $valid + \array_filter($rest);
	}

}
