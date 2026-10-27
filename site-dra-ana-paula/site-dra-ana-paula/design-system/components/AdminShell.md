# AdminShell

Moldura do painel admin: barra lateral em azul-escuro com o logo, título da página e ações.

- `active`: a chave do item ativo do menu. `nav`: lista de `{key, label, icon, href}` (padrão: Painel, Agenda, Inscrições, Configurações).
- `title`: título da página. `actions`: botões à direita (ex. "Nova data"). `children`: o conteúdo.
- Conteúdo sobre `surface-sunken`, com tabelas e formulários em `surface-raised`. Funciona em claro e escuro.
