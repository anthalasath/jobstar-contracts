import { BigNumber, BigNumberish, Contract, ContractTransaction } from "ethers";

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

export interface AchievementContent {
  issuerProfileId: BigNumberish;
  workerProfileId: BigNumberish;
  title: string;
  description: string;
  dateOfDelivery: number;
  imageUri: string;
  skill: string;
}

export interface AccountPair<T> {
    worker: T
    issuer: T
}

async function mintProfile(mockLensHubWithSigner: Contract, handle: string): Promise<void> {
  const tx = await mockLensHubWithSigner.mint(handle, "");
  const receipt = await tx.wait();
  console.log(`Profile minted at ${receipt.transactionHash}`);
}

export async function mintProfiles(mockLensHubWithSigners: AccountPair<Contract>): Promise<AccountPair<number>> {
  await mintProfile(mockLensHubWithSigners.worker, "worker");
  await mintProfile(mockLensHubWithSigners.issuer, "issuer");
  return { worker: 1, issuer: 2 }
}
