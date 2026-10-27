# AgendaList

A agenda de turmas: datas agrupadas por mês, ordenadas, com filtro em abas.

- `events`: lista de `{id, title, start, end?, time?, city?, venue?, modality, status, href}`. Datas em ISO (`2026-03-14`). O mês vem de `start`.
- `filterBy` (padrão `modality`): o campo usado para as abas; só aparecem se houver mais de uma opção. `allLabel` é a primeira aba.
- `status`: `aberto`, `ultimas`, `esgotado`, `em-breve` ou `encerrado` (vira "Realizado"). Esgotadas e realizadas ficam mais apagadas.
- `loading`: mostra linhas de `Skeleton` enquanto os dados chegam do admin. `emptyText`: texto quando o filtro não tem datas.
- Movimento: ao filtrar, as linhas entram de novo escalonadas; no hover o fundo entra da esquerda e a flecha avança.
