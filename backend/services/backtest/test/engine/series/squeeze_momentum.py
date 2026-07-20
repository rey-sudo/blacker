import math
from typing import List, Dict


def sma(src: List[float], length: int) -> List[float]:
    out = [math.nan] * len(src)

    total = 0.0

    for i in range(len(src)):
        total += src[i]

        if i >= length:
            total -= src[i - length]

        if i >= length - 1:
            out[i] = total / length

    return out


def stdev(src: List[float], length: int) -> List[float]:
    out = [math.nan] * len(src)
    ma = sma(src, length)

    for i in range(length - 1, len(src)):
        total = 0.0

        for j in range(i - length + 1, i + 1):
            d = src[j] - ma[i]
            total += d * d

        out[i] = math.sqrt(total / length)

    return out


def highest(src: List[float], length: int) -> List[float]:
    out = [math.nan] * len(src)

    for i in range(length - 1, len(src)):
        h = -math.inf

        for j in range(i - length + 1, i + 1):
            h = max(h, src[j])

        out[i] = h

    return out


def lowest(src: List[float], length: int) -> List[float]:
    out = [math.nan] * len(src)

    for i in range(length - 1, len(src)):
        l = math.inf

        for j in range(i - length + 1, i + 1):
            l = min(l, src[j])

        out[i] = l

    return out


def true_range(
    high: List[float],
    low: List[float],
    close: List[float],
) -> List[float]:
    out = [0.0] * len(high)

    out[0] = high[0] - low[0]

    for i in range(1, len(high)):
        out[i] = max(
            high[i] - low[i],
            abs(high[i] - close[i - 1]),
            abs(low[i] - close[i - 1]),
        )

    return out


def linreg(src: List[float], length: int) -> List[float]:
    out = [math.nan] * len(src)

    x_mean = (length - 1) / 2

    xx = 0.0

    for i in range(length):
        d = i - x_mean
        xx += d * d

    for i in range(length - 1, len(src)):
        y_mean = 0.0

        for j in range(length):
            y_mean += src[i - length + 1 + j]

        y_mean /= length

        xy = 0.0

        for j in range(length):
            xy += (j - x_mean) * (src[i - length + 1 + j] - y_mean)

        slope = xy / xx
        intercept = y_mean - slope * x_mean

        out[i] = intercept + slope * (length - 1)

    return out


def calculate_squeeze_momentum(
    high: List[float],
    low: List[float],
    close: List[float],
    length: int = 20,
    mult: float = 2,
    length_kc: int = 20,
    mult_kc: float = 1.5,
    use_true_range: bool = True,
) -> List[Dict]:
    basis = sma(close, length)
    dev = stdev(close, length)

    upper_bb = [basis[i] + dev[i] * mult for i in range(len(close))]
    lower_bb = [basis[i] - dev[i] * mult for i in range(len(close))]

    ma = sma(close, length_kc)

    if use_true_range:
        range_ = true_range(high, low, close)
    else:
        range_ = [high[i] - low[i] for i in range(len(high))]

    range_ma = sma(range_, length_kc)

    upper_kc = [ma[i] + range_ma[i] * mult_kc for i in range(len(close))]
    lower_kc = [ma[i] - range_ma[i] * mult_kc for i in range(len(close))]

    hh = highest(high, length_kc)
    ll = lowest(low, length_kc)
    close_ma = sma(close, length_kc)

    src = []

    for i, c in enumerate(close):
        mid = ((hh[i] + ll[i]) / 2 + close_ma[i]) / 2
        src.append(c - mid)

    momentum = linreg(src, length_kc)

    result = []

    for i, value in enumerate(momentum):
        prev = momentum[i - 1] if i > 0 and math.isfinite(momentum[i - 1]) else 0

        squeeze_on = lower_bb[i] > lower_kc[i] and upper_bb[i] < upper_kc[i]

        squeeze_off = lower_bb[i] < lower_kc[i] and upper_bb[i] > upper_kc[i]

        no_squeeze = not squeeze_on and not squeeze_off

        if not math.isfinite(value):
            color = "#00000000"
        elif value >= 0:
            color = "#00FF00" if value > prev else "#008000"
        else:
            color = "#FF0000" if value < prev else "#800000"

        if no_squeeze:
            squeeze_color = "#2962FF"
        elif squeeze_on:
            squeeze_color = "#000000"
        else:
            squeeze_color = "#808080"

        result.append({
            "value": value,
            "upperBB": upper_bb[i],
            "lowerBB": lower_bb[i],
            "upperKC": upper_kc[i],
            "lowerKC": lower_kc[i],
            "color": color,
            "squeezeColor": squeeze_color,
            "squeezeOn": squeeze_on,
            "squeezeOff": squeeze_off,
            "noSqueeze": no_squeeze,
        })

    return result