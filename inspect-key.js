require('dotenv').config();
const key = process.env.GEMINI_API_KEY;
if (key) {
  console.log('Key Length:', key.length);
  console.log('Key first 4 chars:', key.substring(0, 4));
  console.log('Key last 4 chars:', key.substring(key.length - 4));
  console.log('Key has spaces:', key.includes(' '));
  console.log('Key has newlines:', key.includes('\n'));
} else {
  console.log('Key not found in .env');
}
