import React from 'react';
import { StudentAuthProvider } from '../context/StudentAuthContext';
import { BookmarkProvider } from '../context/BookmarkContext';

/**
 * Unified provider wrapper for the application.
 * Wraps children with StudentAuthProvider and BookmarkProvider.
 */
export function AppProviders({ children }) {
  return (
    <StudentAuthProvider>
      <BookmarkProvider>{children}</BookmarkProvider>
    </StudentAuthProvider>
  );
}

export default AppProviders;
