import { request } from "../../utils/request";
import type { BotAction } from "../../types/supportBot.types";

interface BotActionButtonProps {
  action: BotAction;
}

const typeStyles: Record<BotAction['type'], string> = {
  sos:      "bg-red-600/20 text-red-400 border-red-600/40 hover:bg-red-600/30",
  call:     "bg-green-600/20 text-green-400 border-green-600/40 hover:bg-green-600/30",
  escalate: "bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30",
  navigate: "bg-blue-600/20 text-blue-400 border-blue-600/40 hover:bg-blue-600/30",
  link:     "bg-gray-700/40 text-gray-300 border-gray-600/40 hover:bg-gray-700/60",
};

const BOT = "/api/support-bot/v1";

async function handleSOS() {
  try {
    await request.post(`${BOT}/emergency/notify`, {});
  } catch {
    // Best effort — SOS attempt logged server-side
  }
}

async function handleEscalate() {
  try {
    await request.post(`${BOT}/escalations`, { reason: "User-initiated via bot action button" });
  } catch {
    // Best effort
  }
}

/**
 * BotActionButton — renders a single action chip returned by BeaconAI.
 * Handles: sos (POST emergency/notify), call (tel: link), navigate (CustomEvent),
 * link (external URL), escalate (POST escalations).
 */
export function BotActionButton({ action }: BotActionButtonProps) {
  const style = typeStyles[action.type] ?? typeStyles.link;

  const handleClick = () => {
    switch (action.type) {
      case "sos":
        void handleSOS();
        break;
      case "call":
        if (action.value) {
          window.open(`tel:${action.value}`, "_self");
        }
        break;
      case "navigate":
        window.dispatchEvent(
          new CustomEvent("beacon:navigate", { detail: { id: action.value } }),
        );
        break;
      case "link":
        if (action.value) {
          window.open(action.value, "_blank", "noopener,noreferrer");
        }
        break;
      case "escalate":
        void handleEscalate();
        break;
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${style}`}
      aria-label={action.label}
    >
      {action.label}
    </button>
  );
}
