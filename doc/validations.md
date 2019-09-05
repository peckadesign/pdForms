# Dokumentace

## Názvosloví validací v našem pojetí
- **Live validace**: bezprostřední validace formuláře na straně klienta (v prohlížeči) při vyplňování 
- **Měkká validace**: live validace, která upozorní uživatele na problém v inputu, ale umožní odeslání formluáře (není kontrolována na straně serveru)
- **Ajax validace**: live validace, která pro výsledek validace volá asynchronně zpracování na backendu
- **Standardní validace**: validace, která je zpracována na straně serveru a *může* být kontrolována i na straně klienta

## Pd\Form\Rules + pdForms.js
Knihovna poskytuje nástroje, pomocí kterých je možné zaregistrovat vlastní validační pravidla do Nette\Forms a navíc poskytuje podporu pro live, měkkou a ajaxovou validaci, které lze zaregistrovat  v PHP kódu. Řešení vychází z nativní podpory Nette pro custom validační pravidla https://pla.nette.org/cs/vlastni-validacni-pravidla, ale nespoléhá ani nekopíruje interní quirks Nette frameworku.

## Vlastní pravidla a měkká / tvrdá validace

Vlastní pravidlo s měkkou validací se zaregistruje pomocí konstanty, jejíž obsah je callback na validátor. Dále si vytvoříme objekt RuleOptions pomocí továrny dostupné z balíčku `pd/forms`. Tovární služba je dostupná i pro formuláře vycházející z `Pd\Base\Form`, které se vytváří pomocí metody `Pd\Base\Service::getForm()`, v jiných use casech je možné si továrnu standardně vstříknout z DIC v konstruktoru.

```php
$addressRuleOptions = $this->ruleOptionsFactory->createOptional();

$container->addText('address', '_label_AddressForm_address')
	->setRequired('_msg_AddressForm_address_required')
	->addRule(\Pd\Forms\Rules::CONTAINS_NUMBER, '_msg_pd_rule_contains_number_invalid', $addressRuleOptions);
```
Všimněte si kombinace nastavení `setRequired()` na inputu a `createOptional()` u custom pravidla. Toto nastavení zajistí, že je nutné vyplnit input pro adresu, nelze tedy odeslat prázdný input a navíc je na frontendu konkrolováno, jestli bylo do inputu zadáno číslo. Uživatel je na absenci čísla upozorněn, ale při odeslání adresy bez čísla je formulář odeslán = **měkká validace**.

V případě, kdy bychom chtěli, aby se formulář neodeslal dokud uživatel nevyplní k ulici číslo popisné, vytvořili bychom objekt `$addressRuleOptions` takto:

```php
$addressRuleOptions = $this->ruleOptionsFactory->createRequired();
```

### Dostupná custom pravidla v Pd\Forms
- `Pd\Forms\Rules::PHONE`: validace formátu telefonního čísla
- `Pd\Forms\Rules::CONTAINS_NUMBER`: validace inputu, zda-li obsahuje číslo (používá například u ulice)
- `Pd\Forms\Rules::ZIP`: validace formátu PSČ
- `Pd\Forms\Rules::AJAX`: obecná AJAXová validace
- `Pd\Forms\Rules::CZECH_COMPANY_IDENTIFIER`: validace formátu českého (a slovenského) IČO

### Vlastní validační pravidlo s kontextem
Vytvoření vlastního pravidla na backendu je poměrně jednoduché. Zaregistrujeme jej ideálně do třídy `App\Forms\Rules` následovně:

```php
<?php declare(strict_types = 1);

namespace App\OrderModule\Forms;

final class Rules
{
	public const PPL_ALLOWED_ZIP = self::class . '::pplAllowedZip';


	public static function pplAllowedZip(\Nette\Forms\Controls\TextInput $textInput, \Pd\Forms\RuleOptions $options): bool
	{
		if ($options->isOptional()) {
			return TRUE;
		}

		return \App\OrderModule\Model\DeliveryMethods\DeliveryMethod::pplZipValidator((string) $textInput->getValue());
	}
}
```

Pokud plánujete, že pravidlo má být dostupné i pro měkkou validaci, je nutné zkontrolovat, jestli je pravidlo povinné v objektu `\Pd\Forms\RuleOptions` pomocí metody `isOptional()`. Pravidlo je zaregistrováno přes standardní nette mechanismus, takže k vyhodnocení na backendu dochází vždy. Pokud se jedná o měkkou validaci, považuje se hodnota na backendu za vždy validní.

