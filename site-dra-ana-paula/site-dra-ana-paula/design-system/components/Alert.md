# Alert

Mensagem de retorno em bloco: confirmação, aviso ou erro.

- `tone`: `info`, `success`, `warning`, `danger`. `title` é obrigatório na prática; `children` é o detalhe.
- O bloco entra suavemente; no `success` o ícone se desenha. Mostre o sucesso no lugar do formulário enviado.
- `danger` usa `role="alert"` (o leitor de tela anuncia na hora); os outros usam `role="status"`.
- Use após enviar a inscrição, no topo do formulário com erros e no admin. Para erro de um campo só, use o `error` do campo.
