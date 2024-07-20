import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

const YAK_ROUTER_ADDRESS = "0xC4729E56b831d74bBc18797e0e17A295fA77488c"; // YakRouter
const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"; // WAVAX
const aTokenAddress = "0xaBe7a9dFDA35230ff60D1590a929aE0644c47DC1";
const xAvaxAddres = "0x698C34Bad17193AF7E1B4eb07d1309ff6C5e715e";
// Deploy the DefiVault contract
const sAVAXAddress = "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE"; // Example sAVAX address
const QISAVAX_ADDRESS = "0xF362feA9659cf036792c9cb02f8ff8198E21B4cB";
const BENQI_AVAX_MARKET_ADDRESS = "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4";
describe("DefiVault", function () {
  async function deployDefiVault() {
    // Get the ContractFactory and Signers
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const [owner, addr1] = await ethers.getSigners();

    // Mock YakRouter contract

    // Deploy the DefiVault contract
    const defiVault = await DefiVault.deploy(YAK_ROUTER_ADDRESS, sAVAXAddress);
    // await defiVault?.deployed();

    // Deploy a mock ERC20 token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy(
      "Mock Token",
      "MKT",
      18,
      ethers.parseEther("1000")
    );
    // await token.deployed();

    // Transfer some tokens to addr1
    await token.transfer(addr1.address, ethers.parseEther("100"));

    return { defiVault, token, owner, addr1 };
  }

  describe("depositAsset", function () {
    it("should accept native currency deposits", async function () {
      const { defiVault, addr1 } = await loadFixture(deployDefiVault);
      const depositAmount = ethers.parseEther("1");
      let tx = await defiVault
        .connect(addr1)
        .depositAsset(ethers.ZeroAddress, 0, { value: depositAmount });
      await tx.wait();

      const contractBalance = await ethers.provider.getBalance(
        defiVault.getAddress()
      );
      expect(contractBalance).to.equal(depositAmount);
    });

    it("should accept ERC20 token deposits", async function () {
      const { defiVault, token, addr1 } = await loadFixture(deployDefiVault);
      const depositAmount = ethers.parseEther("10");

      await token.connect(addr1).approve(defiVault.getAddress(), depositAmount);
      await defiVault
        .connect(addr1)
        .depositAsset(token.getAddress(), depositAmount);

      const contractTokenBalance = await token.balanceOf(
        defiVault.getAddress()
      );
      expect(contractTokenBalance).to.equal(depositAmount);
    });
  });

  describe("swapWithYak", function () {
    this.timeout(20000);
    async function deployDefiVault() {
      const DefiVault = await ethers.getContractFactory("DefiVault");
      const [owner, addr1] = await ethers.getSigners();

      // // Use the actual YakRouter contract address
      // const YAK_ROUTER_ADDRESS = "0xC4729E56b831d74bBc18797e0e17A295fA77488c"; // Actual YakRouter address
      // const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"; // WAVAX address
      // const sAVAX_ADDRESS = "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE"; // sAVAX address

      // Deploy the DefiVault contract
      const defiVault = await DefiVault.deploy(
        YAK_ROUTER_ADDRESS,
        sAVAXAddress
      );
      // await defiVault.deployed();

      // Get the WAVAX and sAVAX ERC20 contract instances
      const WAVAX = new ethers.Contract(
        WAVAX_ADDRESS,
        [
          "function deposit() external payable",
          "function balanceOf(address) external view returns (uint256)",
          "function approve(address spender, uint256 amount) external returns (bool)",
        ],
        ethers.provider
      );

      const aToken = new ethers.Contract(
        aTokenAddress,
        ["function balanceOf(address) external view returns (uint256)"],
        ethers.provider
      );
      const xAvax = new ethers.Contract(
        xAvaxAddres,
        ["function balanceOf(address) external view returns (uint256)"],
        ethers.provider
      );
      const sAVAX = await ethers.getContractAt("IERC20", sAVAXAddress);

      return {
        defiVault,
        WAVAX,
        sAVAX,
        owner,
        addr1,
        YAK_ROUTER_ADDRESS,
        aToken,
        xAvax,
      };
    }

    it("should swap WAVAX to sAVAX successfully", async function () {
      const { defiVault, WAVAX, sAVAX, owner, addr1, YAK_ROUTER_ADDRESS } =
        await loadFixture(deployDefiVault);
      // let network = await ethers.getDefaultProvider().getNetwork();

      // Deposit AVAX to WAVAX
      const amountInAVAX = ethers.parseEther("10");
      // @ts-ignore
      let tx = WAVAX.connect(addr1).deposit({ value: amountInAVAX });
      // await tx?.wait();
      // await addr1.sendTransaction({
      //   to: WAVAX.getAddress(),
      //   value: amountInAVAX,
      // });

      // Check WAVAX balance after deposit
      const WAVAXBalance = await WAVAX.balanceOf(addr1.address);
      expect(WAVAXBalance).to.equal(amountInAVAX);

      // Approve WAVAX transfer to DefiVault
      // @ts-ignore
      tx = await WAVAX.connect(addr1).approve(
        defiVault.getAddress(),
        amountInAVAX
      );
      // await tx?.wait();
      // Deposit WAVAX to DefiVault
      await defiVault
        .connect(addr1)
        .depositAsset(WAVAX.getAddress(), amountInAVAX);

      // Check DefiVault's WAVAX balance
      const defiVaultWAVAXBalance = await WAVAX.balanceOf(
        defiVault.getAddress()
      );
      expect(defiVaultWAVAXBalance).to.equal(amountInAVAX);

      // Use YakRouter to find the best path (replace this with the actual logic if needed)
      // const yakRouter = await ethers.getContractAt(
      //   "IYakRouter",
      //   YAK_ROUTER_ADDRESS,
      //   owner
      // );
      // This part is used for testing purposes only
      // Hardhat stucks because of the forked network and probably oracle usage of YakRouter, so we use the actual YakRouter
      const externalProvider = new ethers.JsonRpcProvider(
        "https://api.avax.network/ext/bc/C/rpc"
      );
      const yakRouterExternal = new ethers.Contract(
        YAK_ROUTER_ADDRESS,
        [
          "function findBestPath(uint256 amountIn, address tokenIn, address tokenOut, uint maxSteps) view returns ((uint256[] memory amounts, address[] memory adapters, address[] memory path))",
        ],
        externalProvider
      );
      const bestPath = await yakRouterExternal.findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAX.getAddress(),
        3 // Max steps
      );

      const { amounts, path, adapters } = bestPath;
      const amountArr = [...amounts];
      const pathArr = [...path];
      const adaptersArr = [...adapters];
      // amountArr[0] = ethers.parseEther("16");
      // console.log("Amounts : ", amountArr);
      //Perform the swap using the actual YakRouter
      const initialBalance = await sAVAX.balanceOf(defiVault.getAddress());
      await defiVault
        .connect(addr1)
        .swapWithYak(pathArr, amountArr, adaptersArr);
      const finalBalance = await sAVAX.balanceOf(defiVault.getAddress());

      expect(finalBalance).to.be.gt(
        initialBalance,
        "Swap did not work, no new sAVAX"
      );
    });

    it("should perform testFlow successfully", async function () {
      const {
        defiVault,
        WAVAX,
        sAVAX,
        owner,
        addr1,
        YAK_ROUTER_ADDRESS,
        aToken,
        xAvax,
      } = await loadFixture(deployDefiVault);

      // Deposit AVAX to WAVAX
      const amountInAVAX = ethers.parseEther("10");
      console.log("Depositing AVAX to WAVAX...");
      const depositTx = await addr1.sendTransaction({
        to: WAVAX.getAddress(),
        value: amountInAVAX,
        gasLimit: 8000000,
      });
      await depositTx.wait();
      console.log("AVAX deposited to WAVAX");

      // Check WAVAX balance after deposit
      const WAVAXBalance = await WAVAX.balanceOf(addr1.address);
      console.log("WAVAX Balance after deposit:", WAVAXBalance.toString());
      expect(WAVAXBalance).to.equal(amountInAVAX);

      // Approve WAVAX transfer to DefiVault
      console.log("Approving WAVAX transfer to DefiVault...");
      // @ts-ignore
      const approveTx = await WAVAX.connect(addr1).approve(
        defiVault.getAddress(),
        amountInAVAX,
        { gasLimit: 8000000 }
      );
      await approveTx.wait();
      console.log("WAVAX transfer approved");

      // Deposit WAVAX to DefiVault
      console.log("Depositing WAVAX to DefiVault...");
      const depositAssetTx = await defiVault
        .connect(addr1)
        .depositAsset(WAVAX.getAddress(), amountInAVAX, { gasLimit: 8000000 });
      await depositAssetTx.wait();
      console.log("WAVAX deposited to DefiVault");

      // Check DefiVault's WAVAX balance
      const defiVaultWAVAXBalance = await WAVAX.balanceOf(
        defiVault.getAddress()
      );
      console.log("DefiVault WAVAX Balance:", defiVaultWAVAXBalance.toString());
      expect(defiVaultWAVAXBalance).to.equal(amountInAVAX);

      // Use external provider for YakRouter to find the best path
      console.log(
        "Finding best path for WAVAX to sAVAX using external provider..."
      );
      const externalProvider = new ethers.JsonRpcProvider(
        "https://api.avax.network/ext/bc/C/rpc"
      );
      const yakRouterExternal = new ethers.Contract(
        YAK_ROUTER_ADDRESS,
        [
          "function findBestPath(uint256 amountIn, address tokenIn, address tokenOut, uint maxSteps) view returns ((uint256[] memory amounts, address[] memory adapters, address[] memory path))",
        ],
        externalProvider
      );
      const bestPath = await yakRouterExternal.findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAX.getAddress(),
        3 // Max steps
      );
      const { amounts, path, adapters } = bestPath;
      const amountArr = [...amounts];
      const pathArr = [...path];
      const adaptersArr = [...adapters];
      // amountArr[0] = ethers.parseEther("16");
      // console.log("Amounts : ", amountArr);
      //Perform the swap using the actual YakRouter
      const initialBalance = await sAVAX.balanceOf(defiVault.getAddress());

      const testFlowTx = await defiVault
        .connect(addr1)
        .testFlow(pathArr, amountArr, adaptersArr, {
          gasLimit: 8000000,
          value: ethers.parseEther("10"),
        });

      console.log("testFlow performed");

      const finalBalance = await ethers.provider.getBalance(
        defiVault.getAddress()
      );
      console.log("Final AVAX Balance:", finalBalance.toString());

      let aTokenBalance = await aToken.balanceOf(defiVault.getAddress());
      console.log("aToken Balance after depositBenqi:", aTokenBalance);
      expect(aTokenBalance).to.be.gt(0, "No aTokens minted");
      let xAvaxBalance = await xAvax.balanceOf(defiVault.getAddress());
      console.log("xAvax Balance after depositBenqi:", xAvaxBalance);
      expect(xAvaxBalance).to.be.gt(0, "No xAvax minted");
      expect(finalBalance).to.be.gt(
        ethers.parseEther("0"),
        "Swap did not work, no new sAVAX"
      );

      // Check QiToken balance after depositBenqi
      // const QiToken = await ethers.getContractAt("IQiToken", QISAVAX_ADDRESS);
      // const QiTokenBalance = await QiToken.balanceOf(defiVault.getAddress());
      // console.log(
      //   "QiToken Balance after depositBenqi:",
      //   QiTokenBalance.toString()
      // );
      // expect(QiTokenBalance).to.be.gt(0, "No QiTokens minted");
    });
  });

  // it("should perform depositBenqi successfully", async function () {
  //   const {
  //     defiVault,
  //     WAVAX,
  //     sAVAX,
  //     owner,
  //     addr1,
  //     YAK_ROUTER_ADDRESS,
  //     aToken,
  //     xAvax,
  //   } = await loadFixture(deployDefiVault);

  //   // TODO: Get path for
  // });
});
