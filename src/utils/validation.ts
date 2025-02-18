import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { dataManager } from "../singleton.ts";

export function isValid(str: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(str);
}

export function isValidExtension(str: string): boolean {
  return /^[a-zA-Z0-9]{1,5}$/.test(str);
}

export function isWithinSizeLimit(str: string, limitKB: number = 10) {
  const blob = new Blob([str]);
  return blob.size <= limitKB * 1024;
}

export async function isScriptBodyValid(context: Context) {
  const body = await context.request.body.json();
  const name = body.name;
  const extension = body.extension;
  const content = body.content;

  // Name Validation

  if (name.length < 1 || name.length > 20) {
    return {
      status: 400,
      body: {
        error: "Invalid file name length.",
        tip: "between 1-20 characters"
      }
    };
  }

  if (!isValid(name)) {
    return {
      status: 400,
      body: {
        error: "Invalid file name.",
      }
    }
  }

  // Extension Validation

  if (extension.length < 1 || extension.length > 10) {
    context.response.status = 400;
    context.response.body = {
      error: "Invalid file extension length.",
      tip: "between 1-10 characters"
    };

    return {
      status: 400,
      body: {
        error: "Invalid file extension length.",
        tip: "between 1-10 characters"
      }
    };
  }

  if (!isValidExtension(extension)) {
    return {
      status: 400,
      body: {
        error: "Invalid file extension.",
      }
    };
  }

  if (!isWithinSizeLimit(content, dataManager.loadedConfigToml?.server.scripting.upload_size_limit_kb)) {
    return {
      status: 400,
      body: {
        error: "File is too large.",
        tip: "less than 10kb"
      }
    };
  }

  return {
    success: true
  }
}