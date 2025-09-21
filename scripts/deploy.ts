import fs from "fs";
import path from "path";
import hre, { ethers, run } from "hardhat";

//деплой временного контракта проверки считывания цены юнисвап
//скрипт для деплоя и верификации
async function main() {
    
    const contractName = process.env.CONTRACT || "FlashloanExecutor";
    
     //деплой
    console.log("DEPLOYING...");
    const [deployer, owner] = await ethers.getSigners();

    const executor_Factory = await ethers.getContractFactory(contractName);
    const executor = await executor_Factory.deploy();    
    
    await executor.waitForDeployment(); 

    const contractAddress = await executor.getAddress();
    console.log("Deployed contract at:", contractAddress);    
    
    //ждем подтверждения, чтобы верификация не отвалилась
    const tx = executor.deploymentTransaction();
    
    if (tx) {
        await tx.wait(5); // ← ждем 5 подтверждений
    }        
   
    //верификация
    console.log("VERIFY...");
    const constructorArgs: any[] = []; // если без аргументов
    
    try {
       await run("verify:verify", {
         address: contractAddress,
         constructorArguments: constructorArgs,
       });
       console.log("Verification successful!");
     } catch (error: any) {
       if (error.message.toLowerCase().includes("already verified")) {
         console.log("Already verified");
       } else {
         console.error("Verification failed:", error);
       }
     }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error); 
        process.exit(1);
    });
