import type { D1Database } from "@cloudflare/workers-types";

export interface DBEnv {
  DB: D1Database;
  APP_ENV?: string;
  /** Comma-separated allowed CORS origins (the deployed frontend URL). */
  CORS_ORIGIN?: string;
}

export interface AppContext {
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export type AppEnv = { Bindings: DBEnv; Variables: AppContext };
