from dataclasses import dataclass, field
from ingestion.tick import Tick

@dataclass
class PriceLevel:
    price: float

    bid_volume: float = 0.0
    ask_volume: float = 0.0
    total_volume: float = 0.0

    trades: int = 0

    min_trade: float = 0.0
    max_trade: float = 0.0

    buy_trades: int = 0
    sell_trades: int = 0

    max_buy_trade: float = 0.0
    max_sell_trade: float = 0.0

    @property
    def delta(self) -> float:
        return self.ask_volume - self.bid_volume


@dataclass
class Bar:
    time: int

    open: float
    high: float
    low: float
    close: float

    total_volume: float = 0.0
    bid_volume: float = 0.0
    ask_volume: float = 0.0

    trades: int = 0

    min_trade: float = 0.0
    max_trade: float = 0.0

    volume_price_sum: float = 0.0

    volume_at_price: dict[float, PriceLevel] = field(
        default_factory=dict
    )

    start_ts: int = 0
    end_ts: int = 0

    @property
    def delta(self) -> float:
        return self.ask_volume - self.bid_volume

    @property
    def vwap(self) -> float:
        if self.total_volume <= 0:
            return 0.0

        return self.volume_price_sum / self.total_volume


class BarAggregator:
    """
    Agrega ticks directamente en los Timeframes registrados.

    El BarAggregator es responsable de:

        Tick
          ↓
        Timeframe.live

    Cada Timeframe mantiene su propia barra según
    timeframe.timeframe_ms.
    """

    def __init__(self, timeframes=None):
        self.timeframes = timeframes or {}

    def update(self, tick: Tick) -> None:
        for timeframe in self.timeframes.values():
            self._update_timeframe(timeframe, tick)

    def _update_timeframe(self, timeframe, tick: Tick) -> None:

        timeframe_ms = timeframe.timeframe_ms

        bucket = tick.time // timeframe_ms

        start_ts = bucket * timeframe_ms
        end_ts = start_ts + timeframe_ms

        live = timeframe.live

        # --------------------------------------------------
        # Primera barra
        # --------------------------------------------------

        if live is None:

            timeframe.live = self._new_bar(
                tick,
                start_ts,
                end_ts,
            )

            timeframe.is_new = True
            timeframe.is_closed = False

            return

        # --------------------------------------------------
        # Mismo timeframe
        # --------------------------------------------------

        if start_ts == live.start_ts:

            self._update_bar(
                live,
                tick,
            )

            timeframe.is_new = False
            timeframe.is_closed = False

            return

        # --------------------------------------------------
        # Nuevo timeframe
        # --------------------------------------------------

        timeframe.live = self._new_bar(
            tick,
            start_ts,
            end_ts,
        )

        timeframe.is_new = True
        timeframe.is_closed = True

    # ======================================================
    # CREATE BAR
    # ======================================================

    def _new_bar(
        self,
        tick: Tick,
        start_ts: int,
        end_ts: int,
    ) -> Bar:

        is_buy = tick.is_buyer_maker == 0

        price = tick.price
        qty = tick.qty

        level = PriceLevel(
            price=price,

            bid_volume=qty if not is_buy else 0.0,
            ask_volume=qty if is_buy else 0.0,

            total_volume=qty,

            trades=1,

            min_trade=qty,
            max_trade=qty,

            buy_trades=1 if is_buy else 0,
            sell_trades=0 if is_buy else 1,

            max_buy_trade=qty if is_buy else 0.0,
            max_sell_trade=qty if not is_buy else 0.0,
        )

        return Bar(
            time=start_ts // 1000,

            open=price,
            high=price,
            low=price,
            close=price,

            total_volume=qty,

            bid_volume=qty if not is_buy else 0.0,
            ask_volume=qty if is_buy else 0.0,

            trades=1,

            min_trade=qty,
            max_trade=qty,

            volume_price_sum=price * qty,

            volume_at_price={
                price: level
            },

            start_ts=start_ts,
            end_ts=end_ts,
        )

    # ======================================================
    # UPDATE BAR
    # ======================================================

    def _update_bar(
        self,
        bar: Bar,
        tick: Tick,
    ) -> None:

        price = tick.price
        qty = tick.qty

        is_buy = tick.is_buyer_maker == 0

        # --------------------------------------------------
        # OHLC
        # --------------------------------------------------

        bar.high = max(
            bar.high,
            price,
        )

        bar.low = min(
            bar.low,
            price,
        )

        bar.close = price

        # --------------------------------------------------
        # Volume
        # --------------------------------------------------

        bar.total_volume += qty

        if is_buy:
            bar.ask_volume += qty
        else:
            bar.bid_volume += qty

        bar.trades += 1

        # --------------------------------------------------
        # Trade size
        # --------------------------------------------------

        if bar.min_trade == 0:
            bar.min_trade = qty
        else:
            bar.min_trade = min(
                bar.min_trade,
                qty,
            )

        bar.max_trade = max(
            bar.max_trade,
            qty,
        )

        # --------------------------------------------------
        # VWAP accumulator
        # --------------------------------------------------

        bar.volume_price_sum += (
            price * qty
        )

        # --------------------------------------------------
        # Volume At Price
        # --------------------------------------------------

        level = bar.volume_at_price.get(price)

        if level is None:

            level = PriceLevel(
                price=price,

                bid_volume=qty if not is_buy else 0.0,
                ask_volume=qty if is_buy else 0.0,

                total_volume=qty,

                trades=1,

                min_trade=qty,
                max_trade=qty,

                buy_trades=1 if is_buy else 0,
                sell_trades=0 if is_buy else 1,

                max_buy_trade=qty if is_buy else 0.0,
                max_sell_trade=qty if not is_buy else 0.0,
            )

            bar.volume_at_price[price] = level

            return

        # --------------------------------------------------
        # Price level volume
        # --------------------------------------------------

        level.total_volume += qty

        if is_buy:
            level.ask_volume += qty
            level.buy_trades += 1
            level.max_buy_trade = max(
                level.max_buy_trade,
                qty,
            )
        else:
            level.bid_volume += qty
            level.sell_trades += 1
            level.max_sell_trade = max(
                level.max_sell_trade,
                qty,
            )

        level.trades += 1

        level.min_trade = min(
            level.min_trade,
            qty,
        )

        level.max_trade = max(
            level.max_trade,
            qty,
        )

    # ======================================================
    # FLUSH
    # ======================================================

    def flush(self) -> None:
        """
        Finaliza las barras live de todos los Timeframes.

        Útil al terminar un backtest.
        """

        for timeframe in self.timeframes.values():

            if timeframe.live is not None:

                timeframe.live = None

            timeframe.is_new = False
            timeframe.is_closed = False