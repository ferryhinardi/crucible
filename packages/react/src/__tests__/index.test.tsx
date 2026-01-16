import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { FlagProvider, useFlag, useFlagWithStatus, useFlagClient, useFlagContext } from '../index';

// Mock client factory
const createMockClient = (overrides = {}) => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn().mockResolvedValue('variant-a'),
  close: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Wrapper component factory
const createWrapper = (client: ReturnType<typeof createMockClient>, context = {}) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FlagProvider client={client} context={context}>
        {children}
      </FlagProvider>
    );
  };
};

describe('FlagProvider', () => {
  it('should provide client and context to children', () => {
    const mockClient = createMockClient();
    const context = { userId: '123' };

    const { result } = renderHook(() => useFlagClient(), {
      wrapper: createWrapper(mockClient, context),
    });

    expect(result.current).toBe(mockClient);
  });
});

describe('useFlag', () => {
  let consoleWarnSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should return default value initially', () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
    });

    const { result } = renderHook(() => useFlag('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    expect(result.current).toBe('default');
  });

  it('should return evaluated flag value', async () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockResolvedValue('variant-b'),
    });

    const { result } = renderHook(() => useFlag('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    await waitFor(() => {
      expect(result.current).toBe('variant-b');
    });
  });

  it('should call evaluate with correct parameters', async () => {
    const mockClient = createMockClient();
    const context = { userId: '123', attributes: { country: 'US' } };

    renderHook(() => useFlag('my-flag', 'default'), {
      wrapper: createWrapper(mockClient, context),
    });

    await waitFor(() => {
      expect(mockClient.evaluate).toHaveBeenCalledWith('my-flag', context, 'default');
    });
  });

  it('should warn when called outside FlagProvider', () => {
    renderHook(() => useFlag('test-flag'));

    expect(consoleWarnSpy).toHaveBeenCalledWith('[Crucible] useFlag called outside FlagProvider');
  });

  it('should not set state after unmount (no memory leak)', async () => {
    let resolveEvaluate: (value: string) => void;
    const mockClient = createMockClient({
      evaluate: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveEvaluate = resolve;
          })
      ),
    });

    const { result, unmount } = renderHook(() => useFlag('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    // Unmount before promise resolves
    unmount();

    // Resolve the promise after unmount
    await act(async () => {
      resolveEvaluate!('variant-b');
    });

    // Should still be default (state not updated after unmount)
    expect(result.current).toBe('default');
    // No React warning about state update on unmounted component
  });

  it('should handle evaluation errors gracefully', async () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const { result } = renderHook(() => useFlag('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Crucible] Error evaluating flag:',
        expect.any(Error)
      );
    });

    // Should keep default value on error
    expect(result.current).toBe('default');
  });

  it('should re-evaluate when flag name changes', async () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockResolvedValueOnce('value-a').mockResolvedValueOnce('value-b'),
    });

    const { result, rerender } = renderHook(({ flag }) => useFlag(flag, 'default'), {
      wrapper: createWrapper(mockClient),
      initialProps: { flag: 'flag-a' },
    });

    await waitFor(() => {
      expect(result.current).toBe('value-a');
    });

    rerender({ flag: 'flag-b' });

    await waitFor(() => {
      expect(result.current).toBe('value-b');
    });

    expect(mockClient.evaluate).toHaveBeenCalledTimes(2);
  });
});

describe('useFlagWithStatus', () => {
  let consoleWarnSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should return loading status initially', () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockImplementation(() => new Promise(() => {})),
    });

    const { result } = renderHook(() => useFlagWithStatus('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    expect(result.current.value).toBe('default');
    expect(result.current.status.isLoading).toBe(true);
    expect(result.current.status.error).toBeNull();
  });

  it('should return value and not loading after evaluation', async () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockResolvedValue('variant-a'),
    });

    const { result } = renderHook(() => useFlagWithStatus('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    await waitFor(() => {
      expect(result.current.status.isLoading).toBe(false);
    });

    expect(result.current.value).toBe('variant-a');
    expect(result.current.status.error).toBeNull();
  });

  it('should return error status on evaluation failure', async () => {
    const mockClient = createMockClient({
      evaluate: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const { result } = renderHook(() => useFlagWithStatus('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    await waitFor(() => {
      expect(result.current.status.isLoading).toBe(false);
    });

    expect(result.current.value).toBe('default');
    expect(result.current.status.error).toBeInstanceOf(Error);
    expect(result.current.status.error?.message).toBe('Network error');
  });

  it('should return error when called outside FlagProvider', async () => {
    const { result } = renderHook(() => useFlagWithStatus('test-flag'));

    await waitFor(() => {
      expect(result.current.status.isLoading).toBe(false);
    });

    expect(result.current.status.error).toBeInstanceOf(Error);
    expect(result.current.status.error?.message).toBe('No FlagProvider found');
  });

  it('should not update state after unmount', async () => {
    let resolveEvaluate: (value: string) => void;
    const mockClient = createMockClient({
      evaluate: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveEvaluate = resolve;
          })
      ),
    });

    const { result, unmount } = renderHook(() => useFlagWithStatus('test-flag', 'default'), {
      wrapper: createWrapper(mockClient),
    });

    expect(result.current.status.isLoading).toBe(true);

    unmount();

    await act(async () => {
      resolveEvaluate!('variant-b');
    });

    // Status should remain as it was before unmount
    expect(result.current.status.isLoading).toBe(true);
  });
});

describe('useFlagClient', () => {
  it('should return the client from context', () => {
    const mockClient = createMockClient();

    const { result } = renderHook(() => useFlagClient(), {
      wrapper: createWrapper(mockClient),
    });

    expect(result.current).toBe(mockClient);
  });

  it('should return null when outside FlagProvider', () => {
    const { result } = renderHook(() => useFlagClient());
    expect(result.current).toBeNull();
  });
});

describe('useFlagContext', () => {
  it('should return the context from provider', () => {
    const mockClient = createMockClient();
    const context = { userId: '123', attributes: { plan: 'pro' } };

    const { result } = renderHook(() => useFlagContext(), {
      wrapper: createWrapper(mockClient, context),
    });

    expect(result.current).toEqual(context);
  });

  it('should return empty object when outside FlagProvider', () => {
    const { result } = renderHook(() => useFlagContext());
    expect(result.current).toEqual({});
  });
});
