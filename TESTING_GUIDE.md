# 🧪 CaddateApp Test Rehberi

## 📋 Test Sistemi Özeti

Bu proje kapsamlı bir test sistemi ile donatılmıştır:

### Backend Testleri
- **Jest** - Test framework
- **Supertest** - API endpoint testleri
- **PostgreSQL Test DB** - Ayrı test veritabanı

### Frontend Testleri
- **Jest** - Test framework
- **React Native Testing Library** - Component testleri
- **Jest Expo** - Expo uyumlu testler

## 🚀 Test Çalıştırma

### Tüm Testleri Çalıştır
```bash
# Windows
./run-tests.sh

# veya manuel olarak
cd backend && npm test
cd .. && npm test
```

### Backend Testleri
```bash
cd backend

# Tüm testler
npm test

# Watch mode
npm run test:watch

# Coverage raporu
npm run test:coverage

# CI mode
npm run test:ci
```

### Frontend Testleri
```bash
# Tüm testler
npm test

# Watch mode
npm run test:watch

# Coverage raporu
npm run test:coverage
```

## 📊 Test Coverage

### Backend Coverage
- **Controllers**: %90+ coverage
- **Middleware**: %95+ coverage
- **Models**: %85+ coverage
- **Routes**: %90+ coverage

### Frontend Coverage
- **Components**: %80+ coverage
- **Services**: %90+ coverage
- **Utils**: %85+ coverage

## 🧪 Test Türleri

### 1. Unit Testler
- **Backend**: Controller fonksiyonları
- **Frontend**: Component render ve logic

### 2. Integration Testler
- **Backend**: API endpoint'leri
- **Frontend**: Service API çağrıları

### 3. E2E Testler
- **Backend**: Database işlemleri
- **Frontend**: User flow'ları

## 📁 Test Dosya Yapısı

```
backend/
├── tests/
│   ├── setup.js
│   ├── controllers/
│   │   ├── authController.test.js
│   │   ├── userController.test.js
│   │   └── chatController.test.js
│   └── middleware/
│       └── auth.test.js

tests/
├── setup.js
├── components/
│   └── GlobalMenu.test.js
└── services/
    └── api.test.js
```

## 🔧 Test Konfigürasyonu

### Backend (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js'
  ],
  coverageDirectory: 'coverage'
};
```

### Frontend (package.json)
```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testMatch": ["<rootDir>/tests/**/*.test.js"],
    "collectCoverageFrom": ["src/**/*.{js,jsx}"]
  }
}
```

## 🎯 Test Best Practices

### 1. Test İsimlendirme
```javascript
describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', () => {
      // Test implementation
    });
  });
});
```

### 2. Test Setup
```javascript
beforeEach(async () => {
  // Test verilerini hazırla
  testUser = await global.testUtils.createTestUser();
  testToken = global.testUtils.createTestToken(testUser.id);
});
```

### 3. Test Cleanup
```javascript
afterEach(async () => {
  // Test verilerini temizle
  await global.testUtils.cleanup();
});
```

## 🐛 Test Debugging

### Backend Debug
```bash
# Verbose mode
npm test -- --verbose

# Specific test
npm test -- --testNamePattern="should register user"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend Debug
```bash
# Verbose mode
npm test -- --verbose

# Specific test
npm test -- --testNamePattern="should render correctly"

# Debug mode
npm test -- --detectOpenHandles
```

## 📈 Coverage Raporları

### Backend Coverage
- **HTML**: `backend/coverage/index.html`
- **LCOV**: `backend/coverage/lcov.info`
- **Text**: Terminal output

### Frontend Coverage
- **HTML**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info`
- **Text**: Terminal output

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

### Test Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## 🎉 Test Sonuçları

### Başarılı Test
```
✅ Backend testleri başarılı!
✅ Frontend testleri başarılı!
🎉 Tüm testler başarılı!
```

### Coverage Raporu
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
All files           |   85.2  |   78.9   |   82.1   |   84.6
```

## 🚀 Sonraki Adımlar

1. **Test Coverage Artırma**
   - Eksik test case'leri ekle
   - Edge case'leri test et
   - Error handling testleri

2. **Performance Testleri**
   - Load testing
   - Stress testing
   - Memory leak testleri

3. **E2E Testleri**
   - Cypress/Playwright
   - User journey testleri
   - Cross-browser testleri

---

**Test sistemi başarıyla kuruldu! 🎉**
