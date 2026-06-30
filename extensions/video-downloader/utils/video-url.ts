export const VIDEO_URL_RE =
  /^https?:\/\/(?:www\.|m\.)?(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.watch|dailymotion\.com|twitch\.tv|soundcloud\.com|streamable\.com|reddit\.com)\//i

export function isVideoUrl(text: string): boolean {
  return VIDEO_URL_RE.test(text.trim())
}
