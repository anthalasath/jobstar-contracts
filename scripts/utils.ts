import { ContractTransaction } from "ethers";

export async function waitForTx(tx: Promise<ContractTransaction>) {
  await (await tx).wait();
}


export function getEvent(events: any[], eventName: string): any | null {
  const matches = events.filter(e => e.event == eventName);
  if (matches.length > 1) {
    throw new Error(`Multiple events with the name: ${eventName}`);
  } else if (matches.length > 0) {
    return matches[0];
  } else {
    return null;
  }
}
