import { Application } from "@hotwired/stimulus";
import { StimulusDynamicLoader } from "./index.ts";

const Stimulus = Application.start();

const controllers = import.meta.glob("./**/*_controller.{js,ts}", {
    eager: false
});

new StimulusDynamicLoader({
    application: Stimulus,
    controllers: controllers,
});

// OR

const loader = new StimulusDynamicLoader({
    application: Stimulus,
    controllers: controllers,
});

await loader.loadController("chart");
