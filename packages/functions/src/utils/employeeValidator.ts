import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DynamoDBDocumentClient, BatchGetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BulkValidationResult, EmployeeValidationResult } from '../../../core/types/importReport';
import { Employee } from '../../../core/types/employee';
import { EmployeeRepository } from '../../../core/repositories/employeeRepository';

export class EmployeeValidator {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName: string
  ) { }

  async validateEmployees(accountId: string, employees: Partial<Employee>[]): Promise<BulkValidationResult> {

    const { existingEmployeeIds, existingPhoneNumbers } = await this.checkUniqueness(accountId, employees);


    const results: EmployeeValidationResult[] = employees.map(emp =>
      this.validateEmployee(emp, accountId, existingEmployeeIds, existingPhoneNumbers)
    );

    return {
      validEmployees: results.filter(r => r.isValid).map(r => r.employee),
      invalidEmployees: results.filter(r => !r.isValid)
    };
  }

  private validateEmployee(
    employee: Partial<Employee>,
    accountId: string,
    existingEmployeeIds: Set<string>,
    existingPhoneNumbers: Set<string>
  ): EmployeeValidationResult {
    const errors: string[] = [];
    const employeeId = employee.employeeId?.trim() || '';


    if (!employeeId) errors.push("Employee ID is required");
    if (!employee.firstName?.trim()) errors.push("First name is required");
    if (!employee.lastName?.trim()) errors.push("Last name is required");


    if (employee.phoneNumber) {
      const phone = parsePhoneNumberFromString(employee.phoneNumber);
      if (!phone?.isValid()) errors.push("Invalid phone number");
    }


    if (existingEmployeeIds.has(employeeId)) errors.push("Employee ID must be unique");
    if (employee.phoneNumber && existingPhoneNumbers.has(employee.phoneNumber)) {
      errors.push("Phone number must be unique");
    }

    return {
      isValid: errors.length === 0,
      employee: {
        ...employee as Required<Omit<Employee, 'phoneNumber'>>,
        accountId,
        phoneNumber: employee.phoneNumber
      },
      errors
    };
  }

  private async checkUniqueness(accountId: string, employees: Partial<Employee>[]) {
    const employeeIds = employees.map(e => e.employeeId).filter(Boolean) as string[];
    const phoneNumbers = employees.map(e => e.phoneNumber).filter(Boolean) as string[];

    const employeeRepository = new EmployeeRepository(this.docClient, this.tableName)
    const [existingEmployees, existingPhoneNumbers] = await Promise.all([
      employeeRepository.batchGetEmployeeIds(accountId, employeeIds),
      employeeRepository.getEmployeesByPhoneNumbers(accountId, phoneNumbers)
    ]);

    return {
      existingEmployeeIds: new Set(existingEmployees.map(e => e.employeeId)),
      existingPhoneNumbers: new Set(existingPhoneNumbers.map(e => e.phoneNumber!))
    };
  }

  // private async batchGetEmployeeIds(accountId: string, employeeIds: string[]) {
  //   if (employeeIds.length === 0) return [];

  //   const BATCH_SIZE = 100;
  //   const results = [];

  //   for (let i = 0; i < employeeIds.length; i += BATCH_SIZE) {
  //     const batch = employeeIds.slice(i, i + BATCH_SIZE);
  //     const response = await this.docClient.send(new BatchGetCommand({
  //       RequestItems: {
  //         [this.tableName]: {
  //           Keys: batch.map(employeeId => ({ accountId, employeeId })),
  //           ConsistentRead: true
  //         }
  //       }
  //     }));
  //     results.push(...(response.Responses?.[this.tableName] || []));
  //   }

  //   return results;
  // }

  // private async queryPhoneNumbers(accountId: string, phoneNumbers: string[]) {
  //   if (phoneNumbers.length === 0) return [];

  //   const uniqueNumbers = [...new Set(phoneNumbers)];
  //   const results = [];

  //   for (const phone of uniqueNumbers) {
  //     const response = await this.docClient.send(new QueryCommand({
  //       TableName: this.tableName,
  //       IndexName: 'PhoneNumberIndex',
  //       KeyConditionExpression: 'accountId = :accountId AND phoneNumber = :phone',
  //       ExpressionAttributeValues: {
  //         ':accountId': accountId,
  //         ':phone': phone
  //       },
  //       Limit: 1
  //     }));
  //     if (response.Items?.length) results.push(response.Items[0]);
  //   }

  //   return results;
  // }
}