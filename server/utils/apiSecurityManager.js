const blockedIPs = new Set();
const accessLogs = [];

export const apiSecurityManager = {
  validateSignature(signature) {
    return signature === process.env.API_SECRET_KEY;
  },

  blockIP(ip) {
    blockedIPs.add(ip);
  },

  isIPBlocked(ip) {
    return blockedIPs.has(ip);
  },

  logAccess(data) {
    accessLogs.push({
      ...data,
      timestamp: new Date(),
    });
  },

  getSecurityReport() {
    return {
      blockedIPs: [...blockedIPs],
      totalRequests: accessLogs.length,
      recentAccess: accessLogs.slice(-10),
    };
  },
};
