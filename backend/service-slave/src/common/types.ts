export type AlertType = "order:sell";

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  notified: boolean;
  created_at: number;
  update_at: number;
}
