/**
 * Test error handling for visualization generation
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const WAVEFORM_DIR = path.join(CACHE_DIR, 'waveforms');
const PLACEHOLDER_PATH = path.join(CACHE_DIR, 'placeholders', 'error-waveform.png');

// Create a corrupt audio file
const CORRUPT_FILE = '/tmp/corrupt-test.wav';
await fs.writeFile(CORRUPT_FILE, 'INVALID AUDIO DATA');

// Try to generate waveform
const cachePath = path.join(WAVEFORM_DIR, 'test_corrupt.wav.png');

// Ensure cache dir exists
await fs.mkdir(WAVEFORM_DIR, { recursive: true });

// Run ffmpeg
const ffmpeg = spawn('ffmpeg', [
  '-i', CORRUPT_FILE,
  '-filter_complex', 'showwavespic=s=800x200:colors=white',
  '-frames:v', '1',
  '-y',
  cachePath
]);

let stderr = '';
ffmpeg.stderr.on('data', (data) => {
  stderr += data.toString();
});

await new Promise((resolve) => {
  ffmpeg.on('close', async (code) => {
    console.log('ffmpeg exit code:', code);
    
    if (code !== 0) {
      console.log('ffmpeg failed as expected');
      console.log('stderr:', stderr.substring(0, 200));
      
      // Create hard link to error placeholder
      if (existsSync(cachePath)) {
        await fs.unlink(cachePath);
      }
      
      try {
        await fs.link(PLACEHOLDER_PATH, cachePath);
        console.log('Created hard link to error placeholder');
        
        const stats = await fs.stat(cachePath);
        const placeholderStats = await fs.stat(PLACEHOLDER_PATH);
        console.log('Cache file inode:', stats.ino);
        console.log('Placeholder inode:', placeholderStats.ino);
        console.log('Hard link successful:', stats.ino === placeholderStats.ino);
      } catch (error) {
        console.error('Failed to create hard link:', error.message);
      }
    }
    
    resolve();
  });
});

// Cleanup
await fs.unlink(CORRUPT_FILE);
if (existsSync(cachePath)) {
  await fs.unlink(cachePath);
}

console.log('Test completed');
