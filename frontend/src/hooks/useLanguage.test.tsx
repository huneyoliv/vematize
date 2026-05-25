import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useLanguage } from './useLanguage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('useLanguage Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default English language', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('en');
    expect(localStorage.getItem('language')).toBeNull();
  });

  it('should translate nested key path successfully', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    const title = result.current.t('login.title');
    expect(title).toBe('Vematize');
  });

  it('should fallback to provided default value or path key if not found', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    const missing = result.current.t('missing.key.path', 'Fallback Value');
    expect(missing).toBe('Fallback Value');

    const noFallback = result.current.t('another.missing.key');
    expect(noFallback).toBe('another.missing.key');
  });

  it('should switch language dynamically and persist in localStorage', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => {
      result.current.setLanguage('pt');
    });

    expect(result.current.language).toBe('pt');
    expect(localStorage.getItem('language')).toBe('pt');
    expect(result.current.t('navigation.settings')).toBe('Configurações');

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
    expect(localStorage.getItem('language')).toBe('en');
    expect(result.current.t('navigation.settings')).toBe('Settings');
  });
});
