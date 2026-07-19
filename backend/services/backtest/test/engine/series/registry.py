from series.ADXSeries import ADXSeries
from series.EmaSeries import EmaSeries
from series.CandleBubbleSeries import CandleBubbleSeries
from series.CandleSeries import CandleSeries

SERIES_REGISTRY = {
    "CandleSeries": CandleSeries,
    "CandleBubbleSeries": CandleBubbleSeries,
    "EmaSeries": EmaSeries,
    "ADXSeries": ADXSeries
}