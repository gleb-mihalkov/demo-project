/**
 * Возвращает ошибку указанного типа с заданным сообщением.
 * @param type Тип ошибки.
 * @param message Сообщение об ошибке.
 */
export const createError = (type: string, message: string) => {
  const error = new Error(message);
  error.name = type;

  return error;
};

/**
 * Удаляет из стека вызовов ошибки указанную функцию и все, что были перед ней.
 * @param error Ошибки.
 * @param func Функция из стека вызовов ошибки.
 */
export const clearErrorStack = (error: Error, func: Function) => {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, func);
  }
};

/**
 * Возвращает true, если ошибка имеет указанный тип.
 * @param error Ошибка.
 * @param type Тип ошибки.
 */
export const isErrorType = (error: Error, type: string) => error.name === type;
