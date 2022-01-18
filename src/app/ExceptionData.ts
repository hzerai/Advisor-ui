export class ExceptionData {
  name: string;
  message: string;
  level: string;
  logger: string;
  thread: string;
  date: Date;
  stackTrace: string;
  logFile: string;
  causedBy: string[] = [];
  framework : string;
}
