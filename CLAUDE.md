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
  - Foto da turma (Vercel Blob, store com acesso **Público**; store privado recusa `access: "public"` e o envio fica parado em "Enviando…"): a pessoa escolhe JPG, PNG, WebP ou HEIC/HEIF de até 25 MB, enquadra num recorte 16:10 fixo (`react-easy-crop`: arrasta, zoom e setas do teclado) e **o navegador prepara o arquivo antes de enviar** (`lib/foto-cliente.ts`): recorta, reduz para no máximo 2000 de largura, converte para WebP (qualidade 0,82) e, por passar por um canvas, perde EXIF e GPS. HEIC é convertido no navegador (`heic-to`, carregado só quando preciso). Recorte com menos de 1200 de largura mostra aviso que não bloqueia ("Usar mesmo assim"). Só o WebP final vai para o Blob: `/api/admin/foto` gera o token, confere a permissão e limita a **WebP de até 2 MB**; o servidor também só grava na turma URL do nosso Blob (`fotoValida` em `lib/turma-form.ts`) ou da biblioteca. Regras e mensagens em `lib/fotos.ts` (mensagens em linguagem simples, sem 16:10, px ou MB). HEIC real só se testa à mão num iPhone/Safari ou com um arquivo `.heic`.
- **E-mail**: `lib/email/` é uma camada isolada: o resto do código só chama `enviarEmail` (nunca Nodemailer, Gmail ou Resend). O provedor vem de `EMAIL_PROVIDER` (`smtp` com o Gmail do site é o padrão; `resend` e `console` também existem); trocar de provedor é só configuração.
  - Variáveis: `EMAIL_TESTE` (Gmail do site: **remetente**) e `SENHA_TESTE` (senha de app do Google). Remetente: "Dra. Ana Paula Fonseca". Os **avisos internos** (nova inscrição, mensagem de contato) vão para os e-mails dos **usuários ADMIN ativos**; `EMAIL_EQUIPE` (ou `EMAIL_TESTE`) só vale como reserva se não houver ADMIN ativo (`lib/email/destinatarios.ts`).
  - E-mails: confirmação de inscrição, lista de espera, **vaga confirmada** (quando a situação muda para CONFIRMADA), aviso de inscrição e aviso de contato. O logo é o PNG `public/logos/logo-horizontal-negativo-2x.png`, por URL absoluta de `SITE_URL`.
  - Modelos em React Email (`lib/email/modelos/`) com a identidade do design system. `yarn`: `node --import tsx scripts/previa-emails.tsx` gera uma prévia em `capturas/emails`.
  - O e-mail sai **depois** de gravar no banco (`after()` na Server Action). Cada envio vira uma linha em `emails_envios` (PENDENTE → ENVIADO ou FALHOU, com o motivo sem credenciais). Falha de e-mail nunca derruba a inscrição. Em Inscrições, o botão **Reenviar** refaz o envio remontando o e-mail com os dados atuais.
