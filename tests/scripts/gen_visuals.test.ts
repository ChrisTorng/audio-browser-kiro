import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const scriptPath = path.join(process.cwd(), 'scripts', 'gen_visuals.py');
const audioPath = path.join(process.cwd(), 'tests', 'audio', 'Echo', 'Samples', 'Noise1.wav');
const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'gen-visuals');

const pngSignature = [0x89, 0x50, 0x4e, 0x47];

function runScript(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [scriptPath, ...args], {
      env: {
        ...process.env,
        GEN_VISUALS_PLACEHOLDER: '1',
      },
    });
    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      reject(error);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`gen_visuals.py exited with code ${code}: ${stderr}`));
      }
    });
  });
}

describe('gen_visuals.py single file mode', () => {
  beforeAll(() => {
    if (!existsSync(audioPath)) {
      throw new Error(`Test audio not found: ${audioPath}`);
    }
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('generates waveform and spectrogram by default', async () => {
    const outputDir = path.join(tmpRoot, 'default-both');
    await runScript(['--file', audioPath, '--output-dir', outputDir]);

    const waveformPath = path.join(outputDir, 'Noise1.waveform.png');
    const spectrogramPath = path.join(outputDir, 'Noise1.spectrogram.png');

    expect(existsSync(waveformPath)).toBe(true);
    expect(existsSync(spectrogramPath)).toBe(true);

    const waveBuffer = await fs.readFile(waveformPath);
    const specBuffer = await fs.readFile(spectrogramPath);
    expect(Array.from(waveBuffer.slice(0, 4))).toEqual(pngSignature);
    expect(Array.from(specBuffer.slice(0, 4))).toEqual(pngSignature);
  }, 15000);

  it('respects type selection and custom output paths', async () => {
    const waveformOutput = path.join(tmpRoot, 'custom', 'wave.png');
    await runScript([
      '--file',
      audioPath,
      '--type',
      'waveform',
      '--waveform-output',
      waveformOutput,
    ]);

    expect(existsSync(waveformOutput)).toBe(true);
    const buffer = await fs.readFile(waveformOutput);
    expect(Array.from(buffer.slice(0, 4))).toEqual(pngSignature);

    const spectrogramOutput = path.join(tmpRoot, 'custom', 'Noise1.spectrogram.png');
    expect(existsSync(spectrogramOutput)).toBe(false);
  }, 15000);
});
