/**
 * Возвращает экземпляр исключения.
 * @param name Тип исключения.
 * @param message Сообщение об ошибке.
 */
export const getError = (name: string, message: string) => {
  const error = new Error(message);
  error.name = name;

  return error;
};