- **Configurações da clínica**: telefone, WhatsApp, Instagram, e-mail público, endereço, horário, CRM e RQE ficam na tabela `configuracoes` (linha única, só o ADMIN edita) e alimentam Header, Footer, botão de WhatsApp, contato, dados estruturados e e-mails. Leitura em cache com `cacheTag('configuracoes')`, invalidada com `updateTag` ao salvar. O botão "Enviar e-mail de teste" manda para o ADMIN logado. O aceite da política de privacidade guarda data e hora (`aceite_privacidade_em`), visível em Inscrições e na planilha.
- **Formulários públicos** (contato e inscrição): validação com zod no servidor, duplicidade por e-mail e `updateTag` das tags da turma. A inscrição trava a turma (`FOR UPDATE`). As barreiras contra robô ficam em `lib/protecao-formulario.ts`, nesta ordem, e **todo descarte passa por `registrarDescarte`** (`lib/descartes.ts`): em desenvolvimento escreve o motivo no terminal; em produção, uma linha de log sem dado pessoal; nos dois, soma +1 em `formularios_descartes` (por dia, formulário e motivo), mostrado ao ADMIN no Painel ("Envios barrados nos formulários").
  1. **Campo-armadilha** `campo_hp_7k` (`CAMPO_ARMADILHA`): nome sem sentido, `autocomplete="off"`, `data-lpignore`, `tabIndex={-1}`, `aria-hidden`, fora da tela por CSS (nunca `display:none` nem `type="hidden"`). **Nunca nomeie a armadilha como website, url, empresa, telefone, nome ou e-mail**: o autopreenchimento do Chrome preenche e a pessoa real recebia falso sucesso (bug da Fase 6). Preenchida = responde "ok" sem gravar.
  2. **Carimbo de tempo assinado** (`lib/carimbo.ts`): ao abrir o formulário, o navegador pede o carimbo ao servidor (Server Action `obterCarimbo`, HMAC com `AUTH_SECRET`); no envio o servidor confere a assinatura e a idade. Menos de 2 s (`FORM_TEMPO_MINIMO_MS`) ou sem carimbo válido: aviso de verdade, o que a pessoa digitou fica, nada é gravado. **Carimbo vencido (mais de 12 h, aba aberta de um dia para o outro) não é erro**: o servidor responde `renovarCarimbo` e o formulário (`lib/use-carimbo.ts`) pede um carimbo novo em segundo plano, espera o tempo mínimo e reenvia sozinho; só avisa se o reenvio também falhar. O carimbo também é renovado quando a aba volta a ficar visível depois de mais de 1 hora (`visibilitychange`).
  3. **Limite por visitante** (inscrição: 5 em 10 minutos; contato: 3 em 10 minutos; a chave é um hash do IP): "Muitas tentativas, tente de novo em alguns minutos."
  Só a armadilha devolve falso sucesso; as outras barreiras sempre avisam. Em `<select>` com `defaultValue` vindo do estado da action, use `key` com o valor: o React não atualiza o `defaultValue` de um select já montado (a escolha sumia depois de um erro). Testes e2e esperam o carimbo e 2 s antes de enviar (`e2e/inscricao.spec.ts`) e `e2e/autopreenchimento.spec.ts` preenche os formulários como o Chrome faz.
- **Testes**: `yarn test` (unidade e banco; `TESTES_BANCO=1` liga os que gravam no banco) e `yarn test:e2e` (Playwright contra o build e o banco de desenvolvimento; rode `yarn build` antes). Testes e2e de formulário esperam a hidratação antes de digitar. O e2e roda com `EMAIL_PROVIDER=console`. `scripts/capturas.mjs` tira capturas de todas as rotas em 1440px e 390px, nos dois temas.
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
- **Tema**: o site tem **só o tema claro** (`<html data-theme="claro">` fixo em `app/layout.tsx`), sem botão de troca, sem cookie e sem `prefers-color-scheme`. As seções escuras da marca (Hero, CTABand, Footer, `Section theme="escuro"`) continuam existindo: elas forçam `data-theme="escuro"` no próprio elemento. Os tokens escuros ficam em `ap-tokens.css` por causa dessas seções.
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
- **Publicação / SEO**: tudo é controlado por **uma variável, `SITE_PUBLICO`** (`lib/seo.ts`). Diferente de `"true"` (padrão): `robots.txt` bloqueia tudo, toda página sai com `noindex` (metadados e cabeçalho `X-Robots-Tag`), o sitemap fica vazio e não é anunciado. Com `"true"`: indexação e sitemap ligados. O admin é **sempre** noindex e nunca entra no sitemap. As páginas são estáticas: **depois de mudar `SITE_PUBLICO` na Vercel, faça um novo deploy.** `SITE_URL` define o endereço público (canonical, Open Graph, sitemap, links e logo dos e-mails). Dados estruturados (`lib/dados-estruturados.ts`: Physician e Event) omitem qualquer campo que ainda seja placeholder (`ehPlaceholder` em `lib/site.ts`). Preview só com proteção por senha.
- **Lighthouse** (`node scripts/lighthouse.mjs`, com o site no ar; use build com `SITE_PUBLICO=true` para a nota de SEO valer) e **axe** (`e2e/acessibilidade.spec.ts`). Acessibilidade e SEO ficam em 98–100. Teste manual de teclado e leitor de tela ainda é necessário antes de abrir o site.

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
