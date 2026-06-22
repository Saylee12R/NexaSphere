# Event Photo Gallery with AI Tagging

Closes #1748

## Overview

A performant masonry photo gallery for events with bulk upload, AI-powered tagging, content moderation, social features, and album management.

---

## Architecture

```
Client                          Server                         AWS
──────────────────────          ──────────────────────         ──────────────────
PhotoUpload.jsx                 POST /api/photos/upload
  • drag-and-drop bulk          • multer (10MB, WebP/JPEG/PNG/HEIC)
  • XHR with progress           • imageProcessing.js            S3 (WebP thumbnails)
  • HEIC auto-convert             – sharp resize (3 sizes)      CloudFront CDN
                                  – EXIF extraction (exifr)
                                • aiTagging.js (async)          Rekognition
                                  – detectLabels                  detectLabels
                                  – detectFaces                   detectFaces
                                  – moderateContent               detectModerationLabels
                                  – searchFacesByImage            Face Collection

PhotoGallery.jsx                GET /api/photos
  • masonry grid                • pagination + filters
  • infinite scroll             • sort: newest/likes/views
  • filter: album/date          • likedByMe flag
  • sort controls

Lightbox.jsx                    GET /api/photos/:id
  • swipe navigation            GET /api/photos/:id/comments
  • fullscreen                  POST /api/photos/:id/comments
  • slideshow mode              POST /api/photos/:id/like
  • tag users                   POST /api/photos/:id/tags
  • comments                    DELETE /api/photos/:id/tags/:uid
  • download + share
```

---

## Files Changed

| File | Purpose |
|------|---------|
| `components/Gallery/PhotoUpload.jsx` | Bulk drag-and-drop upload with XHR progress |
| `components/Gallery/PhotoGallery.jsx` | Masonry grid, infinite scroll, filters, sort |
| `components/Gallery/Lightbox.jsx` | Full-screen viewer, swipe, comments, tagging, share |
| `server/routes/photos.js` | Upload, list, like, comment, tag endpoints |
| `server/routes/albums.js` | Album CRUD, sub-albums, featured photos |
| `server/services/aiTagging.js` | AWS Rekognition: labels, faces, moderation |
| `server/services/imageProcessing.js` | sharp resize, WebP, S3 upload, EXIF |

---

## Environment Variables Required

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=nexasphere-photos
CDN_BASE_URL=https://YOUR_CLOUDFRONT_ID.cloudfront.net
REKOGNITION_COLLECTION_ID=nexasphere-faces   # optional, enables face matching
```

---

## Setup

### 1. Install dependencies
```bash
npm install sharp exifr multer aws-sdk
```

### 2. Register routes in server/index.js
```js
const photosRouter = require("./routes/photos");
const albumsRouter = require("./routes/albums");
app.use("/api/photos", photosRouter);
app.use("/api/albums", albumsRouter);
```

### 3. Create Rekognition face collection (optional — enables face matching)
```bash
aws rekognition create-collection \
  --collection-id nexasphere-faces \
  --region us-east-1
```

### 4. Users opt-in to face indexing
Call `aiTagging.indexFaceForUser(userId, imageBuffer)` when a user uploads a profile photo and consents to face matching.

---

## Acceptance Criteria Coverage

| AC | Implementation |
|----|---------------|
| Bulk upload works smoothly | `PhotoUpload.jsx` — drag-and-drop, batched XHR with per-file progress |
| Gallery renders performantly (1000+ photos) | Infinite scroll (30/page), lazy loading, WebP srcset, masonry CSS columns |
| AI tagging suggests correct users | `aiTagging.analyzePhoto` → Rekognition `searchFacesByImage` against face collection |
| Content moderation catches inappropriate images | `aiTagging.moderateContent` → Rekognition `detectModerationLabels`, rejects before storage |
| Social features (like, comment, share) work | `Lightbox.jsx` + `/api/photos/:id/like`, `/comments` endpoints |
| Albums organized correctly | `albums.js` route — CRUD, sub-albums (parentAlbumId), featured photos |
| Image quality maintained after compression | sharp WebP at 88–92% quality; original stored at 2000px max |
| Mobile upload and viewing optimized | Touch swipe in Lightbox; `srcset` responsive images; `accept` on file input |
| Privacy controls respected | Users can remove their own tag via `DELETE /api/photos/:id/tags/:userId` |
| QA test with large photo sets | Infinite scroll + pagination tested with 1000+ photo sets |

---

## Performance Notes

- **Masonry layout** via CSS `columns` — no JS layout calculation needed, re-flows on resize automatically.
- **Progressive loading** — `loading="lazy"` + blur-up: thumbnail shown first, full image loads on intersection.
- **WebP** served from CDN with 1-year cache headers; `srcset` provides 150w / 400w / 800w variants.
- **Batch uploads** — 3 concurrent XHR requests per batch to avoid browser connection limits.
- **AI tagging is async** — upload response returns immediately; tags appear once Rekognition finishes.
