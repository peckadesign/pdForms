## AJAXová validace s vlastním JS callbackem a závislostí na více formulářových polích

Můžete narazit i na situaci, kdy validace vstupu z jednoho pole může být závislá na více hodnotách vyplněných ve formuláři. Pro tuto situaci má `pd/forms` mechanismus závislých inputů. Příkladem může být validace PSČ, kdy chcete kontrolovat, že zadané PSČ a město k sobě patří. A aby toho nebylo málo, ještě chcete nastavit správně zemi v adresním formuláři na základě zadaného města a PSČ, aby uživatel už nemusel vůbec nic dělat 👀 Jak na to? Nejdříve si vytvoříme vlastní backend validátor.

```php
<?php declare(strict_types = 1);

namespace App\Forms;

final class Rules
{
	public const ZIP = self::class . '::zip';

	
	public static function zip(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		return \Pd\Forms\Rules::ajax($control, $options);
	}
}
```

Pravidlo má ajaxovat, ale potřebujeme na frontendu custom oblushu, takže na backendu je to pouze wrapper pro ajaxový validátor. Nyní můžeme přidat pravidlo na formulářový prvek.

```php
$zipRuleOptions = $this->ruleOptionsFactory->createOptional()
	->enableAjax($this->linkGenerator->link('Api:Front:CheckZip:'), $this->zipCodeService)
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_INVALID, '_rule_zip_not_found')
	->addValidationMessage(\App\Forms\RuleOptions::STATUS_INVALID_CITY, '_msg_error_wrong_zip_for_city')
;

/** @var \Nette\Forms\Controls\TextInput $cityInput */
$cityInput = $container->getComponent('city');
/** @var \Nette\Forms\Controls\TextInput $coutryInput */
$coutryInput = $container->getComponent('countryCode');

$zipRuleOptions
	->addDependentInput('city', $cityInput)
	->addDependentInput('country', $countryInput)
;

/** @var \Nette\Forms\Controls\TextInput $zipInput */
$zipInput = $container->getComponent('zip');

$zipInput
	->setRequired()
	->addRule(\Nette\Forms\Form::PATTERN, '_error_msg_invalid_zip', \Pd\Utils\Validators::ZIP_PATTERN)
	->addRule(\App\Forms\Rules::ZIP, \Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE, $zipRuleOptions)
;
```
Koncept rozhraní validační služby a endpointu pro AJAX je popsaný výše, takže zde jen konkrétní implementace:

ValidationService:
```php
<?php declare(strict_types = 1);

namespace App\ZipModule\ZipCode;

class ZipCodeService extends \Pd\Base\Service implements \Pd\Forms\Validation\ValidationServiceInterface
{
	public function validateInput(string $value, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult
	{
		if ($dependentInputs['city']['value']) {
			$result = $this->matchCityAndZip($dependentInputs['city']['value'], $value);
			$validationResult = new \Pd\Forms\Validation\ValidationResult($result !== NULL, $result === NULL ? \App\Forms\RuleOptions::STATUS_INVALID_CITY : NULL);
		} else {
			$result = $this->fetchValidZipCode($value);
			$validationResult = new \Pd\Forms\Validation\ValidationResult($result !== NULL);
		}

		if ($validationResult->isValid() && count($dependentInputs)) {
			$validationResult->addDependentInput($dependentInputs['country']['htmlId'], \Nette\Utils\Strings::upper($result->getCountry()));
		}

		return $validationResult;
	}
}
```

Můžete vidět, že ve validaci na backendu používáme vstupy, tak jak nám přijdou po odeslání formuláře. Proto se při tvorbě formuláře předávají celé inputy (komponenty formuláře). Při ajaxové validaci vám do controlleru dorazí pole htmlId → hodnota v parametru `$dependentInputs` viz `AbstractValidationController`.

ValidationPresenter:
```php
<?php declare(strict_types = 1);

namespace App\ApiModule\FrontModule;

class CheckZipPresenter extends \Pd\Forms\Validation\AbstractValidationController
{
	/**
	 * @var \App\ZipModule\ZipCode\ZipCodeService
	 */
	private $zipCodeService;


	public function __construct(
		\App\ZipModule\ZipCode\ZipCodeService $zipCodeService
	)
	{
		parent::__construct();
		$this->zipCodeService = $zipCodeService;
	}


	public function getValidationService(): \Pd\Forms\Validation\ValidationServiceInterface
	{
		return $this->zipCodeService;
	}
}
```

A nyní se podívejme na frontendové zpracování. Nejprve je nutné vytvořit vlastní JS validátor, který v nejjednodušší podobě může pro AJAXové volání využít obecný validátor `PdFormsRules_ajax`:

```javascript
Nette.validators.AppFormsRules_zip = function(elem, arg, val, value) {
	return Nette.validators.PdFormsRules_ajax(elem, arg, val, value, 'AppFormsRules_zip');
};
```

Důležitý je především poslední parametr předávaný do `Nette.validators.PdFormsRules_ajax`. Ten obsahuje název callbacku, který se spustí po dokončení validace. V případě, že z libovolného důvodu potřebujete AJAXový request ještě nějak upravit nebo rozšířit, prostudujte si implementaci obecného AJAXového validátoru. Nyní již k samotnému callbacku. Ten se definuje v objektu `pdForms.ajaxCallbacks`, a může vypadat například takto: 

```javascript
var pdForms = window.pdForms || {};
pdForms.ajaxCallbacks = pdForms.ajaxCallbacks || {};

pdForms.ajaxCallbacks.AppFormsRules_zip = function(elem, payload, arg) {
    var countryCodeId = typeof arg === 'object' && typeof arg.dependentInputs === 'object' && arg.dependentInputs.country;
    var countryCode = document.getElementById(countryCodeId);

    if (countryCode) {
        countryCode.val(payload.dependentInputs[countryCodeId]);
    }
};
```

Nejdříve si ověříme, zda existuje `pdForms` a v něm objekt `ajaxCallbacks`, podle potřeby inicializujeme a poté bezpečně zaregistrujeme náš callback. Hodnoty nastavené u jednotlivých závislých inputů jsou dostupné v `payload.dependentInputs`, jako klíč slouží html id prvku. To je zároveň dostupné v `arg.dependentInputs` pod klíčem, který zvolil programátor při tvorbě formulářového pravidla (metoda `addDependentInput()`), v tomto případě `country`. Díky tomu je možné stejné pravidlo použít např. pro více dvojic PSČ - stát (fakturační a dodací adresa) a vždy se doplní hodnota do správného inputu.
