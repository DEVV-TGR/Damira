import { z } from "zod";
import dados from "./redes.json";
import { erroDeFicheiro } from "./erros";

// Abrimos o vídeo no Instagram para evitar scripts e cookies de terceiros na Home.
const Reel = z.object({
  id: z.string().min(1),
  url: z.url({ protocol: /^https$/, hostname: /^www\.instagram\.com$/ }),
});

const resultado = z.object({ reels: z.array(Reel) }).safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/redes.json", resultado.error, dados.reels);
}

export const redes = resultado.data;
