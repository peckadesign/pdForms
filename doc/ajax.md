## Je libo AJAX?
Existují případy, kdy je třeba ověřit hodnotu přes externí službu, případně udělat složitější validaci. Pokud chceme, aby proběhla live a uživatel se o výsledku validace dozvěděl co nejdříve, zapojíme AJAX. Například potřebujeme validovat platnost zákaznické karty proti externí službě a na základě vráceného výsledku přidat více stavů validace než jen validní / nevalidní.

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

Projdeme si registraci pravidla krok po kroku. Nejdříve vytvoříme tvrdé validační pravdilo (`createRequired()`) a na něm zapneme ověření ajaxem (`enableAjax()`). Prvním parametrem je URL endpointu, kde se má provést AJAX validace volaná z frontendu. Druhým parametrem je validační služba, která provede backendovou validaci po odeslání formuláře. Pro jendoduší implementaci jsou pro obě strany připravena jednoduchá rozhraní - `Pd\Forms\Validation\ValidationServiceInterface` a `Pd\Forms\Validation\ValidationControllerInterface`, které stačí implementovat na daných službách. Balíček obsahuje i standardní controller/presenter `\Pd\Forms\Validation\AbstractValidationController`, který provede validaci a vrátí výsledek, tak jak jej očekávají frontedové skripty z balíčku `pd/forms`. Stačí si jej podědit a dodat validační službu. Takto to vypadá v kódu:

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

Dále na příkladu vidíte, že validace může mít více stavů než jen validní/nevalidní. Můžete si přidat libovolný počet zpráv, které lze na frontendu vizualizovat dle toho, co se vám vrátí v odpovědi. Standardní ajaxové pravidlo `Pd\Forms\Rules::AJAX` obsahuje vizualizaci pro výchozí stavy `Pd\Forms\RuleOptions::STATUS_VALID`, `Pd\Forms\RuleOptions::STATUS_INVALID` a `Pd\Forms\RuleOptions::STATUS_TIMEOUT`.

Pro použití více chybových stavů, než jen `INVALID` (v příkladu výše to je stav `\App\PharmacyCardModule\Forms\RuleOptions::STATUS_MISSING_AGREEMENT_CONSENT`) je nutné do metody `addRule()` jako parametr `message` předat hodnotu `\Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE`. V opačném případě se při vypnutém JS zobrazí vždy `INVALID` zpráva a k ní ještě případné další nevalidní stavy. Toto se netýká případu AJAXových pravidel, pokud definujete pouze `VALID` nebo `TIMEOUT` zprávu, v takovém případě je možno `INVALID` zprávu předat klasicky v `addRule` jako druhý parametr `message`. V Latte šabloně je potřeba přeskakovat tuto chybovou hlášku, např. takto:

```smarty
{foreach $inp->getErrors() as $error}
	{continueIf $error === \Pd\Forms\RuleOptions::LANG_EMPTY_MESSAGE}
	<label for="{$inp->getHtmlId()}" data-elem="{$inp->getHtmlName()}" class="inp-error pdforms-message">{=$error|translate}</label>
{/foreach}
```  

Všimněte si atributu `data-elem`, který slouží k provázání chybové hlášky s konkrétním inputem, na kterém vznikla chyba. Podle této vazby pak JS live validace odstraní chybu při úspěšném zvalidování.

Nyní již stačí pravidlo přidat na formulářový prvek. Ajaxové pravidlo je předdefinovano v balíčku v konstantě `Pd\Forms\Rules::AJAX`, přidáme výchozí zprávu pro nevalidní stav (případně `NO_MESSAGE`) a naše custom nastavení pravidla. 

Ajaxové pravidlo je implementováno obecně s využitím knihovny `nette.ajax.js`, takže nepotřebujete implementovat frontendovou obsluhu. Voilá, máte tvrdou ajaxovou validaci funkční na frontendu i backendu :heart_eyes:
