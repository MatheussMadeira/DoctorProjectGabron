# Especificação — site da Dra. Ana Paula Fonseca

## 1. Públicos e objetivo

- **Pacientes:** conhecem a clínica de fisiatria e agendam uma consulta pelo WhatsApp ou pelo formulário de contato.
- **Profissionais da saúde** (médicos, dentistas, biomédicos e outros, lista a confirmar): veem as turmas de toxina botulínica e se inscrevem.
- **Ação principal do site:** levar à agenda de turmas e à inscrição.
- **Dra. e equipe:** cadastram datas e acompanham as inscrições no admin.

## 2. Rotas

| Rota | Página | Telas de referência em `design/` |
|---|---|---|
| `/` | Início | `Main.dc.html` (desktop), `Celular.dc.html` (390px) |
| `/sobre` | Sobre a Dra. | `Sobre.dc.html`, `SobreCelular.dc.html` |
| `/clinica` | Clínica | `Clinica.dc.html`, `ClinicaCelular.dc.html` |
| `/agenda` | Agenda de cursos | `Agenda.dc.html`, `AgendaCelular.dc.html`, `AgendaVazia.dc.html` (sem datas) |
| `/agenda/[slug]` | Página da turma | `Turma.dc.html` (inclui `TurmaInscricao.dc.html`), `TurmaCelular.dc.html`, `TurmaEsgotada.dc.html`, `TurmaErro.dc.html`, `TurmaEnviada.dc.html` |
| `/contato` | Contato | `Contato.dc.html`, `ContatoCelular.dc.html` |
| `/politica-de-privacidade` | Política de privacidade | sem tela; usar `Section narrow` com texto placeholder |
| `/admin/login` | Login do admin | `AdminLogin.dc.html`, `AdminLoginErro.dc.html`, `AdminLoginCelular.dc.html` |
| `/admin` | Painel | `AdminPainel.dc.html` (tela `painel` de `Admin.dc.html`) |
| `/admin/agenda` | Lista de datas | `Admin.dc.html` (tela `agenda`), `AdminExcluir.dc.html` (diálogo de exclusão), `AdminCelular.dc.html` |
| `/admin/agenda/nova` e `/admin/agenda/[id]` | Criar e editar data | `AdminEditar.dc.html` (tela `editar`), `AdminFoto.dc.html` (diálogo de foto) |
| `/admin/inscricoes` | Inscrições, com `?turma=` | `AdminInscricoes.dc.html` (tela `inscricoes`) |
| `/admin/configuracoes` | Configurações | sem tela; dados de contato, WhatsApp, CRM/RQE e usuários |

### Elementos comuns

- **Header e Footer:** iguais em todas as páginas públicas.
  - O Header tem o logo, o menu (Início, Sobre a Dra., Clínica, Agenda de cursos, Contato) e a chamada "Próximas turmas".
- **WhatsAppButton flutuante:** em todas as páginas públicas, menos em `/contato`, onde ele aparece dentro da página.
  - Na página da turma, no celular, ele sobe para não cobrir a barra de inscrição. A regra `.ap-com-barra` está em `ap-tokens.css`.
- **Tema:** só o claro. Não há botão de troca de tema nem tema escuro para a pessoa escolher (decisão do cliente, fora do que o design system previa com o `ThemeToggle`). As seções escuras da marca (Hero, faixas de chamada e Footer) seguem escuras, forçadas por `data-theme="escuro"` no próprio elemento.
- **Transição de página:** o `EventCard` e o `Hero` da página da turma compartilham o mesmo `transitionName`, que é o slug da turma, para usar View Transitions.

## 3. Modelo de dados (sugestão)

