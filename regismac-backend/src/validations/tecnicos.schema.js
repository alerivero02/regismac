import { z } from "zod";

export const tecnicoSchema = z.object({
  nome: z.string().min(1, "El nombre es obligatorio"),
  cognome: z.string().optional()
});
