import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import {
  Badge, Button, Checkbox, DateBlock, Grid, Logo, PedrasFundo, Reveal, Skeleton, WhatsAppButton,
} from "@/components/atoms";
import {
  Alert, BulletItem, ContactItem, EventMeta, FeatureItem, InfoCard, ItemList, MapPlaceholder, SectionHeading, Select,
  Stats, StepItem, TextField, Testimonial,
} from "@/components/molecules";
import {
  AboutDoctor, AdminShell, AgendaList, ContatoForm, CTABand, EventCard, EventSummary, FAQ, Footer, Gallery, Header, Hero,
  InscricaoForm, Schedule,
} from "@/components/organisms";
import { Section, SiteHeader } from "@/components/templates";
import { ASSUNTOS_CONTATO, CONSELHOS, PROFISSOES } from "@/lib/dados-exemplo";
import { footerDe, HEADER_CTA, montarSite, NAV_LINKS } from "@/lib/site";
import { KpiCard } from "@/components/molecules";
import { AdminTable } from "@/components/organisms";
import { DataTableDemo, ExcluirDialogDemo, LoginDemo, PlusIcon, TabsDemo } from "./Demos";

export const metadata: Metadata = { title: "Componentes", robots: { index: false, follow: false } };

const AGENDA = [
  { id: 1, title: "Toxina botulínica · Módulo essencial", start: "2026-03-14", end: "2026-03-15", time: "Sáb. e dom., 8h às 18h", city: "Belo Horizonte", venue: "Local a confirmar", modality: "Presencial", status: "aberto" as const, href: "#" },
  { id: 2, title: "Toxina botulínica · Módulo avançado", start: "2026-04-18", time: "Sáb., 8h às 18h", city: "Belo Horizonte", venue: "Local a confirmar", modality: "Presencial", status: "ultimas" as const, href: "#" },
  { id: 3, title: "Anatomia aplicada · Online", start: "2026-05-09", time: "Sáb., 9h às 13h", modality: "Online", status: "em-breve" as const, href: "#" },
  { id: 4, title: "Turma de exemplo esgotada", start: "2026-05-23", city: "Belo Horizonte", modality: "Presencial", status: "esgotado" as const, href: "#" },
];

const SCHEDULE = [
  { time: "08h00", title: "Recepção e abertura", duration: "30 min" },
  { time: "08h30", title: "Anatomia aplicada", description: "Descrição a confirmar.", duration: "2 h" },
  { time: "10h30", title: "Prática supervisionada", description: "Descrição a confirmar.", duration: "3 h" },
];

function Bloco({ titulo, children, escuro = false }: { titulo: string; children: React.ReactNode; escuro?: boolean }) {
  return (
    <Section theme={escuro ? "escuro" : undefined} background={escuro ? "surface" : "surface"}>
      <p className="ap-eyebrow">{titulo}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-5)", alignItems: "flex-start", marginTop: "var(--space-4)" }}>{children}</div>
    </Section>
  );
}