```
Turma
  id, slug (único, gerado do título + mês/ano)
  titulo, resumo (1 frase), descricao (texto longo)
  modalidade: PRESENCIAL | ONLINE
  publicacao: RASCUNHO | EM_BREVE | PUBLICADO
  inicio (date), fim (date, opcional), horario (texto livre: "Sáb. e dom., 8h às 18h")
  cidade, local
  vagas (int), precoCentavos (int), parcelamento (texto: "ou 10x de R$ 000")
  fotoUrl, fotoAlt
  publicoAlvo: string[]          // seção "Para quem é"
  aprendizados: string[]         // seção "O que você vai aprender"
  programacao: Json              // [{ titulo: "Dia 1 · Sábado, 14 de março", itens: [{time, title, description?, duration?}] }]
  faq: Json                      // [{ q, a }]
  createdAt, updatedAt

Inscricao
  id, turmaId
  nome, email, telefone, profissao, conselho (CRM | CRO | CRBM | CRF | Outro), registro ("00000 / MG")
  aceitePrivacidadeEm (datetime), querAvisos (bool)
  situacao: AGUARDANDO_PAGAMENTO | REGISTRO_A_CONFERIR | CONFIRMADA | LISTA_ESPERA | CANCELADA
  createdAt

MensagemContato
  id, nome, email, telefone?, assunto, mensagem, aceitePrivacidadeEm, createdAt

Usuario (admin)
  id, nome, email, senhaHash, papel (ADMIN | EQUIPE), ativo, createdAt, updatedAt

LoginTentativa
  email (pk), falhas, bloqueadoAte, atualizadoEm   // bloqueio de 15 min depois de 5 erros
```

### Status público de uma turma (calculado, nunca editado à mão)

Mesmos valores usados pelos componentes: `aberto | ultimas | esgotado | em-breve | encerrado`.

```
ocupadas = inscrições com situação em (AGUARDANDO_PAGAMENTO, REGISTRO_A_CONFERIR, CONFIRMADA)
se publicacao == RASCUNHO           -> não aparece no site
se (fim ?? inicio) < hoje           -> "encerrado"  (mostra "Realizado")
se publicacao == EM_BREVE           -> "em-breve"   (sem formulário; mostrar "Inscrições abrem em breve")
se ocupadas >= vagas                -> "esgotado"   (formulário vira "Lista de espera"; inscrições novas entram como LISTA_ESPERA)
se vagas - ocupadas <= 3            -> "ultimas"
senão                               -> "aberto"
```

- **Vagas disponíveis** = `vagas - ocupadas`. É o número que aparece no `EventSummary` (`seatsTotal`, `seatsTaken`) e no `EventCard`.
- **Corrida pela última vaga:** controle a concorrência na inscrição. A transação trava a linha da turma com `SELECT … FOR UPDATE`, conta as ocupadas direto no banco e só então grava; se as vagas acabaram, a inscrição entra como `LISTA_ESPERA`. Inscrições simultâneas na mesma turma esperam a vez; turmas diferentes não se bloqueiam. Implementada em `lib/inscricoes.ts` (`criarInscricao`) e coberta por `tests/inscricao-concorrencia.test.ts`.

## 4. Fluxos

### Inscrição (página da turma)

- **Campos:**
  - nome, e-mail e telefone/WhatsApp (obrigatórios);
  - profissão (`Select`) e conselho com número/UF (obrigatórios);
  - aceite da política de privacidade (obrigatório);
  - avisos de novas turmas (opcional e desmarcado por padrão).
- **Validação no servidor**, com Zod ou similar. Os erros seguem a tela `TurmaErro.dc.html`:
  - um `Alert` danger no topo dizendo quantos campos revisar;
  - a mensagem `error` em cada campo, dizendo o que fazer ("Digite um e-mail válido, como nome@dominio.com.br.").
- **Gravação:** a inscrição é feita pelo site e gravada no banco por uma Server Action, na transação descrita em "Corrida pela última vaga". Depois de gravar, invalida as tags `turma:<slug>` e `turmas` (seção 6).
- **Sucesso:** o formulário é trocado pelo `Logo animated` mais o `Alert` de sucesso "Inscrição recebida", como em `TurmaEnviada.dc.html`.
  - Um e-mail de confirmação vai para a pessoa com os próximos passos e um aviso vai para a equipe.
- **Proteção contra spam:** honeypot e limite de taxa por IP.

### Contato

- **Campos:** nome, e-mail, telefone, assunto (Consulta na clínica, Turmas de toxina botulínica ou Outro assunto), mensagem e aceite.
- **Aviso no campo de mensagem:** "Não envie informações de saúde por aqui."
- **Ao enviar:** a mensagem é gravada, um e-mail vai para a clínica e o `Alert` de sucesso aparece no lugar do formulário.

### Admin

- **Login:** e-mail e senha, ou link mágico (a decidir).
  - Bloqueio temporário depois de 5 tentativas erradas, com a mensagem de `AdminLoginErro.dc.html`.
  - Todas as rotas `/admin/*` exigem sessão. O **proxy** (o antigo middleware do Next.js) só confere a sessão e redireciona para o login; ele nunca decide permissões. **Cada Server Action e cada Route Handler do admin confere a sessão e a permissão de novo**, porque o proxy não protege chamadas diretas a elas.
