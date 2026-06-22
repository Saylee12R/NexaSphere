let activeDatabase = "primary";

const databaseHealth = {
  primary: true,
  replica: true,
};

export const databaseFailoverManager = {
  getActiveDatabase() {
    return activeDatabase;
  },

  checkDatabaseHealth() {
    return databaseHealth;
  },

  triggerFailover() {
    if (databaseHealth.replica) {
      activeDatabase = "replica";

      return {
        success: true,
        message: "Database switched to replica",
      };
    }

    return {
      success: false,
      message: "No healthy replica available",
    };
  },

  recoverPrimary() {
    activeDatabase = "primary";

    return {
      success: true,
      message: "Primary database restored",
    };
  },

  getFailoverReport() {
    return {
      activeDatabase,
      health: databaseHealth,
      timestamp: new Date(),
    };
  },
};