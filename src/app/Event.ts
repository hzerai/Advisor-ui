export class Event {
  messageRegex: string;
  hint: string;
  todo: string;
  moduleName: string;
  wikiLink: string;
  compiledRegex: string;
  debug_source: boolean = false;
  param_number: number = 0;
  ifExistInStack: string = null;
  def: boolean = false;
}
