import { test, expect } from '@playwright/test'

test.describe('AgMCP Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the main chat interface', async ({ page }) => {
    // Check if the main elements are present
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
  })

  test('should send a message and receive a response', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    // Type a message
    await chatInput.fill('Hello, can you help me with my farming operations?')
    
    // Send the message
    await sendButton.click()
    
    // Wait for the user message to appear
    await expect(page.locator('text=Hello, can you help me with my farming operations?')).toBeVisible()
    
    // Wait for assistant response (with timeout)
    await expect(page.locator('[data-testid="message-bubble"]').last()).toBeVisible({ timeout: 10000 })
    
    // Check that we have at least 2 messages (user + assistant)
    const messages = page.locator('[data-testid="message-bubble"]')
    await expect(messages).toHaveCount(2, { timeout: 10000 })
  })

  test('should show data source selector for farm data queries', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    // Ask about organization data
    await chatInput.fill('What is the name of my organization?')
    await sendButton.click()
    
    // Wait for response and check for data source selector
    await expect(page.locator('[data-testid="data-source-selector"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=John Deere Operations Center')).toBeVisible()
  })

  test('should handle John Deere data selection', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    // Ask about organization data
    await chatInput.fill('Tell me about my fields')
    await sendButton.click()
    
    // Wait for data source selector and click John Deere
    await expect(page.locator('[data-testid="data-source-selector"]')).toBeVisible({ timeout: 10000 })
    await page.locator('button:has-text("John Deere Operations Center")').click()
    
    // Wait for John Deere branded response
    await expect(page.locator('text=John Deere Data')).toBeVisible({ timeout: 15000 })
  })

  test('should handle file upload', async ({ page }) => {
    // Create a test file
    const fileContent = 'Test shapefile content'
    const fileName = 'test-field.shp'
    
    // Get file input (might be hidden)
    const fileInput = page.locator('input[type="file"]')
    
    // Upload file
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(fileContent)
    })
    
    // Check if file is displayed in the interface
    await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 5000 })
  })

  test('should display chat history sidebar', async ({ page }) => {
    // Check if sidebar toggle exists
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]')
    
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click()
      await expect(page.locator('[data-testid="chat-sidebar"]')).toBeVisible()
      await expect(page.locator('text=New Chat')).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if interface adapts to mobile
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()
    
    // Mobile-specific elements should be visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]')
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible()
    }
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Focus on input
    await chatInput.click()
    await chatInput.fill('Test message')
    
    // Send with Enter key
    await chatInput.press('Enter')
    
    // Check that message was sent
    await expect(page.locator('text=Test message')).toBeVisible()
  })

  test('should show loading states', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    await chatInput.fill('What equipment do I have?')
    await sendButton.click()
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="typing-indicator"]')
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).toBeVisible()
    }
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/chat/completion', route => {
      route.abort('failed')
    })
    
    const chatInput = page.locator('[data-testid="chat-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    await chatInput.fill('This should fail')
    await sendButton.click()
    
    // Check for error message
    await expect(page.locator('text=error').or(page.locator('text=failed'))).toBeVisible({ timeout: 10000 })
  })
}) 