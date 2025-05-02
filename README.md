# Employee Import API


## Features

- Bulk import of employee data  
- Validation of individual employee records  
- Import summary reports (success/failure counts)  
- Error tracking for invalid records  

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
