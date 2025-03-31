require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const fs = require("fs");

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const GOLD_CONTRACT_ADDRESS = process.env.GOLD_CONTRACT_ADDRESS;
const DIAMOND_CONTRACT_ADDRESS = process.env.DIAMOND_CONTRACT_ADDRESS;
const API_KEY = process.env.API_KEY; // Secret API Key

// Load contract ABI (assuming both contracts use the same ABI)
const contractABI = JSON.parse(fs.readFileSync("contractABI.json", "utf8"));

// Define constants
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

// Initialize provider, wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contracts
const goldContract = new ethers.Contract(GOLD_CONTRACT_ADDRESS, contractABI, wallet);
const diamondContract = new ethers.Contract(DIAMOND_CONTRACT_ADDRESS, contractABI, wallet);

// Middleware: Check API Key
const verifyApiKey = (req, res, next) => {
    const providedApiKey = req.headers["x-api-key"];
    if (!providedApiKey || providedApiKey !== API_KEY) {
        return res.status(403).json({ success: false, message: "Unauthorized: Invalid API Key!" });
    }
    next();
};

// Route: Mint NFT (Gold or Diamond)
app.post("/mint", verifyApiKey, async (req, res) => {
    const { userAddress, voucherType } = req.body;
    if (!userAddress || !voucherType) {
        return res.status(400).json({ success: false, message: "User address and voucher type are required!" });
    }

    // Determine contract based on voucher type
    let contract;
    if (voucherType.toLowerCase() === "gold") {
        contract = goldContract;
    } else if (voucherType.toLowerCase() === "diamond") {
        contract = diamondContract;
    } else {
        return res.status(400).json({ success: false, message: "Invalid voucher type! Must be 'gold' or 'diamond'." });
    }

    try {
        console.log(`Granting MINTER_ROLE to ${userAddress} on ${voucherType.toUpperCase()} contract...`);
        let tx = await contract.grantRole(MINTER_ROLE, userAddress);
        await tx.wait();
        console.log(`✅ MINTER_ROLE granted to ${userAddress}`);

        console.log(`Minting ${voucherType.toUpperCase()} NFT to ${userAddress}...`);
        tx = await contract.mint(userAddress);
        await tx.wait();
        console.log(`✅ ${voucherType.toUpperCase()} NFT minted successfully for ${userAddress}`);

        console.log(`Revoking MINTER_ROLE from ${userAddress}...`);
        tx = await contract.revokeRole(MINTER_ROLE, userAddress);
        await tx.wait();
        console.log(`✅ MINTER_ROLE revoked from ${userAddress}`);

        res.json({ success: true, message: `${voucherType.toUpperCase()} NFT minted successfully!` });
    } catch (error) {
        console.error(`❌ Minting error for ${voucherType.toUpperCase()}:`, error);
        res.status(500).json({ success: false, message: `Minting error: ${error.message}` });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
