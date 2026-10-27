# ThemeToggle

Botão de ícone que alterna os temas claro e escuro.

- `theme`: o tema atual (`claro` | `escuro`). `onChange(next)`: o site grava a escolha e troca `data-theme` no `<html>`.
- Guarde a escolha (cookie ou localStorage) e respeite `prefers-color-scheme` na primeira visita.
- O `Header` já inclui o botão quando recebe `onThemeChange`.
