require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Blockchain Configuration
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, require("./contractABI.json"), wallet);

// Grant Role Function
async function grantMinterRole(userAddress) {
    const minterRole = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const tx = await contract.grantRole(minterRole, userAddress);
    await tx.wait();
    console.log(`Granted MINTER_ROLE to: ${userAddress}`);
}

// Revoke Role Function
async function revokeMinterRole(userAddress) {
    const minterRole = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const tx = await contract.revokeRole(minterRole, userAddress);
    await tx.wait();
    console.log(`Revoked MINTER_ROLE from: ${userAddress}`);
}

// Mint NFT Function
async function mintNFT(userAddress, tokenId) {
    await grantMinterRole(userAddress);
    
    const tx = await contract.mint(userAddress, tokenId);
    await tx.wait();
    console.log(`Minted token ${tokenId} to ${userAddress}`);

    await revokeMinterRole(userAddress);
}

// API Route for Minting
app.post("/mint", async (req, res) => {
    const { userAddress, tokenId } = req.body;

    if (!userAddress || !tokenId) {
        return res.status(400).json({ error: "Missing userAddress or tokenId" });
    }

    try {
        await mintNFT(userAddress, tokenId);
        res.json({ success: true, message: "NFT minted successfully!" });
    } catch (error) {
        console.error("Minting error:", error);
        res.status(500).json({ error: "Minting failed" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
