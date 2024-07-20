// import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// const JAN_1ST_2030 = 1893456000;
// const ONE_GWEI: bigint = 1_000_000_000n;

// const DefiVaultModule = buildModule("DefiVaultModule", (m) => {
//   const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
//   const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

//   const defiVault = m.contract("Lock", [unlockTime], {
//     value: lockedAmount,
//   });

//   return { defiVault };
// });

// export default DefiVaultModule;
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DefiVaultModule = buildModule("DefiVaultModule", (m) => {
  const yakRouterAddress = m.getParameter("yakRouterAddress");

  const defiVault = m.contract("DefiVault", [yakRouterAddress]);

  return { defiVault };
});

export default DefiVaultModule;
