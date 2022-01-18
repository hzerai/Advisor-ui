import { ExceptionData } from "./ExceptionData";

export class PalmyraExceptionData extends ExceptionData {
  application: string;
  user: string;
  tenant: string;
  transaction: string;
}
