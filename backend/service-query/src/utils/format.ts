import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

interface SlaveState {
  id: string;
  iteration: number;
  description: string;
  paused: boolean;
  status: string;
  symbol: string;
  symbol_info: any;
  executed: number;
  finished: number;
  leverage: number;
  stop_loss: string;
  order_amount: number;
  margin_type: string;
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}

interface BotInfo {
  id: string;
  symbol: string;
  description: string;
  status: string;
  paused: boolean;
  live: boolean;
  iteration: number;
  info: { title: string; subtitle: string }[];
  images: string[];
}

export function formatSlaveData(slaveState: SlaveState, live: boolean, images: string[]): BotInfo {
  const activeRules = slaveState.rule_values.filter(Boolean).length;
  const createdAt = slaveState.created_at || Date.now();
  const updatedAt = slaveState.updated_at || Date.now();
  const stopLossPercent = ((1 - parseFloat(slaveState.stop_loss)) * 100).toFixed(2)
  
  return {
    id: slaveState.id,
    symbol: slaveState.symbol,
    description: slaveState.description,
    status: slaveState.status,
    paused: slaveState.paused,
    live: live,
    iteration: slaveState.iteration,
    info: [
      { title: "Runtime", subtitle: formatRuntime(createdAt, updatedAt) },
      { title: "Status", subtitle: slaveState.status },
      { title: "Rules", subtitle: `${activeRules}/${slaveState.rule_labels.length}` },
      { title: "Executed", subtitle: Boolean(slaveState.executed).toString() },
      { title: "Finished", subtitle: Boolean(slaveState.finished).toString() },
      { title: "Leverage", subtitle: `${slaveState.leverage}x` },
      { title: "SL", subtitle: `${stopLossPercent}%` },
      { title: "Amount", subtitle: `${slaveState.order_amount} USD` },
      { title: "Margin", subtitle: slaveState.margin_type }
    ],
    images: images
  };
}

function formatRuntime(createdAt: number, updatedAt: number): string {
  const diffMs = Math.max(0, updatedAt - createdAt);
  const dur = dayjs.duration(diffMs);
  const days = dur.days();
  const hours = dur.hours();
  const minutes = dur.minutes();
  return `${days}d ${hours}h ${minutes}m`;
}
