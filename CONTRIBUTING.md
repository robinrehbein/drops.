# Contributing to Drop

Thanks for your interest in contributing! 🫘

## Setup

1. Fork and clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in any required values
4. Run `npm start` to launch the dev server

## Development

- **TypeScript** — all files should be `.ts` / `.tsx`
- **Linting** — run `npm run lint` before committing
- **Formatting** — run `npm run format` (Prettier)
- **Type checking** — run `npm run typecheck`
- **Tests** — run `npm test` and make sure all tests pass

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Add tests for new functionality
4. Ensure `npm run lint`, `npm run typecheck`, and `npm test` all pass
5. Open a PR with a clear description of the change

## Code Style

- Follow the existing patterns in the codebase
- Use the path alias `@/` for imports from `src/`
- Keep components focused and small
- Prefer local-first: all data should stay on-device

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Mention your device / OS / Expo version

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
