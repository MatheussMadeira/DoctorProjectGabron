# Header

Cabeçalho do site: logo, menu, botão de tema e chamada; menu lateral no celular.

- `links`: lista de `{label, href}`, até 5. `current`: o `href` da página atual (sublinhado em `accent`).
- `cta`: `{label, href}` à direita ("Inscreva-se"). `theme` + `onThemeChange` mostram o `ThemeToggle`.
- `sticky` (padrão `true`): fica no topo e ganha `shadow-sm` ao rolar. Abaixo de 1024px vira o botão de menu; o menu fecha com Esc e clicando fora.
