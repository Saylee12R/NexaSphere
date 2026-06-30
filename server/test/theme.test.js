import assert from 'node:assert/strict';
import test from 'node:test';
import { setWithDbOverride } from '../repositories/db.js';

// Configure dummy environment variables before dynamic imports
process.env.JWT_SECRET = 'test_jwt_secret_key_123456789_test';
process.env.DATABASE_URL = 'postgresql://localhost/dummy_test_db';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'mock_key';

let executedQueries = [];

setWithDbOverride(async (fn) => {
  const mockClient = {
    query: async (sql, params) => {
      executedQueries.push({ sql: sql.trim().replace(/\s+/g, ' '), params });
      if (sql.includes('UPDATE student_users SET theme')) {
        return { rows: [{ id: params[1], theme: params[0] }], rowCount: 1 };
      }
      if (sql.includes('SELECT * FROM student_users WHERE provider')) {
        return {
          rows: [
            {
              id: 1,
              email: 'test@example.com',
              full_name: 'Test Student',
              role: 'student',
              theme: 'light',
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return fn(mockClient);
});

test.beforeEach(() => {
  executedQueries = [];
});

test('Theme Persistence - Repository updateTheme', async () => {
  const { studentUsersRepository } = await import('../repositories/studentUsersRepository.js');

  const user = await studentUsersRepository.updateTheme(42, 'light');

  assert.ok(user);
  assert.equal(user.id, 42);
  assert.equal(user.theme, 'light');

  assert.equal(executedQueries.length, 1);
  const q = executedQueries[0];
  assert.ok(q.sql.includes('UPDATE student_users SET theme = $1'));
  assert.equal(q.params[0], 'light');
  assert.equal(q.params[1], 42);
});

test('Theme Persistence - Controller getMe returns theme', async () => {
  const { getMe } = await import('../controllers/studentAuthController.js');

  const req = {
    studentUser: {
      sub: 1,
      provider: 'google',
      email: 'test@example.com',
      name: 'Test Student',
      role: 'student',
    },
  };

  let jsonResponse = null;
  const res = {
    json: (data) => {
      jsonResponse = data;
    },
  };

  await getMe(req, res);

  assert.ok(jsonResponse);
  assert.ok(jsonResponse.user);
  assert.equal(jsonResponse.user.theme, 'light');
  assert.equal(jsonResponse.user.email, 'test@example.com');
});

test('Theme Persistence - Controller updateTheme validation and update', async () => {
  const { updateTheme } = await import('../controllers/studentAuthController.js');

  // Test invalid theme
  const reqInvalid = {
    studentUser: { sub: 1 },
    body: { theme: 'invalid_theme' },
  };

  let statusSet = null;
  let errorResponse = null;
  const resInvalid = {
    status: (code) => {
      statusSet = code;
      return {
        json: (data) => {
          errorResponse = data;
        },
      };
    },
  };

  await updateTheme(reqInvalid, resInvalid);
  assert.equal(statusSet, 400);
  assert.equal(errorResponse.error, 'Invalid theme');

  // Test valid theme
  const reqValid = {
    studentUser: { sub: 42 },
    body: { theme: 'dark' },
  };

  let jsonResponse = null;
  const resValid = {
    json: (data) => {
      jsonResponse = data;
    },
  };

  await updateTheme(reqValid, resValid);
  assert.ok(jsonResponse);
  assert.equal(jsonResponse.ok, true);
  assert.equal(jsonResponse.theme, 'dark');

  const updateQuery = executedQueries.find((q) => q.sql.includes('UPDATE student_users SET theme'));
  assert.ok(updateQuery);
  assert.equal(updateQuery.params[0], 'dark');
  assert.equal(updateQuery.params[1], 42);
});
