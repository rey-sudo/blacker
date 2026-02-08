use polars::prelude::*;
use std::fs::File;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::thread;

#[derive(Debug, Clone)]
pub struct Candle {
    pub timestamp: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

pub struct BacktestEngine {
    data: Arc<DataFrame>,
    pub cursor: Arc<AtomicUsize>,
    pub is_playing: Arc<AtomicBool>,
    pub total_ticks: usize,
}

impl BacktestEngine {
    pub fn new(parquet_path: &str) -> PolarsResult<Self> {
        // Lectura eficiente del archivo Parquet
        let file: File = File::open(parquet_path).expect("No se pudo abrir el archivo Parquet");
        let df: DataFrame = ParquetReader::new(file).finish()?;

        let total_ticks: usize = df.height();

        Ok(Self {
            data: Arc::new(df),
            cursor: Arc::new(AtomicUsize::new(0)),
            is_playing: Arc::new(AtomicBool::new(false)),
            total_ticks,
        })
    }

    pub fn paso_adelante(&self) {
        let current: usize = self.cursor.load(Ordering::SeqCst);
        if current < self.total_ticks - 1 {
            self.cursor.fetch_add(1, Ordering::SeqCst);
            self.mostrar_tick_actual();
        }
    }

    pub fn paso_atras(&self) {
        let current: usize = self.cursor.load(Ordering::SeqCst);
        if current > 0 {
            self.cursor.fetch_sub(1, Ordering::SeqCst);
            self.mostrar_tick_actual();
        }
    }

    pub fn play(&self, speed_ns: u64) {
        if self.is_playing.load(Ordering::SeqCst) {
            return;
        }

        self.is_playing.store(true, Ordering::SeqCst);
        let cursor = Arc::clone(&self.cursor);
        let is_playing = Arc::clone(&self.is_playing);
        let total = self.total_ticks;
        let data = Arc::clone(&self.data);

        thread::spawn(move || {
            println!("▶️ Reproducción iniciada...");
            while is_playing.load(Ordering::SeqCst) {
                let current: usize = cursor.load(Ordering::SeqCst);
                if current >= total - 1 {
                    is_playing.store(false, Ordering::SeqCst);
                    println!("🏁 Fin de los datos.");
                    break;
                }

                cursor.fetch_add(1, Ordering::SeqCst);

                // Simulación de procesamiento de tick
                if let Ok(row) = data.get_row(current) {
                    // Aquí podrías enviar 'row' a tu estrategia
                }

                //thread::sleep(std::time::Duration::from_nanos(speed_ns));
            }
        });
    }

    pub fn pause(&self) {
        self.is_playing.store(false, Ordering::SeqCst);
        println!("⏸️ Pausado en tick: {}", self.cursor.load(Ordering::SeqCst));
    }

    pub fn mostrar_tick_actual(&self) {
        let idx: usize = self.cursor.load(Ordering::SeqCst);
        if let Ok(row) = self.data.get_row(idx) {
            println!("Tick [{}]: {:?}", idx, row);
        }
    }

    pub fn get_ohlcv(&self, timeframe_ms: i64, length: usize) -> Vec<Candle> {
        let current_idx: usize = self.cursor.load(Ordering::Relaxed);
        if current_idx == 0 {
            return vec![];
        }

        let mut candles: Vec<Candle> = Vec::with_capacity(length);

        let ts_col = self
            .data
            .column("column_6")
            .unwrap()
            .i64()
            .unwrap()
            .rechunk();
        let pr_col = self
            .data
            .column("column_2")
            .unwrap()
            .f64()
            .unwrap()
            .rechunk();
        let qt_col = self
            .data
            .column("column_3")
            .unwrap()
            .f64()
            .unwrap()
            .rechunk();

        // 2. Ahora cont_slice() funcionará siempre
        let ts_slice = ts_col.cont_slice().unwrap();
        let pr_slice = pr_col.cont_slice().unwrap();
        let qt_slice = qt_col.cont_slice().unwrap();

        let mut i = current_idx;
        let last_ts = ts_slice[i];
        let mut current_candle_end = (last_ts / timeframe_ms) * timeframe_ms;

        for _ in 0..length {
            if i == 0 {
                break;
            }

            let mut high = f64::MIN;
            let mut low = f64::MAX;
            let mut volume = 0.0;
            let close = pr_slice[i];
            let mut open = close;

            // Bucle interno sobre memoria contigua (Súper rápido)
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

            // Evitamos agregar velas "vacías" si i llegó a 0 prematuramente
            candles.push(Candle {
                timestamp: current_candle_end,
                open,
                high,
                low,
                close,
                volume,
            });

            current_candle_end -= timeframe_ms;
            if i == 0 {
                break;
            }
        }

        candles.reverse();
        candles
    }
}
