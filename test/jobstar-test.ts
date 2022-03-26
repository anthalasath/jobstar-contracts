import { expect } from "chai";
import { BigNumber, BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";
import { deployJobStar, DeployJobStarResult } from "../scripts/deploy";
import { AccountPair, AchievementContent, getEvent, mintProfiles, waitForTx } from "../scripts/utils";


describe("JobStar", () => {

    it("Starts with no skills for profiles", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        // sanity checks
        expect((await mockLensHub.ownerOf(profileIds.worker))).to.eq(worker.address);
        expect((await mockLensHub.ownerOf(profileIds.issuer))).to.eq(issuer.address);

        const workerSkills = await jobStar.getSkills(profileIds.worker);
        const issuerSkills = await jobStar.getSkills(profileIds.issuer);

        expect(workerSkills.length).to.eq(0);
        expect(issuerSkills.length).to.eq(0);
    });

    it("Updates the skills when ot having any skills yet and calling updateSkills for a profile owned by the caller and emits a SkillsUpdated event with the correct arguments", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const expectedWorkerSkills = ["Javascript", "Solidity"];

        const tx = await jobStarWithWorkerSigner.updateSkills(profileIds.worker, expectedWorkerSkills);
        const receipt = await tx.wait();

        const workerSkills = await jobStar.getSkills(profileIds.worker);
        const issuerSkills = await jobStar.getSkills(profileIds.issuer);
        const skillsUpdatedEvent = getEvent(receipt.events, "SkillsUpdated");

        expect(workerSkills).to.deep.eq(expectedWorkerSkills);
        expect(issuerSkills.length).to.eq(0);
        expect(skillsUpdatedEvent.args.owner).to.eq(worker.address);
        expect(skillsUpdatedEvent.args.profileId).to.eq(profileIds.worker);
        expect(skillsUpdatedEvent.args.oldSkills).to.deep.eq([]);
        expect(skillsUpdatedEvent.args.newSkills).to.deep.eq(expectedWorkerSkills);
    });

    it("reverts when calling updateSkills for an profile not owned by the caller", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);

        await expect(jobStarWithWorkerSigner.updateSkills(profileIds.issuer, ["Javascript", "Solidity"])).to.be.revertedWith(`NotOwnerOfProfile(${profileIds.issuer})`);
    });

    it("reverts when calling proposeAchievement from a profile id that is not owned by the sender", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);

        const achievementContent: AchievementContent = {
            skill: "Solidity",
            issuerProfileId: profileIds.issuer,
            workerProfileId: profileIds.worker,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: ""
        };

        await expect(jobStarWithWorkerSigner.proposeAchievement(achievementContent)).to.be.revertedWith(`NotOwnerOfProfile(${profileIds.issuer})`);
    });

    it("mints the non-accepted achievement when calling proposeAchievement from a profile id that is owned by the sender and emits the AchievementProposed event with the right arguments", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithIssuerSigner = jobStar.connect(issuer);

        const expectedContent: AchievementContent = {
            skill: "Solidity",
            issuerProfileId: profileIds.issuer,
            workerProfileId: profileIds.worker,
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
        expect(achievementProposedEvent.args.issuerProfileId).to.eq(profileIds.issuer);
        expect(achievementProposedEvent.args.workerProfileId).to.eq(profileIds.worker);
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

    [0, 1, 2].forEach(expectedPendingAchievements => {
        it(`[${expectedPendingAchievements}] getPendingAchievementsCount returns the number of pending achievements for a skill`, async () => {
            const { jobStar, mockLensHub }= await deployJobStar();
            const accounts = await ethers.getSigners();
            const worker = accounts[0];
            const issuer = accounts[1];
            const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
            const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
            const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

            const jobStarWithIssuerSigner = jobStar.connect(issuer);

            for (let i = 0; i < expectedPendingAchievements; i++) {
                await waitForTx(jobStarWithIssuerSigner.proposeAchievement({
                    issuerProfileId: profileIds.issuer,
                    workerProfileId: profileIds.worker,
                    title: "best title",
                    description: "best description",
                    dateOfDelivery: Date.now(),
                    imageUri: "https://ethereum.org/en/",
                    skill: "Solidity"
                }));
            }

            const pendingAchievements = await jobStar.getPendingAchievementsCount(profileIds.worker);

            expect(pendingAchievements).to.eq(expectedPendingAchievements);
        });
    });


    it("reverts when trying to accept an achievement that does not exist", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);

        await expect(jobStarWithWorkerSigner.acceptAchievement(1)).to.be.revertedWith(`InexistentAchievement(1)`);
    });

    it("reverts when trying to accept an achievement for a profile that the sender does not own", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content: AchievementContent = {
            skill: "Solidity",
            issuerProfileId: profileIds.issuer,
            workerProfileId: profileIds.worker,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: "https://ethereum.org/en/"
        };
        await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));

        await expect(jobStarWithIssuerSigner.acceptAchievement(1)).to.be.revertedWith(`NotOwnerOfProfile(${profileIds.worker})`);
    });

    it("marks a pending achievement as accepted when accepting it and emits the AchievementAccepted event with the correct arguments", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content: AchievementContent = {
            skill: "Solidity",
            issuerProfileId: profileIds.issuer,
            workerProfileId: profileIds.worker,
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
        expect(achievementAcceptedEvent.args.issuerProfileId).to.eq(profileIds.issuer);
        expect(achievementAcceptedEvent.args.workerProfileId).to.eq(profileIds.worker);
        expect(achievementAcceptedEvent.args.achievementId).to.eq(achievementId);
        const achievement = await jobStar.getAchievementById(achievementId);
        expect(achievement[1]).to.eq(true);
    });

    [0, 1, 2].forEach(expectedAchievements => {
        it(`[${expectedAchievements}] returns the number of achievements when calling getAchievementsCount`, async () => {
            const { jobStar, mockLensHub }= await deployJobStar();
            const accounts = await ethers.getSigners();
            const worker = accounts[0];
            const issuer = accounts[1];
            const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
            const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
            const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

            const jobStarWithWorkerSigner = jobStar.connect(worker);
            const jobStarWithIssuerSigner = jobStar.connect(issuer);
            const content: AchievementContent = {
                skill: "Solidity",
                issuerProfileId: profileIds.issuer,
                workerProfileId: profileIds.worker,
                title: "best title",
                description: "best description",
                dateOfDelivery: Date.now(),
                imageUri: "https://ethereum.org/en/"
            };

            for (let i = 0; i < expectedAchievements; i++) {
                const achievementId = i + 1;
                await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));
                await waitForTx(jobStarWithWorkerSigner.acceptAchievement(achievementId));
            }

            const achievementsCount = await jobStar.getAchievementsCount(profileIds.worker, "Solidity");
            expect(achievementsCount).to.eq(expectedAchievements);
        });
    });

    it(`does not count the pending achievements when calling getAchievementsCount`, async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content: AchievementContent = {
            skill: "Solidity",
            issuerProfileId: profileIds.issuer,
            workerProfileId: profileIds.worker,
            title: "best title",
            description: "best description",
            dateOfDelivery: Date.now(),
            imageUri: "https://ethereum.org/en/"
        };
        await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));
        await waitForTx(jobStarWithIssuerSigner.proposeAchievement(content));
        await waitForTx(jobStarWithWorkerSigner.acceptAchievement(1));

        const achievementsCount = await jobStar.getAchievementsCount(profileIds.worker, content.skill);
        expect(achievementsCount).to.eq(1);
    });

    it("reverts when trying to accept an achievement for a profile that the sender does not own", async () => {
        const { jobStar, mockLensHub }= await deployJobStar();
        const accounts = await ethers.getSigners();
        const worker = accounts[0];
        const issuer = accounts[1];
        const mockLensHubWithWorkerSigner = mockLensHub.connect(worker);
        const mockLensHubWithIssuerSigner = mockLensHub.connect(issuer);
        const profileIds = await mintProfiles({ worker: mockLensHubWithWorkerSigner, issuer: mockLensHubWithIssuerSigner });

        const jobStarWithWorkerSigner = jobStar.connect(worker);
        const jobStarWithIssuerSigner = jobStar.connect(issuer);
        const content: AchievementContent = {
            skill: "Solidity",
            issuerProfileId: profileIds.issuer,
            workerProfileId: profileIds.worker,
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
