import { DynamoDBDocumentClient, BatchWriteCommand, BatchGetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Employee } from "../types/employee";
import _ from "lodash";

export class EmployeeRepository {
    constructor(
        private readonly docClient: DynamoDBDocumentClient,
        private readonly tableName: string
    ) { }

    async batchCreate(employees: Employee[]): Promise<void> {

        const BATCH_SIZE = 25  // DynamoDB limit max 25 items per batch write
        const batches = _.chunk(employees, BATCH_SIZE);

        for (const batch of batches) {
            await this.docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [this.tableName]: batch.map(emp => ({
                        PutRequest: { Item: emp }
                    }))
                }
            }));
        }
    }

    async batchGetEmployeeIds(accountId: string, employeeIds: string[]): Promise<Employee[]> {
        if (employeeIds.length === 0) return [];

        const distinctEmployeeIds = [...new Set(employeeIds)];
        const BATCH_SIZE = 100; // DynamoDB limit for batch get
        const results = [];

        const chunks = _.chunk(distinctEmployeeIds, BATCH_SIZE);
        for (const chunk of chunks) {
            const response = await this.docClient.send(new BatchGetCommand({
                RequestItems: {
                    [this.tableName]: {
                        Keys: chunk.map(employeeId => ({ accountId, employeeId })),
                        ConsistentRead: true
                    }
                }
            }));
            results.push(...(response.Responses?.[this.tableName] || []));
        }

        return results as Employee[];
    }

    async getEmployeesByPhoneNumbers(accountId: string, phoneNumbers: string[]): Promise<Employee[]> {
        if (phoneNumbers.length === 0) return [];

        const distinctNumbers = [...new Set(phoneNumbers)];
        const results = [];

        for (const phone of distinctNumbers) {
            const response = await this.docClient.send(new QueryCommand({
                TableName: this.tableName,
                IndexName: 'PhoneNumberIndex',
                KeyConditionExpression: 'accountId = :accountId AND phoneNumber = :phone',
                ExpressionAttributeValues: {
                    ':accountId': accountId,
                    ':phone': phone
                },
                Limit: 1
            }));
            if (response.Items?.length) results.push(response.Items[0]);
        }

        return results as Employee[];
    }
}
