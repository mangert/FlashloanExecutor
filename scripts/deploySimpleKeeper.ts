import fs from "fs";
import path from "path";
import hre, { ethers, run } from "hardhat";
//скрипт для деплоя и верификации
async function main() {
    
    const contractName = process.env.CONTRACT || "SimpleKeeper";
    
    //деплой
    console.log("DEPLOYING...");
    const [deployer, owner] = await ethers.getSigners();
    
    const interval = 600n; //аргумент конструктора

    const keeper_Factory = await ethers.getContractFactory(contractName);
    const keeper = await keeper_Factory.deploy(interval);    
    await keeper.waitForDeployment(); 

    const contractAddress = await keeper.getAddress();
    console.log("Deployed contract at:", contractAddress);
    
    //ждем подтверждения, чтобы верификация не отвалилась
    const tx = keeper.deploymentTransaction();
    if (tx) {
        await tx.wait(5); // ← ждем 5 подтверждений
    }        
   
    //верификация
    console.log("VERIFY...");
    const constructorArgs: any[] = [interval]; // берем аргумент
    
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

   