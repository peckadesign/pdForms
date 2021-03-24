## Dynamické zprávy a našeptávání hodnot inputů přes validační zprávy

`pdForms` je možné použít k našeptávání například překlepových výrazů u domén e-mailů apod. K tomu slouží takzvané _dynamické zprávy_. Tyto validační zprávy jsou vygenerovány až v průběhu validace v PHP a na frontend jsou v případě AJAXové validace vráceny přes response.

```php
$validationResultWithMessage = new \Pd\Forms\Validation\ValidationResult(TRUE);
$validationResultWithMessage->setMessage('My message');
```

Pokud chceme takovou dynamickou zprávu použít k našeptání hodnoty, stačí k tomu, aby našeptaná hodnota byla obalena do libovolného tagu (`<a>`, `<span>`, ...) s `class="pdforms-suggestion"`. Frontend JS se pak postará o to, že při kliknutí na tento element dojde k vyplnění obsahu do validovaného inputu.

```php
$validationResultWithMessage = new \Pd\Forms\Validation\ValidationResult(TRUE);

$suggestion = \Nette\Utils\Html::el('a');
$suggestion->addAttributes([
    'href' => '#',
	'class' => 'pdforms-suggestion',
]);
$suggestion->setText('Suggested value');

$message = \Nette\Utils\Html::el('span');
$message->setHtml('Did you mean ' . $suggestion . '?');

$validationResultWithMessage->setMessage((string) $suggestion);
```

Narozdíl od validačních zpráv, které na prvku přidáváte přes `addRule`, se tyto zprávy **neescapují**, aby se správně vykreslily HTML elementy. Z toho důvodu je potřeba na to myslet a dát si pozor na to, co z backendu do této validační zprávy posíláte. Proto doporučuji tyto zprávy skládat pomocí `\Nette\Utils\Html::el` prvků a neskládat je jako stringy. 
