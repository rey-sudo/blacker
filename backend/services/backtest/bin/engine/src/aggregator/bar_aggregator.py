# BLACKER
# Copyright (C) 2026 Juan José Caballero Rey
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

from dataclasses import asdict, dataclass, field
from ingestion.tick import Tick

@dataclass
class PriceLevel:
    """
    Aggregated trade statistics for a single price level within a bar.

    Volume is split by aggressor side:
        - ask_volume: aggressive buy volume
        - bid_volume: aggressive sell volume

    Therefore:
        delta = ask_volume - bid_volume
    """    

    price: float

    bid_volume: float = 0.0
    ask_volume: float = 0.0
    # Total traded volume at this exact price.
    # Invariant:
    #     total_volume = bid_volume + ask_volume    
    total_volume: float = 0.0
    #
    # Number of trades executed at this price.
    #
    trades: int = 0
    #
    # Smallest and largest individual trade size at this price.
    #
    min_trade: float = 0.0
    max_trade: float = 0.0
    # Number of trades classified by aggressor side.
    # Invariant:
    #     trades = buy_trades + sell_trades
    buy_trades: int = 0
    sell_trades: int = 0
    #
    # Largest individual trade executed by each aggressor side.
    #
    max_buy_trade: float = 0.0
    max_sell_trade: float = 0.0

    @property
    def delta(self) -> float:
        """
        Return aggressive buy volume minus aggressive sell volume.

        Positive delta  -> net aggressive buying.
        Negative delta  -> net aggressive selling.
        """        
        return self.ask_volume - self.bid_volume


