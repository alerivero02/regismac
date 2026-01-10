import { ApiError } from "../utils/apiError.js";
import { OrdiniMaterialiService } from "../services/ordiniMateriali.service.js";
import emailService from "../services/email.service.js";

export const getOrdini = async (req, res, next) => {
  try {
    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const { stato } = req.query;
    
    let data;
    if (stato) {
      data = await service.findByStato(stato);
    } else {
      data = await service.findAll();
    }
    
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const getOrdineById = async (req, res, next) => {
  try {
    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const id = Number(req.params.id);

    const ordine = await service.findById(id);
    if (!ordine) throw new ApiError("Ordine non trovato", 404);

    res.json(ordine);
  } catch (e) {
    next(e);
  }
};

export const getOrdiniByMateriale = async (req, res, next) => {
  try {
    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const materialeId = Number(req.params.materialeId);
    const data = await service.findByMateriale(materialeId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const createOrdine = async (req, res, next) => {
  try {
    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const prisma = req.app.locals.prisma;
    
    // Si el usuario está autenticado y es comercial, usar su ID
    const dataToCreate = {
      ...req.body,
      id_usuario: req.user?.id_usuario || req.body.id_usuario || null,
    };
    
    const nuovo = await service.create(dataToCreate);
    
    // Si el usuario es técnico, enviar email a los comerciales
    if (req.user && req.user.rol === 'tecnico') {
      try {
        // Obtener todos los comerciales
        const comerciales = await prisma.usuario.findMany({
          where: {
            rol: 'comercial',
            estado: 'aprobado',
          },
          select: {
            email: true,
            nombre: true,
            apellido: true,
          },
        });
        
        if (comerciales.length > 0 && nuovo.items && nuovo.items.length > 0) {
          const tecnico = {
            nome: req.user.nombre,
            apellido: req.user.apellido || '',
          };

          // Convertir los items a formato de órdenes para el email (compatibilidad)
          const ordiniPerEmail = nuovo.items.map(item => ({
            id_ordine: nuovo.id_ordine,
            quantita: item.quantita,
            data_richiesta: nuovo.data_richiesta,
            note: item.note || nuovo.note,
            materiale: item.materiale,
          }));

          const emailPromises = comerciales.map(comercial => {
            return emailService.notifyComercialOrdiniRichiesti({
              ordini: ordiniPerEmail,
              tecnico,
              comercialEmail: comercial.email,
            });
          });

          const results = await Promise.allSettled(emailPromises);
          
          // Verificar resultados
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
          const failedCount = results.length - successCount;
          
          if (failedCount > 0) {
            console.error(`❌ Errore invio email: ${failedCount} di ${results.length} email falliti`);
            results.forEach((result, index) => {
              if (result.status === 'rejected' || !result.value?.success) {
                console.error(`   Email ${index + 1}:`, result.reason?.message || result.value?.error || 'Errore sconosciuto');
              }
            });
          }
        }
      } catch (emailError) {
        // No fallar la creación del ordine si falla el email
        console.error('❌ Errore critico invio email (ordine creato comunque):', emailError.message);
      }
    }
    
    res.status(201).json(nuovo);
  } catch (e) {
    next(e);
  }
};

export const updateOrdine = async (req, res, next) => {
  try {
    // Solo comercial y admin pueden actualizar órdenes (especialmente el estado)
    if (!req.user || (req.user.rol !== 'comercial' && req.user.rol !== 'admin')) {
      throw new ApiError("Non autorizzato. Solo il commerciale può modificare gli ordini", 403);
    }

    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const updated = await service.update(id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteOrdine = async (req, res, next) => {
  try {
    // Solo comercial y admin pueden eliminar órdenes
    if (!req.user || (req.user.rol !== 'comercial' && req.user.rol !== 'admin')) {
      throw new ApiError("Non autorizzato. Solo il commerciale può eliminare gli ordini", 403);
    }

    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const id = req.params.id;
    
    if (!id || isNaN(Number(id))) {
      throw new ApiError("ID ordine non valido", 400);
    }
    
    await service.delete(id);
    res.json({ ok: true, message: "Ordine eliminato con successo" });
  } catch (e) {
    next(e);
  }
};

export const cancelAllOrdini = async (req, res, next) => {
  try {
    // Solo comercial y admin pueden cancelar todos los órdenes
    if (!req.user || (req.user.rol !== 'comercial' && req.user.rol !== 'admin')) {
      throw new ApiError("Non autorizzato. Solo il commerciale e l'admin possono cancellare tutti gli ordini", 403);
    }

    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    
    // Opcionalmente, aplicar filtros desde query params
    const filters = {};
    if (req.query.stato) {
      filters.stato = req.query.stato;
    }
    if (req.query.fornitore) {
      filters.materiale = {
        fornitore: req.query.fornitore
      };
    }

    const result = await service.cancelAll(filters);
    res.json({ 
      ok: true, 
      message: `${result.count} ordine/i cancellati con successo`,
      count: result.count 
    });
  } catch (e) {
    next(e);
  }
};

export const deleteAllOrdini = async (req, res, next) => {
  try {
    // Solo comercial y admin pueden eliminar todos los órdenes
    if (!req.user || (req.user.rol !== 'comercial' && req.user.rol !== 'admin')) {
      throw new ApiError("Non autorizzato. Solo il commerciale e l'admin possono eliminare tutti gli ordini", 403);
    }

    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    
    // Opcionalmente, aplicar filtros desde query params
    const filters = {};
    if (req.query.stato) {
      filters.stato = req.query.stato;
    }
    if (req.query.fornitore) {
      filters.materiale = {
        fornitore: req.query.fornitore
      };
    }

    const result = await service.deleteAll(filters);
    res.json({ 
      ok: true, 
      message: `${result.count} ordine/i eliminati con successo`,
      count: result.count 
    });
  } catch (e) {
    next(e);
  }
};

export const createOrdiniBulk = async (req, res, next) => {
  try {
    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const prisma = req.app.locals.prisma;
    
    const { items, ...commonData } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError("È necessario fornire almeno un materiale", 400);
    }

    // Si el usuario está autenticado y es comercial, usar su ID
    const dataToCreate = {
      ...commonData,
      id_usuario: req.user?.id_usuario || commonData.id_usuario || null,
    };
    
    // Crear una sola orden con todos los materiales
    const ordineCreato = await service.createBulk(items, dataToCreate);
    
    // Enviar email a los comerciales cuando se crea una orden (técnico o comercial)
    if (req.user && ordineCreato.items.length > 0) {
      try {
        // Obtener todos los comerciales
        const comerciales = await prisma.usuario.findMany({
          where: {
            rol: 'comercial',
            estado: 'aprobado',
          },
          select: {
            email: true,
            nombre: true,
            apellido: true,
          },
        });
        
        if (comerciales.length > 0) {
          const tecnico = {
            nome: req.user.nombre || 'Usuario',
            apellido: req.user.apellido || '',
          };

          // Convertir los items a formato de órdenes para el email (compatibilidad)
          const ordiniPerEmail = ordineCreato.items.map(item => ({
            id_ordine: ordineCreato.id_ordine,
            quantita: item.quantita,
            data_richiesta: ordineCreato.data_richiesta,
            note: item.note || ordineCreato.note,
            materiale: item.materiale,
          }));

          // Enviando emails a comerciales

          const emailPromises = comerciales.map(comercial => {
            return emailService.notifyComercialOrdiniRichiesti({
              ordini: ordiniPerEmail,
              tecnico,
              comercialEmail: comercial.email,
            });
          });

          const results = await Promise.allSettled(emailPromises);
          
          // Verificar resultados
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
          const failedCount = results.length - successCount;
          
          if (successCount > 0) {
            // Emails enviados exitosamente
          }
          
          if (failedCount > 0) {
            console.error(`❌ Errore invio email: ${failedCount} di ${results.length} email falliti`);
            results.forEach((result, index) => {
              if (result.status === 'rejected' || !result.value?.success) {
                console.error(`   Email ${index + 1} (${comerciales[index]?.email}):`, result.reason?.message || result.value?.error || 'Errore sconosciuto');
              }
            });
          }
        }
      } catch (emailError) {
        // No fallar la creación de la orden si falla el email
        console.error('❌ Errore critico invio email (ordine creato comunque):', emailError.message);
        console.error('   Stack:', emailError.stack);
      }
    }
    
    res.status(201).json({
      ok: true,
      message: `Ordine ${ordineCreato.id_ordine} creato con successo (${ordineCreato.items.length} materiali)`,
      ordine: ordineCreato,
      count: ordineCreato.items.length
    });
  } catch (e) {
    next(e);
  }
};

export const resendEmailOrdine = async (req, res, next) => {
  try {
    const service = new OrdiniMaterialiService(req.app.locals.prisma);
    const prisma = req.app.locals.prisma;
    const id = Number(req.params.id);
    
    // Obtener el orden completo con sus items y materiales
    const ordine = await service.findById(id);
    
    if (!ordine) {
      throw new ApiError("Ordine non trovato", 404);
    }
    
    if (!ordine.items || ordine.items.length === 0) {
      throw new ApiError("L'ordine non ha materiali", 400);
    }
    
    // Obtener todos los comerciales
    const comerciales = await prisma.usuario.findMany({
      where: {
        rol: 'comercial',
        estado: 'aprobado',
      },
      select: {
        email: true,
        nombre: true,
        apellido: true,
      },
    });
    
    if (comerciales.length === 0) {
      throw new ApiError("Nessun commerciale disponibile per inviare email", 400);
    }
    
    // Obtener información del usuario que creó la orden o usar el usuario actual
    let tecnico = {
      nome: 'Usuario',
      apellido: '',
    };
    
    if (ordine.usuario) {
      tecnico = {
        nome: ordine.usuario.nombre || 'Usuario',
        apellido: ordine.usuario.apellido || '',
      };
    } else if (req.user) {
      tecnico = {
        nome: req.user.nombre || 'Usuario',
        apellido: req.user.apellido || '',
      };
    }
    
    // Convertir los items a formato de órdenes para el email
    const ordiniPerEmail = ordine.items.map(item => ({
      id_ordine: ordine.id_ordine,
      quantita: item.quantita,
      data_richiesta: ordine.data_richiesta,
      note: item.note || ordine.note,
      materiale: item.materiale,
    }));
    
    // Reenviando emails a comerciales
    
    const emailPromises = comerciales.map(comercial => {
      return emailService.notifyComercialOrdiniRichiesti({
        ordini: ordiniPerEmail,
        tecnico,
        comercialEmail: comercial.email,
      });
    });
    
    const results = await Promise.allSettled(emailPromises);
    
    // Verificar resultados
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failedCount = results.length - successCount;
    
    if (successCount > 0) {
      // Emails reenviados exitosamente
    }
    
    if (failedCount > 0) {
      console.error(`❌ Errore reinvio email: ${failedCount} di ${results.length} email falliti`);
      results.forEach((result, index) => {
        if (result.status === 'rejected' || !result.value?.success) {
          console.error(`   Email ${index + 1} (${comerciales[index]?.email}):`, result.reason?.message || result.value?.error || 'Errore sconosciuto');
        }
      });
    }
    
    if (successCount === 0) {
      throw new ApiError("Nessun email inviato con successo", 500);
    }
    
    res.json({
      ok: true,
      message: `${successCount} email reinviati con successo${failedCount > 0 ? ` (${failedCount} falliti)` : ''}`,
      successCount,
      failedCount,
    });
  } catch (e) {
    next(e);
  }
};

