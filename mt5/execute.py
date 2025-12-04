import MetaTrader5 as mt5

symbol = "EURUSD"

# --- INICIAR MT5 ---
if not mt5.initialize():
    print("❌ Error al inicializar MT5:", mt5.last_error())
    quit()

# --- INFO DE CUENTA ---
info = mt5.account_info()

if info is None:
    print("❌ No se pudo obtener información de la cuenta.")
    mt5.shutdown()
    quit()

# --- VALIDACIONES IMPORTANTES ---
if not info.trade_allowed:
    print("❌ El servidor NO permite operaciones (trade_allowed=False).")
    mt5.shutdown()
    quit()

if not info.trade_expert:
    print("❌ El servidor NO permite trading automático (trade_expert=False).")
    print("   No podrás enviar órdenes con Python.")
    mt5.shutdown()
    quit()

# --- ACTIVAR SÍMBOLO ---
if not mt5.symbol_select(symbol, True):
    print(f"❌ No se pudo habilitar el símbolo {symbol}.")
    mt5.shutdown()
    quit()

tick = mt5.symbol_info_tick(symbol)
if tick is None:
    print(f"❌ No se pudo obtener precio para {symbol}.")
    mt5.shutdown()
    quit()

price = tick.ask

print("✔ Todo OK, listo para enviar una orden.")
print("Precio actual:", price)

# --- Aquí puedes enviar tu orden ---
# ...

mt5.shutdown()
