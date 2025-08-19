export function formatMasterStatus(slaves: any[]): string {
  const getCircle = (value: number): string => value > 0 ? "🟢" : "🔴";

  const slavesFormatted = slaves.map((slave, index) => {
    return `S${index}: ${getCircle(slave.executed)} ${getCircle(slave.finished)} | ${getCircle(slave.R0)} ${getCircle(slave.R1)} ${getCircle(slave.R2)} ${getCircle(slave.R3)} | ${slave.symbol}`;
  }).join("\n");

  return `
${slavesFormatted}
`;
}

export function formatSlaveStatus(data: any) {
  const {
    id,
    status,
    symbol,
    executed,
    finished,
    leverage,
    stop_loss,
    order_amount,
    margin_type,
    created_at,
    updated_at,
    R0,
    R1,
    R2,
    R3
  } = data;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').split('.')[0];
  };

  return `
*📄 ID:* \`${id}\`
*📈 Symbol:* \`${symbol}\`
*📊 Status:* \`${status}\`
*🧮 Executed:* \`${executed}\`
*✅ Finished:* \`${finished}\`
*⚙️ Leverage:* \`${leverage}x\`
*🛑 Stop Loss:* \`${stop_loss}\`
*💰 Order Amount:* \`${order_amount}\`
*🔐 Margin Type:* \`${margin_type}\`

*🕐 Created At:* \`${formatDate(created_at)}\`
*♻️ Updated At:* \`${formatDate(updated_at)}\`

*🧠 R-Levels:*
\`R0: ${R0}\`
\`R1: ${R1}\`
\`R2: ${R2}\`
\`R3: ${R3}\`
`.trim();
}

export function formatHunterStatus(data: any) {
  const date = new Date(data.updated_at);
  const formattedDate = date.toLocaleString('en-US', { timeZone: 'UTC' });

  return `
📢 *Status:* ${data.status}
🔄 *Iteration:* ${data.iteration}
💹 *Symbol:* ${data.symbol}
✅ *Valid symbols:* ${data.validSymbols}
📊 *Detected:* ${data.detectedSymbols.length ? data.detectedSymbols.join(', ') : 'None'}
🕒 *Updated:* ${formattedDate} UTC
  `.trim();
}
