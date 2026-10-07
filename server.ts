/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleDetectPhrases, handleExtractUrl } from './src/server/apiHandlers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API: Detect phrases
app.post('/api/detect-phrases', async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    const result = await handleDetectPhrases(text);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/detect-phrases:', error);
    res.status(500).json({ error: error.message || 'Failed to detect phrases' });
  }
});

// API: Extract URL
app.get('/api/extract-url', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'url query parameter is required' });
      return;
    }
    const result = await handleExtractUrl(url);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/extract-url:', error);
    res.status(400).json({ error: error.message || 'Failed to extract URL' });
  }
});

// Serve frontend in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
