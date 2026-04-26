/**
 * TurboNest Speed Throttle Engine
 * =====================================
 * Real bandwidth throttling for capped plans.
 * Applied at the chunk-download level in backend/downloadEngine.js.
 * Currently inactive — ready to wire when monetization_enabled = true.
 */

/** Convert Mbps cap to bytes per millisecond */
function mbpsToBytesPerMs(mbps) {
  if (!mbps || mbps <= 0) return Infinity;
  return (mbps * 1024 * 1024) / 1000;
}

/**
 * Throttled readable stream wrapper.
 * Pauses between chunk reads to enforce a max bytes-per-second rate.
 */
export class ThrottledStream {
  constructor(capMbps, stream) {
    this.capBps = mbpsToBytesPerMs(capMbps) * 1000;
    this.stream = stream;
    this.bytesRead = 0;
    this.startTime = Date.now();
    this.paused = false;
  }

  /** Calculate delay needed before next chunk to stay under cap */
  getDelayMs(bytesJustRead) {
    if (!this.capBps || this.capBps === Infinity) return 0;
    this.bytesRead += bytesJustRead;
    const elapsedMs = Date.now() - this.startTime;
    const expectedMs = (this.bytesRead / this.capBps) * 1000;
    return Math.max(0, expectedMs - elapsedMs);
  }

  /** Pause if we're ahead of schedule */
  async throttle(bytesJustRead) {
    const delay = this.getDelayMs(bytesJustRead);
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Apply throttle to a single download connection.
 * Wraps the response stream callback.
 */
export function createThrottledHandler(capMbps) {
  if (!capMbps || capMbps <= 0) {
    // No cap — passthrough
    return (chunk) => chunk;
  }

  const throttle = new ThrottledStream(capMbps, null);

  return async (chunkBuffer) => {
    await throttle.throttle(chunkBuffer.length);
    return chunkBuffer;
  };
}

/**
 * Per-user throttle registry (frontend-side cache).
 * Maps userId → ThrottledStream instance.
 */
const userThrottles = new Map();

export function getUserThrottle(userId, capMbps) {
  if (!capMbps || capMbps <= 0) return null;
  if (!userThrottles.has(userId)) {
    userThrottles.set(userId, new ThrottledStream(capMbps, null));
  }
  return userThrottles.get(userId);
}

export function clearUserThrottle(userId) {
  userThrottles.delete(userId);
}

export function clearAllThrottles() {
  userThrottles.clear();
}
