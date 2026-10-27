# Site da Dra. Ana Paula Fonseca — instruções para o Claude Code

Este repositório é o site da Dra. Ana Paula Fonseca, médica fisiatra em Belo Horizonte. O site tem duas partes:

- a parte institucional da clínica;
- a agenda das turmas de toxina botulínica que ela ministra para profissionais da saúde, com inscrição online.

Também há um painel admin, onde ela cadastra as datas e acompanha as inscrições. O site não hospeda curso nem aula: ele divulga as turmas e recebe inscrições.

Leia nesta ordem antes de escrever código:

1. `AGENTS.md` e o guia relevante em `node_modules/next/dist/docs/`: este Next.js (16) tem mudanças que quebram o que você conhece (por exemplo, `middleware` virou `proxy` e `cacheComponents` está ligado).
2. `site-dra-ana-paula/docs/ESPECIFICACAO.md`: rotas, dados, regras de negócio, cache e fases de trabalho.
3. `site-dra-ana-paula/design-system/README.md`: princípios, cor, tipografia, movimento, tom de voz e regras do CFM.
4. `site-dra-ana-paula/design/` (as telas aprovadas). Antes de abrir um arquivo, leia "Como ler os arquivos `.dc.html`", mais abaixo.

A pasta `site-dra-ana-paula/` é só material de referência (specs, telas, design system em JSX). Não faz parte do app: está fora do `tsconfig` e do ESLint. Nada do app importa dela.

## Stack

- Next.js 16 (App Router) com TypeScript, React 19 e React Compiler. Gerenciador de pacotes: **yarn**. Deploy pensado para a Vercel.
- `cacheComponents` e `partialPrefetching` ligados em `next.config.ts`. Veja "Cache" mais abaixo.
- **Banco**: Postgres na Neon (sa-east-1) com Drizzle. Schema em `db/schema.ts`, migrations em `db/migrations`, cliente em `db/index.ts` (driver WebSocket, para a transação da inscrição). Funções da Vercel em `gru1` (`vercel.json`).
  - Variáveis em `.env.local` (fora do git): `DATABASE_URL` (pooler) e `DATABASE_URL_UNPOOLED` (migrations). Nunca imprima nem comite as connection strings.
  - `yarn db:generate` cria uma migration a partir do schema; `yarn db:migrate` aplica; `SEED_PERMITIDO=1 yarn db:seed` popula o banco de **desenvolvimento** (nunca produção).
- **Admin e login**: Auth.js (`next-auth@5` beta) com o provider Credentials, sessão em JWT. Senha com argon2id (`@node-rs/argon2`). Bloqueio de 15 minutos depois de 5 senhas erradas (tabela `login_tentativas`). Sessão de 7 dias, ou 30 com "Manter conectada". Sem cadastro público e sem "esqueci minha senha" por e-mail: o ADMIN redefine a senha da equipe em Configurações.
  - Papéis em `lib/permissoes.ts` (única fonte da regra): **ADMIN** (a Dra.): tudo. **EQUIPE**: cria e edita turmas e cuida das inscrições; não exclui turmas nem mexe em usuários.
  - O `proxy.ts` só confere se há sessão e redireciona; não consulta o banco. **Toda Server Action e todo Route Handler do admin começa com `autorizar("<permissão>")`** (`lib/sessao.ts`), que relê usuário, papel e `ativo` do banco: esconder o botão na tela não protege nada.
  - O primeiro ADMIN é criado por `yarn admin:criar` (pergunta nome, e-mail e senha; a senha não aparece). Os demais, em Configurações.
  - Variáveis: `AUTH_SECRET` (gere um por ambiente), `AUTH_TRUST_HOST=true` só em `next start` local (na Vercel é automático) e `BLOB_READ_WRITE_TOKEN` (fotos).
  - Foto da turma: Vercel Blob, com envio direto do navegador (`/api/admin/foto` só gera o token e confere a permissão). Regras: JPG ou WebP, 16:10, a partir de 1600 px, até 5 MB.
