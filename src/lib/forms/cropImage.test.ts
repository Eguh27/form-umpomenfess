import { describe, expect, it } from 'vitest';
import { computeCropDimensions } from './cropImage';

describe('computeCropDimensions', () => {
  it('mempertahankan dimensi asli bila di bawah maxWidth', () => {
    const dim = computeCropDimensions(1200, 675, 1600);
    expect(dim.width).toBe(1200);
    expect(dim.height).toBe(675);
  });

  it('menskalakan lebar dan tinggi secara proporsional jika melebihi maxWidth', () => {
    // 3200 x 1800 dengan maxWidth 1600 -> skala 0.5 -> 1600 x 900
    const dim = computeCropDimensions(3200, 1800, 1600);
    expect(dim.width).toBe(1600);
    expect(dim.height).toBe(900);
  });

  it('memastikan dimensi minimal 1 piksel', () => {
    const dim = computeCropDimensions(0, 0);
    expect(dim.width).toBe(1);
    expect(dim.height).toBe(1);
  });

  it('menangani pembulatan piksel pecahan secara rapi', () => {
    const dim = computeCropDimensions(1200.4, 674.8);
    expect(dim.width).toBe(1200);
    expect(dim.height).toBe(675);
  });

  it('mengunci rasio aspek tepat 16:9 meski input memiliki tinggi bebas', () => {
    // 1600 x 1200 (4:3) dikunci menjadi 1600 x 900 (16:9)
    const dim = computeCropDimensions(1600, 1200);
    expect(dim.width).toBe(1600);
    expect(dim.height).toBe(900);
    expect(dim.width / dim.height).toBeCloseTo(16 / 9, 2);
  });
});