U některých validací se může objevit potřeba dodat validátoru sadu dat, proti kterým bude hodnotu formulářového pole validovat. Tato může být v čase proměnná, takže ji nelze hard kodóvat do validátoru. Taková data předáme pravidlu jako kontext.

```php
$zipRuleOptions = $this->ruleOptionsFactory->createRequired()
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_VALID, '_label_allowed_ppl_zip')
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_INVALID, '_label_wrong_ppl_zip')
	->addContext('allowedPplZips', \App\OrderModule\Model\DeliveryMethods\DeliveryMethod::$allowedPPLZips)
;

$zip->addText('zip');
$zip->addConditionOn($deliveryUse, \Nette\Forms\Form::EQUAL, FALSE)
	->addRule(App\OrderModule\Forms\Rules::PPL_ALLOWED_ZIP, '_label_wrong_ppl_zip', $zipRuleOptions)
;
```
Data kontextu se serializují k inputu a můžete jak tak použít ve frontendovém validátoru. Na příkladu si také můžete všimnout, že na tyto custom validace lze využívat podmínky a větvení jak jste zvyklý ze standardních Nette pravidel. Krom toho je možné přidat hlášku, která se zobrazí v případě úspěšného zvalidování inputu.

Na backendu je hotovo, nyní je potřeba k danému pravidlu vytvořit i frontendový validátor. Ten je potřeba zaregistrovat v projektovém `pdForms.project.js`, který by se měl do HTML vložit mezi `netteForms.js` (aby bylo nadefinované `Nette.validators`) a `pdForms.js` (aby v době inicializace již byla všechna pravidla nadefinována).

```javascript
(function() {

	Nette.validators.AppOrderModuleFormsRules_pplAllowedZip = function(elem, arg, val) {
		if (typeof arg !== 'object' || typeof arg.context !== 'object' || typeof arg.context.allowedPplZips !== 'object') {
			return true;
		}

		var zip = parseInt(val.replace(/\s+/g, ''));

		for (var i = 0; i < arg.context.allowedPplZips.length; i++) {
			var rule = arg.context.allowedPplZips[i];
			if (rule.from <= zip && zip <= rule.to) {
				return true;
			}
		}

		return false;
	};

})();
```

Název JS validátoru (funkce) vychází z názvu konstanty definované v PHP třídě a z jejího kompletního FQN `App\OrderModule\Forms\Rules::pplAllowedZip` → `AppOrderModuleFormsRules_pplAllowedZip`.


## Je libo AJAX?
Existují případy, kdy je třeba ověřit hodnotu přes externí službu, případně udělat složitější validaci. Pokud chceme, aby proběhla live a uživatel se o výsledku validace dozvěděl co nejdříve, zapojíme AJAX. Chceme validovat platnost zákaznické karty proti externí službě a přidat více stavů validace.

```php
$cardLevel = $form->addText('cardLevel');

$cardLevelRuleOptions = $this->ruleOptionsFactory->createRequired()
	->enableAjax($this->link(':PharmacyCard:Front:Validate:'), $this->pharmacyCardValidator)
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_INVALID, '_error_msg_invalid_card')
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_VALID, '_error_msg_valid_card')
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_TIMEOUT, '_error_msg_timeout_card')
	->addValidationMessage(\App\PharmacyCardModule\Forms\RuleOptions::STATUS_MISSING_AGREEMENT_CONSENT, '_msg_pharmacy_card_missing_consents')
;

$cardLevel->addCondition(\Pd\Base\Form::FILLED)
	->addRule(\Pd\Forms\Rules::AJAX, \Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE, $cardLevelRuleOptions)
;
```

Projdeme si registraci krok po kroku. Nejdříve vytvoříme tvrdé validační pravdilo (`createRequired`) a na něm zapneme ověření ajaxem (`enableAjax`). Prvním parametrem je URL, kde se má provést validace AJAX validace volaná z frontendu. Druhým parametrem je validační služba, která provede backendovou validaci po odeslání formuláře. Pro jendoduší implementaci jsou pro obě strany připravena jednoduchá rozhraní - `Pd\Forms\Validation\ValidationServiceInterface` a `Pd\Forms\Validation\ValidationControllerInterface`, které stačí implementovat na daných službách. Balíček obsahuje i standardní controller/presenter `\Pd\Forms\Validation\AbstractValidationController`, který provede validaci a vrátí výsledek, tak jak jej očekávají frontedové skripty. Stačí si jej podědit a dodat validační službu. Takto to vypadá v kódu:

