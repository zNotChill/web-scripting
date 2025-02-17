import { Application } from "./deps.ts";
import { log, success } from "./utils/logger.ts";
import DatabaseConnection from "./database/mongo.ts";
import { discordRoutes } from "./routes/discord.ts";
import { dataManager } from "./singleton.ts";
import { Config } from "./types/Config.ts";
import { userRoutes } from "./routes/user.ts";

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

  async listen() {
    await this.db.connect(dataManager.loadedConfigToml!.mongo.url, "data");

    this.middleware();
    this.app.use(discordRoutes.routes());
    this.app.use(userRoutes.routes());

    this.app.listen({ port: this.port });
    success(`API started on PORT ${this.port}`, "API")
  }
}