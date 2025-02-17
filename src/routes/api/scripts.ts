import UserModel from "../../database/models/user.ts";
import { Router } from "../../deps.ts";

const router = new Router();

router.post("/api/scripts/upload", async (context) => {
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