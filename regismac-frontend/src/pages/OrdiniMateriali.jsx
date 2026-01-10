import { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  FiPlus, 
  FiPackage, 
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiRefreshCw,
  FiClock,
  FiCalendar,
  FiTruck,
  FiMinus,
  FiShoppingCart,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiMail
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import { ordiniMaterialiAPI, materialiAPI, authAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OrdiniMateriali() {
  const [ordini, setOrdini] = useState([]);
  const [materiali, setMateriali] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [filterFornitore, setFilterFornitore] = useState('');
  const [filterMateriale, setFilterMateriale] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [listaOrdine, setListaOrdine] = useState([]); // Lista de materiales para el nuevo orden { id_materiale, materiale, quantita }
  const [editingItems, setEditingItems] = useState([]); // Items del orden en edición { id_item, id_materiale, materiale, quantita }
  const [searchMateriale, setSearchMateriale] = useState(''); // Búsqueda de materiales
  const [ordiniEspansi, setOrdiniEspansi] = useState(new Set()); // IDs de órdenes expandidos
  const [editingStato, setEditingStato] = useState(null); // { id_ordine, stato }
  const [editingOrdineId, setEditingOrdineId] = useState(null); // ID del orden en modo edición
  const [editingOrdineData, setEditingOrdineData] = useState(null); // Datos del orden en edición
  const [showMaterialiModal, setShowMaterialiModal] = useState(false); // Modal para ver materiales ordenados
  const [materialiOrdineModal, setMaterialiOrdineModal] = useState([]); // Materiales para el modal
  const [formData, setFormData] = useState({
    stato: 'richiesto',
    data_richiesta: new Date().toISOString().split('T')[0],
    data_ordine: '',
    data_consegna_prevista: '',
    data_consegna: '',
    note: '',
  });

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  /**
   * Carga el usuario actual desde la API
   */
  const loadCurrentUser = async () => {
    try {
      const user = await authAPI.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error al cargar usuario actual:', error);
      setCurrentUser(null);
    }
  };

  /**
   * Carga todos los órdenes y materiales desde la API
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const [ordiniData, materialiData] = await Promise.all([
        ordiniMaterialiAPI.getAll(),
        materialiAPI.getAll(),
      ]);
      setOrdini(Array.isArray(ordiniData) ? ordiniData : []);
      setMateriali(Array.isArray(materialiData) ? materialiData : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification(error.message || 'Errore nel caricamento dei dati', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  /**
   * Agrega un materiale a la lista de órdenes o actualiza su cantidad si ya existe
   * @param {number} materialeId - ID del materiale
   * @param {number} quantita - Cantidad del materiale
   */
  const handleAddMaterialeToLista = useCallback((materialeId, quantita = 1) => {
    const materiale = materiali.find(m => m.id_materiale === materialeId);
    if (!materiale) return;

    const numQuantita = parseFloat(quantita) || 0;
    if (numQuantita <= 0) {
      showNotification('La quantità deve essere maggiore di zero', 'error');
      return;
    }

    setListaOrdine(prev => {
      const existente = prev.find(item => item.id_materiale === materialeId);
      if (existente) {
        // Actualizar cantidad
        return prev.map(item => 
          item.id_materiale === materialeId 
            ? { ...item, quantita: numQuantita }
            : item
        );
      } else {
        // Agregar nuevo
        return [...prev, {
          id_materiale: materialeId,
          materiale: materiale,
          quantita: numQuantita
        }];
      }
    });
  }, [materiali, showNotification]);

  /**
   * Actualiza la cantidad de un materiale en la lista de órdenes
   * @param {number} materialeId - ID del materiale
   * @param {number} quantita - Nueva cantidad
   */
  const handleUpdateQuantitaInLista = useCallback((materialeId, quantita) => {
    const numQuantita = parseFloat(quantita) || 0;
    setListaOrdine(prev => {
      if (numQuantita <= 0) {
        // Si la cantidad es 0 o menor, eliminar de la lista
        return prev.filter(item => item.id_materiale !== materialeId);
      } else {
        return prev.map(item => 
          item.id_materiale === materialeId 
            ? { ...item, quantita: numQuantita }
            : item
        );
      }
    });
  }, []);

  const handleRemoveMateriale = useCallback((materialeId) => {
    setListaOrdine(prev => prev.filter(item => item.id_materiale !== materialeId));
  }, []);

  /**
   * Filtra los materiales según el término de búsqueda (memoizado para mejor rendimiento)
   */
  const materialiFiltrados = useMemo(() => {
    if (!searchMateriale) return materiali;
    const searchLower = searchMateriale.toLowerCase();
    return materiali.filter((m) => {
      const cod = m.cod_articolo?.toLowerCase() || '';
      const desc = m.descrizione?.toLowerCase() || '';
      const forn = m.fornitore?.toLowerCase() || '';
      const codice = m.codice?.toLowerCase() || '';
      return cod.includes(searchLower) || desc.includes(searchLower) || forn.includes(searchLower) || codice.includes(searchLower);
    });
  }, [materiali, searchMateriale]);

  const handleSubmitLista = async (e) => {
    e.preventDefault();
    
    if (listaOrdine.length === 0) {
      showNotification('Aggiungi almeno un materiale alla lista', 'error');
      return;
    }

    try {
      // Crear una sola orden con todos los materiales usando el endpoint bulk
      const items = listaOrdine.map(item => ({
        id_materiale: item.id_materiale,
        quantita: item.quantita,
      }));

      const commonData = {
        stato: formData.stato,
        data_richiesta: formData.data_richiesta,
        data_ordine: formData.data_ordine || null,
        data_consegna_prevista: formData.data_consegna_prevista || null,
        data_consegna: formData.data_consegna || null,
        note: formData.note || null,
      };

      const result = await ordiniMaterialiAPI.createBulk(items, commonData);
      showNotification(`Ordine creato con successo (${result.count} materiali)`, 'success');
      resetForm();
      loadData();
    } catch (error) {
      showNotification(error.message || 'Errore nella creazione dell\'ordine', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Preparar datos para actualizar, incluyendo items si hay cambios
        const updateData = {
          ...formData,
          items: editingItems.map(item => ({
            id_item: item.id_item,
            quantita: parseFloat(item.quantita) || 0,
          })),
        };
        await ordiniMaterialiAPI.update(editingId, updateData);
        showNotification('Ordine aggiornato con successo', 'success');
        resetForm();
        loadData();
      }
    } catch (error) {
      showNotification(error.message || 'Errore nella registrazione dell\'ordine', 'error');
    }
  };

  const handleEdit = (ordine) => {
    setEditingOrdineId(ordine.id_ordine);
    setEditingOrdineData({
      data_consegna_prevista: ordine.data_consegna_prevista ? new Date(ordine.data_consegna_prevista).toISOString().split('T')[0] : '',
      items: ordine.items ? ordine.items.map(item => ({
        id_item: item.id_item,
        id_materiale: item.id_materiale,
        materiale: item.materiale,
        quantita: item.quantita,
      })) : [],
    });
    // Expandir el orden si no está expandido
    if (!ordiniEspansi.has(ordine.id_ordine)) {
      toggleOrdine(ordine.id_ordine);
    }
  };

  const handleCancelEdit = () => {
    setEditingOrdineId(null);
    setEditingOrdineData(null);
  };

  const handleSaveEdit = async (ordineId) => {
    try {
      const updateData = {
        data_consegna_prevista: editingOrdineData.data_consegna_prevista || null,
        items: editingOrdineData.items.map(item => ({
          id_item: item.id_item,
          quantita: parseFloat(item.quantita) || 0,
        })),
      };
      await ordiniMaterialiAPI.update(ordineId, updateData);
      showNotification('Ordine aggiornato con successo', 'success');
      setEditingOrdineId(null);
      setEditingOrdineData(null);
      loadData();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento dell\'ordine', 'error');
    }
  };

  const handleEditItemQuantity = useCallback((index, newQuantity) => {
    setEditingOrdineData(prev => {
      if (!prev) return prev;
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        quantita: parseFloat(newQuantity) || 0,
      };
      return {
        ...prev,
        items: updatedItems,
      };
    });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo ordine?')) {
      return;
    }

    try {
      await ordiniMaterialiAPI.delete(id);
      showNotification('Ordine eliminato con successo', 'success');
      loadData();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'eliminazione dell\'ordine', 'error');
    }
  };

  const handleResendEmail = async (id) => {
    try {
      const result = await ordiniMaterialiAPI.resendEmail(id);
      showNotification(result.message || 'Email reinviata con successo', 'success');
    } catch (error) {
      showNotification(error.message || 'Errore nel reinvio dell\'email', 'error');
    }
  };

  /**
   * Elimina todos los órdenes filtrados permanentemente
   */
  const handleCancelAll = async () => {
    // Contar cuántos órdenes se van a eliminar
    if (ordiniFiltrados.length === 0) {
      showNotification('Non ci sono ordini da eliminare', 'info');
      return;
    }

    const confirmMessage = `Sei sicuro di voler ELIMINARE definitivamente tutti i ${ordiniFiltrados.length} ordine/i? Questa azione non può essere annullata e i dati verranno persi permanentemente.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Aplicar los mismos filtros que están activos
      const filters = {};
      if (filterStato) filters.stato = filterStato;
      if (filterFornitore) filters.fornitore = filterFornitore;

      const result = await ordiniMaterialiAPI.deleteAll(filters);
      showNotification(result.message || `${result.count} ordine/i eliminati con successo`, 'success');
      loadData();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'eliminazione degli ordini', 'error');
    }
  };

  // Memoizar el conteo de órdenes anuladas para evitar recálculos
  const ordiniAnnullateCount = useMemo(() => {
    return ordini.filter(o => o.stato === 'annullato').length;
  }, [ordini]);

  /**
   * Elimina todas las órdenes anuladas
   */
  const handleDeleteAnnullate = useCallback(async () => {
    if (ordiniAnnullateCount === 0) {
      showNotification('Non ci sono ordini annullati da eliminare', 'info');
      return;
    }

    const confirmMessage = `Sei sicuro di voler ELIMINARE definitivamente tutti i ${ordiniAnnullateCount} ordine/i annullati? Questa azione non può essere annullata.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await ordiniMaterialiAPI.deleteAll({ stato: 'annullato' });
      showNotification(result.message || `${result.count} ordine/i annullati eliminati con successo`, 'success');
      loadData();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'eliminazione degli ordini annullati', 'error');
    }
  }, [ordiniAnnullateCount, showNotification]);

  const toggleOrdine = useCallback((id) => {
    setOrdiniEspansi(prev => {
      const nuoviEspansi = new Set(prev);
      if (nuoviEspansi.has(id)) {
        nuoviEspansi.delete(id);
      } else {
        nuoviEspansi.add(id);
      }
      return nuoviEspansi;
    });
  }, []);

  const handleCambioStato = async (id, nuovoStato) => {
    try {
      const updateData = { stato: nuovoStato };
      const now = new Date().toISOString().split('T')[0];
      
      // Si cambia a "ordinato", actualizar data_ordine
      if (nuovoStato === 'ordinato') {
        updateData.data_ordine = now;
      }
      
      // Si cambia a "consegnato", actualizar data_consegna
      if (nuovoStato === 'consegnato') {
        updateData.data_consegna = now;
      }
      
      await ordiniMaterialiAPI.update(id, updateData);
      showNotification('Stato aggiornato con successo', 'success');
      setEditingStato(null);
      loadData();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento dello stato', 'error');
      setEditingStato(null);
    }
  };

  const resetForm = () => {
    setFormData({
      stato: 'richiesto',
      data_richiesta: new Date().toISOString().split('T')[0],
      data_ordine: '',
      data_consegna_prevista: '',
      data_consegna: '',
      note: '',
    });
    setListaOrdine([]);
    setEditingItems([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleItemQuantityChange = (index, newQuantity) => {
    const updatedItems = [...editingItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantita: parseFloat(newQuantity) || 0,
    };
    setEditingItems(updatedItems);
  };

  const getStatoConfig = useCallback((stato) => {
    const configs = {
      richiesto: { label: 'Richiesto', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: FiClock },
      ordinato: { label: 'Ordinato', color: 'text-blue-600', bg: 'bg-blue-50', icon: FiPackage },
      in_consegna: { label: 'In Consegna', color: 'text-purple-600', bg: 'bg-purple-50', icon: FiTruck },
      consegnato: { label: 'Consegnato', color: 'text-green-600', bg: 'bg-green-50', icon: FiPackage },
      annullato: { label: 'Annullato', color: 'text-red-600', bg: 'bg-red-50', icon: FiX },
    };
    return configs[stato] || configs.richiesto;
  }, []);

  // Memoizar cálculos costosos para evitar recálculos innecesarios
  const ordiniFiltrados = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return ordini.filter((o) => {
      // Buscar en todos los materiales de la orden
      const matchSearch = searchTerm === '' || 
        o.items?.some(item => {
          const cod = item.materiale?.cod_articolo?.toLowerCase() || '';
          const desc = item.materiale?.descrizione?.toLowerCase() || '';
          const forn = item.materiale?.fornitore?.toLowerCase() || '';
          return cod.includes(searchLower) || desc.includes(searchLower) || forn.includes(searchLower);
        });
      const matchStato = filterStato === '' || o.stato === filterStato;
      // Buscar por fornitore en cualquier item de la orden
      const matchFornitore = filterFornitore === '' || 
        o.items?.some(item => item.materiale?.fornitore === filterFornitore);
      // Filtrar por material específico
      const matchMateriale = filterMateriale === '' || 
        o.items?.some(item => item.id_materiale === Number(filterMateriale));
      // Por defecto, excluir órdenes anuladas a menos que se filtren explícitamente
      const excludeAnnullate = filterStato === '' ? o.stato !== 'annullato' : true;
      return matchSearch && matchStato && matchFornitore && matchMateriale && excludeAnnullate;
    });
  }, [ordini, searchTerm, filterStato, filterFornitore, filterMateriale]);

  const fornitoriUnici = useMemo(() => {
    const fornitori = new Set();
    ordini.forEach(o => {
      o.items?.forEach(item => {
        if (item.materiale?.fornitore) {
          fornitori.add(item.materiale.fornitore);
        }
      });
    });
    return Array.from(fornitori).sort();
  }, [ordini]);

  const statiUnici = useMemo(() => {
    const stati = new Set();
    ordini.forEach(o => {
      if (o.stato) stati.add(o.stato);
    });
    return Array.from(stati);
  }, [ordini]);

  const materialiUnici = useMemo(() => {
    const materialiMap = new Map();
    ordini.forEach(o => {
      o.items?.forEach(item => {
        if (item.materiale && !materialiMap.has(item.id_materiale)) {
          materialiMap.set(item.id_materiale, {
            id: item.id_materiale,
            descrizione: item.materiale.descrizione || item.materiale.cod_articolo || 'Sconosciuto',
            cod_articolo: item.materiale.cod_articolo || item.materiale.codice || ''
          });
        }
      });
    });
    return Array.from(materialiMap.values()).sort((a, b) => {
      const descA = (a.descrizione || '').toLowerCase();
      const descB = (b.descrizione || '').toLowerCase();
      return descA.localeCompare(descB);
    });
  }, [ordini]);

  // Permitir crear órdenes a técnicos, comerciales y admins - memoizado
  const puedeCrearOrden = useMemo(() => {
    return currentUser && (
      currentUser.rol === 'comercial' || 
      currentUser.rol === 'admin' || 
      currentUser.rol === 'tecnico'
    );
  }, [currentUser]);

  // Solo comercial y admin pueden editar órdenes (cambiar estado) - memoizado para mejor rendimiento
  const puedeEditarOrden = useMemo(() => {
    return currentUser && (currentUser.rol === 'comercial' || currentUser.rol === 'admin');
  }, [currentUser]);

  /**
   * Agrupa los materiales ordenados por fornitore y abre el modal
   */
  const handleViewMaterialiOrdine = () => {
    // Agrupar items de órdenes por fornitore, excluyendo las anuladas
    const materialiPerFornitore = {};
    ordiniFiltrados
      .filter(ordine => ordine.stato !== 'annullato') // Excluir órdenes anuladas
      .forEach(ordine => {
        ordine.items?.forEach(item => {
          const fornitore = item.materiale?.fornitore || 'Sconosciuto';
          if (!materialiPerFornitore[fornitore]) {
            materialiPerFornitore[fornitore] = [];
          }
          materialiPerFornitore[fornitore].push({
            ...item,
            id_ordine: ordine.id_ordine,
            data_richiesta: ordine.data_richiesta,
            stato: ordine.stato,
          });
        });
      });
    
    // Convertir a array y ordenar
    const materialiArray = Object.entries(materialiPerFornitore).map(([fornitore, items]) => ({
      fornitore,
      ordini: items,
      totaleQuantita: items.reduce((sum, item) => sum + item.quantita, 0)
    })).sort((a, b) => a.fornitore.localeCompare(b.fornitore));
    
    setMaterialiOrdineModal(materialiArray);
    setShowMaterialiModal(true);
  };

  /**
   * Genera y descarga PDFs separados por fornitore para una orden
   */
  const downloadPDFOrdinePerFornitore = (ordine) => {
    if (!ordine.items || ordine.items.length === 0) {
      showNotification('Nessun materiale in questa ordine', 'info');
      return;
    }

    // Agrupar items por fornitore
    const itemsPerFornitore = {};
    ordine.items.forEach((item) => {
      const fornitore = item.materiale?.fornitore || 'Sconosciuto';
      if (!itemsPerFornitore[fornitore]) {
        itemsPerFornitore[fornitore] = [];
      }
      itemsPerFornitore[fornitore].push(item);
    });

    // Generar un PDF para cada fornitore
    Object.keys(itemsPerFornitore).forEach((fornitore, index) => {
      setTimeout(() => {
        const itemsFornitore = itemsPerFornitore[fornitore];
        const ordineFornitore = {
          ...ordine,
          items: itemsFornitore
        };
        
        const doc = new jsPDF();
        
        // Configuración de colores
        const headerColor = [102, 126, 234];
        const borderColor = [200, 200, 200];
        const lightGray = [245, 245, 245];
        
        // Título con fondo
        doc.setFillColor(...headerColor);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Ordine Materiali', 14, 18);
        
        // Información de la orden
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        let yPos = 40;
        doc.text(`Ordine N. ${ordine.id_ordine}`, 14, yPos);
        yPos += 8;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...headerColor);
        doc.text(`Fornitore: ${fornitore}`, 14, yPos);
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Data Richiesta: ${ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-'}`, 14, yPos);
        yPos += 6;
        doc.text(`Stato: ${getStatoConfig(ordine.stato).label}`, 14, yPos);
        yPos += 15;
        
        // Tabla de materiales (sin columna Fornitore ya que es el mismo)
        const headers = ['#', 'Cod. Articolo', 'Descrizione', 'Quantità'];
        const colWidths = [10, 40, 95, 25]; // Ajustado para mejor proporción
        const startX = 14;
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const headerHeight = 10;
        const rowHeight = 8;
        const cellPadding = 3;
        let tableY = yPos;
        
        // Función para dibujar bordes verticales
        const drawVerticalBorders = (y, height) => {
          doc.setDrawColor(...borderColor);
          doc.setLineWidth(0.1);
          let xPos = startX;
          doc.line(xPos, y, xPos, y + height);
          colWidths.forEach((width, i) => {
            if (i < colWidths.length - 1) {
              xPos += width;
              doc.line(xPos, y, xPos, y + height);
            }
          });
          doc.line(startX + tableWidth, y, startX + tableWidth, y + height);
        };
        
        // Función para dibujar encabezado
        const drawHeader = (y) => {
          doc.setFillColor(...headerColor);
          doc.rect(startX, y, tableWidth, headerHeight, 'F');
          drawVerticalBorders(y, headerHeight);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          const headerTextY = y + headerHeight / 2 + 3;
          let xPos = startX + cellPadding;
          headers.forEach((header, i) => {
            if (i === 0) {
              doc.text(header, startX + colWidths[0] / 2, headerTextY, { align: 'center' });
            } else {
              doc.text(header, xPos, headerTextY);
            }
            xPos += colWidths[i];
          });
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
        };
        
        // Dibujar encabezado inicial
        drawHeader(tableY);
        tableY += headerHeight;
        
        // Filas de datos
        itemsFornitore.forEach((item, index) => {
          if (tableY + rowHeight > 280) {
            doc.addPage();
            tableY = 20;
            drawHeader(tableY);
            tableY += headerHeight;
          }
          
          if (index % 2 === 1) {
            doc.setFillColor(...lightGray);
            doc.rect(startX, tableY, tableWidth, rowHeight, 'F');
          }
          
          doc.setDrawColor(...borderColor);
          doc.setLineWidth(0.1);
          doc.line(startX, tableY, startX + tableWidth, tableY);
          doc.line(startX, tableY + rowHeight, startX + tableWidth, tableY + rowHeight);
          drawVerticalBorders(tableY, rowHeight);
          
          // Centrar verticalmente el texto de las celdas
          const cellTextY = tableY + rowHeight / 2 + 2;
          doc.setFontSize(9);
          let xPos = startX + cellPadding;
          
          const numText = String(index + 1);
          doc.text(numText, startX + colWidths[0] / 2, cellTextY, { align: 'center' });
          xPos += colWidths[0];
          
          const codArticolo = item.materiale?.codice || item.materiale?.cod_articolo || '-';
          const codLines = doc.splitTextToSize(codArticolo, colWidths[1] - cellPadding * 2);
          doc.text(codLines[0] || '-', xPos, cellTextY);
          xPos += colWidths[1];
          
          const descrizione = item.materiale?.descrizione || '-';
          const descLines = doc.splitTextToSize(descrizione, colWidths[2] - cellPadding * 2);
          doc.text(descLines[0] || '-', xPos, cellTextY);
          xPos += colWidths[2];
          
          const quantita = `${item.quantita} ${item.materiale?.unita_misura || 'pz'}`;
          doc.text(quantita, xPos, cellTextY);
          
          tableY += rowHeight;
        });
        
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.2);
        doc.line(startX, tableY, startX + tableWidth, tableY);
        
        // Pie de página
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Pagina ${i} di ${pageCount} - Generato il ${new Date().toLocaleDateString('it-IT')}`,
            105,
            290,
            { align: 'center' }
          );
        }
        
        const fileName = `ordine-${ordine.id_ordine}-${fornitore.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }, index * 500); // Esperar 500ms entre cada descarga
    });
    
    showNotification(`PDF generati per ${Object.keys(itemsPerFornitore).length} fornitore/i`, 'success');
  };

  /**
   * Genera y descarga un PDF de una orden individual
   */
  const downloadPDFOrdine = (ordine) => {
    const doc = new jsPDF();
    
    // Configuración de colores
    const headerColor = [102, 126, 234]; // Azul primario
    const borderColor = [200, 200, 200];
    const lightGray = [245, 245, 245];
    
    // Título con fondo
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Ordine Materiali', 14, 18);
    
    // Información de la orden
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    let yPos = 40;
    doc.text(`Ordine N. ${ordine.id_ordine}`, 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Data Richiesta: ${ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-'}`, 14, yPos);
    yPos += 6;
    doc.text(`Stato: ${getStatoConfig(ordine.stato).label}`, 14, yPos);
    yPos += 10;
    
    // Tabla de materiales
    if (ordine.items && ordine.items.length > 0) {
      // Encabezados de la tabla
      const headers = ['#', 'Cod. Articolo', 'Descrizione', 'Fornitore', 'Quantità'];
      const colWidths = [10, 35, 80, 30, 25]; // Ajustado para mejor proporción
      const startX = 14;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const headerHeight = 10;
      const rowHeight = 8;
      const cellPadding = 3;
      let tableY = yPos;
      
      // Función para dibujar bordes verticales
      const drawVerticalBorders = (y, height) => {
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.1);
        let xPos = startX;
        // Borde izquierdo
        doc.line(xPos, y, xPos, y + height);
        // Bordes entre columnas
        colWidths.forEach((width, i) => {
          if (i < colWidths.length - 1) {
            xPos += width;
            doc.line(xPos, y, xPos, y + height);
          }
        });
        // Borde derecho
        doc.line(startX + tableWidth, y, startX + tableWidth, y + height);
      };
      
      // Función para dibujar encabezado
      const drawHeader = (y) => {
        // Dibujar fondo del encabezado
        doc.setFillColor(...headerColor);
        doc.rect(startX, y, tableWidth, headerHeight, 'F');
        
        // Dibujar bordes del encabezado
        drawVerticalBorders(y, headerHeight);
        
        // Texto del encabezado centrado verticalmente
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        const headerTextY = y + headerHeight / 2 + 3;
        let xPos = startX + cellPadding;
        headers.forEach((header, i) => {
          if (i === 0) {
            doc.text(header, startX + colWidths[0] / 2, headerTextY, { align: 'center' });
          } else {
            doc.text(header, xPos, headerTextY);
          }
          xPos += colWidths[i];
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
      };
      
      // Dibujar encabezado inicial
      drawHeader(tableY);
      tableY += headerHeight;
      
      // Filas de datos
      ordine.items.forEach((item, index) => {
        // Verificar si necesitamos nueva página
        if (tableY + rowHeight > 280) {
          doc.addPage();
          tableY = 20;
          drawHeader(tableY);
          tableY += headerHeight;
        }
        
        // Fondo alternado para filas
        if (index % 2 === 1) {
          doc.setFillColor(...lightGray);
          doc.rect(startX, tableY, tableWidth, rowHeight, 'F');
        }
        
        // Bordes horizontales y verticales de la fila
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.1);
        // Borde superior
        doc.line(startX, tableY, startX + tableWidth, tableY);
        // Borde inferior
        doc.line(startX, tableY + rowHeight, startX + tableWidth, tableY + rowHeight);
        // Bordes verticales
        drawVerticalBorders(tableY, rowHeight);
        
        // Datos de la fila - centrar verticalmente
        const cellTextY = tableY + rowHeight / 2 + 2;
        doc.setFontSize(9);
        let xPos = startX + cellPadding;
        
        // Número (centrado en la columna)
        const numText = String(index + 1);
        doc.text(numText, startX + colWidths[0] / 2, cellTextY, { align: 'center' });
        xPos += colWidths[0];
        
        // Cod. Articolo
        const codArticolo = item.materiale?.codice || item.materiale?.cod_articolo || '-';
        const codLines = doc.splitTextToSize(codArticolo, colWidths[1] - cellPadding * 2);
        doc.text(codLines[0] || '-', xPos, cellTextY);
        xPos += colWidths[1];
        
        // Descrizione
        const descrizione = item.materiale?.descrizione || '-';
        const descLines = doc.splitTextToSize(descrizione, colWidths[2] - cellPadding * 2);
        doc.text(descLines[0] || '-', xPos, cellTextY);
        xPos += colWidths[2];
        
        // Fornitore
        const fornitore = item.materiale?.fornitore || '-';
        const fornLines = doc.splitTextToSize(fornitore, colWidths[3] - cellPadding * 2);
        doc.text(fornLines[0] || '-', xPos, cellTextY);
        xPos += colWidths[3];
        
        // Quantità
        const quantita = `${item.quantita} ${item.materiale?.unita_misura || 'pz'}`;
        doc.text(quantita, xPos, cellTextY);
        
        tableY += rowHeight;
      });
      
      // Línea final de la tabla
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(startX, tableY, startX + tableWidth, tableY);
      
      yPos = tableY + 10;
    } else {
      doc.setFontSize(10);
      doc.text('Nessun materiale in questa ordine', 14, yPos);
      yPos += 10;
    }
    
    // Información adicional
    if (ordine.data_ordine || ordine.data_consegna_prevista || ordine.data_consegna || ordine.note) {
      yPos += 5;
      // Separador más sutil
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(14, yPos, 200, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Informazioni Aggiuntive', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      if (ordine.data_ordine) {
        doc.text(`Data Ordine: ${new Date(ordine.data_ordine).toLocaleDateString('it-IT')}`, 14, yPos);
        yPos += 7;
      }
      if (ordine.data_consegna_prevista) {
        doc.text(`Consegna Prevista: ${new Date(ordine.data_consegna_prevista).toLocaleDateString('it-IT')}`, 14, yPos);
        yPos += 7;
      }
      if (ordine.data_consegna) {
        doc.text(`Data Consegna: ${new Date(ordine.data_consegna).toLocaleDateString('it-IT')}`, 14, yPos);
        yPos += 7;
      }
      if (ordine.note) {
        yPos += 3;
        doc.setFont(undefined, 'bold');
        doc.text('Note:', 14, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        const noteLines = doc.splitTextToSize(ordine.note, 180);
        doc.text(noteLines, 14, yPos);
      }
    }
    
    // Pie de página
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Pagina ${i} di ${pageCount} - Generato il ${new Date().toLocaleDateString('it-IT')}`,
        105,
        290,
        { align: 'center' }
      );
    }
    
    // Guardar
    const fileName = `ordine-${ordine.id_ordine}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    showNotification('PDF dell\'ordine scaricato con successo', 'success');
  };

  /**
   * Genera y descarga un PDF con los órdenes filtrados
   */
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Configuración de colores
    const headerColor = [102, 126, 234]; // Azul primario
    const borderColor = [200, 200, 200];
    const lightGray = [245, 245, 245];
    
    // Título con fondo
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Ordini Materiali', 14, 18);
    
    // Fecha de generación
    doc.setFontSize(9);
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 14, 25);
    
    // Información del documento
    doc.setTextColor(0, 0, 0);
    let yPos = 40;
    
    // Filtros aplicados
    if (filterStato || filterFornitore || searchTerm) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Filtri applicati:', 14, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      if (searchTerm) {
        doc.text(`• Ricerca: "${searchTerm}"`, 20, yPos);
        yPos += 6;
      }
      if (filterStato) {
        doc.text(`• Stato: ${getStatoConfig(filterStato).label}`, 20, yPos);
        yPos += 6;
      }
      if (filterFornitore) {
        doc.text(`• Fornitore: ${filterFornitore}`, 20, yPos);
        yPos += 6;
      }
      yPos += 5;
    }
    
    // Preparar datos de la tabla
    const tableData = [];
    ordiniFiltrados.forEach(ordine => {
      if (ordine.items && ordine.items.length > 0) {
        ordine.items.forEach((item, index) => {
          tableData.push({
            ordineNum: ordine.id_ordine,
            codArticolo: item.materiale?.codice || item.materiale?.cod_articolo || '-',
            descrizione: item.materiale?.descrizione || '-',
            fornitore: item.materiale?.fornitore || '-',
            quantita: `${item.quantita} ${item.materiale?.unita_misura || 'pz'}`,
            stato: index === 0 ? getStatoConfig(ordine.stato).label : '',
            dataRichiesta: index === 0 ? (ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-') : '',
            isFirstRow: index === 0
          });
        });
      } else {
        tableData.push({
          ordineNum: ordine.id_ordine,
          codArticolo: '-',
          descrizione: 'Nessun materiale',
          fornitore: '-',
          quantita: '-',
          stato: getStatoConfig(ordine.stato).label,
          dataRichiesta: ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-',
          isFirstRow: true
        });
      }
    });
    
    // Headers de la tabla
    const headers = ['Ordine', 'Cod. Articolo', 'Descrizione', 'Fornitore', 'Quantità', 'Stato', 'Data'];
    const colWidths = [18, 26, 52, 26, 20, 20, 20]; // Ajustado para mejor proporción
    const startX = 14;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const headerHeight = 10;
    const rowHeight = 8; // Aumentado para mejor espaciado
    const cellPadding = 3; // Aumentado para mejor espaciado
    let tableY = yPos + 5;
    
    // Función para dibujar bordes verticales
    const drawVerticalBorders = (y, height) => {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.1);
      let xPos = startX;
      // Borde izquierdo
      doc.line(xPos, y, xPos, y + height);
      // Bordes entre columnas
      colWidths.forEach((width, i) => {
        if (i < colWidths.length - 1) {
          xPos += width;
          doc.line(xPos, y, xPos, y + height);
        }
      });
      // Borde derecho
      doc.line(startX + tableWidth, y, startX + tableWidth, y + height);
    };
    
    // Función para dibujar encabezado de tabla
    const drawTableHeader = (y) => {
      doc.setFillColor(...headerColor);
      doc.rect(startX, y, tableWidth, headerHeight, 'F');
      drawVerticalBorders(y, headerHeight);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      
      // Centrar verticalmente el texto del encabezado
      const headerTextY = y + headerHeight / 2 + 3;
      let xPos = startX + cellPadding;
      headers.forEach((header, i) => {
        doc.text(header, xPos, headerTextY);
        xPos += colWidths[i];
      });
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    };
    
    // Dibujar encabezado inicial
    drawTableHeader(tableY);
    tableY += headerHeight;
    
    // Filas de datos
    let currentOrdineNum = null;
    tableData.forEach((row, index) => {
      // Verificar si necesitamos nueva página
      if (tableY + rowHeight > 280) {
        doc.addPage();
        tableY = 20;
        drawTableHeader(tableY);
        tableY += headerHeight;
      }
      
      // Separador visual entre órdenes diferentes
      if (currentOrdineNum !== null && currentOrdineNum !== row.ordineNum && row.isFirstRow) {
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.line(startX, tableY - 2, startX + tableWidth, tableY - 2);
        tableY += 3;
      }
      currentOrdineNum = row.ordineNum;
      
      // Fondo alternado para filas
      if (index % 2 === 1) {
        doc.setFillColor(...lightGray);
        doc.rect(startX, tableY, tableWidth, rowHeight, 'F');
      }
      
      // Bordes horizontales y verticales de la fila
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.1);
      doc.line(startX, tableY, startX + tableWidth, tableY);
      doc.line(startX, tableY + rowHeight, startX + tableWidth, tableY + rowHeight);
      drawVerticalBorders(tableY, rowHeight);
      
      // Centrar verticalmente el texto de las celdas
      const cellTextY = tableY + rowHeight / 2 + 2;
      doc.setFontSize(8);
      let xPos = startX + cellPadding;
      
      // Ordine
      if (row.isFirstRow) {
        doc.setFont(undefined, 'bold');
        const ordineText = `N.${row.ordineNum}`;
        doc.text(ordineText, xPos, cellTextY);
        doc.setFont(undefined, 'normal');
      }
      xPos += colWidths[0];
      
      // Cod. Articolo
      const codLines = doc.splitTextToSize(row.codArticolo, colWidths[1] - cellPadding * 2);
      doc.text(codLines[0] || '-', xPos, cellTextY);
      xPos += colWidths[1];
      
      // Descrizione
      const descLines = doc.splitTextToSize(row.descrizione, colWidths[2] - cellPadding * 2);
      doc.text(descLines[0] || '-', xPos, cellTextY);
      xPos += colWidths[2];
      
      // Fornitore
      const fornLines = doc.splitTextToSize(row.fornitore, colWidths[3] - cellPadding * 2);
      doc.text(fornLines[0] || '-', xPos, cellTextY);
      xPos += colWidths[3];
      
      // Quantità
      doc.text(row.quantita, xPos, cellTextY);
      xPos += colWidths[4];
      
      // Stato
      doc.text(row.stato, xPos, cellTextY);
      xPos += colWidths[5];
      
      // Data
      doc.text(row.dataRichiesta, xPos, cellTextY);
      
      tableY += rowHeight;
    });
    
    // Línea final de la tabla
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.2);
    doc.line(startX, tableY, startX + tableWidth, tableY);
    
    // Resumen
    tableY += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Totale: ${ordiniFiltrados.length} ordine/i, ${tableData.length} materiale/i`, startX, tableY);
    
    // Pie de página
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Pagina ${i} di ${pageCount} - Generato il ${new Date().toLocaleDateString('it-IT')}`,
        105,
        290,
        { align: 'center' }
      );
    }
    
    // Guardar con nombre que incluye filtros
    let fileName = `ordini-materiali-${new Date().toISOString().split('T')[0]}`;
    if (filterFornitore) {
      fileName += `-${filterFornitore.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
    if (filterStato) {
      fileName += `-${filterStato}`;
    }
    fileName += '.pdf';
    doc.save(fileName);
    showNotification('PDF scaricato con successo', 'success');
  };

  if (loading) {
    return <LoadingSpinner message="Caricamento ordini..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">
            Gestione Ordini Materiali
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg hidden sm:block">
            Gestisci gli ordini di materiali e comunica lo stato con il team
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all font-semibold text-gray-700 text-sm sm:text-base flex-1 sm:flex-none"
            title="Aggiorna"
          >
            <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
          {puedeCrearOrden && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-none"
            >
              <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Nuovo Ordine</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario - Vista Tabla Completa */}
      {showForm && !editingId && (
        <div className="card overflow-x-hidden">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              <span className="hidden sm:inline">Nuovo Ordine - Seleziona Materiali</span>
              <span className="sm:hidden">Nuovo Ordine</span>
            </h3>
            <button
              onClick={resetForm}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Búsqueda de Materiales */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <FiSearch className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cerca materiale..."
                value={searchMateriale}
                onChange={(e) => setSearchMateriale(e.target.value)}
                className="flex-1 input-field text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Tabla de Materiales - Desktop */}
          <div className="mb-4 sm:mb-6 overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Cod. Articolo</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Descrizione</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Fornitore</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Unità</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-600 uppercase">Quantità da Ordinare</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-600 uppercase">Azione</th>
                </tr>
              </thead>
              <tbody>
                {materialiFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nessun materiale trovato</p>
                    </td>
                  </tr>
                ) : (
                  materialiFiltrados.map((materiale) => {
                    const itemInLista = listaOrdine.find(item => item.id_materiale === materiale.id_materiale);
                    const quantitaInLista = itemInLista?.quantita || 0;
                    
                    return (
                      <tr key={materiale.id_materiale} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-gray-900">{materiale.cod_articolo}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-700">{materiale.descrizione}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">{materiale.fornitore}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">{materiale.unita_misura || '-'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {quantitaInLista > 0 ? (
                              <div className="flex items-center gap-2 bg-primary-50 rounded-lg border border-primary-200 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantitaInLista(materiale.id_materiale, quantitaInLista - 1)}
                                  className="p-1.5 text-primary-600 hover:bg-primary-100 rounded transition-colors"
                                >
                                  <FiMinus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={quantitaInLista}
                                  onChange={(e) => {
                                    const nuovaQuantita = parseFloat(e.target.value) || 0;
                                    handleUpdateQuantitaInLista(materiale.id_materiale, nuovaQuantita);
                                  }}
                                  className="w-20 text-center font-semibold text-primary-900 bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantitaInLista(materiale.id_materiale, quantitaInLista + 1)}
                                  className="p-1.5 text-primary-600 hover:bg-primary-100 rounded transition-colors"
                                >
                                  <FiPlus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  onBlur={(e) => {
                                    const quantita = parseFloat(e.target.value) || 0;
                                    if (quantita > 0) {
                                      handleAddMaterialeToLista(materiale.id_materiale, quantita);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const quantita = parseFloat(e.target.value) || 0;
                                      if (quantita > 0) {
                                        handleAddMaterialeToLista(materiale.id_materiale, quantita);
                                        e.target.blur();
                                      }
                                    }
                                  }}
                                  className="w-20 px-2 py-1.5 text-center text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-xs text-gray-500">{materiale.unita_misura || 'pz'}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            {quantitaInLista > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveMateriale(materiale.id_materiale)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rimuovi"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mb-4 sm:mb-6 md:hidden space-y-3">
            {materialiFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nessun materiale trovato</p>
              </div>
            ) : (
              materialiFiltrados.map((materiale) => {
                const itemInLista = listaOrdine.find(item => item.id_materiale === materiale.id_materiale);
                const quantitaInLista = itemInLista?.quantita || 0;
                
                return (
                  <div
                    key={materiale.id_materiale}
                    className="p-4 rounded-xl border-2 border-gray-200 bg-white"
                  >
                    <div className="mb-3">
                      <h4 className="font-bold text-gray-900 text-base mb-1">{materiale.cod_articolo}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{materiale.descrizione}</p>
                      <p className="text-xs text-gray-500 mt-1">Fornitore: {materiale.fornitore} | {materiale.unita_misura || 'pz'}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {quantitaInLista > 0 ? (
                        <div className="flex items-center gap-2 bg-primary-50 rounded-lg border border-primary-200 p-1 flex-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantitaInLista(materiale.id_materiale, quantitaInLista - 1)}
                            className="p-1.5 text-primary-600 hover:bg-primary-100 rounded transition-colors"
                          >
                            <FiMinus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={quantitaInLista}
                            onChange={(e) => {
                              const nuovaQuantita = parseFloat(e.target.value) || 0;
                              handleUpdateQuantitaInLista(materiale.id_materiale, nuovaQuantita);
                            }}
                            className="w-20 text-center font-semibold text-primary-900 bg-transparent border-0 focus:outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantitaInLista(materiale.id_materiale, quantitaInLista + 1)}
                            className="p-1.5 text-primary-600 hover:bg-primary-100 rounded transition-colors"
                          >
                            <FiPlus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            onBlur={(e) => {
                              const quantita = parseFloat(e.target.value) || 0;
                              if (quantita > 0) {
                                handleAddMaterialeToLista(materiale.id_materiale, quantita);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const quantita = parseFloat(e.target.value) || 0;
                                if (quantita > 0) {
                                  handleAddMaterialeToLista(materiale.id_materiale, quantita);
                                  e.target.blur();
                                }
                              }
                            }}
                            className="flex-1 px-2 py-1.5 text-center text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-xs text-gray-500">{materiale.unita_misura || 'pz'}</span>
                        </div>
                      )}
                      {quantitaInLista > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMateriale(materiale.id_materiale)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rimuovi"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Resumen de Materiales Seleccionados */}
          {listaOrdine.length > 0 && (
            <div className="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <FiShoppingCart className="w-4 h-4 text-primary-600" />
                    Materiali selezionati per l'ordine
                  </h4>
                  <p className="text-xs text-gray-600">
                    {listaOrdine.length} materiale{listaOrdine.length !== 1 ? 'i' : ''} • {listaOrdine.reduce((sum, item) => sum + item.quantita, 0)} unità totali
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setListaOrdine([])}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Svuota Lista
                </button>
              </div>
            </div>
          )}

          {/* Informazioni Ordine */}
          <form onSubmit={handleSubmitLista} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stato
                </label>
                <select
                  name="stato"
                  value={formData.stato}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="richiesto">Richiesto</option>
                  <option value="ordinato">Ordinato</option>
                  <option value="in_consegna">In Consegna</option>
                  <option value="consegnato">Consegnato</option>
                  <option value="annullato">Annullato</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  Data Richiesta
                </label>
                <input
                  type="date"
                  name="data_richiesta"
                  value={formData.data_richiesta}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  Data Ordine
                </label>
                <input
                  type="date"
                  name="data_ordine"
                  value={formData.data_ordine}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <FiCalendar className="w-4 h-4" />
                Data Consegna Prevista
              </label>
              <input
                type="date"
                name="data_consegna_prevista"
                value={formData.data_consegna_prevista}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Note per comunicazione con il team..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition-colors text-sm sm:text-base w-full sm:w-auto order-2 sm:order-1"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={listaOrdine.length === 0}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto order-1 sm:order-2"
              >
                <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Crea Ordine ({listaOrdine.length} materiali)</span>
                <span className="sm:hidden">Crea ({listaOrdine.length})</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario de Edición */}
      {showForm && editingId && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Modifica Ordine
            </h3>
            <button
              onClick={resetForm}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stato
                </label>
                <select
                  name="stato"
                  value={formData.stato}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="richiesto">Richiesto</option>
                  <option value="ordinato">Ordinato</option>
                  <option value="in_consegna">In Consegna</option>
                  <option value="consegnato">Consegnato</option>
                  <option value="annullato">Annullato</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  Data Richiesta
                </label>
                <input
                  type="date"
                  name="data_richiesta"
                  value={formData.data_richiesta}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  Data Ordine
                </label>
                <input
                  type="date"
                  name="data_ordine"
                  value={formData.data_ordine}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <FiCalendar className="w-4 h-4" />
                Data Consegna Prevista
              </label>
              <input
                type="date"
                name="data_consegna_prevista"
                value={formData.data_consegna_prevista}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            {/* Lista de Artículos con Cantidades Editables */}
            {editingItems.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Materiali ({editingItems.length})
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {editingItems.map((item, index) => (
                    <div key={item.id_item || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                            Cod. Articolo
                          </label>
                          <p className="text-sm text-gray-900 font-medium">
                            {item.materiale?.codice || item.materiale?.cod_articolo || 'N/A'}
                          </p>
                        </div>
                        <div className="md:col-span-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                            Descrizione
                          </label>
                          <p className="text-sm text-gray-900">
                            {item.materiale?.descrizione || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                            Quantità ({item.materiale?.unita_misura || 'pz'})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantita}
                            onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Note per comunicazione con il team..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition-colors w-full sm:w-auto min-h-[44px]"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Aggiorna</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Barra de búsqueda */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Cerca ordini..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 sm:pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base bg-white"
            />
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          </div>
          
          {/* Filtro Stato */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value)}
              className="w-full sm:min-w-[160px] px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base bg-white text-gray-900 cursor-pointer"
            >
              <option value="">Tutti gli stati</option>
              {statiUnici.map((stato) => {
                const config = getStatoConfig(stato);
                return (
                  <option key={stato} value={stato}>
                    {config.label}
                  </option>
                );
              })}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none select-none" />
          </div>
          
          {/* Filtro Materiale */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filterMateriale}
              onChange={(e) => setFilterMateriale(e.target.value)}
              className="w-full sm:min-w-[180px] px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base bg-white text-gray-900 cursor-pointer"
            >
              <option value="">Tutti i materiali</option>
              {materialiUnici.map((materiale) => (
                <option key={materiale.id} value={materiale.id}>
                  {materiale.cod_articolo ? `${materiale.cod_articolo} - ` : ''}{materiale.descrizione}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none select-none" />
          </div>
          
          {/* Filtro Fornitore */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filterFornitore}
              onChange={(e) => setFilterFornitore(e.target.value)}
              className="w-full sm:min-w-[160px] px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base bg-white text-gray-900 cursor-pointer"
            >
              <option value="">Tutti i fornitori</option>
              {fornitoriUnici.map((fornitore) => (
                <option key={fornitore} value={fornitore}>
                  {fornitore}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none select-none" />
          </div>
          
          {/* Botón Eliminar Órdenes Anuladas (solo admin/comercial) */}
          {currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'comercial') && (
            <>
              <button
                onClick={handleDeleteAnnullate}
                disabled={ordiniAnnullateCount === 0}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base flex-shrink-0 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                title="Elimina tutte le ordini annullate"
              >
                <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Elimina Annullate</span>
                <span className="sm:hidden">Annullate</span>
              </button>
              <button
                onClick={handleCancelAll}
                disabled={ordiniFiltrados.length === 0}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base flex-shrink-0 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                title="Elimina definitivamente tutti gli ordini filtrati"
              >
                <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Elimina Tutti</span>
                <span className="sm:hidden">Elimina</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lista Expandible de Ordini */}
      <div className="space-y-3">
        {ordiniFiltrados.length === 0 ? (
          <div className="card text-center py-12">
            <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">Nessun ordine trovato</p>
          </div>
        ) : (
          ordiniFiltrados.map((ordine) => {
            const statoConfig = getStatoConfig(ordine.stato);
            const StatoIcon = statoConfig.icon;
            const isExpanded = ordiniEspansi.has(ordine.id_ordine);
            const isEditingStato = editingStato?.id_ordine === ordine.id_ordine;

            // Determinar el color del borde según el estado
            const borderColorClass = ordine.stato === 'annullato' 
              ? 'border-l-red-500' 
              : ordine.stato === 'consegnato' 
              ? 'border-l-green-500' 
              : ordine.stato === 'in_consegna' 
              ? 'border-l-purple-500' 
              : ordine.stato === 'ordinato' 
              ? 'border-l-blue-500' 
              : 'border-l-yellow-500';

            return (
              <div
                key={ordine.id_ordine}
                className={`card border-l-4 ${borderColorClass} hover:shadow-lg transition-all overflow-hidden ${ordine.stato === 'annullato' ? 'opacity-75' : ''}`}
              >
                {/* Header - Siempre visible */}
                <div
                  onClick={() => toggleOrdine(ordine.id_ordine)}
                  className="flex items-center justify-between cursor-pointer gap-2 sm:gap-4"
                >
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <div className={`${statoConfig.bg} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                      <StatoIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${statoConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                            Ordine N. {ordine.id_ordine}
                          </h3>
                          <span className="text-xs font-semibold text-gray-500">
                            {ordine.items?.length || 0} materiale{ordine.items?.length !== 1 ? 'i' : ''}
                          </span>
                        </div>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit ${statoConfig.bg} ${statoConfig.color}`}>
                          <StatoIcon className="w-3 h-3" />
                          {statoConfig.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                        {ordine.items?.slice(0, 2).map(item => item.materiale?.descrizione).filter(Boolean).join(', ') || 'Nessun materiale'}
                        {ordine.items?.length > 2 && ` +${ordine.items.length - 2} altro${ordine.items.length - 2 !== 1 ? 'i' : ''}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold text-gray-900">
                        {ordine.items?.reduce((sum, item) => sum + item.quantita, 0) || 0} unità
                      </div>
                      <div className="text-xs text-gray-500">
                        {ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-'}
                      </div>
                    </div>
                    <div className="text-right sm:hidden">
                      <div className="text-xs font-semibold text-gray-900">
                        {ordine.items?.reduce((sum, item) => sum + item.quantita, 0) || 0} unità
                      </div>
                    </div>
                    <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                      {isExpanded ? <FiChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                {/* Contenuto Espandibile */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {/* Lista Materiali */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Materiali ({ordine.items?.length || 0})</label>
                      <div className="space-y-3">
                        {ordine.items && ordine.items.length > 0 ? (
                          ordine.items.map((item, index) => {
                            const isEditing = editingOrdineId === ordine.id_ordine;
                            const editItem = isEditing && editingOrdineData?.items[index];
                            const displayItem = isEditing ? editItem : item;
                            
                            return (
                              <div key={item.id_item || index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                  <div className="min-w-0">
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Cod. Articolo</label>
                                    <p className="text-sm text-gray-900 truncate">{displayItem.materiale?.codice || displayItem.materiale?.cod_articolo || 'N/A'}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Descrizione</label>
                                    <p className="text-sm text-gray-900 line-clamp-2">{displayItem.materiale?.descrizione || 'N/A'}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Quantità</label>
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={displayItem.quantita}
                                          onChange={(e) => handleEditItemQuantity(index, e.target.value)}
                                          className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                        />
                                      ) : (
                                        <p className="text-sm font-semibold text-gray-900">
                                          {displayItem.quantita} {displayItem.materiale?.unita_misura || 'pz'}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fornitore</label>
                                      <p className="text-sm text-gray-900">{displayItem.materiale?.fornitore || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                                {item.note && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Note</label>
                                    <p className="text-xs text-gray-700">{item.note}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">Nessun materiale in questa ordine</p>
                        )}
                      </div>
                    </div>

                    {/* Stato - Editable para comercial */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Stato</label>
                      {puedeEditarOrden && isEditingStato ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingStato.stato}
                            onChange={(e) => setEditingStato({ ...editingStato, stato: e.target.value })}
                            className="flex-1 input-field"
                          >
                            <option value="richiesto">Richiesto</option>
                            <option value="ordinato">Ordinato</option>
                            <option value="in_consegna">In Consegna</option>
                            <option value="consegnato">Consegnato</option>
                            <option value="annullato">Annullato</option>
                          </select>
                          <button
                            onClick={() => handleCambioStato(ordine.id_ordine, editingStato.stato)}
                            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Salva"
                          >
                            <FiSave className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingStato(null)}
                            className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Annulla"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${statoConfig.bg} ${statoConfig.color}`}>
                            <StatoIcon className="w-4 h-4" />
                            {statoConfig.label}
                          </span>
                          {puedeEditarOrden && (
                            <button
                              onClick={() => setEditingStato({ id_ordine: ordine.id_ordine, stato: ordine.stato })}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Modifica Stato"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          Data Richiesta
                        </label>
                        <p className="text-sm text-gray-900">
                          {ordine.data_richiesta ? new Date(ordine.data_richiesta).toLocaleDateString('it-IT') : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          Data Ordine
                        </label>
                        <p className="text-sm text-gray-900">
                          {ordine.data_ordine ? new Date(ordine.data_ordine).toLocaleDateString('it-IT') : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block flex items-center gap-1">
                          <FiTruck className="w-3 h-3" />
                          Consegna Prevista
                        </label>
                        {editingOrdineId === ordine.id_ordine ? (
                          <input
                            type="date"
                            value={editingOrdineData?.data_consegna_prevista || ''}
                            onChange={(e) => setEditingOrdineData({
                              ...editingOrdineData,
                              data_consegna_prevista: e.target.value,
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">
                            {ordine.data_consegna_prevista ? new Date(ordine.data_consegna_prevista).toLocaleDateString('it-IT') : '-'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    {ordine.note && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Note</label>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{ordine.note}</p>
                      </div>
                    )}

                    {/* Azioni */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 flex-wrap">
                      {editingOrdineId === ordine.id_ordine ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(ordine.id_ordine)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <FiSave className="w-4 h-4" />
                            <span>Salva</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <FiX className="w-4 h-4" />
                            <span>Annulla</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => downloadPDFOrdinePerFornitore(ordine)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            title="Scarica PDF separati per fornitore"
                          >
                            <FiDownload className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF per Fornitore</span>
                            <span className="sm:hidden">PDF/Fornitore</span>
                          </button>
                          <button
                            onClick={() => downloadPDFOrdine(ordine)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            title="Scarica PDF dell'ordine completo"
                          >
                            <FiDownload className="w-4 h-4" />
                            <span>Scarica PDF</span>
                          </button>
                          <button
                            onClick={() => handleResendEmail(ordine.id_ordine)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            title="Reinvia email ai commerciali"
                          >
                            <FiMail className="w-4 h-4" />
                            <span className="hidden sm:inline">Reinvia Email</span>
                            <span className="sm:hidden">Email</span>
                          </button>
                          {puedeEditarOrden && (
                            <>
                              <button
                                onClick={() => handleEdit(ordine)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <FiEdit2 className="w-4 h-4" />
                                <span>Modifica</span>
                              </button>
                              <button
                                onClick={() => handleDelete(ordine.id_ordine)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                              >
                                <FiTrash2 className="w-4 h-4" />
                                <span>Elimina</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Materiali Ordinati */}
      {showMaterialiModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMaterialiModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            style={{ 
              animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 flex-1 min-w-0">
                <FiPackage className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 flex-shrink-0" />
                <span className="truncate">Materiali Ordinati</span>
              </h3>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={downloadPDF}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-xs sm:text-sm min-h-[44px]"
                  title="Scarica PDF"
                >
                  <FiDownload className="w-4 h-4" />
                  <span className="hidden sm:inline">Scarica PDF</span>
                </button>
                <button
                  onClick={() => setShowMaterialiModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 rounded-b-xl">
              {materialiOrdineModal.length === 0 ? (
                <div className="text-center py-12">
                  <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold text-lg">Nessun materiale trovato</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {materialiOrdineModal.map((gruppo, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                        <h4 className="text-lg font-bold text-gray-900">{gruppo.fornitore}</h4>
                        <span className="text-sm font-semibold text-gray-600">
                          {gruppo.ordini.length} ordine{gruppo.ordini.length !== 1 ? 'i' : ''} • 
                          Totale: {gruppo.totaleQuantita} unità
                        </span>
                      </div>
                      <div className="space-y-3">
                        {gruppo.ordini.map((item) => {
                          // Buscar la orden completa para el PDF
                          const ordineCompleto = ordini.find(o => o.id_ordine === item.id_ordine);
                          return (
                            <div key={`${item.id_ordine}-${item.id_item || item.materiale?.id_materiale}`} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">
                                      Ordine N. {item.id_ordine}
                                    </span>
                                    {item.stato && (
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatoConfig(item.stato).bg} ${getStatoConfig(item.stato).color}`}>
                                        {getStatoConfig(item.stato).label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-semibold">Cod. Articolo:</span> {item.materiale?.codice || item.materiale?.cod_articolo || '-'}
                                  </p>
                                  <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-semibold">Articolo:</span> {item.materiale?.descrizione || '-'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-semibold">Quantità:</span> {item.quantita} {item.materiale?.unita_misura || 'pz'}
                                  </p>
                                  {item.data_richiesta && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Data: {new Date(item.data_richiesta).toLocaleDateString('it-IT')}
                                    </p>
                                  )}
                                </div>
                                {ordineCompleto && (
                                  <button
                                    onClick={() => {
                                      downloadPDFOrdine(ordineCompleto);
                                    }}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
                                    title="Scarica PDF"
                                  >
                                    <FiDownload className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </div>
  );
}

