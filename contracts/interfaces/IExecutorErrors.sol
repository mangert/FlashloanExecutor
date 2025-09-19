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
    /// @param recipient адрес вывода
    error MoneyTransferFailed(uint256 amount, address recipient);
    
    
    /// @notice ошибка индицирует вызов колбэка неуполномоченным контрактом
    /// @param caller адрес инициатора вызова колбэка
    error InvalidCallbackCaller(address caller);

    /// @notice ошибка индицирует отсутствие эфиров, направленных для обмена
    error NoETHsentToSwap();

    /// @notice ошибка индицирует нулевую сумму, направленную на обмен
    error ZeroAmountSwap();

    /// @notice ошибка индицирует обращение к неподдерживаемому пулу
    error PoolNotFound(address pool, bytes8 pair);

    /// @notice ошибка индицирует несоответствие пары токенов содержанию пула
    /// @param token0 адрес входящего токена
    /// @param token1 адрес запрашиваемого токена
    /// @param pool адрес вызываемого пула
    error InvalidTokenPairForPool(address token0, address token1, address pool);

    /// @notice ошибка индицирует отказ в обмене в связи с невозможность получить минимальную сумму обмена
    /// @param amountOut нижний порог обмена
    /// @param amountOutMin минимальный порог получения запрошенного токена
    error InsufficientOutputAmount(uint256 amountOut, uint256 amountOutMin);

    /// @notice ошибка индицирует неудачный трансфер эфиров в процессе свопа
    /// @param recipient адрес получателя
    /// @param amount сумма неудачного трансфера
    error SwapTranserFailed(address recipient, uint256 amount);

    /// @notice ошибка индицирует отказ в обмене в связи с недостаточностью баланса токенов
    error InsufficientBalanceCallback();

    /// @notice ошибка индицирует превышение суммы разрешенных контракту токенов
    error InsufficientAllowance();

    /// @notice ошибка индицирует недостаточность баланса USDC пользователя для выполнения перевода
    error InsufficientUSDCBalance();

    /// @notice ошибка индицирует некорректную сумму пополнения контракта    
    error IncorrectDepositAmount();

    /// @notice ошибка индицирует неавторизованное обращение к функции использования и возврата флэш-займа 
    error UnauthorizedExecution();

    /// @notice ошибка индицирует некорректный параметр инициатора в функции использования и возврата флэш-займа 
    error InvalidExecutionInitiator();       
    
    /// @notice ошибка индицирует использование неподдерживаемого токена в операцияx AAVE
    /// @param token адрес токена, переданного в функцию
    error NotSupportedAsset(address token);    
}
