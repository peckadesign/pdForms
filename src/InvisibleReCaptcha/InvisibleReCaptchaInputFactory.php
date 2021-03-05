<?php declare(strict_types = 1);

namespace Pd\Forms\InvisibleReCaptcha;

class InvisibleReCaptchaInputFactory
{

	private \Contributte\ReCaptcha\ReCaptchaProvider $reCaptchaProvider;

	private \Pd\Forms\Versioning\Provider $versioningProvider;


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
