from .candle import Candle

class Timeframe:
    """
    Maintains the state of a single timeframe.

    Responsibilities:
    - Aggregate ticks into OHLCV candles.
    - Maintain the live candle.
    - Store candle history.
    - Update indicators.
    """

    def __init__(self, name: str, timeframe_ms: int):
        self.name = name
        self.timeframe_ms = timeframe_ms

        self.live_candle: Candle | None = None
        self.history: list[Candle] = []

        self.is_new: bool = False

        #
        # TODO:
        # Replace with an IndicatorSet class.
        #
        self.indicators: dict = {}

    def update(self, tick) -> None:
        """
        Updates this timeframe with a market tick.
        """

        bucket = tick.time // self.timeframe_ms

        #
        # First candle.
        #
        if self.live_candle is None:
            self.live_candle = self._new_candle(bucket, tick)
            self.is_new = True
            self._update_indicators()
            return

        current_bucket = self.live_candle.start_ts // self.timeframe_ms

        #
        # Candle rollover.
        #
        if bucket != current_bucket:
            self.history.append(self.live_candle)

            self.live_candle = self._new_candle(bucket, tick)
            self.is_new = True

            self._update_indicators()
            return

        #
        # Update current candle.
        #
        self.live_candle.high = max(self.live_candle.high, tick.price)
        self.live_candle.low = min(self.live_candle.low, tick.price)
        self.live_candle.close = tick.price
        self.live_candle.volume += tick.qty

        self.is_new = False

        self._update_indicators()

    def _new_candle(self, bucket: int, tick) -> Candle:
        """
        Creates a new candle from the first tick of a timeframe.
        """

        return Candle(
            open=tick.price,
            high=tick.price,
            low=tick.price,
            close=tick.price,
            volume=tick.qty,
            start_ts=bucket * self.timeframe_ms,
            end_ts=(bucket + 1) * self.timeframe_ms,
        )

    def _update_indicators(self) -> None:
        """
        Updates all indicators for this timeframe.
        """

        #
        # TODO:
        # EMA
        # RSI
        # ATR
        # MACD
        #
        pass