- **Painel:**
  - indicadores: próximas turmas, inscritos, vagas livres e registros a conferir;
  - tabela "Próximas turmas";
  - lista "Inscrições recentes".
- **Agenda:** `DataTable` com abas Próximas, Rascunhos, Realizadas e Todas.
  - As ações por linha são ver inscrições, editar e excluir.
- **Excluir:** sempre com o diálogo de confirmação de `AdminExcluir.dc.html`.
  - Se houver inscritos, mostre o aviso e ofereça "Mudar para rascunho".
  - Exclusão lógica: guarde `excluidaEm` e deixe as inscrições arquivadas.
- **Editar ou criar data:** os campos do modelo `Turma`.
  - Ao lado, uma pré-visualização ao vivo com o `EventCard` e o `EventSummary`.
  - Botões "Salvar rascunho" e "Salvar e publicar".
- **Foto:** diálogo de `AdminFoto.dc.html`.
  - Envio por arrastar ou clicar, só JPG ou WebP, formato 16:10, a partir de 1600 px e até 5 MB.
  - Opção de escolher da biblioteca da marca (`public/images/`).
  - Texto alternativo obrigatório e lembrete das regras do CFM.
- **Inscrições:** filtro por turma, tabela e situação editável.
  - Exportar a lista em CSV.
  - Lembrete para conferir o registro no conselho antes de confirmar.
- **Depois de salvar:** invalide as tags da turma (`turma:<slug>` e `turmas`), como na seção 6. Páginas sem dados de turma (Sobre, Clínica) não precisam de invalidação.

## 5. Decisões em aberto (perguntar antes de implementar)

1. ~~**Banco de dados:**~~ *(decidido)* Postgres na **Neon** (região sa-east-1, São Paulo) com **Drizzle**. Funções da Vercel em `gru1` (`vercel.json`). Driver `neon-serverless` (WebSocket), porque a inscrição precisa de transação interativa.
2. ~~**Autenticação do admin:**~~ *(decidido)* Auth.js com e-mail e senha (Credentials), dois papéis (ADMIN e EQUIPE). Ver seção 7.
3. **Envio de e-mails:** Resend? Qual e-mail de remetente?
4. ~~**Armazenamento de fotos:**~~ *(decidido)* Vercel Blob. Ver seção 7.
5. **Pagamento:** só instruções por e-mail, ou um link de pagamento (Mercado Pago, Stripe ou Asaas)? As telas preveem só a inscrição, com os dados de pagamento enviados por e-mail.
6. **Conteúdo real:**
   - CRM e RQE, bio e credenciais;
   - endereço, horários e convênios;
   - WhatsApp, e-mail e Instagram;
   - depoimentos autorizados por escrito;
   - lista de profissões aceitas;
   - textos das perguntas frequentes.
   Até chegar, tudo fica como placeholder.

## 6. Cache e invalidação

O projeto usa `cacheComponents`. A contagem de vagas nunca pode ficar desatualizada, então o cache é organizado por tags.

- **Leitura:** as funções de `lib/turmas.ts` usam `'use cache'` com `cacheLife` curto e duas tags:
  - `turmas`: listas (Início, Agenda, tabelas do admin);
  - `turma:<slug>`: uma turma. A função que lê a turma também conta as inscrições ocupadas, dentro do mesmo cache, para que a tag cubra a contagem de vagas.
- **Invalidação:** invalide `turma:<slug>` e `turmas` (como descrito abaixo) sempre que:
  - uma inscrição for criada ou mudar de situação (inclusive lista de espera e cancelamento);
  - o admin salvar, publicar, passar para rascunho ou excluir uma turma;
  - o slug mudar (invalide o antigo e o novo).
