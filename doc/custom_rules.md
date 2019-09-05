## Vlastní pravidla

Úplně nejzákladnější funkcionalitou je přidání custom pravidla do formuláře nad rámec standardních Nette pravidel. To provdeme klasiky jako u Nette pravidel:

```php
$container->addText('phone', '_label_phone')
	->setRequired()
	->addRule(\Pd\Forms\Rules::PHONE, '_msg_invalid_phone');
```

Toto pravidlo zavolá custom validátor z balíčku pd/utils: `Pd\Utils\Validators::isPhone()`. 

### Dostupná custom pravidla v Pd\Forms
- `Pd\Forms\Rules::PHONE`: validace formátu telefonního čísla
- `Pd\Forms\Rules::CONTAINS_NUMBER`: validace inputu, zda-li obsahuje číslo (používá například u ulice)
- `Pd\Forms\Rules::ZIP`: validace formátu PSČ
- `Pd\Forms\Rules::AJAX`: obecná AJAXová validace
- `Pd\Forms\Rules::CZECH_COMPANY_IDENTIFIER`: validace formátu českého (a slovenského) IČO   

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
