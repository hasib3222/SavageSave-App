// Single source of truth: imports from package.json so UI auto-updates when version changes.
import pkg from '../../../package.json';

export const APP_NAME = 'TurboNest';
export const APP_VERSION = pkg.version || '1.0.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const APP_CHANNELS = ['Stable', 'Beta', 'Dev'];
export const APP_DEFAULT_CHANNEL = 'Stable';
