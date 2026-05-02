import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (msg: string) => sonnerToast.success(msg),
  error:   (msg: string) => sonnerToast.error(msg),
  warning: (msg: string) => sonnerToast.warning(msg),
  info:    (msg: string) => sonnerToast.info(msg),
  loading: (msg: string, id: string) => sonnerToast.loading(msg, { id }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
