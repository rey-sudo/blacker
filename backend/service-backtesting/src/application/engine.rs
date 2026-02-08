use polars::prelude::*;
use serde::Serialize;
use std::fs::File;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct Candle {
    pub timestamp: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

pub struct BacktestEngine {
    // Almacenamos los vectores ya procesados para acceso O(1) sin overhead de Polars
    timestamps: Vec<i64>,
    prices: Vec<f64>,
    quantities: Vec<f64>,

    pub cursor: Arc<AtomicUsize>,
    pub is_playing: Arc<AtomicBool>,
    pub total_ticks: usize,
}

impl BacktestEngine {
    /// Inicializa el motor cargando un Parquet y aplanando las columnas en memoria contigua.
    pub fn new(parquet_path: &str) -> PolarsResult<Self> {
        let file = File::open(parquet_path).expect("No se pudo abrir el archivo Parquet");
        let df = ParquetReader::new(file).finish()?;

        let total_ticks = df.height();

        // Extraemos columnas, re-chunk para asegurar contigüidad y convertimos a Vec
        let timestamps = df.column("column_6")?.i64()?.rechunk();
        let prices = df.column("column_2")?.f64()?.rechunk();
        let quantities = df.column("column_3")?.f64()?.rechunk();

        Ok(Self {
            // Usamos .to_vec() para tener propiedad total y máxima velocidad de acceso
            timestamps: timestamps.cont_slice()?.to_vec(),
            prices: prices.cont_slice()?.to_vec(),
            quantities: quantities.cont_slice()?.to_vec(),
            cursor: Arc::new(AtomicUsize::new(0)),
            is_playing: Arc::new(AtomicBool::new(false)),
            total_ticks,
        })
    }

    /// Avanza un tick manualmente
    pub fn paso_adelante(&self) {
        let current = self.cursor.load(Ordering::Acquire);
        if current < self.total_ticks - 1 {
            self.cursor.fetch_add(1, Ordering::Release);
            self.mostrar_tick_actual();
        }
    }

    /// Retrocede un tick manualmente
    pub fn paso_atras(&self) {
        let current = self.cursor.load(Ordering::Acquire);
        if current > 0 {
            self.cursor.fetch_sub(1, Ordering::Release);
            self.mostrar_tick_actual();
        }
    }

    /// Inicia la reproducción en un hilo separado
    pub fn play(&self, speed_ns: u64) {
        if self.is_playing.load(Ordering::Relaxed) {
            return;
        }

        self.is_playing.store(true, Ordering::Relaxed);

        // Clonamos Arcs para el hilo
        let cursor = Arc::clone(&self.cursor);
        let is_playing = Arc::clone(&self.is_playing);
        let total = self.total_ticks;

        thread::spawn(move || {
            println!("▶️ Reproducción iniciada...");
            while is_playing.load(Ordering::Relaxed) {
                let current = cursor.load(Ordering::Acquire);

                if current >= total - 1 {
                    is_playing.store(false, Ordering::Release);
                    println!("🏁 Fin de los datos.");
                    break;
                }

                cursor.fetch_add(1, Ordering::Release);

                if speed_ns > 0 {
                    thread::sleep(Duration::from_nanos(speed_ns));
                }
            }
        });
    }

    pub fn play_reverse(&self, speed_ns: u64) {
        if self.is_playing.load(Ordering::Relaxed) {
            return;
        }

        self.is_playing.store(true, Ordering::Relaxed);

        let cursor = Arc::clone(&self.cursor);
        let is_playing = Arc::clone(&self.is_playing);

        thread::spawn(move || {
            println!("⏪ Reproducción hacia atrás iniciada...");
            while is_playing.load(Ordering::Relaxed) {
                let current = cursor.load(Ordering::Acquire);

                // Condición de parada: llegamos al primer tick
                if current == 0 {
                    is_playing.store(false, Ordering::Release);
                    println!("⏪ Inicio de los datos alcanzado.");
                    break;
                }

                // Restamos 1 al cursor
                cursor.fetch_sub(1, Ordering::Release);

                if speed_ns > 0 {
                    thread::sleep(std::time::Duration::from_nanos(speed_ns));
                }
            }
        });
    }

    /// Pausa la reproducción
    pub fn pause(&self) {
        self.is_playing.store(false, Ordering::Relaxed);
        println!(
            "⏸️ Pausado en tick: {}",
            self.cursor.load(Ordering::Acquire)
        );
    }

    /// Imprime el estado del tick actual
    pub fn mostrar_tick_actual(&self) {
        let idx = self.cursor.load(Ordering::Acquire);
        // Acceso instantáneo sin buscar strings ni re-mapear columnas
        println!("Price: {}", self.prices.get(idx).unwrap());
    }

    /// Genera velas OHLCV dinámicamente hacia atrás desde el cursor actual.
    /// timeframe_ms: Duración de la vela (ej: 60000 para 1m)
    /// length: Cuántas velas obtener
    pub fn get_ohlcv(&self, timeframe_ms: i64, length: usize) -> Vec<Candle> {
        let current_idx = self.cursor.load(Ordering::Acquire);
        if current_idx == 0 {
            return vec![];
        }

        let mut candles = Vec::with_capacity(length);
        let mut i = current_idx;

        // Referencias locales para evitar saltos de puntero en el bucle
        let ts_slice = &self.timestamps;
        let pr_slice = &self.prices;
        let qt_slice = &self.quantities;

        // Calcular el cierre del periodo actual
        let mut current_candle_end = (ts_slice[i] / timeframe_ms) * timeframe_ms;

        for _ in 0..length {
            if i == 0 {
                break;
            }

            let mut high = f64::MIN;
            let mut low = f64::MAX;
            let mut volume = 0.0;
            let close = pr_slice[i];
            let mut open = close;

            // Agrupación agresiva de ticks en la vela
            while i > 0 && ts_slice[i] >= current_candle_end {
                let p = pr_slice[i];
                let q = qt_slice[i];

                if p > high {
                    high = p;
                }
                if p < low {
                    low = p;
                }
                volume += q;
                open = p;
                i -= 1;
            }

            candles.push(Candle {
                timestamp: current_candle_end,
                open,
                high,
                low,
                close,
                volume,
            });

            current_candle_end -= timeframe_ms;
        }

        candles.reverse(); // De más antigua a más reciente
        candles
    }

    pub fn get_live_candle(&self, timeframe_ms: i64) -> Option<Candle> {
        let current_idx = self.cursor.load(Ordering::Acquire);

        // No hay vela si no hay datos
        if self.total_ticks == 0 || current_idx >= self.total_ticks {
            return None;
        }

        let ts_slice = &self.timestamps;
        let pr_slice = &self.prices;
        let qt_slice = &self.quantities;

        let current_ts = ts_slice[current_idx];

        // 1. Calcular el inicio exacto de la vela actual (ej. si son las 10:01:15 y el TF es 1m, el inicio es 10:01:00)
        let candle_start_ts = (current_ts / timeframe_ms) * timeframe_ms;

        let mut high = f64::MIN;
        let mut low = f64::MAX;
        let mut volume = 0.0;
        let close = pr_slice[current_idx]; // El último precio es el "close" momentáneo
        let mut open = 0.0;

        let mut i = current_idx;
        let mut found_ticks = false;

        // 2. Retroceder desde el cursor hasta encontrar el inicio de la vela
        while i > 0 && ts_slice[i] >= candle_start_ts {
            let p = pr_slice[i];
            let q = qt_slice[i];

            if p > high {
                high = p;
            }
            if p < low {
                low = p;
            }
            volume += q;
            open = p; // El último tick procesado hacia atrás será el primero en el tiempo (Open)

            found_ticks = true;
            i -= 1;
        }

        if !found_ticks {
            return None;
        }

        Some(Candle {
            timestamp: candle_start_ts,
            open,
            high,
            low,
            close,
            volume,
        })
    }
}
