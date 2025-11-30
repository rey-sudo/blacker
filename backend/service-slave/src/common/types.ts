export type AlertType = "order:sell";

export interface Alert {
  type: AlertType;
  title: string;
  message: string;
  notified: boolean;
  created_at: number;
  update_at: number;
}
