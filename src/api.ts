import { Application, Router } from "./deps.ts";
import { log, success } from "./utils/logger.ts";
import DatabaseConnection from "./database/mongo.ts";
import { discordRoutes } from "./routes/api/discord.ts";
import { dataManager } from "./singleton.ts";
import { Config } from "./types/Config.ts";
import { userRoutes } from "./routes/api/user.ts";
import { join } from "node:path";
import ejs from "npm:ejs";
import { frontendRouter } from "./routes/frontend/frontend.ts";

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
    this.app.use(frontendRouter.routes());

    this.app.listen({ port: this.port });
    success(`API started on PORT ${this.port}`, "API")
  }
}