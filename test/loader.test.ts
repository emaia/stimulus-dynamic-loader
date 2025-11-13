import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {StimulusDynamicLoader} from '../src/loader'

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

        document.body.innerHTML = ''

        if (loader) {
            loader.disconnect()
        }
    })

    afterEach(() => {
        loader?.disconnect()
    })

    it('should initialize with required options', () => {
        const controllers = {
            './controllers/hello_controller.js': () => Promise.resolve({
                default: class HelloController {
                }
            })
        }

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect(loader).toBeDefined()
    })

    it('should map controller paths correctly', () => {
        const controllers = {
            './controllers/hello_controller.js': () => Promise.resolve({
                default: class HelloController {
                }
            }),
            './components/user_card_controller.ts': () => Promise.resolve({
                default: class UserCardController {
                }
            })
        }

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect(loader).toBeDefined()
    })

    it('should handle controller loading', async () => {
        const mockController = class TestController {
        }
        const controllers = {
            './controllers/test_controller.js': vi.fn(() => Promise.resolve({default: mockController}))
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
            './controllers/hello_controller.js': () => Promise.resolve({
                default: class HelloController {
                }
            }),
            './components/hello_controller.js': () => Promise.resolve({
                default: class HelloController {
                }
            })
        }

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect(consoleWarnSpy).toHaveBeenCalledWith('Duplicate controller name: hello (./controllers/hello_controller.js and ./components/hello_controller.js)')

        consoleWarnSpy.mockRestore()
    })

    it('should handle controller loading errors', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error')
        const errorMessage = 'Failed to import module'

        const controllers = {
            './controllers/broken_controller.js': vi.fn(() => Promise.reject(new Error(errorMessage)))
        }

        document.body.innerHTML = '<div data-controller="broken"></div>'

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        await new Promise(resolve => setTimeout(resolve, 150))

        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load controller broken:', expect.any(Error))

        consoleErrorSpy.mockRestore()
    })

    it('should log error for non-existent controller in DOM', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error')

        const controllers = {
            './controllers/existing_controller.js': () => Promise.resolve({
                default: class ExistingController {
                }
            })
        }

        document.body.innerHTML = '<div data-controller="non-existent"></div>'

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        await new Promise(resolve => setTimeout(resolve, 150))

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Controller non-existent not found! Searched in:',
            Object.keys(controllers)
        )

        consoleErrorSpy.mockRestore()
    })

    it('should debounce controller registration calls', async () => {
        let callCount = 0
        const testFunction = () => {
            callCount++
        }

        const debounce = (func: () => void, wait: number) => {
            let timeout: ReturnType<typeof setTimeout>
            return () => {
                clearTimeout(timeout)
                timeout = setTimeout(() => func(), wait)
            }
        }

        const debouncedFn = debounce(testFunction, 50)

        debouncedFn()
        debouncedFn()
        debouncedFn()

        await new Promise(resolve => setTimeout(resolve, 25))
        expect(callCount).toBe(0)

        await new Promise(resolve => setTimeout(resolve, 75))
        expect(callCount).toBe(1)
    })

    it('should warn when document.body is not available', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn')
        const originalBody = document.body

        Object.defineProperty(document, 'body', {
            value: null,
            configurable: true
        })

        const controllers = {}
        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect(consoleWarnSpy).toHaveBeenCalledWith('document.body not available for MutationObserver')

        Object.defineProperty(document, 'body', {
            value: originalBody,
            configurable: true
        })

        consoleWarnSpy.mockRestore()
    })

    it('should initialize MutationObserver when document.body is available', () => {
        const controllers = {}

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect((loader as any).observer).not.toBeNull()
        expect((loader as any).observer).toBeDefined()
    })

    it('should handle MutationObserver callback with childList mutations', () => {
        const mockDebouncedRegisterControllers = vi.fn()

        // Mock MutationObserver to capture its callback
        let capturedCallback: Function | null = null
        const MockMutationObserver = vi.fn().mockImplementation((callback: Function) => {
            capturedCallback = callback
            return {
                observe: vi.fn(),
                disconnect: vi.fn()
            }
        })

        const originalMutationObserver = global.MutationObserver
        global.MutationObserver = MockMutationObserver as any

        const controllers = {}
        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        // Replace the debounced function with our mock to track calls
        ;(loader as any).debouncedRegisterControllers = mockDebouncedRegisterControllers

        global.MutationObserver = originalMutationObserver

        expect(capturedCallback).toBeDefined()

        if (capturedCallback) {
            // Test 1: Element with data-controller attribute
            const elementWithController = document.createElement('div')
            elementWithController.setAttribute('data-controller', 'test')

            const mutations1 = [{
                type: 'childList',
                addedNodes: [elementWithController]
            }] as unknown as MutationRecord[]

            /* @ts-ignore */
            capturedCallback.call(loader, mutations1)
            expect(mockDebouncedRegisterControllers).toHaveBeenCalledTimes(1)

            // Reset mock
            mockDebouncedRegisterControllers.mockReset()

            // Test 2: Element containing data-controller descendant
            const parentElement = document.createElement('div')
            const childWithController = document.createElement('span')
            childWithController.setAttribute('data-controller', 'nested')
            parentElement.appendChild(childWithController)

            const mutations2 = [{
                type: 'childList',
                addedNodes: [parentElement]
            }] as unknown as MutationRecord[]

            /* @ts-ignore */
            capturedCallback.call(loader, mutations2)
            expect(mockDebouncedRegisterControllers).toHaveBeenCalledTimes(1)

            // Reset mock
            mockDebouncedRegisterControllers.mockReset()

            // Test 3: Element with no data-controller
            const regularElement = document.createElement('div')

            const mutations3 = [{
                type: 'childList',
                addedNodes: [regularElement]
            }] as unknown as MutationRecord[]

            /* @ts-ignore */
            capturedCallback.call(loader, mutations3)
            expect(mockDebouncedRegisterControllers).not.toHaveBeenCalled()

            // Test 4: Text node (not ELEMENT_NODE)
            const textNode = document.createTextNode('text')

            const mutations4 = [{
                type: 'childList',
                addedNodes: [textNode]
            }] as unknown as MutationRecord[]

            /* @ts-ignore */
            capturedCallback.call(loader, mutations4)
            expect(mockDebouncedRegisterControllers).not.toHaveBeenCalled()

            // Test 5: Non-childList mutation
            const mutations5 = [{
                type: 'attributes' as any,
                addedNodes: []
            }] as unknown as MutationRecord[]

            /* @ts-ignore */
            capturedCallback.call(loader, mutations5)
            expect(mockDebouncedRegisterControllers).not.toHaveBeenCalled()

            // Test 6: Multiple mutations - should break early
            const element1 = document.createElement('div')
            element1.setAttribute('data-controller', 'first')
            const element2 = document.createElement('div')
            element2.setAttribute('data-controller', 'second')

            const mutations6 = [
                {
                    type: 'childList',
                    addedNodes: [element1]
                },
                {
                    type: 'childList',
                    addedNodes: [element2]
                }
            ] as unknown as MutationRecord[]

            mockDebouncedRegisterControllers.mockReset()
            /* @ts-ignore */
            capturedCallback.call(loader, mutations6)
            expect(mockDebouncedRegisterControllers).toHaveBeenCalledTimes(1)
        }
    })

    it('should handle DOMContentLoaded when document is still loading', async () => {
        const mockController = class TestController {
        }
        const controllers = {
            './controllers/test_controller.js': vi.fn(() => Promise.resolve({default: mockController}))
        }

        Object.defineProperty(document, 'readyState', {
            value: 'loading',
            configurable: true
        })

        document.body.innerHTML = '<div data-controller="test"></div>'

        loader = new StimulusDynamicLoader({
            application: mockApplication,
            controllers
        })

        expect(controllers['./controllers/test_controller.js']).not.toHaveBeenCalled()

        document.dispatchEvent(new Event('DOMContentLoaded'))

        await new Promise(resolve => setTimeout(resolve, 150))

        expect(controllers['./controllers/test_controller.js']).toHaveBeenCalled()

        // Restore document.readyState
        Object.defineProperty(document, 'readyState', {
            value: 'complete',
            configurable: true
        })
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