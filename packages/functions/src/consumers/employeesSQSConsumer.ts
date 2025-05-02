import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Employee } from '../../../core/types/employee';
import { envConfig } from '../../../core/config/envConfig';
import { EmployeeRepository } from '../../../core/repositories/employeeRepository';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: SQSEvent) => {
    const employeeRepo = new EmployeeRepository(docClient, envConfig.EMPLOYEES_TABLE);

    await Promise.all(event.Records.map(async (record) => {
        try {
            const { accountId, employees } = JSON.parse(record.body);
            if (Array.isArray(employees) && employees.length > 0) {
                await employeeRepo.batchCreate(
                    employees.map((employee: Employee) => ({ ...employee, accountId }))
                );
            }
        } catch (err) {
            console.error('Error processing record:', { body: record.body, err });
        }
    }));
}; 