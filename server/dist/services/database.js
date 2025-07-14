"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getClient = exports.query = exports.getPool = exports.initDatabase = void 0;
const pg_1 = require("pg");
let pool;
const initDatabase = async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new pg_1.Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
    try {
        const client = await pool.connect();
        console.log('Database connected successfully');
        client.release();
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
};
exports.initDatabase = initDatabase;
const getPool = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return pool;
};
exports.getPool = getPool;
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
};
exports.query = query;
const getClient = async () => {
    return await pool.connect();
};
exports.getClient = getClient;
const closeDatabase = async () => {
    if (pool) {
        await pool.end();
    }
};
exports.closeDatabase = closeDatabase;
//# sourceMappingURL=database.js.map