// Gera a imagem de compartilhamento (Open Graph, 1200x630): public/og.png. Logo nova (versão clara) sobre azul-escuro.
// Origem: public/logos/reabtoxin-site-claro.png. Uso: node scripts/gerar-og.mjs
import sharp from "sharp";

const LARGURA_LOGO = 760;
const logo = await sharp("public/logos/reabtoxin-site-claro.png").resize({ width: LARGURA_LOGO }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#28334f" } })
  .composite([{ input: logo, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile("public/og.png");
console.log("ok: public/og.png 1200x630");
