# Integration Logos

This directory contains logos for various integrations in the Ag Assistant application.

## File Structure
```
public/assets/logos/
├── johndeere-logo.png          # John Deere Operations Center logo
├── future-integration-logo.png # Future integration logos
└── README.md                   # This file
```

## Logo Requirements

### File Format
- **Preferred**: PNG with transparent background
- **Alternative**: SVG, JPG, or WebP
- **Size**: Recommended 48x48px to 128x128px
- **Aspect Ratio**: Square (1:1) works best

### Naming Convention
- Use lowercase with hyphens: `integration-name-logo.png`
- Be descriptive: `johndeere-logo.png`, `climate-fieldview-logo.png`

### John Deere Logo
To add the John Deere logo:
1. Download the official John Deere logo (ensure you have proper licensing)
2. Save it as `johndeere-logo.png` in this directory
3. The logo will automatically appear in the Integrations modal

### Adding New Integration Logos
1. Add your logo file to this directory
2. Update the integration object in `src/components/IntegrationsModal.tsx`
3. Set the `logo` property to `/assets/logos/your-logo-name.png`
4. Optionally set a `logoFallback` emoji or text

## Example Integration Object
```typescript
{
  id: 'your-integration',
  name: 'Your Integration Name',
  logo: '/assets/logos/your-integration-logo.png',
  logoFallback: '🌾', // Fallback if image fails to load
  // ... other properties
}
```

## Notes
- Logos are served from the public directory
- The path should always start with `/assets/logos/`
- If a logo fails to load, the fallback emoji/text will be displayed
- All logos are automatically styled to fit within a 48x48px container 