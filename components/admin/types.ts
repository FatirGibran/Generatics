export type TabId = "overview" | "motions" | "participants" | "settings";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  text: string;
  type: ToastType;
}
