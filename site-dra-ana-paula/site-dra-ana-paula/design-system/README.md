Sistema visual do site da Dra. Ana Paula Fonseca, médica fisiatra. É o site institucional da clínica com uma **agenda** das turmas de toxina botulínica que a Dra. ministra para profissionais da saúde (datas, local, programação e inscrição), mais um painel admin onde ela mesma cadastra as datas. O site não hospeda curso nem aula: ele divulga as turmas e recebe inscrições. Tudo aqui nasce do manual de marca (agência Fallas). O que o manual não cobria para web (estados, formulários, tema escuro, movimento) foi derivado dele e está marcado como **derivado**.

## Princípios

- **Equilíbrio, cuidado, paciência.** O conceito da marca é a pilha de pedras zen: movimento + equilíbrio. Layouts calmos, muito respiro, uma ideia por seção.
- **Seriedade de saúde.** Cantos retos (`radius-none`; 2px só em controles), nada de cores vibrantes, sem emoji, sem promessas de resultado.
- **60 / 30 / 10.** Azul-escuro domina (60%), azul claro acompanha (30%), creme pontua (10%). No site isso vira um ritmo de seções: hero, faixas de chamada e rodapé em azul-escuro; o conteúdo de leitura em creme.

## Conteúdo e tom

- Fale **com** o profissional, em "você", em português do Brasil. Tom acolhedor e técnico ao mesmo tempo: "Formação prática em toxina botulínica, com turmas reduzidas e acompanhamento próximo."
- Títulos curtos em CAIXA ALTA (o CSS faz a caixa alta; escreva o texto normal na fonte). Botões começam com verbo: "Quero me inscrever", "Ver conteúdo", "Garantir minha vaga".
- Nomes: "Dra. Ana Paula Fonseca" por extenso na primeira menção, depois "a Dra.". Especialidade: "Médica Fisiatra".
- Sem pontos de exclamação, sem superlativos ("o melhor curso"), sem urgência falsa. Escassez só quando real (selo "Últimas vagas" vem do número de vagas).
- **Publicidade médica (CFM):** não use fotos de antes e depois, não prometa resultados e não exponha pacientes. Mostre sempre CRM e RQE junto ao nome da Dra. (rodapé e `AboutDoctor`). Confirme as regras atuais com a Dra. antes de publicar depoimentos e galeria.
- Textos ainda não definidos ficam como placeholders explícitos ("Nome da aluna", "R$ 0.000", "CRM-MG 00000"). Nunca invente credenciais, números ou depoimentos.

## Cor

- Use os tokens semânticos (`surface`, `ink`, `action`…), não os `brand-*` direto. Os `brand-*` existem para a cor exata do manual e para componentes de marca.
- Dois temas: **claro** (fundo `brand-creme`, padrão) e **escuro** (fundo `brand-azul-escuro`). O site tem um botão de tema (`ThemeToggle`) que troca `data-theme` no `<html>`.
- Uma seção pode forçar o tema dela: `<Section theme="escuro">` ou `data-theme="escuro"` em qualquer elemento. É assim que se fazem as seções de marca em azul-escuro dentro do tema claro. `Hero`, `CTABand`, `Footer` e a barra lateral do admin já vêm em `escuro`.
- Texto: `ink` para o principal, `ink-muted` para o secundário. Sobretítulos e números em `accent-ink`.
- `accent` (azul claro) é para **formas**: as pedras, fios, ícones decorativos. Sobre o creme ele não tem contraste de texto (2:1), e isso é da própria marca, não um erro. Nunca escreva texto nem desenhe ícone que carregue significado em `accent` sobre fundo claro.
- Status (`success`, `warning`, `danger` e seus `-soft`) são **derivados**, em tons sóbrios. Sempre com ícone e palavra junto. Nunca só a cor.
- Foco de teclado: o token `focus-ring` (2px da cor da página e 2px sólidos de `ink`), via `box-shadow`. Não remova o foco.

## Tipografia

O manual pede Kalista Serif/Sans e Myriad Pro, que não têm licença web. As trocas gratuitas (Google Fonts, licença OFL) são:

