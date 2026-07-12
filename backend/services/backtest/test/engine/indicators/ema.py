def ema(prev_ema: float, price: float, alpha: float):
    return (price * alpha) + (prev_ema * (1 - alpha))