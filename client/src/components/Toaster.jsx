import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../context/ToastContext.jsx';

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };
const COLORS = {
  success: 'bg-lime text-ink',
  error:   'bg-white text-ink',
  info:    'bg-white/20 text-white',
};

export default function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-mobile px-4"
         style={{ bottom: 76 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } }}
            exit={{    opacity: 0, y: 10, scale: 0.95,  transition: { duration: 0.15 } }}
            className="flex items-center gap-3 bg-block text-white
                       rounded-2xl px-4 py-3 shadow-xl"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${COLORS[t.type] ?? COLORS.success}`}>
              {ICONS[t.type] ?? ICONS.success}
            </div>
            <p className="text-sm font-medium flex-1">{t.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
