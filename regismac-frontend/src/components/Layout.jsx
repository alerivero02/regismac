import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiLayout, 
  FiFileText, 
  FiActivity,
  FiMenu,
  FiX,
  FiChevronsLeft,
  FiChevronsRight,
  FiHome,
  FiPackage,
  FiClipboard,
  FiUsers,
  FiBox,
  FiShoppingCart,
  FiLogOut,
  FiUser,
  FiLayers
} from 'react-icons/fi';
import { authAPI } from '../services/api';
import EstablecerPasswordModal from './EstablecerPasswordModal';
import logoHorizontal from '../assets/regismac-logo.png';
import logoIso from '../assets/regismac-iso.png';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuClickMode, setUserMenuClickMode] = useState(false); // Modo click para mantener abierto
  const userMenuRef = useRef(null);
  const userMenuTimeoutRef = useRef(null);

  // Prevenir scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Cerrar menú de usuario al hacer click fuera o scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        // Si está en modo click, cerrar también el modo click
        if (userMenuClickMode) {
          setUserMenuClickMode(false);
        }
        setUserMenuOpen(false);
        // Limpiar timeout si existe
        if (userMenuTimeoutRef.current) {
          clearTimeout(userMenuTimeoutRef.current);
          userMenuTimeoutRef.current = null;
        }
      }
    };

    const handleScroll = () => {
      // Solo cerrar si no está en modo click
      if (!userMenuClickMode) {
      setUserMenuOpen(false);
        if (userMenuTimeoutRef.current) {
          clearTimeout(userMenuTimeoutRef.current);
          userMenuTimeoutRef.current = null;
        }
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [userMenuOpen, userMenuClickMode]);

  const isActive = (path) => location.pathname === path;

  const [user, setUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      if (userData) {
        // Limpiar consola al cargar usuario (después de login)
        if (!sessionStorage.getItem('consoleCleared')) {
          console.clear();
          sessionStorage.setItem('consoleCleared', 'true');
          // Limpiar el flag después de 1 segundo para permitir limpiar en próximos logins
          setTimeout(() => {
            sessionStorage.removeItem('consoleCleared');
          }, 1000);
        }
        
        setUser(userData);
        
        // Si el usuario NO tiene contraseña (sin importar cómo se registró), mostrar modal OBLIGATORIO
        // Esto aplica a TODOS los usuarios sin contraseña
        if (!userData.tiene_password) {
          setShowPasswordModal(true);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    }
  };

  const handlePasswordSet = () => {
    // Recargar usuario para actualizar el estado
    loadUser();
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      // Limpiar cualquier dato local (sessionStorage y localStorage)
      setUser(null);
      sessionStorage.clear();
      localStorage.clear();
      // Redirigir al login
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así limpiar todo y redirigir al login aunque haya error
      setUser(null);
      sessionStorage.clear();
      localStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  const menuItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: FiHome,
      description: 'Panoramica generale',
      color: 'from-blue-500 to-blue-600',
      roles: ['admin', 'tecnico', 'comercial']
    },
    { 
      path: '/registros', 
      label: 'Registri', 
      icon: FiPackage,
      description: 'Gestione macchine',
      color: 'from-primary-500 to-primary-600',
      roles: ['admin', 'tecnico']
    },
    { 
      path: '/test', 
      label: 'Test', 
      icon: FiClipboard,
      description: 'Prove di temperatura',
      color: 'from-accent-500 to-accent-600',
      roles: ['admin', 'tecnico']
    },
    { 
      path: '/materiali', 
      label: 'Materiali', 
      icon: FiBox,
      description: 'Gestione materiali',
      color: 'from-orange-500 to-orange-600',
      roles: ['admin', 'comercial', 'tecnico']
    },
    { 
      path: '/ordini-materiali', 
      label: 'Ordini', 
      icon: FiShoppingCart,
      description: 'Ordini materiali',
      color: 'from-green-500 to-green-600',
      roles: ['admin', 'comercial', 'tecnico']
    },
    { 
      path: '/lotti', 
      label: 'Lotti', 
      icon: FiLayers,
      description: 'Gestione lotti',
      color: 'from-indigo-500 to-indigo-600',
      roles: ['admin', 'tecnico']
    },
    ...(user?.rol === 'admin' ? [{
      path: '/admin/usuarios',
      label: 'Utenti',
      icon: FiUsers,
      description: 'Amministrazione',
      color: 'from-purple-500 to-purple-600',
      roles: ['admin']
    }] : []),
  ];
  
  // Filtrar items según el rol del usuario (mostrar todos si user es null para evitar problemas de carga)
  const filteredMenuItems = user 
    ? menuItems.filter(item => item.roles?.includes(user.rol) || user.rol === 'admin')
    : menuItems; // Mostrar todos mientras carga el usuario

  // Bloquear interacción con la app si el usuario no tiene contraseña
  const userNeedsPassword = user && !user.tiene_password;

  return (
    <div className={`min-h-screen bg-gray-50 flex w-full overflow-x-hidden ${userNeedsPassword ? 'pointer-events-none' : ''}`} style={{ overflowY: 'auto' }}>
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 shadow-xl fixed h-full transition-all duration-300 z-30 ${
        sidebarCollapsed ? 'w-20' : 'w-80'
      }`}>
        {/* Header */}
        <div className={`bg-white transition-all duration-300 ${
          sidebarCollapsed ? 'p-4' : 'p-6'
        }`}>
          {!sidebarCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <img 
                  src={logoHorizontal} 
                  alt="Regismac Logo" 
                  className="h-14 w-auto object-contain"
                />
              </div>
              <p className="text-xs text-gray-500 font-medium text-center">Gestione Produzione</p>
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <img 
                src={logoIso} 
                alt="Regismac Logo" 
                className="h-12 w-12 object-contain"
              />
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto transition-all duration-300 scrollbar-hide ${
          sidebarCollapsed ? 'p-3 space-y-2' : 'p-4 space-y-2'
        }`}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? `${item.label} - ${item.description}` : ''}
                className={`
                  group relative flex items-center font-semibold 
                  transition-all duration-300 ease-out
                  ${sidebarCollapsed 
                    ? 'justify-center p-0' 
                    : 'gap-4 px-4 py-4 rounded-xl'
                  }
                  ${active
                    ? sidebarCollapsed
                      ? ''
                      : `bg-gradient-to-r ${item.color} text-white shadow-lg`
                    : sidebarCollapsed
                      ? ''
                      : 'text-gray-700 hover:bg-gray-50 hover:shadow-md'
                  }
                `}
              >
                {/* Indicador activo - solo visible cuando no está colapsado */}
                {active && !sidebarCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full shadow-sm"></div>
                )}
                
                {/* Tooltip cuando está comprimido */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-2xl">
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-xs text-gray-300 mt-0.5">{item.description}</div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2.5 h-2.5 bg-gray-900 rotate-45"></div>
                  </div>
                )}
                
                {sidebarCollapsed ? (
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-all duration-300
                    ${active
                      ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-primary-600'
                    }
                  `}>
                    <Icon className="w-5 h-5 transition-all duration-300" />
                  </div>
                ) : (
                  <>
                    <div className={`
                      flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 flex-shrink-0
                      ${active 
                        ? 'bg-white/20 backdrop-blur-sm' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                      }
                    `}>
                      <Icon className={`w-6 h-6 transition-all duration-300 ${
                        active ? 'text-white' : 'text-gray-600 group-hover:text-primary-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base leading-tight">{item.label}</div>
                      <div className={`text-xs mt-1 transition-colors ${
                        active ? 'text-white/90' : 'text-gray-500 group-hover:text-gray-600'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <div className={`border-t border-gray-200 bg-white transition-all duration-300 ${
          sidebarCollapsed ? 'p-3' : 'p-4'
        }`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              w-full flex items-center font-semibold 
              text-gray-700 transition-all duration-300 group
              ${sidebarCollapsed 
                ? 'justify-center' 
                : 'gap-3 px-4 py-3 rounded-xl hover:bg-gray-50'
              }
            `}
            title={sidebarCollapsed ? 'Espandi menu' : 'Comprimi menu'}
          >
            {sidebarCollapsed ? (
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <FiChevronsRight className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 group-hover:scale-110 transition-all">
                  <FiChevronsLeft className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                </div>
                <span className="text-sm">Comprimi menu</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 w-full min-w-0 ml-0 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
      }`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm overflow-visible" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
          <div className="px-3 sm:px-4 lg:px-6 xl:px-8 relative" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {mobileMenuOpen ? <FiX className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 flex-1 justify-end" style={{ overflow: 'visible' }}>
                <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 flex-wrap">
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center gap-1.5 xl:gap-2 px-3 xl:px-4 py-2 rounded-xl font-semibold text-xs xl:text-sm 
                          transition-all duration-300 whitespace-nowrap
                          ${active
                            ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                            : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
                          }
                        `}
                      >
                        <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${active ? 'animate-pulse' : ''}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* User Menu */}
                {user && (
                  <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 lg:pl-4 border-l border-gray-200 flex-shrink-0" style={{ position: 'relative', zIndex: 50 }}>
                    <div className="relative" ref={userMenuRef} style={{ position: 'relative', zIndex: 50 }}>
                      <div
                        onMouseEnter={() => {
                          // Limpiar timeout si existe
                          if (userMenuTimeoutRef.current) {
                            clearTimeout(userMenuTimeoutRef.current);
                            userMenuTimeoutRef.current = null;
                          }
                          setUserMenuOpen(true);
                        }}
                        onMouseLeave={() => {
                          // Si está en modo click, no cerrar automáticamente
                          if (userMenuClickMode) {
                            return;
                          }
                          // Esperar 1 segundo antes de cerrar
                          userMenuTimeoutRef.current = setTimeout(() => {
                            setUserMenuOpen(false);
                            userMenuTimeoutRef.current = null;
                          }, 1000);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle del modo click
                          if (userMenuClickMode) {
                            setUserMenuClickMode(false);
                            setUserMenuOpen(false);
                            if (userMenuTimeoutRef.current) {
                              clearTimeout(userMenuTimeoutRef.current);
                              userMenuTimeoutRef.current = null;
                            }
                          } else {
                            setUserMenuClickMode(true);
                            setUserMenuOpen(true);
                            if (userMenuTimeoutRef.current) {
                              clearTimeout(userMenuTimeoutRef.current);
                              userMenuTimeoutRef.current = null;
                            }
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0 hover:shadow-lg transition-all hover:scale-105 ${userMenuClickMode ? 'ring-2 ring-primary-300 ring-offset-2' : ''}`}>
                          <FiUser className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </div>
                      
                      {/* Dropdown Menu */}
                      {userMenuOpen && (
                        <div 
                          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-3"
                          style={{ 
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '0.5rem',
                            zIndex: 10000,
                            animation: 'slide-down 0.15s ease-out',
                            transformOrigin: 'top right',
                            maxWidth: 'calc(100vw - 2rem)',
                            minWidth: '12rem',
                            width: '14rem',
                            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                          }}
                          onMouseEnter={() => {
                            // Limpiar timeout si existe
                            if (userMenuTimeoutRef.current) {
                              clearTimeout(userMenuTimeoutRef.current);
                              userMenuTimeoutRef.current = null;
                            }
                            setUserMenuOpen(true);
                          }}
                          onMouseLeave={() => {
                            // Si está en modo click, no cerrar automáticamente
                            if (userMenuClickMode) {
                              return;
                            }
                            // Esperar 1 segundo antes de cerrar
                            userMenuTimeoutRef.current = setTimeout(() => {
                              setUserMenuOpen(false);
                              userMenuTimeoutRef.current = null;
                            }, 1000);
                          }}
                        >
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="text-sm font-semibold text-gray-900">
                              {user.nombre} {user.apellido}
                            </div>
                            <div className="text-xs text-gray-500 capitalize mt-1">
                              {user.rol === 'admin' ? 'Amministratore' : user.rol === 'tecnico' ? 'Tecnico' : 'Commerciale'}
                            </div>
                            {user.email && (
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                {user.email}
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1">
                            <button
                              onClick={() => {
                                setUserMenuOpen(false);
                                setUserMenuClickMode(false);
                                if (userMenuTimeoutRef.current) {
                                  clearTimeout(userMenuTimeoutRef.current);
                                  userMenuTimeoutRef.current = null;
                                }
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-all min-h-[44px]"
                            >
                              <FiLogOut className="w-4 h-4" />
                              <span>Esci</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div 
              className="fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 101, maxWidth: '24rem' }}
            >
              <div className="flex-shrink-0 bg-white p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
                <div className="flex items-center justify-between mb-2">
                  <img 
                    src={logoHorizontal} 
                    alt="Regismac Logo" 
                    className="h-10 sm:h-14 w-auto object-contain max-w-[70%]"
                  />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-gray-600 hover:bg-white/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
                <div className="text-xs text-gray-600 font-medium text-center">
                  Gestione Produzione
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-hide">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-semibold 
                        transition-all duration-300 min-h-[60px]
                        ${active
                          ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                          : 'text-gray-700 hover:bg-gray-50 hover:shadow-md'
                        }
                      `}
                    >
                      <div className={`
                        flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all flex-shrink-0
                        ${active 
                          ? 'bg-white/20 backdrop-blur-sm' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                        }
                      `}>
                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${active ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base leading-tight truncate">{item.label}</div>
                        <div className={`text-xs mt-0.5 sm:mt-1 line-clamp-1 ${active ? 'text-white/90' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* User Info y Logout en Mobile */}
              {user && (
                <div className="flex-shrink-0 bg-white p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                      <FiUser className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {user.nombre} {user.apellido}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {user.rol === 'admin' ? 'Amministratore' : user.rol === 'tecnico' ? 'Tecnico' : 'Commerciale'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md min-h-[44px]"
                  >
                    <FiLogOut className="w-5 h-5" />
                    <span>Esci</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
      <main className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-6 xl:px-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen w-full overflow-x-hidden">
        <div className="w-full overflow-x-hidden max-w-full">
          <Outlet />
        </div>
      </main>
      </div>

      {/* Modal OBLIGATORIO para establecer contraseña - Se muestra si el usuario NO tiene contraseña */}
      {user && !user.tiene_password && (
        <div className="pointer-events-auto fixed inset-0 z-[9999]">
          <EstablecerPasswordModal
            show={true}
            onClose={() => {
              // No permitir cerrar si no tiene contraseña
            }}
            onSuccess={() => {
              handlePasswordSet();
              setShowPasswordModal(false);
            }}
            required={true}
          />
        </div>
      )}
      
      {/* Modal opcional para establecer contraseña - Solo si el usuario tiene contraseña pero quiere cambiarla */}
      {user?.tiene_password && showPasswordModal && (
      <EstablecerPasswordModal
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            handlePasswordSet();
            setShowPasswordModal(false);
          }}
          required={false}
      />
      )}
    </div>
  );
}