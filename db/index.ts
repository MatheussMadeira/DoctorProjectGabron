import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/* Driver WebSocket do Neon (neon-serverless), e não o neon-http: a inscrição precisa de transação
   interativa com SELECT ... FOR UPDATE, que o driver HTTP não oferece.
   DATABASE_URL usa o pooler (-pooler no host). Região do banco: sa-east-1; funções da Vercel em gru1. */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.local).");

export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
export { schema };
