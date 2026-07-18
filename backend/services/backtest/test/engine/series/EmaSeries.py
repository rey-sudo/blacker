from dataclasses import asdict, dataclass
from series.series import Series
from ingestion.tick import Tick

@dataclass(frozen=True)
class Ema:
    time: int
    value: float
    start_ts: int
    end_ts: int

class EmaSeries(Series):
    """
    EMA calculated from the candles produced by another Series.

    self.source must point to a CandleSeries.
    """
    def __init__(self, name: str, id: str, source: str, period: int):
        super().__init__(name, id)

        self.source = source
        self.period = period

        self.live: Ema | None = None
        self.history: list[Ema] = []

    def to_dict(self):
        return {
            "params": {
                "name": self.name,
                "id": self.id,
                "source" : self.source,
                "period":  self.period
            },
            "live": asdict(self.live) if self.live is not None else None,
            "history": [
                asdict(ema)
                for ema in self.history
            ],
        }

    def set_state(self, state: dict) -> None:
        self.live = (
            Ema(**state["live"])
            if state["live"] is not None
            else None
        )

        self.history = [
            Ema(**ema)
            for ema in state["history"]
        ]

    def update(self, tick: Tick) -> None:
        source = self.timeframe.get_series(self.source)

        #
        # La serie origen ya debe haber sido actualizada.
        #
        if source.live is None:
            return

        candle = source.live
        k = 2 / (self.period + 1)

        #
        # Primera EMA.
        #
        if self.live is None:
            value = candle.close
        else:
            #
            # Si seguimos en la misma vela, recalculamos usando
            # la EMA confirmada anterior (última del history).
            #
            if self.live.start_ts == candle.start_ts:
                previous = (
                    self.history[-1].value
                    if self.history
                    else candle.close
                )
            else:
                #
                # Nueva vela: la EMA actual pasa a history.
                #
                self.history.append(self.live)
                previous = self.live.value

            value = candle.close * k + previous * (1 - k)

        self.live = Ema(
            time=candle.time,
            value=value,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
        )