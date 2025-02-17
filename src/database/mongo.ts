import { MongoClient, Database } from "../deps.ts";
import { success } from "../utils/logger.ts";

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient;
  private db!: Database;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new MongoClient();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(uri: string, dbName: string) {
    if (this.isConnected) return;
    await this.client.connect(uri);

    this.db = this.client.database(dbName);
    this.isConnected = true;
    
    success(`Connected to MongoDB`, "Database");
  }

  getDatabase(): Database {
    if (!this.db) {
      throw new Error("Database not connected.");
    }
    return this.db;
  }
}

export default DatabaseConnection;
