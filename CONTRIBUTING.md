# Contributing to Bantai

Thank you for your interest in contributing to Bantai! This document provides guidelines and instructions for contributing.

**Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/bosquejun/bantai.git
   cd bantai
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build the project:
   ```bash
   pnpm build
   ```
5. Run tests to ensure everything works:
   ```bash
   cd packages/core && pnpm test
   ```

## Development Workflow

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. Make your changes

3. Ensure code quality:
   ```bash
   # Type check
   pnpm check-types
   
   # Lint
   pnpm lint
   
   # Format code
   pnpm format
   
   # Run tests
   cd packages/core && pnpm test
   ```

4. Commit your changes (see [Commit Message Guidelines](#commit-message-guidelines))

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request on GitHub

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use explicit types when they improve clarity
- Prefer `async/await` over Promises when appropriate

### Code Formatting

- We use Prettier for code formatting
- Run `pnpm format` before committing
- The project uses ESLint for linting

### Testing

- Write tests for new features and bug fixes
- Use Vitest for testing
- Aim for good test coverage
- Tests should be clear and descriptive

### Documentation

- Update relevant documentation when adding features
- Add JSDoc comments for public APIs
- Keep examples up to date

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(core): add support for custom rule evaluators

fix(policy): handle edge case in exhaustive strategy

docs(readme): update installation instructions
```

## Pull Request Process

1. **Update Documentation**: Ensure any new features or changes are documented
2. **Add Tests**: Include tests for new functionality
3. **Update CHANGELOG**: Add an entry to CHANGELOG.md describing your changes
4. **Ensure Tests Pass**: All tests must pass before merging
5. **Get Review**: Wait for code review and address any feedback

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests have been added/updated and pass
- [ ] Documentation has been updated
- [ ] CHANGELOG.md has been updated
- [ ] Commit messages follow the guidelines
- [ ] Branch is up to date with `main`

## Reporting Bugs

Before reporting a bug, please:

1. Check if the issue has already been reported
2. Try to reproduce the issue with the latest version
3. Gather relevant information (error messages, stack traces, etc.)

When creating a bug report, please include:

- A clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment information (Node.js version, OS, etc.)
- Code examples or minimal reproduction case

## Requesting Features

When requesting a new feature:

1. Check if the feature has already been requested
2. Provide a clear description of the feature
3. Explain the use case and why it would be valuable
4. Consider implementation details if possible

## Code Review

All contributions go through code review. Reviewers will check for:

- Code quality and style
- Test coverage
- Documentation completeness
- Performance implications
- Backward compatibility

Please be patient and responsive to feedback. We're all working together to make Bantai better!

## Questions?

If you have questions about contributing, feel free to:

- Open an issue with the `question` label
- Check existing issues and discussions

Thank you for contributing to Bantai! 🎉

