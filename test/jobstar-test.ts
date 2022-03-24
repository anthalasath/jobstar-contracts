import { expect } from "chai";
import { ethers } from "hardhat";
import { deployJobStar, DeployJobStarResult } from "../scripts/deploy";
import { waitForTx } from "../scripts/utils";

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

    it("Updates the skills when ot having any skills yet and calling updateSkills for an owned profile", async () => {
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

        await waitForTx(jobStarWithWorkerSigner.updateSkills(workerProfileId, expectedWorkerSkills));

        const workerSkills = await jobStar.getSkills(workerProfileId);
        const issuerSkills = await jobStar.getSkills(issuerProfileId);

        expect(workerSkills).to.deep.eq(expectedWorkerSkills);
        expect(issuerSkills.length).to.eq(0);
    });
})