- **Como invalidar:** em **Server Actions**, use `updateTag(tag)`: expira na hora e a própria resposta já mostra o dado novo. **Fora de Server Actions** (Route Handlers, webhooks), use `revalidateTag(tag, { expire: 0 })`. Em ambos os casos a próxima leitura espera o dado novo.
- **Por que não `"max"`:** o perfil `"max"` serve o conteúdo antigo enquanto revalida em segundo plano, e a pessoa veria "3 vagas" quando já são 2.
- **A gravação nunca lê do cache:** a transação de inscrição (ver "Corrida pela última vaga") conta as vagas direto no banco. O cache serve só a leitura pública.
- **Proxy:** `revalidateTag` e `updateTag` não funcionam no proxy. A invalidação fica nas Server Actions e nos Route Handlers.
- **404:** `notFound()` na página + `app/not-found.tsx` com `noindex`. Com `cacheComponents` o status já saiu como 200 junto com o shell, então a resposta é um "soft 404" protegido por `noindex`. Corrigir o status exigiria uma consulta ao banco no proxy a cada visita; isso acorda o Neon e consome as horas do plano gratuito, então **não se faz**. Se um dia for necessário, só com uma lista de slugs em memória com validade de 5 minutos, nunca uma consulta por visita (e ela atrasaria em até 5 minutos o 404 de turmas recém-publicadas). Coberto por `e2e/rotas.spec.ts`.

## Publicação (até a Fase 6)

- Nada vai para o domínio público antes da Fase 6. `app/robots.ts` bloqueia tudo e o layout manda `noindex`; a Fase 7 troca os dois.
- **Preview** (Vercel) só com proteção por senha ligada (Deployment Protection). Esta configuração fica na Vercel, não no repositório: confira antes do primeiro deploy.
- O banco de desenvolvimento recebe o seed (inscrições fictícias, e-mail `@exemplo.invalid`). O seed só roda com `SEED_PERMITIDO=1` e nunca no banco de produção.
- **Fase 3 (dados fixos):** as mesmas funções existem, lendo `lib/dados-exemplo.ts`, com as mesmas tags. Na fase 4 só a origem dos dados muda.

## 7. Admin: acesso e papéis

- **Login:** e-mail e senha (Auth.js, Credentials). Senha com argon2id. Mínimo de 12 caracteres. Sem cadastro público.
- **Bloqueio:** 5 tentativas erradas bloqueiam o e-mail por 15 minutos (também para e-mails que não existem, para não revelar quem tem conta). A mensagem nunca diz se foi o e-mail ou a senha.
- **Sessão:** 7 dias; com "Manter conectada", 30 dias. O papel e o `ativo` são relidos do banco a cada ação: rebaixar ou desativar uma pessoa vale na hora, mesmo com o cookie ainda válido.
- **Papéis:** ADMIN (a Dra.): tudo, inclusive excluir turmas e gerenciar usuários. EQUIPE: cria e edita turmas e cuida das inscrições; não exclui turmas nem mexe em usuários. A tabela está em `lib/permissoes.ts`.
- **Usuários:** o primeiro ADMIN nasce de `yarn admin:criar`. Depois o ADMIN cria, desativa, muda o papel e redefine a senha da equipe em Configurações (a senha temporária aparece uma vez, para ele entregar). Nunca fica sem ADMIN ativo. "Esqueci minha senha" por e-mail fica para quando houver domínio e e-mail.
- **Excluir turma:** só o ADMIN, com o diálogo de confirmação. A EQUIPE vê "Mudar para rascunho". Exclusão lógica (`excluidaEm`); as inscrições ficam arquivadas.
- **Foto:** Vercel Blob. O navegador envia direto ao Blob (5 MB passa do limite de corpo das funções); o servidor só gera o token, depois de conferir a permissão. Validação no navegador: JPG ou WebP, 16:10 (±2%), a partir de 1600 px, até 5 MB.

### Pendências da Fase 5

- Configurações ainda não edita dados de contato, WhatsApp e CRM/RQE (seguem em `lib/site.ts` como placeholders até a Dra. confirmar).
- O envio de foto precisa do `BLOB_READ_WRITE_TOKEN` (Blob store no projeto da Vercel). Sem ele, o painel avisa e a biblioteca da marca continua funcionando.
- A tela de inscrições do admin é da Fase 6.

## 8. E-mail e formulários públicos

