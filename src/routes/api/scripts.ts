import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import ScriptModel, { ScriptSchema } from "../../database/models/script.ts";
import UserModel from "../../database/models/user.ts";
import { UserSchema } from "../../database/models/user.ts";
import { Router } from "../../deps.ts";
import { dataManager } from "../../singleton.ts";
import { isScriptBodyValid, isValid, isValidExtension, isWithinSizeLimit } from "../../utils/validation.ts";
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

router.get("/api/scripts/languages", (context) => {
  try {
    context.response.status = 200;
    context.response.body = dataManager.loadedConfigToml?.server.scripting.enabled_languages;
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
    
    const isBodyValid = await isScriptBodyValid(context);

    if (isBodyValid.body?.error) {
      context.response.status = isBodyValid.status;
      context.response.body = isBodyValid.body;
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

    const userScripts = await ScriptModel.getScriptsByUser(query.discord_id);

    if (userScripts.length >= dataManager.loadedConfigToml!.server.scripting.max_scripts_per_user) {
      context.response.status = 400;
      context.response.body = {
        error: "You have reached the max scripts for your user.",
      };
      return;
    }

    if (existingScript) {
      context.response.status = 400;
      context.response.body = {
        error: "An identical script already exists.",
      };
      return;
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
});

router.patch("/api/scripts", async (context) => {
  try {
    const accessToken = await context.cookies.get("access_token");
    const body = await context.request.body.json();
    
    if (
      (!body) ||
      (
        !body.name || !body.extension || !body.content ||
        !body.old_name || !body.old_extension
      )
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
    
    const isBodyValid = await isScriptBodyValid(context);

    if (isBodyValid.body?.error) {
      context.response.status = isBodyValid.status;
      context.response.body = isBodyValid.body;
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
    
    const old_name = body.old_name;
    const old_extension = body.old_extension;
    const name = body.name;
    const extension = body.extension;
    const content = body.content;

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
      name: old_name,
      extension: old_extension,
      discord_id: query.discord_id
    });

    if (!existingScript) {
      context.response.status = 400;
      context.response.body = {
        error: "No existing script to update.",
      };
      return;
    }

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
    
    const updateResult = await ScriptModel.updateScript({
      old_name: old_name,
      old_extension: old_extension,
      old_content: existingScript.content,
      discord_id: query.discord_id,
      new_name: query.name,
      new_extension: query.extension,
      new_content: query.content
    });
    
    context.response.status = 200;
    context.response.body = updateResult;
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
});

router.delete("/api/scripts", async (context) => {
  try {
    const accessToken = await context.cookies.get("access_token");
    const body = await context.request.body.json();
    
    if (
      (!body) ||
      (
        !body.name || !body.extension
      )
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
    
    const isBodyValid = await isScriptBodyValid(context);

    if (isBodyValid.body?.error) {
      context.response.status = isBodyValid.status;
      context.response.body = isBodyValid.body;
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

    const existingScript = await ScriptModel.getScript({
      name: name,
      extension: extension,
      discord_id: user.discord_user.id
    });

    if (!existingScript) {
      context.response.status = 400;
      context.response.body = {
        error: "No existing script to delete.",
      };
      return;
    }

    await ScriptModel.deleteScript(existingScript as ScriptSchema);
    
    context.response.status = 200;
    context.response.body = {
      success: true
    };
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