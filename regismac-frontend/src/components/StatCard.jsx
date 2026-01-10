export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient = 'from-primary-500 to-primary-600',
  iconBg = 'bg-primary-50',
  iconColor = 'text-primary-600',
  subtitle,
  trend,
  onClick
}) {
  return (
    <>
      {/* Mobile: Layout optimizado para móvil */}
      <div 
        onClick={onClick}
        className={`sm:hidden bg-gradient-to-br ${gradient} text-white rounded-xl shadow-md p-4 w-full overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`${iconBg.replace('50', '100')} p-2.5 rounded-lg shadow-sm flex-shrink-0 mt-0.5`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/95 text-sm font-semibold leading-tight mb-2 line-clamp-2">{title}</p>
              <p className="text-3xl font-bold drop-shadow-sm leading-none tracking-tight mb-1">{value}</p>
              {subtitle && (
                <p className="text-white/80 text-xs font-medium line-clamp-1">{subtitle}</p>
              )}
            </div>
          </div>
          {trend !== undefined && (
            <div className="flex items-center bg-white/25 px-3 py-1.5 rounded-full flex-shrink-0 h-fit">
              <span className="text-white text-xs font-bold">{trend}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Layout horizontal original */}
      <div 
        onClick={onClick}
        className={`hidden sm:block card bg-gradient-to-br ${gradient} text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 p-4 lg:p-5 xl:p-6 w-full max-w-full ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
        <div className="relative">
          <div className="flex flex-row justify-between items-start mb-2 sm:mb-3 lg:mb-4">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-white/90 text-xs sm:text-sm font-medium mb-1 sm:mb-2 truncate">{title}</p>
              <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 drop-shadow-lg leading-tight">{value}</p>
              {subtitle && (
                <p className="text-white/80 text-xs font-medium line-clamp-2 mt-0.5 sm:mt-1">{subtitle}</p>
              )}
              {trend !== undefined && (
                <div className="mt-1 sm:mt-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/80 rounded-full animate-pulse"></div>
                  <span className="text-white/90 text-xs font-semibold">{trend}%</span>
                </div>
              )}
            </div>
            <div className={`${iconBg.replace('50', '100')} p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${iconColor}`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


