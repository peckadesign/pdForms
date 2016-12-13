# pdForms

## Instalace

Do závislostí projektu je možné plugin přidat přes odkaz na Github následovně (více viz: http://bower.io/docs/creating-packages/#dependencies):

```
$ cat bower.json
{
	"name": "Projekt",
	"private": true,
	"dependencies": {
		"pdForms": "peckadesign/pdForms#1.0.*"
	}
}
```


## Changelog

### v1.1.2
- Všechny chybové zprávy jsou nyní mazány podle `name` atributu formulářového prvku. Díky tomu by mělo být možné zanořenovat více `.pdforms-messages-input` do sebe.

### v1.1.1
- původní nette pravidla lze používat jako nepovinná

### v.1.1.0
- Přepracováno rozlišování validačních pravidel na `netteRules` a `pdRules`, nyní na nižší úrovni a pdRules tak mohou být nově povinné i v případě, že jde o asynchronní pravidlo. V takovém případě sice lze odeslat formulář, ale připojená validační zpráva má správnou `class` (chybovou, ne jen info) a na straně php dojde k zablokování odesílání formuláře. Do budoucna lze zablokovat odeslání už na straně JS, viz komentář v kódu.
- Lze pomocí `data-pdforms-validate-on` změnit `event`, při které dochází k validaci inputu. Výchozí je `change` nebo `blur` (dle typu inputu, může být i oboje). Např. pro validaci pole s jQuery UI kalendářem je však potřeba použít vlastní událost, jinak se validuje dřív, než jQuery UI vloží správné datum do pole.
- Do callbacků asynchronních pravidel se nyní předává `arg` z pravidla, viz callback `PdFormsRules_validTIN`.
