<?php declare(strict_types = 1);

namespace Pd\Forms\InvisibleReCaptcha;

class InvisibleReCaptchaInputFactory
{
	/**
	 * @var \Contributte\ReCaptcha\ReCaptchaProvider
	 */
	private $reCaptchaProvider;

	/**
	 * @var \Pd\Forms\Versioning\Provider
	 */
	private $versioningProvider;


	public function __construct(
		\Contributte\ReCaptcha\ReCaptchaProvider $reCaptchaProvider,
		\Pd\Forms\Versioning\Provider $versioningProvider

	) {
		$this->reCaptchaProvider = $reCaptchaProvider;
		$this->versioningProvider = $versioningProvider;
	}


	public function create(\Nette\Application\UI\Form $form): \Pd\Forms\InvisibleReCaptcha\InvisibleReCaptchaInput
	{
		return new \Pd\Forms\InvisibleReCaptcha\InvisibleReCaptchaInput($this->reCaptchaProvider, $form, '_msg_spam_detected', $this->versioningProvider);
	}

}
