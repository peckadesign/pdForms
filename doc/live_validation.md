## Live validace

Pro použití na webu stačí nalinkovat `netteForms.js`, jednotlivé validátory a `pdForms.js` a vypnout automatickou inicializaci nette forms.

```html
<script>var Nette = { noInit: true };</script>
<script src="netteForms.js"></script>
<script src="validators/pdForms.validator.phone.js"></script>
<script src="validators/..."></script>
<script src="pdForms.js"></script>
```

V tomto základním nastavení se budou formulářové prvky validovat při JS událostech `change` nebo `focusout` (záleží na typu prvku). Validaci na prvku je možné také vyvolat pomocí vlastní události `validate`, viz příklad:
```javascript
var input = document.getElementById('muj_input');
input.dispatchEvent(new Event('validate'));
```

### Vlastní událost pro spuštění validace 
Pokud chcete validovat formulářové pole při libovolné jiné události (`keyup`, `focusout`, vlastní událost, ...), stačí na formulářový prvek přidat data atribut `data-pdforms-validate-on` obsahující název události. Validační callback se poté naváže i na tuto událost. 
```html
<input id="muj_input" name="muj_input" type="text" data-nette-rules="..." data-pdforms-validate-on="keyup">
```

### Vypisování chyb  
V případě validační chyby se vypsání chyby řídí několika pravidly. V prvné řadě je možno určit, zda se má chyba vypsat přímo u formulářového prvku nebo "globálně" v určeném místě.

#### Vypsání chyby přímo u formulářového prvku
Toto chování je výchozí, element pro vložení chybové hlášky se hledá v DOM jako nejbližší rodič s class `pdforms-messages--input` nebo jako nejbližší rodič, který má vlastní element zpráv `pdforms-messages__aria`. Pokud takový rodič neexistuje, použije se nejbližší tag `<p>`. Do tohoto prvku je pak vložena validační zpráva v následujícím formátu:
```html
<label for="muj_input" data-elem="muj_input" class="inp-error pdforms-message">Text validační zprávy</label>
``` 

Pokud nechceme použít pro validační chyby element `label`, lze pomocí data atributu `data-pdforms-messages-tagname` určit libovolný jiný tag, např. `data-pdforms-messages-tagname="span"`. Class u zprávy je ve tvaru `inp-(error|info|valid)`, případně `message message--(error|info|valid)` (pokud byl použit tag `<p>`).

Zda se label prvek vloží na začátek nebo konec elementu můžeme ovlivnit uvedením `data-pdforms-messages-prepend="true"`, výchozí chování je vložení nakonec. Tento data atribut se neuvádí na formulářový prvek, ale prvek, do kterého se validační zpráva vkládá.

Na nalezený element se zároveň přidává class `pdforms-(error|info|valid)` označující stav formulářového prvku. Element pro vložení zprávy a element nesoucí tuto class přitom nemusí být tentýž, viz dále.

Pokud nalezený element obsahuje vlastní element s class `pdforms-messages__aria` (typicky `aria-live` region), vkládají se zprávy do něj. Elementy zpráv patřící vnořeným formulářovým prvkům se přeskakují, tj. nepoužije se takový, mezi kterým a nalezeným elementem leží element, který sám může být placeholderem (`pdforms-messages--input`, element s vlastním elementem zpráv, nebo `<p>`). Díky tomu je možné mít uvnitř elementu `pdforms-messages--input` (např. uvnitř `<fieldset>` s radiolistem) vnořené další formulářové prvky s vlastními zprávami.

V případě, že se podle výše uvedeného postupu nenajde element pro vložení zprávy, zkouší se zpráva umístit do "globálního" elementu zpráv.

#### Vypsání chyby v "globálním" elementu zpráv 
Přidáním data atributu `data-pdforms-messages-global="true"` na formulářový prvek můžeme natavit, že zprávy chceme vkládat pohromadě do nějakého globální elementu ve stránce. Ten se pak hledá podle class `pdforms-messages--global`. V tomto případě je výchozí tag pro zprávy `<p>` (tj. i výchozí class je jiná), jinak platí stejná pravidla pro možnost nastavení tagu i formát class.

Do globálního elementu se vkládají pouze samotné zprávy. Class `pdforms-(error|info|valid)` označující stav formulářového prvku se přidává na jeho vlastní placeholder, tj. hledá se podle stejných pravidel, jako kdyby globální element neexistoval. Na globální element se class přidá pouze v případě, že formulářový prvek žádný vlastní placeholder nemá.

Class zůstává na placeholderu tak dlouho, dokud v něm (nebo v globálním elementu) zbývá alespoň jedna zpráva náležející prvku, který tento placeholder používá. Zprávy vnořených formulářových prvků mají vlastní placeholder, takže class nadřazeného placeholderu nedrží.