| Manual | Site | Por quê |
|---|---|---|
| Kalista Serif / Kalista Sans (títulos, destaques) | **Marcellus** | Serifa expandida de inspiração romana, mesmo desenho de capitulares |
| Myriad Pro (textos) | **Source Sans 3** | Humanista da própria Adobe, quase idêntica em proporção e ritmo |

- Títulos (`display-xl`, `display-l`, `h1`, `h2`) em Marcellus, CAIXA ALTA, espaçamento 0.05em, como o manual. Subtítulos (`h3`, `h4`, `subtitle`) em Marcellus, caixa baixa.
- Texto corrido em `body` ou `body-l`; abertura de seção em `lead` (Light 300).
- `eyebrow`: Source Sans 3 600, caixa alta, 0.18em. Ecoa a linha "MÉDICA FISIATRA" do logo. Vai acima de quase todo título.
- **Números** (`numeral`, preços, contagens) em Source Sans 3, nunca em Marcellus: os algarismos dela são de estilo antigo e o 0 parece um O.
- Abaixo de 768px use os estilos do grupo Celular (`display-xl-m`, `h1-m`, `h2-m`, `lead-m`).
- No Next.js carregue as fontes com `next/font/google` (`Marcellus` peso 400; `Source_Sans_3` pesos 300, 400, 600, 700) e aponte as variáveis `--font-display` e `--font-sans` para elas. Os arquivos .woff2 em `fonts/` servem para auto-hospedar.

## Espaço, forma e profundidade

- Base de 4px (`space-1` a `space-10`). Entre seções: `space-10` no desktop e `space-8` no celular. Entre título e conteúdo: `space-7`.
- Conteúdo em `container` (1200px); texto longo, formulários e FAQ em `container-narrow` (760px).
- Cantos retos: `radius-none` em cartões, fotos e seções; `radius-control` (2px) em botões, campos e selos. `radius-full` só para pontos, avatares e o botão do WhatsApp.
- Profundidade com sombras suaves tingidas de azul: `shadow-sm` em repouso, `shadow-md` em cartões e fotos, `shadow-lg` no hover e em tudo que flutua. Sombras sim, bordas grossas não.
- Fios finos (`line`) separam itens de lista, FAQ e módulos. O fio curto em `accent` com número e rótulo (`SectionHeading`) é a assinatura das páginas do manual ("06 —— Logo").

## Movimento

A interface responde a tudo (rolar, passar o mouse, clicar), mas no ritmo da marca: movimentos longos e suaves, como pedras se assentando. Nada quica, pisca ou gira. Esse é o lado "moderno" do site, sem a estética de tecnologia (neon, degradê, vidro, brilho).

- **Assinatura: pedras se empilhando.** As pedras caem e pousam de baixo para cima (`duration-intro`, `ease-settle`): na abertura do `Hero`, no `PedrasFundo` e no `Logo` com `animated` (tela de carregamento, página de confirmação). Use uma vez por página.
- **Rolar:** blocos entram com `Reveal` (fade + 24px, `duration-slow`, `ease-out`); as pedras de fundo têm parallax leve; os `Stats` contam até o valor (`duration-count`); a linha da `Schedule` se preenche e acende cada horário.
- **Passar o mouse:** cartões de data sobem 6px, a foto aproxima e aparece o resumo; a linha da agenda ganha fundo que entra da esquerda; botões se preenchem da esquerda para a direita e a flecha avança 4px; depoimentos sobem 4px.
- **Clicar e digitar:** o indicador das `Tabs` desliza até a aba; a agenda filtrada entra de novo, escalonada (70ms por linha); o rótulo do campo `floating` sobe e uma linha se desenha embaixo; o check da `Checkbox` se desenha; o ícone do alerta de sucesso se desenha ao confirmar a inscrição.
- **Esperar:** enquanto as datas carregam do admin, use `Skeleton` (brilho lento nas cores da marca), nunca tela vazia ou spinner.
- **Trocar de página:** o `bundle.css` liga as View Transitions (`@view-transition`). Dê o mesmo `transitionName` à foto do `EventCard` e ao `Hero` da página da turma (ex. `turma-123`) e a foto "cresce" do cartão até o topo. No Next.js (App Router), use a API `document.startViewTransition` ou a opção experimental `viewTransition` do Next.
- **Regras:** uma animação de entrada por bloco; escalone grades com 0 / 120 / 240ms, no máximo 4 passos; durações só dos tokens (`duration-*`, `ease-*`). `prefers-reduced-motion` desliga tudo, e o parallax e a contagem param (já está no código).

