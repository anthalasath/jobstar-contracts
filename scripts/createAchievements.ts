import "@nomiclabs/hardhat-waffle";
import { deployJobStar } from "./deploy";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish, Contract } from "ethers";
import { AccountPair, AchievementContent, getEvent, mintProfiles, waitForTx } from "./utils";


async function createAchievement(jobStarWithSigners: AccountPair<Contract>, profileIds: AccountPair<BigNumberish>): Promise<BigNumber> {
    const content: AchievementContent = {
        skill: "Solidity",
        issuerProfileId: profileIds.issuer,
        workerProfileId: profileIds.worker,
        title: "best title",
        description: "best description",
        dateOfDelivery: Date.now(),
        imageUri: "https://ethereum.org/en/"
    };

    const proposeReceipt = await (await jobStarWithSigners.issuer.proposeAchievement(content)).wait();
    const achievementProposedEvent = getEvent(proposeReceipt.events, "AchievementProposed");
    const achievementId = achievementProposedEvent.args.achievementId;
    await waitForTx(jobStarWithSigners.worker.acceptAchievement(achievementId));
    return achievementId;
}

async function main(): Promise<void> {
    const { jobStar, mockLensHub: profileNft } = await deployJobStar();
    const accounts = await ethers.getSigners();
    const worker = accounts[0];
    const issuer = accounts[1];
    const profileNftWithWorkerSigner = profileNft.connect(worker);
    const profileNftWithIssuerSigner = profileNft.connect(issuer);
    await mintProfiles({ worker: profileNftWithWorkerSigner, issuer: profileNftWithIssuerSigner });
    const jobStarWithWorkerSigner = jobStar.connect(worker);
    const jobStarWithIssuerSigner = jobStar.connect(issuer);
    const workerProfileId = 1;
    const issuerProfileId = 2;

    for (let i = 0; i < 10; i++) {
        const achvId = await createAchievement(
            { worker: jobStarWithWorkerSigner, issuer: jobStarWithIssuerSigner },
            { worker: workerProfileId, issuer: issuerProfileId });
        console.log(`Created achievement ${achvId}: ${await jobStar.getAchievementById(achvId)}`);
    }
}

main()
    .catch(console.error);