# Bantai Documentation

> Documentation site for the Bantai policy evaluation library

This is the documentation site for Bantai, built with [Next.js](https://nextjs.org/) and [Fumadocs](https://fumadocs.dev). It provides comprehensive documentation, API references, examples, and guides for using Bantai.

## Development

Run the development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

The documentation site is organized as follows:

- **`src/app/(home)/`** - Landing page and home routes
- **`src/app/docs/`** - Documentation pages and layout
- **`src/app/api/search/route.ts`** - Search API endpoint for documentation
- **`content/docs/`** - MDX documentation files
- **`src/components/bantai/`** - Custom Bantai-specific components
- **`src/lib/source.ts`** - Content source adapter for Fumadocs
- **`src/lib/layout.shared.tsx`** - Shared layout configuration

## Content Management

Documentation content is written in MDX format and stored in the `content/docs/` directory. The `source.config.ts` file configures how Fumadocs processes and displays the content.

### Adding Documentation

1. Create a new `.mdx` file in `content/docs/`
2. Add frontmatter metadata:
    ```mdx
    ---
    title: Your Page Title
    description: Page description
    ---
    ```
3. Write your content using MDX syntax
4. The page will be automatically available at `/docs/your-page-name`

### Custom Components

Custom React components for the documentation are located in `src/components/bantai/`:

- `Hero.tsx` - Landing page hero section
- `Design.tsx` - Design showcase
- `Clarity.tsx` - Clarity section
- `Process.tsx` - Developer workflow visualization
- `Capabilities.tsx` - Feature capabilities
- `CodeSection.tsx` - Code examples display
- `Contribution.tsx` - Contribution guidelines
- `Footer.tsx` - Site footer
- `Header.tsx` - Site header

## Search

The documentation includes a search feature powered by the API route at `src/app/api/search/route.ts`. This provides full-text search across all documentation pages.

## Build

Build the documentation site for production:

```bash
npm run build
# or
pnpm build
# or
yarn build
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Fumadocs Documentation](https://fumadocs.dev) - Learn about Fumadocs and MDX
- [MDX Documentation](https://mdxjs.com) - Learn about MDX syntax

## License

MIT
