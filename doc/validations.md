# Dokumentace

## Názvosloví validací v našem pojetí
- **Live validace**: bezprostřední validace formuláře na straně klienta (v prohlížeči) při vyplňování 
- **Měkká validace**: live validace, která upozorní uživatele na problém v inputu, ale umožní odeslání formluáře (není kontrolována na straně serveru)
- **Ajax validace**: live validace, která pro výsledek validace volá asynchronně zpracování na backendu
- **Standardní validace**: validace, která je zpracována na straně serveru a *může* být kontrolována i na straně klienta

## Pd\Form\Rules + pdForms.js
Knihovna poskytuje nástroje, pomocí kterých je možné zaregistrovat vlastní validační pravidla do Nette\Forms a navíc poskytuje podporu pro live, měkkou a ajaxovou validaci, které lze zaregistrovat  v PHP kódu. Řešení vychází z nativní podpory Nette pro custom validační pravidla https://pla.nette.org/cs/vlastni-validacni-pravidla, ale nespoléhá ani nekopíruje interní quirks Nette frameworku.

## Vlastní pravidla a měkká / tvrdá validace

Vlastní pravidlo s měkkou validací se zaregistruje pomocí konstanty, jejíž obsah je callback na validátor. Dále si vytvoříme objekt RuleOptions pomocí továrny dostupné z balíčku Pd\Forms. Tovární služba je dostupná i pro formuláře vycházející z Pd\Base\Form, které se vytváří pomocí metody `Pd\Base\Service::getForm()`, v jiných use casech je možná si továrnu standardně vstříknout z DIC v konstruktoru.

```php
$addressRuleOptions = $this->ruleOptionsFactory->createOptional();

$container->addText('address', '_label_AddressForm_address')
	->setRequired('_msg_AddressForm_address_required')
	->addRule(\Pd\Forms\Rules::CONTAINS_NUMBER, '_msg_pd_rule_contains_number_invalid', $addressRuleOptions);
```
Všimněte si kombinace nastavení `setRequired()` na inputu a `createOptional()` u custom pravidla. Toto nastavení provede, že je nutné vyplnit pole adresa, nelze tedy odeslat prázdné pole a navíc je na frontendu konkrolováno, jestli pole obsahuje číslo. Uživatel je na absenci čísla upozorněn, ale při odeslání adresy bez čísla je formulář odeslán = **měkká validace**.

V případě, že bychom chtěli, aby se formulář neodeslal dokud uživatel nevyplní k ulici číslo popisné, vytvořili bychom objekt $addressRuleOptions takto:

```php
$addressRuleOptions = $this->ruleOptionsFactory->createRequired();
```

### Dostupná custom pravidla v Pd\Forms
- `Pd\Forms\Rules::PHONE`: validace formátu telefonního čísla
- `Pd\Forms\Rules::CONTAINS_NUMBER`: validace inputu, zda-li obsahuje číslo (používá například u ulice)
- `Pd\Forms\Rules::AJAX`: obecná AJAXová validace

### Vlastní validační pravidlo
Vytvoření vlastního pravidla na backendu je poměrně jednoduché. Zaregistrujeme jej ideálně do třídy `App\Forms\Rules` následovně:

```php
<?php declare(strict_types = 1);

namespace App\Forms;

final class Rules
{

	public const ZIP = self::class . '::validateZip';


	public static function validateZip(\Nette\Forms\IControl $control, \Pd\Forms\RuleOptions $options): bool
	{
		if ($options->isOptional()) {
			return TRUE;
		}

		return \Pd\Utils\Validators::isZip($control->getValue());
	}
}
```

Pokud plánujete, že pravidlo má být dostupné i pro měkkou validaci, je nutné zkontrolovat, jestli je pravidlo povinné v objektu \Pd\Forms\RuleOptions pomocí metody `isOptional()`. Pravidlo je zaregistrováno přes standardní nette mechanismus, takže vyhodnocení k vyhodnocení na backendu dochází vždy. Pokud se jedná o měkkou validaci, považuje se hodnota na backendu za vždy validní.

Na backendu je hotovo, nyní je potřeba k danému pravidlu vytvořit i frontendový validátor. Ten potřeba zaregistrovat v projektovém `pdForms.js`

```js
doplnit se @zipper
```

## Je libo AJAX?
Existují případy, kdy je třeba ověřit hodnotu přes externí službu, případně udělat složitější validaci. Pokud chceme, aby proběhla live a uživatel se o výsledku validace dozvěděl co nejdříve, zapojíme AJAX. Začneme jednodušším příklad, validací formátu čísla bankovního konta.

