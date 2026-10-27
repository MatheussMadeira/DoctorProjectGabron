# TextField

Campo de texto com rótulo, ajuda e erro. Também vira área de texto.

- `label` sempre (não use só placeholder). `required` mostra o asterisco.
- `hint`: ajuda curta abaixo. `error`: substitui a ajuda, borda em `danger` e `aria-invalid`.
- `floating`: o rótulo fica dentro do campo e sobe ao focar ou digitar, com uma linha que se desenha embaixo. Use no formulário de inscrição; no admin, prefira o rótulo acima (mais rápido de escanear).
- `multiline` + `rows` para mensagem. Aceita todos os atributos de `<input>` (`type`, `name`, `autoComplete`…).
- Erros dizem o que fazer: "Digite um e-mail válido.", não "Campo inválido".