@dataclass(slots=True)
class Bar:
    """
    Aggregated OHLCV and order-flow data for one timeframe bucket.

    The bar is built directly from trades/ticks and contains:

        - OHLC price data
        - total volume
        - aggressive buy/sell volume
        - trade count and trade-size statistics
        - VWAP accumulator
        - volume-at-price / footprint data

    The BarAggregator owns the construction of this object.
    """
    # 
    # Human-readable bar timestamp in Unix seconds.
    #        
    time: int
    #
    # OHLC values derived from the trades inside the bucket.
    #
    open: float
    high: float
    low: float
    close: float
    #
    # Total traded volume.
    #
    total_volume: float = 0.0
    # Volume classified by aggressor side.
    #
    # Invariant:
    #     total_volume = bid_volume + ask_volume    
    bid_volume: float = 0.0
    ask_volume: float = 0.0
    #
    # Number of trades/executions contained in the bar.
    #
    trades: int = 0
    #
    # Smallest and largest individual trade size.
    #
    min_trade: float = 0.0
    max_trade: float = 0.0
    # Running VWAP numerator:
    #
    #     volume_price_sum = Σ(price_i × quantity_i)
    #
    # VWAP is calculated as:
    #
    #     VWAP = volume_price_sum / total_volume
    volume_price_sum: float = 0.0
    #
    # Footprint data indexed by traded price.
    #
    volume_at_price: dict[float, PriceLevel] = field(
        default_factory=dict
    )
    #
    # Time boundaries of the timeframe bucket in milliseconds.
    #
    start_ts: int = 0
    end_ts: int = 0

    @property
    def delta(self) -> float:
        """
        Return the net aggressive volume of the bar.

        Formula:
            delta = ask_volume - bid_volume
        """        
        return self.ask_volume - self.bid_volume

    @property
    def vwap(self) -> float:
        """
        Return the volume-weighted average price of the bar.

        Formula:
            VWAP = Σ(price × volume) / Σ(volume)

        A zero-volume bar has no defined VWAP, so 0.0 is returned.
        """        
        if self.total_volume <= 0:
            return 0.0

        return self.volume_price_sum / self.total_volume

    def to_dict(self) -> dict:
        """
        Serialize the bar into a dictionary.

        PriceLevel keys are converted to strings because dictionary
        keys are commonly serialized as strings by JSON.
        """        
        return {
            "time": self.time,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "total_volume": self.total_volume,
            "bid_volume": self.bid_volume,
            "ask_volume": self.ask_volume,
            "trades": self.trades,
            "min_trade": self.min_trade,
            "max_trade": self.max_trade,
            "volume_price_sum": self.volume_price_sum,
            "volume_at_price": {
                str(price): asdict(level)
                for price, level in self.volume_at_price.items()
            },
            "start_ts": self.start_ts,
            "end_ts": self.end_ts,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Bar":
        """
        Reconstruct a Bar from its serialized dictionary representation.

        Serialized volume_at_price keys are strings, so they are converted
        back to float before reconstructing PriceLevel objects.
        """        
        data = data.copy()

        data["volume_at_price"] = {
            float(price): PriceLevel(**level)
            for price, level in data.get(
                "volume_at_price",
                {}
            ).items()
        }

        return cls(**data)

class BarAggregator:
    """
    Aggregate ordered ticks directly into the registered timeframes.

    Data flow:

        Tick
          ↓
        BarAggregator
          ↓
        Timeframe.live

    Each Timeframe maintains its own bar according to
    timeframe.timeframe_ms.

    The aggregator expects ticks to be ordered by event time.
    Reordering is handled externally by the reorder buffer.
    """

    def __init__(self, timeframes=None):
        self.timeframes = timeframes or {}

    def update(self, tick: Tick) -> None:
        """
        Feed one ordered tick into every registered timeframe.
        """        
        for timeframe in self.timeframes.values():
            self._update_timeframe(timeframe, tick)

    def _update_timeframe(self, timeframe, tick: Tick) -> None:
        """
        Assign the tick to its timeframe bucket and update the live bar.

        Bucket calculation:

            bucket = floor(tick_time / timeframe_ms)

        Bucket start:

            start_ts = bucket × timeframe_ms

        Bucket end:

            end_ts = start_ts + timeframe_ms
        """        

        timeframe_ms = timeframe.timeframe_ms
        #
        # Integer division identifies the timeframe bucket containing the tick.
        # 
        bucket = tick.time // timeframe_ms
        #
        # Align the bucket to the exact timeframe boundary.
        #
        start_ts = bucket * timeframe_ms
        #
        # The bucket covers [start_ts, end_ts).
        # 
        end_ts = start_ts + timeframe_ms

        live = timeframe.live

        # --------------------------------------------------
        # First bar
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
        # Out-of-order tick protection
        # --------------------------------------------------

        # The external reorder buffer guarantees chronological
        # event-time ordering.
        #
        # If the tick belongs to an earlier bucket, the contract
        # has been violated and the aggregator must not mutate state.

        if start_ts < live.start_ts:
            raise RuntimeError(
                "BarAggregator received out-of-order tick"
            )
    
        # --------------------------------------------------
        # Same timeframe
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
        # New timeframe
        # --------------------------------------------------

        # The previous live bar is now closed because the current
        # tick belongs to a later timeframe bucket. 
        #        
        timeframe.closed = timeframe.live
        #
        # Start a new live bar using the current tick.
        #
        timeframe.live = self._new_bar(
            tick,
            start_ts,
            end_ts,
        )
        #
        # A new live bar was created and the previous bar was closed.
        #
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
        """
        Create the first bar state from a single tick.
        The first tick simultaneously defines:

            open = high = low = close = tick.price

        and initializes all volume/trade accumulators.
        """

        # is_buyer_maker == 0 means the buyer was the taker/aggressor.
        #
        # Therefore:
        #     is_buy = True  -> aggressive buy
        #     is_buy = False -> aggressive sell        
        is_buy = tick.is_buyer_maker == 0

        price = tick.price
        qty = tick.qty
        #
        # Initialize the footprint level for the first traded price.
        #
        level = PriceLevel(
            price=price,
            #
            # Aggressive sells are attributed to bid volume.
            #
            bid_volume=qty if not is_buy else 0.0,
            #
            # Aggressive buys are attributed to ask volume.
            #
            ask_volume=qty if is_buy else 0.0,
            #
            # The first trade is the complete volume at this price.
            #
            total_volume=qty,
            #
            # One trade has occurred.
            #
            trades=1,
            #
            # The first trade is both the minimum and maximum.
            #
            min_trade=qty,
            max_trade=qty,
            #
            # Classify the first trade by aggressor side.
            #
            buy_trades=1 if is_buy else 0,
            sell_trades=0 if is_buy else 1,
            #
            # Initialize the largest trade for each side.
            #
            max_buy_trade=qty if is_buy else 0.0,
            max_sell_trade=qty if not is_buy else 0.0,
        )

        return Bar(
            #
            # Convert the bucket start from milliseconds to seconds.
            #
            time=start_ts // 1000,
            #
            # The first trade defines the complete initial OHLC state.
            #
            open=price,
            high=price,
            low=price,
            close=price,
            #
            # Initialize volume from the first trade.
            #
            total_volume=qty,
            #
            # Initialize aggressor-side volume.
            #
            bid_volume=qty if not is_buy else 0.0,
            ask_volume=qty if is_buy else 0.0,
            #
            # One trade exists.
            #
            trades=1,
            #
            # First trade is both minimum and maximum.
            #
            min_trade=qty,
            max_trade=qty,
            #
            # First VWAP numerator contribution:
            #
            #     Σ(price × volume) = price × qty
            #
            volume_price_sum=price * qty,
            #
            # Initialize footprint with the first traded price.
            #
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
        """
        Incorporate one additional tick into an existing live bar.

        The method updates:

            - OHLC
            - total/aggressor volume
            - trade count
            - trade-size statistics
            - VWAP accumulator
            - volume-at-price statistics
        """
        price = tick.price
        qty = tick.qty
        #
        # Buyer-maker == 0 means the buyer was the aggressor.
        #
        is_buy = tick.is_buyer_maker == 0

        # --------------------------------------------------
        # OHLC
        # --------------------------------------------------

        #
        # High is the maximum traded price observed so far.
        #
        bar.high = max(
            bar.high,
            price,
        )
        #
        # Low is the minimum traded price observed so far.
        #
        bar.low = min(
            bar.low,
            price,
        )
        #
        # Close is always the most recent traded price.
        #
        bar.close = price

        # --------------------------------------------------
        # Volume
        # --------------------------------------------------

        #
        # Every trade contributes exactly once to total volume.
        #
        bar.total_volume += qty
        #
        # Classify the trade by aggressor side.
        #
        if is_buy:
            bar.ask_volume += qty
        else:
            bar.bid_volume += qty
        #
        # Each incoming tick represents one execution/trade.
        #
        bar.trades += 1

        # --------------------------------------------------
        # Trade size
        # --------------------------------------------------

        #
        # Update the minimum trade size.
        #
        if bar.min_trade == 0:
            bar.min_trade = qty
        else:
            bar.min_trade = min(
                bar.min_trade,
                qty,
            )
        #
        # Update the maximum trade size.
        #
        bar.max_trade = max(
            bar.max_trade,
            qty,
        )

        # --------------------------------------------------
        # VWAP accumulator
        # --------------------------------------------------

        #
        # Add this trade's contribution to the VWAP numerator:
        #
        #     Σ(price_i × qty_i)
        #
        bar.volume_price_sum += (
            price * qty
        )

        # --------------------------------------------------
        # Volume At Price
        # --------------------------------------------------
        #
        # Retrieve the footprint level for this exact traded price.
        #
        level = bar.volume_at_price.get(price)

        if level is None:
            #
            # First trade ever observed at this price.
            #
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

        #
        # Add the current trade to the total volume at this price.
        #
        level.total_volume += qty

        if is_buy:
            #
            # Add aggressive buy volume at this price.
            #
            level.ask_volume += qty
            #
            # Count this execution as an aggressive buy.
            #
            level.buy_trades += 1
            #
            # Track the largest aggressive buy at this price.
            #
            level.max_buy_trade = max(
                level.max_buy_trade,
                qty,
            )
        else:
            #
            # Add aggressive sell volume at this price.
            #
            level.bid_volume += qty
            #
            # Count this execution as an aggressive sell.
            #
            level.sell_trades += 1
            #
            # Track the largest aggressive sell at this price.
            #
            level.max_sell_trade = max(
                level.max_sell_trade,
                qty,
            )
        #
        # One additional execution occurred at this price.
        #
        level.trades += 1
        #
        # Update minimum trade size at this price.
        #
        level.min_trade = min(
            level.min_trade,
            qty,
        )
        #
        # Update maximum trade size at this price.
        #
        level.max_trade = max(
            level.max_trade,
            qty,
        )

    # ======================================================
    # FLUSH
    # ======================================================

    def flush(self):
        """
        Flush the current live bar of every registered timeframe.

        Timeframe.flush() is responsible for deciding how the final
        partial bar is finalized and propagated to its Series.
        """        
        for timeframe in self.timeframes.values():
            timeframe.flush()