# DataTable

Tabela do admin com ações por linha e estado vazio.

- `columns`: lista de `{key, label, align?, render?(row)}`. `rows`: os dados (cada linha com `id`).
- `onView`, `onEdit`, `onDelete`: mostram os botões de ícone correspondentes. Excluir pede confirmação no app antes de agir.
- `empty`: texto do estado vazio. Status com `Badge` (Publicado, Rascunho, Quase cheio). Na agenda: turma, data, local, inscritos, status.
