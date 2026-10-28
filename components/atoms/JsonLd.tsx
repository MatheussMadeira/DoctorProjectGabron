/** Dados estruturados (JSON-LD). O `<` é escapado para que nenhum texto possa fechar a tag <script>. */
export function JsonLd({ dados }: { dados: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />;
}