- **Testes**: `yarn test` (unidade e banco; `TESTES_BANCO=1` liga os que gravam no banco) e `yarn test:e2e` (Playwright contra o build e o banco de desenvolvimento; rode `yarn build` antes). Testes e2e de formulário esperam a hidratação antes de digitar. `scripts/capturas.mjs` tira capturas de todas as rotas em 1440px e 390px, nos dois temas.
- **CSS**: sem Tailwind e sem CSS-in-JS.
  - `app/styles/bundle.css` traz as classes `ap-*` do design system e `app/styles/ap-tokens.css` traz as variáveis CSS (geradas de `design-system/tokens.json`). Os dois são importados em `app/layout.tsx`.
  - Estilos novos vão em CSS Modules, ao lado do componente, sempre com os tokens (`var(--space-5)`, `var(--ink)`…). Nada de valor solto.
- **Componentes (Atomic Design)**: ficam em `components/`, um arquivo por componente, e cada nível tem um `index.ts`.
  - `atoms/`: peças que não se dividem (Logo, Button, Badge, DateBlock, Stack…).
  - `molecules/`: poucos átomos juntos (TextField, Alert, SectionHeading, Tabs, itens de lista…).
  - `organisms/`: blocos completos de uma seção (Hero, EventCard, AgendaList, Header, Footer, formulários…).
  - `templates/`: esqueletos de página sem conteúdo real (Section, PublicTemplate, SplitLayout…).
  - As **páginas** são as rotas em `app/`.
  - Um nível só importa dos níveis abaixo (organismo usa molécula e átomo, nunca o contrário). Dentro de `components/`, importe por caminho relativo do arquivo; nas páginas, pelo `index.ts` (`@/components/atoms`).
  - `"use client"` só nos componentes que usam estado, efeitos ou eventos.
  - A marcação, as classes `ap-*` e os comportamentos vêm de `design-system/components/src/index.jsx`. Não redesenhe nada.
- **Utilitários**: `lib/` (`cx`, `icon`, `motion`, `agenda`, `theme`, `site`). Os dados de exemplo da fase 3 ficam em `lib/dados-exemplo.ts`.
- **Ícones**: `lucide-react`, com traço 1,5. Os ícones de marca (WhatsApp, Instagram) vêm de `simple-icons`, porque o `lucide-react` 1.x não os tem.
- **Fontes**: `next/font/google` em `app/layout.tsx`, com Marcellus 400 e Source Sans 3 (300, 400, 600, 700 e 400 itálico). Elas entram pelas variáveis `--nf-display` e `--nf-sans`, que o `ap-tokens.css` usa dentro de `--font-display` e `--font-sans`.
- **Tema**: `data-theme` (`claro` ou `escuro`) no `<html>`, fixado antes da pintura por um script inline (`lib/theme-script.ts`) que lê o cookie `ap-theme` ou `prefers-color-scheme`. Não leia cookies no layout: isso tornaria o site inteiro dinâmico.
- **Imagens**: ficam em `public/images/`, `public/logos/` e `public/favicon.svg`. Use `next/image`.
- **Links**: links internos usam `next/link`; só links externos, `mailto:`, `tel:` e âncoras (`#`) usam `<a>`.

## Cache

- Leituras de turmas são funções com `'use cache'` em `lib/turmas.ts`, com `cacheTag('turmas')` (listas) e `cacheTag('turma:<slug>')` (cada turma, **incluindo a contagem de vagas**), e `cacheLife` curto.
- Sempre que uma inscrição for criada ou alterada, ou o admin salvar, publicar, mudar ou excluir uma turma, invalide `turma:<slug>` e `turmas`. Se o slug mudou, invalide o antigo e o novo.
  - Em **Server Actions**: `updateTag(tag)`.
  - **Fora delas** (Route Handlers, webhooks): `revalidateTag(tag, { expire: 0 })`.
  - Nunca use o perfil `"max"`: ele serve conteúdo antigo enquanto revalida, e a contagem de vagas ficaria desatualizada.
