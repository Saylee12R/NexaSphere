/**
 * useFormMemory — Session-persistent form autofill with undo/redo
 *
 * Usage:
 *   const { values, setValue, clearMemory, undo, redo, canUndo, canRedo } =
 *     useFormMemory('membership', ['name', 'email', 'branch', 'year']);
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_PREFIX = 'ns_form_memory_';
const MAX_HISTORY = 20;

/* ── Branch inference from GL Bajaj email domain ── */
function inferBranchFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  const local = email.split('@')[0].toLowerCase();
  // Pattern: firstname.branch.year@glbajajgroup.org  e.g.  ayush.cs.2022@glbajajgroup.org
  const parts = local.split('.');
  if (parts.length >= 3) {
    const branchCode = parts[1].toUpperCase();
    const branchMap = {
      CS: 'Computer Science',
      IT: 'Information Technology',
      EC: 'Electronics & Communication',
      EE: 'Electrical Engineering',
      ME: 'Mechanical Engineering',
      CE: 'Civil Engineering',
      AI: 'Artificial Intelligence & ML',
      DS: 'Data Science',
      BT: 'Biotechnology',
    };
    return branchMap[branchCode] || null;
  }
  return null;
}

/* ── Store helpers ── */
function readStorage(key) {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(key, data) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable — degrade silently
  }
}

function clearStorage(key) {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {}
}

/* ── Main Hook ── */
export function useFormMemory(formKey, fieldNames = []) {
  // Build initial values from sessionStorage
  const [values, setValues] = useState(() => {
    const saved = readStorage(formKey);
    const initial = {};
    for (const field of fieldNames) {
      initial[field] = saved[field] ?? '';
    }
    return initial;
  });

  // Undo / redo history stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  // Hydration flag — notify user if values were loaded from session
  const [wasAutofilled, setWasAutofilled] = useState(false);
  useEffect(() => {
    const saved = readStorage(formKey);
    const hasData = fieldNames.some((f) => saved[f] && saved[f] !== '');
    setWasAutofilled(hasData);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to sessionStorage whenever values change
  useEffect(() => {
    writeStorage(formKey, values);
  }, [formKey, values]);

  const pushToHistory = useCallback((snapshot) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    setHistoryState({ canUndo: true, canRedo: false });
  }, []);

  /**
   * setValue(fieldName, value)
   * Updates a single field and saves to sessionStorage.
   * Automatically infers branch from email if applicable.
   */
  const setValue = useCallback(
    (field, value) => {
      setValues((prev) => {
        pushToHistory(prev); // save snapshot before change
        const next = { ...prev, [field]: value };

        // Auto-infer branch from email
        if (field === 'email' && fieldNames.includes('branch')) {
          const inferred = inferBranchFromEmail(value);
          if (inferred && !prev.branch) {
            next.branch = inferred;
          }
        }

        return next;
      });
    },
    [fieldNames, pushToHistory]
  );

  /**
   * setValues bulk — for programmatic updates (e.g. autofill from profile)
   */
  const setAllValues = useCallback(
    (newValues) => {
      setValues((prev) => {
        pushToHistory(prev);
        return { ...prev, ...newValues };
      });
    },
    [pushToHistory]
  );

  /**
   * undo — reverts to the previous state snapshot
   */
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    setValues((current) => {
      const prev = undoStack.current.pop();
      redoStack.current.push(current);
      setHistoryState({
        canUndo: undoStack.current.length > 0,
        canRedo: true,
      });
      return prev;
    });
  }, []);

  /**
   * redo — reapplies a previously undone change
   */
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    setValues((current) => {
      const next = redoStack.current.pop();
      undoStack.current.push(current);
      setHistoryState({
        canUndo: true,
        canRedo: redoStack.current.length > 0,
      });
      return next;
    });
  }, []);

  /**
   * clearMemory — erases sessionStorage and resets all fields
   */
  const clearMemory = useCallback(() => {
    clearStorage(formKey);
    undoStack.current = [];
    redoStack.current = [];
    setHistoryState({ canUndo: false, canRedo: false });
    const empty = {};
    for (const field of fieldNames) empty[field] = '';
    setValues(empty);
    setWasAutofilled(false);
  }, [formKey, fieldNames]);

  /**
   * getInputProps — convenience helper for controlled inputs
   * Usage: <input {...getInputProps('name')} />
   */
  const getInputProps = useCallback(
    (field) => ({
      value: values[field] ?? '',
      onChange: (e) => setValue(field, e.target.value),
    }),
    [values, setValue]
  );

  return {
    values,
    setValue,
    setAllValues,
    clearMemory,
    undo,
    redo,
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    wasAutofilled,
    getInputProps,
  };
}

export default useFormMemory;
