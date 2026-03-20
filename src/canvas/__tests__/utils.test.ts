import { hexLuminance, getCanvasSize } from '../utils';

describe('hexLuminance', () => {
  it('returns close to 1.0 for white', () => {
    expect(hexLuminance('#ffffff')).toBeCloseTo(1.0, 1);
  });

  it('returns 0 for black', () => {
    expect(hexLuminance('#000000')).toBe(0);
  });

  it('returns around 0.5 for mid-gray', () => {
    const lum = hexLuminance('#808080');
    expect(lum).toBeGreaterThan(0.3);
    expect(lum).toBeLessThan(0.7);
  });

  it('handles hex without hash', () => {
    // The function does c.replace('#','') so it should work without #
    expect(hexLuminance('ffffff')).toBeCloseTo(1.0, 1);
  });
});

describe('getCanvasSize', () => {
  it('returns { w: 1024, h: 645 } for horizontal', () => {
    expect(getCanvasSize('horizontal')).toEqual({ w: 1024, h: 645 });
  });

  it('returns { w: 645, h: 1024 } for vertical', () => {
    expect(getCanvasSize('vertical')).toEqual({ w: 645, h: 1024 });
  });
});
