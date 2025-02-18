import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import ScriptModel, { ScriptSchema } from "../../database/models/script.ts";
import UserModel from "../../database/models/user.ts";
import { UserSchema } from "../../database/models/user.ts";
import { Router } from "../../deps.ts";
import { dataManager } from "../../singleton.ts";
import { isValid, isValidExtension, isWithinSizeLimit } from "../../utils/validation.ts";
import { Script } from "node:vm";

const router = new Router();

export async function getMyScripts(context: Context) {
  try {
    const accessToken = await context.cookies.get("access_token");

    if (!accessToken) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid access token"
      };
      return;
    }
  
    const user = await UserModel.getUser({
      access_token: accessToken
    }) as UserSchema;
  
    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }

    const scripts = await ScriptModel.getScriptsByUser(user.discord_user.id);

    context.response.status = 200;
    context.response.body = scripts;
  } catch (error) {
    context.response.status = 400;
    if (error instanceof Error) {
      context.response.body = {
        error: `${error.message}`
      }
    } else {
      context.response.status = 500;
      context.response.body = {
        error: "An unknown error occurred"
      };
    }
  }
}

router.post("/api/scripts", async (context) => {
  try {
    const accessToken = await context.cookies.get("access_token");
    const body = await context.request.body.json();
  
    if (
      (!body) ||
      (!body.name || !body.extension || !body.content)
    ) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid body"
      };
      return;
    }

    if (!accessToken) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid access token"
      };
      return;
    }
  
    const user = await UserModel.getUser({
      access_token: accessToken
    }) as UserSchema;
  
    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }

    const name = body.name;
    const extension = body.extension;
    const content = body.content;

    // Name Validation

    if (name.length < 1 || name.length > 20) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid file name length.",
        tip: "between 1-20 characters"
      };
      return;
    }

    if (!isValid(name)) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid file name.",
      };
      return;
    }

    // Extension Validation

    if (extension.length < 1 || extension.length > 10) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid file extension length.",
        tip: "between 1-10 characters"
      };
      return;
    }

    if (!isValidExtension(extension)) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid file extension.",
      };
      return;
    }

    if (!isWithinSizeLimit(content, dataManager.loadedConfigToml?.server.scripting.upload_size_limit_kb)) {
      context.response.status = 400;
      context.response.body = {
        error: "File is too large.",
        tip: "less than 10kb"
      };
      return;
    }

    const query: ScriptSchema = {
      name: name,
      extension: extension,
      content: content,
      discord_id: user.discord_user.id,
      first_uploaded: Date.now(),
      last_edit: 0,
      edit_count: 0
    };

    const existingScript = await ScriptModel.getScript({
      name: query.name,
      extension: query.extension,
      discord_id: query.discord_id
    });

    if (existingScript) {
      const last_edit = existingScript.last_edit / 1000;
      const now = Date.now() / 1000;
      const edit_cooldown = dataManager.loadedConfigToml!.server.scripting.individual_edit_cooldown_sec;

      if (now - last_edit < edit_cooldown) {
        context.response.status = 429;
        context.response.body = {
          error: "You are being rate limited.",
          tip: `wait ${((last_edit + edit_cooldown) - now).toFixed(2)} seconds to edit again`
        };
        return;
      }
    }

    const insertResult = await ScriptModel.createScript(query);

    if (insertResult.error) {
      context.response.status = 400;
      context.response.body = {
        error: "A script of yours already has this name.",
      };
      return;
    }

    context.response.status = 200;
    context.response.body = insertResult;
  } catch (error) {
    context.response.status = 400;
    if (error instanceof Error) {
      context.response.body = {
        error: `${error.message}`
      }
    } else {
      context.response.status = 500;
      context.response.body = {
        error: "An unknown error occurred"
      };
    }
  }
})

export const scriptRoutes = router;