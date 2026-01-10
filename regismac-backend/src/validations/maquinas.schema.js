import { z } from "zod";

export const maquinaSchema = z.object({
  numero_telaio: z.string().min(1, "numero_telaio es obligatorio"),
  seriale_compressore: z.string().min(1, "seriale_compressore es obligatorio"),
  tipo_gas: z.string().optional(),
  quantita_gas: z.number().optional(),
  tipo_valvola: z.string().optional(),
  regolazione_valvola: z.string().optional(),
  annotazioni: z.string().optional(),
  stato: z.string().optional(),
  tecnicoId: z.number().min(1, "tecnicoId es obligatorio"),
  data_consegna: z.string().optional(),
});
