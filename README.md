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

## Dokumentace

- [Jak přidávat validace na formulářích](doc/validations.md)

## Changelog

### v1.4.0
- Nepovinná pravidla (měkká validace) a AJAXová pravidla lze nyní na back-endu připojovat přes `addRule`. 
- Přidána metoda `pdForms.getRuleByOp(rules, op)`, která vrátí první pravidlo z `rules`, které má jméno `op`.
- U asynchronních pravidel jsou automaticky vyplněny inputy, které jsou nastaveny v `arg.dependentInputs` a jejichž hodnoty dojdou v `payload.dependentInputs`. Dříve toto řešil manuálně callback pro danou validaci, např. `PdFormsRules_validTIN`.
- **BC breaky:**
    - Všechny validátory jsou nyní v `Nette.validators`, validátory z `pdForms.validators` byly přesunuty tamtéž.
    - Přejmenování objektu pro callbacky, nově je to `pdForms.ajaxCallbacks`, místo původního ~~`pdForms.asyncCallbacks`~~.
    - Odebrání AJAXového pravidla (včetně callbacku) `PdFormsRules_validTIN` a jeho nahrazení za obecné `PdFormsRules_validateAjax`.
    - Není nutné vytvářet prázdný callback pro identifikaci AJAXového pravidla. To je nyní rozpoznáno díky příznaku z back-endu.  
    - Přejmenována metoda na ověření, zda pravidla obsahují ajaxové pravidla. Nově `pdForms.hasAjaxRule` místo ~~`pdForms.hasAsyncRule`~~.
    - Očekávaný placeholder pro AJAX spinner má třídu `pdforms-ajax-spinner--HTML_ID_INPUTU` místo ~~`ajax-validation-spinner--HTML_ID_INPUTU`~~  


### v1.3.9
- K mazání zpráv nedochází v případě, že validace inputu byla zavolána s `onlyCheck === true`. V tu chvíli neovlivňujeme žádným způsobem DOM.

### v1.3.8
- Stisknutím klávesy ESC v průběhu AJAXové validace nedojde k jejímu zrušení ([#10](https://github.com/peckadesign/pdForms/issues/10)).
- Do globálního objektu `pdForms` přidána property `version` obsahující aktuální verzi.
- Metoda `toggleControl` při validaci AJAXových pravidel použije správnou URL ([#8](https://github.com/peckadesign/pdForms/issues/8)).
- Drobný refactor přetěžování `Nette` metod a ukládání referencí na původní metody. 

### v1.3.7
- Oprava mazání zpráv v případě, že input má asynchronní i klasická pravidla dohromady. Za určitých okolností stále mohlo dojít k zobrazení dvou chyb zároveň, protože nedošlo ke smazání zprávy z asynchronního pravidla.

### v1.3.6
- Oprava mazání zpráv v případě, že input má asynchronní i klasická pravidla dohromady.

### v1.3.5
- Ošetření přidávání validačních zpráv v případě, že AJAXový request skončí chybou. V takovém případě je `payload === undefined`.
- V případě AJAXové validace se přidá class `pdforms-valid` i v případě, že není vyplněná žádná zpráva. V případě chyby se class nepřidává bez vyplněné zprávy, protože to nedává smysl (uživatel by nevěděl, co je chybně). 

### v1.3.4
- Zjednodušené přidávání vlastních zpráv krom `valid` a `invalid` u AJAXové validace. Nyní je možno vypsat libovolnou zprávu. Je potřeba v odpovědi ze serveru poslat v JSONu klíč `status` obsahující string. Ten se použije jako klíč do pole se zprávami nastavenými u pravidla v PHP (stejně, jako do teď fungoval `valid`, `invalid` a částečně `timeout`). Typ zprávy lze určit pomocí klíče `messageType` (libovolný string použitelný jako CSS class) v JSON odpovědi. Výchozí je `info`. Viz příklad odpovědi a vygenerované zprávy:

```json
{
	"status": "unavailable",
	"messageType": "nazev_class"
}
``` 

```html
<p class="message message--nazev_class pdforms-message">...</p>

<label class="inp-nazev_class pdForms-message">...</label>
```

### v1.3.3
- Oprava asynchronního callbacku `PdFormsRules_validTIN`. Po vyplnění polí nedošlo k jejich opětovné validaci.

### v1.3.2
- Přidáno obecné pravidlo na formát CZ/SK IČ, které musí splňovat určité podmínky pro svůj ciferný součet. Pravidlo se očkává jako v namespace `Pd/Forms/Rules/` pod názvem `validICO`.
- Oprava přidávání validní class v určitém případě, viz níže.
  - Element má alespoň dvě pravidla z nichž jedno je složené (podmíněné). V případě, že podmíněné pravidlo projde, tak díky vnořenému volání `pdForms.validateControl` se přidala validní class. I když pak druhé pravidlo neprošlo a přidalo nevalidní class, zůstala ona validní class ze zanořeného pravidla. Řešením je přesun přidávání validní class o úroveň výše, tj. po validaci celého prvku.  

### v1.3.1
- Snippety mohou být i uvnitř formuláře ([#5](https://github.com/peckadesign/pdForms/issues/5)).
- Oprava vyvolání události po vyplnění inputu při AJAXové validaci

### v1.3.0
- Oprava vyhledání placeholderu pro zprávu. Nyní odpovídá popisu, tj. `.pdforms-messages--input` se vyhledává s vyšší prioritou, než `p`.
- Defaultní prvek pro zprávu u inputu je nově `label` s atributem `for` nastaveným na validovaný prvek.
- Pojmenování class se částečně přibližuje BEM metodice, ve verzi 2 (kompatibilní s netteForms 2.4) je ambice to dotáhnout ještě lépe :)

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
