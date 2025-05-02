import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ReportRepository } from "../../core/repositories/reportRepository";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const importId = event.pathParameters?.importId;
    if (!importId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'importId is required' })
        };
    }

    const reportRepo = new ReportRepository(docClient, process.env.REPORTS_TABLE!);
    const report = await reportRepo.getById(importId);

    if (!report) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Report not found' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(report)
    };
};