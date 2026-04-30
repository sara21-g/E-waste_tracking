const { ethers } = require('ethers');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.isInitialized = false;

    // The ABI is minimal, only containing the functions we need to call
    this.contractABI = [
      "function registerUser(string memory userId, string memory name) public",
      "function awardPoints(string memory userId, uint256 points, uint256 carbonReducedAmount) public",
      "function redeemPoints(string memory userId, uint256 points) public",
      "function getUser(string memory userId) public view returns (string memory name, uint256 totalPoints, uint256 carbonReduced, bool isRegistered)"
    ];

    this.init();
  }

  init() {
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      const privateKey = process.env.PRIVATE_KEY;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (!rpcUrl || !privateKey || !contractAddress) {
        logger.warn('Blockchain variables (BLOCKCHAIN_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS) are missing in .env. Blockchain features will be disabled.');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, this.contractABI, this.wallet);
      this.isInitialized = true;
      
      logger.info('Blockchain service initialized successfully.');
    } catch (error) {
      logger.error(`Failed to initialize blockchain service: ${error.message}`);
      this.isInitialized = false;
    }
  }

  async registerUserOnChain(userId, name) {
    if (!this.isInitialized) return;
    try {
      logger.info(`Registering user ${userId} on blockchain...`);
      const tx = await this.contract.registerUser(userId, name);
      await tx.wait();
      logger.info(`User ${userId} registered on blockchain. TxHash: ${tx.hash}`);
    } catch (error) {
      logger.error(`Blockchain registerUser error for ${userId}: ${error.message}`);
    }
  }

  async awardUserPoints(userId, points, carbonReduced) {
    if (!this.isInitialized) return;
    try {
      logger.info(`Awarding ${points} points to user ${userId} on blockchain...`);
      // carbonReduced might be a float, we convert to an integer representation, e.g. multiplied by 100
      const scaledCarbon = Math.round(carbonReduced * 100);
      const tx = await this.contract.awardPoints(userId, points, scaledCarbon);
      await tx.wait();
      logger.info(`Points awarded on blockchain to ${userId}. TxHash: ${tx.hash}`);
    } catch (error) {
      logger.error(`Blockchain awardPoints error for ${userId}: ${error.message}`);
    }
  }

  async redeemUserPoints(userId, points) {
    if (!this.isInitialized) return;
    try {
      logger.info(`Redeeming ${points} points for user ${userId} on blockchain...`);
      const tx = await this.contract.redeemPoints(userId, points);
      await tx.wait();
      logger.info(`Points redeemed on blockchain for ${userId}. TxHash: ${tx.hash}`);
    } catch (error) {
      logger.error(`Blockchain redeemPoints error for ${userId}: ${error.message}`);
    }
  }
}

module.exports = new BlockchainService();