Validační služba:
```php
<?php declare(strict_types = 1);

namespace App\PharmacyCardModule\Model;

class PharmacyCardValidator implements \Pd\Forms\Validation\ValidationServiceInterface
{
	public function validateInput($value, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult
	{
		$result = $this->getCardValidationResponse($value);

		$valid = (bool) $result['valid'];

		if (isset($result['agreementsMessage'])) {
			$validationResult = new \Pd\Forms\Validation\ValidationResult(
				$valid,
				\App\PharmacyCardModule\Forms\RuleOptions::STATUS_MISSING_AGREEMENT_CONSENT
			);
			$validationResult->setMessageType(\Pd\Forms\RuleOptions::MESSAGE_ERROR);

			return $validationResult;
		}

		return new \Pd\Forms\Validation\ValidationResult($valid);
	}

	public function getCardValidationResponse(string $cardNumber): array
	{
		// business logic here
	}
}
```

Rozhraní validační služby má jedinou metodu a to `validateInput()`. Pro vaši validaci to stačí wrapnout na existující metodu a sestavit si odpověď pomocí objektu `Pd\Forms\Validation\ValidationResult`.

Validační presenter:
```php
<?php declare(strict_types = 1);

namespace App\PharmacyCardModule\FrontModule;

final class ValidatePresenter extends \Pd\Forms\Validation\AbstractValidationController
{
	/**
	 * @var \App\PharmacyCardModule\Model\PharmacyCardValidator
	 */
	private $pharmacyCardValidator;


	public function __construct(\App\PharmacyCardModule\Model\PharmacyCardValidator $pharmacyCardValidator)
	{
		parent::__construct();
		$this->pharmacyCardValidator = $pharmacyCardValidator;
	}


	public function getValidationService(): \Pd\Forms\Validation\ValidationServiceInterface
	{
		return $this->pharmacyCardValidator;
	}
}
```

Pokud potřebujete něco víc custom, můžete si endpoint pro ajax vytvořit dle libosti a zaslat odpověď ve formátu jaký potřebujete, jen si budete muset dodělat frontendovou obsluhu.

Dále na příkladu vidíte, že validace může mít více stavů než jen validní nevalidní. Můžete si přidat libovolný počet zpráv, které lze na frontendu libovolně vizualizovat dle toho, co se vám vrátí v odpovědi. Standardní ajaxové pravidlo `Pd\Forms\Rules::AJAX` obsahuje vizualizaci pro výchozí stavy `VALID`, `INVALID` a `TIMEOUT`.

Pro použití více chybových stavů, než jen `INVALID` je nutné do metody `addRule` jako parametr `message` předat hodnotu `\Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE`. V opačném případě se při vypnutém JS zobrazí vždy `INVALID` zpráva a k ní ještě případný další nevalidní stav. Toto se netýká případu AJAXových pravidel, pokud definujete pouze `VALID` nebo `TIMEOUT` zprávu, v takovém případě je možno `INVALID` zprávu předat klasicky v `addRule` jako druhý parametr `message`. V latte šabloně je potřeba přeskakovat tuto chybovou hlášku, např. takto:

```smarty
{foreach $inp->getErrors() as $error}
	{continueIf $error === \Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE}
	<label for="{$inp->getHtmlId()}" data-elem="{$inp->getHtmlName()}" class="inp-error pdforms-message">{=$error|translate}</label>
{/foreach}
```  

Všimněte si atributu `data-elem`, který slouží k provázání chybové hlášky s konkrétním inputem, na kterém vznikla chyba. Podle této vazby pak JS live validace odstraní chybu při úspěšném zvalidování.

Nyní již stačí pravidlo přidat na formulářový prvek. Ajaxové pravidlo je předdefinovano v balíčku v konstantě `Pd\Forms\Rules::AJAX`, přidáme výchozí zprávu pro nevalidní stav a naše custom nastavení pravidla. 

Ajaxové pravidlo je implementováno obecně s využitím knihovny nette.ajax.js, takže nepotřebujete implementovat frontendovou obsluhu. Voilá, máte tvrdou ajaxovou validaci funkční na frontendu i backendu :heart_eyes:


