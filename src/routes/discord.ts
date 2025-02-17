import UserModel, { DiscordUser, UserSchema } from "../database/models/user.ts";
import { Router } from "../deps.ts";
import { dataManager } from "../singleton.ts";
import { Config } from "../types/Config.ts";

const configToml = await dataManager.getConfigToml() as Config;

const clientID = configToml.discord.client_id;
const clientSecret = configToml.discord.client_secret;
const redirectURI = configToml.discord.client_redirect;
const authURL = configToml.discord.auth_url;

const router = new Router();

router.get("/api/auth/discord/login", (context) => {
  context.response.redirect(authURL);
});

router.get("/api/auth/discord/callback", async (context) => {
  const urlParams = new URLSearchParams(context.request.url.search);
  const code = urlParams.get("code");

  if (code) {
    try {
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: clientID,
          client_secret: clientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: redirectURI,
        }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        context.response.status = 400;
        context.response.body = {
          error: "Invalid code"
        };
        return;
      }
      
      const accessToken = tokenData.access_token;

      const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userData = await userResponse.json() as DiscordUser;
      const userSchema: UserSchema = {
        access_token: accessToken,
        discord_user: {
          id: userData.id,
          username: userData.username,
          avatar: userData.avatar,
          discriminator: userData.discriminator,
          global_name: userData.global_name,
          avatar_decoration_data: userData.avatar_decoration_data,
          locale: userData.locale,
          mfa_enabled: userData.mfa_enabled
        },
        minecraft_user: {
          current_username: "",
          uuid: "",
          verified_at: 0,
          verified: false,
          code: 0,
          code_requested_at: 0
        },
        max_scripts: dataManager.loadedConfigToml?.server.scripting.max_scripts || 10
      }

      await UserModel.createUser(userSchema);

      context.cookies.set("access_token", accessToken, {
        maxAge: 86400 * 7,
      });
      context.response.redirect("/");
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
  } else {
    context.response.status = 400;
    context.response.body = {
      error: "No code received"
    };
  }
})

export const discordRoutes = router;