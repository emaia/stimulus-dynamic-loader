# Stimulus Dynamic Loader

Lazy load your Stimulus controllers on demand with Vite's glob imports. Automatically registers controllers as they appear in the DOM.

## Features

- ✨ **Lazy Loading**: Controllers are loaded only when needed
- 🚀 **Turbo Integration**: Automatically registers controllers on Turbo events
- 🔄 **Dynamic DOM**: Watches for new elements with MutationObserver
- 📦 **Zero Config**: Works out of the box with Vite's glob imports
- 🎯 **Type Safe**: Full TypeScript support

## Installation

```bash
npm install @emaia/stimulus-dynamic-loader
```

## Usage

### Basic Setup

```typescript
import { Application } from "@hotwired/stimulus";
import { StimulusDynamicLoader } from "@emaia/stimulus-dynamic-loader";

const Stimulus = Application.start();

const controllers = import.meta.glob("./**/*_controller.{js,ts}", { 
  eager: false 
});

new StimulusDynamicLoader({
  application: Stimulus,
  controllers: controllers,
});
```

### Custom Configuration

```typescript
new StimulusDynamicLoader({
  application: Stimulus,
  controllers: controllers,
  
  // Custom Turbo events (optional)
  turboEvents: [
    "turbo:load",
    "turbo:frame-render",
  ],
  
  // Custom debounce wait time in ms (optional, default: 50)
  debounceWait: 100,
});
```

### With Cleanup

```typescript
const loader = new StimulusDynamicLoader({
  application: Stimulus,
  controllers: controllers,
});

// Later, if you need to disconnect
loader.disconnect();
```

## How It Works

1. **Controller Discovery**: Scans the DOM for `[data-controller]` attributes
2. **Path Mapping**: Creates a map of controller names to file paths
3. **Lazy Loading**: Dynamically imports controllers only when found in the DOM
4. **Auto Registration**: Registers controllers with Stimulus automatically
5. **Event Listening**: Responds to Turbo navigation and DOM mutations
6. **Debouncing**: Prevents excessive registration attempts

## Behavior

- Controllers are loaded **only once** per name
- Duplicate controller names trigger a console warning
- Failed imports are logged with detailed error messages
- Case-insensitive controller name matching
- Automatically handles Turbo frame renders and stream updates
- MutationObserver watches for dynamically added elements

## Requirements

- `@hotwired/stimulus` ^3.0.0
- Vite or similar bundler with `import.meta.glob` support

## License

MIT