const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl: awsGetSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Upload a file buffer to S3.
 *
 * @param {object} options
 * @param {string} options.key - S3 object key (path)
 * @param {Buffer} options.body - File content
 * @param {string} options.contentType - MIME type
 * @param {Record<string, string>} [options.metadata] - Custom metadata
 * @param {string} [options.bucket] - Override bucket (defaults to env)
 * @returns {Promise<{ key: string, bucket: string, etag: string }>}
 */
async function uploadToS3({ key, body, contentType, metadata = {}, bucket = BUCKET }) {
  if (!bucket) throw new Error('S3_BUCKET_NAME environment variable is not set');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
    ServerSideEncryption: 'AES256',
  });

  const response = await s3Client.send(command);

  return {
    key,
    bucket,
    etag: response.ETag,
  };
}

/**
 * Generate a pre-signed URL for temporarily accessing a private S3 object.
 *
 * @param {string} key - S3 object key
 * @param {number} [expiresInSeconds] - URL expiry (default 1 hour)
 * @param {string} [bucket] - Override bucket
 * @returns {Promise<string>} Signed URL
 */
async function getSignedUrl(key, expiresInSeconds = SIGNED_URL_EXPIRY_SECONDS, bucket = BUCKET) {
  if (!bucket) throw new Error('S3_BUCKET_NAME environment variable is not set');

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return awsGetSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an object from S3.
 *
 * @param {string} key - S3 object key
 * @param {string} [bucket] - Override bucket
 */
async function deleteFromS3(key, bucket = BUCKET) {
  if (!bucket) throw new Error('S3_BUCKET_NAME environment variable is not set');

  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await s3Client.send(command);
}

/**
 * Get S3 object as a Buffer (used for passing documents to Claude API).
 *
 * @param {string} key - S3 object key
 * @param {string} [bucket] - Override bucket
 * @returns {Promise<{ buffer: Buffer, contentType: string, contentLength: number }>}
 */
async function getObjectBuffer(key, bucket = BUCKET) {
  if (!bucket) throw new Error('S3_BUCKET_NAME environment variable is not set');

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return {
    buffer,
    contentType: response.ContentType || 'application/pdf',
    contentLength: response.ContentLength || buffer.length,
  };
}

/**
 * Check if an S3 object exists without downloading it.
 *
 * @param {string} key
 * @param {string} [bucket]
 * @returns {Promise<boolean>}
 */
async function objectExists(key, bucket = BUCKET) {
  if (!bucket) return false;
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

module.exports = { uploadToS3, getSignedUrl, deleteFromS3, getObjectBuffer, objectExists };
