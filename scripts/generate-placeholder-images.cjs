/**
 * Generate placeholder images for visualization errors
 * Creates simple PNG images using ffmpeg
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PLACEHOLDER_DIR = path.join(__dirname, '..', 'cache', 'placeholders');
const WIDTH = 200;
const HEIGHT = 32;

/**
 * Run ffmpeg command
 * @param {string[]} args - ffmpeg arguments
 * @returns {Promise<void>}
 */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`ffmpeg execution failed: ${error.message}`));
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * Generate a placeholder image with error message
 * @param {string} filename - Output filename
 * @param {string} message - Error message to display
 */
async function generatePlaceholder(filename, message) {
  const outputPath = path.join(PLACEHOLDER_DIR, filename);
  
  // Generate solid dark gray image with text overlay using ffmpeg
  // Using color filter to create solid background, then drawtext to add message
  const filterComplex = `color=c=#2a2a2a:s=${WIDTH}x${HEIGHT}:d=1[bg];` +
    `[bg]drawbox=x=0:y=0:w=${WIDTH}:h=${HEIGHT}:color=#ff4444:t=2[box];` +
    `[box]drawtext=text='✗':fontsize=60:fontcolor=#ff4444:x=(w-text_w)/2:y=(h-text_h)/2-40[icon];` +
    `[icon]drawtext=text='${message}':fontsize=16:fontcolor=#ffffff:x=(w-text_w)/2:y=(h-text_h)/2+40`;

  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `color=c=#2a2a2a:s=${WIDTH}x${HEIGHT}:d=1`,
    '-vf', `drawbox=x=0:y=0:w=${WIDTH}:h=${HEIGHT}:color=#ff4444:t=1,drawtext=text='⚠':fontsize=20:fontcolor=#ff4444:x=(w-text_w)/2:y=(h-text_h)/2`,
    '-frames:v', '1',
    '-y',
    outputPath
  ]);

  console.log(`Generated: ${outputPath}`);
}

// Main execution
(async () => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(PLACEHOLDER_DIR)) {
      fs.mkdirSync(PLACEHOLDER_DIR, { recursive: true });
    }

    // Generate placeholders
    await generatePlaceholder('error-waveform.png', 'Waveform Generation Error');
    await generatePlaceholder('error-spectrogram.png', 'Spectrogram Generation Error');

    console.log('Placeholder images generated successfully!');
  } catch (error) {
    console.error('Error generating placeholders:', error.message);
    process.exit(1);
  }
})();
