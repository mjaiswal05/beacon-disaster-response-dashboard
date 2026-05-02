import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CommandPaletteProvider } from "./contexts/CommandPaletteContext";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <CommandPaletteProvider>
        <Toaster position="top-right" richColors closeButton />
        <RouterProvider router={router} />
      </CommandPaletteProvider>
    </AuthProvider>
  );
}
