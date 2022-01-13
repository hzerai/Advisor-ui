import { Event } from "./Event";
import { ExceptionData } from "./ExceptionData";

export class Exception {
  logFile : string;
  key : string;
  event: Event;
  exception: ExceptionData;
  child: Exception = null;
  hint: string = null;
  todo: string = null;
  message: string = null;
  text: string = null;
  firstOccurence: Date = null;
  lastOccurence: Date = null;
  count: number;
}
