import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tecnicos = [
  { nome: "Marco", cognome: "Carinci" },
  { nome: "Hasan", cognome: "Mahmudul" },
  { nome: "Marco", cognome: "Cardoni" },
  { nome: "Alexander", cognome: "Rivero" },
];

async function initTecnicos() {
  try {
    console.log("Inizializzazione tecnici...");

    for (const tecnico of tecnicos) {
      const existing = await prisma.tecnico.findFirst({
        where: {
          nome: tecnico.nome,
          cognome: tecnico.cognome,
        },
      });

      if (!existing) {
        await prisma.tecnico.create({
          data: tecnico,
        });
        console.log(`✓ Creato: ${tecnico.nome} ${tecnico.cognome}`);
      } else {
        console.log(`- Già esistente: ${tecnico.nome} ${tecnico.cognome}`);
      }
    }

    console.log("\nTecnici inizializzati con successo!");
  } catch (error) {
    console.error("Errore durante l'inizializzazione:", error);
  } finally {
    await prisma.$disconnect();
  }
}

initTecnicos();

