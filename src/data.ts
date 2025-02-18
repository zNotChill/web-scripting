import { Config } from "./types/Config.ts";
import { success, error } from "./utils/logger.ts";
import { parse, stringify } from "jsr:@std/toml";

export class DataManager {
  public path = "./data";
  public loadedConfigToml: Config | undefined;

  public defaultConfig: Config = {
    discord: {
      client_id: "none",
      client_secret: "none",
      client_redirect: "none",
      auth_url: "none"
    },
    server: {
      port: 23005,
      admin_key: (Date.now() * Math.random() * 100000).toString(),
      scripting: {
        enabled_languages: ["lua"],
        upload_size_limit_kb: 10,
        max_scripts_per_user: 10,
        individual_edit_cooldown_sec: 10
      },
      mc_verification: {
        code_expire_time_ms: 30000
      }
    },
    mongo: {
      url: "none"
    }
  }

  async doesDataExist() {
    try {
      const stat = await Deno.stat(this.path);
      return stat.isFile || stat.isDirectory;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }

  async makeFiles() {
    await Deno.mkdir(this.path, { recursive: true });

    await Deno.writeTextFile(`${this.path}/config.toml`, this.getConfigTomlTemplate());

    success("Successfully wrote data", "Data");
  }

  getConfigTomlTemplate() {
    return stringify(this.defaultConfig);
  }

  async getConfigToml(): Promise<Config> {
    try {
      const fileContent = await Deno.readTextFile(`${this.path}/config.toml`);
      const parsedData = parse(fileContent) as Partial<Config>;

      this.loadedConfigToml = this.mergeWithDefaultConfig(parsedData);

      return this.loadedConfigToml;
    } catch (errormsg) {
      error(`Error reading config file. ${errormsg}`);
      return this.defaultConfig;
    }
  }
  
  private mergeWithDefaultConfig(config: Partial<Config>): Config {
    return {
      discord: { ...this.defaultConfig.discord, ...config.discord },
      server: {
        ...this.defaultConfig.server,
        ...config.server,
        scripting: {
          ...this.defaultConfig.server.scripting,
          ...(config.server?.scripting || {}),
        },
        mc_verification: {
          ...this.defaultConfig.server.mc_verification,
          ...(config.server?.mc_verification || {}),
        },
      },
      mongo: { ...this.defaultConfig.mongo, ...config.mongo },
    };
  }
}