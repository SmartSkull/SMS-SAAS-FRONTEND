export type AttachType = 'image' | 'video' | 'audio' | 'document';

export function guessType(url: string, mime?: string): AttachType {
  if (mime) {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }
  const u = url.toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(u)) return 'image';
  if (/\.(mp4|mov|avi|mkv|webm|3gp)$/.test(u)) return 'video';
  if (/\.(mp3|aac|wav|ogg|m4a|opus|flac)$/.test(u)) return 'audio';
  return 'document';
}
