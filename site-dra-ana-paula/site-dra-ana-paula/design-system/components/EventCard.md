# EventCard

Cartão de uma turma, para destacar as próximas datas na home. A data é o destaque.

- `title`, `href` (o cartão inteiro é clicável), `start` e `end` (ISO), `time`, `city`, `venue`, `modality`, `seats`, `price`.
- `image` (16:10) + `imageAlt`. Sem foto, mostra o símbolo.
- `summary`: uma frase que aparece no hover (no celular fica sempre visível).
- `status`: como na `AgendaList`. Esgotado vira "Lista de espera"; realizado vira "Ver como foi".
- `transitionName`: o mesmo nome no `Hero` da página da turma faz a foto crescer na troca de página (View Transitions).
- `loading`: mostra o `Skeleton` de cartão. Grade de 3 colunas no desktop, 1 no celular, gap `space-6`.
