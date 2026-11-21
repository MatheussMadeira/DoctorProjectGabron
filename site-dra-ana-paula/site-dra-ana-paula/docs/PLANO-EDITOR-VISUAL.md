# Plano: editor visual do site ReabToxin

Base: o editor do repositório **SiteTurmaAventura** (`src/admin/editor/*`, `src/server/admin/editor.ts`, `prisma/schema.prisma`), adaptado ao que o ReabToxin já tem (7 idiomas, DeepL, `cacheComponents`, Vercel Blob, tabelas `*_traducoes`).
Escopo pedido pelo cliente: **Início** e **Sobre o curso**. Edição só em português; os outros 6 idiomas saem da DeepL ao publicar.
Situação: **implementado** (etapas 0 a 4). Decisões tomadas onde o plano deixou perguntas em aberto: cabeçalho e rodapé ficam fora; SEO fica fora; sem "restaurar versão" e sem publicação agendada (cabem depois); sem criar tipos novos de seção; as fotos fixas do código (`/images/...`) passam a ser trocáveis pelo diálogo de foto (biblioteca da marca ou envio); a proposta e os pilares agora são **por página** (o texto de cada um se edita na seção da própria página; o seed copia o mesmo texto nas duas).

## 1. O que o editor da Turma da Aventura faz (e vamos repetir)

| Peça | Como funciona lá | Arquivo de referência |
|---|---|---|
| Página = lista de **seções** | cada seção tem `key`, `type`, `order`, `visible`, `draft`, `published`, `publishedOrder`, `publishedVisible` | `prisma/schema.prisma` (`Section`, `Page`) |
| **Um schema zod por tipo de seção** | define campos, limites de caracteres, dicas e proporção das fotos; o painel é desenhado a partir dele (`describe.ts`) | `src/content/sections/schemas.ts`, `fields.ts` |
| **Prévia = a página real** num `<iframe>` | rota própria que lê o rascunho; os mesmos componentes do site; celular = largura 390px do iframe | `src/app/admin/(editor)/preview/[slug]`, `PreviewClient.tsx` |
| **Renderers por página** | `{ chaveDaSeção: (conteúdo, ctx) => JSX }`, usados pelo site e pela prévia | `src/site/pages/*` |
| **Conversa editor ⇄ iframe** | `postMessage` (`select`, `text-live`, `pick-image`, `state`, `scroll`), só mesma origem | `protocol.ts` |
| **Edição no lugar** sem mexer nos componentes | depois de renderizar, o `annotate.ts` acha no DOM o elemento de cada texto e marca `data-edit-path` | `annotate.ts` |
| **Rascunho automático** (~1 s), **desfazer/refazer** por sessão | pilha de fotografias do estado; digitar no mesmo campo vira um passo só | `history.ts` |
| **Publicar** | copia rascunho → publicado numa transação e expira o cache | `src/server/publish.ts` |
| **Uma pessoa por página** | reserva (`PageLock`) com batimento; quem chega depois não edita | `editLock.ts`, `PageLock` |
| **Trocar foto** | diálogo com recorte na proporção do slot, descrição obrigatória | `PhotoDialog.tsx`, `crop.ts` |
| **Celular** | tocar num texto abre uma folha inferior com o campo | `EditorApp.tsx` |

Tamanho de referência: ~3 mil linhas em `src/admin/editor` + ~500 de schemas e servidor. Cobertura de e2e: 14 cenários (`e2e/editor.spec.ts`).

## 2. O que muda no ReabToxin (diferenças que pesam)

