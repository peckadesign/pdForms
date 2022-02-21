<?php declare(strict_types = 1);

namespace Pd\Forms\InvisibleReCaptcha;

class InvisibleReCaptchaInputFactory
{

	private \Contributte\ReCaptcha\ReCaptchaProvider $reCaptchaProvider;

	private \Pd\Forms\Versioning\Provider $versioningProvider;

	private ?\Pd\Forms\ContentSecurityPolicy\ContentSecurityPolicyInterface $contentSecurityPolicy = NULL;


	public function __construct(
		\Contributte\ReCaptcha\ReCaptchaProvider $reCaptchaProvider,
		\Pd\Forms\Versioning\Provider $versioningProvider,
		?\Pd\Forms\ContentSecurityPolicy\ContentSecurityPolicyInterface $contentSecurityPolicy = NULL

	) {
		$this->reCaptchaProvider = $reCaptchaProvider;
		$this->versioningProvider = $versioningProvider;
		$this->contentSecurityPolicy = $contentSecurityPolicy;
	}


	public function create(\Nette\Application\UI\Form $form): \Pd\Forms\InvisibleReCaptcha\InvisibleReCaptchaInput
	{
		return new \Pd\Forms\InvisibleReCaptcha\InvisibleReCaptchaInput($this->reCaptchaProvider, $form, '_msg_spam_detected', $this->versioningProvider, $this->contentSecurityPolicy);
	}

}
