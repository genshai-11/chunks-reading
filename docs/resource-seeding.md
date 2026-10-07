# Chunks reading — Agent resource seeding contract

Status: confirmed direct database Draft workflow; logical storage proposal only. No database, seed executable or credentials have been provisioned. Verify Firebase project, database ID, edition, location and supported SDK before implementing concrete collections/indexes or making writes.

## Product rules

Agents write resources directly to the approved database, always as Draft. Teacher reviews content, segmentation and phrase candidates before Publish. Published immutable versions alone can be selected for learner presentation. Seeding is not publication and cannot control rooms. Each resource belongs to an explicit teacher UID; no global/shared catalog is implied.

## Logical records (map to verified database implementation later)

- Category: id, ownerUid, English name, normalized slug, createdAt.
- Resource: id, ownerUid, title, language=en, categoryId, topicTags[], level (A1–C2 or unknown), contentType (news/ted/inspiration/original/other), sourceTitle, sourceUrl (nullable), attribution, rightsBasis, status=draft|published|archived, currentDraftVersionId, publishedVersionId (nullable), createdAt, updatedAt.
- Resource version: id, resourceId, ownerUid, canonicalText, contentHash, units[] with stable IDs and Sentence/Paragraph ranges, detectorVersion, createdAt. Canonical text is immutable after span generation; edited text creates a new version.
- Annotation: id, versionId, unitId, exactText, start, end (start-inclusive/end-exclusive UTF-16), type, meaning, source=dictionary|ai|manual, reviewStatus=pending|approved|rejected. Agent candidates must be pending, never approved by the seed process.
- Seed audit: runId, ownerUid, source identifiers, seedKey, contentHash, resulting resource/version IDs, outcome, timestamp. No tokens or full article bodies in logs.

Library filters: category, topic, level, content type, Draft/Published, plus title/source search. Categories News, TED Talks and Inspiration are useful initial defaults; teachers can add their own. Level is an estimate, not a measured learner score. Concrete search strategy/indexes depend on the chosen database.

## Seed procedure for the future implementing agent

1. Inspect actual app schema and repository instructions. Verify target project/database edition/SDK; use emulator/development first. Stop if target, ownerUid or access authority is missing. Never guess a production database.
2. Find permitted public resources or compose original English reading samples. A public URL is not permission to copy full text. Record attribution and rightsBasis; do not bypass paywalls, send browser cookies or import unclear-rights full text. Keep unverified-rights material out of publication.
3. Prepare validated records: English text/title, category, topic, level estimate, content type, provenance. Freeze canonical text; validate units and exact annotation spans using the PRD fixture/UTF-16 rules.
4. Dry-run: show destination, owner, proposed insert count, duplicate skips and validation failures. Never print credentials. Obtain owner approval for the actual target write, especially production; product approval is not blanket infrastructure authorization.
5. Use a trusted backend/admin job with existing managed credentials/ADC, never frontend embedded keys. Admin access bypasses Security Rules: explicitly enforce owner, allowed fields and Draft/pending status in the seed service. No credential files in source control.
6. Deduplicate by owner + normalized canonical source identity + content hash (original text uses content hash). Use a stable seed key and transactional/precondition protection to make retries idempotent. Same source with changed text creates a Draft version, never overwrites a published version or active room reference.
7. Write bounded batches compatible with the verified database. Keep each resource/version linkage consistent; partial failures are recorded and safely retryable. No deletion/truncation or unrelated updates.
8. Read back IDs/counts/status/category/owner/hash from database. Report actual inserts, skips, errors and reviewed/unreviewed status. Teacher sees seeded records in Draft and reviews content plus annotation candidates.
9. Teacher Publish validates rights/content, excludes unapproved spans and sets a published immutable version. An active room never changes due to seed or library edits. Teacher must explicitly Apply to room then Play/Show.

## Required verification before enabling writes

- Seed retry creates no duplicates; changed content never mutates published versions.
- Missing owner/category, non-English content, invalid offsets and attempted published/approved seed records fail validation.
- Cross-teacher reads/writes and learner seed requests are denied server-side.
- Drafts cannot be displayed to learners; only approved spans reach the current learner unit.
- Database readback confirms classifications and pending review; no fabricated success report.

No live cloud writes are part of this documentation update.