1. **7 idiomas.** O conteúdo editável vira português + traduções. Já temos o padrão pronto: tabelas `*_traducoes` com `conteudo`, hash do português por campo (`origem`), status `rascunho_automatico`/`revisada`, `precisa_revisar`, `traduzirNaHora` e a tela `TraducoesAdmin`. O editor **reaproveita tudo isso**, por seção.
2. **`cacheComponents` + PPR.** As páginas públicas são estáticas e leem dados com `'use cache'` + tag. A prévia do editor **nunca** passa por cache e fica fora das páginas estáticas. Já validamos o padrão (`Suspense` + leitura de sessão) nas áreas do aluno.
3. **Os textos de hoje moram em dois lugares:** `messages/pt-BR.json` (`Home.*`, `Sobre.*`) e a tabela `textos_curso` (topo, proposta, pilares, números, valores, já editáveis em Configurações › Curso). O editor precisa de **uma fonte só**.
4. **Seções com dados vivos** (próximas turmas, professores, galeria, depoimentos). O editor edita só o **cabeçalho** delas (sobretítulo, título, frase), a ordem e a visibilidade; os dados continuam nas telas atuais.
5. **Componentes do site são em parte de servidor.** Para a prévia ao vivo (digitar e ver), os renderers precisam rodar no navegador: recebem tudo por props (conteúdo, textos fixos, dados já carregados), sem ler banco nem `getTranslations`.

## 3. Arquitetura proposta

### 3.1 Dados (migration aditiva)
- `paginas` (`slug` único: `inicio`, `sobre-o-curso`).
- `pagina_secoes`: `pagina_slug`, `chave`, `tipo`, `ordem`, `visivel`, `rascunho jsonb`, `publicado jsonb null`, `ordem_publicada`, `visivel_publicada`, `atualizado_por`, `updated_at`; único (`pagina_slug`, `chave`).
- `pagina_secoes_traducoes`: padrão atual (`secao_id`, `locale`, `conteudo`, `origem`, `status`, `precisa_revisar`…). A tradução é do **publicado**.
- `pagina_reservas` (trava de edição) e `pagina_auditoria` (quem publicou, quando, o que mudou).
- Permissão nova `site:editar` (só ADMIN).

### 3.2 Conteúdo
- `lib/site-secoes/schemas.ts`: **um schema zod por tipo de seção** (hero, proposta, pilares, números, cabeçalho de seção, texto + foto, valores, CTA…), com rótulo, limite, dica e proporção da foto. Fonte única do painel e da validação no servidor.
- `lib/site-secoes/paginas.ts`: define cada página (lista de seções, tipo e conteúdo padrão). O **conteúdo padrão vem de `messages/pt-BR.json` e `textos_curso`** (seed), então o site continua idêntico ao de hoje no dia da virada.
- `lib/site-secoes/renderers/{inicio,sobre}.tsx`: `{ chave: (conteudo, ctx) => JSX }`, usados pela página pública e pela prévia.

### 3.3 Site público
- `app/(site)/[locale]/page.tsx` e `sobre-o-curso/page.tsx` passam a: ler as seções **publicadas** (cacheadas, tag `paginas` + `idioma:<locale>`), aplicar a tradução do idioma com fallback para o português por campo, e renderizar pelos renderers.
- Banco vazio ou seção sem conteúdo: usa o padrão do código (sem página quebrada).
- Publicar expira a tag; as páginas continuam estáticas/PPR.

### 3.4 Editor (`/admin/editor?pagina=<slug>`)
- Rota própria com layout sem a barra do painel (como `(editor)` da Turma da Aventura).
- Barra superior: voltar, seletor de página, computador/celular, desfazer/refazer, status ("2 alterações não publicadas"), "Ver no site", **Publicar**.
- Esquerda: lista de seções (reordenar, esconder). Centro: iframe de `/admin/editor/preview/[slug]` (lê o **rascunho**, exige sessão e `site:editar`). Direita: campos gerados do schema.
- Comunicação por `postMessage` (copiar `protocol.ts`), `annotate.ts` e `history.ts` quase como estão.
- Foto: reaproveita o `FotoDialog` atual (recorte, Vercel Blob, descrição obrigatória) no lugar do `PhotoDialog`.
- Trava: uma pessoa por página (como `editLock.ts`).

### 3.5 Tradução ao publicar
1. Publicar grava `publicado` e dispara `traduzirNaHora` para as seções que mudaram (só campos novos ou alterados, pelo hash).
2. Seção traduzida = **rascunho automático**; fica listada em "Traduções a revisar" com o mesmo selo de hoje.
3. Mudou o português de um campo já revisado: a versão nova substitui a revisada e marca "precisa revisar de novo" (regra de frescor atual).
4. Sem `DEEPL_API_KEY`: publica só em português e avisa (site cai no português, como hoje).

