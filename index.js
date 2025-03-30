require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const fs = require("fs");

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Load contract ABI
const contractABI = JSON.parse(fs.readFileSync("contractABI.json", "utf8"));

// Define constants
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

// Initialize provider, wallet, and contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// Route: Mint NFT
app.post("/mint", async (req, res) => {
    const { userAddress } = req.body;
    if (!userAddress) {
        return res.status(400).json({ success: false, message: "User address is required!" });
    }

    try {
        console.log(`Granting MINTER_ROLE to ${userAddress}...`);
        let tx = await contract.grantRole(MINTER_ROLE, userAddress);
        await tx.wait();
        console.log(`✅ MINTER_ROLE granted to ${userAddress}`);

        console.log(`Minting NFT to ${userAddress}...`);
        tx = await contract.mint(userAddress);
        await tx.wait();
        console.log(`✅ NFT minted successfully for ${userAddress}`);

        console.log(`Revoking MINTER_ROLE from ${userAddress}...`);
        tx = await contract.revokeRole(MINTER_ROLE, userAddress);
        await tx.wait();
        console.log(`✅ MINTER_ROLE revoked from ${userAddress}`);

        res.json({ success: true, message: "NFT minted successfully!" });
    } catch (error) {
        console.error("❌ Minting error:", error);
        res.status(500).json({ success: false, message: `Minting error: ${error.message}` });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
