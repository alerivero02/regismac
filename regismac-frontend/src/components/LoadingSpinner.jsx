export default function LoadingSpinner({ message = 'Cargando...', fullScreen = false }) {
  const containerClass = fullScreen 
    ? "flex justify-center items-center min-h-screen w-screen fixed inset-0 bg-white z-50"
    : "flex justify-center items-center min-h-[400px]";
  
  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

