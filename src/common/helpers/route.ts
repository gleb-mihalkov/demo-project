/**
 * Возвращает ссылку, подставляя в указанный маршрут коллекцию его параметров.
 * @param route Маршрут.
 * @param params Коллекция параметров маршрута.
 */
export const getRouteHref = (route: string, params: any) => {};

/**
 * Возвращает коллекцию параметров из ссылки, соответствуюшей заданному
 * маршруту.
 * @param href Ссылка.
 * @param route Маршрут.
 */
export const getRouteParams = (href: string, route: string) => {};

/**
 * Возвращает true, если ссылка соответствует маршруту с опциональной коллекцией
 * параметров.
 * @param href Ссылка.
 * @param route Маршрут.
 * @param params Коллекция параметров маршрута.
 */
export const isRoute = (href: string, route: string, params: any) => {};
