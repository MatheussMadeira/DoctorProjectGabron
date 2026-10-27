# Button

Botão e link com cara de botão. Caixa alta, cantos de 2px.

- `variant`: `primary` (a ação principal da tela, uma por vez), `secondary` (contornado, ações de apoio), `ghost` (cancelar, ações discretas), `link` (texto sublinhado).
- `size`: `sm` (40px), `md` (48px, padrão), `lg` (56px, hero e chamadas).
- `href` transforma em `<a>`. `arrow` mostra a flecha que avança no hover, para ações que levam adiante ("Quero me inscrever").
- No hover o fundo se preenche da esquerda para a direita (primário escurece; secundário vira sólido) e a flecha avança.
- `icon`: um ícone Lucide antes do texto. `full`: largura total (menu mobile, formulário no celular).
- Rótulo começa com verbo e é curto. `disabled` para turma esgotada, mas prefira oferecer "Lista de espera".
