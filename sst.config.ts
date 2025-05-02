import { SSTConfig } from "sst";
import { EmployeeImportStack } from "./stacks/employeeImportStack";

export default {
  config(_input) {
    return {
      name: "employee-import-api",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(EmployeeImportStack);
  }
} satisfies SSTConfig;


