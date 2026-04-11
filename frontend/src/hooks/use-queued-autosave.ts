"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { captureException } from "../lib/error-tracking";

interface UseQueuedAutosaveOptions<T> {
  value: T;
  save: (value: T) => Promise<void>;
  component: string;
  delayMs?: number;
  serialize?: (value: T) => string;
}

interface UseQueuedAutosaveResult<T> {
  markPersisted: (value?: T) => void;
  persistNow: (value?: T) => Promise<void>;
  persistInBackground: (value?: T) => void;
  cancelPending: () => void;
}

export function useQueuedAutosave<T>({
  value,
  save,
  component,
  delayMs = 1200,
  serialize = JSON.stringify,
}: UseQueuedAutosaveOptions<T>): UseQueuedAutosaveResult<T> {
  const isInitializedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const serializedValue = useMemo(() => serialize(value), [serialize, value]);

  const cancelPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const markPersisted = useCallback(
    (nextValue: T = value) => {
      isInitializedRef.current = true;
      lastSavedRef.current = serialize(nextValue);
    },
    [serialize, value],
  );

  const persistValue = useCallback(
    async (nextValue: T) => {
      const serializedNextValue = serialize(nextValue);
      isInitializedRef.current = true;
      if (serializedNextValue === lastSavedRef.current) {
        return;
      }

      const queuedSave = queueRef.current.then(async () => {
        if (serializedNextValue === lastSavedRef.current) {
          return;
        }

        await save(nextValue);
        lastSavedRef.current = serializedNextValue;
      });

      queueRef.current = queuedSave.catch((error: unknown) => {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          component,
          errorFamily: "autosave_failure",
        });
      });

      await queuedSave;
    },
    [component, save, serialize],
  );

  const persistNow = useCallback(
    async (nextValue: T = value) => {
      cancelPending();
      await persistValue(nextValue);
    },
    [cancelPending, persistValue, value],
  );

  const persistInBackground = useCallback(
    (nextValue: T = value) => {
      cancelPending();
      void persistValue(nextValue);
    },
    [cancelPending, persistValue, value],
  );

  useEffect(() => {
    if (!isInitializedRef.current) {
      cancelPending();
      return;
    }

    if (serializedValue === lastSavedRef.current) {
      cancelPending();
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      void persistValue(value);
    }, delayMs);

    return cancelPending;
  }, [cancelPending, delayMs, persistValue, serializedValue, value]);

  return {
    markPersisted,
    persistNow,
    persistInBackground,
    cancelPending,
  };
}
