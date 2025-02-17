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
  name: string,
  extension: string,
  content: string
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
    const existingUser = await this.getCollection().findOne({
      "discord_id": script.discord_id,
      "name": script.name
    });

    if (existingUser) {
      return {
        error: true
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

  static async updateScript(scriptQuery: UpdateScriptRequest) {
    const script = await this.getScript(scriptQuery);

    if (!script) {
      return { error: "Script not found" };
    }

    return await this.getCollection().updateOne(
      { _id: script._id },
      {
        $set: {
          "name": scriptQuery.name,
          "extension": scriptQuery.extension,
          "content": scriptQuery.content,
          "last_edit": Date.now(),
          "edit_count": script.edit_count + 1
        }
      }
    );
  }
}

export default ScriptModel;
