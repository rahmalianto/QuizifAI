import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'question-images';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_TARGET_SIZE_BYTES = 250 * 1024; // 250KB limit

/**
 * Compresses an image file to be under 250KB using a canvas.
 * @param {File} file 
 * @returns {Promise<File>}
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      resolve(file); // Don't try to compress non-images
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Step 1: Cap pixel dimensions to 1280px on the longest side.
        // This is the primary defence against WORKER_RESOURCE_LIMIT — the base64
        // payload grows with pixel count, not (compressed) file size.
        const MAX_DIMENSION = 1280;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height / width) * MAX_DIMENSION);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width / height) * MAX_DIMENSION);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Step 2: Compress as JPEG at 65% quality (sufficient for AI text recognition).
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression failed'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.80
        );
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


/**
 * Upload a question or explanation image path.
 * @param {string} userId
 * @param {string} questionId
 * @param {'question' | 'explanation'} type
 * @param {File} file
 * @returns {Promise<string>} The storage path (NOT public URL)
 */
export async function uploadImage(userId, questionId, type, file) {
  const compressed = await compressImage(file);
  const ext = file.name?.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const filePath = `${userId}/${questionId}/${type}_${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return data.path;
}

/**
 * Upload a question image (convenience wrapper).
 */
export async function uploadQuestionImage(userId, questionId, file) {
  return uploadImage(userId, questionId, 'question', file);
}

/**
 * Upload an explanation image (convenience wrapper).
 */
export async function uploadExplanationImage(userId, questionId, file) {
  return uploadImage(userId, questionId, 'explanation', file);
}

/**
 * Gets a short-lived signed URL for a private storage path.
 * @param {string} path - The relative storage path
 * @returns {Promise<string>}
 */
export async function getSignedImageUrl(path) {
  if (!path) return null;
  // If it's already a full HTTP URL, return it directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete an image from storage.
 * @param {string} path
 */
export async function deleteImage(path) {
  if (!path) return;
  // Strip out prefix if it's stored full
  let cleanPath = path;
  if (path.includes(`/storage/v1/object/private/${BUCKET_NAME}/`)) {
    cleanPath = path.split(`/storage/v1/object/private/${BUCKET_NAME}/`)[1];
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([cleanPath]);

  if (error) {
    console.error('Failed to delete image:', error);
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function urlToBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
