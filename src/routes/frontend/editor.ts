import { join } from "node:path";
import { API } from "../../api.ts";
import { Router } from "../../deps.ts";
import ejs from "npm:ejs";

export const editorRouter = new Router()
  .get("/editor", async (context) => {
    const data = {
      css: API.getPageDeps([
        join("css", "main.css"),
        join("css", "editor.css")
      ]),
      js: API.getPageDeps([
        join("js", "api.js"),
        join("js", "editor.js"),
      ])
    }

    const html = await ejs.renderFile(
      join(import.meta.dirname || "", "../", "../", "frontend", "views", "editor.ejs"),
      data
    );

    context.response.status = 200;
    context.response.body = html;
  });