// CJS shim for uuid v13 (ESM-only) used in Jest tests
const { randomUUID } = require('crypto');

const v4 = () => randomUUID();

module.exports = { v4, v1: v4, v7: v4 };
