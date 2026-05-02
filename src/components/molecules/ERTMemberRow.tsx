import { cn } from "../ui/utils";
import { Pencil, Trash2 } from "lucide-react";

interface ERTMemberRowProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ERTMemberRow({
  id,
  name,
  email,
  phone,
  role,
  status,
  onEdit,
  onDelete,
}: ERTMemberRowProps) {
  return (
    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
      <td className="px-4 py-3 text-sm text-foreground">{name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{email}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{phone}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
        {role}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full",
            status === "active"
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400",
          )}
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Edit ${name}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
            aria-label={`Delete ${name}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}
