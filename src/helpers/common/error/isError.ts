/**
 * Возвращает true, если исключение принадлежит указанному типу.
 * @param error Исключение.
 * @param type Тип исключения.
 */
export const isError = (error: Error, type: string) => error.name === type;