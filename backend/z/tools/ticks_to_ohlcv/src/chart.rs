use plotly::common::{Direction, Line, Title};
use plotly::layout::{Axis, Layout};
use plotly::{Candlestick, Plot};
use serde::Deserialize;
use std::error::Error;
use std::fs::File;
use std::io::Write;

#[derive(Debug, Deserialize)]
struct OhlcvRecord {
    timestamp: u64,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    volume: f64,
}

pub fn draw_ohlcv_chart(input_path: &str, output_html: &str) -> Result<(), Box<dyn Error>> {
    // 1. Cargar datos del CSV
    let mut rdr = csv::Reader::from_path(input_path)?;
    let mut x_labels = Vec::new();
    let mut open_data = Vec::new();
    let mut high_data = Vec::new();
    let mut low_data = Vec::new();
    let mut close_data = Vec::new();

    for result in rdr.deserialize() {
        let record: OhlcvRecord = result?;
        // Convertimos el timestamp a String para el eje X
        x_labels.push(record.timestamp.to_string());
        open_data.push(record.open);
        high_data.push(record.high);
        low_data.push(record.low);
        close_data.push(record.close);
    }

    // 2. Configuración del objeto Candlestick (usando los nombres de vectores correctos)
    let trace = Candlestick::new(x_labels, open_data, high_data, low_data, close_data)
        .name("BTC/USDT")
        .increasing(Direction::Increasing {
            line: Line::new().color("#26a69a"),
        })
        .decreasing(Direction::Decreasing {
            line: Line::new().color("#ef5350"),
        });

    // 3. Crear el Plot y añadir el trazo boxeado
    let mut plot = Plot::new();
    plot.add_trace(Box::new(trace));

    let layout = Layout::new()
        .height(900)
        .title("BTCUSDT - Gráfico Interactivo")
        .x_axis(Axis::new().title("Tiempo"))
        .y_axis(Axis::new().title("Precio (USDT)"));

    plot.set_layout(layout);

    // 5. Guardar el HTML manualmente (to_html() devuelve un String)
    let html_content = plot.to_html();
    let mut file = File::create(output_html)?;
    file.write_all(html_content.as_bytes())?;

    println!("Gráfico generado en: {}", output_html);
    Ok(())
}
