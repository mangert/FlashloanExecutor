import { ethers } from "hardhat";

//временный, просто чтобы попробовать, как работает

async function main() {
  // Подключаемся к контракту (укажи свой адрес задеплоенного FlashloanExecutor)
  const contractAddress = "0xF83407a2ed4Fcc368C5ECd03d04f24F9B0288A84";
  const executor = await ethers.getContractAt("FlashloanExecutor", contractAddress);

  // Указываем сумму ETH для обмена (например, 0.01 ETH)
  const amountETH = ethers.parseEther("0.01");

  // Вызываем функцию swapExactETHForUSDC и отправляем ETH
  const tx = await executor.swapExactETHForUSDC({
    value: amountETH,
  });

  console.log("Транзакция отправлена, хэш:", tx.hash);

  // Ждём подтверждения
  await tx.wait();
  console.log("Транзакция подтверждена!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});