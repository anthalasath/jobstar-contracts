import "@nomiclabs/hardhat-waffle";
import { BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";

async function deployJobStar(): Promise<Contract> {
    const MockProfileNft = await ethers.getContractFactory("MockProfileNft");
    const mockProfileNft = await MockProfileNft.deploy();
    await mockProfileNft.deployed();
    
    const JobStar = await ethers.getContractFactory("JobStar");
    const jobStar = await JobStar.deploy(mockProfileNft.address);
    await jobStar.deployed();

    return jobStar;
}

async function main(): Promise<void> {
    const jobStar = await deployJobStar();
    console.log(`JobStar deployed at ${jobStar.address}`);
}

main()
    .catch(console.error);