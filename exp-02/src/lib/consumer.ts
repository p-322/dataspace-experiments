import { Logger } from "../utils/logger.js";
import { EdcManagementClient } from "./edcManagementClient.js";
import { EdcTransaction } from "./edcTransaction.js";
import { Provider } from "./provider.js";

export class Consumer {
  readonly mgmt: EdcManagementClient;
  readonly log: Logger;

  constructor(
    readonly pid: string,
    mgmtBaseUrl: string,
    mgmtApiKey: string,
    log: Logger
  ) {
    this.mgmt = new EdcManagementClient(mgmtBaseUrl, mgmtApiKey);
    this.log = log;
  }

  transaction(provider: Provider) {
    const l = this.log.scoped(`[${this.pid}]`);
    return new EdcTransaction(this.pid, this.mgmt, provider, l);
  }
}
