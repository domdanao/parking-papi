# Contributing to Parking Papi

Thank you for your interest in contributing to Parking Papi! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** when available
3. **Provide detailed information** including:
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Environment details (OS, browser, mobile device)
   - Screenshots or error logs when relevant

### Suggesting Features

We welcome feature suggestions! Please:

1. **Check the roadmap** in README.md to see if it's already planned
2. **Open a discussion** in GitHub Discussions for major features
3. **Provide context** about the problem you're trying to solve
4. **Consider implementation complexity** and user impact

## 🏗 Development Workflow

### Prerequisites

- PHP 8.3+
- Node.js 20+
- PostgreSQL 17
- Redis
- Composer
- npm/yarn
- Git

### Setting Up Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/your-username/parking-papi.git
cd parking-papi

# Install dependencies
composer install
npm install

# Set up environment
cp .env.example .env
php artisan key:generate

# Set up database
createdb parking_papi
php artisan migrate
php artisan db:seed

# Install mobile dependencies
cd mobile/expo-app
npm install
cd ../..

# Start development servers
php artisan serve &
npm run dev &

# Start mobile development (in another terminal)
cd mobile/expo-app
npx expo start
```

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: Individual feature branches
- **hotfix/**: Critical bug fixes
- **release/**: Release preparation

### Making Changes

1. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Write tests** for new functionality

4. **Run the test suite**:
   ```bash
   # Backend tests
   php artisan test

   # Frontend tests
   npm test

   # Mobile tests
   cd mobile/expo-app
   npm test
   cd ../..

   # E2E tests
   npm run test:e2e
   ```

5. **Commit your changes** using conventional commits:
   ```bash
   git add .
   git commit -m "feat: add parking slot filtering by price range"
   ```

6. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Coding Standards

### PHP (Backend)

- Follow **PSR-12** coding standards
- Use **type hints** for all parameters and return types
- Write **PHPDoc comments** for all public methods
- Use **Laravel conventions** for naming and structure

```php
<?php

declare(strict_types=1);

namespace App\Services;

class ParkingService
{
    /**
     * Find available parking slots near the given location.
     */
    public function findNearbySlots(float $latitude, float $longitude, int $radius = 1000): Collection
    {
        // Implementation
    }
}
```

### TypeScript (Frontend)

- Use **strict TypeScript** configuration
- Define **interfaces** for all data structures
- Use **React functional components** with hooks
- Follow **React best practices**

```typescript
interface ParkingSlot {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  hourlyRate: number;
  status: 'available' | 'occupied' | 'reserved';
}

const SlotCard: React.FC<{ slot: ParkingSlot }> = ({ slot }) => {
  // Component implementation
};
```

### React Native (Mobile)

- Use **Expo managed workflow** patterns
- Implement **proper error boundaries**
- Follow **React Native performance best practices**
- Use **TypeScript** for all components

### Database

- Use **UUID** primary keys for all tables
- Add **proper indexes** for query performance
- Write **reversible migrations**
- Include **meaningful column comments**

```php
Schema::create('parking_slots', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('owner_id');
    $table->decimal('latitude', 10, 8);
    $table->decimal('longitude', 11, 8);
    $table->decimal('hourly_rate', 10, 2);
    $table->timestamps();

    $table->foreign('owner_id')->references('id')->on('users');
    $table->index(['latitude', 'longitude']);
    $table->index('hourly_rate');
});
```

## 🧪 Testing Guidelines

### Test Types

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API endpoints and workflows
3. **Component Tests**: Test React components in isolation
4. **E2E Tests**: Test complete user workflows
5. **Performance Tests**: Test system under load

### Writing Tests

- **Test-Driven Development**: Write failing tests first
- **Clear test names**: Describe what is being tested
- **Arrange-Act-Assert**: Structure your tests clearly
- **Mock external dependencies**: Use proper mocking strategies

```php
// Backend test example
class ParkingSlotTest extends TestCase
{
    public function test_user_can_find_nearby_parking_slots(): void
    {
        // Arrange
        $user = User::factory()->create();
        $slot = ParkingSlot::factory()->create([
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ]);

        // Act
        $response = $this->actingAs($user)
            ->getJson('/api/parking-slots/nearby?lat=14.5995&lng=120.9842');

        // Assert
        $response->assertOk()
            ->assertJsonFragment(['id' => $slot->id]);
    }
}
```

```typescript
// Frontend test example
import { render, screen } from '@testing-library/react';
import { SlotCard } from './SlotCard';

