import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
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

    const seenEmployeeIds = new Set<string>(); // lowercased employeeIds
    const seenPhoneNumbers = new Set<string>();

    const results: EmployeeValidationResult[] = employees.map(employee => {
      const rawEmployeeId = employee.employeeId?.trim() ?? '';
      const normalizedEmployeeId = rawEmployeeId.toLowerCase();
      const phoneNumber = employee.phoneNumber?.trim();

      const localErrors: string[] = [];


      if (rawEmployeeId) {
        if (seenEmployeeIds.has(normalizedEmployeeId)) {
          localErrors.push("Duplicate Employee ID in payload");
        } else {
          seenEmployeeIds.add(normalizedEmployeeId);
        }
      }


      if (phoneNumber) {
        if (seenPhoneNumbers.has(phoneNumber)) {
          localErrors.push("Duplicate phone number in payload");
        } else {
          seenPhoneNumbers.add(phoneNumber);
        }
      }

      const baseValidation = this.validateEmployee(
        employee,
        accountId,
        existingEmployeeIds,
        existingPhoneNumbers
      );

      if (localErrors.length > 0) {
        baseValidation.errors.push(...localErrors);
        baseValidation.isValid = false;
      }

      return baseValidation;
    });

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
    const rawEmployeeId = employee.employeeId?.trim() ?? '';
    const normalizedEmployeeId = rawEmployeeId.toLowerCase();

    // Basic field validations
    if (!rawEmployeeId) errors.push("Employee ID is required");
    if (!employee.firstName?.trim()) errors.push("First name is required");
    if (!employee.lastName?.trim()) errors.push("Last name is required");

    // Check phone number format using libphonenumber-js
    if (employee.phoneNumber) {
      const phone = parsePhoneNumberFromString(employee.phoneNumber);
      if (!phone?.isValid()) errors.push("Invalid phone number");
    }

    if (existingEmployeeIds.has(normalizedEmployeeId)) {
      errors.push("Employee ID must be unique");
    }

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
    const rawEmployeeIds = employees.map(e => e.employeeId?.trim()).filter(Boolean) as string[];
    const phoneNumbers = employees.map(e => e.phoneNumber?.trim()).filter(Boolean) as string[];

    const employeeRepository = new EmployeeRepository(this.docClient, this.tableName);

    // Query existing employee records by employeeIds and phone numbers
    const [existingEmployees, existingPhoneMatches] = await Promise.all([
      employeeRepository.batchGetEmployeeIds(accountId, rawEmployeeIds),
      employeeRepository.getEmployeesByPhoneNumbers(accountId, phoneNumbers)
    ]);

    // Normalize for case-insensitive comparisons
    const existingEmployeeIds = new Set(existingEmployees.map(e => e.employeeId.toLowerCase()));
    const existingPhoneNumbers = new Set(existingPhoneMatches.map(e => e.phoneNumber!));

    return { existingEmployeeIds, existingPhoneNumbers };
  }
}
