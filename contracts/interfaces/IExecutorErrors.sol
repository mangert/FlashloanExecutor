// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;


/// @title интерфейс для описания ошибок, выбрасываемых контрактом FlashloansExecutor  
interface IExecutorErrors {
    
    /// @notice ошибка индицирует попытку вызова защищенных функций не владельцем
    /// @param account адрес аккаунта, пытавшегося вызвать функцию    
    error NotAnOwner(address account);     
    
    /// @notice ошибка индицирует попытку использования неподдерживаемой пары
    /// @param pair идентификатор запрашиваемой пары    
    error FeedNotFound(bytes8 pair);
    
    /// @notice ошибка индицирует попытку обращения к фиду по адресу, не являщемуся адресом контракта
    /// @param pair идентификатор запрашиваемой пары
    error FeedIsNotContract(bytes8 pair);
    
    /// @notice ошибка при получении цены с chainlink - получено отрицательное значение         
    error InvalidPriceReceipt();
    
    /// @notice ошибка при получении цены с chainlink - устаревшие данные
    error OutdatedPriceData();

    /// @notice ошибка указывает на недостаточность средств на контракте для проведения операции
    /// @param needed требуемая сумма
    /// @param balance располагаемая сумма
    error InsufficientFunds (uint256 needed, uint256 balance);
    
    /// @notice ошибка индицирует неуспешный вывод средств с контракта
    /// @param amount сумма вывода
    ///@param recipient адрес вывода
    error MoneyTransferFailed(uint256 amount, address recipient);
    
}