- **Camada:** `lib/email/`. Provedor por configuração: `smtp` (Gmail do site com Nodemailer, o padrão), `resend` (pela API HTTP, ainda não testado com uma chave real) e `console` (desenvolvimento e testes). Sem domínio, o remetente é a própria conta do Gmail (`EMAIL_TESTE`), com o nome "Dra. Ana Paula Fonseca". Limite do Gmail: cerca de 500 envios por dia.
- **Três e-mails:** confirmação para a pessoa inscrita (com variante de lista de espera), aviso à clínica a cada inscrição e aviso à clínica a cada mensagem de contato. O aviso responde direto para a pessoa.
- **Ordem:** grava no banco → invalida o cache → envia (`after()`, sem atrasar a resposta). Cada tentativa fica em `emails_envios` (PENDENTE, ENVIADO ou FALHOU, com o motivo sem credenciais e o número de tentativas).
- **Reenviar:** na tela de inscrições, cada e-mail mostra seu status e um botão "Reenviar" que refaz o envio no mesmo registro, com o e-mail remontado a partir dos dados atuais. As mensagens de contato aparecem na mesma tela, com o mesmo botão.
- **Proteção:** campo escondido contra robôs (responde como sucesso e não grava), limite por visitante (inscrição: 5 em 10 minutos; contato: 3 em 10 minutos) guardado no banco com hash do IP, validação com zod no servidor e uma inscrição ativa por e-mail em cada turma.
- **Inscrições do admin:** filtro por turma (`?turma=`), situação editável na linha (passar para uma situação que ocupa vaga exige vaga livre), exportação em CSV (separador `;`, BOM, com proteção contra fórmulas de planilha) e lembrete de conferir o registro no conselho.
- **Pendências:** o logo ainda não aparece nos e-mails (precisa de domínio para hospedar a imagem; SVG não funciona no Gmail), o texto de pagamento é um placeholder explícito e o CRM/RQE do rodapé também.

## 9. Fases de trabalho

1. **Base:** criar o projeto Next.js com TypeScript e ESLint; configurar fontes, CSS de tokens e `bundle.css`; criar `public/`. *(feita)*
2. **Design system:** portar todos os componentes de `index.jsx` para `components/` em Atomic Design (átomos, moléculas, organismos e templates) e criar `/dev/componentes` para conferir com o design. *(feita)*
3. **Páginas públicas com dados fixos:** montar Início, Sobre, Clínica, Agenda, Turma e Contato a partir das telas, com os dados de exemplo dos arquivos `.dc.html` em `lib/dados-exemplo.ts`. Conferir em 1440px e em 390px. Os formulários só têm a interface; ainda não gravam nada.
4. **Banco e agenda real:** Neon + Drizzle: schema, migrations (`db/migrations`), seed (`db/seed.ts`), Início, Agenda e Turma ligados ao banco, cálculo de status, tags de cache (seção 6), transação de inscrição com `FOR UPDATE` e 404 de verdade pelo proxy. *(feita)*
5. **Admin:** *(feita, exceto o que está listado em "Pendências da Fase 5")* login, proxy (só confere a sessão e redireciona; cada Server Action confere a permissão de novo), painel, agenda (criar, editar, excluir e publicar turmas) e foto. Cada gravação invalida as tags da turma.
6. **Inscrição e contato pelo site:** *(feita; ver seção 8)* a inscrição é feita no site e gravada no banco (com lista de espera e corrida pela última vaga), mais o formulário de contato, e-mails, validação e proteção contra spam. Junto, a tela de **inscrições do admin** (filtro por turma, situação editável, CSV). Cada inscrição criada ou alterada invalida as tags da turma.
7. **Acabamento:**
   - SEO: metadata, Open Graph com o logo, `sitemap.xml` e `robots.txt` (o admin com noindex);
   - dados estruturados `Event` nas turmas e `Physician` na clínica;
   - acessibilidade, testada com teclado e com leitor de tela;
   - Lighthouse;
   - deploy na Vercel.

## 10. Imagens

| Arquivo em `public/images/` | Uso |
|---|---|
| `retrato-dra-ana-paula.webp` | Hero da home, Sobre, AboutDoctor (4:5) |
| `maos.webp` | Página da turma e cartão do módulo essencial (16:10) |
| `luvas.webp` | Cartão da turma avançada |
| `anatomia-quadril.webp` | Cartão em breve, Clínica · Como funciona |
| `boneco-articulado.webp` | Home · bloco da clínica |
| `pedras-empilhadas.webp` | Hero da Clínica |
| `pedras-mar.webp` | Biblioteca de fotos do admin |
| `textura-areia.webp` | Fundo opcional de seções grandes no tema claro |

Nas telas de `design/`, os endereços de imagem já apontam para `/images/…`.
