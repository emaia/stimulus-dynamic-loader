import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StimulusDynamicLoader } from '../src/loader'

describe('StimulusDynamicLoader', () => {
  let mockApplication: any
  let loader: StimulusDynamicLoader

  beforeEach(() => {
    mockApplication = {
      register: vi.fn(),
      controllers: [],
      router: {
        modulesByIdentifier: new Map()
      }
    }

    // Clear DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    loader?.disconnect()
  })

  it('should initialize with required options', () => {
    const controllers = {
      './controllers/hello_controller.js': () => Promise.resolve({ default: class HelloController {} })
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers
    })

    expect(loader).toBeDefined()
  })

  it('should map controller paths correctly', () => {
    const controllers = {
      './controllers/hello_controller.js': () => Promise.resolve({ default: class HelloController {} }),
      './components/user_card_controller.ts': () => Promise.resolve({ default: class UserCardController {} })
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers
    })

    expect(loader).toBeDefined()
  })

  it('should handle controller loading', async () => {
    const mockController = class TestController {}
    const controllers = {
      './controllers/test_controller.js': vi.fn(() => Promise.resolve({ default: mockController }))
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers
    })

    await loader.loadController('test')

    expect(controllers['./controllers/test_controller.js']).toHaveBeenCalled()
    expect(mockApplication.register).toHaveBeenCalledWith('test', mockController)
  })

  it('should throw error for non-existent controller', async () => {
    const controllers = {}

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers
    })

    await expect(loader.loadController('non-existent')).rejects.toThrow('Controller "non-existent" not found')
  })

    it('should throw console warning for duplicated controller', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn')

        const controllers = {
            './controllers/hello_controller.js': () => Promise.resolve({ default: class HelloController {} }),
            './components/hello_controller.js': () => Promise.resolve({ default: class HelloController {} })
        }

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect(consoleWarnSpy).toHaveBeenCalledWith('Duplicate controller name: hello (./controllers/hello_controller.js and ./components/hello_controller.js)')

        consoleWarnSpy.mockRestore()
    })

  it('should disconnect properly', () => {
    const controllers = {}

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers
    })

    expect(() => loader.disconnect()).not.toThrow()
  })
})