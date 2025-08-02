// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title интерфейс для описания ошибок, выбрасываемых контрактом FlashloansExecutor  
 */
interface IExecutorErrors {

    /**
     * @notice ошибка индицирует попытку вызова защищенных функций не владельцем
     * @param account адрес аккаунта, пытавшегося вызвать функцию
     */
    error NotAnOwner(address account);
     
    /**
     * @notice ошибка индицирует попытку использования неподдерживаемой пары
     * @param pair идентификатор запрашиваемой пары
     */
    error FeedNotFound(bytes6 pair);

    /**
     * @notice ошибка при получении цены с chainlink - получено отрицательное значение     
     */
    error InvalidPriceReceipt();

    
}
