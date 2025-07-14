require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Read the template
const envJsTemplate = fs.readFileSync(path.join(__dirname, '../frontend/js/env.js'), 'utf8');

// Replace placeholders with actual values
const envJs = envJsTemplate
    .replace('{{SUPABASE_URL}}', process.env.SUPABASE_URL || '')
    .replace('{{SUPABASE_ANON_KEY}}', process.env.SUPABASE_ANON_KEY || '')
    .replace('{{TMDB_API_KEY}}', process.env.TMDB_API_KEY || '');

// Write the generated file
fs.writeFileSync(path.join(__dirname, '../frontend/js/env.generated.js'), envJs);

console.log('Generated frontend environment variables file'); 