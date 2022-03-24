import { ContractTransaction } from "ethers";

export async function waitForTx(tx: Promise<ContractTransaction>) {
    await (await tx).wait();
  }