import "@nomiclabs/hardhat-waffle";
import { profile } from "console";
import { BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "./utils";

export interface DeployJobStarResult {
    jobStar: Contract
    mockLensHub: Contract
}

export async function deployJobStar(): Promise<DeployJobStarResult> {
    const MockLensHub = await ethers.getContractFactory("MockLensHub");
    const mockLensHub = await MockLensHub.deploy();
    await mockLensHub.deployed();

    const JobStar = await ethers.getContractFactory("JobStar");
    const jobStar = await JobStar.deploy(mockLensHub.address);
    await jobStar.deployed();

    return { jobStar, mockLensHub };
}

async function main(): Promise<void> {
    const { jobStar } = await deployJobStar();
    console.log(`JobStar deployed at ${jobStar.address}`);
}

main()
    .catch(console.error);