// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

    /**
     * @notice A struct containing profile data.
     *
     * @param pubCount The number of publications made to this profile.
     * @param followModule The address of the current follow module in use by this profile, can be empty.
     * @param followNFT The address of the followNFT associated with this profile, can be empty..
     * @param handle The profile's associated handle.
     * @param imageURI The URI to be used for the profile's image.
     * @param followNFTURI The URI to be used for the follow NFT.
     */
    struct ProfileStruct {
        uint256 pubCount;
        address followModule;
        address followNFT;
        string handle;
        string imageURI;
        string followNFTURI;
    }

contract MockProfileNft is ERC721 {

    uint256 lastTokenId;
    mapping (uint256 => ProfileStruct) _profileById;

    constructor() ERC721("Mock", "MOCK") {
    }

    function mint(string calldata handle, string calldata imageURI) public {
        lastTokenId++;
        _safeMint(msg.sender, lastTokenId);
        _profileById[lastTokenId] = ProfileStruct({pubCount: 0, followModule: address(0), followNFT: address(0), handle: handle, imageURI: imageURI, followNFTURI: ""});
    }
    
    function getProfile(uint256 profileId)
        external
        view
        returns (ProfileStruct memory)
    {
        return _profileById[profileId];
    }

}
