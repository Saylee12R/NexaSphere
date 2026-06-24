import './setupEnv.js';

import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { setWithDbOverride } from '../repositories/db.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

// Mock auth middleware for admin endpoints
adminAuthMiddleware.requireAdmin = (req, res, next) => {
  req.adminSession = { username: 'admin', metadata: { scopes: ['events:read', 'events:write'] } };
  next();
};

adminAuthMiddleware.requireScope = (scope) => (req, res, next) => {
  req.adminSession = { username: 'admin', metadata: { scopes: ['events:read', 'events:write'] } };
  next();
};

// Database queries tracker and mock results
let dbQueries = [];
let mockDbResult = {
  select: [],
  count: 0,
  insert: null,
  update: null,
  deleteCount: 0,
};

setWithDbOverride(async (fn) => {
  const mockClient = {
    query: async (sql, params) => {
      dbQueries.push({ sql: sql.trim().replace(/\s+/g, ' '), params });

      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('select count')) {
        return { rows: [{ total: mockDbResult.count }], rowCount: 1 };
      }
      if (sqlLower.includes('select') && sqlLower.includes('announcements')) {
        return { rows: mockDbResult.select, rowCount: mockDbResult.select.length };
      }
      if (sqlLower.includes('insert into announcements')) {
        return {
          rows: mockDbResult.insert ? [mockDbResult.insert] : [],
          rowCount: mockDbResult.insert ? 1 : 0,
        };
      }
      if (sqlLower.includes('update announcements')) {
        return {
          rows: mockDbResult.update ? [mockDbResult.update] : [],
          rowCount: mockDbResult.update ? 1 : 0,
        };
      }
      if (sqlLower.includes('delete from announcements')) {
        return { rows: [], rowCount: mockDbResult.deleteCount };
      }
      if (sqlLower.includes('insert into notifications')) {
        return {
          rows: [
            {
              id: 999,
              user_id: params[0] || 'global',
              type: params[1] || 'system',
              title: params[2] || 'test',
              message: params[3] || 'test',
              link: params[4] || null,
              read: false,
              created_at: new Date().toISOString(),
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

test('Announcement Scheduling and Targeting API & Scheduler', async (t) => {
  const { default: app } = await import('../index.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const sendRequest = (method, path, body = null, headers = {}) => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(data || '{}');
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  t.beforeEach(() => {
    dbQueries = [];
    mockDbResult = {
      select: [],
      count: 0,
      insert: null,
      update: null,
      deleteCount: 0,
    };
  });

  try {
    await t.test('1. GET /api/admin/announcements lists all announcements', async () => {
      mockDbResult.select = [
        {
          id: 1,
          title: 'Test Announcement',
          content: 'Hello World',
          category: 'general',
          pinned: false,
          status: 'published',
          scheduled_for: null,
          expires_at: null,
          target_role: 'all',
          target_stage: 'all',
          target_department: 'all',
          target_graduation_year: null,
          priority: 'info',
        },
      ];
      mockDbResult.count = 1;

      const res = await sendRequest('GET', '/api/admin/announcements');
      assert.equal(res.status, 200);
      assert.equal(res.body.total, 1);
      assert.equal(res.body.announcements[0].title, 'Test Announcement');
    });

    await t.test('2. POST /api/admin/announcements creates a new announcement', async () => {
      const payload = {
        title: 'New Event scheduled',
        content: 'This is the body',
        category: 'academic',
        targetRole: 'student',
        targetStage: 'undergraduate',
        targetDepartment: 'CSE',
        targetGraduationYear: 2026,
        priority: 'warning',
      };

      mockDbResult.insert = {
        id: 2,
        title: payload.title,
        content: payload.content,
        category: payload.category,
        pinned: false,
        status: 'published',
        scheduled_for: null,
        expires_at: null,
        target_role: payload.targetRole,
        target_stage: payload.targetStage,
        target_department: payload.targetDepartment,
        target_graduation_year: payload.targetGraduationYear,
        priority: payload.priority,
      };

      const res = await sendRequest('POST', '/api/admin/announcements', payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.title, 'New Event scheduled');
      assert.equal(res.body.targetRole, 'student');
      assert.equal(res.body.targetStage, 'undergraduate');
      assert.equal(res.body.targetDepartment, 'CSE');
      assert.equal(res.body.targetGraduationYear, 2026);
    });

    await t.test('3. GET /api/announcements filters by student targeting criteria', async () => {
      // 1 mock announcement targeted at CSE, role student, grad year 2026
      mockDbResult.select = [
        {
          id: 3,
          title: 'CSE Graduation Info',
          content: 'Important info for CSE 2026',
          category: 'academic',
          pinned: false,
          status: 'published',
          scheduled_for: null,
          expires_at: null,
          target_role: 'student',
          target_stage: 'all',
          target_department: 'CSE',
          target_graduation_year: 2026,
          priority: 'info',
        },
        {
          id: 4,
          title: 'ECE Info',
          content: 'Important info for ECE',
          category: 'academic',
          pinned: false,
          status: 'published',
          scheduled_for: null,
          expires_at: null,
          target_role: 'student',
          target_stage: 'all',
          target_department: 'ECE',
          target_graduation_year: 2026,
          priority: 'info',
        },
      ];

      const testToken = jwt.sign(
        {
          sub: 'student-123',
          email: 'student@example.com',
          role: 'student',
          scopes: ['profile:read'],
        },
        process.env.JWT_SECRET
      );

      const res = await sendRequest(
        'GET',
        '/api/announcements?department=CSE&graduationYear=2026',
        null,
        { Authorization: `Bearer ${testToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.announcements.length, 1);
      assert.equal(res.body.announcements[0].title, 'CSE Graduation Info');
    });

    await t.test(
      '4. Scheduler Task publishScheduled publishes due scheduled announcements',
      async () => {
        const { schedulerService } = await import('../services/schedulerService.js');
        const { default: eventManager } = await import('../services/eventEmitterService.js');

        let broadcasted = false;
        eventManager.once('admin-announcement', (data) => {
          if (data.title === 'Future Announcement') {
            broadcasted = true;
          }
        });

        mockDbResult.update = {
          id: 5,
          title: 'Future Announcement',
          content: 'Finally here',
          status: 'published',
        };
        mockDbResult.select = [mockDbResult.update];

        schedulerService.init();
        await schedulerService.triggerNow('announcement-publisher');

        // The query to update status should have been run
        const updateQuery = dbQueries.find(
          (q) => q.sql.includes('UPDATE announcements') && q.sql.includes("status = 'published'")
        );
        assert.ok(updateQuery);
        assert.ok(broadcasted);
      }
    );
  } finally {
    try {
      const { schedulerService } = await import('../services/schedulerService.js');
      schedulerService.shutdown();
    } catch (_) {}
    server.close();
  }
});
