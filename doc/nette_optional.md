## Měkká validace pomocí dostupných Nette validátorů

Nette má velkou sadu validačních pravidel pokrývající obecné validace vstupů. V případě, že byste chtěli některý z nich použít, museli byste si ho volat na frontendu, ale backend o této validaci vůbec neví. Když k formuláři přijde backend programátor, tak bude koukat, kde se ta validace bere. Navíc byste si museli dopsat frontend obsluhu pro konkrétní prvek a volat si Nette validátor. Celé to jde hezky zobecnit a vzájemně propojit. `pd/forms` poskytuje jednoduchý mechanismus jak toho docílit - obecné pravidlo `\Pd\Forms\Rules::NETTE_RULE_PROXY`. 

Obecné pravidlo `\Pd\Forms\Rules::NETTE_RULE_PROXY` navážeme na požadovaný formulářový prvek - to zajistí zpracování (vlastně nezpracování na backendu) a předá potřebná nastavení pro frontendové zpracování. Pravidlo nakonfigurujeme pomocí `Pd\Form\RuleOptions`, které vytvoříme z dostupné továrny metodou `createNetteOptional()`. Ta má dva parametry - Nette pravidlo a argument(y) pro toto pravidlo. 

```php 
<?php declare(strict_types = 1);

class FormFactory 
{
    /**
     * @var \Pd\Forms\RuleOptionsFactory
     */
    private $ruleOptionsFactory;
    
    public function __construct(\Pd\Forms\RuleOptionsFactory $ruleOptionsFactory) 
    {
        $this->ruleOptionsFactory = $ruleOptionsFactory;
    }

    public function create(): \Nette\Forms\Form 
    {
        $form = new \Nette\Forms\Form;

        $companyIdentifierOptions = $this->ruleOptionsFactory->createNetteOptional(
            \Nette\Forms\Form::PATTERN,
            '([0-9]\s*){0,8}'
        );
        
        $form->addText('companyIdentifier', 'IČO')
            ->addCondition(\Nette\Forms\Form::FILLED)
                ->addRule(\Pd\Forms\Rules::NETTE_RULE_PROXY, '_msg_ico_pattern', $companyIdentifierOptions)
        ;
    }
}
``` 

Na frontendu obsluha pd/forms zavolá validátor `pattern` z `netteForms.js` a provede validaci formulářového prvku a výsledek oznámí uživateli. Při odeslání formuláře nedochází k backendové validaci, protože o tu nemáme zájem. Chceme pouze uživatele informovat, že je IČO není validaní, ale necháme ho např. dokončit objednávku, abychom nepřišli o konverzi.
