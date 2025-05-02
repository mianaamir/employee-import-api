import { StackContext, Api, Table, Queue } from "sst/constructs";

export function EmployeeImportStack({ stack }: StackContext) {
  const employeesTable = new Table(stack, "Employees", {
    fields: {
      accountId: "string",
      employeeId: "string",
      phoneNumber: "string"
    },
    primaryIndex: { partitionKey: "accountId", sortKey: "employeeId" },
    globalIndexes: {
      PhoneNumberIndex: {
        partitionKey: "accountId",
        sortKey: "phoneNumber"
      }
    },
  });

  const importReportsTable = new Table(stack, "ImportReports", {
    fields: {
      importId: "string",
    },
    primaryIndex: { partitionKey: "importId" },
  });

  const queue = new Queue(stack, "EmployeeQueue", {
    consumer: {
      function: {
        handler: "packages/functions/src/employeesSQSConsumer.handler",
        bind: [employeesTable, importReportsTable],
        environment: {
          EMPLOYEES_TABLE: employeesTable.tableName,
          REPORTS_TABLE: importReportsTable.tableName,
          BATCH_SIZE: "25"
        },
      },
    },
  });

  const api = new Api(stack, "EmployeeImportAPI", {
    defaults: {
      function: {
        bind: [employeesTable, importReportsTable, queue],
        environment: {
          EMPLOYEES_TABLE: employeesTable.tableName,
          REPORTS_TABLE: importReportsTable.tableName,
          QUEUE_URL: queue.queueUrl
        }
      },
    },
    routes: {
      "POST /import": "packages/functions/src/importEmployeesHandler.handler",
      "GET /report/{importId}": "packages/functions/src/reportHandler.handler",
    },
  });

  api.attachPermissions([employeesTable, importReportsTable, queue]);
  queue.attachPermissions([importReportsTable, employeesTable])

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
