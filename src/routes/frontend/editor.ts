import { join } from "node:path";
import { API } from "../../api.ts";
import { Router } from "../../deps.ts";
import ejs from "npm:ejs";
import UserModel from "../../database/models/user.ts";
import { sanitize } from "../../utils/sanitize.ts";

export const editorRouter = new Router()
  .get("/editor", async (context) => {
    const data = {
      css: API.getPageDeps([
        join("css", "main.css"),
        join("css", "editor.css")
      ]),
      js: API.getPageDeps([
        join("js", "utils.js"),
        join("js", "api.js"),
        join("js", "editor.js"),
      ]),
      user: sanitize(await UserModel.getUser({
        access_token: await context.cookies.get("access_token") || ""
      })) || {}
    }

    const html = await ejs.renderFile(
      join(import.meta.dirname || "", "../", "../", "frontend", "views", "editor.ejs"),
      data
    );

    context.response.status = 200;
    context.response.body = html;
  });