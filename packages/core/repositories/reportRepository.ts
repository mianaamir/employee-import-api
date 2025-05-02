import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ImportReport } from "../types/importReport";

export class ReportRepository {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName: string
  ) { }

  async create(report: Omit<ImportReport, 'completedAt'>): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: report
    }));
  }

  async getById(importId: string): Promise<ImportReport | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { importId }
    }));
    return result.Item as ImportReport | null;
  }
}