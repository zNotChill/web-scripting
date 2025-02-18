import { ObjectId } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import DatabaseConnection from "../mongo.ts";

export interface ScriptSchema {
  _id?: ObjectId;
  name: string,
  extension: string,
  content: string,
  discord_id: string,
  first_uploaded: number,
  last_edit: number,
  edit_count: number,
}

export interface UpdateScriptRequest {
  old_name: string,
  old_extension: string,
  old_content: string,
  discord_id: string,
  new_name: string,
  new_extension: string,
  new_content: string,
}

class ScriptModel {
  private static getCollection() {
    const db = DatabaseConnection.getInstance().getDatabase();
    return db.collection("scripts");
  }

  static async getAllUsers() {
    return await this.getCollection().find().toArray();
  }

  static async createScript(script: ScriptSchema) {
    const existingScript = await this.getCollection().findOne({
      "discord_id": script.discord_id,
      "name": script.name,
      "extension": script.extension,
    });

    let existingScriptSelection;
    let scriptSelection;

    if (existingScript) {
      delete existingScript['_id'];

      existingScriptSelection = {
        name: existingScript.name,
        extension: existingScript.extension,
        content: existingScript.content,
        discord_id: existingScript.discord_id
      }

      scriptSelection = {
        name: script.name,
        extension: script.extension,
        content: script.content,
        discord_id: script.discord_id
      }
    }

    // The script already exists or nothing changed
    if (existingScript && existingScriptSelection === scriptSelection) {
      return {
        error: true
      }
    }

    if (existingScript && existingScriptSelection !== scriptSelection) {
      await this.updateScript({
        old_name: existingScript.name,
        old_extension: existingScript.extension,
        old_content: existingScript.content,
        discord_id: existingScript.discord_id,
        new_name: script.name,
        new_extension: script.extension,
        new_content: script.content
      });
      
      return {
        updated: true
      }
    }

    await this.getCollection().insertOne(script);
    return {
      inserted: true
    }
  }

  static async getScript(script: Partial<ScriptSchema>) {
    const scriptData = await this.getCollection().findOne(script);

    if (!scriptData) return null;
    return scriptData;
  }

  static async getScriptsByUser(discord_id: string) {
    const scripts = await this.getCollection().find({
      discord_id
    })

    return scripts.map((script) => {
      delete script["_id"];
      return script;
    });
  }

  static async updateScript(scriptQuery: UpdateScriptRequest) {
    const script = await this.getScript({
      name: scriptQuery.old_name,
      extension: scriptQuery.old_extension,
      content: scriptQuery.old_content,
      discord_id: scriptQuery.discord_id
    });
    
    if (!script) {
      return { error: "Script not found" };
    }

    return await this.getCollection().updateOne(
      {
        name: script.name,
        extension: script.extension,
        discord_id: script.discord_id
      },
      {
        $set: {
          "name": scriptQuery.new_name,
          "extension": scriptQuery.new_extension,
          "content": scriptQuery.new_content,
          "last_edit": Date.now(),
          "edit_count": script.edit_count + 1
        }
      }
    );
  }
}

export default ScriptModel;
