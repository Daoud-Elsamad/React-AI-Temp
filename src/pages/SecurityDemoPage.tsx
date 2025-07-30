import { useState } from 'react';
import { Button, Input, RateLimitBanner, RateLimitProgress, RateLimitStatus } from '../components/ui';
import { 
  HTMLSanitizer, 
  InputSanitizer, 
  SQLSanitizer, 
  CSPUtils
} from '../lib/security';
import { secureAPIKeyManager } from '../lib/secureStorage';
import { useRateLimit } from '../hooks/useRateLimit';
import { secureValidationSchemas } from '../lib/security';

export function SecurityDemoPage() {
  const [testInput, setTestInput] = useState('');
  const [sanitizedOutput, setSanitizedOutput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyProvider, setApiKeyProvider] = useState<'openai' | 'huggingface' | 'anthropic'>('openai');
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('');
  
  const rateLimit = useRateLimit({
    provider: 'Demo API',
    onRateLimit: (info) => console.log('Rate limited:', info)
  });

  // XSS/HTML Sanitization Demo
  const handleSanitizationTest = () => {
    const maliciousInput = testInput || `
      <script>alert('XSS Attack!')</script>
      <img src="x" onerror="alert('Image XSS')">
      <p onclick="alert('Click XSS')">Safe content</p>
      <a href="javascript:alert('Link XSS')">Link</a>
    `;

    const results = {
      original: maliciousInput,
      htmlSanitized: HTMLSanitizer.sanitizeHTML(maliciousInput),
      strictSanitized: HTMLSanitizer.sanitizeHTML(maliciousInput, true),
      textOnly: HTMLSanitizer.stripHTML(maliciousInput),
      inputSanitized: InputSanitizer.sanitizeText(maliciousInput),
      sqlCheck: SQLSanitizer.containsSQLInjection(maliciousInput),
      attributeSafe: HTMLSanitizer.sanitizeAttribute(maliciousInput)
    };

    setSanitizedOutput(JSON.stringify(results, null, 2));
  };

  // SQL Injection Detection Demo
  const handleSQLInjectionTest = () => {
    const testCases = [
      "' OR 1=1 --",
      "'; DROP TABLE users; --",
      "UNION SELECT * FROM passwords",
      "Normal user input",
      "SELECT * FROM table WHERE id = 1"
    ];

    const results = testCases.map(input => ({
      input,
      isSQLInjection: SQLSanitizer.containsSQLInjection(input),
      sanitized: SQLSanitizer.sanitizeForSQL(input)
    }));

    setSanitizedOutput(JSON.stringify(results, null, 2));
  };

  // API Key Management Demo
  const handleAPIKeyTest = async () => {
    try {
      // Store API key
      const storeResult = await secureAPIKeyManager.storeAPIKey(
        apiKeyProvider, 
        apiKeyInput, 
        { override: true }
      );
      
      if (storeResult.success) {
        // Retrieve API key
        const retrieveResult = await secureAPIKeyManager.getAPIKey(apiKeyProvider);
        
        if (retrieveResult.key) {
          setApiKeyStatus(`✅ API key stored and retrieved successfully for ${apiKeyProvider}`);
          
          // List all providers
          const providers = await secureAPIKeyManager.listProviders();
          console.log('Stored providers:', providers);
        } else {
          setApiKeyStatus(`❌ Failed to retrieve API key: ${retrieveResult.error}`);
        }
      } else {
        setApiKeyStatus(`❌ Failed to store API key: ${storeResult.error}`);
      }
    } catch (error) {
      setApiKeyStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Rate Limiting Demo
  const handleRateLimitTest = () => {
    // Simulate a rate limit error
    const mockError = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      details: { retryAfter: 30 }
    };
    
    rateLimit.handleRateLimitError(mockError);
  };

  // CSP Demo
  const handleCSPDemo = () => {
    const nonce = CSPUtils.generateNonce();
    const cspHeader = CSPUtils.buildCSPHeader({
      scriptNonce: nonce,
      styleNonce: nonce,
      allowInlineStyles: true,
      allowInlineScripts: false,
      allowedDomains: ['https://api.openai.com', 'https://fonts.googleapis.com']
    });

    setSanitizedOutput(JSON.stringify({
      nonce,
      cspHeader,
      explanation: 'CSP header configuration for secure content loading'
    }, null, 2));
  };

  // Validation Schema Demo
  const handleValidationDemo = () => {
    const testData = {
      email: "test@example.com",
      suspiciousEmail: "<script>alert('xss')</script>@evil.com",
      url: "https://example.com",
      maliciousUrl: "javascript:alert('xss')",
      text: "Normal text content",
      maliciousText: "<script>alert('xss')</script>",
      sqlInjection: "'; DROP TABLE users; --"
    };

    const results = {
      secureEmail: {
        valid: secureValidationSchemas.secureEmail.safeParse(testData.email),
        invalid: secureValidationSchemas.secureEmail.safeParse(testData.suspiciousEmail)
      },
      secureURL: {
        valid: secureValidationSchemas.secureURL.safeParse(testData.url),
        invalid: secureValidationSchemas.secureURL.safeParse(testData.maliciousUrl)
      },
      secureText: {
        valid: secureValidationSchemas.secureText().safeParse(testData.text),
        invalid: secureValidationSchemas.secureText().safeParse(testData.maliciousText),
        sqlInjection: secureValidationSchemas.secureText().safeParse(testData.sqlInjection)
      }
    };

    setSanitizedOutput(JSON.stringify(results, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security Features Demo
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Comprehensive demonstration of implemented security measures
          </p>
        </div>

        {/* Rate Limit Banner Demo */}
        {rateLimit.rateLimitInfo && (
          <div className="mb-6">
            <RateLimitBanner
              rateLimitInfo={rateLimit.rateLimitInfo}
              provider="Demo API"
              onRetry={() => rateLimit.resetRateLimit()}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Input Sanitization Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Input Sanitization & XSS Protection
            </h2>
            
            <div className="space-y-4">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter potentially malicious input..."
                className="w-full"
              />
              
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSanitizationTest} size="sm">
                  Test XSS Protection
                </Button>
                <Button onClick={handleSQLInjectionTest} size="sm" variant="outline">
                  Test SQL Injection
                </Button>
                <Button onClick={handleValidationDemo} size="sm" variant="outline">
                  Test Validation
                </Button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Try these inputs:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>&lt;script&gt;alert('XSS')&lt;/script&gt;</li>
                  <li>' OR 1=1 --</li>
                  <li>javascript:alert('XSS')</li>
                  <li>&lt;img src="x" onerror="alert('XSS')"&gt;</li>
                </ul>
              </div>
            </div>
          </div>

          {/* API Key Management Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Secure API Key Management
            </h2>
            
            <div className="space-y-4">
              <select
                value={apiKeyProvider}
                onChange={(e) => setApiKeyProvider(e.target.value as typeof apiKeyProvider)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="openai">OpenAI</option>
                <option value="huggingface">Hugging Face</option>
                <option value="anthropic">Anthropic</option>
              </select>
              
              <Input
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter API key for testing..."
                type="password"
                className="w-full"
              />
              
              <Button onClick={handleAPIKeyTest} className="w-full">
                Test Secure Storage
              </Button>
              
              {apiKeyStatus && (
                <div className={`p-3 rounded-md text-sm ${
                  apiKeyStatus.startsWith('✅') 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {apiKeyStatus}
                </div>
              )}
            </div>
          </div>

          {/* Rate Limiting Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Rate Limiting & Error Handling
            </h2>
            
            <div className="space-y-4">
              <RateLimitProgress
                current={45}
                limit={60}
                label="API Requests (per minute)"
              />
              
              <RateLimitStatus
                providers={[
                  {
                    name: 'OpenAI',
                    current: 45,
                    limit: 60,
                    resetTime: new Date(Date.now() + 15 * 60 * 1000),
                    isLimited: false
                  },
                  {
                    name: 'Hugging Face',
                    current: 100,
                    limit: 100,
                    resetTime: new Date(Date.now() + 30 * 60 * 1000),
                    isLimited: true
                  }
                ]}
              />
              
              <Button onClick={handleRateLimitTest} variant="outline" className="w-full">
                Simulate Rate Limit
              </Button>
            </div>
          </div>

          {/* CSP Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Content Security Policy
            </h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CSP headers are configured in index.html to prevent XSS attacks and control resource loading.
              </p>
              
              <Button onClick={handleCSPDemo} variant="outline" className="w-full">
                Generate CSP Configuration
              </Button>
              
              <div className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded">
                <strong>Current CSP includes:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Script execution restrictions</li>
                  <li>Style loading controls</li>
                  <li>Frame ancestor protection</li>
                  <li>Object/plugin blocking</li>
                  <li>HTTPS upgrade enforcement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Output Display */}
        {sanitizedOutput && (
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Security Test Results
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-sm overflow-x-auto">
                {sanitizedOutput}
              </pre>
            </div>
          </div>
        )}

        {/* Security Features Summary */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Implemented Security Features
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400">✅ Input Sanitization</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• HTML/XSS filtering with DOMPurify</li>
                <li>• SQL injection detection</li>
                <li>• URL validation and sanitization</li>
                <li>• File name sanitization</li>
                <li>• Input length limiting</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400">✅ XSS Protection</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Content Security Policy headers</li>
                <li>• HTML output encoding</li>
                <li>• Script injection prevention</li>
                <li>• Attribute value sanitization</li>
                <li>• DOM purification</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400">✅ Secure API Keys</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Encrypted storage with auto-expiry</li>
                <li>• Provider-specific validation</li>
                <li>• Memory cache with TTL</li>
                <li>• Audit logging</li>
                <li>• Secure retrieval patterns</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400">✅ Rate Limiting UI</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• User-friendly error messages</li>
                <li>• Countdown timers</li>
                <li>• Progress indicators</li>
                <li>• Multi-provider support</li>
                <li>• Automatic retry handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 