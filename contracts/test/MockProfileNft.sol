// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

contract MockProfileNft is ERC721 {

    uint256 lastTokenId;

    constructor() ERC721("Mock", "MOCK") {
    }

    function mint() public {
        lastTokenId++;
        _safeMint(msg.sender, lastTokenId);
    }
}
