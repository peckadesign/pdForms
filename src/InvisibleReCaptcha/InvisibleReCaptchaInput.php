<?php declare(strict_types = 1);

namespace Pd\Forms\InvisibleReCaptcha;

class InvisibleReCaptchaInput extends \Contributte\ReCaptcha\Forms\ReCaptchaField
{

	private ?string $nonce = NULL;

	private \Contributte\ReCaptcha\ReCaptchaProvider $provider;

	private \Nette\Application\UI\Form $form;

	private \Pd\Forms\Versioning\Provider $versioningProvider;

	private ?\Pd\Forms\ContentSecurityPolicy\ContentSecurityPolicyInterface $contentSecurityPolicy = NULL;


	/**
	 * @param \Contributte\ReCaptcha\ReCaptchaProvider $provider
	 */
	public function __construct(
		\Contributte\ReCaptcha\ReCaptchaProvider $provider,
		\Nette\Application\UI\Form $form, string $errorMessage,
		\Pd\Forms\Versioning\Provider $versioningProvider,
		?\Pd\Forms\ContentSecurityPolicy\ContentSecurityPolicyInterface $contentSecurityPolicy = NULL
	)
	{
		parent::__construct($provider);

		$this->setMessage($errorMessage);
		$this->setRequired();

		$this->provider = $provider;
		$this->form = $form;
		$this->versioningProvider = $versioningProvider;
		$this->contentSecurityPolicy = $contentSecurityPolicy;

		$this->setNonce();
	}


	public function getControl(): \Nette\Utils\Html
	{
		$formHtmlId = \sprintf(\Nette\Forms\Controls\BaseControl::$idMask, $this->form->lookupPath()); //pozor: musi se volat az zde, protoze teprve az ted je formular pripojen do nejake komponenty a muzeme volat lookupPath().

		$controlRecaptchaDiv = $this->getReCaptchaDiv();
		$controlRecaptchaSrc = $this->getReCaptchaScript();
		$controlRecaptchaInit = $this->getReCaptchaInitScript($formHtmlId);

		$container = \Nette\Utils\Html::el('span');
		$container->addHtml($controlRecaptchaDiv);
		$container->addHtml($controlRecaptchaSrc);
		$container->addHtml($controlRecaptchaInit);

		return $container;
	}


	/**
	 * @param string|object $caption
	 * @return \Nette\Utils\Html<\Nette\Utils\Html|string>|string
	 */
	public function getLabel($caption = NULL)
	{
		return '';
	}


	private function getReCaptchaScript(): \Nette\Utils\Html
	{
		$script = \Nette\Utils\Html::el('script', [
			'type' => 'text/javascript',
			'nonce' => $this->nonce,
			'src' => $this->versioningProvider->generatePathWithVersion('/js/pdForms.recaptcha.min.js'),
		])->setHtml('');

		return $script;
	}


	private function getReCaptchaInitScript(string $formHtmlId): \Nette\Utils\Html
	{
		$script = \Nette\Utils\Html::el('script', [
			'nonce' => $this->nonce,
		])->setHtml('if (typeof pdForms !== "undefined" && pdForms.recaptcha) { pdForms.recaptcha.initForm("' . $formHtmlId . '"); }');

		return $script;
	}


	private function getReCaptchaDiv(): \Nette\Utils\Html
	{
		$div = \Nette\Utils\Html::el('div');
		$div->addAttributes(
			[
				'class' => 'g-recaptcha',
				'data-sitekey' => $this->provider->getSiteKey(),
				'data-size' => 'invisible',
			]
		);

		return $div;
	}


	private function setNonce(): void
	{
		if ($this->contentSecurityPolicy !== NULL) {
			$this->nonce = $this->contentSecurityPolicy->getNonce();
		}
	}

}
