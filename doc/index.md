# Dokumentace

## Názvosloví validací
- **Live validace**: bezprostřední validace formuláře na straně klienta (v prohlížeči) při vyplňování 
- **Měkká validace**: live validace, která upozorní uživatele na problém v inputu, ale umožní odeslání formuláře (není kontrolována na straně serveru)
- **Ajax validace**: live validace, která pro výsledek validace volá asynchronně zpracování na backendu
- **Standardní validace**: validace, která je zpracována na straně serveru a *může* být kontrolována i na straně klienta
- **Dynamické validační zprávy**: validační zprávy, které nejsou generované předem, ale jsou součástí odpovědi AJAXové validace

## Pd\Form\Rules + pdForms.js
Knihovna poskytuje nástroje, pomocí kterých je možné zaregistrovat vlastní validační pravidla do `Nette\Forms` a navíc poskytuje podporu pro live, měkkou a ajaxovou validaci, které lze zaregistrovat v PHP kódu. Řešení vychází z nativní podpory Nette pro [custom validační pravidla](https://pla.nette.org/cs/vlastni-validacni-pravidla), ale nespoléhá ani nekopíruje interní quirks Nette frameworku.

- [Zprovoznění live validace](live_validation.md)
- [Vlastní pravidla, měkká validace a validační kontext](custom_rules.md)
- [Je libo AJAX?](ajax.md)
- [AJAX s JS callbackem, závilost na více formulářových polích](ajax_dependent_inputs.md)
- [Měkká validace pomocí dostupných Nette validátorů](nette_optional.md)
- [Dynamické validační zprávy a našeptávání hodnot inputů přes validační zprávy](suggestions.md)
