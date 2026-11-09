// Keep the test run off the network: the telemetry module spawns a detached
// sink process, and tests must never emit analytics.
process.env.CALY_TELEMETRY = '0';
