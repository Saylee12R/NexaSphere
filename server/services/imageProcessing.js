/**
 * server/services/imageProcessing.js
 * Image compression, resizing, WebP conversion, thumbnail generation, EXIF extraction
 * Uses: sharp (processing), exifr (EXIF), AWS S3 (storage)
 */
const sharp = require('sharp');
const exifr = require('exifr');
const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET;
const CDN_BASE = process.env.CDN_BASE_URL; // e.g. https://d1234.cloudfront.net

const SIZES = {
  small: { width: 150, height: 150, fit: 'cover' },
  medium: { width: 400, height: 400, fit: 'inside' },
  large: { width: 800, height: 800, fit: 'inside' },
};

/**
 * processUpload — compress, resize to 3 sizes + original, upload all to S3/CDN
 * @param {Buffer} buffer  raw file buffer from multer
 * @param {string} originalName
 * @returns {Promise<{ smallUrl, mediumUrl, largeUrl, originalUrl, smallBuffer, mediumBuffer, largeBuffer }>}
 */
async function processUpload(buffer, originalName) {
  const id = crypto.randomBytes(12).toString('hex');
  const ext = path.extname(originalName).toLowerCase();

  // Convert HEIC to JPEG first
  let workingBuffer = buffer;
  if (ext === '.heic') {
    workingBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  }

  const results = {};

  // Generate each size as WebP (with JPEG fallback via srcset at client)
  await Promise.all(
    Object.entries(SIZES).map(async ([name, opts]) => {
      const resized = await sharp(workingBuffer)
        .resize(opts.width, opts.height, { fit: opts.fit, withoutEnlargement: true })
        .webp({ quality: name === 'small' ? 75 : name === 'medium' ? 82 : 88 })
        .toBuffer();

      const key = `photos/${id}/${name}.webp`;
      await s3
        .putObject({
          Bucket: BUCKET,
          Key: key,
          Body: resized,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
        .promise();

      results[`${name}Url`] = `${CDN_BASE}/${key}`;
      results[`${name}Buffer`] = resized;
    })
  );

  // Store compressed original (WebP, capped at 2000px, 92% quality)
  const originalCompressed = await sharp(workingBuffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 92 })
    .toBuffer();

  const origKey = `photos/${id}/original.webp`;
  await s3
    .putObject({
      Bucket: BUCKET,
      Key: origKey,
      Body: originalCompressed,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
    .promise();

  results.originalUrl = `${CDN_BASE}/${origKey}`;

  return results;
}

/**
 * extractExif — pull useful EXIF metadata from raw buffer
 * @param {Buffer} buffer
 * @returns {Promise<object|null>}
 */
async function extractExif(buffer) {
  try {
    const data = await exifr.parse(buffer, {
      pick: [
        'DateTimeOriginal',
        'Make',
        'Model',
        'FNumber',
        'ISO',
        'ExposureTime',
        'GPSLatitude',
        'GPSLongitude',
      ],
    });

    if (!data) return null;

    return {
      dateTaken: data.DateTimeOriginal?.toISOString() || null,
      camera: [data.Make, data.Model].filter(Boolean).join(' ') || null,
      aperture: data.FNumber || null,
      iso: data.ISO || null,
      exposureTime: data.ExposureTime ? `1/${Math.round(1 / data.ExposureTime)}s` : null,
      gps: data.GPSLatitude ? { lat: data.GPSLatitude, lng: data.GPSLongitude } : null,
    };
  } catch {
    return null;
  }
}

module.exports = { processUpload, extractExif };
