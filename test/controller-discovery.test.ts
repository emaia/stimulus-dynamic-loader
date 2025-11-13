import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StimulusDynamicLoader } from '../src/loader'

describe('StimulusDynamicLoader - Controller Discovery', () => {
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

    document.body.innerHTML = ''
  })

  afterEach(() => {
    loader?.disconnect()
  })

  it('should discover controllers in DOM on initialization', async () => {
    // Setup DOM with controller elements
    document.body.innerHTML = `
      <div data-controller="hello"></div>
      <div data-controller="user-card"></div>
    `

    const mockHelloController = class HelloController {}
    const mockUserCardController = class UserCardController {}

    const controllers = {
      './controllers/hello_controller.js': vi.fn(() => Promise.resolve({ default: mockHelloController })),
      './controllers/user_card_controller.js': vi.fn(() => Promise.resolve({ default: mockUserCardController }))
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers,
      debounceWait: 0 // Remove debounce for testing
    })

    // Wait for async registration
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(controllers['./controllers/hello_controller.js']).toHaveBeenCalled()
    expect(controllers['./controllers/user_card_controller.js']).toHaveBeenCalled()
    expect(mockApplication.register).toHaveBeenCalledWith('hello', mockHelloController)
    expect(mockApplication.register).toHaveBeenCalledWith('user-card', mockUserCardController)
  })

  it('should handle multiple controllers on same element', async () => {
    document.body.innerHTML = `
      <div data-controller="hello user-card"></div>
    `

    const mockHelloController = class HelloController {}
    const mockUserCardController = class UserCardController {}

    const controllers = {
      './controllers/hello_controller.js': vi.fn(() => Promise.resolve({ default: mockHelloController })),
      './controllers/user_card_controller.js': vi.fn(() => Promise.resolve({ default: mockUserCardController }))
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers,
      debounceWait: 0
    })

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(mockApplication.register).toHaveBeenCalledWith('hello', mockHelloController)
    expect(mockApplication.register).toHaveBeenCalledWith('user-card', mockUserCardController)
  })

  it('should handle controller name variations correctly', async () => {
    document.body.innerHTML = `
      <div data-controller="nested--component"></div>
      <div data-controller="snake_case"></div>
    `

    const mockNestedController = class NestedComponentController {}
    const mockSnakeController = class SnakeCaseController {}

    const controllers = {
      './controllers/nested/component_controller.js': vi.fn(() => Promise.resolve({ default: mockNestedController })),
      './controllers/snake_case_controller.js': vi.fn(() => Promise.resolve({ default: mockSnakeController }))
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers,
      debounceWait: 0
    })

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(mockApplication.register).toHaveBeenCalledWith('nested--component', mockNestedController)
    expect(mockApplication.register).toHaveBeenCalledWith('snake_case', mockSnakeController)
  })

  it('should not register already registered controllers', () => {
    // Mock that controller is already registered
    mockApplication.router.modulesByIdentifier.has = vi.fn().mockReturnValue(true)

    document.body.innerHTML = `<div data-controller="hello"></div>`

    const controllers = {
      './controllers/hello_controller.js': vi.fn(() => Promise.resolve({ default: class HelloController {} }))
    }

    loader = new StimulusDynamicLoader({
      application: mockApplication,
      controllers,
      debounceWait: 0
    })

    expect(controllers['./controllers/hello_controller.js']).not.toHaveBeenCalled()
    expect(mockApplication.register).not.toHaveBeenCalled()
  })
})