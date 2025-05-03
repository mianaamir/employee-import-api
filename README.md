# Employee Import API


## Features

- Bulk import of employee data  
- Validation of individual employee records  
- Import summary reports (success/failure counts)  
- Error tracking for invalid records  


## API Flow

1. **Import Endpoint (`/import`)**  
   - Accepts a JSON payload containing employee data.
   - Validates each employee record for correctness using the `EmployeeValidator`.
   - **Batch Processing**:
     - Valid employee records are grouped into batches of 25.
     - Each batch is sent as a single message to an Amazon SQS queue.
   - The SQS queue processes the data and writes it to the DynamoDB `Employees` table in batches, ensuring efficient handling of large datasets.
   - Simultaneously, an entry is created in the `Reports` table to track the import job's progress and generate a detailed report.

2. **Report Endpoint (`/report/{importId}`)**  
   - Fetches the detailed report of a specific import job.
   - The report includes the total number of employees, successful imports, failed imports, and error details for invalid records.


## Usage

### `/import` Endpoint

Upload a JSON payload with employee data to start an import job.

> Note: In a real-world application, `accountId` should be extracted from JWT claims. For this exercise, it is passed in the request body.

#### Sample Request Payload

```json
{
  "accountId": "12345",
  "employees": [
    {
      "id": "E-1",
      "firstName": "John",
      "LastName": "Doe",
      "phoneNumber": "+4911111111111"
    },
    {
      "id": "E-2",
      "firstName": "Test",
      "LastName": "Name"
    }
  ]
}
```

#### Sample `/import` Endpoint response
```json
{
  "importId": "76bc2494-0727-4ca6-83fe-83d8d85905e5",
  "message": "Employee import process has been started. Has 2 valid and 0 invalid employees"
}
```

### /report/{importId} Endpoint

Fetches the detailed report of a specific import.

#### Sample Response

```json
{
  "successfulImports": 0,
  "accountId": "acc-889",
  "importId": "77579c26-183a-4c16-b8ea-ca800a3e2cac",
  "failedImports": 2,
  "errors": [
    {
      "employeeId": "emp-1",
      "errors": [
        "Employee ID must be unique"
      ]
    },
    {
      "employeeId": "emp-1222",
      "errors": [
        "Employee ID must be unique"
      ]
    }
  ],
  "createdAt": "2025-05-02T23:53:23.674Z",
  "totalEmployees": 2
}
```


