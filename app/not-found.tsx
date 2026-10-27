import { Button, Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { PublicTemplate, Section } from "@/components/templates";

export default function NotFound() {
  return (
    <PublicTemplate>
      <Section narrow>
        <Stack gap={7}>
          <Reveal>
            <SectionHeading as="h1" eyebrow="Erro 404" title="Página não encontrada" lead="O endereço pode ter mudado ou a turma não está mais na agenda." />
          </Reveal>
          <Stack row wrap gap={3}>
            <Button href="/agenda" arrow>
              Ver agenda de cursos
            </Button>
            <Button variant="secondary" href="/">
              Voltar ao início
            </Button>
          </Stack>
        </Stack>
      </Section>
    </PublicTemplate>
  );
}
