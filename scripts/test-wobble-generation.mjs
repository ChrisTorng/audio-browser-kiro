/**
 * Test Wobble audio file waveform generation
 */
import { VisualizationService } from '../src/server/services/visualizationService.js';
import { existsSync } from 'fs';
import fs from 'fs/promises';

const service = new VisualizationService();

const testFiles = [
  'tests/audio/Echo/Samples/Wobble1.wav',
  'tests/audio/Echo/Samples/Wobble2.wav',
];

for (const file of testFiles) {
  console.log(`\n=== Testing: ${file} ===`);
  
  const relativeFilePath = file.replace(/\//g, '_');
  const cachePath = service.getCachedPath(file, 'waveform');
  
  // Clear cache
  if (existsSync(cachePath)) {
    await fs.unlink(cachePath);
    console.log('Cleared existing cache');
  }
  
  try {
    const result = await service.generateWaveform(file, file);
    console.log('Result:', result);
    
    if (existsSync(result.imagePath)) {
      const stats = await fs.stat(result.imagePath);
      const placeholderStats = await fs.stat('cache/placeholders/error-waveform.png');
      
      console.log('Cache file size:', stats.size);
      console.log('Cache file inode:', stats.ino);
      console.log('Placeholder inode:', placeholderStats.ino);
      console.log('Is hard link to placeholder:', stats.ino === placeholderStats.ino);
      
      // Read PNG header
      const buffer = await fs.readFile(result.imagePath);
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      console.log('Is valid PNG:', isPNG);
    } else {
      console.log('ERROR: Cache file not created!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
