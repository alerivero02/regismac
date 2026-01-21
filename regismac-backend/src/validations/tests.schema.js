import { z } from "zod";

export const testSchema = z.object({
  maquinaId: z.number().min(1, "maquinaId obligatorio"),
  tecnicoId: z.number().min(1, "tecnicoId obligatorio").optional(),
  temperatura_iniziale: z.number().optional(),
  temperatura_final: z.number().optional(), // Temperatura al momento de finalizar si no se alcanzaron las temperaturas objetivo
  regolazione_vite: z.string().optional(),
  tiempo_0_gradi: z.number().optional(),
  tiempo_meno8_gradi: z.number().optional(),
  quantita_liquido: z.number().optional(),
  humedad_ambiente: z.number().optional(),
  hora_test: z.string().optional() // ISO string de fecha/hora
});
