/** Frase de apoio do título "Quem ensina" (home e Sobre o curso), conforme o design: "Três professores que conduzem juntos…".
    O número acompanha quantos professores estão visíveis; sem número por extenso conhecido, a frase fica sem número. */
const POR_EXTENSO: Record<number, string> = { 2: "Dois", 3: "Três", 4: "Quatro", 5: "Cinco", 6: "Seis" };

export function leadDosProfessores(quantos: number): string {
  if (quantos === 1) return "O professor que conduz as aulas teóricas e acompanha a prática.";
  const numero = POR_EXTENSO[quantos];
  return `${numero ? `${numero} professores` : "Os professores"} que conduzem juntos as aulas teóricas e acompanham a prática.`;
}
