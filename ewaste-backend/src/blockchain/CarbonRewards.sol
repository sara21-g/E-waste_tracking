// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CarbonRewards {
    address public owner;

    struct User {
        string name;
        uint256 totalPoints;
        uint256 carbonReduced; // stored as integer (e.g., multiplied by 100) or just raw uint
        bool isRegistered;
    }

    // Mapping from backend user ID string to User struct
    mapping(string => User) public users;

    event UserRegistered(string indexed userId, string name);
    event PointsAwarded(string indexed userId, uint256 points, uint256 carbonReduced);
    event PointsRedeemed(string indexed userId, uint256 points);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Register a new user on the blockchain
    function registerUser(string memory userId, string memory name) public onlyOwner {
        require(!users[userId].isRegistered, "User already registered");
        
        users[userId] = User({
            name: name,
            totalPoints: 0,
            carbonReduced: 0,
            isRegistered: true
        });

        emit UserRegistered(userId, name);
    }

    // Award points and update carbon reduced for a user
    function awardPoints(string memory userId, uint256 points, uint256 carbonReducedAmount) public onlyOwner {
        require(users[userId].isRegistered, "User not registered");
        
        users[userId].totalPoints += points;
        users[userId].carbonReduced += carbonReducedAmount;

        emit PointsAwarded(userId, points, carbonReducedAmount);
    }

    // Redeem points for a user
    function redeemPoints(string memory userId, uint256 points) public onlyOwner {
        require(users[userId].isRegistered, "User not registered");
        require(users[userId].totalPoints >= points, "Insufficient points");

        users[userId].totalPoints -= points;

        emit PointsRedeemed(userId, points);
    }

    // Get user details
    function getUser(string memory userId) public view returns (string memory name, uint256 totalPoints, uint256 carbonReduced, bool isRegistered) {
        User memory user = users[userId];
        return (user.name, user.totalPoints, user.carbonReduced, user.isRegistered);
    }
}
