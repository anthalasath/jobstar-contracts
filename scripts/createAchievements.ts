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
        imageUri: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/1257px-Ethereum_logo_2014.svg.png"
    };

    const proposeReceipt = await (await jobStarWithSigners.issuer.proposeAchievement(content)).wait();
    const achievementProposedEvent = getEvent(proposeReceipt.events, "AchievementProposed");
    const achievementId = achievementProposedEvent.args.achievementId;
    await waitForTx(jobStarWithSigners.worker.acceptAchievement(achievementId));
    return achievementId;
}

export async function createAchievements(jobStar: Contract, mockLensHub: Contract): Promise<void> {
    const accounts = await ethers.getSigners();
    const worker = accounts[0];
    const issuer = accounts[1];
    const profileNftWithWorkerSigner = mockLensHub.connect(worker);
    const profileNftWithIssuerSigner = mockLensHub.connect(issuer);
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

async function main(): Promise<void> {
    const { jobStar, mockLensHub } = await deployJobStar();
    await createAchievements(jobStar, mockLensHub);
}

main()
    .catch(console.error);