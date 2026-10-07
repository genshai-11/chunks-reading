import { describe, it, expect } from 'vitest';
import { validateImportUrl, sanitizeImportedText } from './importService';

describe('importService', () => {
  describe('validateImportUrl - SSRF Protection', () => {
    it('allows valid public HTTP and HTTPS URLs', () => {
      expect(validateImportUrl('https://example.com/article').valid).toBe(true);
      expect(validateImportUrl('http://news.bbc.co.uk/sample').valid).toBe(true);
    });

    it('blocks localhost, loopback, and private IPv4 addresses', () => {
      expect(validateImportUrl('http://localhost:3000/secret').valid).toBe(false);
      expect(validateImportUrl('http://127.0.0.1:8080/data').valid).toBe(false);
      expect(validateImportUrl('http://10.0.0.1/admin').valid).toBe(false);
      expect(validateImportUrl('http://192.168.1.1/router').valid).toBe(false);
      expect(validateImportUrl('http://172.16.0.5/internal').valid).toBe(false);
    });

    it('blocks cloud metadata endpoints (169.254.169.254)', () => {
      const res = validateImportUrl('http://169.254.169.254/latest/meta-data/');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('metadata');
    });

    it('blocks dangerous or unsupported protocols', () => {
      expect(validateImportUrl('file:///etc/passwd').valid).toBe(false);
      expect(validateImportUrl('ftp://files.example.com').valid).toBe(false);
      expect(validateImportUrl('gopher://gopher.floodgap.com').valid).toBe(false);
      expect(validateImportUrl('javascript:alert(1)').valid).toBe(false);
    });

    it('blocks credentials embedded in URLs', () => {
      expect(validateImportUrl('https://user:password@example.com/data').valid).toBe(false);
    });
  });

  describe('sanitizeImportedText', () => {
    it('strips malicious HTML tags while preserving reading text and line breaks', () => {
      const raw = '<h1>Breaking News</h1><p>This is a <script>alert("xss")</script>story.</p>';
      const sanitized = sanitizeImportedText(raw);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Breaking News');
      expect(sanitized).toContain('This is a story.');
    });
  });
});
