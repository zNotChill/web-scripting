import { ObjectId } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import DatabaseConnection from "../mongo.ts";

export interface UserSchema {
  _id?: ObjectId;
  access_token: string,
  discord_user: DiscordUser,
  minecraft_user: MinecraftUser,
  max_scripts: number,
}

export interface DiscordUser {
  id: string,
  username: string,
  avatar: string,
  discriminator: string,
  global_name: string,
  avatar_decoration_data: {
    asset: string,
    skuId: string,
    expiresAt: number,
  },
  locale: string,
  mfa_enabled: boolean,
}

export interface MinecraftUser {
  current_username: string,
  uuid: string,
  verified_at: number,
  verified: false,
  code: number,
  code_requested_at: number,
}

class UserModel {
  private static getCollection() {
    const db = DatabaseConnection.getInstance().getDatabase();
    return db.collection("users");
  }

  static async getAllUsers() {
    return await this.getCollection().find().toArray();
  }

  static async createUser(user: UserSchema) {
    const existingUser = await this.getCollection().findOne({ "discord_user.id": user.discord_user.id });

    if (existingUser) {
      await this.getCollection().updateOne(
        { _id: existingUser._id },
        {
          $set: {
            discord_user: user.discord_user,
            access_token: user.access_token,
          },
        }
      );
      return {
        updated: true
      }
    } else {
      await this.getCollection().insertOne(user);
      return {
        inserted: true
      }
    }
  }

  static async getUser(user: Partial<UserSchema>) {
    const userData = await this.getCollection().findOne(user);

    if (!userData) return null;
    return userData;
  }

  static async getUserByCode(code: number) {
    const userData = await this.getCollection().findOne({
      "minecraft_user.code": code,
      "minecraft_user.verified": false
    });

    if (!userData) return null;
    return userData;
  }

  static async getUserByDiscordId(id: string) {
    const userData = await this.getCollection().findOne({
      "discord_user.id": id
    });

    if (!userData) return null;
    return userData;
  }

  static async updateVerification(user: Partial<UserSchema>, username: string, uuid: string, verifiedAt: number, verified: boolean) {
    return await this.getCollection().updateOne(
      user,
      {
        $set: {
          "minecraft_user.current_username": username,
          "minecraft_user.uuid": uuid,
          "minecraft_user.verified_at": verifiedAt,
          "minecraft_user.verified": verified
        }
      }
    );
  }

  static async setVerificationCode(user: Partial<UserSchema>, code: number) {
    return await this.getCollection().updateOne(
      user,
      {
        $set: {
          "minecraft_user.code": code,
          "minecraft_user.code_requested_at": Date.now()
        }
      }
    );
  }
}

export default UserModel;
