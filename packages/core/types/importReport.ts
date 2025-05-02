import { Employee } from "./employee";

export interface ImportReport {
    importId: string;
    accountId: string;
    totalEmployees: number;
    successfulImports: number;
    failedImports: number;
    errors: EmployeeError[];
    createdAt: string;
    completedAt?: string;
}

export interface EmployeeError {
    employeeId?: string;
    errors: string[];
}

export interface EmployeeValidationResult {
    isValid: boolean;
    employee: Employee;
    errors: string[];
}

export interface BulkValidationResult {
    validEmployees: Employee[];
    invalidEmployees: EmployeeValidationResult[];
}
