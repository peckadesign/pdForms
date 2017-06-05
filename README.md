# pdForms

## Instalace

Do závislostí projektu je možné plugin přidat přes odkaz na Github následovně (více viz: http://bower.io/docs/creating-packages/#dependencies):

```
$ cat bower.json
{
	"name": "Projekt",
	"private": true,
	"dependencies": {
		"pdForms": "peckadesign/pdForms#1.2.*"
	}
}
```


## Changelog

### v1.2.3
- vypnutí extension `unique` při AJAXové validaci - pokud je ve formuláři více polí s asynchroními pravidly, je potřeba více requestů v jednu chvíli
- úprava vykreslování zpráv při kombinaci asynchronního pravidla a `onlyCheck === true` 

### v1.2.2
- oprava validace podmíněných pravidel po přidání podpory `onlyCheck` do `pdForms.validateControl`
- refactor přidávání validačních chyb (beze změny funčknosti)

### v1.2.1
- `pdForms.validateControl` respektuje parametr `onlyCheck`, který přichází z funkce `Nette.validateControl`. V případě nastavení jeho hodnoty na `true` validuje formulář, ale nezobrazuje validační chyby.

### v1.2.0
- Název class přidávané na obalující element (nejbližší`.pdforms-messages-input` nebo `p`) jsou nyní prefixovány `pdforms-` (není zpětně kompatibilní).
  - Třída se nově přidává i v případě validního inputu.

### v1.1.2
- Všechny chybové zprávy jsou nyní mazány podle `name` atributu formulářového prvku. Díky tomu by mělo být možné zanořenovat více `.pdforms-messages-input` do sebe.

### v1.1.1
- původní nette pravidla lze používat jako nepovinná

### v.1.1.0
- Přepracováno rozlišování validačních pravidel na `netteRules` a `pdRules`, nyní na nižší úrovni a pdRules tak mohou být nově povinné i v případě, že jde o asynchronní pravidlo. V takovém případě sice lze odeslat formulář, ale připojená validační zpráva má správnou `class` (chybovou, ne jen info) a na straně php dojde k zablokování odesílání formuláře. Do budoucna lze zablokovat odeslání už na straně JS, viz komentář v kódu.
- Lze pomocí `data-pdforms-validate-on` změnit `event`, při které dochází k validaci inputu. Výchozí je `change` nebo `blur` (dle typu inputu, může být i oboje). Např. pro validaci pole s jQuery UI kalendářem je však potřeba použít vlastní událost, jinak se validuje dřív, než jQuery UI vloží správné datum do pole.
- Do callbacků asynchronních pravidel se nyní předává `arg` z pravidla, viz callback `PdFormsRules_validTIN`.
