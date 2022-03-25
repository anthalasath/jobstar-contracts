import { expect } from "chai";
import { ethers } from "hardhat";
import { deployJobStar, DeployJobStarResult } from "../scripts/deploy";
import { getEvent, waitForTx } from "../scripts/utils";

describe("JobStar", () => {

    it("Starts with no skills for profiles", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const workerProfileId = 1;
        const issuerProfileId = 2;

        // sanity checks
        expect((await profileNft.ownerOf(workerProfileId))).to.eq(worker.address);
        expect((await profileNft.ownerOf(issuerProfileId))).to.eq(issuer.address);

        const workerSkills = await jobStar.getSkills(workerProfileId);
        const issuerSkills = await jobStar.getSkills(issuerProfileId);

        expect(workerSkills.length).to.eq(0);
        expect(issuerSkills.length).to.eq(0);
    });

    it("Updates the skills when ot having any skills yet and calling updateSkills for a profile owned by the caller and emits a SkillsUpdated event with the correct arguments", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const workerProfileId = 1;
        const issuerProfileId = 2;
        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const expectedWorkerSkills = ["Javascript", "Solidity"];

        const tx = await jobStarWithWorkerSigner.updateSkills(workerProfileId, expectedWorkerSkills);
        const receipt = await tx.wait();

        const workerSkills = await jobStar.getSkills(workerProfileId);
        const issuerSkills = await jobStar.getSkills(issuerProfileId);
        const skillsUpdatedEvent = getEvent(receipt.events, "SkillsUpdated");

        expect(workerSkills).to.deep.eq(expectedWorkerSkills);
        expect(issuerSkills.length).to.eq(0);
        expect(skillsUpdatedEvent.args.owner).to.eq(worker.address);
        expect(skillsUpdatedEvent.args.profileId).to.eq(workerProfileId);
        expect(skillsUpdatedEvent.args.oldSkills).to.deep.eq([]);
        expect(skillsUpdatedEvent.args.newSkills).to.deep.eq(expectedWorkerSkills);
    });

    it("reverts when calling updateSkills for an profile not owned by the caller", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const issuerProfileId = 2;
        const jobStarWithWorkerSigner = jobStar.connect(worker);

        await expect(jobStarWithWorkerSigner.updateSkills(issuerProfileId, ["Javascript", "Solidity"])).to.be.revertedWith(`NotOwnerOfProfile(${issuerProfileId})`);
    });

    it("reverts when calling proposeAchievement from a profile id that is not owned by the sender", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const workerProfileId = 1;
        const issuerProfileId = 2;
        const jobStarWithWorkerSigner = jobStar.connect(worker);

        const achievementContent = {
            issuerProfileId,
            workerProfileId,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: ""
        };

        await expect(jobStarWithWorkerSigner.proposeAchievement(achievementContent)).to.be.revertedWith(`NotOwnerOfProfile(${issuerProfileId})`);
    });

    it("mints the achievement when calling proposeAchievement from a profile id that is owned by the sender and emits the AchievementProposed event with the right arguments", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const workerProfileId = 1;
        const issuerProfileId = 2;
        const jobStarWithIssuerSigner = jobStar.connect(issuer);

        const expectedContent = {
            issuerProfileId,
            workerProfileId,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: "https://ethereum.org/en/"
        };

        const tx = await jobStarWithIssuerSigner.proposeAchievement(expectedContent);
        const receipt = await tx.wait();

        const expectedAchievementId = 1;
        const achievementProposedEvent = getEvent(receipt.events, "AchievementProposed");
        expect(achievementProposedEvent.args.achievementId).to.eq(expectedAchievementId);
        expect(achievementProposedEvent.args.issuerProfileId).to.eq(issuerProfileId);
        expect(achievementProposedEvent.args.workerProfileId).to.eq(workerProfileId);
        const achievement = await jobStar.getAchievementById(expectedAchievementId);
        const content = achievement[0];
        expect(content[0]).to.eq(expectedContent.issuerProfileId);
        expect(content[1]).to.eq(expectedContent.workerProfileId);
        expect(content[2]).to.eq(expectedContent.title);
        expect(content[3]).to.eq(expectedContent.description);
        expect(content[4]).to.eq(expectedContent.dateOfDelivery);
        expect(content[5]).to.eq(expectedContent.imageUri);
        expect(achievement[1]).to.eq(false);
    });

    it("reverts when trying to accept an achievement that does not exist", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const jobStarWithWorkerSigner = jobStar.connect(worker);

        await expect(jobStarWithWorkerSigner.acceptAchievement(1)).to.be.revertedWith(`InexistentAchievement(1)`);
    });
    
    it("reverts when trying to accept an achievement for a profile that the sender does not own", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const issuerProfileId = 2;
        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content = {
            issuerProfileId,
            workerProfileId: issuerProfileId,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: "https://ethereum.org/en/"
        };
        await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));

        await expect(jobStarWithWorkerSigner.acceptAchievement(1)).to.be.revertedWith(`NotOwnerOfProfile(${issuerProfileId})`);
    });
    
    it("marks a pending achievement as accepted when accepting it and emits the AchievementAccepted event with the correct arguments", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const workerProfileId = 1;
        const issuerProfileId = 2;
        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content = {
            issuerProfileId,
            workerProfileId,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: "https://ethereum.org/en/"
        };
        await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));
        const achievementId = 1;

        const tx = await jobStarWithWorkerSigner.acceptAchievement(achievementId);
        const receipt = await tx.wait();

        const achievementAcceptedEvent = getEvent(receipt.events, "AchievementAccepted");
        expect(achievementAcceptedEvent.args.issuerProfileId).to.eq(issuerProfileId);
        expect(achievementAcceptedEvent.args.workerProfileId).to.eq(workerProfileId);
        expect(achievementAcceptedEvent.args.achievementId).to.eq(achievementId);
    });

    it("reverts when trying to accept an achievement for a profile that the sender does not own", async () => {
        const { jobStar, profileNft } = await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const profileNftWithWorkerSigner = profileNft.connect(worker);
        const profileNftWithIssuerSigner = profileNft.connect(issuer);
        await waitForTx(profileNftWithWorkerSigner.mint());
        await waitForTx(profileNftWithIssuerSigner.mint());
        const workerProfileId = 1;
        const issuerProfileId = 2;
        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content = {
            issuerProfileId,
            workerProfileId,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: "https://ethereum.org/en/"
        };
        await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));
        await waitForTx(jobStarWithWorkerSigner.acceptAchievement(1));

        await expect(jobStarWithWorkerSigner.acceptAchievement(1)).to.be.revertedWith(`AchievementAlreadyAccepted(1)`);
    });
});