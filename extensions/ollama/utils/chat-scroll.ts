/** Default px tolerance for treating the viewport as "at the bottom". */
export const NEAR_BOTTOM_THRESHOLD_PX = 48

export interface ScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/** True when the visible viewport is within `threshold` px of the bottom. */
export function isNearBottom(el: ScrollMetrics, threshold = NEAR_BOTTOM_THRESHOLD_PX): boolean {
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  return distanceFromBottom <= threshold
}