## 4. Decisões já tomadas (e propostas)

| Tema | Decisão |
|---|---|
| Idioma de edição | só português (decidido) |
| Páginas | Início e Sobre o curso (decidido) |
| Quem edita | só ADMIN (proposta, igual ao resto) |
| Fonte do texto | seções no banco; `messages/*.json` ficam só para o que não é dessas páginas (menu, formulários, e-mails, outras páginas) |
| `Configurações › Curso` | **vira atalho para o editor** (topo, proposta, pilares, números, valores migram para seções); depoimentos, professores e galeria continuam onde estão |
| Prévia | iframe com os componentes reais, sem `draftMode()`: o login do painel é o portão (igual à Turma da Aventura) |
| Edição no lugar | por DOM matching (não mexe nos componentes); o que não casar com segurança fica no painel da direita |
| Cache | publicar expira `paginas` + `idioma:<locale>`; prévia sem cache |

## 5. Etapas (paro no fim de cada uma para você revisar)

**E0, protótipo de compatibilidade (pequeno).** Rota de prévia em iframe com `cacheComponents`, renderer da seção "Hero" rodando no navegador com dados por props, `postMessage` de ida e volta. **Se algo conflitar com `cacheComponents`, proxy ou `generateStaticParams`, paro e explico antes de seguir** (mesma regra do projeto de idiomas).

**E1, dados e leitura publicada (sem mudança visível).** Migration, schemas, páginas padrão, seed a partir de `messages` e `textos_curso`, renderers do Início e do Sobre, páginas públicas lendo o publicado com fallback. Testes: o HTML das duas páginas fica igual ao de hoje (comparar texto e estrutura), tradução por campo, cache.

**E2, editor básico.** Layout, seletor de página, lista de seções (ordem/visibilidade), painel gerado do schema, rascunho automático, desfazer/refazer, publicar, status de alterações, prévia ao vivo, computador/celular.

**E3, edição no lugar e fotos.** `annotate`, clique no texto/foto, contador de caracteres, trocar foto com recorte, folha inferior no celular.

**E4, idiomas, trava e fechamento.** Tradução ao publicar, tela de revisão por seção, trava de uma pessoa por página, auditoria, migração de `Configurações › Curso`, e2e completos (14 cenários da referência + idiomas), teste de textos longos (de/fr) no editor e nas páginas, documentação.

## 6. Riscos

- **Prévia ao vivo com componentes de servidor:** é o principal risco técnico; o E0 existe para isso.
- **DOM matching** erra com texto repetido ou quebrado em vários elementos: aceitável (fica editável no painel); a referência convive com isso.
- **Fidelidade da página pública:** o E1 só termina quando as duas páginas saem idênticas às de hoje.
- **Duas fontes de texto** durante a transição: por isso a migração de `textos_curso` é planejada, não opcional.
- **Custo de tradução:** só os campos alterados vão à DeepL (hash), o que mantém o consumo baixo.
- **Concorrência:** a trava resolve edição simultânea; publicar numa transação evita meia publicação.

## 7. Perguntas em aberto

1. O **cabeçalho e o rodapé** (menu, textos do rodapé) entram no editor ou ficam como estão?
2. **SEO** (título e descrição de cada página) editável no editor?
3. Quer **restaurar versão anterior** do publicado (histórico com "voltar para esta")? Custa uma tabela de versões.
4. **Publicação agendada** de uma página? (a área do aluno já tem para materiais.)
5. Quais **tipos de seção** além das atuais o cliente quer poder **adicionar** (hoje a referência só edita seções que existem, não cria novas)?
6. As **fotos fixas** do código (`/images/maos.webp`, `/images/anatomia-quadril.webp`, `/images/boneco-articulado.webp`) passam a ser editáveis pela biblioteca do Blob?
7. Nome do recurso para o cliente (ex.: "Editar páginas").

## 8. O que **não** muda

Agenda, turmas, professores, galeria, depoimentos, Viagem, Alumni, Sou aluno e e-mails continuam com as telas atuais. O editor só toca em Início e Sobre o curso.
