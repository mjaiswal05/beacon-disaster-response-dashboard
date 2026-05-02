import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { backdropVariants, modalVariants } from "../../utils/animations";

interface SessionTimeoutWarningProps {
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function SessionTimeoutWarning({
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutWarningProps) {
  const progress = secondsRemaining / (5 * 60); // fraction of 5-minute warning

  return (
    <>
      {/* Backdrop */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-timeout-title"
          aria-describedby="session-timeout-desc"
        >
          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="session-timeout-title"
                className="text-white font-semibold text-base"
              >
                Session Expiring
              </h2>
              <p
                id="session-timeout-desc"
                className="text-gray-400 text-xs mt-0.5"
              >
                Your session will expire due to inactivity
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div
            className="text-center py-4"
            role="timer"
            aria-live="polite"
            aria-label={`Session expires in ${formatTime(secondsRemaining)}`}
          >
            <p className="text-orange-400 text-3xl font-mono font-bold">
              {formatTime(secondsRemaining)}
            </p>
            <p className="text-gray-500 text-xs mt-1">remaining</p>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-5">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, progress * 100)}%`,
                background: progress > 0.5 ? "#32D74B" : progress > 0.2 ? "#FF9F0A" : "#FF453A",
              }}
              aria-hidden="true"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onStayLoggedIn}
              className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
              autoFocus
            >
              Stay Logged In
            </button>
            <button
              onClick={onLogout}
              className="flex-1 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
