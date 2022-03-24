// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

struct Achievement {
    AchievementContent content;
    bool isAccepted;
}

struct AchievementContent {
    uint256 issuerProfileId;
    uint256 workerProfileId;
    string title;
    string description;
    uint256 dateOfDelivery;
    string imageUri;
}

contract MockProfileNft is ERC721 {

    uint256 lastTokenId;

    constructor() ERC721("Mock", "MOCK") {
    }

    function mint() public {
        lastTokenId++;
        _safeMint(msg.sender, lastTokenId);
    }
}
