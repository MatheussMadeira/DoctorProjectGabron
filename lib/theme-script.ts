export const THEME_COOKIE = "ap-theme";

/**
 * Script que roda antes da primeira pintura e fixa data-theme no <html>:
 * cookie salvo, ou prefers-color-scheme na primeira visita. Evita o "pisca" do tema
 * sem ler cookies no servidor (o que tornaria o layout inteiro dinâmico).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(claro|escuro)/);var t=m?m[1]:(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro");document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
