<?php declare(strict_types = 1);

namespace Pd\Forms\InvisibleReCaptcha;

class InvisibleReCaptchaInputFactory
{
	/**
	 * @var \Contributte\ReCaptcha\ReCaptchaProvider
	 */
	private $reCaptchaProvider;


	public function __construct(
		\Contributte\ReCaptcha\ReCaptchaProvider $reCaptchaProvider

	) {
		$this->reCaptchaProvider = $reCaptchaProvider;
	}


	public function create(\Nette\Application\UI\Form $form): \Pd\Forms\InvisibleReCaptcha\InvisibleReCaptchaInput
	{
		return new \Pd\Forms\InvisibleReCaptcha\InvisibleReCaptchaInput($this->reCaptchaProvider, $form, '_msg_spam_detected');
	}

}
