import "@nomiclabs/hardhat-waffle";
import { profile } from "console";
import { BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "./utils";

interface DeployJobStarResult {
    jobStar: Contract
    profileNft: Contract
}

export async function deployJobStar(): Promise<DeployJobStarResult> {
    const MockProfileNft = await ethers.getContractFactory("MockProfileNft");
    const mockProfileNft = await MockProfileNft.deploy();
    await mockProfileNft.deployed();

    const JobStar = await ethers.getContractFactory("JobStar");
    const jobStar = await JobStar.deploy(mockProfileNft.address);
    await jobStar.deployed();

    return { jobStar, profileNft: mockProfileNft };
}

async function main(): Promise<void> {
    const {jobStar, profileNft } = await deployJobStar();
    console.log(`JobStar deployed at ${jobStar.address}`);
}

main()
    .catch(console.error);