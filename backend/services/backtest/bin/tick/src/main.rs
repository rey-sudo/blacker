use redis::Commands;
use std::{
    fs::File,
    io::{BufReader, Read},
    mem::size_of,
};
use tick::{model::Trade, write::convert_csv_to_binary};
use tracing_subscriber;

/// Lee el archivo binario y transmite cada tick a un stream de Redis.
/// Garantiza un comportamiento stateless borrando el stream existente al inicio.
pub fn stream_binary_to_redis(bin_path: &str, stream_key: &str, redis_url: &str) {
    // 1. Conexión a Redis
    let client = redis::Client::open(redis_url).expect("URL de Redis inválida");
    let mut con = client
        .get_connection()
        .expect("Error al conectar con Redis");

    // 2. Garantizar comportamiento Stateless: Borrar stream previo si existe
    // Ignoramos si el stream no existía previamente
    let _: () = con.del(stream_key).unwrap_or(());
    println!(
        "Reseteado: Stream '{}' limpio para nueva ejecución.",
        stream_key
    );

    // 3. Preparar la lectura secuencial del binario
    let file = File::open(bin_path).expect("No se pudo abrir el archivo binario");
    let mut reader = BufReader::new(file);

    let trade_size = size_of::<Trade>();
    let mut buffer = vec![0u8; trade_size];

    let mut count = 0usize;

    // 4. Configuración del Pipeline para máximo rendimiento por red
    let mut pipe = redis::pipe();
    let batch_size = 5_000; // Tamaño óptimo para no saturar el buffer de Redis

    println!("Enviando ticks por stream {}...", stream_key);

    // Leer exactamente los bytes que mapean a un struct Trade
    while reader.read_exact(&mut buffer).is_ok() {
        // Mapeo seguro y ultra rápido de bytes a la estructura en memoria
        let trade: &Trade = bytemuck::from_bytes(&buffer);

        // Insertar comando XADD al pipeline
        // Usamos "*" para que Redis asigne el ID por timestamp del motor de Redis
        pipe.cmd("XADD")
            .arg(stream_key)
            .arg("*")
            .arg("trade_id")
            .arg(trade.trade_id)
            .arg("price")
            .arg(trade.price)
            .arg("qty")
            .arg(trade.qty)
            .arg("timestamp")
            .arg(trade.timestamp_ms)
            .arg("is_buyer_maker")
            .arg(trade.is_buyer_maker);

        count += 1;

        // Si alcanzamos el tamaño del lote, vaciamos el pipeline hacia la red
        if count % batch_size == 0 {
            let _: () = pipe
                .query(&mut con)
                .expect("Error al ejecutar pipeline en Redis");
            pipe.clear(); // Resetear el pipeline para el siguiente lote

            if count % 1_000_000 == 0 {
                println!("Transmitidos {}_000_000 de ticks...", count / 1_000_000);
            }
        }
    }

    // 5. Enviar los ticks restantes que no completaron el último lote
    if count % batch_size != 0 {
        let _: () = pipe
            .query(&mut con)
            .expect("Error al vaciar el último lote en Redis");
    }

    println!(
        "Streaming finalizado. Se han enviado {} ticks al stream '{}'.",
        count, stream_key
    );
}

fn main() {
    tracing_subscriber::fmt::init();

    let csv_path: &str = "./input/input.csv";
    let bin_path: &str = "./output/ticks.bin";

    let stream_key: &str = "ticks:btcusd";
    let redis_url: &str = "redis://redis-local:6379";

    //let _ = convert_csv_to_binary(csv_path, bin_path, true);

    let _ = stream_binary_to_redis(bin_path, stream_key, redis_url);
}