describe('SlotCard', () => {
  it('displays slot information correctly', () => {
    const slot = {
      id: '123',
      location: { latitude: 14.5995, longitude: 120.9842 },
      hourlyRate: 50.00,
      status: 'available' as const,
    };

    render(<SlotCard slot={slot} />);

    expect(screen.getByText('₱50.00/hour')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
```

## 📚 Documentation

### Code Documentation

- **PHPDoc** for all PHP classes and methods
- **JSDoc** for complex TypeScript functions
- **README** updates for new features
- **API documentation** for new endpoints

### Commit Messages

Use **Conventional Commits** format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add OTP verification for mobile registration
fix(payment): resolve race condition in transaction processing
docs(api): update parking slots endpoint documentation
test(mobile): add QR scanner component tests
```

## 🚀 Pull Request Process

### Before Submitting

1. **Rebase your branch** on the latest `develop`
2. **Run all tests** and ensure they pass
3. **Update documentation** if needed
4. **Check for merge conflicts**

### PR Requirements

- [ ] **Clear title** and description
- [ ] **Tests added** for new functionality
- [ ] **Documentation updated** if needed
- [ ] **No merge conflicts**
- [ ] **CI checks passing**
- [ ] **Code review approved**

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added and passing
```

## 🔒 Security

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security concerns to: [security@parkingpapi.dev]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Best Practices

- **Never commit secrets** or API keys
- **Validate all inputs** on both client and server
- **Use parameterized queries** to prevent SQL injection
- **Implement proper authentication** and authorization
- **Keep dependencies updated** regularly

## 🎯 Feature Development Guidelines

### Planning Phase

1. **Discussion**: Start with GitHub Discussions for major features
2. **Design Document**: Create design docs for complex features
3. **API Contract**: Define API contracts before implementation
4. **UI/UX Mockups**: Create mockups for frontend features

### Implementation Phase

1. **TDD Approach**: Write tests first
2. **Small Commits**: Make frequent, small commits
3. **Regular Pushes**: Push work regularly to backup progress
4. **Code Reviews**: Request reviews early and often

### Quality Assurance

1. **Self-Review**: Review your own code before requesting review
2. **Test Coverage**: Maintain high test coverage
3. **Performance**: Consider performance implications
4. **Accessibility**: Ensure features are accessible

## 🆘 Getting Help

### Resources

- **Documentation**: Check existing docs first
- **GitHub Discussions**: For questions and ideas
- **Issues**: For bug reports and feature requests
- **Discord/Slack**: Real-time chat (if available)

### Mentorship

New contributors are welcome! Don't hesitate to:

- Ask questions in discussions
- Request guidance on complex issues
- Pair program on challenging features
- Seek feedback on your approaches

## 📋 Project Structure

```
parking-papi/
├── app/                    # Laravel backend
│   ├── Http/Controllers/   # API controllers
│   ├── Models/            # Eloquent models
│   ├── Services/          # Business logic
│   └── Events/            # Real-time events
├── resources/js/          # Inertia.js frontend
│   ├── Pages/             # Page components
│   ├── Components/        # Reusable components
│   └── Services/          # Frontend services
├── mobile/expo-app/       # React Native mobile
│   ├── src/screens/       # Mobile screens
│   ├── src/components/    # Mobile components
│   └── src/services/      # Mobile services
├── tests/                 # Test suites
│   ├── Feature/           # Integration tests
│   ├── Unit/              # Unit tests
│   └── E2E/               # End-to-end tests
├── database/              # Migrations and seeds
├── .github/workflows/     # CI/CD pipelines
└── docs/                  # Documentation
```

## 🎉 Recognition

Contributors will be recognized in:

- **CHANGELOG.md** for significant contributions
- **README.md** contributors section
- **GitHub contributors** page
- **Release notes** for major features

## 📄 License

By contributing to Parking Papi, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Parking Papi! Together, we're building the future of urban parking. 🅿️✨