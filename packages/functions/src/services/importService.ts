import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ReportRepository } from '../../../core/repositories/reportRepository';
import { Employee } from '../../../core/types/employee';
import { EmployeeValidationResult } from '../../../core/types/importReport';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import { EmployeeValidator } from 'src/utils/employeeValidator';

export class ImportService {
    constructor(
        private readonly validator: EmployeeValidator,
        private readonly reportRepository: ReportRepository,
        private readonly sqs: SQSClient,
        private readonly queueUrl: string
    ) { }

    async processImport(accountId: string, employees: Partial<Employee>[]) {
        const { validEmployees, invalidEmployees } = await this.validator.validateEmployees(accountId, employees);

        const importId = await this.createImportReport(accountId, employees.length, validEmployees.length, invalidEmployees);

        await this.queueValidEmployees(importId, accountId, validEmployees);

        return { importId, validCount: validEmployees.length, invalidCount: invalidEmployees.length };
    }

    private async createImportReport(
        accountId: string,
        totalEmployees: number,
        validCount: number,
        invalidEmployees: EmployeeValidationResult[]
    ): Promise<string> {
        const importId = uuidv4();

        await this.reportRepository.create({
            importId,
            accountId,
            totalEmployees,
            successfulImports: validCount,
            failedImports: invalidEmployees.length,
            errors: invalidEmployees.map(({ employee, errors }) => ({
                employeeId: employee.employeeId,
                errors
            })),
            createdAt: new Date().toISOString()
        });

        return importId;
    }

    private async queueValidEmployees(importId: string, accountId: string, employees: Employee[]): Promise<void> {
        const BATCH_SIZE = 25;
        const chunks = _.chunk(employees, BATCH_SIZE);
        const promises = chunks.map(async (chunk) => {
            try {
                await this.sqs.send(new SendMessageCommand({
                    QueueUrl: this.queueUrl,
                    MessageBody: JSON.stringify({ importId, accountId, employees: chunk })
                }));
            } catch (err) {
                console.error(`Failed to send SQS message for importId ${importId}`, err);
            }
        });
        await Promise.all(promises);
    }
}