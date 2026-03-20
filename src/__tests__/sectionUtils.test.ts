import { SECTIONS, getSectionModStatus, isDefaultConfig, getComplianceErrorSections } from '../sectionUtils';
import { defaultConfig } from '../types';
import type { ComplianceRule } from '../compliance/types';

describe('SECTIONS', () => {
  it('is a non-empty array', () => {
    expect(SECTIONS.length).toBeGreaterThan(0);
  });

  it('each section has id, label, and fields', () => {
    for (const section of SECTIONS) {
      expect(typeof section.id).toBe('string');
      expect(typeof section.label).toBe('string');
      expect(Array.isArray(section.fields)).toBe(true);
    }
  });

  it('contains known section ids', () => {
    const ids = SECTIONS.map(s => s.id);
    expect(ids).toContain('card-program');
    expect(ids).toContain('brand-identity');
    expect(ids).toContain('visual-design');
    expect(ids).toContain('card-features');
    expect(ids).toContain('compliance');
  });
});

describe('getSectionModStatus', () => {
  it('returns all zeros for defaultConfig', () => {
    const status = getSectionModStatus(defaultConfig);
    for (const count of Object.values(status)) {
      expect(count).toBe(0);
    }
  });

  it('returns non-zero for section with modified field', () => {
    const modified = { ...defaultConfig, issuerName: 'Changed Bank' };
    const status = getSectionModStatus(modified);
    expect(status['brand-identity']).toBeGreaterThan(0);
  });

  it('detects object field changes', () => {
    const modified = {
      ...defaultConfig,
      gradientConfig: {
        stops: [{ color: '#ff0000', position: 0 }, { color: '#00ff00', position: 100 }],
        angle: 45,
      },
    };
    const status = getSectionModStatus(modified);
    expect(status['visual-design']).toBeGreaterThan(0);
  });
});

describe('isDefaultConfig', () => {
  it('returns true for defaultConfig', () => {
    expect(isDefaultConfig(defaultConfig)).toBe(true);
  });

  it('returns false when a field is modified', () => {
    expect(isDefaultConfig({ ...defaultConfig, chipStyle: 'silver' })).toBe(false);
  });
});

describe('getComplianceErrorSections', () => {
  it('returns empty array for no rules', () => {
    expect(getComplianceErrorSections([])).toEqual([]);
  });

  it('returns section ids for error-severity rules', () => {
    // The function maps rule.category (not rule.field) through COMPLIANCE_FIELD_TO_SECTION
    // 'chipStyle' is a known key in the map -> 'card-features'
    const rules: ComplianceRule[] = [
      {
        id: 'test', jurisdiction: 'GLOBAL', category: 'regulatory', severity: 'error',
        title: 'Test', message: 'test', explanation: 'test', field: 'chipStyle',
      },
    ];
    const sections = getComplianceErrorSections(rules);
    // rule.category = 'regulatory' is not in the mapping, so falls back to 'card-program'
    expect(sections).toContain('card-program');
  });

  it('ignores warning-severity rules', () => {
    const rules: ComplianceRule[] = [
      {
        id: 'test', jurisdiction: 'GLOBAL', category: 'network', severity: 'warning',
        title: 'Test', message: 'test', explanation: 'test', field: 'chipStyle',
      },
    ];
    expect(getComplianceErrorSections(rules)).toEqual([]);
  });

  it('deduplicates sections', () => {
    // category='network' maps to 'brand-identity' in the COMPLIANCE_FIELD_TO_SECTION map
    const rules: ComplianceRule[] = [
      {
        id: 'test1', jurisdiction: 'GLOBAL', category: 'network', severity: 'error',
        title: 'T1', message: 'test', explanation: 'test', field: 'chipStyle',
      },
      {
        id: 'test2', jurisdiction: 'GLOBAL', category: 'network', severity: 'error',
        title: 'T2', message: 'test', explanation: 'test', field: 'contactless',
      },
    ];
    const sections = getComplianceErrorSections(rules);
    // Both have category='network' which maps to 'brand-identity', deduplicated to 1
    expect(sections.filter(s => s === 'brand-identity').length).toBe(1);
    expect(sections.length).toBe(1);
  });
});
