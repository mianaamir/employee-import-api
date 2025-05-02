import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EmployeeRepository } from "../../core/repositories/employeeRepository";
import { Employee } from '../../core/types/employee';
import { envConfig } from '../../core/config/envConfig';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: SQSEvent) => {
    const employeeRepo = new EmployeeRepository(docClient, envConfig.EMPLOYEES_TABLE);

    for (const record of event.Records) {
        const { accountId, employees } = JSON.parse(record.body);

        if (employees.length > 0) {
            await employeeRepo.batchCreate(employees.map((employee: Employee) => {
                return {
                    ...employee,
                    accountId
                }
            }));
        }
    }
}; 