```php
$bankAccountOptions = $this->ruleOptionsFactory->createRequired()
	->enableAjax(
		'Api:Front:CheckBank:',
		[
			\Pd\Forms\RuleOptions::STATUS_TIMEOUT => '_checkBank_msg_status_unavailable',
		],
		$this->bankAccountValidator
	);

$bankAccount = $form->addText('bankAccount', '_label_bank_account');
$bankAccount->setRequired();
$bankAccount->addRule(\Pd\Forms\Rules::AJAX, '_checkBank_msg_status_invalid', $bankAccountOptions);
```

Projdeme si registraci krok po kroku. Nejdříve vytvoříme tvrdé validační pravdilo (`createRequired`) a na něm zapneme ověření ajaxem (`enableAjax`). Prvním parametrem je identifikátor umístění validace v presenteru, který je interně předán LinkGeneratoru. Tohle je záměrně, protože interně se doplňují dodatečné parametry, které musí jít do URL, aby fungovali pokročilé validace (probereme dále). Druhým parametrem je pole custom zpráv, se kterými validace pracuje. A zde přichází další výhoda naší implementace - validace totiž může mít více stavů než jen platný / neplatný. Na příkladu jde vidět stav, že validační služba je nedostupná. Ten je standardizovaný, ale do pole zpráv lze zaslat libovolné zprávy, které si pak zpracujete a nastavíte dle libosti. Posledním parametrem je validační služba, která validuje hodnotu inputu na backendu. Pravidlo je povinné, takže na backendu musíme také validovat. Nyní již stačí pravidlo přidat na formulářový prvek. Ajaxové pravidlo je předdefinovano v balíčku v konstantě `Pd\Forms\Rules::AJAX`, přidáme výchozí zprávu pro nevalidní stav a naše custom nastavení pravidla. 

Ajaxové pravidlo je implementováno obecně, takže nepotřebujete implementovat frontendovou obsluhu :heart_eyes:

Z daného příkladu musí být jasné, že na backendu ale ještě nejsme hotový. Chybí nám endpoint, který volá frontend a provádí validace plus služba, která validuje hodnotu na backendu.

Validaci lze opět pěkně zobecnit, takže balíček obsahuje pro oba způsoby validace předdefinované rozhraní a pro frontend i připravený controller. 

`ValidationController`:
```php
<?php declare(strict_types = 1);

namespace App\ApiModule\FrontModule;

class CheckBankPresenter extends \Pd\Forms\Validation\ValidationController
{
	/**
	 * @var \App\OrderModule\BankAccountValidator
	 */
	private $bankAccountValidator;

	public function __construct(
		\App\OrderModule\BankAccountValidator $bankAccountValidator
	) {
		parent::__construct();
		$this->bankAccountValidator = $bankAccountValidator;
	}


	public function getValidationService(): \Pd\Forms\Validation\ValidationServiceInterface
	{
		return $this->bankAccountValidator;
	}
}
```

Presenter dědí od abstraktního contolleru, v němž je standardizovaná výchozí akce pro zaslání odpovědi ve správném formátu, se kterým umí pracovat fronendová obsluha. Jediné co potřebujete je doplnit v presenteru správnou validační službu, která hodnotu zvaliduje.

Pokud potřebujete něco víc custom, můžete si endpoint vytvořit dle libosti, zaslat odpověď ve formátu jaký potřebujete, jen si budete muset dodělat frontendovou obsluhu.

`ValidationService`:
```php
<?php declare(strict_types = 1);

namespace App\OrderModule;

final class BankAccountValidator implements \Pd\Forms\Validation\ValidationServiceInterface
{
	public function validateInput(string $value, array $dependentInputs = []): \Pd\Forms\Validation\ValidationResult
	{
		return $this->checkBankAccount($value);
	}


	public function checkBankAccount($bankAccount): \Pd\Forms\Validation\ValidationResult
	{
		if (\strpos($bankAccount,'/') === FALSE) { //validace IBAN
			$iban = new \CMPayments\IBAN($bankAccount);
			if ($iban->validate($error)) {
				return new \Pd\Forms\Validation\ValidationResult(TRUE);
			}
		} else { //validace bezny ucet
			$validator = new \BankAccountValidator\Czech();
			if ($validator->validate($bankAccount) === TRUE) {
				return new \Pd\Forms\Validation\ValidationResult(TRUE);
			}
		}

		return new \Pd\Forms\Validation\ValidationResult(FALSE);
	}

}
```

Rozhraní validační služby má jedinou metodu a to validateInput a pro vaši validaci to stačí wrapnout na existující metodu, viz příklad z Hudy.

Voilá, máte tvrdou ajaxovou validaci funkční na frontendu i backendu 🎆 

## Validace závislé na více formulářových polích

- doplnit PSČ z Hudy
