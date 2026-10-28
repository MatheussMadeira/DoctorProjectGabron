import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { comPrefixo, ehLocale, LOCALE_PADRAO } from "./lib/i18n/idiomas";

/* O proxy SÓ confere se existe uma sessão válida e redireciona. Não consulta o banco (cada visita acordaria o
   Neon) e não decide permissão: quem decide é cada página e cada Server Action do admin (lib/sessao.ts).
   Ele não importa módulos do app, porque roda separado do código de renderização.

   Sobre o 404 de /agenda/<slug> inexistente: a página chama notFound() e o app/not-found.tsx manda noindex.
   Com cacheComponents o status já saiu como 200 junto com o shell; não vale a pena uma consulta por visita
   para trocar isso (ver "404" na especificação).

   Idiomas (next-intl): nas páginas públicas o proxy só roteia o prefixo (/en, /es…; pt-BR sem prefixo) e põe o cookie NEXT_LOCALE.
   Também sem banco. Redirecionamento por cookie: só na raiz "/", e só para quem já escolheu um idioma que não é o padrão; links diretos
   abrem no idioma do link, e o idioma do navegador (Accept-Language) é ignorado (routing.localeDetection = false). */
const intl = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const painel = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/dev" || pathname.startsWith("/dev/");
  if (!painel) {
    if (pathname === "/") {
      const escolhido = request.cookies.get("NEXT_LOCALE")?.value;
      if (ehLocale(escolhido) && escolhido !== LOCALE_PADRAO) return NextResponse.redirect(new URL(comPrefixo(escolhido, "/"), request.url));
    }
    return intl(request);
  }
  if (pathname === "/dev" || pathname.startsWith("/dev/")) return NextResponse.next();
  const seguro = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const nomeDoCookie = seguro ? "__Secure-authjs.session-token" : "authjs.session-token";

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie: seguro, salt: nomeDoCookie });
  const logada = !!token && !(typeof token.expiraEm === "number" && Date.now() > token.expiraEm);

  const naTelaDeLogin = pathname === "/admin/login";
  // Sessão que o banco já não aceita (usuário desativado ou removido): a página manda para cá com ?sair=1.
  // Sem apagar o cookie, o proxy mandaria a pessoa de volta ao painel e ela ficaria num vaivém de redirecionamentos.
  if (naTelaDeLogin && request.nextUrl.searchParams.has("sair")) {
    const resposta = NextResponse.next();
    resposta.cookies.delete("authjs.session-token");
    resposta.cookies.delete("__Secure-authjs.session-token");
    return resposta;
  }
  if (!logada && !naTelaDeLogin) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("de", pathname + search);
    return NextResponse.redirect(login);
  }
  if (logada && naTelaDeLogin) return NextResponse.redirect(new URL("/admin", request.url));
  return NextResponse.next();
}

// Tudo, menos a API, os arquivos internos do Next e qualquer caminho com ponto (imagens, favicon, manifest, sitemap.xml…).
export const config = { matcher: ["/((?!api|_next|_vercel|.*[.].*).*)"] };
