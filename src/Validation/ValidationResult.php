<?php declare(strict_types = 1);

namespace Pd\Forms\Validation;

final class ValidationResult implements \JsonSerializable
{

	private bool $valid;

	private ?string $status;

	/**
	 * @var array<mixed>
	 */
	private array $dependentInputs = [];

	private string $messageType = '';

	private ?string $message = NULL;


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


	/**
	 * @param string $name
	 * @param mixed $value
	 */
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


	public function getMessage(): ?string
	{
		return $this->message;
	}


	public function setMessage(?string $message): void
	{
		$this->message = $message;
	}


	/**
	 * @return array<mixed>
	 */
	public function jsonSerialize()
	{
		$valid = [
			'valid' => $this->valid,
		];

		$rest = [
			'status' => $this->status,
			'messageType' => $this->messageType,
			'dependentInputs' => $this->dependentInputs,
			'message' => $this->message,
		];

		return $valid + \array_filter($rest);
	}

}
