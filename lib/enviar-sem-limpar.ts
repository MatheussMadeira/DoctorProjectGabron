import { startTransition, type FormEvent } from "react";

/**
 * Envia um formulário para a Server Action SEM o reset automático do React 19 (que acontece com `<form action={...}>`): depois de um erro de
 * validação o reset desmarcava checkboxes e esvaziava campos, e a pessoa salvava de novo sem perceber. Uso:
 * `<form onSubmit={(e) => enviarSemLimpar(e, enviar)}>`. O botão que enviou (ex.: `name="acao" value="aprovar"`) entra nos dados.
 */
export function enviarSemLimpar(e: FormEvent<HTMLFormElement>, enviar: (dados: FormData) => void) {
  e.preventDefault();
  const botao = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
  startTransition(() => enviar(new FormData(e.currentTarget, botao)));
}
