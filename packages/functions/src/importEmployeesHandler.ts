import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import { ReportRepository } from "../../core/repositories/reportRepository";
import _ from 'lodash';
import { ImportService } from './services/importService';
import { EmployeeValidator } from './utils/employeeValidator';

import { envConfig } from '../../core/config/envConfig'


const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Request body is required' })
            };
        }

        const { accountId, employees } = JSON.parse(event.body);

        if (!accountId || !Array.isArray(employees)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid request format' })
            };
        }

        if (employees.length > 10000) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Maximum 10,000 employees per request' }) };
        }

        const validator = new EmployeeValidator(docClient, envConfig.EMPLOYEES_TABLE);
        const reportRepository = new ReportRepository(docClient, envConfig.REPORTS_TABLE);
        const importService = new ImportService(
            validator,
            reportRepository,
            sqs,
            envConfig.QUEUE_URL
        );

        const { importId, validCount, invalidCount } = await importService.processImport(
            accountId,
            employees
        );

        return {
            statusCode: 202,
            body: JSON.stringify({
                importId,
                message: `Employee import process has been started. Has ${validCount} valid and ${invalidCount} invalid employees`
            })
        };


    }
    catch (error) {
        console.error('Import failed:', error);
        console.log('Error stack : ', error instanceof Error ? error.stack : '')
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            })
        };
    }

};
