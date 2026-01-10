import { LottiService } from '../services/lotti.service.js';
import { ApiError } from '../utils/apiError.js';

export const getLotti = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const lotti = await service.findAll();
    res.json(lotti);
  } catch (err) {
    next(err);
  }
};

export const getLottoById = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const lotto = await service.findById(id);
    if (!lotto) throw new ApiError("Lotto non trovato", 404);
    res.json(lotto);
  } catch (err) {
    next(err);
  }
};

export const createLotto = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const { anno, descrizione, numero_telaio_da, numero_telaio_a, maquinaIds } = req.body;

    if (!anno) {
      throw new ApiError("L'anno è obbligatorio", 400);
    }

    const lotto = await service.create({
      anno: Number(anno),
      descrizione,
      numero_telaio_da,
      numero_telaio_a,
      maquinaIds: maquinaIds ? maquinaIds.map(id => Number(id)) : []
    });

    res.status(201).json(lotto);
  } catch (err) {
    next(err);
  }
};

export const updateLotto = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const { descrizione, numero_telaio_da, numero_telaio_a, maquinaIds } = req.body;

    const lotto = await service.update(id, {
      descrizione,
      numero_telaio_da,
      numero_telaio_a,
      maquinaIds: maquinaIds ? maquinaIds.map(id => Number(id)) : []
    });

    res.json(lotto);
  } catch (err) {
    next(err);
  }
};

export const deleteLotto = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    await service.delete(id);
    res.json({ message: "Lotto eliminato con successo" });
  } catch (err) {
    next(err);
  }
};

export const asignarMaquinasPorRango = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const { numero_telaio_da, numero_telaio_a } = req.body;

    if (!numero_telaio_da || !numero_telaio_a) {
      throw new ApiError("numero_telaio_da e numero_telaio_a sono obbligatori", 400);
    }

    const lotto = await service.asignarMaquinasPorRango(
      id,
      numero_telaio_da,
      numero_telaio_a
    );

    res.json(lotto);
  } catch (err) {
    next(err);
  }
};

export const getMaquinasDisponiblesEnRango = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const { numero_telaio_da, numero_telaio_a } = req.query;

    if (!numero_telaio_da || !numero_telaio_a) {
      throw new ApiError("numero_telaio_da e numero_telaio_a sono obbligatori", 400);
    }

    const maquinas = await service.getMaquinasDisponiblesEnRango(
      numero_telaio_da,
      numero_telaio_a
    );

    res.json(maquinas);
  } catch (err) {
    next(err);
  }
};

export const quitarMaquinaDelLote = async (req, res, next) => {
  try {
    const service = new LottiService(req.app.locals.prisma);
    const idLotto = Number(req.params.id);
    const { id_maquina } = req.body;

    if (!id_maquina) {
      throw new ApiError("id_maquina è obbligatorio", 400);
    }

    const lotto = await service.quitarMaquinaDelLote(idLotto, Number(id_maquina));

    res.json({
      message: "Máquina removida del lote exitosamente",
      lotto
    });
  } catch (err) {
    next(err);
  }
};

