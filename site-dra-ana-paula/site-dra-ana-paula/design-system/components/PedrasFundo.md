# PedrasFundo

Grafismo de marca: o símbolo das pedras ampliado, sangrando para fora da área, como na capa do manual.

- Coloque dentro de um elemento com `position: relative`. `Section` (`pedras`), `Hero` e `CTABand` já incluem.
- `side`: `full` (ocupa o fundo todo) ou `right` (só na metade direita, deixa o texto limpo).
- `animated` (padrão `true`): as pedras flutuam devagar. `intro`: ao aparecer, caem e se empilham de baixo para cima. `parallax`: andam mais devagar que a página ao rolar. Tudo para com `prefers-reduced-motion`.
- Cor: token `pedra`, areia no claro e azul-pedra no escuro. É só decoração (`aria-hidden`). Use uma vez por tela.
