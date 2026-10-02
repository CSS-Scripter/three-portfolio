export const WHITE = 0xeeeeee;
export const BLACK = 0x050505;
export const HIGHLIGHT = 0xd66853;
export const DIMMED = 0x4a4a4a;
export const LINEAGE = 0xe9a493;

// Layout (world units)
export const NODE_RADIUS = 0.5;
export const LAYER_HEIGHT = 5;
export const MIN_NODE_SPACING = 3.4;
export const MIN_RING_RADIUS = 6;
// Each layer is rotated slightly relative to the previous one, giving the tree a subtle spiral
export const LAYER_TWIST = 0.14;

// Camera
export const FOV = 45;
export const BASE_DISTANCE = 28;
export const FOG_DENSITY = 0.018;

// Motion
export const AUTO_ROTATE_SPEED = 0.07; // rad/s
export const SCROLL_SPEED = 1;         // multiplier on wheel delta
export const SCROLL_STEP = 5;          // world units for the ↑/↓ buttons and arrow keys
