# EventSummary

Resumo da turma, fixo na lateral da página da turma enquanto a pessoa rola. No celular vira uma barra no rodapé da tela.

- `start`, `end`, `time`, `city`, `venue`, `modality`, `price`, `installment`, `status`.
- `seatsTotal` e `seatsTaken`: mostram "3 de 12 disponíveis" e uma barra que se preenche ao aparecer. Venha do banco, não digite à mão.
- `action` (`{label, href}`): o botão principal, que leva ao formulário. `secondary`: um elemento extra (ex. link para o WhatsApp).
- `bar` (padrão `true`): a barra fixa do celular. Desligue se a página já tiver outro botão fixo.
- Coloque numa coluna lateral de uns 380px; ele gruda logo abaixo do header.
