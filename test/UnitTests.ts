import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

const YAK_ROUTER_ADDRESS = "0xC4729E56b831d74bBc18797e0e17A295fA77488c"; // YakRouter
const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"; // WAVAX
const aTokenAddress = "0xaBe7a9dFDA35230ff60D1590a929aE0644c47DC1";
const xAvaxAddres = "0x698C34Bad17193AF7E1B4eb07d1309ff6C5e715e";
const sAVAXAddress = "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE"; // sAVAX address
const USDT_ADDRESS = "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7";
const USDC_ADDRESS = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e";
const IYakRouter = [
  "function findBestPath(uint256 amountIn, address tokenIn, address tokenOut, uint maxSteps) view returns ((uint256[] memory amounts, address[] memory adapters, address[] memory path))",
  "function swapNoSplit((uint amountIn, uint amountOut, address[] path, address[] adapters), address _to, uint _fee) external",
  "function swapNoSplitFromAVAX((uint amountIn, uint amountOut, address[] path, address[] adapters), address _to, uint256 _fee) external payable",
];
describe("DefiVault", function () {
  this.timeout(20000);

  async function deployDefiVault() {
    const DefiVault = await ethers.getContractFactory("DefiVault");
    const [addr1, ...wallets] = await ethers.getSigners();

    const defiVault = await DefiVault.deploy(YAK_ROUTER_ADDRESS, sAVAXAddress);

    const WAVAX = new ethers.Contract(
      WAVAX_ADDRESS,
      [
        "function deposit() external payable",
        "function balanceOf(address) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function transfer(address to, uint256 amount) external returns (bool)",
      ],
      ethers.provider
    );

    const USDT = new ethers.Contract(
      USDT_ADDRESS,
      ["function balanceOf(address) external view returns (uint256)"],
      ethers.provider
    );

    const USDC = new ethers.Contract(
      USDC_ADDRESS,
      ["function balanceOf(address) external view returns (uint256)"],
      ethers.provider
    );

    const sAVAX = new ethers.Contract(
      sAVAXAddress,
      ["function balanceOf(address) external view returns (uint256)"],
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

    return {
      defiVault,
      WAVAX,
      USDT,
      USDC,
      sAVAX,
      aToken,
      xAvax,
      //owner,
      addr1,
    };
  }

  async function findBestPath(
    // yakRouterExternal: any,
    amountIn: any,
    tokenIn: any,
    tokenOut: any
  ) {
    const externalProvider = new ethers.JsonRpcProvider(
      "https://api.avax.network/ext/bc/C/rpc"
    );
    const yakRouterExternal = new ethers.Contract(
      YAK_ROUTER_ADDRESS,
      IYakRouter,
      externalProvider
    );

    let bestPath = await yakRouterExternal.findBestPath(
      amountIn,
      tokenIn,
      tokenOut,
      3
    );
    let path = [...bestPath.path];
    let amounts = [...bestPath.amounts];
    let adapters = [...bestPath.adapters];
    return { path, amounts, adapters };
  }

  describe("swapWithYak", function () {
    it("should swap AVAX to sAVAX successfully", async function () {
      const { defiVault, WAVAX, sAVAX, addr1 } = await loadFixture(
        deployDefiVault
      );

      const amountInAVAX = ethers.parseEther("10");
      // @ts-ignore
      await WAVAX.connect(addr1).deposit({ value: amountInAVAX });
      // @ts-ignore
      await WAVAX.connect(addr1).approve(defiVault.getAddress(), amountInAVAX);

      //   await defiVault
      //     .connect(addr1)
      //     .depositAsset(WAVAX.getAddress(), amountInAVAX);

      const bestPath = await findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAXAddress
      );
      const initialBalance = await sAVAX.balanceOf(defiVault.getAddress());
      await defiVault
        .connect(addr1)
        // @ts-ignore
        .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters, true, {
          value: amountInAVAX,
        });
      const finalBalance = await sAVAX.balanceOf(defiVault.getAddress());

      expect(finalBalance).to.be.gt(
        initialBalance,
        "Swap did not work, no new sAVAX"
      );
    });

    it("should swap AVAX to sAVAX successfully", async function () {
      const { defiVault, WAVAX, sAVAX, addr1 } = await loadFixture(
        deployDefiVault
      );

      const amountInAVAX = ethers.parseEther("10");
      // @ts-ignore
      await WAVAX.connect(addr1).deposit({ value: amountInAVAX });
      // @ts-ignore
      await WAVAX.connect(addr1).approve(defiVault.getAddress(), amountInAVAX);

      //   await defiVault
      //     .connect(addr1)
      //     .depositAsset(WAVAX.getAddress(), amountInAVAX);

      const bestPath = await findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAXAddress
      );
      const initialBalance = await sAVAX.balanceOf(defiVault.getAddress());
      await defiVault
        .connect(addr1)
        // @ts-ignore
        .swapWithYak(
          bestPath.path,
          bestPath.amounts,
          bestPath.adapters,
          false,
          {
            value: amountInAVAX,
          }
        );
      const finalBalance = await sAVAX.balanceOf(defiVault.getAddress());

      expect(finalBalance).to.be.gt(
        initialBalance,
        "Swap did not work, no new sAVAX"
      );
    });

    // it("should deposit to Benqi and check qisAvax balance", async function () {
    //   const { defiVault, sAVAX, addr1, WAVAX } = await loadFixture(
    //     deployDefiVault
    //   );
    //   let contractBalance = await sAVAX.balanceOf(defiVault.getAddress());
    //   console.log("contractBalance", contractBalance.toString());
    //   const amountInAVAX = ethers.parseEther("10");

    //   const bestPath = await findBestPath(
    //     amountInAVAX,
    //     WAVAX.getAddress(),
    //     sAVAXAddress
    //   );
    //   await defiVault
    //     .connect(addr1)
    //     .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters, true, {
    //       value: amountInAVAX,
    //     });

    //   const initialQisAvaxBalance = await sAVAX.balanceOf(
    //     defiVault.getAddress()
    //   );
    //   expect(initialQisAvaxBalance).to.be.gt(0, "qisAvax balance is zero");
    //   console.log("Latest qisAvax balance", initialQisAvaxBalance.toString());
    //   await defiVault.connect(addr1).depositToBenqi();
    //   const finalQisAvaxBalance = await sAVAX.balanceOf(defiVault.getAddress());

    //   expect(finalQisAvaxBalance).to.be.eq(0, "qisAvax deposit failed");
    // });

    // it("should swap USDC to sAVAX successfully", async function () {
    //   const { defiVault, WAVAX, USDC, sAVAX, addr1 } = await loadFixture(
    //     deployDefiVault
    //   );

    //   const amountInAVAX = ethers.parseEther("20");
    //   // @ts-ignore
    //   await WAVAX.connect(addr1).deposit({ value: amountInAVAX });
    //   // @ts-ignore
    //   await WAVAX.connect(addr1).approve(YAK_ROUTER_ADDRESS, amountInAVAX);
    //   await defiVault
    //     .connect(addr1)
    //     .depositAsset(WAVAX.getAddress(), amountInAVAX);

    //   const bestPath = await findBestPath(
    //     amountInAVAX,
    //     WAVAX.getAddress(),
    //     USDC_ADDRESS
    //   );
    //   await defiVault
    //     .connect(addr1)
    //     .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters);

    //   let USDCBalance = await USDC.balanceOf(defiVault.getAddress());
    //   expect(USDCBalance).to.be.gt(0, "USDC swap failed");

    //   const amountInUSDC = USDCBalance;

    //   // @ts-ignore
    //   await USDC.connect(addr1).approve(YAK_ROUTER_ADDRESS, amountInUSDC);
    //   const bestPathUSDC = await findBestPath(
    //     amountInUSDC,
    //     USDC_ADDRESS,
    //     sAVAXAddress
    //   );
    //   const initialBalance = await sAVAX.balanceOf(defiVault.getAddress());
    //   await defiVault
    //     .connect(addr1)
    //     .swapWithYak(
    //       bestPathUSDC.path,
    //       bestPathUSDC.amounts,
    //       bestPathUSDC.adapters
    //     );
    //   const finalBalance = await sAVAX.balanceOf(defiVault.getAddress());

    //   expect(finalBalance).to.be.gt(
    //     initialBalance,
    //     "Swap did not work, no new sAVAX"
    //   );
    // });

    // it("should swap USDT to sAVAX successfully", async function () {
    //   const { defiVault, WAVAX, USDT, sAVAX, addr1 } = await loadFixture(
    //     deployDefiVault
    //   );

    //   const amountInAVAX = ethers.parseEther("20");
    //   // @ts-ignore
    //   await WAVAX.connect(addr1).deposit({ value: amountInAVAX });
    //   // @ts-ignore
    //   await WAVAX.connect(addr1).approve(YAK_ROUTER_ADDRESS, amountInAVAX);
    //   await defiVault
    //     .connect(addr1)
    //     .depositAsset(WAVAX.getAddress(), amountInAVAX);

    //   const bestPath = await findBestPath(
    //     amountInAVAX,
    //     WAVAX.getAddress(),
    //     USDT_ADDRESS
    //   );
    //   await defiVault
    //     .connect(addr1)
    //     .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters);

    //   let USDTBalance = await USDT.balanceOf(defiVault.getAddress());
    //   expect(USDTBalance).to.be.gt(0, "USDT swap failed");

    //   const amountInUSDT = USDTBalance;
    //   // @ts-ignore
    //   await USDT.connect(addr1).approve(YAK_ROUTER_ADDRESS, amountInUSDT);
    //   const bestPathUSDT = await findBestPath(
    //     amountInUSDT,
    //     USDT_ADDRESS,
    //     sAVAXAddress
    //   );
    //   const initialBalance = await sAVAX.balanceOf(defiVault.getAddress());
    //   await defiVault
    //     .connect(addr1)
    //     .swapWithYak(
    //       bestPathUSDT.path,
    //       bestPathUSDT.amounts,
    //       bestPathUSDT.adapters
    //     );
    //   const finalBalance = await sAVAX.balanceOf(defiVault.getAddress());

    //   expect(finalBalance).to.be.gt(
    //     initialBalance,
    //     "Swap did not work, no new sAVAX"
    //   );
    // });
  });

  describe("depositToBenqi", function () {
    it("should deposit to Benqi and check qisAvax balance", async function () {
      const { defiVault, sAVAX, addr1, WAVAX } = await loadFixture(
        deployDefiVault
      );
      let contractBalance = await sAVAX.balanceOf(defiVault.getAddress());

      const amountInAVAX = ethers.parseEther("10");

      const bestPath = await findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAXAddress
      );
      await defiVault
        .connect(addr1)
        .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters, true, {
          value: amountInAVAX,
        });

      const initialsAvaxBalance = await sAVAX.balanceOf(defiVault.getAddress());
      expect(initialsAvaxBalance).to.be.gt(0, "qisAvax balance is zero");

      await defiVault.connect(addr1).depositToBenqi();
      const sAvaxBalance = await sAVAX.balanceOf(defiVault.getAddress());

      expect(sAvaxBalance).to.be.eq(0, "qisAvax deposit failed");
    });
  });

  describe("borrowFromBenqi", function () {
    it("Should borrow avax and change the balance of contract", async function () {
      const { defiVault, WAVAX, addr1 } = await loadFixture(deployDefiVault);

      const amountInAVAX = ethers.parseEther("20");

      const bestPath = await findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAXAddress
      );
      await defiVault
        .connect(addr1)
        .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters, true, {
          value: amountInAVAX,
        });

      await defiVault.connect(addr1).depositToBenqi();
      const initialBalance = await ethers.provider.getBalance(
        defiVault.getAddress()
      );

      await defiVault.connect(addr1).borrowFromBenqi();
      const finalBalance = await ethers.provider.getBalance(
        defiVault.getAddress()
      );

      expect(finalBalance).to.be.gt(
        initialBalance,
        "Native contract balance did not increase"
      );
    });
  });

  describe("mintFromStableJack", function () {
    it("should mint tokens and check balances", async function () {
      const { defiVault, addr1, aToken, xAvax, WAVAX } = await loadFixture(
        deployDefiVault
      );

      //   const amountInAVAX = await ethers.provider.getBalance(
      //     defiVault.getAddress()
      //   );

      const amountInAVAX = ethers.parseEther("10");

      const bestPath = await findBestPath(
        amountInAVAX, // TODO: Add comment
        WAVAX.getAddress(),
        sAVAXAddress
      );
      //   console.log("bestPath", bestPath);
      //   await defiVault
      //     .connect(addr1)
      //     .swapWithYak(bestPath.path, bestPath.amounts, bestPath.adapters, true, {
      //       value: ethers.parseEther("10"),
      //     });

      //   await defiVault.connect(addr1).depositToBenqi();

      //   await defiVault.connect(addr1).borrowFromBenqi();

      await defiVault.connect(addr1).mintFromStableJack(
        bestPath.path,
        bestPath.amounts,
        bestPath.adapters,
        ethers.parseEther("1"), // TODO: Change this
        ethers.parseEther("1"), // TODO: Change this
        // @ts-ignore
        { value: amountInAVAX }
      );

      let aTokenBalance = await aToken.balanceOf(defiVault.getAddress());
      let xAvaxBalance = await xAvax.balanceOf(defiVault.getAddress());

      expect(aTokenBalance).to.be.gt(0, "No aTokens minted");
      expect(xAvaxBalance).to.be.gt(0, "No xAvax minted");
    });
  });

  describe("depositStableJackRebalancePool", function () {
    it("should check aToken balance before and after", async function () {
      const { defiVault, aToken, addr1, WAVAX, xAvax } = await loadFixture(
        deployDefiVault
      );

      const bestPath = await findBestPath(
        ethers.parseEther("10"),
        WAVAX.getAddress(),
        sAVAXAddress
      );

      await defiVault.connect(addr1).mintFromStableJack(
        bestPath.path,
        bestPath.amounts,
        bestPath.adapters,
        ethers.parseEther("1"), // TODO: Change this
        ethers.parseEther("1"), // TODO: Change this
        // @ts-ignore
        { value: ethers.parseEther("10") }
      );

      let aTokenBalance = await aToken.balanceOf(defiVault.getAddress());
      let xAvaxBalance = await xAvax.balanceOf(defiVault.getAddress());

      expect(aTokenBalance).to.be.gt(0, "No aTokens minted");
      expect(xAvaxBalance).to.be.gt(0, "No xAvax minted");

      await defiVault.connect(addr1).depositStableJackRebalancePool();

      aTokenBalance = await aToken.balanceOf(defiVault.getAddress());
      expect(aTokenBalance).to.equal(
        0,
        "aToken balance should be zero after depositing to Rebalance Pool"
      );
    });
  });

  describe("Deposit test", function () {
    it("should perform swap, deposit benqi and borrow benqi", async function () {
      const { defiVault, WAVAX, addr1 } = await loadFixture(deployDefiVault);

      const amountInAVAX = ethers.parseEther("20");

      const bestPath = await findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAXAddress
      );
      const amountArr = [...bestPath.amounts];
      const pathArr = [...bestPath.path];
      const adaptersArr = [...bestPath.adapters];

      await defiVault
        .connect(addr1)
        .deposit(pathArr, amountArr, adaptersArr, true, {
          gasLimit: 8000000,
          value: amountInAVAX,
        });

      const finalBalance = await ethers.provider.getBalance(
        defiVault.getAddress()
      );
      expect(finalBalance).to.be.gt(
        ethers.parseEther("0"),
        "Final balance should be greater than 0"
      );
      expect(finalBalance).to.be.lt(
        amountInAVAX,
        "Final balance should be less than amountInAVAX"
      );
    });
  });

  describe("Mint and pool test", function () {
    it("should perform mint for both tokens and deposit to pool aToken", async function () {
      const { defiVault, WAVAX, addr1, aToken, xAvax } = await loadFixture(
        deployDefiVault
      );

      const amountInAVAX = ethers.parseEther("20");

      const bestPath = await findBestPath(
        amountInAVAX,
        WAVAX.getAddress(),
        sAVAXAddress
      );
      const amountArr = [...bestPath.amounts];
      const pathArr = [...bestPath.path];
      const adaptersArr = [...bestPath.adapters];

      await defiVault
        .connect(addr1)
        .mintAndDepositStableJack(
          pathArr,
          amountArr,
          adaptersArr,
          ethers.parseEther("1"),
          ethers.parseEther("1"),
          {
            gasLimit: 8000000,
            value: amountInAVAX,
          }
        );

      let xAvaxBalance = await xAvax.balanceOf(defiVault.getAddress());

      expect(xAvaxBalance).to.be.gt(0, "No xAvax minted");

      let aTokenBalance = await aToken.balanceOf(defiVault.getAddress());
      expect(aTokenBalance).to.equal(
        0,
        "aToken balance should be zero after depositing to Rebalance Pool"
      );
    });
  });
});
