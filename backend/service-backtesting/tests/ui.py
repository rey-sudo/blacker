import tkinter as tk
from tkinter import ttk
import threading
import time
import pandas as pd
import mplfinance as mpf
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib
matplotlib.use("TkAgg")

from application.engine import BacktestEngine

# ----------------------------------------
# UI para el BacktestEngine
# ----------------------------------------
class BacktestUI:
    def __init__(self, root, engine: BacktestEngine, timeframe: str = "1m"):
        self.root = root
        self.engine = engine
        self.timeframe = timeframe
        self.playing_thread = None
        self._stop_playing = threading.Event()

        self.root.title("Backtest Engine UI")
        self.create_widgets()
        self.plot_ohlcv()

    def create_widgets(self):
        # Contenedor de botones
        frame = ttk.Frame(self.root)
        frame.pack(side=tk.TOP, fill=tk.X, pady=5)

        self.btn_backward = ttk.Button(frame, text="⏪ Step Backward", command=self.step_backward)
        self.btn_backward.pack(side=tk.LEFT, padx=5)

        self.btn_forward = ttk.Button(frame, text="⏩ Step Forward", command=self.step_forward)
        self.btn_forward.pack(side=tk.LEFT, padx=5)

        self.btn_play = ttk.Button(frame, text="▶️ Play", command=self.play)
        self.btn_play.pack(side=tk.LEFT, padx=5)

        self.btn_pause = ttk.Button(frame, text="⏸️ Pause", command=self.pause)
        self.btn_pause.pack(side=tk.LEFT, padx=5)

        # Canvas para gráfico
        self.canvas_frame = ttk.Frame(self.root)
        self.canvas_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        self.figure_canvas = None

        # Label de tick actual
        self.tick_label = ttk.Label(self.root, text="")
        self.tick_label.pack(side=tk.BOTTOM, pady=5)
        
        
        # Barra de velocidad
        self.speed_label = ttk.Label(frame, text="Velocidad:")
        self.speed_label.pack(side=tk.LEFT, padx=5)

        self.speed_scale = tk.Scale(frame, from_=1, to=100, orient=tk.HORIZONTAL)
        self.speed_scale.set(50)  # valor inicial
        self.speed_scale.pack(side=tk.LEFT, padx=5)
        
        # Candle a candle
        self.btn_back_candle = ttk.Button(frame, text="⬅️ Back Candle", command=self.back_candle)
        self.btn_back_candle.pack(side=tk.LEFT, padx=5)
        self.btn_next_candle = ttk.Button(frame, text="➡️ Next Candle", command=self.next_candle)
        self.btn_next_candle.pack(side=tk.LEFT, padx=5)
    # ----------------------------------------
    # Botones
    # ----------------------------------------
    def step_forward(self):
        self.engine.step_forward()
        self.update_ui()

    def step_backward(self):
        self.engine.step_backward()
        self.update_ui()

    def next_candle(self):
        self.engine.next_candle()
        self.update_ui()

    def back_candle(self):
        self.engine.back_candle()
        self.update_ui()

    def play(self):
        self._stop_playing.clear()
        self._play_step()

    def _play_step(self):
        if not self._stop_playing.is_set() and self.engine.cursor < len(self.engine.ticks) - 1:
            self.engine.step_forward()
            self.update_ui()

            # Calcula delay según barra (invertido: más valor = más rápido)
            slider_value = self.speed_scale.get()  # 1..100
            
            delay_ms = max(0, 50 - int(slider_value/2))  # 0..50ms

            self.root.after(delay_ms, self._play_step)


    def pause(self):
        self._stop_playing.set()

    def _play_loop(self):
        while not self._stop_playing.is_set() and self.engine.cursor < len(self.engine.ticks) - 1:
            self.engine.step_forward()
            self.update_ui()
            self.root.update_idletasks()
            self.root.update()
            # velocidad de play ajustable
            time.sleep(0.001)

    # ----------------------------------------
    # Actualizar UI y gráfico
    # ----------------------------------------
    def update_ui(self):
        # actualizar tick label
        tick = self.engine.current_tick()
        self.tick_label.config(text=f"Cursor: {self.engine.cursor}  |  Tick: {tick['timestamp']} Price: {tick['price']}")

        # actualizar gráfico
        if self.engine.cursor % 50 == 0:
            self.plot_ohlcv()


    def plot_ohlcv(self):
        df = self.engine.ohlcv(self.timeframe)
        if df.empty:
            return

        df_mpf = df.rename(columns={
            "open": "Open",
            "high": "High",
            "low": "Low",
            "close": "Close",
            "volume": "Volume"
        })

        fig, axlist = mpf.plot(
            df_mpf,
            type="candle",
            volume=True,
            style="yahoo",
            returnfig=True,
            figsize=(8, 4),
            tight_layout=True
        )

        # Limpiar canvas previo
        if self.figure_canvas:
            self.figure_canvas.get_tk_widget().destroy()

        self.figure_canvas = FigureCanvasTkAgg(fig, master=self.canvas_frame)
        self.figure_canvas.draw()
        self.figure_canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)


# ----------------------------------------
# Función para lanzar la UI
# ----------------------------------------
def launch_ui(engine: BacktestEngine, timeframe="1m"):
    root = tk.Tk()
    app = BacktestUI(root, engine, timeframe)
    root.mainloop()


# ----------------------------------------
# Ejemplo de uso
# ----------------------------------------
if __name__ == "__main__":
    # Cargar ticks
    df_ticks = pd.read_parquet("data/BTCUSDT-aggTrades-2026-02-07.parquet", columns=["timestamp", "price", "qty"])
    engine = BacktestEngine(df_ticks, timeframes=["1min"])

    launch_ui(engine, timeframe="1min")
