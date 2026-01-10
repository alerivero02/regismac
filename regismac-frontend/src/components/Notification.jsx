import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

export default function Notification({ show, message, type = 'success', onClose }) {
  if (!show) return null;

  const getBgColor = () => {
    if (type === 'success') return 'bg-green-500';
    if (type === 'error') return 'bg-red-500';
    if (type === 'info') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getIcon = () => {
    if (type === 'success') return <FiCheckCircle className="w-5 h-5" />;
    if (type === 'error') return <FiAlertCircle className="w-5 h-5" />;
    if (type === 'info') return <FiInfo className="w-5 h-5" />;
    return <FiInfo className="w-5 h-5" />;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-large ${getBgColor()} text-white flex items-center gap-3 animate-slide-up`}>
      {getIcon()}
      <span className="font-semibold">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
        >
          <span className="text-lg">×</span>
        </button>
      )}
    </div>
  );
}

