const ffmpeg = require('fluent-ffmpeg');
const ffprobePath = require('ffprobe-static').path;
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

console.log('FFprobe Path:', ffprobePath);
console.log('FFmpeg Path:', ffmpegPath);

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);

const testFile = path.join(__dirname, 'uploads/test.txt'); // Just to see if it even tries to probe
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}
fs.writeFileSync(testFile, 'dummy');

ffmpeg.ffprobe(testFile, (err, metadata) => {
  if (err) {
    console.log('Expected Error (txt is not video):', err.message);
  } else {
    console.log('Metadata:', metadata);
  }
  process.exit(0);
});
