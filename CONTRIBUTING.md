# Contributing to NYC Events

Thank you for your interest in contributing to NYC Events! This document provides guidelines for contributing to the project.

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/yourusername/nycevents.git`
3. **Install dependencies**: `npm install && pip install -r requirements.txt`
4. **Create a branch**: `git checkout -b feature/your-feature-name`
5. **Make changes** and test them
6. **Commit** with a descriptive message
7. **Push** to your fork
8. **Create a Pull Request**

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Fill in required environment variables
3. For local development, you can use placeholder values for optional APIs

### Running the Project
```bash
# Frontend development
npm run dev

# Backend scraping
npm run scrape

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Code Style

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Use proper error handling

### Python
- Follow PEP 8 style guidelines
- Use type hints where possible
- Add docstrings for functions and classes
- Handle exceptions gracefully
- Use logging for debugging

### CSS/Styling
- Use CSS custom properties for theming
- Follow the cyberpunk aesthetic
- Ensure responsive design
- Use semantic class names

## 🧪 Testing

### Frontend Testing
- Test components in different screen sizes
- Verify accessibility features
- Check for TypeScript errors
- Test user interactions

### Backend Testing
- Test scrapers with sample data
- Verify data processing logic
- Check error handling
- Test API integrations

## 📊 Data Sources

### Adding New Event Sources
1. Create a new scraper in `scraper/scrapers/`
2. Follow the existing scraper pattern
3. Add configuration to `calendar_configs.py`
4. Test with sample data
5. Update documentation

### Scraper Guidelines
- Handle rate limiting appropriately
- Implement proper error handling
- Log important events and errors
- Respect robots.txt and terms of service
- Use descriptive variable names

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information (for frontend issues)
- Error messages or logs

## 💡 Feature Requests

When suggesting features:
- Explain the problem you're solving
- Describe the proposed solution
- Consider implementation complexity
- Think about user experience

## 🔄 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Update README** if adding new features
4. **Test thoroughly** before submitting
5. **Use descriptive commit messages**
6. **Reference issues** in PR description

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(scraper): add new event source for tech meetups`
- `fix(ui): resolve mobile layout issues`
- `docs(readme): update installation instructions`

## 📋 Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on staging environment
4. **Documentation** review
5. **Final approval** and merge

## 🎯 Areas for Contribution

### High Priority
- Bug fixes and performance improvements
- Accessibility enhancements
- Mobile responsiveness
- Error handling improvements

### Medium Priority
- New event sources
- UI/UX improvements
- Documentation updates
- Testing coverage

### Low Priority
- New features
- Styling updates
- Code refactoring
- Performance optimizations

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the project's code of conduct
- Celebrate contributions and successes

## 📞 Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Review documentation and examples
- Reach out to maintainers

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Project documentation
- Release notes
- Community acknowledgments

Thank you for contributing to NYC Events! 🚀 