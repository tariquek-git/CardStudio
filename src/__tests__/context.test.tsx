import { renderHook, act } from '@testing-library/react';
import { CardConfigProvider, useCardConfig } from '../context';
import { defaultConfig } from '../types';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <CardConfigProvider>{children}</CardConfigProvider>
);

describe('CardConfigProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initial config matches defaultConfig', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    expect(result.current.config).toEqual(defaultConfig);
  });

  it('updateConfig changes config.issuerName', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    act(() => {
      result.current.updateConfig({ issuerName: 'Test' });
    });
    expect(result.current.config.issuerName).toBe('Test');
  });

  it('after updateConfig, canUndo is true', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    expect(result.current.canUndo).toBe(false);
    act(() => {
      result.current.updateConfig({ issuerName: 'Test' });
    });
    expect(result.current.canUndo).toBe(true);
  });

  it('undo() restores previous state', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    act(() => {
      result.current.updateConfig({ issuerName: 'Changed' });
    });
    expect(result.current.config.issuerName).toBe('Changed');
    act(() => {
      result.current.undo();
    });
    expect(result.current.config.issuerName).toBe(defaultConfig.issuerName);
  });

  it('redo() after undo restores forward state', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    act(() => {
      result.current.updateConfig({ issuerName: 'Changed' });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.config.issuerName).toBe(defaultConfig.issuerName);
    act(() => {
      result.current.redo();
    });
    expect(result.current.config.issuerName).toBe('Changed');
  });

  it('canRedo is false after a new updateConfig', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    act(() => {
      result.current.updateConfig({ issuerName: 'First' });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.updateConfig({ issuerName: 'Second' });
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('saveDesign() creates a design in designs array', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    let design: ReturnType<typeof result.current.saveDesign>;
    act(() => {
      design = result.current.saveDesign('My Card');
    });
    expect(result.current.designs.length).toBe(1);
    expect(result.current.designs[0].name).toBe('My Card');
    expect(result.current.designs[0].id).toBe(design!.id);
  });

  it('loadDesign() restores that design config', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    act(() => {
      result.current.updateConfig({ issuerName: 'Bank A' });
    });
    let design: ReturnType<typeof result.current.saveDesign>;
    act(() => {
      design = result.current.saveDesign('Design A');
    });
    act(() => {
      result.current.updateConfig({ issuerName: 'Bank B' });
    });
    expect(result.current.config.issuerName).toBe('Bank B');
    act(() => {
      result.current.loadDesign(design!.id);
    });
    expect(result.current.config.issuerName).toBe('Bank A');
  });

  it('deleteDesign() removes from array', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    let design: ReturnType<typeof result.current.saveDesign>;
    act(() => {
      design = result.current.saveDesign('To Delete');
    });
    expect(result.current.designs.length).toBe(1);
    act(() => {
      result.current.deleteDesign(design!.id);
    });
    expect(result.current.designs.length).toBe(0);
  });

  it('duplicateDesign() creates copy with "(copy)" suffix', () => {
    const { result } = renderHook(() => useCardConfig(), { wrapper });
    let design: ReturnType<typeof result.current.saveDesign>;
    act(() => {
      design = result.current.saveDesign('Original');
    });
    act(() => {
      result.current.duplicateDesign(design!.id);
    });
    expect(result.current.designs.length).toBe(2);
    const copy = result.current.designs.find(d => d.id !== design!.id);
    expect(copy).toBeDefined();
    expect(copy!.name).toBe('Original (copy)');
  });
});
