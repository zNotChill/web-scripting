import { Config } from "./types/Config.ts";
import { success } from "./utils/logger.ts";
import { parse } from "jsr:@std/toml";

export class DataManager {
  public path = "./data";
  public loadedConfigToml: Config | undefined;

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
    return [
      "[discord]",
      "client_id = \"none\"",
      "client_secret = \"none\"",
      "client_redirect = \"none\"",
      "auth_url = \"none\"",
      "",
      "[server]",
      "port = 23005",
      "",
      "[mongo]",
      "url = \"none\""
    ].join("\n");
  }

  async getConfigToml() {
    const fileContent = await Deno.readTextFile(`${this.path}/config.toml`);
    const data = parse(fileContent);

    return data;
  }
}