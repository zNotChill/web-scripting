import { API } from "./api.ts";
import { dataManager } from "./singleton.ts";
import { Config } from "./types/Config.ts";
import { error } from "./utils/logger.ts";

async function runMain() {
  if (!await dataManager.doesDataExist()) {
    await dataManager.makeFiles();
  }

  const configToml = await dataManager.getConfigToml();
  dataManager.loadedConfigToml = configToml as Config;

  if (!dataManager.loadedConfigToml) {
    error("Configuration loading failed. Exiting...");
    Deno.exit(1);
  }

  console.log(dataManager.loadedConfigToml);

  const api = new API(dataManager.loadedConfigToml);
  api.listen();
}

runMain();