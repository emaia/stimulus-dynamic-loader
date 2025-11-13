import { vi } from 'vitest'

// Mock DOM APIs
Object.defineProperty(window, 'MutationObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  }))
})

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}

// Setup DOM environment
document.body.innerHTML = ''