export default function ComponentesPage() {
  // Página de conferência: só existe em desenvolvimento.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <SiteHeader sticky={false} />
      <main>
        <Section>
          <SectionHeading as="h1" eyebrow="Atomic Design" title="Componentes" lead="Átomos, moléculas, organismos e templates, para comparar com o design system." />
        </Section>

        {/* ATOMS */}
        <Section background="sunken">
          <SectionHeading number="01" eyebrow="Átomos" title="Átomos" />
        </Section>
        <Bloco titulo="Logo">
          <Logo variant="horizontal" width={220} />
          <Logo variant="vertical" width={140} />
          <Logo variant="selo" width={110} />
          <Logo variant="simbolo" width={60} />
          <Logo variant="simbolo" width={60} animated title="" />
        </Bloco>
        <Bloco titulo="Button">
          <Button>Quero me inscrever</Button>
          <Button arrow>Ver detalhes</Button>
          <Button variant="secondary">Ver conteúdo</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="link">Saiba mais</Button>
          <Button icon={<PlusIcon />}>Nova data</Button>
          <Button size="sm">Pequeno</Button>
          <Button size="lg" arrow>Grande</Button>
          <Button disabled>Desativado</Button>
        </Bloco>
        <Bloco titulo="Badge">
          <Badge tone="success">Inscrições abertas</Badge>
          <Badge tone="warning">Últimas vagas</Badge>
          <Badge tone="danger">Esgotado</Badge>
          <Badge tone="neutral">Em breve</Badge>
          <Badge tone="accent">Online</Badge>
        </Bloco>
        <Bloco titulo="DateBlock">
          <DateBlock start="2026-03-14" end="2026-03-15" size="lg" />
          <DateBlock start="2026-03-30" end="2026-04-02" />
          <DateBlock start="2026-05-09" size="sm" />
        </Bloco>
        <Bloco titulo="Checkbox">
          <Checkbox label="Li e aceito a política de privacidade" />
          <Checkbox label="Quero receber avisos de novas turmas" hint="Opcional." defaultChecked />
        </Bloco>
        <Bloco titulo="Skeleton">
          <div style={{ width: 280 }}><Skeleton /></div>
          <div style={{ width: 340 }}><Skeleton variant="card" /></div>
          <div style={{ width: 520 }}><Skeleton variant="row" /></div>
        </Bloco>
        <Bloco titulo="Reveal">
          <Reveal><p className="ap-body-l">Este bloco entra com fade ao aparecer na tela.</p></Reveal>
          <Reveal delay={120}><p className="ap-body-l">Este entra 120ms depois.</p></Reveal>
        </Bloco>
        <Section theme="escuro">
          <p className="ap-eyebrow">PedrasFundo</p>
          <div style={{ position: "relative", minHeight: 260, overflow: "hidden" }}>
            <PedrasFundo side="right" />
          </div>
        </Section>
        <Bloco titulo="WhatsAppButton (inline)">
          <WhatsAppButton floating={false} />
        </Bloco>

        {/* MOLECULES */}
        <Section background="sunken">
          <SectionHeading number="02" eyebrow="Moléculas" title="Moléculas" />
        </Section>
        <Section narrow>
          <p className="ap-eyebrow">Alert</p>
          <div style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
            <Alert tone="info" title="Informação">Texto de apoio.</Alert>
            <Alert tone="success" title="Inscrição recebida">Enviamos os próximos passos para o seu e-mail.</Alert>
            <Alert tone="warning" title="Atenção">Confira o registro no conselho.</Alert>
            <Alert tone="danger" title="Revise 2 campos">Digite um e-mail válido, como nome@dominio.com.br.</Alert>
          </div>
        </Section>
        <Section narrow background="sunken">
          <p className="ap-eyebrow">TextField · Select</p>
          <div style={{ display: "grid", gap: "var(--space-5)", marginTop: "var(--space-4)" }}>
            <TextField label="Nome completo" placeholder="Nome da aluna" required />
            <TextField label="E-mail" hint="Usamos só para enviar os próximos passos." />
            <TextField label="Telefone" error="Digite um telefone com DDD, como (31) 90000-0000." defaultValue="31 9" />
            <TextField floating label="Nome (rótulo flutuante)" />
            <TextField floating multiline label="Mensagem" hint="Não envie informações de saúde por aqui." />
            <Select label="Profissão" required options={["Médica(o)", "Dentista", "Biomédica(o)", "Outra"]} />
            <Select floating label="Profissão (rótulo dentro)" required options={["Médica(o)", "Dentista", "Biomédica(o)", "Outra"]} />
            <Select label="Conselho" error="Escolha um conselho." options={["CRM", "CRO", "CRBM", "CRF", "Outro"]} />
            <Select floating label="Conselho (rótulo dentro)" error="Escolha um conselho." options={["CRM", "CRO", "CRBM", "CRF", "Outro"]} />
          </div>
        </Section>
        <Section>
          <p className="ap-eyebrow">SectionHeading · EventMeta · Tabs</p>
          <div style={{ display: "grid", gap: "var(--space-6)", marginTop: "var(--space-4)" }}>
            <SectionHeading number="03" eyebrow="Agenda" title="Próximas turmas" lead="Texto de abertura da seção." />
            <SectionHeading align="center" eyebrow="Centralizado" title="Título centralizado" />
            <EventMeta time="Sáb. e dom., 8h às 18h" city="Belo Horizonte" venue="Local a confirmar" seats="12 vagas" />
            <TabsDemo />
          </div>
        </Section>
        <Section background="sunken">
          <p className="ap-eyebrow">Stats · Testimonial</p>
          <div style={{ display: "grid", gap: "var(--space-6)", marginTop: "var(--space-4)" }}>
            <Stats items={[{ value: "00", label: "Turmas realizadas" }, { value: "+000", label: "Alunas e alunos" }, { value: "00 anos", label: "De experiência" }]} />
            <Testimonial quote="Depoimento autorizado por escrito, a confirmar." name="Nome da aluna" role="Profissão a confirmar" />
          </div>
        </Section>

        {/* ORGANISMS */}
        <Section background="sunken">
          <SectionHeading number="04" eyebrow="Organismos" title="Organismos" />
        </Section>
        <Hero
          title="Equilíbrio, cuidado e paciência"
          lead="Formação prática em toxina botulínica, com turmas reduzidas e acompanhamento próximo."
          primary={{ label: "Ver próximas turmas", href: "#" }}
          secondary={{ label: "Conhecer a Dra.", href: "#" }}
          image="/images/retrato-dra-ana-paula.webp"
          imageAlt="Retrato da Dra. Ana Paula Fonseca"
        />
        <Section>
          <p className="ap-eyebrow">EventCard</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-5)", marginTop: "var(--space-4)" }}>
            <EventCard title="Toxina botulínica · Módulo essencial" start="2026-03-14" end="2026-03-15" image="/images/maos.webp" imageAlt="Mãos em posição de aplicação" summary="Resumo da turma em uma frase." time="Sáb. e dom., 8h às 18h" city="Belo Horizonte" venue="Local a confirmar" seats="12 vagas" price="R$ 0.000" />
            <EventCard title="Toxina botulínica · Módulo avançado" start="2026-04-18" image="/images/luvas.webp" status="ultimas" city="Belo Horizonte" price="R$ 0.000" />
            <EventCard title="Turma esgotada" start="2026-05-23" status="esgotado" city="Belo Horizonte" price="R$ 0.000" />
            <EventCard loading />
          </div>
        </Section>
        <Section background="sunken">
          <p className="ap-eyebrow">AgendaList</p>
          <AgendaList events={AGENDA} />
        </Section>
        <Section>
          <p className="ap-eyebrow">EventSummary · Schedule</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-7)", marginTop: "var(--space-4)", alignItems: "start" }}>
            <Schedule title="Dia 1 · Sábado" items={SCHEDULE} />
            <EventSummary start="2026-03-14" end="2026-03-15" time="Sáb. e dom., 8h às 18h" city="Belo Horizonte" venue="Local a confirmar" seatsTotal={12} seatsTaken={8} price="R$ 0.000" installment="ou 10x de R$ 000" bar={false} />
          </div>
        </Section>
        <Section narrow background="sunken">
          <p className="ap-eyebrow">FAQ</p>
          <FAQ items={[{ q: "Pergunta frequente 1", a: "Resposta a confirmar." }, { q: "Pergunta frequente 2", a: "Resposta a confirmar." }]} />
        </Section>
        <Section>
          <p className="ap-eyebrow">AboutDoctor</p>
          <AboutDoctor photo="/images/retrato-dra-ana-paula.webp" registry="CRM-MG 00000 · RQE 00000" bio="Biografia a confirmar com a Dra." credentials={["Credencial a confirmar", "Credencial a confirmar"]} action={{ label: "Conhecer a Dra.", href: "#" }} />
        </Section>
        <Section background="sunken">
          <p className="ap-eyebrow">Gallery</p>
          <Gallery images={[{ src: "/images/pedras-empilhadas.webp", alt: "Pedras empilhadas em equilíbrio", caption: "Legenda a confirmar" }, { src: "/images/pedras-mar.webp", alt: "Pedras à beira-mar" }, { src: "/images/anatomia-quadril.webp", alt: "Modelo anatômico do quadril" }]} />
        </Section>
        <CTABand eyebrow="Próximas turmas" title="Garanta a sua vaga" text="Turmas reduzidas, com acompanhamento próximo." action={{ label: "Ver turmas", href: "#" }} />
        <Section>
          <p className="ap-eyebrow">Header (estático)</p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Header sticky={false} links={NAV_LINKS} cta={HEADER_CTA} current="/agenda" />
          </div>
        </Section>
        <Section background="sunken">
          <p className="ap-eyebrow">AdminShell · DataTable</p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <AdminShell active="agenda" title="Agenda" actions={<Button size="sm" icon={<PlusIcon />}>Nova data</Button>}>
              <DataTableDemo />
            </AdminShell>
          </div>
        </Section>
        {/* PÁGINAS: peças usadas na fase 3 */}
        <Section background="sunken">
          <SectionHeading number="05" eyebrow="Fase 3" title="Itens de lista, formulários e layouts" />
        </Section>
        <Section>
          <p className="ap-eyebrow">ItemList · FeatureItem · StepItem · BulletItem · InfoCard · ContactItem</p>
          <div style={{ display: "grid", gap: "var(--space-6)", marginTop: "var(--space-4)" }}>
            <ItemList>
              <FeatureItem icon={<Activity size={24} strokeWidth={1.5} aria-hidden />} title="Plano individual">Texto de apoio do item.</FeatureItem>
              <FeatureItem compact title="Sem ícone">Versão compacta.</FeatureItem>
            </ItemList>
            <ItemList ordered>
              <StepItem marker="2018" title="Marco da trajetória">Detalhe a confirmar.</StepItem>
              <StepItem size="lg" marker="01" title="Etapa numerada">Detalhe a confirmar.</StepItem>
            </ItemList>
            <ItemList variant="grid" minWidth={240}>
              <BulletItem>Item com ponto</BulletItem>
              <BulletItem variant="check">Item com marca</BulletItem>
            </ItemList>
            <Grid minWidth={260}>
              <InfoCard icon={<Activity size={24} strokeWidth={1.5} aria-hidden />} title="Informação">Texto do bloco.</InfoCard>
              <ContactItem icon={<Activity size={20} strokeWidth={1.5} aria-hidden />}><a href="#">contato@dominio.com.br</a></ContactItem>
            </Grid>
            <div style={{ maxWidth: 360 }}><MapPlaceholder /></div>
          </div>
        </Section>
        <Section background="sunken" narrow>
          <p className="ap-eyebrow">InscricaoForm · normal</p>
          <InscricaoForm eyebrow="21 e 22 de novembro · Belo Horizonte" profissoes={PROFISSOES} conselhos={CONSELHOS} />
        </Section>
        <Section narrow>
          <p className="ap-eyebrow">InscricaoForm · erro</p>
          <InscricaoForm estadoInicial={{ erroGeral: "Revise 2 campos antes de enviar", erros: { email: "Digite um e-mail válido, como nome@dominio.com.br.", privacidade: "Marque esta opção para enviar a inscrição." }, valores: { nome: "Nome Sobrenome", email: "nome@dominio", telefone: "(31) 00000-0000" } }} eyebrow="21 e 22 de novembro · Belo Horizonte" profissoes={PROFISSOES} conselhos={CONSELHOS} />
        </Section>
        <Section background="sunken" narrow>
          <p className="ap-eyebrow">InscricaoForm · esgotada</p>
          <InscricaoForm esgotada eyebrow="" profissoes={PROFISSOES} conselhos={CONSELHOS} />
        </Section>
        <Section narrow>
          <p className="ap-eyebrow">InscricaoForm · enviada</p>
          <InscricaoForm estadoInicial={{ ok: true }} eyebrow="" profissoes={PROFISSOES} conselhos={CONSELHOS} />
        </Section>
        <Section background="sunken" narrow>
          <p className="ap-eyebrow">ContatoForm</p>
          <ContatoForm assuntos={ASSUNTOS_CONTATO} />
        </Section>
        <Section>
          <SectionHeading number="06" eyebrow="Fase 5" title="Painel" />
          <p className="ap-eyebrow" style={{ marginTop: "var(--space-6)" }}>KpiCard · AdminTable · ExcluirTurmaDialog (ADMIN e EQUIPE)</p>
          <div style={{ display: "grid", gap: "var(--space-5)", marginTop: "var(--space-4)" }}>
            <Grid minWidth={220}>
              <KpiCard rotulo="Próximas turmas" valor={5} nota="Publicadas e ainda por acontecer" />
              <KpiCard rotulo="Vagas livres" valor={32} nota="Somando as turmas com inscrições abertas" />
            </Grid>
            <AdminTable linhas={[{ id: 1, turma: "Toxina botulínica — módulo essencial", data: "21–22/11/2026" }]} colunas={[{ key: "turma", label: "Turma" }, { key: "data", label: "Data" }]} acoes={() => <ExcluirDialogDemo podeExcluir />} />
            <ExcluirDialogDemo podeExcluir={false} />
          </div>
        </Section>
        <Section background="sunken">
          <p className="ap-eyebrow">LoginForm · normal, erro e bloqueado</p>
          <div style={{ display: "grid", gap: "var(--space-7)", marginTop: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
            <LoginDemo />
            <LoginDemo erro="invalida" />
            <LoginDemo erro="bloqueada" />
          </div>
        </Section>
        <Footer {...footerDe(montarSite(null))} />
      </main>
    </>
  );
}
