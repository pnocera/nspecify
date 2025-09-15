/**
 * UI Components for nspecify
 * Provides banner, interactive selection, and progress tracking
 */

// Banner and theming
export { 
  showBanner, 
  THEME, 
  COLORS,
  supportsColor,
  colorFallback,
  getTerminalWidth
} from './banner.js';

// Interactive selection
export { 
  Selector,
  selectWithArrows,
  SelectionState,
  feedback
} from './selector.js';

// Progress tracking
export {
  StepTracker,
  LiveUpdater,
  createLiveTracker,
  tree
} from './tracker.js';

// Keyboard handling
export {
  KeyboardHandler,
  getKeyboard,
  getKey
} from './keyboard.js';

// Helper to create a complete UI context
export function createUI() {
  return {
    showBanner,
    selectWithArrows,
    StepTracker,
    createLiveTracker,
    theme: THEME,
    colors: COLORS
  };
}