- A gravação (`lib/inscricoes.ts`) nunca lê do cache: conta as vagas direto no banco, com `SELECT … FOR UPDATE` na turma.
- **404**: a turma inexistente chama `notFound()` na página e `app/not-found.tsx` manda `noindex`. Com `cacheComponents` o status já saiu como 200 junto com o shell; consertar isso exigiria uma consulta ao banco no proxy a cada visita, o que acorda o Neon e gasta as horas do plano gratuito. Não faça essa consulta no proxy.
- Detalhes e motivos em `site-dra-ana-paula/docs/ESPECIFICACAO.md`, seção "Cache e invalidação".
- **Publicação**: nada vai para o domínio público antes da Fase 6 (`app/robots.ts` bloqueia e o layout manda `noindex`). Preview só com proteção por senha.

## Regras que não se negociam

- **Cantos e sombras**: cantos retos (`radius-none`), com 2px só em controles. Sombras suaves, nunca bordas grossas.
- **Tipografia**:
  - títulos em Marcellus, em CAIXA ALTA feita pelo CSS;
  - números (datas, preços, contagens) sempre em Source Sans 3, nunca em Marcellus.
- **Ritmo das seções**: alterne seções creme e azul-escuro e nunca ponha duas escuras seguidas.
  - O Hero, as faixas de chamada (CTABand) e o Footer são escuros.
- **Movimento calmo**: use só os tokens `duration-*` e `ease-*`. Nada pode quicar ou piscar.
  - Respeite `prefers-reduced-motion`; o código do design system já faz isso.
- **Placeholders**: conteúdo que ainda não existe fica como placeholder explícito. Exemplos: "CRM-MG 00000", "R$ 0.000", "Nome da aluna", "Resposta a confirmar".
  - Nunca invente credenciais, números, depoimentos ou respostas.
- **Publicidade médica (CFM)**:
  - não use fotos de antes e depois nem de pacientes, e não prometa resultados;
  - mostre o CRM e o RQE junto ao nome da Dra.
- **Status das turmas**: "Últimas vagas" e "Esgotado" são calculados a partir do número de inscritos e nunca são marcados à mão. As regras estão na especificação.
- **Acessibilidade**:
  - use `<button>`, `<a href>` e `<label>` reais;
  - mantenha o foco visível com o token `focus-ring`;
  - contraste mínimo de 4,5:1;
  - status sempre com ícone e palavra juntos, nunca só pela cor.
- **Idioma**: todo o texto em português do Brasil, falando com a pessoa como "você". Botões começam com verbo e não se usam pontos de exclamação.

## Como ler os arquivos `.dc.html` (as telas aprovadas)

Cada arquivo em `site-dra-ana-paula/design/` é uma tela ou um estado de tela, desenhado num editor de design. Não copie o formato: leia-o como especificação.

| No arquivo | Significa em React |
|---|---|
| `<x-import component-from-global-scope="ApFonseca.Hero" title="…" image-alt="…">` | `<Hero title="…" imageAlt="…" />` (atributos em kebab-case viram props em camelCase) |
| texto entre `<x-import …>` e `</x-import>` | `children` |
| `prop="{{nome}}"` | o valor vem do objeto retornado por `renderVals()` no `<script>` do fim do arquivo, onde estão os dados de exemplo |
| `<sc-if value="{{cond}}">…</sc-if>` | `{cond && (…)}` |
| `<sc-for list="{{itens}}" as="item">…</sc-for>` | `{itens.map(item => …)}` |
| `<dc-import name="TurmaInscricao" estado="erro">` | renderiza o arquivo `TurmaInscricao.dc.html` com a prop `estado="erro"` (é um componente filho) |
| `style="…"` inline com `var(--…)` | o layout desejado; transforme em CSS Modules, sempre com os tokens |
| `/images/…` em `src` | arquivos em `public/images/` |

O mapa de quais arquivos formam cada página está em `site-dra-ana-paula/docs/ESPECIFICACAO.md`, na seção "Telas de referência" (tabela de rotas).

## Como trabalhar

- Siga as fases da especificação, uma por vez. Ao fim de cada fase, rode `yarn build` e `yarn lint` e mostre o resultado antes de seguir.
- **Decisões abertas** (banco, autenticação, e-mail, pagamento) estão listadas na especificação. Pergunte antes de escolher se não tiverem sido respondidas.
- **Página de conferência**: `/dev/componentes` (só em desenvolvimento) mostra todos os componentes. Componente novo entra lá.
