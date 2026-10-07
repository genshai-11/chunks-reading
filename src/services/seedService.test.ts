import { describe, it, expect } from 'vitest';
import { 
  computeContentHash, 
  executeDirectDatabaseSeed, 
  type SeedResourceInput 
} from './seedService';

describe('seedService - Direct Database Draft Seeding Contract', () => {
  it('computes deterministic SHA-256 content hash for canonical text', async () => {
    const text1 = 'Long story short, we decided to give it a shot.';
    const text2 = 'Long story short, we decided to give it a shot.';
    const textDiff = 'Different content here.';

    const hash1 = await computeContentHash(text1);
    const hash2 = await computeContentHash(text2);
    const hashDiff = await computeContentHash(textDiff);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDiff);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('inserts seeded resources strictly as Draft with pending candidates and performs readback', async () => {
    const seedInput: SeedResourceInput = {
      title: 'Perseverance in the Classroom',
      category: 'Inspiration',
      author: 'Edu Team',
      text: 'Long story short, we decided to give it a shot.',
      provenance: 'Original Classroom Content',
    };

    const result = await executeDirectDatabaseSeed([seedInput], 'teacher-101', { dryRun: false });

    expect(result.insertedCount).toBe(1);
    expect(result.seededResources).toHaveLength(1);

    const seeded = result.seededResources[0];
    expect(seeded.status).toBe('draft'); // Strictly Draft!
    expect(seeded.annotations.every(a => a.reviewStatus === 'pending')).toBe(true); // Candidates are pending!
    expect(seeded.contentHash).toBeDefined();

    // Verification of readback
    expect(result.readbackVerified).toBe(true);
  });

  it('skips duplicate resources with identical content hash on retry (idempotent)', async () => {
    const seedInput: SeedResourceInput = {
      title: 'Perseverance in the Classroom',
      category: 'Inspiration',
      author: 'Edu Team',
      text: 'Long story short, we decided to give it a shot.',
      provenance: 'Original Classroom Content',
    };

    // First run
    const run1 = await executeDirectDatabaseSeed([seedInput], 'teacher-101', { dryRun: false });
    expect(run1.insertedCount).toBe(1);

    // Second run with identical content -> should skip duplicate
    const existingHashes = new Set(run1.seededResources.map(r => r.contentHash));
    const run2 = await executeDirectDatabaseSeed([seedInput], 'teacher-101', { dryRun: false, existingHashes });
    expect(run2.insertedCount).toBe(0);
    expect(run2.skippedCount).toBe(1);
  });
});
