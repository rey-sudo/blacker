import MetaTrader5 as mt5
from datetime import datetime

def abrir_orden_market(symbol: str, volumen: float, sl: float, tp: float, tipo="BUY"):

    if not isinstance(sl, (float, int)) or not isinstance(tp, (float, int)):
        return {"ok": False, "msg": "SL y TP deben ser números (float o int)"}

    # ---- Iniciar MT5 ----
    if not mt5.initialize():
        return {"ok": False, "msg": f"MT5 no inició: {mt5.last_error()}"}

    # ---- Seleccionar símbolo ----
    if not mt5.symbol_select(symbol, True):
        return {"ok": False, "msg": f"No se pudo habilitar el símbolo: {symbol}"}

    # ---- Obtener precio actual ----
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return {"ok": False, "msg": "No se pudo obtener el tick del símbolo"}

    price_buy = tick.ask
    price_sell = tick.bid

    # ---- Determinar tipo ----
    if tipo.upper() == "BUY":
        order_type = mt5.ORDER_TYPE_BUY
        precio = price_buy
        print(precio)

    elif tipo.upper() == "SELL":
        order_type = mt5.ORDER_TYPE_SELL
        precio = price_sell
    else:
        return {"ok": False, "msg": "Tipo debe ser BUY o SELL"}

    # ---- Crear request ----
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volumen,
        "type": order_type,
        "price": precio,
        "sl": sl,
        "tp": tp,
        "deviation": 1000000,
        "magic": 12345,
        "comment": "Python-MT5",
        "type_filling": mt5.ORDER_FILLING_FOK,
    }

    print("Request:", request)

    # ---- Enviar orden ----
    result = mt5.order_send(request)

    print("Result:", result)
    print("Last error:", mt5.last_error())

    # ---- Validar resultado ----
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "ok": False,
            "msg": f"Error en orden: {result.comment}",
            "retcode": result.retcode,
            "result": result
        }

    return {
        "ok": True,
        "msg": "Orden ejecutada correctamente",
        "order": result.order,
        "result": result
    }
