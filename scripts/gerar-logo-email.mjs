// ATENÇÃO: o logo dos e-mails agora é public/logos/logo-email-claro-2x.png (logo nova, versão clara, 336 px de largura, derivada de reabtoxin-site-claro.png).
// Este script gera o PNG ANTIGO (vetorial, logo-horizontal-negativo-2x.png) e não alimenta mais os e-mails.
// Gera o logo horizontal compacto em PNG (fundo transparente, 2x) para os e-mails: public/logos/logo-horizontal-negativo-2x.png.
// Versão "negativa": nome em creme e pedras em azul-claro, para o topo azul-escuro do e-mail. Lê components/atoms/logo-geo.json.
// Uso: node scripts/gerar-logo-email.mjs
import { chromium } from "@playwright/test";
import { CORES, svgDoLogo } from "./lib-logo.mjs";

const LARGURA = 168; // largura em que o e-mail mostra o logo (px CSS); o PNG sai com o dobro de pixels
const { svg, altura } = svgDoLogo("compacta", CORES.negativo, LARGURA);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: LARGURA, height: altura }, deviceScaleFactor: 2 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page.locator("svg").screenshot({ path: "public/logos/logo-horizontal-negativo-2x.png", omitBackground: true });
await browser.close();
console.log(`ok: ${LARGURA * 2}x${altura * 2}px (exibido em ${LARGURA}x${altura})`);
