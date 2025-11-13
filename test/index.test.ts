import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerControllers } from '../src/index'

describe('registerControllers', () => {
  let mockApplication: any

  beforeEach(() => {
    mockApplication = {
      register: vi.fn(),
      controllers: [],
      router: {
        modulesByIdentifier: new Map()
      }
    }
  })

  it('should create a StimulusDynamicLoader instance', () => {
    const controllers = {}
    const options = { debounceWait: 50 }

    const loader = registerControllers(mockApplication, controllers, options)

    expect(loader).toBeDefined()
    expect(typeof loader.disconnect).toBe('function')
    expect(typeof loader.loadController).toBe('function')
  })

  it('should work with default options', () => {
    const controllers = {}

    const loader = registerControllers(mockApplication, controllers)

    expect(loader).toBeDefined()
  })

  it('should accept custom options', () => {
    const controllers = {}
    const options = {
      turboEvents: ['custom:event'],
      debounceWait: 200
    }

    const loader = registerControllers(mockApplication, controllers, options)

    expect(loader).toBeDefined()
  })
})