import { ReactElement } from 'react';
import { render, hydrate } from 'react-dom';

import { createError, isErrorType, clearErrorStack } from './error';

/**
 * Тип ошибки, возникающей при работе с компонентами.
 */
const ELEMENT_ERROR = 'ElementError';

/**
 * Возвращает ошибку, возникающую при работе с компонентами.
 * @param message Сообщение об ошибке.
 */
export const createElementError = (message: string) =>
  createError(ELEMENT_ERROR, message);

/**
 * Возвращает true, если указанная ошибка - ошибка, возникающая при работе с
 * компонентами.
 * @param error Ошибка.
 */
export const isElementError = (error: Error) =>
  isErrorType(error, ELEMENT_ERROR);

/**
 * Вовзращает ошибку, которая возникает, когда DOM-узел с указанным ID не найден
 * на странице.
 * @param nodeId ID DOM-узла.
 */
const createElementNodeError = (nodeId: string) => {
  const error = createElementError(
    `Component node with id '${nodeId} not found`
  );

  clearErrorStack(error, createElementNodeError);
  return error;
};

/**
 * Возвращает true, если указанный узел не имеет дочерних узлов.
 * @param node DOM-узел.
 */
const isElementNodeEmpty = (node: HTMLElement) => node.childNodes.length === 0;

/**
 * Монтирует указанный элемент к DOM-узлу с переданным id.
 * @param element Элемент.
 * @param nodeId ID DOM-узла.
 */
export const mountElement = (
  element: ReactElement,
  nodeId: string = 'root'
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const node = document.getElementById(nodeId);

  if (node == null) {
    throw createElementNodeError(nodeId);
  }

  if (isElementNodeEmpty(node)) {
    render(element, node);
  } else {
    hydrate(element, node);
  }
};
