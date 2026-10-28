import { getLocale, getTranslations } from "next-intl/server";
import { Button, Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { PublicTemplate, Section } from "@/components/templates";

/* O layout do idioma já chamou setRequestLocale: aqui o idioma sai do mesmo lugar. */
export default async function NotFound() {
  const t = await getTranslations({ locale: await getLocale(), namespace: "NaoEncontrada" });
  const tc = await getTranslations({ locale: await getLocale(), namespace: "Comum" });
  return (
    <PublicTemplate>
      <Section narrow>
        <Stack gap={7}>
          <Reveal>
            <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("titulo")} lead={t("lead")} />
          </Reveal>
          <Stack row wrap gap={3}>
            <Button href="/agenda" arrow>
              {tc("verAgenda")}
            </Button>
            <Button variant="secondary" href="/">
              {tc("voltarInicio")}
            </Button>
          </Stack>
        </Stack>
      </Section>
    </PublicTemplate>
  );
}
