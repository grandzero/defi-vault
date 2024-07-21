import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DefiVaultModule = buildModule("DefiVaultModule", (m) => {
  const yakRouterAddress = m.getParameter("yakRouterAddress");
  const sAVAXAddress = m.getParameter("sAVAXAddress");

  const defiVault = m.contract("DefiVault", [yakRouterAddress, sAVAXAddress]);

  return { defiVault };
});

export default DefiVaultModule;
