# ReabToxin · kit de logo

Nome **REAB·TOXIN** em Marcellus caixa alta, com uma pedrinha como ponto médio, e o símbolo **gota sobre as pedras**. Cores e fontes do design system "Dra. Ana Paula Fonseca".

## Pastas

- `web/`: SVGs em camadas para o site. Trocam de cor por CSS e podem ser animados.
- `cores/`: SVGs prontos (com o texto convertido em curvas) de cada versão em 6 cores: `colorido`, `negativo`, `mono-azul-escuro`, `mono-azul-claro`, `mono-creme`, `mono-preto`.
- `png/`: PNGs com fundo transparente, nas versões colorido e negativo (o negativo vem sobre azul-escuro).
- `favicon/`: `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` (180), `icone-app-192.png`, `icone-app-512.png`.

## Versões

| Versão | Uso |
|---|---|
| `horizontal` | Principal, com linha de apoio. A partir de 280 px de largura. |
| `horizontal-compacta` | Sem linha de apoio. Header do site (168 px no desktop, 140 px no celular). Mínimo de 120 px. |
| `vertical` | Rodapé (180 px), capas, certificados. |
| `selo` | Carimbo em fotos e certificados. Sobre foto, use um disco creme por trás. Mínimo de 72 px. |
| `simbolo` | Avatar, ícone, grafismo. Mínimo de 24 px de altura. |

## Cores

- Azul-escuro `#28334F`: nome
- Azul-claro `#9BACBE`: pedras, gota e ponto
- Creme `#F5EBDF`: fundo claro e nome em negativo
- Azul-pedra `#4A5872`: apoio

O mono azul-claro só funciona sobre fundo escuro. Sobre o creme, o contraste é de 2:1.

## Camadas para o site (pasta `web/`)

```
<g id="simbolo">
  <path id="pedra-1" class="rt-pedra" data-ordem="1"/>
  <path id="pedra-2" class="rt-pedra" data-ordem="2"/>
  <path id="pedra-3" class="rt-pedra" data-ordem="3"/>
  <path id="gota"    class="rt-pedra" data-ordem="4"/>
</g>
<g id="nome"> #reab (rt-nome) · #ponto (rt-pedra) · #toxin (rt-nome) </g>
<g id="linha-de-apoio"> (rt-nome) </g>
```

Para recolorir pelo tema, use estas variáveis:

```css
.reabtoxin { --rt-nome: var(--logo-ink); --rt-pedra: var(--logo-stone); }
```

O nome usa `currentColor` quando `--rt-nome` não está definida.

Animação sugerida, na linha do design system: as pedras caem e pousam de baixo para cima, em ordem (`data-ordem`), com `duration-intro` (1400 ms), `ease-settle` (`cubic-bezier(0.2, 0.9, 0.25, 1)`) e 350 ms de atraso entre uma e outra. Depois, o nome aparece com um fade. Com `prefers-reduced-motion`, nada se move.

## Regras

- **Área de proteção:** em volta do logo, deixe livre a altura da gota (o elemento do topo da pilha).
- **Tamanhos mínimos:** 280 px para o horizontal com linha de apoio, 120 px para a horizontal compacta e 24 px de altura para o símbolo.
- **Favicon:** em 16 px, use a versão simplificada, com a gota sobre uma pedra (`favicon.svg`, `favicon-16.png`). As três pedras se fundem nesse tamanho.
- **Não fazer:**
  - distorcer, girar ou reposicionar as pedras;
  - trocar as cores ou a fonte;
  - aplicar sobre fundo de baixo contraste ou foto agitada sem o disco creme;
  - adicionar efeitos (sombra, degradê, brilho).