## AJAXová validace s vlastním JS callbackem a závislostí na více formulářových polích

Můžete narazit i na situaci, kdy validace vstupu z jednoho pole může být závislá na více hodnotách vyplněných ve formuláři. I pro tuto situaci má `pd/forms` mechanismus závislých inputů. Příkladem může být validace PSČ, kdy chcete kontrolovat, že zadané PSČ a město spolu souhlasí. A aby toho nebylo málo, ještě chcete nastavit správně zemi, aby uživatel už nemusel vůbec nic dělat 👀 Nejdříve si vytvoříme vlastní backend validátor.

```php
<?php declare(strict_types = 1);

namespace App\Forms;

final class Rules
{

	public const ZIP = self::class . '::zip';

	
	public static function zip(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		return \Pd\Forms\Rules::validateAjax($control, $options);
	}
}
```

A nyní můžeme přidat pravidlo na formulářový prvek.

```php
$zipRuleOptions = $this->ruleOptionsFactory->createOptional()
	->enableAjax($this->linkGenerator->link('Api:Front:CheckZip:'), $this->zipCodeService)
	->addValidationMessage(\Pd\Forms\RuleOptions::STATUS_INVALID, '_rule_zip_not_found')
	->addValidationMessage(\App\Forms\RuleOptions::STATUS_INVALID_CITY, '_msg_error_wrong_zip_for_city')
;

/** @var \Nette\Forms\Controls\TextInput $cityInput */
$cityInput = $container->getComponent('city');

$zipRuleOptions
	->addDependentInput('city', $cityInput)
	->addDependentInput('country', $countryCode)
;

/** @var \Nette\Forms\Controls\TextInput $zipInput */
$zipInput = $container->getComponent('zip');

$zipInput
	->setRequired()
	->addRule(\Nette\Forms\Form::PATTERN, '_error_msg_invalid_zip', \Pd\Utils\Validators::ZIP_PATTERN)
	->addRule(\App\Forms\Rules::ZIP, \Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE, $zipRuleOptions)
;
```
Koncept rozhraní validační služby a endpointu pro ajax je popsaný výše, takže zde je konkrétní implementace:

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

Můžete vidět, že ve validaci na backendu používáme vstupy, tak jak nám přijdou po odeslání formuláře. Proto se při tvorbě formuláře předávají celé inputy. Při ajaxové validaci vám do controlleru dorazí pole htmlId → hodnota v parametru `$dependentInputs` viz `AbstractValidationController`.

ValidationPresenter:
```php
<?php declare(strict_types = 1);

namespace App\ApiModule\FrontModule;

class CheckZipPresenter extends \Pd\Forms\Validation\ValidationController
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

A nyní se podívejme na frontendové zpracování. Nejprve je nutné vytvořit vlastní JS validátor, který v nejjednodušší podobě může pro AJAXové volání využít obecný validátor `PdFormsRules_validateAjax`:

```javascript
Nette.validators.AppFormsRules_zip = function(elem, arg, val, value) {
	return Nette.validators.PdFormsRules_validateAjax(elem, arg, val, value, 'AppFormsRules_zip');
};
```

Důležitý je především poslední parametr předávaný do `Nette.validators.PdFormsRules_validateAjax`. Ten obsahuje název callbacku, který se spustí po dokončení validace. V případě, že z libovolného důvodu potřebujete AJAXový request ještě nějak upravit nebo rozšířit, prostudujte si implementaci obecného AJAXového validátoru. Nyní již k samotnému callbacku. Ten se definuje v objektu `pdForms.ajaxCallbacks`, a může vypadat například takto: 

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

Nejdříve si ověříme, zda existuje `pdForms` a v něm objekt `ajaxCallbacks`, podle potřeby inicializujeme a poté bezpečně zaregistrujeme náš callback. Hodnoty nastavené u jednotlivých dependentInputs jsou dostupné v `payload.dependentInputs`, jako klíč slouží html id prvku. To je zároveň dostupné v `arg.dependentInputs` pod klíčem, který zvolil programátor při tvorbě formulářového pravidla (metoda `addDependentInput`), v tomto případě `country`. Díky tomu je možné stejné pravidlo použít např. pro více dvojic PSČ - stát (fakturační a dodací adresa) a vždy se doplní hodnota do správného inputu.
