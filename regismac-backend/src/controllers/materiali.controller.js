import { ApiError } from "../utils/apiError.js";
import { MaterialiService } from "../services/materiali.service.js";

export const getMateriali = async (req, res, next) => {
  try {
    const service = new MaterialiService(req.app.locals.prisma);
    const data = await service.findAll();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const getMaterialeById = async (req, res, next) => {
  try {
    const service = new MaterialiService(req.app.locals.prisma);
    const id = Number(req.params.id);

    const materiale = await service.findById(id);
    if (!materiale) throw new ApiError("Materiale non trovato", 404);

    res.json(materiale);
  } catch (e) {
    next(e);
  }
};

export const createMateriale = async (req, res, next) => {
  try {
    const service = new MaterialiService(req.app.locals.prisma);
    
    // Verificar si ya existe un materiale con ese código y fornitore
    const existente = await service.findByCodArticoloAndFornitore(
      req.body.cod_articolo,
      req.body.fornitore
    );
    if (existente) {
      throw new ApiError("Un materiale con questo codice articolo e fornitore esiste già. I materiali possono essere duplicati solo se cambiano di fornitore.", 400);
    }

    const nuovo = await service.create(req.body);
    res.status(201).json(nuovo);
  } catch (e) {
    next(e);
  }
};

export const updateMateriale = async (req, res, next) => {
  try {
    const service = new MaterialiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    
    // Si se está actualizando cod_articolo o fornitore, verificar que la nueva combinación no exista
    if (req.body.cod_articolo || req.body.fornitore) {
      // Obtener el materiale actual
      const materialeAttuale = await service.findById(id);
      if (!materialeAttuale) {
        throw new ApiError("Materiale non trovato", 404);
      }
      
      const nuovoCodArticolo = req.body.cod_articolo || materialeAttuale.cod_articolo;
      const nuovoFornitore = req.body.fornitore || materialeAttuale.fornitore;
      
      // Verificar si existe otro materiale con la misma combinación (excluyendo el actual)
      const existente = await service.findByCodArticoloAndFornitore(nuovoCodArticolo, nuovoFornitore);
      if (existente && existente.id_materiale !== id) {
        throw new ApiError("Un materiale con questo codice articolo e fornitore esiste già. I materiali possono essere duplicati solo se cambiano di fornitore.", 400);
      }
    }
    
    const updated = await service.update(id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const service = new MaterialiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const { stock_comprado, stock_utilizado } = req.body;
    
    const updated = await service.updateStock(id, {
      stock_comprado,
      stock_utilizado,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteMateriale = async (req, res, next) => {
  try {
    const service = new MaterialiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    await service.delete(id);
    res.json({ ok: true, message: "Materiale eliminato con successo" });
  } catch (e) {
    next(e);
  }
};

