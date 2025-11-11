import { StimulusDynamicLoader } from "./loader.js";

export function registerControllers(application: any, controllers: any, options: any = {}) {
    return new StimulusDynamicLoader({application, controllers, ...options});
}
