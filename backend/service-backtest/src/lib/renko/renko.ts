type OHLCV = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
};

type RenkoBrick = {
    time: number;
    open: number;
    close: number;
    direction: 1 | -1;
    brickSize: number;
};

/* -----------------------------------------
   TRUE RANGE (modo Binance)
----------------------------------------- */
function trueRange(prevClose: number, high: number, low: number): number {
    return Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
    );
}

/* -----------------------------------------
   ATR inicial de 14 periodos
----------------------------------------- */
function atrInicial(candles: OHLCV[]): number | null {
    if (candles.length < 15) return null;

    const TRs: number[] = [];

    for (let i = 1; i < 15; i++) {
        const c = candles[i];
        const prev = candles[i - 1];
        TRs.push(trueRange(prev.close, c.high, c.low));
    }

    return TRs.reduce((a, b) => a + b, 0) / 14;
}

/* -----------------------------------------
   ATR (Wilder)
----------------------------------------- */
function nextATR(prevATR: number, TR: number): number {
    return (prevATR * 13 + TR) / 14;
}

/* -----------------------------------------
   RENKO DINÁMICO ESTILO BINANCE
----------------------------------------- */
export function generarRenkoATR(candles: OHLCV[]): RenkoBrick[] {
    const renko: RenkoBrick[] = [];
    if (candles.length < 15) return renko;

    // ATR inicial
    let atr = atrInicial(candles);
    if (!atr) return renko;

    // brick inicial según ATR inicial
    let brickSize = Number(atr.toFixed(8));

    // 🔥 Alineación inicial AL GRID
    let lastRenkoClose =
        Math.floor(candles[0].close / brickSize) * brickSize;

    // procesar desde la vela 15
    for (let i = 15; i < candles.length; i++) {
        const curr = candles[i];
        const prev = candles[i - 1];

        // recalcular ATR dinámico
        const TR = trueRange(prev.close, curr.high, curr.low);
        atr = nextATR(atr, TR);
        brickSize = Number(atr.toFixed(8));

        let madeBricks = 0;
        const MAX_BRICKS = 500; // safety

        while (true) {
            if (madeBricks++ > MAX_BRICKS) break;

            const upTarget = Number((lastRenkoClose + brickSize).toFixed(8));
            const downTarget = Number((lastRenkoClose - brickSize).toFixed(8));

            let created = false;

            // 🔥 Primer chequeo: ruptura alcista (NO excluyente)
            if (curr.high >= upTarget) {
                renko.push({
                    time: curr.time,
                    open: lastRenkoClose,
                    close: upTarget,
                    direction: 1,
                    brickSize
                });

                lastRenkoClose = upTarget;
                created = true;
            }

            // 🔥 Segundo chequeo: ruptura bajista (NO else-if)
            if (curr.low <= downTarget) {
                renko.push({
                    time: curr.time,
                    open: lastRenkoClose,
                    close: downTarget,
                    direction: -1,
                    brickSize
                });

                lastRenkoClose = downTarget;
                created = true;
            }

            if (!created) break;
        }
    }

    return renko;
}