## Logo

- Use o componente `Logo` no site: ele desenha os vetores originais do manual e troca de cor com o tema (`logo-ink` e `logo-stone`). Para outros usos (e-mail, redes, PDF), use os SVG do grupo **Logos**.
- Header: `horizontal`, 168px de largura (140px no celular). Rodapé: `vertical`. Selo (`selo`) para carimbos, a foto da Dra. e assinatura de materiais. Símbolo (`simbolo`) sozinho só abaixo de `logo-min-width` (120px) ou como elemento gráfico.
- Respeite a área de proteção do manual: em volta do logo, deixe livre a altura da pedra do topo.
- Não rotacione, não distorça, não troque cores ou fonte, não reposicione as pedras e não aplique sobre foto de baixo contraste nem textura complexa (manual p. 14).
- Favicon e ícone de app: `favicon.svg` (pedras em azul claro sobre quadrado azul-escuro arredondado).

## Imagens

- Fotos com luz suave, fundos azul-acinzentados ou areia, temas de corpo, mãos, movimento e equilíbrio (grupo **Fotografia**). A Dra. autorizou o uso.
- A foto da Dra. vai sempre com moldura reta e `shadow-md`. No `AboutDoctor` o selo do logo se sobrepõe ao canto.
- Fotos de turma em 16:10 (cartões de data), retratos em 4:5. Nada de banco de imagens genérico com sorriso de estúdio.
- Grafismo de pedras: use `PedrasFundo` (o próprio símbolo ampliado, em `pedra`) atrás de seções em azul-escuro. Uma vez por tela, no máximo.
- Textura de areia (`textura-areia.webp`) pode ir em fundos grandes no tema claro, com o selo por cima (manual p. 25).

## Iconografia

- **Lucide** (`lucide-react`), traço 1.5, 18 a 20px no texto, 24px em botões de ícone. Ícones vão em `accent-ink` ao lado de metadados e em `ink` em botões.
- O manual não define um conjunto de ícones. Lucide foi escolhido porque o traço fino combina com o cartão digital da marca. O ícone do WhatsApp vem do Simple Icons.

## Site e admin

- Páginas previstas: Início, Sobre a Dra., Clínica, Agenda de cursos, página de cada turma (com inscrição), Contato.
- **Início:** `Hero` (pedras se empilhando), um bloco da clínica, "Próximas turmas" com 3 `EventCard`, `AboutDoctor`, `Stats`, `Testimonial`, `CTABand`, `Footer`.
- **Agenda:** `SectionHeading` + `AgendaList` (datas por mês, filtro por modalidade). Turmas passadas ficam como "Realizado" ou saem da lista.
- **Página da turma:** `Hero` curto com a foto, e em duas colunas o conteúdo (descrição, `Schedule`, para quem é, `AboutDoctor`, `FAQ`) e o `EventSummary` fixo à direita. No celular o resumo vira barra no rodapé. Formulário de inscrição no fim (`TextField` com `floating`, `Select`, `Checkbox`) e `Alert` de sucesso depois de enviar.
- **Admin:** `AdminShell` com Painel, Agenda, Inscrições e Configurações. A agenda é uma `DataTable` de datas (turma, data, local, inscritos, status); "Nova data" abre um formulário com os mesmos campos do `EventCard` e do `EventSummary` (título, início, fim, horário, cidade, local, modalidade, vagas, preço, status, foto, programação). O status "Últimas vagas" e "Esgotado" deve vir do número de inscritos, não ser marcado à mão.
- Os componentes estão em `components/bundle.js` como `window.ApFonseca` (React 18). Para o Next.js, copie o código-fonte de `components/src/index.jsx` e os estilos de `components/bundle.css` para o projeto.
