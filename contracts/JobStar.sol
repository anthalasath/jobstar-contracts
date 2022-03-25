// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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

contract JobStar {
    mapping(uint256 => mapping(string => uint256[]))
        public profileSkillsAndAchievements;
    mapping(uint256 => string[]) public profileSkills;
    // Id starts at 1, 0 is used as missing value
    Achievement[] achievementsByIdMinusOne;
    mapping(uint256 => uint256[]) public pendingAchievementsByProfileId;
    uint256 latestAchievementId;

    IERC721 profileNftContract;

    event SkillsUpdated(
        address indexed owner,
        uint256 indexed profileId,
        string[] oldSkills,
        string[] newSkills
    );
    event AchievementProposed(
        uint256 indexed issuerProfileId,
        uint256 indexed workerProfileId,
        uint256 indexed achievementId
    );
    event AchievementAccepted(
        uint256 indexed issuerProfileId,
        uint256 indexed workerProfileId,
        uint256 indexed achievementId
    );

    modifier onlyProfileOwner(uint256 profileId) {
        if (profileNftContract.ownerOf(profileId) != msg.sender) {
            revert NotOwnerOfProfile(profileId);
        }
        _;
    }

    error NotOwnerOfProfile(uint256 profileId);
    error InexistentAchievement(uint256 id);
    error AchievementAlreadyAccepted(uint256 id);

    constructor(address _profileNftContract) {
        profileNftContract = IERC721(_profileNftContract);
    }

    function getProfileNftAddress() public view returns (address) {
        return address(profileNftContract);
    }

    function getSkills(uint256 profileId)
        public
        view
        returns (string[] memory)
    {
        return profileSkills[profileId];
    }

    function updateSkills(uint256 profileId, string[] memory skills)
        public
        onlyProfileOwner(profileId)
    {
        string[] memory oldSkills = profileSkills[profileId];
        profileSkills[profileId] = skills;
        emit SkillsUpdated(msg.sender, profileId, oldSkills, skills);
    }

    function getAchievementIndex(uint256 achievementId) public pure returns(uint256) {
        return achievementId - 1;
    }

    function getAchievementById(uint256 id)
        public
        view
        returns (Achievement memory)
    {
        uint256 index = getAchievementIndex(id);
        if (index >= achievementsByIdMinusOne.length) {
            revert InexistentAchievement(id);
        }
        return achievementsByIdMinusOne[index];
    }

    function getPendingAchievementsCount(uint256 profileId)
        public
        view
        returns (uint256)
    {
        return pendingAchievementsByProfileId[profileId].length;
    }

    function getAchievementsCount(uint256 profileId, string memory skill)
        public
        view
        returns (uint256)
    {
        return profileSkillsAndAchievements[profileId][skill].length;
    }

    function proposeAchievement(AchievementContent memory content) public {
        if (profileNftContract.ownerOf(content.issuerProfileId) != msg.sender) {
            revert NotOwnerOfProfile(content.issuerProfileId);
        }
        uint256 achievementId = mintAchievement(content);
        pendingAchievementsByProfileId[content.workerProfileId].push(achievementId);
        emit AchievementProposed(
            content.issuerProfileId,
            content.workerProfileId,
            achievementId
        );
    }

    function acceptAchievement(uint256 achievementId) public {
        Achievement storage achievement = achievementsByIdMinusOne[getAchievementIndex(achievementId)];
        if (
            profileNftContract.ownerOf(
                achievement.content.workerProfileId
            ) != msg.sender
        ) {
            revert NotOwnerOfProfile(
                achievement.content.workerProfileId
            );
        }
        if (achievement.isAccepted) {
            revert AchievementAlreadyAccepted(achievementId);
        }

        achievement.isAccepted = true;
        emit AchievementAccepted(
            achievement.content.issuerProfileId,
            achievement.content.workerProfileId,
            achievementId
        );
    }

    function mintAchievement(AchievementContent memory content)
        private
        returns (uint256)
    {
        latestAchievementId++;
        achievementsByIdMinusOne.push(
            Achievement({content: content, isAccepted: false})
        );
        return latestAchievementId;
    }
}
