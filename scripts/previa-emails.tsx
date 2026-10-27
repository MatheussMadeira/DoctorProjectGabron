// Gera uma prévia dos e-mails (HTML e imagem) em capturas/emails, sem enviar nada.
// Uso: node --import tsx scripts/previa-emails.tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@react-email/render";
import { chromium } from "@playwright/test";
import { ContatoAviso } from "../lib/email/modelos/ContatoAviso";
import { InscricaoAviso } from "../lib/email/modelos/InscricaoAviso";
import { InscricaoConfirmacao } from "../lib/email/modelos/InscricaoConfirmacao";

const saida = "capturas/emails";
mkdirSync(saida, { recursive: true });

const turma = { titulo: "Toxina botulínica — módulo essencial", periodo: "21 e 22 de novembro", horario: "8h às 18h", local: "Local a definir, Belo Horizonte, MG" };
const modelos: Record<string, React.ReactElement> = {
  "inscricao-confirmacao": <InscricaoConfirmacao nome="Maria da Silva" turma={turma} conselho="CRM" registro="00000 / MG" listaEspera={false} link="https://exemplo.invalid/agenda/modulo-essencial-nov-2026" />,
  "inscricao-lista-de-espera": <InscricaoConfirmacao nome="Maria da Silva" turma={turma} conselho="CRM" registro="00000 / MG" listaEspera link="https://exemplo.invalid/agenda/modulo-essencial-nov-2026" />,
  "aviso-equipe-inscricao": (
    <InscricaoAviso nome="Maria da Silva" email="maria@exemplo.invalid" telefone="(31) 90000-0000" profissao="Médico(a)" conselho="CRM" registro="00000 / MG" situacao="Aguardando pagamento" querAvisos turma={{ titulo: turma.titulo, periodo: turma.periodo }} vagas="5 de 12 vagas ocupadas" linkPainel="https://exemplo.invalid/admin/inscricoes" />
  ),
  "aviso-equipe-contato": <ContatoAviso nome="Maria da Silva" email="maria@exemplo.invalid" telefone="(31) 90000-0000" assunto="Consulta na clínica" mensagem="Gostaria de agendar uma consulta para a próxima semana." />,
};

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  for (const [nome, el] of Object.entries(modelos)) {
    const html = await render(el);
    writeFileSync(join(saida, `${nome}.html`), html);
    await page.setContent(html);
    await page.screenshot({ path: join(saida, `${nome}.png`), fullPage: true });
  }
  await browser.close();
  console.log("ok", saida);
}

main();
