from pydub import AudioSegment
import os

def reparar_wav(entrada, salida=None):
    # Si no se especifica archivo de salida, usa *_fixed.wav
    if salida is None:
        base, ext = os.path.splitext(entrada)
        salida = base + "_fixed.wav"

    print(f"Convirtiendo: {entrada} → {salida}")

    # Cargar WAV con pydub (puede leer ADPCM, MP3-en-WAV, etc.)
    audio = AudioSegment.from_file(entrada)

    # Convertir a PCM 16-bit / 44.1 kHz
    audio = audio.set_frame_rate(44100)
    audio = audio.set_sample_width(2)   # 16-bit
    audio = audio.set_channels(2)       # Estéreo

    # Exportar reconstruido
    audio.export(salida, format="wav")

    print("✔ Conversión completada")
    return salida


# EJEMPLO:
if __name__ == "__main__":
    reparar_wav("iteration.wav")
    reparar_wav("execute.wav")
