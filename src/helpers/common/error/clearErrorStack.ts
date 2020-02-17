/**
 * Удаляет из стека вызовов исключения указанную функцию и все предыдущие.
 * @param error Исключение.
 * @param from Функция.
 */
export const clearErrorStack = (error: Error, from: Function) => {
  // @ts-ignore
  if (Error.captureStackTrace) {
    // @ts-ignore
    Error.captureStackTrace(error, from);
  }
};