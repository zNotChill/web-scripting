import { Router } from "../../deps.ts";
import UserModel, { UserSchema } from "../../database/models/user.ts";
import { dataManager } from "../../singleton.ts";
import { getRandomCode } from "../../utils/code.ts";
import { sanitize } from "../../utils/sanitize.ts";
import { getMyScripts } from "./scripts.ts";
import ScriptModel from "../../database/models/script.ts";

const router = new Router();

router.get("/api/users/@me", async (context) => {
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
    });
  
    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }
  
    context.response.status = 200;
    context.response.body = sanitize(user);
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

router.get("/api/users/@me/code", async (context) => {
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
    
    if (
      user.minecraft_user.code_requested_at + 
      (dataManager.loadedConfigToml?.server.mc_verification.code_expire_time_ms ?? 0)
      > Date.now()
    ) {
      const timeRemaining = 
        Math.ceil(
          (user.minecraft_user.code_requested_at + 
          (dataManager.loadedConfigToml?.server.mc_verification.code_expire_time_ms ?? 0) - 
          Date.now()) / 1000
        );
  
      context.response.status = 429;
      context.response.body = {
        code: user.minecraft_user.code,
        error: `Requesting codes too fast.`,
        try_again: timeRemaining,
        unit: "seconds"
      };
      return;
    }
  
    const code = getRandomCode();
    const updateResult = await UserModel.setVerificationCode(user, code);
  
    if (updateResult.modifiedCount === 0) {
      context.response.status = 500;
      context.response.body = {
        error: "Failed to push verification code"
      };
      return;
    }
  
    context.response.status = 200;
    context.response.body = {
      code
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
});

router.get("/api/users/findCode", async (context) => {
  try {
    const adminKey = await context.cookies.get("admin_key");
    const urlParams = new URLSearchParams(context.request.url.search);
    const code = urlParams.get("code");
  
    if (adminKey !== dataManager.loadedConfigToml?.server.admin_key) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid key"
      };
      return;
    }

    if (!code || !parseFloat(code)) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid data"
      };
      return;
    }
  
    const user = await UserModel.getUserByCode(parseFloat(code)) as UserSchema;
    
    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }
  
    context.response.status = 200;
    context.response.body = sanitize(user);
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

router.post("/api/users/verify", async (context) => {
  try {
    const adminKey = await context.cookies.get("admin_key");
    const body = await context.request.body.json();
  
    if (adminKey !== dataManager.loadedConfigToml?.server.admin_key) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid key"
      };
      return;
    }

    if (
      (!body) ||
      (!body.code || !body.uuid || !body.username)
    ) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid body"
      };
      return;
    }

    if (
      typeof body.code !== "number" ||
      typeof body.uuid !== "string" ||
      typeof body.username !== "string"
    ) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid body"
      };
      return;
    }
    
    const user = await UserModel.getUserByCode(parseFloat(body.code)) as UserSchema;

    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }

    if (user.minecraft_user.verified) {
      context.response.status = 400;
      context.response.body = {
        error: "User is already verified"
      };
      return;
    }

    const updateResult = await UserModel.updateVerification(
      user,
      body.username,
      body.uuid,
      Date.now(),
      true
    );

    if (updateResult.modifiedCount === 0) {
      context.response.status = 500;
      context.response.body = {
        error: "Failed to push verification status"
      };
      return;
    }

    context.response.status = 200;
    context.response.body = {
      success: true,
      user: sanitize(user)
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
});

router.get("/api/users/@me/scripts", getMyScripts);

router.get("/api/users/:id", async (context) => {
  try {
    const adminKey = await context.cookies.get("admin_key");
    const urlParams = new URLSearchParams(context.request.url.search);
    const useUUID = urlParams.get("useUUID");
    const discordId = context.params.id;

    if (!discordId) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid body"
      };
      return;
    }
    
    if (!adminKey || adminKey !== dataManager.loadedConfigToml?.server.admin_key) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid admin key"
      };
      return;
    }

    let user;

    if (useUUID === "true") {
      user = await UserModel.getUserByUUID(discordId) as UserSchema;
    } else {
      user = await UserModel.getUserByDiscordId(discordId) as UserSchema;
    }
    
    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }
    
    context.response.status = 200;
    context.response.body = sanitize(user);
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

router.get("/api/users/:id/scripts", async (context) => {
  try {
    const adminKey = await context.cookies.get("admin_key");
    const urlParams = new URLSearchParams(context.request.url.search);
    const useUUID = urlParams.get("useUUID");
    const formatted = urlParams.get("formatted");
    const discordId = context.params.id;

    if (!discordId) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid body"
      };
      return;
    }
    
    if (!adminKey || adminKey !== dataManager.loadedConfigToml?.server.admin_key) {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid admin key"
      };
      return;
    }

    let user;

    if (useUUID === "true") {
      user = await UserModel.getUserByUUID(discordId) as UserSchema;
    } else {
      user = await UserModel.getUserByDiscordId(discordId) as UserSchema;
    }
    
    if (!user) {
      context.response.status = 400;
      context.response.body = {
        error: "User does not exist"
      };
      return;
    }

    const userScripts = await ScriptModel.getScriptsByUser(user.discord_user.id);
    
    context.response.status = 200;
    
    if (formatted === "true") {
      context.response.body = {
        scripts: userScripts
      }
      return;
    }
    context.response.body = userScripts;
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

export const userRoutes = router;