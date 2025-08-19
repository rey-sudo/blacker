import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ParamsType {
  klines: any;
  mark: number;
  filename: string;
  show: boolean;
}

export function relativeStrengthIndex(params: ParamsType): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../rsi/main.py');
    const proceso = spawn('python3', [scriptPath]);

    let output = '';
    let outputError = '';

    proceso.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proceso.stderr.on('data', (data: Buffer) => {
      outputError += data.toString();
    });

    proceso.on('close', (code: number) => {
      if (code !== 0 || outputError) {
        return reject(new Error(`Error: ${outputError || 'Output code ' + code}`));
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (err) {
        reject(new Error('Output Python: ' + err));
      }
    });

    proceso.stdin.write(JSON.stringify(params));
    proceso.stdin.end();
  });
}
