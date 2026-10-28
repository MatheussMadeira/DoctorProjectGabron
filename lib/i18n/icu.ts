/* Mensagens do next-intl usam a sintaxe ICU: "{ano}", "{n, plural, one {# vaga} other {# vagas}}", <b>…</b>. Para traduzir com a DeepL
   só o texto, sem estragar a sintaxe, este módulo separa o que é TEXTO (traduzível) do que é SINTAXE (guardada como está) e remonta a
   mensagem com as traduções, na mesma ordem. Funções puras. */

type Parte = { tipo: "texto"; valor: string } | { tipo: "sintaxe"; valor: string };

/** Posição da chave que fecha a que abre em `i` (ou -1). */
function fechamento(m: string, i: number): number {
  let nivel = 0;
  for (let j = i; j < m.length; j++) {
    if (m[j] === "{") nivel++;
    else if (m[j] === "}" && --nivel === 0) return j;
  }
  return -1;
}

const ESTRUTURADO = /^(\s*[\w.]+\s*,\s*(?:plural|select|selectordinal)\s*,)/;

/** Divide a mensagem em partes de texto e de sintaxe (recursivo nas ramificações de plural/select). */
export function dividir(mensagem: string): Parte[] {
  const partes: Parte[] = [];
  let texto = "";
  const fecharTexto = () => {
    if (texto) partes.push({ tipo: "texto", valor: texto });
    texto = "";
  };
  for (let i = 0; i < mensagem.length; ) {
    const c = mensagem[i];
    if (c === "<") {
      const f = mensagem.indexOf(">", i);
      if (f > i && /^<\/?[a-zA-Z][\w-]*\s*\/?>$/.test(mensagem.slice(i, f + 1))) {
        fecharTexto();
        partes.push({ tipo: "sintaxe", valor: mensagem.slice(i, f + 1) });
        i = f + 1;
        continue;
      }
    }
    if (c === "{") {
      const f = fechamento(mensagem, i);
      if (f > i) {
        fecharTexto();
        const dentro = mensagem.slice(i + 1, f);
        const cab = ESTRUTURADO.exec(dentro);
        if (!cab) {
          partes.push({ tipo: "sintaxe", valor: mensagem.slice(i, f + 1) });
        } else {
          partes.push({ tipo: "sintaxe", valor: `{${cab[1]}` });
          let resto = dentro.slice(cab[1].length);
          while (resto.length) {
            const r = /^(\s*[\w=.]+\s*)\{/.exec(resto);
            if (!r) {
              partes.push({ tipo: "sintaxe", valor: resto });
              break;
            }
            const abre = r[1].length;
            const fim = fechamento(resto, abre);
            if (fim < 0) {
              partes.push({ tipo: "sintaxe", valor: resto });
              break;
            }
            partes.push({ tipo: "sintaxe", valor: `${r[1]}{` });
            partes.push(...dividir(resto.slice(abre + 1, fim)));
            partes.push({ tipo: "sintaxe", valor: "}" });
            resto = resto.slice(fim + 1);
          }
          partes.push({ tipo: "sintaxe", valor: "}" });
        }
        i = f + 1;
        continue;
      }
    }
    texto += c;
    i++;
  }
  fecharTexto();
  return partes;
}

/** Os trechos de texto que precisam de tradução (sem espaços só de pontuação ou número). */
const traduzivel = (t: string) => /\p{L}/u.test(t);

export function extrairTraduziveis(mensagem: string): string[] {
  return dividir(mensagem).flatMap((p) => (p.tipo === "texto" && traduzivel(p.valor) ? [p.valor] : []));
}

/** Remonta a mensagem trocando cada trecho traduzível pelo próximo de `traduzidos`; os espaços nas pontas de cada trecho são mantidos. */
export function aplicarTraduzidos(mensagem: string, traduzidos: string[]): string {
  const fila = [...traduzidos];
  return dividir(mensagem)
    .map((p) => {
      if (p.tipo === "sintaxe" || !traduzivel(p.valor)) return p.valor;
      const novo = fila.shift() ?? p.valor;
      const antes = /^\s*/.exec(p.valor)![0];
      const depois = /\s*$/.exec(p.valor)![0];
      return `${antes}${novo.trim()}${depois}`;
    })
    .join("");
}

/** Caminhos de todas as folhas de texto de um objeto de mensagens ("Home.titulo"). */
export function folhas(obj: Record<string, unknown>, prefixo = ""): Array<[string, string]> {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "string" ? [[`${prefixo}${k}`, v] as [string, string]] : v && typeof v === "object" ? folhas(v as Record<string, unknown>, `${prefixo}${k}.`) : [],
  );
}

export function definir(obj: Record<string, unknown>, caminho: string, valor: string) {
  const chaves = caminho.split(".");
  let o = obj;
  for (const k of chaves.slice(0, -1)) o = (o[k] ??= {}) as Record<string, unknown>;
  o[chaves.at(-1)!] = valor;
}

export function ler(obj: Record<string, unknown>, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
