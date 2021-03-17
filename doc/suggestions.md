## Dynamické zprávy a našeptávání hodnot inputů přes validační zprávy

`pdForms` je možné použít k našeptávání například překlepových výrazů u domén e-mailů apod. K tomu slouží takzvané _dynamické zprávy_. Tyto validační zprávy jsou vygenerovány až v průběhu validace v PHP a na frontend jsou v případě AJAXové validace vráceny přes response.

**tba** prosím doplnit, jak se tyto zprávy vytvoří a předají, přidat příklad.

Pokud chceme takovou dynamickou zprávu použít k našeptání hodnoty, stačí k tomu, aby našeptaná hodnota byla obalena do libovolného tagu (`<a>`, `<span>`, ...) s `class="pdforms-suggestion"`. Frontend JS se pak postará o to, že při kliknutí na tento element dojde k vyplnění obsahu do validovaného inputu.

**tba** prosím doplnit konkrétní příklad vygenerování včetně suggestion.
