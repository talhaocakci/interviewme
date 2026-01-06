# Contributing to Chat & Video Call Application

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and beginners
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/interviewme.git
   cd interviewme
   ```

3. **Set up the development environment**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Backend Development

1. **Activate virtual environment**:
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. **Make your changes**

3. **Run tests**:
   ```bash
   pytest
   ```

4. **Check code style**:
   ```bash
   black app/
   flake8 app/
   ```

### Frontend Development

1. **Navigate to mobile directory**:
   ```bash
   cd mobile
   ```

2. **Make your changes**

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Check linting**:
   ```bash
   npm run lint
   ```

## Coding Standards

### Backend (Python)

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints where possible
- Write docstrings for functions and classes
- Keep functions focused and small
- Use meaningful variable names

Example:
```python
def create_user(db: Session, email: str, password: str) -> User:
    """
    Create a new user in the database.
    
    Args:
        db: Database session
        email: User's email address
        password: Plain text password (will be hashed)
    
    Returns:
        Created user object
    
    Raises:
        ValueError: If email already exists
    """
    # Implementation
```

### Frontend (TypeScript/React Native)

- Follow [Airbnb React Style Guide](https://airbnb.io/javascript/react/)
- Use TypeScript types (avoid `any`)
- Use functional components with hooks
- Keep components small and focused
- Use meaningful component and variable names

Example:
```typescript
interface MessageProps {
  content: string;
  sender: User;
  timestamp: Date;
}

const Message: React.FC<MessageProps> = ({ content, sender, timestamp }) => {
  // Implementation
};
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

Examples:
```
feat: add group video call support
fix: resolve WebSocket reconnection issue
docs: update API documentation
test: add tests for authentication flow
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (if exists)
5. **Create pull request** with clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
```

## Testing Requirements

### Required Tests

- Unit tests for new functions/methods
- Integration tests for API endpoints
- Component tests for UI changes

### Test Coverage

- Maintain minimum 70% coverage
- Critical paths should have 100% coverage
- Add tests before fixing bugs

## Documentation

- Update README.md for new features
- Add JSDoc/docstrings for new functions
- Update API documentation
- Include inline comments for complex logic
- Create examples for new features

## Issue Reporting

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/videos
- Environment details
- Error messages/logs

### Feature Requests

Include:
- Clear, descriptive title
- Problem/use case
- Proposed solution
- Alternative solutions considered
- Additional context

## Review Process

1. **Automated checks** must pass
2. **Code review** by maintainer
3. **Testing** by reviewer
4. **Approval** and merge

### Review Criteria

- Code quality and style
- Test coverage
- Documentation
- Performance impact
- Security considerations
- Backward compatibility

## Development Tips

### Backend Tips

- Use FastAPI's dependency injection
- Leverage Pydantic for validation
- Use async/await for I/O operations
- Handle errors gracefully
- Log important events

### Frontend Tips

- Use Redux for complex state
- Implement proper loading states
- Handle errors with user-friendly messages
- Optimize re-renders
- Test on multiple devices

## Common Tasks

### Adding a New API Endpoint

1. Create endpoint in appropriate router file
2. Add Pydantic models for request/response
3. Implement business logic in service layer
4. Add authentication if needed
5. Write tests
6. Update API documentation

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add to navigation
3. Create necessary Redux slices
4. Implement UI with React Native Paper
5. Add error handling
6. Write component tests

### Adding Database Migration

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Navigation](https://reactnavigation.org/)

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Read documentation thoroughly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README

Thank you for contributing! 🎉

