import { Application } from "./deps.ts";
import { log, success } from "./utils/logger.ts";
import DatabaseConnection from "./database/mongo.ts";
import { discordRoutes } from "./routes/api/discord.ts";
import { dataManager } from "./singleton.ts";
import { Config } from "./types/Config.ts";
import { userRoutes } from "./routes/api/user.ts";
import { join } from "node:path";
import { frontendRoutes } from "./routes/frontend/frontend.ts";
import { scriptRoutes } from "./routes/api/scripts.ts";
import { scriptAdminRoutes } from "./routes/api/scriptsAdmin.ts";

export class API {
  private app: Application;
  private db: DatabaseConnection;
  public port: number;
  public loadedConfigToml: Config;

  constructor(config: Config) {
    this.loadedConfigToml = config;
    this.app = new Application();
    this.db = DatabaseConnection.getInstance();
    
    this.port = dataManager.loadedConfigToml!.server.port;
  }

  middleware() {
    this.app.use(async (ctx, next) => {
      await next();
      const rt = ctx.response.headers.get("X-Response-Time");

      log(`${ctx.request.method} ${ctx.request.url} - ${rt}`, "API");
    })
    
    this.app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      ctx.response.headers.set("X-Response-Time", `${ms}ms`);
    });

    
    this.app.use(async (ctx, next) => {
      ctx.response.headers.set("Access-Control-Allow-Origin", "*");
      ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
      if (ctx.request.method === "OPTIONS") {
        ctx.response.status = 204;
        return;
      }
    
      await next();
    });
  }

  static getPageDeps(files: string[]) {
    const staticDir = join(import.meta.dirname || "", "frontend", "static");
    const staticFiles = files.map((file) => {
      return Deno.readTextFileSync(join(staticDir, file));
    })

    return staticFiles.join("\n");
  }

  async listen() {
    await this.db.connect(dataManager.loadedConfigToml!.mongo.url, "data");

    this.middleware();
    this.app.use(discordRoutes.routes());
    this.app.use(userRoutes.routes());
    this.app.use(scriptRoutes.routes());
    this.app.use(scriptAdminRoutes.routes());
    this.app.use(frontendRoutes.routes());

    this.app.listen({ port: this.port });
    success(`API started on PORT ${this.port}`, "API")
  }
}