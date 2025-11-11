import type { Application } from "@hotwired/stimulus";

interface ControllerModule {
    default: any;
}

type ControllerImporter = () => Promise<ControllerModule>;

interface StimulusDynamicLoaderOptions {
    /**
     * Stimulus application instance
     */
    application: Application;

    /**
     * Glob import of controller files
    */
    controllers: Record<string, ControllerImporter>;

    /**
     * Turbo events to listen for controller registration
     * @default ["turbo:load", "turbo:frame-render", "turbo:before-stream-render", "turbo:stream-render"]
     */
    turboEvents?: string[];

    /**
     * Debounce wait time in milliseconds
     * @default 100
     */
    debounceWait?: number;
}

export class StimulusDynamicLoader {
    private application: Application;
    private readonly controllers: Record<string, ControllerImporter>;
    private registeredControllers = new Set<string>();
    private loadingControllers = new Map<string, Promise<void>>();
    private readonly controllerPathMap: Record<string, string>;
    private observer: MutationObserver | null = null;
    private readonly debouncedRegisterControllers: () => void;
    private beforeUnloadHandler = () => this.disconnect();

    constructor(options: StimulusDynamicLoaderOptions) {
        this.application = options.application;
        this.controllers = options.controllers;

        this.controllerPathMap = Object.keys(this.controllers).reduce((map, path) => {
            const logicalName = path.match(/^(?:.*?(?:controllers|components)\/|\.?\.\/)?(.+)[\/_-]controller\..+?$/)?.[1];
            if (logicalName) {
                const identifier = logicalName.replace(/_/g, '-').replace(/\//g, '--');
                const key = identifier.toLowerCase();
                if (map[key]) {
                    console.warn(`Duplicate controller name: ${identifier} (${map[key]} and ${path})`);
                }
                map[key] = path;
            }
            return map;
        }, {} as Record<string, string>);

        const debounceWait = options.debounceWait ?? 100;
        this.debouncedRegisterControllers = this.debounce(
            this.registerControllers.bind(this),
            debounceWait
        );

        this.init(options.turboEvents);
    }

    private findControllerPath(controllerName: string): string | null {
        return this.controllerPathMap[this.normalizeControllerName(controllerName)] || null;
    }

    private isControllerRegistered(controllerName: string): boolean {
        if ((this.application.router as any)?.modulesByIdentifier?.has(controllerName)) {
            return true;
        }

        return this.application.controllers.some(
            (controller) => controller.identifier === controllerName
        );
    }

    private registerControllers(): void {
        const elements = document.querySelectorAll("[data-controller]");

        elements.forEach((element) => {
            const controllerNames = element
                .getAttribute("data-controller")!
                .split(/\s+/)
                .filter(Boolean);

            controllerNames.forEach((controllerName) => {
                if (
                    this.registeredControllers.has(controllerName) ||
                    this.loadingControllers.has(controllerName) ||
                    this.isControllerRegistered(controllerName)
                ) {
                    return;
                }

                const controllerPath = this.findControllerPath(controllerName);

                if (controllerPath && this.controllers[controllerPath]) {

                    this.loadingControllers.set(controllerName, Promise.resolve());

                    const loadPromise = this.controllers[controllerPath]()
                        .then((module) => {
                            if (!this.isControllerRegistered(controllerName)) {
                                this.application.register(controllerName, module.default);
                                this.registeredControllers.add(controllerName);
                            }
                        })
                        .catch((error) => {
                            console.error(`Failed to load controller ${controllerName}:`, error);
                        })
                        .finally(() => {
                            this.loadingControllers.delete(controllerName);
                        });

                    this.loadingControllers.set(controllerName, loadPromise);
                } else {
                    console.error(
                        `Controller ${controllerName} not found! Searched in:`,
                        Object.keys(this.controllers)
                    );
                }
            });
        });
    }

    private normalizeControllerName(name: string): string {
        return name.replace(/_/g, "-").toLowerCase();
    }

    private debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
        let timeout: ReturnType<typeof setTimeout>;
        return ((...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        }) as T;
    }

    private initObserver(): void {
        if (!document.body) {
            console.warn("document.body not available for MutationObserver");
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            let hasNewControllers = false;

            for (const mutation of mutations) {
                if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (
                                element.hasAttribute?.("data-controller") ||
                                element.querySelector?.("[data-controller]")
                            ) {
                                hasNewControllers = true;
                                break;
                            }
                        }
                    }

                    if (hasNewControllers) break;
                }
            }

            if (hasNewControllers) {
                this.debouncedRegisterControllers();
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    private init(turboEvents?: string[]): void {
        const events = turboEvents ?? [
            "turbo:load",
            "turbo:frame-render",
            "turbo:before-stream-render",
            "turbo:stream-render",
        ];

        events.forEach((eventName) => {
            document.addEventListener(eventName, this.debouncedRegisterControllers);
        });

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.registerControllers();
                this.initObserver();
            });
        } else {
            this.registerControllers();
            this.initObserver();
        }

        window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }

    public disconnect(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }

    public async loadController(controllerName: string): Promise<void> {
        if (this.isControllerRegistered(controllerName)) return;

        const path = this.findControllerPath(controllerName);
        if (!path) throw new Error(`Controller "${controllerName}" not found`);

        const module = await this.controllers[path]();
        this.application.register(controllerName, module.default);
        this.registeredControllers.add(controllerName);
    }
}