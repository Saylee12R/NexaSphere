const files = [
  './controllers/eventsController.js',
  './controllers/activityEventsController.js',
  './middleware/adminAuthMiddleware.js',
  './controllers/coreTeamController.js',
  './controllers/eventRegistrationController.js',
  './controllers/usersController.js',
  './controllers/attendanceController.js',
  './controllers/eventAnalyticsController.js',
  './middleware/adminAuditMiddleware.js',
  './repositories/eventsRepository.js',
  './services/coreTeamService.js',
  './middleware/authRateLimiter.js',
  './middleware/rateLimiter.js',
  './repositories/portfolioRepository.js',
  './repositories/achievementsRepository.js',
  './services/portfolioService.js',
  './services/waitingRoomService.js',
  './controllers/sponsorshipsController.js',
  './validators/portfolioSchemas.js',
  './repositories/auditLogRepository.js',
  './controllers/recommendationsController.js',
  './controllers/gamificationController.js',
];

async function check() {
  for (const file of files) {
    try {
      console.log('Importing:', file);
      await import(file);
    } catch (err) {
      console.error('FAILED to import:', file);
      console.error(err);
    }
  }
}

check();
