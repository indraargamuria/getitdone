import { createApp } from "./app";
import type { DBEnv } from "./types";

export default {
  fetch(request: Request, env: DBEnv, ctx: ExecutionContext) {
    return createApp(env).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<DBEnv>;
