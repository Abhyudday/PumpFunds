import { Pool, PoolClient } from 'pg';
export declare const initDatabase: () => Promise<void>;
export declare const getPool: () => Pool;
export declare const query: (text: string, params?: any[]) => Promise<any>;
export declare const getClient: () => Promise<PoolClient>;
export declare const closeDatabase: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map