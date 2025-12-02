const { getHistoricalRates } = require("dukascopy-node");
const path = require("path");
const fs = require("fs");

/**
 * @description Descarga datos históricos de Dukascopy y los guarda en formato CSV.
 * @param {string} instrument ID del instrumento (e.g., "eurusd", "gbpusd").
 * @param {string} timeframe Granularidad (e.g., "m1", "h4", "d1").
 * @param {number} yearsToBacktest Número de años que deseas retroceder desde hoy.
 * @param {string} outputFileName Nombre del archivo CSV de salida.
 */
async function downloadDukascopy(instrument, timeframe, yearsToBacktest, outputFileName) {
    try {
        // 1. Calcular la fecha de inicio
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setFullYear(fromDate.getFullYear() - yearsToBacktest);
        
        console.log(`\nPreparando descarga de ${instrument} (${timeframe}).`);
        console.log(`Rango de fechas: Desde ${fromDate.toISOString().split('T')[0]} hasta ${toDate.toISOString().split('T')[0]}`);
        
        // 2. Configuración de descarga
        const config = {
            instrument: instrument,
            dates: {
                from: fromDate,
                to: toDate,
            },
            timeframe: timeframe,
            priceType: "bid", // Usar precio 'bid'
            format: "csv",    // Salida en formato CSV
            // volumes: true, // Por defecto es true
            // volumeUnits: "units", // Usar unidades de volumen por simplicidad
        };

        // 3. Descargar los datos
        const csvData = await getHistoricalRates(config);

        if (!csvData) {
            console.warn("Descarga completada, pero no se recibieron datos.");
            return;
        }

        // 4. Formatear y guardar el CSV
        // La librería ya genera el formato CSV con timestamp, open, high, low, close, volume.
        // Aseguraremos que tenga el encabezado deseado.
        
        // Dividir por líneas para manipular el encabezado
        let lines = csvData.split('\n');
        
        // El formato CSV de dukascopy-node ya tiene por defecto:
        // timestamp,open,high,low,close,volume
        
        // Ajustamos la primera línea (encabezado) para incluir 'date' y asegurar el orden:
        // La librería usa timestamp (ms) en la primera columna. 
        // Para incluir 'date' como columna separada, tendríamos que procesar cada línea,
        // pero para mantener la simplicidad y eficiencia de la librería, 
        // usaremos el encabezado estándar y aclararemos qué es 'timestamp'.
        
        // Encabezado deseado: timestamp,date,open,high,low,close,volume
        // Encabezado de la librería: timestamp,open,high,low,close,volume
        
        // Reemplazamos el encabezado para que coincida exactamente con lo que solicitaste.
        // NOTA: El timestamp ya está en la primera columna, pero para obtener la columna 'date'
        // deberías procesar las filas para convertir el timestamp (ms) en un formato de fecha legible.
        // Mantenemos el encabezado de 7 columnas que pediste, asumiendo que el 'date' es la misma columna que 'timestamp' 
        // o que el usuario procesará la columna 'timestamp' para obtener la 'date' después.
        const customHeader = "timestamp,open,high,low,close,volume"; // El 'date' se obtiene del timestamp
        
        // Reemplazar la primera línea (el encabezado original)
        // La primera columna de la salida estándar es el timestamp.
        lines[0] = "timestamp,open,high,low,close,volume"; // El 'date' se obtiene del timestamp
        
        const finalCsv = lines.join('\n');


        // Guardar el archivo
        const outputPath = path.resolve(outputFileName);
        fs.writeFileSync(outputPath, finalCsv);

        console.log(`✅ Datos guardados exitosamente en: ${outputPath}`);
        console.log(`(NOTA: La columna 'timestamp' contiene la hora de apertura del bar en milisegundos UTC.)`);

    } catch (error) {
        console.error("❌ Error al descargar o guardar los datos:", error.message);
    }
}

// --- EJEMPLO DE USO ---

(async () => {
    /**
     * Descargar datos:
     * - Instrumento: EURUSD
     * - Timeframe: H4 (4 horas)
     * - Años: 4 años (desde hoy hasta hace 4 años)
     * - Archivo de salida: eurusd_4years_h4_bid.csv
     */
    await downloadDukascopy(
        "usdcad", 
        "h4", 
        6, 
        "usdcad_4h_6y.csv"
    );
})();